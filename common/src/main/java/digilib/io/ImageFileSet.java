package digilib.io;

/*
 * #%L
 * ImageSet collecting ImageFiles at different resolutions.
 * %%
 * Copyright (C) 2003 - 2013 MPIWG Berlin
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

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;

import digilib.io.FileOps.FileClass;
import digilib.meta.FileMeta;
import digilib.meta.MetaFactory;
import digilib.meta.MetadataMap;

/**
 * ImageSet using ImageFiles filled from an array of scaled Directories.
 * 
 * @author casties
 *
 */
public class ImageFileSet extends ImageSet implements DocuDirent {

    /** this is an image file */
    protected static FileClass fileClass = FileClass.IMAGE;
    /** the (main) file */
    protected File file = null;
    /** the file name */
    protected String name = null;
    /** the FileMeta instance */
    protected FileMeta meta = null;
	/** is our metadata valid */
	protected boolean metaChecked = false;
	/** the parent DocuDirectory */
	protected DocuDirectory parent = null;
    
    /**
     * Constructor with a File and Directories.
     * 
     * @param file the File
     * @param scaleDirs the Directories
     */
    public ImageFileSet(File file, FsDirectory[] scaleDirs) {
        int nb = scaleDirs.length;
        list = new ArrayList<ImageInput>(nb);
        this.file = file;
        name = file.getName();
        meta = MetaFactory.getFileMetaInstance();
        fill(scaleDirs, file);
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#getName()
     */
    public String getName() {
    	return this.name;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#getParent()
     */
    public DocuDirectory getParent() {
    	return this.parent;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#setParent(digilib.io.Directory)
     */
    public void setParent(DocuDirectory parent) {
    	this.parent = parent;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#isMetaChecked()
     */
    public boolean isMetaChecked() {
    	return this.metaChecked;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#compareTo(java.lang.Object)
     */
    public int compareTo(Object arg0) {
		if (arg0 instanceof DocuDirent) {
		    return name.compareTo(((DocuDirent) arg0).getName());
		} else {
		    return getName().compareTo((String) arg0);
		}
    }

    /**
     * Get the default File.
     * @return the File
     */
    public File getFile() {
        return file;
    }

    /**
     * Fill the ImageSet with files from an array of base directories.
     * 
     * 
     * @param scaleDirs
     *            array of base directories
     * @param fl
     *            file (from first base dir)
     *  
     */
    protected synchronized void fill(FsDirectory[] scaleDirs, File fl) {
    	String fn = fl.getName();
    	String baseFn = FileOps.basename(fn);
    	// add the first ImageFile to the ImageSet
    	add(new ImageFile(fl, this, scaleDirs[0]));
    	// iterate the remaining base directories
    	for (int i = 1; i < scaleDirs.length; ++i) {
    	    FsDirectory dir = scaleDirs[i];
    		if (dir == null) {
    			continue;
    		}
    		// read the directory
    		if (dir.getFilenames() == null) {
    			dir.readDir();
    		}
    		String[] dirFiles = dir.getFilenames();
    		// try the same filename as the original
    		int fileIdx = Arrays.binarySearch(dirFiles, fn);
    		if (fileIdx < 0) {
    			// try closest matches without extension
    			fileIdx = -fileIdx - 1;
    			// try idx
    			if ((fileIdx < dirFiles.length)
    					&& (FileOps.basename(dirFiles[fileIdx]).equals(baseFn))) {
    				// idx ok
    			} else if ((fileIdx > 0)
						&& (FileOps.basename(dirFiles[fileIdx - 1]).equals(baseFn))) {
    				// idx-1 ok
    				fileIdx = fileIdx - 1;
    			} else if ((fileIdx+1 < dirFiles.length)
						&& (FileOps.basename(dirFiles[fileIdx + 1]).equals(baseFn))) {
	   				// idx+1 ok
    				fileIdx = fileIdx + 1;
    			} else {
    				// basename doesn't match
    				continue;
    			}
    		}
    		if (FileOps.classForFilename(dirFiles[fileIdx]) == fileClass) {
    			/* logger.debug("adding file " + dirFiles[fileIdx]
    					+ " to Fileset " + this.getName()); */
    			add(new ImageFile(dirFiles[fileIdx], this, dir));
    		}
    	}
    }

    /**
     * Checks metadata and sets resolution in resX and resY.
     *  
     */
    public void checkMeta() {
        if (metaChecked) {
            return;
        }
        // have the FileMeta class load and check
        meta.checkMeta(this);
        metaChecked = true;
        // take the metadata
        MetadataMap fileMeta = meta.getFileMeta();
        if (fileMeta == null) return;
        // process the metadata
        float dpi = 0;
        float dpix = 0;
        float dpiy = 0;
        float sizex = 0;
        float sizey = 0;
        float pixx = 0;
        float pixy = 0;
        // DPI is valid for X and Y
        if (fileMeta.containsKey("original-dpi")) {
            try {
                dpi = Float.parseFloat((String) fileMeta.get("original-dpi"));
            } catch (NumberFormatException e) {
            }
            if (dpi != 0) {
                resX = dpi;
                resY = dpi;
                return;
            }
        }
        // DPI-X and DPI-Y
        if (fileMeta.containsKey("original-dpi-x")
                && fileMeta.containsKey("original-dpi-y")) {
            try {
				dpix = Float.parseFloat((String) fileMeta.get("original-dpi-x"));
				dpiy = Float.parseFloat((String) fileMeta.get("original-dpi-y"));
            } catch (NumberFormatException e) {
            }
            if ((dpix != 0) && (dpiy != 0)) {
                resX = dpix;
                resY = dpiy;
                return;
            }
        }
        // SIZE-X and SIZE-Y and PIXEL-X and PIXEL-Y
        if (fileMeta.containsKey("original-size-x")
                && fileMeta.containsKey("original-size-y")
                && fileMeta.containsKey("original-pixel-x")
                && fileMeta.containsKey("original-pixel-y")) {
            try {
				sizex = Float.parseFloat((String) fileMeta.get("original-size-x"));
				sizey = Float.parseFloat((String) fileMeta.get("original-size-y"));
				pixx = Float.parseFloat((String) fileMeta.get("original-pixel-x"));
				pixy = Float.parseFloat((String) fileMeta.get("original-pixel-y"));
            } catch (NumberFormatException e) {
            }
            if ((sizex != 0) && (sizey != 0) && (pixx != 0) && (pixy != 0)) {
                resX = pixx / (sizex * 100 / 2.54f);
                resY = pixy / (sizey * 100 / 2.54f);
                return;
            }
        }
    }

	/* (non-Javadoc)
     * @see digilib.io.DocuDirent#readMeta()
     */
	public void readMeta() {
	    meta.readMeta(this);
	}

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#getMeta()
     */
    @Override
    public FileMeta getMeta() {
        return this.meta;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#setMeta(digilib.meta.FileMeta)
     */
    @Override
    public void setMeta(FileMeta fileMeta) {
        this.meta = fileMeta;
    }


}
