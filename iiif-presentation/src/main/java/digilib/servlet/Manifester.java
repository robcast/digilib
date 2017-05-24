package digilib.servlet;

/*
 * #%L
 * 
 * Texter.java -- Servlet for displaying text
 * 
 * Digital Image Library servlet components
 * %%
 * Copyright (C) 2003 - 2017 MPIWG Berlin
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
 * Author: Robert Casties (robcast@sourceforge.net)
 * Created on 24.5.2017
 */

import java.io.IOException;

import javax.json.Json;
import javax.json.stream.JsonGenerator;
import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.auth.AuthzOps;
import digilib.conf.DigilibServletConfiguration;
import digilib.conf.DigilibServletRequest;
import digilib.conf.ManifestServletConfiguration;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.DocuDirent;
import digilib.io.FileOps;
import digilib.io.ImageFileSet;
import digilib.io.ImageInput;
import digilib.util.ImageSize;

/**
 * Servlet for displaying text
 * 
 * 
 * @author casties
 * 
 */
public class Manifester extends HttpServlet {

	private static final long serialVersionUID = 6678666342141409868L;

	/** Servlet version */
	public static String tlVersion = ManifestServletConfiguration.getClassVersion();

	/** DigilibConfiguration instance */
	DigilibServletConfiguration dlConfig = null;

	/** general logger */
	Logger logger = Logger.getLogger("digilib.texter");

	/** logger for accounting requests */
	protected static Logger accountlog = Logger.getLogger("account.texter.request");

	/** FileOps instance */
	FileOps fileOp;

	/** AuthOps instance */
	AuthzOps authzOp;

	/** ServletOps instance */
	ServletOps servletOp;

	/** DocuDirCache instance */
	DocuDirCache dirCache;

	/** use authentication */
	boolean useAuthorization = false;

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
	 */
	public void init(ServletConfig config) throws ServletException {
		super.init(config);

		System.out.println("***** Digital Image Library IIF Manifest Servlet (version " + tlVersion + ") *****");

		// get our ServletContext
		ServletContext context = config.getServletContext();
		// see if there is a Configuration instance
		dlConfig = ManifestServletConfiguration.getCurrentConfig(context);
		if (dlConfig == null) {
			// no Configuration
			throw new ServletException("No Configuration!");
		}
		// say hello in the log file
		logger.info("***** Digital Image Library IIIF Manifest Servlet (version " + tlVersion + ") *****");

		// set our AuthOps
		useAuthorization = dlConfig.getAsBoolean("use-authorization");
		authzOp = (AuthzOps) dlConfig.getValue(DigilibServletConfiguration.AUTHZ_OP_KEY);
		// DocuDirCache instance
		dirCache = (DocuDirCache) dlConfig.getValue(DigilibServletConfiguration.DIR_CACHE_KEY);
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.
	 * HttpServletRequest, javax.servlet.http.HttpServletResponse)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		accountlog.info("GET from " + request.getRemoteAddr());
		// do the processing
		processRequest(request, response);
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.http.HttpServlet#doPost(javax.servlet.http.
	 * HttpServletRequest, javax.servlet.http.HttpServletResponse)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		accountlog.info("POST from " + request.getRemoteAddr());
		// do the processing
		processRequest(request, response);
	}

	protected void processRequest(HttpServletRequest request, HttpServletResponse response) {

		/*
		 * request parameters
		 */
		// create new request with defaults
		DigilibServletRequest dlRequest = new DigilibServletRequest(request, dlConfig);
		try {
			// get directory path
			String dlFn = dlRequest.getFilePath();
			// get information about the directory
			DocuDirectory dlDir = dirCache.getDirectory(dlFn);
			if (dlDir == null) {
				logger.error("Directory for manifest not found: " + dlFn);
				response.sendError(HttpServletResponse.SC_NOT_FOUND);
				return;
			}
			/*
			 * set CORS header ACAO "*" for info response as per IIIF spec
			 */
			if (dlConfig.getAsBoolean("iiif-info-cors")) {
				String origin = request.getHeader("Origin");
				if (origin != null) {
					response.setHeader("Access-Control-Allow-Origin", "*");
				}
			}

			// use JSON-LD content type only when asked
			String accept = request.getHeader("Accept");
			if (accept != null && accept.contains("application/ld+json")) {
				response.setContentType("application/ld+json");
			} else {
				response.setContentType("application/json");
			}

			/*
			 * get manifest URL
			 */
			String url = request.getRequestURL().toString();
			if (url.endsWith("/")) {
				url = url.substring(0, url.lastIndexOf("/"));
			}

			/*
			 * create json representation
			 */
			ServletOutputStream out = response.getOutputStream();
			JsonGenerator manifest = Json.createGenerator(out).writeStartObject();
			/*
			 * manifest metadata
			 */
			writeManifestMeta(dlFn, url, manifest);
			/*
			 * sequences
			 */
			manifest.writeStartArray("sequences");
			/*
			 * first sequence
			 */
			writeSequence(dlDir, url, manifest);
			
			manifest.writeEnd(); // sequences
			
			manifest.writeEnd(); // manifest
			manifest.close();

		} catch (IOException e) {
			logger.error("ERROR sending manifest: ", e);
		}
	}

	/**
	 * @param dlDir
	 * @param url
	 * @param manifest
	 */
	protected void writeSequence(DocuDirectory dlDir, String url, JsonGenerator manifest) {
		manifest.writeStartObject()
			.write("@id", url + "/sequence/default")
			.write("@type", "sc:Sequence")
			.write("label", "Scan image order");
		/*
		 * canvases
		 */
		writeCanvases(dlDir, url, manifest);
		
		manifest.writeEnd(); // sequence
	}

	/**
	 * @param dlDir
	 * @param url
	 * @param manifest
	 */
	protected void writeCanvases(DocuDirectory dlDir, String url, JsonGenerator manifest) {
		/*
		 * list of canvases
		 */
		manifest.writeStartArray("canvases");
		
		int idx = 0;
		for (DocuDirent imgFile : dlDir) {
			idx += 1;
			ImageFileSet imgFs = (ImageFileSet) imgFile;
			ImageInput img = imgFs.getBiggest();
			ImageSize imgSize = img.getSize();
			/*
			 * canvas
			 */
			writeCanvas(url, manifest, idx, imgFile, imgSize);
		}
		
		manifest.writeEnd(); // canvases
	}

	/**
	 * @param url
	 * @param manifest
	 * @param idx
	 * @param imgFile
	 * @param imgSize
	 */
	protected void writeCanvas(String url, JsonGenerator manifest, int idx, DocuDirent imgFile, ImageSize imgSize) {
		manifest.writeStartObject()
			.write("@type", "sc:Canvas")
			.write("@id", url + "/canvas/p" + idx)
			.write("label", "image " + imgFile.getName())
			.write("height", imgSize.getHeight())
			.write("width", imgSize.getWidth());
		/*
		 * images
		 */
		writeImages(url, manifest, idx, imgFile, imgSize);
		
		manifest.writeEnd(); // canvas
	}

	/**
	 * @param url
	 * @param manifest
	 * @param idx
	 * @param imgFile
	 * @param imgSize
	 */
	protected void writeImages(String url, JsonGenerator manifest, int idx, DocuDirent imgFile, ImageSize imgSize) {
		/*
		 * list of images (just one)
		 */
		manifest.writeStartArray("images");
		/*
		 * image
		 */
		writeImage(url, manifest, idx, imgFile, imgSize);
		
		manifest.writeEnd(); // images
	}

	/**
	 * @param url
	 * @param manifest
	 * @param idx
	 * @param imgFile
	 * @param imgSize
	 */
	protected void writeImage(String url, JsonGenerator manifest, int idx, DocuDirent imgFile, ImageSize imgSize) {
		manifest.writeStartObject()
			.write("@type", "oa:Annotation")
			.write("@id", url + "/annotation/p" + idx + "-image")
			.write("motivation", "sc:painting");
		/*
		 * resource
		 */
		writeResource(url, manifest, imgFile, imgSize);
		
		manifest.write("on", url + "/canvas/p" + idx)
			.writeEnd(); // image
	}

	/**
	 * @param url
	 * @param manifest
	 * @param imgFile
	 * @param imgSize
	 */
	protected void writeResource(String url, JsonGenerator manifest, DocuDirent imgFile, ImageSize imgSize) {
		manifest.writeStartObject("resource")
			.write("@id", url + "/" + imgFile.getName())
			.write("@type", "dctypes:Image");
		/*
		 * service
		 */
		writeService(manifest);
		
		manifest.write("height", imgSize.getHeight())
			.write("width", imgSize.getWidth())
			.writeEnd(); // resource
	}

	/**
	 * @param manifest
	 */
	protected void writeService(JsonGenerator manifest) {
		manifest.writeStartObject("service")
			.write("@context", "http://iiif.io/api/image/2/context.json")
			.write("@id", "digilib-iiif???")
			.write("profile", "http://iiif.io/api/image/2/profiles/level2.json")
			.writeEnd(); // service
	}

	/**
	 * @param dlFn
	 * @param url
	 * @param manifest
	 */
	protected void writeManifestMeta(String dlFn, String url, JsonGenerator manifest) {
		manifest.write("@context", "http://iiif.io/api/presentation/2/context.json")
			.write("@type", "sc:Manifest")
			.write("@id", url + "/manifest")
			.write("label", "(Scanned work " + dlFn + ")");
	}

}