package digilib.image;

import java.awt.geom.AffineTransform;
import java.awt.geom.Rectangle2D;
import java.io.IOException;

import org.apache.log4j.Logger;

import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.FileOps.FileClass;
import digilib.io.ImageInput;
import digilib.io.ImageSet;
import digilib.servlet.DigilibConfiguration;
import digilib.util.OptionsSet;
import digilib.util.Parameter;
import digilib.util.ParameterMap;


/** 
 * A container class for storing a set of instructional parameters 
 * used for content generating classes like MakePDF.  
 * 
 * This contains the functionality formerly found in Scaler, processRequest, only factorized.
 * 
 * @author cmielack, casties
 *
 */

public class ImageJobDescription extends ParameterMap {
	
	DigilibConfiguration dlConfig = null;
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	ImageInput fileToLoad = null;
	ImageSet fileset = null;
	DocuDirectory fileDir = null;
	String filePath = null;
	ImageSize expectedSourceSize = null;
	Float scaleXY = null;
	Rectangle2D userImgArea = null;
	Rectangle2D outerUserImgArea = null;
	Boolean imageSendable = null;
	String mimeType;
	Integer paramDW;
	Integer paramDH;

	/** create empty ImageJobDescription.
	 * @param dlcfg
	 */
	public ImageJobDescription(DigilibConfiguration dlcfg) {
		super(30);
		dlConfig = dlcfg;
	}


	/** set up Parameters
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
	}


	/* (non-Javadoc)
	 * @see digilib.servlet.ParameterMap#initOptions()
	 */
	@Override
	protected void initOptions() {
		String s = this.getAsString("mo");
		options = new OptionsSet(s);
	}


	/** Creates new ImageJobDescription by merging Parameters from another ParameterMap.
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

	
	public String getMimeType() throws IOException {
		if (mimeType == null) {
			fileToLoad = getFileToLoad();
			mimeType = fileToLoad.getMimetype();
		}
		return mimeType;
	}
	
	public ImageInput getFileToLoad() throws IOException {
		if(fileToLoad == null){
			fileset = getFileset();
			
			/* select a resolution */
			if (getHiresOnly()) {
				// get first element (= highest resolution)
				fileToLoad = fileset.getBiggest();
			} else if (getLoresOnly()) {
				// enforced lores uses next smaller resolution
				fileToLoad = fileset.getNextSmaller(getExpectedSourceSize());
				if (fileToLoad == null) {
					// this is the smallest we have
					fileToLoad = fileset.getSmallest();
				}
			} else {
				// autores: use next higher resolution
				fileToLoad = fileset.getNextBigger(getExpectedSourceSize());
				if (fileToLoad == null) {
					// this is the highest we have
					fileToLoad = fileset.getBiggest();
				}
			}
			logger.info("Planning to load: " + fileToLoad);
		}
		
		return fileToLoad;

	}
	
	public DocuDirectory getFileDirectory() throws FileOpException {
		if(fileDir == null){
			DocuDirCache dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
			String fp = getFilePath();
			fileDir = dirCache.getDirectory(fp);
			if (fileDir == null) {
				throw new FileOpException("Directory " + getFilePath() + " not found.");
			}
		}
		return fileDir;
	}
	
    public ImageSet getFileset() throws FileOpException {
        if(fileset==null){
            DocuDirCache dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
    
            fileset = (ImageSet) dirCache.getFile(getFilePath(), getAsInt("pn"), FileClass.IMAGE);
            if (fileset == null) {
                throw new FileOpException("File " + getFilePath() + "("
                        + getAsInt("pn") + ") not found.");
            }
        }
        return fileset;
    }
    
	public String getFilePath() {
		if(filePath == null){
			String s = this.getAsString("request.path");
			s += this.getAsString("fn");
			filePath = FileOps.normalName(s);
		}
		return filePath;
	}

	public boolean getHiresOnly(){
		return hasOption("clip") || hasOption("hires");
	}
	
	public boolean getLoresOnly(){
		return hasOption("lores");
	}

	public boolean getScaleToFit() {
		return !(hasOption("clip") || hasOption("osize") || hasOption("ascale"));
	}

	public boolean getAbsoluteScale(){
		return hasOption("osize") || hasOption("ascale");
	}
	
	
	public ImageSize getExpectedSourceSize() throws IOException {
		if (expectedSourceSize == null){
			expectedSourceSize = new ImageSize();
			if (getScaleToFit()) {
				// scale to fit -- calculate minimum source size
				float scale = (1 / Math.min(getAsFloat("ww"), getAsFloat("wh"))) * getAsFloat("ws");
				expectedSourceSize.setSize((int) (getDw() * scale),
						(int) (getDh() * scale));
			} else if (getAbsoluteScale() && hasOption("ascale")) {
				// absolute scale -- apply scale to hires size
				expectedSourceSize = getHiresSize().getScaled(getAsFloat("scale"));
			} else {
				// clip to fit -- source = destination size
				expectedSourceSize.setSize((int) (getDw() * getAsFloat("ws")),
						(int) (getDh() * getAsFloat("ws")));
			}
		}
		return expectedSourceSize;
	}
	
	public ImageSize getHiresSize() throws IOException {
		logger.debug("get_hiresSize()");

		ImageSize hiresSize = null;
		ImageSet fileset = getFileset();
		if (getAbsoluteScale()) {
			ImageInput hiresFile = fileset.getBiggest();
			hiresSize = hiresFile.getSize();
		}
		return hiresSize;
	}
	
	/** Returns image scaling factor.
	 * Uses image size and user parameters.
	 * Modifies scaleXY, userImgArea. 
	 * @return
	 * @throws IOException
	 * @throws ImageOpException
	 */
	public float getScaleXY() throws IOException, ImageOpException {
		//logger.debug("get_scaleXY()");
		if(scaleXY == null){
			// coordinates and scaling
			float areaWidth;
			float areaHeight;
			float ws = getAsFloat("ws");
			ImageSize imgSize = getFileToLoad().getSize();
			// user window area in [0,1] coordinates
			Rectangle2D relUserArea = new Rectangle2D.Float(getAsFloat("wx"), getAsFloat("wy"),
					getAsFloat("ww"), getAsFloat("wh"));
			// transform from relative [0,1] to image coordinates.
			AffineTransform imgTrafo = AffineTransform.getScaleInstance(imgSize
					.getWidth(), imgSize.getHeight());
			// transform user coordinate area to image coordinate area
			userImgArea = imgTrafo.createTransformedShape(
					relUserArea).getBounds2D();
	
			if (getScaleToFit()) {
				// calculate scaling factors based on inner user area
				areaWidth = (float) userImgArea.getWidth();
				areaHeight = (float) userImgArea.getHeight();
				float scaleX = getDw() / areaWidth * ws;
				float scaleY = getDh() / areaHeight * ws;
				scaleXY = (scaleX > scaleY) ? scaleY : scaleX;
			} else if (getAbsoluteScale()) {
				// absolute scaling factor
				if (hasOption("osize")) {
					// get original resolution from metadata
					fileset.checkMeta();
					float origResX = fileset.getResX();
					float origResY = fileset.getResY();
					if ((origResX == 0) || (origResY == 0)) {
						throw new ImageOpException("Missing image DPI information!");
					}
					if ((getAsFloat("ddpix") == 0) || (getAsFloat("ddpiy") == 0)) {
						throw new ImageOpException("Missing display DPI information!");
					}
					// calculate absolute scale factor
					float sx = getAsFloat("ddpix") / origResX;
					float sy = getAsFloat("ddpiy") / origResY;
					// currently only same scale -- mean value
					scaleXY = (sx + sy) / 2f;
				} else {
					scaleXY = getAsFloat("scale");
				}
				// we need to correct the factor if we use a pre-scaled image
				ImageSize hiresSize = getHiresSize();
				if (imgSize.getWidth() != hiresSize.getWidth()) {
					scaleXY *= (float)hiresSize.getWidth() / (float)imgSize.getWidth();
				}
				areaWidth = getDw() / scaleXY * ws;
				areaHeight = getDh() / scaleXY * ws;
				// reset user area size
				userImgArea.setRect(userImgArea.getX(), userImgArea.getY(),
						areaWidth, areaHeight);
			} else {
				// crop to fit -- don't scale
				areaWidth = getDw() * ws;
				areaHeight = getDh() * ws;
				// reset user area size
				userImgArea.setRect(userImgArea.getX(), userImgArea.getY(),
						areaWidth, areaHeight);
				scaleXY = 1f;
			}
		}
		return (float) scaleXY;
	}
	
	public int getDw() throws IOException {
		logger.debug("get_paramDW()");
		if (paramDW == null) {

			paramDW = getAsInt("dw");
			paramDH = getAsInt("dh");

			float imgAspect = getFileToLoad().getAspect();
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
	
	public int getDh() throws IOException {
		logger.debug("get_paramDH()");
		if (paramDH == null) {
			
			paramDW = getAsInt("dw");
			paramDH = getAsInt("dh");

			float imgAspect = getFileToLoad().getAspect();
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
	
	public Integer getScaleQual(){
		logger.debug("get_scaleQual()");
		Integer qual = dlConfig.getAsInt("default-quality");
		if(hasOption("q0"))
			qual = 0;
		else if(hasOption("q1"))
			qual = 1;
		else if(hasOption("q2"))
			qual = 2;
		return qual;
	}

	
	public Rectangle2D getUserImgArea() throws IOException, ImageOpException{
		if(userImgArea == null) {
			// getScaleXY sets userImgArea
			getScaleXY();
		}
		return userImgArea;		
		
	}
	
	public Rectangle2D getOuterUserImgArea() throws IOException, ImageOpException {
		if(outerUserImgArea == null){
			outerUserImgArea = getUserImgArea();
			
			// image size in pixels
			ImageSize imgSize = getFileToLoad().getSize();
			Rectangle2D imgBounds = new Rectangle2D.Float(0, 0, imgSize.getWidth(), 
					imgSize.getHeight());
			
			// clip area at the image border
			outerUserImgArea = outerUserImgArea.createIntersection(imgBounds);
	
			// check image parameters sanity
			scaleXY = getScaleXY();
			logger.debug("outerUserImgArea.getWidth()=" + outerUserImgArea.getWidth());
			logger.debug("get_scaleXY() * outerUserImgArea.getWidth() = " + (scaleXY * outerUserImgArea.getWidth()));
			
			if ((outerUserImgArea.getWidth() < 1)
					|| (outerUserImgArea.getHeight() < 1)
					|| (scaleXY * outerUserImgArea.getWidth() < 2)
					|| (scaleXY * outerUserImgArea.getHeight() < 2)) {
				logger.error("ERROR: invalid scale parameter set!");
				throw new ImageOpException("Invalid scale parameter set!");
			}
		}
		return outerUserImgArea;
	}
	
	
	public float[] getRGBM(){
		float[] paramRGBM = null;//{0f,0f,0f};
		Parameter p = params.get("rgbm");
		if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
			return p.parseAsFloatArray("/");
		}	
		return paramRGBM;
	}
	
	public float[] getRGBA(){
		float[] paramRGBA =  null;//{0f,0f,0f};
		Parameter p = params.get("rgba");
		if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
			paramRGBA = p.parseAsFloatArray("/");
		}
		return paramRGBA;
	}
	
	/** Has send-as-file been requested?
	 * @return
	 */
	public boolean getSendAsFile(){
		return hasOption("file")
		|| hasOption("rawfile");
	}
	
	/** Could the image be sent without processing?
	 * Takes image type and additional image operations into account. 
	 * Does not check requested size transformation.
	 * @return
	 * @throws IOException 
	 */
	public boolean isImageSendable() throws IOException {
		// cached result?
		if (imageSendable == null) {
			String mimeType = getMimeType();
			imageSendable = ( (mimeType.equals("image/jpeg")
				        	|| mimeType.equals("image/png")
				        	|| mimeType.equals("image/gif") )
				        	&& 
				        	!(hasOption("hmir")
							|| hasOption("vmir") 
							|| (getAsFloat("rot") != 0.0)
							|| (getRGBM() != null) 
							|| (getRGBA() != null)
							|| (getAsFloat("cont") != 0.0) 
							|| (getAsFloat("brgt") != 0.0)));
		}
		
		return imageSendable;
	}
	
	
	public boolean isTransformRequired() throws IOException {
		ImageSize is = getFileToLoad().getSize();
		ImageSize ess = getExpectedSourceSize();
		// nt = no transform required
		boolean nt = isImageSendable() && (
			// lores: send if smaller
			(getLoresOnly() && is.isSmallerThan(ess))
			// else send if it fits
			|| (!(getLoresOnly() || getHiresOnly()) && is.fitsIn(ess)));
		return ! nt;
	}
}