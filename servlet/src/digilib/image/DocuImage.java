/* DocuImage -- General image interface class

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

import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;
import java.util.*;

import java.awt.image.*;
import java.awt.image.renderable.*;

import digilib.*;
import digilib.io.*;

public interface DocuImage {

  public String[] getKnownFileTypes();

  /**
   *  send an image file as-is
   */
  public void sendFile(File f, ServletResponse res) throws FileOpException;

  /**
   *  load image file
   */
  public void loadImage(File f) throws FileOpException;

  /**
   *  write image with mime type mt to Stream
   */
  public void writeImage(String mt, ServletResponse res) throws FileOpException;

  /**
   *  get the image height and width
   */
  public int getWidth();
  public int getHeight();

  /**
   *  crop and scale image
   *    take rectangle width,height at position x_off,y_off
   *    and scale by scale with interpolation quality qual (0=worst)
   */
  public void cropAndScale(
                int x_off, int y_off,
                int width, int height,
                float scale, int qual) throws ImageOpException;
}
