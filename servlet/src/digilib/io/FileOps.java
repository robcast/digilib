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

import java.io.*;
import java.util.*;

import digilib.*;


public class FileOps {

  private Utils util = null;
  public static String[] fileTypes = {
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "jp2", "image/jp2",
            "png", "image/png",
            "gif", "image/gif",
            "tif", "image/tiff",
            "tiff", "image/tiff"};

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
        return fileTypes[i+1];
      }
    }
    return null;
  }

  /**
   *  get a filehandle for a file or directory name
   *    returns File number n if fn is directory (starts with 1)
   */
  public File getFile(String fn, int n) throws FileOpException {
    util.dprintln(4, "getFile ("+fn+", "+n+")");

    File f = new File(fn);
    // if fn is a file name then return file
    if (f.isFile()) {
      return f;
    }
    // if fn is a directory name then open directory
    if (f.isDirectory()) {
      File[] fl = f.listFiles(new ImgFileFilter());
      Arrays.sort(fl);
      if ((n > 0) && (n <= fl.length)) {
         return fl[n - 1];
      }
    }
    throw new FileOpException("Unable to find file: "+fn);
  }

  /**
   *  get the number of files in a directory
   *    (almost the same as getFile)
   *  returns 0 in case of problems
   */
  public int getNumFiles(String fn) throws FileOpException {
    util.dprintln(4, "getNumFiles ("+fn+")");

    File f = new File(fn);
    // if fn is a file name then return 1
    if (f.isFile()) {
      return 1;
    }
    // if fn is a directory name then return the number of files
    if (f.isDirectory()) {
      return f.listFiles(new ImgFileFilter()).length;
    }
    // then fn must be something strange...
    return 0;
  }


  /**
   *  get a filehandle for a file or directory name out of a list
   *    dirs is a list of base directories, fn is the appended file/dirname
   *    searches dirs until fn exists (backwards if fwd is false)
   *    returns File number n if fn is directory (starts with 1)
   */
  public File getFileVariant(String[] dirs, String fn, int n, boolean fwd) throws FileOpException {
    util.dprintln(4, "getVariantFile ("+dirs+", "+fn+", "+n+")");

    File f = null;
    int nvar = dirs.length;

    for (int i = 0; i < nvar; i++) {
      try {
        f = getFile(dirs[(fwd) ? i : (nvar-i-1)]+fn, n);
      } catch (FileOpException e) {
        f = null;
      }
      if (f != null) {
        return f;
      }
    }
    throw new FileOpException("Unable to find file: "+fn);
  }

  /**
   *  get the number of files in a directory
   *    (almost the same as getFileVariant)
   *  returns 0 in case of problems
   */
  public int getNumFilesVariant(String[] dirs, String fn, boolean fwd) throws FileOpException {
    util.dprintln(4, "getNumFilesVariant ("+dirs+", "+fn+")");

    int nf = 0;
    int nvar = dirs.length;

    for (int i = 0; i < nvar; i++) {
      try {
        nf = getNumFiles(dirs[(fwd) ? i : (nvar-i-1)]+fn);
      } catch (FileOpException e) {
        nf = 0;
      }
      if (nf > 0) {
        return nf;
      }
    }
    return 0;
  }

  /**
   *  FileFilter for image types (helper class for getFile)
   */
  private class ImgFileFilter implements FileFilter {

    public boolean accept(File f) {
      if (f.isFile()) {
        return (mimeForFile(f) != null);
      } else {
        return false;
      }
    }
  }

}
