package digilib.servlet;

import java.io.IOException;
import java.util.HashMap;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletResponse;

public class PDFMaker extends HttpServlet implements Runnable {

	private PDFJobInformation job_info = null;
	private String filename = null;
	private HashMap cache_hash = null;
	private DigilibConfiguration dlConfig = null;
	

/**	public void init(ServletConfig config){
		ServletContext context = config.getServletContext();
		cache_hash = (HashMap<String,Integer>) context.getAttribute(PDFCache.cache_hash_id);
	}*/

	
	public PDFMaker(DigilibConfiguration dlConfig, HashMap cache_hash, PDFJobInformation pdfji, String filename){
		this.cache_hash = cache_hash;
		this.job_info = pdfji;
		this.filename = filename;
		this.dlConfig = dlConfig;
	}
	

	
	
	public void run() {

		if (! DigilibWorker.canRun()) {
			// logger.error("Servlet overloaded!");
			cache_hash.put(filename, PDFCache.STATUS_ERROR);
			return;
		}

		cache_hash.put(filename, PDFCache.STATUS_WIP);
		
		// create PDFWorker
		DigilibPDFWorker pdf_worker = new DigilibPDFWorker(dlConfig, job_info, filename);
		
		// run PDFWorker
		pdf_worker.run();
		
		if(pdf_worker.hasError()){
			cache_hash.put(filename, PDFCache.STATUS_ERROR);
			return;
		}
		cache_hash.put(filename, PDFCache.STATUS_DONE);
	}

	
	
}
