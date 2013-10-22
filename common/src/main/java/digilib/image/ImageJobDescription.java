package digilib.image;

/*
 * #%L
 * A class for storing the set of parameters necessary for scaling images 
 * with an ImageWorker.
 * 
 * %%
 * Copyright (C) 2001 - 2013 MPIWG Berlin
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

import java.awt.geom.AffineTransform;
import java.awt.geom.Rectangle2D;
import java.io.IOException;

import org.apache.log4j.Logger;

import digilib.conf.DigilibConfiguration;
import digilib.conf.DigilibRequest;
import digilib.image.DocuImage.ColorOp;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.FileOps.FileClass;
import digilib.io.ImageInput;
import digilib.io.ImageSet;
import digilib.util.ImageSize;
import digilib.util.OptionsSet;
import digilib.util.Parameter;
import digilib.util.ParameterMap;

/**
 * A class for storing the set of parameters necessary for scaling images
 * with an ImageWorker.
 * 
 * This contains the functionality formerly found in Scaler.processRequest(),
 * only factorized.
 * 
 * @author cmielack, casties
 * 
 */

public class ImageJobDescription extends ParameterMap {

    DigilibConfiguration dlConfig = null;
    protected static Logger logger = Logger.getLogger("digilib.servlet");

    /* 
     * variables for caching values
     */
    ImageInput input = null;
    ImageSet imageSet = null;
    DocuDirectory fileDir = null;
    DocuImage docuImage = null;
    String filePath = null;
    ImageSize expectedSourceSize = null;
    Double scaleXY = null;
    Rectangle2D userImgArea = null;
    Rectangle2D outerUserImgArea = null;
    Boolean imageSendable = null;
    String mimeType = null;
    Integer paramDW = null;
    Integer paramDH = null;
    DocuDirCache dirCache = null;

    /**
     * create empty ImageJobDescription.
     * 
     * @param dlcfg
     */
    public ImageJobDescription(DigilibConfiguration dlcfg) {
        super(30);
        dlConfig = dlcfg;
        dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
    }

    /**
     * set up Parameters
     * 
     * @see digilib.util.ParameterMap#initParams()
     */
    @Override
    protected void initParams() {
        // url of the page/document (second part)
        newParameter("fn", "", null, 's');
        // page number
        newParameter("pn", new Integer(1), null, 's');
        // width of client in pixels
        newParameter("dw", new Integer(0), null, 's');
        // height of client in pixels
        newParameter("dh", new Integer(0), null, 's');
        // left edge of image (float from 0 to 1)
        newParameter("wx", new Float(0), null, 's');
        // top edge in image (float from 0 to 1)
        newParameter("wy", new Float(0), null, 's');
        // width of image (float from 0 to 1)
        newParameter("ww", new Float(1), null, 's');
        // height of image (float from 0 to 1)
        newParameter("wh", new Float(1), null, 's');
        // scale factor
        newParameter("ws", new Float(1), null, 's');
        // special options like 'fit' for gifs
        newParameter("mo", this.options, null, 's');
        // rotation angle (degree)
        newParameter("rot", new Float(0), null, 's');
        // contrast enhancement factor
        newParameter("cont", new Float(0), null, 's');
        // brightness enhancement factor
        newParameter("brgt", new Float(0), null, 's');
        // color multiplicative factors
        newParameter("rgbm", "0/0/0", null, 's');
        // color additive factors
        newParameter("rgba", "0/0/0", null, 's');
        // display dpi resolution (total)
        newParameter("ddpi", new Float(0), null, 's');
        // display dpi X resolution
        newParameter("ddpix", new Float(0), null, 's');
        // display dpi Y resolution
        newParameter("ddpiy", new Float(0), null, 's');
        // scale factor for mo=ascale
        newParameter("scale", new Float(1), null, 's');
        // color conversion operation
        newParameter("colop", "", null, 's');
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.servlet.ParameterMap#initOptions()
     */
    @Override
    protected void initOptions() {
        String s = this.getAsString("mo");
        options = new OptionsSet(s);
    }

    /**
     * Creates new ImageJobDescription by merging Parameters from a
     * DigilibRequest.
     * 
     * @param dlReq
     * @param dlcfg
     * @return
     */
    public static ImageJobDescription getInstance(DigilibRequest dlReq, DigilibConfiguration dlcfg) {
        ImageJobDescription newMap = new ImageJobDescription(dlcfg);
        // add all params to this map
        newMap.params.putAll(dlReq.getParams());
        newMap.initOptions();
        // add ImageJobDescription back into DigilibRequest
        dlReq.setJobDescription(newMap);
        return newMap;
    }

    /**
     * Creates new ImageJobDescription by merging Parameters from another
     * ParameterMap.
     * 
     * @param pm
     * @param dlcfg
     * @return
     */
    public static ImageJobDescription getInstance(ParameterMap pm, DigilibConfiguration dlcfg) {
        ImageJobDescription newMap = new ImageJobDescription(dlcfg);
        // add all params to this map
        newMap.params.putAll(pm.getParams());
        newMap.initOptions();
        return newMap;
    }

    /**
     * Returns the mime-type of the input.
     * 
     * @return
     * @throws IOException
     */
    public String getMimeType() throws IOException {
        if (mimeType == null) {
            input = getInput();
            mimeType = input.getMimetype();
        }
        return mimeType;
    }


    /**
     * Return the mime-type of the output.
     * 
     * @return
     */
    public String getOutputMimeType() {
        // forced destination image type
        if (hasOption("jpg")) {
            return "image/jpeg";
        } else if (hasOption("png")) {
            return "image/png";
        }
        // use input image type
        try {
            String mt = getMimeType();
            if ((mt.equals("image/jpeg") || mt.equals("image/jp2") || mt.equals("image/fpx"))) {
                return "image/jpeg";
            } else {
                return "image/png";
            }
        } catch (IOException e) {
            logger.error("No input when trying to getOutputMimeType!");
        }
        return null;
    }
    
    /**
     * Set the current ImageInput.
     * 
     * @param input
     *            the input to set
     */
    public void setInput(ImageInput input) {
        this.input = input;
        // create and set ImageSet if needed
        if (dirCache == null && imageSet == null) {
            imageSet = new ImageSet();
            imageSet.add(input);
        }
    }

    /**
     * Returns the ImageInput to use.
     * 
     * @return
     * @throws IOException
     */
    public ImageInput getInput() throws IOException {
        if (input == null) {
            imageSet = getImageSet();

            /* select a resolution */
            if (isHiresOnly()) {
                // get first element (= highest resolution)
                input = imageSet.getBiggest();
            } else if (isLoresOnly()) {
                // enforced lores uses next smaller resolution
                input = imageSet.getNextSmaller(getExpectedSourceSize());
                if (input == null) {
                    // this is the smallest we have
                    input = imageSet.getSmallest();
                }
            } else {
                // autores: use next higher resolution
                input = imageSet.getNextBigger(getExpectedSourceSize());
                if (input == null) {
                    // this is the highest we have
                    input = imageSet.getBiggest();
                }
            }
            if (input == null || input.getMimetype() == null) {
                throw new FileOpException("Unable to load " + input);
            }
            logger.info("Planning to load: " + input);
        }
        return input;
    }

    /**
     * Returns the DocuDirectory for the input (file).
     * 
     * @return
     * @throws FileOpException
     */
    public DocuDirectory getFileDirectory() throws FileOpException {
        if (fileDir == null) {
            String fp = getFilePath();
            fileDir = dirCache.getDirectory(fp);
            if (fileDir == null) {
                throw new FileOpException("Directory " + getFilePath() + " not found.");
            }
        }
        return fileDir;
    }

    /**
     * Returns the ImageSet to load.
     * 
     * @return
     * @throws FileOpException
     */
    public ImageSet getImageSet() throws FileOpException {
        if (imageSet == null) {
            if (dirCache == null) {
                throw new FileOpException("No DirCache configured!");
            }
            imageSet = (ImageSet) dirCache.getFile(getFilePath(), getAsInt("pn"), FileClass.IMAGE);
            if (imageSet == null) {
                throw new FileOpException("File " + getFilePath() + "(" + getAsInt("pn") + ") not found.");
            }
        }
        return imageSet;
    }

    /**
     * Set the current ImageSet.
     * 
     * @param imageSet
     */
    public void setImageSet(ImageSet imageSet) {
        this.imageSet = imageSet;
    }
    
    
    /**
     * Returns the file path name from the request.
     * 
     * @return
     */
    public String getFilePath() {
        if (filePath == null) {
            String s = this.getAsString("request.path");
            s += this.getAsString("fn");
            filePath = FileOps.normalName(s);
        }
        return filePath;
    }

    public boolean isHiresOnly() {
        return hasOption("clip") || hasOption("hires") || hasOption("pxarea");
    }

    public boolean isLoresOnly() {
        return hasOption("lores");
    }

    public boolean isScaleToFit() {
        return !(hasOption("clip") || hasOption("osize") || hasOption("ascale"));
    }

    public boolean isAbsoluteScale() {
        return hasOption("osize") || hasOption("ascale");
    }

    /**
     * Returns the minimum size the source image should have for scaling.
     * 
     * @return
     * @throws IOException
     */
    public ImageSize getExpectedSourceSize() throws IOException {
        if (expectedSourceSize == null) {
            expectedSourceSize = new ImageSize();
            if (isScaleToFit()) {
                // scale to fit -- calculate minimum source size
                float scale = (1 / Math.min(getAsFloat("ww"), getAsFloat("wh"))) * getAsFloat("ws");
                expectedSourceSize.setSize((int) (getDw() * scale), (int) (getDh() * scale));
            } else if (isAbsoluteScale() && hasOption("ascale")) {
                // absolute scale -- apply scale to hires size
                expectedSourceSize = getHiresSize().getScaled(getAsFloat("scale"));
            } else {
                // clip to fit -- source = destination size
                expectedSourceSize.setSize((int) (getDw() * getAsFloat("ws")), (int) (getDh() * getAsFloat("ws")));
            }
        }
        return expectedSourceSize;
    }

    /**
     * Returns the size of the highest resolution image.
     * 
     * @return
     * @throws IOException
     */
    public ImageSize getHiresSize() throws IOException {
        logger.debug("get_hiresSize()");

        ImageSize hiresSize = null;
        ImageSet fileset = getImageSet();
        if (isAbsoluteScale()) {
            ImageInput hiresFile = fileset.getBiggest();
            hiresSize = hiresFile.getSize();
        }
        return hiresSize;
    }

    /**
     * Returns image scaling factor.
     * Uses image size and user parameters.
     * Modifies scaleXY, userImgArea.
     * 
     * @return
     * @throws IOException
     * @throws ImageOpException
     */
    public double getScaleXY() throws IOException, ImageOpException {
        // logger.debug("get_scaleXY()");
        if (scaleXY != null) {
            return scaleXY.doubleValue();
        }

        /*
         * calculate region of interest
         */
        double areaWidth;
        double areaHeight;
        // size of the currently selected input image
        ImageSize imgSize = getInput().getSize();
        if (!options.hasOption("pxarea")) {
            // user area is in [0,1] coordinates
            Rectangle2D relUserArea = new Rectangle2D.Float(getAsFloat("wx"), getAsFloat("wy"), getAsFloat("ww"), getAsFloat("wh"));
            // transform from relative [0,1] to image coordinates.
            AffineTransform imgTrafo = AffineTransform.getScaleInstance(imgSize.getWidth(), imgSize.getHeight());
            // transform user coordinate area to image coordinate area
            userImgArea = imgTrafo.createTransformedShape(relUserArea).getBounds2D();
        } else {
            // ugly: user area in pixel coordinates
            userImgArea = new Rectangle2D.Float(getAsFloat("wx"), getAsFloat("wy"), getAsFloat("ww"), getAsFloat("wh"));
        }

        /*
         * calculate scaling factor
         */
        float ws = getAsFloat("ws");
        if (isScaleToFit()) {
            /*
             * scale to fit -- scaling factor based on destination size and user area
             */
            areaWidth = (double) userImgArea.getWidth();
            areaHeight = (double) userImgArea.getHeight();
            double scaleX = getDw() / areaWidth * ws;
            double scaleY = getDh() / areaHeight * ws;
            scaleXY = (scaleX > scaleY) ? scaleY : scaleX;
        } else if (isAbsoluteScale()) {
            /*
             * absolute scaling factor -- either original size, based on dpi, or absolute 
             */
            if (hasOption("osize")) {
                // get original resolution from metadata
                imageSet.checkMeta();
                double origResX = imageSet.getResX();
                double origResY = imageSet.getResY();
                if ((origResX == 0) || (origResY == 0)) {
                    throw new ImageOpException("Missing image DPI information!");
                }
                double ddpix = getAsFloat("ddpix");
                double ddpiy = getAsFloat("ddpiy");
                if (ddpix == 0 || ddpiy == 0) {
                    double ddpi = getAsFloat("ddpi");
                    if (ddpi == 0) {
                        throw new ImageOpException("Missing display DPI information!");
                    } else {
                        ddpix = ddpi;
                        ddpiy = ddpi;
                    }
                }
                // calculate absolute scale factor
                double sx = ddpix / origResX;
                double sy = ddpiy / origResY;
                // currently only same scale -- mean value
                scaleXY = (sx + sy) / 2f;
            } else {
                // absolute scale factor
                scaleXY = (double) getAsFloat("scale");
                // use original size if no destination size given
                if (getDw() == 0 && getDh() == 0) {
                    paramDW = (int) userImgArea.getWidth();
                    paramDH = (int) userImgArea.getHeight();
                }
            }
            // we need to correct the factor if we use a pre-scaled image
            ImageSize hiresSize = getHiresSize();
            if (imgSize.getWidth() != hiresSize.getWidth()) {
                scaleXY *= (double) hiresSize.getWidth() / (double) imgSize.getWidth();
            }
            areaWidth = getDw() / scaleXY * ws;
            areaHeight = getDh() / scaleXY * ws;
            // reset user area size
            userImgArea.setRect(userImgArea.getX(), userImgArea.getY(), areaWidth, areaHeight);
        } else {
            /*
             * crop to fit -- don't scale
             */
            areaWidth = getDw() * ws;
            areaHeight = getDh() * ws;
            // reset user area size
            userImgArea.setRect(userImgArea.getX(), userImgArea.getY(), areaWidth, areaHeight);
            scaleXY = 1d;
        }
        return scaleXY.doubleValue();
    }

    /**
     * Returns the width of the destination image.
     * Uses dh parameter and aspect ratio if dw parameter is empty.
     * 
     * @return
     * @throws IOException
     */
    public int getDw() throws IOException {
        logger.debug("get_paramDW()");
        if (paramDW == null) {

            paramDW = getAsInt("dw");
            paramDH = getAsInt("dh");

            float imgAspect = getInput().getAspect();
            if (paramDW == 0) {
                // calculate dw
                paramDW = Math.round(paramDH * imgAspect);
                setValue("dw", paramDW);
            } else if (paramDH == 0) {
                // calculate dh
                paramDH = Math.round(paramDW / imgAspect);
                setValue("dh", paramDH);
            }
        }
        return paramDW;
    }

    /**
     * Returns the height of the destination image.
     * Uses dw parameter and aspect ratio if dh parameter is empty.
     * 
     * @return
     * @throws IOException
     */
    public int getDh() throws IOException {
        logger.debug("get_paramDH()");
        if (paramDH == null) {

            paramDW = getAsInt("dw");
            paramDH = getAsInt("dh");

            float imgAspect = getInput().getAspect();
            if (paramDW == 0) {
                // calculate dw
                paramDW = Math.round(paramDH * imgAspect);
                setValue("dw", paramDW);
            } else if (paramDH == 0) {
                // calculate dh
                paramDH = Math.round(paramDW / imgAspect);
                setValue("dh", paramDH);
            }
        }
        return paramDH;
    }

    /**
     * Returns image quality as an integer.
     * 
     * @return
     */
    public int getScaleQual() {
        logger.debug("get_scaleQual()");
        int qual = dlConfig.getAsInt("default-quality");
        if (hasOption("q0"))
            qual = 0;
        else if (hasOption("q1"))
            qual = 1;
        else if (hasOption("q2")) qual = 2;
        return qual;
    }

    public ColorOp getColOp() {
        String op = getAsString("colop");
        if (op == null || op.length() == 0) {
            return null;
        }
        try {
            return ColorOp.valueOf(op.toUpperCase());
        } catch (Exception e) {
            logger.error("Invalid color op: " + op);
        }
        return null;
    }

    /**
     * Returns the area of the source image that will be transformed into the
     * destination image.
     * 
     * @return
     * @throws IOException
     * @throws ImageOpException
     */
    public Rectangle2D getUserImgArea() throws IOException, ImageOpException {
        if (userImgArea == null) {
            // getScaleXY sets userImgArea
            getScaleXY();
        }
        return userImgArea;
    }

    /**
     * Returns the maximal area of the source image that will be used.
     * 
     * @return
     * @throws IOException
     * @throws ImageOpException
     */
    public Rectangle2D getOuterUserImgArea() throws IOException, ImageOpException {
        if (outerUserImgArea == null) {
            outerUserImgArea = getUserImgArea();

            // image size in pixels
            ImageSize imgSize = getInput().getSize();
            Rectangle2D imgBounds = new Rectangle2D.Float(0, 0, imgSize.getWidth(), imgSize.getHeight());

            // clip area at the image border
            outerUserImgArea = outerUserImgArea.createIntersection(imgBounds);

            // check image parameters sanity
            scaleXY = getScaleXY();
            logger.debug("outerUserImgArea.getWidth()=" + outerUserImgArea.getWidth());
            logger.debug("get_scaleXY() * outerUserImgArea.getWidth() = " + (scaleXY * outerUserImgArea.getWidth()));

            if ((outerUserImgArea.getWidth() < 1) || (outerUserImgArea.getHeight() < 1)
                    || (scaleXY * outerUserImgArea.getWidth() < 2) || (scaleXY * outerUserImgArea.getHeight() < 2)) {
                logger.error("ERROR: invalid scale parameter set!");
                throw new ImageOpException("Invalid scale parameter set!");
            }
        }
        return outerUserImgArea;
    }

    public float[] getRGBM() {
        float[] paramRGBM = null;// {0f,0f,0f};
        Parameter p = params.get("rgbm");
        if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
            return p.parseAsFloatArray("/");
        }
        return paramRGBM;
    }

    public float[] getRGBA() {
        float[] paramRGBA = null;// {0f,0f,0f};
        Parameter p = params.get("rgba");
        if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
            paramRGBA = p.parseAsFloatArray("/");
        }
        return paramRGBA;
    }

    /**
     * Has send-as-file been requested?
     * 
     * @return
     */
    public boolean getSendAsFile() {
        return hasOption("file") || hasOption("rawfile");
    }

    /**
     * Returns if the image can be sent without processing. Takes image type and
     * additional image operations into account. Does not check requested size
     * transformation.
     * 
     * @return
     * @throws IOException
     */
    public boolean isImageSendable() throws IOException {
        if (imageSendable == null) {
            String mimeType = getMimeType();
            imageSendable = (mimeType != null
                    && (mimeType.equals("image/jpeg") || mimeType.equals("image/png") || mimeType.equals("image/gif")) 
                    && !(getAsFloat("wx") > 0f || getAsFloat("wy") > 0f || getAsFloat("ww") < 1f || getAsFloat("wh") < 1f                            
                    || hasOption("vmir") || hasOption("hmir")
                    || (getAsFloat("rot") != 0.0)
                    || (getRGBM() != null)
                    || (getRGBA() != null)
                    || (this.getColOp() != null) 
                    || (getAsFloat("cont") != 0.0) || (getAsFloat("brgt") != 0.0)));
        }
        return imageSendable;
    }

    /**
     * Returns if any transformation of the source image (image manipulation or
     * format conversion) is required.
     * 
     * @return
     * @throws IOException
     */
    public boolean isTransformRequired() throws IOException {
        ImageSize is = getInput().getSize();
        ImageSize ess = getExpectedSourceSize();
        // nt = no transform required
        boolean nt = isImageSendable() && (
        // lores: send if smaller
                (isLoresOnly() && is.isSmallerThan(ess))
                // else send if it fits
                || (!(isLoresOnly() || isHiresOnly()) && is.fitsIn(ess)));
        return !nt;
    }

    /**
     * @return the docuImage
     */
    public DocuImage getDocuImage() {
        return docuImage;
    }

    /**
     * Set the current docuImage.
     * 
     * @param docuImage
     *            the docuImage to set
     */
    public void setDocuImage(DocuImage docuImage) {
        this.docuImage = docuImage;
    }
}
