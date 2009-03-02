package digilib.servlet;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class PDFCache extends RequestHandler {

	private DigilibConfiguration dlConfig = null;
	
	public static String cache_directory = "cache/";  // TODO set using dlConfig
	
	public static String cache_hash_id = "digilib.servlet.PDFCache";
	
	HashMap<String,Integer> cache_hash = null;
	
	
	public static Integer STATUS_DONE = 0;  	// document exists in cache

	public static Integer STATUS_WIP = 1;  		// document is "work in progress"
	
	public static Integer STATUS_NONEXISTENT = 2;  	// document does not exist in cache and is not in progress
	
	public static Integer STATUS_ERROR = 3;     // an error occurred while processing the request
	
	public static String version = "0.2";
	
	// TODO functionality for the pre-generation of complete books/chapters using default values
	// TODO use DLConfig for default values
	// TODO use JSPs for automatically refreshing waiting-pages and download-pages
	// TODO register the PDFCache instance globally and implement getters for cache_dir 
	
	
	public void init(ServletConfig config) throws ServletException{
		
		super.init(config);
		
		
		
		logger.info("initialized PDFCache v."+version);
		
		// create and register hashtable
		ServletContext context = config.getServletContext();
		
		dlConfig = (DigilibConfiguration) context.getAttribute("digilib.servlet.configuration");
		
		if (dlConfig == null) {
			// no Configuration
			throw new ServletException("No Configuration!");
		}
		
		context.setAttribute(cache_hash_id, new HashMap<String,Integer>());
		
		cache_hash = (HashMap<String,Integer>) context.getAttribute(cache_hash_id);

		if (cache_hash==null){
			cache_hash = new HashMap<String,Integer>();
			context.setAttribute(cache_hash_id, cache_hash);
		}
		
		// scan the directory
		scanCacheDirectory();
		
	}
	
	
	public void scanCacheDirectory(){
		// search the cache-directory for existing files and fill them into the Hashtable as STATUS_DONE

		ServletContext context = this.getServletContext();
		HashMap<String,Integer> cache_hash = (HashMap<String,Integer>) context.getAttribute(cache_hash_id);

		File cache_dir = new File(cache_directory);
		String[] cached_files = cache_dir.list();
		
		
		for (String file: cached_files){
			String docid = file.substring(0,file.length()-4);
			logger.debug("docid = "+docid);
			if (file.endsWith(".pdf") && !cache_hash.containsKey(docid)){
				logger.debug("PDFCache reads in "+file);
				cache_hash.put(file, STATUS_DONE);
			}
		}
	}
	
	
	
	@Override
	public void processRequest(HttpServletRequest request,
			HttpServletResponse response) {

		// evaluate request ( make a PDFJobDeclaration , get the DocumentId)
		PDFJobInformation pdfji = new PDFJobInformation(dlConfig); 
		pdfji.setWithRequest(request);
		
		
		String docid = pdfji.getDocumentId();
		
		
		int status = getStatus(docid);
		
		
		
		if(status == STATUS_NONEXISTENT){
			createNewPdfDocument(pdfji, docid); 
			informUser(status, docid, response);
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
			informUser(status, docid, response);			
		}
	}


	public void informUser(int status, String documentid, HttpServletResponse response){
		// depending on the documents status, redirect the user to an appropriate waiting- or download-site
		// TODO
		
		if(status == STATUS_NONEXISTENT){
			// tell the user that the document has to be created before he/she can download it
			logger.debug("PDFCache: "+documentid+" has STATUS_NONEXISTENT.");
		}
		else if(status == STATUS_WIP){
			logger.debug("PDFCache: "+documentid+" has STATUS_WIP.");

			// estimate remaining work time
			// tell the user he/she has to wait
		}
		else if(status == STATUS_DONE){
			logger.debug("PDFCache: "+documentid+" has STATUS_DONE.");

		// do nothing or refresh
		}
		else {
			logger.debug("PDFCache: "+documentid+" has STATUS_ERROR.");

			// status == STATUS_ERROR
			// an error must have occured; show error page
		}
	
	}

	
	/** check the status of the document corresponding to the documentid */
	public Integer getStatus(String documentid){
		// rescan directory?  might be useful if more than one instance uses the same cache directory ;  Problem: wip-files occur in the list
		if(cache_hash.containsKey(documentid))
			return cache_hash.get(documentid);
		else
			return STATUS_NONEXISTENT;
	}


	public void createNewPdfDocument(PDFJobInformation pdfji, String filename){
		// start new worker
		PDFMaker pdf_maker = new PDFMaker(dlConfig, cache_hash, pdfji,filename);
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
}
