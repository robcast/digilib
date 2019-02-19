package digilib.auth;

import java.util.List;

/*
 * #%L
 * AuthnOps -- Authentication interface class
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
 * Author: Robert Casties (robcast@users.sourceforge.net)
 */

import digilib.conf.DigilibConfiguration;
import digilib.conf.DigilibRequest;

/** Class of operations providing authentication. */
public interface AuthnOps {

    /**
     * Test if the user represented by request has the given role.
     * 
     * @param request Request with user information.
     * @param role role to be tested.
     * @throws AuthOpException
     *             Exception thrown on error.
     * @return true if the user has the role.
     */
    public boolean isUserInRole(DigilibRequest request, String role) throws AuthOpException;

    /**
     * Return if the implementation supports getUserRoles().
     * 
     * @return
     */
    public boolean hasUserRoles();
    
    /**
     * Return the list of roles associated with the user represented by request.
     * 
     * Returns null if a list of roles is not available. Users of this API should
     * check hasUserRoles().
     * 
     * @param request
     * @return
     * @throws AuthOpException
     */
    public List<String> getUserRoles(DigilibRequest request) throws AuthOpException;

    /**
     * Configure this AuthnOps instance.
     * 
     * @param dlConfig
     * @throws AuthOpException
     */
    public void init(DigilibConfiguration dlConfig) throws AuthOpException;
}
