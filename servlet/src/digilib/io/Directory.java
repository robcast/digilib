/* Directory -- Filesystem directory object

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

 * Created on 26.08.2003
 *
 */
package digilib.io;

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
	File dir = null;
	/** parent directory */
	Directory parent = null;
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
			logger.debug("start reading dir");
			list = dir.list();
			Arrays.sort(list);
			logger.debug("done reading dir");
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
}
