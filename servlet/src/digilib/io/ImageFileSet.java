/**
 * 
 */
package digilib.io;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Map;

import digilib.io.FileOps.FileClass;

/**
 * @author casties
 *
 */
public class ImageFileSet extends ImageSet implements DocuDirent {

    /** this is an image file */
    protected static FileClass fileClass = FileClass.IMAGE;
    private Directory parent;
    private boolean metaChecked;
    private Map fileMeta;
    
    /**
     * Constructor with a file and hints.
     * 
     * The hints are expected to contain 'basedirs' and 'scaledfilext' keys.
     * 
     * @param file
     * @param hints
     */
    public ImageFileSet(File file, Map<Integer,Object> hints) {
        Directory[] dirs = (Directory[]) hints.get(FileOps.HINT_BASEDIRS);
        int nb = dirs.length;
        list = new ArrayList<ImageInput>(nb);
        parent = dirs[0];
        fill(dirs, file, hints);
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#getName()
     */
    public String getName() {
        // TODO Auto-generated method stub
        return null;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#getParent()
     */
    public Directory getParent() {
        // TODO Auto-generated method stub
        return null;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#setParent(digilib.io.Directory)
     */
    public void setParent(Directory parent) {
        // TODO Auto-generated method stub

    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#getFileMeta()
     */
    public MetadataMap getFileMeta() {
        // TODO Auto-generated method stub
        return null;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#setFileMeta(digilib.io.MetadataMap)
     */
    public void setFileMeta(MetadataMap fileMeta) {
        // TODO Auto-generated method stub

    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#isMetaChecked()
     */
    public boolean isMetaChecked() {
        // TODO Auto-generated method stub
        return false;
    }

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#compareTo(java.lang.Object)
     */
    public int compareTo(Object arg0) {
        // TODO Auto-generated method stub
        return 0;
    }

    public File getInput() {
        // TODO Auto-generated method stub
        return null;
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
    public boolean add(ImageFile f) {
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
    void fill(Directory[] dirs, File fl, Map<Integer,Object> hints) {
    	int nb = dirs.length;
    	String fn = fl.getName();
    	String baseFn = FileOps.basename(fn);
    	// add the first ImageFile to the ImageSet
    	add(new ImageFile(fn, this, parent));
    	// iterate the remaining base directories
    	for (int dirIdx = 1; dirIdx < nb; dirIdx++) {
    		if (dirs[dirIdx] == null) {
    			continue;
    		}
    		// read the directory
    		if (dirs[dirIdx].getFilenames() == null) {
    			dirs[dirIdx].readDir();
    		}
    		String[] dirFiles = dirs[dirIdx].getFilenames();
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
    			add(new ImageFile(dirFiles[fileIdx], this, dirs[dirIdx]));
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
                ((DocuDirectory) parent).checkMeta();
                if (((DocuDirectory) parent).getDirMeta() != null) {
                    fileMeta = ((DocuDirectory) parent).getDirMeta();
                } else {
                    // try parent directory metadata
                    DocuDirectory gp = (DocuDirectory) parent.getParent();
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

    public void readMeta() {
    	// FIXME: what to do?
    	
    }

}
