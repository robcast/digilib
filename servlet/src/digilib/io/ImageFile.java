/* ImageFile.java -- digilib image file class.

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

 * Created on 25.02.2003
 */
 
package digilib.io;

import java.io.File;

import digilib.image.ImageSize;

/**
 * @author casties
 */
public class ImageFile extends ImageInput {
	
	// file name
	private String filename = null;
	// parent ImageSet
	private ImageSet parent = null;
	// parent directory
	private Directory dir = null;

	public ImageFile(String fn, ImageSet parent, Directory dir) {
		this.filename = fn;
		this.parent = parent;
		this.dir = dir;
	}
	
	public ImageFile(String fn) {
		File f = new File(fn);
		this.dir = new Directory(f.getParentFile());
		this.filename = f.getName();
	}
	
	
	@Override
	public boolean hasFile() {
		// this is File-based
		return true;
	}

	/** Returns the file name (without path).
	 * 
	 * @return
	 */
	public String getName() {
		return filename;
	}


	/**
	 * @return File
	 */
	@Override
	public File getFile() {
		if (dir == null) {
			return null;
		}
		File f = new File(dir.getDir(), filename);
		return f;
	}

	/**
	 * @return ImageSet
	 */
	public ImageSet getParent() {
		return parent;
	}

	/**
	 * Sets the parent.
	 * @param parent The parent to set
	 */
	public void setParent(ImageSet parent) {
		this.parent = parent;
	}

	/* (non-Javadoc)
	 * @see digilib.io.ImageInput#setSize(digilib.image.ImageSize)
	 */
	public void setSize(ImageSize imageSize) {
		this.pixelSize = imageSize;
		// pass on to parent
		if (this.parent != null) {
			this.parent.setAspect(imageSize);
		}
	}

}
