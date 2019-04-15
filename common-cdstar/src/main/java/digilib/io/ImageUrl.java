/**
 * 
 */
package digilib.io;

import java.io.IOException;
import java.io.InputStream;

import javax.imageio.ImageIO;
import javax.imageio.stream.ImageInputStream;

import org.apache.http.HttpEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.log4j.Logger;

import digilib.image.DocuImage;
import digilib.image.DocuImageFactory;
import digilib.util.ImageSize;

/**
 * @author casties
 *
 */
public class ImageUrl extends ImageInput {

    protected Logger logger = Logger.getLogger(this.getClass());
    
    protected String name;
    protected String url;

    /**
     * 
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
        CloseableHttpClient httpclient = UrlClient.getHttpClient();
        HttpGet httpget = new HttpGet(url);
        CloseableHttpResponse response = null;
        try {
            logger.debug("Getting image input stream from URL "+url);
            response = httpclient.execute(httpget);
            int status = response.getStatusLine().getStatusCode();
            if (status != 200) {
                logger.error("Read image content status not OK: " + status);
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
}
