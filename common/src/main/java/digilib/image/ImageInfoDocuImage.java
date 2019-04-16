package digilib.image;

/*
 * #%L
 * 
 * Simple abstract implementation of the <code>DocuImage</code> interface.
 * 
 * Implements only the identify method using the ImageInfo class.
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

import java.io.IOException;
import java.io.RandomAccessFile;

import org.devlib.schmidt.imageinfo.ImageInfo;

import digilib.io.ImageInput;
import digilib.util.ImageSize;

/** 
 * Simple abstract implementation of the <code>DocuImage</code> interface.
 * Implements only the identify method using the ImageInfo class.
 * 
 * @author casties
 *
 */
public abstract class ImageInfoDocuImage extends DocuImageImpl {

    /* Check image size and type and store in ImageFile f */
    public ImageInput identify(ImageInput ii) throws IOException {
        logger.debug("identifying (ImageInfo) " + ii);
        if (ii.hasMimetype()) {
            if (ii.getMimetype().equals("image/tiff")) {
                logger.debug("ImageInfo unable to identify TIFF.");
                return null;
            }
        }
        RandomAccessFile raf = null;
        try {
            // set up ImageInfo object
            ImageInfo iif = new ImageInfo();
            if (ii.hasImageInputStream()) {
                iif.setInput(ii.getImageInputStream());
            } else if (ii.hasFile()) {
                raf = new RandomAccessFile(ii.getFile(), "r");
                iif.setInput(raf);
            } else {
                return null;
            }
            iif.setCollectComments(false);
            iif.setDetermineImageNumber(false);
            // try with ImageInfo first
            if (iif.check()) {
                ImageSize d = new ImageSize(iif.getWidth(), iif.getHeight());
                ii.setSize(d);
                String mt = iif.getMimeType();
                // fix image/pjpeg
                if (mt.equals("image/pjpeg")) {
                    mt = "image/jpeg";
                }
                ii.setMimetype(mt);
                logger.debug("image size: " + ii.getSize());
                return ii;
            }
        } catch (Exception e) {
            logger.debug("ImageInfo unable to identify.", e);
        } finally {
            // close file, don't close stream(?)
            if (raf != null) {
                raf.close();
            }
        }
        return null;
    }
        

}
