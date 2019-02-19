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
	 * Constructor with digilib configuration and file class.
	 * 
     * @param fc
     * @param dlConfig
	 */
	public DocuDirCache(FileClass fc,
			DigilibConfiguration dlConfig) {
		this.fileClass = fc;
	}

	/**
	 * Default constructor. Uses FileClass.IMAGE.
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
	 * either newDir or the cached one.
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
     * <code>in</code> of FileClass fc.
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
	 * <code>in</code>.
	 * 
	 * If <code>fn</code> represents a file then the corresponding DocuDirent is
	 * returned and the number is ignored.
	 * 
	 * @param fn
	 *            digilib pathname
	 * @param pn
	 *            file number
	 * @return
	 */
	public DocuDirent getFile(String fn, int pn) {
		DocuDirectory dd;
		// file number is 1-based, index is 0-based
		int n = pn - 1;
		// get the directory (or the file's parent directory)
		dd = getDirectory(fn);
		if (dd != null) {
			dd.refresh();
			if (!dd.getDirName().equals(fn)) {
				// fn was not a directory name, try as a file name
				n = dd.indexOf(FileOps.filename(fn));
			}
			if (dd.isValid()) {
				try {
					return dd.get(n);
				} catch (IndexOutOfBoundsException e) {
	                // logger.debug(fn + " not found in directory");
				}
			}
		}
		return null;
		
	}
	
	/**
	 * Returns the DocuDirectory indicated by the pathname <code>fn</code>.
	 * 
	 * If <code>fn</code> represents a file then its parent directory is returned.
	 * 
	 * @param fn
	 *            digilib pathname
	 * @return
	 */
	public DocuDirectory getDirectory(String fn) {
		DocuDirectory dd;
		// first, assume fn is a directory and look in the cache
		dd = map.get(fn);
		if (dd != null) {
			// cache hit
			hits.incrementAndGet();
			dd.refresh();
			if (dd.isValid()) {
				return dd;
			} else {
				return null;
			}
		} else {
			// make sure that only one thread creates the new directory
			synchronized (this) {
				// look again because the thread may have slept
				dd = map.get(fn);
				if (dd != null) {
					// cache hit
					hits.incrementAndGet();
					dd.refresh();
					if (dd.isValid()) {
						return dd;
					} else {
						return null;
					}
				}
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
					if (dd != null) {
						// not a real cache miss then
						misses.decrementAndGet();
						dd.refresh();
					} else {
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
					}
				}
			}
		}
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
	 * @param fileClass
	 */
	public void setFileClass(FileClass fileClass) {
		this.fileClass = fileClass;
	}

}
