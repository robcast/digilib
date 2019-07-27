package digilib.util;

/*
 * #%L
 * HashTree -- Tree in a Hashtable
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2002 - 2013 MPIWG Berlin
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

import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.StringTokenizer;

/**
 * Tree representation wrapper for a HashMap.
 * 
 * The HashTree is constructed from a HashMap filled with 'branches' with
 * 'leaves'. The branches are stored as String keys in the HashMap. The String
 * values are leaves.
 * 
 * Branches are matched in 'twigs' separated by 'twig separator' Strings. The
 * return values for a match are leaf values separated by 'leaf separator'
 * Strings.
 * 
 * @author casties
 */
public class HashTree {

    private Map<String, String> table;

    private String twigSep = "/";

    private String leafSep = ",";

    /**
     * Constructor of a HashTree.
     * 
     * Creates a HashTree wrapper around a given HashMap, using the given twig
     * separator and leaf separator.
     * 
     * @param t the Map
     * @param twig_separator the twig separator
     * @param leaf_separator the leaf separator
     */
    public HashTree(Map<String, String> t, String twig_separator, String leaf_separator) {
        table = t;
        twigSep = twig_separator;
        leafSep = leaf_separator;
        optimizeTable();
    }

    private void optimizeTable() {
    }

    /**
     * Matches the given branch against the HashTree.
     * 
     * Returns a LinkedList of all leaves on all matching branches in the tree.
     * Branches in the tree match if they are substrings starting at the same
     * root.
     * 
     * @param branch the branch
     * @return list of leaves
     */
    public List<String> match(String branch) {
        String b = "";
        String m;
        LinkedList<String> matches = new LinkedList<String>();

        // split branch
        StringTokenizer twig = new StringTokenizer(branch, twigSep);
        // walk branch and check with tree
        while (twig.hasMoreTokens()) {
            if (b.length() == 0) {
                b = twig.nextToken();
            } else {
                b += twigSep + twig.nextToken();
            }
            m = table.get(b);
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
