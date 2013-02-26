package digilib.servlet;

/*
 * #%L
 * A Servlet with a disk cache serving pdf documents made from digilib images.  
 * %%
 * Copyright (C) 2009 - 2013 MPIWG Berlin
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
 * Authors: Christopher Mielack,
 *          Robert Casties (robcast@berlios.de)
 */

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.concurrent.Future;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.image.DocuImage;
import digilib.pdf.PDFFileWorker;
import digilib.util.DigilibJobCenter;

/**
 * A class for handling user requests for pdf documents made from digilib images.  
 * 
 * If a document does not already exist, it will be enqueued for generation; if it does exist, it is sent
 * to the user.
 * 
 * @author cmielack
 *
 */

@SuppressWarnings("serial")
public class PDFCache extends HttpServlet {

    public static String version = "0.3a";

    /** logger for accounting requests */
    protected static Logger accountlog = Logger.getLogger("account.pdf.request");

    /** gengeral logger for this class */
    protected static Logger logger = Logger.getLogger("digilib.pdfcache");

    /** logger for authentication related */
    protected static Logger authlog = Logger.getLogger("digilib.pdf.auth");

	private DigilibConfiguration dlConfig = null;
	
	public static String instanceKey = "digilib.servlet.PDFCache";
	
	private DigilibJobCenter<File> pdfJobCenter = null;
	
	private DigilibJobCenter<DocuImage> pdfImageJobCenter = null;
	
	private File cache_directory = new File("cache");  
	
	private File temp_directory = new File("pdf_temp");
	
	private static String JSP_WIP = "/pdf/wip.jsp";
	
	private static String JSP_ERROR = "/pdf/error.jsp";
	
	/** document status.
	 *  DONE: document exists in cache
	 *  WIP: document is "work in progress"
	 *  NONEXISTENT: document does not exist in cache and is not in progress
	 *  ERROR: an error occurred while processing the request
	 */
	public static enum PDFStatus {DONE, WIP, NONEXISTENT, ERROR};

	
	public void init(ServletConfig config) throws ServletException {
		super.init(config);
		
        System.out.println("***** Digital Image Library Image PDF-Cache Servlet (version "
                + version + ") *****");
        // say hello in the log file
        logger.info("***** Digital Image Library Image PDF-Cache Servlet (version "
                + version + ") *****");

		ServletContext context = getServletContext();
		dlConfig = (DigilibConfiguration) context.getAttribute("digilib.servlet.configuration");
		if (dlConfig == null) {
			// no Configuration
			throw new ServletException("No Configuration!");
		}
	
		String temp_fn = dlConfig.getAsString("pdf-temp-dir");
		temp_directory = new File(temp_fn);
		if (!temp_directory.exists()) {
			// try to create
			temp_directory.mkdirs();
		} else {
	        // rid the temporary directory of possible incomplete document files
	        emptyDirectory(temp_directory);
		}
		if (!temp_directory.isDirectory()) {
		    throw new ServletException("Configuration error: problem with pdf-temp-dir="+temp_fn);
		}
        
		String cache_fn = dlConfig.getAsString("pdf-cache-dir");
       	cache_directory = new File(cache_fn);
		if (!cache_directory.exists()) {
			// try to create
			cache_directory.mkdirs();
		}
        if (!cache_directory.isDirectory()) {
            throw new ServletException("Configuration error: problem with pdf-cache-dir="+cache_fn);
        }

        pdfJobCenter = (DigilibJobCenter<File>) dlConfig.getValue("servlet.worker.pdfexecutor");
        pdfImageJobCenter = (DigilibJobCenter<DocuImage>) dlConfig.getValue("servlet.worker.pdfimageexecutor");
        
		// register this instance globally
		context.setAttribute(instanceKey, this);
		
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
    
	/** 
	 * clean up any broken and unfinished files from the temporary directory.
	 */
	public void emptyDirectory(File dir){
		File[] temp_files = dir.listFiles();
		for (File f: temp_files){
			f.delete();
		}
	}
	
	
	public void processRequest(HttpServletRequest request,
			HttpServletResponse response) throws ServletException {

        if (dlConfig == null) {
            logger.error("ERROR: No Configuration!");
            throw new ServletException("NO VALID digilib CONFIGURATION!");
        }

        String docid = "";
	    try {
		// evaluate request ( make a PDFJobDeclaration , get the DocumentId)
		PDFRequest pdfji = new PDFRequest(request, dlConfig); 
		
		docid = pdfji.getDocumentId();
		
		// if some invalid data has been entered ...
		if(!pdfji.checkValidity()) {
			notifyUser(PDFStatus.ERROR, docid, request, response);
			return;
		}
		
		PDFStatus status = getStatus(docid);
		
        if (status == PDFStatus.NONEXISTENT) {
        	// not there -- start creation
            try {
				createNewPdfDocument(pdfji, docid);
	            notifyUser(status, docid, request, response);
	            return;
			} catch (FileNotFoundException e) {
				// error in pdf creation
                logger.error(e.getMessage());
				notifyUser(PDFStatus.ERROR, docid, request, response);
				return;
			}
        } else if (status == PDFStatus.DONE) {
        	// pdf created -- send it
            try {
                ServletOps.sendFile(getCacheFile(docid), "application/pdf", getDownloadFilename(pdfji), response, logger);
                return;
            } catch (Exception e) {
            	// sending didn't work
                logger.error(e.getMessage());
                return;
            }
        } else {
        	// should be work in progress
            notifyUser(status, docid, request, response);
            return;
        }
	    } catch (Exception e) {
            // error in pdf creation
            logger.error(e.getMessage());
            notifyUser(PDFStatus.ERROR, docid, request, response);
            return;
	    }
	}

    /**
     * depending on the documents status, redirect the user to the appropriate
     * waiting or download page.
     * 
     * @param status
     * @param documentid
     * @param request
     * @param response
     */
    public void notifyUser(PDFStatus status, String documentid,
            HttpServletRequest request, HttpServletResponse response) {

        String jsp = null;

        if (status == PDFStatus.NONEXISTENT) {
            // tell the user that the document has to be created before he/she
            // can download it
            logger.debug("PDFCache: " + documentid + " has STATUS_NONEXISTENT.");
            jsp = JSP_WIP;
        } else if (status == PDFStatus.WIP) {
            logger.debug("PDFCache: " + documentid + " has STATUS_WIP.");
            jsp = JSP_WIP;

            // TODO: estimate remaining work time
            // TODO: tell the user he/she has to wait
        } else if (status == PDFStatus.DONE) {
            logger.debug("PDFCache: " + documentid + " has STATUS_DONE.");
        } else {
            logger.debug("PDFCache: " + documentid + " has STATUS_ERROR.");
            jsp = JSP_ERROR;
        }

        try {
            // forward to the relevant jsp
            ServletContext context = getServletContext();
            RequestDispatcher dispatch = context.getRequestDispatcher(jsp);
            dispatch.forward(request, response);
        } catch (ServletException e) {
            logger.debug(e.getMessage());
            e.printStackTrace();
        } catch (IOException e) {
            logger.debug(e.getMessage());
            e.printStackTrace();
        }

    }

	
	/** check the status of the document corresponding to the documentid */
	public PDFStatus getStatus(String documentid){
		// looks into the cache and temp directory in order to find out the status of the document
		File cached = getCacheFile(documentid);
		File wip = getTempFile(documentid);
		if(cached.exists()){
			return PDFStatus.DONE;
		} else if (wip.exists()){
			return PDFStatus.WIP;
		} else {
			return PDFStatus.NONEXISTENT;
		}
	}

	/** 
	 * create new thread for pdf generation.
	 * 
	 * @param pdfji
	 * @param filename
	 * @return 
	 * @throws FileNotFoundException 
	 */
	public Future<File> createNewPdfDocument(PDFRequest pdfji, String filename) throws FileNotFoundException{
		// start new worker
		File tempf = this.getTempFile(filename);
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
	public String getDownloadFilename(PDFRequest pdfji){
		// filename example: digilib_example_pgs1-3.pdf
		String filename;
		filename =  "digilib_";
		filename += pdfji.getAsString("fn");
		filename += "_pgs" + pdfji.getAsString("pgs");
		filename += ".pdf";
		
		return filename;
	}
		
	public File getCacheDirectory(){
		return cache_directory;
	}
	
	public File getTempDirectory(){
		return temp_directory;
	}
	
	/** 
	 * returns a File object based on filename in the temp directory.
	 * @param filename
	 * @return
	 */
	public File getTempFile(String filename) {
	    return new File(temp_directory, filename);
	}

	/** 
     * returns a File object based on filename in the cache directory.
     * @param filename
     * @return
     */
    public File getCacheFile(String filename) {
        return new File(cache_directory, filename);
    }
}
