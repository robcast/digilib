package digilib.io;

/*
 * #%L
 * DocuDirCache.java
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2003 - 2013 MPIWG Berlin
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
 * Created on 03.03.2003
 */

import java.io.File;
import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.apache.log4j.Logger;

import digilib.conf.DigilibConfiguration;
import digilib.io.FileOps.FileClass;

/**
 * @author casties
 */
public class DocuDirCache {

	/** general logger for this class */
	protected static Logger logger = Logger.getLogger(DocuDirCache.class);

	/** HashMap of directories */
	protected ConcurrentMap<String, DocuDirectory> map = new ConcurrentHashMap<String, DocuDirectory>();

	/** names of base directories */
	protected String[] baseDirNames = null;

	/** array of allowed file classes (image/text) */
	protected FileClass[] fileClasses = null;

	/** number of files in the whole cache (approximate) */
	protected AtomicInteger numImgFiles = new AtomicInteger(0);

	/** number of cache hits */
	protected AtomicInteger hits = new AtomicInteger(0);

	/** number of cache misses */
	protected AtomicInteger misses = new AtomicInteger(0);

	/** the root directory element */
	public static Directory ROOT = null;

	/**
	 * Constructor with array of base directory names and file classes.
	 * 
	 * @param bd
	 *            base directory names
	 */
	public DocuDirCache(String[] bd, FileClass[] fcs,
			DigilibConfiguration dlConfig) {
		baseDirNames = bd;
		this.fileClasses = fcs;
	}

	/**
	 * Constructor with array of base directory names.
	 * 
	 * @param bd
	 *            base directory names
	 */
	public DocuDirCache(String[] bd) {
		baseDirNames = bd;
		// default file class is CLASS_IMAGE
		fileClasses = new FileClass[] { FileClass.IMAGE };
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
	 * Always returns the correct Object from the cache, 
	 * either newdir one or another one.
	 * 
	 * @param newdir
	 * @return dir
	 */
	public DocuDirectory put(DocuDirectory newdir) {
		String s = newdir.getDirName();
		logger.debug("DocuDirCache.put for "+s+" in "+this);
		DocuDirectory olddir = map.putIfAbsent(s, newdir);
		if (olddir != null) {
			logger.warn("Duplicate key in DocuDirCache.put -- ignoring!");
			return olddir;
		}
		numImgFiles.addAndGet(newdir.size(FileClass.IMAGE));
		return newdir;
	}

	/**
	 * Add a directory to the cache and check its parents.
	 * Always returns the correct Object from the cache, 
	 * either newDir one or another one.
	 *
	 * @param newDir
	 * @return dir
	 */
	public DocuDirectory putDir(DocuDirectory newDir) {
		DocuDirectory dd = put(newDir);
		if (dd.getParent() == null) {
			// no parent link yet
			String parent = FileOps.parent(newDir.getDirName());
			if (parent != "") {
				// check the parent in the cache
				DocuDirectory pd = map.get(parent);
				if (pd == null) {
					// the parent is unknown
					pd = new DocuDirectory(parent, this);
					pd = putDir(pd);
				}
				newDir.setParent(pd);
			}
		}
		return dd;
	}

	/**
	 * Get a list with all children of a directory.
	 * 
	 * Returns a List of DocuDirectory's. Returns an empty List if the directory
	 * has no children. If recurse is false then only direct children are
	 * returned.
	 * 
	 * @param dirname
	 * @param recurse
	 *            find all children and their children.
	 * @return
	 */
	public List<DocuDirectory> getChildren(String dirname, boolean recurse) {
		List<DocuDirectory> l = new LinkedList<DocuDirectory>();
		for (DocuDirectory dd: map.values()) {
			if (recurse) {
				if (dd.getDirName().startsWith(dirname)) {
					l.add(dd);
				}
			} else {
				if (FileOps.parent(dd.getDirName()).equals(dirname)) {
					l.add(dd);
				}
			}
		}
		return l;
	}

	/**
	 * Returns the DocuDirent with the pathname <code>fn</code> and the index
	 * <code>in</code> and the class <code>fc</code>.
	 * 
	 * If <code>fn</code> is a file then the corresponding DocuDirent is
	 * returned and the index is ignored.
	 * 
	 * @param fn
	 *            digilib pathname
	 * @param in
	 *            file index
	 * @param fc
	 *            file class
	 * @return
	 */
	public DocuDirent getFile(String fn, int in, FileClass fc) {
		DocuDirectory dd;
		// file number is 1-based, vector index is 0-based
		int n = in - 1;
		// first, assume fn is a directory and look in the cache
		dd = map.get(fn);
		if (dd == null) {
			// cache miss
			misses.incrementAndGet();
			/*
			 * see if fn is a directory
			 */
			File f = new File(baseDirNames[0], fn);
			if (f.isDirectory()) {
                // logger.debug(fn + " is a dir");
				dd = new DocuDirectory(fn, this);
				if (dd.isValid()) {
					// add to the cache
					dd = putDir(dd);
				}
			} else {
				/*
				 * maybe it's a file
				 */
				// get the parent directory string (like we store it in the
				// cache)
				String d = FileOps.parent(fn);
				// try it in the cache
                // logger.debug(fn + " is a file in dir " + d);
				dd = map.get(d);
				if (dd == null) {
					// try to read from disk
					dd = new DocuDirectory(d, this);
					if (dd.isValid()) {
						// add to the cache
                        // logger.debug(dd + " is valid");
						dd = putDir(dd);
					} else {
						// invalid path
						return null;
					}
				} else {
					// it was not a real cache miss
					misses.decrementAndGet();
				}
				// get the file's index
				n = dd.indexOf(f.getName(), fc);
			}
		} else {
			// cache hit
			hits.incrementAndGet();
		}
		dd.refresh();
		if (dd.isValid()) {
			try {
				return dd.get(n, fc);
			} catch (IndexOutOfBoundsException e) {
                // logger.debug(fn + " not found in directory");
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
		dd = map.get(fn);
		if (dd == null) {
			// cache miss
			misses.incrementAndGet();
			// see if it's a directory
			File f = new File(baseDirNames[0], fn);
			if (f.isDirectory()) {
				dd = new DocuDirectory(fn, this);
				if (dd.isValid()) {
					// add to the cache
					dd = putDir(dd);
				}
			} else {
				// maybe it's a file
				if (f.canRead()) {
					// try the parent directory in the cache
					dd = map.get(f.getParent());
					if (dd == null) {
						// try to read from disk
						dd = new DocuDirectory(f.getParent(), this);
						if (dd.isValid()) {
							// add to the cache
							dd = putDir(dd);
						} else {
							// invalid path
							return null;
						}
					} else {
						// not a real cache miss then
						misses.decrementAndGet();
					}
				} else {
					// it's not even a file :-(
					return null;
				}
			}
		} else {
			// cache hit
			hits.incrementAndGet();
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
    public int getNumFiles() {
        return numImgFiles.get();
    }

	/**
	 * @return long
	 */
	public int getHits() {
		return hits.get();
	}

	/**
	 * @return long
	 */
	public int getMisses() {
		return misses.get();
	}

	/**
	 * @return
	 */
	public FileClass[] getFileClasses() {
		return fileClasses;
	}

	/**
	 * @param fileClasses
	 */
	public void setFileClasses(FileClass[] fileClasses) {
		this.fileClasses = fileClasses;
	}

}
