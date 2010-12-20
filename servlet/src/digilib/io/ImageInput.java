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

import java.io.File;
import java.io.InputStream;

import digilib.image.ImageSize;

public interface ImageInput {

	/**
	 * @return ImageSize
	 */
	public abstract ImageSize getSize();

	/**
	 * @return String
	 */
	public abstract String getMimetype();

	/**
	 * Sets the imageSize.
	 * @param imageSize The imageSize to set
	 */
	public abstract void setSize(ImageSize imageSize);

	/**
	 * Sets the mimetype.
	 * @param mimetype The mimetype to set
	 */
	public abstract void setMimetype(String filetype);

	/** returns if this image has been checked 
	 * (i.e. has size and mimetype) 
	 * @return boolean
	 */
	public abstract boolean isChecked();

	/** Returns the aspect ratio of the image (width/height).
	 * 
	 * @return
	 */
	public abstract float getAspect();

	/** Returns if this ImageInput is File-based.
	 * @return
	 */
	public abstract boolean hasFile();
	
	/** Returns the underlying File (if applicable)
	 * 
	 * @return
	 */
	public abstract File getFile();

	/** Returns the underlying Stream (if applicable)
	 * 
	 * @return
	 */
	public abstract InputStream getStream();

	/** Returns if this ImageInput is Stream-based.
	 * @return
	 */
	public abstract boolean hasStream();
	
}