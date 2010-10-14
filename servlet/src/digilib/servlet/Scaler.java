package digilib.servlet;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import digilib.auth.AuthOpException;
import digilib.auth.AuthOps;
import digilib.image.DocuImage;
import digilib.image.ImageOpException;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.DocuDirent;
import digilib.io.FileOps;
import digilib.io.ImageFile;

// TODO digilibError is not used anymore and may need to get reintegrated

public class Scaler extends RequestHandler {

    /** digilib servlet version (for all components) */
    public static final String dlVersion = "1.8.1a";

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

    /** Image executor */
    DigilibJobCenter imageJobCenter;

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
        DocuDirent f = dirCache.getFile(dlRequest.getFilePath(),
                dlRequest.getAsInt("pn"), FileOps.CLASS_IMAGE);
        return f;
    }

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
                        + dlVersion + ") *****");
        // say hello in the log file
        logger.info("***** Digital Image Library Image Scaler Servlet (version "
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

        // Executor
        imageJobCenter = (DigilibJobCenter) dlConfig
                .getValue("servlet.worker.imageexecutor");

        denyImgFile = ServletOps.getFile(
                (File) dlConfig.getValue("denied-image"), config);
        errorImgFile = ServletOps.getFile(
                (File) dlConfig.getValue("error-image"), config);
        notfoundImgFile = ServletOps.getFile(
                (File) dlConfig.getValue("notfound-image"), config);
        sendFileAllowed = dlConfig.getAsBoolean("sendfile-allowed");
    }

    @Override
    public void processRequest(HttpServletRequest request,
            HttpServletResponse response) throws ServletException,
            ImageOpException {

        if (dlConfig == null) {
            throw new ServletException("ERROR: No Configuration!");
        }

        accountlog.debug("request: " + request.getQueryString());
        logger.debug("request: " + request.getQueryString());
        long startTime = System.currentTimeMillis();

        // define the job information
        ImageJobInformation jobdeclaration = new ImageJobInformation(dlConfig);
        jobdeclaration.setWithRequest(request);

        // DigilibWorker1 job=null;
        ImageWorker job = null;
        try {

            ImageFile fileToLoad = jobdeclaration.get_fileToLoad();

            /* check permissions */
            if (useAuthorization) {
                // get a list of required roles (empty if no restrictions)
                List<String> rolesRequired = authOp.rolesForPath(
                        jobdeclaration.getFilePath(), request);
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
            if (sendFileAllowed && jobdeclaration.checkSendAsFile()) {
                String mt = null;
                if (jobdeclaration.hasOption("mo", "rawfile")) {
                    mt = "application/octet-stream";
                }
                logger.debug("Sending RAW File as is.");
                logger.info("Done in " + (System.currentTimeMillis() - startTime) + "ms");
                ServletOps.sendFile(fileToLoad.getFile(), mt, response);
                return;
            }

            // if possible, send the image without actually having to transform
            // it
            if (jobdeclaration.noTransformRequired()) {
                logger.debug("Sending File as is.");
                ServletOps.sendFile(fileToLoad.getFile(), null, response);
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
            job = new ImageWorker(dlConfig, jobdeclaration);
            // submit job
            Future<DocuImage> jobResult = imageJobCenter.submit(job);
            // wait for result
            DocuImage img = jobResult.get();
            // send image
            ServletOps.sendImage(img, null, response);
            logger.debug("Job Processing Time: "
                    + (System.currentTimeMillis() - startTime) + "ms");

        } catch (IOException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            // response.sendError(1);
        } catch (AuthOpException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            // response.sendError(1);
        } catch (InterruptedException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
        } catch (ExecutionException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            logger.error("caused by: " + e.getCause().getMessage());
        }

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

    public static String getVersion() {
        return dlVersion;
    }

}
