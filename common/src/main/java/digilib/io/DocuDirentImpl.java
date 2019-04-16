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

import digilib.io.FileOps.FileClass;
import digilib.meta.FileMeta;

/**
 * Abstract directory entry in a DocuDirectory.
 * 
 * @author casties
 *  
 */
public abstract class DocuDirentImpl implements DocuDirent {

	/** the file class of this file */
	protected static FileClass fileClass = FileClass.NONE;
	/** metadata for this file */
	protected FileMeta meta;
	/** the parent directory */
	protected DocuDirectory parent = null;

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#getInput()
     */
    public abstract File getFile();

	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#checkMeta()
     */
	public abstract void checkMeta();

	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#getMeta()
     */
    @Override
    public FileMeta getMeta() {
        // TODO Auto-generated method stub
        return meta;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#setMeta(digilib.meta.FileMeta)
     */
    @Override
    public void setMeta(FileMeta fileMeta) {
        this.meta = fileMeta;        
    }

	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#readMeta()
     */
	public void readMeta() {
	    meta.readMeta(this);
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
	public DocuDirectory getParent() {
		return parent;
	}
	
	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#setParent(digilib.io.Directory)
     */
	public void setParent(DocuDirectory parent) {
		this.parent = parent;
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
