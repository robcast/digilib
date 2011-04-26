/*
 * DigilibConfiguration -- Holding all parameters for digilib servlet.
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
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

import java.io.IOException;

import org.apache.log4j.BasicConfigurator;
import org.apache.log4j.Logger;

import digilib.image.DocuImage;
import digilib.image.DocuImageImpl;
import digilib.io.ImageInput;
import digilib.util.ParameterMap;

/**
 * Class to hold the digilib servlet configuration parameters. The parameters
 * can be read from the digilib-config file and be passed to other servlets or
 * beans. <br>errorImgFileName: image file to send in case of error. <br>
 * denyImgFileName: image file to send if access is denied. <br>baseDirs:
 * array of base directories in order of preference (prescaled versions first).
 * <br>useAuth: use authentication information. <br>authConfPath:
 * authentication configuration file. <br>... <br>
 * 
 * @author casties
 *  
 */
public abstract class DigilibConfiguration extends ParameterMap {

	/** DocuImage class instance */
	protected static Class<DocuImageImpl> docuImageClass = null;

	/** Log4J logger */
	protected Logger logger = Logger.getLogger("digilib.config");

	/**
	 * Default constructor defines all parameters and their default values.
	 *  
	 */
	public DigilibConfiguration() {
		super(20);
		// we start with a default logger config
		BasicConfigurator.configure();
		initParams();
	}

	/**
	 * 
	 */
	protected void initParams() {
		/*
		 * Definition of parameters and default values. System parameters that
		 * are not read from config file have a type 's'.
		 */
	}

	/**
	 * Creates a new DocuImage instance.
	 * 
	 * The type of DocuImage is specified by docuimage-class.
	 * 
	 * @return DocuImage
	 */
    public static DocuImage getDocuImageInstance() {
		DocuImageImpl di = null;
		try {
			di = docuImageClass.newInstance();
		} catch (Exception e) {
		}
		return di;
	}

	/**
     * Check image size and type and store in ImageFile imgf
     * 
	 * @param imgf
	 * @return
	 * @throws IOException
	 */
	public static ImageInput identifyDocuImage(ImageInput imgf) throws IOException {
	    // use fresh DocuImage instance
	    DocuImage di = getDocuImageInstance();
		return di.identify(imgf);
	}
	
	/**
	 * @return Returns the docuImageClass.
	 */
	public static Class<DocuImageImpl> getDocuImageClass() {
		return docuImageClass;
	}

	/**
	 * @param docuImageClass The docuImageClass to set.
	 */
	public static void setDocuImageClass(Class<DocuImageImpl> dic) {
		docuImageClass = dic;
	}
}
