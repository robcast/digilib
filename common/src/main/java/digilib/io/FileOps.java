package digilib.io;

/*
 * #%L
 * FileOps -- Utility class for file operations
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2001 - 2013 MPIWG Berlin
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

	public static Map<String, String> fileTypes;

	public static List<String> imageExtensions;

	public static List<String> textExtensions;

	public static List<String> svgExtensions;

	public static enum FileClass {NONE, IMAGE, TEXT, SVG}

	public static final Integer HINT_BASEDIRS = new Integer(1);

	public static final Integer HINT_FILEEXT = new Integer(2);

	public static final Integer HINT_DIRS = new Integer(3);

	/**
	 * static initializer for FileOps
	 */
	static {
		fileTypes = new HashMap<String, String>();
		imageExtensions = new ArrayList<String>();
		textExtensions = new ArrayList<String>();
		svgExtensions = new ArrayList<String>();
		// iterate through file types in ft and fill the Map and Lists
		for (int i = 0; i < ft.length; i++) {
			String ext = ft[i][0];
			String mt = ft[i][1];
			fileTypes.put(ext, mt);
			if (classForMimetype(mt) == FileClass.IMAGE) {
				imageExtensions.add(ext);
			} else if (classForMimetype(mt) == FileClass.TEXT) {
				textExtensions.add(ext);
			} else if (classForMimetype(mt) == FileClass.SVG) {
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
	public static FileClass classForMimetype(String mt) {
		if (mt == null) {
			return FileClass.NONE;
		}
		if (mt.startsWith("image/svg")) {
			return FileClass.SVG;
		} else if (mt.startsWith("image")) {
			return FileClass.IMAGE;
		} else if (mt.startsWith("text")) {
			return FileClass.TEXT;
		}
		return FileClass.NONE;
	}

	/**
	 * get the mime type for a file format (by extension)
	 */
	public static String mimeForFile(File f) {
	    if (f == null) {
	        return null;
	    }
		return fileTypes.get(extname(f.getName().toLowerCase()));
	}

	/**
	 * get the file class for the filename (by extension)
	 * 
	 * @param fn
	 * @return
	 */
	public static FileClass classForFilename(String fn) {
		String mt = (String) fileTypes.get(extname(fn).toLowerCase());
		return classForMimetype(mt);
	}

	public static Iterator<String> getImageExtensionIterator() {
		return imageExtensions.iterator();
	}

    public static List<String> getImageExtensions() {
        return imageExtensions;
    }

    public static Iterator<String> getTextExtensionIterator() {
		return textExtensions.iterator();
	}

	public static List<String> getTextExtensions() {
        return textExtensions;
    }

    public static Iterator<String> getSVGExtensionIterator() {
		return svgExtensions.iterator();
	}

    public static List<String> getSvgExtensions() {
        return svgExtensions;
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
			return (classForFilename(f.getName()) == FileClass.IMAGE);
		}
	}

	/**
	 * FileFilter for text types (helper class for getFile)
	 */
	static class TextFileFilter implements FileFilter {

		public boolean accept(File f) {
			return (classForFilename(f.getName()) == FileClass.TEXT);
		}
	}

	/**
	 * FileFilter for svg types (helper class for getFile).
	 *  
	 */
	static class SVGFileFilter implements FileFilter {

		public boolean accept(File f) {
			return (classForFilename(f.getName()) == FileClass.SVG);
		}
	}

	/**
	 * Factory for FileFilters (image or text).
	 * 
	 * @param fileClass
	 * @return
	 */
	public static FileFilter filterForClass(FileClass fileClass) {
		if (fileClass == FileClass.IMAGE) {
			return new ImageFileFilter();
		}
		if (fileClass == FileClass.TEXT) {
			return new TextFileFilter();
		}
		if (fileClass == FileClass.SVG) {
			return new SVGFileFilter();
		}
		return null;
	}

	/**
	 * Factory for DocuDirents based on file class.
	 * 
	 * Returns an ImageSet, TextFile or SVGFile. scaleDirs are
	 * only for ImageFilesets.
	 * 
	 * @param fileClass
	 * @param file
	 * @param scaleDirs
	 *            optional additional parameters
	 * @return
	 */
	public static DocuDirent fileForClass(FileClass fileClass, File file, Directory[] scaleDirs) {
		// what class of file do we have?
		if (fileClass == FileClass.IMAGE) {
			// image file
			return new ImageFileSet(file, scaleDirs);
		} else if (fileClass == FileClass.TEXT) {
			// text file
			return new TextFile(file);
		} else if (fileClass == FileClass.SVG) {
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
	public static Map<Integer, Object> newHints(Integer type, Object value) {
		Map<Integer, Object> m = new HashMap<Integer, Object>();
		if (type != null) {
			m.put(type, value);
		}
		return m;
	}

}
