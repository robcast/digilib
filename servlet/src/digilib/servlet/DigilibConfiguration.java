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
import java.util.StringTokenizer;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;

import digilib.Utils;
import digilib.auth.AuthOps;
import digilib.auth.XMLAuthOps;
import digilib.image.DocuImage;
import digilib.image.DocuImageImpl;
import digilib.io.DocuDirCache;
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
public class DigilibConfiguration {
	// digilib servlet version
	private String servletVersion = digilib.servlet.Scaler.dlVersion;
	// configuration file location
	private String dlConfPath = "";
	// image file to send in case of error
	private String errorImgFileName = "/docuserver/images/icons/scalerror.gif";
	private String errorImgParam = "error-image";
	// image file to send if access is denied
	private String denyImgFileName = "/docuserver/images/icons/denied.gif";
	private String denyImgParam = "denied-image";
	// base directories in order of preference (prescaled versions last)
	private String[] baseDirs =
		{ "/docuserver/images", "/docuserver/scaled/small" };
	private String baseDirParam = "basedir-list";
	// use authentication information
	private boolean useAuthentication = true;
	private String useAuthParam = "use-authorization";
	// authentication configuration file
	private String authConfPath =
		"/docuserver/www/digitallibrary/WEB-INF/digilib-auth.xml";
	private String authConfParam = "auth-file";
	// sending image files as-is allowed
	private boolean sendFileAllowed = true;
	private String sendFileAllowedParam = "sendfile-allowed";
	// AuthOps instance for authentication
	private AuthOps authOp;
	// Debug level
	private int debugLevel = 5;
	private String debugLevelParam = "debug-level";
	// Utils instance
	private Utils util = new Utils(debugLevel);
	// HashTable for parameters
	private HashMap confTable = null;
	// Type of DocuImage instance
	private String docuImageType = "digilib.image.JAIDocuImage";
	private String docuImageTypeParam = "docuimage-class";
	// part of URL used to indicate authorized access
	private String authURLPath = "authenticated/";
	private String AuthURLPathParam = "auth-url-path";
	// degree of subsampling on image load
	private float minSubsample = 2;
	private String minSubsampleParam = "subsample-minimum";
	// DocuDirCache instance
	private DocuDirCache dirCache = null;
	// DocuImage class instance
	private Class docuImageClass = null;

	/** Constructor taking a ServletConfig.
	 * Reads the config file location from an init parameter and loads the
	 * config file. Calls <code>init</code>.
	 * 
	 * @see init()
	 */
	public DigilibConfiguration(ServletConfig c) throws Exception {
		init(c);
	}

	/**
	 * read parameter list from the XML file in init parameter "config-file"
	 */
	public void init(ServletConfig c) throws Exception {
		// reset parameter table
		confTable = null;
		if (c == null) {
			return;
		}
		// get config file name
		String fn = c.getInitParameter("config-file");
		if (fn == null) {
			util.dprintln(4, "setConfig: no param config-file");
			throw new ServletException("ERROR no digilib config file!");
		}
		File f = new File(fn);
		// setup config file list reader
		XMLListLoader lilo =
			new XMLListLoader("digilib-config", "parameter", "name", "value");
		confTable = lilo.loadURL(f.toURL().toString());
		dlConfPath = f.getCanonicalPath();

		/* 
		 * read parameters
		 */

		// debugLevel
		debugLevel = tryToGetInitParam(debugLevelParam, debugLevel);
		util.setDebugLevel(debugLevel);
		// errorImgFileName
		errorImgFileName = tryToGetInitParam(errorImgParam, errorImgFileName);
		// denyImgFileName
		denyImgFileName = tryToGetInitParam(denyImgParam, denyImgFileName);
		// docuImageType
		docuImageType = tryToGetInitParam(docuImageTypeParam, docuImageType);
		// sendFileAllowed
		sendFileAllowed =
			tryToGetInitParam(sendFileAllowedParam, sendFileAllowed);
		// baseDirs
		String baseDirList =
			tryToGetInitParam(
				baseDirParam,
				"/docuserver/images/:/docuserver/scaled/small/");
		// split list into directories
		String[] sa = splitPathArray(baseDirList);
		baseDirs = (sa != null) ? sa : baseDirs;
		// directory cache
		dirCache = new DocuDirCache(baseDirs);
		// useAuthentication
		useAuthentication = tryToGetInitParam(useAuthParam, useAuthentication);
		if (useAuthentication) {
			// DB version
			//authOp = new DBAuthOpsImpl(util);
			// XML version
			authConfPath = tryToGetInitParam(authConfParam, authConfPath);
			authOp = new XMLAuthOps(util, authConfPath);
		}
		// minSubsample
		minSubsample =
			tryToGetInitParam(minSubsampleParam, minSubsample);
	}

	/**
	 * convert a string with a list of pathnames into an array of strings
	 * using the system's path separator string
	 */
	public String[] splitPathArray(String paths) {
		// split list into directories
		StringTokenizer dirs =
			new StringTokenizer(paths, File.pathSeparator);
		int n = dirs.countTokens();
		if (n < 1) {
			return null;
		}
		// add directories into array
		String[] pathArray = new String[n];
		for (int i = 0; i < n; i++) {
			String s = dirs.nextToken();
			// make shure the dir name ends with a directory separator
			if (s.endsWith(File.separator)) {
				pathArray[i] = s;
			} else {
				pathArray[i] = s + File.separator;
			}
		}
		return pathArray;
	}

	/**
	 *  get an init parameter from config and return it if set, otherwise return default
	 */
	public int tryToGetInitParam(String s, int i) {
		//System.out.println("trytogetInitParam("+s+", "+i+")");
		try {
			//System.out.println("trytogetInitParam: "+(String)confTable.get(s));
			i = Integer.parseInt((String) confTable.get(s));
		} catch (Exception e) {
			util.dprintln(4, "trytogetInitParam(int) failed on param " + s);
			//e.printStackTrace();
		}
		return i;
	}
	public float tryToGetInitParam(String s, float f) {
		try {
			f = Float.parseFloat((String) confTable.get(s));
		} catch (Exception e) {
			util.dprintln(4, "trytoGetInitParam(float) failed on param " + s);
			//e.printStackTrace();
		}
		return f;
	}
	public String tryToGetInitParam(String s, String x) {
		if ((confTable != null) && ((String) confTable.get(s) != null)) {
			x = (String) confTable.get(s);
		} else {
			util.dprintln(4, "trytoGetInitParam(string) failed on param " + s);
		}
		return x;
	}
	public boolean tryToGetInitParam(String s, boolean b) {
		String bs;
		boolean bb = b;
		if ((confTable != null) && ((String) confTable.get(s) != null)) {
			bs = (String) confTable.get(s);

			if ((bs.indexOf("false") > -1) || (bs.indexOf("FALSE") > -1)) {
				bb = false;
			} else if (
				(bs.indexOf("true") > -1) || (bs.indexOf("TRUE") > -1)) {
				bb = true;
			} else {
				util.dprintln(
					4,
					"trytoGetInitParam(string) failed on param " + s);
			}
		} else {
			util.dprintln(4, "trytoGetInitParam(string) failed on param " + s);
		}
		return bb;
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
				docuImageClass = Class.forName(docuImageType);
			}
			di = (DocuImageImpl) docuImageClass.newInstance();
			di.setUtils(util);
		} catch (Exception e) {
		}
		return di;
	}

	/**
	 * Returns the authConfPath.
	 * @return String
	 */
	public String getAuthConfPath() {
		return authConfPath;
	}

	/**
	 * Returns the authOp.
	 * @return AuthOps
	 */
	public AuthOps getAuthOp() {
		return authOp;
	}

	/**
	 * Returns the denyImgFileName.
	 * @return String
	 */
	public String getDenyImgFileName() {
		return denyImgFileName;
	}

	/**
	 * Returns the errorImgFileName.
	 * @return String
	 */
	public String getErrorImgFileName() {
		return errorImgFileName;
	}

	/**
	 * Returns the useAuth.
	 * @return boolean
	 */
	public boolean isUseAuthentication() {
		return useAuthentication;
	}

	/**
	 * Sets the authConfPath.
	 * @param authConfPath The authConfPath to set
	 */
	public void setAuthConfPath(String authConfPath) {
		this.authConfPath = authConfPath;
	}

	/**
	 * Sets the authOp.
	 * @param authOp The authOp to set
	 */
	public void setAuthOp(AuthOps authOp) {
		this.authOp = authOp;
	}

	/**
	 * Sets the denyImgFileName.
	 * @param denyImgFileName The denyImgFileName to set
	 */
	public void setDenyImgFileName(String denyImgFileName) {
		this.denyImgFileName = denyImgFileName;
	}

	/**
	 * Sets the errorImgFileName.
	 * @param errorImgFileName The errorImgFileName to set
	 */
	public void setErrorImgFileName(String errorImgFileName) {
		this.errorImgFileName = errorImgFileName;
	}

	/**
	 * Returns the baseDirs.
	 * @return String[]
	 */
	public String[] getBaseDirs() {
		return baseDirs;
	}

	/**
	 * Returns the baseDirs as String.
	 * @return String
	 */
	public String getBaseDirList() {
		String s = "";
		java.util.Iterator i = java.util.Arrays.asList(baseDirs).iterator();
		while (i.hasNext()) {
			s += (i.next() + "; ");
		}
		return s;
	}

	/**
	 * Sets the baseDirs.
	 * @param baseDirs The baseDirs to set
	 */
	public void setBaseDirs(String[] baseDirs) {
		this.baseDirs = baseDirs;
		dirCache = new DocuDirCache(baseDirs);
	}

	/**
	 * Returns the debugLevel.
	 * @return int
	 */
	public int getDebugLevel() {
		return debugLevel;
	}

	/**
	 * Sets the debugLevel.
	 * @param debugLevel The debugLevel to set
	 */
	public void setDebugLevel(int debugLevel) {
		this.debugLevel = debugLevel;
	}

	/**
	 * Returns the util.
	 * @return Utils
	 */
	public Utils getUtil() {
		return util;
	}

	/**
	 * Sets the util.
	 * @param util The util to set
	 */
	public void setUtil(Utils util) {
		this.util = util;
	}

	/**
	 * Returns the servletVersion.
	 * @return String
	 */
	public String getServletVersion() {
		return servletVersion;
	}

	/**
	 * Sets the servletVersion.
	 * @param servletVersion The servletVersion to set
	 */
	public void setServletVersion(String servletVersion) {
		this.servletVersion = servletVersion;
	}

	/**
	 * Returns the docuImageType.
	 * @return String
	 */
	public String getDocuImageType() {
		return docuImageType;
	}

	/**
	 * Sets the docuImageType.
	 * @param docuImageType The docuImageType to set
	 */
	public void setDocuImageType(String docuImageType) {
		this.docuImageType = docuImageType;
	}

	/**
	 * Returns the sendFileAllowed.
	 * @return boolean
	 */
	public boolean isSendFileAllowed() {
		return sendFileAllowed;
	}

	/**
	 * Sets the sendFileAllowed.
	 * @param sendFileAllowed The sendFileAllowed to set
	 */
	public void setSendFileAllowed(boolean sendFileAllowed) {
		this.sendFileAllowed = sendFileAllowed;
	}

	/**
	 * Returns the authURLPath.
	 * @return String
	 */
	public String getAuthURLPath() {
		return authURLPath;
	}

	/**
	 * Sets the authURLPath.
	 * @param authURLPath The authURLPath to set
	 */
	public void setAuthURLPath(String authURLPath) {
		this.authURLPath = authURLPath;
	}

	/**
	 * Sets the useAuthentication.
	 * @param useAuthentication The useAuthentication to set
	 */
	public void setUseAuthentication(boolean useAuthentication) {
		this.useAuthentication = useAuthentication;
	}

	/**
	 * Returns the dlConfPath.
	 * @return String
	 */
	public String getDlConfPath() {
		return dlConfPath;
	}

	/**
	 * @return float
	 */
	public float getMinSubsample() {
		return minSubsample;
	}

	/**
	 * Sets the minSubsample.
	 * @param minSubsample The minSubsample to set
	 */
	public void setMinSubsample(float f) {
		this.minSubsample = f;
	}

	/**
	 * @return DocuDirCache
	 */
	public DocuDirCache getDirCache() {
		return dirCache;
	}

	/**
	 * Sets the dirCache.
	 * @param dirCache The dirCache to set
	 */
	public void setDirCache(DocuDirCache dirCache) {
		this.dirCache = dirCache;
	}

}
