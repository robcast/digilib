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

import digilib.conf.DigilibConfiguration;
import digilib.conf.DigilibServletConfiguration;
import digilib.conf.DigilibServletRequest;
import digilib.util.HashTree;
import digilib.util.XMLMapLoader;

/**
 * Implements AuthzOps using paths defined in an XML config file. 
 * 
 * The name of the configuration file is read from the digilib config parameter "auth-file".
 * <p/>
 * The tag "digilib-paths" is read from the configuration file:
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
 * 
 */
public class PathAuthzOps extends AuthzOpsImpl {

    private File configFile;
    private HashTree authPaths;

    /**
     * Initialize authentication operations.
     * 
     * Reads tag "digilib-paths" from configuration file 
     * and sets up authentication arrays.
     * 
     * @throws AuthOpException
     *             Exception thrown on error.
     */
    @Override
    public void init(DigilibConfiguration dlConfig) throws AuthOpException {
        configFile = dlConfig.getAsFile("auth-file");
        logger.debug("xmlauthops.init (" + configFile + ")");
        Map<String, String> pathList = null;
        try {
            // load authPaths
            XMLMapLoader pathLoader = new XMLMapLoader("digilib-paths", "path", "name", "role");
            pathList = pathLoader.loadUri(configFile.toURI());
        } catch (Exception e) {
            throw new AuthOpException("ERROR loading authorization config file: " + e);
        }
        if (pathList == null) {
            throw new AuthOpException("ERROR unable to load authorization config file!");
        }
        // setup path tree
        authPaths = new HashTree(pathList, "/", ",");
        // set authentication
        this.authnOps = (AuthnOps) dlConfig.getValue(DigilibServletConfiguration.AUTHN_OP_KEY);
    }

    /**
     * Return authorization roles needed for request.
     * 
     * Returns the list of authorization roles that are required to access the
     * specified path. No list means the path is free.
     * 
     * @param dlRequest
     *            DigilibServletRequest with image path and remote address information.
     * @throws AuthOpException
     *             Exception thrown on error.
     * @return List of Strings with role names.
     */
    public List<String> rolesForPath(DigilibServletRequest dlRequest) throws digilib.auth.AuthOpException {
        String filepath = dlRequest.getFilePath();
        logger.debug("rolesForPath: " + filepath);
        // which roles are required?
        List<String> required = authPaths.match(filepath);
        return required;
    }

}
