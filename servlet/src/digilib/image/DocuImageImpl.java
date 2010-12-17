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

import java.awt.Image;
import java.awt.Rectangle;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;

import org.apache.log4j.Logger;
import org.marcoschmidt.image.ImageInfo;

import digilib.io.FileOpException;
import digilib.io.ImageFile;

/** Simple abstract implementation of the <code>DocuImage</code> interface.
 *
 * This implementation provides basic functionality for the utility methods like
 * <code>SetUtils</code>, and <code>getKnownFileTypes</code>. Image methods like
 * <code>loadImage</code>, <code>writeImage</code>, <code>getWidth</code>,
 * <code>getHeight</code>, <code>crop</code> and <code>scale</code> must be
 * implemented by derived classes.
 */
public abstract class DocuImageImpl implements DocuImage {

	/** logger */
	protected static final Logger logger = Logger.getLogger(DocuImage.class);
	
	/** Interpolation quality. */
	protected int quality = 0;
	
	/** epsilon for float comparisons. */
	public final double epsilon = 1e-5;
	
	/** image mime-type */
	protected String mimeType = null;

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

    /** Check image size and type and store in ImageFile f */
    public static boolean identifyImg(ImageFile imgf) throws IOException {
    }

    /** Check image size and type and store in ImageFile f */
    public boolean identify(ImageFile imgf) throws IOException {
        // fileset to store the information
        File f = imgf.getFile();
        if (f == null) {
            throw new IOException("File not found!");
        }
        RandomAccessFile raf = new RandomAccessFile(f, "r");
        // set up ImageInfo object
        ImageInfo iif = new ImageInfo();
        iif.setInput(raf);
        iif.setCollectComments(false);
        iif.setDetermineImageNumber(false);
        logger.debug("identifying (ImageInfo) " + f);
        // try with ImageInfo first
        if (iif.check()) {
            ImageSize d = new ImageSize(iif.getWidth(), iif.getHeight());
            imgf.setSize(d);
            imgf.setMimetype(iif.getMimeType());
            //logger.debug("  format:"+iif.getFormatName());
            raf.close();
            logger.debug("image size: " + imgf.getSize());
            return true;
        }
        return false;
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

	public void loadSubimage(ImageFile f, Rectangle region, int subsample)
		throws FileOpException {
		// empty implementation
	}

	public void enhanceRGB(float[] rgbm, float[] rgba)
		throws ImageOpException {
		// emtpy implementation
	}

	public void dispose() {
		// emtpy implementation
	}

	public Iterator<String> getSupportedFormats() {
		List<String> empty = new LinkedList<String>();
		return empty.iterator();
	}

    public void crop(int xoff, int yoff, int width, int height)
            throws ImageOpException {
        // TODO Auto-generated method stub
        
    }

    public Image getAwtImage() {
        // TODO Auto-generated method stub
        return null;
    }

    public int getHeight() {
        // TODO Auto-generated method stub
        return 0;
    }

    public int getWidth() {
        // TODO Auto-generated method stub
        return 0;
    }

    public void loadImage(ImageFile f) throws FileOpException {
        // TODO Auto-generated method stub
        
    }

    public void scale(double scaleX, double scaleY) throws ImageOpException {
        // TODO Auto-generated method stub
        
    }

    public void writeImage(String mt, OutputStream ostream)
            throws FileOpException {
        // TODO Auto-generated method stub
    }
	
}
