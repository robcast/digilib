/* ImageSet -- digilib image file info class.  
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

import java.util.ArrayList;
import java.util.List;
import java.util.ListIterator;

import digilib.util.ImageSize;

/**
 * @author casties
 */
public class ImageSet {

	/** list of files (ImageFile) */
	protected List<ImageInput> list = null;

	/** aspect ratio (width/height) */
	protected float aspect = 0f;

	/** resolution of the biggest image (DPI) */
	protected float resX = 0f;

	/** resolution of the biggest image (DPI) */
	protected float resY = 0f;

	/**
	 * Creator for empty fileset.
	 * 
	 * 
	 * @param initialCapacity
	 */
	public ImageSet() {
		list = new ArrayList<ImageInput>();
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
	 * Gets the default Input.
	 *  
	 */
	public ImageInput get() {
		return (list != null) ? list.get(0) : null;
	}

	/**
	 * Get the ImageFile at the index.
	 * 
	 * 
	 * @param index
	 * @return
	 */
	public ImageInput get(int index) {
		return list.get(index);
	}

	/**
	 * Get the next smaller ImageFile than the given size.
	 * 
	 * Returns the ImageFile from the set that has a width and height smaller or
	 * equal the given size. Returns null if there isn't any smaller image.
	 * 
	 * @param size
	 * @param info
	 * @return
	 */
	public ImageInput getNextSmaller(ImageSize size) {
		for (ListIterator<ImageInput> i = getHiresIterator(); i.hasNext();) {
			ImageInput f = i.next();
			if (f.getSize().isTotallySmallerThan(size)) {
				return f;
			}
		}
		return null;
	}

	/**
	 * Get the next bigger ImageFile than the given size.
	 * 
	 * Returns the ImageFile from the set that has a width or height bigger or
	 * equal the given size. Returns null if there isn't any bigger image.
	 * 
	 * @param size
	 * @param info
	 * @return
	 */
	public ImageInput getNextBigger(ImageSize size) {
		for (ListIterator<ImageInput> i = getLoresIterator(); i.hasPrevious();) {
			ImageInput f = i.previous();
			if (f.getSize().isBiggerThan(size)) {
				return f;
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
	public ImageInput getBiggest() {
		return this.get(0);
	}

	/**
	 * Returns the biggest ImageFile in the set.
	 * 
	 * 
	 * @return
	 */
	public ImageInput getSmallest() {
		return this.get(this.size() - 1);
	}

	/**
	 * Get an Iterator for this Fileset starting at the highest resolution
	 * images.
	 * 
	 * 
	 * @return
	 */
	public ListIterator<ImageInput> getHiresIterator() {
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
	public ListIterator<ImageInput> getLoresIterator() {
		return list.listIterator(list.size());
	}

	/**
	 * @return
	 */
	public float getResX() {
		return resX;
	}

	/**
	 * @return
	 */
	public float getResY() {
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
	public float getAspect() {
		return aspect;
	}

    public void checkMeta() {
        // TODO Auto-generated method stub
        
    }

}