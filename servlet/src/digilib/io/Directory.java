/* Directory -- 

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

/** Class for filesystem directories
 * @author casties
 *
 */
public class Directory {
	// File object pointing to the directory
	File dir = null;

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

	/** Constructor taking a directory name.
	 * 
	 * @param d
	 */
	public Directory(String dn) {
		dir = new File(dn);
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

}
