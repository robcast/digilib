/* ImageLoaderDocuImage -- Image class implementation using JDK 1.4 ImageLoader

 Digital Image Library servlet components

 Copyright (C) 2002 - 2011 Robert Casties (robcast@mail.berlios.de)

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

import java.awt.Image;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.color.ColorSpace;
import java.awt.geom.AffineTransform;
import java.awt.geom.Rectangle2D;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.awt.image.ByteLookupTable;
import java.awt.image.ColorConvertOp;
import java.awt.image.ColorModel;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
import java.awt.image.LookupOp;
import java.awt.image.LookupTable;
import java.awt.image.RescaleOp;
import java.io.IOException;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.util.Arrays;
import java.util.Iterator;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.FileImageInputStream;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import javax.servlet.ServletException;

import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageInput;
import digilib.util.ImageSize;

/** Implementation of DocuImage using the ImageLoader API of Java 1.4 and Java2D. */
public class ImageLoaderDocuImage extends ImageInfoDocuImage {
    
	/** image object */
	protected BufferedImage img;
	
	/** interpolation type */
	protected RenderingHints renderHint = null;

	/** convolution kernels for blur() */
	protected static Kernel[] convolutionKernels = {
	        null,
	        new Kernel(1, 1, new float[] {1f}),
            new Kernel(2, 2, new float[] {0.25f, 0.25f, 0.25f, 0.25f}),
            new Kernel(3, 3, new float[] {1f/9f, 1f/9f, 1f/9f, 1f/9f, 1f/9f, 1f/9f, 1f/9f, 1f/9f, 1f/9f})
	};

	/** lookup table for inverting images (byte) */
	protected static LookupTable invertSingleByteTable;
    protected static LookupTable invertRgbaByteTable;
	
	static {
		byte[] invertByte = new byte[256];
		byte[] orderedByte = new byte[256];
		byte[] nullByte = new byte[256];
		for (int i = 0; i < 256; ++i) {
			invertByte[i] = (byte) (256 - i);
			orderedByte[i] = (byte) i;
			nullByte[i] = 0;
		}
		// should(!) work for all color models
		invertSingleByteTable = new ByteLookupTable(0, invertByte);
		// but doesn't work with alpha channel on all platforms
		String ver = System.getProperty("java.version");
		String os =  System.getProperty("os.name");
		logger.debug("os="+os+" ver="+ver);
		if (os.startsWith("Linux") && ver.startsWith("1.6")) {
			// GRAB(WTF?) works in Linux JDK1.6 with transparency
			invertRgbaByteTable = new ByteLookupTable(0, new byte[][] {
					invertByte, invertByte, orderedByte, invertByte});
		} else {
			invertRgbaByteTable = invertSingleByteTable;
		}
	}
	
	/** the size of the current image */
    protected ImageSize imageSize;
	
	
	/* loadSubimage is supported. */
	public boolean isSubimageSupported() {
		return true;
	}

	public void setQuality(int qual) {
		quality = qual;
		renderHint = new RenderingHints(null);
		// hint.put(RenderingHints.KEY_ANTIALIASING,
		// RenderingHints.VALUE_ANTIALIAS_OFF);
		// setup interpolation quality
		if (qual > 0) {
			logger.debug("quality q1");
			renderHint.put(RenderingHints.KEY_INTERPOLATION,
					RenderingHints.VALUE_INTERPOLATION_BICUBIC);
		} else {
			logger.debug("quality q0");
			renderHint.put(RenderingHints.KEY_INTERPOLATION,
					RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
		}
	}

    /* returns the size of the current image */
    public ImageSize getSize() {
        if (imageSize == null) {
            int h = 0;
            int w = 0;
            try {
                if (img == null) {
                    ImageReader reader = getReader(input);
                    // get size from ImageReader
                    h = reader.getHeight(0);
                    w = reader.getWidth(0);
                } else {
                    // get size from image
                    h = img.getHeight();
                    w = img.getWidth();
                }
                imageSize = new ImageSize(w, h);
            } catch (IOException e) {
                logger.debug("error in getSize:", e);
            }
        }
        return imageSize;
    }

	/* returns a list of supported image formats */
	public Iterator<String> getSupportedFormats() {
		String[] formats = ImageIO.getReaderFormatNames();
		return Arrays.asList(formats).iterator();
	}

    /* Check image size and type and store in ImageInput */
    public ImageInput identify(ImageInput input) throws IOException {
        // try parent method first
        ImageInput ii = super.identify(input);
        if (ii != null) {
            return ii;
        }
        logger.debug("identifying (ImageIO) " + input);
        ImageReader reader = null;
        try {
            /*
             * try ImageReader
             */
            reader = getReader(input);
            // set size
            ImageSize d = new ImageSize(reader.getWidth(0), reader.getHeight(0));
            input.setSize(d);
            // set mime type
            if (input.getMimetype() == null) {
                if (input.hasFile()) {
                    String t = FileOps.mimeForFile(input.getFile());
                    input.setMimetype(t);
                } else {
                    // FIXME: is format name a mime type???
                    String t = reader.getFormatName();
                    input.setMimetype(t);
                }
            }
            return input;
        } catch (FileOpException e) {
            // maybe just our class doesn't know what to do
            logger.error("ImageLoaderDocuimage unable to identify:", e);
            return null;
        } finally {
            if (reader != null) {
                reader.dispose();
            }
        }
    }
    
    /* load image file */
	public void loadImage(ImageInput ii) throws FileOpException {
		logger.debug("loadImage: " + ii);
		this.input = ii;
		try {
		    if (ii.hasImageInputStream()) {
                img = ImageIO.read(ii.getImageInputStream());
		    } else if (ii.hasFile()) {
		        img = ImageIO.read(ii.getFile());
		    }
		} catch (IOException e) {
			throw new FileOpException("Error reading image.");
		}
	}

	/**
	 * Get an ImageReader for the image file.
	 * 
	 * @return
	 */
	public ImageReader getReader(ImageInput input) throws IOException {
		logger.debug("get ImageReader for " + input);
		ImageInputStream istream = null;
		if (input.hasImageInputStream()) {
			// stream input
			istream = input.getImageInputStream();
		} else if (input.hasFile()) {
			// file only input
			RandomAccessFile rf = new RandomAccessFile(input.getFile(), "r");
			istream = new FileImageInputStream(rf);
		} else {
			throw new FileOpException("Unable to get data from ImageInput");
		}
		Iterator<ImageReader> readers;
		String mt = null;
		if (input.hasMimetype()) {
	        // check hasMimetype first or we might get into a loop
		    mt = input.getMimetype();
		} else {
		    // try file extension
            mt = FileOps.mimeForFile(input.getFile());
		}
		if (mt == null) {
			logger.debug("No mime-type. Trying automagic.");
			readers = ImageIO.getImageReaders(istream);
		} else {
			logger.debug("File type:" + mt);
			readers = ImageIO.getImageReadersByMIMEType(mt);
		}
		if (!readers.hasNext()) {
			throw new FileOpException("Can't find Reader to load File!");
		}
		ImageReader reader = readers.next();
		/* are there more readers? */
		logger.debug("ImageIO: this reader: " + reader.getClass());
		/* while (readers.hasNext()) {
			logger.debug("ImageIO: next reader: " + readers.next().getClass());
		} */
		reader.setInput(istream);
		return reader;
	}

	/* Load an image file into the Object. */
	public void loadSubimage(ImageInput ii, Rectangle region, int prescale)
			throws FileOpException {
		logger.debug("loadSubimage");
        this.input = ii;
        ImageReader reader = null;
		try {
			reader = getReader(ii);
			// set up reader parameters
			ImageReadParam readParam = reader.getDefaultReadParam();
			readParam.setSourceRegion(region);
			if (prescale > 1) {
				readParam.setSourceSubsampling(prescale, prescale, 0, 0);
			}
			// read image
			logger.debug("loading..");
			img = reader.read(0, readParam);
			logger.debug("loaded");
		} catch (IOException e) {
			throw new FileOpException("Unable to load File!");
		} finally {
		    if (reader != null) {
		        reader.dispose();
		    }
		}
	}

	/* write image of type mt to Stream */
	public void writeImage(String mt, OutputStream ostream)
			throws ImageOpException, ServletException {
		logger.debug("writeImage");
		// setup output
		ImageWriter writer = null;
		ImageOutputStream imgout = null;
		try {
			imgout = ImageIO.createImageOutputStream(ostream);
			if (mt == "image/jpeg") {
				/*
				 * JPEG doesn't do transparency so we have to convert any RGBA
				 * image to RGB :-( *Java2D BUG*
				 */
				if (img.getColorModel().hasAlpha()) {
					logger.debug("BARF: JPEG with transparency!!");
					int w = img.getWidth();
					int h = img.getHeight();
					// BufferedImage.TYPE_INT_RGB seems to be fastest (JDK1.4.1,
					// OSX)
					int destType = BufferedImage.TYPE_INT_RGB;
					BufferedImage img2 = new BufferedImage(w, h, destType);
					img2.createGraphics().drawImage(img, null, 0, 0);
					img = img2;
				}
				writer = (ImageWriter) ImageIO.getImageWritersByFormatName(
						"jpeg").next();
				if (writer == null) {
					throw new ImageOpException("Unable to get JPEG writer");
				}
				ImageWriteParam param = writer.getDefaultWriteParam();
				if (quality > 1) {
					// change JPEG compression quality
					param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
					//logger.debug("JPEG qual before: "
					//		+ Float.toString(param.getCompressionQuality()));
					param.setCompressionQuality(0.9f);
					//logger.debug("JPEG qual now: "
					//		+ Float.toString(param.getCompressionQuality()));
				}
				writer.setOutput(imgout);
				// render output
				logger.debug("writing");
				writer.write(null, new IIOImage(img, null, null), param);
			} else if (mt == "image/png") {
				// render output
				writer = (ImageWriter) ImageIO.getImageWritersByFormatName(
						"png").next();
				if (writer == null) {
					throw new ImageOpException("Unable to get PNG writer");
				}
				writer.setOutput(imgout);
				logger.debug("writing");
				writer.write(img);
			} else {
				// unknown mime type
				throw new ImageOpException("Unknown mime type: " + mt);
			}

		} catch (IOException e) {
		    logger.error("Error writing image:", e);
			throw new ServletException("Error writing image:", e);
		}
		// TODO: should we: finally { writer.dispose(); }
	}

	public void scale(double scale, double scaleY) throws ImageOpException {
		logger.debug("scale: " + scale);
		/* for downscaling in high quality the image is blurred first */
		if ((scale <= 0.5) && (quality > 1)) {
			int bl = (int) Math.floor(1 / scale);
			blur(bl);
		}
		/* then scaled */
		AffineTransformOp scaleOp = new AffineTransformOp(AffineTransform
				.getScaleInstance(scale, scale), renderHint);
		BufferedImage scaledImg = null;
		/* enforce destination image type (*Java2D BUG*)
		int type = img.getType();
		if ((quality > 0) && (type != 0)) {
			logger.debug("creating destination image");
			Rectangle2D dstBounds = scaleOp.getBounds2D(img);
			scaledImg = new BufferedImage((int) dstBounds.getWidth(),
					(int) dstBounds.getHeight(), type);
		} */
		logger.debug("scaling...");
		scaledImg = scaleOp.filter(img, scaledImg);
		if (scaledImg == null) {
			throw new ImageOpException("Unable to scale");
		}
		// DEBUG
		logger.debug("destination image type " + scaledImg.getType());
		logger.debug("SCALE: " + scale + " ->" + scaledImg.getWidth() + "x"
				+ scaledImg.getHeight());
		img = scaledImg;
	}

	public void blur(int radius) throws ImageOpException {
		logger.debug("blur: " + radius);
		// minimum radius is 2
		int klen = Math.max(radius, 2);
		Kernel blur = null;
		if (klen < convolutionKernels.length) {
            blur = convolutionKernels[klen];
		} else {
            // calculate our own kernel
            int ksize = klen * klen;
            // kernel is constant 1/k
            float f = 1f / ksize;
            float[] kern = new float[ksize];
            for (int i = 0; i < ksize; ++i) {
                kern[i] = f;
            }
            blur = new Kernel(klen, klen, kern);
		}
		// blur with convolve operation
		ConvolveOp blurOp = new ConvolveOp(blur, ConvolveOp.EDGE_NO_OP,
				renderHint);
		BufferedImage blurredImg = null;
		// blur needs explicit destination image type for color *Java2D BUG*
		if (img.getType() == BufferedImage.TYPE_3BYTE_BGR) {
			logger.debug("blur: fixing destination image type");
			blurredImg = new BufferedImage(img.getWidth(), img.getHeight(), img
					.getType());
		}
		blurredImg = blurOp.filter(img, blurredImg);
		img = blurredImg;
	}

	public void crop(int x_off, int y_off, int width, int height)
			throws ImageOpException {
		// setup Crop
		BufferedImage croppedImg = img.getSubimage(x_off, y_off, width, height);
		if (croppedImg == null) {
			throw new ImageOpException("Unable to crop");
		}
		logger.debug("CROP:" + croppedImg.getWidth() + "x"
				+ croppedImg.getHeight());
		img = croppedImg;
	}

	public void enhance(float mult, float add) throws ImageOpException {
		RescaleOp op = null;
		logger.debug("enhance: cm="+img.getColorModel());
		op = new RescaleOp(mult, add, renderHint);
		/*
		 * Only one constant should work regardless of the number of bands
		 * according to the JDK spec. Doesn't work on JDK 1.4 for OSX and Linux
		 * (at least). RescaleOp scaleOp = new RescaleOp( (float)mult,
		 * (float)add, null); scaleOp.filter(img, img);
		 */

		/* The number of constants must match the number of bands in the image.
		int ncol = img.getColorModel().getNumComponents();
		float[] dm = new float[ncol];
		float[] da = new float[ncol];
		for (int i = 0; i < ncol; i++) {
			dm[i] = (float) mult;
			da[i] = (float) add;
		}
		RescaleOp scaleOp = new RescaleOp(dm, da, null); */
		op.filter(img, img);
	}

	public void enhanceRGB(float[] rgbm, float[] rgba) throws ImageOpException {
		/*
		 * The number of constants must match the number of bands in the image.
		 * We do only 3 (RGB) bands.
		 */
		int ncol = img.getColorModel().getNumColorComponents();
		if ((ncol != 3) || (rgbm.length != 3) || (rgba.length != 3)) {
			logger.debug("ERROR(enhance): unknown number of color bands or coefficients ("
							+ ncol + ")");
			return;
		}
		RescaleOp scaleOp = new RescaleOp(rgbOrdered(rgbm), rgbOrdered(rgba),
				null);
		scaleOp.filter(img, img);
	}

	/**
	 * Ensures that the array f is in the right order to map the images RGB
	 * components. (not sure what happens otherwise)
	 */
	public float[] rgbOrdered(float[] fa) {
		/*
		 * TODO: this is UGLY, UGLY!!
		 */
		float[] fb;
		int t = img.getType();
		if (img.getColorModel().hasAlpha()) {
			fb = new float[4];
			if ((t == BufferedImage.TYPE_INT_ARGB)
					|| (t == BufferedImage.TYPE_INT_ARGB_PRE)) {
				// RGB Type
				fb[0] = fa[0];
				fb[1] = fa[1];
				fb[2] = fa[2];
				fb[3] = 1f;
			} else {
				// this isn't tested :-(
				fb[0] = 1f;
				fb[1] = fa[0];
				fb[2] = fa[1];
				fb[3] = fa[2];
			}
		} else {
			fb = new float[3];
			if (t == BufferedImage.TYPE_3BYTE_BGR) {
				// BGR Type (actually it looks like RBG...)
				fb[0] = fa[0];
				fb[1] = fa[2];
				fb[2] = fa[1];
			} else {
				fb[0] = fa[0];
				fb[1] = fa[1];
				fb[2] = fa[2];
			}
		}
		return fb;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * digilib.image.DocuImageImpl#colorOp(digilib.image.DocuImage.ColorOps)
	 */
	public void colorOp(ColorOp op) throws ImageOpException {
		if (op == ColorOp.GRAYSCALE) {
			// convert image to grayscale
			logger.debug("Color op: grayscaling");
			ColorConvertOp colop = new ColorConvertOp(
					ColorSpace.getInstance(ColorSpace.CS_GRAY), renderHint);
			img = colop.filter(img, null);
		} else if (op == ColorOp.INVERT) {
			// invert colors i.e. invert every channel
			logger.debug("Color op: inverting");
			// TODO: is this enough for all image types?
			LookupTable invtbl = null;
			ColorModel cm = img.getColorModel();
			if (cm.hasAlpha()) {
				// JDK 1.6 in Linux (at least) is broken :-(
				invtbl = invertRgbaByteTable;
			} else {
				invtbl = invertSingleByteTable;
			}
			LookupOp colop = new LookupOp(invtbl, renderHint);
			logger.debug("colop: image="+img+" colormodel="+cm);
			img = colop.filter(img, null);
		}

	}

	public void rotate(double angle) throws ImageOpException {
		// setup rotation
		double rangle = Math.toRadians(angle);
		// create offset to make shure the rotated image has no negative
		// coordinates
		double w = img.getWidth();
		double h = img.getHeight();
		AffineTransform trafo = new AffineTransform();
		// center of rotation
		double x = (w / 2);
		double y = (h / 2);
		trafo.rotate(rangle, x, y);
		// try rotation to see how far we're out of bounds
		AffineTransformOp rotOp = new AffineTransformOp(trafo, renderHint);
		Rectangle2D rotbounds = rotOp.getBounds2D(img);
		double xoff = rotbounds.getX();
		double yoff = rotbounds.getY();
		// move image back in line
		trafo.preConcatenate(AffineTransform.getTranslateInstance(-xoff, -yoff));
		// transform image
		rotOp = new AffineTransformOp(trafo, renderHint);
		BufferedImage rotImg = rotOp.filter(img, null);
		// calculate new bounding box
		// Rectangle2D bounds = rotOp.getBounds2D(img);
		img = rotImg;
		// crop new image (with self-made rounding)
		/*
		 * img = rotImg.getSubimage( (int) (bounds.getX()+0.5), (int)
		 * (bounds.getY()+0.5), (int) (bounds.getWidth()+0.5), (int)
		 * (bounds.getHeight()+0.5));
		 */
	}

	public void mirror(double angle) throws ImageOpException {
		// setup mirror
		double mx = 1;
		double my = 1;
		double tx = 0;
		double ty = 0;
		if (Math.abs(angle - 0) < epsilon) { // 0 degree
			mx = -1;
			tx = getWidth();
		} else if (Math.abs(angle - 90) < epsilon) { // 90 degree
			my = -1;
			ty = getHeight();
		} else if (Math.abs(angle - 180) < epsilon) { // 180 degree
			mx = -1;
			tx = getWidth();
		} else if (Math.abs(angle - 270) < epsilon) { // 270 degree
			my = -1;
			ty = getHeight();
		} else if (Math.abs(angle - 360) < epsilon) { // 360 degree
			mx = -1;
			tx = getWidth();
		}
		AffineTransformOp mirOp = new AffineTransformOp(new AffineTransform(mx,
				0, 0, my, tx, ty), renderHint);
		BufferedImage mirImg = mirOp.filter(img, null);
		img = mirImg;
	}

	public void dispose() {
	    // is this necessary?
		img = null;
	}

	public Image getAwtImage(){
		return (Image) img;
	}
	
	
}
