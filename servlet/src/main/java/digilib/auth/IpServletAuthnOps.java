package digilib.auth;

/*
 * #%L
 * Authentication class implementation using IP addresses and Servlet user information
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

import java.util.List;

import javax.servlet.http.HttpServletRequest;

import digilib.conf.DigilibRequest;
import digilib.conf.DigilibServletRequest;

/**
 * Implements AuthnOps using IP adresses defined in an XML config file and Servlet API isUserInRole().
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
 * Uses ServletRequest.isUserInRole() if roles provided by IP are not sufficient.
 */
public class IpServletAuthnOps extends IpAuthnOps {

    /* (non-Javadoc)
     * @see digilib.auth.IpAuthnOps#hasUserRoles()
     */
    @Override
    public boolean hasUserRoles() {
        // Servlet API does not support getting roles
        return false;
    }

    /* (non-Javadoc)
     * @see digilib.auth.IpAuthnOps#getUserRoles(digilib.conf.DigilibRequest)
     */
    @Override
    public List<String> getUserRoles(DigilibRequest dlRequest) throws AuthOpException {
        // Servlet API does not support getting roles
        return null;
    }

    /* (non-Javadoc)
     * @see digilib.auth.IpAuthnOps#isUserInRole(digilib.conf.DigilibRequest, java.lang.String)
     */
    @Override
    public boolean isUserInRole(DigilibRequest dlRequest, String role) throws AuthOpException {
        HttpServletRequest request = ((DigilibServletRequest) dlRequest).getServletRequest();
        // check if the requests IP provides a role
        List<String> provided = super.getUserRoles(dlRequest);
        if ((provided != null) && (provided.contains(role))) {
            return true;
        }
        // use the ServletRequest
        return request.isUserInRole(role);
    }

}
