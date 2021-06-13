package digilib.conf;

/*
 * #%L
 * DigilibRequest.java
 *
 * lightweight class carrying all parameters for a request to digilib
 * %%
 * Copyright (C) 2002 - 2013 MPIWG Berlin, WTWG Uni Bern
 *                           
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
 * Authors: Robert Casties (robcast@berlios.de),
 *          Christian Luginbuehl
 *          
 * Created on 27. August 2002
 */

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.StringTokenizer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.image.ImageJobDescription;
import digilib.io.FileOps;
import digilib.util.OptionsSet;
import digilib.util.Parameter;
import digilib.util.ParameterMap;

/**
 * Class holding the parameters of a digilib user request. The parameters are
 * mostly named like the servlet parameters: <br>
 * request.path: url of the page/document. <br>
 * fn: url of the page/document. <br>
 * pn: page number. <br>
 * dw: width of result window in pixels. <br>
 * dh: height of result window in pixels. <br>
 * wx: left edge of image area (float from 0 to 1). <br>
 * wy: top edge of image area (float from 0 to 1). <br>
 * ww: width of image area(float from 0 to 1). <br>
 * wh: height of image area(float from 0 to 1). <br>
 * ws: scale factor. <br>
 * mo: special options like 'fit'. <br>
 * ...et cetera
 * 
 * @author casties
 * 
 */
public class DigilibRequest extends ParameterMap {

    private static final Logger logger = LoggerFactory.getLogger("digilib.request");
    
    /**
     * special options for parsing the request. 
     */
    public static enum ParsingOption {
    	omitIiifImageApi
    }

    /** active pasing options */
    public EnumSet<ParsingOption> parsingOptions = EnumSet.noneOf(ParsingOption.class);
    
    /** IIIF path prefix (taken from config) */
    protected String iiifPrefix = "IIIF";
    
    /** IIIF slash replacement (taken from config) */
    protected String iiifSlashReplacement = null;
    
    /** IIIF image API version (taken from config) */
    protected String iiifApiVersion = "2.1";
    
    /** parse IIIF path as IIIF image API */
    public boolean parseIiifImageApi = true;
    
    /** error message while configuring */
    public String errorMessage = null;

    /** ImageJobDescription for this request */
    protected ImageJobDescription ticket;

    /** DigilibConfiguration for this request */
    protected DigilibConfiguration config;

    public DigilibRequest() {
        super(30);
        initParams();
    }

    /**
     * Create DigilibRequest with DigilibConfiguration.
     * 
     * @param config the DigilibConfiguration
     */
    public DigilibRequest(DigilibConfiguration config) {
        super(30);
        this.config = config;
        initParams();
    }

    /**
     * Create DigilibRequest with DigilibConfiguration with added ParameterMap.
     * 
     * @param config the DigilibConfiguration
     * @param params ParameterMap to add
     */
    public DigilibRequest(DigilibConfiguration config, ParameterMap params) {
        super(30);
        this.config = config;
        // initialise default params
        initParams();
        // add new params
        this.params.putAll(params.getParams());
    }

    /**
     * Define and set up parameters with default values.
     */
    protected void initParams() {
        /*
         * Definition of parameters and default values. Parameter of type 's'
         * are for the servlet.
         */

        // url of the page/document (second part)
        newParameter("fn", "", null, 's');
        // page number
        newParameter("pn", Integer.valueOf(1), null, 's');
        // width of client in pixels
        newParameter("dw", Integer.valueOf(0), null, 's');
        // height of client in pixels
        newParameter("dh", Integer.valueOf(0), null, 's');
        // left edge of image (float from 0 to 1)
        newParameter("wx", Float.valueOf(0), null, 's');
        // top edge in image (float from 0 to 1)
        newParameter("wy", Float.valueOf(0), null, 's');
        // width of image (float from 0 to 1)
        newParameter("ww", Float.valueOf(1), null, 's');
        // height of image (float from 0 to 1)
        newParameter("wh", Float.valueOf(1), null, 's');
        // scale factor
        newParameter("ws", Float.valueOf(1), null, 's');
        // special options like 'fit' for gifs
        newParameter("mo", this.options, null, 's');
        // rotation angle (degree)
        newParameter("rot", Float.valueOf(0), null, 's');
        // contrast enhancement factor
        newParameter("cont", Float.valueOf(0), null, 's');
        // brightness enhancement factor
        newParameter("brgt", Float.valueOf(0), null, 's');
        // color multiplicative factors
        newParameter("rgbm", "0/0/0", null, 's');
        // color additive factors
        newParameter("rgba", "0/0/0", null, 's');
        // display dpi resolution (total)
        newParameter("ddpi", Float.valueOf(0), null, 's');
        // display dpi X resolution
        newParameter("ddpix", Float.valueOf(0), null, 's');
        // display dpi Y resolution
        newParameter("ddpiy", Float.valueOf(0), null, 's');
        // scale factor for mo=ascale
        newParameter("scale", Float.valueOf(1), null, 's');
        // color conversion operation
        newParameter("colop", "", null, 's');

        /*
         * Parameters of type 'i' are not exchanged between client and server,
         * but are for the servlets or JSPs internal use.
         */

        // url of the page/document (first part, may be empty)
        newParameter("request.path", "", null, 'i');
        // base URL (from http:// to below /servlet)
        newParameter("base.url", null, null, 'i');
        // elements of IIIF API path
        newParameter("request.iiif.elements", null, null, 'i');
        
        /*
         * Parameters of type 'c' are for the clients use
         */

        // "real" filename
        newParameter("img.fn", "", null, 'c');
        // image dpi x
        newParameter("img.dpix", Integer.valueOf(0), null, 'c');
        // image dpi y
        newParameter("img.dpiy", Integer.valueOf(0), null, 'c');
        // hires image size x
        newParameter("img.pix_x", Integer.valueOf(0), null, 'c');
        // hires image size y
        newParameter("img.pix_y", Integer.valueOf(0), null, 'c');

        /*
         * set local variables from config
         */
        if (config != null) {
            iiifPrefix = config.getAsString("iiif-prefix");
            iiifSlashReplacement = config.getAsString("iiif-slash-replacement");
            iiifApiVersion = config.getAsString("iiif-api-version");
        }
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.servlet.ParameterMap#initOptions()
     */
    @Override
    protected void initOptions() {
        options = (OptionsSet) getValue("mo");
    }

    /**
     * Return the request parameters as a String in the parameter form
     * 'fn=/icons&amp;pn=1'. Empty (undefined) fields are not included.
     * 
     * @return String of request parameters in parameter form.
     */
    public String getAsString() {
        return getAsString(0);
    }

    /**
     * Return the request parameters of a given type type as a String in the
     * parameter form 'fn=/icons&amp;pn=1'. Empty (undefined) fields are not
     * included.
     * 
     * @param type the type
     * @return String of request parameters in parameter form.
     */
    public String getAsString(int type) {
        StringBuffer s = new StringBuffer(50);
        // go through all values
        for (Parameter p : params.values()) {
            if ((type > 0) && (p.getType() != type)) {
                // skip the wrong types
                continue;
            }
            String name = p.getName();
            /*
             * handling special cases
             */
            // request_path adds to fn
            if (name.equals("fn")) {
                s.append("&fn=" + getAsString("request.path") + getAsString("fn"));
                continue;
            }
            /*
             * the rest is sent with its name
             */
            // parameters that are not set or internal are not sent
            if ((!p.hasValue()) || (p.getType() == 'i')) {
                continue;
            }
            s.append("&" + name + "=" + p.getAsString());
        }
        // kill first "&"
        s.deleteCharAt(0);
        return s.toString();
    }

    /**
     * Set request parameters from query string. Uses the separator string qs to
     * get 'fn=foo' style parameters.
     * 
     * @param qs
     *            query string
     * @param sep
     *            parameter-separator string
     */
    public void setWithParamString(String qs, String sep) {
        // go through all request parameters
        String[] qa = qs.split(sep);
        for (int i = 0; i < qa.length; i++) {
            // split names and values on "="
            String[] nv = qa[i].split("=");
            try {
                String name = URLDecoder.decode(nv[0], "UTF-8");
                String val = URLDecoder.decode(nv[1], "UTF-8");
                // is this a known parameter?
                if (params.containsKey(name)) {
                    Parameter p = (Parameter) this.get(name);
                    // internal parameters are not set
                    if (p.getType() == 'i') {
                        continue;
                    }
                    p.setValueFromString(val);
                    continue;
                }
                // unknown parameters are just added with type 'r'
                newParameter(name, null, val, 'r');
            } catch (UnsupportedEncodingException e) {
                // this shouldn't happen anyway
            }
        }
        initOptions();
    }

    /**
     * Populate a request from a string with an IIIF image API path.
     * 
     * path should be non-URL-decoded and have no leading slash.
     * 
     * URI template:
     * {scheme}://{server}{/prefix}/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
     * 
     * @param path
     *            String with IIIF Image API path.
     * @return true of successful
     * @see <a href="http://iiif.io/api/image/2.0/">IIIF Image API</a>
     */
    public boolean setWithIiifPath(String path) {
        if (path == null) {
            return false;
        }
        
        List<String> params = new ArrayList<String>(5);
        setValue("request.iiif.elements", params);
        
        // enable passing of delimiter to get empty parameters
        StringTokenizer query = new StringTokenizer(path, "/", true);
        String token;
        /*
         * first parameter prefix
         */
        if (query.hasMoreTokens()) {
            token = getNextDecodedToken(query);
            if (!token.equals(iiifPrefix)) {
                errorMessage = "IIIF path doesn't start with prefix!";
                logger.error(errorMessage);
                return false;
            }
            // skip /
            if (query.hasMoreTokens()) {
                query.nextToken();
            }
        }
        /*
         * following parameters
         */
        while (query.hasMoreTokens()) {
            token = getNextDecodedToken(query);
            if (!token.equals("/")) {
            	params.add(token);
                // skip /
                if (query.hasMoreTokens()) {
                    query.nextToken();
                }
            } else {
            	// empty parameter
            	params.add(null);
            }
        }

        if (parsingOptions.contains(ParsingOption.omitIiifImageApi)) {
        	return true;
        }
        
        /*
         * parse sequence of parameters as IIIF image API
         */
        String identifier = ""; // empty name means image root directory
        String region = null;
        String size = null;
        String rotation = null;
        String quality = null;
        String format = null;

		if (params.size() > 0) {
			/*
			 * first parameter identifier (encoded)
			 */
			identifier = params.get(0);
			
			if (params.size() > 1) {
				/*
				 * second parameter region
				 */
				region = params.get(1);
				
				if (params.size() > 2) {
					/*
					 * third parameter size
					 */
					size = params.get(2);
					
					if (params.size() > 3) {
						/*
						 * fourth parameter rotation
						 */
						rotation = params.get(3);
						
						if (params.size() > 4) {
							/*
							 * fifth parameter quality.format
							 */
							String qf = params.get(4);
							if (qf != null) {
								// quality.format -- color depth and output
								// format
								try {
									String[] parms = qf.split("\\.");
									// quality param
									quality = parms[0];
									// format param
									if (parms.length > 1) {
										format = parms[1];
									}
								} catch (Exception e) {
									errorMessage = "Error parsing quality and format parameters in IIIF path!";
									logger.error(errorMessage, e);
									return false;
								}
							}
						}
					}
				}
			}
		}
        // set request with these parameters
        return setWithIiifImageParams(identifier, region, size, rotation, quality, format);
    }

    private String getNextDecodedToken(StringTokenizer tokens) {
        String token = tokens.nextToken();
        try {
            token = URLDecoder.decode(token, "UTF-8");
            return token;
        } catch (UnsupportedEncodingException e) {
            // this shouldn't happen
        }
        return null;
    }

	/**
	 * Populate a request from IIIF image API parameters.
	 *
	 * @see <a href="http://iiif.io/api/image/2.0/">IIIF Image API</a>
	 * 
	 * @param identifier the identifier
	 * @param region the region
	 * @param size the size
	 * @param rotation the rotation
	 * @param quality the quality
	 * @param format the format
	 * @return true if successful
	 */
	public boolean setWithIiifImageParams(String identifier, String region, String size, 
			String rotation, String quality, String format) {
        // alway set HTTP status code error reporting
        options.setOption(DigilibOption.errcode);
        
        /*
         * parameter identifier (encoded)
         */
        if (identifier != null) {
            identifier = decodeIiifIdentifier(identifier);
            setValueFromString("fn", identifier);
        } else {
            errorMessage = "Missing identifier in IIIF path!";
            logger.error(errorMessage);
            return false;
        }

        /*
         * parameter region
         */
        if (region != null) {
            if (region.equals("info.json")) {
                // info request
                options.setOption(DigilibOption.info);
                return true;
                
            } else if (region.equals("full")) {
                // full image -- digilib default
            	
            } else if (region.equals("square")) {
                // "squared" crop of full image (square of shortest side length)
            	options.setOption(DigilibOption.sqarea);
            	
            } else if (region.startsWith("pct:")) {
                // pct:x,y,w,h -- region in % of original image
                String[] parms = region.substring(4).split(",");
                try {
                    float x = Float.parseFloat(parms[0]);
                    setValue("wx", x / 100f);
                    float y = Float.parseFloat(parms[1]);
                    setValue("wy", y / 100f);
                    float w = Float.parseFloat(parms[2]);
                    setValue("ww", w / 100f);
                    float h = Float.parseFloat(parms[3]);
                    setValue("wh", h / 100f);
                } catch (Exception e) {
                    errorMessage = "Error parsing range parameter in IIIF path! ";
                    logger.error(errorMessage+e);
                    return false;
                }
            } else {
                // x,y,w,h -- region in pixel of original image :-(
                String[] parms = region.split(",");
                if (parms.length != 4) {
                    errorMessage = "Error parsing range parameter in IIIF path!";
                    logger.error(errorMessage);
                    return false;
                } else {
                    options.setOption(DigilibOption.pxarea);
                    setValueFromString("wx", parms[0]);
                    setValueFromString("wy", parms[1]);
                    setValueFromString("ww", parms[2]);
                    setValueFromString("wh", parms[3]);
                }
            }
        } else {
            // region omitted -- redirect to info request
            options.setOption(DigilibOption.redirect_info);
            return true;
        }
        
        /*
         * parameter size
         */
        if (size != null) {
            if (iiifApiVersion.startsWith("3")) {
                /*
                 * IIIF V3 allows upscaling only if size starts with "^"
                 */
                if (size.startsWith("^")) {
                    size = size.substring(1);
                } else {
                    options.setOption(DigilibOption.deny_upscale);
                }
                /*
                 * IIIF V3 disallows "full"
                 */
                if (size.equals("full")) {
                    errorMessage = "Invalid size parameter in IIIF path! ";
                    logger.error(errorMessage);
                    return false;
                }
            }
            
            if (size.equals("full")) {
                /*
                 * full -- size of original
                 */
                options.setOption(DigilibOption.ascale);
                setValue("scale", 1f);
                
            } else if (size.equals("max")) {
                /*
                 * max -- size of original unless constrained by max image size or area
                 */
                options.setOption(DigilibOption.ascale);
                setValue("scale", 1f);
                // TODO: check with max image size
                
            } else if (size.startsWith("pct:")) {
                /*
                 * pct:n -- n% size of original
                 */
                try {
                    float pct = Float.parseFloat(size.substring(4));
                    options.setOption(DigilibOption.ascale);
                    setValue("scale", pct / 100);
                } catch (NumberFormatException e) {
                    errorMessage = "Error parsing size parameter in IIIF path! ";
                    logger.error(errorMessage+e);
                    return false;
                }
                
            } else {
                /*
                 * w,h -- pixel size
                 */
                try {
                    String[] parms = size.split(",", 2);
                    if (parms[0].length() > 0) {
                        // width param
                        if (parms[0].startsWith("!")) {
                            // !w,h width (in digilib-like bounding box)
                            setValueFromString("dw", parms[0].substring(1));
                        } else if (parms[1].length() == 0) {
                            // w, width only
                            setValueFromString("dw", parms[0]);
                        } else {
                            // w,h -- according to spec, we should distort the image to match ;-(
                        	options.setOption(DigilibOption.squeeze);
                            setValueFromString("dw", parms[0]);
                        }
                    }
                    if (parms[1].length() > 0) {
                        // height param
                        setValueFromString("dh", parms[1]);
                    }
                } catch (Exception e) {
                    errorMessage = "Error parsing size parameter in IIIF path! ";
                    logger.error(errorMessage+e);
                    return false;
                }
            }
        } else {
            // size omitted -- assume "full"
            options.setOption(DigilibOption.ascale);
            setValue("scale", 1f);
            return true;
        }
        
        /*
         * parameter rotation
         */
        if (rotation != null) {
            if (rotation.startsWith("!")) {
                // !n -- mirror and rotate
                options.setOption(DigilibOption.hmir);
                rotation = rotation.substring(1);
            }
            try {
                float rot = Float.parseFloat(rotation);
                setValue("rot", rot);
            } catch (NumberFormatException e) {
                errorMessage = "Error parsing rotation parameter in IIIF path! ";
                logger.error(errorMessage+e);
                return false;
            }
        }
        
        /*
         * parameter quality
         */
        if (quality != null) {
            // quality param
            if (quality.equals("default") || quality.equals("native") || quality.equals("color")) {
                // color is default anyway
            } else if (quality.equals("gray") || quality.equals("grey")) {
                setValueFromString("colop", "grayscale");
            } else if (quality.equals("bitonal")) {
                setValueFromString("colop", "bitonal");
            } else {
                errorMessage = "Invalid quality parameter in IIIF path!";
                logger.error(errorMessage);
                return false;
            }
        }
        
        /*
         * parameter format
         */
        if (format != null) {
            // format param (we only support jpg and png)
            if (format.equals("jpg")) {
                // force jpg
                options.setOption(DigilibOption.jpg);
            } else if (format.equals("png")) {
                // force png
                options.setOption(DigilibOption.png);
            } else {
                errorMessage = "Invalid format parameter in IIIF path!";
                logger.error(errorMessage);
                return false;
            }
        }
        return true;
	}

	/**
	 * Decodes the IIIF identifier part into a digilib path.
	 * 
	 * @param identifier the identifier
	 * @return the path
	 * @throws UnsupportedEncodingException on error
	 */
	public String decodeIiifIdentifier(String identifier) {
		if (identifier == null) return "";
		if (identifier.contains("%")) {
		    // still escape chars -- decode again
		    try {
				identifier = URLDecoder.decode(identifier, "UTF-8");
			} catch (UnsupportedEncodingException e) {
				// this shouldn't happen
				logger.error("Error decoding identifier", e);
			}
		}
		if (iiifSlashReplacement != null && identifier.contains(iiifSlashReplacement)) {
		    // change replacement back to slash
		    identifier = identifier.replace(iiifSlashReplacement, "/");
		}
		return identifier;
	}


	/**
	 * Encodes a digilib path into an IIIF identifier part
	 * 
	 * @param path the path
	 * @return the identifier
	 * @throws UnsupportedEncodingException on error
	 */
	public String encodeIiifIdentifier(String path) {
		if (path == null) return "";
		if (iiifSlashReplacement != null && path.contains("/")) {
		    // change slash to replacement
		    path = path.replace("/", iiifSlashReplacement);
		}
		try {
			path = URLEncoder.encode(path, "UTF-8");
		} catch (UnsupportedEncodingException e) {
			// this shouldn't happen
			logger.error("Error encoding identifier", e);
		}
		return path;
	}


    /**
     * Test if option string <code>opt</code> is set. Checks if the substring
     * <code>opt</code> is contained in the options string <code>param</code>.
     * 
     * @param param the param
     * @param opt
     *            Option string to be tested.
     * @return if option is set
     * 
     * @deprecated use {@link #hasOption(DigilibOption)} for "mo"-options.
     */
    public boolean hasOption(String param, String opt) {
        String s = getAsString(param);
        if (s != null) {
            StringTokenizer i = new StringTokenizer(s, ",");
            while (i.hasMoreTokens()) {
                if (i.nextToken().equals(opt)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * The image file path to be accessed.
     * 
     * The image file path is assembled from the servlets RequestPath and
     * Parameter fn and normalized.
     * 
     * @return the effective filepath.
     */
    public String getFilePath() {
        String s = getAsString("request.path");
        s += getAsString("fn");
        return FileOps.normalName(s);
    }

    /**
     * @return the ticket
     */
    public ImageJobDescription getJobDescription() {
        return ticket;
    }

    /**
     * @param ticket
     *            the ticket to set
     */
    public void setJobDescription(ImageJobDescription ticket) {
        this.ticket = ticket;
    }

    /**
     * @return the config
     */
    public DigilibConfiguration getDigilibConfig() {
        return config;
    }

    /**
     * @param config
     *            the config to set
     */
    public void setDigilibConfig(DigilibConfiguration config) {
        this.config = config;
    }

}
