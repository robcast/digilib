/* DocuFile.java -- digilib image file class.

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
public class DocuFile {
	
	// file object
	private String filename = null;
	// parent DocuFileset
	private DocuFileset parent = null;
	// parent directory
	private Directory dir = null;
	// mime file type
	private String mimetype = null;
	// image size in pixels
	private ImageSize pixelSize = null;

	public DocuFile(String fn, DocuFileset parent, Directory dir) {
		this.filename = fn;
		this.parent = parent;
		this.dir = dir;
	}
	
	public DocuFile(String fn) {
		File f = new File(fn);
		this.dir = new Directory(f.getParentFile());
		this.filename = f.getName();
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
	public File getFile() {
		File f = new File(dir.getDir(), filename);
		return f;
	}

	/**
	 * @return ImageSize
	 */
	public ImageSize getSize() {
		return pixelSize;
	}

	/**
	 * @return String
	 */
	public String getMimetype() {
		return mimetype;
	}

	/**
	 * Sets the imageSize.
	 * @param imageSize The imageSize to set
	 */
	public void setSize(ImageSize imageSize) {
		this.pixelSize = imageSize;
	}

	/**
	 * Sets the mimetype.
	 * @param mimetype The mimetype to set
	 */
	public void setMimetype(String mimetype) {
		this.mimetype = mimetype;
	}

	/**
	 * @return DocuFileset
	 */
	public DocuFileset getParent() {
		return parent;
	}

	/**
	 * Sets the parent.
	 * @param parent The parent to set
	 */
	public void setParent(DocuFileset parent) {
		this.parent = parent;
	}

	/**
	 * @return boolean
	 */
	public boolean isChecked() {
		return (pixelSize != null);
	}

}
