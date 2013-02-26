package digilib.io;

/*
 * #%L
 * TextFile.java -- Class for text files
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2003 - 2013 digilib Community
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
 * Created on 15.09.2003 by casties
 */

import java.io.File;

import digilib.io.FileOps.FileClass;

/** Class for text files.
 * 
 * @author casties
 *
 */
public class TextFile extends DocuDirentImpl {
	/** this is a text file */
	protected static FileClass fileClass = FileClass.TEXT;
	/** our File instance */
	protected File file = null;
	
	/** Constructor taking a file.
	 * 
	 * @param f
	 */
	public TextFile(File f) {
		this.file = f;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#checkMeta()
	 */
	public void checkMeta() {
		// TODO Auto-generated method stub

	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#getFile()
	 */
	public File getFile() {
		return file;
	}

}
