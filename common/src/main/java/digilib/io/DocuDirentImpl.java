package digilib.io;

/*
 * #%L
 * DocuDirentImpl.java -- Abstract directory entry in a DocuDirectory
 * 
 * Digital Image Library servlet components
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
 */

import java.io.File;
import java.util.Map;

import org.apache.log4j.Logger;

import digilib.io.FileOps.FileClass;
import digilib.meta.MetadataMap;
import digilib.meta.XMLMetaLoader;

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
