package digilib.servlet;

import java.awt.Image;
import java.awt.geom.Rectangle2D;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.auth.AuthOpException;
import digilib.auth.AuthOps;
import digilib.image.ImageOpException;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.DocuDirent;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageFile;
import digilib.io.ImageFileset;


// TODO digilibError is not used anymore and may need to get reintegrated

public class Scaler extends RequestHandler {

	/** digilib servlet version (for all components) */
	public static final String dlVersion = "1.7.0b";

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

	// EXPRIMENTAL
	/** try to enlarge cropping area for "oblique" angles */
	boolean wholeRotArea = false;

	
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
	 * Initialisation on first run.
	 * @throws ServletException 
	 * 
	 * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
	 */
	public void init(ServletConfig config) throws ServletException {
		super.init(config);

		System.out
				.println("***** Digital Image Library Image Scaler Servlet (version "
						+ dlVersion + ") *****");
		// say hello in the log file
		logger
				.info("***** Digital Image Library Image Scaler Servlet (version "
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
	}

	
	
	
	@Override
	public void processRequest(HttpServletRequest request,
			HttpServletResponse response) throws ServletException, ImageOpException {

		
		if (dlConfig == null) {
			throw new ServletException("ERROR: No Configuration!");
		}
		
		accountlog.debug("request: " + request.getQueryString());
		logger.debug("request: " + request.getQueryString());
		

		// define the job information
		ImageJobInformation jobdeclaration = new ImageJobInformation(dlConfig);
		jobdeclaration.setWithRequest(request);
	
		ImageFile fileToLoad = null;
		try {
			fileToLoad = jobdeclaration.get_fileToLoad();
		} catch (IOException e2) {
			// TODO Auto-generated catch block
			e2.printStackTrace();
			return;
		}
		
		
		// if requested, send image as a file
		if(sendFileAllowed && jobdeclaration.checkSendAsFile()){
			String mt = null;
			if (jobdeclaration.hasOption("mo", "rawfile")) {
				mt = "application/octet-stream";
			}
			logger.debug("Sending RAW File as is.");
			try {
				ServletOps.sendFile(fileToLoad.getFile(), mt, response);
			} catch (FileOpException e) {
				e.printStackTrace();
			}

			return;
		}

		
		
		// if possible, send the image without actually having to transform it
		if(jobdeclaration.noTransformRequired()){
			logger.debug("Sending File as is.");

			try {
				ServletOps.sendFile(fileToLoad.getFile(), null, response);
			} catch (FileOpException e) {
				e.printStackTrace();
			}

			//logger.info("Done in "
			//		+ (System.currentTimeMillis() - startTime) + "ms");
			return;
		}
		

		
		
		OutputStream outputstream = null;
		try {
			outputstream =  response.getOutputStream();
		} catch (IOException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
			logger.error(e1.getMessage());
		}
		
		if (! DigilibWorker.canRun()) {
			logger.error("Servlet overloaded!");
			try {
				response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
			} catch (IOException e) {
				e.printStackTrace();
			}
			return;
		}

		
		DigilibWorker job=null;
		try {
			
			long startTime = System.currentTimeMillis();

			/* check permissions */
			if (useAuthorization) {
				// get a list of required roles (empty if no restrictions)
				List rolesRequired;
				try {
					rolesRequired = authOp.rolesForPath(jobdeclaration.getFilePath(), request);
					if (rolesRequired != null) {
						authlog.debug("Role required: " + rolesRequired);
						authlog.debug("User: " + request.getRemoteUser());
						// is the current request/user authorized?
						if (!authOp.isRoleAuthorized(rolesRequired, request)) {
							// send deny answer and abort
							throw new AuthOpException();
						}
					}

				} catch (AuthOpException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
			}

			
			job = new DigilibImageWorker(dlConfig, outputstream , jobdeclaration);

			job.run();

			
			if (job.hasError()) {
				throw new ImageOpException(job.getError().toString());
			}

			try {
				outputstream.flush();
				logger.debug("Job Processing Time: "+ (System.currentTimeMillis()-startTime) + "ms");
			} catch (IOException e) {
				e.printStackTrace();
				logger.error(e.getMessage());
				response.sendError(1);
			}

			
		} catch (IOException e) {
			e.printStackTrace();
			logger.error(e.getClass()+": "+ e.getMessage());
			//response.sendError(1);
		} catch (ImageOpException e) {
			e.printStackTrace();
			logger.error(e.getClass()+": "+ e.getMessage());
			//response.sendError(1);
		}

		
	/*	boolean errorMsgHtml = false;
		
		if(jobdeclaration.hasOption("mo","errtxt")){
			errorMsgHtml = true;
		} else if (jobdeclaration.hasOption("mo","errimg")) {
			errorMsgHtml = true;
		} */
		
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

	public static String getVersion(){
		return dlVersion;
	}
	

}
