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
import java.io.RandomAccessFile;
import java.util.Iterator;

import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import javax.media.jai.JAI;

import digilib.io.ImageFile;
import digilib.io.FileOpException;

/** DocuImage implementation using the Java Advanced Imaging API and the ImageLoader
 * API of Java 1.4.
 */
public class JAIImageLoaderDocuImage extends JAIDocuImage {

	/** ImageIO image reader */
	protected ImageReader reader;
	/** current image file */
	protected File imgFile;

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
			logger.debug("error in getHeight", e);
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
			logger.debug("error in getHeight", e);
		}
		return w;
	}

	/* Load an image file into the Object. */
	public void loadImage(ImageFile f) throws FileOpException {
		logger.debug("loadImage: "+f.getFile());
		//System.gc();
		img = JAI.create("ImageRead", f.getFile().getAbsolutePath());
		if (img == null) {
			throw new FileOpException("Unable to load File!");
		}
	}

	/* Get an ImageReader for the image file. */
	public void preloadImage(ImageFile f) throws IOException {
		logger.debug("preloadImage: "+f.getFile());
		//System.gc();
		RandomAccessFile rf = new RandomAccessFile(f.getFile(), "r");
		ImageInputStream istream = ImageIO.createImageInputStream(rf);
		//Iterator readers = ImageIO.getImageReaders(istream);
		Iterator readers = ImageIO.getImageReadersByMIMEType(f.getMimetype());
		reader = (ImageReader) readers.next();
		if (reader == null) {
			throw new FileOpException("Unable to load File!");
		}
		logger.debug("JAIImageIO: this reader: " + reader.getClass());
		reader.setInput(istream);
	}

	/* Load an image file into the Object. */
	public void loadSubimage(ImageFile f, Rectangle region, int prescale)
		throws FileOpException {
		logger.debug("loadSubimage: "+f.getFile());
		//System.gc();
		try {
			if ((reader == null) || (imgFile != f.getFile())) {
				preloadImage(f);
			}
			ImageInputStream istream = (ImageInputStream) reader.getInput();
			ImageReadParam readParam = reader.getDefaultReadParam();
			readParam.setSourceRegion(region);
			readParam.setSourceSubsampling(prescale, prescale, 0, 0);
			img = reader.read(0, readParam);
			/* JAI imageread seems to ignore the readParam :-(
			ParameterBlockJAI pb = new ParameterBlockJAI("imageread");
			pb.setParameter("Input", istream);
			pb.setParameter("ReadParam", readParam);
			pb.setParameter("Reader", reader);
			img = JAI.create("imageread", pb);
			*/
		} catch (IOException e) {
			throw new FileOpException("Unable to load File!");
		}
		if (img == null) {
			throw new FileOpException("Unable to load File!");
		}
		imgFile = f.getFile();
	}


	/* Write the current image to an OutputStream. */
	public void writeImage(String mt, OutputStream ostream)
		throws FileOpException {
		logger.debug("writeImage");
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
				throw new FileOpException("Unknown mime type: " + mt);
			}
			// render output
			JAI.create("ImageWrite", pb3);
		} catch (IOException e) {
			throw new FileOpException("Error writing image.");
		}
	}

	/* (non-Javadoc)
	 * @see java.lang.Object#finalize()
	 */
	protected void finalize() throws Throwable {
		dispose();
		super.finalize();
	}

	public void dispose() {
		// we must dispose the ImageReader because it keeps the filehandle open!
		reader.dispose();
		reader = null;
		img = null;
	}

}
