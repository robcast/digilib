/* JAIDocuImage -- Image class implementation using JIMI toolkit

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

import com.sun.jimi.core.*;
import com.sun.jimi.core.raster.*;
import com.sun.jimi.core.filters.*;

import java.awt.*;
import java.awt.image.*;

import digilib.*;
import digilib.io.*;


public class JIMIDocuImage extends DocuImageImpl {

  private JimiRasterImage img;
  private ImageProducer imgp;

  public JIMIDocuImage() {
  }

  public JIMIDocuImage(Utils u) {
    util = u;
  }

  /**
   *  load image file
   */
  public void loadImage(File f) throws FileOpException {
    System.gc();
    try {
    img = Jimi.getRasterImage(f.toURL());
    } catch (java.net.MalformedURLException e) {
      util.dprintln(3, "ERROR(loadImage): MalformedURLException");
    } catch (JimiException e) {
      util.dprintln(3, "ERROR(loadImage): JIMIException");
      throw new FileOpException("Unable to load File!"+e);
    }
    if (img == null) {
      util.dprintln(3, "ERROR(loadImage): unable to load file");
      throw new FileOpException("Unable to load File!");
    }
  }

  /**
   *  write image of type mt to Stream
   */
  public void writeImage(String mt, ServletResponse res)
         throws FileOpException {
    try {
    // setup output
    res.setContentType(mt);
    // render output
    Jimi.putImage(mt, imgp, res.getOutputStream());

    } catch (JimiException e) {
      throw new FileOpException("Error writing image!"+e);
    } catch (IOException e) {
      throw new FileOpException("Error writing image."+e);
    }
  }

  public int getWidth() {
    if (img != null) {
      return img.getWidth();
    }
    return 0;
  }

  public int getHeight() {
    if (img != null) {
      return img.getHeight();
    }
    return 0;
  }


  /**
   *  crop and scale image
   *    take rectangle width,height at position x_off,y_off
   *    and scale by scale
   */
   public void cropAndScale(int x_off, int y_off, int width, int height,
         float scale, int qual) throws ImageOpException {

    ImageFilter scaleFilter;
    int destWidth = (int)(scale * (float)width);
    int destHeight = (int)(scale * (float)height);

    // setup Crop
    ImageProducer croppedImg = img.getCroppedImageProducer(x_off, y_off, width, height);
    //util.dprintln(3, "CROP:"+croppedImg.getWidth()+"x"+croppedImg.getHeight()); //DEBUG

    if (croppedImg == null) {
      util.dprintln(2, "ERROR(cropAndScale): error in crop");
      throw new ImageOpException("Unable to crop");
    }

    // setup scale and interpolation quality
    if (qual > 0) {
      util.dprintln(4, "quality q1");
      scaleFilter = new AreaAverageScaleFilter(destWidth, destHeight);
    } else {
      util.dprintln(4, "quality q0");
      scaleFilter = new ReplicatingScaleFilter(destWidth, destHeight);
    }

    ImageProducer scaledImg = new FilteredImageSource(croppedImg, scaleFilter);

    if (scaledImg == null) {
      util.dprintln(2, "ERROR(cropAndScale): error in scale");
      throw new ImageOpException("Unable to scale");
    }

    imgp = scaledImg;
  }

}
