/* ImageLoaderDocuInfo -- DocuInfo implementation using ImageLoader API

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

 * Created on 11.06.2003
 *
 */
package digilib.image;

import java.awt.Dimension;
import java.io.IOException;

import digilib.io.DocuFile;
import digilib.io.FileOps;

/**
 * @author casties
 *
 */
public class ImageLoaderDocuInfo implements DocuInfo {

	private ImageLoaderDocuImage img = new ImageLoaderDocuImage();

	/* check image size and type and store in DocuFile f */
	public boolean checkFile(DocuFile f) throws IOException {
		// see if f is already loaded
		if ((img.reader == null) || (img.imgFile != f.getFile())) {
			img.preloadImage(f.getFile());
		}
		Dimension d =
			new Dimension(img.reader.getWidth(0), img.reader.getHeight(0));
		f.setSize(d);
		String t = img.reader.getFormatName();
		t = FileOps.mimeForFile(f.getFile());
		f.setMimetype(t);
		f.setChecked(true);
		return true;
	}

}
