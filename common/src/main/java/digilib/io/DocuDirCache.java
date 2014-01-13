package digilib.io;

/*
 * #%L
 * DocuDirCache.java
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2003 - 2014 MPIWG Berlin
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

	/** allowed file class (image/text) */
	protected FileClass fileClass = null;

	/** number of files in the whole cache (approximate) */
	protected AtomicInteger numFiles = new AtomicInteger(0);

	/** number of cache hits */
	protected AtomicInteger hits = new AtomicInteger(0);

	/** number of cache misses */
	protected AtomicInteger misses = new AtomicInteger(0);

	/**
	 * Constructor with array of base directory names and file class.
	 * 
	 * @param bd
	 *            base directory names
     * @param fc
     * @param dlConfig
	 */
	public DocuDirCache(FileClass fc,
			DigilibConfiguration dlConfig) {
		this.fileClass = fc;
	}

	/**
	 * Constructor with array of base directory names.
	 * 
	 * @param bd
	 *            base directory names
	 */
	public DocuDirCache() {
		// default file class is CLASS_IMAGE
		fileClass = FileClass.IMAGE;
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
		numFiles.addAndGet(newdir.size());
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
					pd = DocuDirectoryFactory.getDocuDirectoryInstance(parent, fileClass);
					pd = putDir(pd);
				}
				newDir.setParent(pd);
			}
		}
		return dd;
	}

    /**
     * Returns the DocuDirent with the pathname <code>fn</code> and the index
     * <code>in</code>.
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
     * @deprecated Use {@link #getFile(String fn, int in)} instead.
     */
    public DocuDirent getFile(String fn, int in, FileClass fc) {
        return getFile(fn, in);
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
	public DocuDirent getFile(String fn, int in) {
		DocuDirectory dd;
		// file number is 1-based, vector index is 0-based
		int n = in - 1;
		// first, assume fn is a directory and look in the cache
		dd = map.get(fn);
		if (dd == null) {
			// cache miss
			misses.incrementAndGet();
			/*
			 * try fn as a directory
			 */
			dd = DocuDirectoryFactory.getDocuDirectoryInstance(fn, fileClass);
			if (dd.isValid()) {
			    // add to the cache
			    dd.refresh();
			    dd = putDir(dd);
			} else {
				/*
				 * maybe it's a file
				 */
				// get the parent directory string (like we store it in the cache)
				String d = FileOps.parent(fn);
				// try it in the cache
                // logger.debug(fn + " is a file in dir " + d);
				dd = map.get(d);
				if (dd == null) {
					// try to read from disk
					dd = DocuDirectoryFactory.getDocuDirectoryInstance(d, fileClass);
					if (dd.isValid()) {
						// add to the cache
                        // logger.debug(dd + " is valid");
					    dd.refresh();
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
				n = dd.indexOf(FileOps.filename(fn));
			}
		} else {
			// cache hit
			hits.incrementAndGet();
		}
		dd.refresh();
		if (dd.isValid()) {
			try {
				return dd.get(n);
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
			dd = DocuDirectoryFactory.getDocuDirectoryInstance(fn, fileClass);
			if (dd.isValid()) {
			    // add to the cache
                dd.refresh();
			    dd = putDir(dd);
			} else {
				// try the parent directory in the cache
				String pn = FileOps.parent(fn);
                dd = map.get(pn);
				if (dd == null) {
					// try to read from disk
					dd = DocuDirectoryFactory.getDocuDirectoryInstance(pn, fileClass);
					if (dd.isValid()) {
						// add to the cache
		                dd.refresh();
						dd = putDir(dd);
					} else {
						// invalid path
						return null;
					}
				} else {
					// not a real cache miss then
					misses.decrementAndGet();
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
     * @return long
     */
    public int getNumFiles() {
        return numFiles.get();
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
	public FileClass getFileClass() {
		return fileClass;
	}

	/**
	 * @param fileClasses
	 */
	public void setFileClass(FileClass fileClass) {
		this.fileClass = fileClass;
	}

}
