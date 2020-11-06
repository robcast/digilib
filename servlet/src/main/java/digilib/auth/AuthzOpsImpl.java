package digilib.auth;

/*
 * #%L
 *  AuthOps -- Authentication class implementation
 *
 *  Digital Image Library servlet components
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

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.conf.DigilibConfiguration;
import digilib.conf.DigilibRequest;
import digilib.conf.DigilibServletRequest;

/**
 * Basic implementation of AuthOps interface.
 * 
 * Provides basic implementations. Only rolesForPath needs to be implemented by
 * specific implementations.
 */
public abstract class AuthzOpsImpl implements AuthzOps {

    /** general logger for this class */
    protected static final Logger logger = LoggerFactory.getLogger(AuthzOpsImpl.class);
    
    /** authentication instance */
    protected AuthnOps authnOps;

    /* (non-Javadoc)
     * @see digilib.auth.AuthzOps#init(digilib.conf.DigilibConfiguration)
     */
    @Override
    public abstract void init(DigilibConfiguration dlConfig) throws AuthOpException;

    /**
     * @see digilib.auth.AuthzOps#isAuthorizationRequired(digilib.conf.DigilibRequest)
     */
    public boolean isAuthorizationRequired(DigilibRequest request) throws AuthOpException {
        // check permissions
        List<String> rolesRequired = rolesForPath((DigilibServletRequest) request);
        return (rolesRequired != null);
    }

    /**
     * @see digilib.auth.AuthzOps#isAuthorized(digilib.conf.DigilibRequest)
     */
    public boolean isAuthorized(DigilibRequest request) throws AuthOpException {
        List<String> rolesRequired = rolesForPath((DigilibServletRequest) request);
        if (rolesRequired == null) return true;
        return isRoleAuthorized(rolesRequired, (DigilibServletRequest) request);
    }

    /**
     * Test request authorization against a list of roles.
     * 
     * @param rolesRequired
     *            List of Strings with role names.
     * @param request
     *            ServletRequest with address information.
     * @return true if the user information in the request authorizes one of the roles.
     * @throws AuthOpException Exception thrown on error.
     */
    public boolean isRoleAuthorized(List<String> rolesRequired, DigilibServletRequest request) throws AuthOpException {
        if (rolesRequired == null) return true;
        if (authnOps.hasUserRoles()) {
            // get and check list of provided roles (less calls)
            List<String> rolesProvided = authnOps.getUserRoles(request);
            if (rolesProvided == null) {
                return false;
            }
            for (String r : rolesRequired) {
                logger.debug("Testing role: " + r);
                if (rolesProvided.contains(r)) {
                    return true;
                }
            }
        } else {
            // check each role separately
            for (String r : rolesRequired) {
                logger.debug("Testing role: " + r);
                if (authnOps.isUserInRole(request, r)) {
                    logger.debug("Role Authorized");
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Authorization roles needed for request.
     * 
     * Returns the list of authorization roles that are needed to access the
     * specified path. No list means the path is free.
     * 
     * The location information of the request is also considered.
     * 
     * @param request
     *            DigilibRequest with address information.
     * @throws AuthOpException
     *             Exception thrown on error.
     * @return List of Strings with role names.
     */
    public abstract List<String> rolesForPath(DigilibServletRequest request) throws AuthOpException;

}
