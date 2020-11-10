package digilib.auth;

/*-
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2001 - 2020 digilib Community
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
 */

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


/**
 * Static factory for authorization AuthzOps.
 * 
 * @author casties
 * 
 */
public class AuthzOpsFactory {
    /** Log4J logger */
    protected static Logger logger = LoggerFactory.getLogger(AuthzOpsFactory.class);

    /** AuthzOps implementation class */
    protected static Class<AuthzOps> authOpsClass;

    public static AuthzOps getAuthzOpsInstance() {
        AuthzOps ao = null;
        try {
            ao = authOpsClass.getDeclaredConstructor().newInstance();
        } catch (Exception e) {
            logger.error("Unable to create AuthzOps instance!", e);
        }
        return ao;
    }

    /** set the AuthzOps implementation class.
     * @param clazz implementation class
     */
    public static void setAuthzOpsClass(Class<AuthzOps> clazz) {
        AuthzOpsFactory.authOpsClass = clazz;
    }

}
