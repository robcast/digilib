package digilib.io;

/*
 * #%L
 * ImageSet -- digilib class for image file information at different resolutions.
 *   
 * Digital Image Library servlet components
 *   
 * %%
 * Copyright (C) 2003 - 2013 MPIWG Berlin
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Author: Robert Casties (robcast@berlios.de)
 */

import java.util.ArrayList;
import java.util.List;
import java.util.ListIterator;

import digilib.util.ImageSize;

/**
 * Set of ImageInputs of the same image in different resolutions.
 * 
 * The images are be added in the order of higher to lower resolutions.
 * The first image is considered the hires "original".
 * 
 * @author casties
 */
public class ImageSet {

	/** list of files (ImageInput) */
	protected List<ImageInput> list = null;

	/** aspect ratio (width/height) */
	protected float aspect = 0f;

	/** resolution of the biggest image (DPI) */
	protected float resX = 0f;

	/** resolution of the biggest image (DPI) */
	protected float resY = 0f;

	/**
	 * Creator for empty fileset.
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
	 * @return the ImageInput
	 */
	public ImageInput get() {
		return (list != null) ? list.get(0) : null;
	}

	/**
	 * Get the ImageInput at the index.
	 * 
	 * 
	 * @param index the index
	 * @return the ImageInput
	 */
	public ImageInput get(int index) {
		return list.get(index);
	}

    /**
     * Get the next smaller ImageInput than the given size.
     * 
     * Returns the ImageInput from the set that has a width and height smaller or
     * equal the given size. Returns null if there isn't any smaller image.
     * 
     * @param size the size
     * @return the ImageInput
     */
    public ImageInput getNextSmaller(ImageSize size) {
        for (ImageInput i : list) {
            ImageSize is = i.getSize();
            if (is != null && is.isTotallySmallerThan(size)) {
                return i;
            }
        }
        return null;
    }

    /**
     * Get the next smaller ImageInput with the given tag than the given size.
     * 
     * Returns the ImageInput from the set that has a width and height smaller or
     * equal the given size and has the given tag. 
     * Returns null if there isn't any smaller image with the given tag.
     * 
     * @param size the size
     * @param tag the tag
     * @return the ImageInput
     */
    public ImageInput getNextSmaller(ImageSize size, ImageInput.InputTag tag) {
        for (ImageInput i : list) {
            if (i.hasTag(tag)) {
                ImageSize is = i.getSize();
                if (is != null && is.isTotallySmallerThan(size)) {
                    return i;
                }
            }
        }
        return null;
    }

    /**
     * Get the next smaller ImageInput than the given size preferring (same-size) 
     * images with the given tag.
     * 
     * Returns the ImageInput from the set that has a width and height smaller or
     * equal the given size. Prefers images with the given tag available at the same size. 
     * Returns null if there isn't any smaller image.
     * 
     * @param size the size
     * @param tag the tag
     * @return the ImageInput
     */
    public ImageInput getNextSmallerPreferred(ImageSize size, ImageInput.InputTag tag) {
        for (ListIterator<ImageInput> i = getHiresIterator(); i.hasNext(); ) {
            ImageInput ii = i.next();
            ImageSize is = ii.getSize();
            if (is != null && is.isTotallySmallerThan(size)) {
                // size matches
                if (ii.hasTag(tag)) {
                    // size and tag match
                    return ii;
                } else {
                    // look for more same-size images
                    while (i.hasNext()) {
                        ImageInput nii = i.next();
                        ImageSize nis = nii.getSize();
                        if (nis.equals(is)) {
                            // size still matches
                            if (ii.hasTag(tag)) {
                                // size and tag match
                                return nii;
                            }                          
                        } else {
                            // new size doesn't match - return old image
                            return ii;
                        }
                    }
                }
            }
        }
        return null;
    }

	/**
	 * Get the next bigger ImageInput than the given size.
	 * 
	 * Returns the ImageInput from the set that has a width or height bigger or
	 * equal the given size. Returns null if there isn't any bigger image.
	 * 
	 * @param size the size
	 * @return the ImageInput
	 */
	public ImageInput getNextBigger(ImageSize size) {
		for (ListIterator<ImageInput> i = getLoresIterator(); i.hasPrevious();) {
			ImageInput f = i.previous();
			ImageSize is = f.getSize();
			if (is != null && is.isBiggerThan(size)) {
				return f;
			}
		}
		return null;
	}

    /**
     * Get the next bigger ImageInput with the given tag than the given size.
     * 
     * Returns the ImageInput from the set that has a width or height bigger or
     * equal the given size and has the given tag. 
     * Returns null if there isn't any bigger image with the given tag.
     * 
     * @param size the size
     * @param tag the tag
     * @return the ImageInput
     */
    public ImageInput getNextBigger(ImageSize size, ImageInput.InputTag tag) {
        for (ListIterator<ImageInput> i = getLoresIterator(); i.hasPrevious();) {
            ImageInput f = i.previous();
            if (f.hasTag(tag)) {
                ImageSize is = f.getSize();
                if (is != null && is.isBiggerThan(size)) {
                    return f;
                }
            }
        }
        return null;
    }

    /**
     * Get the next bigger ImageInput than the given size preferring (same-size) 
     * images with the given tag.
     * 
     * Returns the ImageInput from the set that has a width and height bigger or
     * equal the given size. Prefers images with the given tag available at the same size. 
     * Returns null if there isn't any bigger image.
     * 
     * @param size the size
     * @param tag the tag
     * @return the ImageInput
     */
    public ImageInput getNextBiggerPreferred(ImageSize size, ImageInput.InputTag tag) {
        for (ListIterator<ImageInput> i = getLoresIterator(); i.hasPrevious(); ) {
            ImageInput ii = i.previous();
            ImageSize is = ii.getSize();
            if (is != null && is.isBiggerThan(size)) {
                // size matches
                if (ii.hasTag(tag)) {
                    // size and tag match
                    return ii;
                } else {
                    // look for more same-size images
                    while (i.hasPrevious()) {
                        ImageInput nii = i.previous();
                        ImageSize nis = nii.getSize();
                        if (nis.equals(is)) {
                            // size still matches
                            if (ii.hasTag(tag)) {
                                // size and tag match
                                return nii;
                            }                          
                        } else {
                            // new size doesn't match - return old image
                            return ii;
                        }
                    }
                }
            }
        }
        return null;
    }

	/**
	 * Returns the biggest ImageInput in the set.
	 * 
	 * @return the ImageInput
	 */
	public ImageInput getBiggest() {
		return this.get(0);
	}

    /**
     * Returns the biggest ImageInput in the set. 
     * Prefers inputs with given tag.
     * 
     * @return the ImageInput
     */
    public ImageInput getBiggestPreferred(ImageInput.InputTag tag) {
        ImageInput target = getBiggest();
        if (target == null) return null;
        if (tag == null) return target;
        ImageSize targetSize = target.getSize();
        for (ImageInput i : list) {
            ImageSize size = i.getSize();
            if (size.equals(targetSize)) {
                if (i.hasTag(tag)) {
                    return i;
                }
            } else {
                // assuming inputs ordered by size there won't be another matching one
                break;
            }
        }
        return target;
    }

	/**
	 * Returns the smallest ImageInput in the set.
	 * 
	 * @return the ImageInput
	 */
	public ImageInput getSmallest() {
		return this.get(this.size() - 1);
	}

    /**
     * Returns the smallest ImageInput in the set.
     * Prefers inputs with the given tag.
     * 
     * @return the ImageInput
     */
    public ImageInput getSmallestPreferred(ImageInput.InputTag tag) {
        ImageInput target = getSmallest();
        if (target == null) return null;
        if (tag == null) return target;
        ImageSize targetSize = target.getSize();
        for (ListIterator<ImageInput> i = getLoresIterator(); i.hasPrevious();) {
            ImageInput f = i.previous();
            ImageSize size = f.getSize();
            if (size.equals(targetSize)) {
                if (f.hasTag(tag)) {
                    return f;
                }
            } else {
                // assuming inputs ordered by size there won't be another matching one
                break;
            }
        }
        return target;
    }

	/**
	 * Get an Iterator for this Fileset starting at the highest resolution
	 * image.
	 * 
	 * @return the Iterator
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
	 * @return the Iterator
	 */
	public ListIterator<ImageInput> getLoresIterator() {
		return list.listIterator(list.size());
	}

	/**
	 * @return the resX
	 */
	public float getResX() {
		return resX;
	}

	/**
	 * @return the resY
	 */
	public float getResY() {
		return resY;
	}

	/**
	 * Sets the aspect ratio from an ImageSize.
	 * 
	 * 
	 * @param s the ImageSize
	 */
	public void setAspect(ImageSize s) {
		aspect = s.getAspect();
	}

	/**
	 * Returns the aspect ratio.
	 * 
	 * Aspect ratio is (width/height). So it's &lt;1 for portrait and &gt;1 for
	 * landscape.
	 * 
	 * 
	 * @return the aspect ratio
	 */
	public float getAspect() {
		return aspect;
	}

    public void checkMeta() {
        // TODO Auto-generated method stub
        
    }

    /**
     * Adds an ImageInput to this ImageSet.
     * 
     * The images should be added in the order of higher to lower resolutions.
     * The first image is considered the hires "original".
     * 
     * 
     * @param f
     *            ImageInput to add
     * @return true (always)
     */
    public boolean add(ImageInput f) {
    	return list.add(f);
    }
    
    
    /**
     * Append all ImageInputs from another ImageSet (at the end).
     * 
     * Changes the parents of the ImageInputs to this ImageSet.
     *  
     * @param imgs the ImageSet
     */
    public void append(ImageSet imgs) {
        // append list
        list.addAll(imgs.list);
    }

}
