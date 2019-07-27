package digilib.io;

/*
 * #%L
 * ImageInput-- digilib image input interface.
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2010 - 2013 MPIWG Berlin
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
 * Created on 20.12.2010
 */

import java.io.File;
import java.io.InputStream;

import javax.imageio.stream.ImageInputStream;

import digilib.util.ImageSize;

public abstract class ImageInput {

	// mime file type
	protected String mimetype = null;
	// image size in pixels
	protected ImageSize pixelSize = null;
    protected ImageSet parent = null;

	/**
	 * @return ImageSize
	 */
	public ImageSize getSize() {
		return pixelSize;
	}

	/**
	 * Sets the imageSize.
	 * @param imageSize The imageSize to set
	 */
	public void setSize(ImageSize imageSize) {
		this.pixelSize = imageSize;
	}

    /** returns if mimetype has been set.
     * 
     * @return String
     */
    public boolean hasMimetype() {
        return (mimetype != null);
    }

    /**
	 * @return String
	 */
	public String getMimetype() {
		return mimetype;
	}

	/**
	 * Sets the mimetype.
	 * @param filetype The mimetype to set
	 */
	public void setMimetype(String filetype) {
		this.mimetype = filetype;
	}

	/** returns if this image has been checked 
	 * (i.e. has size and mimetype)
	 * TODO: deprecated
	 * @return is checked
	 */
	public boolean isChecked() {
		return (pixelSize != null);
	}
	
	/** Returns the aspect ratio of the image (width/height).
	 * 
	 * @return the aspect ratio
	 */
	public float getAspect() {
		return (pixelSize != null) ? pixelSize.getAspect() : 0f;
	}
	
    /**
     * @return ImageSet
     */
    public ImageSet getParent() {
        return parent;
    }

    /**
     * Sets the parent.
     * @param parent The parent to set
     */
    public void setParent(ImageSet parent) {
        this.parent = parent;
    }

    /** Returns if the input can be returned as ImageInputStream.
	 * 
	 * @return has ImageInputStream
	 */
	public boolean hasImageInputStream() {
		return false;
	}
	
	/** Returns the input as ImageInputStream (if available)
	 * 
	 * @return the ImageInputStream
	 */
	public ImageInputStream getImageInputStream() {
		return null;
	}
	
    /** Returns if the input can be returned as InputStream.
     * 
     * @return has InputStream
     */
    public boolean hasInputStream() {
        return false;
    }
    
    /** Returns the input as InputStream (if available)
     * 
     * @return the InputStream
     */
    public InputStream getInputStream() {
        return null;
    }
    
	/** Returns if the input can be returned as File.
	 * 
	 * @return has File
	 */
	public boolean hasFile() {
		return false;
	}
	
	/** Returns the input as File (if available)
	 * 
	 * @return the File
	 */
	public File getFile() {
		return null;
	}

	
	
}
