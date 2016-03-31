package digilib.io;

/*
 * #%L
 * AliasingDocuDirCache -- DocuDirCache using alias entries from config file
 * 
 * Digital Image Library servlet components
 * 
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
 * 
 * Created on 04.11.2003
 */

import java.io.File;
import java.util.Map;
import java.util.Map.Entry;

import digilib.conf.DigilibConfiguration;
import digilib.io.FileOps.FileClass;
import digilib.util.XMLMapLoader;

/**
 * @author casties
 *  
 */
public class AliasingDocuDirCache extends DocuDirCache {

	/**
	 * @param fc
	 * @param confFileName
	 * @throws FileOpException
	 */
	public AliasingDocuDirCache(FileClass fc,
			File confFile, DigilibConfiguration dlConfig)
			throws FileOpException {
		// create standard DocuDirCache
		super(fc, dlConfig);
		Map<String,String> pathMap = null;
		// read alias config file
		try {
			// load into pathMap
			XMLMapLoader mapLoader = new XMLMapLoader("digilib-aliases",
					"mapping", "link", "dir");
			pathMap = mapLoader.loadUri(confFile.toURI());
		} catch (Exception e) {
			throw new FileOpException("ERROR loading mapping file: " + e);
		}
		if (pathMap == null) {
			throw new FileOpException("ERROR: unable to load mapping file!");
		}

		/*
		 * load map entries into cache
		 */

		for (Entry<String, String> linkdir: pathMap.entrySet()) {
			if (linkdir.getValue() == null) {
				logger.error("Key mismatch in mapping file!");
				break;	
			}
			DocuDirectory destDir = DocuDirectoryFactory.getDocuDirectoryInstance(linkdir.getValue(), this);
			if (destDir.isValid()) {
				logger.debug("Aliasing dir: " + linkdir.getKey());
				// add the alias name
				putName(FileOps.normalName(linkdir.getKey()), destDir);
				// add the real dir
				putDir(destDir);
			}
		}
	}

	/**
	 * Adds a DocuDirectory under another name to the cache.
	 * 
	 * @param name
	 * @param newdir
	 */
    public void putName(String name, DocuDirectory newdir) {
        if (map.containsKey(name)) {
            logger.warn("Duplicate key in AliasingDocuDirCache.put -- ignored!");
        } else {
            map.put(name, newdir);
        }
    }

}
