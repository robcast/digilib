package digilib.servlet;

import javax.servlet.http.HttpServletRequest;


/** 
 * A container class for storing a set of instructional parameters 
 * used for content generating classes like MakePDF.  
 * 
 * 
 * @author cmielack
 *
 */



public class PDFJobDeclaration extends ParameterMap {

	String[] parameter_list = {"fn","pgs","dw","dh"};/*,
			"wx", "wy", "ww", "wh", "ws", 
			"mo", "rot", "cont", "brgt", "rgbm", "rbgm", 
			"ddpi", "ddpix", "ddpiy", "scale"};*/
	
	public PDFJobDeclaration() {
		super(30);
		
		// url of the page/document (second part)
		newParameter("fn", "", null, 's');
		// page number
		newParameter("pgs", "", null, 's');
		// width of client in pixels
		newParameter("dw", new Integer(0), null, 's');
		// height of client in pixels
		newParameter("dh", new Integer(0), null, 's');
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
		
	}

	public void setWithRequest(HttpServletRequest request) {
		for (String param : parameter_list){
			if (request.getParameterMap().containsKey(param)){
				put(param, request.getAttribute(param));
			}
		}
	}
	
	
}