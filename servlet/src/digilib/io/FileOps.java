/* FileOps -- Utility class for file operations

  Digital Image Library servlet components

  Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*/

package digilib.io;

import java.io.File;
import java.io.FileFilter;
import java.util.Arrays;
import java.util.Iterator;
import java.util.StringTokenizer;

import digilib.Utils;

public class FileOps {

	private Utils util = null;
	
	public static String[] fileTypes =
		{
			"jpg",
			"image/jpeg",
			"jpeg",
			"image/jpeg",
			"jp2",
			"image/jp2",
			"png",
			"image/png",
			"gif",
			"image/gif",
			"tif",
			"image/tiff",
			"tiff",
			"image/tiff",
			"txt",
			"text/plain",
			"html",
			"text/html",
			"htm",
			"text/html",
			"xml",
			"text/xml" };

	public static String[] imageExtensions =
		{ "jpg", "jpeg", "jp2", "png", "gif", "tif", "tiff" };

	public static String[] textExtensions =
		{ "txt", "html", "htm", "xml"};
		
	public static final int CLASS_NONE = -1;
	public static final int CLASS_IMAGE = 0;
	public static final int CLASS_TEXT = 1;
	public static final int NUM_CLASSES = 2;
	

	public FileOps() {
		util = new Utils();
	}

	public FileOps(Utils u) {
		util = u;
	}

	public void setUtils(Utils u) {
		util = u;
	}

	/**
	 *  get the mime type for a file format (by extension)
	 */
	public static String mimeForFile(File f) {
		String fn = f.getName();
		for (int i = 0; i < fileTypes.length; i += 2) {
			if (fn.toLowerCase().endsWith(fileTypes[i])) {
				return fileTypes[i + 1];
			}
		}
		return null;
	}

	/**
	 * get the file class for the filename (by extension)
	 * @param fn
	 * @return
	 */
	public static int classForFilename(String fn) {
		int n = imageExtensions.length;
		for (int i = 0; i < n; i ++) {
			if (fn.toLowerCase().endsWith(imageExtensions[i])) {
				return CLASS_IMAGE;
			}
		}
		n = textExtensions.length;
		for (int i = 0; i < n; i ++) {
			if (fn.toLowerCase().endsWith(textExtensions[i])) {
				return CLASS_TEXT;
			}
		}
		return CLASS_NONE;
		
	}

	public static Iterator getImageExtensionIterator() {
		return Arrays.asList(imageExtensions).iterator();
	}

	public static Iterator getTextExtensionIterator() {
		return Arrays.asList(textExtensions).iterator();
	}
	
	/**
	 * convert a string with a list of pathnames into an array of strings
	 * using the system's path separator string
	 */
	public static String[] pathToArray(String paths) {
		// split list into directories
		StringTokenizer dirs = new StringTokenizer(paths, File.pathSeparator);
		int n = dirs.countTokens();
		if (n < 1) {
			return null;
		}
		// add directories into array
		String[] pathArray = new String[n];
		for (int i = 0; i < n; i++) {
			String s = dirs.nextToken();
			// make shure the dir name ends with a directory separator
			if (s.endsWith(File.separator)) {
				pathArray[i] = s;
			} else {
				pathArray[i] = s + File.separator;
			}
		}
		return pathArray;
	}

	/**
	 *  FileFilter for image types (helper class for getFile)
	 */
	static class ImageFileFilter implements FileFilter {

		public boolean accept(File f) {
			if (f.isFile()) {
				return ((mimeForFile(f) != null)&&(mimeForFile(f).startsWith("image")));
			} else {
				return false;
			}
		}
	}

	/**
	 *  FileFilter for text types (helper class for getFile)
	 */
	static class TextFileFilter implements FileFilter {

		public boolean accept(File f) {
			if (f.isFile()) {
				return ((mimeForFile(f) != null)&&(mimeForFile(f).startsWith("text")));
			} else {
				return false;
			}
		}
	}

	/** Factory for FileFilters (image or text).
	 * 
	 * @param fileClass
	 * @return
	 */ 
	public static FileFilter filterForClass(int fileClass) {
		if (fileClass == CLASS_IMAGE) {
			return new ImageFileFilter();
		}
		if (fileClass == CLASS_TEXT) {
			return new TextFileFilter();
		}
		return null;
	}

}
