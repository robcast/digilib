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

	private PDFJobInformation job_info = null;
	private String filename = null;
	private DigilibConfiguration dlConfig = null;
	

	/** gengeral logger for this class */
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	
	
	public PDFMaker(DigilibConfiguration dlConfig, PDFJobInformation pdfji, String filename){
		this.job_info = pdfji;
		this.filename = filename;
		this.dlConfig = dlConfig;
	}
	

	
	
	public void run() {

		if (! DigilibWorker.canRun()) {
			// TODO include the logger
			logger.error("Servlet overloaded!");
			
			return;
		}

		// create PDFWorker
		DigilibPDFWorker pdf_worker = new DigilibPDFWorker(dlConfig, job_info, filename);
		
		// run PDFWorker
		pdf_worker.run();

		File document = new File(PDFCache.temp_directory + filename);

		if(pdf_worker.hasError()){
			// raise error, write to logger
			logger.error("@@@@ "+pdf_worker.getError().getMessage());
			document.delete();
			return;
		}
		else{
			boolean success = document.renameTo(new File(PDFCache.cache_directory, filename));
			if(!success){
				// TODO raise error
				
			}
		}
		
	}

	
	
}
