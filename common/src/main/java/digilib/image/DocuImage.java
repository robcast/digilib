package digilib.image;

/*
 * #%L
 * DocuImage -- General image interface class
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2001 - 2013 MPIWG Berlin
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

import java.awt.Rectangle;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Iterator;

import digilib.io.FileOpException;
import digilib.io.ImageInput;
import digilib.util.ImageSize;

/**
 * The basic class for the representation of a digilib image.
 * 
 * The actual image object is hidden in the class, only methods for loading,
 * manipulation, and saving are exported. This strategy enables implementations
 * using different toolkits that rely on different image base classes (like
 * JIMI, Java2D and JAI).
 */
public interface DocuImage {

    /**
     * Loads an image file into the Object.
     * 
     * @param ii
     *            Image File.
     * @throws FileOpException
     *             Exception thrown if any error occurs.
     */
    public void loadImage(ImageInput ii) throws FileOpException;

    /**
     * This DocuImage supports the loadSubImage operation.
     * 
     * @return if loadSubImage is supported
     */
    public boolean isSubimageSupported();

    /**
     * Load only a subsampled region of the image file.
     * 
     * @param ii the ImageInput
     * @param region the region
     * @param subsample the subsample
     * @throws FileOpException on error
     */
    public void loadSubimage(ImageInput ii, Rectangle region, int subsample) throws FileOpException;

    /**
     * Writes the current image to an OutputStream.
     * 
     * The image is encoded to the mime-type <code>mt</code> and sent to the
     * output stream <code>ostream</code>.
     * 
     * Currently only mime-types "image/jpeg" and "image/png" are supported.
     * 
     * @param mt
     *            mime-type of the image to be sent.
     * @param ostream
     *            OutputStream where the image is sent.
     * @throws ImageOpException
     *             Exception in other cases.
     * @throws FileOpException
     *             Exception on sending data
     */
    public void writeImage(String mt, OutputStream ostream) throws ImageOpException, FileOpException;

    /**
     * The width of the current image in pixel.
     * 
     * @return Image width in pixels.
     */
    public int getWidth();

    /**
     * The height of the current image in pixel.
     * 
     * @return Image height in pixels.
     */
    public int getHeight();

    /**
     * The size of the current image in pixel.
     * 
     * @return the ImageSize
     */
    public ImageSize getSize();

    /**
     * The mime-type of the image, i.e. the mime-type of the input that was
     * read.
     * 
     * @return String the mime-type of this image.
     */
    public String getMimetype();

    /**
     * Crops the current image.
     * 
     * Cuts out a region of the size <code>width</code> x <code>height</code> at
     * the offset <code>xoff</code>, <code>yoff</code> from the current image
     * and replaces the current image with the result.
     * 
     * @param xoff
     *            X offset of crop region
     * @param yoff
     *            Y offset of crop region
     * @param width
     *            width of crop region
     * @param height
     *            height of crop region
     * @throws ImageOpException on error
     */
    public void crop(int xoff, int yoff, int width, int height) throws ImageOpException;

    /**
     * Scales the current image.
     * 
     * Replaces the current image with an image scaled by the factor
     * <code>scale</code>.
     * 
     * @param scaleX the scaleX
     * @param scaleY the scaleY
     * @throws ImageOpException on error
     */
    public void scale(double scaleX, double scaleY) throws ImageOpException;

    /**
     * Crops and scales the current image.
     * 
     * The current image is cropped to a rectangle of <code>width</code>,
     * <code>height</code> at position <code>x_off</code>, <code>y_off</code>.
     * The resulting image is scaled by the factor <code>scale</code> using the
     * interpolation quality <code>qual</code> (0=worst).
     * 
     * @param x_off
     *            x offset of the crop rectangle in pixel.
     * @param y_off
     *            y offset of the crop rectangle in pixel.
     * @param width
     *            width of the crop rectangle in pixel.
     * @param height
     *            height of the crop rectangle in pixel.
     * @param scale
     *            scaling factor.
     * @param qual
     *            interpolation quality (0=worst).
     * @throws ImageOpException
     *             exception thrown on any error.
     */
    public void cropAndScale(int x_off, int y_off, int width, int height, double scale, int qual) throws ImageOpException;

    /**
     * Rotates the current image.
     * 
     * Replaces the current image with a rotated image. The image is rotated
     * around the center by the <code>angle</code> given in degrees [0, 360]
     * clockwise. Image size and aspect ratio are likely to change.
     * 
     * @param angle
     *            rotation angle in degree
     * @throws ImageOpException on error
     */
    public void rotate(double angle) throws ImageOpException;

    /**
     * Mirrors the current image.
     * 
     * Replaces the current image with a mirrored image. The mirror axis goes
     * through the center of the image and is rotated by <code>angle</code>
     * degrees. Currently only horizontal and vertical mirroring (0 and 90
     * degree) are supported.
     * 
     * @param angle
     *            angle of mirror axis
     * @throws ImageOpException on error
     */
    public void mirror(double angle) throws ImageOpException;

    /**
     * Enhances brightness and contrast of the current image.
     * 
     * Replaces the current image with a brightness and contrast enhanced image.
     * Contrast is enhanced by multiplying the pixel value with the constant
     * <code>mult</code>. Brightness is enhanced by adding the constant
     * <code>add</code> to the pixel value. Operation: p1 = (p0*mult)+add.
     * 
     * @param mult
     *            multiplicative constant for contrast enhancement
     * @param add
     *            additive constant for brightness enhancement
     * @throws ImageOpException  on error
     */
    public void enhance(float mult, float add) throws ImageOpException;

    /**
     * Manipulates the colors of the current image.
     * 
     * Replaces the current image with a color modified image. For the red,
     * green and blue color channels all pixel values are multiplied by the
     * constant <code>m</code> and added to the constant <code>a</code>.
     * Operation: p1 = (p0*m)+a.
     * 
     * @param rgbm
     *            multiplicative constants for red, green, blue
     * @param rgba
     *            additive constant for red, green, blue
     * @throws ImageOpException  on error
     */
    public void enhanceRGB(float[] rgbm, float[] rgba) throws ImageOpException;

    /**
     * Operations for colorOps.
     * 
     * GRAYSCALE: cast color image to grayscale NTSC_GRAY: convert color image
     * to grayscale using NTSC formula INVERT: invert colors (every channel
     * separately) MAP_GRAY_BGR: false color image from grayscale (0: blue, 128:
     * green, 255: red)
     * 
     */
    public enum ColorOp {
        GRAYSCALE, NTSC_GRAY, INVERT, MAP_GRAY_BGR, BITONAL
    };

    /**
     * Changes the colors of the current image.
     * 
     * Changes the colors of the current image. Operations are instances of
     * ColorOp:
     * 
     * GRAYSCALE: cast color image to grayscale NTSC_GRAY: convert color image
     * to grayscale using NTSC formula INVERT: invert colors (every channel
     * separately) MAP_GRAY_BGR: false color image from grayscale (0: blue, 128:
     * green, 255: red)
     * 
     * @param op the ColorOp
     * @throws ImageOpException on error
     */
    public void colorOp(ColorOp op) throws ImageOpException;

    /**
     * Returns the interpolation quality.
     * 
     * @return int the quality
     */
    public int getQuality();

    /**
     * Sets the interpolation quality.
     * 
     * @param quality
     *            The quality to set
     */
    public void setQuality(int quality);

    /**
     * Frees all resources bound to the DocuImage.
     * 
     * Things that should be freed are image objects and open files.
     * 
     */
    public void dispose();

    /**
     * Check image size and type and store in ImageInput ii
     * 
     * @param ii the ImageInput
     * @return the ImageInput
     * @throws IOException on error
     */
    public ImageInput identify(ImageInput ii) throws IOException;

    /**
     * Returns the list of supported image formats.
     * 
     * @return the list of supported image formats
     */
    public Iterator<String> getSupportedFormats();

    /**
     * returns the underlying image as java.awt.Image (if possible, or null)
     * 
     * @return the Image
     */
    public java.awt.Image getAwtImage();
    
    /**
     * returns the version of the DocuImage implementation.
     * @return the version
     */
    public String getVersion();

    /**
     * Set implementation specific image hacks.
     * 
     * Sets static class members. Needs to be called only once per class.  
     * 
     * Format: comma separated key=value pairs (no spaces!).
     * 
     * @param hackString the hackString
     */
    public void setHacks(String hackString);
    
    /**
     * Set optional image specific hints with additional information.
     * 
     * @param key the key
     * @param value the value
     */
    public void setHint(String key, Object value);
    
    /**
     * Returns the image specific hint with the given key.
     * 
     * @param key the key
     * @return the hint
     */
    public Object getHint(String key);
}
