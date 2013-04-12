package digilib.conf;

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

import javax.imageio.ImageIO;

import org.apache.log4j.BasicConfigurator;
import org.apache.log4j.Logger;

import digilib.image.DocuImage;
import digilib.image.DocuImageFactory;
import digilib.util.ParameterMap;

/**
 * Class to hold the digilib servlet configuration parameters.
 * @author casties
 * 
 */
public class DigilibConfiguration extends ParameterMap {

    /** Log4J logger */
    protected static Logger logger = Logger.getLogger(DigilibConfiguration.class);

    /**
     * Default constructor defines all parameters and their default values.
     */
    public DigilibConfiguration() {
        super(20);
        
        /*
         * Definition of parameters and default values. System parameters that
         * are not read from config file have a type 's'.
         */
        
        // digilib version
        newParameter("digilib.version", "2.2.0", null, 's');
        // sending image files as-is allowed
        newParameter("sendfile-allowed", Boolean.TRUE, null, 'f');
        // Type of DocuImage instance
        newParameter("docuimage-class", "digilib.image.ImageLoaderDocuImage", null, 'f');
        // degree of subsampling on image load
        newParameter("subsample-minimum", new Float(2f), null, 'f');
        // default scaling quality
        newParameter("default-quality", new Integer(2), null, 'f');
        // maximum destination image size (0 means no limit)
        newParameter("max-image-size", new Integer(0), null, 'f');
        // allow image toolkit to use disk cache
        newParameter("img-diskcache-allowed", Boolean.TRUE, null, 'f');
        // default type of error message (image, text, code)
        newParameter("default-errmsg-type", "image", null, 'f');

    }

    /**
     * Configure digilib.
     * 
     * Sets up Factories and Singletons using the configuration. 
     */
    @SuppressWarnings("unchecked")
    public void configure() {
        DigilibConfiguration config = this;
        // we start log4j with a default logger config TODO: is this the right place?
        BasicConfigurator.configure();
        /*
         * initialise static DocuImage class instance
         */
        try {
            Class<DocuImage> docuImageClass = (Class<DocuImage>) Class.forName(config.getAsString("docuimage-class"));
            DocuImageFactory.setDocuImageClass(docuImageClass);
            // DocuImage class instance
            config.newParameter("servlet.docuimage.class", docuImageClass, null, 's');
            config.newParameter("servlet.docuimage.version", DocuImageFactory.getInstance().getVersion(), null, 's');
        } catch (ClassNotFoundException e) {
            logger.error("Error setting DocuImage class!");
        }
        // disk cache for image toolkit
        boolean dc = getAsBoolean("img-diskcache-allowed");
        // TODO: methods for all toolkits?
        ImageIO.setUseCache(dc);
    }

}
