package digilib.servlet;

/*
 * #%L
 * DigilibConfiguration -- Holding all parameters for digilib servlet.
 * 
 * Digital Image Library servlet components
 * %%
 * Copyright (C) 2001 - 2013 MPIWG Berlin
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
 * beans. <br>
 * errorImgFileName: image file to send in case of error. <br>
 * denyImgFileName: image file to send if access is denied. <br>
 * baseDirs: array of base directories in order of preference (prescaled
 * versions first). <br>
 * useAuth: use authentication information. <br>
 * authConfPath: authentication configuration file. <br>
 * ... <br>
 * 
 * @author casties
 * 
 */
public class DigilibConfiguration extends ParameterMap {

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

    /** Definition of parameters and default values.
	 * 
	 */
    protected void initParams() {
        /*
         * Definition of parameters and default values. System parameters that
         * are not read from config file have a type 's'.
         */
        // digilib servlet version
        newParameter("digilib.version", "2.0b1", null, 's');
        // DocuImage class instance
        newParameter("servlet.docuimage.class",
                digilib.image.ImageLoaderDocuImage.class, null, 's');
        // sending image files as-is allowed
        newParameter("sendfile-allowed", Boolean.TRUE, null, 'f');
        // Type of DocuImage instance
        newParameter("docuimage-class", "digilib.image.ImageLoaderDocuImage", null, 'f');
        // degree of subsampling on image load
        newParameter("subsample-minimum", new Float(2f), null, 'f');
        // default scaling quality
        newParameter("default-quality", new Integer(1), null, 'f');
        // maximum destination image size (0 means no limit)
        newParameter("max-image-size", new Integer(0), null, 'f');
        // allow image toolkit to use disk cache
        newParameter("img-diskcache-allowed", Boolean.TRUE, null, 'f');
        // default type of error message (image, text, code)
        newParameter("default-errmsg-type", "image", null, 'f');

        // initialise static DocuImage class instance
        try {
            DigilibConfiguration.docuImageClass = (Class<DocuImageImpl>) Class.forName(getAsString("docuimage-class"));
        } catch (ClassNotFoundException e) {
            logger.error("Unable to set docuImageClass!");
        }
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
    public static ImageInput identifyDocuImage(ImageInput imgf)
            throws IOException {
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
     * @param docuImageClass
     *            The docuImageClass to set.
     */
    public static void setDocuImageClass(Class<DocuImageImpl> dic) {
        docuImageClass = dic;
    }
}
