/*  AuthOps -- Authentication class implementation

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

import javax.servlet.http.HttpServletRequest;
import java.util.*;

import digilib.*;

public abstract class AuthOpsImpl implements AuthOps {

  protected Utils util;

  public AuthOpsImpl() {
    util = new Utils();
    try {
      init();
    } catch (AuthOpException e) {
    }
  }

  public AuthOpsImpl(Utils u) {
    util = u;
    try {
      init();
    } catch (AuthOpException e) {
    }
  }

  public boolean isAuthRequired(String filepath, HttpServletRequest request) throws AuthOpException {
    // check permissions
    List rolesRequired = rolesForPath(filepath, request);
    return (rolesRequired != null);
  }

  public boolean isAuthorized(String filepath, HttpServletRequest request) throws AuthOpException {
    List rolesAllowed = rolesForPath(filepath, request);
    return isRoleAuthorized(rolesAllowed, request);
  }

  public boolean isRoleAuthorized(List roles, HttpServletRequest request) {
    ListIterator r = roles.listIterator();
    String s = "";
    while (r.hasNext()) {
      s = (String)r.next();
      util.dprintln(5, "Testing role: "+s);
      if (request.isUserInRole(s)) {
        util.dprintln(5, "Role Authorized");
        return true;
      }
    }
    return false;
  }

  public abstract void init() throws AuthOpException;

  public abstract List rolesForPath(String filepath, HttpServletRequest request) throws AuthOpException;

}
