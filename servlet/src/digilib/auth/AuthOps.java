/*  AuthOps -- Authentication interface class

  Digital Image Library servlet components

  Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*/

package digilib.auth;


import java.io.*;
import java.util.*;
import javax.servlet.http.*;

public interface AuthOps {

  /**
   *  check if the request must be authorized to access filepath
   */
  public boolean isAuthRequired(String filepath, HttpServletRequest request) throws AuthOpException;

  /**
   *  check if the request is allowed to access filepath
   */
  public boolean isAuthorized(String filepath, HttpServletRequest request) throws AuthOpException;

  /**
   *  return a list of authorization roles needed for request
   *  to access the specified path
   *    (does not look at request address for now)
   */
  public List rolesForPath(String filepath, HttpServletRequest request) throws AuthOpException;

  /**
   * check request authorization against a list of roles
   */
  public boolean isRoleAuthorized(List roles, HttpServletRequest request);

}
