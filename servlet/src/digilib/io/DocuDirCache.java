/* DocuDirCache.java

  Digital Image Library servlet components

  Copyright (C) 2003 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

 * Created on 03.03.2003
 */

package digilib.io;

import java.io.File;
import java.util.Hashtable;

/**
 * @author casties
 */
public class DocuDirCache extends Hashtable {

	// names of base directories
	private String[] baseDirNames = null;
	// number of files in the whole cache (not reliable)
	private long numFiles = 0;
	// number of cache hits
	private long hits = 0;
	// number of cache misses
	private long misses = 0;

	/* 
	 * inherited constructors
	 */
	public DocuDirCache(int initialCapacity, float loadFactor) {
		super(initialCapacity, loadFactor);
	}

	public DocuDirCache(int initialCapacity) {
		super(initialCapacity);
	}

	public DocuDirCache() {
		super();
	}

	/* 
	 * new and exiting stuff 
	 */

	/** Constructor with array of base directory names.
	 *  
	 * @param bd base directory names
	 */
	public DocuDirCache(String[] bd) {
		super();
		baseDirNames = bd;
	}

	/** Add a DocuDirectory to the cache.
	 * 
	 * @param newdir
	 */
	public void put(DocuDirectory newdir) {
		String s = newdir.getDirName();
		if (containsKey(s)) {
			System.out.println("Baah, duplicate key in DocuDirectory.put!");
		} else {
			super.put(s, newdir);
			numFiles += newdir.size();
		}
	}

	public DocuFileset getFileset(String fn, int in) {
		DocuDirectory dd;
		// file number is 1-based, vector index is 0-based
		int n = in - 1;
		// first, assume fn is a directory and look in the cache
		dd = (DocuDirectory) get(fn);
		if (dd == null) {
			// cache miss
			misses++;
			// see if it's a directory
			File f = new File(baseDirNames[0] + fn);
			if (f.isDirectory()) {
				dd = new DocuDirectory(fn, baseDirNames);
				if (dd.isValid()) {
					// add to the cache
					put(dd);
				}
			} else {
				// maybe it's a file
				if (f.canRead()) {
					// try the parent directory in the cache
					dd = (DocuDirectory) get(f.getParent());
					if (dd == null) {
						// try to read from disk
						dd = new DocuDirectory(f.getParent(), baseDirNames);
						if (dd.isValid()) {
							// add to the cache
							put(dd);
						} else {
							// invalid path
							return null;
						}
					}
					// get the file's index
					n = dd.indexOf(f.getName());
				}
			}
		} else {
			// cache hit
			hits++;
		}
		dd.refresh();
		if (dd.isValid()) {
			try {
				return (DocuFileset) dd.elementAt(n);
			} catch (ArrayIndexOutOfBoundsException e) {
			}
		}
		return null;
	}

	public DocuDirectory getDirectory(String fn) {
		DocuDirectory dd;
		// first, assume fn is a directory and look in the cache
		dd = (DocuDirectory) get(fn);
		if (dd == null) {
			// cache miss
			misses++;
			// see if it's a directory
			File f = new File(baseDirNames[0] + fn);
			if (f.isDirectory()) {
				dd = new DocuDirectory(fn, baseDirNames);
				if (dd.isValid()) {
					// add to the cache
					put(dd);
				}
			} else {
				// maybe it's a file
				if (f.canRead()) {
					// try the parent directory in the cache
					dd = (DocuDirectory) get(f.getParent());
					if (dd == null) {
						// try to read from disk
						dd = new DocuDirectory(f.getParent(), baseDirNames);
						if (dd.isValid()) {
							// add to the cache
							put(dd);
						} else {
							// invalid path
							return null;
						}
					}
				}
			}
		} else {
			// cache hit
			hits++;
		}
		dd.refresh();
		if (dd.isValid()) {
			return dd;
		}
		return null;
	}

	/**
	 * @return String[]
	 */
	public String[] getBaseDirNames() {
		return baseDirNames;
	}

	/**
	 * @return long
	 */
	public long getNumFiles() {
		return numFiles;
	}

	/**
	 * Sets the baseDirNames.
	 * @param baseDirNames The baseDirNames to set
	 */
	public void setBaseDirNames(String[] baseDirNames) {
		this.baseDirNames = baseDirNames;
	}

	/**
	 * @return long
	 */
	public long getHits() {
		return hits;
	}

	/**
	 * @return long
	 */
	public long getMisses() {
		return misses;
	}

}
