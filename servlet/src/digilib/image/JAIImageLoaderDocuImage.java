/* JAIImageLoaderDocuImage -- Image class implementation using JAI's ImageLoader Plugin

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
import java.awt.image.renderable.ParameterBlock;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Iterator;

import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import javax.media.jai.JAI;

import com.sun.media.jai.operator.ImageReadDescriptor;

import digilib.io.FileOpException;

/** DocuImage implementation using the Java Advanced Imaging API and the ImageLoader
 * API of Java 1.4.
 */
public class JAIImageLoaderDocuImage extends JAIDocuImage {

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

	/* Load an image file into the Object. */
	public void loadImage(File f) throws FileOpException {
		System.gc();
		img = JAI.create("ImageRead", f.getAbsolutePath());
		if (img == null) {
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
			ImageInputStream istream = (ImageInputStream) reader.getInput();
			ImageReadParam readParam = reader.getDefaultReadParam();
			readParam.setSourceRegion(region);
			readParam.setSourceSubsampling(prescale, prescale, 0, 0);
			/* Parameter for ImageRead operation:
				Input, ImageChoice, ReadMetadata, ReadThumbnails, VerifyInput,
				Listeners, Locale, ReadParam, Reader, RenderingHints
			 */
			img =
				ImageReadDescriptor.create(
					istream,
					new Integer(0),
					Boolean.TRUE,
					Boolean.FALSE,
					Boolean.FALSE,
					null,
					null,
					readParam,
					reader,
					null);
		} catch (IOException e) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
		if (img == null) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
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

	/* Write the current image to an OutputStream. */
	public void writeImage(String mt, OutputStream ostream)
		throws FileOpException {
		try {
			// setup output
			ParameterBlock pb3 = new ParameterBlock();
			pb3.addSource(img);
			pb3.add(ostream);
			if (mt == "image/jpeg") {
				pb3.add("JPEG");
			} else if (mt == "image/png") {
				pb3.add("PNG");
			} else {
				// unknown mime type
				util.dprintln(2, "ERROR(writeImage): Unknown mime type " + mt);
				throw new FileOpException("Unknown mime type: " + mt);
			}
			// render output
			JAI.create("ImageWrite", pb3);

		} catch (IOException e) {
			throw new FileOpException("Error writing image.");
		}
	}

}
