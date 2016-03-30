package digilib.auth;

import java.io.File;

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

import org.apache.log4j.Logger;

import digilib.conf.DigilibConfiguration;
import digilib.conf.DigilibRequest;
import digilib.conf.DigilibServletRequest;
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
 * Author: Robert Casties (robcast@users.sourceforge.net)
 */


/**
 * Implements AuthnOps using an OpenId Connect ID token.
 * 
 * The name of the configuration file is read from the digilib config parameter "auth-file".
 * <p/>
 * The tag "digilib-oauth" is read from the configuration file:
 * <pre>  
 * {@code
 * <digilib-oauth>
 *   <openid issuer="https://id.some.where" clientid="myclient" roles="someusers" keytype="jwk">
 *     {"kty":"RSA","e":"AQAB","kid":"rsa1","n":"qjQ5U3wXzamg9R...idGpIiVilMDVBs"}
 *   </openid>
 * </digilib-oauth>
 * }
 * </pre>
 * 
 */
public class OpenIdAuthnOps implements AuthnOps {

    /** general logger for this class */
    protected Logger logger = Logger.getLogger(this.getClass());

    protected File configFile;

    /* (non-Javadoc)
     * @see digilib.auth.AuthnOps#init(digilib.conf.DigilibConfiguration)
     */
    @Override
    public void init(DigilibConfiguration dlConfig) throws AuthOpException {
        configFile = dlConfig.getAsFile("auth-file");
        logger.debug("openidauthnops.init (" + configFile + ")");
        
    }

    /* (non-Javadoc)
     * @see digilib.auth.IpAuthnOps#isUserInRole(digilib.conf.DigilibRequest, java.lang.String)
     */
    @Override
    public boolean isUserInRole(DigilibRequest dlRequest, String role) throws AuthOpException {
        return false;
    }

}
