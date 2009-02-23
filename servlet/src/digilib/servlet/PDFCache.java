package digilib.servlet;

import java.io.InputStream;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class PDFCache extends RequestHandler {

	
	public static Integer STATUS_DONE = 0;  	// document exists in cache

	public static Integer STATUS_WIP = 1;  		// document is "work in progress"
	
	public static Integer STATUS_NONEXISTENT = 2;  	// document does not exist in cache and is not in progress
	
	public static Integer STATUS_ERROR = 3;     // an error occurred while processing the request

	
	
	
	@Override
	public void processRequest(HttpServletRequest request,
			HttpServletResponse response) {

		// evaluate request ( make a PDFJobDeclaration , get the DocumentId)
		
		// check, which state the requested document is in (ready, work in progress, non existent) 
		
		// if necessary, initialize document generation (and notify the user)
		
		// send the document
	}

	@Override
	public void sendFile(InputStream is, HttpServletResponse response, String filename) {
		
	}

	public String getDocumentId(PDFJobDeclaration jobdeclaration){
		// generate an unambiguous ID from the request (this is used for filenames etc)
		String id;

		String fn = jobdeclaration.getAsString("fn");
		String dh = jobdeclaration.getAsString("dh");
		String pgs = jobdeclaration.getAsString("pgs");
		
		id = "fn=" + fn + "&dh=" + dh + "&pgs=" + pgs + ".pdf";		

		return id;
	}

	
	/** check the status of the document corresponding to the documentid */
	public Integer getStatus(String documentid){
		
		
		return 0;
	}
}
