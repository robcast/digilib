package digilib.servlet;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

public class PDFMaker extends HttpServlet implements Runnable {

	public static String version = "0.1";
	
	private PDFJobInformation job_info = null;
	private String filename = null;
	private DigilibConfiguration dlConfig = null;
	private ServletContext context = null;

	/** gengeral logger for this class */
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	
	
	public PDFMaker(ServletContext context, PDFJobInformation pdfji, String filename){
		this.job_info = pdfji;
		this.filename = filename;
		this.dlConfig = pdfji.getDlConfig();
		this.context = context;
	}
	

	
	
	public void run() {

		if (! DigilibWorker.canRun()) {
			// TODO include the logger
			logger.error("Servlet overloaded!");
			
			return;
		}

		PDFCache pdfcache = (PDFCache) context.getAttribute(PDFCache.global_instance);
		
		// create PDFWorker
		DigilibPDFWorker pdf_worker = new DigilibPDFWorker(dlConfig, job_info, pdfcache.getTempDirectory()+filename);
		
		// run PDFWorker
		pdf_worker.run();

		File document = new File(pdfcache.getTempDirectory() + filename);

		if(pdf_worker.hasError()){
			// raise error, write to logger
			logger.error("@@@@ "+pdf_worker.getError().getMessage());
			document.delete();
			return;
		}
		else{ // move the completed file to the cache directory
			boolean success = document.renameTo(new File(pdfcache.getCacheDirectory(), filename));
			if(!success){
				// TODO raise error
				
			}
		}
		
	}

	
	
}
