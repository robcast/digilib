/* Texter.java -- Servlet for displaying text  
 * Digital Image Library servlet components  
 * Copyright (C) 2003 Robert Casties (robcast@mail.berlios.de)
 *  
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.  Please read license.txt for the full details. A copy of
 * the GPL may be found at http://www.gnu.org/copyleft/lgpl.html  
 * You should have received a copy of the GNU General Public License along with this
 * program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA  
 * 
 * Created on 15.09.2003 by casties  
 */

package digilib.servlet;

import java.io.IOException;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.auth.AuthOps;
import digilib.image.ImageOpException;
import digilib.io.DocuDirCache;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.FileOps.FileClass;
import digilib.io.TextFile;

/**
 * Servlet for displaying text
 * 
 * 
 * @author casties
 *  
 */
public class Texter extends HttpServlet {

	private static final long serialVersionUID = -8539178734033662322L;

	/** Servlet version */
	public static String tlVersion = "0.1b2";

	/** DigilibConfiguration instance */
	DigilibConfiguration dlConfig = null;

	/** general logger */
	Logger logger = Logger.getLogger("digilib.texter");

	/** FileOps instance */
	FileOps fileOp;

	/** AuthOps instance */
	AuthOps authOp;

	/** ServletOps instance */
	ServletOps servletOp;

	/** DocuDirCache instance */
	DocuDirCache dirCache;

	/** use authentication */
	boolean useAuthentication = false;

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
	 */
	public void init(ServletConfig config) throws ServletException {
		super.init(config);

		System.out.println("***** Digital Image Library Text Servlet (version "
				+ tlVersion + ") *****");

		// get our ServletContext
		ServletContext context = config.getServletContext();
		// see if there is a Configuration instance
		dlConfig = (DigilibConfiguration) context
				.getAttribute("digilib.servlet.configuration");
		if (dlConfig == null) {
			// no Configuration
			throw new ServletException("No Configuration!");
		}
		// say hello in the log file
		logger.info("***** Digital Image Library Text Servlet (version "
				+ tlVersion + ") *****");

		// set our AuthOps
		useAuthentication = dlConfig.getAsBoolean("use-authorization");
		authOp = (AuthOps) dlConfig.getValue("servlet.auth.op");
		// DocuDirCache instance
		dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest,
	 *      javax.servlet.http.HttpServletResponse)
	 */
	protected void doGet(HttpServletRequest request,
			HttpServletResponse response) throws ServletException, IOException {
		// do the processing
		processRequest(request, response);
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.http.HttpServlet#doPost(javax.servlet.http.HttpServletRequest,
	 *      javax.servlet.http.HttpServletResponse)
	 */
	protected void doPost(HttpServletRequest request,
			HttpServletResponse response) throws ServletException, IOException {
		// do the processing
		processRequest(request, response);
	}

	protected void processRequest(HttpServletRequest request,
			HttpServletResponse response) throws ServletException, IOException {
		
		/*
		 * request parameters
		 */
        // create new request with defaults
        DigilibRequest dlRequest = new DigilibRequest(request);
		try {
			
			/*
			 * find the file to load/send
			 */
			TextFile f = getTextFile(dlRequest, "/txt");
			if (f != null) {
				ServletOps.sendFile(f.getFile(), null, null, response);
			} else {
				f = getTextFile(dlRequest, "");
				if (f != null) {
					ServletOps.sendFile(f.getFile(),	null, null, response);
				} else {
					response.sendError(HttpServletResponse.SC_NOT_FOUND, "Text-File not found!");
					//ServletOps.htmlMessage("No Text-File!", response);
				}
			}
			
		} catch (ImageOpException e) {
			logger.error("ERROR: File IO Error: ", e);
			try {
				ServletOps.htmlMessage("ERROR: File IO Error: " + e, response);
			} catch (FileOpException ex) {
			} // so we don't get a loop
		}
	}
	

	/**
	 * Looks for a file in the given subDirectory.
	 * 
	 * @param dlRequest
	 *            The received request which has the file path.
	 * @param subDirectory
	 *            The subDirectory of the file path where the file should
	 *            be found.
	 * @return The wanted Textfile or null if there wasn't a file.
	 */

	private TextFile getTextFile(DigilibRequest dlRequest, String subDirectory) {
		String loadPathName = dlRequest.getFilePath() + subDirectory;
		// find the file(set)
		return (TextFile) dirCache.getFile(loadPathName, dlRequest
				.getAsInt("pn"), FileClass.TEXT);
	}
}