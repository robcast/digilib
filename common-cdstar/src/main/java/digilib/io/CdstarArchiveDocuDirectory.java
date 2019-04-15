package digilib.io;

import java.io.InputStream;
import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;

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
    protected static final String META_IMAGE_HEIGHT_KEY = "exif:Image.ImageHeight";
    /** key for image width in CDSTAR metadata */
    protected static final String META_IMAGE_WIDTH_KEY = "exif:Image.ImageWidth";
    /** time in ms to delay the next HTTP call and reuse existing information */
	protected static final int REFRESH_DELAY = 10*1000;
	/** number of files to read in one request */
	protected static final int FILES_BATCH_SIZE = 100;
	/** digilib-config key for the CDSTAR base URL */
    public static final String STORAGE_URL_KEY = "storage-base-url";
	
	protected String archiveUrl;
	
	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#configure(java.lang.String, digilib.io.FileOps.FileClass, digilib.conf.DigilibConfiguration)
	 */
	@Override
	public void configure(String path, FileClass fileClass, DigilibConfiguration dlConfig) {
		// configure static client object TODO: do this only once?
		UrlClient.configure(dlConfig);
		if (path.split("/").length != 2) {
			// archive path should contain one slash
			this.isValid = false;
			return;
		}
		super.configure(path, fileClass, dlConfig);
		archiveUrl = dlConfig.getAsString(STORAGE_URL_KEY) + "/" + path;
		this.isValid = true; // assume this is a valid archive until we know it isn't
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#readDir()
	 */
	@Override
	public boolean readDir() {
		CloseableHttpClient httpclient = UrlClient.getHttpClient();
        readFiles(httpclient);

		return false;
	}

    /**
     * @param httpclient
     */
    protected void readFiles(CloseableHttpClient httpclient) {
        try {
            URI httpUri = new URIBuilder(archiveUrl)
                    .setParameter("with", "files,meta")
                    .setParameter("limit", Integer.toString(FILES_BATCH_SIZE))
                    .build();
            HttpGet httpget = new HttpGet(httpUri);
		    logger.debug("Reading CDSTAR archive listing for "+archiveUrl);
			CloseableHttpResponse response = httpclient.execute(httpget);
			int status = response.getStatusLine().getStatusCode();
			if (status != 200) {
			    if (status == 404) {
			        logger.error("CDSTAR archive does not exist.");
			        isValid = false;
			        throw new FileOpException("CDSTAR archive does not exist.");
			    } else {
			        logger.error("CDSTAR archive listing status not OK: "+status);
			        this.files = new ArrayList<DocuDirent>();
			        throw new FileOpException("CDSTAR archive listing status not OK!");
			    }
			}
			try {
				HttpEntity entity = response.getEntity();
				if (entity != null) {
					String ct = entity.getContentType().getValue();
					if (!ct.startsWith("application/json")) {
						logger.error("CDSTAR archive listing is not JSON: "+ct);
				        this.files = new ArrayList<DocuDirent>();
				        throw new FileOpException("CDSTAR archive listing is not JSON!");
					}
					InputStream instream = entity.getContent();
					try {
					    readFilesJson(instream);
					} finally {
						instream.close();
					}
				}
			} finally {
				response.close();
			}
		} catch (Exception e) {
			logger.error("ERROR getting CDSTAR archive listing.", e);
		}
    }

    /**
     * @param instream
     */
    protected void readFilesJson(InputStream instream) {
        JsonReader reader = Json.createReader(instream);
        /*
         * parse archive JSON
         */
        JsonObject archive = reader.readObject();
        int count = archive.getInt("file_count");
        // get archive's modification time
        String modtime = archive.getString("modified");
        // make Java Instance conformant
        modtime = modtime.replaceAll("\\+(.*)$", "Z");
        long mtime = Instant.parse(modtime).toEpochMilli();
        if (mtime == this.dirMTime) {
            // modification time did not change
            logger.debug("CDSTAR archive is unmodified.");
            return;
        }
        // read metadata
        if (archive.containsKey("meta")) {
            JsonObject metaJson = archive.getJsonObject("meta");
            MetadataMap archiveMeta = new MetadataMap();
            for (String key : metaJson.keySet()) {
                // copy metadata as-is
                archiveMeta.put(key, metaJson.getString(key));
            }
            this.meta = new CdstarArchiveMeta(archiveMeta);    
        }
        // reset file list
        this.files = new ArrayList<DocuDirent>();
        JsonArray cdfiles = archive.getJsonArray("files");
        if (count > cdfiles.size()) {
            logger.warn("CDSTAR archive listing ("+count+") needs more requests! Only got "+cdfiles.size());
        	// TODO: paged result, needs more requests
        }
        for (JsonValue cdfile : cdfiles) {
            /*
             * parse file JSON
             */
        	JsonObject cdf = cdfile.asJsonObject();
        	String name = cdf.getString("name");
        	String mt = cdf.getString("type");
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
                    // copy metadata as-is
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
        	this.files.add(imgSet);
        }
        this.dirMTime = mtime;
    }


	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#refresh()
	 */
	@Override
	public boolean refresh() {
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
	public String findParentName(String fn) {
		String[] parts = fn.split("/");
		// our parent is vault-id/archive-id
		if (parts.length > 1) {
			return parts[0] + "/" + parts[1];
		}
		return "";
	}

	@Override
	public String findFilename(String fn) {
		String[] parts = fn.split("/");
        // our filename is whats comes after vault-id/archive-id
		if (parts.length > 1) {
			return String.join("/", Arrays.copyOfRange(parts, 2, parts.length));
		}
		return fn;
	}


}
