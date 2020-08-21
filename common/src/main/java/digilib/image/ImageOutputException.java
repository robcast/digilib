package digilib.image;

import digilib.io.FileOpException;

/**
 * @author casties
 *
 */
public class ImageOutputException extends FileOpException {

    private static final long serialVersionUID = 4532389232535750471L;

    /**
     * 
     */
    public ImageOutputException() {
    }

    /**
     * @param message
     */
    public ImageOutputException(String message) {
        super(message);
    }

    /**
     * @param message
     * @param cause
     */
    public ImageOutputException(String message, Throwable cause) {
        super(message, cause);
    }

}
