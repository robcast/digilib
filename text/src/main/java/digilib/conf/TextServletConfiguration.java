package digilib.conf;

/*
 * #%L
 * 
 * TextServletConfiguration -- Holding all parameters for text servlet.
 * 
 * Digital Image Library servlet components
 * %%
 * Copyright (C) 2003 - 2013 MPIWG Berlin
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
 * Created on 3.1.2014
 */

import java.io.File;

import javax.servlet.ServletContext;

import digilib.io.AliasingDocuDirCache;
import digilib.io.DocuDirCache;
import digilib.io.FileOps.FileClass;
import digilib.servlet.ServletOps;

/**
 * Class to hold the digilib servlet configuration parameters. The parameters
 * can be read from the digilib-config file and be passed to other servlets or
 * beans.
 * 
 * @author casties
 * 
 */
public class TextServletConfiguration extends DigilibServletConfiguration {

    public static final String TEXT_SERVLET_CONFIG_KEY = "digilib.text.servlet.configuration";
    
    public static final String TEXT_DIR_CACHE_KEY = "text.servlet.dir.cache";    
    
    public static String getVersion() {
        return "2.3.0 txt";
    }

    /**
     * Constructs DigilibServletConfiguration and defines all parameters and
     * their default values.
     */
    public TextServletConfiguration() {
        super();
        // text cache instance
        newParameter(TEXT_DIR_CACHE_KEY, null, null, 's');
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.conf.DigilibServletConfiguration#configure(javax.servlet.
     * ServletContext)
     */
    @Override
    public void configure(ServletContext context) {
        super.configure(context);
        DigilibServletConfiguration config = this;

        // set version
        setValue("servlet.version", TextServletConfiguration.getVersion());

        try {
            // directory cache for text files
            String[] bd = (String[]) config.getValue("basedir-list");
            DocuDirCache dirCache;
            if (config.getAsBoolean("use-mapping")) {
                // with mapping file
                File mapConf = ServletOps.getConfigFile((File) config.getValue("mapping-file"), context);
                dirCache = new AliasingDocuDirCache(bd, FileClass.TEXT, mapConf, config);
                config.setValue("mapping-file", mapConf);
            } else {
                // without mapping
                dirCache = new DocuDirCache(bd, FileClass.TEXT, this);
            }
            config.setValue(TEXT_DIR_CACHE_KEY, dirCache);
        } catch (Exception e) {
            logger.error("Error configuring digilib servlet:", e);
        }
    }

    /**
     * Sets the current DigilibConfiguration in the context. 
     * @param context
     */
    public void setCurrentConfig(ServletContext context) {
        context.setAttribute(TextServletConfiguration.TEXT_SERVLET_CONFIG_KEY, this);
    }
    
    /**
     * Returns the current TextServletConfiguration from the context.
     * 
     * @param context
     * @return
     */
    public static DigilibServletConfiguration getCurrentConfig(ServletContext context) {
        DigilibServletConfiguration config = (DigilibServletConfiguration) context
                .getAttribute(TextServletConfiguration.TEXT_SERVLET_CONFIG_KEY);
        return config;
    }

}
