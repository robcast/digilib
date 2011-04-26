/**
 * 
 */
package digilib.io;

import java.io.InputStream;

import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageInputStream;

/**
 * @author casties
 *
 */
public class ImageCacheStream extends ImageStream {

    public ImageCacheStream(InputStream stream, String mimeType) {
        super(stream, mimeType);
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
        /*
         * TODO: which type of stream backing? 
         * In general, it is preferable to
         * use a FileCacheImageInputStream when reading from a regular
         * InputStream. This class is provided for cases where it is not
         * possible to create a writable temporary file.
         */
        ImageInputStream iis = new MemoryCacheImageInputStream(this.stream);
        return iis;
    }

}
