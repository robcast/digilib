package digilib.conf;

/*
 * #%L
 * DigilibConfiguration -- Holding all parameters for digilib servlet.
 * 
 * Digital Image Library servlet components
 * 
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

import java.io.File;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.atomic.AtomicInteger;

import javax.servlet.ServletContext;

import digilib.image.DocuImageImpl;
import digilib.io.FileOps;
import digilib.servlet.ServletOps;
import digilib.util.Parameter;
import digilib.util.XMLListLoader;

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
public class DigilibServletConfiguration extends DigilibConfiguration {

    /** time the webapp (i.e. this class) was loaded */
    public final Long webappStartTime = System.currentTimeMillis();

    /** counter for HttpRequests (mostly for debugging) */
    public AtomicInteger webappRequestCnt = new AtomicInteger(0);

    /** counter for open HttpRequests (mostly for debugging) */
    public AtomicInteger openRequestCnt = new AtomicInteger(0);

    /**
     * Definition of parameters and default values.
     */
    protected void initParams() {
        /*
         * Definition of parameters and default values. System parameters that
         * are not read from config file have a type 's'.
         */

        // configuration file location
        newParameter("servlet.config.file", null, null, 's');
        // DocuDirCache instance
        newParameter("servlet.dir.cache", null, null, 's');
        // DocuImage class instance
        newParameter("servlet.docuimage.class", digilib.image.ImageLoaderDocuImage.class, null, 's');
        // DocuImage version
        newParameter("servlet.docuimage.version", "?", null, 's');
        // AuthOps instance for authentication
        newParameter("servlet.auth.op", null, null, 's');
        // Executor for image operations
        newParameter("servlet.worker.imageexecutor", null, null, 's');
        // Executor for PDF operations
        newParameter("servlet.worker.pdfexecutor", null, null, 's');
        // Executor for PDF-image operations
        newParameter("servlet.worker.pdfimageexecutor", null, null, 's');

        /*
         * parameters that can be read from config file have a type 'f'
         */

        // image file to send in case of error
        newParameter("error-image", new File("img/digilib-error.png"), null, 'f');
        // image file to send if access is denied
        newParameter("denied-image", new File("img/digilib-denied.png"), null, 'f');
        // image file to send if image file not found
        newParameter("notfound-image", new File("img/digilib-notfound.png"), null, 'f');
        // base directories in order of preference (prescaled versions last)
        String[] bd = { "sample-images" };
        newParameter("basedir-list", bd, null, 'f');
        // use authentication information
        newParameter("use-authorization", Boolean.FALSE, null, 'f');
        // authentication configuration file
        newParameter("auth-file", new File("digilib-auth.xml"), null, 'f');
        // sending image files as-is allowed
        newParameter("sendfile-allowed", Boolean.TRUE, null, 'f');
        // Type of DocuImage instance
        newParameter("docuimage-class", "digilib.image.ImageLoaderDocuImage", null, 'f');
        // part of URL used to indicate authorized access
        newParameter("auth-url-path", "authenticated/", null, 'f');
        // degree of subsampling on image load
        newParameter("subsample-minimum", new Float(2f), null, 'f');
        // default scaling quality
        newParameter("default-quality", new Integer(2), null, 'f');
        // use mapping file to translate paths
        newParameter("use-mapping", Boolean.FALSE, null, 'f');
        // mapping file location
        newParameter("mapping-file", new File("digilib-map.xml"), null, 'f');
        // log4j config file location
        newParameter("log-config-file", new File("log4j-config.xml"), null, 'f');
        // maximum destination image size (0 means no limit)
        newParameter("max-image-size", new Integer(0), null, 'f');
        // number of working threads
        newParameter("worker-threads", new Integer(1), null, 'f');
        // max number of waiting threads
        newParameter("max-waiting-threads", new Integer(20), null, 'f');
        // timeout for worker threads (ms)
        newParameter("worker-timeout", new Integer(60000), null, 'f');
        // number of pdf-generation threads
        newParameter("pdf-worker-threads", new Integer(1), null, 'f');
        // max number of waiting pdf-generation threads
        newParameter("pdf-max-waiting-threads", new Integer(20), null, 'f');
        // number of pdf-image generation threads
        newParameter("pdf-image-worker-threads", new Integer(1), null, 'f');
        // max number of waiting pdf-image generation threads
        newParameter("pdf-image-max-waiting-threads", new Integer(10), null, 'f');
        // PDF generation temp directory
        newParameter("pdf-temp-dir", "pdf_temp", null, 'f');
        // PDF generation cache directory
        newParameter("pdf-cache-dir", "pdf_cache", null, 'f');
        // allow image toolkit to use disk cache
        newParameter("img-diskcache-allowed", Boolean.TRUE, null, 'f');
        // default type of error message (image, text, code)
        newParameter("default-errmsg-type", "image", null, 'f');
    }

    /**
     * Constructor taking a ServletConfig. Reads the config file location from
     * an init parameter and loads the config file. Calls
     * <code>readConfig()</code>.
     * 
     * @see readConfig()
     */
    public DigilibServletConfiguration(ServletContext c) throws Exception {
        readConfig(c);
    }

    /**
     * read parameter list from the XML file in init parameter "config-file" or
     * file digilib-config.xml
     */
    @SuppressWarnings("unchecked")
    public void readConfig(ServletContext c) throws Exception {

        /*
         * Get config file name. The file name is first looked for as an init
         * parameter, then in a fixed location in the webapp.
         */
        if (c == null) {
            // no config no file...
            return;
        }
        String fn = c.getInitParameter("config-file");
        if (fn == null) {
            logger.debug("readConfig: no param config-file");
            fn = ServletOps.getConfigFile("digilib-config.xml", c);
        }
        File f = new File(fn);
        if (f.canRead()) {
            // setup config file list reader
            XMLListLoader lilo = new XMLListLoader("digilib-config", "parameter", "name", "value");
            // read config file into HashMap
            Map<String, String> confTable = lilo.loadUri(f.toURI());

            // set config file path parameter
            setValue("servlet.config.file", f.getCanonicalPath());

            /*
             * read parameters
             */

            for (Entry<String, String> confEntry : confTable.entrySet()) {
                Parameter p = get(confEntry.getKey());
                if (p != null) {
                    if (p.getType() == 's') {
                        // type 's' Parameters are not overwritten.
                        continue;
                    }
                    if (!p.setValueFromString(confEntry.getValue())) {
                        /*
                         * automatic conversion failed -- try special cases
                         */

                        // basedir-list
                        if (confEntry.getKey().equals("basedir-list")) {
                            // split list into directories
                            String[] dirs = FileOps.pathToArray(confEntry.getValue());
                            for (int j = 0; j < dirs.length; j++) {
                                // make relative directory paths be inside the
                                // webapp
                                dirs[j] = ServletOps.getFile(dirs[j], c);
                            }
                            if (dirs != null) {
                                p.setValue(dirs);
                            }
                        }
                    }
                } else {
                    // parameter unknown -- just add
                    newParameter(confEntry.getKey(), null, confEntry.getValue(), 'f');
                }
            }
        } else {
            logger.warn("No digilib config file! Using defaults!");
            // update basedir-list
            String[] dirs = (String[]) this.getValue("basedir-list");
            for (int j = 0; j < dirs.length; j++) {
                // make relative directory paths be inside the
                // webapp
                dirs[j] = ServletOps.getFile(dirs[j], c);
            }
        }
        // initialise static DocuImage class instance
        DigilibServletConfiguration.docuImageClass = (Class<DocuImageImpl>) Class.forName(getAsString("docuimage-class"));
        setValue("servlet.docuimage.version", getDocuImageInstance().getVersion());
    }

}
