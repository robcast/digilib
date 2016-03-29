package digilib.auth;

/*
 * #%L
 * Authentication Ops factory.
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

import org.apache.log4j.Logger;


/**
 * Static factory for authentication AuthnOps.
 * 
 * @author casties
 * 
 */
public class AuthnOpsFactory {
    /** Log4J logger */
    protected static Logger logger = Logger.getLogger(AuthnOpsFactory.class);

    /** AuthnOps implementation class */
    protected static Class<AuthnOps> authOpsClass;

    public static AuthnOps getAuthnOpsInstance() {
        AuthnOps ao = null;
        try {
            ao = authOpsClass.newInstance();
        } catch (Exception e) {
            logger.error("Unable to create AuthnOps instance!", e);
        }
        return ao;
    }

    /** set the AuthnOps implementation class.
     * @param clazz
     */
    public static void setAuthnOpsClass(Class<AuthnOps> clazz) {
        AuthnOpsFactory.authOpsClass = clazz;
    }

}
