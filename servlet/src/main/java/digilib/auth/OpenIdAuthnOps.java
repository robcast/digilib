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

import java.io.File;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;

import org.jose4j.jwk.JsonWebKey;
import org.jose4j.jwt.JwtClaims;
import org.jose4j.jwt.MalformedClaimException;
import org.jose4j.jwt.consumer.InvalidJwtException;
import org.jose4j.jwt.consumer.JwtConsumer;
import org.jose4j.jwt.consumer.JwtConsumerBuilder;
import org.jose4j.jwt.consumer.JwtContext;
import org.jose4j.lang.JoseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.conf.DigilibConfiguration;
import digilib.conf.DigilibRequest;
import digilib.conf.DigilibServletRequest;
import digilib.util.XMLMapListLoader;

/**
 * Implements AuthnOps using an OpenId Connect ID token.
 * 
 * The name of the configuration file is read from the digilib config parameter "auth-file".
 *
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
 * A request with an "id_token" parameter containing a valid token signed with the configured key
 * including the configured issuer (iss) and clientid (aud) is granted the configured roles.
 * 
 */
public class OpenIdAuthnOps implements AuthnOps {

    /** general logger for this class */
    protected static final Logger logger = LoggerFactory.getLogger(OpenIdAuthnOps.class);

    protected File configFile;

    /** JwtConsumer to parse the token without validation to extract the issuer */
    protected JwtConsumer firstPassJwtConsumer;
    
    /** Map of validating JwtConsumers by issuer (URL) */
    protected Map<String, JwtConsumer> idpJwtConsumers;
    
    /** Map of (List of) roles by issuer (URL) */ 
    protected Map<String, List<String>> idpRoles;

    /** Name of the cookie that contains the token */
    protected String tokenCookieName;
    

    /* (non-Javadoc)
     * @see digilib.auth.AuthnOps#init(digilib.conf.DigilibConfiguration)
     */
    @Override
    public void init(DigilibConfiguration dlConfig) throws AuthOpException {
        configFile = dlConfig.getAsFile("auth-file");
        logger.debug("openidauthnops.init (" + configFile + ")");
        List<Map<String, String>> idpList;
        try {
            // load identity providers
            XMLMapListLoader idpLoader = new XMLMapListLoader("digilib-oauth", "openid");
            idpList = idpLoader.loadUri(configFile.toURI());
        } catch (Exception e) {
            throw new AuthOpException("ERROR loading auth config file: " + e);
        }
        if (idpList == null) {
            throw new AuthOpException("ERROR unable to load auth config file!");
        }
        
        // create Map of roles by issuer
        idpRoles = new HashMap<String, List<String>>();
        
        // build a first pass JwtConsumer that doesn't check signatures or do any validation.
        firstPassJwtConsumer = new JwtConsumerBuilder()
                .setSkipAllValidators()
                .setDisableRequireSignature()
                .setSkipSignatureVerification()
                .build();
        
        // create Map of configured JwtConsumers by issuer
        idpJwtConsumers = new HashMap<String, JwtConsumer>();
        for (Map<String, String> idpDesc : idpList) {
            String issuer = idpDesc.get("issuer");
            if (issuer == null) {
                logger.error("Missing issuer in openid tag!");
                continue;
            }
            
            String clientid = idpDesc.get("clientid");
            if (clientid == null) {
                logger.error("Missing clientid in openid tag! (issuer: "+issuer+")");
                continue;
            }
            
            String rolestr = idpDesc.get("roles");
            if (rolestr == null) {
                logger.error("Missing roles in openid tag! (issuer: "+issuer+")");
                continue;
            }
            // split roles string into list
            List<String> roles = Arrays.asList(rolestr.split(","));
            
            String keytype = idpDesc.get("keytype");
            if (keytype == null || ! keytype.equals("jwk")) {
                logger.error("Missing or invalid keytype in openid tag! (issuer: "+issuer+")");
                continue;
            }
            
            String keyData = idpDesc.get("_text");
            if (keyData == null || keyData.length() == 0) {
                logger.error("Missing key data in openid tag! (issuer: "+issuer+")");
                continue;
            }
            
            try {
                // create key from JWK data
                JsonWebKey jwk = JsonWebKey.Factory.newJwk(keyData);
                // create second pass consumer for validation
                JwtConsumer secondPassJwtConsumer = new JwtConsumerBuilder()
                        .setExpectedIssuer(issuer)
                        .setVerificationKey(jwk.getKey())
                        .setRequireExpirationTime()
                        .setAllowedClockSkewInSeconds(300)
                        .setRequireSubject()
                        .setExpectedAudience(clientid)
                        .build();
                
                // save consumer and roles
                idpJwtConsumers.put(issuer, secondPassJwtConsumer);
                idpRoles.put(issuer, roles);
                logger.debug("Registered id provider '"+issuer+"'");
                
            } catch (JoseException e) {
                logger.error("Invalid key data in openid tag! (issuer: "+issuer+")");
                continue;
            }
        }
        
        // set token cookie name
        tokenCookieName = dlConfig.getAsString("authn-token-cookie");
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
    public List<String> getUserRoles(DigilibRequest request) throws AuthOpException {
        /*
         * try token parameter first
         */
        String id_token = request.getAsString("id_token");
        if (id_token == null || id_token.isEmpty()) {
            /*
             * try token cookie next
             */
            HttpServletRequest srvReq = ((DigilibServletRequest) request).getServletRequest();            
            Cookie[] cookies = srvReq.getCookies();
            if (cookies != null) {
                for (Cookie c : cookies) {
                    if (c.getName().equals(tokenCookieName)) {
                        id_token = c.getValue();
                        break;
                    }
                }
            }
            if (id_token == null || id_token.isEmpty()) {
                logger.error("Missing id token!");
                return null;
            }
        }
        // the first JwtConsumer is just used to parse the JWT into a JwtContext object.
        try {
            JwtContext jwtContext = firstPassJwtConsumer.process(id_token);
            // extract issuer
            String issuer = jwtContext.getJwtClaims().getIssuer();
            // get validating consumer for this issuer
            JwtConsumer secondPassJwtConsumer = idpJwtConsumers.get(issuer);
            if (secondPassJwtConsumer == null) {
                logger.error("Unknown id token issuer: "+issuer);
                return null;
            }
            // validate token
            secondPassJwtConsumer.processContext(jwtContext);
            JwtClaims claims = jwtContext.getJwtClaims();
            String sub = claims.getSubject();
            // get roles
            List<String> provided = idpRoles.get(issuer);
            logger.debug("Roles provided by id_token (sub='"+sub+"'): "+provided);
            return provided;
            
        } catch (InvalidJwtException | MalformedClaimException e) {
            logger.error("Error validating id token: "+e.getMessage());
            return null;
        }
    }

    /* (non-Javadoc)
     * @see digilib.auth.IpAuthnOps#isUserInRole(digilib.conf.DigilibRequest, java.lang.String)
     */
    @Override
    public boolean isUserInRole(DigilibRequest request, String role) throws AuthOpException {
        List<String> provided = getUserRoles(request);
        if (provided != null && provided.contains(role)) {
            return true;
        }
        return false;
    }

}
