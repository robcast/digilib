/* ImageFileset -- digilib image file info class.  
 * Digital Image Library servlet components  
 * Copyright (C) 2003 Robert Casties (robcast@mail.berlios.de)  
 * 
 * This program is free software; you can
 * redistribute it and/or modify it under the terms of the GNU General Public
 * License as published by the Free Software Foundation; either version 2 of
 * the License, or (at your option) any later version.  
 * 
 * Please read license.txt for the full details. A copy of the GPL may be 
 * found at http://www.gnu.org/copyleft/lgpl.html  
 * 
 * You should have received a copy of the GNU General Public License along 
 * with this program; if not, write to the Free Software Foundation, Inc., 
 * 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA  
 */

package digilib.io;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.ListIterator;

import digilib.image.DocuInfo;
import digilib.image.ImageSize;

/**
 * @author casties
 */
public class ImageFileset extends DocuDirent {

	/** this is an image file */
	protected static int fileClass = FileOps.CLASS_IMAGE;

	/** list of files (ImageFile) */
	private ArrayList list = null;

	/** aspect ratio (width/height) */
	private double aspect = 0;

	/** resolution of the biggest image (DPI) */
	private double resX = 0;

	/** resolution of the biggest image (DPI) */
	private double resY = 0;

	/**
	 * Creator for empty fileset with size for file list.
	 * 
	 * 
	 * @param initialCapacity
	 */
	public ImageFileset(int initialCapacity) {
		list = new ArrayList(initialCapacity);
	}

	/**
	 * Creator with a file and base directories.
	 * 
	 * Reads the file and fills the fileset with corresponding files from the
	 * other base directories. First entry in dirs is the parent of this
	 * fileset.
	 * 
	 * 
	 * @see fill
	 * 
	 * @param dirs
	 *            array of base directories
	 * @param file
	 *            first file to read
	 * @param scalext
	 *            extension for scaled images
	 */
	public ImageFileset(Directory[] dirs, File file, String scalext) {
		int nb = dirs.length;
		list = new ArrayList(nb);
		parent = dirs[0];
		fill(dirs, file, scalext);
	}

	/**
	 * Adds an ImageFile to this Fileset.
	 * 
	 * The files should be added in the order of higher to lower resolutions.
	 * The first file is considered the hires "original".
	 * 
	 * 
	 * @param f
	 *            file to add
	 * @return true (always)
	 */
	public boolean add(ImageFile f) {
		f.setParent(this);
		return list.add(f);
	}

	/**
	 * The number of image files in this Fileset.
	 * 
	 * 
	 * @return number of image files
	 */
	public int size() {
		return (list != null) ? list.size() : 0;
	}

	/**
	 * Gets the default File.
	 *  
	 */
	public File getFile() {
		return (list != null) ? ((ImageFile) list.get(0)).getFile() : null;
	}

	/**
	 * Get the ImageFile at the index.
	 * 
	 * 
	 * @param index
	 * @return
	 */
	public ImageFile get(int index) {
		return (ImageFile) list.get(index);
	}

	/**
	 * Get the next smaller ImageFile than the given size.
	 * 
	 * Returns the ImageFile from the set that has a width and height smaller or
	 * equal the given size. Returns null if there isn't any smaller image.
	 * Needs DocuInfo instance to checkFile().
	 * 
	 * 
	 * @param size
	 * @param info
	 * @return
	 */
	public ImageFile getNextSmaller(ImageSize size, DocuInfo info) {
		for (Iterator i = getHiresIterator(); i.hasNext();) {
			ImageFile f = (ImageFile) i.next();
			try {
				if (!f.isChecked()) {
					info.checkFile(f);
				}
				if (f.getSize().isTotallySmallerThan(size)) {
					return f;
				}
			} catch (IOException e) {
			}
		}
		return null;
	}

	/**
	 * Get the next bigger ImageFile than the given size.
	 * 
	 * Returns the ImageFile from the set that has a width or height bigger or
	 * equal the given size. Returns null if there isn't any bigger image. Needs
	 * DocuInfo instance to checkFile().
	 * 
	 * 
	 * @param size
	 * @param info
	 * @return
	 */
	public ImageFile getNextBigger(ImageSize size, DocuInfo info) {
		for (ListIterator i = getLoresIterator(); i.hasPrevious();) {
			ImageFile f = (ImageFile) i.previous();
			try {
				if (!f.isChecked()) {
					info.checkFile(f);
				}
				if (f.getSize().isBiggerThan(size)) {
					return f;
				}
			} catch (IOException e) {
			}
		}
		return null;
	}

	/**
	 * Returns the biggest ImageFile in the set.
	 * 
	 * 
	 * @return
	 */
	public ImageFile getBiggest() {
		return this.get(0);
	}

	/**
	 * Returns the biggest ImageFile in the set.
	 * 
	 * 
	 * @return
	 */
	public ImageFile getSmallest() {
		return this.get(this.size() - 1);
	}

	/**
	 * Get an Iterator for this Fileset starting at the highest resolution
	 * images.
	 * 
	 * 
	 * @return
	 */
	public ListIterator getHiresIterator() {
		return list.listIterator();
	}

	/**
	 * Get an Iterator for this Fileset starting at the lowest resolution
	 * images.
	 * 
	 * The Iterator starts at the last element, so you have to use it backwards
	 * with hasPrevious() and previous().
	 * 
	 * 
	 * @return
	 */
	public ListIterator getLoresIterator() {
		return list.listIterator(list.size());
	}

	/**
	 * Fill the ImageFileset with files from different base directories.
	 * 
	 * 
	 * @param dirs
	 *            list of base directories
	 * @param fl
	 *            file (from first base dir)
	 * @param scalext
	 *            first extension to try in other base dirs
	 */
	void fill(Directory[] dirs, File fl, String scalext) {
		int nb = dirs.length;
		String fn = fl.getName();
		String fnx = fn.substring(0, fn.lastIndexOf('.') + 1);
		// add the first ImageFile to the ImageFileset
		add(new ImageFile(fn, this, parent));
		// iterate the remaining base directories
		for (int j = 1; j < nb; j++) {
			if (dirs[j] == null) {
				continue;
			}
			File f;
			if (scalext != null) {
				// use the last extension
				f = new File(dirs[j].getDir(), fnx + scalext);
			} else {
				// try the same filename as the original
				f = new File(dirs[j].getDir(), fn);
			}
			// if the file exists, add to the ImageFileset
			if (f.canRead()) {
				add(new ImageFile(f.getName(), this, dirs[j]));
			} else {
				// try other file extensions
				Iterator exts = FileOps.getImageExtensionIterator();
				while (exts.hasNext()) {
					String s = (String) exts.next();
					f = new File(dirs[j].getDir(), fnx + s);
					// if the file exists, add to the ImageFileset
					if (f.canRead()) {
						add(new ImageFile(f.getName(), this, dirs[j]));
						scalext = s;
						break;
					}
				}
			}
		}
	}

	/**
	 * Checks metadata and sets resolution in resX and resY.
	 *  
	 */
	public void checkMeta() {
		if (metaChecked) {
			return;
		}
		if (fileMeta == null) {
			// try to read metadata file
			readMeta();
			if (fileMeta == null) {
				// try directory metadata
				((DocuDirectory) parent).checkMeta();
				if (((DocuDirectory) parent).getDirMeta() != null) {
					fileMeta = ((DocuDirectory) parent).getDirMeta();
				} else {
					// try parent directory metadata
					DocuDirectory gp = (DocuDirectory) parent.getParent();
					if (gp != null) {
						gp.checkMeta();
						if (gp.getDirMeta() != null) {
							fileMeta = gp.getDirMeta();
						} else {
							// no metadata available
							metaChecked = true;
							return;
						}
					}
				}
			}
		}
		metaChecked = true;
		String s;
		double dpi = 0;
		double dpix = 0;
		double dpiy = 0;
		double sizex = 0;
		double sizey = 0;
		double pixx = 0;
		double pixy = 0;
		// DPI is valid for X and Y
		if (fileMeta.containsKey("original-dpi")) {
			try {
				dpi = Double.parseDouble((String) fileMeta.get("original-dpi"));
			} catch (NumberFormatException e) {
			}
			if (dpi != 0) {
				resX = dpi;
				resY = dpi;
				return;
			}
		}
		// DPI-X and DPI-Y
		if (fileMeta.containsKey("original-dpi-x")
				&& fileMeta.containsKey("original-dpi-y")) {
			try {
				dpix = Double.parseDouble((String) fileMeta
						.get("original-dpi-x"));
				dpiy = Double.parseDouble((String) fileMeta
						.get("original-dpi-y"));
			} catch (NumberFormatException e) {
			}
			if ((dpix != 0) && (dpiy != 0)) {
				resX = dpix;
				resY = dpiy;
				return;
			}
		}
		// SIZE-X and SIZE-Y and PIXEL-X and PIXEL-Y
		if (fileMeta.containsKey("original-size-x")
				&& fileMeta.containsKey("original-size-y")
				&& fileMeta.containsKey("original-pixel-x")
				&& fileMeta.containsKey("original-pixel-y")) {
			try {
				sizex = Double.parseDouble((String) fileMeta
						.get("original-size-x"));
				sizey = Double.parseDouble((String) fileMeta
						.get("original-size-y"));
				pixx = Double.parseDouble((String) fileMeta
						.get("original-pixel-x"));
				pixy = Double.parseDouble((String) fileMeta
						.get("original-pixel-y"));
			} catch (NumberFormatException e) {
			}
			if ((sizex != 0) && (sizey != 0) && (pixx != 0) && (pixy != 0)) {
				resX = pixx / (sizex * 100 / 2.54);
				resY = pixy / (sizey * 100 / 2.54);
				return;
			}
		}
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

	/**
	 * Sets the aspect ratio from an ImageSize.
	 * 
	 * 
	 * @param f
	 */
	public void setAspect(ImageSize s) {
		aspect = s.getAspect();
	}

	/**
	 * Returns the aspect ratio.
	 * 
	 * Aspect ratio is (width/height). So it's <1 for portrait and >1 for
	 * landscape.
	 * 
	 * 
	 * @return
	 */
	public double getAspect() {
		return aspect;
	}

}