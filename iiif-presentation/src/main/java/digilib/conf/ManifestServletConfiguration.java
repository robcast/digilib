package digilib.conf;

/*
 * #%L
 * 
 * ManifesteServletConfiguration.java
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

import javax.servlet.ServletContext;
import javax.servlet.annotation.WebListener;

/**
 * Class to hold the digilib servlet configuration parameters. The parameters
 * can be read from the digilib-config file and be passed to other servlets or
 * beans.
 * 
 * @author casties
 */
@WebListener
public class ManifestServletConfiguration extends DigilibServletConfiguration {

    public static final String MANIFEST_SERVLET_CONFIG_KEY = "digilib.manifest.servlet.configuration";
    
    public static String getClassVersion() {
        return DigilibConfiguration.getClassVersion() + " manif";
    }

    /** non-static getVersion for Java inheritance */
    @Override
    public String getVersion() {
    	return getClassVersion();
    }
    
    /**
     * Constructs DigilibServletConfiguration and defines all parameters and
     * their default values.
     */
    public ManifestServletConfiguration() {
        super();

        // base URL used in constructing IIIF manifests including servlet name and iiif-prefix (optional)
        newParameter("iiif-manifest-base-url", null, null, 'f');
        // web-application base URL used in constructing API paths (optional)
        newParameter("webapp-base-url", null, null, 'f');
        // Scaler servlet name used in constructing IIIF image API paths
        newParameter("scaler-servlet-name", "Scaler", null, 'f');
        // how to generate label for pages
        newParameter("iiif-manifest-page-label", "filename", null, 'f');
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
        // set version
        setValue("servlet.version", getVersion());
    }

    /*
     * Sets the current DigilibConfiguration in the context. 
     * @param context
     */
    @Override
    public void setContextConfig(ServletContext context) {
        context.setAttribute(ManifestServletConfiguration.MANIFEST_SERVLET_CONFIG_KEY, this);
    }
    
    /**
     * Returns the current ManifestServletConfiguration from the context.
     * 
     * @param context the ServletContext
     * @return the DigilibServletConfiguration
     */
    public static DigilibServletConfiguration getCurrentConfig(ServletContext context) {
        DigilibServletConfiguration config = (DigilibServletConfiguration) context
                .getAttribute(ManifestServletConfiguration.MANIFEST_SERVLET_CONFIG_KEY);
        return config;
    }

    /**
     * Returns the current DigilibConfiguration from the context.
     * (non-static method, for Java inheritance)
     * 
     * @param context the ServletContext
     * @return the DigilibServletConfiguration
     */
    @Override
    protected DigilibServletConfiguration getContextConfig(ServletContext context) {
        return getCurrentConfig(context);
    }

}
