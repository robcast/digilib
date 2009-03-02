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
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.OutputStream;

import javax.servlet.http.HttpServletResponse;

import com.lowagie.text.BadElementException;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;

import digilib.image.DocuImage;
import digilib.image.DocuImageImpl;
import digilib.image.ImageLoaderDocuImage;
import digilib.image.ImageOpException;
import digilib.image.ImageOps;
import digilib.servlet.DigilibImageWorker;
import digilib.io.FileOpException;
import digilib.io.ImageFile;

/**
 * worker for image operations.
 * 
 * @author casties
 * 
 */
public class OldDigilibPDFWorker extends DigilibImageWorker {

	private DigilibConfiguration dlConfig;


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

	int forceType;
	
	Document doc;
	
	

	public OldDigilibPDFWorker(DigilibConfiguration dlConfig,
			BufferedOutputStream outstream, String mimeType, int scaleQual,
			DigilibRequest dlRequest, float paramCONT,
			float paramBRGT, float[] paramRGBM, float[] paramRGBA,
			ImageFile fileToLoad, float scaleXY, Rectangle2D outerUserImgArea,
			Rectangle2D innerUserImgArea, float minSubsample,
			boolean wholeRotArea, int forceType, Document doc) {
		super(dlConfig,
				outstream, mimeType, scaleQual,
				//dlRequest, 
				0.0f , paramCONT,
				paramBRGT, paramRGBM,paramRGBA,
				fileToLoad, scaleXY, outerUserImgArea,
				innerUserImgArea,minSubsample,
				wholeRotArea, forceType, false, false);
		
		this.dlConfig = dlConfig;
		this.outstream = outstream;
		this.mimeType = mimeType;
		this.scaleQual = scaleQual;
		this.dlRequest = dlRequest;
		//this.paramROT = paramROT;
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
		this.forceType = forceType;
		this.doc = doc;
	}

	public void run() {
		//logger.debug((++waitingThreads) + " waiting threads");
		ImageLoaderDocuImage img = null;
		try {
			sem.acquire();
			//waitingThreads--;
		} catch (InterruptedException e) {
			error = e;
			//waitingThreads--;
			// should we reinterrupt?
			return;
		}
		//logger.debug((++runningThreads) + " running threads");
		try {
			/* 
			 * do rendering under the semaphore 
			 */
			img = (ImageLoaderDocuImage) super.render();
		} catch (Throwable e) {
			error = e;
			logger.error(e);
		} finally {
		//	runningThreads--;
			sem.release();
		}
		/* 
		 * write the result without semaphore
		 */
		if (!hasError()) {
			try{
				write(img);
			} catch (Throwable e) {
				error = e;
				logger.error(e);
			}
		}
	}

	public void write(ImageLoaderDocuImage img) throws FileOpException, IOException {
		/* write the resulting image */


		try {
			long timing = System.currentTimeMillis();
			Image theimg = Image.getInstance(img.getImage(),null);
			
			theimg.scaleToFit(PageSize.A4.getWidth(),PageSize.A4.getHeight());
			
			logger.debug(" --- loading and scaling took "+(-timing+System.currentTimeMillis())+"ms");

			timing = System.currentTimeMillis();
			
			doc.add(theimg);
			logger.debug(" --- adding took "+(-timing+System.currentTimeMillis())+"ms");

		} catch (BadElementException e) {
			e.printStackTrace();
			logger.error("DigilibPDFWorker write BadElementException");
		} catch (DocumentException e) {
			e.printStackTrace();
			logger.error("DigilibPDFWorker write DocumentException");
		}
		
		logger.info("pdf worker " + this.getName() + " done in "
				+ (System.currentTimeMillis() - startTime));

	}
}