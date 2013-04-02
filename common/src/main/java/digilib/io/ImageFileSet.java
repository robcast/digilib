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
import java.util.Map;

import org.apache.log4j.Logger;

import digilib.io.FileOps.FileClass;
import digilib.meta.IndexMetaAuthLoader;
import digilib.meta.MetadataMap;
import digilib.meta.IndexMetaLoader;

/**
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
	/** HashMap with metadata */
	protected MetadataMap fileMeta = null;
	/** Is the Metadata valid */
	protected boolean metaChecked = false;
	/** the parent directory */
	protected Directory parentDir = null;
    
    /**
     * Constructor with a File and Directories.
     * 
     * @param file
     * @param scaleDirs
     */
    public ImageFileSet(File file, Directory[] scaleDirs) {
        int nb = scaleDirs.length;
        list = new ArrayList<ImageInput>(nb);
        // first dir is our parent
        parentDir = scaleDirs[0];
        this.file = file;
        this.name = file.getName();
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
    public Directory getParent() {
    	return this.parentDir;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#setParent(digilib.io.Directory)
     */
    public void setParent(Directory parent) {
    	this.parentDir = parent;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#getFileMeta()
     */
    public MetadataMap getFileMeta() {
    	return this.fileMeta;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#setFileMeta(digilib.io.MetadataMap)
     */
    public void setFileMeta(MetadataMap fileMeta) {
    	this.fileMeta = fileMeta;
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

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#getFile()
     */
    public File getFile() {
        return file;
    }

    /**
     * Adds an ImageFile to this Fileset.
     * 
     * The files should be added in the order of higher to lower resolutions.
     * The first file is considered the hires "original".
     * 
     * 
     * @param f
     *            file to add
     * @return true (always)
     */
    public boolean add(ImageInput f) {
    	f.setParent(this);
    	return list.add(f);
    }

    /**
     * Fill the ImageSet with files from different base directories.
     * 
     * 
     * @param dirs
     *            list of base directories
     * @param fl
     *            file (from first base dir)
     * @param hints
     *  
     */
    void fill(Directory[] dirs, File fl) {
    	String fn = fl.getName();
    	String baseFn = FileOps.basename(fn);
    	// add the first ImageFile to the ImageSet
    	add(new ImageFile(fl, this, parentDir));
    	// iterate the remaining base directories
    	for (int i = 1; i < dirs.length; ++i) {
    	    Directory dir = dirs[i];
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
    					&& (FileOps.basename(dirFiles[fileIdx - 1])
    							.equals(baseFn))) {
    				// idx-1 ok
    				fileIdx = fileIdx - 1;
    			} else if ((fileIdx+1 < dirFiles.length)
    					&& (FileOps.basename(dirFiles[fileIdx + 1])
    							.equals(baseFn))) {
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
        if (fileMeta == null) {
            // try to read metadata file
            readMeta();
            if (fileMeta == null) {
                // try directory metadata
                ((DocuDirectory) parentDir).checkMeta();
                if (((DocuDirectory) parentDir).getDirMeta() != null) {
                    fileMeta = ((DocuDirectory) parentDir).getDirMeta();
                } else {
                    // try parent directory metadata
                    DocuDirectory gp = (DocuDirectory) parentDir.getParent();
                    if (gp != null) {
                        gp.checkMeta();
                        if (gp.getDirMeta() != null) {
                            fileMeta = gp.getDirMeta();
                        }
                    }
                }
            }
        }
        if (fileMeta == null) {
            // no metadata available
            metaChecked = true;
            return;
        }
        metaChecked = true;
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
                dpix = Float.parseFloat((String) fileMeta
                        .get("original-dpi-x"));
                dpiy = Float.parseFloat((String) fileMeta
                        .get("original-dpi-y"));
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
                sizex = Float.parseFloat((String) fileMeta
                        .get("original-size-x"));
                sizey = Float.parseFloat((String) fileMeta
                        .get("original-size-y"));
                pixx = Float.parseFloat((String) fileMeta
                        .get("original-pixel-x"));
                pixy = Float.parseFloat((String) fileMeta
                        .get("original-pixel-y"));
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
		if ((fileMeta != null) || (file == null)) {
			// there is already metadata or there is no file
			return;
		}
		// metadata is in the file {filename}.meta
		String fn = file.getAbsolutePath();
		File mf = new File(fn + ".meta");
		if (mf.canRead()) {
			IndexMetaAuthLoader ml = new IndexMetaAuthLoader();
			try {
				// read meta file
				Map<String, MetadataMap> meta = ml.loadUri(mf.toURI());
				if (meta == null) {
					return;
				}
				// file meta should be inside file tag
				fileMeta = meta.get(name);
				if (fileMeta == null) {
				    // or there is only a meta tag
				    fileMeta = meta.get("");
				}
			} catch (Exception e) {
				Logger.getLogger(this.getClass()).warn("error reading file .meta", e);
			}
		}
	}


}
