/* ImageLoaderDocuImage -- Image class implementation using JDK 1.4 ImageLoader

  Digital Image Library servlet components

  Copyright (C) 2002, 2003 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*/

package digilib.image;

import java.awt.Rectangle;
import java.awt.geom.AffineTransform;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.awt.image.RescaleOp;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Iterator;

import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import digilib.io.FileOpException;

/** Implementation of DocuImage using the ImageLoader API of Java 1.4 and Java2D. */
public class ImageLoaderDocuImage extends DocuImageImpl {

	private BufferedImage img;

	private int interpol;

	// ImageIO image reader
	ImageReader reader;

	/* preload is supported. */
	public boolean isPreloadSupported() {
		return true;
	}

	/* loadSubimage is supported. */
	public boolean isSubimageSupported() {
		return true;
	}

	public void setQuality(int qual) {
		quality = qual;
		// setup interpolation quality
		if (qual > 0) {
			util.dprintln(4, "quality q1");
			interpol = AffineTransformOp.TYPE_BILINEAR;
		} else {
			util.dprintln(4, "quality q0");
			interpol = AffineTransformOp.TYPE_NEAREST_NEIGHBOR;
		}
	}
	
	public int getHeight() {
		int h = 0;
		try {
			if (img == null) {
				h = reader.getHeight(0);
			} else {
				h = img.getHeight();
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return h;
	}

	public int getWidth() {
		int w = 0;
		try {
			if (img == null) {
				w = reader.getWidth(0);
			} else {
				w = img.getWidth();
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return w;
	}

	/**
	 *  load image file
	 */
	public void loadImage(File f) throws FileOpException {
		util.dprintln(10, "loadImage!");
		System.gc();
		try {
			img = ImageIO.read(f);
			if (img == null) {
				util.dprintln(3, "ERROR(loadImage): unable to load file");
				throw new FileOpException("Unable to load File!");
			}
		} catch (IOException e) {
			throw new FileOpException("Error reading image.");
		}
	}

	/* Get an ImageReader for the image file. */
	public void preloadImage(File f) throws FileOpException {
		System.gc();
		try {
			ImageInputStream istream = ImageIO.createImageInputStream(f);
			Iterator readers = ImageIO.getImageReaders(istream);
			reader = (ImageReader) readers.next();
			reader.setInput(istream);
		} catch (IOException e) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!" + e);
		}
		if (reader == null) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
	}

	/* Load an image file into the Object. */
	public void loadSubimage(File f, Rectangle region, int prescale)
		throws FileOpException {
		System.gc();
		try {
			if (reader == null) {
				preloadImage(f);
			}
			// set up reader parameters
			ImageReadParam readParam = reader.getDefaultReadParam();
			readParam.setSourceRegion(region);
			readParam.setSourceSubsampling(prescale, prescale, 0, 0);
			// read image
			img = reader.read(0, readParam);
		} catch (IOException e) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
		if (img == null) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
	}

	/**
	 *  write image of type mt to Stream
	 */
	public void writeImage(String mt, OutputStream ostream)
		throws FileOpException {
		util.dprintln(10, "writeImage!");
		try {
			// setup output
			String type = "png";
			if (mt == "image/jpeg") {
				type = "jpeg";
			} else if (mt == "image/png") {
				type = "png";
			} else {
				// unknown mime type
				util.dprintln(2, "ERROR(writeImage): Unknown mime type " + mt);
				throw new FileOpException("Unknown mime type: " + mt);
			}
			// render output
			if (ImageIO.write(img, type, ostream)) {
				// writing was OK
				return;
			} else {
				throw new FileOpException("Error writing image: Unknown image format!");
			}
		} catch (IOException e) {
			// e.printStackTrace();
			throw new FileOpException("Error writing image.");
		}
	}

	public void scale(double scale) throws ImageOpException {
		// setup scale
		AffineTransformOp scaleOp =
			new AffineTransformOp(
				AffineTransform.getScaleInstance(scale, scale),
				interpol);
		BufferedImage scaledImg = scaleOp.filter(img, null);

		if (scaledImg == null) {
			util.dprintln(2, "ERROR(cropAndScale): error in scale");
			throw new ImageOpException("Unable to scale");
		}
		img = scaledImg;
	}

	public void crop(int x_off, int y_off, int width, int height)
		throws ImageOpException {
		// setup Crop
		BufferedImage croppedImg = img.getSubimage(x_off, y_off, width, height);

		util.dprintln(
			3,
			"CROP:" + croppedImg.getWidth() + "x" + croppedImg.getHeight());
		//DEBUG
		//    util.dprintln(2, "  time "+(System.currentTimeMillis()-startTime)+"ms");

		if (croppedImg == null) {
			util.dprintln(2, "ERROR(cropAndScale): error in crop");
			throw new ImageOpException("Unable to crop");
		}
		img = croppedImg;
	}

	public void enhance(double mult, double add) throws ImageOpException {
		/* The number of constants must match the number of bands in the image.
		 * We only handle 1 (greyscale) or 3 (RGB) bands.
		 */
		float[] dm;
		float[] da;
		int ncol = img.getColorModel().getNumColorComponents(); 
		if (ncol == 3) {
			float[] f1 = {(float)mult, (float)mult, (float)mult};
			dm = f1;
			float[] f2 = {(float)add, (float)add, (float)add};
			da = f2;
		} else if (ncol == 1) {
			float[] f1 = {(float)mult};
			dm = f1;
			float[] f2 = {(float)add};
			da = f2;
		} else {
			util.dprintln(2, "ERROR(enhance): unknown number of color bands ("+ncol+")");
			return;
		}
		RescaleOp scaleOp =
			new RescaleOp(
				dm, da,
				null);
		scaleOp.filter(img, img);

		/* Operation with only one constant should work regardless of the number of bands 
		 * according to the JDK spec.
		 * Doesn't work on JDK 1.4 for OSX PR10 (at least).
		 */
		/*
		RescaleOp scaleOp =
			new RescaleOp(
				(float)mult, (float)add,
				null);
		scaleOp.filter(img, img);
		*/
	}
	
	public void rotate(double angle) throws ImageOpException {
		// setup rotation
		double rangle = Math.toRadians(angle);
		double x = getWidth()/2;
		double y = getHeight()/2;
		AffineTransformOp rotOp =
			new AffineTransformOp(
				AffineTransform.getRotateInstance(rangle, x, y),
				interpol);
		BufferedImage rotImg = rotOp.filter(img, null);

		if (rotImg == null) {
			util.dprintln(2, "ERROR: error in rotate");
			throw new ImageOpException("Unable to rotate");
		}
		img = rotImg;
	}

	public void mirror(double angle) throws ImageOpException {
		// setup mirror
		double mx = 1;
		double my = 1;
		double tx = 0;
		double ty = 0;
		if (Math.abs(angle - 0) < epsilon) {
			// 0 degree
			mx = -1;
			tx = getWidth();
		} else if (Math.abs(angle - 90) < epsilon) {
			// 90 degree
			my = -1;
			ty = getHeight();
		} else if (Math.abs(angle - 180) < epsilon) {
			// 180 degree
			mx = -1;
			tx = getWidth();
		} else if (Math.abs(angle - 270) < epsilon) {
			// 270 degree
			my = -1;
			ty = getHeight();
		} else if (Math.abs(angle - 360) < epsilon) {
			// 360 degree
			mx = -1;
			tx = getWidth();
		}
		AffineTransformOp mirOp =
			new AffineTransformOp(
				new AffineTransform(mx, 0 , 0, my, tx, ty),
				interpol);
		BufferedImage mirImg = mirOp.filter(img, null);

		if (mirImg == null) {
			util.dprintln(2, "ERROR: error in mirror");
			throw new ImageOpException("Unable to mirror");
		}
		img = mirImg;
	}

}
