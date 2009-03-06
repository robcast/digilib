package digilib.servlet;

import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;


/** 
 * A container class for storing a set of instructional parameters 
 * used for content generating classes like MakePDF.  
 * 
 * 
 * @author cmielack
 *
 */



public class PDFJobInformation extends ParameterMap {

	String[] parameter_list = {"pgs"};//{"fn","pgs","dw","dh"};
	/*,
			"wx", "wy", "ww", "wh", "ws", 
			"mo", "rot", "cont", "brgt", "rgbm", "rbgm", 
			"ddpi", "ddpix", "ddpiy", "scale"};*/
	
	
	ImageJobInformation image_info = null;
	DigilibConfiguration dlConfig = null;
	/** gengeral logger for this class */
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	
	public PDFJobInformation(DigilibConfiguration dlcfg) {
		super(30);
		
		// url of the page/document (second part)
//		newParameter("fn", "", null, 's');
		// page number
		newParameter("pgs", "", null, 's');
		// width of client in pixels
//		newParameter("dw", new Integer(0), null, 's');
		// height of client in pixels
//		newParameter("dh", new Integer(0), null, 's');
		// left edge of image (float from 0 to 1)
/*		newParameter("wx", new Float(0), null, 's');
		// top edge in image (float from 0 to 1)
		newParameter("wy", new Float(0), null, 's');
		// width of image (float from 0 to 1)
		newParameter("ww", new Float(1), null, 's');
		// height of image (float from 0 to 1)
		newParameter("wh", new Float(1), null, 's');
		// scale factor
		newParameter("ws", new Float(1), null, 's');
		// special options like 'fit' for gifs
		newParameter("mo", "", null, 's');
		// rotation angle (degree)
		newParameter("rot", new Float(0), null, 's');
		// contrast enhancement factor
		newParameter("cont", new Float(0), null, 's');
		// brightness enhancement factor
		newParameter("brgt", new Float(0), null, 's');
		// color multiplicative factors
		newParameter("rgbm", "0/0/0", null, 's');
		// color additive factors
		newParameter("rgba", "0/0/0", null, 's');
		// display dpi resolution (total)
		newParameter("ddpi", new Float(0), null, 's');
		// display dpi X resolution
		newParameter("ddpix", new Float(0), null, 's');
		// display dpi Y resolution
		newParameter("ddpiy", new Float(0), null, 's');
		// scale factor for mo=ascale
		newParameter("scale", new Float(1), null, 's');
*/
		/*
		 * Parameters of type 'i' are not exchanged between client and server,
		 * but are for the servlets or JSPs internal use.
		 */

/*		// url of the page/document (first part, may be empty)
		newParameter("request.path", "", null, 'i');
		// base URL (from http:// to below /servlet)
		newParameter("base.url", null, null, 'i');
		// DocuImage instance for this request
*/
		/*
		 * Parameters of type 'c' are for the clients use
		 */

/*		// "real" filename
		newParameter("img.fn", "", null, 'c');
		// image dpi x
		newParameter("img.dpix", new Integer(0), null, 'c');
		// image dpi y
		newParameter("img.dpiy", new Integer(0), null, 'c');
		// hires image size x
		newParameter("img.pix_x", new Integer(0), null, 'c');
		// hires image size y
		newParameter("img.pix_y", new Integer(0), null, 'c');
		// total number of pages
		newParameter("pt", new Integer(0), null, 'c');
		// display level of digilib (0 = just image, 1 = one HTML page
		// 2 = in frameset, 3 = XUL-'frameset'
		// 4 = XUL-Sidebar )
		newParameter("lv", new Integer(2), null, 'c');
		// marks
		newParameter("mk", "", null, 'c');
*/	
		dlConfig = dlcfg;
		
	}

	public void setWithRequest(HttpServletRequest request) {
		image_info = new ImageJobInformation(dlConfig);
		image_info.setWithRequest(request);
		
		for (String param : parameter_list){
			if (request.getParameterMap().containsKey(param)){
				setValueFromString(param, request.getParameter(param));
			}
		}
	}
	
	public String getDocumentId(){
		String id;

		// TODO use complete request information for id generation
		
		if(this.image_info!=null){
			String fn = image_info.getAsString("fn");
			String dh = image_info.getAsString("dh");
			String pgs = getAsString("pgs");
			
			id = "fn=" + fn + "&dh=" + dh + "&pgs=" + pgs + ".pdf";		
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
	
	public Integer[] getPageNrs() throws Exception{
		ArrayList<Integer> pgs=new ArrayList<Integer>(); 
		Integer[] numarray = null;

		String intervals[] = getAsString("pgs").split(",");
		
		// convert the page-interval-strings into a list containing every single page
		for(String interval: intervals){
			if(interval.indexOf("-") > 1){
				String nums[] = interval.split("-");
				
//				if(nums.length!=2){
//					throw new Exception("Malformed pageset expression: "+getAsString("pgs"));
//				}
				
				for(int i=Integer.valueOf(nums[0]); i <= Integer.valueOf(nums[1]); i++){
					pgs.add(i);
				}
			}
			else if (interval.indexOf("-") < 0){
				pgs.add(Integer.valueOf(interval));
			}
//			else{
//				throw new Exception("Malformed pageset expression: "+getAsString("pgs"));
//			}
		}

		pgs.toArray(numarray);
		return numarray;
	}
	
	
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
	
}