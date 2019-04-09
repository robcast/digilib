/**
 * 
 */
package digilib.io;

import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonObject;
import javax.json.JsonReader;
import javax.json.JsonValue;

import org.apache.http.HttpEntity;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;

import digilib.conf.DigilibConfiguration;
import digilib.io.FileOps.FileClass;
import digilib.meta.CdstarArchiveMeta;
import digilib.meta.CdstarFileMeta;
import digilib.meta.MetadataMap;
import digilib.util.ImageSize;

/**
 * @author casties
 *
 */
public class CdstarArchiveDocuDirectory extends DocuDirectory {

	public static final String STORAGE_URL_KEY = "storage-base-url";
	
	protected String archiveUrl;
	
	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#configure(java.lang.String, digilib.io.FileOps.FileClass, digilib.conf.DigilibConfiguration)
	 */
	@Override
	public void configure(String path, FileClass fileClass, DigilibConfiguration dlConfig) {
		if (path.split("/").length != 2) {
			// archive path should contain one slash
			this.isValid = false;
			return;
		}
		super.configure(path, fileClass, dlConfig);
		archiveUrl = dlConfig.getAsString(STORAGE_URL_KEY) + "/" + path;
		this.isValid = true; // TODO: when is an URL invalid?
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#readDir()
	 */
	@Override
	public boolean readDir() {
		// TODO: handle authentication
        CredentialsProvider credsProvider = new BasicCredentialsProvider();
        credsProvider.setCredentials(
                new AuthScope("localhost", 8080),
                new UsernamePasswordCredentials("test", "test"));
        CloseableHttpClient httpclient = HttpClients.custom()
                .setDefaultCredentialsProvider(credsProvider)
                .build();
		//CloseableHttpClient httpclient = HttpClients.createDefault();
		HttpGet httpget = new HttpGet(archiveUrl + "?with=files");
		try {
		    logger.debug("Reading CDSTAR archive listing for "+archiveUrl);
			CloseableHttpResponse response = httpclient.execute(httpget);
			int status = response.getStatusLine().getStatusCode();
			if (status != 200) {
				logger.error("CDSTAR archive listing status not OK: "+status);
		        this.files = new ArrayList<DocuDirent>();
				return false;
			}
			try {
				HttpEntity entity = response.getEntity();
				if (entity != null) {
					String ct = entity.getContentType().getValue();
					if (!ct.startsWith("application/json")) {
						logger.error("CDSTAR archive listing is not JSON: "+ct);
				        this.files = new ArrayList<DocuDirent>();
						return false;
					}
					InputStream instream = entity.getContent();
					JsonReader reader = Json.createReader(instream);
					try {
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
                            return true;
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
						if (count != cdfiles.size()) {
				            logger.warn("CDSTAR archive listing ("+count+") needs more requests! Only got "+cdfiles.size());
							// paged result, needs more requests
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
                                    fileMeta.put(key, metaJson.getString(key));
                                    // try to extract image size
                                    if (key.equals("exif:Image.ImageWidth")) {
                                        try {
                                            imgWidth = Integer.parseInt(metaJson.getString(key));
                                        } catch (NumberFormatException e) {
                                            logger.error("Got invalid image width", e);
                                        }
                                    } else if (key.equals("exif:Image.ImageHeight")) {
                                        try {
                                            imgHeight = Integer.parseInt(metaJson.getString(key));
                                        } catch (NumberFormatException e) {
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
						return true;
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

		return false;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#refresh()
	 */
	@Override
	public boolean refresh() {
        if (isValid) {
            if (System.currentTimeMillis() > objectATime + 10*1000) {
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
