package digilib.conf;

/*
 * #%L
 * DigilibServlet3Configuration -- Holding all parameters for digilib servlet.
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2013 MPIWG Berlin
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

import javax.servlet.ServletContext;
import javax.servlet.annotation.WebListener;

import digilib.servlet.AsyncServletWorker;

/**
 * Class to hold the digilib servlet configuration parameters. The parameters
 * can be read from the digilib-config file and be passed to other servlets or
 * beans.
 * @author casties
 *
 */
@WebListener
public class DigilibServlet3Configuration extends DigilibServletConfiguration {

    public static String getClassVersion() {
        return "2.3.0 async";
    }

    /* non-static getVersion for Java inheritance */
    @Override
    public String getVersion() {
    	return getClassVersion();
    }
    
    /**
     * Constructs DigilibServletConfiguration and defines all parameters and their default values.
     */
    public DigilibServlet3Configuration() {
        super();
        
        // timeout for worker threads (ms)
        newParameter("worker-timeout", new Integer(60000), null, 'f');
    }

    /* (non-Javadoc)
     * @see digilib.conf.DigilibServletConfiguration#configure(javax.servlet.ServletContext)
     */
    @Override
    public void configure(ServletContext context) {
        super.configure(context);
        
        // set version
        setValue("servlet.version", getVersion());
        
        // digilib worker timeout
        long to = getAsInt("worker-timeout");
        AsyncServletWorker.setTimeout(to);
    }

}
