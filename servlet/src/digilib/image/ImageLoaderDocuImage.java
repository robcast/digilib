/* ImageLoaderDocuImage -- Image class implementation using JDK 1.4 ImageLoader

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

import java.awt.*;
import java.awt.image.*;
import java.awt.geom.*;
import java.awt.image.renderable.*;

import javax.imageio.*;

import digilib.*;
import digilib.io.*;

public class ImageLoaderDocuImage extends DocuImageImpl {

  private BufferedImage img;

  public ImageLoaderDocuImage() {
  }

  public ImageLoaderDocuImage(Utils u) {
    util = u;
  }

  /**
   *  load image file
   */
  public void loadImage(File f) throws FileOpException {
    util.dprintln(10, "loadImage!");
    System.gc();
    try {
      for (int i = 0; i < ImageIO.getReaderFormatNames().length; i++) {
    System.out.println("ImageLoader reader:"+ImageIO.getReaderFormatNames()[i]);
      }
      for (int i = 0; i < ImageIO.getWriterFormatNames().length; i++) {
    System.out.println("ImageLoader writer:"+ImageIO.getWriterFormatNames()[i]);
      }
      img = ImageIO.read(f);
      if (img == null) {
        util.dprintln(3, "ERROR(loadImage): unable to load file");
        throw new FileOpException("Unable to load File!");
      }
    }
    catch (IOException e) {
      throw new FileOpException("Error reading image.");
    }
  }

  /**
   *  write image of type mt to Stream
   */
  public void writeImage(String mt, ServletResponse res)
         throws FileOpException {
    util.dprintln(10, "writeImage!");
    try {
      // setup output
      String type = "png";
      if (mt == "image/jpeg") {
        type = "jpeg";
      } else if (mt == "image/png") {
        type = "png";
      } else {
        // unknown mime type
        util.dprintln(2, "ERROR(writeImage): Unknown mime type "+mt);
        throw new FileOpException("Unknown mime type: "+mt);
      }
      res.setContentType(mt);
      // render output
      if (ImageIO.write(img, type, res.getOutputStream())) {
        // writing was OK
        return;
      } else {
        throw new FileOpException("Error writing image: Unknown image format!");
      }
    } catch (IOException e) {
      // e.printStackTrace();
      throw new FileOpException("Error writing image.");
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
    util.dprintln(10, "cropAndScale!");

    int scaleInt = 0;
    // setup interpolation quality
    if (qual > 0) {
      util.dprintln(4, "quality q1");
      scaleInt = AffineTransformOp.TYPE_BILINEAR;
    } else {
      util.dprintln(4, "quality q0");
      scaleInt = AffineTransformOp.TYPE_NEAREST_NEIGHBOR;
    }

    // setup Crop
    BufferedImage croppedImg = img.getSubimage(x_off, y_off, width, height);

    img = null; // free img
    util.dprintln(3, "CROP:"+croppedImg.getWidth()+"x"+croppedImg.getHeight()); //DEBUG
//    util.dprintln(2, "  time "+(System.currentTimeMillis()-startTime)+"ms");

    if (croppedImg == null) {
      util.dprintln(2, "ERROR(cropAndScale): error in crop");
      throw new ImageOpException("Unable to crop");
    }

    // setup scale
    AffineTransformOp scaleOp = new AffineTransformOp(
                      AffineTransform.getScaleInstance(scale, scale),
                      scaleInt);
    BufferedImage scaledImg = scaleOp.filter(croppedImg, null);
    croppedImg = null; // free opCrop

    if (scaledImg == null) {
      util.dprintln(2, "ERROR(cropAndScale): error in scale");
      throw new ImageOpException("Unable to scale");
    }
    img = scaledImg;
  }

}
