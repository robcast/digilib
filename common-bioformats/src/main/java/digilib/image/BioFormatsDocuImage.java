/**
 * 
 */
package digilib.image;

import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;

import loci.formats.FormatException;
import loci.formats.IFormatWriter;
import loci.formats.ImageReader;
import loci.formats.ImageWriter;
import loci.formats.gui.BufferedImageReader;
import loci.formats.gui.BufferedImageWriter;
import loci.formats.meta.DummyMetadata;
import loci.formats.meta.MetadataRetrieve;

import digilib.io.FileOpException;
import digilib.io.ImageInput;
import digilib.util.ImageSize;

/**
 * @author casties
 * 
 */
public class BioFormatsDocuImage extends DocuImageImpl {

    private BufferedImage img;
    private Object imageSize;
    private RenderingHints renderHint;
    private ImageReader reader;

    /*
     * (non-Javadoc)
     * 
     * @see digilib.image.DocuImageImpl#identify(digilib.io.ImageInput)
     */
    @Override
    public ImageInput identify(ImageInput ii) throws IOException {
        ImageReader reader = new ImageReader();
        try {
            reader.setId(ii.getFile().getAbsolutePath());
        } catch (FormatException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
        int width = reader.getSizeX();
        int height = reader.getSizeY();
        String fmt = reader.getFormat();

        String mt = "";
        if (fmt.equalsIgnoreCase("Tagged Image File Format")) {
            mt = "image/tiff";
        } else if (fmt.equalsIgnoreCase("JPEG")) {
            mt = "image/jpeg";
        }

        logger.debug("BioFormats identify: width=" + width + " height=" + height + " format=" + fmt + " mimetype=" + mt);
        ii.setSize(new ImageSize(width, height));
        ii.setMimetype(mt);
        return ii;
    }

    @Override
    public void loadImage(ImageInput ii) throws FileOpException {
        logger.debug("loadImage: " + ii);
        this.input = ii;
        reader = new ImageReader();
        try {
            reader.setId(ii.getFile().getAbsolutePath());
            BufferedImageReader biReader = BufferedImageReader.makeBufferedImageReader(reader);
            img = biReader.openImage(0);
            logger.debug("image loaded: " + img);
        } catch (FormatException e) {
            throw new FileOpException("Unable to load image format: " + e);
        } catch (IOException e) {
            throw new FileOpException("Unable to load image file: " + e);
        }
    }

    @Override
    public void scale(double scaleX, double scaleY) throws ImageOpException {
        logger.debug("scale: " + scaleX);
        /* for downscaling in high quality the image is blurred first */
        if ((scaleX <= 0.5) && (quality > 1)) {
            int bl = (int) Math.floor(1 / scaleX);
            // blur(bl);
        }
        /* then scaled */
        AffineTransformOp scaleOp = new AffineTransformOp(AffineTransform.getScaleInstance(scaleX, scaleY), renderHint);
        img = scaleOp.filter(img, null);
        logger.debug("scaled to " + img.getWidth() + "x" + img.getHeight() + " img=" + img);
        // invalidate image size
        imageSize = null;
    }

    public void setQuality(int qual) {
        quality = qual;
        renderHint = new RenderingHints(null);
        // hint.put(RenderingHints.KEY_ANTIALIASING,
        // RenderingHints.VALUE_ANTIALIAS_OFF);
        // setup interpolation quality
        if (qual > 0) {
            logger.debug("quality q1");
            renderHint.put(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        } else {
            logger.debug("quality q0");
            renderHint.put(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
        }
    }

    public void crop(int x_off, int y_off, int width, int height) throws ImageOpException {
        // setup Crop
        img = img.getSubimage(x_off, y_off, width, height);
        logger.debug("CROP:" + img.getWidth() + "x" + img.getHeight());
        // invalidate image size
        imageSize = null;
    }

    @Override
    public void writeImage(String mt, OutputStream ostream) throws ImageOpException, FileOpException {
        logger.debug("writeImage");
        File outFile;
        String filext = ".jpg";
        if (mt.equals("image/png")) {
            filext = ".png";
        }
        try {
            outFile = File.createTempFile("biof_temp", filext);
        } catch (IOException e) {
            throw new FileOpException(e.toString());
        }
        // save image to file
        ImageWriter iw = new ImageWriter();
        /*
         * try { //iw.setMetadataRetrieve(new DummyMetadata());
         * //iw.setSeries(0); //iw.setId(outFile.getAbsolutePath());
         * //logger.debug("writer="+iw); } catch (FormatException e) { throw new
         * FileOpException(e.toString()); } catch (IOException e) { // TODO
         * Auto-generated catch block e.printStackTrace(); } /* if
         * (mt.endsWith("png")) { iw = }
         */
        BufferedImageWriter writer = BufferedImageWriter.makeBufferedImageWriter(iw);
        try {
            logger.debug("setting metadata");
            iw.setMetadataRetrieve((MetadataRetrieve) reader.getMetadataStore());
            logger.debug("writing to file  " + outFile);
            writer.setId(outFile.getAbsolutePath());
            logger.debug("saving image " + img);
            writer.saveImage(0, img);
            logger.debug("closing file");
            writer.close();
        } catch (FormatException e1) {
            // TODO Auto-generated catch block
            e1.printStackTrace();
        } catch (IOException e1) {
            // TODO Auto-generated catch block
            e1.printStackTrace();
        }
        // now send file
        FileInputStream inFile = null;
        try {
            inFile = new FileInputStream(outFile);
            byte dataBuffer[] = new byte[4096];
            int len;
            while ((len = inFile.read(dataBuffer)) != -1) {
                // copy out file
                ostream.write(dataBuffer, 0, len);
            }
        } catch (IOException e) {
            throw new FileOpException(e.toString());
        } finally {
            try {
                if (inFile != null) {
                    inFile.close();
                }
            } catch (IOException e) {
                // nothing to do
            }
        }

    }

}
