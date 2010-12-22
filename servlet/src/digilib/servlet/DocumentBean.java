/*
 * DocumentBean -- Access control bean for JSP
 *
 * Digital Image Library servlet components
 *
 * Copyright (C) 2001, 2002, 2003 Robert Casties (robcast@mail.berlios.de)
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation; either version 2 of the License, or (at your option) any later
 * version.
 *
 * Please read license.txt for the full details. A copy of the GPL may be found
 * at http://www.gnu.org/copyleft/lgpl.html
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 *
 */

package digilib.servlet;

import java.util.List;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.auth.AuthOpException;
import digilib.auth.AuthOps;
import digilib.image.ImageSize;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.FileOps.FileClass;
import digilib.io.ImageFile;
import digilib.io.ImageInput;
import digilib.io.ImageSet;

public class DocumentBean {

	// general logger
	private static Logger logger = Logger.getLogger("digilib.docubean");

	// AuthOps object to check authorization
	private AuthOps authOp;

	// use authorization database
	private boolean useAuthentication = true;

	// path to add for authenticated access
	private String authURLPath = "";

	// DocuDirCache
	private DocuDirCache dirCache = null;

	// DigilibConfiguration object
	private DigilibConfiguration dlConfig;

	// DigilibRequest object
	private DigilibRequest dlRequest = null;

	/**
	 * Constructor for DocumentBean.
	 */
	public DocumentBean() {
        logger.debug("new DocumentBean");
	}

	public DocumentBean(ServletConfig conf) {
        logger.debug("new DocumentBean");
		try {
			setConfig(conf);
		} catch (Exception e) {
			logger.fatal("ERROR: Unable to read config: ", e);
		}
	}

	public void setConfig(ServletConfig conf) throws ServletException {
		logger.debug("setConfig");
		// get our ServletContext
		ServletContext context = conf.getServletContext();
		// see if there is a Configuration instance
		dlConfig = (DigilibConfiguration) context
				.getAttribute("digilib.servlet.configuration");
		if (dlConfig == null) {
			// create new Configuration
			throw new ServletException("ERROR: No configuration!");
		}

		// get cache
		dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");

		/*
		 * authentication
		 */
		useAuthentication = dlConfig.getAsBoolean("use-authorization");
		authOp = (AuthOps) dlConfig.getValue("servlet.auth.op");
		authURLPath = dlConfig.getAsString("auth-url-path");
		if (useAuthentication && (authOp == null)) {
			throw new ServletException(
					"ERROR: use-authorization configured but no AuthOp!");
		}
	}

	/**
	 * check if the request must be authorized to access filepath
	 */
	public boolean isAuthRequired(DigilibRequest request)
			throws AuthOpException {
		logger.debug("isAuthRequired");
		return useAuthentication ? authOp.isAuthRequired(request) : false;
	}

	/**
	 * check if the request is allowed to access filepath
	 */
	public boolean isAuthorized(DigilibRequest request) throws AuthOpException {
		logger.debug("isAuthorized");
		return useAuthentication ? authOp.isAuthorized(request) : true;
	}

	/**
	 * return a list of authorization roles needed for request to access the
	 * specified path
	 */
	public List<String> rolesForPath(DigilibRequest request) throws AuthOpException {
		logger.debug("rolesForPath");
		return useAuthentication ? authOp.rolesForPath(request) : null;
	}

	/**
	 * check request authorization against a list of roles
	 */
	public boolean isRoleAuthorized(List<String> roles, DigilibRequest request) {
		logger.debug("isRoleAuthorized");
		return useAuthentication ? authOp.isRoleAuthorized(roles, request)
				: true;
	}

	/**
	 * check for authenticated access and redirect if necessary
	 */
	public boolean doAuthentication(HttpServletResponse response)
			throws Exception {
        logger.debug("doAuthenication-Method");
		return doAuthentication(dlRequest, response);
	}

	/**
	 * check for authenticated access and redirect if necessary
	 */
	public boolean doAuthentication(DigilibRequest request,
			HttpServletResponse response) throws Exception {
		logger.debug("doAuthentication");
		if (!useAuthentication) {
			// shortcut if no authentication
			return true;
		}
		// check if we are already authenticated
		if (((HttpServletRequest) request.getServletRequest()).getRemoteUser() == null) {
			logger.debug("unauthenticated so far");
			// if not maybe we must?
			if (isAuthRequired(request)) {
				logger.debug("auth required, redirect");
				// we are not yet authenticated -> redirect
				response.sendRedirect(authURLPath
						+ ((HttpServletRequest) request.getServletRequest())
								.getServletPath()
						+ "?"
						+ ((HttpServletRequest) request.getServletRequest())
								.getQueryString());
			}
		}
		return true;
	}

	/**
	 * Sets the current DigilibRequest. Also completes information in the request.
	 * 
	 * @param dlRequest
	 *            The dlRequest to set.
	 */
	public void setRequest(DigilibRequest dlRequest) throws Exception {
		this.dlRequest = dlRequest;
		if (dirCache == null) {
			return;
		}
		String fn = dlRequest.getFilePath();
		// get information about the file
		ImageSet fileset = (ImageSet) dirCache.getFile(fn, dlRequest
				.getAsInt("pn"), FileClass.IMAGE);
		if (fileset == null) {
			return;
		}
		// add file name
		dlRequest.setValue("img.fn", fileset);
		// add dpi
		dlRequest.setValue("img.dpix", new Double(fileset.getResX()));
		dlRequest.setValue("img.dpiy", new Double(fileset.getResY()));
		// get number of pages in directory
		DocuDirectory dd = dirCache.getDirectory(fn);
		if (dd != null) {
			// add pt
			dlRequest.setValue("pt", dd.size());
		}
		// get original pixel size
		ImageInput origfile = fileset.getBiggest();
		// check image for size if mo=hires
		if ((! origfile.isChecked())&&dlRequest.hasOption("hires")) {
			logger.debug("pre-checking image!");
			DigilibConfiguration.docuImageIdentify((ImageFile) origfile);
		}
		ImageSize pixsize = origfile.getSize();
		if (pixsize != null) {
			// add pixel size
			dlRequest.setValue("img.pix_x", new Integer(pixsize.getWidth()));
			dlRequest.setValue("img.pix_y", new Integer(pixsize.getHeight()));
		}
	}

	/**
	 * get the first page number in the directory (not yet functional)
	 */
	public int getFirstPage(DigilibRequest request) {
		logger.debug("getFirstPage");
		return 1;
	}

	/**
	 * get the number of pages/files in the directory
	 */
	public int getNumPages() throws Exception {
		return getNumPages(dlRequest);
	}

    /**
     * get the number of image pages/files in the directory
     */
    public int getNumPages(DigilibRequest request) throws Exception {
        return getNumPages(request, FileClass.IMAGE);
    }

	/**
	 * get the number of pages/files of type fc in the directory
	 */
	public int getNumPages(DigilibRequest request, FileClass fc) throws Exception {
		logger.debug("getNumPages");
		DocuDirectory dd = (dirCache != null) ? dirCache.getDirectory(request
				.getFilePath()) : null;
		if (dd != null) {
			return dd.size(fc);
		}
		return 0;
	}

	/**
	 * Returns the dlConfig.
	 * 
	 * @return DigilibConfiguration
	 */
	public DigilibConfiguration getDlConfig() {
		return dlConfig;
	}

	/**
	 * returns if the zoom area in the request can be moved
	 * 
	 * @return
	 */
	public boolean canMoveRight() {
		float ww = dlRequest.getAsFloat("ww");
		float wx = dlRequest.getAsFloat("wx");
		return (ww + wx < 1.0);
	}

	/**
	 * returns if the zoom area in the request can be moved
	 * 
	 * @return
	 */
	public boolean canMoveLeft() {
		float ww = dlRequest.getAsFloat("ww");
		float wx = dlRequest.getAsFloat("wx");
		return ((ww < 1.0) && (wx > 0));
	}

	/**
	 * returns if the zoom area in the request can be moved
	 * 
	 * @return
	 */
	public boolean canMoveUp() {
		float wh = dlRequest.getAsFloat("wh");
		float wy = dlRequest.getAsFloat("wy");
		return ((wh < 1.0) && (wy > 0));
	}

	/**
	 * returns if the zoom area in the request can be moved
	 * 
	 * @return
	 */
	public boolean canMoveDown() {
		float wh = dlRequest.getAsFloat("wh");
		float wy = dlRequest.getAsFloat("wy");
		return (wh + wy < 1.0);
	}

	/**
	 * @return Returns the dlRequest.
	 */
	public DigilibRequest getRequest() {
		return dlRequest;
	}

}
