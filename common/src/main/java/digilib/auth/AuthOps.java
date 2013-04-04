package digilib.auth;

/*
 * #%L
 * AuthOps -- Authentication interface class
 * 
 * Digital Image Library servlet components
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

import java.io.File;

import digilib.conf.DigilibRequest;

/** Class of operations requiring authentication. */
public interface AuthOps {

    /**
     * Test if the request must be authorized to access the filepath.
     * 
     * Information about the user is taken from the DigilibRequest.
     * 
     * @param request
     *            DigilibRequest with user information.
     * @throws AuthOpException
     *             Exception thrown on error.
     * @return true if the user request must be authorized.
     */
    public boolean isAuthRequired(DigilibRequest request) throws AuthOpException;

    /**
     * Test if the request is allowed to access filepath.
     * 
     * @param request
     *            Request with user information.
     * @throws AuthOpException
     *             Exception thrown on error.
     * @return true if the request is allowed.
     */
    public boolean isAuthorized(DigilibRequest request) throws AuthOpException;


    /**
     * Configure this AuthOps instance.
     * 
     * @param confFile
     * @throws AuthOpException
     */
    public void setConfig(File confFile) throws AuthOpException;
}
