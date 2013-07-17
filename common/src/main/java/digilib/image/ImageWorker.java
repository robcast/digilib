package digilib.image;

/*
 * #%L
 * Worker (Callable) that renders an image.
 * %%
 * Copyright (C) 2010 - 2013 MPIWG Berlin
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
 * Author: Robert Casties (robcast@berlios.de)
 */

import java.awt.Rectangle;
import java.io.IOException;
import java.util.concurrent.Callable;

import org.apache.log4j.Logger;

import digilib.conf.DigilibConfiguration;
import digilib.io.FileOpException;

/**
 * Worker that renders an image.
 * 
 * @author casties
 * 
 */
public class ImageWorker implements Callable<DocuImage> {

    protected static Logger logger = Logger.getLogger(ImageWorker.class);
    private DigilibConfiguration dlConfig;
    private ImageJobDescription jobinfo;

    /** flag for stopping the thread */
    private boolean stopNow = false;

    public ImageWorker(DigilibConfiguration dlConfig,
            ImageJobDescription jobinfo) {
        super();
        this.dlConfig = dlConfig;
        this.jobinfo = jobinfo;
    }

    /**
     * render and return the image
     */
    public DocuImage call() throws FileOpException, IOException,
            ImageOpException {

        logger.debug("ImageWorker starting");
        long startTime = System.currentTimeMillis();
        if (stopNow) {
            logger.debug("ImageWorker stopping (at the beginning)");
            return null;
        }

        DocuImage docuImage = jobinfo.getDocuImage();
        if (docuImage == null) {
            docuImage = DocuImageFactory.getInstance();
            if (docuImage == null) {
                throw new ImageOpException("Unable to get DocuImage instance!");
            }
        }

        // set interpolation quality
        docuImage.setQuality(jobinfo.getScaleQual());

        Rectangle loadRect = jobinfo.getOuterUserImgArea().getBounds();
        float scaleXY = jobinfo.getScaleXY();

        if (stopNow) {
            logger.debug("ImageWorker stopping (after setup)");
            return null;
        }
        // use subimage loading if possible
        if (docuImage.isSubimageSupported()) {
            logger.debug("Subimage: scale " + scaleXY + " = " + (1 / scaleXY));
            float subf = 1f;
            float subsamp = 1f;
            if (scaleXY < 1) {
                subf = 1 / scaleXY;
                // for higher quality reduce subsample factor by minSubsample
                if (jobinfo.getScaleQual() > 0) {
                    subsamp = (float) Math
                            .max(Math.floor(subf
                                    / dlConfig.getAsFloat("subsample-minimum")),
                                    1d);
                } else {
                    subsamp = (float) Math.floor(subf);
                }
                scaleXY = subsamp / subf;
                logger.debug("Using subsampling: " + subsamp + " rest "
                        + scaleXY);
            }
            docuImage.loadSubimage(jobinfo.getInput(), loadRect, (int) subsamp);
            logger.debug("SUBSAMP: " + subsamp + " -> " + docuImage.getSize());
            if (stopNow) {
                logger.debug("ImageWorker stopping (after loading and cropping)");
                return null;
            }
            docuImage.scale(scaleXY, scaleXY);
        } else {
            // else load and crop the whole file
            docuImage.loadImage(jobinfo.getInput());
            if (stopNow) {
                logger.debug("ImageWorker stopping (after loading)");
                return null;
            }
            docuImage.crop((int) loadRect.getX(), (int) loadRect.getY(),
                    (int) loadRect.getWidth(), (int) loadRect.getHeight());
            if (stopNow) {
                logger.debug("ImageWorker stopping (after cropping)");
                return null;
            }
            docuImage.scale(scaleXY, scaleXY);
        }

        if (stopNow) {
            logger.debug("ImageWorker stopping (after scaling)");
            return null;
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

        if (stopNow) {
            logger.debug("ImageWorker stopping (after mirroring)");
            return null;
        }
        // rotate image
        if (jobinfo.getAsFloat("rot") != 0d) {
            docuImage.rotate(jobinfo.getAsFloat("rot"));
            /*
             * if (jobinfo.get_wholeRotArea()) { // crop to the inner bounding
             * box float xcrop = (float) (docuImage.getWidth() -
             * jobinfo.get_innerUserImgArea().getWidth() scaleXY); float ycrop =
             * (float) (docuImage.getHeight() -
             * jobinfo.get_innerUserImgArea().getHeight() scaleXY); if ((xcrop >
             * 0) || (ycrop > 0)) { // only crop smaller xcrop = (xcrop > 0) ?
             * xcrop : 0; ycrop = (ycrop > 0) ? ycrop : 0; // crop image
             * docuImage.crop((int) (xcrop / 2), (int) (ycrop / 2), (int)
             * (docuImage.getWidth() - xcrop), (int) (docuImage.getHeight() -
             * ycrop)); } }
             */

        }

        if (stopNow) {
            logger.debug("ImageWorker stopping (after rotating)");
            return null;
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

        if (stopNow) {
            logger.debug("ImageWorker stopping (after enhanceRGB)");
            return null;
        }
        // contrast and brightness enhancement
        float paramCONT = jobinfo.getAsFloat("cont");
        float paramBRGT = jobinfo.getAsFloat("brgt");
        if ((paramCONT != 0f) || (paramBRGT != 0f)) {
            float mult = (float) Math.pow(2, paramCONT);
            docuImage.enhance(mult, paramBRGT);
        }

        if (stopNow) {
            logger.debug("ImageWorker stopping (after enhance)");
            return null;
        }
        // color operation
        DocuImage.ColorOp colop = jobinfo.getColOp();
        if (colop != null) {
            docuImage.colorOp(colop);
        }

        logger.debug("rendered in " + (System.currentTimeMillis() - startTime)
                + "ms");

        return docuImage;
    }

    /**
     * Set the stopNow flag. Thread stops at the next occasion.
     */
    public void stopNow() {
        this.stopNow = true;
    }
    
}
