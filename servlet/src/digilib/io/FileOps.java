/*
 * FileOps -- Utility class for file operations
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 * 
 * Please read license.txt for the full details. A copy of the GPL may be found
 * at http://www.gnu.org/copyleft/lgpl.html
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 *  
 */

package digilib.io;

import java.io.File;
import java.io.FileFilter;
import java.util.Arrays;
import java.util.Iterator;
import java.util.StringTokenizer;

public class FileOps {

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
			"text/xml",
			"svg",
			"image/svg+xml" };

	public static String[] imageExtensions =
		{ "jpg", "jpeg", "jp2", "png", "gif", "tif", "tiff" };

	public static String[] textExtensions = { "txt", "html", "htm", "xml" };

	public static String[] svgExtensions = { "svg" };

	public static final int CLASS_NONE = -1;
	public static final int CLASS_IMAGE = 0;
	public static final int CLASS_TEXT = 1;
	public static final int CLASS_SVG = 2;
	public static final int NUM_CLASSES = 3;

	/**
	 * get the mime type for a file format (by extension)
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
	 * 
	 * @param fn
	 * @return
	 */
	public static int classForFilename(String fn) {
		int n = imageExtensions.length;
		for (int i = 0; i < n; i++) {
			if (fn.toLowerCase().endsWith(imageExtensions[i])) {
				return CLASS_IMAGE;
			}
		}
		n = textExtensions.length;
		for (int i = 0; i < n; i++) {
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

	public static Iterator getSVGExtensionIterator() {
		return Arrays.asList(svgExtensions).iterator();
	}

	/**
	 * convert a string with a list of pathnames into an array of strings using
	 * the system's path separator string
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
	 * Extract the base of a file name (sans extension).
	 * 
	 * Returns the filename without the extension. The extension is the part
	 * behind the last dot in the filename. If the filename has no dot the full
	 * file name is returned.
	 * 
	 * @param fn
	 * @return
	 */
	public static String basename(String fn) {
		int i = fn.lastIndexOf('.');
		if (i > 0) {
			return fn.substring(0, i);
		}
		return fn;
	}

	/**
	 * Extract the extension of a file name.
	 * 
	 * Returns the extension of a file name. The extension is the part behind
	 * the last dot in the filename. If the filename has no dot the empty
	 * string is returned.
	 * 
	 * @param fn
	 * @return
	 */
	public static String extname(String fn) {
		int i = fn.lastIndexOf('.');
		if (i > 0) {
			return fn.substring(i + 1);
		}
		return "";
	}

	/** Normalize a path name.
	 * 
	 * Removes leading and trailing slashes. Returns null if there is other
	 * unwanted stuff in the path name. 
	 * 
	 * @param pathname
	 * @return
	 */
	public static String normalName(String pathname) {
		// upper-dir references are unwanted
		if (pathname.indexOf("../") >= 0) {
			return null;
		}
		int a = 0;
		int e = pathname.length() - 1;
		if (e < 0) {
			return pathname;
		}
		// leading and trailing "/" are removed
		while ((a <= e) && (pathname.charAt(a) == '/')) {
			a++;
		}
		while ((a < e) && (pathname.charAt(e) == '/')) {
			e--; 
		}
		return pathname.substring(a, e + 1);
	}
	
	
	/**
	 * FileFilter for image types (helper class for getFile)
	 */
	static class ImageFileFilter implements FileFilter {

		public boolean accept(File f) {
			if (f.isFile()) {
				return (
					(mimeForFile(f) != null)
						&& (mimeForFile(f).startsWith("image")));
			} else {
				return false;
			}
		}
	}

	/**
	 * FileFilter for text types (helper class for getFile)
	 */
	static class TextFileFilter implements FileFilter {

		public boolean accept(File f) {
			if (f.isFile()) {
				return (
					(mimeForFile(f) != null)
						&& (mimeForFile(f).startsWith("text")));
			} else {
				return false;
			}
		}
	}

	/**
	 * FileFilter for svg types (helper class for getFile).
	 *  
	 */
	static class SVGFileFilter implements FileFilter {

		public boolean accept(File f) {
			if (f.isFile()) {
				return (
					(mimeForFile(f) != null)
						&& (mimeForFile(f).startsWith("image/svg")));
			} else {
				return false;
			}
		}
	}

	/**
	 * Factory for FileFilters (image or text).
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
		if (fileClass == CLASS_SVG) {
			return new SVGFileFilter();
		}
		return null;
	}

	/** Factory for DocuDirents based on file class.
	 * 
	 * Returns an ImageFileset, TextFile or SVGFile. 
	 * baseDirs and scalext are only for ImageFilesets.
	 * 
	 * @param fileClass
	 * @param file
	 * @param baseDirs array of base directories (for ImageFileset)
	 * @param scalext first extension to try for scaled images (for ImageFileset)
	 * @return
	 */
	public static DocuDirent fileForClass(
		int fileClass,
		File file,
		Directory[] baseDirs,
		String scalext) {
		// what class of file do we have?
		if (fileClass == CLASS_IMAGE) {
			// image file
			return new ImageFileset(baseDirs, file, scalext);
		} else if (fileClass == CLASS_TEXT) {
			// text file
			return  new TextFile(file);
		} else if (fileClass == CLASS_SVG) {
			// text file
			return  new SVGFile(file);
		}
		return null;
	}
}
