package digilib.image;

/*-
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2001 - 2020 digilib Community
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

import digilib.io.FileOpException;

/**
 * @author casties
 *
 */
public class ImageOutputException extends FileOpException {

    private static final long serialVersionUID = 4532389232535750471L;

    /**
     * 
     */
    public ImageOutputException() {
    }

    /**
     * @param message
     */
    public ImageOutputException(String message) {
        super(message);
    }

    /**
     * @param message
     * @param cause
     */
    public ImageOutputException(String message, Throwable cause) {
        super(message, cause);
    }

}
