/**
 * 
 */
package digilib.io;

/*-
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2001 - 2020 digilib Community
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 */

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
public class UrlClientFactory {
    /** digilib-config key for the CDSTAR base URL */
	public static final String STORAGE_BASE_URL_KEY = "storage-base-url";
    /** digilib-config key for the CDSTAR auth password */
    public static final String STORAGE_PASSWORD_KEY = "storage-auth-password";
    /** digilib-config key for the CDSTAR auth user */
    public static final String STORAGE_USERNAME_KEY = "storage-auth-username";
    public static String STORAGE_USERNAME = null;
	public static String STORAGE_PASSWORD = null;
	public static String STORAGE_SCOPE_HOST = null;
	public static int STORAGE_SCOPE_PORT = 0;
	

	/**
	 * Configures this static UrlClientFactory.
	 * 
	 * @param dlConfig
	 */
	public static void configure(DigilibConfiguration dlConfig) {
		STORAGE_USERNAME = dlConfig.getAsString(STORAGE_USERNAME_KEY);
		STORAGE_PASSWORD = dlConfig.getAsString(STORAGE_PASSWORD_KEY);
		try {
			URIBuilder uri = new URIBuilder(dlConfig.getAsString(STORAGE_BASE_URL_KEY));
			STORAGE_SCOPE_HOST = uri.getHost();
			STORAGE_SCOPE_PORT = uri.getPort();
		} catch (URISyntaxException e) {
		}
	}
	
	/**
	 * Returns a new HttpClient with Credentials.
	 * 
	 * @return
	 */
	public static CloseableHttpClient getHttpClientInstance() {
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
