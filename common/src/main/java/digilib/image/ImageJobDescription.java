package digilib.image;

/*
 * #%L
 * A class for storing the set of parameters necessary for scaling images with an ImageWorker.
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2002 - 2015 MPIWG Berlin
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
 * Author: Robert Casties (robcast@users.sourceforge.de),
 *   Christopher Mielack (cmielack@mpiwg-berlin.mpg.de)
 */

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
    protected ImageSize minSourceSize = null;
    protected Double scaleX = null;
    protected Double scaleY = null;
    protected Rectangle2D imgArea = null;
    protected Rectangle2D outerImgArea = null;
    protected Boolean imageSendable = null;
    protected String mimeType = null;
    protected Integer paramDW = null;
    protected Integer paramDH = null;
    protected Float paramWX = null;
    protected Float paramWY = null;
    protected Float paramWW = null;
    protected Float paramWH = null;
    protected float[] paramRGBM = null;
    protected float[] paramRGBA = null;
    protected DocuDirCache dirCache = null;
	protected ImageSize hiresSize = null;
	protected ImageSize imgSize = null;

    /**
     * create empty ImageJobDescription.
     * 
     * @param dlcfg
     */
    public ImageJobDescription(DigilibConfiguration dlcfg) {
        super(30);
        initParams();
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
     * @throws ImageOpException 
     * @throws IOException 
     */
    public static ImageJobDescription getInstance(DigilibRequest dlReq, DigilibConfiguration dlcfg) throws IOException, ImageOpException {
        ImageJobDescription newMap = new ImageJobDescription(dlcfg);
        // add all params to this map
        newMap.params.putAll(dlReq.getParams());
        newMap.initOptions();
        newMap.prepareScaleParams();
        // add ImageJobDescription back into DigilibRequest
        dlReq.setJobDescription(newMap);
        return newMap;
    }

    /**
     * Creates new ImageJobDescription by merging Parameters from a
     * DigilibRequest and adding an ImageSet.
     * 
     * @param dlReq
     * @param imgs
     * @param dlcfg
     * @return
     * @throws ImageOpException 
     * @throws IOException 
     */
    public static ImageJobDescription getInstanceWithImgs(DigilibRequest dlReq, ImageSet imgs, DigilibConfiguration dlcfg) 
            throws IOException, ImageOpException {
        ImageJobDescription newMap = new ImageJobDescription(dlcfg);
        // add all params to this map
        newMap.params.putAll(dlReq.getParams());
        newMap.initOptions();
        newMap.setImageSet(imgs);
        newMap.prepareScaleParams();
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
     * @throws ImageOpException 
     * @throws IOException 
     */
    public static ImageJobDescription getInstance(ParameterMap pm, DigilibConfiguration dlcfg) throws IOException, ImageOpException {
        ImageJobDescription newMap = new ImageJobDescription(dlcfg);
        // add all params to this map
        newMap.params.putAll(pm.getParams());
        newMap.initOptions();
        newMap.prepareScaleParams();
        return newMap;
    }

    
    /**
     * Prepare image scaling factors and coordinates.
     * 
     * Should be called by getInstance().
     * Uses image size and user parameters.
     * Sets scaleX, scaleY, imgArea.
     * 
     * @return
     * @throws IOException
     * @throws ImageOpException
     */
    public void prepareScaleParams() throws IOException, ImageOpException {
        // logger.debug("get_scaleXY()");

        /*
         * calculate scaling factors
         */
		if (isScaleToFit()) {
		    /* 
		     * scale to fit -- scale factor based on destination size dw/dh and user area 
		     * using a uniform scale factor for x and y.
		     */
		    imgArea = prepareScaleToFit();
		    
        } else if (isSqueezeToFit()) {
            /*
             * squeeze to fit -- scale factor based on destination size and user area
             * 
             * uses separate scale factors for x and y
             */
            imgArea = prepareSqueezeToFit();
            
        } else if (isCropToFit()) {
            /*
             * crop to fit -- don't scale
             */
            imgArea = prepareClipToFit();

        } else if (isAbsoluteScale()) {
            /*
             * absolute scaling factor -- either original size, based on dpi, or absolute 
             */
            imgArea = prepareAbsoluteScale();
            
        } else {
            throw new ImageOpException("Unknown scaling mode!");
        }
    
    }

    /**
     * Scale to fit: scale factor based on destination size dw/dh and user area.
     * 
     * Uses a uniform scale factor for x and y.
     * 
     * Sets ScaleX and ScaleY.
     */
    protected Rectangle2D prepareScaleToFit() throws IOException {
        /*
         * prepare minimum source image size
         * 
         * minSourceSize: w_min = dw * 1/ww
         * 
         * Note: dw or dh can be empty (=0) 
         */
        float scale = (1 / Math.min(getWw(), getWh()));
        minSourceSize = new ImageSize(
                Math.round(getAsInt("dw") * scale), 
                Math.round(getAsInt("dh") * scale));
        
        /*
         * get image region of interest
         */
        // size of the currently selected input image (uses minSourceSize)
        imgSize  = getImgSize();
        // transform from relative [0,1] to image coordinates.
        double areaXf = getWx() * imgSize.getWidth();
        double areaYf = getWy() * imgSize.getHeight();
        double areaWidthF = getWw() * imgSize.getWidth();
        double areaHeightF = getWh() * imgSize.getHeight();
        // round to pixels
        long areaX = Math.round(areaXf);
        long areaY = Math.round(areaYf);
        long areaHeight = Math.round(areaHeightF);
        long areaWidth = Math.round(areaWidthF);

        /*
         * calculate scale factors
         */
        scaleX = getDw() / (double) areaWidth;
        scaleY = getDh() / (double) areaHeight;
        if (scaleX == 0) {
            // dw undefined
            scaleX = scaleY;
        } else if (scaleY == 0) {
            // dh undefined
            scaleY = scaleX;
        } else if (hasOption("crop")) {
            // use the bigger factor to get fill-the-box
            if (scaleX > scaleY) {
                scaleY = scaleX;
                // crop mode uses whole destination rect
                long croppedAreaHeight = Math.round(getDh() / scaleY);
                if (areaHeight > croppedAreaHeight) {
                	// center cropped area
                	areaY += (areaHeight - croppedAreaHeight) / 2;
                }
                areaHeight = croppedAreaHeight;
                // re-compute scaleY
                scaleY = getDh() / (double) areaHeight;
            } else {
                scaleX = scaleY;
                // crop mode uses whole destination rect
                long croppedAreaWidth = Math.round(getDw() / scaleX);
                if (areaWidth > croppedAreaWidth) {
                	// center cropped area
                	areaX += (areaWidth - croppedAreaWidth) / 2;
                }
                areaWidth = croppedAreaWidth;
                // re-compute scaleX
                scaleX = getDw() / (double) areaWidth;
            }
        } else {
            // use the smaller factor to get fit-in-box
            if (scaleX > scaleY) {
                scaleX = scaleY;
                if (hasOption("fill")) {
                    // fill mode uses whole destination rect
                    long filledAreaWidth = Math.round(getDw() / scaleX);
                    if (filledAreaWidth > areaWidth) {
                    	// center filled area
                    	areaX -= (filledAreaWidth - areaWidth) / 2;
                    }
                    areaWidth = filledAreaWidth;
                    // re-compute scaleX
                    scaleX = getDw() / (double) areaWidth;
                }
            } else {
                scaleY = scaleX;
                if (hasOption("fill")) {
                    // fill mode uses whole destination rect
                    long filledAreaHeight = Math.round(getDh() / scaleY);
                    if (filledAreaHeight > areaHeight) {
                    	// center filled area
                    	areaY -= (filledAreaHeight - areaHeight) / 2;
                    }
                    areaHeight = filledAreaHeight;
                    // re-compute scaleY
                    scaleY = getDh() / (double) areaHeight;
                }
            }
        }
        
        return new Rectangle2D.Double(areaX, areaY, areaWidth, areaHeight);
    }

    /**
     * Squeeze to fit: scale factor based on destination size and user area.
     * 
     * Uses separate scale factors for x and y to fill destination size changing aspect ratio.
     * 
     * Sets ScaleX and ScaleY.
     */
    protected Rectangle2D prepareSqueezeToFit() throws IOException {
        /*
         * calculate minimum source size
         * 
         * w_min = dw * 1/ww
         */
        minSourceSize = new ImageSize(
                Math.round(getAsInt("dw") / getWw()), 
                Math.round(getAsInt("dh") / getWh()));
        
        /*
         * get image region of interest
         */
        // size of the currently selected input image (uses minSourceSize)
        imgSize  = getImgSize();
        // transform from relative [0,1] to image coordinates.
        double areaXf = getWx() * imgSize.getWidth();
        double areaYf = getWy() * imgSize.getHeight();
        double areaWidthF = getWw() * imgSize.getWidth();
        double areaHeightF = getWh() * imgSize.getHeight();
        // round to pixels
        long areaX = Math.round(areaXf);
        long areaY = Math.round(areaYf);
        long areaHeight = Math.round(areaHeightF);
        long areaWidth = Math.round(areaWidthF);

        /*
         * calculate scale factors
         */
        scaleX = getDw() / (double) areaWidth;
        scaleY = getDh() / (double) areaHeight;
        
        return new Rectangle2D.Double(areaX, areaY, areaWidth, areaHeight);
    }

    
    /**
     * Absolute scale factor: either original size, based on dpi, or absolute. 
     * 
     * Uses a uniform scale factor for x and y.
     * 
     * Sets ScaleX and ScaleY.
     * 
     * @throws ImageOpException 
     */
    protected Rectangle2D prepareAbsoluteScale() throws IOException, ImageOpException {
        /*
         * minimum source size -- apply scale to hires size
         */
        minSourceSize = getHiresSize().getScaled(getAsFloat("scale"));
        
        /*
         * get image region of interest
         */
        // size of the currently selected input image (uses minSourceSize)
        imgSize  = getImgSize();
        // transform from relative [0,1] to image coordinates.
        double areaXf = getWx() * imgSize.getWidth();
        double areaYf = getWy() * imgSize.getHeight();
        double areaWidthF = getWw() * imgSize.getWidth();
        double areaHeightF = getWh() * imgSize.getHeight();
        // round to pixels
        long areaX = Math.round(areaXf);
        long areaY = Math.round(areaYf);
        long areaHeight = Math.round(areaHeightF);
        long areaWidth = Math.round(areaWidthF);

        /*
         * absolute scale factor -- either original size, based on dpi, or absolute 
         */
        if (hasOption("osize")) {
            /*
             * get original resolution from metadata
             */
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
            scaleX = ddpix / origResX;
            scaleY = ddpiy / origResY;
            
        } else {
            /*
             * explicit absolute scale factor
             */
            double scaleXY = (double) getAsFloat("scale");
            scaleX = scaleXY;
            scaleY = scaleXY;
            // use original size if no destination size given
            if (getDw() == 0 && getDh() == 0) {
                paramDW = (int) areaWidth;
                paramDH = (int) areaHeight;
            }
        }
        /*
         * correct absolute scale factor if we use a pre-scaled image
         */
        hiresSize = getHiresSize();
        if (imgSize.getWidth() != hiresSize.getWidth()) {
            double preScale = (double) hiresSize.getWidth() / (double) imgSize.getWidth();
            scaleX *= preScale;
            scaleY *= preScale;
        }
        areaWidth = Math.round(getDw() / scaleX);
        areaHeight = Math.round(getDh() / scaleY);
        
        return new Rectangle2D.Double(areaX, areaY, areaWidth, areaHeight);
    }


    /**
     * Clip to fit: don't scale.
     * 
     * Sets ScaleX and ScaleY to 1.0.
     */
    protected Rectangle2D prepareClipToFit() throws IOException {
        /*
         * minimum source size = hires size
         */
        minSourceSize = getHiresSize();
        
        /*
         * get image region of interest
         */
        // size of the currently selected input image (uses minSourceSize)
        imgSize  = getImgSize();
        // transform from relative [0,1] to image coordinates.
        double areaXf = getWx() * imgSize.getWidth();
        double areaYf = getWy() * imgSize.getHeight();
        // round to pixels
        long areaX = Math.round(areaXf);
        long areaY = Math.round(areaYf);

        /*
         * crop to fit -- don't scale
         */
        int areaWidth = getDw();
        int areaHeight = getDh();
        scaleX = 1d;
        scaleY = 1d;
        
        return new Rectangle2D.Double(areaX, areaY, areaWidth, areaHeight);
    }

    
    /**
     * Return the mime-type of the input.
     * 
     * @return
     * @throws IOException
     */
    public String getInputMimeType() throws IOException {
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
            String mt = getInputMimeType();
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
     * Note: uses getMinSourceSize().
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
                input = imageSet.getNextSmaller(getMinSourceSize());
                if (input == null) {
                    // this is the smallest we have
                    input = imageSet.getSmallest();
                }
            } else {
                // autores: use next higher resolution
                input = imageSet.getNextBigger(getMinSourceSize());
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
     * Return the DocuDirectory for the input (file).
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
     * Return the ImageSet to load.
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
     * Return the file path name from the request.
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

    /**
     * Only use the highest resolution image.
     * 
     * @return
     */
    public boolean isHiresOnly() {
        return hasOption("clip") || hasOption("hires");
    }

    /**
     * Prefer a prescaled lower resolution image.
     * 
     * @return
     */
    public boolean isLoresOnly() {
        return hasOption("lores");
    }

    /**
     * Scale according to zoom area and destination size preserving aspect ratio.
     * 
     * @return
     */
    public boolean isScaleToFit() {
        return hasOption("fit") || 
        		!(hasOption("clip") || hasOption("osize") || hasOption("ascale") || hasOption("squeeze"));
    }

    /**
     * Do not scale, just crop original resolution.
     * 
     * @return
     */
    public boolean isCropToFit() {
        return hasOption("clip");
    }

    /**
     * Scale according to zoom area and destination size violating aspect ratio.
     * 
     * @return
     */
    public boolean isSqueezeToFit() {
        return hasOption("squeeze");
    }

    /**
     * Scale according to fixed factor independent of destination size.
     * 
     * @return
     */
    public boolean isAbsoluteScale() {
        return hasOption("osize") || hasOption("ascale");
    }

    /**
     * Return the minimum size the source image should have for scaling.
     * 
     * Note: this function is called by getInput(). It must not assume a selected input image!
     * 
     * @return
     * @throws IOException
     */
    public ImageSize getMinSourceSize() throws IOException {
        //logger.debug("getMinSourceSize()");
        if (minSourceSize == null) {
            // this should not happen, it may lead to a loop!
            logger.warn("MinSourceSize is not set! Calling prepareScaleParams again.");
            try {
                prepareScaleParams();
            } catch (ImageOpException e) {
            }
        }
        return minSourceSize;
    }

    /**
     * Return the size of the highest resolution image.
     * 
     * @return
     * @throws IOException
     */
    public ImageSize getHiresSize() throws IOException {
        //logger.debug("get_hiresSize()");
        if (hiresSize == null) {
	        ImageSet fileset = getImageSet();
	        ImageInput hiresFile = fileset.getBiggest();
	        hiresSize = hiresFile.getSize();
	        if (hiresSize == null) {
	        	throw new FileOpException("Can't get size from hires image file!");
	        }
        }
        return hiresSize;
    }

    /**
     * Return the size of the selected input image.
     * 
     * Note: may use getMinSourceSize().
     * 
     * @return
     * @throws IOException
     */
    public ImageSize getImgSize() throws IOException {
        //logger.debug("get_hiresSize()");
        if (imgSize == null) {
        	imgSize = getInput().getSize();
        }
        return imgSize;
    }

    /**
     * Set the image size.
     * 
     * @param size
     */
    public void setImgSize(ImageSize size) {
        this.imgSize = size;
    }
      
    /**
     * Return the X scale factor.
     * 
     * @return
     * @throws IOException
     * @throws ImageOpException
     */
    public double getScaleX() throws IOException, ImageOpException {
    	if (scaleX == null) {
    		prepareScaleParams();
    	}
    	return scaleX.doubleValue();
    }

    /**
     * Return the Y scale factor.
     * 
     * @return
     * @throws IOException
     * @throws ImageOpException
     */
    public double getScaleY() throws IOException, ImageOpException {
    	if (scaleY == null) {
    		prepareScaleParams();
    	}
    	return scaleY.doubleValue();
    }

    /**
     * Return the width of the destination image.
     * Uses dw parameter.
     * 
     * @return
     */
    public int getDw() {
        //logger.debug("get_paramDW()");
        if (paramDW == null) {
            paramDW = getAsInt("dw");
        }
        return paramDW;
    }

    /**
     * Return the height of the destination image.
     * Uses dh parameter.
     * 
     * @return
     */
    public int getDh() {
        //logger.debug("get_paramDH()");
        if (paramDH == null) {
            paramDH = getAsInt("dh");
        }
        return paramDH;
    }

    /**
     * Return the relative width of the image area.
     * Uses ww parameter.
     * Converts ww in pixels to relative. 
     * 
     * @return
     * @throws IOException
     */
    public Float getWw() throws IOException {
        //logger.debug("get_paramWW()");
        if (paramWW == null) {
        	paramWW = getAsFloat("ww");
        	if (hasOption("pxarea")) {
        		// area in absolute pixels - convert to relative
        		hiresSize = getHiresSize();
        		paramWW = paramWW / hiresSize.getWidth(); 
        	}
        }
        return paramWW;
    }

    /**
     * Return the relative height of the image area.
     * Uses wh parameter.
     * Converts wh in pixels to relative. 
     * 
     * @return
     * @throws IOException
     */
    public Float getWh() throws IOException {
        //logger.debug("get_paramWH()");
        if (paramWH == null) {
        	paramWH = getAsFloat("wh");
        	if (hasOption("pxarea")) {
        		// area in absolute pixels - convert to relative
        		hiresSize = getHiresSize();
        		paramWH = paramWH / hiresSize.getHeight(); 
        	}
        }
        return paramWH;
    }

    /**
     * Return the relative x-offset of the image area.
     * Uses wx parameter.
     * Converts wx in pixels to relative. 
     * 
     * @return
     * @throws IOException
     */
    public Float getWx() throws IOException {
        //logger.debug("get_paramWX()");
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
     * Return the relative y-offset of the image area.
     * Uses wy parameter.
     * Converts wy in pixels to relative. 
     * 
     * @return
     * @throws IOException
     */
    public Float getWy() throws IOException {
        //logger.debug("get_paramWY()");
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
     * Return image quality as an integer.
     * 
     * @return
     */
    public int getScaleQual() {
        //logger.debug("get_scaleQual()");
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
     * Return the maximum area of the source image that will be used.
     * 
     * This was meant to include extra pixels outside the 
     * imgArea when rotating by oblique angles but is not yet implemented.
     * Currently returns imgArea.
     * 
     * @return
     * @throws IOException
     * @throws ImageOpException
     */
    public Rectangle2D getOuterImgArea() throws IOException, ImageOpException {
        if (outerImgArea == null) {
        	// calculate scale parameters
        	if (imgArea == null) {
        		prepareScaleParams();
        	}
            // start with imgArea
            outerImgArea = imgArea;

            // image size in pixels
            ImageSize imgSize = getInput().getSize();
            Rectangle2D imgBounds = new Rectangle2D.Double(0, 0, imgSize.getWidth(), imgSize.getHeight());

            // clip area at the image border
            outerImgArea = outerImgArea.createIntersection(imgBounds);

            // check image parameters sanity
            if ((outerImgArea.getWidth() < 1) || (outerImgArea.getHeight() < 1)
                    || (scaleX * outerImgArea.getWidth() < 2) || (scaleY * outerImgArea.getHeight() < 2)) {
                logger.error("ERROR: invalid scale parameter set!");
            	logger.debug("scaleX="+scaleX+" scaleY="+scaleY+" outerImgArea="+outerImgArea);
                throw new ImageOpException("Invalid scale parameter set!");
            }
        }
        return outerImgArea;
    }

    /**
     * Get the RGBM parameter set.
     * 
     * @return
     */
    public float[] getRGBM() {
        if (paramRGBM == null) {
            Parameter p = params.get("rgbm");
            if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
                paramRGBM = p.parseAsFloatArray("/");
            }
        }
        return paramRGBM;
    }

    /**
     * Get the RGBA parameter set.
     * 
     * @return
     */
    public float[] getRGBA() {
        if (paramRGBA == null) {
            Parameter p = params.get("rgba");
            if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
                paramRGBA = p.parseAsFloatArray("/");
            }
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
            String mimeType = getInputMimeType();
            imageSendable = (mimeType != null
            		// input image is browser compatible
                    && (mimeType.equals("image/jpeg") || mimeType.equals("image/png") || mimeType.equals("image/gif"))
                    // no forced type conversion
                    && !(hasOption("jpg") || hasOption("png"))
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
        ImageSize ess = getMinSourceSize();
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
