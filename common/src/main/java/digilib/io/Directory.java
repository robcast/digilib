package digilib.io;

/*
 * #%L
 * 
 * Directory -- Filesystem directory object
 * 
 * Digital Image Library servlet components
 *  
 * %%
 * Copyright (C) 2003 - 2013 Robert Casties (robcast@mail.berlios.de)
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
 * Created on 26.08.2003
 */

import java.io.File;
import java.util.Arrays;

import org.apache.log4j.Logger;

/** Class for filesystem directories
 * @author casties
 *
 */
public class Directory {

	protected Logger logger = Logger.getLogger(this.getClass());

	/** File object pointing to the directory */
	protected File dir = null;
	/** parent directory */
	protected Directory parent = null;
	/** list of filenames in the directory */
	protected String[] list = null;

	/** Default constructor.
	 * 
	 */
	public Directory() {
		super();
	}
	
	/** Constructor taking a File object.
	 * 
	 * @param d
	 */
	public Directory(File d) {
		dir = d;
	}

	/** Constructor taking a File object and a parent.
	 * 
	 * @param dir
	 * @param parent
	 */
	public Directory(File dir, Directory parent) {
		this.dir = dir;
		this.parent = parent;
	}

	/** Constructor taking a directory name.
	 * 
	 * @param d
	 */
	public Directory(String dn) {
		dir = new File(dn);
	}
	
	
	/** Reads the names of the files in the directory.
	 * Fills the filenames array. Returns if the operation was successful.
	 * 
	 * @return
	 */
	public boolean readDir() {
		if (dir != null) {
			//logger.debug("reading dir: "+dir.getPath());
			list = dir.list();
			if (list != null) {
				Arrays.sort(list);
			}
			//logger.debug("  done");
		}
		return (list != null);
	}
	
	/**
	 * @return
	 */
	public File getDir() {
		return dir;
	}

	/**
	 * @param dir
	 */
	public void setDir(File dir) {
		this.dir = dir;
	}
	
	/**
	 * @return
	 */
	Directory getParent() {
		return parent;
	}

	/**
	 * @param parent
	 */
	void setParent(Directory parent) {
		this.parent = parent;
	}


	/**
	 * @return Returns the filenames.
	 */
	public String[] getFilenames() {
		return list;
	}
	
	/**
	 * @param filenames The filenames to set.
	 */
	public void setFilenames(String[] filenames) {
		this.list = filenames;
	}
	
	public void clearFilenames() {
		this.list = null;
	}
}
