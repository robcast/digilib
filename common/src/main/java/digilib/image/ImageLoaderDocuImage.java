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
import java.awt.image.BandCombineOp;
import java.awt.image.BufferedImage;
import java.awt.image.ByteLookupTable;
import java.awt.image.ColorConvertOp;
import java.awt.image.ColorModel;
import java.awt.image.ConvolveOp;
import java.awt.image.IndexColorModel;
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

import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageInput;
import digilib.util.ImageSize;

/** Implementation of DocuImage using the ImageLoader API of Java 1.4 and Java2D. */
public class ImageLoaderDocuImage extends ImageInfoDocuImage {
    
	/** image object */
	protected BufferedImage img;
	
	/** the reader object */
	protected ImageReader reader = null;
	
    /** try to reuse reader object */
    public boolean reuseReader = false;
    
	/** interpolation type */
	protected RenderingHints renderHint = null;

	/** convolution kernels for blur() */
	protected static Kernel[] convolutionKernels = {
	        null,
	        new Kernel(1, 1, new float[] {1f}),
            new Kernel(2, 2, new float[] {0.25f, 0.25f, 0.25f, 0.25f}),
            new Kernel(3, 3, new float[] {1f/9f, 1f/9f, 1f/9f, 1f/9f, 1f/9f, 1f/9f, 1f/9f, 1f/9f, 1f/9f})
	};

	/* lookup tables for inverting images (byte) */
	protected static LookupTable invertSingleByteTable;
    protected static LookupTable invertRgbaByteTable;
    protected static boolean needsInvertRgba = false;
	/* RescaleOp for contrast/brightness operation */
    protected static boolean needsRescaleRgba = false;
    /* lookup table for false-color */
    protected static LookupTable mapBgrByteTable;
    protected static boolean needsMapBgr = false;
    
	static {
	    /*
	     * create static lookup tables
	     */
		byte[] invertByte = new byte[256];
		byte[] orderedByte = new byte[256];
		byte[] nullByte = new byte[256];
        byte[] mapR = new byte[256];
        byte[] mapG = new byte[256];
        byte[] mapB = new byte[256];
		for (int i = 0; i < 256; ++i) {
		    // counting down
			invertByte[i] = (byte) (256 - i);
			// counting up
			orderedByte[i] = (byte) i;
			// constant 0
			nullByte[i] = 0;
			// three overlapping slopes
			if (i < 64) {
			    mapR[i] = 0;
			    mapG[i] = (byte) (4 * i);
			    mapB[i] = (byte) 255;
			} else if (i >= 64 && i < 192) {
                mapR[i] = (byte) (2 * (i - 64));
                mapG[i] = (byte) 255;
                mapB[i] = (byte) (255 - 2 * (i - 64));
			} else {
                mapR[i] = (byte) 255;
                mapG[i] = (byte) (255 - (4 * (i - 192)));
                mapB[i] = 0;
			}
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
			needsInvertRgba = true;
			needsRescaleRgba = true;
			needsMapBgr = true;
		} else {
			invertRgbaByteTable = invertSingleByteTable;
		}
		// this hopefully works for all
        mapBgrByteTable = new ByteLookupTable(0, new byte[][] {
                mapR, mapG, mapB});
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
                    reader = getReader(input);
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
        ImageInput ii = null;
        if (!reuseReader) {
            // try parent method first
            ii = super.identify(input);
            if (ii != null) {
                return ii;
            }
        }
        logger.debug("identifying (ImageIO) " + input);
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
            if (!reuseReader && reader != null) {
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
			throw new FileOpException("Error reading image!", e);
		}
		if (img == null) {
		    throw new FileOpException("Unable to read image!");
		}
	}

	/**
	 * Get an ImageReader for the image file.
	 * 
	 * @return
	 */
	public ImageReader getReader(ImageInput input) throws IOException {
		logger.debug("get ImageReader for " + input);
		if (reuseReader && reader != null) {
		    logger.debug("reuseing ImageReader");
		    return reader;
		}
		ImageInputStream istream = null;
		if (input.hasImageInputStream()) {
			// ImageInputStream input
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
        //ImageReader reader = null;
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
			// invalidate image size
			imageSize = null;
			/* downconversion of highcolor images seems not to work
	        if (img.getColorModel().getComponentSize(0) > 8) {
	            logger.debug("converting to 8bit");
	            BufferedImage dest = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_3BYTE_BGR);
	            dest.createGraphics().drawImage(img, null, 0, 0);
	            img = dest;
	        } */
		} catch (IOException e) {
			throw new FileOpException("Unable to load File!", e);
		} finally {
		    if (!reuseReader && reader != null) {
		        reader.dispose();
		    }
		}
	}

	/* write image of type mt to Stream */
	public void writeImage(String mt, OutputStream ostream)
			throws ImageOpException, FileOpException {
		logger.debug("writeImage");
		// setup output
		ImageWriter writer = null;
		ImageOutputStream imgout = null;
		try {
			imgout = ImageIO.createImageOutputStream(ostream);
			if (mt == "image/jpeg") {
				/*
				 * JPEG doesn't do transparency so we have to convert any RGBA
				 * image to RGB or we the client will think its CMYK :-( *Java2D BUG*
				 */
				if (img.getColorModel().hasAlpha()) {
					logger.debug("BARF: JPEG with transparency!!");
                    BufferedImage rgbImg = new BufferedImage(img.getWidth(),
                            img.getHeight(), BufferedImage.TYPE_INT_RGB);
					rgbImg.createGraphics().drawImage(img, null, 0, 0);
					img = rgbImg;
				}
				writer = ImageIO.getImageWritersByFormatName("jpeg").next();
				if (writer == null) {
					throw new ImageOpException("Unable to get JPEG writer");
				}
				ImageWriteParam param = writer.getDefaultWriteParam();
				if (quality > 1) {
					// change JPEG compression quality
					param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
					param.setCompressionQuality(0.9f);
				}
				writer.setOutput(imgout);
				// render output
				logger.debug("writing JPEG");
				writer.write(null, new IIOImage(img, null, null), param);
			} else if (mt == "image/png") {
				// render output
				writer = ImageIO.getImageWritersByFormatName("png").next();
				if (writer == null) {
					throw new ImageOpException("Unable to get PNG writer");
				}
				writer.setOutput(imgout);
				logger.debug("writing PNG");
				writer.write(img);
			} else {
				// unknown mime type
				throw new ImageOpException("Unknown mime type: " + mt);
			}

		} catch (IOException e) {
		    logger.error("Error writing image:", e);
			throw new FileOpException("Error writing image!", e);
		}
		// TODO: should we: finally { writer.dispose(); }
	}

    public void scale(double scaleX, double scaleY) throws ImageOpException {
        logger.debug("scale: " + scaleX);
        /* for downscaling in high quality the image is blurred first */
        if ((scaleX <= 0.5) && (quality > 1)) {
            int bl = (int) Math.floor(1 / scaleX);
            blur(bl);
        }
        /* then scaled */
        AffineTransformOp scaleOp = new AffineTransformOp(
                AffineTransform.getScaleInstance(scaleX, scaleY), renderHint);
        img = scaleOp.filter(img, null);
        logger.debug("scaled to " + img.getWidth() + "x" + img.getHeight()
                + " img=" + img);
        // invalidate image size
        imageSize = null;
    }

	public void blur(int radius) throws ImageOpException {
		logger.debug("blur: " + radius);
		// minimum radius is 2
		int klen = Math.max(radius, 2);
		Kernel blur = null;
		if (klen < convolutionKernels.length) {
		    // use precalculated Kernel
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
		BufferedImage dest = null;
        // blur needs explicit destination image type for 3BYTE_BGR *Java2D BUG*
		if (img.getType() == BufferedImage.TYPE_3BYTE_BGR) {
		    logger.debug("blur: fixing destination image type");
		    dest = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_3BYTE_BGR);
		}
		img = blurOp.filter(img, dest);
		logger.debug("blurred: "+img);
	}

	public void crop(int x_off, int y_off, int width, int height)
			throws ImageOpException {
		// setup Crop
		img = img.getSubimage(x_off, y_off, width, height);
		logger.debug("CROP:" + img.getWidth() + "x"
				+ img.getHeight());
        // invalidate image size
        imageSize = null;
	}

	public void rotate(double angle) throws ImageOpException {
        logger.debug("rotate: " + angle);
		// setup rotation
		double rangle = Math.toRadians(angle);
		// center of rotation is center of image
        double w = img.getWidth();
        double h = img.getHeight();
		double x = (w / 2);
		double y = (h / 2);
        AffineTransform trafo = AffineTransform.getRotateInstance(rangle, x, y);
		AffineTransformOp rotOp = new AffineTransformOp(trafo, renderHint);
        // rotate bounds to see how much of the image would be off screen
		Rectangle2D rotbounds = rotOp.getBounds2D(img);
		double xoff = rotbounds.getX();
		double yoff = rotbounds.getY();
		if (Math.abs(xoff) > epsilon || Math.abs(yoff) > epsilon) {
		    // move image back on screen
		    logger.debug("move rotation: xoff="+xoff+" yoff="+yoff);
		    trafo.preConcatenate(AffineTransform.getTranslateInstance(-xoff, -yoff));
	        rotOp = new AffineTransformOp(trafo, renderHint);
		}
		// transform image
		img = rotOp.filter(img, null);
		logger.debug("rotated: "+img);
        // invalidate image size
        imageSize = null;
	}

	public void mirror(double angle) throws ImageOpException {
        logger.debug("mirror: " + angle);
		// setup mirror
		double mx = 1;
		double my = 1;
		double tx = 0;
		double ty = 0;
		if (Math.abs(angle - 0) < epsilon) { // 0 degree
			mx = -1;
			tx = img.getWidth();
		} else if (Math.abs(angle - 90) < epsilon) { // 90 degree
			my = -1;
			ty = img.getHeight();
		} else if (Math.abs(angle - 180) < epsilon) { // 180 degree
			mx = -1;
			tx = img.getWidth();
		} else if (Math.abs(angle - 270) < epsilon) { // 270 degree
			my = -1;
			ty = img.getHeight();
		} else if (Math.abs(angle - 360) < epsilon) { // 360 degree
			mx = -1;
			tx = img.getWidth();
		} else {
		    logger.error("invalid mirror angle "+angle);
		    return;
		}
		AffineTransformOp mirOp = new AffineTransformOp(new AffineTransform(mx,
				0, 0, my, tx, ty), renderHint);
		img = mirOp.filter(img, null);
        // invalidate image size
        imageSize = null;
	}

    public void enhance(float mult, float add) throws ImageOpException {
        RescaleOp op = null;
        logger.debug("enhance: img=" + img);
        if (needsRescaleRgba) {
            /*
             * Only one constant should work regardless of the number of bands
             * according to the JDK spec. Doesn't work on JDK 1.4 for OSX and
             * Linux (at least).
             * 
             * The number of constants must match the number of bands in the
             * image.
             */
            int ncol = img.getColorModel().getNumComponents();
            float[] dm = new float[ncol];
            float[] da = new float[ncol];
            for (int i = 0; i < ncol; i++) {
                dm[i] = (float) mult;
                da[i] = (float) add;
            }
            op = new RescaleOp(dm, da, null);
        } else {
            op = new RescaleOp(mult, add, renderHint);
        }
        op.filter(img, img);
    }

    public void enhanceRGB(float[] rgbm, float[] rgba) throws ImageOpException {
        logger.debug("enhanceRGB: rgbm="+rgbm+" rgba="+rgba);
        /*
         * The number of constants must match the number of bands in the image.
         * We do only 3 (RGB) bands.
         */
        int ncol = img.getColorModel().getNumColorComponents();
        if ((ncol != 3) || (rgbm.length != 3) || (rgba.length != 3)) {
            logger.error("enhanceRGB: unknown number of color bands or coefficients ("
                            + ncol + ")");
            return;
        }
        if (img.getColorModel().hasAlpha()) {
            // add constant for alpha
            rgbm = new float[] {rgbm[0], rgbm[1], rgbm[2], 1};
            rgba = new float[] {rgba[0], rgba[1], rgba[2], 0};
        }
        RescaleOp scaleOp = new RescaleOp(rgbm, rgba, renderHint);
        scaleOp.filter(img, img);
    }

    /*
     * (non-Javadoc)
     * 
     * @see
     * digilib.image.DocuImageImpl#colorOp(digilib.image.DocuImage.ColorOps)
     */
    public void colorOp(ColorOp colop) throws ImageOpException {
        if (colop == ColorOp.GRAYSCALE) {
            /*
             * convert image to grayscale
             */
            logger.debug("Color op: grayscaling");
            ColorModel cm = img.getColorModel();
            if (cm.getNumColorComponents() < 3) {
                // grayscale already
                logger.debug("Color op: not grayscaling");
                return;
            }
            ColorConvertOp op = new ColorConvertOp(
                    ColorSpace.getInstance(ColorSpace.CS_GRAY), renderHint);
            // let filter create new image
            img = op.filter(img, null);
        } else if (colop == ColorOp.NTSC_GRAY) {
            /*
             * convert image to grayscale NTSC-style: luminance = 0.2989*red +
             * 0.5870*green + 0.1140*blue
             */
            logger.debug("Color op: NTSC gray");
            logger.debug("img="+img);
            ColorModel cm = img.getColorModel();
            if (cm.getNumColorComponents() < 3 || cm instanceof IndexColorModel) {
                // grayscale already or not possible
                logger.debug("Color op: unable to NTSC gray");
                return;
            }
            float[][] combineFn = new float[1][4];
            combineFn[0] = new float[] { 0.299f, 0.587f, 0.114f, 0f };
            BandCombineOp op = new BandCombineOp(combineFn, renderHint);
            // BandCombineOp only works on Rasters so we create a
            // new image and use its Raster
            BufferedImage dest = new BufferedImage(img.getWidth(),
                    img.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
            op.filter(img.getRaster(), dest.getRaster());
            img = dest;
        } else if (colop == ColorOp.INVERT) {
            /*
             * invert colors i.e. invert every channel
             */
            logger.debug("Color op: inverting");
            LookupTable invtbl = null;
            ColorModel cm = img.getColorModel();
            if (cm instanceof IndexColorModel) {
                // invert not possible
                // TODO: should we convert?
                logger.debug("Color op: unable to invert");
                return;
            }
            if (needsInvertRgba && cm.hasAlpha()) {
                // fix for some cases
                invtbl = invertRgbaByteTable;
            } else {
                invtbl = invertSingleByteTable;
            }
            LookupOp op = new LookupOp(invtbl, renderHint);
            logger.debug("colop: image=" + img);
            op.filter(img, img);
        } else if (colop == ColorOp.MAP_GRAY_BGR) {
            /*
             * false color image from grayscale (0: blue, 128: green, 255: red)
             */
            logger.debug("Color op: map_gray_bgr");
            // convert to grayscale
            ColorConvertOp grayOp = new ColorConvertOp(
                    ColorSpace.getInstance(ColorSpace.CS_GRAY), renderHint);
            // create new 3-channel image
            int destType = BufferedImage.TYPE_INT_RGB;
            if (needsMapBgr) {
                // special case for broken Java2Ds
                destType = BufferedImage.TYPE_3BYTE_BGR;
            }
            BufferedImage dest = new BufferedImage(img.getWidth(),
                    img.getHeight(), destType);
            img = grayOp.filter(img, dest);
            logger.debug("map_gray: image=" + img);
            // convert to false color
            LookupOp mapOp = new LookupOp(mapBgrByteTable, renderHint);
            mapOp.filter(img, img);
            logger.debug("mapped image=" + img);
        }
    }

	public void dispose() {
	    if (reader != null) {
	        reader.dispose();
	    }
	    // is this necessary?
		img = null;
	}

	public Image getAwtImage(){
		return (Image) img;
	}
	
	
}
