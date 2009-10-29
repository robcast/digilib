/*
 * ServletOps -- Servlet utility class
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)
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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.util.StringTokenizer;

import javax.servlet.ServletConfig;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.io.FileOpException;
import digilib.io.FileOps;

public class ServletOps {

	private static Logger logger = Logger.getLogger("servlet.op");

	/**
	 * convert a string with a list of pathnames into an array of strings using
	 * the system's path seperator string
	 */
	public static String[] getPathArray(String paths) {
		// split list into directories
		StringTokenizer dirs = new StringTokenizer(paths,
				java.io.File.pathSeparator);
		int n = dirs.countTokens();
		if (n < 1) {
			return null;
		}
		// add directories into array
		String[] pathArray = new String[n];
		for (int i = 0; i < n; i++) {
			pathArray[i] = dirs.nextToken();
		}
		return pathArray;
	}

	/**
	 * get a real File for a web app File.
	 * 
	 * If the File is not absolute the path is appended to the base directory
	 * of the web-app.
	 * 
	 * @param file
	 * @param sc
	 * @return
	 */
	public static File getFile(File f, ServletConfig sc) {
		// is the filename absolute?
		if (!f.isAbsolute()) {
			// relative path -> use getRealPath to resolve in WEB-INF
			String fn = sc.getServletContext().getRealPath(f.getPath());
			f = new File(fn);
		}
		return f;
	}

	/**
	 * get a real file name for a web app file pathname.
	 * 
	 * If filename starts with "/" its treated as absolute else the path is
	 * appended to the base directory of the web-app.
	 * 
	 * @param filename
	 * @param sc
	 * @return
	 */
	public static String getFile(String filename, ServletConfig sc) {
		File f = new File(filename);
		// is the filename absolute?
		if (!f.isAbsolute()) {
			// relative path -> use getRealPath to resolve in WEB-INF
			filename = sc.getServletContext()
					.getRealPath(filename);
		}
		return filename;
	}

	/**
	 * get a real File for a config File.
	 * 
	 * If the File is not absolute the path is appended to the WEB-INF directory
	 * of the web-app.
	 * 
	 * @param file
	 * @param sc
	 * @return
	 */
	public static File getConfigFile(File f, ServletConfig sc) {
	    String fn = f.getPath();
		// is the filename absolute?
		if (f.isAbsolute()) {
		    // does it exist?
		    if (f.canRead()) {
		        // fine
		        return f;
		    } else {
		        // try just the filename as relative
		        fn = f.getName();
		    }
		}
		// relative path -> use getRealPath to resolve in WEB-INF
		String newfn = sc.getServletContext().getRealPath(
		        "WEB-INF/" + fn);
		f = new File(newfn);
		return f;
	}

	/**
	 * get a real file name for a config file pathname.
	 * 
	 * If filename starts with "/" its treated as absolute else the path is
	 * appended to the WEB-INF directory of the web-app.
	 * 
	 * @param filename
	 * @param sc
	 * @return
	 */
	public static String getConfigFile(String filename, ServletConfig sc) {
		File f = new File(filename);
		// is the filename absolute?
		if (!f.isAbsolute()) {
			// relative path -> use getRealPath to resolve in WEB-INF
			filename = sc.getServletContext()
					.getRealPath("WEB-INF/" + filename);
		}
		return filename;
	}

	/**
	 * print a servlet response and exit
	 */
	public static void htmlMessage(String msg, HttpServletResponse response)
			throws IOException {
		htmlMessage("Scaler", msg, response);
	}

	/**
	 * print a servlet response and exit
	 */
	public static void htmlMessage(String title, String msg,
			HttpServletResponse response) throws IOException {
		response.setContentType("text/html; charset=iso-8859-1");
		PrintWriter out = response.getWriter();
		out.println("<html>");
		out.println("<head><title>" + title + "</title></head>");
		out.println("<body>");
		out.println("<p>" + msg + "</p>");
		out.println("</body></html>");
	}

	/**
	 * Transfers an image file as-is with the mime type mt.
	 * 
	 * The local file is copied to the <code>OutputStream</code> of the
	 * <code>ServletResponse</code>. If mt is null then the mime-type is
	 * auto-detected with mimeForFile.
	 * 
	 * @param mt
	 *            mime-type of the file.
	 * @param f
	 *            Image file to be sent.
	 * @param res
	 *            ServletResponse where the image file will be sent.
	 * @throws FileOpException
	 *             Exception is thrown for a IOException.
	 */
	public static void sendFile(File f, String mt,
			HttpServletResponse response) throws FileOpException {
		logger.debug("sendRawFile(" + mt + ", " + f + ")");
		if (mt == null) {
			// auto-detect mime-type
			mt = FileOps.mimeForFile(f);
			if (mt == null) {
				throw new FileOpException("Unknown file type.");
			}
		}
		response.setContentType(mt);
		// open file
		try {
			if (mt.equals("application/octet-stream")) {
				response.addHeader("Content-Disposition",
						"attachment; filename=\"" + f.getName() + "\"");
			}
			FileInputStream inFile = new FileInputStream(f);
			OutputStream outStream = response.getOutputStream();
			byte dataBuffer[] = new byte[4096];
			int len;
			while ((len = inFile.read(dataBuffer)) != -1) {
				// copy out file
				outStream.write(dataBuffer, 0, len);
			}
			inFile.close();
			response.flushBuffer();
		} catch (IOException e) {
			throw new FileOpException("Unable to send file.");
		}
	}

}