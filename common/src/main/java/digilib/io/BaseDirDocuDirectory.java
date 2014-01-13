package digilib.io;

/*
 * #%L
 * BaseDirDocuDirectory.java -- DocuDirectory with different base directories.
 * 
 * Digital Image Library servlet components
 * %%
 * Copyright (C) 2014 MPIWG Berlin
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
import java.util.Collections;

import digilib.conf.DigilibConfiguration;
import digilib.io.FileOps.FileClass;
import digilib.meta.MetaFactory;

/**
 * DocuDirectory implementation that looks for scaled images in parallel paths
 * with different base directories.
 * 
 * @author casties
 * 
 */
public class BaseDirDocuDirectory extends DocuDirectory {

    /** array of parallel dirs for scaled images */
    protected Directory[] dirs = null;
    /** list of base directories */
    protected String[] baseDirNames = null;

    /**
     * Configure object with digilib directory path and a parent DocuDirCache.
     * 
     * Directory names at the given path are appended to the base directories
     * from the cache. The directory is checked on disk and isValid is set.
     * 
     * @see readDir
     * 
     * @param path
     *            digilib directory path name
     * @param cache
     *            parent DocuDirCache
     * @return 
     */
    @Override
    public void configure(String path, FileClass fileClass, DigilibConfiguration dlConfig) {
        this.dirName = path;
        this.fileClass = fileClass;
        this.baseDirNames = (String[]) dlConfig.getValue("basedir-list");
        String baseDirName = baseDirNames[0];
        // clear directory list
        files = new ArrayList<DocuDirent>();
        dirMTime = 0;
        // the first directory has to exist
        dir = new File(baseDirName, path);
        isValid = dir.isDirectory();
        meta = MetaFactory.getDirMetaInstance();
    }

    @Override
    public synchronized boolean readDir() {
    	// check directory first
    	if (!isValid) {
    		return false;
    	}
    	// re-check modification time because the thread may have slept
    	if (dir.lastModified() <= dirMTime) {
    		return true;
    	}
    	// read all filenames
    	logger.debug("reading directory "+this+" = "+dir.getPath());
    	File[] allFiles = null;
    	/*
    	 * using ReadableFileFilter is safer (we won't get directories with file
    	 * extensions) but slower.
    	 */
    	// allFiles = dir.listFiles(new FileOps.ReadableFileFilter());
    	allFiles = dir.listFiles();
    	if (allFiles == null) {
    		// not a directory
    		return false;
    	}
    	// init parallel directories
    	if (dirs == null) {
    		// number of base dirs
    		int nb = baseDirNames.length;
    		// array of parallel dirs
    		dirs = new Directory[nb];
    		// first entry is this directory
    		dirs[0] = this;
    		// fill array with the remaining directories
    		for (int j = 1; j < nb; j++) {
    			// add dirName to baseDirName
    			File d = new File(baseDirNames[j], dirName);
    			if (d.isDirectory()) {
    				dirs[j] = new Directory(d);
    				logger.debug("  reading scaled directory " + d.getPath());
    				dirs[j].readDir();
    			}
    		}
    	}
    
    	File[] fileList = FileOps.listFiles(allFiles, FileOps.filterForClass(fileClass));
    	// number of files in the directory
    	int numFiles = fileList.length;
    	if (numFiles > 0) {
    		// create new list
    		ArrayList<DocuDirent> dl = new ArrayList<DocuDirent>(numFiles);
    		files = dl;
    		for (File f : fileList) {
    			DocuDirent df = FileOps.fileForClass(fileClass, f, dirs);
    			df.setParent(this);
    			// add the file to our list
    			dl.add(df);
    		}
    		/*
    		 * we sort the ArrayList (the list of files) for binarySearch to work 
    		 * (DocuDirent's natural sort order is by filename)
    		 */
    		Collections.sort(dl);
    	}
    	// clear the scaled directories
    	for (Directory d: dirs) {
    		if (d != null) {
    			d.clearFilenames();
    		}
    	}
    	dirMTime = dir.lastModified();
    	// read metadata as well
    	readMeta();
    	return isValid;
    }

}
