package digilib.image;

/*
 * #%L
 * Implementation of DocuImage using ImageJ version 1.
 * %%
 * Copyright (C) 2012 - 2013 MPIWG Berlin
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

import ij.IJ;
import ij.ImagePlus;
import ij.plugin.JpegWriter;
import ij.plugin.PNG_Writer;
import ij.process.ImageProcessor;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.Iterator;

import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageInput;
import digilib.util.ImageSize;

/** Implementation of DocuImage using ImageJ version 1.
 *  
 * @author casties
 *
 */
public class ImageJ1DocuImage extends ImageInfoDocuImage {

	protected ImagePlus img;
	protected ImageProcessor proc;

	/* returns a list of supported image formats */
	public Iterator<String> getSupportedFormats() {
		String[] formats = new String[] {"JPG","PNG","TIFF"};
		return Arrays.asList(formats).iterator();
	}

    /* Check image size and type and store in ImageInput */
    public ImageInput identify(ImageInput input) throws IOException {
        // try parent method first
        ImageInput ii = super.identify(input);
        if (ii != null) {
        	return ii;
        }
        logger.debug("identifying (ImageJ1) " + input);
        String path = input.getFile().getAbsolutePath();
        img = IJ.openImage(path);
        // set size
        ImageSize d = new ImageSize(img.getWidth(), img.getHeight());
        input.setSize(d);
        // set mime type
        if (input.getMimetype() == null) {
        	String t = FileOps.mimeForFile(input.getFile());
        	input.setMimetype(t);
        }
        return input;
    }

    /* (non-Javadoc)
	 * @see digilib.image.DocuImageImpl#loadImage(digilib.io.ImageInput)
	 */
	@Override
	public void loadImage(ImageInput ii) throws FileOpException {
		this.input = ii;
		String path = ii.getFile().getAbsolutePath();
		img = IJ.openImage(path);
		proc = img.getProcessor();
	}

	/* (non-Javadoc)
	 * @see digilib.image.DocuImageImpl#crop(int, int, int, int)
	 */
	@Override
	public void crop(int xoff, int yoff, int width, int height)
			throws ImageOpException {
		proc.setRoi(xoff, yoff, width, height);
		ImageProcessor croppedProc = proc.crop();
		proc = croppedProc;
	}

	/* (non-Javadoc)
	 * @see digilib.image.DocuImageImpl#scale(double, double)
	 */
	@Override
	public void scale(double scaleX, double scaleY) throws ImageOpException {
		int newWidth = (int) Math.round(proc.getWidth() * scaleX); 
		int newHeight = (int) Math.round(proc.getHeight() * scaleY);
		ImageProcessor scaledProc = proc.resize(newWidth, newHeight, false);
		proc = scaledProc;
	}

	/* (non-Javadoc)
	 * @see digilib.image.DocuImageImpl#writeImage(java.lang.String, java.io.OutputStream)
	 */
	@Override
	public void writeImage(String mt, OutputStream ostream)
			throws ImageOpException, FileOpException {
		File outFile;
		String filext = ".jpg"; 
		if (mt.equals("image/png")) {
			filext = ".png";
		}
		try {
			outFile = File.createTempFile("imgj_temp", filext);
		} catch (IOException e) {
			throw new FileOpException(e.toString());
		}
		// save image to file
		logger.debug("writeImage: mt="+mt);
		if (mt.equals("image/png")) {
			PNG_Writer writer = new PNG_Writer();
			try {
				img = new ImagePlus("Image", proc);
				writer.writeImage(img, outFile.getAbsolutePath(), 0);
			} catch (Exception e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		} else {
			img = new ImagePlus("Image", proc);
			JpegWriter.save(img, outFile.getAbsolutePath(), 70);
		}
		// now send file
        FileInputStream inFile = null;
		try {
            inFile = new FileInputStream(outFile);
            byte dataBuffer[] = new byte[4096];
            int len;
            while ((len = inFile.read(dataBuffer)) != -1) {
                // copy out file
                ostream.write(dataBuffer, 0, len);
            }
        } catch (IOException e) {
			throw new FileOpException(e.toString());
		} finally {
            try {
                if (inFile != null) {
                    inFile.close();
                }
            } catch (IOException e) {
                // nothing to do
            }
        }
	}

}
