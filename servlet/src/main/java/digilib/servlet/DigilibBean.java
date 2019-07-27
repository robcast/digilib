package digilib.servlet;

/*
 * #%L
 * 
 * DocumentBean -- digilib config access bean for JSP
 *
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2016 MPIWG Berlin
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
 */

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.auth.AuthOpException;
import digilib.auth.AuthzOps;
import digilib.conf.DigilibServletConfiguration;
import digilib.conf.DigilibServletRequest;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.ImageSet;

/**
 * Java bean providing access to digilib configuration for JSPs.
 * 
 * @author robcast
 *
 */
public class DigilibBean {

	// general logger
	private static Logger logger = Logger.getLogger("digilib.digibean");

	// AuthOps object to check authorization
	private AuthzOps authzOp;

	// use authorization database
	private boolean useAuthorization = true;

	// DocuDirCache
	private DocuDirCache dirCache = null;

	// DigilibConfiguration object
	private DigilibServletConfiguration dlConfig = null;

	// current DigilibRequest object
	private DigilibServletRequest dlRequest = null;
	
	// current DocuDirectory
	private DocuDirectory dlDir = null;
	
	// current FileSet
	private ImageSet dlImgset = null;
	
	// current Filepath
	private String dlFn = null;

	/**
	 * Constructor for DigilibBean.
	 */
	public DigilibBean() {
        logger.debug("new DigilibBean");
	}

	public DigilibBean(ServletConfig conf) {
        logger.debug("new DigilibBean");
		try {
			setConfig(conf);
		} catch (Exception e) {
			logger.fatal("ERROR: Unable to set config: ", e);
		}
	}

	public void setConfig(ServletConfig conf) throws ServletException {
		logger.debug("setConfig");
		// get our ServletContext
		ServletContext context = conf.getServletContext();
		// see if there is a Configuration instance
		dlConfig = DigilibServletConfiguration.getCurrentConfig(context);
		if (dlConfig == null) {
			// no config
			throw new ServletException("ERROR: No digilib configuration for DigilibBean!");
		}
		// get cache
		dirCache = (DocuDirCache) dlConfig.getValue(DigilibServletConfiguration.DIR_CACHE_KEY);

		/*
		 * authentication
		 */
		useAuthorization = dlConfig.getAsBoolean("use-authorization");
		authzOp = (AuthzOps) dlConfig.getValue("servlet.authz.op");
		if (useAuthorization && (authzOp == null)) {
			throw new ServletException("ERROR: use-authorization configured but no AuthzOp!");
		}
	}

	/**
	 * Returns if authorization is configured.
	 * 
	 * @return use authorization
	 */
	public boolean isUseAuthorization() {
	    return this.useAuthorization;
	}
	
    /**
     * check if the request must be authorized to access filepath
     * @return is auth required
     * @throws AuthOpException on error
     */
    public boolean isAuthRequired() throws AuthOpException {
        return isAuthRequired(dlRequest);
    }

    /**
	 * check if the request must be authorized to access filepath
	 * @param request the DigilibServletRequest
	 * @return is auth required
	 * @throws AuthOpException on error
	 */
	public boolean isAuthRequired(DigilibServletRequest request) throws AuthOpException {
		logger.debug("isAuthRequired");
		return useAuthorization ? authzOp.isAuthorizationRequired(request) : false;
	}

    /**
     * check if the request is allowed to access filepath
     * @return is authorized
     * @throws AuthOpException on error
     */
    public boolean isAuthorized() throws AuthOpException {
        return isAuthorized(dlRequest);
    }
    
	/**
	 * check if the request is allowed to access filepath
	 * @param request the DigilibServletRequest
	 * @return is authorized
	 * @throws AuthOpException on error
	 */
	public boolean isAuthorized(DigilibServletRequest request) throws AuthOpException {
		logger.debug("isAuthorized");
		return useAuthorization ? authzOp.isAuthorized(request) : true;
	}

	/**
	 * check for authenticated access and redirect if necessary
	 * @param response the HttpServletResponse
	 * @return true
	 * @throws Exception on error
	 */
	public boolean doAuthentication(HttpServletResponse response) throws Exception {
        logger.debug("doAuthentication-Method");
		return doAuthentication(dlRequest, response);
	}

	/**
	 * check for authenticated access and redirect if necessary
	 * @param request the DigilibServletRequest
	 * @param response the HttpServletResponse
	 * @return true
	 * @throws Exception on error
	 */
	public boolean doAuthentication(DigilibServletRequest request, HttpServletResponse response) 
	        throws Exception {
		logger.debug("doAuthentication");
		if (!useAuthorization) {
			// shortcut if no authorization
			return true;
		}
		/* quick fix: add auth-url-path to base.url
        if (isAuthRequired(request)) {
            String baseUrl = request.getAsString("base.url");
            if (!baseUrl.endsWith(authURLPath)) {
                request.setValue("base.url", baseUrl + "/" + authURLPath);
            }
        }
		// check if we are already authenticated
		if (((HttpServletRequest) request.getServletRequest()).getRemoteUser() == null) {
			logger.debug("unauthenticated so far");
			// if not maybe we must?
			if (isAuthRequired(request)) {
				logger.debug("auth required, redirect");
				// we are not yet authenticated -> redirect
				response.sendRedirect(request.getAsString("base.url")
						+ ((HttpServletRequest) request.getServletRequest())
								.getServletPath()
						+ "?"
						+ ((HttpServletRequest) request.getServletRequest())
								.getQueryString());
			}
		}
		*/
		return true;
	}


   /**
     * Sets the current DigilibRequest using a HttpServletRequest. 
     * 
     * @param request the HttpServletRequest
     * @throws Exception on error
     */
    public void setRequest(HttpServletRequest request) throws Exception {
        // create dlRequest
        DigilibServletRequest dlRequest = new DigilibServletRequest(request, dlConfig);
        // use for initialisation
        setRequest(dlRequest);
    }
	
	/**
	 * Sets the current DigilibRequest.
	 * 
	 * @param dlRequest
	 *            The dlRequest to set.
	 * @throws Exception on error
	 */
	public void setRequest(DigilibServletRequest dlRequest) throws Exception {
		this.dlRequest = dlRequest;
        this.dlFn = dlRequest.getFilePath();
		if (dirCache != null) {
		    // get information about the file(set)
		    dlImgset = (ImageSet) dirCache.getFile(dlFn, dlRequest.getAsInt("pn"));
		    if (dlImgset != null) {
	            // get information about the directory
	            dlDir = dirCache.getDirectory(dlFn);
		    } else {
		        dlDir = null;
		    }
		} else {
	        dlImgset = null;
	        dlDir = null;
		}
	}

	/**
	 * get the number of pages/files in the directory
	 * @return the num pages
	 * @throws Exception on error
	 */
	public int getNumPages() throws Exception {
        logger.debug("getNumPages");
	    if (dlDir != null) {
	        return dlDir.size();
	    }
        return 0;
	}

    /**
     * get the number of image pages/files in the directory
     * @param request the DigilibServletRequest
     * @return the num pages
     * @throws Exception on error
     */
    public int getNumPages(DigilibServletRequest request) throws Exception {
        setRequest(request);
        return getNumPages();
    }

    /**
     * Returns the current DocuDirectory.
     * 
     * @return the DocuDirectory
     */
    public DocuDirectory getDirectory() {
        return dlDir;
    }
    
    /**
     * Returns the current ImageSet.
     * 
     * @return the ImageSet
     */
    public ImageSet getImageSet() {
        return dlImgset;
    }
    
    /**
     * Returns the current filepath (fn).
     * 
     * @return the fn
     */
    public String getFilepath() {
        return dlFn;
    }
    

	/**
	 * Returns the dlConfig.
	 * 
	 * @return the DigilibConfiguration
	 */
	public DigilibServletConfiguration getDlConfig() {
		return dlConfig;
	}

    /**
     * Returns the dlRequest.
     * 
     * @return the DigilibServletRequest
     */
    public DigilibServletRequest getRequest() {
        return dlRequest;
    }

}
