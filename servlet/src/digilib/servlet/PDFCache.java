package digilib.servlet;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Hashtable;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;


/**
 * PDF request manager with caching capabilities.
 * This is a very early and dirty but functional version and will 
 * (hopefully soon) be replaced by a parallelized and more sophisticated one.
 * 
 * @author cmielack
 * 
 */

public class PDFCache extends HttpServlet {
	
	private static final long serialVersionUID = 1L;

	
	private static int STATUS_NONEXISTENT = 0; // the document does not exist and is not under construction
	private static int STATUS_DONE = 1;        // the document exists and can be downloaded
	private static int STATUS_PENDING = 2;     // the document is "under construction"
	private static int STATUS_ERROR = 3;       // an error occurred while processing the request
	
	private static String cache_directory = "cache/"; // the path (relative to the tomcat base-directory) where cached 
	                                                  // files are stored
	
	private static String cache_hash_id = "digilib.servlet.PDFCache";
	
	
	private static Logger logger = Logger.getLogger("digilib.servlet");

	
	public void init(ServletConfig config){
		// initialize the PDFCache
		
		logger.debug("Initializing PDFCache");

		try {
			super.init(config);
		} catch (ServletException e) {
			e.printStackTrace();
		}
	
		ServletContext context = this.getServletContext();
		
		context.setAttribute(cache_hash_id, new Hashtable<String,Integer>());
		
		Hashtable<String,Integer> cache_hash = (Hashtable<String,Integer>) context.getAttribute(cache_hash_id);

		if (cache_hash==null){
			cache_hash = new Hashtable<String,Integer>();
			context.setAttribute(cache_hash_id, cache_hash);
		}
		
		// search the cache-directory for existing files and fill them into the Hashtable as STATUS_DONE
		File cache_dir = new File(cache_directory);
		String[] cached_files = cache_dir.list();
		
		
		for (String file: cached_files){
			if (file.endsWith(".pdf")){
				logger.debug("cache found "+file);
				cache_hash.put(file, 1);
			}
		}
		
	}
	
	
	public String getDocumentId(HttpServletRequest request){
		// generate an unambiguous ID from the request (this is used for filenames etc)
		// at this stage, the request-string is used
		String id;
		
		id = request.getQueryString() + ".pdf";		

		return id;
	}
	
	
	public void doGet(HttpServletRequest request, HttpServletResponse response){

		// get the status of the Document specified by the request ...
		int status = this.getStatus(request);
		
		
		if (status == STATUS_DONE) {		
		// ... and if the file already exists, send it ...
			try {
				sendFile(request,response);
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		
		else if (status == STATUS_PENDING){
		// ... if it is in the works, notify the user about it ...
			String redir_url = "abc.jsp";
			try {
				response.sendRedirect(redir_url);
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		else if (status == STATUS_NONEXISTENT){
		// ... or else, generate the file and inform the user about the estimated generation-time
			try {
				this.createFile(request, response);
			} catch (ServletException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		else {  
		// if an error occurred ...			
		}
	}
	
	public int getStatus(HttpServletRequest request){
		
		String documentId = getDocumentId(request);

		ServletContext context = this.getServletContext();
		Hashtable<String,Integer> documentStatus = (Hashtable<String,Integer>) context.getAttribute(cache_hash_id);

		int status = STATUS_NONEXISTENT;
		
		if (documentStatus.containsKey(documentId)){
			status = documentStatus.get(documentId);
		}

		return status;
	}
	
	public void sendFile(HttpServletRequest request, HttpServletResponse response) throws IOException{
		// send the file specified by the request to the response
		
		String filename = getDocumentId(request);
		File cached_file = null;
		FileInputStream fis = null;
		ServletOutputStream sos = null;
		BufferedInputStream bis = null;
		
		try {
		cached_file = new File(this.cache_directory + filename);
		fis = new FileInputStream(cached_file);
		sos = response.getOutputStream();
		bis = new BufferedInputStream(fis);
		int bytes = 0;

		String fn = request.getParameter("fn");
		String pgs = request.getParameter("pgs");
		
		response.setContentType("application/pdf");
		response.addHeader("Content-Disposition", "attachment; filename="+fn+"_"+pgs+".pdf");
		response.setContentLength( (int) cached_file.length());

		logger.debug("Sending document "+filename+" to the user.");
		
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
	
	public void createFile(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException{
		// use MakePDF to generate a new Document and put it into the cache-directory

		// get global instance of MakePDF
		MakePDF mpdf = (MakePDF) this.getServletContext().getAttribute("digilib.servlet.MakePDF"); 

		
		if (mpdf==null){
			mpdf = new MakePDF();
			logger.debug("didn't find MakePDF-Object");
		}
		
		String filename = this.cache_directory + this.getDocumentId(request);
		
		logger.debug("createFile is going to create file "+filename);

		mpdf.doCreate(request,response,filename);  // set the parameters and ... 
		mpdf.run();                                // ... start generating the pdf
		//new Thread(mpdf,"MakePDF").start();
	}
}