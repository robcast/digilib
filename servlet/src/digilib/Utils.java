/*  Utils -- general utility classes for scaler servlet

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

package digilib;

public class Utils {

  public Utils() {
  }

  public Utils(int dbg) {
    debugLevel = dbg;
  }
  
  public static int debugLevel = 10;
  public void setDebugLevel(int lvl) {
    debugLevel = lvl;
  }
  public int getDebugLevel() {
      return debugLevel;
  }
  
  /**
   *  Debugging help
   *    dprintln(1, "blabla");
   *    will be printed on stdout if debug >= 1
   */
  public static void dprintln(int dbg, String s) {
    if (debugLevel >= dbg) {
      String ind = "";
      // indent by debuglevel
      for (int i = 0; i < dbg; i++) {
        ind += "  ";
      }
      System.out.println(ind+s);
    }
  }
}
