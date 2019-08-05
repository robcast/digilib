package digilib.servlet;

/*
 * #%L
 * 
 * Manifester.java -- Servlet for creating IIIF Presentation API manifests.
 * 
 * Digital Image Library servlet components
 * %%
 * Copyright (C) 2003 - 2018 MPIWG Berlin
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

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.EnumSet;
import java.util.List;
import java.util.Map.Entry;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonObject;
import javax.json.JsonReader;
import javax.json.JsonValue;
import javax.json.JsonValue.ValueType;
import javax.json.stream.JsonGenerator;
import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.auth.AuthOpException;
import digilib.auth.AuthzOps;
import digilib.conf.DigilibRequest.ParsingOption;
import digilib.conf.DigilibServletConfiguration;
import digilib.conf.DigilibServletRequest;
import digilib.conf.ManifestServletConfiguration;
import digilib.image.ImageOpException;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirectory;
import digilib.io.DocuDirectoryFactory;
import digilib.io.DocuDirent;
import digilib.io.FileOps;
import digilib.io.FsDocuDirectory;
import digilib.io.ImageInput;
import digilib.io.ImageSet;
import digilib.util.ImageSize;

/**
 * Servlet for creating IIIF Presentation API manifests.
 * 
 * Reads file manifest.json to replace the automatically generated output.
 * Reads file manifest-meta.json and merges the content into the top-level
 * of the generated manifest.
 * 
 * @author casties
 * 
 */
@WebServlet(name = "Manifester", urlPatterns = { "/Manifester/*", "/servlet/Manifester/*" })
public class Manifester extends HttpServlet {

	private static final long serialVersionUID = 6678666342141409868L;

	/** Servlet version */
	public static String mfVersion = ManifestServletConfiguration.getClassVersion();

	/** DigilibConfiguration instance */
	protected DigilibServletConfiguration dlConfig = null;

	/** general logger */
	protected Logger logger = Logger.getLogger("digilib.manifester");

	/** logger for accounting requests */
	protected static Logger accountlog = Logger.getLogger("account.manifester.request");

	/** AuthOps instance */
	protected AuthzOps authzOp;

	/** DocuDirCache instance */
	protected DocuDirCache dirCache;

	/** use authentication and authorization */
	protected boolean useAuthorization = false;
	
	/** scaler servlet path */
	protected String scalerServletPath;

	/** character for IIIF path separation */
	protected String iiifPathSep;

    /** set CORS header ACAO* for info requests */
    protected boolean corsForInfoRequests = true;
    
    /** how to create label for pages */
    protected String pageLabelMode;
    
    /** use filesystem-access to read additional json files */
    protected boolean useFilesystem = true;

	/*
	 * (non-Javadoc)
	 * 
	 * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
	 */
	public void init(ServletConfig config) throws ServletException {
		super.init(config);

		System.out.println("***** Digital Image Library IIF Manifest Servlet (version " + mfVersion + ") *****");

		// get our ServletContext
		ServletContext context = config.getServletContext();
		// see if there is a Configuration instance
		dlConfig = ManifestServletConfiguration.getCurrentConfig(context);
		if (dlConfig == null) {
			// no Configuration
			throw new ServletException("No Configuration!");
		}
		// say hello in the log file
		logger.info("***** Digital Image Library IIIF Manifest Servlet (version " + mfVersion + ") *****");

		// set our AuthOps
		useAuthorization = dlConfig.getAsBoolean("use-authorization");
		authzOp = (AuthzOps) dlConfig.getValue(DigilibServletConfiguration.AUTHZ_OP_KEY);
		// DocuDirCache instance
		dirCache = (DocuDirCache) dlConfig.getValue(DigilibServletConfiguration.DIR_CACHE_KEY);
		// Scaler path
		scalerServletPath = dlConfig.getAsString("scaler-servlet-name");
		// IIIF path separator
		iiifPathSep = dlConfig.getAsString("iiif-slash-replacement");
		// CORS for info requests
		corsForInfoRequests = dlConfig.getAsBoolean("iiif-info-cors");
		// page label mode
		pageLabelMode = dlConfig.getAsString("iiif-manifest-page-label");
		// find out if we have filesystem access
		if (DocuDirectoryFactory.getInstance() instanceof FsDocuDirectory) {
		    useFilesystem = true;
		} else {
		    useFilesystem = false;
		}
	}

    /**
     * Returns modification time relevant to the request for caching.
     * 
     * @see javax.servlet.http.HttpServlet#getLastModified(javax.servlet.http.HttpServletRequest)
     */
    public long getLastModified(HttpServletRequest request) {
        accountlog.debug("GetLastModified from " + request.getRemoteAddr() + " for " + request.getQueryString());
        long mtime = -1;
        try {
            // create new digilib request
			DigilibServletRequest dlRequest = new DigilibServletRequest(request, dlConfig,
					EnumSet.of(ParsingOption.omitIiifImageApi));
			// get list of IIIF parameters
			@SuppressWarnings("unchecked")
			List<String> iiifParams = (List<String>) dlRequest.getValue("request.iiif.elements");
			// get identifier (first parameter)
			String identifier = iiifParams.get(0);
			// decode identifier to file path
			dlRequest.setValueFromString("fn", dlRequest.decodeIiifIdentifier(identifier));
            DocuDirectory dd = dirCache.getDirectory(dlRequest.getFilePath());
            if (dd != null) {
            	// return rounded modification date of directory
                mtime = dd.getDirMTime() / 1000 * 1000;
            }
        } catch (Exception e) {
            logger.error("error in getLastModified: " + e.getMessage());
        }
        logger.debug("  returns " + mtime);
        return mtime;
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

    /* (non-Javadoc)
     * @see javax.servlet.http.HttpServlet#doOptions(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
     */
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        logger.debug("OPTIONS from " + req.getRemoteAddr());
        super.doOptions(req, resp);
    }

	protected void processRequest(HttpServletRequest request, HttpServletResponse response) {
		try {
			// create DigilibRequest from ServletRequest, omit IIIF Image API parsing
			DigilibServletRequest dlRequest = new DigilibServletRequest(request, dlConfig,
					EnumSet.of(ParsingOption.omitIiifImageApi));
			// get list of IIIF parameters
			@SuppressWarnings("unchecked")
			List<String> iiifParams = (List<String>) dlRequest.getValue("request.iiif.elements");
			if (iiifParams == null) {
				logger.error("Invalid IIIF request.");
				response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid IIIF request.");
				return;
			}
			// get identifier (first parameter)
			String identifier = ""; // allow empty identifier for image root dir
			if (iiifParams.size() > 0 && iiifParams.get(0) != null) {			
				identifier = iiifParams.get(0);
			}
			// decode identifier to file path
			dlRequest.setValueFromString("fn", dlRequest.decodeIiifIdentifier(identifier));
			// get directory path
			String dlFn = dlRequest.getFilePath();
			// get information about the directory
			DocuDirectory dlDir = dirCache.getDirectory(dlFn);
			if (dlDir == null) {
				logger.error("Directory for manifest not found: " + dlFn);
				response.sendError(HttpServletResponse.SC_NOT_FOUND);
				return;
			}
			File mfFile = null;
            if (useFilesystem) {
                // check for existing manifest file
                mfFile = new File(((FsDocuDirectory) dlDir).getDir(), "manifest.json");
            }
            // check for image files
            if ((dlDir.size() == 0) && (mfFile != null && !mfFile.canRead())) {
                logger.debug("Directory has no files: " + dlFn);
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
                return;
            }
            ManifestParams params = new ManifestParams();

            /*
			 * set CORS header ACAO "*" for info response as per IIIF spec
			 */
			if (corsForInfoRequests) {
				String origin = request.getHeader("Origin");
				if (origin != null) {
					response.setHeader("Access-Control-Allow-Origin", "*");
				}
			}

            /*
             * check permissions
             */
            if (useAuthorization) {
                // is the current request/user authorized?
                if (!authzOp.isAuthorized(dlRequest)) {
                	// TODO: does this work for directories?
                    // send deny answer and abort
                    throw new AuthOpException("Access denied!");
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
			 * check prepared manifest files
			 */
			if (mfFile != null && mfFile.canRead()) {
				// send manifest file
				ServletOps.sendFile(mfFile, "", "", response);
				return;
			}

			// check for manifest-meta.json file with additional metadata
			File mfMetaFile = null;
            if (useFilesystem) {
                mfMetaFile = new File(((FsDocuDirectory) dlDir).getDir(), "manifest-meta.json");
                if (mfMetaFile.canRead()) {
                    params.mfMetaFile = mfMetaFile;
                }
            }
			
			/*
			 * configure base URLs for manifest
			 */
			params.imgApiUrl = dlConfig.getAsString("iiif-image-base-url");
			String manifestBaseUrl = dlConfig.getAsString("iiif-manifest-base-url");
			if ("".equals(params.imgApiUrl) || "".equals(manifestBaseUrl)) {
				// try to figure out base URLs
				String servletBaseUrl = dlConfig.getAsString("webapp-base-url");
				if ("".equals(servletBaseUrl)) {
					String url = request.getRequestURL().toString();
					// get base URL for web application by last occurrence of Servlet path
					int srvPathLen = url.lastIndexOf(request.getServletPath());
					servletBaseUrl = url.substring(0, srvPathLen);
				}
				// manifest base URL
				manifestBaseUrl = servletBaseUrl + request.getServletPath() + "/" + dlConfig.getAsString("iiif-prefix");
				// Image API base URL
				params.imgApiUrl = servletBaseUrl + "/" + this.scalerServletPath + "/"
						+ dlConfig.getAsString("iiif-prefix");
			}
			// full manifest URL with identifier
			params.manifestUrl = manifestBaseUrl + "/" + dlRequest.encodeIiifIdentifier(identifier);
			params.identifier = identifier;
			params.docuDir = dlDir;
			params.dlRequest = dlRequest;
			
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
		} catch (ImageOpException e) {
			logger.error("ERROR sending manifest: ", e);
		} catch (AuthOpException e) {
			logger.debug("Permission denied.");
			try {
				response.sendError(HttpServletResponse.SC_FORBIDDEN);
			} catch (IOException e1) {
				logger.error("Error sending error: ", e);
			}
		}
	}

    /**
     * @param manifest the JsonGenerator
     * @param dlFn the fn
     * @param params the  ManifestParams
     */
    protected void writeManifestMeta(JsonGenerator manifest, String dlFn, ManifestParams params) {
    	// write manifest header
        manifest.write("@context", "http://iiif.io/api/presentation/2/context.json")
        .write("@type", "sc:Manifest")
        .write("@id", params.manifestUrl + "/manifest");

        boolean hasLabel = false;
		boolean hasDescription = false;
        
    	if (params.mfMetaFile != null) {
    		// read manifest-meta.json
    		try {
				JsonReader reader = Json.createReader(new FileInputStream(params.mfMetaFile));
				// manifest is top-level object
				JsonObject jsonManif = reader.readObject();
				for (String k : jsonManif.keySet()) {
					if (k.equals("@context")) {
						// we already have context
						continue;
					} else if (k.equals("@type")) {
						// we already have type
						continue;
					} else if (k.equals("@id")) {
						// we already have id
						continue;
                    } else if (k.equals("sequences")) {
                        // we already have sequences
                        continue;
					} else if (k.equals("label")) {
						// copy label
						hasLabel = true;
					} else if (k.equals("description")) {
						// copy description
						hasDescription = true;
					}
					// copy the rest into the manifest
					copyToManifest(k, jsonManif.get(k), manifest);
				}
			} catch (FileNotFoundException e) {
				logger.error("Error reading manifest-meta.json file", e);
			}
    	}
    	if (!hasLabel) {
    		// supply synthetic label
    		manifest.write("label", "[Scanned work " + dlFn + "]");
    	}
    	if (!hasDescription) {
    		// supply synthetic description
            manifest.write("description", "[Automatically generated manifest for scanned work " + dlFn + "]");
    	}
    }

    /**
     * @param manifest the JsonGenerator
     * @param params the  ManifestParams
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
     * @param manifest the JsonGenerator
     * @param params the  ManifestParams
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
     * @param manifest the JsonGenerator
     * @param params the  ManifestParams
	 */
	protected void writeCanvases(JsonGenerator manifest, ManifestParams params) {
		/*
		 * list of canvases
		 */
		manifest.writeStartArray("canvases");
		
		int idx = 0;
		for (DocuDirent imgFile : params.docuDir) {
			idx += 1;
			ImageSet imgFs = (ImageSet) imgFile;
			ImageInput img = imgFs.getBiggest();
			ImageSize imgSize = img.getSize();
			if (imgSize == null) continue;
			/*
			 * canvas
			 */
			writeCanvas(manifest, idx, imgFile, imgSize, params);
		}
		
		manifest.writeEnd(); // canvases
	}

    /**
     * @param manifest the JsonGenerator
     * @param idx the idx
     * @param imgFile the DocuDirent
     * @param imgSize the ImageSize
     * @param params the  ManifestParams
     */
    protected void writeCanvas(JsonGenerator manifest, int idx, DocuDirent imgFile, ImageSize imgSize,
            ManifestParams params) {
        manifest.writeStartObject()
            .write("@type", "sc:Canvas")
            .write("@id", params.manifestUrl + "/canvas/p" + idx)
            .write("height", imgSize.getHeight())
            .write("width", imgSize.getWidth());
        
        if (pageLabelMode.equals("filename")) {
            manifest.write("label", FileOps.basename(imgFile.getName()));
        } else {
            manifest.write("label", Integer.toString(idx));
        }
            
        /*
         * images
         */
        writeImages(manifest, idx, imgFile, imgSize, params);

        manifest.writeEnd(); // canvas
    }

    /**
     * @param manifest the JsonGenerator
     * @param idx the idx
     * @param imgFile the DocuDirent
     * @param imgSize the ImageSize
     * @param params the  ManifestParams
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
     * @param manifest the JsonGenerator
     * @param idx the idx
     * @param imgFile the DocuDirent
     * @param imgSize the ImageSize
     * @param params the  ManifestParams
     */
    protected void writeImage(JsonGenerator manifest, int idx, DocuDirent imgFile, ImageSize imgSize,
            ManifestParams params) {
        /*
         * image
         */        
        manifest.writeStartObject()
            .write("@type", "oa:Annotation")
            .write("@id", params.manifestUrl + "/annotation/p" + idx + "-image")
            .write("motivation", "sc:painting");
        /*
         * resource
         */
        writeResource(manifest, imgFile, imgSize, params);

        manifest.write("on", params.manifestUrl + "/canvas/p" + idx)
            .writeEnd(); // image
    }

    /**
     * @param manifest the JsonGenerator
     * @param imgFile the DocuDirent
     * @param imgSize the ImageSize
     * @param params the  ManifestParams
     */
    protected void writeResource(JsonGenerator manifest, DocuDirent imgFile, ImageSize imgSize,
            ManifestParams params) {
        // base URL for image using IIIF image API
        String filename = FileOps.basename(imgFile.getName());
        if (filename.contains("/")) {
            // make sure there are no slashes left
            filename = filename.replace("/", this.iiifPathSep);
        }
        // encode identifier for file 
        String fileId = params.dlRequest.encodeIiifIdentifier(params.identifier + this.iiifPathSep + filename);
		String iiifImgBaseUrl = params.imgApiUrl + "/" + fileId;
        // IIIF image parameters
        String imgUrl = iiifImgBaseUrl + "/full/full/0/default.jpg";
        /*
         * resource
         */
		manifest.writeStartObject("resource")
			.write("@id", imgUrl)
			.write("@type", "dctypes:Image")
			.write("format", "image/jpeg")
		    .write("height", imgSize.getHeight())
			.write("width", imgSize.getWidth());
        /*
         * (iiif) service
         */
        writeService(manifest, iiifImgBaseUrl, imgSize, params);
        
        manifest.writeEnd(); // resource
	}

    /**
     * @param manifest the JsonGenerator
     * @param iiifImgBaseUrl the iiifImgBaseUrl
     * @param imgSize the ImageSize
     * @param params the  ManifestParams
     */
    protected void writeService(JsonGenerator manifest, String iiifImgBaseUrl, ImageSize imgSize,
            ManifestParams params) {
	    /*
	     * service
	     */
		manifest.writeStartObject("service")
			.write("@context", "http://iiif.io/api/image/2/context.json")
			.write("@id", iiifImgBaseUrl)
			.write("profile", "http://iiif.io/api/image/2/profiles/level2.json")
			// maximum size
            .write("height", imgSize.getHeight())
            .write("width", imgSize.getWidth())
            /* other sizes
            .writeStartArray("sizes")
            .writeStartObject()
            .write("width", 100)
            .write("height", 100)
            .writeEnd() // size
            .writeEnd() // sizes
            */
            
			.writeEnd(); // service
	}

	/**
	 * Class holding parameters to construct manifest.
	 * @author casties
	 *
	 */
	protected class ManifestParams {
	    public DocuDirectory docuDir;
	    public DigilibServletRequest dlRequest;
	    public File mfMetaFile;
	    public String manifestUrl;
	    public String imgApiUrl;
	    public String identifier;	    
	}
	
    /**
     * Write JSON object value recursively under key into JsonGenerator manifest.
     * 
     * @param key the key
     * @param value the JsonValue
     * @param manifest the JsonGenerator
     */
    private void copyToManifest(String key, JsonValue value, JsonGenerator manifest) {
    	ValueType vt = value.getValueType();
    	
		if (vt == ValueType.ARRAY) {
			if (key != null) {
				// start array as value under key
				manifest.writeStartArray(key);
			} else {
				// start plain array
				manifest.writeStartArray();
			}
			for (JsonValue val : (JsonArray) value) {
				// copy array element
				copyToManifest(null, val, manifest);
			}
			manifest.writeEnd();
			
		} else if (vt == ValueType.OBJECT) {
			if (key != null) {
				// start object as value under key
				manifest.writeStartObject(key);
			} else {
				// start plain object
				manifest.writeStartObject();
			}
			for (Entry<String, JsonValue> val : ((JsonObject) value).entrySet()) {
				// copy object member
				copyToManifest(val.getKey(), val.getValue(), manifest);
			}
			manifest.writeEnd();
			
		} else if ((vt == ValueType.STRING)||(vt == ValueType.NUMBER)||(vt == ValueType.FALSE)||
				(vt == ValueType.TRUE)||(vt == ValueType.NULL)) {
			if (key != null) {
				// write scalar as value under key
				manifest.write(key, value);
			} else {
				// write plain scalar
				manifest.write(value);
			}
			
		} else {
			logger.error("Unknown JSON value: "+value);
		}
	}


}