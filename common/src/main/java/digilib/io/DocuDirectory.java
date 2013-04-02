package digilib.io;

/*
 * #%L
 * DocuDirectory -- Directory of DocuFilesets.
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
 * Created on 25.02.2003
 */

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.xml.sax.SAXException;

import digilib.io.FileOps.FileClass;
import digilib.meta.IndexMetaAuthLoader;
import digilib.meta.IndexMetaLoader;
import digilib.meta.MetadataMap;

/**
 * @author casties
 */
public class DocuDirectory extends Directory {

	/** list of files (DocuDirent) */
	private List<List<DocuDirent>> list = null;

	/** directory object is valid (exists on disk) */
	private boolean isValid = false;

	/** reference of the parent DocuDirCache */
	private DocuDirCache cache = null;

	/** directory name (digilib canonical form) */
	private String dirName = null;

	/** array of parallel dirs for scaled images */
	private Directory[] dirs = null;

	/** directory metadata */
	private MetadataMap dirMeta = null;

	/** state of metadata is valid */
	private boolean metaChecked = false;

	/** unresolved file metadata */
	private Map<String, MetadataMap> unresolvedFileMeta = null;

	/** time of last access of this object (not the filesystem) */
	private long objectATime = 0;

	/** time directory was last modified on the file system */
	private long dirMTime = 0;

	/**
	 * Constructor with digilib directory path and a parent DocuDirCache.
	 * 
	 * Directory names at the given path are appended to the base directories
	 * from the cache. The directory is checked on disk and isValid is set.
	 * 
	 * @see readDir
	 * 
	 * @param path
	 *            digilib directory path name
	 * @param cache
	 *            parent DocuDirCache
	 */
	public DocuDirectory(String path, DocuDirCache cache) {
		this.dirName = path;
		this.cache = cache;
		String baseDirName = cache.getBaseDirNames()[0];
		// clear directory list
		FileClass[] fcs = FileClass.values();
		list = new ArrayList<List<DocuDirent>>(fcs.length);
		// create empty list for all classes
		for (@SuppressWarnings("unused") FileClass fc: fcs) {
		    list.add(null);
		}
		dirMTime = 0;
		// the first directory has to exist
		dir = new File(baseDirName, path);
		isValid = dir.isDirectory();
	}

	/**
	 * number of DocuFiles in this directory.
	 *  
	 */
	public int size() {
		return ((list != null) && (list.get(0) != null)) ? list.get(0).size() : 0;
	}

	/**
	 * number of files of this class in this directory.
	 * 
	 * @param fc
	 *            fileClass
	 */
	public int size(FileClass fc) {
		return ((list != null) && (list.get(fc.ordinal()) != null)) ? list.get(fc.ordinal()).size() : 0;
	}

	/**
	 * Returns the ImageFileSet at the index.
	 * 
	 * @param index
	 * @return
	 */
	public DocuDirent get(int index) {
		if ((list == null) || (list.get(0) == null) || (index >= list.get(0).size())) {
			return null;
		}
		return list.get(0).get(index);
	}

	/**
	 * Returns the file of the class at the index.
	 * 
	 * @param index
	 * @param fc
	 *            fileClass
	 * @return
	 */
	public DocuDirent get(int index, FileClass fc) {
		if ((list == null) || (list.get(fc.ordinal()) == null) || (index >= list.get(fc.ordinal()).size())) {
			return null;
		}
		return (DocuDirent) list.get(fc.ordinal()).get(index);
	}

	/**
	 * Read the filesystem directory and fill this object.
	 * 
	 * Clears the List and (re)reads all files.
	 * 
	 * @return boolean the directory exists
	 */
	public synchronized boolean readDir() {
		// check directory first
		if (!isValid) {
			return false;
		}
		// re-check modification time because the thread may have slept
		if (dir.lastModified() <= dirMTime) {
			return true;
		}
		// read all filenames
		logger.debug("reading directory "+this+" = "+dir.getPath());
		File[] allFiles = null;
		/*
		 * using ReadableFileFilter is safer (we won't get directories with file
		 * extensions) but slower.
		 */
		// allFiles = dir.listFiles(new FileOps.ReadableFileFilter());
		allFiles = dir.listFiles();
		if (allFiles == null) {
			// not a directory
			return false;
		}
		// init parallel directories
		if (dirs == null) {
			// list of base dirs from the parent cache
			String[] baseDirNames = cache.getBaseDirNames();
			// number of base dirs
			int nb = baseDirNames.length;
			// array of parallel dirs
			dirs = new Directory[nb];
			// first entry is this directory
			dirs[0] = this;
			// fill array with the remaining directories
			for (int j = 1; j < nb; j++) {
				// add dirName to baseDirName
				File d = new File(baseDirNames[j], dirName);
				if (d.isDirectory()) {
					dirs[j] = new Directory(d);
					logger.debug("  reading scaled directory " + d.getPath());
					dirs[j].readDir();
				}
			}
		}

		// go through all file classes
		for (FileClass fileClass : cache.getFileClasses()) {
			File[] fileList = FileOps.listFiles(allFiles,
					FileOps.filterForClass(fileClass));
			// number of files in the directory
			int numFiles = fileList.length;
			if (numFiles > 0) {
				// create new list
				ArrayList<DocuDirent> dl = new ArrayList<DocuDirent>(numFiles);
				list.set(fileClass.ordinal(), dl);
				for (File f : fileList) {
					DocuDirent df = FileOps.fileForClass(fileClass, f, dirs);
					df.setParent(this);
					// add the file to our list
					dl.add(df);
				}
				/*
				 * we sort the inner ArrayList (the list of files not the list
				 * of file types) for binarySearch to work (DocuDirent's natural
				 * sort order is by filename)
				 */
				Collections.sort(dl);
			}
		}
		// clear the scaled directories
		for (Directory d: dirs) {
			if (d != null) {
				d.clearFilenames();
			}
		}
		// update number of cached files if this was the first time
		if (dirMTime == 0) {
			cache.numImgFiles.addAndGet(size(FileClass.IMAGE));
		}
		dirMTime = dir.lastModified();
		// read metadata as well
		readMeta();
		return isValid;
	}

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
		// check for directory metadata...
		File mf = new File(dir, "index.meta");
		if (mf.canRead()) {
			IndexMetaAuthLoader ml = new IndexMetaAuthLoader();
			try {
				// read directory meta file
				Map<String, MetadataMap> fileMeta = ml.loadUri(mf.toURI());
				if (fileMeta == null) {
					return;
				}
				// meta for the directory itself is in the "" bin
				dirMeta = fileMeta.remove("");
				// read meta for files in this directory
				readFileMeta(fileMeta, null);
				// is there meta for other files left?
				if (fileMeta.size() > 0) {
					unresolvedFileMeta = fileMeta;
				}
			} catch (IOException e) {
				logger.warn("error reading index.meta", e);
			}
		}
		readParentMeta();
		metaChecked = true;
	}

	/**
	 * Read metadata from all known parent directories.
	 *  
	 */
	public void readParentMeta() {
		// check the parent directories for additional file meta
		Directory dd = parent;
		String path = dir.getName();
		while (dd != null) {
			if (((DocuDirectory) dd).hasUnresolvedFileMeta()) {
				readFileMeta(((DocuDirectory) dd).unresolvedFileMeta, path);
			}
			// prepend parent dir path
			path = dd.dir.getName() + "/" + path;
			// become next parent
			dd = dd.parent;
		}
	}

	/**
	 * Read metadata for the files in this directory.
	 * 
	 * Takes a Map with meta-information, adding the relative path before the
	 * lookup.
	 * 
	 * @param fileMeta
	 * @param relPath
	 * @param fc
	 *            fileClass
	 */
	protected void readFileMeta(Map<String,MetadataMap> fileMeta, String relPath) {
		if (list == null) {
			// there are no files
			return;
		}
		String path = (relPath != null) ? (relPath + "/") : "";
		// go through all file classes
		for (FileClass fc: FileClass.values()) {
			if (list.get(fc.ordinal()) == null) {
				continue;
			}
			// iterate through the list of files in this directory
			for (DocuDirent f: list.get(fc.ordinal())) {
				// prepend path to the filename
				String fn = path + f.getName();
				// look up meta for this file and remove from dir
				MetadataMap meta = fileMeta.remove(fn);
				if (meta != null) {
					// store meta in file
					f.setFileMeta(meta);
				}
			}
		}
	}

	protected void notifyChildMeta(MetadataMap childmeta) {
		List<DocuDirectory> children = cache.getChildren(this.dirName, true);
		if (children.size() > 0) {
			/*for (DocuDirectory d: children) {
				// TODO: finish this!
				//((DocuDirectory) i.next()).readFileMeta()
			}*/
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
		FileClass fc = FileOps.classForFilename(fn);
		return indexOf(fn, fc);
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
	 */
	public int indexOf(String fn, FileClass fc) {
		if (!isRead()) {
			// read directory now
			if (!readDir()) {
				return -1;
			}
		}
		List<DocuDirent> fileList = list.get(fc.ordinal());
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

	private boolean isBasenameInList(List<DocuDirent> fileList, int idx, String fn) {
		String dfn = FileOps.basename((fileList.get(idx)).getName());
		return (dfn.equals(fn)||dfn.equals(FileOps.basename(fn))); 
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
		FileClass fc = FileOps.classForFilename(fn);
		int i = indexOf(fn, fc);
		if (i >= 0) {
			return list.get(0).get(i);
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
		int i = indexOf(fn, fc);
		if (i >= 0) {
			return list.get(fc.ordinal()).get(i);
		}
		return null;
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
	 * @return Hashtable
	 */
	public MetadataMap getDirMeta() {
		return dirMeta;
	}

	/**
	 * Checks metadata
	 *  
	 */
	public void checkMeta() {
		if (metaChecked) {
			return;
		} else {
			readMeta();
		}
	}

	/**
	 * @return long
	 */
	public long getDirMTime() {
		return dirMTime;
	}

	/**
	 * Sets the dirMeta.
	 * 
	 * @param dirMeta
	 *            The dirMeta to set
	 */
	public void setDirMeta(MetadataMap dirMeta) {
		this.dirMeta = dirMeta;
	}

	public boolean hasUnresolvedFileMeta() {
		return (this.unresolvedFileMeta != null);
	}

}
