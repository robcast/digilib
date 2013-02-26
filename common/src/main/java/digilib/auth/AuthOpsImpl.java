package digilib.auth;

/*
 * #%L
 *  AuthOps -- Authentication class implementation
 *
 *  Digital Image Library servlet components
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

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;

import digilib.servlet.DigilibRequest;

/** Basic implementation of AuthOps interface.
 *
 * Provides basic implementations. Only rolesForPath needs to be implemented
 * by specific implementations.
 */
public abstract class AuthOpsImpl implements AuthOps {

	/** general logger for this class */
	protected Logger logger = Logger.getLogger(this.getClass());
	
  /** Default constructor. */  
  public AuthOpsImpl() {
    try {
      init();
    } catch (AuthOpException e) {
    }
  }


  /** Test if the request is allowed to access filepath.
   * @param filepath filepath to be acessed.
   * @param request Request with user information.
   * @throws AuthOpException Exception thrown on error.
   * @return true if the request is allowed.
   */
  public boolean isAuthRequired(String filepath, HttpServletRequest request) throws AuthOpException {
    // check permissions
    List<String> rolesRequired = rolesForPath(filepath, request);
    return (rolesRequired != null);
  }

  /**
   * @see digilib.auth.AuthOps#isAuthRequired(digilib.servlet.DigilibRequest)
   */
  public boolean isAuthRequired(DigilibRequest request)
	  throws AuthOpException {
		// check permissions
		List<String> rolesRequired = rolesForPath(request);
		return (rolesRequired != null);
  }

  /** Return authorization roles needed for request.
   *
   * Returns a list of authorization roles that would be allowed to access the
   * specified path. The location information of the request is considered also.
   * @param filepath filepath to be accessed.
   * @param request ServletRequest with address information.
   * @throws AuthOpException Exception thrown on error.
   * @return List of Strings with role names.
   */
  public boolean isAuthorized(String filepath, HttpServletRequest request) throws AuthOpException {
    List<String> rolesAllowed = rolesForPath(filepath, request);
    return isRoleAuthorized(rolesAllowed, request);
  }

  /**
   * @see digilib.auth.AuthOps#isAuthorized(digilib.servlet.DigilibRequest)
   */
  public boolean isAuthorized(DigilibRequest request)
	  throws AuthOpException {
		List<String> rolesAllowed = rolesForPath(request);
		return isRoleAuthorized(rolesAllowed, request);
  }

  /** Test request authorization against a list of roles.
   * @param roles List of Strings with role names.
   * @param request ServletRequest with address information.
   * @return true if the user information in the request authorizes one of the roles.
   */
  public boolean isRoleAuthorized(List<String> roles, HttpServletRequest request) {
    for (String s: roles) {
      logger.debug("Testing role: "+s);
      if (request.isUserInRole(s)) {
      	logger.debug("Role Authorized");
        return true;
      }
    }
    return false;
  }

  /**
   * @see digilib.auth.AuthOps#isRoleAuthorized(java.util.List, digilib.servlet.DigilibRequest)
   */
  public boolean isRoleAuthorized(List<String> roles, DigilibRequest request) {
	for (String s: roles) {
	  logger.debug("Testing role: "+s);
	  if (((HttpServletRequest)request.getServletRequest()).isUserInRole(s)) {
	  	logger.debug("Role Authorized");
		return true;
	  }
	}
	return false;
  }

  public abstract void init() throws AuthOpException;

  public abstract List<String> rolesForPath(String filepath, HttpServletRequest request) throws AuthOpException;

  public abstract List<String> rolesForPath(DigilibRequest request) throws AuthOpException;

}
