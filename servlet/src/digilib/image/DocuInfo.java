/* DocuInfo -- General image information interface

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
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307 USA

*/

package digilib.image;

import java.io.IOException;

import digilib.io.ImageFile;

/**
 * @author casties
 *
 */
public interface DocuInfo {

	/** Checks the size and type of the ImageFile f.
	 * 
	 * The image size and type of the ImageFile f is determined and stored in
	 * the ImageFile object. Returns true if successfull.
	 * 
	 * @param f ImageFile to be checked.
	 * @return boolean true if check was successfull.
	 * @throws FileOpException Exception thrown on error.
	 */
	public boolean checkFile(ImageFile f) throws IOException;

}
