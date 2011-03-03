package digilib.servlet;

import java.io.File;
import java.io.IOException;
import java.util.List;

import javax.servlet.AsyncContext;
import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.auth.AuthOpException;
import digilib.auth.AuthOps;
import digilib.image.DocuImage;
import digilib.image.ImageJobDescription;
import digilib.image.ImageOpException;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.ImageInput;
import digilib.util.DigilibJobCenter;

@WebServlet(name="Scaler", urlPatterns={"/Scaler", "/servlet/Scaler/*"}, asyncSupported=true)
public class Scaler extends HttpServlet {

    private static final long serialVersionUID = 5289386646192471549L;

    /** digilib servlet version (for all components) */
    public static final String version = "1.9.1a17";

    /** servlet error codes */
    public static enum Error {UNKNOWN, AUTH, FILE, IMAGE};
    
    /** type of error message */
    public static enum ErrMsg {IMAGE, TEXT, CODE};
    
    /** logger for accounting requests */
    protected static Logger accountlog = Logger.getLogger("account.request");

    /** gengeral logger for this class */
    protected static Logger logger = Logger.getLogger("digilib.scaler");

    /** logger for authentication related */
    protected static Logger authlog = Logger.getLogger("digilib.auth");

    /** DocuDirCache instance */
    protected DocuDirCache dirCache;

    /** Image executor */
    protected DigilibJobCenter<DocuImage> imageJobCenter;

    /** authentication error image file */
    public static File denyImgFile;

    /** image error image file */
    public static File errorImgFile;

    /** not found error image file */
    public static File notfoundImgFile;

    /** send files as is? */
    protected boolean sendFileAllowed = true;

    /** DigilibConfiguration instance */
    protected DigilibConfiguration dlConfig;

    /** use authorization database */
    protected boolean useAuthorization = true;

    /** AuthOps instance */
    protected AuthOps authOp;

    /**
     * Initialisation on first run.
     * 
     * @throws ServletException
     * 
     * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
     */
    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        System.out
                .println("***** Digital Image Library Image Scaler Servlet (version "
                        + version + ") *****");
        // say hello in the log file
        logger.info("***** Digital Image Library Image Scaler Servlet (version "
                + version + ") *****");

        // get our ServletContext
        ServletContext context = config.getServletContext();
        // see if there is a Configuration instance
        dlConfig = (DigilibConfiguration) context.getAttribute("digilib.servlet.configuration");
        if (dlConfig == null) {
            // no Configuration
            throw new ServletException("No Configuration!");
        }
        // set our AuthOps
        useAuthorization = dlConfig.getAsBoolean("use-authorization");
        authOp = (AuthOps) dlConfig.getValue("servlet.auth.op");

        // DocuDirCache instance
        dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");

        // Executor
        imageJobCenter = (DigilibJobCenter<DocuImage>) dlConfig
                .getValue("servlet.worker.imageexecutor");

        denyImgFile = ServletOps.getFile(
                (File) dlConfig.getValue("denied-image"), context);
        errorImgFile = ServletOps.getFile(
                (File) dlConfig.getValue("error-image"), context);
        notfoundImgFile = ServletOps.getFile(
                (File) dlConfig.getValue("notfound-image"), context);
        sendFileAllowed = dlConfig.getAsBoolean("sendfile-allowed");
    }

    /**
     * Returns modification time relevant to the request for caching.
     * 
     * @see javax.servlet.http.HttpServlet#getLastModified(javax.servlet.http.HttpServletRequest)
     */
    public long getLastModified(HttpServletRequest request) {
        accountlog.debug("GetLastModified from " + request.getRemoteAddr()
                + " for " + request.getQueryString());
        long mtime = -1;
        try {
            // create new digilib request
            DigilibRequest dlReq = new DigilibRequest(request);
            DocuDirectory dd = dirCache.getDirectory(dlReq.getFilePath());
            if (dd != null) {
                mtime = dd.getDirMTime() / 1000 * 1000;
            }
        } catch (Exception e) {
            logger.error("error in getLastModified: " + e.getMessage());
        }
        logger.debug("  returns " + mtime);
        return mtime;
    }

    /* (non-Javadoc)
     * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
     */
    public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException {
        accountlog.info("GET from " + request.getRemoteAddr());
        this.processRequest(request, response);
    }


    /* (non-Javadoc)
     * @see javax.servlet.http.HttpServlet#doPost(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
     */
    public void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException {
        accountlog.info("POST from " + request.getRemoteAddr());
        this.processRequest(request, response);
    }
    

	protected void doHead(HttpServletRequest req, HttpServletResponse resp)
			throws ServletException, IOException {
		logger.debug("HEAD from "+req.getRemoteAddr());
		super.doHead(req, resp);
	}

	protected void doOptions(HttpServletRequest req, HttpServletResponse resp)
			throws ServletException, IOException {
		logger.debug("OPTIONS from "+req.getRemoteAddr());
		super.doOptions(req, resp);
	}

	/** Service this request using the response.
     * @param request
     * @param response
     * @throws ServletException 
     */
    public void processRequest(HttpServletRequest request,
            HttpServletResponse response) throws ServletException {

        if (dlConfig == null) {
            logger.error("ERROR: No Configuration!");
            throw new ServletException("NO VALID digilib CONFIGURATION!");
        }

        accountlog.debug("request: " + request.getQueryString());
        logger.debug("request: " + request.getQueryString());
        logger.debug("headers: " + ServletOps.headersToString(request));
        //logger.debug("response:"+ response + " committed=" + response.isCommitted());
        final long startTime = System.currentTimeMillis();

        // parse request
        DigilibRequest dlRequest = new DigilibRequest(request);
        // extract the job information
        final ImageJobDescription jobTicket = ImageJobDescription.getInstance(dlRequest, dlConfig);

        // type of error reporting
        ErrMsg errMsgType = ErrMsg.IMAGE;
        if (dlRequest.hasOption("errtxt")) {
        	errMsgType = ErrMsg.TEXT;
        } else if (dlRequest.hasOption("errcode")) {
        	errMsgType = ErrMsg.CODE;
        }
        
        try {
        	/*
        	 *  check if we can fast-track without scaling
        	 */
            ImageInput fileToLoad = (ImageInput) jobTicket.getInput();

            // check permissions
            if (useAuthorization) {
                // get a list of required roles (empty if no restrictions)
                List<String> rolesRequired = authOp.rolesForPath(
                        jobTicket.getFilePath(), request);
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

            // if requested, send image as a file
            if (sendFileAllowed && jobTicket.getSendAsFile()) {
                String mt = null;
                if (jobTicket.hasOption("rawfile")) {
                    mt = "application/octet-stream";
                }
                logger.debug("Sending RAW File as is.");
                ServletOps.sendFile(fileToLoad.getFile(), mt, null, response, logger);
                logger.info("Done in " + (System.currentTimeMillis() - startTime) + "ms");
                return;
            }

            // if possible, send the image without actually having to transform it
            if (! jobTicket.isTransformRequired()) {
                logger.debug("Sending File as is.");
                ServletOps.sendFile(fileToLoad.getFile(), null, null, response, logger);
                logger.info("Done in " + (System.currentTimeMillis() - startTime) + "ms");
                return;
            }

            // check load of workers
            if (imageJobCenter.isBusy()) {
                logger.error("Servlet overloaded!");
                response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
                return;
            }
            
            // worker job is done asynchronously
            AsyncContext asyncCtx = request.startAsync(request, response); 
            // create job
            AsyncServletWorker job = new AsyncServletWorker(dlConfig, jobTicket, asyncCtx, errMsgType, startTime);
            // submit job
            imageJobCenter.submit(job);
            // we're done for now

        } catch (ImageOpException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            digilibError(errMsgType, Error.IMAGE, null, response);
        } catch (IOException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            digilibError(errMsgType, Error.FILE, null, response);
        } catch (AuthOpException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            digilibError(errMsgType, Error.AUTH, null, response);
        } catch (Exception e) {
            logger.error("Other Exception: ", e);
            // TODO: should we rethrow or swallow?
            //throw new ServletException(e);
        }
    }

    /**
     * Sends an error to the client as text or image.
     * 
     * @param type
     * @param error
     * @param msg
     * @param response
     */
    public static void digilibError(ErrMsg type, Error error, String msg,
            HttpServletResponse response) {
        try {
            File img = null;
            int status = 0;
            if (error == Error.AUTH) {
                if (msg == null) {
                    msg = "ERROR: Unauthorized access!";
                }
                img = denyImgFile;
                status = HttpServletResponse.SC_FORBIDDEN;
            } else if (error == Error.FILE) {
                if (msg == null) {
                    msg = "ERROR: Image file not found!";
                }
                img = notfoundImgFile;
                status = HttpServletResponse.SC_NOT_FOUND;
            } else {
                if (msg == null) {
                    msg = "ERROR: Other image error!";
                }
                img = errorImgFile;
                status = HttpServletResponse.SC_BAD_REQUEST;
            }
            if (response.isCommitted()) {
                // response already committed
                logger.warn("Response committed for error "+msg);
            }
            if (type == ErrMsg.TEXT) {
                ServletOps.htmlMessage(msg, response);
            } else if (type == ErrMsg.CODE) {
                response.sendError(status, msg);
            } else if (img != null) {
                // default: image
                ServletOps.sendFile(img, null, null, response, logger);
            }
        } catch (Exception e) {
            logger.error("Error sending error!", e);
        }

    }

    public static String getVersion() {
        return version;
    }

}
