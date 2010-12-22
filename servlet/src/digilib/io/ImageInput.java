/* ImageInput-- digilib image input interface.

  Digital Image Library servlet components

  Copyright (C) 2010 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

 * Created on 20.12.2010
 */

package digilib.io;

import digilib.image.ImageSize;

public abstract class ImageInput {

	// mime file type
	protected String mimetype = null;
	// image size in pixels
	protected ImageSize pixelSize = null;

	/**
	 * @return ImageSize
	 */
	public ImageSize getSize() {
		return pixelSize;
	}

	/**
	 * Sets the imageSize.
	 * @param imageSize The imageSize to set
	 */
	public void setSize(ImageSize imageSize) {
		this.pixelSize = imageSize;
	}

	/**
	 * @return String
	 */
	public String getMimetype() {
		return mimetype;
	}

	/**
	 * Sets the mimetype.
	 * @param mimetype The mimetype to set
	 */
	public void setMimetype(String filetype) {
		this.mimetype = filetype;
	}

	/** returns if this image has been checked 
	 * (i.e. has size and mimetype) 
	 * @return boolean
	 */
	public boolean isChecked() {
		return (pixelSize != null);
	}
	
	/** Returns the aspect ratio of the image (width/height).
	 * 
	 * @return
	 */
	public float getAspect() {
		return (pixelSize != null) ? pixelSize.getAspect() : 0;
	}
	
}