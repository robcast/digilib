/* JAIDocuImage -- Image class implementation using JAI (Java Advanced Imaging)

  Digital Image Library servlet components

  Copyright (C) 2001, 2002, 2003 Robert Casties (robcast@mail.berlios.de)

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

import java.awt.RenderingHints;
import java.awt.image.RenderedImage;
import java.awt.image.renderable.ParameterBlock;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;

import javax.media.jai.*;
import javax.media.jai.operator.TransposeDescriptor;
import javax.media.jai.operator.TransposeType;

import digilib.Utils;
import digilib.io.FileOpException;

/** A DocuImage implementation using Java Advanced Imaging Library. */
public class JAIDocuImage extends DocuImageImpl {

	protected RenderedImage img;
	protected Interpolation interpol = null;

	/** Default constructor. */
	public JAIDocuImage() {
	}

	/** Contructor taking a utils object.
	 * @param u utils object.
	 */
	public JAIDocuImage(Utils u) {
		util = u;
	}

	/* Load an image file into the Object. */
	public void loadImage(File f) throws FileOpException {
		System.gc();
		img = JAI.create("fileload", f.getAbsolutePath());
		if (img == null) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
	}

	/* Write the current image to an OutputStream. */
	public void writeImage(String mt, OutputStream ostream)
		throws FileOpException {
		try {
			// setup output
			ParameterBlock pb3 = new ParameterBlock();
			pb3.addSource(img);
			pb3.add(ostream);
			if (mt == "image/jpeg") {
				pb3.add("JPEG");
			} else if (mt == "image/png") {
				pb3.add("PNG");
			} else {
				// unknown mime type
				util.dprintln(2, "ERROR(writeImage): Unknown mime type " + mt);
				throw new FileOpException("Unknown mime type: " + mt);
			}
			// render output
			JAI.create("encode", pb3);

		} catch (IOException e) {
			throw new FileOpException("Error writing image.");
		}
	}

	/* Real setQuality implementation. 
	 * Creates the correct Interpolation.
	 */
	public void setQuality(int qual) {
		quality = qual;
		// setup interpolation quality
		if (qual > 1) {
			util.dprintln(4, "quality q2");
			interpol = Interpolation.getInstance(Interpolation.INTERP_BICUBIC);
		} else if (qual == 1) {
			util.dprintln(4, "quality q1");
			interpol = Interpolation.getInstance(Interpolation.INTERP_BILINEAR);
		} else {
			util.dprintln(4, "quality q0");
			interpol = Interpolation.getInstance(Interpolation.INTERP_NEAREST);
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

	/* scales the current image */
	public void scale(double scale) throws ImageOpException {
		float sf = (float)scale;
		// setup scale
		ParameterBlock param = new ParameterBlock();
		param.addSource(img);
		param.add(sf);
		param.add(sf);
		param.add(0f);
		param.add(0f);
		param.add(interpol);
		// hint with border extender
		RenderingHints hint =
			new RenderingHints(
				JAI.KEY_BORDER_EXTENDER,
				BorderExtender.createInstance(BorderExtender.BORDER_COPY));

		RenderedImage scaledImg = JAI.create("scale", param, hint);

		//DEBUG
		util.dprintln(
			3,
			"SCALE: "
				+ scale
				+ " ->"
				+ scaledImg.getWidth()
				+ "x"
				+ scaledImg.getHeight());

		if (scaledImg == null) {
			util.dprintln(2, "ERROR(scale): error in scale");
			throw new ImageOpException("Unable to scale");
		}
		img = scaledImg;
	}

	/* crops the current image */
	public void crop(int x_off, int y_off, int width, int height)
		throws ImageOpException {
		// setup Crop
		ParameterBlock param = new ParameterBlock();
		param.addSource(img);
		param.add((float) x_off);
		param.add((float) y_off);
		param.add((float) width);
		param.add((float) height);
		RenderedImage croppedImg = JAI.create("crop", param);

		util.dprintln(
			3,
			"CROP: "
				+ x_off
				+ ","
				+ y_off
				+ ", "
				+ width
				+ ","
				+ height
				+ " ->"
				+ croppedImg.getWidth()
				+ "x"
				+ croppedImg.getHeight());
		//DEBUG

		if (croppedImg == null) {
			util.dprintln(2, "ERROR(crop): error in crop");
			throw new ImageOpException("Unable to crop");
		}
		img = croppedImg;
	}

	/* rotates the current image */
	public void rotate(double angle) throws ImageOpException {
		RenderedImage rotImg;
		// convert degrees to radians
		double rangle = Math.toRadians(angle);
		float x = getWidth()/2;
		float y = getHeight()/2;

		// optimize rotation by right angles
		TransposeType rotOp = null;
		if (Math.abs(angle - 0) < epsilon) {
			// 0 degree
			return;
		} else if (Math.abs(angle - 90) < epsilon) {
			// 90 degree
			rotOp = TransposeDescriptor.ROTATE_90;
		} else if (Math.abs(angle - 180) < epsilon) {
			// 180 degree
			rotOp = TransposeDescriptor.ROTATE_180;
		} else if (Math.abs(angle - 270) < epsilon) {
			// 270 degree
			rotOp = TransposeDescriptor.ROTATE_270;
		} else if (Math.abs(angle - 360) < epsilon) {
			// 360 degree
			return;
		}
		if (rotOp != null) {
			// use Transpose operation
			ParameterBlock pb = new ParameterBlock();
			pb.addSource(img);
			pb.add(rotOp);
			rotImg = JAI.create("transpose", pb);
		} else {
			// setup "normal" rotation
			ParameterBlock param = new ParameterBlock();
			param.addSource(img);
			param.add(x);
			param.add(y);
			param.add((float) rangle);
			param.add(interpol);
			// hint with border extender
			RenderingHints hint =
				new RenderingHints(
					JAI.KEY_BORDER_EXTENDER,
					BorderExtender.createInstance(BorderExtender.BORDER_COPY));

			rotImg = JAI.create("rotate", param, hint);
		}

		util.dprintln(
			3,
			"ROTATE: "
				+ x
				+ ","
				+ y
				+ ", "
				+ angle
				+ " ("
				+ rangle
				+ ")"
				+ " ->"
				+ rotImg.getWidth()
				+ "x"
				+ rotImg.getHeight());
		//DEBUG

		if (rotImg == null) {
			util.dprintln(2, "ERROR: error in rotate");
			throw new ImageOpException("Unable to rotate");
		}
		img = rotImg;
	}

	/* mirrors the current image
	 * works only horizontal and vertical
	 */
	public void mirror(double angle) throws ImageOpException {
		RenderedImage mirImg;

		// only mirroring by right angles
		TransposeType rotOp = null;
		if (Math.abs(angle - 0) < epsilon) {
			// 0 degree
			rotOp = TransposeDescriptor.FLIP_HORIZONTAL;
		} else if (Math.abs(angle - 90) < epsilon) {
			// 90 degree
			rotOp = TransposeDescriptor.FLIP_VERTICAL;
		} else if (Math.abs(angle - 180) < epsilon) {
			// 180 degree
			rotOp = TransposeDescriptor.FLIP_HORIZONTAL;
		} else if (Math.abs(angle - 270) < epsilon) {
			// 270 degree
			rotOp = TransposeDescriptor.FLIP_VERTICAL;
		} else if (Math.abs(angle - 360) < epsilon) {
			// 360 degree
			rotOp = TransposeDescriptor.FLIP_HORIZONTAL;
		}
		if (rotOp != null) {
			// use Transpose operation
			ParameterBlock param = new ParameterBlock();
			param.addSource(img);
			param.add(rotOp);
			mirImg = JAI.create("transpose", param);

			util.dprintln(
				3,
				"MIRROR: "
					+ angle
					+ " ->"
					+ mirImg.getWidth()
					+ "x"
					+ mirImg.getHeight());
			//DEBUG

			if (mirImg == null) {
				util.dprintln(2, "ERROR(mirror): error in mirror");
				throw new ImageOpException("Unable to mirror");
			}
			img = mirImg;
		}
	}

	/* contrast and brightness enhancement */
	public void enhance(float mult, float add) throws ImageOpException {
		RenderedImage enhImg;
		double[] ma = { mult };
		double[] aa = { add };
		// use Rescale operation
		ParameterBlock param = new ParameterBlock();
		param.addSource(img);
		param.add(ma);
		param.add(aa);
		enhImg = JAI.create("rescale", param);

		util.dprintln(
			3,
			"ENHANCE: *"
				+ mult
				+ ", +"
				+ add
				+ " ->"
				+ enhImg.getWidth()
				+ "x"
				+ enhImg.getHeight());
		//DEBUG

		if (enhImg == null) {
			util.dprintln(2, "ERROR(enhance): error in enhance");
			throw new ImageOpException("Unable to enhance");
		}
		img = enhImg;
	}


}
