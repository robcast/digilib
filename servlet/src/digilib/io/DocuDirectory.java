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
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;

import org.xml.sax.SAXException;

/**
 * @author casties
 */
public class DocuDirectory extends Directory {

	// list of files (DocuFileSet)
	private ArrayList list = null;
	// directory object is valid (has been read)
	private boolean isValid = false;
	// reference of the parent DocuDirCache
	private DocuDirCache cache = null;
	// directory name (digilib canonical form)
	private String dirName = null;
	// directory metadata
	private HashMap dirMeta = null;
	// unresolved file metadata
	private HashMap unresolvedFileMeta = null;
	// time of last access of this object (not the filesystem)
	private long objectATime = 0;
	// time the file system directory was last modified
	private long dirMTime = 0;
	

	/*
	 * constructors
	 */

	/** Constructor with directory path and set of base directories.
	 * 
	 * Reads the directory at the given path appended to the base directories.
	 * 
	 * @see readDir
	 *  
	 * @param path digilib directory path name
	 * @param bd array of base directory names
	 */
	public DocuDirectory(String path, DocuDirCache cache) {
		this.dirName = path;
		this.cache = cache;
		readDir();
	}

	/*
	 * other stuff
	 */
	 
	/** The digilib name of the parent directory.
	 * 
	 * Returns null if there is no parent.
	 */
	public String getParentDirName() {
		String s = null;
		int lastidx = dirName.lastIndexOf("/");
		if (lastidx > 0) {
			s = dirName.substring(0, lastidx);
		}
		return s;
	}

	/** number of DocuFiles in this directory.
	 * 
	 */
	public int size() {
		return (list != null) ? list.size() : 0;
	}

	/** Returns the DocuFile at the index.
	 * 
	 * @param index
	 * @return
	 */
	public DocuFileset get(int index) {
		if ((list == null) || (index >= list.size())) {
			return null;
		}
		return (DocuFileset) list.get(index);
	}

	/** Read the filesystem directory and fill this object.
	 * 
	 * Clears the List and (re)reads all files.
	 * 
	 * @return boolean the directory exists
	 */
	public boolean readDir() {
		String[] baseDirNames = cache.getBaseDirNames();
		// first file extension to try for scaled directories
		String fext = null;
		// clear directory first
		list = null;
		isValid = false;
		// number of base dirs
		int nb = baseDirNames.length;
		// array of base dirs
		Directory[] dirs = new Directory[nb];
		// the first directory has to exist
		dir = new File(baseDirNames[0] + dirName);

		if (dir.isDirectory()) {
			// fill array with the remaining directories
			for (int j = 1; j < nb; j++) {
				File d = new File(baseDirNames[j] + dirName);
				if (d.isDirectory()) {
					dirs[j] = new Directory(d);
				}
			}

			File[] fl = dir.listFiles(new FileOps.ImageFileFilter());
			if (fl == null) {
				// not a directory
				return false;
			}
			// number of image files in the directory
			int nf = fl.length;
			if (nf > 0) {
				// create new list
				list = new ArrayList(nf);

				// sort the file names alphabetically and iterate the list
				Arrays.sort(fl);
				for (int i = 0; i < nf; i++) {
					String fn = fl[i].getName();
					String fnx = fn.substring(0, fn.lastIndexOf('.') + 1);
					// add the first DocuFile to a new DocuFileset 
					DocuFileset fs = new DocuFileset(nb);
					fs.add(new DocuFile(fn, fs, this));
					// iterate the remaining base directories
					for (int j = 1; j < nb; j++) {
						if (dirs[j] == null) {
							continue;
						}
						File f;
						if (fext != null) {
							// use the last extension
							f = new File(dirs[j].getDir(), fnx + fext);
						} else {
							// try the same filename as the original
							f = new File(dirs[j].getDir(), fn);
						}
						// if the file exists, add to the DocuFileset
						if (f.canRead()) {
							fs.add(new DocuFile(f.getName(), fs, dirs[j]));
						} else {
							// try other file extensions
							Iterator exts = FileOps.getImageExtensionIterator();
							while (exts.hasNext()) {
								String s = (String) exts.next();
								f = new File(dirs[j].getDir(), fnx + s);
								// if the file exists, add to the DocuFileset
								if (f.canRead()) {
									fs.add(
										new DocuFile(f.getName(), fs, dirs[j]));
									fext = s;
									break;
								}
							}
						}
					}
					// add the fileset to our list
					list.add(fs);
					fs.setParent(this);
				}
			}
			dirMTime = dir.lastModified();
			isValid = true;
			// read metadata as well
			readMeta();
		}
		return isValid;

	}

	/** Check to see if the directory has been modified and reread if necessary.
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

	/** Read directory metadata. 
	 * 
	 */
	public void readMeta() {
		// check for directory metadata...
		File mf = new File(dir, "index.meta");
		if (mf.canRead()) {
			XMLMetaLoader ml = new XMLMetaLoader();
			try {
				// read directory meta file
				HashMap fileMeta = ml.loadURL(mf.getAbsolutePath());
				if (fileMeta == null) {
					return;
				}
				// meta for the directory itself is in the "" bin
				dirMeta = (HashMap) fileMeta.remove("");
				// read meta for files in this directory
				readFileMeta(fileMeta, null);
				// is there meta for other files left?
				if (fileMeta.size() > 0) {
					unresolvedFileMeta = fileMeta;
				}
			} catch (SAXException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		readParentMeta();
	}

	/** Read metadata from all known parent directories.
	 * 
	 */
	public void readParentMeta() {
		// check the parent directories for additional file meta
		Directory dd = parent;
		String path = dir.getName() ;
		while (dd != null) {
			if (((DocuDirectory)dd).hasUnresolvedFileMeta()) {
				readFileMeta(((DocuDirectory)dd).unresolvedFileMeta, path);
			}
			// prepend parent dir path
			path = dd.dir.getName() + "/" + path;
			// become next parent
			dd = dd.parent;
		}
	}

	/** Read metadata for the files in this directory.
	 * 
	 * Takes a HashMap with meta-information, adding the relative path
	 * before the lookup.
	 * 
	 * @param fileMeta
	 * @param relPath
	 */
	public void readFileMeta(HashMap fileMeta, String relPath) {
		if (list == null) {
			// there are no files
			return;
		}
		String path = (relPath != null) ? (relPath + "/") : "";
		// iterate through the list of files in this directory
		for (Iterator i = list.iterator(); i.hasNext();) {
			DocuFileset df = (DocuFileset) i.next();
			// prepend path to the filename
			String fn = path + df.getName();
			// look up meta for this file and remove from dir
			HashMap meta = (HashMap) fileMeta.remove(fn);
			if (meta != null) {
				// store meta in file
				df.setFileMeta(meta);
			}
		}
	}

	/** Update access time.
	 * 
	 * @return long time of last access.
	 */
	public long touch() {
		long t = objectATime;
		objectATime = System.currentTimeMillis();
		return t;
	}

	/** Searches for the file with the name <code>fn</code>.
	 * 
	 * Searches the directory for the file with the name <code>fn</code> and returns 
	 * its index. Returns -1 if the file cannot be found. 
	 *  
	 * @param fn filename
	 * @return int index of file <code>fn</code>
	 */
	public int indexOf(String fn) {
		// linear search -> worst performance
		int n = list.size();
		for (int i = 0; i < n; i++) {
			DocuFileset fs = (DocuFileset) list.get(i);
			if (fs.getName().equals(fn)) {
				return i;
			}
		}
		return -1;
	}

	/** Finds the DocuFileset with the name <code>fn</code>.
	 * 
	 * Searches the directory for the DocuFileset with the name <code>fn</code> and returns 
	 * it. Returns null if the file cannot be found. 
	 *  
	 * @param fn filename
	 * @return DocuFileset
	 */
	public DocuFileset find(String fn) {
		int i = indexOf(fn);
		if (i >= 0) {
			return (DocuFileset) list.get(i);
		}
		return null;
	}

	/**
	 * @return String
	 */
	public String getDirName() {
		return dirName;
	}

	/**
	 * @return boolean
	 */
	public boolean isValid() {
		return isValid;
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
	public HashMap getDirMeta() {
		return dirMeta;
	}

	/**
	 * @return long
	 */
	public long getDirMTime() {
		return dirMTime;
	}

	/**
	 * Sets the dirMeta.
	 * @param dirMeta The dirMeta to set
	 */
	public void setDirMeta(HashMap dirMeta) {
		this.dirMeta = dirMeta;
	}

	public boolean hasUnresolvedFileMeta() {
		return (this.unresolvedFileMeta != null);
	}

}
