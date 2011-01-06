/* DocuImage -- General image interface class

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
import java.io.IOException;
import java.io.OutputStream;
import java.util.Iterator;

import javax.servlet.ServletException;

import digilib.io.FileOpException;
import digilib.io.ImageInput;

/** The basic class for the representation of a digilib image.
 *
 * The actual image object is hidden in the class, only methods for loading,
 * manipulation, and saving are exported. This strategy enables implementations
 * using different toolkits that rely on different image base classes (like
 * JIMI, Java2D and JAI).
 */
public interface DocuImage {

	/** Loads an image file into the Object.
	 * 
	 * @param ii Image File.
	 * @throws FileOpException Exception thrown if any error occurs.
	 */
	public void loadImage(ImageInput ii) throws FileOpException;

	/** This DocuImage supports the loadSubImage operation.
	 * 
	 * @return boolean
	 */
	public boolean isSubimageSupported();

	/** Load only a subsampled region of the image file.
	 * 
	 * @param ii
	 * @param region
	 * @param subsample
	 * @throws FileOpException
	 */
	public void loadSubimage(ImageInput ii, Rectangle region, int subsample)
		throws FileOpException;

	/** Writes the current image to a ServletResponse.
	 *
	 * The image is encoded to the mime-type <code>mt</code> and sent to the output
	 * stream of the <code>ServletResponse</code> <code>res</code>.
	 *
	 * Currently only mime-types "image/jpeg" and "image/png" are supported.
	 * 
	 * @param mt mime-type of the image to be sent.
	 * @param res ServletResponse where the image is sent.
	 * @throws ServletException Exception thrown on sending data.
	 * @throws ImageOpException Exception in other cases.
	 */
	public void writeImage(String mt, OutputStream ostream)
		throws ServletException, ImageOpException;

	/** The width of the current image in pixel.
	 * 
	 * @return Image width in pixels.
	 */
	public int getWidth();

	/** The height of the current image in pixel.
	 * 
	 * @return Image height in pixels.
	 */
	public int getHeight();
	
	/** The size of the current image in pixel.
	 * 
	 * @return
	 */
	public ImageSize getSize();

	/** The mime-type of the image, i.e. the mime-type of the input that was read.
	 * 
	 * @return String the mime-type of this image.
	 */
	public String getMimetype();

	/** Crops the current image.
	 * 
	 * Cuts out a region of the size <code>width</code> x <code>height</code> at
	 * the offset <code>xoff</code>, <code>yoff</code> from the current image
	 * and replaces the current image with the result.
	 * 
	 * @param xoff X offset of crop region
	 * @param yoff Y offset of crop region
	 * @param width width of crop region
	 * @param height height of crop region
	 * @throws ImageOpException
	 */
	public void crop(int xoff, int yoff, int width, int height)
		throws ImageOpException;

	/** Scales the current image.
	 * 
	 * Replaces the current image with an image scaled by the factor
	 * <code>scale</code>.
	 * 
	 * @param scale scaling factor
	 * @throws ImageOpException
	 */
	public void scale(double scaleX, double scaleY) throws ImageOpException;

	/** Crops and scales the current image.
	 *
	 * The current image is cropped to a rectangle of <code>width</code>,
	 * <code>height</code> at position <code>x_off</code>, <code>y_off</code>. The
	 * resulting image is scaled by the factor <code>scale</code> using the
	 * interpolation quality <code>qual</code> (0=worst).
	 * 
	 * @param x_off x offset of the crop rectangle in pixel.
	 * @param y_off y offset of the crop rectangle in pixel.
	 * @param width width of the crop rectangle in pixel.
	 * @param height height of the crop rectangle in pixel.
	 * @param scale scaling factor.
	 * @param qual interpolation quality (0=worst).
	 * @throws ImageOpException exception thrown on any error.
	 */
	public void cropAndScale(
		int x_off,
		int y_off,
		int width,
		int height,
		double scale,
		int qual)
		throws ImageOpException;

	/** Rotates the current image.
	 * 
	 * Replaces the current image with a rotated image. The image is rotated
	 * around the center by the <code>angle</code> 
	 * given in degrees [0, 360] clockwise.
	 * Image size and aspect ratio are likely to change.
	 * 
	 * @param angle rotation angle in degree
	 */
	public void rotate(double angle) throws ImageOpException;

	/** Mirrors the current image.
	 * 
	 * Replaces  the current image with a mirrored image. The mirror axis goes
	 * through the center of the image and is rotated by <code>angle</code>
	 * degrees. Currently only horizontal and vertical mirroring (0 and 90
	 * degree) are supported. 
	 * 
	 * @param angle angle of mirror axis
	 * @throws ImageOpException
	 */
	public void mirror(double angle) throws ImageOpException;

	/** Enhances brightness and contrast of the current image.
	 * 
	 * Replaces the current image with a brightness and contrast enhanced image.
	 * Contrast is enhanced by multiplying the pixel value with the constant
	 * <code>mult</code>. Brightness is enhanced by adding the constant
	 * <code>add</code> to the pixel value. Operation: p1 = (p0*mult)+add.
	 * 
	 * @param mult multiplicative constant for contrast enhancement
	 * @param add additive constant for brightness enhancement
	 * @throws ImageOpException
	 */
	public void enhance(float mult, float add) throws ImageOpException;

	/** Manipulates the colors of the current image.
	 * 
	 * Replaces the current image with a color modified image.
	 * For the red, green and blue color channels all pixel values are multiplied
	 * by the constant
	 * <code>m</code> and added to the constant
	 * <code>a</code>. Operation: p1 = (p0*m)+a.
	 * 
	 * @param rgbm multiplicative constants for red, green, blue
	 * @param rgba additive constant for red, green, blue
	 * @throws ImageOpException
	 */
	public void enhanceRGB(float[] rgbm, float[] rgba)
		throws ImageOpException;

	/**
	 * Returns the interpolation quality.
	 * @return int
	 */
	public int getQuality();

	/**
	 * Sets the interpolation quality.
	 * @param quality The quality to set
	 */
	public void setQuality(int quality);
	
	/** Frees all resources bound to the DocuImage.
	 * 
	 * Things that should be freed are image objects and open files.
	 * 
	 */
	public void dispose();

    /**
     * Check image size and type and store in ImageInput ii
     */
    public ImageInput identify(ImageInput ii) throws IOException;

    /**
     * Returns a list of supported image formats
     */
	public Iterator<String> getSupportedFormats();
	
	/**
	 * returns the underlying image as java.awt.Image (if possible, or null)
	 * @return
	 */
	public java.awt.Image getAwtImage();

}
