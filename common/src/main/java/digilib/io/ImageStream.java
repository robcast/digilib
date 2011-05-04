/**
 * 
 */
package digilib.io;

import java.io.InputStream;

/**
 * @author casties
 * 
 */
public class ImageStream extends ImageInput {

    protected InputStream stream = null;

    /** Create ImageStream from InputStream and String.
     * 
     * @param stream
     * @param mimeType mime-type
     */
    public ImageStream(InputStream stream, String mimeType) {
        this.stream = stream;
        this.mimetype = mimeType;
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.io.ImageInput#hasInputStream()
     */
    @Override
    public boolean hasInputStream() {
        return true;
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.io.ImageInput#getInputStream()
     */
    @Override
    public InputStream getInputStream() {
        return stream;
    }

}
