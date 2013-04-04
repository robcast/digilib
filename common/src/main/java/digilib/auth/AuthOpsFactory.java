package digilib.auth;

/*
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2013 MPIWG Berlin
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

import org.apache.log4j.Logger;


/**
 * Static factory for AuthOps.
 * 
 * @author casties
 * 
 */
public class AuthOpsFactory {
    /** Log4J logger */
    protected static Logger logger = Logger.getLogger(AuthOpsFactory.class);

    /** AuthOps implementation class */
    protected static Class<AuthOps> authOpsClass;

    public static AuthOps getAuthOpsInstance() {
        AuthOps ao = null;
        try {
            ao = authOpsClass.newInstance();
        } catch (Exception e) {
            logger.error("Unable to create AuthOps instance!", e);
        }
        return ao;
    }

    /** set the AuthOps implementation class.
     * @param clazz
     */
    public static void setAuthOpsClass(Class<AuthOps> clazz) {
        AuthOpsFactory.authOpsClass = clazz;
    }

}
