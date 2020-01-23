package digilib.io;

/*-
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2001 - 2019 digilib Community
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

import java.io.File;

/**
 * Filesystem-based DocuDirectory implementation.
 * 
 * @author casties
 *
 */
public abstract class FsDocuDirectory extends DocuDirectory {

	protected FsDirectory dir = null;

	public FsDocuDirectory() {
		super();
		dir = new FsDirectory();
	}

    /* (non-Javadoc)
     * @see digilib.io.DocuDirectory#readDir()
     */
    @Override
	public abstract boolean readDir();
    
	/**
	 * Returns the parent filesystem Directory.
	 * 
	 * @return the Directory
	 */
	public FsDirectory getParentDirectory() {
		return dir.getParent();
	}

	/**
	 * Returns the filesystem File for this directory.
	 * @return the File
	 */
	public File getDir() {
		return dir.dir;
	}

	/**
	 * @return the filenames
	 */
	public String[] getFilenames() {
		return dir.getFilenames();
	}

	@Override
	public String createParentName(String fn) {
		return FileOps.parent(fn);
	}

	@Override
	public String createFilename(String fn) {
		return FileOps.filename(fn);
	}

}
