/**
 * 
 */
package digilib.io;

import java.io.InputStream;
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
		this.isValid = true; // TODO: this is not nice
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#readDir()
	 */
	@Override
	public boolean readDir() {
		this.files = new ArrayList<DocuDirent>();
		// TODO: handle authentication
        CredentialsProvider credsProvider = new BasicCredentialsProvider();
        credsProvider.setCredentials(
                new AuthScope("localhost", 8080),
                new UsernamePasswordCredentials("test", "test"));
        CloseableHttpClient httpclient = HttpClients.custom()
                .setDefaultCredentialsProvider(credsProvider)
                .build();
		//CloseableHttpClient httpclient = HttpClients.createDefault();
		HttpGet httpget = new HttpGet(archiveUrl + "?files");
		try {
			CloseableHttpResponse response = httpclient.execute(httpget);
			int status = response.getStatusLine().getStatusCode();
			if (status != 200) {
				logger.error("ReadDir content status not OK: "+status);
				return false;
			}
			try {
				HttpEntity entity = response.getEntity();
				if (entity != null) {
					String ct = entity.getContentType().getValue();
					if (!ct.startsWith("application/json")) {
						logger.error("ReadDir content is not JSON: "+ct);
						return false;
					}
					InputStream instream = entity.getContent();
					JsonReader reader = Json.createReader(instream);
					try {
						JsonObject archive = reader.readObject();
						int count = archive.getInt("count");
						int total = archive.getInt("total");
						JsonArray cdfiles = archive.getJsonArray("files");
						if (count != total) {
							// paged result, needs more requests
						}
						for (JsonValue cdfile : cdfiles) {
							JsonObject cdf = cdfile.asJsonObject();
							String name = cdf.getString("name");
							ImageUrlSet imgUrl = new ImageUrlSet(name, archiveUrl + "/" + name);
							this.files.add(imgUrl);
						}
						// TODO: can we get a better modification time?
						this.dirMTime = System.currentTimeMillis();
					} finally {
						instream.close();
					}
				}
			} finally {
				response.close();
			}
		} catch (Exception e) {
			
		}

		return false;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirectory#refresh()
	 */
	@Override
	public boolean refresh() {
		// TODO Auto-generated method stub
		return readDir();
	}

	@Override
	public String findParentName(String fn) {
		String[] parts = fn.split("/");
		if (parts.length > 1) {
			return parts[0] + "/" + parts[1];
		}
		return null;
	}

	@Override
	public String findFilename(String fn) {
		String[] parts = fn.split("/");
		if (parts.length > 1) {
			return String.join("/", Arrays.copyOfRange(parts, 2, parts.length));
		}
		return null;
	}


}
