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
	Logger logger = Logger.getLogger("digilib.manifester");

	/** logger for accounting requests */
	protected static Logger accountlog = Logger.getLogger("account.manifester.request");

	/** AuthOps instance */
	AuthzOps authzOp;

	/** DocuDirCache instance */
	DocuDirCache dirCache;

	/** use authentication */
	boolean useAuthorization = false;
	
	/** scaler servlet path */
	String scalerServletPath;

	/** character for IIIF path separation */
    private String iiifPathSep;

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
		// Scaler path
		scalerServletPath = dlConfig.getAsString("scaler-servlet-path");
		// IIIF path separator
		iiifPathSep = dlConfig.getAsString("iiif-slash-replacement");
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
            if (dlDir.size() == 0) {
                logger.debug("Directory has no files: " + dlFn);
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
                return;
            }

            ManifestParams params = new ManifestParams();

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
			 * get manifest base URL
			 */
			String baseurl = request.getRequestURL().toString();
			// get base URL for Servlets
			int srvPathLen = request.getServletPath().length() + request.getPathInfo().length();
			String servletBaseUrl = baseurl.substring(0, baseurl.length() - srvPathLen);
			// clean manifest base URL
			if (baseurl.endsWith("/")) {
				baseurl = baseurl.substring(0, baseurl.length() - 1);
			}
			// pathInfo = IIIF id with prefix
			String iiifPath = request.getPathInfo();
            if (iiifPath.endsWith("/")) {
                iiifPath = iiifPath.substring(0, iiifPath.length() - 1);
            }
			
			params.manifestUrl = baseurl;
			params.imgApiUrl = servletBaseUrl +"/" + this.scalerServletPath;
			params.iiifPath = iiifPath;
			params.docuDir = dlDir;
			
			/*
			 * start json representation
			 */
			ServletOutputStream out = response.getOutputStream();
			JsonGenerator manifest = Json.createGenerator(out).writeStartObject();
			/*
			 * manifest metadata
			 */
			writeManifestMeta(manifest, dlFn, params);
			
			/*
			 * sequences
			 */
			writeSequences(manifest, params);
			
			manifest.writeEnd(); // manifest
			manifest.close();

		} catch (IOException e) {
			logger.error("ERROR sending manifest: ", e);
		}
	}

    /**
     * @param manifest
     * @param dlFn
     * @param params 
     */
    protected void writeManifestMeta(JsonGenerator manifest, String dlFn, ManifestParams params) {
        manifest.write("@context", "http://iiif.io/api/presentation/2/context.json")
            .write("@type", "sc:Manifest")
            .write("@id", params.manifestUrl + "/manifest")
            .write("label", "(Scanned work " + dlFn + ")")
            .write("description", "(Automatically generated manifest for scanned work " + dlFn + ")");
    }

    /**
     * @param dlDir
     * @param url
     * @param manifest
     * @param servletBaseUrl 
     */
    protected void writeSequences(JsonGenerator manifest, ManifestParams params) {
        manifest.writeStartArray("sequences");
        /*
         * first sequence
         */
        writeSequence(manifest, params);
        
        manifest.writeEnd(); // sequences
    }

	/**
	 * @param dlDir
	 * @param url
	 * @param manifest
	 * @param servletUrl 
	 */
	protected void writeSequence(JsonGenerator manifest, ManifestParams params) {
		manifest.writeStartObject()
			.write("@id", params.manifestUrl + "/sequence/default")
			.write("@type", "sc:Sequence")
			.write("label", "Scan image order");
		/*
		 * canvases
		 */
		writeCanvases(manifest, params);
		
		manifest.writeEnd(); // sequence
	}

	/**
	 * @param dlDir
	 * @param url
	 * @param manifest
	 * @param servletUrl 
	 */
	protected void writeCanvases(JsonGenerator manifest, ManifestParams params) {
		/*
		 * list of canvases
		 */
		manifest.writeStartArray("canvases");
		
		int idx = 0;
		for (DocuDirent imgFile : params.docuDir) {
			idx += 1;
			ImageFileSet imgFs = (ImageFileSet) imgFile;
			ImageInput img = imgFs.getBiggest();
			ImageSize imgSize = img.getSize();
			/*
			 * canvas
			 */
			writeCanvas(manifest, idx, imgFile, imgSize, params);
		}
		
		manifest.writeEnd(); // canvases
	}

	/**
	 * @param url
	 * @param manifest
	 * @param idx
	 * @param imgFile
	 * @param imgSize
	 * @param servletUrl 
	 */
    protected void writeCanvas(JsonGenerator manifest, int idx, DocuDirent imgFile, ImageSize imgSize,
            ManifestParams params) {
        manifest.writeStartObject()
            .write("@type", "sc:Canvas")
            .write("@id", params.manifestUrl + "/canvas/p" + idx)
            .write("label", "image " + imgFile.getName())
            .write("height", imgSize.getHeight())
            .write("width", imgSize.getWidth());
        /*
         * images
         */
        writeImages(manifest, idx, imgFile, imgSize, params);

        manifest.writeEnd(); // canvas
    }

	/**
	 * @param url
	 * @param manifest
	 * @param idx
	 * @param imgFile
	 * @param imgSize
	 * @param servletUrl 
	 */
    protected void writeImages(JsonGenerator manifest, int idx, DocuDirent imgFile, ImageSize imgSize,
            ManifestParams params) {
        /*
         * list of images (just one)
         */
        manifest.writeStartArray("images");
        /*
         * image
         */
        writeImage(manifest, idx, imgFile, imgSize, params);

        manifest.writeEnd(); // images
    }

	/**
	 * @param url
	 * @param manifest
	 * @param idx
	 * @param imgFile
	 * @param imgSize
	 * @param servletUrl 
	 */
    protected void writeImage(JsonGenerator manifest, int idx, DocuDirent imgFile, ImageSize imgSize,
            ManifestParams params) {
        manifest.writeStartObject()
            .write("@type", "oa:Annotation")
            .write("@id", params.manifestUrl + "/annotation/p" + idx + "-image")
            .write("motivation", "sc:painting");
        /*
         * resource
         */
        writeResource(manifest, imgFile, imgSize, params);

        manifest.write("on", params.manifestUrl + "/canvas/p" + idx).writeEnd(); // image
    }

	/**
	 * @param url
	 * @param manifest
	 * @param imgFile
	 * @param imgSize
	 * @param servletUrl 
	 */
    protected void writeResource(JsonGenerator manifest, DocuDirent imgFile, ImageSize imgSize,
            ManifestParams params) {
        // base URL for image using IIIF image API
        String iiifImgBaseUrl = params.imgApiUrl + params.iiifPath + this.iiifPathSep + FileOps.basename(imgFile.getName());
        // IIIF image parameters
        String imgUrl = iiifImgBaseUrl + "/full/full/0/default.jpg";
		manifest.writeStartObject("resource")
			.write("@id", imgUrl)
			.write("@type", "dctypes:Image")
			.write("format", "image/jpeg")
		    .write("height", imgSize.getHeight())
			.write("width", imgSize.getWidth());
        /*
         * (iiif) service
         */
        writeService(manifest, iiifImgBaseUrl, params);
        
        manifest.writeEnd(); // resource
	}

	/**
	 * @param manifest
	 * @param iiifImgBaseUrl 
	 * @param servletUrl 
	 */
	protected void writeService(JsonGenerator manifest, String iiifImgBaseUrl, ManifestParams params) {
		manifest.writeStartObject("service")
			.write("@context", "http://iiif.io/api/image/2/context.json")
			.write("@id", iiifImgBaseUrl)
			.write("profile", "http://iiif.io/api/image/2/profiles/level2.json")
			.writeEnd(); // service
	}

	/**
	 * Class holding parameters to construct manifest.
	 * @author casties
	 *
	 */
	protected class ManifestParams {
	    public DocuDirectory docuDir;
        String manifestUrl;
	    String imgApiUrl;
	    String iiifPath;	    
	}
}