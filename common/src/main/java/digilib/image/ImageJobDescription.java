package digilib.image;

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

    protected DigilibConfiguration dlConfig = null;
    protected static Logger logger = Logger.getLogger("digilib.servlet");

    /* 
     * variables for caching values
     */
    protected ImageInput input = null;
    protected ImageSet imageSet = null;
    protected DocuDirectory fileDir = null;
    protected DocuImage docuImage = null;
    protected String filePath = null;
    protected ImageSize expectedSourceSize = null;
    protected Double scaleXY = null;
    protected Rectangle2D userImgArea = null;
    protected Rectangle2D outerUserImgArea = null;
    protected Boolean imageSendable = null;
    protected String mimeType = null;
    protected Integer paramDW = null;
    protected Integer paramDH = null;
    protected Float paramWX = null;
    protected Float paramWY = null;
    protected Float paramWW = null;
    protected Float paramWH = null;
    protected DocuDirCache dirCache = null;
	protected ImageSize hiresSize = null;

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
            imageSet = (ImageSet) dirCache.getFile(getFilePath(), getAsInt("pn"));
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
        return hasOption("clip") || hasOption("hires");
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
                float scale = (1 / Math.min(getWw(), getWh())) * getAsFloat("ws");
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
        if (hiresSize == null) {
	        ImageSet fileset = getImageSet();
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
        userImgArea = getUserImgArea();
        double areaWidth = userImgArea.getWidth();
		double areaHeight = userImgArea.getHeight();
        
        /*
         * calculate scaling factor
         */
        float ws = getAsFloat("ws");
		if (isScaleToFit()) {
            /*
             * scale to fit -- scaling factor based on destination size and user area
             */
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
                    paramDW = (int) areaWidth;
                    paramDH = (int) areaHeight;
                }
            }
            // we need to correct the factor if we use a pre-scaled image
            ImageSize imgSize = getInput().getSize();
            ImageSize hiresSize = getHiresSize();
            if (imgSize.getWidth() != hiresSize.getWidth()) {
                scaleXY *= (double) hiresSize.getWidth() / (double) imgSize.getWidth();
            }
            areaWidth = (int) Math.round(getDw() / scaleXY * ws);
            areaHeight = (int) Math.round(getDh() / scaleXY * ws);
            // reset user area size
            userImgArea.setRect(userImgArea.getX(), userImgArea.getY(), areaWidth, areaHeight);
        } else {
            /*
             * crop to fit -- don't scale
             */
            areaWidth = Math.round(getDw() * ws);
            areaHeight = Math.round(getDh() * ws);
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

            if (paramDW == 0) {
                // calculate dw
                userImgArea = getUserImgArea();
                double imgAspect = userImgArea.getWidth() / userImgArea.getHeight();
                // round up to make sure we don't squeeze dh
                paramDW = (int) Math.ceil(paramDH * imgAspect);
                setValue("dw", paramDW);
            } else if (paramDH == 0) {
                // calculate dh
            	userImgArea = getUserImgArea();
                double imgAspect = userImgArea.getWidth() / userImgArea.getHeight();
                // round up to make sure we don't squeeze dw
                paramDH = (int) Math.ceil(paramDW / imgAspect);
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

            if (paramDW == 0) {
                // calculate dw
                userImgArea = getUserImgArea();
                double imgAspect = userImgArea.getWidth() / userImgArea.getHeight();
                paramDW = (int) Math.round(paramDH * imgAspect);
                setValue("dw", paramDW);
            } else if (paramDH == 0) {
                // calculate dh
                userImgArea = getUserImgArea();
                double imgAspect = userImgArea.getWidth() / userImgArea.getHeight();
                paramDH = (int) Math.round(paramDW / imgAspect);
                setValue("dh", paramDH);
            }
        }
        return paramDH;
    }

    /**
     * Returns the width of the image area.
     * Uses ww parameter.
     * 
     * @return
     * @throws IOException
     */
    public Float getWw() throws IOException {
        logger.debug("get_paramWW()");
        if (paramWW == null) {
        	paramWW = getAsFloat("ww");
        	if (hasOption("pxarea")) {
        		// area in absolute pixels - convert to relative
        		ImageSize imgSize = getHiresSize();
        		paramWW = paramWW / imgSize.getWidth(); 
        	}
        }
        return paramWW;
    }

    /**
     * Returns the height of the image area.
     * Uses wh parameter.
     * 
     * @return
     * @throws IOException
     */
    public Float getWh() throws IOException {
        logger.debug("get_paramWH()");
        if (paramWH == null) {
        	paramWH = getAsFloat("wh");
        	if (hasOption("pxarea")) {
        		// area in absolute pixels - convert to relative
        		ImageSize imgSize = getHiresSize();
        		paramWH = paramWH / imgSize.getHeight(); 
        	}
        }
        return paramWH;
    }

    /**
     * Returns the x-offset of the image area.
     * Uses wx parameter.
     * 
     * @return
     * @throws IOException
     */
    public Float getWx() throws IOException {
        logger.debug("get_paramWX()");
        if (paramWX == null) {
        	paramWX = getAsFloat("wx");
        	if (hasOption("pxarea")) {
        		// area in absolute pixels - convert to relative
        		ImageSize imgSize = getHiresSize();
        		paramWX = paramWX / imgSize.getWidth(); 
        	}
        }
        return paramWX;
    }

    /**
     * Returns the y-offset of the image area.
     * Uses wy parameter.
     * 
     * @return
     * @throws IOException
     */
    public Float getWy() throws IOException {
        logger.debug("get_paramWY()");
        if (paramWY == null) {
        	paramWY = getAsFloat("wy");
        	if (hasOption("pxarea")) {
        		// area in absolute pixels - convert to relative
        		ImageSize imgSize = getHiresSize();
        		paramWY = paramWY / imgSize.getHeight(); 
        	}
        }
        return paramWY;
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
        else if (hasOption("q2")) 
            qual = 2;
        return qual;
    }

    /**
     * Return the color operation as a ColorOp.
     * 
     * @return
     */
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
     */
    public Rectangle2D getUserImgArea() throws IOException {
        if (userImgArea == null) {
            // size of the currently selected input image
            ImageSize imgSize = getInput().getSize();
            // transform from relative [0,1] to image coordinates.
            float areaXf = getWx() * imgSize.getWidth();
            float areaYf = getWy() * imgSize.getHeight();
            float areaWidthF = getWw() * imgSize.getWidth();
            float areaHeightF = getWh() * imgSize.getHeight();
            // round to pixels
    		int areaX = Math.round(areaXf);
    		int areaY = Math.round(areaYf);
    		int areaHeight = Math.round(areaHeightF);
    		int areaWidth = Math.round(areaWidthF);
            userImgArea = new Rectangle2D.Float(areaX, areaY, areaWidth, areaHeight);
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
            Rectangle2D imgBounds = new Rectangle2D.Double(0, 0, imgSize.getWidth(), imgSize.getHeight());

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
            		// input image is browser compatible
                    && (mimeType.equals("image/jpeg") || mimeType.equals("image/png") || mimeType.equals("image/gif"))
                    // no zooming
                    && !(getWx() > 0f || getWy() > 0f || getWw() < 1f || getWh() < 1f
                    // no other image operations
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
        // does the image require processing?
        if (isImageSendable()) {
        	// does the image require rescaling?
        	if (isLoresOnly() && is.isSmallerThan(ess)) {
        		// lores: send even if smaller
        		return false;
        	} else if (is.fitsIn(ess)) {
        		// TODO: check condition again. had && !(isLoresOnly() || isHiresOnly())
        		// send if it fits
        		return false;
        	}
        }
        return true;
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
