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

import java.awt.Dimension;
import java.io.File;
import java.io.IOException;

import digilib.image.DocuInfo;

/**
 * @author casties
 */
public class DocuFile {
	
	// file object
	private File file = null;
	// parent DocuFileset
	private DocuFileset parent = null;
	// mime file type
	private String mimetype = null;
	// image size in pixels
	private Dimension pixelSize = null;
	// image size and type are valid
	private boolean checked = false;

	public DocuFile(File f) {
		file = f;
	}
	
	public String getName() {
		if (file != null) {
			return file.getName();
		}
		return null;
	}


	public void check(DocuInfo info) {
		try {
			info.checkFile(this);
		} catch (IOException e) {
			checked = false;
		}
	}

	/**
	 * @return File
	 */
	public File getFile() {
		return file;
	}

	/**
	 * @return Dimension
	 */
	public Dimension getSize() {
		return pixelSize;
	}

	/**
	 * @return String
	 */
	public String getMimetype() {
		return mimetype;
	}

	/**
	 * Sets the file.
	 * @param file The file to set
	 */
	public void setFile(File f) {
		this.file = f;
		mimetype = FileOps.mimeForFile(f);
	}

	/**
	 * Sets the imageSize.
	 * @param imageSize The imageSize to set
	 */
	public void setSize(Dimension imageSize) {
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
		return checked;
	}

	/**
	 * Sets the checked.
	 * @param checked The checked to set
	 */
	public void setChecked(boolean checked) {
		this.checked = checked;
	}

}
