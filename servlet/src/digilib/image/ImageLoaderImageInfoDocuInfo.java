/* ImageLoaderImageInfoDocuInfo -- DocuInfo implementation using ImageInfo and ImageLoader API

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
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307 USA

 * Created on 11.06.2003
 */
package digilib.image;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.util.Iterator;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.apache.log4j.Logger;
import org.marcoschmidt.image.ImageInfo;

import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageFile;
import digilib.io.ImageFileset;

/**
 * @author casties
 *
 */
public class ImageLoaderImageInfoDocuInfo implements DocuInfo {
	
	private Logger logger = Logger.getLogger(this.getClass());

	/* check image size and type and store in ImageFile f */
	public boolean checkFile(ImageFile imgf) throws IOException {
		// fileset to store the information
		ImageFileset imgfs = imgf.getParent();
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
		logger.debug("identifying (ImageInfo) "+f);
		// try with ImageInfo first
		if (iif.check()) {
			ImageSize d =
				new ImageSize(iif.getWidth(), iif.getHeight());
			imgf.setSize(d);
			imgf.setMimetype(iif.getMimeType());
			if (imgfs != null) {
				imgfs.setAspect(d);
			}
			raf.close();
		} else {
			logger.debug("identifying (ImageIO) "+f);
			// else use ImageReader
			ImageInputStream istream = ImageIO.createImageInputStream(raf);
			Iterator readers = ImageIO.getImageReaders(istream);
			//String ext = f.getName().substring(f.getName().lastIndexOf('.')+1);
			//Iterator readers = ImageIO.getImageReadersBySuffix(ext);
			if (! readers.hasNext()) {
				throw new FileOpException("ERROR: unknown image file format!");
			}
			ImageReader reader = (ImageReader) readers.next();
			/* are there more readers? */
			logger.debug("ImageIO: this reader: " + reader.getClass());
			while (readers.hasNext()) {
				logger.debug("ImageIO: next reader: " + readers.next().getClass());
			}
			reader.setInput(istream);
			ImageSize d =
				new ImageSize(reader.getWidth(0), reader.getHeight(0));
			imgf.setSize(d);
			String t = reader.getFormatName();
			t = FileOps.mimeForFile(f);
			imgf.setMimetype(t);
			if (imgfs != null) {
				imgfs.setAspect(d);
			}
			// dispose the reader to free resources
			reader.dispose();
			raf.close();
		}
		return true;
	}

}
