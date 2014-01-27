package digilib.io;

/*
 * #%L
 * An ImageInput that uses a caching ImageStream.
 * %%
 * Copyright (C) 2011 - 2013 MPIWG Berlin
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
import java.io.InputStream;

import javax.imageio.ImageIO;
import javax.imageio.stream.ImageInputStream;

/**
 * @author casties
 *
 */
public class ImageCacheStream extends ImageStream {

    protected ImageInputStream iis = null;
    
    /** Create ImageCacheStream from InputStream and mime-type.
     * 
     * @param stream
     * @param mimeType
     * @throws IOException 
     */
    public ImageCacheStream(InputStream stream, String mimeType) throws IOException {
        super(stream, mimeType);
        /*
         * Type of stream backing configured via ImageIO.setUseCache(). 
         * [...] In general, it is preferable to
         * use a FileCacheImageInputStream when reading from a regular
         * InputStream. This class is provided for cases where it is not
         * possible to create a writable temporary file.
         */
        if (stream != null) {
            iis = ImageIO.createImageInputStream(stream);
        }
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.io.ImageInput#hasImageInputStream()
     */
    @Override
    public boolean hasImageInputStream() {
        return true;
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.io.ImageInput#getImageInputStream()
     */
    @Override
    public ImageInputStream getImageInputStream() {
        return iis;
    }

    /* (non-Javadoc)
     * @see digilib.io.ImageStream#setInputStream(java.io.InputStream)
     */
    @Override
    public void setInputStream(InputStream stream) {
        super.setInputStream(stream);
        if (stream != null) {
            try {
                iis = ImageIO.createImageInputStream(stream);
            } catch (IOException e) {
                // nothing to do, really.
            }
        }
    }

}
