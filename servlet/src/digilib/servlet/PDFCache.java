package digilib.servlet;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * A class for handling user requests for pdf documents from digilib images.  
 * 
 * @author cmielack
 *
 */

public class PDFCache extends RequestHandler {

	private DigilibConfiguration dlConfig = null;
	
	public static String global_instance = "digilib.servlet.PDFCache";
	
	private String cache_directory = "cache/";  
	
	private String temp_directory = "pdf_temp/";
	
	private static String JSP_WIP = "/pdf/wip.jsp";
	
	private static String JSP_ERROR = "/pdf/error.jsp";
	
	public static Integer STATUS_DONE = 0;  	// document exists in cache

	public static Integer STATUS_WIP = 1;  		// document is "work in progress"
	
	public static Integer STATUS_NONEXISTENT = 2;  	// document does not exist in cache and is not in progress
	
	public static Integer STATUS_ERROR = 3;     // an error occurred while processing the request
	
	public static String version = "0.2";
	
	private ServletContext context = null;

	
	// TODO functionality for the pre-generation of complete books/chapters using default values
	// TODO use DLConfig for default values
	// TODO use JSPs for automatically refreshing waiting-pages and download-pages
	// TODO register the PDFCache instance globally and implement getters for cache_dir 
	
	
	public void init(ServletConfig config) throws ServletException{
		super.init(config);
		
		logger.info("initialized PDFCache v."+version);
		
		context = config.getServletContext();
		
		dlConfig = (DigilibConfiguration) context.getAttribute("digilib.servlet.configuration");
		
		if (dlConfig == null) {
			// no Configuration
			throw new ServletException("No Configuration!");
		}

		
		
		
		temp_directory = dlConfig.getAsString("pdf-temp-dir");
		cache_directory = dlConfig.getAsString("pdf-cache-dir");


		// rid the temporary directory of possible incomplete document files
		emptyTempDirectory();
		
		// register this instance globally
		context.setAttribute(global_instance, this);
		
	}
	
	
	public void emptyTempDirectory(){
		File temp_dir = new File(temp_directory);
		String[] cached_files = temp_dir.list();
		
		for (String file: cached_files){
			new File(temp_directory,file).delete();
		}
	}
	
	
	
	@Override
	public void processRequest(HttpServletRequest request,
			HttpServletResponse response) {

		// evaluate request ( make a PDFJobDeclaration , get the DocumentId)
		PDFJobInformation pdfji = new PDFJobInformation(dlConfig); 
		pdfji.setWithRequest(request);
		
		
		String docid = pdfji.getDocumentId();
		
		// if some invalid data has been entered ...
		if(!pdfji.checkValidity()) {
			notifyUser(STATUS_ERROR, docid, request, response);
			return;
		}
		
		int status = getStatus(docid);
		
		
		
		if(status == STATUS_NONEXISTENT){
			createNewPdfDocument(pdfji, docid); 
			notifyUser(status, docid, request, response);
		}
		else if (status == STATUS_DONE){
			try {
				sendFile(docid, downloadFilename(pdfji), response);
			} catch (IOException e) {
				e.printStackTrace();
				logger.error(e.getMessage());
			}
		}
		else {
			notifyUser(status, docid, request, response);			
		}
	}


	public void notifyUser(int status, String documentid, HttpServletRequest request, HttpServletResponse response){
		// depending on the documents status, redirect the user to an appropriate waiting- or download-site
		// TODO
		
		String jsp=null;
		
		if(status == STATUS_NONEXISTENT){
			// tell the user that the document has to be created before he/she can download it
			logger.debug("PDFCache: "+documentid+" has STATUS_NONEXISTENT.");
			jsp = JSP_WIP;
		}
		else if(status == STATUS_WIP){
			logger.debug("PDFCache: "+documentid+" has STATUS_WIP.");
			jsp = JSP_WIP;

			// estimate remaining work time
			// tell the user he/she has to wait
		}
		else if(status == STATUS_DONE){
			logger.debug("PDFCache: "+documentid+" has STATUS_DONE.");
		}
		else {
			logger.debug("PDFCache: "+documentid+" has STATUS_ERROR.");
			jsp = JSP_ERROR;
		}

		RequestDispatcher dispatch = context.getRequestDispatcher(jsp);

		
		try {
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
	public Integer getStatus(String documentid){
		// looks into the cache and temp directory in order to find out the status of the document
		File cached = new File(cache_directory + documentid);
		File wip = new File(temp_directory + documentid);
		if(cached.exists()){
			return STATUS_DONE;
		}
		else if (wip.exists()){
			return STATUS_WIP;
		}
		else {
			return STATUS_NONEXISTENT;
		}
	}


	public void createNewPdfDocument(PDFJobInformation pdfji, String filename){
		// start new worker
		PDFMaker pdf_maker = new PDFMaker(context, pdfji,filename);
		new Thread(pdf_maker, "PDFMaker").start();
	}
	
	
	public String downloadFilename(PDFJobInformation pdfji){
		String filename;
		filename =  "digilib_";
		filename += pdfji.getImageJobInformation().getAsString("fn");
		filename += "_pgs" + pdfji.getAsString("pgs");
		filename += ".pdf";
		
		return filename;
	}
	
	/**
	 *  sends a document to the user
	 * 
	 * @param cachefile  The filename of the  document in cache.
	 * @param filename  The filename used for downloading.
	 * @param response  
	 * @throws IOException
	 */
	public void sendFile(String cachefile, String filename, HttpServletResponse response) throws IOException{
		File cached_file = null;
		FileInputStream fis = null;
		ServletOutputStream sos = null;
		BufferedInputStream bis = null;

		try {
			cached_file = new File(cache_directory + cachefile);
			fis = new FileInputStream(cached_file);
			sos = response.getOutputStream();
			bis = new BufferedInputStream(fis);

			int bytes = 0;

			response.setContentType("application/pdf");
			response.addHeader("Content-Disposition", "attachment; filename="+filename);
			response.setContentLength( (int) cached_file.length());
			
			while ((bytes = bis.read()) != -1){ 
				sos.write(bytes);
			}
			}
			catch(Exception e){
				logger.error(e.getMessage());
			}
			finally{
				// close all streams
				if (fis != null)
					fis.close();
				if (bis != null)
					bis.close();
				if (sos != null)
					sos.close();
			}

	}
	
	public String getCacheDirectory(){
		return cache_directory;
	}
	
	public String getTempDirectory(){
		return temp_directory;
	}
}
