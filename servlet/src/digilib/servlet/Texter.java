/* Texter.java -- Servlet for displaying text

  Digital Image Library servlet components

  Copyright (C) 2003 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

 * Created on 15.09.2003 by casties
 *
 */
package digilib.servlet;

import java.io.IOException;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import digilib.Utils;
import digilib.auth.AuthOps;
import digilib.io.DocuDirCache;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.TextFile;

/** Servlet for displaying text
 * 
 * @author casties
 *
 */
public class Texter extends HttpServlet {

	/** Servlet version */
	public static String tlVersion = "0.1a1";
	/** DigilibConfiguration instance */
	DigilibConfiguration dlConfig = null;
	/** Utils instance with debuglevel */
	Utils util;
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

	/* (non-Javadoc)
	 * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
	 */
	public void init(ServletConfig config) throws ServletException {
		super.init(config);

		System.out.println(
			"***** Digital Image Library Text Servlet (version "
				+ tlVersion
				+ ") *****");

		// get our ServletContext
		ServletContext context = config.getServletContext();
		// see if there is a Configuration instance
		dlConfig =
			(DigilibConfiguration) context.getAttribute(
				"digilib.servlet.configuration");
		if (dlConfig == null) {
			// create new Configuration
			try {
				dlConfig = new DigilibConfiguration(config);
				context.setAttribute("digilib.servlet.configuration", dlConfig);
			} catch (Exception e) {
				throw new ServletException(e);
			}
		}
		// first we need an Utils
		util = dlConfig.getUtil();
		// set our AuthOps
		useAuthentication = dlConfig.getAsBoolean("use-authorization");
		authOp = (AuthOps) dlConfig.getValue("servlet.auth.op");
		// FileOps instance
		fileOp = new FileOps(util);
		// AuthOps instance
		servletOp = new ServletOps(util);
		// DocuDirCache instance
		dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
	}

	/* (non-Javadoc)
	 * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
	 */
	protected void doGet(
		HttpServletRequest request,
		HttpServletResponse response)
		throws ServletException, IOException {
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// add DigilibRequest to ServletRequest
		request.setAttribute("digilib.servlet.request", dlReq);
		// do the processing
		processRequest(request, response);
	}

	/* (non-Javadoc)
	 * @see javax.servlet.http.HttpServlet#doPost(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
	 */
	protected void doPost(
		HttpServletRequest request,
		HttpServletResponse response)
		throws ServletException, IOException {
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// add DigilibRequest to ServletRequest
		request.setAttribute("digilib.servlet.request", dlReq);
		// do the processing
		processRequest(request, response);
	}

	protected void processRequest(
		HttpServletRequest request,
		HttpServletResponse response)
		throws ServletException, IOException {

		/*
		 *  request parameters
		 */

		DigilibRequest dlRequest =
			(DigilibRequest) request.getAttribute("digilib.servlet.request");

		try {

			/*
			 *  find the file to load/send
			 */

			// get PathInfo
			String loadPathName = dlRequest.getFilePath();
			// find the file(set)
			TextFile fileToLoad =
				(TextFile) dirCache.getFile(
					loadPathName,
					dlRequest.getPn(),
					FileOps.CLASS_TEXT);
			if (fileToLoad == null) {
				throw new FileOpException(
					"File "
						+ loadPathName
						+ "("
						+ dlRequest.getPn()
						+ ") not found.");
			}

			/*
			 * do something with the file
			 */
			 


			/*
			 * send the result
			 */
			 
			servletOp.sendFile(fileToLoad.getFile(), response);
			

		} catch (FileOpException e) {
			util.dprintln(1, "ERROR: File IO Error: " + e);
			try {
				ServletOps.htmlMessage("ERROR: File IO Error: " + e, response);
			} catch (FileOpException ex) {
			} // so we don't get a loop
		}

	}

}
