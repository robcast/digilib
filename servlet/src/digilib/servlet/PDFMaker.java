package digilib.servlet;

import java.io.File;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServlet;

import org.apache.log4j.Logger;




/**
 * A Runnable that creates the PDFWorker and moves completed files from a temporary location
 *  (defined in PDFCache) to the cache directory.
 * 
 * @author cmielack
 *
 */
@SuppressWarnings("serial")
public class PDFMaker extends HttpServlet implements Runnable {

	public static String version = "0.1";
	
	private PDFJobInformation job_info = null;
	private String filename = null;
	private DigilibConfiguration dlConfig = null;
	private ServletContext context = null;

	/** gengeral logger for this class */
	protected static Logger logger = Logger.getLogger("digilib.PDFMaker");

	
	
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

		PDFCache pdfcache = (PDFCache) context.getAttribute(PDFCache.instanceKey);
		
		File tempfile = pdfcache.getTempFile(filename);
		// create PDFWorker
		DigilibPDFWorker pdf_worker = new DigilibPDFWorker(dlConfig, job_info, tempfile);
		
		// run PDFWorker
		pdf_worker.run();

		if(pdf_worker.hasError()){
			// raise error, write to logger
			logger.error(pdf_worker.getError().getMessage());
			tempfile.delete();
			return;
		}
		else{ // move the completed file to the cache directory
			boolean success = tempfile.renameTo(pdfcache.getCacheFile(filename));
			if(!success){
				// TODO raise error
			}
		}
		
	}
	
}
