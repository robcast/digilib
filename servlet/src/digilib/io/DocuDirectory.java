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
import java.util.Arrays;
import java.util.Collection;
import java.util.Hashtable;
import java.util.Vector;

/**
 * @author casties
 */
public class DocuDirectory extends Vector {

	// directory object is valid (has been read)
	private boolean isValid = false;
	// names of base directories
	private String[] baseDirNames = null;
	// directory name (digilib canonical form)
	private String dirName = null;
	// default/hires directory
	private File dir = null;
	// directory metadata
	private Hashtable dirMeta = null;
	// time of last access of this object (not the filesystem)
	private long objectATime = 0;
	// time the file system directory was last modified
	private long dirMTime = 0;

	/*
	 * inherited stuff
	 */

	public DocuDirectory(int initialCapacity, int capacityIncrement) {
		super(initialCapacity, capacityIncrement);
	}

	public DocuDirectory(int initialCapacity) {
		super(initialCapacity);
	}

	public DocuDirectory(Collection c) {
		super(c);
	}

	/*
	 * new stuff
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
	public DocuDirectory(String path, String[] bd) {
		super();
		dirName = path;
		baseDirNames = bd;
		readDir();
	}

	/** Read the directory and fill this object.
	 * 
	 * Clears the Vector and (re)reads all files.
	 * 
	 * @return boolean the directory exists
	 */
	public boolean readDir() {
		// clear directory first
		clear();
		isValid = false;
		// number of base dirs
		int nb = baseDirNames.length;
		// array of base dirs
		File[] dirs = new File[nb];
		// the first directory has to exist
		dir = new File(baseDirNames[0] + dirName);

		if (dir.isDirectory()) {
			// fill array with the remaining directories
			for (int j = 1; j < nb; j++) {
				File d = new File(baseDirNames[j] + dirName);
				if (d.isDirectory()) {
					dirs[j] = d;
				}
			}

			File[] fl = dir.listFiles(new FileOps.ImageFileFilter());
			if (fl == null) {
				// not a directory
				return false;
			}
			// number of image files
			int nf = fl.length;
			if (nf > 0) {
				// resize Vector
				this.ensureCapacity(nf);

				// sort the file names alphabetically and iterate the list
				Arrays.sort(fl);
				for (int i = 0; i < nf; i++) {
					String fn = fl[i].getName();
					// add the first DocuFile to a new DocuFileset 
					DocuFileset fs = new DocuFileset(nb);
					fs.add(new DocuFile(fl[i]));
					// iterate the remaining base directories
					for (int j = 1; j < nb; j++) {
						if (dirs[j] == null) {
							continue;
						}
						File f = new File(dirs[j], fn);
						// if the file exists, add to the DocuFileset
						if (f.canRead()) {
							fs.add(new DocuFile(f));
						}
					}
					// add the fileset to our Vector
					add(fs);
					fs.setParent(this);
				}
			}
			dirMTime = dir.lastModified();
			isValid = true;
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
		for (int i = 0; i < elementCount; i++) {
			DocuFileset fs = (DocuFileset) get(i);
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
			return (DocuFileset) get(i);
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
	public Hashtable getDirMeta() {
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
	public void setDirMeta(Hashtable dirMeta) {
		this.dirMeta = dirMeta;
	}

}
