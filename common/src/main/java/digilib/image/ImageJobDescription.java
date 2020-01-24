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
import digilib.conf.DigilibOption;
import digilib.conf.DigilibRequest;
import digilib.image.DocuImage.ColorOp;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageInput;
import digilib.io.ImageSet;
import digilib.util.ImageSize;
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

public class ImageJobDescription {

    /** the global DigilibConfiguration */
    protected DigilibConfiguration config = null;
    /** the DigilibRequest for this job */
    protected ParameterMap request = null;
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
	protected boolean preselectInputs = true;

    /**
     * create empty ImageJobDescription.
     * 
     * @param dlcfg the DigilibConfiguration
     * @param dlreq the DigilibRequest
     */
    public ImageJobDescription(DigilibConfiguration dlcfg, ParameterMap dlreq) {
        config = dlcfg;
        request = dlreq;
        dirCache = (DocuDirCache) config.getValue("servlet.dir.cache");
        preselectInputs = config.getAsBoolean("input-preselection-allowed");
    }

    /**
     * Creates new ImageJobDescription from a
     * DigilibRequest.
     * 
     * @param dlReq the DigilibRequest
     * @param dlcfg the DigilibConfiguration
     * @return the ImageJobDescription
     * @throws ImageOpException on error
     * @throws IOException  on error
     */
    public static ImageJobDescription getInstance(DigilibRequest dlReq, DigilibConfiguration dlcfg) throws IOException, ImageOpException {
        ImageJobDescription newMap = new ImageJobDescription(dlcfg, dlReq);
        // set up parameters
        newMap.prepareScaleParams();
        // add ImageJobDescription back into DigilibRequest
        dlReq.setJobDescription(newMap);
        return newMap;
    }

    /**
     * Creates new ImageJobDescription from a
     * DigilibRequest and adding an ImageSet.
     * 
     * @param dlReq the DigilibRequest
     * @param imgs the ImageSet
     * @param dlcfg the DigilibConfiguration
     * @return the ImageJobDescription
     * @throws ImageOpException   on error
     * @throws IOException  on error
     */
    public static ImageJobDescription getInstanceWithImageSet(DigilibRequest dlReq, ImageSet imgs, DigilibConfiguration dlcfg) 
            throws IOException, ImageOpException {
        ImageJobDescription newMap = new ImageJobDescription(dlcfg, dlReq);
        // set up parameters
        newMap.setImageSet(imgs);
        newMap.prepareScaleParams();
        // add ImageJobDescription back into DigilibRequest
        dlReq.setJobDescription(newMap);
        return newMap;
    }

    /**
     * Creates new ImageJobDescription from another
     * ParameterMap.
     * 
     * @param pm the ParameterMap
     * @param dlcfg the DigilibConfiguration
     * @return the ImageJobDescription
     * @throws ImageOpException on error
     * @throws IOException on error
     */
    public static ImageJobDescription getInstance(ParameterMap pm, DigilibConfiguration dlcfg) throws IOException, ImageOpException {
        ImageJobDescription newMap = new ImageJobDescription(dlcfg, pm);
        // set up parameters
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
     * @throws IOException on error
     * @throws ImageOpException on error
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
     * 
     * @return the Rectangle2D
     * @throws IOException on error
     */
    protected Rectangle2D prepareScaleToFit() throws IOException {
        /*
         * prepare minimum source image size
         * 
         * minSourceSize: w_min = dw * 1/ww
         * 
         * Note: dw or dh can be empty (=0) 
         */
        minSourceSize = new ImageSize(
        		Math.round(request.getAsInt("dw") / getWw()), 
                Math.round(request.getAsInt("dh") / getWh()));
        
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
        } else if (request.hasOption(DigilibOption.crop)) {
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
                if (request.hasOption(DigilibOption.fill)) {
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
                if (request.hasOption(DigilibOption.fill)) {
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
     * @return the Rectangle2D
     * @throws IOException on error
     */
    protected Rectangle2D prepareSqueezeToFit() throws IOException {
        /*
         * calculate minimum source size
         * 
         * w_min = dw * 1/ww
         */
        minSourceSize = new ImageSize(
                Math.round(request.getAsInt("dw") / getWw()), 
                Math.round(request.getAsInt("dh") / getWh()));
        
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
     * @return the Rectangle2D
     * @throws IOException on error
     * @throws ImageOpException on error
     */
    protected Rectangle2D prepareAbsoluteScale() throws IOException, ImageOpException {
        /*
         * minimum source size -- apply scale to hires size
         */
        minSourceSize = getHiresSize().getScaled(request.getAsFloat("scale"));
        
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
        if (request.hasOption(DigilibOption.osize)) {
            /*
             * get original resolution from metadata
             */
            imageSet.checkMeta();
            double origResX = imageSet.getResX();
            double origResY = imageSet.getResY();
            if ((origResX == 0) || (origResY == 0)) {
                throw new ImageOpException("Missing image DPI information!");
            }
            double ddpix = request.getAsFloat("ddpix");
            double ddpiy = request.getAsFloat("ddpiy");
            if (ddpix == 0 || ddpiy == 0) {
                double ddpi = request.getAsFloat("ddpi");
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
            double scaleXY = (double) request.getAsFloat("scale");
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
     * @return the Rectangle2D
     * @throws IOException on error
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
     * @return the mimetype
     * @throws IOException on error
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
     * @return the mimetype
     */
    public String getOutputMimeType() {
        // forced destination image type
        if (request.hasOption(DigilibOption.jpg)) {
            return "image/jpeg";
        } else if (request.hasOption(DigilibOption.png)) {
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
     * Returns the best ImageInput to use.
     * 
     * Note: uses getMinSourceSize().
     * 
     * @return the ImageInput
     * @throws IOException on error
     */
    public ImageInput getInput() throws IOException {
        if (input == null) {
            imageSet = getImageSet();
            
            // set type preference tag
            ImageInput.InputTag preference = null;
            if (preselectInputs) {
                if (isZoomRequested()) {
                    // tiled image is better for zoomed access
                    preference = ImageInput.InputTag.TILED;
                } else {
                    // sendable image is better for whole image access
                    preference = ImageInput.InputTag.SENDABLE;
                }
            }

            /* select a resolution */
            if (isHiresOnly()) {
                // get highest resolution
                input = imageSet.getBiggestPreferred(preference);
            } else if (isLoresOnly()) {
                // enforced lores uses next smaller resolution
                if (preselectInputs) {
                    input = imageSet.getNextSmaller(getMinSourceSize(), preference);
                }
                if (input == null) {
                    // try unpreferred
                    input = imageSet.getNextSmaller(getMinSourceSize());
                    if (input == null) {
                        // this is the smallest we have
                        input = imageSet.getSmallestPreferred(preference);
                    }
                }
            } else {
                // autores: use next higher resolution
                if (preselectInputs) {
                    input = imageSet.getNextBigger(getMinSourceSize(), preference);
                }
                if (input == null) {
                    // try without preference
                    input = imageSet.getNextBigger(getMinSourceSize());
                    if (input == null) {
                        // this is the highest we have
                        input = imageSet.getBiggestPreferred(preference);
                    }
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
     * @return the DocuDirectory
     * @throws FileOpException on error
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
     * @return the ImageSet
     * @throws FileOpException on error
     */
    public ImageSet getImageSet() throws FileOpException {
        if (imageSet == null) {
            if (dirCache == null) {
                throw new FileOpException("No DirCache configured!");
            }
            imageSet = (ImageSet) dirCache.getFile(getFilePath(), request.getAsInt("pn"));
            if (imageSet == null) {
                throw new FileOpException("File " + getFilePath() + "(" + request.getAsInt("pn") + ") not found.");
            }
        }
        return imageSet;
    }

    /**
     * Set the current ImageSet.
     * 
     * @param imageSet the ImageSet
     */
    public void setImageSet(ImageSet imageSet) {
        this.imageSet = imageSet;
    }
    
    
    /**
     * Return the file path name from the request.
     * 
     * @return the filepath
     */
    public String getFilePath() {
        if (filePath == null) {
            String s = request.getAsString("request.path");
            s += request.getAsString("fn");
            filePath = FileOps.normalName(s);
        }
        return filePath;
    }

    /**
     * Only use the highest resolution image.
     * 
     * @return is Hires Only
     */
    public boolean isHiresOnly() {
        return request.hasOption(DigilibOption.clip) || request.hasOption(DigilibOption.hires);
    }

    /**
     * Prefer a prescaled lower resolution image.
     * 
     * @return is lores only
     */
    public boolean isLoresOnly() {
        return request.hasOption(DigilibOption.lores);
    }

    /**
     * Scale according to zoom area and destination size preserving aspect ratio.
     * 
     * @return is scale to fit
     */
    public boolean isScaleToFit() {
        return request.hasOption(DigilibOption.fit) || 
        		!(request.hasOption(DigilibOption.clip) || request.hasOption(DigilibOption.osize) 
        				|| request.hasOption(DigilibOption.ascale) || request.hasOption(DigilibOption.squeeze));
    }

    /**
     * Do not scale, just crop original resolution.
     * 
     * @return is crop to fit
     */
    public boolean isCropToFit() {
        return request.hasOption(DigilibOption.clip);
    }

    /**
     * Scale according to zoom area and destination size violating aspect ratio.
     * 
     * @return is squeeze to fit
     */
    public boolean isSqueezeToFit() {
        return request.hasOption(DigilibOption.squeeze);
    }

    /**
     * Scale according to fixed factor independent of destination size.
     * 
     * @return is absolute scale
     */
    public boolean isAbsoluteScale() {
        return request.hasOption(DigilibOption.osize) || request.hasOption(DigilibOption.ascale);
    }

    /**
     * Return the minimum size the source image should have for scaling.
     * 
     * Note: this function is called by getInput(). It must not assume a selected input image!
     * 
     * @return the ImageSize
     * @throws IOException on error
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
     * @return the ImageSize
     * @throws IOException on error
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
     * @return the ImageSize
     * @throws IOException on error
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
     * @param size the ImageSize
     */
    public void setImgSize(ImageSize size) {
        this.imgSize = size;
    }
      
    /**
     * Return the X scale factor.
     * 
     * @return the factor
     * @throws IOException on error
     * @throws ImageOpException on error
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
     * @return the factor
     * @throws IOException on error
     * @throws ImageOpException on error
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
     * @return the dw
     */
    public int getDw() {
        //logger.debug("get_paramDW()");
        if (paramDW == null) {
            paramDW = request.getAsInt("dw");
        }
        return paramDW;
    }

    /**
     * Return the height of the destination image.
     * Uses dh parameter.
     * 
     * @return the dh
     */
    public int getDh() {
        //logger.debug("get_paramDH()");
        if (paramDH == null) {
            paramDH = request.getAsInt("dh");
        }
        return paramDH;
    }

    /**
     * Return the relative width of the image area.
     * Uses ww parameter.
     * Converts ww in pixels to relative. 
     * 
     * @return the ww
     * @throws IOException on error
     */
    public Float getWw() throws IOException {
        //logger.debug("get_paramWW()");
        if (paramWW == null) {
        	paramWW = request.getAsFloat("ww");
        	if (request.hasOption(DigilibOption.pxarea)) {
        		// area in absolute pixels - convert to relative
        		hiresSize = getHiresSize();
        		paramWW = paramWW / hiresSize.getWidth(); 
        	} else if (request.hasOption(DigilibOption.sqarea)) {
        		// square full size area
        		hiresSize = getHiresSize();
        		float aspect = hiresSize.getAspect();
				if (aspect < 1) {
        			// portrait
        			paramWW = 1f;
        		} else {
        			// landscape
        			paramWW = 1f / aspect;
        		}
        	}
        }
        return paramWW;
    }

    /**
     * Return the relative height of the image area.
     * Uses wh parameter.
     * Converts wh in pixels to relative. 
     * 
     * @return the wh
     * @throws IOException on error
     */
    public Float getWh() throws IOException {
        //logger.debug("get_paramWH()");
        if (paramWH == null) {
        	paramWH = request.getAsFloat("wh");
        	if (request.hasOption(DigilibOption.pxarea)) {
        		// area in absolute pixels - convert to relative
        		hiresSize = getHiresSize();
        		paramWH = paramWH / hiresSize.getHeight(); 
        	} else if (request.hasOption(DigilibOption.sqarea)) {
        		// square full size area
        		hiresSize = getHiresSize();
        		float aspect = hiresSize.getAspect();
				if (aspect < 1) {
        			// portrait
        			paramWH = aspect;
        		} else {
        			// landscape
        			paramWH = 1f;
        		}
        	}
        }
        return paramWH;
    }

    /**
     * Return the relative x-offset of the image area.
     * Uses wx parameter.
     * Converts wx in pixels to relative. 
     * 
     * @return the wx
     * @throws IOException on error
     */
    public Float getWx() throws IOException {
        //logger.debug("get_paramWX()");
        if (paramWX == null) {
        	paramWX = request.getAsFloat("wx");
        	if (request.hasOption(DigilibOption.pxarea)) {
        		// area in absolute pixels - convert to relative
        		ImageSize imgSize = getHiresSize();
        		paramWX = paramWX / imgSize.getWidth(); 
        	} else if (request.hasOption(DigilibOption.sqarea)) {
        		// square full size area
        		hiresSize = getHiresSize();
        		float aspect = hiresSize.getAspect();
				if (aspect < 1) {
        			// portrait
        			paramWX = 0f;
        		} else {
        			// landscape
        			paramWX = (1f - (1f / aspect)) / 2f;
        		}
        	}
        }
        return paramWX;
    }

    /**
     * Return the relative y-offset of the image area.
     * Uses wy parameter.
     * Converts wy in pixels to relative. 
     * 
     * @return the wy
     * @throws IOException on error
     */
    public Float getWy() throws IOException {
        //logger.debug("get_paramWY()");
        if (paramWY == null) {
        	paramWY = request.getAsFloat("wy");
        	if (request.hasOption(DigilibOption.pxarea)) {
        		// area in absolute pixels - convert to relative
        		ImageSize imgSize = getHiresSize();
        		paramWY = paramWY / imgSize.getHeight(); 
        	} else if (request.hasOption(DigilibOption.sqarea)) {
        		// square full size area
        		hiresSize = getHiresSize();
        		float aspect = hiresSize.getAspect();
				if (aspect < 1) {
        			// portrait
        			paramWY = (1f - aspect) / 2f;
        		} else {
        			// landscape
        			paramWY = 0f;
        		}
        	}
        }
        return paramWY;
    }

    /**
     * Return image quality as an integer.
     * 
     * @return the scale quality
     */
    public int getScaleQual() {
        //logger.debug("get_scaleQual()");
        int qual = config.getAsInt("default-quality");
        if (request.hasOption(DigilibOption.q0))
            qual = 0;
        else if (request.hasOption(DigilibOption.q1))
            qual = 1;
        else if (request.hasOption(DigilibOption.q2)) 
            qual = 2;
        return qual;
    }

    /**
     * Return the color operation as a ColorOp.
     * 
     * @return the ColorOp
     */
    public ColorOp getColOp() {
        String op = request.getAsString("colop");
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
     * @return the Rectangle2D
     * @throws IOException on error
     * @throws ImageOpException on error
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
     * @return the rgbm
     */
    public float[] getRGBM() {
        if (paramRGBM == null) {
            Parameter p = request.get("rgbm");
            if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
                paramRGBM = p.parseAsFloatArray("/");
            }
        }
        return paramRGBM;
    }

    /**
     * Get the RGBA parameter set.
     * 
     * @return the rgba
     */
    public float[] getRGBA() {
        if (paramRGBA == null) {
            Parameter p = request.get("rgba");
            if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
                paramRGBA = p.parseAsFloatArray("/");
            }
        }
        return paramRGBA;
    }

    /**
     * Returns if send-as-file has been requested?
     * 
     * @return is send as file
     */
    public boolean isSendAsFileRequested() {
        return request.hasOption(DigilibOption.file) || request.hasOption(DigilibOption.rawfile);
    }

    /**
     * Returns if zoom has been requested.
     * @return
     * @throws IOException
     */
    public boolean isZoomRequested() throws IOException {
        return getWx() > 0f || getWy() > 0f || getWw() < 1f || getWh() < 1f;
    }

    /**
     * Returns if the image can be sent without processing. Takes image type and
     * additional image operations into account. Does not check requested size
     * transformation.
     * 
     * @return is image sendable
     * @throws IOException on error
     */
    public boolean isImageSendable() throws IOException {
        if (imageSendable == null) {
            String mimeType = getInputMimeType();
            imageSendable = (mimeType != null
            		// input image is browser compatible
                    && input.hasTag(ImageInput.InputTag.SENDABLE)
                    // no forced type conversion
                    && !(request.hasOption(DigilibOption.jpg) && !mimeType.equals("image/jpeg"))
                    && !(request.hasOption(DigilibOption.png) && !mimeType.equals("image/png"))
                    // no zooming
                    && !isZoomRequested()
                    // no other image operations
                    && !(request.hasOption(DigilibOption.vmir) 
                            || request.hasOption(DigilibOption.hmir)
                            || (request.getAsFloat("rot") != 0.0)
                            || (getRGBM() != null)
                            || (getRGBA() != null)
                            || (this.getColOp() != null) 
                            || (request.getAsFloat("cont") != 0.0) 
                            || (request.getAsFloat("brgt") != 0.0)));
        }
        return imageSendable;
    }

    /**
     * Returns if any transformation of the source image (image manipulation or
     * format conversion) is required.
     * 
     * @return is transform required
     * @throws IOException on error
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
     * @return the DigilibRequest
     */
    public ParameterMap getRequest() {
        return request;
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
