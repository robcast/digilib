package digilib.image;

/*
 * #%L
 * ImageLoaderDocuImage -- Image class implementation using JDK 1.4 ImageLoader
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2002 - 2013 MPIWG Berlin
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Author: Robert Casties (robcast@berlios.de)
 */

import java.awt.Image;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.Transparency;
import java.awt.color.ColorSpace;
import java.awt.color.ICC_ColorSpace;
import java.awt.color.ICC_Profile;
import java.awt.geom.AffineTransform;
import java.awt.geom.Rectangle2D;
import java.awt.image.AffineTransformOp;
import java.awt.image.BandCombineOp;
import java.awt.image.BufferedImage;
import java.awt.image.ByteLookupTable;
import java.awt.image.ColorConvertOp;
import java.awt.image.ColorModel;
import java.awt.image.ComponentColorModel;
import java.awt.image.ConvolveOp;
import java.awt.image.DataBuffer;
import java.awt.image.DirectColorModel;
import java.awt.image.IndexColorModel;
import java.awt.image.Kernel;
import java.awt.image.LookupOp;
import java.awt.image.LookupTable;
import java.awt.image.PixelInterleavedSampleModel;
import java.awt.image.Raster;
import java.awt.image.RescaleOp;
import java.awt.image.WritableRaster;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;
import java.util.zip.DeflaterOutputStream;
import java.util.zip.InflaterOutputStream;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageTypeSpecifier;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOInvalidTreeException;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.stream.FileImageInputStream;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageInput;
import digilib.util.ImageSize;

/**
 * Implementation of DocuImage using the ImageLoader API of Java 1.4 and Java2D.
 */
public class ImageLoaderDocuImage extends ImageInfoDocuImage {

    /** DocuImage version */
    public static final String version = "ImageLoaderDocuImage 2.3.1";

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
            null, new Kernel(1, 1, new float[] { 1f }),
            new Kernel(2, 2, new float[] { 0.25f, 0.25f, 
                    0.25f, 0.25f }),
            new Kernel(3, 3, new float[] { 1f / 9f, 1f / 9f, 1f / 9f, 
                    1f / 9f, 1f / 9f, 1f / 9f, 
                    1f / 9f, 1f / 9f, 1f / 9f }) };

    /** lookup table for inverting images (byte) */
    protected static LookupTable invertSingleByteTable;
    /** lookup table for inverting images (byte) */
    protected static LookupTable invertRgbaByteTable;
    /** lookup table for false-color */
    protected static LookupTable mapBgrByteTable;

    /** hacks for specific platform bugs */ 
    protected static enum Hacks {
        /** table for LookupOp for inversion needs four channels including alpha */
        needsInvertRgba,
        /** table for RescaleOp for enhance needs four channels */
        needsRescaleRgba,
        /** destination image type for LookupOp(mapBgrByteTable) needs to be (A)BGR */ 
        needsMapBgr, 
        /** set destination type for scale operation */
        forceDestForScaleCustom,
        /** JPEG writer can't deal with RGBA */
        needsJpegWriteRgb,
        /** add ICC profile to PNG metadata manually */
        needsPngWriteProfile,
        /** load ICC profile from PNG metadata manually */
        needsPngLoadProfile,
        /** convert images with 16 bit depth to 8 bit depth */
        force16BitTo8,
        /** convert images with 16 bit depth to sRGB (and 8 bit depth) */ 
        force16BitToSrgb8
    }

    /** active hacks */
    protected static EnumMap<Hacks, Boolean> imageHacks = new EnumMap<Hacks, Boolean>(Hacks.class);

    /** preferred image reader classes */
    protected static Map<String, String> preferredReaders = new HashMap<String, String>();

    /** preferred image writer classes */
    protected static Map<String, String> preferredWriters = new HashMap<String, String>();

    static {
        // init imageHacks
        for (Hacks h : Hacks.values()) {
            imageHacks.put(h, false);
        }
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
            invertByte[i] = (byte) (255 - i);
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
        invertRgbaByteTable = invertSingleByteTable;
        // but doesn't work with alpha channel on all platforms
        String ver = System.getProperty("java.version");
        String os = System.getProperty("os.name");
        String osver = System.getProperty("os.version");
        logger.debug("os={} ver={} java_version={}", os, osver, ver);
        if ((os.startsWith("Linux"))
                || (os.startsWith("Mac OS X") && osver.startsWith("10.7"))) {
            // GRAB(WTF?) works for Linux JDK1.6 with transparency
            imageHacks.put(Hacks.needsInvertRgba, true);
            invertRgbaByteTable = new ByteLookupTable(0, new byte[][] { invertByte, invertByte, orderedByte, invertByte });
            imageHacks.put(Hacks.needsRescaleRgba, true);
            imageHacks.put(Hacks.needsMapBgr, true);
        } else if ((os.startsWith("Mac OS X") && (osver.startsWith("10.5") || osver.startsWith("10.6"))) 
                || (os.startsWith("Windows"))) {
            imageHacks.put(Hacks.needsRescaleRgba, true);
        }
        // this hopefully works for all
        mapBgrByteTable = new ByteLookupTable(0, new byte[][] { mapR, mapG, mapB });
        imageHacks.put(Hacks.force16BitTo8, true);
        imageHacks.put(Hacks.forceDestForScaleCustom, true);
        imageHacks.put(Hacks.needsJpegWriteRgb, true);
        imageHacks.put(Hacks.needsPngWriteProfile, true);
        imageHacks.put(Hacks.needsPngLoadProfile, true);
        // print current hacks
        StringBuffer msg = new StringBuffer();
        for (Entry<Hacks, Boolean> kv : imageHacks.entrySet()) {
            msg.append(kv.getKey() + "=" + kv.getValue() + " ");
        }
        logger.debug("Default DocuImage Hacks: {}", msg);
    }

    /** the size of the current image */
    protected ImageSize imageSize;

    /** ICC color profile of the current image (null=sRGB) */
    protected ICC_Profile colorProfile;

    @Override
    public void setHacks(String hackString) {
        if (hackString == null || hackString.isEmpty()) {
            return;
        }
        // read hack values from String
        for (String h : hackString.split(",")) {
            String[] hs = h.split("=");
            try {
                Hacks key = Hacks.valueOf(hs[0]);
                Boolean val = hs[1].equals("true");
                imageHacks.put(key, val);
            } catch (Exception e) {
                logger.error("Error setting DocuImage Hacks!", e);
            }
        }
        // print current hacks
        StringBuffer msg = new StringBuffer("DocuImage Hacks: ");
        for (Entry<Hacks, Boolean> kv : imageHacks.entrySet()) {
            msg.append(kv.getKey() + "=" + kv.getValue() + " ");
        }
        logger.debug("{}", msg);
    }

    @Override
    public String getHacksAsString() {
        StringBuffer msg = new StringBuffer();
        for (Entry<Hacks, Boolean> kv : imageHacks.entrySet()) {
            msg.append(kv.getKey() + "=" + kv.getValue() + ",");
        }
        return msg.toString();
    }

    @Override
    public void setReaderClasses(Map<String, String> typeClassMap) {
        preferredReaders = typeClassMap;		
    }

    @Override
    public void setWriterClasses(Map<String, String> typeClassMap) {
        preferredWriters = typeClassMap;		
    }

    @Override   
    public String getVersion() {
        return version;
    }

    /* 
     * loadSubimage is supported.
     * @see digilib.image.DocuImageImpl#isSubimageSupported()
     */
    @Override   
    public boolean isSubimageSupported() {
        return true;
    }

    @Override   
    public void setQuality(int qual) {
        quality = qual;
        renderHint = new RenderingHints(null);
        // setup interpolation quality
        if (qual > 0) {
            logger.debug("quality q1+");
            renderHint.put(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            renderHint.put(RenderingHints.KEY_COLOR_RENDERING, RenderingHints.VALUE_COLOR_RENDER_QUALITY);
        } else {
            logger.debug("quality q0");
            renderHint.put(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
        }
    }

    /* 
     * returns the size of the current image
     * @see digilib.image.DocuImageImpl#getSize()
     */
    @Override   
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

    /* 
     * returns a list of supported image formats
     * @see digilib.image.DocuImageImpl#getSupportedFormats()
     */
    @Override   
    public Iterator<String> getSupportedFormats() {
        String[] formats = ImageIO.getReaderFormatNames();
        return Arrays.asList(formats).iterator();
    }

    /**
     * Create an empty BufferedImage that is compatible and uses the same ColorModel as oldImg.
     * 
	 * @param width
	 * @param height
	 * @param hasAlpha
	 * @param oldImg
	 * @return
	 */
	protected BufferedImage createCompatibleImage(int width, int height, boolean hasAlpha, 
	        BufferedImage oldImg) {
		ColorModel oldCM = oldImg.getColorModel();
		boolean isAlphaPre = oldCM.isAlphaPremultiplied();
		int transferType = oldCM.getTransferType();
		int transparency = oldCM.getTransparency();
        ColorSpace newCS = oldCM.getColorSpace();
		ColorModel newCM;
		if (oldCM instanceof ComponentColorModel) {
		    newCM = new ComponentColorModel(newCS, hasAlpha, isAlphaPre, transparency, transferType);
		} else if (oldCM instanceof DirectColorModel) {
            final DirectColorModel oldDCM = (DirectColorModel) oldCM;
            newCM = new DirectColorModel(newCS, oldCM.getPixelSize(), 
                    oldDCM.getRedMask(), oldDCM.getGreenMask(), oldDCM.getBlueMask(), oldDCM.getAlphaMask(),
                    isAlphaPre, transferType);
        } else {
            logger.warn("Unknown ColorModel in createCompatibleImage! Returning null.");
            return null;
        }
		WritableRaster outRaster = newCM.createCompatibleWritableRaster(width, height);
		BufferedImage bi = new BufferedImage(newCM, outRaster, false, null);
		return bi;
	}

    /**
     * Change the color profile of a BufferedImage while keeping the same raw pixel values.
     * 
     * Returns a new BufferedImage with the given profile.
     * 
     * @param bi
     * @param profile
     * @return
     */
    protected BufferedImage changeColorProfile(BufferedImage bi, ICC_Profile profile) {
        ColorModel cm = bi.getColorModel();
        boolean hasAlpha = cm.hasAlpha();
        boolean isAlphaPre = cm.isAlphaPremultiplied();
        int transferType = cm.getTransferType();
        int transparency = cm.getTransparency();
        ColorSpace newCs = new ICC_ColorSpace(profile);
        ColorModel newCm = new ComponentColorModel(newCs, hasAlpha, isAlphaPre, transparency, transferType);
        WritableRaster newRaster = newCm.createCompatibleWritableRaster(bi.getWidth(), bi.getHeight());
        BufferedImage newBi = new BufferedImage(newCm, newRaster, isAlphaPre, null);
        newBi.setData(bi.getRaster());
        return newBi;
    }

    /**
     * Change the pixels of a BufferedImage in-place from the given profile to the
     * sRGB color space.
     * 
     * This is only useful if the BufferedImage has an sRGB ColorSpace but the pixel
     * values are actually matching realProfile.
     * 
     * @param img
     * @param realProfile
     */
    protected void changeRasterToSrgb(BufferedImage img, ICC_Profile realProfile) {
        ICC_Profile srgbProf = ICC_Profile.getInstance(ColorSpace.CS_sRGB);
        ColorConvertOp cco = new ColorConvertOp(new ICC_Profile[] { realProfile, srgbProf }, null);
        WritableRaster colorRaster;
        if (img.getColorModel().hasAlpha()) {
            // use child Raster with only color components (bands 0,1,2)
            colorRaster = img.getRaster().createWritableChild(0, 0, img.getWidth(), img.getHeight(), 
                    0, 0, new int[] { 0, 1, 2 });
        } else {
            // use full Raster
            colorRaster = img.getRaster();
        }
        cco.filter(colorRaster, colorRaster);
    }

    /**
     * Change the color depth of a BufferedImage to 8 bit.
     * 
     * @param bi
     * @return
     */
    protected BufferedImage changeTo8BitDepth(BufferedImage bi) {
        // method suggested by Harald K in https://stackoverflow.com/a/74995441/4912
        ColorModel cm = bi.getColorModel();
        ColorSpace cs = cm.getColorSpace();
        boolean hasAlpha = cm.hasAlpha();
        boolean isAlphaPre = cm.isAlphaPremultiplied();
        int transparency = cm.getTransparency();
        int transferType = DataBuffer.TYPE_BYTE;
        // build new ColorModel
        ColorModel newCm = new ComponentColorModel(cs, hasAlpha, isAlphaPre, transparency, transferType);
        WritableRaster newRaster = newCm.createCompatibleWritableRaster(bi.getWidth(), bi.getHeight());
        BufferedImage newBi = new BufferedImage(newCm, newRaster, isAlphaPre, null);
        // convert using setData
        // newImage.setData(as8BitRaster(original.getRaster())); // Works
        newRaster.setDataElements(0, 0, as8BitRaster(bi.getRaster())); // Faster, requires less conversion
        return newBi;
    }

    /**
     * A Raster that returns the upper 8 bit of each channel of the given raster.
     *   
     * @param raster
     * @return
     */
    private Raster as8BitRaster(WritableRaster raster) {
        // Assumption: Raster is TYPE_USHORT (16 bit) and has PixelInterleavedSampleModel
        PixelInterleavedSampleModel sampleModel = (PixelInterleavedSampleModel) raster.getSampleModel();
        // create a custom data buffer, that delegates to the original 16 bit buffer
        final DataBuffer buffer = raster.getDataBuffer();
        final DataBuffer convBuffer = new DataBuffer(DataBuffer.TYPE_BYTE, buffer.getSize()) {
            @Override
            public int getElem(int bank, int i) {
                // return only the upper 8 bits of the 16 bit sample
                return buffer.getElem(bank, i) >>> 8;
            }

            @Override
            public void setElem(int bank, int i, int val) {
                throw new UnsupportedOperationException("Raster is read only!");
            }
        };
        final WritableRaster newRaster = Raster.createInterleavedRaster(convBuffer, 
                raster.getWidth(), raster.getHeight(),
                sampleModel.getScanlineStride(), sampleModel.getPixelStride(), sampleModel.getBandOffsets(),
                null);
        return newRaster;
    }

    /**
     * Change the bit-depth of an image to 8 bit and remove the alpha channel.
     * 
     * Removes the alpha channel by ignoring the alpha band.
     * Returns a new BufferedImage using the same ColorSpace.
     * 
     * @param bi
     * @return
     */
    protected BufferedImage changeTo8BitNoAlpha(BufferedImage bi) {
        BufferedImage newBi;
        ColorModel cm = bi.getColorModel();
        if (cm instanceof ComponentColorModel || cm instanceof DirectColorModel) {
            ColorSpace newCs = cm.getColorSpace();
            ColorModel newCm = new ComponentColorModel(newCs, false, false, Transparency.OPAQUE, DataBuffer.TYPE_BYTE);
            WritableRaster newRaster = newCm.createCompatibleWritableRaster(bi.getWidth(), bi.getHeight());
            // use child Raster with only color components (bands 0,1,2)
            final int[] colorBands = new int[] { 0, 1, 2 };
            WritableRaster colorRaster = bi.getRaster().createWritableChild(0, 0, bi.getWidth(), bi.getHeight(), 0, 0,
                    colorBands);
            newBi = new BufferedImage(newCm, newRaster, false, null);
            newBi.setData(colorRaster);
        } else {
            logger.debug("changeTo8BitNonAlpha: converting to sRGB");
            ColorConvertOp cco = new ColorConvertOp(ColorSpace.getInstance(ColorSpace.CS_sRGB), renderHint);
            BufferedImage dest = new BufferedImage(bi.getWidth(), bi.getHeight(), BufferedImage.TYPE_INT_RGB);
            newBi = cco.filter(bi, dest);
        }
        return newBi;
    }

    /* 
     * Check image size and type and store in ImageInput
     * @see digilib.image.ImageInfoDocuImage#identify(digilib.io.ImageInput)
     */
    @Override   
    public ImageInput identify(ImageInput input) throws IOException {
        ImageInput ii = null;
        if (!reuseReader) {
            // try parent method first
            ii = super.identify(input);
            if (ii != null) {
                return ii;
            }
        }
        logger.debug("identifying (ImageIO) {}", input);
        try {
            /*
             * try ImageReader
             */
            reader = getReader(input);
            // set size
            ImageSize d = new ImageSize(reader.getWidth(0), reader.getHeight(0));
            input.setSize(d);
            logger.debug("image size: {}", d);
            // set tile size
            if (reader.isImageTiled(0)) {
                ImageSize ts = new ImageSize(reader.getTileWidth(0), reader.getTileHeight(0));
                input.setTileSize(ts);
                logger.debug("tile size: {}", ts);
                // set tiled tag
                input.setTag(ImageInput.InputTag.TILED);
            }
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
            // set sendable tag
            if (FileOps.isMimeTypeSendable(input.getMimetype())) {
                input.setTag(ImageInput.InputTag.SENDABLE);
            }
            return input;
        } catch (FileOpException e) {
            // maybe just our class doesn't know what to do
            logger.error("ImageLoaderDocuimage unable to identify: {}", e);
            return null;
        } finally {
            if (!reuseReader && reader != null) {
                reader.dispose();
            }
        }
    }

    /* 
     * load image file
     * @see digilib.image.DocuImageImpl#loadImage(digilib.io.ImageInput)
     */
    @Override   
    public void loadImage(ImageInput ii) throws FileOpException {
        logger.debug("loadImage: {}", ii);
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
     * Get an ImageReader for the image input.
     * 
     * @param input the ImageInput
     * @return the ImageReader
     * @throws IOException on error
     */
    protected ImageReader getReader(ImageInput input) throws IOException {
        logger.debug("get ImageReader for {}", input);
        if (reuseReader && reader != null) {
            logger.debug("reusing ImageReader");
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
        String mt = null;
        if (input.hasMimetype()) {
            // check hasMimetype first or we might get into a loop
            mt = input.getMimetype();
        } else {
            // try file extension
            mt = FileOps.mimeForFile(input.getFile());
        }
        ImageReader reader = null;
        if (mt == null) {
            logger.debug("No mime-type. Trying automagic.");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(istream);
            if (readers.hasNext()) {
                reader = readers.next();
            } else {
                throw new FileOpException("Can't find Reader to load File without mime-type!");
            }
        } else {
            logger.debug("File type: {}", mt);
            // let ImageIO choose Reader
            Iterator<ImageReader> readers = ImageIO.getImageReadersByMIMEType(mt);
            if (readers.hasNext()) {
                reader = readers.next();
            } else {
                throw new FileOpException("Can't find Reader to load File with mime-type "+mt+"!");
            }
            if (preferredReaders.containsKey(mt)) {
                // use preferred Reader class
                String preferredClass = preferredReaders.get(mt);
                while (!reader.getClass().getName().equals(preferredClass)) {
                    if (readers.hasNext()) {
                        reader = readers.next();
                    } else {
                        throw new FileOpException("Unable to find preferred Reader "+preferredClass+"!");
                    }
                }
            }
        }
        if (reader == null) {
            throw new FileOpException("Error getting Reader to load File!");
        }
        logger.debug("ImageIO: reader: {}", reader.getClass());
        reader.setInput(istream);
        return reader;
    }

    /**
     * Extracts the ICC color profile from the PNG iCCP element of the given ImageReader.
     *  
     * @param reader
     * @return
     * @throws IOException
     */
    protected ICC_Profile getPngColorProfile(ImageReader reader) throws IOException {
        ICC_Profile profile = null;
        IIOMetadata meta = reader.getImageMetadata(0);
        IIOMetadataNode dom = (IIOMetadataNode) meta.getAsTree(meta.getNativeMetadataFormatName());
        NodeList iccpNodes = dom.getElementsByTagName("iCCP");
        if (iccpNodes.getLength() > 0) {
            logger.debug("extracting iCCP profile from PNG.");
            IIOMetadataNode iccpNode = (IIOMetadataNode) iccpNodes.item(0);
            NamedNodeMap atts = iccpNode.getAttributes();
            //String name = atts.getNamedItem("profileName").getNodeValue();
            String compression = atts.getNamedItem("compressionMethod").getNodeValue();
            byte[] iccpData = (byte[]) iccpNode.getUserObject();
            if (compression.equals("deflate")) {
                ByteArrayOutputStream inflated = new ByteArrayOutputStream();
                InflaterOutputStream inflater = new InflaterOutputStream(inflated);
                inflater.write(iccpData);
                inflater.flush();
                inflater.close();
                byte[] data = inflated.toByteArray();
                profile = ICC_Profile.getInstance(data);
            } else {
                // not sure if non-compressed is allowed in PNG
                profile = ICC_Profile.getInstance(iccpData);
            }
        }
        return profile;
    }

    /* 
     * Load an image file into the Object.
     * 
     * @see digilib.image.DocuImageImpl#loadSubimage(digilib.io.ImageInput, java.awt.Rectangle, int)
     */
    @Override   
    public void loadSubimage(ImageInput ii, Rectangle region, int prescale) throws FileOpException {
        logger.debug("loadSubimage");
        this.input = ii;
        try {
            reader = getReader(ii);
            /*
             * set up reader parameters
             */
            ImageReadParam readParam = reader.getDefaultReadParam();
            readParam.setSourceRegion(region);
            if (prescale > 1) {
                readParam.setSourceSubsampling(prescale, prescale, 0, 0);
            }

            /*
             * read image
             */
            logger.debug("loadSubimage: loading...");
            img = reader.read(0, readParam);
            logger.debug("loadSubimage: loaded {}", img);
            // invalidate image size if it was set
            imageSize = null;

            //testPixels(img);

            /*
             * process color profile
             * 
             * convert image to sRGB color space for quality q<3
             */
            boolean convertToSrgb = (quality < 3);
            ColorModel cm = img.getColorModel();
            ColorSpace cs = cm.getColorSpace();
            if (cm.getComponentSize(0) > 8) {
                if (imageHacks.get(Hacks.force16BitToSrgb8)) {
                    // higher color depths lead to imaging errors, we have to force sRGB
                    logger.warn("Converting 16bit image to 8bit sRGB to avoid Java imaging issues.");
                    convertToSrgb = true;
                } else if (!convertToSrgb && imageHacks.get(Hacks.force16BitTo8)) {
                    // convert higher color depths to 8 bit
                    logger.debug("loadSubimage: converting to 8bit");
                    try {
                        // changeTo8BitDepth may fail for incompatible image types
                        img = changeTo8BitDepth(img);
                        logger.debug("loadSubimage: converted to {}", img);
                        cm = img.getColorModel();
                        cs = cm.getColorSpace();
                    } catch (Exception e) {
                        logger.warn("Converting image to 8bit failed! Trying to convert to sRGB: {}", e.toString());
                        convertToSrgb = true;
                    }
                }
            }
            if (!convertToSrgb && (cs instanceof ICC_ColorSpace) && !cs.isCS_sRGB()) {
                // save ICC color profile
                colorProfile = ((ICC_ColorSpace) cs).getProfile();
                logger.debug("loadSubimage: saving ICC color profile {}", colorProfile);
            }

            // fix PNG reader not processing color profiles
            if (ii.getMimetype().equals("image/png") && imageHacks.get(Hacks.needsPngLoadProfile)) {
                // extract real profile from PNG reader
                ICC_Profile pngProfile = getPngColorProfile(reader);
                if (pngProfile != null) {
                    logger.debug("loadSubimage: fixing PNG image with color profile {}", pngProfile);
                    // change image to correct profile
                    if (convertToSrgb && cm.getComponentSize(0) == 8 && cm.getNumColorComponents() == 3) {
                        // faster way to sRGB
                        changeRasterToSrgb(img, pngProfile);
                    } else {
                        // change image to real profile
                        img = changeColorProfile(img, pngProfile);
                        cm = img.getColorModel();
                        cs = cm.getColorSpace();
                        colorProfile = pngProfile;
                    }
                }
            }

            // convert image to sRGB if necessary
            if (convertToSrgb && !cs.isCS_sRGB() && (cm.getNumColorComponents() > 1)) {
                logger.debug("loadSubimage: converting to sRGB");
                ColorConvertOp cco = new ColorConvertOp(ColorSpace.getInstance(ColorSpace.CS_sRGB), renderHint);
                // null destination also converts to 8bit depth
                img = cco.filter(img, null);
                logger.debug("loadSubimage: converted to {}", img);
                cm = img.getColorModel();
                cs = cm.getColorSpace();
            }

        } catch (FileOpException e) {
            // re-throw lower level exception
            throw e;
        } catch (IOException e) {
            throw new FileOpException("Unable to load File!", e);
        } finally {
            if (!reuseReader && reader != null) {
                reader.dispose();
            }
        }
    }

    /**
     * Get an ImageWriter for the mime-type.
     * 
     * @param mimetype
     * @return
     * @throws ImageOpException 
     */
    protected ImageWriter getWriter(String mimetype) throws ImageOpException {
        ImageWriter writer = null;
        // let ImageIO choose Writer
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByMIMEType(mimetype);
        if (writers.hasNext()) {
            writer = writers.next();
        } else {
            throw new ImageOpException("Can't find Writer to write File with mime-type "+mimetype+"!");
        }
        if (preferredWriters.containsKey(mimetype)) {
            // use preferred Reader class
            String preferredClass = preferredWriters.get(mimetype);
            while (!writer.getClass().getName().equals(preferredClass)) {
                if (writers.hasNext()) {
                    writer = writers.next();
                } else {
                    throw new ImageOpException("Unable to find preferred Writer "+preferredClass+"!");
                }
            }
        }
        return writer;
    }

    /* 
     * (non-Javadoc)
     * @see digilib.image.DocuImageImpl#writeImage(java.lang.String, java.io.OutputStream)
     */
    @Override   
    public void writeImage(String mt, OutputStream ostream) throws ImageOpException, FileOpException {
        logger.debug("writeImage");
        //testPixels(img);
        // set up output
        ImageWriter writer = null;
        ImageOutputStream imgout = null;
        try {
            imgout = ImageIO.createImageOutputStream(ostream);
            if (mt == "image/jpeg") {
                writer = getWriter(mt);
                logger.debug("ImageIO: writer: {}", writer.getClass());
                writer.setOutput(imgout);
                writeJpeg(writer);
            } else if (mt == "image/png") {
                writer = getWriter(mt);
                logger.debug("ImageIO: writer: {}", writer.getClass());
                writer.setOutput(imgout);
                writePng(writer);
            } else {
                // unknown mime type
                throw new ImageOpException("Unknown output mime type: " + mt);
            }
        } catch (IOException e) {
            logger.error("Error writing image: {}", e.getMessage());
            throw new ImageOutputException("Error writing image!", e);
        } finally {
            if (writer != null) {
                writer.dispose();
            }
            if (imgout != null) {
                /* 
                 * ImageOutputStream likes to keep ServletOutputStream and close it when disposed.
                 * Thanks to Tom Van Wietmarschen's mail to tomcat-users on July 4, 2008!
                 */
                try {
                    imgout.close();
                } catch (IOException e) {
                    logger.error("Error closing ImageOutputStream! {}", e.getMessage());
                }
            }
        }
    }

    /**
     * Write the current image to the given ImageWriter as PNG with the correct color profile.
     * 
     * @param writer
     * @throws IOException
     * @throws IIOInvalidTreeException
     */
    protected void writePng(ImageWriter writer) throws IOException, IIOInvalidTreeException {
        IIOMetadata meta = null;
        if (colorProfile != null) {
            // we have a target color profile
            ColorSpace cs = img.getColorModel().getColorSpace();
            if (cs instanceof ICC_ColorSpace && ((ICC_ColorSpace) cs).getProfile() == colorProfile) {
                // img matches colorProfile
                if (imageHacks.get(Hacks.needsPngWriteProfile)) {
                    /*
                     * manually add ICC profile in iCCP (thanks to
                     * https://stackoverflow.com/a/20884108/4912 )
                     */
                    logger.debug("adding color profile to PNG: {}", colorProfile);
                    // deflate ICC profile data
                    byte[] data = colorProfile.getData();
                    ByteArrayOutputStream deflated = new ByteArrayOutputStream();
                    DeflaterOutputStream deflater = new DeflaterOutputStream(deflated);
                    deflater.write(data);
                    deflater.flush();
                    deflater.close();
                    // create ICC profile atom
                    IIOMetadataNode iccp = new IIOMetadataNode("iCCP");
                    iccp.setUserObject(deflated.toByteArray());
                    iccp.setAttribute("profileName", "ICC profile");
                    iccp.setAttribute("compressionMethod", "deflate");
                    // add to metadata for writer
                    meta = writer.getDefaultImageMetadata(ImageTypeSpecifier.createFromRenderedImage(img),
                            writer.getDefaultWriteParam());
                    Node dom = meta.getAsTree(meta.getNativeMetadataFormatName());
                    dom.appendChild(iccp);
                    meta.mergeTree(meta.getNativeMetadataFormatName(), dom);
                }
            } else {
                logger.warn("writePng: image (sRGB={}) does not match destination color profile {}", cs.isCS_sRGB(), colorProfile);
            }
        }
        // render output
        logger.debug("writing PNG");
        writer.write(new IIOImage(img, null, meta));
    }

    /**
     * Write the current image to the given ImageWriter as JPEG with the correct color profile.
     * 
     * @param writer
     * @throws IOException
     */
    protected void writeJpeg(ImageWriter writer) throws IOException {
        /*
         * JPEG doesn't do transparency so we have to convert any RGBA
         * image to RGB or all clients will think its CMYK :-( (Java2D BUG)
         */
        if (imageHacks.get(Hacks.needsJpegWriteRgb) && img.getColorModel().hasAlpha()) {
            logger.debug("flattening JPEG with alpha channel");
            img = changeTo8BitNoAlpha(img);
            logger.debug("converted to {}", img);
            //testPixels(img);
        }
        ImageWriteParam param = writer.getDefaultWriteParam();
        if (quality > 1) {
            // change JPEG compression quality
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(0.9f);
        }
        // render output
        logger.debug("writing JPEG");
        writer.write(null, new IIOImage(img, null, null), param);
    }

    /* 
     * (non-Javadoc)
     * @see digilib.image.DocuImageImpl#scale(double, double)
     */
    @Override   
    public void scale(double scaleX, double scaleY) throws ImageOpException {
        logger.debug("scale: {}", scaleX);
        /* 
         * for downscaling in high quality the image is blurred first ...
         */
        if (quality > 1 && scaleX <= 0.5) {
            // blur before scaling down a lot
            int bl = (int) Math.floor(1 / scaleX);
            blur(bl);
        }
        /* 
         * ... then scaled.
         * 
         * We need to correct the scale factors to round to whole pixels 
         * or else we get a 1px black (or transparent) border.
         */
        int imgW = img.getWidth();
        int imgH = img.getHeight();
        double targetW = imgW * scaleX;
        double targetH = imgH * scaleY;
        double deltaX = targetW - Math.floor(targetW);
        double deltaY = targetH - Math.floor(targetH);
        if (deltaX > epsilon) {
            // round x
            if (deltaX > 0.5d) {
                logger.debug("rounding up x scale factor");
                scaleX += (1 - deltaX) / imgW;
            } else {
                logger.debug("rounding down x scale factor");
                scaleX -= deltaX / imgW;
            }
        }
        if (deltaY > epsilon) {
            // round y
            if (deltaY > 0.5d) {
                logger.debug("rounding up y scale factor");
                scaleY += (1 - deltaY) / imgH;
            } else {
                logger.debug("rounding down y scale factor");
                scaleY -= deltaY / imgH;
            }
        }
        // scale with AffineTransformOp
        logger.debug("scaled from {}x{} img={}", imgW, imgH, img);
        AffineTransformOp scaleOp = new AffineTransformOp(AffineTransform.getScaleInstance(scaleX, scaleY), renderHint);
        BufferedImage dest = null;
        final ColorModel cm = img.getColorModel();
        if (imageHacks.get(Hacks.forceDestForScaleCustom) && img.getType() == BufferedImage.TYPE_CUSTOM) {
            // set destination image
            int dw = (int) Math.round(imgW * scaleX);
            int dh = (int) Math.round(imgH * scaleY);
            boolean hasAlpha = cm.hasAlpha();
            dest = createCompatibleImage(dw, dh, hasAlpha, img);
            logger.debug("scale: setting destination image {}", dest);
        }
        img = scaleOp.filter(img, dest);
        logger.debug("scaled to {}x{} img={}", img.getWidth(), img.getHeight(), img);
        //testPixels(img);
        // invalidate image size
        imageSize = null;
    }

    /**
     * Blur the image with a convolution using the given radius.
     * 
     * @param radius the radius
     * @throws ImageOpException on error
     */
    public void blur(int radius) throws ImageOpException {
        logger.debug("blur: radius {} image {}", radius, img);
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
        ConvolveOp blurOp = new ConvolveOp(blur, ConvolveOp.EDGE_NO_OP, renderHint);
        BufferedImage dest = null;
        img = blurOp.filter(img, dest);
        logger.debug("blurred: {}", img);
        //testPixels(img);
    }

    /* 
     * (non-Javadoc)
     * @see digilib.image.DocuImageImpl#crop(int, int, int, int)
     */
    @Override   
    public void crop(int x_off, int y_off, int width, int height) throws ImageOpException {
        // setup Crop
        img = img.getSubimage(x_off, y_off, width, height);
        logger.debug("CROP: {}x{}", img.getWidth(), img.getHeight());
        // invalidate image size
        imageSize = null;
    }

    /* 
     * (non-Javadoc)
     * @see digilib.image.DocuImageImpl#rotate(double)
     */
    @Override   
    public void rotate(double angle) throws ImageOpException {
        logger.debug("rotate: {}", angle);
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
            logger.debug("move rotation: xoff={} yoff={}", xoff, yoff);
            trafo.preConcatenate(AffineTransform.getTranslateInstance(-xoff, -yoff));
            rotOp = new AffineTransformOp(trafo, renderHint);
        }
        // transform image
        img = rotOp.filter(img, null);
        logger.debug("rotated: {}", img);
        // invalidate image size
        imageSize = null;
    }

    /* 
     * (non-Javadoc)
     * @see digilib.image.DocuImageImpl#mirror(double)
     */
    @Override   
    public void mirror(double angle) throws ImageOpException {
        logger.debug("mirror: {}", angle);
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
            logger.error("invalid mirror angle {}", angle);
            return;
        }
        AffineTransformOp mirOp = new AffineTransformOp(new AffineTransform(mx, 0, 0, my, tx, ty), renderHint);
        img = mirOp.filter(img, null);
        // invalidate image size
        imageSize = null;
    }

    /* 
     * (non-Javadoc)
     * @see digilib.image.DocuImageImpl#enhance(float, float)
     */
    @Override   
    public void enhance(float mult, float add) throws ImageOpException {
        RescaleOp op = null;
        logger.debug("enhance: img={}", img);
        if (imageHacks.get(Hacks.needsRescaleRgba)) {
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
                dm[i] = mult;
                da[i] = add;
            }
            if (img.getColorModel().hasAlpha()) {
                // alpha channel should not be scaled
                dm[ncol-1] = 1f;
                da[ncol-1] = 0f;
            }
            op = new RescaleOp(dm, da, renderHint);
        } else {
            op = new RescaleOp(mult, add, renderHint);
        }
        op.filter(img, img);
    }

    /* 
     * (non-Javadoc)
     * 
     * @see digilib.image.DocuImageImpl#enhanceRGB(float[], float[])
     */
    @Override   
    public void enhanceRGB(float[] rgbm, float[] rgba) throws ImageOpException {
        logger.debug("enhanceRGB: rgbm={} rgba={}", rgbm, rgba);
        /*
         * The number of constants must match the number of bands in the image.
         * We do only 3 (RGB) bands.
         */
        int ncol = img.getColorModel().getNumColorComponents();
        if ((ncol != 3) || (rgbm.length != 3) || (rgba.length != 3)) {
            logger.error("enhanceRGB: unknown number of color bands or coefficients ({})", ncol);
            return;
        }
        if (img.getColorModel().hasAlpha()) {
            // add constant for alpha
            rgbm = new float[] { rgbm[0], rgbm[1], rgbm[2], 1 };
            rgba = new float[] { rgba[0], rgba[1], rgba[2], 0 };
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
    @Override   
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
            ColorConvertOp op = new ColorConvertOp(ColorSpace.getInstance(ColorSpace.CS_GRAY), renderHint);
            // let filter create new image
            img = op.filter(img, null);
        } else if (colop == ColorOp.NTSC_GRAY) {
            /*
             * convert image to grayscale NTSC-style: luminance = 0.2989*red +
             * 0.5870*green + 0.1140*blue
             */
            logger.debug("Color op: NTSC gray");
            logger.debug("img={}", img);
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
            BufferedImage dest = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
            op.filter(img.getRaster(), dest.getRaster());
            img = dest;
        } else if (colop == ColorOp.BITONAL) {
            /*
             * convert image to bitonal black and white
             * (nothing clever is done)
             */
            logger.debug("Color op: bitonal");
            logger.debug("img={}", img);
            BufferedImage dest = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_BYTE_BINARY);
            dest.createGraphics().drawImage(img, null, 0, 0);
            img = dest;
            logger.debug("bitonal img={}", img);
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
            if (imageHacks.get(Hacks.needsInvertRgba) && cm.hasAlpha()) {
                // fix for some cases
                invtbl = invertRgbaByteTable;
            } else {
                invtbl = invertSingleByteTable;
            }
            LookupOp op = new LookupOp(invtbl, renderHint);
            logger.debug("colop: image={}", img);
            op.filter(img, img);
        } else if (colop == ColorOp.MAP_GRAY_BGR) {
            /*
             * false color image from grayscale (0: blue, 128: green, 255: red)
             */
            logger.debug("Color op: map_gray_bgr");
            // convert to grayscale
            ColorConvertOp grayOp = new ColorConvertOp(ColorSpace.getInstance(ColorSpace.CS_GRAY), renderHint);
            // create new 3-channel image
            int destType = BufferedImage.TYPE_INT_RGB;
            if (imageHacks.get(Hacks.needsMapBgr)) {
                // special case for funny Java2D implementations
                if (img.getColorModel().hasAlpha()) {
                    destType = BufferedImage.TYPE_4BYTE_ABGR_PRE;
                } else {
                    destType = BufferedImage.TYPE_3BYTE_BGR;
                }
            }
            BufferedImage dest = new BufferedImage(img.getWidth(), img.getHeight(), destType);
            img = grayOp.filter(img, dest);
            logger.debug("map_gray: image={}", img);
            // convert to false color
            LookupOp mapOp = new LookupOp(mapBgrByteTable, renderHint);
            mapOp.filter(img, img);
            logger.debug("mapped image={}", img);
        }
    }

    /* 
     * (non-Javadoc)
     * @see digilib.image.DocuImageImpl#dispose()
     */
    @Override   
    public void dispose() {
        if (reader != null) {
            reader.dispose();
        }
        // is this necessary?
        img = null;
    }

    /* 
     * (non-Javadoc)
     * @see digilib.image.DocuImageImpl#getAwtImage()
     */
    @Override   
    public Image getAwtImage() {
        return (Image) img;
    }

    /* debugging
	private void testPixels(BufferedImage img) {
        ColorModel cm = img.getColorModel();
        ColorSpace cs = cm.getColorSpace();
        logger.debug("Check image colorspace: " + cs + " is sRGB=" + cs.isCS_sRGB() + " hasAlpha=" + cm.hasAlpha());
		// check pixel values
		int x1 = 5;
		int y1 = 5;
		int pixel1 = img.getRGB(x1, y1);
		logger.debug("pixel1 sRGB: {}", new Color(pixel1));
		int[] pixel1r = img.getRaster().getPixel(x1, y1, new int[4]);
		logger.debug("pixel1 raw: {}", pixel1r);
		int x2 = img.getWidth() - 5;
		int y2 = img.getHeight() - 5;
		int pixel2 = img.getRGB(x2, y2);
		logger.debug("pixel2 sRGB: {}", new Color(pixel2));
		int[] pixel2r = img.getRaster().getPixel(x2, y2, new int[4]);
		logger.debug("pixel2 raw: {}", pixel2r);
	} */


}
