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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.StringTokenizer;

public class FileOps {

	/**
	 * Array of file extensions and corresponding mime-types.
	 */
	private static final String[][] ft = { { "jpg", "image/jpeg" },
			{ "jpeg", "image/jpeg" }, { "jp2", "image/jp2" },
			{ "png", "image/png" }, { "gif", "image/gif" },
			{ "tif", "image/tiff" }, { "tiff", "image/tiff" },
                        { "fpx", "image/fpx" },
			{ "txt", "text/plain" }, { "html", "text/html" },
			{ "htm", "text/html" }, { "xml", "text/xml" },
			{ "svg", "image/svg+xml" }, { "meta", "text/xml" } };

	public static Map fileTypes;

	public static List imageExtensions;

	public static List textExtensions;

	public static List svgExtensions;

	public static final int CLASS_NONE = -1;

	public static final int CLASS_IMAGE = 0;

	public static final int CLASS_TEXT = 1;

	public static final int CLASS_SVG = 2;

	public static final int NUM_CLASSES = 3;

	public static final Integer HINT_BASEDIRS = new Integer(1);

	public static final Integer HINT_FILEEXT = new Integer(2);

	public static final Integer HINT_DIRS = new Integer(3);

	/**
	 * static initializer for FileOps
	 */
	static {
		fileTypes = new HashMap();
		imageExtensions = new ArrayList();
		textExtensions = new ArrayList();
		svgExtensions = new ArrayList();
		// iterate through file types in ft and fill the Map and Lists
		for (int i = 0; i < ft.length; i++) {
			String ext = ft[i][0];
			String mt = ft[i][1];
			fileTypes.put(ext, mt);
			if (classForMimetype(mt) == CLASS_IMAGE) {
				imageExtensions.add(ext);
			} else if (classForMimetype(mt) == CLASS_TEXT) {
				textExtensions.add(ext);
			} else if (classForMimetype(mt) == CLASS_SVG) {
				svgExtensions.add(ext);
			}
		}
	}

	/**
	 * returns the file class for a mime-type
	 * 
	 * @param mt
	 * @return
	 */
	public static int classForMimetype(String mt) {
		if (mt == null) {
			return CLASS_NONE;
		}
		if (mt.startsWith("image/svg")) {
			return CLASS_SVG;
		} else if (mt.startsWith("image")) {
			return CLASS_IMAGE;
		} else if (mt.startsWith("text")) {
			return CLASS_TEXT;
		}
		return CLASS_NONE;
	}

	/**
	 * get the mime type for a file format (by extension)
	 */
	public static String mimeForFile(File f) {
		return (String) fileTypes.get(extname(f.getName().toLowerCase()));
	}

	/**
	 * get the file class for the filename (by extension)
	 * 
	 * @param fn
	 * @return
	 */
	public static int classForFilename(String fn) {
		String mt = (String) fileTypes.get(extname(fn).toLowerCase());
		return classForMimetype(mt);
	}

	public static Iterator getImageExtensionIterator() {
		return imageExtensions.iterator();
	}

	public static Iterator getTextExtensionIterator() {
		return textExtensions.iterator();
	}

	public static Iterator getSVGExtensionIterator() {
		return svgExtensions.iterator();
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
		if (fn == null) {
			return null;
		}
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
	 * the last dot in the filename. If the filename has no dot the empty string
	 * is returned.
	 * 
	 * @param fn
	 * @return
	 */
	public static String extname(String fn) {
		if (fn == null) {
			return null;
		}
		int i = fn.lastIndexOf('.');
		if (i > 0) {
			return fn.substring(i + 1);
		}
		return "";
	}

	/**
	 * Extract the parent directory of a (digilib) path name.
	 * 
	 * Returns the parent directory of a path name. The parent is the part
	 * before the last slash in the path name. If the path name has no slash the
	 * empty string is returned.
	 * 
	 * @param fn
	 * @return
	 */
	public static String parent(String fn) {
		if (fn == null) {
			return null;
		}
		int i = fn.lastIndexOf('/');
		if (i > 0) {
			return fn.substring(0, i);
		}
		return "";
	}

	/**
	 * Normalize a path name.
	 * 
	 * Removes leading and trailing slashes. Returns null if there is other
	 * unwanted stuff in the path name.
	 * 
	 * @param pathname
	 * @return
	 */
	public static String normalName(String pathname) {
		if (pathname == null) {
			return null;
		}
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
	 * FileFilter for general files
	 */
	static class ReadableFileFilter implements FileFilter {

		public boolean accept(File f) {
			return f.canRead();
		}
	}

	/**
	 * FileFilter for image types (helper class for getFile)
	 */
	static class ImageFileFilter implements FileFilter {

		public boolean accept(File f) {
			return (classForFilename(f.getName()) == CLASS_IMAGE);
		}
	}

	/**
	 * FileFilter for text types (helper class for getFile)
	 */
	static class TextFileFilter implements FileFilter {

		public boolean accept(File f) {
			return (classForFilename(f.getName()) == CLASS_TEXT);
		}
	}

	/**
	 * FileFilter for svg types (helper class for getFile).
	 *  
	 */
	static class SVGFileFilter implements FileFilter {

		public boolean accept(File f) {
			return (classForFilename(f.getName()) == CLASS_SVG);
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

	/**
	 * Factory for DocuDirents based on file class.
	 * 
	 * Returns an ImageFileset, TextFile or SVGFile. baseDirs and scalext are
	 * only for ImageFilesets.
	 * 
	 * @param fileClass
	 * @param file
	 * @param hints
	 *            optional additional parameters
	 * @return
	 */
	public static DocuDirent fileForClass(int fileClass, File file, Map hints) {
		// what class of file do we have?
		if (fileClass == CLASS_IMAGE) {
			// image file
			return new ImageFileset(file, hints);
		} else if (fileClass == CLASS_TEXT) {
			// text file
			return new TextFile(file);
		} else if (fileClass == CLASS_SVG) {
			// text file
			return new SVGFile(file);
		}
		return null;
	}

	/**
	 * Filters a list of Files through a FileFilter.
	 * 
	 * @param files
	 * @param filter
	 * @return
	 */
	public static File[] listFiles(File[] files, FileFilter filter) {
		if (files == null) {
			return null;
		}
		File[] ff = new File[files.length];
		int ffi = 0;
		for (int i = 0; i < files.length; i++) {
			if (filter.accept(files[i])) {
				ff[ffi] = files[i];
				ffi++;
			}
		}
		File[] fff = new File[ffi];
		System.arraycopy(ff, 0, fff, 0, ffi);
		return fff;
	}

	/**
	 * Creates a new hints Map with the given first element.
	 * 
	 * @param type
	 * @param value
	 * @return
	 */
	public static Map newHints(Integer type, Object value) {
		Map m = new HashMap();
		if (type != null) {
			m.put(type, value);
		}
		return m;
	}

}
