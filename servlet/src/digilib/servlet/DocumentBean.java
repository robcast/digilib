/* DocumentBean -- Access control bean for JSP

  Digital Image Library servlet components

  Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)

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


import java.util.*;
import javax.servlet.*;
import javax.servlet.http.*;

import digilib.*;
import digilib.io.*;
import digilib.auth.*;

public class DocumentBean implements AuthOps {

  // Utils object for logging
  private Utils util = new Utils(5);
  // AuthOps object to check authorization
  private AuthOps authOp;
  // FileOps object
  private FileOps fileOp = new FileOps(util);

  // base directories in order of preference (prescaled versions first)
  private String[] baseDirs = {"/docuserver/scaled/small", "/docuserver/images", "/docuserver/scans/quellen"};
  // part of URL path to prepend for authenticated access
  private String authURLpath = "authenticated/";


  public DocumentBean() {
  }

  public void setConfig(ServletConfig conf) throws ServletException {
    util.dprintln(10, "setConfig");
    // servletOps takes a ServletConfig to get the config file name
    ServletOps servletOp = new ServletOps(util, conf);
    /**
     *  basedir-list : List of document directories
     */
    String bl = servletOp.tryToGetInitParam("basedir-list", null);
    if ((bl != null)&&(bl.length() > 0)) {
      // split list into directories
      StringTokenizer dirs = new StringTokenizer(bl, ":");
      int n = dirs.countTokens();
      if (n > 0) {
        // add directories into array
        baseDirs = new String[n];
        for (int i = 0; i < n; i++) {
          baseDirs[i] = dirs.nextToken();
        }
      }
      util.dprintln(3, "basedir-list: "+bl);
    }
    /**
     *  auth-url-path : part of URL to indicate authenticated access
     */
    String au = servletOp.tryToGetInitParam("auth-url-path", null);
    if ((au != null)&&(au.length() > 0)) {
      authURLpath = au;
      util.dprintln(3, "auth-url-path: "+au);
    }
    /**
     *  authentication
     */
    try {
      // DB version
      //private AuthOps authOp = new DBAuthOpsImpl(util);
      // XML version
      String cp = servletOp.tryToGetInitParam("auth-file", "/docuserver/www/digitallibrary/WEB-INF/digilib-auth.xml");
      util.dprintln(3, "auth-file: "+cp);
      authOp = new XMLAuthOps(util, cp);
    } catch (AuthOpException e) {
      throw new ServletException(e);
    }
  }

  public String getDocuPath(HttpServletRequest request) {
    util.dprintln(10, "getDocuPath");
    // fetch query string
    String qs = request.getQueryString();
    String fn = "";
    if (qs != null && qs.length() > 0) {
       // the file name is in the request before the first "+"
       int endfn = qs.indexOf("+");
       if (endfn > 0) {
         fn = qs.substring(0, endfn);
       } else {
	 fn = qs;
       }
    }
    util.dprintln(4, "docuPath: "+fn);
    return fn;
  }

  /**
   *  check if the request must be authorized to access filepath
   */
  public boolean isAuthRequired(HttpServletRequest request) throws AuthOpException {
    util.dprintln(10, "isAuthRequired");
    return authOp.isAuthRequired(getDocuPath(request), request);
  }

  public boolean isAuthRequired(String filepath, HttpServletRequest request) throws AuthOpException {
    util.dprintln(10, "isAuthRequired");
    return authOp.isAuthRequired(filepath, request);
  }

  /**
   *  check if the request is allowed to access filepath
   */
  public boolean isAuthorized(HttpServletRequest request) throws AuthOpException {
    util.dprintln(10, "isAuthorized");
    return authOp.isAuthorized(getDocuPath(request), request);
  }

  public boolean isAuthorized(String filepath, HttpServletRequest request) throws AuthOpException {
    util.dprintln(10, "isAuthorized");
    return authOp.isAuthorized(filepath, request);
  }

  /**
   *  return a list of authorization roles needed for request
   *  to access the specified path
   */
  public List rolesForPath(String filepath, HttpServletRequest request) throws AuthOpException {
    util.dprintln(10, "rolesForPath");
    return authOp.rolesForPath(filepath, request);
  }

  /**
   * check request authorization against a list of roles
   */
  public boolean isRoleAuthorized(List roles, HttpServletRequest request) {
    util.dprintln(10, "isRoleAuthorized");
    return authOp.isRoleAuthorized(roles, request);
  }

  /**
   * check for authenticated access and redirect if necessary
   */
  public boolean doAuthentication(HttpServletRequest request, HttpServletResponse response) throws Exception {
    util.dprintln(10, "doAuthentication");
    // check if we are already authenticated
    if (request.getRemoteUser() == null) {
      util.dprintln(3, "unauthenticated so far");
      // if not maybe we must?
      if (isAuthRequired(request)) {
        util.dprintln(3, "auth required, redirect");
	// we are not yet authenticated -> redirect
	response.sendRedirect(authURLpath+request.getServletPath()+"?"+request.getQueryString());
      }
    }
    return true;
  }

  /**
   *  get the first page number in the directory
   *  (not yet functional)
   */
  public int getFirstPage(HttpServletRequest request) {
    return getFirstPage(getDocuPath(request), request);
  }

  public int getFirstPage(String filepath, HttpServletRequest request) {
    util.dprintln(10, "getFirstPage");
    return 1;
  }

  /**
   *  get the number of pages/files in the directory
   */
  public int getNumPages(HttpServletRequest request) throws Exception {
    return getNumPages(getDocuPath(request), request);
  }

  public int getNumPages(String filepath, HttpServletRequest request) throws Exception {
    util.dprintln(10, "getNumPages");
    return fileOp.getNumFilesVariant(baseDirs, "/"+filepath, true);
  }

}
