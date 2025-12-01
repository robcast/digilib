package digilib.servlet;

/*
 * #%L
 * A Servlet with a disk cache serving pdf documents made from digilib images.  
 * %%
 * Copyright (C) 2009 - 2020 MPIWG Berlin
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
 * Authors: Christopher Mielack, Robert Casties
 */

import java.io.File;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.file.FileAlreadyExistsException;
import java.util.Base64;
import java.util.concurrent.Future;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.conf.DigilibConfiguration;
import digilib.conf.PDFRequest;
import digilib.conf.PDFServletConfiguration;
import digilib.image.DocuImage;
import digilib.image.ImageOpException;
import digilib.pdf.PDFFileWorker;
import digilib.util.DigilibJobCenter;
import jakarta.json.Json;
import jakarta.json.stream.JsonGenerator;

/**
 * A class for handling user requests for pdf documents made from digilib
 * images.
 * 
 * If a document does not already exist, it will be enqueued for generation; if
 * it does exist, it is sent to the user.
 * 
 * @author cmielack, casties
 * 
 */
@WebServlet(name = "PDFGenerator", urlPatterns = { "/PDFGenerator/*", "/PDFCache/*", "/servlet/PDFCache/*" })
public class PDFGenerator extends HttpServlet {

    private static final long serialVersionUID = 351326880003758192L;

    public static String version = PDFServletConfiguration.getClassVersion();

    /** logger for accounting requests */
    protected static Logger accountlog = LoggerFactory.getLogger("account.pdf.request");

    /** gengeral logger for this class */
    protected static Logger logger = LoggerFactory.getLogger("digilib.pdfgenerator");

    /** logger for authentication related */
    protected static Logger authlog = LoggerFactory.getLogger("digilib.pdf.auth");

    private DigilibConfiguration dlConfig = null;

    public static final String INSTANCE_KEY = "digilib.servlet.PDFGenerator";

    public static final String WIP_PAGE_KEY = "pdf-wip-page";

    public static final String ERROR_PAGE_KEY = "pdf-error-page";

    public static final String IOERROR_PAGE_KEY = "pdf-ioerror-page";

    private DigilibJobCenter<File> pdfJobCenter = null;

    private DigilibJobCenter<DocuImage> pdfImageJobCenter = null;

    private File cacheDir = new File("pdf_cache");

    private File workDir = new File("pdf_temp");

    /**
     * Document status. DONE: document exists in cache WIP: document is "work in
     * progress" NONEXISTENT: document does not exist in cache and is not in
     * progress ERROR: an error occurred while processing the request
     */
    public static enum PDFStatus {
        DONE, WIP, NONEXISTENT, ERROR, IOERROR
    };

    @SuppressWarnings("unchecked")
    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        System.out.println("***** Digital Image Library Image PDF-Generator Servlet (version " + version + ") *****");
        // say hello in the log file
        logger.info("***** Digital Image Library Image PDF-Generator Servlet (version " + version + ") *****");

        ServletContext context = getServletContext();
        dlConfig = PDFServletConfiguration.getCurrentConfig(context);
        if (dlConfig == null) {
            // no Configuration
            throw new ServletException("No Configuration!");
        }
        workDir = dlConfig.getAsFile(PDFServletConfiguration.PDF_WORKDIR_KEY);
        cacheDir = dlConfig.getAsFile(PDFServletConfiguration.PDF_CACHEDIR_KEY);
        if (!workDir.isDirectory()) {
            throw new ServletException("Configuration error: problem with pdf-temp-dir=" + workDir);
        }
        if (!cacheDir.isDirectory()) {
            throw new ServletException("Configuration error: problem with pdf-cache-dir=" + cacheDir);
        }
        pdfJobCenter = (DigilibJobCenter<File>) dlConfig.getValue(PDFServletConfiguration.PDF_EXECUTOR_KEY);
        pdfImageJobCenter = (DigilibJobCenter<DocuImage>) dlConfig
                .getValue(PDFServletConfiguration.PDF_IMAGEEXECUTOR_KEY);
        // register this instance globally
        context.setAttribute(INSTANCE_KEY, this);
    }

    /*
     * (non-Javadoc)
     * 
     * @see
     * javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest ,
     * javax.servlet.http.HttpServletResponse)
     */
    public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException {
        accountlog.info("GET from " + request.getRemoteAddr());

        // GET must have (encoded) docid from POST
        String docid = request.getParameter("docid");
        if (docid == null || docid.isEmpty()) {
            notifyUser(PDFStatus.ERROR, "[missing docid]", null, request, response);
            return;
        }
        try {
            docid = decodeDocid(docid);
        } catch (Exception e) {
            notifyUser(PDFStatus.ERROR, "[invalid docid]", null, request, response);
            return;
        }

        PDFStatus status = getStatus(docid);
        if (status == PDFStatus.NONEXISTENT) {
            // no file -- should not happen
            logger.error("Nonexistent file for docid!");
            notifyUser(PDFStatus.ERROR, docid, "Nonexistent file for docid!", request, response);
            return;

        } else if (status == PDFStatus.DONE) {
            // pdf created
            if (isJsonRequest(request)) {
                // send json status
                notifyUser(status, docid, null, request, response);
                return;
            } else {
                // send file
                try {
                    logger.debug("PDF docid={} DONE", docid);
                    ServletOps.sendFile(getCacheFile(docid), "application/pdf", getDownloadFilename(docid), 
                            response, logger);
                    return;
                } catch (Exception e) {
                    // sending didn't work
                    logger.error(e.getMessage());
                    return;
                }
            }

        } else {
            // should be work in progress
            notifyUser(status, docid, null, request, response);
            return;
        }
    }

    /*
     * (non-Javadoc)
     * 
     * @see
     * javax.servlet.http.HttpServlet#doPost(javax.servlet.http.HttpServletRequest ,
     * javax.servlet.http.HttpServletResponse)
     */
    public void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException {
        accountlog.info("POST from " + request.getRemoteAddr());

        if (dlConfig == null) {
            logger.error("ERROR: No Configuration!");
            throw new ServletException("NO VALID digilib CONFIGURATION!");
        }

        String docid = "";
        try {
            // create and check PDF request (may throw exception)
            PDFRequest pdfji = new PDFRequest(request, dlConfig);
            docid = pdfji.getDocumentId();
            // status URL for this document
            String statusUrl = "?docid=" + encodeDocid(docid);

            // if some invalid data has been entered ...
            if (!pdfji.isValid()) {
                notifyUser(PDFStatus.ERROR, docid, "Invalid PDF parameters!", request, response);
                return;
            }
            
            // check current status
            PDFStatus status = getStatus(docid);

            if (status == PDFStatus.NONEXISTENT) {
                // PDF not there -- start creation
                try {
                    // start PDF creation thread
                    createNewPdfDocument(pdfji, docid);
                    // redirect client to status
                    logger.debug("redirecting to {}", statusUrl);
                    response.sendRedirect(statusUrl);
                    return;
                } catch (FileAlreadyExistsException e) {
                    // temp file actually exists - assume WIP
                    logger.warn("Temp file seems to exist: {} - assume WIP.", e.getMessage());
                    logger.debug("redirecting to {}", statusUrl);
                    response.sendRedirect(statusUrl);
                    return;
                } catch (IOException e) {
                    // error in pdf creation
                    logger.error(e.getMessage());
                    notifyUser(PDFStatus.ERROR, docid, "Error creating PDF: " + e.getMessage(), 
                            request, response);
                    return;
                }

            } else if (status == PDFStatus.DONE) {
                // PDF has been created 
                if (isJsonRequest(request)) {
                    // redirect client to status
                    logger.debug("redirecting to {}", statusUrl);
                    response.sendRedirect(statusUrl);
                    return;
                }
                // send the file
                try {
                    logger.debug("PDF docid={} already DONE", docid);
                    ServletOps.sendFile(getCacheFile(docid), "application/pdf", getDownloadFilename(pdfji), 
                            response, logger);
                    return;
                } catch (Exception e) {
                    // sending didn't work
                    logger.error(e.getMessage());
                    return;
                }

            } else {
                // other status like in progress - redirect client to status
                logger.debug("redirecting to {}", statusUrl);
                response.sendRedirect(statusUrl);
                return;
            }
        } catch (IOException e) {
            // io error in pdf creation
            logger.error("IO error for request: {}", e.getMessage());
            notifyUser(PDFStatus.IOERROR, docid, null, request, response);
            return;
        } catch (ImageOpException e) {
            // other error in pdf creation
            logger.error("Error processing request: {}", e.getMessage());
            notifyUser(PDFStatus.ERROR, docid, "Error processing PDF: " + e.getMessage(), 
                    request, response);
            return;
        }
    }

    /**
     * depending on the documents status, redirect the user to the appropriate
     * waiting or download page.
     * 
     * @param status
     * @param documentid
     * @param message TODO
     * @param request
     * @param response
     */
    public void notifyUser(PDFStatus status, String documentid, String message,
            HttpServletRequest request, HttpServletResponse response) {

        String nextPage = null;
        String usermsg = null;
        int httpStatus = 0;

        if (status == PDFStatus.NONEXISTENT) {
            // this status should not end up here
            logger.debug("PDFGenerator: {} has STATUS_NONEXISTENT.", documentid);
            nextPage = dlConfig.getAsString(WIP_PAGE_KEY);
            usermsg = "Document " + documentid + " is being generated";
            httpStatus = HttpServletResponse.SC_ACCEPTED;

        } else if (status == PDFStatus.WIP) {
            logger.debug("PDFGenerator: {} has STATUS_WIP.", documentid);
            nextPage = dlConfig.getAsString(WIP_PAGE_KEY);
            usermsg = "Document " + documentid + " is being generated";
            httpStatus = HttpServletResponse.SC_ACCEPTED;
            // TODO: show progress

        } else if (status == PDFStatus.DONE) {
            // this status should not end up here
            logger.debug("PDFGenerator: {} has STATUS_DONE.", documentid);
            usermsg = "Document " + documentid + " has been generated";
            httpStatus = HttpServletResponse.SC_OK;

        } else if (status == PDFStatus.IOERROR) {
            logger.debug("PDFGenerator: {} has STATUS_IOERROR.", documentid);
            nextPage = dlConfig.getAsString(IOERROR_PAGE_KEY);
            usermsg = "File not found error for document " + documentid;
            if (message != null) {
                usermsg += " " + message;
            }
            httpStatus = HttpServletResponse.SC_NOT_FOUND;

        } else {
            // must be an error
            logger.debug("PDFGenerator: {} has STATUS_ERROR.", documentid);
            nextPage = dlConfig.getAsString(ERROR_PAGE_KEY);
            usermsg = "Error in request for document " + documentid;
            if (message != null) {
                usermsg += " " + message;
            }
            httpStatus = HttpServletResponse.SC_BAD_REQUEST;
        }

        try {
            if (isJsonRequest(request)) {
                /*
                 * REST style answer with JSON content
                 */
                response.setStatus(httpStatus);
                response.setCharacterEncoding("UTF-8");
                response.setContentType("application/json");
                ServletOutputStream out = response.getOutputStream();
                JsonGenerator info = Json.createGenerator(out);
                info.writeStartObject()
                    .write("docid", documentid)
                    .write("status", status.toString())
                    .write("message", usermsg)
                    .writeEnd();
                info.close();

            } else {
                /*
                 * browser style forward to the relevant jsp
                 */
                response.setStatus(httpStatus);
                ServletContext context = getServletContext();
                RequestDispatcher dispatch = context.getRequestDispatcher(nextPage);
                dispatch.forward(request, response);
            }
        } catch (ServletException e) {
            logger.debug(e.getMessage());
        } catch (IOException e) {
            logger.debug(e.getMessage());
        }

    }

    /** check the status of the document corresponding to the documentid */
    public PDFStatus getStatus(String documentid) {
        // looks into the cache and temp directory in order to find out the
        // status of the document
        File cached = getCacheFile(documentid);
        File wip = getTempFile(documentid);
        if (cached.exists()) {
            return PDFStatus.DONE;
        } else if (wip.exists()) {
            return PDFStatus.WIP;
        } else {
            return PDFStatus.NONEXISTENT;
        }
    }

    /**
     * Create new thread for pdf generation.
     * 
     * @param pdfji
     * @param filename
     * @return
     * @throws IOException 
     */
    public Future<File> createNewPdfDocument(PDFRequest pdfji, String filename) throws IOException {
        // start new worker
        File tempf = this.getTempFile(filename);
        if (!tempf.createNewFile()) {
            throw new FileAlreadyExistsException(tempf.toString());
        }
        File finalf = this.getCacheFile(filename);
        PDFFileWorker job = new PDFFileWorker(dlConfig, tempf, finalf, pdfji, pdfImageJobCenter);
        // start job
        Future<File> jobTicket = pdfJobCenter.submit(job);
        return jobTicket;
    }

    /**
     * generate the filename the user is going to receive the pdf as
     * 
     * @param pdfji
     * @return
     */
    public String getDownloadFilename(PDFRequest pdfji) {
        // filename example: digilib_example_pgs1-3.pdf
        String filename;
        filename = "digilib_";
        filename += pdfji.getAsString("fn").replace("/", "-");
        filename += "_pgs" + pdfji.getAsString("pgs");
        filename += ".pdf";

        return filename;
    }

    /**
     * generate the filename the user is going to receive the pdf as
     * 
     * @param docid
     * @return
     */
    public String getDownloadFilename(String docid) {
        String filename = "digilib_";
        try {
            String id = URLDecoder.decode(docid, "UTF-8");
            for (String s : id.split("&")) {
                String[] kv = s.split("=");
                String k = kv[0];
                String v = kv[1];
                if (k.equals("fn")) {
                    filename += v.replace("/", "-");
                } else if (k.equals("pgs")) {
                    filename += "_pgs" + v;
                }
            }
        } catch (UnsupportedEncodingException e) {
            // this should not happen
        }
        filename += ".pdf";
        return filename;
    }

    public File getCacheDirectory() {
        return cacheDir;
    }

    public File getTempDirectory() {
        return workDir;
    }

    /**
     * returns a File object based on filename in the temp directory.
     * 
     * @param filename
     * @return
     */
    public File getTempFile(String filename) {
        return new File(workDir, filename);
    }

    /**
     * returns a File object based on filename in the cache directory.
     * 
     * @param filename
     * @return
     */
    public File getCacheFile(String filename) {
        return new File(cacheDir, filename);
    }

    public String encodeDocid(String docid) {
        return Base64.getUrlEncoder().encodeToString(docid.getBytes());
    }

    public String decodeDocid(String encid) {
        return new String(Base64.getUrlDecoder().decode(encid));
    }
    
    /**
     * Returns if the request asked for a JSON response.
     * @param request
     * @return
     */
    protected boolean isJsonRequest(HttpServletRequest request) {
        return "application/json".equalsIgnoreCase(request.getHeader("Accept"));
    }

}
