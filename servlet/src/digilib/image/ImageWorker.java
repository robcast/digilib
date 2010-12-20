/** Worker (Callable) that renders an image.
 * 
 */
package digilib.image;

import java.awt.Rectangle;
import java.io.IOException;
import java.util.concurrent.Callable;

import org.apache.log4j.Logger;

import digilib.io.FileOpException;
import digilib.servlet.DigilibConfiguration;

/** Worker that renders an image.
 * 
 * @author casties
 *
 */
public class ImageWorker implements Callable<DocuImage> {

    
    protected static Logger logger = Logger.getLogger(ImageWorker.class);
    private DigilibConfiguration dlConfig;
    private ImageJobDescription jobinfo;

    public ImageWorker(DigilibConfiguration dlConfig, ImageJobDescription jobinfo) {
        super();
        this.dlConfig = dlConfig;
        this.jobinfo = jobinfo;
    }

    /**
     * render and return the image
     */
    @Override
    public DocuImage call() throws FileOpException, IOException, ImageOpException {
        
        logger.debug("image worker starting");
        long startTime = System.currentTimeMillis();

        /* crop and scale image */

        // new DocuImage instance
        DocuImage docuImage = DigilibConfiguration.getDocuImageInstance();
        if (docuImage == null) {
            throw new ImageOpException("Unable to load DocuImage class!");
        }

        // set interpolation quality
        docuImage.setQuality(jobinfo.getScaleQual());

        Rectangle loadRect = jobinfo.getOuterUserImgArea().getBounds();
        float scaleXY = jobinfo.getScaleXY();
        
        // use subimage loading if possible
        if (docuImage.isSubimageSupported()) {
            logger.debug("Subimage: scale " + scaleXY + " = " + (1 / scaleXY));
            float subf = 1f;
            float subsamp = 1f;
            if (scaleXY < 1) {
                subf = 1 / scaleXY;
                // for higher quality reduce subsample factor by minSubsample
                if (jobinfo.getScaleQual() > 0) {
                    subsamp = (float) Math.max(Math.floor(subf / dlConfig.getAsFloat("subsample-minimum")), 1d);
                } else {
                    subsamp = (float) Math.floor(subf);
                }
                scaleXY = subsamp / subf;
                logger.debug("Using subsampling: " + subsamp + " rest "
                        + scaleXY);
            }

            docuImage.loadSubimage(jobinfo.getFileToLoad(), loadRect, (int) subsamp);

            logger.debug("SUBSAMP: " + subsamp + " -> " + docuImage.getWidth()
                    + "x" + docuImage.getHeight());

            docuImage.scale(scaleXY, scaleXY);

        } else {
            // else load and crop the whole file
            docuImage.loadImage(jobinfo.getFileToLoad());
            docuImage.crop((int) loadRect.getX(), (int) loadRect.getY(),
                    (int) loadRect.getWidth(), (int) loadRect.getHeight());

            docuImage.scale(scaleXY, scaleXY);
        }

        // mirror image
        // operation mode: "hmir": mirror horizontally, "vmir": mirror
        // vertically
        if (jobinfo.hasOption("hmir")) {
            docuImage.mirror(0);
        }
        if (jobinfo.hasOption("vmir")) {
            docuImage.mirror(90);
        }

        // rotate image
        if (jobinfo.getAsFloat("rot") != 0d) {
            docuImage.rotate(jobinfo.getAsFloat("rot"));
            /* if (jobinfo.get_wholeRotArea()) {
                // crop to the inner bounding box
                float xcrop = (float) (docuImage.getWidth() - jobinfo.get_innerUserImgArea().getWidth()
                        * scaleXY);
                float ycrop = (float) (docuImage.getHeight() - jobinfo.get_innerUserImgArea().getHeight()
                        * scaleXY);
                if ((xcrop > 0) || (ycrop > 0)) {
                    // only crop smaller
                    xcrop = (xcrop > 0) ? xcrop : 0;
                    ycrop = (ycrop > 0) ? ycrop : 0;
                    // crop image
                    docuImage.crop((int) (xcrop / 2), (int) (ycrop / 2),
                            (int) (docuImage.getWidth() - xcrop),
                            (int) (docuImage.getHeight() - ycrop));
                }
            } */

        }

        // color modification
        float[] paramRGBM = jobinfo.getRGBM();
        float[] paramRGBA = jobinfo.getRGBA();
        if ((paramRGBM != null) || (paramRGBA != null)) {
            // make sure we actually have two arrays
            if (paramRGBM == null) {
                paramRGBM = new float[3];
            }
            if (paramRGBA == null) {
                paramRGBA = new float[3];
            }
            // calculate "contrast" values (c=2^x)
            float[] mult = new float[3];
            for (int i = 0; i < 3; i++) {
                mult[i] = (float) Math.pow(2, (float) paramRGBM[i]);
            }
            docuImage.enhanceRGB(mult, paramRGBA);
        }

        // contrast and brightness enhancement
        float paramCONT = jobinfo.getAsFloat("cont");
        float paramBRGT = jobinfo.getAsFloat("brgt");
        if ((paramCONT != 0f) || (paramBRGT != 0f)) {
            float mult = (float) Math.pow(2, paramCONT);
            docuImage.enhance(mult, paramBRGT);
        }

        logger.debug("rendered in " + (System.currentTimeMillis() - startTime) + "ms");

        return docuImage;
    }

}
