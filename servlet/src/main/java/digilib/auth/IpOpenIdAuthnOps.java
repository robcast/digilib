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

import digilib.conf.DigilibConfiguration;
import digilib.conf.DigilibRequest;

/**
 * Implements AuthnOps using IP adresses defined in an XML config file and an OpenId Connect ID token.
 * 
 * The name of the configuration file is read from the digilib config parameter "auth-file".
 * 
 * The tags "digilib-adresses" and "digilib-oauth" are read from the configuration file:
 * <pre>  
 * {@code
 * <digilib-addresses>
 *   <address ip="130.92.68" role="eastwood-coll,ptolemaios-geo" />
 *   <address ip="130.92.151" role="wtwg" />
 *   <address ip="0:0:0:0:0:0:0:1" role="local" />
 * </digilib-addresses>
 * 
 * <digilib-oauth>
 *   <openid issuer="https://id.some.where" clientid="myclient" roles="someusers" keytype="jwk">
 *     {"kty":"RSA","e":"AQAB","kid":"rsa1","n":"qjQ5U3wXzamg9R...idGpIiVilMDVBs"}
 *   </openid>
 * </digilib-oauth>
 * }
 * </pre>
 * A computer with an ip address that matches "ip" is automatically granted all roles under "role".
 * The ip address is matched from the left (in full quads). Roles under "role" must be separated by comma only (no spaces).
 * 
 * If roles provided by IP are not sufficient it uses the "id_token" parameter containing a valid token signed with the configured key
 * including the configured issuer (iss) and clientid (aud) to grant the configured roles.
 */
public class IpOpenIdAuthnOps extends IpAuthnOps {

    protected OpenIdAuthnOps openIdAuthnOps;
    
    /* (non-Javadoc)
     * @see digilib.auth.IpAuthnOps#init(digilib.conf.DigilibConfiguration)
     */
    @Override
    public void init(DigilibConfiguration dlConfig) throws AuthOpException {
        // init IpAuthnOps
        super.init(dlConfig);
        // init openIdAuthnOps
        openIdAuthnOps = new OpenIdAuthnOps();
        openIdAuthnOps.init(dlConfig);
    }

    /* (non-Javadoc)
     * @see digilib.auth.IpAuthnOps#getUserRoles(digilib.conf.DigilibRequest)
     */
    @Override
    public List<String> getUserRoles(DigilibRequest dlRequest) throws AuthOpException {
        List<String> roles = super.getUserRoles(dlRequest);
        if (roles == null) {
            // no IP roles
            roles = openIdAuthnOps.getUserRoles(dlRequest);
        } else {
            List<String> idRoles = openIdAuthnOps.getUserRoles(dlRequest);
            if (idRoles != null) {
                // add OpenID roles at the end
                roles.addAll(idRoles);
            }
        }
        return roles;
    }

}
