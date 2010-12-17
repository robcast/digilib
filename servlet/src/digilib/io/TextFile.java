/* TextFile.java -- Class for text files

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

 * Created on 15.09.2003 by casties
 *
 */
package digilib.io;

import java.io.File;

import digilib.io.FileOps.FileClass;

/** Class for text files.
 * 
 * @author casties
 *
 */
public class TextFile extends DocuDirent {
	/** this is a text file */
	protected static FileClass fileClass = FileClass.TEXT;
	/** our File instance */
	protected File file = null;
	
	/** Constructor taking a file.
	 * 
	 * @param f
	 */
	public TextFile(File f) {
		this.file = f;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#checkMeta()
	 */
	public void checkMeta() {
		// TODO Auto-generated method stub

	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#getFile()
	 */
	public File getFile() {
		return file;
	}

}
