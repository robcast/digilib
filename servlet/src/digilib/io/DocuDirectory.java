/* DocuDirectory -- Directory of DocuFilesets.

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

 * Created on 25.02.2003
 */

package digilib.io;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.xml.sax.SAXException;

import digilib.io.FileOps.FileClass;

/**
 * @author casties
 */
public class DocuDirectory extends Directory {

	/** list of files (DocuDirent) */
	private List<List<DocuDirent>> list = null;

	/** default FileClass for unspecified calls */
	public static FileClass defaultFileClass = FileClass.IMAGE;
	
	/** directory object is valid (exists on disk) */
	private boolean isValid = false;

	/** reference of the parent DocuDirCache */
	private DocuDirCache cache = null;

	/** directory name (digilib canonical form) */
	private String dirName = null;

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
		initDir();
		checkDir();
	}

	/**
	 * Sets and checks the dir object.
	 *  
	 */
	protected void initDir() {
		String baseDirName = cache.getBaseDirNames()[0];
		// clear directory list
		FileClass[] fcs = FileClass.values();
		list = new ArrayList<List<DocuDirent>>(fcs.length);
		// create empty list for all classes
		for (@SuppressWarnings("unused") FileClass fc: fcs) {
		    list.add(null);
		}
		isValid = false;
		dirMTime = 0;
		// the first directory has to exist
		dir = new File(baseDirName, dirName);
	}

	/**
	 * number of DocuFiles in this directory.
	 *  
	 */
	public int size() {
	    return size(defaultFileClass);
	}

	/**
	 * number of files of this class in this directory.
	 * 
	 * @param fc
	 *            fileClass
	 */
	public int size(FileClass fc) {
        if (list != null) {
            List<DocuDirent> l = list.get(fc.ordinal());
            if (l != null) {
                return l.size();
            }
        }
        return 0;
	}

	/**
	 * Returns the ImageFileSet at the index.
	 * 
	 * @param index
	 * @return
	 */
	public ImageFileset get(int index) {
		return (ImageFileset) get(index, defaultFileClass);
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
	 * Checks if the directory exists on the filesystem.
	 * 
	 * Sets isValid.
	 * 
	 * @return
	 */
	public boolean checkDir() {
		if (dir == null) {
			initDir();
		}
		isValid = dir.isDirectory();
		return isValid;
	}

	/**
	 * Read the filesystem directory and fill this object.
	 * 
	 * Clears the List and (re)reads all files.
	 * 
	 * @return boolean the directory exists
	 */
	public boolean readDir() {
		// check directory first
		checkDir();
		if (!isValid) {
			return false;
		}
		// first file extension to try for scaled directories
		String scalext = null;
		// read all filenames
		logger.debug("reading directory " + dir.getPath());
		/*
		 * using ReadableFileFilter is safer (we won't get directories with file
		 * extensions) but slower.
		 */
		File[] allFiles = null;
		//	allFiles = dir.listFiles(new FileOps.ReadableFileFilter());
		allFiles = dir.listFiles();
		//logger.debug("  done");
		if (allFiles == null) {
			// not a directory
			return false;
		}
		// list of base dirs from the parent cache
		String[] baseDirNames = cache.getBaseDirNames();
		// number of base dirs
		int nb = baseDirNames.length;
		// array of base dirs
		Directory[] dirs = new Directory[nb];
		// first entry is this directory
		dirs[0] = this;
		// fill array with the remaining directories
		for (int j = 1; j < nb; j++) {
			File d = new File(baseDirNames[j], dirName);
			if (d.isDirectory()) {
				dirs[j] = new Directory(d);
				logger.debug("  reading scaled directory " + d.getPath());
				dirs[j].readDir();
				//logger.debug("    done");
			}
		}

		// go through all file classes
        //for (int classIdx = 0; classIdx < FileOps.NUM_CLASSES; classIdx++) {
		for (FileClass fileClass: cache.getFileClasses()) {
			//fileClass = cache.getFileClasses()[classIdx];
			File[] fileList = FileOps.listFiles(allFiles, FileOps
					.filterForClass(fileClass));
			//logger.debug(" done");
			// number of files in the directory
			int numFiles = fileList.length;
			if (numFiles > 0) {
				// create new list
				list.set(fileClass.ordinal(), new ArrayList<DocuDirent>(numFiles));
				// sort the file names alphabetically and iterate the list
				// Arrays.sort(fileList); // not needed <hertzhaft>
				Map<Integer, Object> hints = FileOps.newHints(FileOps.HINT_BASEDIRS, dirs);
				hints.put(FileOps.HINT_FILEEXT, scalext);
				for (int i = 0; i < numFiles; i++) {
					DocuDirent f = FileOps.fileForClass(fileClass, fileList[i],
							hints);
					// add the file to our list
                    // logger.debug(f.getName());

					list.get(fileClass.ordinal()).add(f);
					f.setParent(this);
				}
                // we sort the inner ArrayList (the list of files not the list of file types)
				// for binarySearch to work (DocuDirent's natural sort order is by filename)
                Collections.sort(list.get(fileClass.ordinal()));
			}
		}
		// clear the scaled directories
		for (int j = 1; j < nb; j++) {
			if (dirs[j] != null) {
				dirs[j].clearFilenames();
			}
		}
		// update number of cached files if this was the first time
		if (dirMTime == 0) {
			cache.numFiles += size();
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
			XMLMetaLoader ml = new XMLMetaLoader();
			try {
				// read directory meta file
				Map<String, MetadataMap> fileMeta = ml.loadURL(mf.getAbsolutePath());
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
			} catch (SAXException e) {
				logger.warn("error parsing index.meta", e);
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

	private boolean isBasenameInList(List<DocuDirent> fl, int idx, String fn) {
		String dfn = FileOps.basename((fl.get(idx))
				.getName());
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
		return find(fn, defaultFileClass);
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
			return (DocuDirent) list.get(fc.ordinal()).get(i);
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
