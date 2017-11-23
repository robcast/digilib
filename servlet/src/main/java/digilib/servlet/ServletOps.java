package digilib.servlet;

/*
 * #%L
 * ServletOps -- Servlet utility class
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2001 - 2017 MPIWG Berlin
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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.util.Enumeration;
import java.util.StringTokenizer;

import javax.json.Json;
import javax.json.stream.JsonGenerator;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.conf.DigilibServletConfiguration;
import digilib.conf.DigilibServletRequest;
import digilib.image.DocuImage;
import digilib.image.ImageOpException;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageInput;
import digilib.io.ImageSet;
import digilib.util.ImageSize;

public class ServletOps {

    protected static Logger logger = Logger.getLogger("servlet.op");
    
    protected static DigilibServletConfiguration dlConfig;
    
    /** set CORS header ACAO* for info requests */
    protected static boolean corsForInfoRequests = true;

    /** set CORS header ACAO* for image requests */
    protected static boolean corsForImageRequests = true;

    /**
	 * @return the dlConfig
	 */
	public static DigilibServletConfiguration getDlConfig() {
		return dlConfig;
	}

	/**
	 * @param dlConfig the dlConfig to set
	 */
	public static void setDlConfig(DigilibServletConfiguration dlConfig) {
		ServletOps.dlConfig = dlConfig;
		corsForInfoRequests = dlConfig.getAsBoolean("iiif-info-cors");
		corsForImageRequests = dlConfig.getAsBoolean("iiif-image-cors");
	}

	/**
     * convert a string with a list of pathnames into an array of strings using
     * the system's path separator string
     */
    public static String[] getPathArray(String paths) {
        // split list into directories
		StringTokenizer dirs = new StringTokenizer(paths, java.io.File.pathSeparator);
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
    public static File getFile(File f, ServletContext sc) {
        // is the filename absolute?
        if (!f.isAbsolute()) {
            // relative path -> use getRealPath to resolve in WEB-INF
            String fn = sc.getRealPath("/" + f.getPath());
            if (fn == null) {
                // TODO: use getResourceAsStream?
                return null;
            }
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
    public static String getFile(String filename, ServletContext sc) {
        File f = new File(filename);
        // is the filename absolute?
        if (!f.isAbsolute()) {
            // relative path -> use getRealPath to resolve in WEB-INF
            filename = sc.getRealPath("/" + filename);
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
    public static File getConfigFile(File f, ServletContext sc) {
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
        String newfn = sc.getRealPath("/WEB-INF/" + fn);
        if (newfn == null) {
            // TODO: use getResourceAsStream?
            return null;
        }
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
    public static String getConfigFileName(String filename, ServletContext sc) {
        File f = new File(filename);
        // is the filename absolute?
        if (!f.isAbsolute()) {
            // relative path -> use getRealPath to resolve in WEB-INF
            filename = sc.getRealPath("/WEB-INF/" + filename);
        }
        return filename;
    }

    /**
     * print a servlet response
     */
    public static void htmlMessage(String msg, HttpServletResponse response)
            throws IOException {
        htmlMessage("Scaler", msg, response);
    }

    /**
     * print a servlet response
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
     * @throws IOException
     */
    public static void sendFile(File f, String mt, String name,
            HttpServletResponse response) throws ImageOpException, IOException {
        // use default logger
        ServletOps.sendFile(f, mt, name, response, ServletOps.logger);
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
     * @param logger
     *            Logger to use
     * @throws ImageOpException
     * @throws ServletException Exception on sending data.
     * @throws IOException 
     */
    public static void sendFile(File f, String mt, String name, HttpServletResponse response, Logger logger)
            throws ImageOpException, IOException {
        logger.debug("sendRawFile(" + mt + ", " + f + ")");
        if (response == null) {
            logger.error("No response!");
            return;
        }
        
        /*
         * set content-type
         */
        if (mt == null) {
            // auto-detect mime-type
            mt = FileOps.mimeForFile(f);
            if (mt == null) {
                throw new ImageOpException("Unknown file type.");
            }
        }
        response.setContentType(mt);
        
        /*
         * set content-disposition with filename.
         * uses image filename.
         */
        if (name == null) {
            // no download name -- use filename
            name = f.getName();
        }
        if (mt.startsWith("application")) {
            response.addHeader("Content-Disposition", "attachment; filename=\"" + name + "\"");
        } else {
            response.addHeader("Content-Disposition", "inline; filename=\"" + name + "\"");
        }

        /*
         * set CORS header ACAO "*" for image response
         */
        if (corsForImageRequests) {
            // TODO: would be nice to check request for Origin header
            response.setHeader("Access-Control-Allow-Origin", "*");
        }

        /*
         * open file
         */
        FileInputStream inFile = null;
        try {
            inFile = new FileInputStream(f);
            OutputStream outStream = response.getOutputStream();
            // TODO: should we set content length?
            // see http://www.prozesse-und-systeme.de/servletFlush.html
            response.setContentLength((int) f.length());
            byte dataBuffer[] = new byte[4096];
            int len;
            /*
             * write file to stream
             */
            while ((len = inFile.read(dataBuffer)) != -1) {
                // copy out file
                outStream.write(dataBuffer, 0, len);
            }
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
     * Write image img to ServletResponse response as data of mimeType.
     * 
     * If mimeType is null, use heuristics for type.
     * 
     * @param img
     * @param mimeType
     * @param response
     * @param logger
     * @throws ImageOpException
     * @throws ServletException Exception on sending data.
     */
    public static void sendImage(DocuImage img, String mimeType, HttpServletResponse response, Logger logger)
            throws ImageOpException, ServletException {
        if (response == null) {
            logger.error("No response!");
            return;
        }
        try {
            /*
             * determine the content-type: if mime type is set use that otherwise if source
             * is JPG then dest will be JPG else it's PNG
             */
            if (mimeType == null) {
                mimeType = img.getMimetype();
                if (mimeType == null) {
                    // still no mime-type
                    logger.warn("sendImage without mime-type! using image/jpeg.");
                    mimeType = "image/jpeg";
                }
            }
            if ((mimeType.equals("image/jpeg") || mimeType.equals("image/jp2") || mimeType.equals("image/fpx"))) {
                mimeType = "image/jpeg";
            } else {
                mimeType = "image/png";
            }
            // set the content type
            response.setContentType(mimeType);

            /*
             * set content-disposition with filename.
             * uses filename provided in DocuImage.
             */
            String name = (String) img.getHint("download-filename");
            if (name != null) {
                response.addHeader("Content-Disposition", "inline; filename=\"" + name + "\"");
            }
            
            /*
             * set CORS header ACAO "*" for image response
             */
            if (corsForImageRequests) {
                // TODO: would be nice to check request for Origin header
                response.setHeader("Access-Control-Allow-Origin", "*");
            }

            /*
             * write the image
             */
            OutputStream outstream = response.getOutputStream();
            img.writeImage(mimeType, outstream);

        } catch (IOException e) {
            throw new ServletException("Error sending image:", e);
        } finally {
            img.dispose();
        }
    }

    /**
     * Returns IIIF compatible image information as application/json response.
     * 
     * @param dlReq
     * @param response
     * @param logger
     * @throws FileOpException 
     * @throws ServletException
     * @see <a href="http://www-sul.stanford.edu/iiif/image-api/1.1/#info">IIIF Image Information Request</a>
     */
	public static void sendIiifInfo(DigilibServletRequest dlReq, HttpServletResponse response, Logger logger)
			throws ServletException {
        if (response == null) {
            logger.error("No response!");
            return;
        }
        
        /*
         * get image size
         */
        ImageSize size = null;
        ImageSet imageSet = null;
        try {
            // get original image size
            imageSet = dlReq.getJobDescription().getImageSet();
            ImageInput img = imageSet.getBiggest();
            size = img.getSize();
        } catch (FileOpException e) {
            try {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
                return;
            } catch (IOException e1) {
                throw new ServletException("Unable to write error response!", e);
            }
        }
        
        /*
         * get resource URL
         */
        String url = dlReq.getServletRequest().getRequestURL().toString();
        if (url.endsWith("/info.json")) {
            url = url.substring(0, url.lastIndexOf("/info.json"));
        } else if (url.endsWith("/")) {
            url = url.substring(0, url.lastIndexOf("/"));
        }
        
        /*
         * send response
         */
        response.setCharacterEncoding("UTF-8");
        logger.debug("sending info.json");
        try {
            /*
             * set CORS header ACAO "*" for info response as per IIIF spec
             */
            if (corsForInfoRequests) {
                String origin = dlReq.getServletRequest().getHeader("Origin");
                if (origin != null) {
                    response.setHeader("Access-Control-Allow-Origin", "*");
                }
            }
            
            if (dlConfig.getAsString("iiif-api-version").startsWith("2.")) {
                /*
                 * IIIF Image API version 2 image information
                 */
                // use JSON-LD content type only when asked
                String accept = dlReq.getServletRequest().getHeader("Accept");
                if (accept != null && accept.contains("application/ld+json")) {
                    response.setContentType("application/ld+json");
                } else {
                    response.setContentType("application/json");
                    response.setHeader("Link", "<http://iiif.io/api/image/2/context.json>"
                            +"; rel=\"http://www.w3.org/ns/json-ld#context\""
                            +"; type=\"application/ld+json\"");
                }
                // write info.json
                ServletOutputStream out = response.getOutputStream();
                JsonGenerator info = Json.createGenerator(out);
                // top level object
                info.writeStartObject()
                .write("@context", "http://iiif.io/api/image/2/context.json")
                .write("@id", url)
                .write("protocol", "http://iiif.io/api/image")
                .write("width", size.width)
                .write("height", size.height);
                // profile[ array
                info.writeStartArray("profile")
                // profile[ level
                .write("http://iiif.io/api/image/2/level2.json");
                // profile[{ object
                info.writeStartObject();
                // profile[{formats[
                info.writeStartArray("formats")
                .write("jpg")
                .write("png")
                .writeEnd();
                // profile[{qualities[
                info.writeStartArray("qualities")
                .write("color")
                .write("gray")
                .writeEnd();
                // profile[{maxArea
                if (dlConfig.getAsInt("max-image-size") > 0) {
                    info.write("maxArea", dlConfig.getAsInt("max-image-size"));
                }
                // profile[{supports[
                info.writeStartArray("supports")
                .write("mirroring")
                .write("rotationArbitrary")
                .write("sizeAboveFull")
                .write("regionSquare")
                .writeEnd();
                // profile[{}
                info.writeEnd();
                // profile[]
                info.writeEnd();
                // add size of original and prescaled images
                int numImgs = imageSet.size();
                if (numImgs > 0) {
                    // sizes[
                    info.writeStartArray("sizes");
                    for (int i = numImgs - 1; i >= 0; --i) {
                        ImageInput ii = imageSet.get(i);
                        ImageSize is = ii.getSize();
                        // sizes[{
                        info.writeStartObject()
                        .write("width", is.getWidth())
                        .write("height", is.getHeight())
                        .writeEnd();
                    }
                    // sizes[]
                    info.writeEnd();
                }
                // end info.json
                info.writeEnd();
                info.close();

            } else {
                /*
                 * IIIF Image API version 1 image information
                 */
                response.setContentType("application/json,application/ld+json");
                // write info.json
                ServletOutputStream out = response.getOutputStream();
                JsonGenerator info = Json.createGenerator(out);
                // top level object
                info.writeStartObject()
                .write("@context", "http://library.stanford.edu/iiif/image-api/1.1/context.json")
                .write("@id", url)
                .write("width", size.width)
                .write("height", size.height);
                // formats[
                info.writeStartArray("formats")
                .write("jpg")
                .write("png")
                .writeEnd();
                // qualities[
                info.writeStartArray("qualities")
                .write("native")
                .write("color")
                .write("gray")
                .writeEnd();
                // profile
                info.write("profile", "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level2");
                // end info.json
                info.writeEnd();
                info.close();
            }
        } catch (IOException e) {
            throw new ServletException("Unable to write response!", e);
        }
    }

    /** Returns text representation of headers for debuggging purposes.
     * @param req
     * @return
     */
    public static String headersToString(HttpServletRequest req) {
        String s = "";
        @SuppressWarnings("unchecked")
        Enumeration<String> hns = req.getHeaderNames();
        while (hns.hasMoreElements()) {
            String hn = hns.nextElement();
            s += hn + "=" + req.getHeader(hn) + "; ";
        }
        return s;
    }
    
    
}
