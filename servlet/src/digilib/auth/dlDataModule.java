/* dlDataModule -- Database access helper class

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

import com.borland.dx.dataset.*;
import com.borland.dx.sql.dataset.*;


public class dlDataModule implements DataModule {
  private static dlDataModule myDM;
  Database dlDatabase = new Database();
  QueryDataSet authPathsQuery = new QueryDataSet();

  public dlDataModule() {
    try {
      jbInit();
    }
    catch(Exception e) {
      e.printStackTrace();
    }
  }
  private void jbInit() throws Exception {
    authPathsQuery.setReadOnly(true);
    authPathsQuery.setEditable(false);
    authPathsQuery.setQuery(new com.borland.dx.sql.dataset.QueryDescriptor(dlDatabase, "select * from digilib_paths", null, true, Load.ALL));
    dlDatabase.setConnection(new com.borland.dx.sql.dataset.ConnectionDescriptor("jdbc:oracle:thin:@penelope.unibe.ch:1521:WTWG", "digilib_auth", "allesmainz", false, "oracle.jdbc.driver.OracleDriver"));
  }
  public static dlDataModule getDataModule() {
    if (myDM == null) {
      myDM = new dlDataModule();
    }
    return myDM;
  }
  public com.borland.dx.sql.dataset.Database getDlDatabase() {
    return dlDatabase;
  }
  public com.borland.dx.sql.dataset.QueryDataSet getAuthPathsQuery() {
    return authPathsQuery;
  }
}
