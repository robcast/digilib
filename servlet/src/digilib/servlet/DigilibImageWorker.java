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

import java.awt.geom.Rectangle2D;
import java.io.IOException;

import javax.servlet.http.HttpServletResponse;

import digilib.image.DocuImage;
import digilib.image.ImageOpException;
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

	HttpServletResponse response;

	long startTime;

	String mimeType;

	int scaleQual;

	DigilibRequest dlRequest;

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

	/**
	 * @param dlConfig
	 * @param response
	 * @param mimeType
	 * @param scaleQual
	 * @param dlRequest
	 * @param paramROT
	 * @param paramCONT
	 * @param paramBRGT
	 * @param paramRGBM
	 * @param paramRGBA
	 * @param fileToLoad
	 * @param areaXoff
	 * @param outerUserImgArea
	 * @param innerUserImgArea
	 * @param minSubsample
	 * @param wholeRotArea
	 */
	public DigilibImageWorker(DigilibConfiguration dlConfig,
			HttpServletResponse response, String mimeType, int scaleQual,
			DigilibRequest dlRequest, float paramROT, float paramCONT,
			float paramBRGT, float[] paramRGBM, float[] paramRGBA,
			ImageFile fileToLoad, float scaleXY, Rectangle2D outerUserImgArea,
			Rectangle2D innerUserImgArea, float minSubsample,
			boolean wholeRotArea) {
		super();
		this.dlConfig = dlConfig;
		this.response = response;
		this.mimeType = mimeType;
		this.scaleQual = scaleQual;
		this.dlRequest = dlRequest;
		this.paramROT = paramROT;
		this.paramCONT = paramCONT;
		this.paramBRGT = paramBRGT;
		this.paramRGBM = paramRGBM;
		this.paramRGBA = paramRGBA;
		this.fileToLoad = fileToLoad;
		this.scaleXY = scaleXY;
		this.outerUserImgArea = outerUserImgArea;
		this.innerUserImgArea = innerUserImgArea;
		this.minSubsample = minSubsample;
		this.wholeRotArea = wholeRotArea;
	}

	/*
	 * do the work
	 */
	public void work() throws FileOpException, IOException, ImageOpException {
		;
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

			docuImage.loadSubimage(fileToLoad, outerUserImgArea.getBounds(),
					(int) subsamp);

			logger.debug("SUBSAMP: " + subsamp + " -> " + docuImage.getWidth()
					+ "x" + docuImage.getHeight());

			docuImage.scale(scaleXY, scaleXY);

		} else {
			// else load and crop the whole file
			docuImage.loadImage(fileToLoad);
			docuImage.crop((int) areaXoff, (int) areaYoff, (int) areaWidth,
					(int) areaHeight);

			docuImage.scale(scaleXY, scaleXY);
		}

		// mirror image
		// operation mode: "hmir": mirror horizontally, "vmir": mirror
		// vertically
		if (dlRequest.hasOption("mo", "hmir")) {
			docuImage.mirror(0);
		}
		if (dlRequest.hasOption("mo", "vmir")) {
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

		logger.debug("time " + (System.currentTimeMillis() - startTime) + "ms");

		/* write the resulting image */

		// setup output -- if source is JPG then dest will be JPG else it's
		// PNG
		if (mimeType.equals("image/jpeg") || mimeType.equals("image/jp2")) {
			mimeType = "image/jpeg";
		} else {
			mimeType = "image/png";
		}
		response.setContentType(mimeType);

		// write the image
		docuImage.writeImage(mimeType, response.getOutputStream());
		response.flushBuffer();
		
		logger.info("image worker " + this.getName() + " done in "
				+ (System.currentTimeMillis() - startTime));

		docuImage.dispose();
	}
}
