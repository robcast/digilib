/* DocuFileset -- digilib image file info class.

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

 */
package digilib.io;

import java.awt.Dimension;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.ListIterator;

import digilib.image.DocuInfo;

/**
 * @author casties
 */
public class DocuFileset {

	// list of files (DocuFile)
	private ArrayList list = null;
	// metadata
	private HashMap fileMeta = null;
	// metadata has been checked
	private boolean metaChecked = false;
	// resolution (DPI)
	private double resX = 0;
	private double resY = 0;
	// parent directory
	private DocuDirectory parent = null;


	/*
	 * constructors
	 */

	public DocuFileset(int initialCapacity) {
		list = new ArrayList(initialCapacity);
	}

	/*
	 * other stuff
	 */

	/** Adds a DocuFile to this Fileset.
	 * 
	 * The files should be added in the order of higher to lower resolutions. 
	 * The first file is considered the hires "original". 
	 * 
	 * @param f file to add
	 * @return true (always)
	 */
	public boolean add(DocuFile f) {
		f.setParent(this);
		return list.add(f);
	}

	/** The number of image files in this Fileset.
	 * 
	 * @return number of image files
	 */
	public int size() {
		return (list != null) ? list.size() : 0;
	}

	/** Get the DocuFile at the index.
	 * 
	 * @param index
	 * @return
	 */
	public DocuFile get(int index) {
		return (DocuFile) list.get(index);
	}

	/** Get the next smaller DocuFile than the given size.
	 * 
	 * Returns the DocuFile from the set that has a width and height 
	 * smaller or equal the given size. 
	 * Returns null if there isn't any smaller image.
	 * Needs DocuInfo instance to checkFile().
	 * 
	 * @param size
	 * @param info
	 * @return
	 */
	public DocuFile getNextSmaller(Dimension size, DocuInfo info) {
		for (Iterator i = getHiresIterator(); i.hasNext();) {
			DocuFile f = (DocuFile) i.next();
			if (!f.isChecked()) {
				f.check(info);
			}
			if ((f.getSize().getHeight() <= size.getHeight())
				&& (f.getSize().getWidth() <= size.getWidth())) {
				return f;
			}
		}
		return null;
	}

	/** Get the next bigger DocuFile than the given size.
	 * 
	 * Returns the DocuFile from the set that has a width and height 
	 * bigger or equal the given size. 
	 * Returns null if there isn't any bigger image.
	 * Needs DocuInfo instance to checkFile().
	 * 
	 * @param size
	 * @param info
	 * @return
	 */
	public DocuFile getNextBigger(Dimension size, DocuInfo info) {
		for (ListIterator i = getLoresIterator(); i.hasPrevious();) {
			DocuFile f = (DocuFile) i.previous();
			if (!f.isChecked()) {
				f.check(info);
			}
			if ((f.getSize().getHeight() >= size.getHeight())
				&& (f.getSize().getWidth() >= size.getWidth())) {
				return f;
			}
		}
		return null;
	}

	/** Get an Iterator for this Fileset starting at the highest resolution 
	 * images.
	 * 
	 * @return
	 */
	public ListIterator getHiresIterator() {
		return list.listIterator();
	}

	/** Get an Iterator for this Fileset starting at the lowest resolution 
	 * images.
	 * 
	 * The Iterator starts at the last element, so you have to use it backwards 
	 * with hasPrevious() and previous().
	 * 
	 * @return
	 */
	public ListIterator getLoresIterator() {
		return list.listIterator(list.size());
	}

	/** Reads meta-data for this Fileset if there is any.
	 * 
	 */
	public void readMeta() {
		if ((fileMeta != null) || list.isEmpty()) {
			// there is already metadata or there's no file 
			return;
		}
		// metadata is in the file {filename}.meta
		String fn = ((DocuFile) list.get(0)).getFile().getAbsolutePath();
		File mf = new File(fn + ".meta");
		if (mf.canRead()) {
			XMLMetaLoader ml = new XMLMetaLoader();
			try {
				// read meta file
				HashMap meta = ml.loadURL(mf.getAbsolutePath());
				if (meta == null) {
					return;
				}
				fileMeta = (HashMap) meta.get(getName());
			} catch (Exception e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
	}

	/** Checks metadata and sets resolution in resX and resY.
	 * 
	 */
	public void checkMeta() {
		if (metaChecked) {
			return;
		}
		if (fileMeta == null) {
			// try to read meta-data file
			readMeta();
			if (fileMeta == null) {
				// there is no meta data
				metaChecked = true;
				return;
			}
		}
		metaChecked = true;
		double dpi = 0;
		double dpix = 0;
		double dpiy = 0;
		double sizex = 0;
		double sizey = 0;
		double pixx = 0;
		double pixy = 0;
		// DPI is valid for X and Y
		try {
			dpi = Double.parseDouble((String) fileMeta.get("dpi"));
		} catch (NumberFormatException e) {
		}
		if (dpi != 0) {
			resX = dpi;
			resY = dpi;
			return;
		}
		// DPI-X and DPI-Y
		try {
			dpix = Double.parseDouble((String) fileMeta.get("dpi-x"));
			dpiy = Double.parseDouble((String) fileMeta.get("dpi-y"));
		} catch (NumberFormatException e) {
		}
		if ((dpix != 0) && (dpiy != 0)) {
			resX = dpix;
			resY = dpiy;
			return;
		}
		// SIZE-X and SIZE-Y and PIXEL-X and PIXEL-Y
		try {
			sizex =
				Double.parseDouble((String) fileMeta.get("original-size-x"));
			sizey =
				Double.parseDouble((String) fileMeta.get("original-size-y"));
			pixx =
				Double.parseDouble((String) fileMeta.get("original-pixel-x"));
			pixy =
				Double.parseDouble((String) fileMeta.get("original-pixel-y"));
		} catch (NumberFormatException e) {
		}
		if ((sizex != 0) && (sizey != 0) && (pixx != 0) && (pixy != 0)) {
			resX = pixx / (sizex * 100 / 2.54);
			resY = pixy / (sizey * 100 / 2.54);
			return;
		}
	}

	/** The name of the (hires) image file.
	 * 
	 * @return
	 */
	public String getName() {
		if (!list.isEmpty()) {
			return ((DocuFile) list.get(0)).getName();
		}
		return null;
	}

	/** Returns the parent DocuDirectory.
	 * 
	 * @return DocuDirectory
	 */
	public DocuDirectory getParent() {
		return parent;
	}

	/**
	 * Sets the parent.
	 * @param parent The parent to set
	 */
	public void setParent(DocuDirectory parent) {
		this.parent = parent;
	}

	/** Returns the meta-data for this fileset.
	 * 
	 * @return HashMap
	 */
	public HashMap getFileMeta() {
		return fileMeta;
	}

	/**
	 * Sets the fileMeta.
	 * @param fileMeta The fileMeta to set
	 */
	public void setFileMeta(HashMap fileMeta) {
		this.fileMeta = fileMeta;
	}

	/**
	 * @return
	 */
	public boolean isMetaChecked() {
		return metaChecked;
	}
	
	/**
	 * @return
	 */
	public double getResX() {
		return resX;
	}

	/**
	 * @return
	 */
	public double getResY() {
		return resY;
	}
	
}
