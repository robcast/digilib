package digilib.servlet;

/*
 * #%L
 * 
 * Scaler servlet that uses a thread pool but only synchronous servlet 2.3 API.
 *  
 * %%
 * Copyright (C) 2004 - 2013 MPIWG Berlin
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
 * Author: Robert Casties (robcast@berlios.de)
 */

import java.io.File;
import java.io.IOException;
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
import digilib.auth.AuthzOps;
import digilib.conf.DigilibOption;
import digilib.conf.DigilibServletConfiguration;
import digilib.conf.DigilibServletRequest;
import digilib.image.DocuImage;
import digilib.image.ImageJobDescription;
import digilib.image.ImageOpException;
import digilib.image.ImageWorker;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.ImageInput;
import digilib.util.DigilibJobCenter;

/**
 * Version of Scaler servlet that uses a thread pool but not Servlet 3.0 async
 * API.
 */
public class Scaler extends HttpServlet {

    private static final long serialVersionUID = -5439198888139362735L;

    /** digilib servlet version (for all components) */
    public static final String version = DigilibServletConfiguration.getClassVersion() + " noasync";

    /** servlet error codes */
    public static enum Error {
        UNKNOWN, AUTH, FILE, IMAGE
    };

    /** type of error message */
    public static enum ErrMsg {
        IMAGE, TEXT, CODE
    };

    /** logger for accounting requests */
    protected static Logger accountlog = Logger.getLogger("account.request");

    /** gengeral logger for this class */
    protected static Logger logger = Logger.getLogger("digilib.scaler");

    /** logger for authentication related */
    protected static Logger authlog = Logger.getLogger("digilib.auth");

    /** DocuDirCache instance */
    protected DocuDirCache dirCache;

    /** Image executor */
    DigilibJobCenter<DocuImage> imageJobCenter;

    /** authentication error image file */
    public static File denyImgFile;

    /** image error image file */
    public static File errorImgFile;

    /** not found error image file */
    public static File notfoundImgFile;

    /** send files as is? */
    protected boolean sendFileAllowed = true;

    /** DigilibConfiguration instance */
    protected DigilibServletConfiguration dlConfig;

    /** use authorization database */
    protected boolean useAuthorization = false;

    /** AuthzOps instance */
    protected AuthzOps authzOp;

    /**
     * Initialisation on first run.
     * 
     * @throws ServletException
     * 
     * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
     */
    @SuppressWarnings("unchecked")
    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        System.out.println("***** Digital Image Library Image Scaler Servlet (version " + version + ") *****");
        // say hello in the log file
        logger.info("***** Digital Image Library Image Scaler Servlet (version " + version + ") *****");

        // get our ServletContext
        ServletContext context = config.getServletContext();
        // see if there is a Configuration instance
        dlConfig = DigilibServletConfiguration.getCurrentConfig(context);
        if (dlConfig == null) {
            // no Configuration
            throw new ServletException("No Configuration!");
        }
        // add servlet version
        dlConfig.newParameter("servlet.version", Scaler.getVersion(), null, 's');
        // log DocuImage version
        logger.info("Scaler uses " + dlConfig.getValue("servlet.docuimage.version"));
        // set our AuthOps
        useAuthorization = dlConfig.getAsBoolean("use-authorization");
        authzOp = (AuthzOps) dlConfig.getValue(DigilibServletConfiguration.AUTHZ_OP_KEY);

        // DocuDirCache instance
        dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");

        // Executor
        imageJobCenter = (DigilibJobCenter<DocuImage>) dlConfig.getValue("servlet.worker.imageexecutor");

        // configure ServletOps
        ServletOps.setDlConfig(dlConfig);
        
        denyImgFile = ServletOps.getFile(dlConfig.getAsFile("denied-image"), context);
        errorImgFile = ServletOps.getFile(dlConfig.getAsFile("error-image"), context);
        notfoundImgFile = ServletOps.getFile(dlConfig.getAsFile("notfound-image"), context);
        sendFileAllowed = dlConfig.getAsBoolean("sendfile-allowed");
    }

    /**
     * Returns modification time relevant to the request for caching.
     * 
     * @see javax.servlet.http.HttpServlet#getLastModified(javax.servlet.http.HttpServletRequest)
     */
    public long getLastModified(HttpServletRequest request) {
        accountlog.debug("GetLastModified from " + request.getRemoteAddr() + " for " + request.getQueryString());
        long mtime = -1;
        // create new request
        DigilibServletRequest dlReq = new DigilibServletRequest(request, dlConfig);
        DocuDirectory dd = dirCache.getDirectory(dlReq.getFilePath());
        if (dd != null) {
            mtime = dd.getDirMTime() / 1000 * 1000;
        }
        logger.debug("  returns " + mtime);
        return mtime;
    }

    /*
     * (non-Javadoc)
     * 
     * @see
     * javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest
     * , javax.servlet.http.HttpServletResponse)
     */
    public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException {
        accountlog.info("GET from " + request.getRemoteAddr());
        this.processRequest(request, response);
    }

    /*
     * (non-Javadoc)
     * 
     * @see
     * javax.servlet.http.HttpServlet#doPost(javax.servlet.http.HttpServletRequest
     * , javax.servlet.http.HttpServletResponse)
     */
    public void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException {
        accountlog.info("POST from " + request.getRemoteAddr());
        this.processRequest(request, response);
    }

    protected void doHead(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        logger.debug("HEAD from " + req.getRemoteAddr());
        super.doHead(req, resp);
    }

    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        logger.debug("OPTIONS from " + req.getRemoteAddr());
        super.doOptions(req, resp);
    }

    /**
     * Service this request using the response.
     * 
     * @param request
     * @param response
     * @throws ServletException
     */
    public void processRequest(HttpServletRequest request, HttpServletResponse response) throws ServletException {

        if (dlConfig == null) {
            logger.error("ERROR: No Configuration!");
            throw new ServletException("NO VALID digilib CONFIGURATION!");
        }

        accountlog.debug("request: " + request.getQueryString());
        logger.debug("request: " + request.getQueryString());
        long startTime = System.currentTimeMillis();

        // parse request
        DigilibServletRequest dlRequest = new DigilibServletRequest(request, dlConfig);
        
        // type of error reporting
        ErrMsg errMsgType = ErrMsg.IMAGE;
        if (dlRequest.hasOption(DigilibOption.errtxt)) {
            errMsgType = ErrMsg.TEXT;
        } else if (dlRequest.hasOption(DigilibOption.errcode)) {
            errMsgType = ErrMsg.CODE;
        }

        try {
            // extract the job information
            ImageJobDescription jobTicket = ImageJobDescription.getInstance(dlRequest, dlConfig);

            /*
             * check if we can fast-track without scaling
             */
            ImageInput fileToLoad = jobTicket.getInput();

            // check permissions
            if (useAuthorization) {
                // is the current request/user authorized?
                if (!authzOp.isAuthorized(dlRequest)) {
                    // send deny answer and abort
                    throw new AuthOpException();
                }
            }

            // if requested, send image as a file
            if (sendFileAllowed && jobTicket.getSendAsFile()) {
                String mt = null;
                if (jobTicket.hasOption(DigilibOption.rawfile)) {
                    mt = "application/octet-stream";
                }
                logger.debug("Sending RAW File as is.");
                ServletOps.sendFile(fileToLoad.getFile(), mt, null, response, logger);
                logger.info("Done in " + (System.currentTimeMillis() - startTime) + "ms");
                return;
            }

            // if possible, send the image without actually having to transform
            // it
            if (!jobTicket.isTransformRequired()) {
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
            // forced destination image type
            String mt = null;
            if (jobTicket.hasOption(DigilibOption.jpg)) {
                mt = "image/jpeg";
            } else if (jobTicket.hasOption(DigilibOption.png)) {
                mt = "image/png";
            }
            // send image
            ServletOps.sendImage(img, mt, response, logger);
            logger.debug("Job Processing Time: " + (System.currentTimeMillis() - startTime) + "ms");

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
    public static void digilibError(ErrMsg type, Error error, String msg, HttpServletResponse response) {
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
                logger.error("Unable to send error: " + msg);
                return;
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
