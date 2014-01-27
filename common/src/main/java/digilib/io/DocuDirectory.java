package digilib.io;

/*
 * #%L
 * DocuDirectory -- Directory of DocuFilesets.
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
 * Created on 25.02.2003
 */

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import digilib.conf.DigilibConfiguration;
import digilib.io.FileOps.FileClass;
import digilib.meta.DirMeta;
import digilib.meta.MetaFactory;

/**
 * Class representing a directory containing (image) files.
 * 
 * Files can be access by index or name. All files are of the same FileClass.
 * The DocuDirectory holds DirMeta. 
 * 
 * Subclasses of DocuDirectory can also hold multiple scaled versions of an image file. 
 * 
 * @author casties
 */
public abstract class DocuDirectory extends Directory {

    /** type of files in this DocuDirectory */
    protected FileClass fileClass = FileClass.IMAGE;
    
	/** list of files (DocuDirent) */
	protected List<DocuDirent> files = null;

	/** directory object is valid (exists on disk) */
	protected boolean isValid = false;

	/** directory name (digilib canonical form) */
	protected String dirName = null;

	/** directory metadata */
	protected DirMeta meta = null;

	/** time of last access of this object (not the filesystem) */
	protected long objectATime = 0;

	/** time directory was last modified on the file system */
	protected long dirMTime = 0;

	/**
	 * Configure object with digilib directory path and a parent DocuDirCache.
	 * 
	 * Directory names at the given path are appended to the base directories
	 * from the cache. The directory is checked on disk and isValid is set.
	 * 
	 * @see readDir
	 * 
	 * @param path
	 *            digilib directory path name
	 * @param fileClass 
	 *            type of files in this DocuDirectory
	 * @param dlConfig
	 *            digilib config
	 * @return 
	 */
	public void configure(String path, FileClass fileClass, DigilibConfiguration dlConfig) {
		this.dirName = path;
		this.fileClass = fileClass;
		// clear directory list
		files = new ArrayList<DocuDirent>();
		dirMTime = 0;
		// the first directory has to exist
		dir = new File(path);
		isValid = dir.isDirectory();
		meta = MetaFactory.getDirMetaInstance();
	}

	/**
	 * number of DocuFiles in this directory. 
	 */
	public int size() {
		return (files != null) ? files.size() : 0;
	}

	/**
	 * number of files of this class in this directory.
	 * 
	 * @param fc
	 *            fileClass
     * @deprecated Use {@link #size()} instead.
	 */
	public int size(FileClass fc) {
		return size();
	}

	/**
	 * Returns the ImageFileSet at the index.
	 * 
	 * @param index
	 * @return
	 */
	public DocuDirent get(int index) {
		if ((files == null) || (index >= files.size())) {
			return null;
		}
		return files.get(index);
	}

	/**
	 * Returns the file of the class at the index.
	 * 
	 * @param index
	 * @param fc
	 *            fileClass
	 * @return
     * @deprecated Use {@link #get()} instead.
	 */
	public DocuDirent get(int index, FileClass fc) {
	    return get(index);
	}


	/**
	 * Read the filesystem directory and fill this object.
	 * 
	 * Clears the List and (re)reads all files.
	 * 
	 * @return boolean the directory exists
	 */
	public abstract boolean readDir();


	/**
	 * Check to see if the directory has been modified and reread if necessary.
	 * 
	 * @return boolean the directory is valid
	 */
    public boolean refresh() {
        if (isValid) {
            if (dir.lastModified() > dirMTime) {
                // on-disk modification time is more recent
                readDir();
            }
            touch();
        }
        return isValid;
    }


	/**
	 * Read directory metadata.
	 *  
	 */
	public void readMeta() {
	    if (meta != null) {
	        meta.readMeta(this);
	    }
	}


    /**
     * check directory metadata.
     *  
     */
    public void checkMeta() {
        if (meta != null) {
            meta.checkMeta(this);
        }
    }


	/**
	 * Update access time.
	 * 
	 * @return long time of last access.
	 */
	public long touch() {
		long t = objectATime;
		objectATime = System.currentTimeMillis();
		return t;
	}

    /**
     * Searches for the file with the name <code>fn</code> and class fc.
     * 
     * Searches the directory for the file with the name <code>fn</code> and
     * returns its index. Returns -1 if the file cannot be found.
     * 
     * @param fn
     *            filename
     * @return int index of file <code>fn</code>
     * @deprecated Use {@link #indexOf(String fn)} instead.
     */
	public int indexOf(String fn, FileClass fc) {
		return indexOf(fn);
	}

    /**
     * Searches for the file with the name <code>fn</code>.
     * 
     * Searches the directory for the file with the name <code>fn</code> and
     * returns its index. Returns -1 if the file cannot be found.
     * 
     * @param fn
     *            filename
     * @param fc
     *            file class
     * @return int index of file <code>fn</code>
     */
	public int indexOf(String fn) {
		if (!isRead()) {
			// read directory now
			if (!readDir()) {
				return -1;
			}
		}
		List<DocuDirent> fileList = files;
		// empty directory?
		if (fileList == null) {
			return -1;
		}
        
		// search for exact match (DocuDirent does compareTo<String>)
        // OBS: fileList needs to be sorted first (see )! <hertzhaft>
		int idx = Collections.binarySearch(fileList, fn);
		if (idx >= 0) {
			return idx;
		} else {
            logger.debug(fn + " not found by binarysearch");
			// try closest matches without extension
			idx = -idx - 1;
			if ((idx < fileList.size())
					&& isBasenameInList(fileList, idx, fn)) {
				// idx matches
				return idx;
			} else if ((idx > 0)
					&& isBasenameInList(fileList, idx-1, fn)) {
				// idx-1 matches
				return idx - 1;
			} else if ((idx + 1 < fileList.size())
					&& isBasenameInList(fileList, idx+1, fn)) {
				// idx+1 matches
				return idx + 1;
			}

		}
		return -1;
	}

	/**
	 * Finds the DocuDirent with the name <code>fn</code>.
	 * 
	 * Searches the directory for the DocuDirent with the name <code>fn</code>
	 * and returns it. Returns null if the file cannot be found.
	 * 
	 * @param fn
	 *            filename
	 * @return DocuDirent
	 */
	public DocuDirent find(String fn) {
		int i = indexOf(fn);
		if (i >= 0) {
			return files.get(i);
		}
		return null;
	}

	/**
	 * Finds the DocuDirent with the name <code>fn</code> and class
	 * <code>fc</code>.
	 * 
	 * Searches the directory for the DocuDirent with the name <code>fn</code>
	 * and returns it. Returns null if the file cannot be found.
	 * 
	 * @param fn
	 *            filename
	 * @return DocuDirent
	 */
	public DocuDirent find(String fn, FileClass fc) {
		return find(fn);
	}

	/**
	 * Returns the digilib canonical name.
	 * 
	 * @return
	 */
	public String getDirName() {
		return dirName;
	}

	/**
	 * The directory is valid (exists on disk).
	 * 
	 * @return boolean
	 */
	public boolean isValid() {
		return isValid;
	}

	/**
	 * The directory has been read from disk.
	 * 
	 * @return
	 */
	public boolean isRead() {
		return (dirMTime != 0);
	}

	/**
	 * @return long
	 */
	public long getAccessTime() {
		return objectATime;
	}

	/**
	 * @return long
	 */
	public long getDirMTime() {
		return dirMTime;
	}

    public DirMeta getMeta() {
        return meta;
    }

    private boolean isBasenameInList(List<DocuDirent> fileList, int idx, String fn) {
    	String dfn = FileOps.basename((fileList.get(idx)).getName());
    	return (dfn.equals(fn) || dfn.equals(FileOps.basename(fn))); 
    }

}
