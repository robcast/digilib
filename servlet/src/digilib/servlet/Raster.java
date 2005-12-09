/*
 * Raster -- Servlet for displaying rasterized SVG graphics
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 2003 Robert Casties (robcast@mail.berlios.de)
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 * 
 * Please read license.txt for the full details. A copy of the GPL may be found
 * at http://www.gnu.org/copyleft/lgpl.html You should have received a copy of
 * the GNU General Public License along with this program; if not, write to the
 * Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA
 * 02111-1307 USA
 * 
 * Created on 25.11.2003 by casties
 */

package digilib.servlet;

import java.awt.geom.Rectangle2D;
import java.io.IOException;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.SAXParserFactory;

import org.apache.batik.dom.svg.SAXSVGDocumentFactory;
import org.apache.batik.transcoder.TranscoderException;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.transcoder.image.PNGTranscoder;
import org.apache.batik.util.XMLResourceDescriptor;
import org.apache.log4j.Logger;
import org.w3c.dom.svg.SVGDocument;
import org.w3c.dom.svg.SVGSVGElement;

import digilib.auth.AuthOps;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.SVGFile;

/**
 * Servlet for displaying SVG graphics
 * 
 * @author casties
 *  
 */
public class Raster extends HttpServlet {

	private static final long serialVersionUID = -7756999389932675241L;

	/** Servlet version */
	public static String servletVersion = "0.2b1";
	/** DigilibConfiguration instance */
	DigilibConfiguration dlConfig = null;
	/** general logger */
	Logger logger = Logger.getLogger("digilib.raster");
	/** AuthOps instance */
	AuthOps authOp;
	/** DocuDirCache instance */
	DocuDirCache dirCache;
	/** SVG document factory */
	SAXSVGDocumentFactory docFactory;

	/** use authentication */
	boolean useAuthentication = false;

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
	 */
	public void init(ServletConfig config) throws ServletException {
		super.init(config);

		System.out.println(
			"***** Digital Image Library SVG Render Servlet (version "
				+ servletVersion
				+ ") *****");

		// get our ServletContext
		ServletContext context = config.getServletContext();
		// see if there is a Configuration instance
		dlConfig =
			(DigilibConfiguration) context.getAttribute(
				"digilib.servlet.configuration");
		if (dlConfig == null) {
			// no config
			throw new ServletException("ERROR: No Configuration!");
		}
		// say hello in the log file
		logger.info(
			"***** Digital Image Library SVG Render Servlet (version "
				+ servletVersion
				+ ") *****");

		// set our AuthOps
		useAuthentication = dlConfig.getAsBoolean("use-authorization");
		authOp = (AuthOps) dlConfig.getValue("servlet.auth.op");
		// DocuDirCache instance
		dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
		// parser name as a String (I hate you for not using JAXP, Batik!)
		String parserName = null;
		try {
			// try the proper JAXP way
			parserName = SAXParserFactory.newInstance().newSAXParser().getXMLReader().getClass().getName();
		} catch (Exception e) {
			// fall back to Batik's hack
			parserName = XMLResourceDescriptor.getXMLParserClassName();
		}
		logger.debug("parser name: "+parserName);
		docFactory = new SAXSVGDocumentFactory(parserName);
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest,
	 *      javax.servlet.http.HttpServletResponse)
	 */
	protected void doGet(
		HttpServletRequest request,
		HttpServletResponse response)
		throws ServletException, IOException {
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// add DigilibRequest to ServletRequest
		request.setAttribute("digilib.servlet.request", dlReq);
		// do the processing
		processRequest(request, response);
	}

	/*
	 */
	protected void doPost(
		HttpServletRequest request,
		HttpServletResponse response)
		throws ServletException, IOException {
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// add DigilibRequest to ServletRequest
		request.setAttribute("digilib.servlet.request", dlReq);
		// do the processing
		processRequest(request, response);
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.http.HttpServlet#getLastModified(javax.servlet.http.HttpServletRequest)
	 */
	protected long getLastModified(HttpServletRequest request) {
		logger.debug("GetLastModified from " + request.getRemoteAddr()
				+ " for " + request.getQueryString());
		long mtime = -1;
		// create new request with defaults
		DigilibRequest dlReq = new DigilibRequest();
		// set with request parameters
		dlReq.setWithRequest(request);
		// find the requested file
		
		// get PathInfo
		String loadPathName = dlReq.getFilePath();
		// find the file(set)
		SVGFile fileToLoad =
			(SVGFile) dirCache.getFile(
				loadPathName,
				dlReq.getAsInt("pn"),
				FileOps.CLASS_SVG);
		if (fileToLoad != null) {
			DocuDirectory dd = (DocuDirectory) fileToLoad.getParent();
			mtime = dd.getDirMTime() / 1000 * 1000;
		}
		return mtime;
	}

	
	
	
	protected void processRequest(
		HttpServletRequest request,
		HttpServletResponse response)
		throws ServletException, IOException {

		logger.debug("request: "+request.getQueryString());
		// time for benchmarking
		long startTime = System.currentTimeMillis();

		/*
		 * request parameters
		 */
		DigilibRequest dlRequest =
			(DigilibRequest) request.getAttribute("digilib.servlet.request");

		// destination image width
		int paramDW = dlRequest.getAsInt("dw");
		// destination image height
		int paramDH = dlRequest.getAsInt("dh");
		// relative area x_offset (0..1)
		float paramWX = dlRequest.getAsFloat("wx");
		// relative area y_offset
		float paramWY = dlRequest.getAsFloat("wy");
		// relative area width (0..1)
		double paramWW = dlRequest.getAsFloat("ww");
		// relative area height
		double paramWH = dlRequest.getAsFloat("wh");

		try {

			/*
			 * find the file to load/send
			 */

			// get PathInfo
			String loadPathName = dlRequest.getFilePath();
			// find the file(set)
			SVGFile fileToLoad =
				(SVGFile) dirCache.getFile(
					loadPathName,
					dlRequest.getAsInt("pn"),
					FileOps.CLASS_SVG);
			if (fileToLoad == null) {
				throw new FileOpException(
					"File "
						+ loadPathName
						+ "("
						+ dlRequest.getAsString("pn")
						+ ") not found.");
			}

			/*
			 * read the SVG document
			 */

			// read the document
			SVGDocument doc =
				docFactory.createSVGDocument(
					fileToLoad.getFile().toURI().toString());
			// extract the SVG root
			SVGSVGElement svgroot = doc.getRootElement();
			// get document width and height
			float imgWidth = svgroot.getWidth().getBaseVal().getValue();
			float imgHeight = svgroot.getHeight().getBaseVal().getValue();
			logger.debug("IMG: "+imgWidth+"x"+imgHeight);
			
			/*
			 * set up the transcoder
			 */

			// create a PNG transcoder
			PNGTranscoder transcoder = new PNGTranscoder();
			// create the transcoder input
			//InputStream is = new FileInputStream(fileToLoad.getFile());
			TranscoderInput input = new TranscoderInput(doc);
			logger.info("Loading: " + fileToLoad.getFile());
			// create the transcoder output
			TranscoderOutput output =
				new TranscoderOutput(response.getOutputStream());
			// output is image/png
			response.setContentType("image/png");

			// area of interest
			Rectangle2D aoi =
			new Rectangle2D.Double(
					paramWX * imgWidth,
					paramWY * imgHeight,
					paramWW * imgWidth,
					paramWH * imgHeight);
			transcoder.addTranscodingHint(PNGTranscoder.KEY_AOI, aoi);

			// destination image dimensions
			if (paramDW > 0) {
				transcoder.addTranscodingHint(
					PNGTranscoder.KEY_WIDTH,
					new Float(paramDW));
			}
			if (paramDH > 0) {
				transcoder.addTranscodingHint(
					PNGTranscoder.KEY_HEIGHT,
					new Float(paramDH));
			}

			/*
			 * transcode
			 */

			transcoder.transcode(input, output);

			logger.info(
				"Done in " + (System.currentTimeMillis() - startTime) + "ms");

			/*
			 * error handling
			 */
			
		} catch (FileOpException e) {
			logger.error("ERROR: File IO Error: ", e);
			try {
				ServletOps.htmlMessage("ERROR: File IO Error: " + e, response);
			} catch (Exception ex) {
			} // so we don't get a loop
		} catch (TranscoderException e) {
			logger.error("ERROR: SVG encoder error: ", e);
			try {
				ServletOps.htmlMessage(
					"ERROR: SVG encoder error: " + e,
					response);
			} catch (Exception ex) {
			} // so we don't get a loop
		}

	}

}
