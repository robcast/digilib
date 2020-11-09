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

import java.io.IOException;
import java.io.InputStream;

import javax.imageio.ImageIO;
import javax.imageio.stream.ImageInputStream;

import org.apache.http.HttpEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.image.DocuImage;
import digilib.image.DocuImageFactory;
import digilib.util.ImageSize;

/**
 * @author casties
 *
 */
public class ImageUrl extends ImageInput {

    protected static final Logger logger = LoggerFactory.getLogger(ImageUrl.class);
    
    protected String name;
    protected String url;

    /**
     * Create ImageUrl with local name and URL.
     */
    public ImageUrl(String name, String url) {
        super();
        this.name = name;
        this.url = url;
    }

    @Override
    public boolean hasImageInputStream() {
        return true;
    }

    @Override
    public ImageInputStream getImageInputStream() {
        // we assume the UrlClientFactory is already configured
        CloseableHttpClient httpclient = UrlClientFactory.getHttpClientInstance();
        HttpGet httpget = new HttpGet(url);
        CloseableHttpResponse response = null;
        try {
            logger.debug("Getting image input stream from URL {}", url);
            response = httpclient.execute(httpget);
            int status = response.getStatusLine().getStatusCode();
            if (status != 200) {
                logger.error("Read image content status not OK: {}", status);
                return null;
            }
            HttpEntity entity = response.getEntity();
            if (entity != null) {
                String ct = entity.getContentType().getValue();
                this.setMimetype(ct);
                InputStream instream = entity.getContent();
                return ImageIO.createImageInputStream(instream);
            }
        } catch (Exception e) {
            logger.error("Error getting input stream from URL {}: {}", url, e);
            try {
                if (response != null) {
                    response.close();
                }
            } catch (IOException e1) {
            }
        }
        return null;
    }

    /** 
     * Checks the image and sets size and type.
     */
    public synchronized void check() {
        if (pixelSize == null) {
            try {
                // use the configured toolkit to identify the image
                DocuImage di = DocuImageFactory.getInstance();
                di.identify(this);
            } catch (IOException e) {
                logger.error("Error checking image from URL {}: {}", url, e);
                // nothing much to do...
            }
        }
    }
    
    /* (non-Javadoc)
     * @see digilib.io.ImageInput#getSize()
     */
    @Override
    public ImageSize getSize() {
        check();
        return pixelSize;
    }

    @Override
    public ImageSize getTileSize() {
        check();
        return tileSize;
    }
}
