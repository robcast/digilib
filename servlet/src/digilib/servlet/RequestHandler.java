package digilib.servlet;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.image.ImageOpException;

public abstract class RequestHandler extends HttpServlet {

	/** logger for accounting requests */
	protected static Logger accountlog = Logger.getLogger("account.request");

	/** gengeral logger for this class */
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	/** logger for authentication related */
	protected static Logger authlog = Logger.getLogger("digilib.auth");

	
	public void init(ServletConfig config) throws ServletException{
		try {
			super.init(config);
		} catch (ServletException e) {
			e.printStackTrace();
			logger.error(e.getMessage());
		}

		
		
	}
	
	
	public void doGet(HttpServletRequest request, HttpServletResponse response){
		accountlog.info("GET from " + request.getRemoteAddr());
		
		try {
			this.processRequest(request, response);
		} catch (ServletException e) {
			e.printStackTrace();
			logger.error(e.getMessage());
		} catch (ImageOpException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}


	public void doPost(HttpServletRequest request, HttpServletResponse response){
		accountlog.info("POST from " + request.getRemoteAddr());

		try {
			this.processRequest(request, response);
		} catch (ServletException e) {
			e.printStackTrace();
			logger.error(e.getMessage());
		} catch (ImageOpException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	/**
	 * processRequest 
	 * 
	 * evaluate request (,generate content), send content to user
	 * @throws ServletException 
	 * @throws ImageOpException 
	 * 
	 * */
	abstract public void processRequest(HttpServletRequest request, HttpServletResponse response) throws ServletException, ImageOpException;
	
	
	/** send the requested content to the response */
	// abstract public void sendFile(File f, HttpServletResponse response, String filename);
	
	
}
