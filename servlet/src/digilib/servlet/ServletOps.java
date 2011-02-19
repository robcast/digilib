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
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.image.DocuImage;
import digilib.image.ImageOpException;
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
     * If the File is not absolute the path is appended to the base directory of
     * the web-app.
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
            filename = sc.getServletContext().getRealPath(filename);
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
        String newfn = sc.getServletContext().getRealPath("WEB-INF/" + fn);
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
     * @param f
     *            Image file to be sent.
     * @param mt
     *            mime-type of the file.
     * @param name
     *            name of the download file (for application/x)
     * @param res
     *            ServletResponse where the image file will be sent.
     * @throws ImageOpException
     * @throws ServletException
     *             Exception on sending data.
     */
    public static void sendFile(File f, String mt, String name,
            HttpServletResponse response) throws ImageOpException,
            ServletException {
        // use default logger
        ServletOps.sendFile(f, mt, name, response, ServletOps.logger);
    }

    /**
     * Transfers an image file as-is with the mime type mt.
     * 
     * The local file is copied to the <code>OutputStream</code> of the
     * <code>ServletResponse</code>. If mt is null then the mime-type is
     * auto-detected with mimeForFile.
     * @param f
     *            Image file to be sent.
     * @param mt
     *            mime-type of the file.
     * @param name 
     *            name of the download file (for application/x)
     * @param res
     *            ServletResponse where the image file will be sent.
     * @param logger
     *            Logger to use
     * @throws ImageOpException
     * @throws ServletException Exception on sending data.
     */
    public static void sendFile(File f, String mt, String name, HttpServletResponse response, Logger logger)
            throws ImageOpException, ServletException {
        logger.debug("sendRawFile(" + mt + ", " + f + ")");
    	if (response.isCommitted()) {
        	logger.warn("sendFile: response already committed!");
        	//return;
    	}
        if (mt == null) {
            // auto-detect mime-type
            mt = FileOps.mimeForFile(f);
            if (mt == null) {
                throw new ImageOpException("Unknown file type.");
            }
        }
        response.setContentType(mt);
        // open file
        if (mt.startsWith("application")) {
            if (name == null) {
                // no download name -- use filename
                name = f.getName();
            }
            response.addHeader("Content-Disposition", "attachment; filename=\""+name+"\"");
        }
        FileInputStream inFile = null;
        try {
            inFile = new FileInputStream(f);
            OutputStream outStream = response.getOutputStream();
            // TODO: should we set content length? 
            // see http://www.prozesse-und-systeme.de/servletFlush.html
            response.setContentLength( (int) f.length());
            byte dataBuffer[] = new byte[4096];
            int len;
            while ((len = inFile.read(dataBuffer)) != -1) {
                // copy out file
                outStream.write(dataBuffer, 0, len);
            }
        } catch (IOException e) {
            logger.error("Error sending file:", e);
            throw new ServletException("Error sending file:", e);
        } finally {
            try {
                if (inFile != null) {
                    inFile.close();
                }
            } catch (IOException e) {
                // nothing to do
            }
        }
    }

    /**
     * Write image img to ServletResponse response.
     * 
     * @param img
     * @param mimeType
     * @param response
     * @throws ImageOpException
     * @throws ServletException Exception on sending data.
     */
    public static void sendImage(DocuImage img, String mimeType,
            HttpServletResponse response) throws ImageOpException,
            ServletException {
        ServletOps.sendImage(img, mimeType, response, ServletOps.logger);
    }

    /**
     * Write image img to ServletResponse response.
     * 
     * @param img
     * @param mimeType
     * @param response
     * @param logger
     * @throws ImageOpException
     * @throws ServletException Exception on sending data.
     */
    public static void sendImage(DocuImage img, String mimeType,
            HttpServletResponse response, Logger logger) throws ImageOpException,
            ServletException {
    	if (response.isCommitted()) {
        	logger.warn("sendImage: response already committed!");
        	//return;
    	}
        try {
            OutputStream outstream = response.getOutputStream();
            // setup output -- if mime type is set use that otherwise
            // if source is JPG then dest will be JPG else it's PNG
            if (mimeType == null) {
                mimeType = img.getMimetype();
            }
            if ((mimeType.equals("image/jpeg") || mimeType.equals("image/jp2") || mimeType
                    .equals("image/fpx"))) {
                mimeType = "image/jpeg";
            } else {
                mimeType = "image/png";
            }
            // write the image
            response.setContentType(mimeType);
            img.writeImage(mimeType, outstream);
        } catch (IOException e) {
            logger.error("Error sending image:", e);
            throw new ServletException("Error sending image:", e);
        }
        // TODO: should we: finally { img.dispose(); }
    }

}