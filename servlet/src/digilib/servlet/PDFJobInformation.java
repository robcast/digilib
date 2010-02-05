package digilib.servlet;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.ArrayList;

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;


/** 
 * A container class for storing a set of instructional parameters 
 * used for content generator classes like MakePDF.  
 * 
 * 
 * @author cmielack
 *
 */



public class PDFJobInformation extends ParameterMap {

	String[] parameter_list = {"pgs"}; // all other parameters get passed into an extra ImageJobInformation  
									   // (this should be redesigned later...)
	
	
	ImageJobInformation image_info = null;
	DigilibConfiguration dlConfig = null;
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
		image_info = new ImageJobInformation(dlConfig);
		image_info.setWithRequest(request);
		
		for (String param : parameter_list){
			if (request.getParameterMap().containsKey(param)){
				setValueFromString(param, request.getParameter(param));
			}
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

	
	public ImageJobInformation getImageJobInformation(){
		ImageJobInformation new_image_info = (ImageJobInformation) image_info.clone();
		return new_image_info;
	}
	
	
	/**
	 *	Convert the "pgs"-Parameter to an Array of Integers.	
	 *
	 * @return
	 * @throws Exception
	 */
	public Integer[] getPageNrs() throws Exception{
		
		String pages =	getAsString("pgs");
		ArrayList<Integer> pgs = new ArrayList<Integer>();
		Integer[] out = null;
		
		String intervals[] = pages.split(",");
		
		
		// convert the page-interval-strings into a list containing every single page
		for(String interval: intervals){
			if(interval.indexOf("-") > -1){
				String nums[] = interval.split("-");
				
				for(int i=Integer.valueOf(nums[0]); i <= Integer.valueOf(nums[1]); i++){
					pgs.add(i);
				}
			}
			else{
				pgs.add(Integer.valueOf(interval));
			}
		}
		out = new Integer[pgs.size()];

		pgs.toArray(out);
		return out;
	}
	
	
	/**
	 * Check parameters for validity.
	 * Returns true if no errors are found.
	 * 
	 * @return
	 */
	public boolean checkValidity(){
		String pgs = getAsString("pgs");
		try{
				String[] intervals = null;
				if(pgs.indexOf(",")>0){
					intervals = pgs.split(",");
				}
				else{
					intervals = new String[1];
					intervals[0]=pgs;
				}
				for(String interval:intervals){
					if(interval.indexOf("-")>=0){
						String[] intrvl = interval.split("-");
						int a = Integer.valueOf(intrvl[0]);
						int b = Integer.valueOf(intrvl[1]);
						if(a<=0 || b<a){
							return false;
						}
					}
					else {
						int c = Integer.valueOf(interval);
						if(c<=0)
							return false;
						
					}
				}
		}
		catch(Exception e){
			logger.error("invalid pgs-input");
			return false;
		}
		return true;
	}
	
	public DigilibConfiguration getDlConfig(){
		return dlConfig;
	}
	
}