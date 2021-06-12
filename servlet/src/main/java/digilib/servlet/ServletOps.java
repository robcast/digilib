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
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.ListIterator;

import javax.json.Json;
import javax.json.stream.JsonGenerator;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.conf.DigilibServletConfiguration;
import digilib.conf.DigilibServletRequest;
import digilib.image.DocuImage;
import digilib.image.ImageOpException;
import digilib.image.ImageOutputException;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageInput;
import digilib.io.ImageSet;
import digilib.util.ImageSize;

public class ServletOps {

    protected static Logger logger = LoggerFactory.getLogger("servlet.op");

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
     * Get a real File for a web app File.
     * 
     * If the File is not absolute the path is appended to the base directory of the
     * web-app. If the file does not exist in the web-app directory it is considered
     * relative to the Java working directory.
     * 
     * @param f  the File
     * @param sc the ServletContext
     * @return the File
     */
    public static File getFile(File f, ServletContext sc) {
        // is the filename absolute?
        if (!f.isAbsolute()) {
            // relative path -> use getRealPath to resolve in web-app
            String fn = sc.getRealPath("/" + f.getPath());
            if (fn != null && new File(fn).exists()) {
                f = new File(fn);
            }
            // if relative path can't be resolved inside webapp we
            // assume that it is relative to user working directory,
            // so we return it as.
        }
        return f;
    }

    /**
     * Get a real File for a config File.
     * 
     * If the File is not absolute the path is appended to the WEB-INF directory of
     * the web-app. If the file does not exist in the WEB-INF directory it is
     * considered relative to the Java working directory.
     * 
     * @param f  the File
     * @param sc the ServletContext
     * @return the File
     */
    public static File getConfigFile(File f, ServletContext sc) {
        // is the filename absolute?
        if (!f.isAbsolute()) {
            // relative path -> use getRealPath to resolve in WEB-INF
            String fn = sc.getRealPath("/WEB-INF/" + f.getPath());
            if (fn != null) {
                File wf = new File(fn);
                if (wf.exists()) {
                    return wf;
                }
            }
            // if relative path can't be resolved inside webapp we
            // assume that it is relative to user working directory,
            // so we return it as.
        }
        return f;
    }

    /**
     * print a servlet response
     * 
     * @param msg      the msg
     * @param response the HttpServletResponse
     * @throws IOException on error
     */
    public static void htmlMessage(String msg, HttpServletResponse response) throws IOException {
        htmlMessage("Scaler", msg, response);
    }

    /**
     * print a servlet response
     * 
     * @param title    the title
     * @param msg      the msg
     * @param response the HttpServletResponse
     * @throws IOException on error
     */
    public static void htmlMessage(String title, String msg, HttpServletResponse response) throws IOException {
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
     * @param f        Image file to be sent.
     * @param mt       mime-type of the file.
     * @param name     name of the download file (for application/x)
     * @param response ServletResponse where the image file will be sent.
     * @throws ImageOpException on error
     * @throws IOException      on error
     */
    public static void sendFile(File f, String mt, String name, HttpServletResponse response)
            throws ImageOpException, IOException {
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
     * @param f        Image file to be sent.
     * @param mt       mime-type of the file.
     * @param name     name of the download file (for application/x)
     * @param response ServletResponse where the image file will be sent.
     * @param logger   Logger to use
     * @throws ImageOpException on error
     * @throws IOException      on error
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
        if (!mt.isEmpty()) {
            response.setContentType(mt);
        }

        /*
         * set content-disposition with filename unless name="".
         */
        if (name == null) {
            // no download name -- use filename
            name = f.getName();
        }
        if (!name.isEmpty()) {
            if (mt.startsWith("application")) {
                response.addHeader("Content-Disposition", "attachment; filename=\"" + name + "\"");
            } else {
                response.addHeader("Content-Disposition", "inline; filename=\"" + name + "\"");
            }
        }

        /*
         * set CORS header ACAO "*" for image or info response
         */
        if (corsForImageRequests && !mt.isEmpty()) {
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
     * @param img      the DocuImage
     * @param mimeType the mime-type
     * @param response the HttpServletResponse
     * @throws ImageOpException on error
     * @throws ServletException Exception on sending data.
     */
    public static void sendImage(DocuImage img, String mimeType, HttpServletResponse response)
            throws ImageOpException, IOException {
        ServletOps.sendImage(img, mimeType, response, ServletOps.logger);
    }

    /**
     * Write image img to ServletResponse response as data of mimeType.
     * 
     * If mimeType is null, use heuristics for type.
     * 
     * @param img      the DocuImage
     * @param mimeType the mime-type
     * @param response the HttpServletResponse
     * @param logger   the Logger
     * @throws ImageOpException on error
     * @throws ServletException Exception on sending data.
     */
    public static void sendImage(DocuImage img, String mimeType, HttpServletResponse response, Logger logger)
            throws ImageOpException, IOException {
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
             * set content-disposition with filename. uses filename provided in DocuImage.
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
            throw new ImageOutputException("Error sending image.", e);
        } finally {
            img.dispose();
        }
    }

    /**
     * Sends IIIF compatible image information as application/json response.
     * 
     * @see <a href="https://iiif.io/api/image/3.0/#image-information">IIIF Image
     *      Information Request</a>
     * 
     * @param dlReq    the DigilibServletRequest
     * @param response the HttpServletResponse
     * @param logger   the Logger
     * @throws ServletException on error
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
        String url = getIiifImageUrl(dlReq);
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

            if (dlConfig.getAsString("iiif-api-version").startsWith("3.")) {
                /*
                 * IIIF Image API V2
                 */
                // use JSON-LD content type only when asked
                String accept = dlReq.getServletRequest().getHeader("Accept");
                if (accept != null && accept.contains("application/ld+json")) {
                    response.setContentType("application/ld+json");
                } else {
                    response.setContentType("application/ld+json;profile=\"http://iiif.io/api/image/3/context.json\"");
                }
                // write info.json
                ServletOutputStream out = response.getOutputStream();
                JsonGenerator info = Json.createGenerator(out);
                writeIiifV3Info(info, logger, size, imageSet, url);
                info.close();

            } else if (dlConfig.getAsString("iiif-api-version").startsWith("2.")) {
                /*
                 * IIIF Image API V2
                 */
                // use JSON-LD content type only when asked
                String accept = dlReq.getServletRequest().getHeader("Accept");
                if (accept != null && accept.contains("application/ld+json")) {
                    response.setContentType("application/ld+json");
                } else {
                    response.setContentType("application/json");
                }
                // write info.json
                ServletOutputStream out = response.getOutputStream();
                JsonGenerator info = Json.createGenerator(out);
                writeIiifV2Info(info, logger, size, imageSet, url);
                info.close();

            } else {
                /*
                 * IIIF Image API V1
                 */
                response.setContentType("application/json,application/ld+json");
                // write info.json
                ServletOutputStream out = response.getOutputStream();
                JsonGenerator info = Json.createGenerator(out);
                writeIiifV1Info(info, size, url);
                info.close();
            }
        } catch (IOException e) {
            throw new ServletException("Unable to write response!", e);
        }
    }

    /**
     * Write IIIF Image API version 1 image information to info.
     * 
     * @param info
     * @param size
     * @param url
     * @throws IOException
     */
    protected static void writeIiifV1Info(JsonGenerator info, ImageSize size, String url) throws IOException {
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
    }

    /**
     * Write IIIF Image API version 2 image information to info.
     * 
     * @param info
     * @param logger
     * @param size
     * @param imageSet
     * @param url
     * @throws IOException
     */
    protected static void writeIiifV2Info(JsonGenerator info, Logger logger, ImageSize size, ImageSet imageSet,
            String url) throws IOException {
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
            ImageSize ois = new ImageSize();
            for (ListIterator<ImageInput> i = imageSet.getLoresIterator(); i.hasPrevious();) {
                ImageInput ii = i.previous();
                ImageSize is = ii.getSize();
                if (!ois.equals(is)) {
                    // write size if different
                    // sizes[{
                    info.writeStartObject().write("width", is.getWidth()).write("height", is.getHeight()).writeEnd();
                    ois = is;
                }
            }
            // sizes[]
            info.writeEnd();
        }
        // add tile information (currently only one size of tiles)
        ImageInput ii = imageSet.get(0);
        ImageSize is = ii.getSize();
        List<Integer> tileFactors = new ArrayList<Integer>();
        ImageSize ts = null;
        for (ListIterator<ImageInput> i = imageSet.getHiresIterator(); i.hasNext();) {
            ImageInput sii = i.next();
            ImageSize sts = sii.getTileSize();
            int osf = 0;
            if (sts != null) {
                // initialize default tile size
                if (ts == null)
                    ts = sts;
                // scaled images should have same tile size!
                if (sts.getHeight() == ts.getHeight()) {
                    // scale factor is integer divider of original size
                    int sf = Math.round((float) is.getWidth() / (float) sii.getSize().getWidth());
                    // add factor if different
                    if (sf != osf) {
                        tileFactors.add(sf);
                        osf = sf;
                    }
                } else {
                    logger.warn("IIIF-info: scaled image " + i + " has different tile size! Ignoring.");
                }
            }
        }
        if (!tileFactors.isEmpty()) {
            // tiles[{
            info.writeStartArray("tiles");
            info.writeStartObject();
            info.write("width", ts.getWidth());
            info.write("height", ts.getHeight());
            // scalefactors[
            info.writeStartArray("scaleFactors");
            for (Integer sf : tileFactors) {
                info.write(sf);
            }
            // scalefactors[]
            info.writeEnd();
            // tiles[{}
            info.writeEnd();
            // tiles[]
            info.writeEnd();
        }
        // end info.json
        info.writeEnd();
    }

    /**
     * Write IIIF Image API version 3 image information to info.
     * 
     * @param info
     * @param logger
     * @param size
     * @param imageSet
     * @param url
     * @throws IOException
     */
    protected static void writeIiifV3Info(JsonGenerator info, Logger logger, ImageSize size, ImageSet imageSet,
            String url) throws IOException {
        // top level object
        info.writeStartObject()
            .write("@context", "http://iiif.io/api/image/3/context.json")
            .write("id", url)
            .write("type", "ImageService3")
            .write("protocol", "http://iiif.io/api/image")
            .write("profile", "level2")
            .write("width", size.width)
            .write("height", size.height);
        if (dlConfig.getAsInt("max-image-size") > 0) {
            info.write("maxArea", dlConfig.getAsInt("max-image-size"));
        }
        // extraFeatures[] additional to level 2
        info.writeStartArray("extraFeatures")
            .write("mirroring")
            .write("rotationArbitrary")
            // .write("sizeUpscaling") // TODO: implement v3 upscaling
            .writeEnd();
        // extraQualities[] additional to level 2
        info.writeStartArray("extraQualities")
            .write("bitonal")
            .writeEnd();
        // add size of original and prescaled images
        int numImgs = imageSet.size();
        if (numImgs > 0) {
            // sizes[
            info.writeStartArray("sizes");
            ImageSize ois = new ImageSize();
            for (ListIterator<ImageInput> i = imageSet.getLoresIterator(); i.hasPrevious();) {
                ImageInput ii = i.previous();
                ImageSize is = ii.getSize();
                if (!ois.equals(is)) {
                    // write size if different
                    // sizes[{
                    info.writeStartObject()
                        .write("width", is.getWidth())
                        .write("height", is.getHeight())
                        .writeEnd();
                    ois = is;
                }
            }
            // sizes[]
            info.writeEnd();
        }
        // add tile information (currently only one size of tiles)
        ImageInput ii = imageSet.get(0);
        ImageSize is = ii.getSize();
        List<Integer> tileFactors = new ArrayList<Integer>();
        ImageSize ts = null;
        for (ListIterator<ImageInput> i = imageSet.getHiresIterator(); i.hasNext();) {
            ImageInput sii = i.next();
            ImageSize sts = sii.getTileSize();
            int osf = 0;
            if (sts != null) {
                // initialize default tile size
                if (ts == null)
                    ts = sts;
                // scaled images should have same tile size!
                if (sts.getHeight() == ts.getHeight()) {
                    // scale factor is integer divider of original size
                    int sf = Math.round((float) is.getWidth() / (float) sii.getSize().getWidth());
                    // add factor if different
                    if (sf != osf) {
                        tileFactors.add(sf);
                        osf = sf;
                    }
                } else {
                    logger.warn("IIIF-info: scaled image " + i + " has different tile size! Ignoring.");
                }
            }
        }
        if (!tileFactors.isEmpty()) {
            // tiles[{
            info.writeStartArray("tiles");
            info.writeStartObject();
            info.write("width", ts.getWidth());
            info.write("height", ts.getHeight());
            // scalefactors[
            info.writeStartArray("scaleFactors");
            for (Integer sf : tileFactors) {
                info.write(sf);
            }
            // scalefactors[]
            info.writeEnd();
            // tiles[{}
            info.writeEnd();
            // tiles[]
            info.writeEnd();
        }
        // end info.json
        info.writeEnd();
    }

    /**
     * Returns the IIIF URL for the requested image.
     * 
     * @param dlReq
     * @return
     */
    public static String getIiifImageUrl(DigilibServletRequest dlReq) {
        String url = dlConfig.getAsString("iiif-image-base-url");
        if (!url.isEmpty()) {
            // create url from base-url config and undecoded PATH_INFO
            String iiifPrefix = dlConfig.getAsString("iiif-prefix");
            url = url.substring(0, url.lastIndexOf(iiifPrefix) - 1);
            // we can't just take pathInfo because it decodes encoded symbols in the path
            String uri = dlReq.getServletRequest().getRequestURI();
            url += uri.substring(uri.lastIndexOf(iiifPrefix) - 1, uri.length());
        } else {
            // create url from request
            url = dlReq.getServletRequest().getRequestURL().toString();
        }
        return url;
    }

    /**
     * Returns text representation of headers for debuggging purposes.
     * 
     * @param req the HttpServletRequest
     * @return the headers string
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
