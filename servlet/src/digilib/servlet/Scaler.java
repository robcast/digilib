/* Scaler -- Scaler servlet main class

  Digital Image Library servlet components

  Copyright (C) 2001, 2002, 2003 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

*/

package digilib.servlet;

import java.awt.geom.AffineTransform;
import java.awt.geom.NoninvertibleTransformException;
import java.awt.geom.Rectangle2D;
import java.io.File;
import java.io.IOException;
import java.util.List;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import digilib.Utils;
import digilib.auth.AuthOpException;
import digilib.auth.AuthOps;
import digilib.image.DocuImage;
import digilib.image.DocuInfo;
import digilib.image.ImageLoaderImageInfoDocuInfo;
import digilib.image.ImageOpException;
import digilib.image.ImageSize;
import digilib.io.DocuDirCache;
import digilib.io.ImageFile;
import digilib.io.ImageFileset;
import digilib.io.FileOpException;
import digilib.io.FileOps;

//import tilecachetool.*;

/**
 * @author casties */
//public class Scaler extends HttpServlet implements SingleThreadModel {
public class Scaler extends HttpServlet {

	// digilib servlet version (for all components)
	public static final String dlVersion = "1.17b2";

	// Utils instance with debuglevel
	Utils util;
	// FileOps instance
	FileOps fileOp;
	// AuthOps instance
	AuthOps authOp;
	// ServletOps instance
	ServletOps servletOp;
	// DocuDirCache instance
	DocuDirCache dirCache;

	// deny image file
	File denyImgFile;
	// error image file
	File errorImgFile;
	// subsampling before scaling
	float minSubsample = 2f;
	// send files as is?
	boolean sendFileAllowed = true;
	// default scaling quality
	int defaultQuality = 1;

	// DigilibConfiguration instance
	DigilibConfiguration dlConfig;

	// use authorization database
	boolean useAuthentication = true;

	// EXPRIMENTAL
	// try to enlarge cropping area for "oblique" angles
	boolean wholeRotArea = false;

	/**
	 * Initialisation on first run.
	 * 
	 * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
	 */
	public void init(ServletConfig config) throws ServletException {
		super.init(config);

		// Debuggin!
		//TCTool tctool = new TCTool();

		System.out.println(
			"***** Digital Image Library Servlet (version "
				+ dlVersion
				+ ") *****");

		// get our ServletContext
		ServletContext context = config.getServletContext();
		// see if there is a Configuration instance
		dlConfig =
			(DigilibConfiguration) context.getAttribute(
				"digilib.servlet.configuration");
		if (dlConfig == null) {
			// create new Configuration
			try {
				dlConfig = new DigilibConfiguration(config);
				context.setAttribute("digilib.servlet.configuration", dlConfig);
			} catch (Exception e) {
				throw new ServletException(e);
			}
		}
		// first we need an Utils
		util = dlConfig.getUtil();
		// set our AuthOps
		useAuthentication = dlConfig.getAsBoolean("use-authorization");
		authOp = (AuthOps) dlConfig.getValue("servlet.auth.op");
		// FileOps instance
		fileOp = new FileOps(util);
		// AuthOps instance
		servletOp = new ServletOps(util);
		// DocuDirCache instance
		dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
		denyImgFile = new File(dlConfig.getAsString("denied-image"));
		errorImgFile = new File(dlConfig.getAsString("error-image"));
		sendFileAllowed = dlConfig.getAsBoolean("sendfile-allowed");
		minSubsample = dlConfig.getAsFloat("subsample-minimum");
		defaultQuality = dlConfig.getAsInt("default-quality");
	}

	/** Process the HTTP Get request*/
	public void doGet(HttpServletRequest request, HttpServletResponse response)
		throws ServletException, IOException {
		util.dprintln(1, "The servlet has received a GET!");
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// add DigilibRequest to ServletRequest
		request.setAttribute("digilib.servlet.request", dlReq);
		// do the processing
		processRequest(request, response);
	}

	/**Process the HTTP Post request*/
	public void doPost(
		HttpServletRequest request,
		HttpServletResponse response)
		throws ServletException, IOException {
		util.dprintln(1, "The servlet has received a POST!");
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// add DigilibRequest to ServletRequest
		request.setAttribute("digilib.servlet.request", dlReq);
		// do the processing
		processRequest(request, response);
	}

	/** main request handler. */
	void processRequest(
		HttpServletRequest request,
		HttpServletResponse response)
		throws ServletException, IOException {

		// time for benchmarking
		long startTime = System.currentTimeMillis();
		// output mime/type
		String mimeType = "image/png";

		/* parameters for a session */

		// scale the image file to fit window size i.e. respect dw,dh
		boolean scaleToFit = true;
		// scale the image by a fixed factor only
		boolean absoluteScale = false;
		// only crop the image to fit
		boolean cropToFit = false;
		// send the file as is
		boolean sendFile = false;
		// use low resolution images only
		boolean loresOnly = false;
		// use hires images only
		boolean hiresOnly = false;
		// interpolation to use for scaling
		int scaleQual = defaultQuality;
		// send html error message (or image file)
		boolean errorMsgHtml = false;
		// mirror the image
		boolean doMirror = false;
		// angle of mirror axis
		double mirrorAngle = 0;
		// original (hires) image resolution
		double origResX = 0;
		double origResY = 0;

		/* request parameters */

		DigilibRequest dlRequest =
			(DigilibRequest) request.getAttribute("digilib.servlet.request");

		// destination image width
		int paramDW = dlRequest.getAsInt("dw");
		// destination image height
		int paramDH = dlRequest.getAsInt("dh");
		// relative area x_offset (0..1)
		double paramWX = dlRequest.getAsFloat("wx");
		// relative area y_offset
		double paramWY = dlRequest.getAsFloat("wy");
		// relative area width (0..1)
		double paramWW = dlRequest.getAsFloat("ww");
		// relative area height
		double paramWH = dlRequest.getAsFloat("wh");
		// scale factor (additional to dw/width, dh/height)
		double paramWS = dlRequest.getAsFloat("ws");
		// rotation angle
		double paramROT = dlRequest.getAsFloat("rot");
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

		/*
		 * operation mode: "fit": always fit to page, "clip": send original
		 * resolution cropped, "file": send whole file (if allowed)
		 */
		if (dlRequest.hasOption("mo", "clip")) {
			scaleToFit = false;
			absoluteScale = false;
			cropToFit = true;
			sendFile = false;
			hiresOnly = true;
		} else if (dlRequest.hasOption("mo", "fit")) {
			scaleToFit = true;
			absoluteScale = false;
			cropToFit = false;
			sendFile = false;
			hiresOnly = false;
		} else if (dlRequest.hasOption("mo", "osize")) {
			scaleToFit = false;
			absoluteScale = true;
			cropToFit = false;
			sendFile = false;
			hiresOnly = true;
		} else if (dlRequest.hasOption("mo", "file")) {
			scaleToFit = false;
			absoluteScale = false;
			if (sendFileAllowed) {
				cropToFit = false;
				sendFile = true;
			} else {
				// crop to fit if send file not allowed
				cropToFit = true;
				sendFile = false;
			}
			hiresOnly = true;
		}
		// operation mode: "lores": try to use scaled image, "hires": use
		// unscaled image
		//   "autores": try best fitting resolution
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

		//"big" try for all file/image actions
		try {

			// ImageFileset of the image to load
			ImageFileset fileset = null;

			// new DocuInfo instance
			DocuInfo docuInfo = new ImageLoaderImageInfoDocuInfo();

			/* find the file to load/send */

			// get PathInfo
			String loadPathName = dlRequest.getFilePath();

			/* check permissions */
			if (useAuthentication) {
				// get a list of required roles (empty if no restrictions)
				List rolesRequired = authOp.rolesForPath(loadPathName, request);
				if (rolesRequired != null) {
					util.dprintln(1, "Role required: " + rolesRequired);
					util.dprintln(2, "User: " + request.getRemoteUser());
					// is the current request/user authorized?
					if (!authOp.isRoleAuthorized(rolesRequired, request)) {
						// send deny answer and abort
						util.dprintln(1, "ERROR: access denied!");
						if (errorMsgHtml) {
							ServletOps.htmlMessage(
								"ERROR: Unauthorized access!",
								response);
						} else {
							servletOp.sendFile(denyImgFile, response);
						}
						return;
					}
				}
			}

			// find the file(set)
			ImageFile fileToLoad;
			fileset =
				(ImageFileset) dirCache.getFile(
					loadPathName,
					dlRequest.getAsInt("pn"),
					FileOps.CLASS_IMAGE);
			if (fileset == null) {
				throw new FileOpException(
					"File "
						+ loadPathName
						+ "("
						+ dlRequest.getAsInt("pn")
						+ ") not found.");
			}
			
			/* calculate expected source image size */
			ImageSize expectedSourceSize = new ImageSize();
			if (scaleToFit) {
				double scale = (1 / Math.min(paramWW, paramWH)) * paramWS;
				expectedSourceSize.setSize(
					(int) (paramDW * scale),
					(int) (paramDH * scale));
			} else {
				expectedSourceSize.setSize(
					(int) (paramDW * paramWS),
					(int) (paramDH * paramWS));
			}

			/* select a resolution */
			if (hiresOnly) {
				// get first element (= highest resolution)
				fileToLoad = fileset.getBiggest();
			} else if (loresOnly) {
				// enforced lores uses next smaller resolution
				fileToLoad =
					fileset.getNextSmaller(expectedSourceSize, docuInfo);
				if (fileToLoad == null) {
					// this is the smallest we have
					fileToLoad = fileset.getSmallest();
				}
			} else {
				// autores: use next higher resolution
				fileToLoad =
					fileset.getNextBigger(expectedSourceSize, docuInfo);
				if (fileToLoad == null) {
					// this is the highest we have
					fileToLoad = fileset.getBiggest();
				}
			}
			util.dprintln(1, "Loading: " + fileToLoad.getFile());

			if (absoluteScale) {
				// get original resolution from metadata
				fileset.checkMeta();
				origResX = fileset.getResX();
				origResY = fileset.getResY();
				if ((origResX == 0) || (origResY == 0)) {
					throw new ImageOpException("Missing image DPI information!");
				}

				if ((paramDDPIX == 0) || (paramDDPIY == 0)) {
					throw new ImageOpException("Missing display DPI information!");
				}
			}

			// check the source image
			if (!fileToLoad.isChecked()) {
				docuInfo.checkFile(fileToLoad);
			}
			// get the source image type
			mimeType = fileToLoad.getMimetype();
			// get the source image size
			ImageSize imgSize = fileToLoad.getSize();

			// decide if the image can be sent as is
			boolean mimetypeSendable =
				mimeType.equals("image/jpeg")
					|| mimeType.equals("image/png")
					|| mimeType.equals("image/gif");
			boolean imagoOptions =
				dlRequest.hasOption("mo", "hmir")
					|| dlRequest.hasOption("mo", "vmir")
					|| (paramROT != 0)
					|| (paramRGBM != null)
					|| (paramRGBA != null)
					|| (paramCONT != 0)
					|| (paramBRGT != 0);
			boolean imageSendable = mimetypeSendable && !imagoOptions;

			/*
			 * if not autoRes and image smaller than requested size then send
			 * as is. if autoRes and image has requested size then send as is.
			 * if not autoScale and not scaleToFit nor cropToFit then send as
			 * is (mo=file)
			 */
			if ((loresOnly
				&& imageSendable
				&& fileToLoad.getSize().isSmallerThan(expectedSourceSize))
				|| (!(loresOnly || hiresOnly)
					&& fileToLoad.getSize().fitsIn(expectedSourceSize))
				|| sendFile) {

				util.dprintln(1, "Sending File as is.");

				servletOp.sendFile(fileToLoad.getFile(), response);

				util.dprintln(
					1,
					"Done in "
						+ (System.currentTimeMillis() - startTime)
						+ "ms");
				return;
			}

			// new DocuImage instance
			DocuImage docuImage = dlConfig.getDocuImageInstance();
			if (docuImage == null) {
				throw new ImageOpException("Unable to load DocuImage class!");
			}

			// set interpolation quality
			docuImage.setQuality(scaleQual);
			
			// set missing dw or dh from aspect ratio
			double imgAspect = fileToLoad.getAspect();
			if (paramDW == 0) {
				paramDW = (int) Math.round(paramDH * imgAspect);
			} else if (paramDH == 0) {
				paramDH = (int) Math.round(paramDW / imgAspect);
			}

			/* crop and scale the image */

			util.dprintln(
				2,
				"IMG: " + imgSize.getWidth() + "x" + imgSize.getHeight());
			util.dprintln(
				2,
				"time " + (System.currentTimeMillis() - startTime) + "ms");

			// coordinates and scaling
			double areaXoff;
			double areaYoff;
			double areaWidth;
			double areaHeight;
			double scaleX;
			double scaleY;
			double scaleXY;

			// coordinates using Java2D
			// image size in pixels
			Rectangle2D imgBounds =
				new Rectangle2D.Double(
					0,
					0,
					imgSize.getWidth(),
					imgSize.getHeight());
			// user window area in [0,1] coordinates
			Rectangle2D relUserArea =
				new Rectangle2D.Double(paramWX, paramWY, paramWW, paramWH);
			// transform from relative [0,1] to image coordinates.
			AffineTransform imgTrafo =
				AffineTransform.getScaleInstance(
					imgSize.getWidth(),
					imgSize.getHeight());
			// transform user coordinate area to image coordinate area
			Rectangle2D userImgArea =
				imgTrafo.createTransformedShape(relUserArea).getBounds2D();

			// calculate scaling factors based on inner user area
			if (scaleToFit) {
				areaWidth = userImgArea.getWidth();
				areaHeight = userImgArea.getHeight();
				scaleX = paramDW / areaWidth * paramWS;
				scaleY = paramDH / areaHeight * paramWS;
				scaleXY = (scaleX > scaleY) ? scaleY : scaleX;
			} else if (absoluteScale) {
				// absolute scale
				scaleX = paramDDPIX / origResX;
				scaleY = paramDDPIY / origResY;
				// currently only same scale :-(
				scaleXY = scaleX;
				areaWidth = paramDW / scaleXY * paramWS;
				areaHeight = paramDH / scaleXY * paramWS;
				// reset user area size
				userImgArea.setRect(
					userImgArea.getX(),
					userImgArea.getY(),
					areaWidth,
					areaHeight);
			} else {
				// crop to fit
				areaWidth = paramDW * paramWS;
				areaHeight = paramDH * paramWS;
				// reset user area size
				userImgArea.setRect(
					userImgArea.getX(),
					userImgArea.getY(),
					areaWidth,
					areaHeight);
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
						AffineTransform rotTrafo =
							AffineTransform.getRotateInstance(
								Math.toRadians(paramROT),
								userImgArea.getCenterX(),
								userImgArea.getCenterY());
						// get bounds from rotated end position
						innerUserImgArea =
							rotTrafo
								.createTransformedShape(userImgArea)
								.getBounds2D();
						// get bounds from back-rotated bounds
						outerUserImgArea =
							rotTrafo
								.createInverse()
								.createTransformedShape(innerUserImgArea)
								.getBounds2D();
					} catch (NoninvertibleTransformException e1) {
						// this shouldn't happen anyway
						e1.printStackTrace();
					}
				}
			}

			util.dprintln(
				1,
				"Scale "
					+ scaleXY
					+ "("
					+ scaleX
					+ ","
					+ scaleY
					+ ") on "
					+ outerUserImgArea);

			// clip area at the image border
			outerUserImgArea = outerUserImgArea.createIntersection(imgBounds);

			areaWidth = outerUserImgArea.getWidth();
			areaHeight = outerUserImgArea.getHeight();
			areaXoff = outerUserImgArea.getX();
			areaYoff = outerUserImgArea.getY();

			util.dprintln(
				2,
				"crop: "
					+ areaXoff
					+ ","
					+ areaYoff
					+ " "
					+ areaWidth
					+ "x"
					+ areaHeight);

			// check image parameters sanity
			if ((areaWidth < 1)
				|| (areaHeight < 1)
				|| (scaleXY * areaWidth < 2)
				|| (scaleXY * areaHeight < 2)) {
				util.dprintln(1, "ERROR: invalid scale parameter set!");
				throw new ImageOpException("Invalid scale parameter set!");
			}

			/* crop and scale image */

			// use subimage loading if possible
			if (docuImage.isSubimageSupported()) {
				System.out.println(
					"Subimage: scale " + scaleXY + " = " + (1 / scaleXY));
				double subf = 1d;
				double subsamp = 1d;
				if (scaleXY < 1) {
					subf = 1 / scaleXY;
					// for higher quality reduce subsample factor by
					// minSubsample
					if (scaleQual > 0) {
						subsamp = Math.max(Math.floor(subf / minSubsample), 1d);
					} else {
						subsamp = Math.floor(subf);
					}
					scaleXY = subsamp / subf;
					System.out.println(
						"Using subsampling: " + subsamp + " rest " + scaleXY);
				}

				docuImage.loadSubimage(
					fileToLoad,
					outerUserImgArea.getBounds(),
					(int) subsamp);

				System.out.println(
					"SUBSAMP: "
						+ subsamp
						+ " -> "
						+ docuImage.getWidth()
						+ "x"
						+ docuImage.getHeight());

				docuImage.scale(scaleXY, scaleXY);

			} else {
				// else load and crop the whole file
				docuImage.loadImage(fileToLoad);
				docuImage.crop(
					(int) areaXoff,
					(int) areaYoff,
					(int) areaWidth,
					(int) areaHeight);

				docuImage.scale(scaleXY, scaleXY);
			}

			// mirror image
			// operation mode: "hmir": mirror horizontally, "vmir": mirror
			// vertically
			if (dlRequest.hasOption("mo", "hmir")) {
				docuImage.mirror(0);
			}
			if (dlRequest.hasOption("mo", "vmir")) {
				docuImage.mirror(90);
			}

			// rotate image
			if (paramROT != 0d) {
				docuImage.rotate(paramROT);
				if (wholeRotArea) {
					// crop to the inner bounding box
					double xcrop =
						docuImage.getWidth()
							- innerUserImgArea.getWidth() * scaleXY;
					double ycrop =
						docuImage.getHeight()
							- innerUserImgArea.getHeight() * scaleXY;
					if ((xcrop > 0) || (ycrop > 0)) {
						// only crop smaller
						xcrop = (xcrop > 0) ? xcrop : 0;
						ycrop = (ycrop > 0) ? ycrop : 0;
						// crop image
						docuImage.crop(
							(int) (xcrop / 2),
							(int) (ycrop / 2),
							(int) (docuImage.getWidth() - xcrop),
							(int) (docuImage.getHeight() - ycrop));
					}
				}

			}

			// color modification
			if ((paramRGBM != null) || (paramRGBA != null)) {
				// make shure we actually have two arrays
				if (paramRGBM == null) {
					paramRGBM = new float[3];
				}
				if (paramRGBA == null) {
					paramRGBA = new float[3];
				}
				// calculate "contrast" values (c=2^x)
				float[] mult = new float[3];
				for (int i = 0; i < 3; i++) {
					mult[i] = (float) Math.pow(2, (double) paramRGBM[i]);
				}
				docuImage.enhanceRGB(mult, paramRGBA);
			}

			// contrast and brightness enhancement
			if ((paramCONT != 0f) || (paramBRGT != 0f)) {
				double mult = Math.pow(2, paramCONT);
				docuImage.enhance((float) mult, (float) paramBRGT);
			}

			util.dprintln(
				2,
				"time " + (System.currentTimeMillis() - startTime) + "ms");

			/* write the resulting image */

			// setup output -- if source is JPG then dest will be JPG else it's
			// PNG
			if (mimeType.equals("image/jpeg")
				|| mimeType.equals("image/jp2")) {
				mimeType = "image/jpeg";
			} else {
				mimeType = "image/png";
			}
			response.setContentType(mimeType);

			// write the image
			docuImage.writeImage(mimeType, response.getOutputStream());

			util.dprintln(
				1,
				"Done in " + (System.currentTimeMillis() - startTime) + "ms");

			/* error handling */

		} // end of "big" try
		catch (IOException e) {
			util.dprintln(1, "ERROR: File IO Error: " + e);
			try {
				if (errorMsgHtml) {
					ServletOps.htmlMessage(
						"ERROR: File IO Error: " + e,
						response);
				} else {
					servletOp.sendFile(errorImgFile, response);
				}
			} catch (FileOpException ex) {
			} // so we don't get a loop
		} catch (AuthOpException e) {
			util.dprintln(1, "ERROR: Authorization error: " + e);
			try {
				if (errorMsgHtml) {
					ServletOps.htmlMessage(
						"ERROR: Authorization error: " + e,
						response);
				} else {
					servletOp.sendFile(errorImgFile, response);
				}
			} catch (FileOpException ex) {
			} // so we don't get a loop
		} catch (ImageOpException e) {
			util.dprintln(1, "ERROR: Image Error: " + e);
			try {
				if (errorMsgHtml) {
					ServletOps.htmlMessage(
						"ERROR: Image Operation Error: " + e,
						response);
				} else {
					servletOp.sendFile(errorImgFile, response);
				}
			} catch (FileOpException ex) {
			} // so we don't get a loop
		} catch (RuntimeException e) {
			// JAI likes to throw RuntimeExceptions ;-(
			util.dprintln(1, "ERROR: Other Image Error: " + e);
			try {
				if (errorMsgHtml) {
					ServletOps.htmlMessage(
						"ERROR: Other Image Operation Error: " + e,
						response);
				} else {
					servletOp.sendFile(errorImgFile, response);
				}
			} catch (FileOpException ex) {
			} // so we don't get a loop

		}
	}

} //Scaler class
