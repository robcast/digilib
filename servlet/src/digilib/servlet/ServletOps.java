/* ServletOps -- Servlet utility class

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

package digilib.servlet;

import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;
import java.util.*;

import digilib.*;
import digilib.io.*;


public class ServletOps {

  private Utils util = null;
  private HashMap confTable = null;

  public ServletOps() {
    util = new Utils();
  }

  public ServletOps(Utils u) {
    util = u;
  }

  public ServletOps(Utils u, ServletConfig sc) throws ServletException {
    util = u;
    setConfig(sc);
  }

  public void setUtils(Utils u) {
    util = u;
  }

  /**
   * read parameter list from the XML file in init parameter "config-file"
   */
  public void setConfig(ServletConfig c) throws ServletException {
    // reset parameter table
    confTable = null;
    if (c == null) {
      return;
    }
    // get config file name
    String fn = c.getInitParameter("config-file");
    if (fn == null) {
      util.dprintln(4, "setConfig: no param config-file");
      return;
    }
    File f = new File(fn);
    // setup config file list reader
    XMLListLoader lilo = new XMLListLoader("digilib-config", "parameter", "name", "value");
    try {
      confTable = lilo.loadURL(f.toURL().toString());
    } catch (Exception e) {
      util.dprintln(4, "setConfig: unable to read file "+fn);
      throw new ServletException(e);
    }
  }

  /**
   * convert a string with a list of pathnames into an array of strings
   * using the system's path seperator string
   */
  public String[] getPathArray(String paths) {
    // split list into directories
    StringTokenizer dirs = new StringTokenizer(paths, java.io.File.pathSeparator);
    int n = dirs.countTokens();
    if (n < 1) {
        return null;
    }
    // add directories into array
    String[] pathArray = new String[n];
    for (int i = 0; i < n; i++) {
      pathArray[i] = dirs.nextToken();
    }
    return pathArray;
  }
  
  /**
   * getPathArray with default fall back
   */
  public String[] tryToGetPathArray(String paths, String[] defaultPath) {
    String[] pa = getPathArray(paths);
    return (pa != null) ? pa : defaultPath;
  }
      
  /**
   *  print a servlet response and exit
   */
  public static void htmlMessage(String s, HttpServletResponse response) throws IOException {
    response.setContentType("text/html; charset=iso-8859-1");
    PrintWriter out = response.getWriter();
    out.println("<html>");
    out.println("<head><title>Scaler</title></head>");
    out.println("<body>");
    out.println("<p>"+s+"</p>");
    out.println("</body></html>");
  }

  /** Transfers an image file as-is.
   *
   * The local file is copied to the <code>OutputStream</code> of the
   * <code>ServletResponse</code>. The mime-type for the response is detected
   * from the file.
   *
   * @param f Image file to be sent.
   * @param res ServletResponse where the image file will be sent.
   * @throws FileOpException Exception is thrown for a IOException.
   */
  public void sendFile(File f, ServletResponse response) throws FileOpException {
	util.dprintln(4, "sendFile("+f+")");
	String mimeType = FileOps.mimeForFile(f);
	if (mimeType == null) {
	  util.dprintln(2, "ERROR(sendFile): unknown file Type");
	  throw new FileOpException("Unknown file type.");
	}
	response.setContentType(mimeType);
	// open file
	try {
	  FileInputStream inFile = new FileInputStream(f);
	  OutputStream outStream = response.getOutputStream();
	  byte dataBuffer[] = new byte[4096];
	  int len;
	  while ((len = inFile.read(dataBuffer)) != -1) {
		// copy out file
		outStream.write(dataBuffer, 0, len);
	  }
	  inFile.close();
	} catch (IOException e) {
	  util.dprintln(2, "ERROR(sendFile): unable to send file");
	  throw new FileOpException("Unable to send file.");
	}
  }


  /**
   *  get a parameter from request and return it if set, otherwise return default
   */
  public int tryToGetParam(String s, int i, HttpServletRequest r) {
    try {
      i = Integer.parseInt(r.getParameter(s));
    } catch(Exception e) {
      util.dprintln(4, "trytoGetParam(int) failed on param "+s);
      //e.printStackTrace();
    }
    return i;
  }
  public float tryToGetParam(String s, float f, HttpServletRequest r) {
    try {
      f = Float.parseFloat(r.getParameter(s));
    } catch(Exception e) {
      util.dprintln(4, "trytoGetParam(float) failed on param "+s);
      //e.printStackTrace();
    }
    return f;
  }
  public String tryToGetParam(String s, String x, HttpServletRequest r) {
    if (r.getParameter(s) != null) {
      x = r.getParameter(s);
    } else {
      util.dprintln(4, "trytoGetParam(string) failed on param "+s);
    }
    return x;
  }


  /**
   *  get an init parameter from config and return it if set, otherwise return default
   */
  public int tryToGetInitParam(String s, int i) {
    //System.out.println("trytogetInitParam("+s+", "+i+")");
    try {
      //System.out.println("trytogetInitParam: "+(String)confTable.get(s));
      i = Integer.parseInt((String)confTable.get(s));
    } catch(Exception e) {
      util.dprintln(4, "trytogetInitParam(int) failed on param "+s);
      //e.printStackTrace();
    }
    return i;
  }
  public float tryToGetInitParam(String s, float f) {
    try {
      f = Float.parseFloat((String)confTable.get(s));
    } catch(Exception e) {
      util.dprintln(4, "trytoGetInitParam(float) failed on param "+s);
      //e.printStackTrace();
    }
    return f;
  }
  public String tryToGetInitParam(String s, String x) {
    if ((confTable != null)&&((String)confTable.get(s) != null)) {
      x = (String)confTable.get(s);
    } else {
      util.dprintln(4, "trytoGetInitParam(string) failed on param "+s);
    }
    return x;
  }

}
