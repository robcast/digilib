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

import java.awt.image.RenderedImage;
import java.awt.image.renderable.ParameterBlock;
import java.io.File;
import java.io.IOException;

import javax.media.jai.Interpolation;
import javax.media.jai.JAI;
import javax.servlet.ServletResponse;

import digilib.Utils;
import digilib.io.FileOpException;

/** A DocuImage implementation using Java Advanced Imaging Library. */
public class JAIDocuImage extends DocuImageImpl {

	private RenderedImage img;

	/** Default constructor. */
	public JAIDocuImage() {
	}

	/** Contructor taking a utils object.
	 * @param u utils object.
	 */
	public JAIDocuImage(Utils u) {
		util = u;
	}

	/** Load an image file into the Object.
	 *
	 * @param f Image File.
	 * @throws FileOpException Exception thrown if any error occurs.
	 */
	public void loadImage(File f) throws FileOpException {
		System.gc();
		img = JAI.create("fileload", f.getAbsolutePath());
		if (img == null) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
	}

	/** Write the current image to a ServletResponse.
	 *
	 * The image is encoded to the mime-type mt and sent to the output stream of the
	 * ServletResponse res.
	 *
	 * Currently only mime-types "image/jpeg" and "image/png" are allowed.
	 * @param mt mime-type of the image to be sent.
	 * @param res ServletResponse where the image is sent.
	 * @throws FileOpException Exception thrown on any error.
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
				util.dprintln(2, "ERROR(writeImage): Unknown mime type " + mt);
				throw new FileOpException("Unknown mime type: " + mt);
			}
			res.setContentType(mt);
			// render output
			JAI.create("encode", pb3);

		} catch (IOException e) {
			throw new FileOpException("Error writing image.");
		}
	}

	/** The width of the curent image in pixel.
	 * @return Image width in pixels.
	 */
	public int getWidth() {
		if (img != null) {
			return img.getWidth();
		}
		return 0;
	}

	/** The height of the curent image in pixel.
	 * @return Image height in pixels.
	 */
	public int getHeight() {
		if (img != null) {
			return img.getHeight();
		}
		return 0;
	}

	/** Crop and scale the current image.
	 *
	 * The current image is cropped to a rectangle of width, height at position
	 * x_off, y_off. The resulting image is scaled by the factor scale using the
	 * interpolation quality qual (0=worst).
	 * 
	 * @param x_off X offset of the crop rectangle in pixel.
	 * @param y_off Y offset of the crop rectangle in pixel.
	 * @param width Width of the crop rectangle in pixel.
	 * @param height Height of the crop rectangle in pixel.
	 * @param scale Scaling factor.
	 * @param qual Interpolation quality (0=worst).
	 * @throws ImageOpException Exception thrown on any error.
	 */
	public void cropAndScale(
		int x_off,
		int y_off,
		int width,
		int height,
		float scale,
		int qual)
		throws ImageOpException {

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
		pb1.add((float) x_off);
		pb1.add((float) y_off);
		pb1.add((float) width);
		pb1.add((float) height);
		RenderedImage croppedImg = JAI.create("crop", pb1);
		img = null; // free img

		util.dprintln(
			3,
			"CROP:" + croppedImg.getWidth() + "x" + croppedImg.getHeight());
		//DEBUG

		if (croppedImg == null) {
			util.dprintln(2, "ERROR(cropAndScale): error in crop");
			throw new ImageOpException("Unable to crop");
		}

		// setup scale
		RenderedImage scaledImg;

		if (scale != 1f) {
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
			scaledImg = JAI.create("scale", pb2);
			croppedImg = null; // free opCrop
		} else {
			// no scaling
			scaledImg = croppedImg;
		}

		if (scaledImg == null) {
			util.dprintln(2, "ERROR(cropAndScale): error in scale");
			throw new ImageOpException("Unable to scale");
		}

		img = scaledImg;
	}

}
