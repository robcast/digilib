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
import java.util.HashMap;

/**
 * @author casties
 */
public class DocuDirCache {

	// HashMap of directories
	private HashMap map = null;
	// names of base directories
	private String[] baseDirNames = null;
	// number of files in the whole cache (approximate)
	private long numFiles = 0;
	// number of cache hits
	private long hits = 0;
	// number of cache misses
	private long misses = 0;

	/** Constructor with array of base directory names.
	 *  
	 * @param bd base directory names
	 */
	public DocuDirCache(String[] bd) {
		baseDirNames = bd;
		map = new HashMap();
	}

	/** The number of directories in the cache.
	 * @return
	 */
	public int size() {
		return (map != null) ? map.size() : 0;
	}

	/** Add a DocuDirectory to the cache.
	 * 
	 * @param newdir
	 */
	public void put(DocuDirectory newdir) {
		String s = newdir.getDirName();
		if (map.containsKey(s)) {
			System.out.println("Baah, duplicate key in DocuDirectory.put!");
		} else {
			map.put(s, newdir);
			numFiles += newdir.size();
		}
	}

	/** Add a directory to the cache and check its parents.
	 * 
	 * @param newDir
	 */
	public void putDir(DocuDirectory newDir) {
		put(newDir);
		String parent = newDir.getParentDirName();
		if (parent != null) {
			// check the parent in the cache
			DocuDirectory pd = (DocuDirectory)map.get(parent);
			if (pd == null) {
				// the parent is unknown
				pd = new DocuDirectory(parent, this);
				putDir(pd);
			}
			newDir.setParent(pd);
		}
		// update dir in the end
		newDir.readParentMeta();
	}

	/** Returns the DocuFileset with the pathname <code>fn</code> and the 
	 * index <code>in</code>.
	 * 
	 * If <code>fn</code> is a file then the corresponding Fileset is 
	 * returned and the index is ignored.
	 * 
	 * @param fn digilib pathname
	 * @param in file index
	 * @return 
	 */
	public DocuFileset getFileset(String fn, int in) {
		DocuDirectory dd;
		// file number is 1-based, vector index is 0-based
		int n = in - 1;
		// first, assume fn is a directory and look in the cache
		dd = (DocuDirectory) map.get(fn);
		if (dd == null) {
			// cache miss
			misses++;
			// see if it's a directory
			File f = new File(baseDirNames[0], fn);
			if (f.isDirectory()) {
				dd = new DocuDirectory(fn, this);
				if (dd.isValid()) {
					// add to the cache
					putDir(dd);
				}
			} else {
				// maybe it's a file
				if (f.canRead()) {
					// get the parent directory string (like we store it in the cache)
					String d = fn.substring(0, fn.lastIndexOf("/"));
					// try it in the cache
					dd = (DocuDirectory) map.get(d);
					if (dd == null) {
						// try to read from disk
						dd = new DocuDirectory(d, this);
						if (dd.isValid()) {
							// add to the cache
							putDir(dd);
						} else {
							// invalid path
							return null;
						}
					} else {
						// then it was not a real cache miss
						misses--;
					}
					// get the file's index
					n = dd.indexOf(f.getName());
				} else {
					// it's not even a file :-(
					return null;
				}
			}
		} else {
			// cache hit
			hits++;
		}
		dd.refresh();
		if (dd.isValid()) {
			try {
				return dd.get(n);
			} catch (ArrayIndexOutOfBoundsException e) {
			}
		}
		return null;
	}

	/** Returns the DocuDirectory indicated by the pathname <code>fn</code>.
	 * 
	 * If <code>fn</code> is a file then its parent directory is returned.
	 * 
	 * @param fn digilib pathname
	 * @return
	 */
	public DocuDirectory getDirectory(String fn) {
		DocuDirectory dd;
		// first, assume fn is a directory and look in the cache
		dd = (DocuDirectory) map.get(fn);
		if (dd == null) {
			// cache miss
			misses++;
			// see if it's a directory
			File f = new File(baseDirNames[0], fn);
			if (f.isDirectory()) {
				dd = new DocuDirectory(fn, this);
				if (dd.isValid()) {
					// add to the cache
					putDir(dd);
				}
			} else {
				// maybe it's a file
				if (f.canRead()) {
					// try the parent directory in the cache
					dd = (DocuDirectory) map.get(f.getParent());
					if (dd == null) {
						// try to read from disk
						dd = new DocuDirectory(f.getParent(), this);
						if (dd.isValid()) {
							// add to the cache
							putDir(dd);
						} else {
							// invalid path
							return null;
						}
					} else {
						// not a real cache miss then
						misses--;
					}
				} else {
					// it's not even a file :-(
					return null;
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
