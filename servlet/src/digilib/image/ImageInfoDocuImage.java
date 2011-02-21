/**
 * 
 */
package digilib.image;

import java.io.IOException;
import java.io.RandomAccessFile;

import org.marcoschmidt.image.ImageInfo;

import digilib.io.ImageInput;
import digilib.util.ImageSize;

/** Simple abstract implementation of the <code>DocuImage</code> interface.
 * Implements only the identify method using the ImageInfo class.
 * @author casties
 *
 */
public abstract class ImageInfoDocuImage extends DocuImageImpl {

    /* Check image size and type and store in ImageFile f */
    public ImageInput identify(ImageInput ii) throws IOException {
        logger.debug("identifying (ImageInfo) " + ii);
        RandomAccessFile raf = null;
        try {
            // set up ImageInfo object
            ImageInfo iif = new ImageInfo();
            if (ii.hasImageInputStream()) {
                iif.setInput(ii.getImageInputStream());
            } else if (ii.hasFile()) {
                raf = new RandomAccessFile(ii.getFile(), "r");
                iif.setInput(raf);
            } else {
                return null;
            }
            iif.setCollectComments(false);
            iif.setDetermineImageNumber(false);
            // try with ImageInfo first
            if (iif.check()) {
                ImageSize d = new ImageSize(iif.getWidth(), iif.getHeight());
                ii.setSize(d);
                ii.setMimetype(iif.getMimeType());
                logger.debug("image size: " + ii.getSize());
                return ii;
            }
            return null;
        } finally {
            // close file, don't close stream(?)
            if (raf != null) {
                raf.close();
            }
        }
    }
        

}
