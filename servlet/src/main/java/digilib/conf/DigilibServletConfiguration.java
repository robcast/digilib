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
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

import org.apache.log4j.xml.DOMConfigurator;
import org.xml.sax.SAXException;

import digilib.auth.AuthOps;
import digilib.auth.AuthOpsFactory;
import digilib.image.DocuImage;
import digilib.io.AliasingDocuDirCache;
import digilib.io.DocuDirCache;
import digilib.io.FileOps;
import digilib.io.FileOps.FileClass;
import digilib.meta.DirMeta;
import digilib.meta.FileMeta;
import digilib.meta.MetaFactory;
import digilib.servlet.ServletOps;
import digilib.util.DigilibJobCenter;
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
public class DigilibServletConfiguration extends DigilibConfiguration implements ServletContextListener {

    public static final String AUTH_OP_KEY = "servlet.auth.op";

    public static final String IMAGEEXECUTOR_KEY = "servlet.worker.imageexecutor";

    public static final String SERVLET_CONFIG_KEY = "digilib.servlet.configuration";

    public static final String DIR_CACHE_KEY = "servlet.dir.cache";

    /** the time the webapp (i.e. this class) was loaded */
    public final Long webappStartTime = System.currentTimeMillis();

    public String getVersion() {
        return "2.2.0 srv";
    }
    
    /**
     * Constructs DigilibServletConfiguration and defines all parameters and their default values.
     */
    public DigilibServletConfiguration() {
        super();

        /*
         * Definition of parameters and default values. System parameters that
         * are not read from config file have a type 's'.
         */

        // configuration file location
        newParameter("servlet.config.file", null, null, 's');
        // DocuDirCache instance
        newParameter(DIR_CACHE_KEY, null, null, 's');
        // Executor for image operations
        newParameter(IMAGEEXECUTOR_KEY, null, null, 's');
        // AuthOps instance
        newParameter(AUTH_OP_KEY, null, null, 's');
        // classes TODO: do we need these as parameters?
        newParameter("servlet.filemeta.class", null, null, 's');
        newParameter("servlet.dirmeta.class", null, null, 's');
        newParameter("servlet.authops.class", null, null, 's');

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
        // part of URL used to indicate authorized access
        newParameter("auth-url-path", "authenticated/", null, 'f');
        // use mapping file to translate paths
        newParameter("use-mapping", Boolean.FALSE, null, 'f');
        // mapping file location
        newParameter("mapping-file", new File("digilib-map.xml"), null, 'f');
        // log4j config file location
        newParameter("log-config-file", new File("log4j-config.xml"), null, 'f');
        // number of working threads
        newParameter("worker-threads", new Integer(2), null, 'f');
        // max number of waiting threads
        newParameter("max-waiting-threads", new Integer(20), null, 'f');
        // FileMeta implementation
        newParameter("filemeta-class", "digilib.meta.IndexMetaFileMeta", null, 'f');
        // DirMeta implementation
        newParameter("dirmeta-class", "digilib.meta.IndexMetaDirMeta", null, 'f');
        // AuthOps implementation
        newParameter("authops-class", "digilib.auth.PathServletAuthOps", null, 'f');

    }

    /**
     * read parameter list from the XML file in init parameter "config-file" or
     * file digilib-config.xml
     * @throws IOException 
     * @throws SAXException 
     */
    public void readConfig(ServletContext c) throws SAXException, IOException  {

        /*
         * Get config file. The file name is first looked for as an init
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
                Parameter param = get(confEntry.getKey());
                if (param != null) {
                    if (param.getType() == 's') {
                        // type 's' Parameters are not overwritten.
                        continue;
                    }
                    if (!param.setValueFromString(confEntry.getValue())) {
                        /*
                         * automatic conversion failed -- try special cases
                         */

                        // basedir-list
                        if (confEntry.getKey().equals("basedir-list")) {
                            // split list into directories
                            String[] dirs = FileOps.pathToArray(confEntry.getValue());
                            for (int j = 0; j < dirs.length; j++) {
                                // make relative directory paths be inside the webapp
                                dirs[j] = ServletOps.getFile(dirs[j], c);
                            }
                            if (dirs != null) {
                                param.setValue(dirs);
                            }
                        }
                    }
                } else {
                    // parameter unknown -- just add
                    newParameter(confEntry.getKey(), null, confEntry.getValue(), 'u');
                }
            }
        } else {
            logger.warn("No digilib config file! Using defaults!");
            // update basedir-list
            String[] dirs = (String[]) this.getValue("basedir-list");
            for (int j = 0; j < dirs.length; j++) {
                // make relative directory paths be inside the webapp
                dirs[j] = ServletOps.getFile(dirs[j], c);
            }
        }

    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.conf.DigilibConfiguration#configure()
     */
    @SuppressWarnings("unchecked")
    public void configure(ServletContext context) {
        DigilibServletConfiguration config = this;
        super.configure();
        /*
         * configure factories
         */
        try {
            // initialise MetaFactory
            Class<FileMeta> fileMetaClass = (Class<FileMeta>) Class.forName(config.getAsString("filemeta-class"));
            config.setValue("servlet.filemeta.class", fileMetaClass);
            MetaFactory.setFileMetaClass(fileMetaClass);
            Class<DirMeta> dirMetaClass = (Class<DirMeta>) Class.forName(config.getAsString("dirmeta-class"));
            config.setValue("servlet.dirmeta.class", dirMetaClass);
            MetaFactory.setDirMetaClass(dirMetaClass);
        } catch (ClassNotFoundException e) {
            logger.error("Error setting Metadata classes!");
        }
        try {
            // initialise AuthOpsFactory
            Class<AuthOps> authOpsClass = (Class<AuthOps>) Class.forName(config.getAsString("authops-class"));
            config.setValue("servlet.authops.class", authOpsClass);
            AuthOpsFactory.setAuthOpsClass(authOpsClass);
        } catch (ClassNotFoundException e) {
            logger.error("Error setting AuthOps class!");
        }
        /*
         * configure singletons
         */
        // set up the logger
        File logConf = ServletOps.getConfigFile((File) config.getValue("log-config-file"), context);
        if (logConf.canRead()) {
            DOMConfigurator.configure(logConf.getAbsolutePath());
            config.setValue("log-config-file", logConf);
        }
        // say hello in the log file
        logger.info("***** Digital Image Library Configuration (version " + getVersion() + ") *****");
        try {
            // directory cache
            String[] bd = (String[]) config.getValue("basedir-list");
            FileClass[] fcs = { FileClass.IMAGE, FileClass.TEXT };
            DocuDirCache dirCache;
            if (config.getAsBoolean("use-mapping")) {
                // with mapping file
                File mapConf = ServletOps.getConfigFile((File) config.getValue("mapping-file"), context);
                dirCache = new AliasingDocuDirCache(bd, fcs, mapConf, config);
                config.setValue("mapping-file", mapConf);
            } else {
                // without mapping
                dirCache = new DocuDirCache(bd, fcs, this);
            }
            config.setValue(DIR_CACHE_KEY, dirCache);
            // useAuthentication
            if (config.getAsBoolean("use-authorization")) {
                AuthOps authOp = AuthOpsFactory.getAuthOpsInstance();
                // get config file
                File authConf = ServletOps.getConfigFile((File) config.getValue("auth-file"), context);
                if (authConf != null) {
                    authOp.setConfig(authConf);
                }
                config.setValue(AUTH_OP_KEY, authOp);
                config.setValue("auth-file", authConf);
            }
            // digilib worker threads
            int nt = config.getAsInt("worker-threads");
            int mt = config.getAsInt("max-waiting-threads");
            DigilibJobCenter<DocuImage> imageExecutor = new DigilibJobCenter<DocuImage>(nt, mt, false, IMAGEEXECUTOR_KEY);
            config.setValue(IMAGEEXECUTOR_KEY, imageExecutor);
            /*
             * set as the servlets main config
             */
            context.setAttribute(SERVLET_CONFIG_KEY, this);
        } catch (Exception e) {
            logger.error("Error configuring digilib servlet:", e);
        }
    }

    /**
     * Initialisation on first run.
     */
    public void contextInitialized(ServletContextEvent cte) {
        ServletContext context = cte.getServletContext();
        context.log("***** Digital Image Library Configuration (" + getVersion() + ") *****");
        // see if there is a Configuration instance
        DigilibServletConfiguration dlConfig = getCurrentConfig(context);
        if (dlConfig == null) {
            try {
                // initialise this instance
                readConfig(context);
                configure(context);
            } catch (Exception e) {
                logger.error("Error reading digilib servlet configuration:", e);
            }
        } else {
            // say hello in the log file
            logger.warn("DigilibServletConfiguration already configured!");
        }
    }

    /**
     * Clean up local resources
     * 
     */
    public void contextDestroyed(ServletContextEvent cte) {
        logger.info("DigilibServletConfiguration shutting down.");
        // get current config from servlet context
        ServletContext context = cte.getServletContext();
        DigilibServletConfiguration config = getCurrentConfig(context);
        @SuppressWarnings("unchecked")
        DigilibJobCenter<DocuImage> imageExecutor = (DigilibJobCenter<DocuImage>) config.getValue(IMAGEEXECUTOR_KEY);
        if (imageExecutor != null) {
            // shut down image thread pool
            List<Runnable> rj = imageExecutor.shutdownNow();
            int nrj = rj.size();
            if (nrj > 0) {
                logger.error("Still running threads when shutting down image job queue: " + nrj);
            }
        }
    }

    /**
     * Returns the current DigilibConfiguration from the context.
     * 
     * @param context
     * @return
     */
    public static DigilibServletConfiguration getCurrentConfig(ServletContext context) {
        DigilibServletConfiguration config = (DigilibServletConfiguration) context.getAttribute(DigilibServletConfiguration.SERVLET_CONFIG_KEY);
        return config;
    }

}
