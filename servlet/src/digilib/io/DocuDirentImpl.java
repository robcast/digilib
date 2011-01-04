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
public abstract class DocuDirentImpl implements DocuDirent {

	/** the file class of this file */
	protected static FileClass fileClass = FileClass.NONE;
	/** HashMap with metadata */
	protected MetadataMap fileMeta = null;
	/** Is the Metadata valid */
	protected boolean metaChecked = false;
	/** the parent directory */
	protected Directory parent = null;

	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#checkMeta()
     */
	public abstract void checkMeta();

	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#getInput()
     */
	public abstract File getFile();

	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#readMeta()
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

	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#getName()
     */
	public String getName() {
		File f = getFile();
		return (f != null) ? f.getName() : null;
	} 
	
	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#getParent()
     */
	public Directory getParent() {
		return parent;
	}
	
	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#setParent(digilib.io.Directory)
     */
	public void setParent(Directory parent) {
		this.parent = parent;
	} 
	
	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#getFileMeta()
     */
	public MetadataMap getFileMeta() {
		return fileMeta;
	} 
	
	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#setFileMeta(digilib.io.MetadataMap)
     */
	public void setFileMeta(MetadataMap fileMeta) {
		this.fileMeta = fileMeta;
	} 
	
	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#isMetaChecked()
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

	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#compareTo(java.lang.Object)
     */
	public int compareTo(Object arg0) {
		if (arg0 instanceof DocuDirentImpl) {
		    return getName().compareTo(((DocuDirent) arg0).getName());
		} else {
		    return getName().compareTo((String) arg0);
		}
	}

	
}
