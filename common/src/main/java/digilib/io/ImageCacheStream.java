/**
 * 
 */
package digilib.io;

import java.io.IOException;
import java.io.InputStream;

import javax.imageio.ImageIO;
import javax.imageio.stream.ImageInputStream;

/**
 * @author casties
 *
 */
public class ImageCacheStream extends ImageStream {

    private ImageInputStream iis = null;
    
    /** Create ImageCacheStream from InputStream and mime-type.
     * 
     * @param stream
     * @param mimeType
     * @throws IOException 
     */
    public ImageCacheStream(InputStream stream, String mimeType) throws IOException {
        super(stream, mimeType);
        /*
         * Type of stream backing configured via ImageIO.setUseCache(). 
         * [...] In general, it is preferable to
         * use a FileCacheImageInputStream when reading from a regular
         * InputStream. This class is provided for cases where it is not
         * possible to create a writable temporary file.
         */
        iis = ImageIO.createImageInputStream(stream);
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.io.ImageInput#hasImageInputStream()
     */
    @Override
    public boolean hasImageInputStream() {
        return true;
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.io.ImageInput#getImageInputStream()
     */
    @Override
    public ImageInputStream getImageInputStream() {
        return iis;
    }

}
