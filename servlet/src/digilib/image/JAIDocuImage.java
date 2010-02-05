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

import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.image.RenderedImage;
import java.awt.image.renderable.ParameterBlock;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.Iterator;
import java.util.List;

import javax.media.jai.BorderExtender;
import javax.media.jai.Interpolation;
import javax.media.jai.JAI;
import javax.media.jai.KernelJAI;
import javax.media.jai.ParameterBlockJAI;
import javax.media.jai.RenderedOp;
import javax.media.jai.operator.TransposeDescriptor;
import javax.media.jai.operator.TransposeType;

import com.sun.media.jai.codec.ImageCodec;

import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageFile;
import digilib.io.ImageFileset;

/** A DocuImage implementation using Java Advanced Imaging Library. */
public class JAIDocuImage extends DocuImageImpl {

	protected RenderedImage img;

	protected Interpolation interpol = null;

	/*
	 * static { // we could set our own tile cache size here TileCache tc =
	 * JAI.createTileCache(100*1024*1024);
	 * JAI.getDefaultInstance().setTileCache(tc); }
	 */

	public boolean isSubimageSupported() {
		return true;
	}

	/*
	 * Real setQuality implementation. Creates the correct Interpolation.
	 */
	public void setQuality(int qual) {
		quality = qual;
		// setup interpolation quality
		if (qual > 1) {
			logger.debug("quality q2");
			interpol = Interpolation.getInstance(Interpolation.INTERP_BICUBIC);
		} else if (qual == 1) {
			logger.debug("quality q1");
			interpol = Interpolation.getInstance(Interpolation.INTERP_BILINEAR);
		} else {
			logger.debug("quality q0");
			interpol = Interpolation.getInstance(Interpolation.INTERP_NEAREST);
		}
	}

	/* returns a list of supported image formats */
    @SuppressWarnings("unchecked") // ImageCodec.getCodecs() returns a naked Enumeration
    public Iterator<String> getSupportedFormats() {
        Enumeration<ImageCodec> codecs = ImageCodec.getCodecs();
        List<String> formats = new ArrayList<String>();
        for (ImageCodec codec = codecs.nextElement(); codecs.hasMoreElements(); codec = codecs
                .nextElement()) {
            logger.debug("known format:"+codec.getFormatName());
            formats.add(codec.getFormatName());
        }
        logger.debug("tilecachesize:"
                + JAI.getDefaultInstance().getTileCache().getMemoryCapacity());
        return formats.iterator();
    }

	/* Check image size and type and store in ImageFile f */
	public boolean identify(ImageFile imgf) throws IOException {
		// try parent method first
		if (super.identify(imgf)) {
			return true;
		}
		// fileset to store the information
		ImageFileset imgfs = imgf.getParent();
		File f = imgf.getFile();
		if (f == null) {
			throw new IOException("File not found!");
		}
		/*
		 * try JAI
		 */
		logger.debug("identifying (JAI) " + f);
		try {
			RenderedOp img = JAI.create("fileload", f.getAbsolutePath());
			ImageSize d = new ImageSize(img.getWidth(), img.getHeight());
			imgf.setSize(d);
			String t = FileOps.mimeForFile(f);
			imgf.setMimetype(t);
			// logger.debug(" format:"+t);
			if (imgfs != null) {
				imgfs.setAspect(d);
			}
			logger.debug("image size: " + imgf.getSize());
			return true;
		} catch (Exception e) {
			throw new FileOpException("ERROR: unknown image file format!");
		}
	}

	/* Load an image file into the Object. */
	public void loadImage(ImageFile f) throws FileOpException {
		img = JAI.create("fileload", f.getFile().getAbsolutePath());
		if (img == null) {
			throw new FileOpException("Unable to load File!");
		}
	}

	/* Load an image file into the Object. */
	public void loadSubimage(ImageFile f, Rectangle region, int subsample)
			throws FileOpException {
		logger.debug("loadSubimage");
		img = JAI.create("fileload", f.getFile().getAbsolutePath());
		if ((region.width < img.getWidth())
				|| (region.height < img.getHeight())) {
			// setup Crop
			ParameterBlock cp = new ParameterBlock();
			cp.addSource(img);
			cp.add((float) region.x);
			cp.add((float) region.y);
			cp.add((float) region.width);
			cp.add((float) region.height);
			logger.debug("loadSubimage: crop");
			img = JAI.create("crop", cp);
		}
		if (subsample > 1) {
			float sc = 1f / subsample;
			ParameterBlockJAI sp = new ParameterBlockJAI("scale");
			sp.addSource(img);
			sp.setParameter("xScale", sc);
			sp.setParameter("yScale", sc);
			sp.setParameter("interpolation", Interpolation
					.getInstance(Interpolation.INTERP_NEAREST));
			// scale
			logger.debug("loadSubimage: scale");
			img = JAI.create("scale", sp);
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
				throw new FileOpException("Unknown mime type: " + mt);
			}
			// render output
			JAI.create("encode", pb3);

		} catch (IOException e) {
			throw new FileOpException("Error writing image.");
		}
	}

	/**
	 * The width of the curent image in pixel.
	 * 
	 * @return Image width in pixels.
	 */
	public int getWidth() {
		if (img != null) {
			return img.getWidth();
		}
		return 0;
	}

	/**
	 * The height of the curent image in pixel.
	 * 
	 * @return Image height in pixels.
	 */
	public int getHeight() {
		if (img != null) {
			return img.getHeight();
		}
		return 0;
	}

	/* scales the current image */
	public void scale(double scale, double scaleY) throws ImageOpException {
		logger.debug("scale");
		if ((scale < 1) && (img.getColorModel().getPixelSize() == 1)
				&& (quality > 0)) {
			/*
			 * "SubsampleBinaryToGray" for downscaling BW
			 */
			scaleBinary((float) scale);
		} else if ((scale <= 0.5) && (quality > 1)) {
			/*
			 * blur and "Scale" for downscaling color images
			 */
			if ((scale <= 0.5) && (quality > 1)) {
				int bl = (int) Math.floor(1 / scale);
				// don't blur more than 3
				blur(Math.min(bl, 3));
			}
			scaleAll((float) scale);
		} else {
			/*
			 * "Scale" for the rest
			 */
			scaleAll((float) scale);
		}

		// DEBUG
		logger.debug("SCALE: " + scale + " ->" + img.getWidth() + "x"
				+ img.getHeight());

	}

	public void scaleAll(float scale) throws ImageOpException {
		RenderedImage scaledImg;
		// DEBUG
		logger.debug("scaleAll: " + scale);
		ParameterBlockJAI param = new ParameterBlockJAI("Scale");
		param.addSource(img);
		param.setParameter("xScale", scale);
		param.setParameter("yScale", scale);
		param.setParameter("interpolation", interpol);
		// hint with border extender
		RenderingHints hint = new RenderingHints(JAI.KEY_BORDER_EXTENDER,
				BorderExtender.createInstance(BorderExtender.BORDER_COPY));
		// scale
		scaledImg = JAI.create("Scale", param, hint);

		if (scaledImg == null) {
			throw new ImageOpException("Unable to scale");
		}
		img = scaledImg;
	}

	public void blur(int radius) throws ImageOpException {
		RenderedImage blurredImg;
		int klen = Math.max(radius, 2);
		logger.debug("blur: " + klen);
		int ksize = klen * klen;
		float f = 1f / ksize;
		float[] kern = new float[ksize];
		for (int i = 0; i < ksize; i++) {
			kern[i] = f;
		}
		KernelJAI blur = new KernelJAI(klen, klen, kern);
		ParameterBlockJAI param = new ParameterBlockJAI("Convolve");
		param.addSource(img);
		param.setParameter("kernel", blur);
		// hint with border extender
		RenderingHints hint = new RenderingHints(JAI.KEY_BORDER_EXTENDER,
				BorderExtender.createInstance(BorderExtender.BORDER_COPY));
		blurredImg = JAI.create("Convolve", param, hint);
		if (blurredImg == null) {
			throw new ImageOpException("Unable to scale");
		}
		img = blurredImg;
	}

	public void scaleBinary(float scale) throws ImageOpException {
		RenderedImage scaledImg;
		// DEBUG
		logger.debug("scaleBinary: " + scale);
		ParameterBlockJAI param = new ParameterBlockJAI("SubsampleBinaryToGray");
		param.addSource(img);
		param.setParameter("xScale", scale);
		param.setParameter("yScale", scale);
		// hint with border extender
		RenderingHints hint = new RenderingHints(JAI.KEY_BORDER_EXTENDER,
				BorderExtender.createInstance(BorderExtender.BORDER_COPY));
		// scale
		scaledImg = JAI.create("SubsampleBinaryToGray", param, hint);
		if (scaledImg == null) {
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

		logger.debug("CROP: " + x_off + "," + y_off + ", " + width + ","
				+ height + " ->" + croppedImg.getWidth() + "x"
				+ croppedImg.getHeight());
		// DEBUG

		if (croppedImg == null) {
			throw new ImageOpException("Unable to crop");
		}
		img = croppedImg;
	}

	/* rotates the current image */
	public void rotate(double angle) throws ImageOpException {
		RenderedImage rotImg;
		// convert degrees to radians
		double rangle = Math.toRadians(angle);
		double x = img.getWidth() / 2;
		double y = img.getHeight() / 2;

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
			param.add((float) x);
			param.add((float) y);
			param.add((float) rangle);
			param.add(interpol);

			rotImg = JAI.create("rotate", param);
		}

		logger.debug("ROTATE: " + x + "," + y + ", " + angle + " (" + rangle
				+ ")" + " ->" + rotImg.getWidth() + "x" + rotImg.getHeight());
		// DEBUG

		if (rotImg == null) {
			throw new ImageOpException("Unable to rotate");
		}
		img = rotImg;
	}

	/*
	 * mirrors the current image works only horizontal and vertical
	 */
	public void mirror(double angle) throws ImageOpException {
		RenderedImage mirImg;
		// only mirroring by right angles
		TransposeType rotOp = null;
		if (Math.abs(angle) < epsilon) {
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
		// use Transpose operation
		ParameterBlock param = new ParameterBlock();
		param.addSource(img);
		param.add(rotOp);
		mirImg = JAI.create("transpose", param);

		if (mirImg == null) {
			throw new ImageOpException("Unable to flip");
		}
		img = mirImg;
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

		logger.debug("ENHANCE: *" + mult + ", +" + add + " ->"
				+ enhImg.getWidth() + "x" + enhImg.getHeight());
		// DEBUG

		if (enhImg == null) {
			throw new ImageOpException("Unable to enhance");
		}
		img = enhImg;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see digilib.image.DocuImage#enhanceRGB(float[], float[])
	 */
	public void enhanceRGB(float[] rgbm, float[] rgba) throws ImageOpException {
		RenderedImage enhImg;
		int nb = rgbm.length;
		double[] ma = new double[nb];
		double[] aa = new double[nb];
		for (int i = 0; i < nb; i++) {
			ma[i] = rgbm[i];
			aa[i] = rgba[i];
		}
		// use Rescale operation
		ParameterBlock param = new ParameterBlock();
		param.addSource(img);
		param.add(ma);
		param.add(aa);
		enhImg = JAI.create("rescale", param);

		logger.debug("ENHANCE_RGB: *" + rgbm + ", +" + rgba + " ->"
				+ enhImg.getWidth() + "x" + enhImg.getHeight());
		// DEBUG

		if (enhImg == null) {
			throw new ImageOpException("Unable to enhanceRGB");
		}
		img = enhImg;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see digilib.image.DocuImage#dispose()
	 */
	public void dispose() {
		img = null;
	}

}
