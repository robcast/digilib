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

 * Created on 26.08.2003
 */

package digilib.image;

/** Class for image size (width, height).
 * 
 * @author casties
 *
 */
public class ImageSize {
	public int width;
	public int height;

	public ImageSize() {
		super();
	}

	public ImageSize(int width, int height) {
		this.width = width;
		this.height = height;
	}

	public ImageSize(ImageSize i) {
		this.width = i.width;
		this.height = i.height;
	}

	public void setSize(int width, int height) {
		this.width = width;
		this.height = height;
	}

	/** Returns if the size of this image is smaller in every dimension than the other image.
	 * 
	 * @param is
	 * @return
	 */
	public boolean isTotallySmallerThan(ImageSize is) {
		return ((this.width <= is.width) && (this.height <= is.height));
	}

	/** Returns if the size of this image is smaller in at least one dimension than the other image.
	 * 
	 * @param is
	 * @return
	 */
	public boolean isSmallerThan(ImageSize is) {
		return ((this.width <= is.width) || (this.height <= is.height));
	}

	/** Returns if the size of this image is bigger in every dimension than the other image.
	 * 
	 * @param is
	 * @return
	 */
	public boolean isTotallyBiggerThan(ImageSize is) {
		return ((this.width >= is.width) && (this.height >= is.height));
	}

	/** Returns if the size of this image is bigger in at least one dimension than the other image.
	 * 
	 * @param is
	 * @return
	 */
	public boolean isBiggerThan(ImageSize is) {
		return ((this.width >= is.width) || (this.height >= is.height));
	}

	/** Returns if this image has the same size or height as the other image.
	 * 
	 * @param is
	 * @return
	 */
	public boolean fitsIn(ImageSize is) {
		return ((this.width == is.width)&&(this.height <= is.height)
		||(this.width <= is.width)&&(this.height == is.height));
	}

	/** Returns if the size of this image is the same as the other image.
	 * 
	 * @param is
	 * @return
	 */
	public boolean equals(ImageSize is) {
		return ((this.width == is.width)&&(this.height == is.height));
	}

	/**
	 * @return
	 */
	public int getHeight() {
		return height;
	}

	/**
	 * @param height
	 */
	public void setHeight(int height) {
		this.height = height;
	}

	/**
	 * @return
	 */
	public int getWidth() {
		return width;
	}

	/**
	 * @param width
	 */
	public void setWidth(int width) {
		this.width = width;
	}

}
