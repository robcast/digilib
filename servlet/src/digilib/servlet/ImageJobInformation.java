package digilib.servlet;

import java.awt.geom.AffineTransform;
import java.awt.geom.NoninvertibleTransformException;
import java.awt.geom.Rectangle2D;
import java.io.IOException;
import java.util.StringTokenizer;

import javax.servlet.ServletRequest;
import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;

import digilib.image.ImageOpException;
import digilib.image.ImageOps;
import digilib.image.ImageSize;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirent;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageFile;
import digilib.io.ImageFileset;


/** 
 * A container class for storing a set of instructional parameters 
 * used for content generating classes like MakePDF.  
 * 
 * TODO aufraeumen, zwischenwerte in der ParameterMap cachen
 * 
 * @author cmielack
 *
 */

public class ImageJobInformation extends ParameterMap {
	
	String[] parameter_list = {"fn","pn","dw","dh",
								"wx", "wy", "ww", "wh", "ws", 
								"mo", "rot", "cont", "brgt", "rgbm", "rbgm", 
								"ddpi", "ddpix", "ddpiy", "scale"};
	DigilibConfiguration dlConfig = null;
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	ImageFile fileToLoad = null;
	ImageFileset fileset=null;
	String FilePath = null;
	ImageSize expectedSourceSize = null;
	Float scaleXY = null;
	Rectangle2D userImgArea = null;
	Rectangle2D outerUserImgArea= null;
	Boolean imageSendable = null;
//	Integer paramDW = null;
//	Integer paramDH 
	public ImageJobInformation() {
		super(30);
		
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
		newParameter("mo", "", null, 's');
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

		/*
		 * Parameters of type 'i' are not exchanged between client and server,
		 * but are for the servlets or JSPs internal use.
		 */

		// url of the page/document (first part, may be empty)
		newParameter("request.path", "", null, 'i');
		// base URL (from http:// to below /servlet)
		newParameter("base.url", null, null, 'i');

		/*
		 * Parameters of type 'c' are for the clients use
		 */
/*
		// "real" filename
		newParameter("img.fn", "", null, 'c');
		// image dpi x
		newParameter("img.dpix", new Integer(0), null, 'c');
		// image dpi y
		newParameter("img.dpiy", new Integer(0), null, 'c');
		// hires image size x
		newParameter("img.pix_x", new Integer(0), null, 'c');
		// hires image size y
		newParameter("img.pix_y", new Integer(0), null, 'c');
		// total number of pages
		newParameter("pt", new Integer(0), null, 'c');
		// display level of digilib (0 = just image, 1 = one HTML page
		// 2 = in frameset, 3 = XUL-'frameset'
		// 4 = XUL-Sidebar )
		newParameter("lv", new Integer(2), null, 'c');
		// marks
		newParameter("mk", "", null, 'c');
*/	
	}

	public void setConfig(DigilibConfiguration dlcfg){
		dlConfig = dlcfg;
	}
	
	public void setWithRequest(HttpServletRequest request) {
		for (String param : parameter_list){
			if (request.getParameterMap().containsKey(param)){
				//request.get
//				put(param, request.getParameter(param));
				this.setValueFromString(param, request.getParameter(param));
			}
		}
	setValueFromString("request.path", ((HttpServletRequest) request).getPathInfo());

	}
	
	public String[] getParameterList(){
		return parameter_list;
	}
	

	public boolean hasOption(String param, String opt) {
		String s = getAsString(param);
		if (s != null) {
			StringTokenizer i = new StringTokenizer(s, ",");
			while (i.hasMoreTokens()) {
				if (i.nextToken().equals(opt)) {
					return true;
				}
			}
		}
		return false;
	}
	
	
	/**
	 * evaluate request data in order to gain the parameters for the image worker
	 * 
	 * @throws ImageOpException 
	 * @throws IOException 
	 * */

	public String get_mimeType() {
		String mimeType = "image/png";
		
		
		ImageFile fileToLoad;
		try {

			fileToLoad = get_fileToLoad();
			
			if(!get_fileToLoad().isChecked()){
				ImageOps.checkFile(fileToLoad);
			}

				
			if(fileToLoad != null)
				mimeType = fileToLoad.getMimetype();

		} catch (IOException e) {
			e.printStackTrace();
		} catch (ImageOpException e) {
			e.printStackTrace();
		}

		
		return mimeType;
	}
	
	public ImageFile get_fileToLoad() throws IOException, ImageOpException{
		
		//logger.debug("get_fileToLoad()");
		if(fileToLoad == null){
			ImageFileset fileset = get_fileset();
			
			/* select a resolution */
			if (get_hiresOnly()) {
				// get first element (= highest resolution)
				fileToLoad = fileset.getBiggest();
			} else if (get_loresOnly()) {
				// enforced lores uses next smaller resolution
				fileToLoad = fileset.getNextSmaller(get_expectedSourceSize());
				if (fileToLoad == null) {
					// this is the smallest we have
					fileToLoad = fileset.getSmallest();
				}
			} else {
				// autores: use next higher resolution
				fileToLoad = fileset.getNextBigger(get_expectedSourceSize());
				if (fileToLoad == null) {
					// this is the highest we have
					fileToLoad = fileset.getBiggest();
				}
			}
			logger.info("Planning to load: " + fileToLoad.getFile());
		}
		
		return fileToLoad;

	}
	
	public ImageFileset get_fileset() throws FileOpException{
		//logger.debug("get_fileset()");
		if(fileset==null){
			DocuDirCache dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
	
			fileset = (ImageFileset) dirCache.getFile(getFilePath(), getAsInt("pn"), FileOps.CLASS_IMAGE);
			if (fileset == null) {
				throw new FileOpException("File " + getFilePath() + "("
						+ getAsInt("pn") + ") not found.");
			}
		}
		return fileset;
	}
	
	public String getFilePath() {
		//logger.debug("getFilePath()");
		if(FilePath == null){
			String s = this.getAsString("request.path");
			s += this.getAsString("fn");
			FilePath = FileOps.normalName(s);
		}
		return FilePath;
	}

	public boolean get_hiresOnly(){
		//logger.debug("get_hiresOnly()");
		return hasOption("mo","clip") || hasOption("mo","osize") || hasOption("mo","hires");
	}
	
	public boolean get_loresOnly(){
		//logger.debug("get_loresOnly()");

		return hasOption("mo","lores");
	}

	public boolean get_scaleToFit() {
		//logger.debug("get_scaleToFit()");

		return !(hasOption("mo","clip") || hasOption("mo","osize") || hasOption("mo","ascale"));
	}

	public boolean get_absoluteScale(){
		//logger.debug("get_absoluteScale()");

		return hasOption("mo","osize") || hasOption("mo","ascale");
	}
	
	
	public ImageSize get_expectedSourceSize() throws IOException, ImageOpException{
		//logger.debug("get_expectedSourceSize()");

		if (expectedSourceSize == null){
			expectedSourceSize = new ImageSize();
			
			if (get_scaleToFit()) {
				// scale to fit -- calculate minimum source size
				float scale = (1 / Math.min(getAsFloat("ww"), getAsFloat("wh"))) * getAsFloat("ws");
				expectedSourceSize.setSize((int) (getAsInt("dw") * scale),
						(int) (getAsInt("dh") * scale));
			} else if (get_absoluteScale() && hasOption("mo", "ascale")) {
				// absolute scale -- apply scale to hires size
				expectedSourceSize = get_hiresSize().getScaled(getAsFloat("scale"));
			} else {
				// clip to fit -- source = destination size
				expectedSourceSize.setSize((int) (getAsInt("dw") * getAsFloat("ws")),
						(int) (getAsInt("dh") * getAsFloat("ws")));
			}
		}
		return expectedSourceSize;
	}
	
	public ImageSize get_hiresSize() throws IOException, ImageOpException{
		logger.debug("get_hiresSize()");

		ImageSize hiresSize = null;
		ImageFileset fileset = get_fileset();
		if (get_absoluteScale()) {
			ImageFile hiresFile = fileset.getBiggest();
			if (!hiresFile.isChecked()) {
				ImageOps.checkFile(hiresFile);
			}
			hiresSize = hiresFile.getSize();
			
			/* prepare resolution and scale factor for original size */
			if (hasOption("mo", "osize")) {
				// get original resolution from metadata
				fileset.checkMeta();
				float origResX = fileset.getResX();
				float origResY = fileset.getResY();
				if ((origResX == 0) || (origResY == 0)) {
					throw new ImageOpException("Missing image DPI information!");
				}

				if ((getAsFloat("ddpix") == 0) || (getAsFloat("ddpiy") == 0)) {
					throw new ImageOpException(
							"Missing display DPI information!");
				}
				// calculate absolute scale factor
				float sx = getAsFloat("ddpix") / origResX;
				float sy = getAsFloat("ddpiy") / origResY;
				// currently only same scale :-(
				put("scale", (sx + sy)/2f);
			}
			
		}
		return hiresSize;
		
	}
	
	public float get_scaleXY() throws IOException, ImageOpException{
		//logger.debug("get_scaleXY()");
		if(scaleXY == null){
			// coordinates and scaling
			float areaWidth;
			float areaHeight;
			float scaleX;
			float scaleY;
			ImageSize imgSize = get_fileToLoad().getSize();
			ImageSize hiresSize = get_hiresSize();
			// coordinates using Java2D
			// image size in pixels
	//		Rectangle2D imgBounds = new Rectangle2D.Float(0, 0, imgSize
	//				.getWidth(), imgSize.getHeight());
			// user window area in [0,1] coordinates
			Rectangle2D relUserArea = new Rectangle2D.Float(getAsFloat("wx"), getAsFloat("wy"),
					getAsFloat("ww"), getAsFloat("wh"));
			// transform from relative [0,1] to image coordinates.
			AffineTransform imgTrafo = AffineTransform.getScaleInstance(imgSize
					.getWidth(), imgSize.getHeight());
			// transform user coordinate area to image coordinate area
			Rectangle2D userImgArea = imgTrafo.createTransformedShape(
					relUserArea).getBounds2D();
	
			// calculate scaling factors based on inner user area
			if (get_scaleToFit()) {
				areaWidth = (float) userImgArea.getWidth();
				areaHeight = (float) userImgArea.getHeight();
				scaleX = get_paramDW() / areaWidth * getAsFloat("ws");
				scaleY = get_paramDH() / areaHeight * getAsFloat("ws");
				scaleXY = (scaleX > scaleY) ? scaleY : scaleX;
			} else if (get_absoluteScale()) {
				scaleXY = getAsFloat("scale");
				// we need to correct the factor if we use a pre-scaled image
				if (imgSize.getWidth() != hiresSize.getWidth()) {
					scaleXY *= (float)hiresSize.getWidth() / (float)imgSize.getWidth();
				}
				//scaleX = scaleXY;
				//scaleY = scaleXY;
				areaWidth = get_paramDW() / scaleXY * getAsFloat("ws");
				areaHeight = get_paramDH() / scaleXY * getAsFloat("ws");
				// reset user area size
				userImgArea.setRect(userImgArea.getX(), userImgArea.getY(),
						areaWidth, areaHeight);
			} else {
				// crop to fit
				areaWidth = get_paramDW() * getAsFloat("ws");
				areaHeight = get_paramDH() * getAsFloat("ws");
				// reset user area size
				userImgArea.setRect(userImgArea.getX(), userImgArea.getY(),
						areaWidth, areaHeight);
				scaleX = 1f;
				scaleY = 1f;
				scaleXY = 1f;
			}
		}
		
		return (float) scaleXY;
	}
	
	public int get_paramDW(){
		logger.debug("get_paramDW()");

		int paramDW = getAsInt("dw");
		int paramDH = getAsInt("dh");
		
		float imgAspect;
		try {
			imgAspect = get_fileToLoad().getAspect();
			if (paramDW == 0) {
				paramDW = (int) Math.round(paramDH * imgAspect);
				setValue("dw", paramDW);
			} else if (paramDH == 0) {
				setValue("dh",  (int) Math.round(paramDW / imgAspect));
			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (ImageOpException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return paramDW;
	}
	
	public int get_paramDH(){
		logger.debug("get_paramDH()");

		int paramDW = getAsInt("dw");
		int paramDH = getAsInt("dh");
		
		float imgAspect;
		try {
			imgAspect = get_fileToLoad().getAspect();
			if (paramDW == 0) {
				setValue("dw", (int) Math.round(paramDH * imgAspect));
			} else if (paramDH == 0) {
				paramDH = (int) Math.round(paramDW / imgAspect);
				setValue("dh", paramDH );
			}


		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (ImageOpException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return paramDH;
	}
	public Integer get_scaleQual(){
		logger.debug("get_scaleQual()");

		Integer qual = 	dlConfig.getAsInt("default-quality");
		if(hasOption("mo","q0"))
			qual = 0;
		else if(hasOption("mo","q1"))
			qual = 1;
		else if(hasOption("mo","q2"))
			qual = 2;
		return qual;
	}

	
	public ImageSize get_imgSize() throws IOException, ImageOpException{
		logger.debug("get_imgSize()");

		ImageSize imgSize = get_fileToLoad().getSize();
		return imgSize;
	}
	
	public Rectangle2D get_userImgArea() throws IOException, ImageOpException{
		//logger.debug("get_userImgArea()");
		
		if(userImgArea==null){
			// transform from relative [0,1] to image coordinates.
			AffineTransform imgTrafo = AffineTransform.getScaleInstance(get_imgSize()
					.getWidth(), get_imgSize().getHeight());
	
			// user window area in [0,1] coordinates
			Rectangle2D relUserArea = new Rectangle2D.Float(getAsFloat("wx"), getAsFloat("wy"),
					getAsFloat("ww"), getAsFloat("wh"));
	
			// transform user coordinate area to image coordinate area
			userImgArea = imgTrafo.createTransformedShape(
					relUserArea).getBounds2D();
			
			if(get_absoluteScale()){
				float areaWidth = getAsInt("dw") / get_scaleXY() * getAsFloat("ws");
				float areaHeight = getAsInt("dh") / get_scaleXY() * getAsFloat("ws");
				// reset user area size
				userImgArea.setRect(userImgArea.getX(), userImgArea.getY(),
						areaWidth, areaHeight);
			} else if (!get_scaleToFit()){
				// crop to fit
				float areaWidth = getAsInt("dw") * getAsFloat("ws");
				float areaHeight = getAsInt("dh") * getAsFloat("ws");
				// reset user area size
				userImgArea.setRect(userImgArea.getX(), userImgArea.getY(),
						areaWidth, areaHeight);
			}
		}
		return userImgArea;		
		
	}
	
	public Rectangle2D get_outerUserImgArea() throws IOException, ImageOpException{
		//logger.debug("get_outerUserImgArea()");

		if(outerUserImgArea == null){
			Rectangle2D userImgArea = get_userImgArea();
			
			// image size in pixels
			Rectangle2D imgBounds = new Rectangle2D.Float(0, 0, get_imgSize()
					.getWidth(), get_imgSize().getHeight());
	
	
	
			
			outerUserImgArea = userImgArea;
			Rectangle2D innerUserImgArea = userImgArea;
			if (get_wholeRotArea()) {
				if (getAsFloat("rot") != 0) {
					try {
						// rotate user area coordinates around center of user
						// area
						AffineTransform rotTrafo = AffineTransform
								.getRotateInstance(Math.toRadians(getAsFloat("rot")),
										userImgArea.getCenterX(), userImgArea
												.getCenterY());
						// get bounds from rotated end position
						innerUserImgArea = rotTrafo.createTransformedShape(
								userImgArea).getBounds2D();
						// get bounds from back-rotated bounds
						outerUserImgArea = rotTrafo.createInverse()
								.createTransformedShape(innerUserImgArea)
								.getBounds2D();
					} catch (NoninvertibleTransformException e1) {
						// this shouldn't happen anyway
						logger.error(e1);
					}
				}
			}
	
			// logger.debug("Scale " + scaleXY + "(" + scaleX + "," + scaleY
					//+ ") on " + outerUserImgArea);
	
			// clip area at the image border
			outerUserImgArea = outerUserImgArea.createIntersection(imgBounds);
	
			// check image parameters sanity
			logger.debug("outerUserImgArea.getWidth()=" + outerUserImgArea.getWidth());
			logger.debug("get_scaleXY() * outerUserImgArea.getWidth() = " + (get_scaleXY() * outerUserImgArea.getWidth()));
			
			if ((outerUserImgArea.getWidth() < 1)
					|| (outerUserImgArea.getHeight() < 1)
					|| (get_scaleXY() * outerUserImgArea.getWidth() < 2)
					|| (get_scaleXY() * outerUserImgArea.getHeight() < 2)) {
				logger.error("ERROR: invalid scale parameter set!");
				throw new ImageOpException("Invalid scale parameter set!");
			}
		}
		return outerUserImgArea;
	}
	
	
	public Rectangle2D get_innerUserImgArea() throws IOException, ImageOpException{
		logger.debug("get_innerUserImgArea()");

		Rectangle2D userImgArea = get_userImgArea();
		Rectangle2D innerUserImgArea = get_userImgArea();
		if (get_wholeRotArea()) {
			if (getAsFloat("rot") != 0) {
				// rotate user area coordinates around center of user
				// area
				AffineTransform rotTrafo = AffineTransform
						.getRotateInstance(Math.toRadians(getAsFloat("rot")),
								userImgArea.getCenterX(), userImgArea
										.getCenterY());
				// get bounds from rotated end position
				innerUserImgArea = rotTrafo.createTransformedShape(
						userImgArea).getBounds2D();
			}
		}
		return innerUserImgArea;

	}
	public boolean get_wholeRotArea(){
		// TODO this is not really implemented yet
		//boolean wholeRotArea = false;
		return false;//wholeRotArea;
	}
	
	public int get_forceType(){

		if(hasOption("mo","jpg"))
			return ImageOps.TYPE_JPEG;
		if(hasOption("mo","png"))
			return ImageOps.TYPE_PNG;
		
		return ImageOps.TYPE_AUTO;
	}
	
	public float[] get_paramRGBM(){
		logger.debug("get_paramRGBM()");

		float[] paramRGBM = null;//{0f,0f,0f};
		Parameter p = get("rgbm");
		if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
			return p.parseAsFloatArray("/");
		}	
		return paramRGBM;
	}
	
	public float[] get_paramRGBA(){
		logger.debug("get_paramRGBA()");

		float[] paramRGBA =  null;//{0f,0f,0f};
		Parameter p = get("rgba");
		if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
			paramRGBA = p.parseAsFloatArray("/");
		}
		return paramRGBA;
	}
	
	public boolean get_hmir(){
		logger.debug("get_hmir()");

		return hasOption("mo","hmir");
	}
	
	public boolean get_vmir(){
		logger.debug("get_vmir()");

		return hasOption("mo","vmir");
	}
	
	public boolean checkSendAsFile(){
		return hasOption("mo", "file")
		|| hasOption("mo", "rawfile");
	}
	
	public boolean get_imageSendable(){
		if(imageSendable==null){
			String mimeType = get_mimeType();
			imageSendable = ( (mimeType.equals("image/jpeg")
				        	|| mimeType.equals("image/png")
				        	|| mimeType.equals("image/gif") )
				        	&& 
				        	!(hasOption("mo", "hmir")
							|| hasOption("mo", "vmir") 
							|| (getAsFloat("rot") != 0)
							|| (get_paramRGBM() != null) 
							|| (get_paramRGBA() != null)
							|| (getAsFloat("cont") != 0) 
							|| (getAsFloat("brgt") != 0)));
		}
		
		return imageSendable;
	}
	
	
	public boolean noTransformRequired(){
		try {
			return get_imageSendable() && ((get_loresOnly() && get_fileToLoad().getSize().isSmallerThan(
					get_expectedSourceSize())) || (!(get_loresOnly() || get_hiresOnly()) && get_fileToLoad()
							.getSize().fitsIn(expectedSourceSize)));
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (ImageOpException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return false;
	}
}