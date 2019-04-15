/**
 * 
 */
package digilib.io;

import java.net.URISyntaxException;

import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.utils.URIBuilder;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;

import digilib.conf.DigilibConfiguration;

/**
 * @author casties
 *
 */
public class UrlClient {
	public static String STORAGE_USERNAME = null;
	public static String STORAGE_PASSWORD = null;
	public static String STORAGE_SCOPE_HOST = null;
	public static int STORAGE_SCOPE_PORT = 0;
	

	public static void configure(DigilibConfiguration dlConfig) {
		STORAGE_USERNAME = dlConfig.getAsString("storage-auth-username");
		STORAGE_PASSWORD = dlConfig.getAsString("storage-auth-password");
		try {
			URIBuilder uri = new URIBuilder(dlConfig.getAsString("storage-base-url"));
			STORAGE_SCOPE_HOST = uri.getHost();
			STORAGE_SCOPE_PORT = uri.getPort();
		} catch (URISyntaxException e) {
		}
	}
	
	public static CloseableHttpClient getHttpClient() {
        CredentialsProvider credsProvider = new BasicCredentialsProvider();
        credsProvider.setCredentials(
                new AuthScope(STORAGE_SCOPE_HOST, STORAGE_SCOPE_PORT),
                new UsernamePasswordCredentials(STORAGE_USERNAME, STORAGE_PASSWORD));
        CloseableHttpClient httpclient = HttpClients.custom()
                .setDefaultCredentialsProvider(credsProvider)
                .build();
		return httpclient;
	}

}
