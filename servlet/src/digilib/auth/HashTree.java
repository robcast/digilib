/*  HashTree -- Tree in a Hashtable

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

import java.util.*;

public class HashTree {

  private HashMap table;
  private String twigSep = "/";
  private String leafSep = ",";

  public HashTree() {
    table = new HashMap();
  }

  public HashTree(HashMap t, String twig_separator, String leaf_separator) {
    table = t;
    twigSep = twig_separator;
    leafSep = leaf_separator;
    optimizeTable();
  }

  void optimizeTable() {
  }

  List match(String branch) {
    String b = "";
    String m;
    LinkedList matches = new LinkedList();

    // split branch
    StringTokenizer twig = new StringTokenizer(branch, twigSep);
    // walk branch and check with tree
    while (twig.hasMoreTokens()) {
      if (b.length() == 0) {
        b = twig.nextToken();
      } else {
        b += twigSep + twig.nextToken();
      }
      m = (String)table.get(b);
      //System.out.println("CHECK: "+b+" = "+m);
      if (m != null) {
        if (m.indexOf(leafSep) < 0) {
          // single leaf
          matches.add(m);
        } else {
          // split leaves
          StringTokenizer leaf = new StringTokenizer(m, leafSep);
          while (leaf.hasMoreTokens()) {
            matches.add(leaf.nextToken());
          }
        }
      }
    }
    if (matches.size() > 0) {
      return matches;
    } else {
      return null;
    }
  }
}
