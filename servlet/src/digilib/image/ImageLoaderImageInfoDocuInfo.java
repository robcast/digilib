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

import ImageInfo;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.util.Iterator;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import digilib.io.DocuFile;
import digilib.io.FileOpException;
import digilib.io.FileOps;

/**
 * @author casties
 *
 */
public class ImageLoaderImageInfoDocuInfo implements DocuInfo {

	/* check image size and type and store in DocuFile f */
	public boolean checkFile(DocuFile f) throws IOException {
		RandomAccessFile raf = new RandomAccessFile(f.getFile(), "r");
		// set up ImageInfo object
		ImageInfo iif = new ImageInfo();
		iif.setInput(raf);
		iif.setCollectComments(false);
		iif.setDetermineImageNumber(false);
		// try with ImageInfo first
		if (iif.check()) {
			ImageSize d =
				new ImageSize(iif.getWidth(), iif.getHeight());
			f.setSize(d);
			f.setMimetype(iif.getMimeType());
			raf.close();
		} else {
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
			System.out.println("this reader: " + reader.getClass());
			while (readers.hasNext()) {
				System.out.println("next reader: " + readers.next().getClass());
			}
			reader.setInput(istream);
			ImageSize d =
				new ImageSize(reader.getWidth(0), reader.getHeight(0));
			f.setSize(d);
			String t = reader.getFormatName();
			t = FileOps.mimeForFile(f.getFile());
			f.setMimetype(t);
			// dispose the reader to free resources
			reader.dispose();
		}
		return true;
	}

}
