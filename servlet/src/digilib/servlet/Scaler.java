package digilib.servlet;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.auth.AuthOpException;
import digilib.auth.AuthOps;
import digilib.image.DocuImage;
import digilib.image.ImageJobDescription;
import digilib.image.ImageOpException;
import digilib.image.ImageWorker;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.DocuDirent;
import digilib.io.FileOps.FileClass;
import digilib.io.ImageInput;
import digilib.util.DigilibJobCenter;

@SuppressWarnings("serial")
public class Scaler extends HttpServlet {

    /** digilib servlet version (for all components) */
    public static final String version = "1.9.0a";

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
    DocuDirCache dirCache;

    /** Image executor */
    DigilibJobCenter<DocuImage> imageJobCenter;

    /** authentication error image file */
    File denyImgFile;

    /** image error image file */
    File errorImgFile;

    /** not found error image file */
    File notfoundImgFile;

    /** send files as is? */
    boolean sendFileAllowed = true;

    /** DigilibConfiguration instance */
    DigilibConfiguration dlConfig;

    /** use authorization database */
    boolean useAuthorization = true;

    /** AuthOps instance */
    AuthOps authOp;

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

        // Executor
        imageJobCenter = (DigilibJobCenter<DocuImage>) dlConfig
                .getValue("servlet.worker.imageexecutor");

        denyImgFile = ServletOps.getFile(
                (File) dlConfig.getValue("denied-image"), config);
        errorImgFile = ServletOps.getFile(
                (File) dlConfig.getValue("error-image"), config);
        notfoundImgFile = ServletOps.getFile(
                (File) dlConfig.getValue("notfound-image"), config);
        sendFileAllowed = dlConfig.getAsBoolean("sendfile-allowed");
    }

    /** Returns modification time relevant to the request for caching.
     * 
     * @see javax.servlet.http.HttpServlet#getLastModified(javax.servlet.http.HttpServletRequest)
     */
    protected long getLastModified(HttpServletRequest request) {
        accountlog.debug("GetLastModified from " + request.getRemoteAddr()
                + " for " + request.getQueryString());
        long mtime = -1;
        // create new request
        DigilibRequest dlReq = new DigilibRequest(request);
		// find the file(set)
		DocuDirent f = dirCache.getFile(dlReq.getFilePath(),
		        dlReq.getAsInt("pn"), FileClass.IMAGE);
        // find the requested file
        if (f != null) {
            DocuDirectory dd = (DocuDirectory) f.getParent();
            mtime = dd.getDirMTime() / 1000 * 1000;
        }
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
        long startTime = System.currentTimeMillis();

        // parse request
        DigilibRequest dlRequest = new DigilibRequest(request);
        // extract the job information
        ImageJobDescription jobTicket = ImageJobDescription.getInstance(dlRequest, dlConfig);

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
            // create job
            ImageWorker job = new ImageWorker(dlConfig, jobTicket);
            // submit job
            Future<DocuImage> jobResult = imageJobCenter.submit(job);
            // wait for result
            DocuImage img = jobResult.get();
            // send image
            ServletOps.sendImage(img, null, response, logger);
            logger.debug("Job Processing Time: "
                    + (System.currentTimeMillis() - startTime) + "ms");

        } catch (ImageOpException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            digilibError(errMsgType, Error.IMAGE, null, response);
        } catch (IOException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            digilibError(errMsgType, Error.FILE, null, response);
        } catch (AuthOpException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            digilibError(errMsgType, Error.AUTH, null, response);
        } catch (InterruptedException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
        } catch (ExecutionException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            String causeMsg = e.getCause().getMessage();
            logger.error("caused by: " + causeMsg);
            digilibError(errMsgType, Error.IMAGE, causeMsg, response);
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
    public void digilibError(ErrMsg type, Error error, String msg,
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
                img = this.errorImgFile;
                status = HttpServletResponse.SC_BAD_REQUEST;
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
