/* DocuImage -- General image interface class implementation

  Digital Image Library servlet components

  Copyright (C) 2001, 2002, 2003 Robert Casties (robcast@mail.berlios.de)

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

package digilib.image;

import java.awt.Rectangle;

import digilib.Utils;
import digilib.io.DocuFile;
import digilib.io.FileOpException;

/** Simple abstract implementation of the <code>DocuImage</code> interface.
 *
 * This implementation provides basic functionality for the utility methods like
 * <code>SetUtils</code>, and <code>getKnownFileTypes</code>. Image methods like
 * <code>loadImage</code>, <code>writeImage</code>, <code>getWidth</code>,
 * <code>getHeight</code>, <code>crop</code> and <code>scale</code> must be
 * implemented by derived classes.
 */
public abstract class DocuImageImpl implements DocuImage {

	/** Internal utils object. */
	protected Utils util = null;

	/** Interpolation quality. */
	protected int quality = 0;
	
	/** epsilon for float comparisons. */
	public final double epsilon = 1e-5;
	
	/** image mime-type */
	protected String mimeType = null;

	/** Default constructor. */
	public DocuImageImpl() {
		util = new Utils();
	}

	/** Contructor taking an utils object.
	 * 
	 * @param u Utils object.
	 */
	public DocuImageImpl(Utils u) {
		util = u;
	}

	/** Set local Utils object.
	 * 
	 * @param u Utils object.
	 */
	public void setUtils(Utils u) {
		util = u;
	}

	/** Internal knownFileTypes. */
	protected String[] knownFileTypes = { "jpg", "png", "gif", "tiff" };

	/** Returns the list of image file types known to the DocuImage implementation.
	 * 
	 * @return List of image file types. Strings are standard file extensions.
	 */
	public String[] getKnownFileTypes() {
		return knownFileTypes;
	}

	/**
	 * Returns the quality.
	 * @return int
	 */
	public int getQuality() {
		return quality;
	}

	/**
	 * Sets the quality.
	 * @param quality The quality to set
	 */
	public void setQuality(int quality) {
		this.quality = quality;
	}

	/** Crop and scale the current image.
	 *
	 * The current image is cropped to a rectangle of width, height at position
	 * x_off, y_off. The resulting image is scaled by the factor scale using the
	 * interpolation quality qual (0=worst).
	 * 
	 * @param x_off X offset of the crop rectangle in pixel.
	 * @param y_off Y offset of the crop rectangle in pixel.
	 * @param width Width of the crop rectangle in pixel.
	 * @param height Height of the crop rectangle in pixel.
	 * @param scale Scaling factor.
	 * @param qual Interpolation quality (0=worst).
	 * @throws ImageOpException Exception thrown on any error.
	 */
	public void cropAndScale(
		int x_off, int y_off, int width, int height, double scale, int qual) 
		throws ImageOpException {

		setQuality(qual);
		crop(x_off, y_off, width, height);
		scale(scale, scale);
	}
	
	public String getMimetype() {
		return mimeType;
	}

	public void rotate(double angle) throws ImageOpException {
		// just a do-nothing implementation
	}

	public void mirror(double angle) throws ImageOpException {
		// just a do-nothing implementation
	}

	public void enhance(float mult, float add) throws ImageOpException {
		// just a do-nothing implementation
	}

	public boolean isSubimageSupported() {
		// partial loading not supported per default
		return false;
	}

	public void loadSubimage(DocuFile f, Rectangle region, int subsample)
		throws FileOpException {
		// empty implementation
	}

	public void enhanceRGB(float[] rgbm, float[] rgba)
		throws ImageOpException {
		// emtpy implementation
	}

}
