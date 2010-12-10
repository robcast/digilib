package digilib.servlet;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.ArrayList;

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;

import digilib.io.DocuDirectory;
import digilib.io.FileOps;


/** 
 * A container class for storing a set of instruction parameters 
 * used for content generator classes like MakePDF.  
 * 
 * 
 * @author cmielack
 *
 */
@SuppressWarnings("serial")
public class PDFJobInformation extends ParameterMap {

	String[] parameter_list = {"pgs"}; // all other parameters get passed into an extra ImageJobInformation  
									   // (this should be redesigned later...)
	
	
	ImageJobDescription image_info = null;
	DigilibConfiguration dlConfig = null;
	NumRange pages = null;
	/** gengeral logger for this class */
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	
	/**
	 * Initialize the PDFJobInformation
	 * 
	 * @param dlcfg			
	 * 						The DigilibConfiguration. 
	 */
	public PDFJobInformation(DigilibConfiguration dlcfg) {
		super(30);

		// page numbers
		newParameter("pgs", "", null, 's');
		dlConfig = dlcfg;
		
	}

	
	/**
	 * Read in the request object.
	 * 
	 * @param request
	 */
	public void setWithRequest(HttpServletRequest request) {
		image_info = new ImageJobDescription(dlConfig);
		// FIXME: image_info.setWithRequest(request);
		
		for (String param : parameter_list){
			if (request.getParameterMap().containsKey(param)){
				setValueFromString(param, request.getParameter(param));
			}
		}
		// process parameters
		try {
            pages = new NumRange(getAsString("pgs"));
            DocuDirectory dir = image_info.getFileDirectory();
            int dirsize = dir.size(FileOps.CLASS_IMAGE);
            pages.setMaxnum(dirsize);
        } catch (Exception e) {
            logger.warn("Problem with parsing page numbers: "+e.toString());
        }
	}
	
	
	/**
	 * Generate the filename of the pdf to be created.
	 * 
	 * @return
	 */
	public String getDocumentId(){
		String id;

		// TODO use complete request information for id generation
		
		if(this.image_info!=null){
			String fn = image_info.getAsString("fn");
			String dh = image_info.getAsString("dh");
			String pgs = getAsString("pgs");
			
			id = "fn=" + fn + "&dh=" + dh + "&pgs=" + pgs + ".pdf";
			// make safe to use as filename by urlencoding
			try {
                id = URLEncoder.encode(id, "UTF-8");
            } catch (UnsupportedEncodingException e) {
                // TODO Auto-generated catch block
                e.printStackTrace();
            }
		}
		else {
			id = null;
		}
		
		return id;
	}

	
	public ImageJobDescription getImageJobInformation(){
		ImageJobDescription new_image_info = new ImageJobDescription(image_info, dlConfig);
		return new_image_info;
	}
	
	
	public NumRange getPages() {
	    return pages;
	}
	
	
	/**
	 * Check parameters for validity.
	 * Returns true if no errors are found.
	 * 
	 * @return
	 */
	public boolean checkValidity(){
	    if (pages != null) {
	        return true;
	    }
	    return false;
	} 
	
	public DigilibConfiguration getDlConfig(){
		return dlConfig;
	}
	
}