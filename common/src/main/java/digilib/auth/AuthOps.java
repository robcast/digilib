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

import java.util.List;

import digilib.conf.DigilibRequest;

/** Class of operations requiring authentication. */
public interface AuthOps {

	/** Test if the request must be authorized to access the filepath.
	 *
	 * Information about the user is taken from the DigilibRequest.
	 * @param request DigilibRequest with user information.
	 * @throws AuthOpException Exception thrown on error.
	 * @return true if the user request must be authorized.
	 */
	public boolean isAuthRequired(DigilibRequest request)
		throws AuthOpException;

	/** Test if the request is allowed to access filepath.
	 * 
	 * @param request Request with user information.
	 * @throws AuthOpException Exception thrown on error.
	 * @return true if the request is allowed.
	 */
	public boolean isAuthorized(DigilibRequest request)
		throws AuthOpException;

	/** Authorization roles needed for request.
	 *
	 * Returns the list of authorization roles that are needed to access the
	 * specified path. No list means the path is free.
	 *
	 * The location information of the request is also considered.
	 *
	 * @param request DigilibRequest with address information.
	 * @throws AuthOpException Exception thrown on error.
	 * @return List of Strings with role names.
	 */
	public List<String> rolesForPath(DigilibRequest request)
		throws AuthOpException;

	/** Test request authorization against a list of roles.
	 * @param roles List of Strings with role names.
	 * @param request ServletRequest with address information.
	 * @return true if the user information in the request authorizes one of the roles.
	 */
	public boolean isRoleAuthorized(List<String> roles, DigilibRequest request);

}
