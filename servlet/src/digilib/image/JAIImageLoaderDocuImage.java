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

import java.awt.Dimension;
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

import digilib.io.DocuFile;
import digilib.io.FileOpException;
import digilib.io.FileOps;

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

	/* Get an ImageReader for the image file. */
	public void preloadImage(File f) throws IOException {
		System.gc();
		RandomAccessFile rf = new RandomAccessFile(f, "r");
		ImageInputStream istream = ImageIO.createImageInputStream(rf);
		Iterator readers = ImageIO.getImageReaders(istream);
		reader = (ImageReader) readers.next();
		reader.setInput(istream);
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
			if ((reader == null) || (imgFile != f)) {
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
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
		if (img == null) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
		imgFile = f;
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

	/* (non-Javadoc)
	 * @see digilib.image.DocuImage#checkFile(digilib.io.DocuFile)
	 */
	public boolean checkFile(DocuFile f) throws IOException {
		// see if f is already loaded
		if ((reader == null) || (imgFile != f.getFile())) {
			preloadImage(f.getFile());
		}
		Dimension d = new Dimension();
		d.setSize(reader.getWidth(0), reader.getHeight(0));
		f.setSize(d);
		//	String t = reader.getFormatName();
		String t = FileOps.mimeForFile(f.getFile());
		f.setMimetype(t);
		f.setChecked(true);
		return true;
	}

	/* (non-Javadoc)
	 * @see java.lang.Object#finalize()
	 */
	protected void finalize() throws Throwable {
		//System.out.println("FIN de JAIImageLoaderDocuImage!");
		// we must dispose the ImageReader because it keeps the filehandle open!
		reader.dispose();
		reader = null;
		img = null;
		super.finalize();
	}

}
