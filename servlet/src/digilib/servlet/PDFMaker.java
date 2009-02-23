/*
 * MakePDF
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 200-2004 Robert Casties (robcast@mail.berlios.de)
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 * 
 * Please read license.txt for the full details. A copy of the GPL may be found
 * at http://www.gnu.org/copyleft/lgpl.html
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 *  
 */

package digilib.servlet;

import java.awt.geom.AffineTransform;
import java.awt.geom.NoninvertibleTransformException;
import java.awt.geom.Rectangle2D;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;

import digilib.auth.AuthOpException;
import digilib.auth.AuthOps;
import digilib.image.ImageOpException;
import digilib.image.ImageOps;
import digilib.image.ImageSize;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.DocuDirent;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageFile;
import digilib.io.ImageFileset;

/**
 * generates pdf-files from a digilib images.
 * This is a very quick and dirty but functional version and will 
 * (hopefully soon) be replaced by a parallelized and more sophisticated one.
 *	
 * @author cmielack
 */

public class PDFMaker extends HttpServlet implements Runnable{

	private static final long serialVersionUID = -325080527268912852L;

	/** digilib servlet version (for all components) */
	public static final String dlVersion = "1.7.0b";

	/** logger for accounting requests */
	private static Logger accountlog = Logger.getLogger("account.request");

	/** gengeral logger for this class */
	private static Logger logger = Logger.getLogger("digilib.servlet");

	/** logger for authentication related */
	private static Logger authlog = Logger.getLogger("digilib.auth");

	/** general error code */
	public static final int ERROR_UNKNOWN = 0;

	/** error code for authentication error */
	public static final int ERROR_AUTH = 1;

	/** error code for file operation error */
	public static final int ERROR_FILE = 2;

	/** error code for image operation error */
	public static final int ERROR_IMAGE = 3;

	/** DocuDirCache instance */
	DocuDirCache dirCache;

	/** authentication error image file */
	File denyImgFile;

	/** image error image file */
	File errorImgFile;

	/** not found error image file */
	File notfoundImgFile;

	/** subsampling before scaling */
	float minSubsample = 2f;

	/** send files as is? */
	boolean sendFileAllowed = true;

	/** default scaling quality */
	int defaultQuality = 1;

	/** DigilibConfiguration instance */
	DigilibConfiguration dlConfig;

	/** use authorization database */
	boolean useAuthorization = true;

	/** AuthOps instance */
	AuthOps authOp;

	HttpServletRequest mpdf_request = null;
	HttpServletResponse mpdf_response = null;
	String mpdf_filename = "";
	
	String default_filename = "digilib_pages.pdf";
	
	
	// EXPRIMENTAL
	/** try to enlarge cropping area for "oblique" angles */
	boolean wholeRotArea = false;

	/**
	 * Initialisation on first run.
	 * 
	 * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
	 */
	public void init(ServletConfig config) throws ServletException {
		super.init(config);

		System.out
				.println("***** Digital Image Library Image MakePDF Servlet (version "
						+ dlVersion + ") *****");
		// say hello in the log file
		logger
				.info("***** Digital Image Library Image MakePDF Servlet (version "
						+ dlVersion + ") *****");

		// get our ServletContext
		ServletContext context = config.getServletContext();
		// see if there is a Configuration instance
		dlConfig = (DigilibConfiguration) context
				.getAttribute("digilib.servlet.configuration");
		if (dlConfig == null) {
			// no Configuration
			throw new ServletException("No Configuration!");
		}
		// set our AuthOps
		useAuthorization = dlConfig.getAsBoolean("use-authorization");
		authOp = (AuthOps) dlConfig.getValue("servlet.auth.op");

		// DocuDirCache instance
		dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
		denyImgFile = ServletOps.getFile((File) dlConfig.getValue("denied-image"), config);
		errorImgFile = ServletOps.getFile((File) dlConfig.getValue("error-image"), config);
		notfoundImgFile = ServletOps.getFile((File) dlConfig.getValue("notfound-image"), config);
		sendFileAllowed = dlConfig.getAsBoolean("sendfile-allowed");
		minSubsample = dlConfig.getAsFloat("subsample-minimum");
		defaultQuality = dlConfig.getAsInt("default-quality");

	
		context.setAttribute("digilib.servlet.MakePDF", this); // register this instance globally, so PDFCache can access it
	}

	
	public void doCreate(HttpServletRequest request, HttpServletResponse response, String filename)
		throws ServletException, IOException {

		accountlog.info("GET from " + request.getRemoteAddr());
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// add DigilibRequest to ServletRequest
		request.setAttribute("digilib.servlet.request", dlReq);

		
		mpdf_request = request;
		mpdf_response = response;
		mpdf_filename = filename;
		
	}
	
/*	public void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		
		accountlog.info("GET from " + request.getRemoteAddr());
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// add DigilibRequest to ServletRequest
		request.setAttribute("digilib.servlet.request", dlReq);
		// do the processing
		processRequest(request, response,default_filename);
	}*/

/*	public void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		
		accountlog.info("POST from " + request.getRemoteAddr());
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// add DigilibRequest to ServletRequest
		request.setAttribute("digilib.servlet.request", dlReq);
		// do the processing
		processRequest(request, response,default_filename);
	}*/

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.http.HttpServlet#getLastModified(javax.servlet.http.HttpServletRequest)
	 */

	protected long getLastModified(HttpServletRequest request) {
		accountlog.debug("GetLastModified from " + request.getRemoteAddr()
				+ " for " + request.getQueryString());
		long mtime = -1;
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// find the requested file
		DocuDirent f = findFile(dlReq);
		if (f != null) {
			DocuDirectory dd = (DocuDirectory) f.getParent();
			mtime = dd.getDirMTime() / 1000 * 1000;
		}
		return mtime;
	}

	void createPDFfile(HttpServletRequest request, HttpServletResponse response, String filename)
		throws javax.servlet.ServletException, java.io.IOException {
		
		Hashtable<String,Integer> cache_hash = (Hashtable<String,Integer>) this.getServletContext().getAttribute("digilib.servlet.PDFCache");
		BufferedOutputStream pdfOutStream = null;
		FileOutputStream fos = null;

		String file_only = filename.split("/")[filename.split("/").length-1]; 
		
		try {

			cache_hash.put(file_only, 2); // register the file as 'pending'
	
			// TODO check, if file can be created without overwriting another file etc.

			fos = new FileOutputStream(filename);
			
			pdfOutStream = generatePDFcontent(request, response, this.getServletContext(), fos);
			
			fos.flush();

			cache_hash.put(file_only, 1); // register the file as 'done'

		}
		catch (DocumentException de){
			// inform the user about what went wrong
			response.setContentType("text/html");
			PrintWriter writer = response.getWriter();
			writer.println(this.getClass().getName() + " caught an exception: "  
						   + de.getClass().getName() + "<br/> <pre>");
			de.printStackTrace(writer);
			writer.println("</pre>");
		}
		
		finally {
			if (pdfOutStream != null){
				pdfOutStream.close();
			}
			if (fos!=null){
				fos.close();
			}
		}
	}
	
		
	
	
	void addImageToPDF(HttpServletRequest request, HttpServletResponse response, int pn, Document doc)
			throws ServletException {
		/** until now, this is taken from the Scaler-method processRequest and modified ...*/
		
		
		if (dlConfig == null) {
			throw new ServletException("ERROR: No Configuration!");
		}

		accountlog.debug("request: " + request.getQueryString());
		logger.debug("request: " + request.getQueryString());

		// output mime-type
		String mimeType = "image/png";

		/* preset request parameters */

		// scale the image file to fit window size i.e. respect dw,dh
		boolean scaleToFit = true;
		// scale the image by a fixed factor only
		boolean absoluteScale = false;
		// use low resolution images only
		boolean loresOnly = false;
		// use hires images only
		boolean hiresOnly = false;
		// send the image always as a specific type (e.g. JPEG or PNG)
		int forceType = ImageOps.TYPE_AUTO;
		// interpolation to use for scaling
		int scaleQual = defaultQuality;
		// send html error message (or image file)
		boolean errorMsgHtml = false;
		// original (hires) image resolution
		float origResX = 0;
		float origResY = 0;

		/* request parameters */

		DigilibRequest dlRequest = (DigilibRequest) request
				.getAttribute("digilib.servlet.request");

		dlRequest.setValue("pn", pn);
		//dlRequest.setValue("mo", "osize");
		//dlRequest.setValue("ddpix",72);
		//dlRequest.setValue("ddpix",72);
		
		// destination image width
		int paramDW = dlRequest.getAsInt("dw");
		// destination image height
		int paramDH = dlRequest.getAsInt("dh");
		// relative area x_offset (0..1)
		float paramWX = dlRequest.getAsFloat("wx");
		// relative area y_offset
		float paramWY = dlRequest.getAsFloat("wy");
		// relative area width (0..1)
		float paramWW = dlRequest.getAsFloat("ww");
		// relative area height
		float paramWH = dlRequest.getAsFloat("wh");
		// scale factor (additional to dw/width, dh/height)
		float paramWS = dlRequest.getAsFloat("ws");
		// rotation angle
		float paramROT = dlRequest.getAsFloat("rot");
		// contrast enhancement
		float paramCONT = dlRequest.getAsFloat("cont");
		// brightness enhancement
		float paramBRGT = dlRequest.getAsFloat("brgt");
		// color modification
		float[] paramRGBM = null;
		Parameter p = dlRequest.get("rgbm");
		if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
			paramRGBM = p.parseAsFloatArray("/");
		}
		float[] paramRGBA = null;
		p = dlRequest.get("rgba");
		if (p.hasValue() && (!p.getAsString().equals("0/0/0"))) {
			paramRGBA = p.parseAsFloatArray("/");
		}
		// destination resolution (DPI)
		float paramDDPIX = dlRequest.getAsFloat("ddpix");
		float paramDDPIY = dlRequest.getAsFloat("ddpiy");
		if ((paramDDPIX == 0) || (paramDDPIY == 0)) {
			// if X or Y resolution isn't set, use DDPI
			paramDDPIX = dlRequest.getAsFloat("ddpi");
			paramDDPIY = paramDDPIX;
		}
		// absolute scale factor for mo=ascale (and mo=osize)
		float paramSCALE = dlRequest.getAsFloat("scale");

		/*
		 * operation mode: "fit": always fit to page, "clip": send original
		 * resolution cropped, "file": send whole file (if allowed)
		 */
		if (dlRequest.hasOption("mo", "clip")) {
			scaleToFit = false;
			absoluteScale = false;
			hiresOnly = true;
		} else if (dlRequest.hasOption("mo", "fit")) {
			scaleToFit = true;
			absoluteScale = false;
			hiresOnly = false;
		} else if (dlRequest.hasOption("mo", "osize")) {
			scaleToFit = false;
			absoluteScale = true;
			hiresOnly = true;
		} else if (dlRequest.hasOption("mo", "ascale")) {
			scaleToFit = false;
			absoluteScale = true;
			hiresOnly = false;
		}

		// operation mode: "lores": try to use scaled image, "hires": use
		// unscaled image
		// "autores": try best fitting resolution
		if (dlRequest.hasOption("mo", "lores")) {
			loresOnly = true;
			hiresOnly = false;
		} else if (dlRequest.hasOption("mo", "hires")) {
			loresOnly = false;
			hiresOnly = true;
		} else if (dlRequest.hasOption("mo", "autores")) {
			loresOnly = false;
			hiresOnly = false;
		}
		// operation mode: "errtxt": error message in html, "errimg": error
		// image
		if (dlRequest.hasOption("mo", "errtxt")) {
			errorMsgHtml = true;
		} else if (dlRequest.hasOption("mo", "errimg")) {
			errorMsgHtml = false;
		}
		// operation mode: "q0" - "q2": interpolation quality
		if (dlRequest.hasOption("mo", "q0")) {
			scaleQual = 0;
		} else if (dlRequest.hasOption("mo", "q1")) {
			scaleQual = 1;
		} else if (dlRequest.hasOption("mo", "q2")) {
			scaleQual = 2;
		}
		// operation mode: "jpg": always use JPEG
		if (dlRequest.hasOption("mo", "jpg")) {
			forceType = ImageOps.TYPE_JPEG;
		}
		// operation mode: "png": always use PNG
		if (dlRequest.hasOption("mo", "png")) {
			forceType = ImageOps.TYPE_PNG;
		}

		// check with the maximum allowed size (if set)
		int maxImgSize = dlConfig.getAsInt("max-image-size");
		if (maxImgSize > 0) {
			paramDW = (paramDW * paramWS > maxImgSize) ? (int) (maxImgSize / paramWS)
					: paramDW;
			paramDH = (paramDH * paramWS > maxImgSize) ? (int) (maxImgSize / paramWS)
					: paramDH;
		}

		// "big" try for all file/image actions
		try {

			// ImageFileset of the image to load
			ImageFileset fileset = null;

			/* find the file to load/send */

			// get PathInfo
			String loadPathName = dlRequest.getFilePath();

			/* check permissions */
			if (useAuthorization) {
				// get a list of required roles (empty if no restrictions)
				List rolesRequired = authOp.rolesForPath(loadPathName, request);
				if (rolesRequired != null) {
					authlog.debug("Role required: " + rolesRequired);
					authlog.debug("User: " + request.getRemoteUser());
					// is the current request/user authorized?
					if (!authOp.isRoleAuthorized(rolesRequired, request)) {
						// send deny answer and abort
						throw new AuthOpException();
					}
				}
			}

			// find the file
			fileset = (ImageFileset) findFile(dlRequest);
			if (fileset == null) {
				throw new FileOpException("File " + loadPathName + "("
						+ dlRequest.getAsInt("pn") + ") not found.");
			}

			/* for absolute scale and original size we need the hires size */
			ImageSize hiresSize = null;
			if (absoluteScale) {
				ImageFile hiresFile = fileset.getBiggest();
				if (!hiresFile.isChecked()) {
					ImageOps.checkFile(hiresFile);
				}
				hiresSize = hiresFile.getSize();
				
				/* prepare resolution and scale factor for original size */
				if (dlRequest.hasOption("mo", "osize")) {
					// get original resolution from metadata
					fileset.checkMeta();
					origResX = fileset.getResX();
					origResY = fileset.getResY();
					if ((origResX == 0) || (origResY == 0)) {
						throw new ImageOpException("Missing image DPI information!");
					}

					if ((paramDDPIX == 0) || (paramDDPIY == 0)) {
						throw new ImageOpException(
								"Missing display DPI information!");
					}
					// calculate absolute scale factor
					float sx = paramDDPIX / origResX;
					float sy = paramDDPIY / origResY;
					// currently only same scale :-(
					paramSCALE = (sx + sy)/2f;
				}
				
			}
			

			/* calculate expected source image size */
			ImageSize expectedSourceSize = new ImageSize();
			if (scaleToFit) {
				// scale to fit -- calculate minimum source size
				float scale = (1 / Math.min(paramWW, paramWH)) * paramWS;
				expectedSourceSize.setSize((int) (paramDW * scale),
						(int) (paramDH * scale));
			} else if (absoluteScale && dlRequest.hasOption("mo", "ascale")) {
				// absolute scale -- apply scale to hires size
				expectedSourceSize = hiresSize.getScaled(paramSCALE);
			} else {
				// clip to fit -- source = destination size
				expectedSourceSize.setSize((int) (paramDW * paramWS),
						(int) (paramDH * paramWS));
			}

			ImageFile fileToLoad;
			/* select a resolution */
			if (hiresOnly) {
				// get first element (= highest resolution)
				fileToLoad = fileset.getBiggest();
			} else if (loresOnly) {
				// enforced lores uses next smaller resolution
				fileToLoad = fileset.getNextSmaller(expectedSourceSize);
				if (fileToLoad == null) {
					// this is the smallest we have
					fileToLoad = fileset.getSmallest();
				}
			} else {
				// autores: use next higher resolution
				fileToLoad = fileset.getNextBigger(expectedSourceSize);
				if (fileToLoad == null) {
					// this is the highest we have
					fileToLoad = fileset.getBiggest();
				}
			}
			logger.info("Planning to load: " + fileToLoad.getFile());

			/*
			 * send the image if its mo=(raw)file
			 */
			if (dlRequest.hasOption("mo", "file")
					|| dlRequest.hasOption("mo", "rawfile")) {
				if (sendFileAllowed) {
					String mt = null;
					if (dlRequest.hasOption("mo", "rawfile")) {
						mt = "application/octet-stream";
					}
					logger.debug("Sending RAW File as is.");
					ServletOps.sendFile(fileToLoad.getFile(), mt, response);
					return;
				}
			}

			// check the source image
			if (!fileToLoad.isChecked()) {
				ImageOps.checkFile(fileToLoad);
			}
			// get the source image type
			mimeType = fileToLoad.getMimetype();
			// get the source image size
			ImageSize imgSize = fileToLoad.getSize();

			// decide if the image can be sent as is
			boolean mimetypeSendable = mimeType.equals("image/jpeg")
					|| mimeType.equals("image/png")
					|| mimeType.equals("image/gif");
			boolean imagoOptions = dlRequest.hasOption("mo", "hmir")
					|| dlRequest.hasOption("mo", "vmir") || (paramROT != 0)
					|| (paramRGBM != null) || (paramRGBA != null)
					|| (paramCONT != 0) || (paramBRGT != 0);
			boolean imageSendable = mimetypeSendable && !imagoOptions;

			/*
			 * if not autoRes and image smaller than requested size then send as
			 * is. if autoRes and image has requested size then send as is. if
			 * not autoScale and not scaleToFit nor cropToFit then send as is
			 * (mo=file)
			 */
/*			if (imageSendable
					&& ((loresOnly && fileToLoad.getSize().isSmallerThan(
							expectedSourceSize)) || (!(loresOnly || hiresOnly) && fileToLoad
							.getSize().fitsIn(expectedSourceSize)))) {

				logger.debug("Sending File as is.");

				ServletOps.sendFile(fileToLoad.getFile(), null, response);

				logger.info("Done in "
						+ (System.currentTimeMillis() - startTime) + "ms");
				return;
			}
*/
 
			
			/*
			 * stop here if we're overloaded...
			 * 
			 * 503 Service Unavailable 
			 * The server is currently unable to
			 * handle the request due to a temporary overloading or maintenance
			 * of the server. The implication is that this is a temporary
			 * condition which will be alleviated after some delay. If known,
			 * the length of the delay MAY be indicated in a Retry-After header.
			 * If no Retry-After is given, the client SHOULD handle the response
			 * as it would for a 500 response. Note: The existence of the 503
			 * status code does not imply that a server must use it when
			 * becoming overloaded. Some servers may wish to simply refuse the
			 * connection.
			 * (RFC2616 HTTP1.1)
			 */
			if (! DigilibWorker.canRun()) {
				logger.error("Servlet overloaded!");
				response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
				return;
			}
			
			// set missing dw or dh from aspect ratio
			float imgAspect = fileToLoad.getAspect();
			if (paramDW == 0) {
				paramDW = (int) Math.round(paramDH * imgAspect);
			} else if (paramDH == 0) {
				paramDH = (int) Math.round(paramDW / imgAspect);
			}

			/* crop and scale the image */

			logger.debug("IMG: " + imgSize.getWidth() + "x"
					+ imgSize.getHeight());

			// coordinates and scaling
			float areaWidth;
			float areaHeight;
			float scaleX;
			float scaleY;
			float scaleXY;

			// coordinates using Java2D
			// image size in pixels
			Rectangle2D imgBounds = new Rectangle2D.Float(0, 0, imgSize
					.getWidth(), imgSize.getHeight());
			// user window area in [0,1] coordinates
			Rectangle2D relUserArea = new Rectangle2D.Float(paramWX, paramWY,
					paramWW, paramWH);
			// transform from relative [0,1] to image coordinates.
			AffineTransform imgTrafo = AffineTransform.getScaleInstance(imgSize
					.getWidth(), imgSize.getHeight());
			// transform user coordinate area to image coordinate area
			Rectangle2D userImgArea = imgTrafo.createTransformedShape(
					relUserArea).getBounds2D();

			// calculate scaling factors based on inner user area
			if (scaleToFit) {
				areaWidth = (float) userImgArea.getWidth();
				areaHeight = (float) userImgArea.getHeight();
				scaleX = paramDW / areaWidth * paramWS;
				scaleY = paramDH / areaHeight * paramWS;
				scaleXY = (scaleX > scaleY) ? scaleY : scaleX;
			} else if (absoluteScale) {
				scaleXY = paramSCALE;
				// we need to correct the factor if we use a pre-scaled image
				if (imgSize.getWidth() != hiresSize.getWidth()) {
					scaleXY *= (float)hiresSize.getWidth() / (float)imgSize.getWidth();
				}
				scaleX = scaleXY;
				scaleY = scaleXY;
				areaWidth = paramDW / scaleXY * paramWS;
				areaHeight = paramDH / scaleXY * paramWS;
				// reset user area size
				userImgArea.setRect(userImgArea.getX(), userImgArea.getY(),
						areaWidth, areaHeight);
			} else {
				// crop to fit
				areaWidth = paramDW * paramWS;
				areaHeight = paramDH * paramWS;
				// reset user area size
				userImgArea.setRect(userImgArea.getX(), userImgArea.getY(),
						areaWidth, areaHeight);
				scaleX = 1f;
				scaleY = 1f;
				scaleXY = 1f;
			}

			// enlarge image area for rotations to cover additional pixels
			Rectangle2D outerUserImgArea = userImgArea;
			Rectangle2D innerUserImgArea = userImgArea;
			if (wholeRotArea) {
				if (paramROT != 0) {
					try {
						// rotate user area coordinates around center of user
						// area
						AffineTransform rotTrafo = AffineTransform
								.getRotateInstance(Math.toRadians(paramROT),
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

			logger.debug("Scale " + scaleXY + "(" + scaleX + "," + scaleY
					+ ") on " + outerUserImgArea);

			// clip area at the image border
			outerUserImgArea = outerUserImgArea.createIntersection(imgBounds);

			// check image parameters sanity
			if ((outerUserImgArea.getWidth() < 1)
					|| (outerUserImgArea.getHeight() < 1)
					|| (scaleXY * outerUserImgArea.getWidth() < 2)
					|| (scaleXY * outerUserImgArea.getHeight() < 2)) {
				logger.error("ERROR: invalid scale parameter set!");
				throw new ImageOpException("Invalid scale parameter set!");
			}

			/*
			 * submit the image worker job
			 */

			DigilibPDFWorker job = new DigilibPDFWorker(dlConfig, response,
					mimeType, scaleQual, dlRequest, paramCONT,
					paramBRGT, paramRGBM, paramRGBA, fileToLoad, scaleXY,
					outerUserImgArea, innerUserImgArea, minSubsample,
					wholeRotArea, forceType, doc);

			job.run();
			if (job.hasError()) {
				throw new ImageOpException(job.getError().toString());
			}

			/* error handling */

		} // end of "big" try
		catch (IOException e) {
			logger.error("ERROR: File IO Error: " + e);
			digilibError(errorMsgHtml, ERROR_FILE,
					"ERROR: File IO Error: " + e, response);
		} catch (AuthOpException e) {
			logger.error("ERROR: Authorization error: " + e);
			digilibError(errorMsgHtml, ERROR_AUTH,
					"ERROR: Authorization error: " + e, response);
		} catch (ImageOpException e) {
			logger.error("ERROR: Image Error: " + e);
			digilibError(errorMsgHtml, ERROR_IMAGE,
					"ERROR: Image Operation Error: " + e, response);
		} catch (RuntimeException e) {
			// JAI likes to throw RuntimeExceptions ;-(
			logger.error("ERROR: Other Image Error: " + e);
			digilibError(errorMsgHtml, ERROR_IMAGE,
					"ERROR: Other Image Operation Error: " + e, response);
		}
	}

	/**
	 * Returns the DocuDirent corresponding to the DigilibRequest.
	 * 
	 * @param dlRequest
	 * @return
	 */
	public DocuDirent findFile(DigilibRequest dlRequest) {
		// find the file(set)
		DocuDirent f = dirCache.getFile(dlRequest.getFilePath(), dlRequest
				.getAsInt("pn"), FileOps.CLASS_IMAGE);
		return f;
	}

	/**
	 * Sends an error to the client as text or image.
	 * 
	 * @param asHTML
	 * @param type
	 * @param msg
	 * @param response
	 */
	public void digilibError(boolean asHTML, int type, String msg,
			HttpServletResponse response) {
		try {
			File img = null;
			if (type == ERROR_AUTH) {
				if (msg == null) {
					msg = "ERROR: Unauthorized access!";
				}
				img = denyImgFile;
			} else if (type == ERROR_FILE) {
				if (msg == null) {
					msg = "ERROR: Image file not found!";
				}
				img = notfoundImgFile;
			} else {
				if (msg == null) {
					msg = "ERROR: Other image error!";
				}
				img = this.errorImgFile;
			}
			if (asHTML && (img != null)) {
				ServletOps.htmlMessage(msg, response);
			} else {
				ServletOps.sendFile(img, null, response);
			}
		} catch (IOException e) {
			logger.error("Error sending error!", e);
		}

	}

	/**
	 * @return the dlVersion
	 */
	public static String getVersion() {
		return dlVersion;
	}

	
	protected BufferedOutputStream generatePDFcontent(HttpServletRequest request, HttpServletResponse response, 
																	ServletContext servletcontext, OutputStream out)
	 	throws DocumentException {
		
		/** This method sets up a document and calls the addImage method to add all the images */
		Document doc = new Document(PageSize.A4,0,0,0,0);
		BufferedOutputStream outstream = new BufferedOutputStream(out);

		PdfWriter docwriter = null;


		try{

			docwriter = PdfWriter.getInstance(doc, outstream);

	
			doc.addAuthor(this.getClass().getName());
			doc.addCreationDate();
			doc.addKeywords("digilib");
			doc.addTitle("digilib PDF");
			doc.addCreator(this.getClass().getName());
			
			doc.open();
		
			
			// get width and height from the request
/*			float docW = PageSize.A4.getWidth() - 2*PageSize.A4.getBorder(); 
			float docH= PageSize.A4.getHeight()- 2*PageSize.A4.getBorder();
*/
			
			// evaluate the pgs parameter (which pages go into the pdf)
			String pages    = request.getParameter("pgs");
			ArrayList<Integer> pgs=new ArrayList<Integer>(); // a list of the requested page numbers
			String intervals[] = pages.split(",");
		
			// convert the page-interval-strings into a list containing every single page
			for(String interval: intervals){
				if(interval.indexOf("-") > -1){
					String nums[] = interval.split("-");
					
					for(int i=Integer.valueOf(nums[0]); i <= Integer.valueOf(nums[1]); i++){
						pgs.add(i);
					}
				}
				else{
					pgs.add(Integer.valueOf(interval));
				}
			}

	

		
			// add all the images/pages to the pdf
			for(int i=0; i<pgs.size(); i++){
				int pn=pgs.get(i);
				this.addImageToPDF(request, response, pn, doc);
			}
		
	
	
		}
		catch (Exception de) {
			logger.debug(de.getMessage());
		} 
		finally{
			if (doc!=null){
				doc.close();
			}
			if (docwriter!=null){
				docwriter.close();
			}
		}
		return outstream;
	}


	public void run() {
		if(mpdf_request!=null && mpdf_response!=null && mpdf_filename!=""){
			try {
				createPDFfile(mpdf_request, mpdf_response, mpdf_filename);
			} catch (ServletException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
	}
}