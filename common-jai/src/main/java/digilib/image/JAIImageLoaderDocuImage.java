package digilib.image;

/*
 * #%L
 * JAIImageLoaderDocuImage -- Image class implementation using JAI's ImageLoader Plugin
 * %%
 * Copyright (C) 2002 - 2013 Robert Casties (robcast@mail.berlios.de)
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
 */

import java.awt.Image;
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
import javax.imageio.stream.FileImageInputStream;
import javax.imageio.stream.ImageInputStream;
import javax.media.jai.JAI;

import digilib.io.FileOpException;
import digilib.io.ImageInput;
import digilib.util.ImageSize;

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

    /* returns the size of the current image */
    public ImageSize getSize() {
        ImageSize is = null;
        // TODO: can we cache imageSize?
        int h = 0;
        int w = 0;
        try {
            if (img == null) {
                // get size from ImageReader
                h = reader.getHeight(0);
                w = reader.getWidth(0);
            } else {
                // get size from image
                h = img.getHeight();
                w = img.getWidth();
            }
            is = new ImageSize(w, h);
        } catch (IOException e) {
            logger.debug("error in getSize:", e);
        }
        return is;
    }


	/* Load an image file into the Object. */
	public void loadImage(ImageInput ii) throws FileOpException {
		logger.debug("loadImage: "+ii);
		if (ii.hasImageInputStream()) {
			img = JAI.create("ImageRead", ii.getImageInputStream());
		} else if (ii.hasFile()) {
			img = JAI.create("ImageRead", ii.getFile().getAbsolutePath());
		}
		if (img == null) {
			throw new FileOpException("Unable to load File!");
		}
	}

	/* Get an ImageReader for the image file. */
	public ImageReader getReader(ImageInput input) throws IOException {
        logger.debug("get ImageReader for " + input);
        if (this.reader != null) {
            if (this.input == input) {
                // it was the same input
                logger.debug("reusing Reader");
                return reader;
            }
            // clean up old reader
            logger.debug("cleaning Reader!");
            dispose();
        }
        this.input = input;
        ImageInputStream istream = null;
        if (input.hasImageInputStream()) {
            // stream input
            istream = input.getImageInputStream();
        } else if (input.hasFile()) {
            // file only input
            RandomAccessFile rf = new RandomAccessFile(input.getFile(), "r");
            istream = new FileImageInputStream(rf);
        } else {
            throw new FileOpException("Unable to get data from ImageInput");
        }
        Iterator<ImageReader> readers;
        String mt = input.getMimetype();
        if (mt == null) {
            logger.debug("No mime-type. Trying automagic.");
            readers = ImageIO.getImageReaders(istream);
        } else {
            logger.debug("File type:" + mt);
            readers = ImageIO.getImageReadersByMIMEType(mt);
        }
        if (!readers.hasNext()) {
            throw new FileOpException("Can't find Reader to load File!");
        }
        reader = readers.next();
        logger.debug("ImageIO: this reader: " + reader.getClass());
        /* are there more readers? */
        /* while (readers.hasNext()) {
            logger.debug("ImageIO: next reader: " + readers.next().getClass());
        } */
        reader.setInput(istream);
        return reader;
	}

	/* Load an image file into the Object. */
	public void loadSubimage(ImageInput ii, Rectangle region, int prescale)
		throws FileOpException {
		logger.debug("loadSubimage: "+ii.getFile());
		//System.gc();
		try {
			if ((reader == null) || (imgFile != ii.getFile())) {
				getReader(ii);
			}
			ImageReadParam readParam = reader.getDefaultReadParam();
			readParam.setSourceRegion(region);
			readParam.setSourceSubsampling(prescale, prescale, 0, 0);
			img = reader.read(0, readParam);
			/* JAI imageread seems to ignore the readParam :-(
			ImageInputStream istream = (ImageInputStream) reader.getInput();
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
		imgFile = ii.getFile();
	}


	/* Write the current image to an OutputStream. */
	public void writeImage(String mt, OutputStream ostream)
		throws ImageOpException, FileOpException {
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
				throw new ImageOpException("Unknown mime type: " + mt);
			}
			// render output
			JAI.create("ImageWrite", pb3);
		} catch (RuntimeException e) {
			throw new FileOpException("Error writing image.");
		}
	}

	@Override
    public Image getAwtImage() {
        // TODO Auto-generated method stub
        return (Image) img;
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
