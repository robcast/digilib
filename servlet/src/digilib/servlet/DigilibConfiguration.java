/* DigilibConfiguration -- Holding all parameters for digilib servlet.

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

import java.io.File;
import java.util.HashMap;
import java.util.Iterator;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;

import digilib.Utils;
import digilib.auth.AuthOps;
import digilib.auth.XMLAuthOps;
import digilib.image.DocuImage;
import digilib.image.DocuImageImpl;
import digilib.io.DocuDirCache;
import digilib.io.FileOps;
import digilib.io.XMLListLoader;

/** Class to hold the digilib servlet configuration parameters.
 * The parameters can be read from the digilib-config file and be passed to
 * other servlets or beans.<br>
 * errorImgFileName: image file to send in case of error.<br>
 * denyImgFileName: image file to send if access is denied.<br>
 * baseDirs: array of base directories in order of preference (prescaled
 * versions first).<br>
 * useAuth: use authentication information.<br>
 * authConfPath: authentication configuration file.<br>
 * authOp: AuthOps instance for authentication.<br>
 * ...<br>
 * 
 * @author casties
 *
 */
public class DigilibConfiguration extends ParameterMap {
	
	/** DocuImage class instance */
	private Class docuImageClass = null;
	
	/** Utils instance */
	private Utils util = new Utils(5);


	/** Default constructor defines all parameters and their default values.
	 * 
	 */
	public DigilibConfiguration() {
		// create HashMap(20)
		super(20);

		/*
		 * Definition of parameters and default values.
		 * System parameters that are not read from config file have a type 's'.
		 */
		 
		// digilib servlet version
		putParameter("servlet.version", digilib.servlet.Scaler.dlVersion, null, 's');
		// configuration file location
		putParameter("servlet.config.file", null, null, 's');
		// Utils instance
		putParameter("servlet.util", util, null, 's');
		// DocuDirCache instance
		putParameter("servlet.dir.cache", null, null, 's');
		// DocuImage class instance
		putParameter("servlet.docuimage.class", digilib.image.JAIDocuImage.class, null, 's');
		// AuthOps instance for authentication
		putParameter("servlet.auth.op", null, null, 's');

		/*
		 * parameters that can be read from config file have a type 'f'
		 */

		// image file to send in case of error
		putParameter("error-image", "/docuserver/images/icons/scalerror.gif", null, 'f');
		// image file to send if access is denied
		putParameter("denied-image", "/docuserver/images/icons/denied.gif", null, 'f');
		// base directories in order of preference (prescaled versions last)
		String[] bd = { "/docuserver/images", "/docuserver/scaled/small" };
		putParameter("basedir-list", bd, null, 'f');
		// use authentication information
		putParameter("use-authorization", Boolean.TRUE, null, 'f');
		// authentication configuration file
		putParameter("auth-file", "digilib-auth.xml", null, 'f');
		// sending image files as-is allowed
		putParameter("sendfile-allowed", Boolean.TRUE, null, 'f');
		// Debug level
		putParameter("debug-level", new Integer(5), null, 'f');
		// Type of DocuImage instance
		putParameter("docuimage-class", "digilib.image.JAIDocuImage", null, 'f');
		// part of URL used to indicate authorized access
		putParameter("auth-url-path", "authenticated/", null, 'f');
		// degree of subsampling on image load
		putParameter("subsample-minimum", new Float(2f), null, 'f');
		// default scaling quality
		putParameter("default-quality", new Integer(1), null, 'f');
	}

	/** Constructor taking a ServletConfig.
	 * Reads the config file location from an init parameter and loads the
	 * config file. Calls <code>readConfig()</code>.
	 * 
	 * @see readConfig()
	 */
	public DigilibConfiguration(ServletConfig c) throws Exception {
		this();
		readConfig(c);
	}
	
	/**
	 * read parameter list from the XML file in init parameter "config-file"
	 */
	public void readConfig(ServletConfig c) throws Exception {
				
		/*
		 * Get config file name.
		 * The file name is first looked for as an init parameter, then in a fixed location
		 * in the webapp.
		 */
		if (c == null) {
			// no config no file...
			return;
		}
		String fn = c.getInitParameter("config-file");
		if (fn == null) {
			fn = c.getServletContext().getRealPath("WEB-INF/digilib-config.xml");
			if (fn == null) {
				util.dprintln(4, "setConfig: no param config-file");
				throw new ServletException("ERROR no digilib config file!");
			}
		}
		File f = new File(fn);
		// setup config file list reader
		XMLListLoader lilo =
			new XMLListLoader("digilib-config", "parameter", "name", "value");
		// read config file into HashMap
		HashMap confTable = lilo.loadURL(f.toURL().toString());
		
		// set config file path parameter
		setValue("servlet.config.file", f.getCanonicalPath());

		/* 
		 * read parameters
		 */

		for (Iterator i = confTable.keySet().iterator(); i.hasNext();) {
			String key = (String) i.next();
			String val = (String) confTable.get(key);
			Parameter p = get(key);
			if (p != null) {
				if (p.getType() == 's') {
					// type 's' Parameters are not overwritten.
					continue;
				}
				if (! p.setValueFromString(val)) {
					/*
					 * automatic conversion failed -- try special cases
					 */
					
					// basedir-list
					if (key.equals("basedir-list")) {
						// split list into directories
						String[] sa = FileOps.pathToArray(val);
						if (sa != null) {
							p.setValue(sa);
						}
					}
					
				}
			} else {
				// parameter unknown -- just add
				putParameter(key, null, val, 'f');
			}
		}

		/*
		 * further initialization
		 */

		// debugLevel
		util.setDebugLevel(getAsInt("debug-level"));
		// directory cache
		String[] bd = (String[]) getValue("basedir-list");
		int[] fcs = { FileOps.CLASS_IMAGE, FileOps.CLASS_TEXT};
		DocuDirCache dirCache = new DocuDirCache(bd, fcs);
		setValue("servlet.dir.cache", dirCache);
		// useAuthentication
		if (getAsBoolean("use-authorization")) {
			// DB version
			//authOp = new DBAuthOpsImpl(util);
			// XML version
			String authConfPath = getAsString("auth-file");
			if (! authConfPath.startsWith("/")) {
				// relative path -> use getRealPath to resolve in WEB-INF
				authConfPath = c.getServletContext().getRealPath("WEB-INF/"+authConfPath);
			}
			AuthOps authOp = new XMLAuthOps(util, authConfPath);
			setValue("servlet.auth.op", authOp);
		}
		// DocuImage class
		String s = getAsString("docuimage-class");
		Class cl = Class.forName(getAsString("docuimage-class"));
		docuImageClass = Class.forName(getAsString("docuimage-class"));
		setValue("servlet.docuimage.class", docuImageClass);
	}

	/** Creates a new DocuImage instance.
	 * 
	 * The type of DocuImage is specified by docuImageType.
	 * 
	 * @return DocuImage
	 */
	public DocuImage getDocuImageInstance() {
		DocuImageImpl di = null;
		try {
			if (docuImageClass == null) {
				docuImageClass = Class.forName(getAsString("docuimage-class"));
			}
			di = (DocuImageImpl) docuImageClass.newInstance();
			di.setUtils(util);
		} catch (Exception e) {
		}
		return di;
	}

	/**
	 * @return
	 */
	public Utils getUtil() {
		return util;
	}

}
