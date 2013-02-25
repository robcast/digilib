package digilib.io;

/*
 * #%L
 * SVGFile -- Class for SVG files
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2003 - 2013 Robert Casties (robcast@mail.berlios.de)
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
 * Created on 25.11.2003 by casties
 */

import java.io.File;

import digilib.io.FileOps.FileClass;

/** Class for SVG files.
 * 
 * @author casties
 *
 */
public class SVGFile extends DocuDirentImpl {
	/** this is a text file */
	protected static FileClass fileClass = FileClass.SVG;
	/** our File instance */
	protected File file = null;
	
	/** Constructor taking a file.
	 * 
	 * @param f
	 */
	public SVGFile(File f) {
		this.file = f;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#checkMeta()
	 */
	public void checkMeta() {
		// Auto-generated method stub

	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#getFile()
	 */
	public File getFile() {
		return file;
	}

}
