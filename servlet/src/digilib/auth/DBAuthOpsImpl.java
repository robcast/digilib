/*  DBAuthOpsImpl -- Authentication class using database

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

import javax.servlet.http.*;
import java.util.*;
import com.borland.dx.dataset.*;

import digilib.*;

public class DBAuthOpsImpl implements AuthOps {

  private Utils util = null;
  private dlDataModule dlDataModule1;

  public DBAuthOpsImpl() {
    util = new Utils();
    dbInit();
  }

  public DBAuthOpsImpl(Utils u) {
    util = u;
    dbInit();
  }

  void dbInit() {
    try {
      dlDataModule1 = new dlDataModule();
      dlDataModule1.getAuthPathsQuery().open();
    }
    catch(Exception e) {
      e.printStackTrace();
    }
  }

  public void setUtils(Utils u) {
    util = u;
  }

  public boolean isAuthRequired(String filepath, HttpServletRequest request) throws AuthOpException {
    // check permissions
    List rolesRequired = rolesForPath(filepath, request);
    return (rolesRequired != null);
  }

  public boolean isAuthorized(String filepath, HttpServletRequest request) throws AuthOpException {
    List rolesAllowed = rolesForPath(filepath, request);
    return isRoleAuthorized(rolesAllowed, request);
  };

  public List rolesForPath(String filepath, HttpServletRequest request) throws AuthOpException {
    util.dprintln(4, "rolesForPath ("+filepath+")");
    String p = "";
    List r;
    LinkedList roles = new LinkedList();

    // split path in directories
    StringTokenizer path = new StringTokenizer(filepath, "/");
    // walk directories and check with db
    while (path.hasMoreTokens()) {
      p += "/" + path.nextToken();
      r = dbRolesForPath(p);
      if (r != null) {
         roles.addAll(r);
      }
    }
    if (roles.size() > 0) {
      return roles;
    } else {
      return null;
    }
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

  private List dbRolesForPath(String filepath) throws AuthOpException {
    util.dprintln(4, "dbRolesForPath ("+filepath+")");

    LinkedList roles = new LinkedList();
    DataSet query = dlDataModule1.getAuthPathsQuery();
    if (query == null) {
      throw new AuthOpException("Unable to access database!");
    }
    // search for PATH_NAME == filepath
    DataRow lookupRow = new DataRow(query, "PATH_NAME");
    lookupRow.setString("PATH_NAME", filepath);

    if (query.locate(lookupRow, Locate.FIRST)) {
      roles.add(query.getString("ROLE_NAME"));
      util.dprintln(5, "role found: "+query.getString("ROLE_NAME"));
      // any more matches?
      while (query.locate(lookupRow, Locate.NEXT_FAST)) {
        roles.add(query.getString("ROLE_NAME"));
        util.dprintln(5, "role found: "+query.getString("ROLE_NAME"));
      }
    }
    if (roles.size() > 0) {
      return roles;
    } else {
      return null;
    }
  }

}
