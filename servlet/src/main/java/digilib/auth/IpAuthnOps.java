package digilib.auth;

/*
 * #%L
 * Authentication class implementation using IP addresses
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2016 MPIWG Berlin
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
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;

import digilib.conf.DigilibConfiguration;
import digilib.conf.DigilibRequest;
import digilib.conf.DigilibServletRequest;
import digilib.util.HashTree;
import digilib.util.XMLMapLoader;

/**
 * Implements AuthnOps using IP adresses defined in an XML config file.
 * 
 * The name of the configuration file is read from the digilib config parameter "auth-file".
 * 
 * The tag "digilib-adresses" is read from the configuration file:
 * <pre>  
 * {@code
 * <digilib-addresses>
 *   <address ip="130.92.68" role="eastwood-coll,ptolemaios-geo" />
 *   <address ip="130.92.151" role="wtwg" />
 *   <address ip="0:0:0:0:0:0:0:1" role="local" />
 * </digilib-addresses>
 * }
 * </pre>
 * A computer with an ip address that matches "ip" is automatically granted all roles under "role".
 * The ip address is matched from the left (in full quads). Roles under "role" must be separated by comma only (no spaces). 
 * 
 */
public class IpAuthnOps implements AuthnOps {

    /** general logger for this class */
    protected Logger logger = Logger.getLogger(this.getClass());

    protected File configFile;
    protected HashTree authIP4s;
    protected HashTree authIP6s;

    /**
     * Initialize authentication operations.
     * 
     * Reads tag "digilib-adresses" from configuration file 
     * and sets up authentication arrays.
     * 
     * @throws AuthOpException
     *             Exception thrown on error.
     */
    @Override
    public void init(DigilibConfiguration dlConfig) throws AuthOpException {
        configFile = dlConfig.getAsFile("auth-file");
        logger.debug("IpAuthnOps.init (" + configFile + ")");
        Map<String, String> ipList = null;
        try {
            // load authIPs
            XMLMapLoader ipLoader = new XMLMapLoader("digilib-addresses", "address", "ip", "role");
            ipList = ipLoader.loadUri(configFile.toURI());
        } catch (Exception e) {
            throw new AuthOpException("ERROR loading auth config file: " + e);
        }
        if (ipList == null) {
            throw new AuthOpException("ERROR unable to load auth config file!");
        }
        // setup ip trees
        authIP4s = new HashTree(ipList, ".", ",");
        authIP6s = new HashTree(ipList, ":", ",");
    }

    /* (non-Javadoc)
     * @see digilib.auth.AuthnOps#hasUserRoles()
     */
    @Override
    public boolean hasUserRoles() {
        return true;
    }

    /* (non-Javadoc)
     * @see digilib.auth.AuthnOps#getUserRoles(digilib.conf.DigilibRequest)
     */
    @Override
    public List<String> getUserRoles(DigilibRequest dlRequest) throws AuthOpException {
        HttpServletRequest request = ((DigilibServletRequest) dlRequest).getServletRequest();
        String ip = request.getRemoteAddr();
        List<String> provided = null;
        if (ip.contains(":")) {
            // IPv6
            provided  = authIP6s.match(ip);
        } else {
            // IPv4
            provided = authIP4s.match(ip);
        }        
        logger.debug("Roles provided by ip "+ip+": "+provided);
        return provided;
    }

    /* (non-Javadoc)
     * @see digilib.auth.AuthnOps#isUserInRole(digilib.conf.DigilibRequest, java.lang.String)
     */
    @Override
    public boolean isUserInRole(DigilibRequest dlRequest, String role) throws AuthOpException {
        // check if the requests address provides a role
        List<String> provided = getUserRoles(dlRequest);
        if ((provided != null) && (provided.contains(role))) {
            return true;
        }
        return false;
    }

}
