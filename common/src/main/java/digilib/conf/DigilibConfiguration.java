package digilib.conf;

/*
 * #%L
 * DigilibConfiguration -- Holding all parameters for digilib servlet.
 * 
 * Digital Image Library servlet components
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

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map.Entry;
import java.util.Properties;

import javax.imageio.ImageIO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.image.DocuImage;
import digilib.image.DocuImageFactory;
import digilib.util.Parameter;
import digilib.util.ParameterMap;

/**
 * Class to hold the digilib servlet configuration parameters.
 * 
 * @author casties
 * 
 */
public class DigilibConfiguration extends ParameterMap {

    /** SLF4J compatible logger */
    protected static final Logger logger = LoggerFactory.getLogger(DigilibConfiguration.class);

    protected static boolean isLoggingConfigured = false;

    /** name of digilbi properties file */
    public static String propertiesFileName = "digilib.properties";

    /**
     * digilib version
     * 
     * @return the version
     */
    public static String getClassVersion() {
        return "2.11.1";
    }

    /* non-static getVersion for Java inheritance */
    public String getVersion() {
        return getClassVersion();
    }

    /**
     * Default constructor defines all parameters and their default values.
     */
    public DigilibConfiguration() {
        super(20);

        /*
         * Definition of parameters and default values. System parameters that are not
         * read from config file have a type 's'.
         */

        // digilib version
        newParameter("digilib.version", getVersion(), null, 's');
        // sending image files as-is allowed
        newParameter("sendfile-allowed", Boolean.TRUE, null, 'f');
        // type of DocuImage instance
        newParameter("docuimage-class", "digilib.image.ImageLoaderDocuImage", null, 'f');
        // image hacks for DocuImage implementation
        newParameter("docuimage-hacks", "", null, 'f');
        // preferred image reader classes ("mime-type1=class1,mime-type2=class2,...")
        newParameter("image-reader-classes", "", null, 'f');
        // preferred image writer classes ("mime-type1=class1,mime-type2=class2,...")
        newParameter("image-writer-classes", "", null, 'f');
        // degree of subsampling on image load
        newParameter("subsample-minimum", Float.valueOf(2f), null, 'f');
        // default scaling quality
        newParameter("default-quality", Integer.valueOf(2), null, 'f');
        // maximum destination image size (0 means no limit)
        newParameter("max-image-size", Integer.valueOf(0), null, 'f');
        // allow image toolkit to use disk cache
        newParameter("img-diskcache-allowed", Boolean.FALSE, null, 'f');
        // default type of error message (image, text, code)
        newParameter("default-errmsg-type", "image", null, 'f');
        // prefix for IIIF image API paths (used by DigilibRequest)
        newParameter("iiif-prefix", "IIIF", null, 'f');
        // IIIF Image API version to support (mostly relevant for info.json)
        newParameter("iiif-api-version", "2", null, 'f');
        // character to use as slash-replacement in IIIF identifier part
        newParameter("iiif-slash-replacement", "!", null, 'f');
        // prefer some image types based on request
        newParameter("input-preselection-allowed", Boolean.TRUE, null, 'f');

    }

    /**
     * read parameters from properties file digilib.properties in class path.
     */
    public void readConfig() {
        Properties props = new Properties();
        InputStream s = Thread.currentThread().getContextClassLoader().getResourceAsStream(propertiesFileName);
        if (s != null) {
            try {
                props.load(s);
                s.close();
                for (Entry<Object, Object> confEntry : props.entrySet()) {
                    Parameter param = get((String) confEntry.getKey());
                    if (param != null) {
                        if (param.getType() == 's') {
                            // type 's' Parameters are not overwritten.
                            continue;
                        }
                        if (!param.setValueFromString((String) confEntry.getValue())) {
                            /*
                             * automatic conversion failed -- try special cases
                             */
                            if (!setSpecialValueFromString(param, (String) confEntry.getValue())) {
                                logger.warn("Unable to parse config parameter: {}", param.getName());
                            }
                        }
                    } else {
                        // parameter unknown -- just add
                        newParameter((String) confEntry.getKey(), null, confEntry.getValue(), 'u');
                    }
                }
                // set config file path parameter
                newParameter("digilib.config.file",
                        Thread.currentThread().getContextClassLoader().getResource("digilib.properties").toString(),
                        null, 's');
            } catch (IOException e) {
                logger.error("Error reading digilib properties file.", e);
            }
        }
    }

    /**
     * Set non-standard value in Parameter param. Returns true if successful.
     * 
     * @param param the Parameter
     * @param value the value
     * @return true if successful
     */
    protected boolean setSpecialValueFromString(Parameter param, String value) {
        // should be overridden
        return false;
    }

    /**
     * Configure digilib.
     * 
     * Sets up Factories and Singletons using the configuration.
     */
    @SuppressWarnings("unchecked")
    public void configure() {
        DigilibConfiguration config = this;
        setupLogging();
        /*
         * initialise static DocuImage class instance
         */
        try {
            Class<DocuImage> docuImageClass = (Class<DocuImage>) Class.forName(config.getAsString("docuimage-class"));
            DocuImageFactory.setDocuImageClass(docuImageClass);
            // DocuImage class instance
            DocuImage di = DocuImageFactory.getInstance();
            config.newParameter("servlet.docuimage.class", docuImageClass, null, 's');
            config.newParameter("servlet.docuimage.version", di.getVersion(), null, 's');
            logger.debug("DocuImage ({}) {}", docuImageClass, di.getVersion());
            // set hacks on instance
            try {
                docuImageClass.getDeclaredConstructor().newInstance().setHacks(config.getAsString("docuimage-hacks"));
            } catch (Exception e) {
                logger.error("Error creating instance of DocuImage class!", e);
            }
            // set preferred image readers on instance
            if (config.hasValue("image-reader-classes")) {
                try {
                    HashMap<String, String> readerMap = new HashMap<String, String>();
                    for (String tcs : config.getAsString("image-reader-classes").split(",")) {
                        String[] tc = tcs.split("=");
                        String mimetype = tc[0];
                        String clazz = tc[1];
                        readerMap.put(mimetype, clazz);
                    }
                    docuImageClass.getDeclaredConstructor().newInstance().setReaderClasses(readerMap);
                } catch (Exception e) {
                    logger.error("Error setting image-reader-classes!", e);
                }
            }
            // set preferred image writers on instance
            if (config.hasValue("image-writer-classes")) {
                try {
                    HashMap<String, String> writerMap = new HashMap<String, String>();
                    for (String tcs : config.getAsString("image-writer-classes").split(",")) {
                        String[] tc = tcs.split("=");
                        String mimetype = tc[0];
                        String clazz = tc[1];
                        writerMap.put(mimetype, clazz);
                    }
                    docuImageClass.getDeclaredConstructor().newInstance().setWriterClasses(writerMap);
                } catch (Exception e) {
                    logger.error("Error setting image-writer-classes!", e);
                }
            }
            // log supported formats
            StringBuilder fmts = new StringBuilder();
            Iterator<String> dlfs = di.getSupportedFormats();
            for (String f = dlfs.next(); dlfs.hasNext(); f = dlfs.next()) {
                fmts.append(f);
                fmts.append(", ");
            }
            logger.info("DocuImage supported image formats: {}", fmts);
        } catch (ClassNotFoundException e) {
            logger.error("Error setting DocuImage class!");
        }
        // disk cache for image toolkit
        boolean dc = getAsBoolean("img-diskcache-allowed");
        // TODO: methods for all toolkits?
        ImageIO.setUseCache(dc);
    }

    /**
     * Initialize the logging implementation.
     * 
     * @param context
     */
    protected void setupLogging() {
        // set up a real logging implementation in a subclass
    }

}
