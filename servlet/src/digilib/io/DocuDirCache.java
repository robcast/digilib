/*
 * DocuDirCache.java
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 2003 Robert Casties (robcast@mail.berlios.de)
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 * 
 * Please read license.txt for the full details. A copy of the GPL may be found
 * at http://www.gnu.org/copyleft/lgpl.html
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 * 
 * Created on 03.03.2003
 */

package digilib.io;

import java.io.File;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;

import org.apache.log4j.Logger;

import digilib.servlet.DigilibConfiguration;

/**
 * @author casties
 */
public class DocuDirCache {

	/** general logger for this class */
	protected Logger logger = Logger.getLogger(this.getClass());
	/** HashMap of directories */
	protected HashMap map = null;
	/** names of base directories */
	private String[] baseDirNames = null;
	/** array of allowed file classes (image/text) */
	private int[] fileClasses = null;
	/** number of files in the whole cache (approximate) */
	private long numFiles = 0;
	/** number of cache hits */
	private long hits = 0;
	/** number of cache misses */
	private long misses = 0;
	/** use safe (but slow) indexing */
	boolean safeDirIndex = false;

	/**
	 * Constructor with array of base directory names and file classes.
	 * 
	 * @param bd
	 *            base directory names
	 */
	public DocuDirCache(String[] bd, int[] fileClasses, DigilibConfiguration dlConfig) {
		baseDirNames = bd;
		map = new HashMap();
		this.fileClasses = fileClasses;
		safeDirIndex = dlConfig.getAsBoolean("safe-dir-index");
	}
	/**
	 * Constructor with array of base directory names.
	 * 
	 * @param bd
	 *            base directory names
	 */
	public DocuDirCache(String[] bd) {
		baseDirNames = bd;
		map = new HashMap();
		// default file class is CLASS_IMAGE
		fileClasses = new int[1];
		fileClasses[0] = FileOps.CLASS_IMAGE;
	}

	/**
	 * The number of directories in the cache.
	 * 
	 * @return
	 */
	public int size() {
		return (map != null) ? map.size() : 0;
	}

	/**
	 * Add a DocuDirectory to the cache.
	 * 
	 * @param newdir
	 */
	public void put(DocuDirectory newdir) {
		String s = newdir.getDirName();
		if (map.containsKey(s)) {
			logger.warn("Duplicate key in DocuDirCache.put -- ignoring!");
		} else {
			map.put(s, newdir);
			numFiles += newdir.size();
		}
	}

	/**
	 * Add a directory to the cache and check its parents.
	 * 
	 * @param newDir
	 */
	public void putDir(DocuDirectory newDir) {
		put(newDir);
		String parent = newDir.getParentDirName();
		if (parent != null) {
			// check the parent in the cache
			DocuDirectory pd = (DocuDirectory) map.get(parent);
			if (pd == null) {
				// the parent is unknown
				pd = new DocuDirectory(parent, this);
				putDir(pd);
			}
			newDir.setParent(pd);
		}
	}

	/**
	 * Get a list with all children of a directory.
	 * 
	 * Returns a List of DocuDirectory's. Returns an empty List if the
	 * directory has no children. If recurse is false then only direct children
	 * are returned.
	 * 
	 * @param dirname
	 * @param recurse
	 *            find all children and their children.
	 * @return
	 */
	public List getChildren(String dirname, boolean recurse) {
		List l = new LinkedList();
		for (Iterator i = map.keySet().iterator(); i.hasNext();) {
			String n = (String) i.next();
			DocuDirectory dd = (DocuDirectory) map.get(n);
			if (recurse) {
				if (dd.getDirName().startsWith(dirname)) {
					l.add(dd);
				}
			} else {
				if (dd.getParentDirName().equals(dirname)) {
					l.add(dd);
				}
			}
		}
		return l;
	}

	/**
	 * Returns the DocuDirent with the pathname <code>fn</code> and the
	 * index <code>in</code> and the class <code>fc</code>.
	 * 
	 * If <code>fn</code> is a file then the corresponding DocuDirent is
	 * returned and the index is ignored.
	 * 
	 * @param fn
	 *            digilib pathname
	 * @param in
	 *            file index
	 * @param fc
	 * 			  file class
	 * @return
	 */
	public DocuDirent getFile(String fn, int in, int fc) {
		DocuDirectory dd;
		// file number is 1-based, vector index is 0-based
		int n = in - 1;
		// first, assume fn is a directory and look in the cache
		dd = (DocuDirectory) map.get(fn);
		if (dd == null) {
			// cache miss
			misses++;
			/*
			 * see if it's a directory
			 */
			File f = new File(baseDirNames[0], fn);
			if (f.isDirectory()) {
				dd = new DocuDirectory(fn, this);
				if (dd.isValid()) {
					// add to the cache
					putDir(dd);
				}
			} else {
				/*
				 * maybe it's a file
				 */
				// get the parent directory string (like we store it in the
				// cache)
				String d = FileOps.parent(fn);
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
					// it was not a real cache miss
					misses--;
				}
				// get the file's index
				n = dd.indexOf(f.getName(), fc);
			}
		} else {
			// cache hit
			hits++;
		}
		dd.refresh();
		if (dd.isValid()) {
			try {
				return dd.get(n, fc);
			} catch (IndexOutOfBoundsException e) {
			}
		}
		return null;
	}

	/**
	 * Returns the DocuDirectory indicated by the pathname <code>fn</code>.
	 * 
	 * If <code>fn</code> is a file then its parent directory is returned.
	 * 
	 * @param fn
	 *            digilib pathname
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
	 * 
	 * @param baseDirNames
	 *            The baseDirNames to set
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

	/**
	 * @return
	 */
	public int[] getFileClasses() {
		return fileClasses;
	}

	/**
	 * @param fileClasses
	 */
	public void setFileClasses(int[] fileClasses) {
		this.fileClasses = fileClasses;
	}

}
