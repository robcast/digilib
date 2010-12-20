/**
 * 
 */
package digilib.image;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;

import org.marcoschmidt.image.ImageInfo;

import digilib.io.ImageFile;
import digilib.io.ImageInput;

/** Simple abstract implementation of the <code>DocuImage</code> interface.
 * Implements only the identify method using the ImageInfo class.
 * @author casties
 *
 */
public abstract class ImageInfoDocuImage extends DocuImageImpl {

    /** Check image size and type and store in ImageFile f */
    public ImageInput identify(ImageFile imgf) throws IOException {
        // fileset to store the information
        File f = imgf.getFile();
        if (f == null) {
            throw new IOException("File not found!");
        }
        RandomAccessFile raf = new RandomAccessFile(f, "r");
        // set up ImageInfo object
        ImageInfo iif = new ImageInfo();
        iif.setInput(raf);
        iif.setCollectComments(false);
        iif.setDetermineImageNumber(false);
        logger.debug("identifying (ImageInfo) " + f);
        // try with ImageInfo first
        if (iif.check()) {
            ImageSize d = new ImageSize(iif.getWidth(), iif.getHeight());
            imgf.setSize(d);
            imgf.setMimetype(iif.getMimeType());
            //logger.debug("  format:"+iif.getFormatName());
            raf.close();
            logger.debug("image size: " + imgf.getSize());
            return imgf;
        } else {
            raf.close();
        }
        return null;
    }
        

}
