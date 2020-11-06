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
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import digilib.conf.DigilibConfiguration;
import digilib.io.FileOps.FileClass;

/**
 * DocuDirectory implementation that looks for scaled images in parallel paths
 * with different base directories.
 * 
 * @author casties
 * 
 */
public class BaseDirDocuDirectory extends FsDocuDirectory {

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
     * @param fileClass the FileClass
     * @param dlConfig the DigilibConfiguration
     *            
     */
    @Override
    public void configure(String path, FileClass fileClass, DigilibConfiguration dlConfig) {
    	super.configure(path, fileClass, dlConfig);
        this.baseDirNames = (String[]) dlConfig.getValue("basedir-list");
        String baseDirName = baseDirNames[0];
        // the first directory has to exist
        dir.dir = new File(baseDirName, path);
        isValid = dir.dir.isDirectory();
    }

    @Override
	public synchronized boolean readDir() {
		// check directory first
		if (!isValid) {
			return false;
		}
		// re-check modification time because the thread may have slept
		if (dir.dir.lastModified() <= dirMTime) {
			return true;
		}
		// read all filenames
		logger.debug("reading directory {} = {}", this, dir.dir.getPath());
		// set our read time to the end of the previous second so that we will not miss
		// changes occurred at the same time than our reading due to the accuracy of the filesystem timestamp
		dirMTime = (System.currentTimeMillis()  / 1000) * 1000 - 1;

		// read metadata for directory
		readMeta();

		// read all files as a stream
		try (Stream<Path> pathStream = Files.list(dir.toPath())) {
	        // setup parallel directories
	        int nb = baseDirNames.length;
	        FsDirectory[] dirs = new FsDirectory[nb];
	        // first entry is this directory
	        dirs[0] = dir;
	        // fill array with the remaining directories
	        for (int j = 1; j < nb; j++) {
	            // add dirName to baseDirName
	            File d = new File(baseDirNames[j], dirName);
	            if (d.isDirectory()) {
	                dirs[j] = new FsDirectory(d);
	                logger.debug("  reading scaled directory {}", d.getPath());
	                dirs[j].readDir();
	            }
	        }
            // filter files by fileClass
	        Predicate<Path> fileFilter = FileOps.streamFilterForClass(fileClass);
	        
            // process the file stream by filtering
            List<DocuDirent> dirents = pathStream.filter(fileFilter)
                // create a DocuDirent for each file
                .map(p -> DocuDirentFactory.getInstance(fileClass, p.toFile(), this, dirs))
                // collect in ArrayList
                .collect(Collectors.toCollection(ArrayList::new));
	        
	        // sort the List for binarySearch to work (DocuDirents sort by filename)
            Collections.sort(dirents);
            files = dirents;

		} catch (IOException e) {
            logger.error("Error reading directory!", e);
        } 

		return isValid;
    }

    @Override
    public boolean refresh() {
        if (isValid) {
            if (dir.dir.lastModified() > dirMTime) {
                // on-disk modification time is more recent
                readDir();
            }
            touch();
        }
        return isValid;
    }

}
