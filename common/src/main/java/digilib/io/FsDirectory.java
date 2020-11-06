package digilib.io;

/*
 * #%L
 * 
 * Directory -- Filesystem directory object
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
 * Created on 26.08.2003
 */

import java.io.File;
import java.nio.file.Path;
import java.util.Arrays;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Class for filesystem directories
 * @author casties
 *
 */
public class FsDirectory {

	protected Logger logger = LoggerFactory.getLogger(this.getClass());

	/** File object pointing to the directory */
	protected File dir = null;
	/** parent directory */
	protected FsDirectory parent = null;
	/** list of filenames in the directory */
	protected String[] list = null;

	/** Default constructor.
	 * 
	 */
	public FsDirectory() {
		super();
	}
	
	/** Constructor taking a File object.
	 * 
	 * @param d the File
	 */
	public FsDirectory(File d) {
		dir = d;
	}

	/** Constructor taking a File object and a parent.
	 * 
	 * @param dir the File
	 * @param parent the Directory
	 */
	public FsDirectory(File dir, FsDirectory parent) {
		this.dir = dir;
		this.parent = parent;
	}

	/** Constructor taking a directory name.
	 * 
	 * @param dn the name
	 */
	public FsDirectory(String dn) {
		dir = new File(dn);
	}
	
	
	/** Reads the names of the files in the directory.
	 * Fills the filenames array. Returns if the operation was successful.
	 * 
	 * @return if the operation was successful
	 */
	public boolean readDir() {
		if (dir != null) {
			//logger.debug("reading dir: {}", dir.getPath());
			list = dir.list();
			if (list != null) {
				Arrays.sort(list);
			}
			//logger.debug("  done");
		}
		return (list != null);
	}
	
	/**
	 * Returns the directory File object.
	 * 
	 * @return the File
	 */
	public File getDir() {
		return dir;
	}

	/**
	 * Returns the directory as Path object.
	 * @return
	 */
	public Path toPath() {
	    return dir.toPath();
	}
	
	/**
	 * Sets the directory File object.
	 * @param dir the File
	 */
	public void setDir(File dir) {
		this.dir = dir;
	}
	
	/**
	 * Returns the parent Directory object.
	 * @return the Directory
	 */
	public FsDirectory getParent() {
		return parent;
	}

	/**
	 * Sets the parent Directory object.
	 * @param parent the Directory
	 */
	public void setParent(FsDirectory parent) {
		this.parent = parent;
	}


	/**
	 * Returns the filenames.
	 * @return the filenames
	 */
	public String[] getFilenames() {
		return list;
	}
	
	/**
	 * Sets the filenames.
	 * @param filenames the filenames
	 */
	public void setFilenames(String[] filenames) {
		this.list = filenames;
	}
	
	/**
	 * Resets the filenames.
	 */
	public void clearFilenames() {
		this.list = null;
	}
}
