/* DocuImage -- General image interface class implementation

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

package digilib.image;

import java.io.*;
import javax.servlet.ServletResponse;

import digilib.*;
import digilib.io.*;

public abstract class DocuImageImpl implements DocuImage {

  protected Utils util = null;

  public DocuImageImpl() {
    util = new Utils();
  }

  public DocuImageImpl(Utils u) {
    util = u;
  }

  public void setUtils(Utils u) {
    util = u;
  }

  protected String[] knownFileTypes = {"jpg", "png", "gif", "tiff"};

  public String[] getKnownFileTypes() {
    return knownFileTypes;
  }

  /**
   *  send an image file as-is
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
      byte dataBuffer[] = new byte[1024];
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

  public abstract void loadImage(File f) throws FileOpException;
  public abstract void writeImage(String mt, ServletResponse res) throws FileOpException;
  public abstract int getWidth();
  public abstract int getHeight();
  public abstract void cropAndScale(int x_off, int y_off, int width, int height, float scale, int qual)  throws ImageOpException;
}
