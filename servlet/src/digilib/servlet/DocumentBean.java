/* DocumentBean -- Access control bean for JSP

  Digital Image Library servlet components

  Copyright (C) 2001, 2002, 2003 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*/

package digilib.servlet;

import java.util.List;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import digilib.Utils;
import digilib.auth.AuthOpException;
import digilib.auth.AuthOps;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.FileOps;

public class DocumentBean {

	// Utils object for logging
	private Utils util = new Utils(0);
	// AuthOps object to check authorization
	private AuthOps authOp;
	// FileOps object
	private FileOps fileOp = new FileOps(util);
	// use authorization database
	private boolean useAuthentication = true;
	// path to add for authenticated access
	private String authURLPath = "";
	// DocuDirCache
	private DocuDirCache dirCache = null;

	// DigilibConfiguration object
	private DigilibConfiguration dlConfig;

	/**
	 * Constructor for DocumentBean.
	 */
	public DocumentBean() {
		super();
	}

	public DocumentBean(ServletConfig conf) {
		try {
			setConfig(conf);
		} catch (Exception e) {
			util.dprintln(2, "ERROR: Unable to read config: " + e.toString());
		}
	}

	public void setConfig(ServletConfig conf) throws ServletException {
		util.dprintln(10, "setConfig");
		// get our ServletContext
		ServletContext context = conf.getServletContext();
		// see if there is a Configuration instance
		dlConfig =
			(DigilibConfiguration) context.getAttribute(
				"digilib.servlet.configuration");
		if (dlConfig == null) {
			// create new Configuration
			try {
				dlConfig = new DigilibConfiguration(conf);
				context.setAttribute("digilib.servlet.configuration", dlConfig);
			} catch (Exception e) {
				throw new ServletException(e);
			}
		}

		// get util
		util = dlConfig.getUtil();
		// get cache
		dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");

		/*
		 *  authentication
		 */
		useAuthentication = dlConfig.getAsBoolean("use-authorization");
		authOp = (AuthOps) dlConfig.getValue("servlet.auth.op");
		authURLPath = dlConfig.getAsString("auth-url-path");
	}

	/**
	 *  check if the request must be authorized to access filepath
	 */
	public boolean isAuthRequired(DigilibRequest request)
		throws AuthOpException {
		util.dprintln(10, "isAuthRequired");
		return useAuthentication ? authOp.isAuthRequired(request) : false;
	}

	/**
	 *  check if the request is allowed to access filepath
	 */
	public boolean isAuthorized(DigilibRequest request)
		throws AuthOpException {
		util.dprintln(10, "isAuthorized");
		return useAuthentication ? authOp.isAuthorized(request) : true;
	}

	/**
	 *  return a list of authorization roles needed for request
	 *  to access the specified path
	 */
	public List rolesForPath(DigilibRequest request) throws AuthOpException {
		util.dprintln(10, "rolesForPath");
		return useAuthentication ? authOp.rolesForPath(request) : null;
	}

	/**
	 * check request authorization against a list of roles
	 */
	public boolean isRoleAuthorized(List roles, DigilibRequest request) {
		util.dprintln(10, "isRoleAuthorized");
		return useAuthentication
			? authOp.isRoleAuthorized(roles, request)
			: true;
	}

	/**
	 * check for authenticated access and redirect if necessary
	 */
	public boolean doAuthentication(
		DigilibRequest request,
		HttpServletResponse response)
		throws Exception {
		util.dprintln(10, "doAuthentication");
		if (!useAuthentication) {
			// shortcut if no authentication
			return true;
		}
		// check if we are already authenticated
		if (((HttpServletRequest) request.getServletRequest()).getRemoteUser()
			== null) {
			util.dprintln(3, "unauthenticated so far");
			// if not maybe we must?
			if (isAuthRequired(request)) {
				util.dprintln(3, "auth required, redirect");
				// we are not yet authenticated -> redirect
				response.sendRedirect(
					authURLPath
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
	 *  get the first page number in the directory
	 *  (not yet functional)
	 */
	public int getFirstPage(DigilibRequest request) {
		util.dprintln(10, "getFirstPage");
		return 1;
	}

	/**
	 *  get the number of pages/files in the directory
	 */
	public int getNumPages(DigilibRequest request) throws Exception {
		util.dprintln(10, "getNumPages");
		DocuDirectory dd =
			(dirCache != null)
				? dirCache.getDirectory(request.getFilePath())
				: null;
		if (dd != null) {
			return dd.size();
		}
		return 0;
	}

	/**
	 * Returns the dlConfig.
	 * @return DigilibConfiguration
	 */
	public DigilibConfiguration getDlConfig() {
		return dlConfig;
	}

}
