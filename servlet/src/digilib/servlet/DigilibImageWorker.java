/* DigilibImageWorker.java -- worker for image operations
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 2004 Robert Casties (robcast@mail.berlios.de)
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 * 
 * Please read license.txt for the full details. A copy of the GPL may be found
 * at http://www.gnu.org/copyleft/lgpl.html
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 *  
 * Created on 19.10.2004
 */

package digilib.servlet;

import java.awt.Rectangle;
import java.awt.geom.Rectangle2D;
import java.io.IOException;
import java.io.OutputStream;

import digilib.image.DocuImage;
import digilib.image.ImageOpException;
import digilib.image.ImageOps;
import digilib.io.FileOpException;
import digilib.io.ImageFile;

/**
 * worker for image operations.
 * 
 * @author casties
 * 
 */
public class DigilibImageWorker extends DigilibWorker {

	private DigilibConfiguration dlConfig;

	//HttpServletResponse response;

	OutputStream outstream;
	
	long startTime;

	String mimeType;

	int scaleQual;

	//DigilibRequest dlRequest;

	//ImageJobInformation ijd;
	
	float paramROT;

	float paramCONT;

	float paramBRGT;

	float[] paramRGBM;

	float[] paramRGBA;

	ImageFile fileToLoad;

	float areaXoff;

	float areaYoff;

	float areaWidth;

	float areaHeight;

	float scaleXY;

	Rectangle2D outerUserImgArea;

	Rectangle2D innerUserImgArea;

	float minSubsample;

	boolean wholeRotArea;

	boolean vmir;
	boolean hmir;
	
	int forceType;


	public DigilibImageWorker(DigilibConfiguration dlConfig, OutputStream outstream, ImageJobInformation jobinfo) {
		super();
		
		this.dlConfig = dlConfig;
		this.outstream = outstream;
		this.mimeType = jobinfo.get_mimeType();
		this.scaleQual = jobinfo.get_scaleQual();
		this.paramROT = jobinfo.getAsFloat("rot");
		this.paramCONT = jobinfo.getAsFloat("cont");
		this.paramBRGT = jobinfo.getAsFloat("brgt");
		this.paramRGBM = jobinfo.get_paramRGBM();
		this.paramRGBA = jobinfo.get_paramRGBA();
		try {
			this.fileToLoad = jobinfo.get_fileToLoad();
			this.scaleXY = jobinfo.get_scaleXY();
			this.outerUserImgArea = jobinfo.get_outerUserImgArea();
			this.innerUserImgArea = jobinfo.get_innerUserImgArea();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (ImageOpException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		this.minSubsample = dlConfig.getAsFloat("subsample-minimum");
		this.wholeRotArea = jobinfo.get_wholeRotArea();
		this.forceType = jobinfo.get_forceType();
		this.hmir = jobinfo.get_hmir();
		this.vmir = jobinfo.get_vmir();
	}

	/*
	 * do the work
	 */
	public DocuImage render() throws FileOpException, IOException, ImageOpException {
		
		logger.debug("image worker " + this.getName() + " working");
		startTime = System.currentTimeMillis();

		/* crop and scale image */

		// new DocuImage instance
		DocuImage docuImage = dlConfig.getDocuImageInstance();
		if (docuImage == null) {
			throw new ImageOpException("Unable to load DocuImage class!");
		}

		// set interpolation quality
		docuImage.setQuality(scaleQual);

		Rectangle loadRect = outerUserImgArea.getBounds();
		// use subimage loading if possible
		if (docuImage.isSubimageSupported()) {
			logger.debug("Subimage: scale " + scaleXY + " = " + (1 / scaleXY));
			float subf = 1f;
			float subsamp = 1f;
			if (scaleXY < 1) {
				subf = 1 / scaleXY;
				// for higher quality reduce subsample factor by
				// minSubsample
				if (scaleQual > 0) {
					subsamp = (float) Math.max(Math.floor(subf / minSubsample),
							1d);
				} else {
					subsamp = (float) Math.floor(subf);
				}
				scaleXY = subsamp / subf;
				logger.debug("Using subsampling: " + subsamp + " rest "
						+ scaleXY);
			}

			docuImage.loadSubimage(fileToLoad, loadRect, (int) subsamp);

			logger.debug("SUBSAMP: " + subsamp + " -> " + docuImage.getWidth()
					+ "x" + docuImage.getHeight());

			docuImage.scale(scaleXY, scaleXY);

		} else {
			// else load and crop the whole file
			docuImage.loadImage(fileToLoad);
			docuImage.crop((int) loadRect.getX(), (int) loadRect.getY(),
					(int) loadRect.getWidth(), (int) loadRect.getHeight());

			docuImage.scale(scaleXY, scaleXY);
		}

		// mirror image
		// operation mode: "hmir": mirror horizontally, "vmir": mirror
		// vertically
		if (hmir) {
			docuImage.mirror(0);
		}
		if (vmir) {
			docuImage.mirror(90);
		}

		// rotate image
		if (paramROT != 0d) {
			docuImage.rotate(paramROT);
			if (wholeRotArea) {
				// crop to the inner bounding box
				float xcrop = (float) (docuImage.getWidth() - innerUserImgArea
						.getWidth()
						* scaleXY);
				float ycrop = (float) (docuImage.getHeight() - innerUserImgArea
						.getHeight()
						* scaleXY);
				if ((xcrop > 0) || (ycrop > 0)) {
					// only crop smaller
					xcrop = (xcrop > 0) ? xcrop : 0;
					ycrop = (ycrop > 0) ? ycrop : 0;
					// crop image
					docuImage.crop((int) (xcrop / 2), (int) (ycrop / 2),
							(int) (docuImage.getWidth() - xcrop),
							(int) (docuImage.getHeight() - ycrop));
				}
			}

		}

		// color modification
		if ((paramRGBM != null) || (paramRGBA != null)) {
			// make shure we actually have two arrays
			if (paramRGBM == null) {
				paramRGBM = new float[3];
			}
			if (paramRGBA == null) {
				paramRGBA = new float[3];
			}
			// calculate "contrast" values (c=2^x)
			float[] mult = new float[3];
			for (int i = 0; i < 3; i++) {
				mult[i] = (float) Math.pow(2, (float) paramRGBM[i]);
			}
			docuImage.enhanceRGB(mult, paramRGBA);
		}

		// contrast and brightness enhancement
		if ((paramCONT != 0f) || (paramBRGT != 0f)) {
			float mult = (float) Math.pow(2, paramCONT);
			docuImage.enhance(mult, paramBRGT);
		}

		logger.debug("rendered in " + (System.currentTimeMillis() - startTime) + "ms");

		return docuImage;
	}

	public void write(DocuImage img) throws FileOpException, IOException {
		/* write the resulting image */

		// setup output -- if output type is forced use that otherwise
		// if source is JPG then dest will be JPG else it's PNG
		if (forceType != ImageOps.TYPE_AUTO) {
			if (forceType == ImageOps.TYPE_JPEG) {
				mimeType = "image/jpeg";
			}
			if (forceType == ImageOps.TYPE_PNG) {
				mimeType = "image/png";
			}
		} else if ((mimeType.equals("image/jpeg")
				|| mimeType.equals("image/jp2") || mimeType.equals("image/fpx"))) {
			mimeType = "image/jpeg";
		} else {
			mimeType = "image/png";
		}

		// write the image
		img.writeImage(mimeType, outstream);
		outstream.flush();
		
		
		logger.info("image worker " + this.getName() + " done in "
				+ (System.currentTimeMillis() - startTime));

		img.dispose();
	}
}
