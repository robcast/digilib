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
	
	// file
	private File file = null;
	// file name
	private String name = null;
	// parent ImageSet
	private ImageSet parent = null;
	// parent directory
	private Directory dir = null;

	/** Constructor with File.
	 * 
	 * @param f
	 * @param parent
	 * @param dir
	 */
	public ImageFile(File f, ImageSet parent, Directory dir) {
		this.file = f;
		this.name = f.getName();
		this.parent = parent;
		this.dir = dir;
	}
	
	/** Constructor with filename (without path).
	 * @param fn
	 * @param parent
	 * @param dir
	 */
	public ImageFile(String fn, ImageSet parent, Directory dir) {
		this.name = fn;
		this.dir = dir;
		this.file = new File(this.dir.getDir(), fn);
		this.parent = parent;
	}
	
	/** Returns the file name (without path).
	 * 
	 * @return
	 */
	public String getName() {
		return name;
	}


	/**
	 * @return File
	 */
	public File getFile() {
		return file;
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

    /* (non-Javadoc)
     * @see java.lang.Object#toString()
     */
    @Override
    public String toString() {
        // try to use File.toString
        if (file != null) {
            return file.toString();
        }
        return super.toString();
    }

	
}
