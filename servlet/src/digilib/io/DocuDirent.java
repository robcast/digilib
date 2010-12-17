/*
 * DocuDirent.java -- Abstract directory entry in a DocuDirectory
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
 * Created on 15.09.2003 by casties
 *  
 */
package digilib.io;

import java.io.File;
import java.util.Map;

import org.apache.log4j.Logger;

import digilib.io.FileOps.FileClass;

/**
 * Abstract directory entry in a DocuDirectory.
 * 
 * @author casties
 *  
 */
public abstract class DocuDirent implements Comparable<Object> {

	/** the file class of this file */
	protected static FileClass fileClass = FileClass.NONE;
	/** HashMap with metadata */
	protected MetadataMap fileMeta = null;
	/** Is the Metadata valid */
	protected boolean metaChecked = false;
	/** the parent directory */
	protected Directory parent = null;

	/**
	 * Checks metadata and does something with it.
	 *  
	 */
	public abstract void checkMeta();

	/**
	 * gets the (default) File
	 * 
	 * @return
	 */
	public abstract File getFile();

	/**
	 * Reads meta-data for this Fileset if there is any.
	 *  
	 */
	public void readMeta() {
		if ((fileMeta != null) || (getFile() == null)) {
			// there is already metadata or there is no file
			return;
		}
		// metadata is in the file {filename}.meta
		String fn = getFile().getAbsolutePath();
		File mf = new File(fn + ".meta");
		if (mf.canRead()) {
			XMLMetaLoader ml = new XMLMetaLoader();
			try {
				// read meta file
				Map<String, MetadataMap> meta = ml.loadURL(mf.getAbsolutePath());
				if (meta == null) {
					return;
				}
				fileMeta = meta.get(getName());
			} catch (Exception e) {
				Logger.getLogger(this.getClass()).warn("error reading file .meta", e);
			}
		}
	}

	/**
	 * The name of the file.
	 * 
	 * If this is a Fileset, the method returns the name of the default file
	 * (for image filesets the highest resolution file).
	 * 
	 * @return
	 */
	public String getName() {
		File f = getFile();
		return (f != null) ? f.getName() : null;
	} 
	
	/**
	 * Returns the parent Directory.
	 * 
	 * @return DocuDirectory
	 */
	public Directory getParent() {
		return parent;
	}
	
	/**
	 * Sets the parent Directory.
	 * 
	 * @param parent
	 *            The parent to set
	 */
	public void setParent(Directory parent) {
		this.parent = parent;
	} 
	
	/**
	 * Returns the meta-data for this file(set).
	 * 
	 * @return HashMap
	 */
	public MetadataMap getFileMeta() {
		return fileMeta;
	} 
	
	/**
	 * Sets the meta-data for this file(set) .
	 * 
	 * @param fileMeta
	 *            The fileMeta to set
	 */
	public void setFileMeta(MetadataMap fileMeta) {
		this.fileMeta = fileMeta;
	} 
	
	/**
	 * @return
	 */
	public boolean isMetaChecked() {
		return metaChecked;
	} 
	
	/**
	 * @return
	 */
	public static FileClass getFileClass() {
		return fileClass;
	}

	/** Comparator using the file name.
	 * Compares to a String (for binarySearch)
     * or to another DocuDirent (for sort)
	 * 
	 * @see java.lang.Comparable#compareTo(java.lang.Object)
	 */
	public int compareTo(Object arg0) {
		if (arg0 instanceof DocuDirent) {
		    return getName().compareTo(((DocuDirent) arg0).getName());
		} else {
		    return getName().compareTo((String) arg0);
		}
	}

	
}
