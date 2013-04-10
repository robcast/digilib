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

import org.apache.log4j.Logger;

import digilib.conf.DigilibRequest;
import digilib.conf.DigilibServletRequest;

/**
 * Basic implementation of AuthOps interface.
 * 
 * Provides basic implementations. Only rolesForPath needs to be implemented by
 * specific implementations.
 */
public abstract class ServletAuthOpsImpl implements AuthOps {

    /** general logger for this class */
    protected Logger logger = Logger.getLogger(this.getClass());

    public abstract void init() throws AuthOpException;

    /**
     * @see digilib.auth.AuthOps#isAuthRequired(digilib.conf.DigilibRequest)
     */
    public boolean isAuthRequired(DigilibRequest request) throws AuthOpException {
        // check permissions
        List<String> rolesRequired = rolesForPath((DigilibServletRequest) request);
        return (rolesRequired != null);
    }

    /**
     * @see digilib.auth.AuthOps#isAuthorized(digilib.conf.DigilibRequest)
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
     * @return true if the user information in the request authorizes one of the
     *         roles.
     */
    public boolean isRoleAuthorized(List<String> rolesRequired, DigilibServletRequest request) {
        if (rolesRequired == null) return true;
        for (String s : rolesRequired) {
            logger.debug("Testing role: " + s);
            if (request.getServletRequest().isUserInRole(s)) {
                logger.debug("Role Authorized");
                return true;
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
