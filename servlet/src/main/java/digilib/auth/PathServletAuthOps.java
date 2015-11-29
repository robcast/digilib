package digilib.auth;

/*
 * #%L
 * XMLAuthOps -- Authentication class implementation using XML files
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
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import digilib.conf.DigilibServletRequest;
import digilib.util.HashTree;
import digilib.util.XMLListLoader;

/**
 * Implements AuthOps using paths defined in an XML config file.
 * <p/>
 * Tags "digilib-paths" and "digilib-adresses" are read from the configuration file:
 * <pre>
 * {@code
 * <digilib-paths>
 *   <path name="histast/eastwood-collection" role="eastwood-coll" />
 * </digilib-paths>
 * }
 * </pre>
 * A user must supply one of the roles under "role" to access the directory "name".
 * Roles under "role" must be separated by comma only (no spaces).
 * <pre>  
 * {@code
 * <digilib-addresses>
 *   <address ip="130.92.68" role="eastwood-coll,ptolemaios-geo" />
 *   <address ip="130.92.151" role="ALL" />
 * </digilib-addresses>
 * }
 * </pre>
 * A computer with an ip address that matches "ip" is automatically granted all roles under "role".
 * The ip address is matched from the left (in full quads). Roles under "role" must be separated by comma only (no spaces). 
 * 
 */
public class PathServletAuthOps extends ServletAuthOpsImpl {

    private File configFile;
    private HashTree authPaths;
    private HashTree authIPs;

    /**
     * Set configuration file.
     * 
     * @param confFile
     *            XML config file.
     * @throws AuthOpException
     *             Exception thrown on error.
     */
    public void setConfig(File confFile) throws AuthOpException {
        configFile = confFile;
        init();
    }

    /**
     * Initialize authentication operations.
     * 
     * Reads tags "digilib-paths" and "digilib-adresses" from configuration file 
     * and sets up authentication arrays.
     * 
     * @throws AuthOpException
     *             Exception thrown on error.
     */
    public void init() throws AuthOpException {
        logger.debug("xmlauthops.init (" + configFile + ")");
        Map<String, String> pathList = null;
        Map<String, String> ipList = null;
        try {
            // load authPaths
            XMLListLoader pathLoader = new XMLListLoader("digilib-paths", "path", "name", "role");
            pathList = pathLoader.loadUri(configFile.toURI());
            // load authIPs
            XMLListLoader ipLoader = new XMLListLoader("digilib-addresses", "address", "ip", "role");
            ipList = ipLoader.loadUri(configFile.toURI());
        } catch (Exception e) {
            throw new AuthOpException("ERROR loading authorization config file: " + e);
        }
        if ((pathList == null) || (ipList == null)) {
            throw new AuthOpException("ERROR unable to load authorization config file!");
        }
        // setup path tree
        authPaths = new HashTree(pathList, "/", ",");
        // setup ip tree
        authIPs = new HashTree(ipList, ".", ",");
    }

    /**
     * Return authorization roles needed for request.
     * 
     * Returns the list of authorization roles that are required to access the
     * specified path. No list means the path is free.
     * 
     * The location information of the request is determined by ServletRequest.getRemoteAddr().
     * 
     * @param dlRequest
     *            DigilibServletRequest with image path and remote address information.
     * @throws AuthOpException
     *             Exception thrown on error.
     * @return List of Strings with role names.
     */
    public List<String> rolesForPath(DigilibServletRequest dlRequest) throws digilib.auth.AuthOpException {
        String filepath = dlRequest.getFilePath();
        HttpServletRequest request = dlRequest.getServletRequest();
        logger.debug("rolesForPath (" + filepath + ") by [" + request.getRemoteAddr() + "]");

        // check if the requests address provides a role
        List<String> provided = authIPs.match(request.getRemoteAddr());
        if ((provided != null) && (provided.contains("ALL"))) {
            // ALL switches off checking;
            return null;
        }
        // which roles are required?
        List<String> required = authPaths.match(filepath);
        // do any provided roles match?
        if ((provided != null) && (required != null)) {
            for (int i = 0; i < provided.size(); i++) {
                if (required.contains(provided.get(i))) {
                    // satisfied
                    return null;
                }
            }
        }
        return required;
    }

}
