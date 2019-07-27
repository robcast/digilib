package digilib.io;

/*
 * #%L
 * ImageInput backed by an InputStream.
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

import java.io.InputStream;

/**
 * @author casties
 * 
 */
public class ImageStream extends ImageInput {

    protected InputStream stream = null;

    /** Create ImageStream from InputStream and String.
     * 
     * @param stream the InputStream
     * @param mimeType the mime-type
     */
    public ImageStream(InputStream stream, String mimeType) {
        this.stream = stream;
        this.mimetype = mimeType;
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.io.ImageInput#hasInputStream()
     */
    @Override
    public boolean hasInputStream() {
        return true;
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.io.ImageInput#getInputStream()
     */
    @Override
    public InputStream getInputStream() {
        return stream;
    }

    /**
     * @param stream the stream to set
     */
    public void setInputStream(InputStream stream) {
        this.stream = stream;
    }

}
