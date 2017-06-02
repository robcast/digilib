package digilib.servlet;

/*
 * #%L
 * 
 * Texter.java -- Servlet for displaying text
 * 
 * Digital Image Library servlet components
 * %%
 * Copyright (C) 2003 - 2013 MPIWG Berlin
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Author: Robert Casties (robcast@berlios.de)
 * Created on 15.09.2003
 */

import java.io.IOException;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.auth.AuthzOps;
import digilib.conf.DigilibServletConfiguration;
import digilib.conf.DigilibServletRequest;
import digilib.conf.TextServletConfiguration;
import digilib.image.ImageOpException;
import digilib.io.DocuDirCache;
import digilib.io.FileOps;
import digilib.io.TextFile;

/**
 * Servlet for displaying text
 * 
 * 
 * @author casties
 *  
 */
public class Texter extends HttpServlet {

    private static final long serialVersionUID = 6678666342141409867L;

    /** Servlet version */
	public static String tlVersion = TextServletConfiguration.getClassVersion();

	/** DigilibConfiguration instance */
	protected DigilibServletConfiguration dlConfig = null;

	/** general logger */
	protected Logger logger = Logger.getLogger("digilib.texter");

    /** logger for accounting requests */
    protected static Logger accountlog = Logger.getLogger("account.texter.request");

	/** FileOps instance */
    protected FileOps fileOp;

	/** AuthOps instance */
    protected AuthzOps authzOp;

	/** DocuDirCache instance */
    protected DocuDirCache dirCache;

	/** use authentication */
    protected boolean useAuthorization = false;

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
		dlConfig = TextServletConfiguration.getCurrentConfig(context);
		if (dlConfig == null) {
			// no Configuration
			throw new ServletException("No Configuration!");
		}
		// say hello in the log file
		logger.info("***** Digital Image Library Text Servlet (version "
				+ tlVersion + ") *****");

		// set our AuthOps
		useAuthorization = dlConfig.getAsBoolean("use-authorization");
		authzOp = (AuthzOps) dlConfig.getValue(DigilibServletConfiguration.AUTHZ_OP_KEY);
		// DocuDirCache instance
		dirCache = (DocuDirCache) dlConfig.getValue(TextServletConfiguration.TEXT_DIR_CACHE_KEY);
        // configure ServletOps
        ServletOps.setDlConfig(dlConfig);        
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest,
	 *      javax.servlet.http.HttpServletResponse)
	 */
	protected void doGet(HttpServletRequest request,
			HttpServletResponse response) throws ServletException, IOException {
        accountlog.info("GET from " + request.getRemoteAddr());
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
        accountlog.info("POST from " + request.getRemoteAddr());
		// do the processing
		processRequest(request, response);
	}

	protected void processRequest(HttpServletRequest request,
			HttpServletResponse response) {
		
		/*
		 * request parameters
		 */
        // create new request with defaults
        DigilibServletRequest dlRequest = new DigilibServletRequest(request);
		try {
			
			/*
			 * find the file to load/send
			 */
			TextFile f = getTextFile(dlRequest, "/txt");
			if (f != null) {
				ServletOps.sendFile(f.getFile(), null, null, response, logger);
			} else {
				f = getTextFile(dlRequest, "");
				if (f != null) {
					ServletOps.sendFile(f.getFile(), null, null, response, logger);
				} else {
					response.sendError(HttpServletResponse.SC_NOT_FOUND, "Text-File not found!");
					//ServletOps.htmlMessage("No Text-File!", response);
				}
			}
			
		} catch (ImageOpException e) {
            // most likely wrong file format...
            logger.error("ERROR sending text file: ", e);
            try {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
            } catch (IOException e1) {
                logger.error("ERROR sending error: ", e1);
            }
        } catch (IOException e) {
            logger.error("ERROR sending text file: ", e);
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

	protected TextFile getTextFile(DigilibServletRequest dlRequest, String subDirectory) {
		String loadPathName = dlRequest.getFilePath() + subDirectory;
		// find the file(set)
		return (TextFile) dirCache.getFile(loadPathName, dlRequest.getAsInt("pn"));
	}
}