package digilib.servlet;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;

import digilib.image.ImageJobDescription;
import digilib.io.DocuDirectory;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.util.NumRange;
import digilib.util.OptionsSet;
import digilib.util.ParameterMap;


/** 
 * A container class for storing a set of instruction parameters 
 * used for content generator classes like MakePDF.  
 * 
 * 
 * @author cmielack, casties
 *
 */
public class PDFRequest extends ParameterMap {

	DigilibConfiguration dlConfig = null;
	NumRange pages = null;
	/** general logger for this class */
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	
	/**
	 * Initialize the PDFJobInformation
	 * 
	 * @param dlcfg			
	 * 						The DigilibConfiguration. 
	 */
	public PDFRequest(DigilibConfiguration dlcfg) {
		super(30);
		dlConfig = dlcfg;
	}

	/**
	 * Initialize the PDFJobInformation with a request.
	 * 
	 * @param dlcfg		The DigilibConfiguration. 		
	 * @param request
	 * @throws FileOpException 
	 */
	public PDFRequest(HttpServletRequest request, DigilibConfiguration dlcfg) throws FileOpException {
		super(30);
		dlConfig = dlcfg;
		this.setWithRequest(request);
	}

	
	protected void initParams() {
		// page numbers
		newParameter("pgs", "", null, 's');
		// url of the page/document (second part)
		newParameter("fn", "", null, 's');
		// width of client in pixels
		newParameter("dw", new Integer(0), null, 's');
		// height of client in pixels
		newParameter("dh", new Integer(500), null, 's');
	}
	
	/* (non-Javadoc)
     * @see digilib.servlet.ParameterMap#initOptions()
     */
    @Override
    protected void initOptions() {
        options = (OptionsSet) getValue("mo");
    }

    /**
	 * Read the request object.
	 * 
	 * @param request
	 * @throws FileOpException 
	 */
	public void setWithRequest(HttpServletRequest request) throws FileOpException {
	    // read matching request parameters for the parameters in this map 
		for (String k : params.keySet()) {
			if (request.getParameterMap().containsKey(k)) {
				setValueFromString(k, request.getParameter(k));
			}
		}
		// process parameters
		pages = new NumRange(getAsString("pgs"));
        ImageJobDescription ij = ImageJobDescription.getInstance(this, dlConfig);
        DocuDirectory dir = ij.getFileDirectory();
        int dirsize = dir.size(FileOps.CLASS_IMAGE);
        pages.setMaxnum(dirsize);
	}
	
	
	/**
	 * Generate a filename for the pdf to be created.
	 * 
	 * @return
	 */
	public String getDocumentId(){
		String fn = getAsString("fn");
		String dh = getAsString("dh");
		String dw = getAsString("dw");
		String pgs = getAsString("pgs");
			
		String id = "fn=" + fn + "&dw=" + dw + "&dh=" + dh + "&pgs=" + pgs + ".pdf";
		// make safe to use as filename by urlencoding
		try {
			id = URLEncoder.encode(id, "UTF-8");
		} catch (UnsupportedEncodingException e) {
			// this shouldn't happen
		}
		return id;
	}

	
	public ImageJobDescription getImageJobInformation(){
		return ImageJobDescription.getInstance(this, dlConfig);
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