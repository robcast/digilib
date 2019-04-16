package digilib.io;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonObject;
import javax.json.JsonReader;
import javax.json.JsonValue;

import org.apache.http.HttpEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.utils.URIBuilder;
import org.apache.http.impl.client.CloseableHttpClient;

import digilib.conf.DigilibConfiguration;
import digilib.io.FileOps.FileClass;
import digilib.meta.CdstarArchiveMeta;
import digilib.meta.CdstarFileMeta;
import digilib.meta.DirMeta;
import digilib.meta.MetadataMap;
import digilib.util.ImageSize;

/**
 * DocuDirectory backed by a CDSTAR archive.
 * 
 * Initialized with the CDSTAR archive URL.
 * Reads and caches all file entries in the archive on first access.
 * Treats all file entries in the archive as files in this DocuDirectory
 * (even if their file names contain slashes).
 * Reads image sizes from "exif:Image.ImageHeight" and "exif:Image.ImageWidth"
 * attributes in CDSTAR file metadata. 
 * 
 * @author casties
 *
 */
public class CdstarArchiveDocuDirectory extends DocuDirectory {

    /** key for image height in CDSTAR metadata */
    public static final String META_IMAGE_HEIGHT_KEY = "exif:Image.ImageHeight";
    /** key for image width in CDSTAR metadata */
    public static final String META_IMAGE_WIDTH_KEY = "exif:Image.ImageWidth";
    /** time in ms to delay the next archive info call and reuse existing information */
    public static final int REFRESH_DELAY = 10*1000;
    /** digilib-config key for the info request batch size */
    public static final String FILES_BATCH_SIZE_KEY = "storage-info-batch-size";
	/** number of files to read in one request */
	protected int archiveBatchSize = 100;
	/** maximum number of info requests */
    public static final int MAX_INFO_REQUESTS = 100;
	/** digilib-config key for the CDSTAR base URL */
    public static final String STORAGE_URL_KEY = "storage-base-url";
	
	protected String archiveUrl;
	
	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#configure(java.lang.String, digilib.io.FileOps.FileClass, digilib.conf.DigilibConfiguration)
	 */
	@Override
	public void configure(String path, FileClass fileClass, DigilibConfiguration dlConfig) {
		// configure static client object TODO: do this only once?
		UrlClientFactory.configure(dlConfig);
		if (path.split("/").length != 2) {
			// archive path should contain one slash
			this.isValid = false;
			return;
		}
		super.configure(path, fileClass, dlConfig);
		archiveUrl = dlConfig.getAsString(STORAGE_URL_KEY) + "/" + path;
		if (dlConfig.hasValue(FILES_BATCH_SIZE_KEY)) {
		    archiveBatchSize = dlConfig.getAsInt(FILES_BATCH_SIZE_KEY);
		}
		this.isValid = true; // assume this is a valid archive until we know it isn't
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#readDir()
	 */
	@Override
	public synchronized boolean readDir() {
		CloseableHttpClient httpclient = UrlClientFactory.getHttpClientInstance();
		ArchiveInfo info = new ArchiveInfo();
		int offset = 0;
		int limit = archiveBatchSize;
		int cnt = 0;
        try {
            do {
                // read archive info in batches
                info = readArchiveInfo(httpclient, offset, limit, info);
                if (info.unmodified) {
                    // archive info not modified
                    return isValid;
                }
                offset += limit;
                if (++cnt > MAX_INFO_REQUESTS) throw new IOException("Too many archive info calls!");
            } while (info.processedFiles < info.totalFiles);
            // set archive info
            this.files = info.files;
            this.meta = info.archiveMeta;
            this.dirMTime = info.mtime;
        } catch (IOException | URISyntaxException e) {
            logger.error("Error reading CDSTAR archive.", e);
        }
		return isValid;
	}

    /**
     * @param httpclient
     * @param offset 
     * @param info
     * @return
     * @throws IOException
     * @throws URISyntaxException
     */
    protected ArchiveInfo readArchiveInfo(CloseableHttpClient httpclient, int offset, int limit, ArchiveInfo info)
            throws IOException, URISyntaxException {
        // construct CDSTAR archive info request
        URI httpUri = new URIBuilder(archiveUrl).setParameter("with", "files,meta")
                .setParameter("limit", Integer.toString(limit))
                .setParameter("offset", Integer.toString(offset))
                .build();
        HttpGet httpget = new HttpGet(httpUri);
        logger.debug("Reading CDSTAR archive listing for " + archiveUrl + " (" + offset + "," + limit + ")");
        CloseableHttpResponse response = httpclient.execute(httpget);
        int status = response.getStatusLine().getStatusCode();
        if (status != 200) {
            if (status == 404) {
                isValid = false;
                throw new FileOpException("CDSTAR archive does not exist.");
            } else {
                throw new FileOpException("CDSTAR archive listing status not OK: " + status);
            }
        }
        try {
            HttpEntity entity = response.getEntity();
            if (entity != null) {
                String ct = entity.getContentType().getValue();
                if (!ct.startsWith("application/json")) {
                    throw new FileOpException("CDSTAR archive listing is not JSON: " + ct);
                }
                InputStream instream = entity.getContent();
                try {
                    // process archive and file information
                    info = readFilesJson(instream, info);
                } finally {
                    instream.close();
                }
            }
        } finally {
            response.close();
        }
        return info;
    }

    /**
     * @param instream
     * @param info 
     * @return 
     */
    protected ArchiveInfo readFilesJson(InputStream instream, ArchiveInfo info) {
        JsonReader reader = Json.createReader(instream);
        /*
         * parse archive JSON
         */
        JsonObject archive = reader.readObject();
        int count = archive.getInt("file_count");
        info.totalFiles = count;
        // get archive's modification time
        String modtime = archive.getString("modified");
        // make Java Instance conformant
        modtime = modtime.replaceAll("\\+(.*)$", "Z");
        long mtime = Instant.parse(modtime).toEpochMilli();
        info.mtime = mtime;
        if (mtime == this.dirMTime) {
            // modification time did not change
            logger.debug("CDSTAR archive is unmodified.");
            info.unmodified = true;
            return info;
        } else {
            info.unmodified = false;
        }
        // read metadata
        if (archive.containsKey("meta")) {
            JsonObject metaJson = archive.getJsonObject("meta");
            MetadataMap archiveMeta = new MetadataMap();
            for (String key : metaJson.keySet()) {
                // copy metadata as-is
                archiveMeta.put(key, metaJson.getString(key));
            }
            info.archiveMeta = new CdstarArchiveMeta(archiveMeta);    
        }
        // read file list        
        JsonArray cdfiles = archive.getJsonArray("files");
        info.processedFiles += cdfiles.size();
        for (JsonValue cdfile : cdfiles) {
            /*
             * parse file JSON
             */
        	JsonObject cdf = cdfile.asJsonObject();
        	String name = cdf.getString("name");
        	String mt = cdf.getString("type");
        	if (FileOps.classForMimetype(mt) != FileOps.FileClass.IMAGE) {
        	    // not an image file
        	    continue;
        	}
        	// create ImageSet with ImageUrl for file
        	DocuImageSet imgSet = new DocuImageSet(name);
            ImageUrl imgUrl = new ImageUrl(name, archiveUrl + "/" + name);
            imgUrl.setMimetype(mt);
            imgSet.add(imgUrl);
            // read metadata
            if (cdf.containsKey("meta")) {
                JsonObject metaJson = cdf.getJsonObject("meta");
                MetadataMap fileMeta = new MetadataMap();
                int imgWidth = 0;
                int imgHeight = 0;
                for (String key : metaJson.keySet()) {
                    // copy metadata as String
                    fileMeta.put(key, metaJson.get(key).toString());
                    // try to extract image size assuming the value is an array
                    if (key.equals(META_IMAGE_WIDTH_KEY)) {
                        try {
                            JsonArray val = metaJson.getJsonArray(key);
                            imgWidth = Integer.parseInt(val.getString(0));
                        } catch (Exception e) {
                            logger.error("Got invalid image width", e);
                        }
                    } else if (key.equals(META_IMAGE_HEIGHT_KEY)) {
                        try {
                            JsonArray val = metaJson.getJsonArray(key);
                            imgHeight = Integer.parseInt(val.getString(0));
                        } catch (Exception e) {
                            logger.error("Got invalid image height", e);
                        }
                    }
                }
                // set metadata
                imgSet.setMeta(new CdstarFileMeta(fileMeta));
                // set image size
                if (imgWidth > 0 && imgHeight > 0) {
                    imgUrl.setSize(new ImageSize(imgWidth, imgHeight));
                }
            }
        	info.files.add(imgSet);
        }
        return info;
    }


	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#refresh()
	 */
	@Override
	public synchronized boolean refresh() {
        if (isValid) {
            if (System.currentTimeMillis() > objectATime + REFRESH_DELAY) {
                // last readDir is at least 10s ago
                readDir();
                touch();
            }
        }
        return isValid;
	}

	@Override
	public String createParentName(String fn) {
		String[] parts = fn.split("/");
		// our parent is vault-id/archive-id
		if (parts.length > 1) {
			return parts[0] + "/" + parts[1];
		}
		return "";
	}

	@Override
	public String createFilename(String fn) {
		String[] parts = fn.split("/");
        // our filename is whats comes after vault-id/archive-id
		if (parts.length > 1) {
			return String.join("/", Arrays.copyOfRange(parts, 2, parts.length));
		}
		return fn;
	}

    /**
     * Small data class with information about the CDSTAR archive.
     * 
     * @author casties
     *
     */
    public class ArchiveInfo {

        public DirMeta archiveMeta = null;
        public List<DocuDirent> files = new ArrayList<DocuDirent>();
        public int totalFiles = 0;
        public int processedFiles = 0;
        public boolean unmodified = false;
        public long mtime = 0;
        
    }


}
