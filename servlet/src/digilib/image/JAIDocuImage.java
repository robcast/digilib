/* JAIDocuImage -- Image class implementation using JAI (Java Advanced Imaging)

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
import java.awt.image.renderable.*;
import javax.media.jai.*;

import digilib.*;
import digilib.io.*;


public class JAIDocuImage extends DocuImageImpl {

  private RenderedImage img;

  public JAIDocuImage() {
  }

  public JAIDocuImage(Utils u) {
    util = u;
  }

  /**
   *  load image file
   */
  public void loadImage(File f) throws FileOpException {
    System.gc();
    img = JAI.create("fileload", f.getAbsolutePath());
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
    ParameterBlock pb3 = new ParameterBlock();
    pb3.addSource(img);
    pb3.add(res.getOutputStream());
    if (mt == "image/jpeg") {
      pb3.add("JPEG");
    } else if (mt == "image/png") {
      pb3.add("PNG");
    } else {
      // unknown mime type
      util.dprintln(2, "ERROR(writeImage): Unknown mime type "+mt);
      throw new FileOpException("Unknown mime type: "+mt);
    }
    res.setContentType(mt);
    // render output
    JAI.create("encode", pb3);

    } catch (IOException e) {
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

    Interpolation scaleInt = null;
    // setup interpolation quality
    if (qual > 1) {
      util.dprintln(4, "quality q2");
      scaleInt = Interpolation.getInstance(Interpolation.INTERP_BICUBIC);
    } else if (qual == 1) {
      util.dprintln(4, "quality q1");
      scaleInt = Interpolation.getInstance(Interpolation.INTERP_BILINEAR);
    } else {
      util.dprintln(4, "quality q0");
      scaleInt = Interpolation.getInstance(Interpolation.INTERP_NEAREST);
    }

    // setup Crop
    ParameterBlock pb1 = new ParameterBlock();
    pb1.addSource(img);
    pb1.add((float)x_off);
    pb1.add((float)y_off);
    pb1.add((float)width);
    pb1.add((float)height);
    RenderedImage croppedImg = JAI.create("crop", pb1);
    img = null; // free img

    util.dprintln(3, "CROP:"+croppedImg.getWidth()+"x"+croppedImg.getHeight()); //DEBUG

    if (croppedImg == null) {
      util.dprintln(2, "ERROR(cropAndScale): error in crop");
      throw new ImageOpException("Unable to crop");
    }

    // setup scale
    ParameterBlock pb2 = new ParameterBlock();
    pb2.addSource(croppedImg);
    pb2.add(scale);
    pb2.add(scale);
    pb2.add(0f);
    pb2.add(0f);
    pb2.add(scaleInt);
    // the following is nice but way too slow...
    //if (opCrop.getColorModel().getPixelSize() < 8) {
    // change color model if necessary
    //  util.dprintln("converting color model...");
    //  BufferedImage bi = new BufferedImage(1, 1, BufferedImage.TYPE_BYTE_GRAY);
    //  ImageLayout lay = new ImageLayout(bi);
    //  rh = new RenderingHints(JAI.KEY_IMAGE_LAYOUT, lay);
    //}
    RenderedImage scaledImg = JAI.create("scale", pb2);
    croppedImg = null; // free opCrop

    if (scaledImg == null) {
      util.dprintln(2, "ERROR(cropAndScale): error in scale");
      throw new ImageOpException("Unable to scale");
    }

    img = scaledImg;
  }

}
