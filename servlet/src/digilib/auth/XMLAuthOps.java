/* XMLAuthOps -- Authentication class implementation using XML files

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
import java.io.*;

import digilib.*;
import digilib.io.*;


public class XMLAuthOps extends AuthOpsImpl {

  private String configFile = "/docuserver/www/digitallibrary/WEB-INF/digilib-auth.xml";
  private HashTree authPaths;
  private HashTree authIPs;

  public XMLAuthOps(Utils u, String confFile) throws AuthOpException {
    util = u;
    configFile = confFile;
    init();
  }

  public void setConfig(String confFile) throws AuthOpException {
    configFile = confFile;
    init();
  }

  public void init() throws AuthOpException {
    util.dprintln(10, "xmlauthops.init ("+configFile+")");
    Hashtable pathList = null;
    Hashtable ipList = null;
    try {
      // create data loader for auth-path file
      File confFile = new File(configFile);
      // load authPaths
      XMLListLoader pathLoader = new XMLListLoader("digilib-paths", "path", "name", "role");
      pathList = pathLoader.loadURL(confFile.toURL().toString());
      // load authIPs
      XMLListLoader ipLoader = new XMLListLoader("digilib-addresses", "address", "ip", "role");
      ipList = ipLoader.loadURL(confFile.toURL().toString());
    }
    catch (Exception e) {
      throw new AuthOpException("ERROR loading authorization config file: "+e);
    }
    if ((pathList == null)||(ipList == null)) {
      throw new AuthOpException("ERROR unable to load authorization config file!");
    }
    // setup path tree
    authPaths = new HashTree(pathList, "/", ",");
    // setup ip tree
    authIPs = new HashTree(ipList, ".", ",");
  }

  public List rolesForPath(String filepath, HttpServletRequest request) throws digilib.auth.AuthOpException {
    util.dprintln(4, "rolesForPath ("+filepath+") by ["+request.getRemoteAddr()+"]");

    // check if the requests address provides a role
    List provided = authIPs.match(request.getRemoteAddr());
    if ((provided != null)&&(provided.contains("ALL"))) {
      // ALL switches off checking;
      return null;
    }
    // which roles are required?
    List required = authPaths.match(filepath);
    // do any provided roles match?
    if ((provided != null)&&(required != null)) {
      for (int i = 0; i < provided.size(); i++) {
        if (required.contains(provided.get(i))) {
          // satisfied
          return null;
        }
      }
    }
    return required;
  }

}
