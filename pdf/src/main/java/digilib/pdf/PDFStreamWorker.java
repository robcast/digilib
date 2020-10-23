package digilib.pdf;

/*
 * #%L
 * PDF worker that creates a PDF document in an OutputStream.
 * %%
 * Copyright (C) 2009 - 2013 MPIWG Berlin
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
 * Authors: Christopher Mielack,
 *          Robert Casties (robcast@berlios.de)
 */

import java.io.IOException;
import java.io.OutputStream;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

import org.apache.log4j.Logger;

import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.AreaBreak;
//import com.itextpdf.layout.DocumentException;
import com.itextpdf.layout.element.Image;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;

import digilib.conf.DigilibConfiguration;
import digilib.conf.DigilibRequest;
import digilib.conf.PDFRequest;
import digilib.image.DocuImage;
import digilib.image.ImageJobDescription;
import digilib.image.ImageOpException;
import digilib.image.ImageWorker;
import digilib.util.DigilibJobCenter;
import digilib.util.NumRange;
import digilib.util.Parameter;

public class PDFStreamWorker implements Callable<OutputStream> {

	protected static Logger logger = Logger.getLogger(PDFStreamWorker.class);

	protected DigilibConfiguration dlConfig = null;

	protected Document doc = null;

	protected OutputStream outstream = null;

	protected PDFRequest job_info = null;

	protected DigilibJobCenter<DocuImage> imageJobCenter = null;

	/**
	 * @param dlConfig
	 * @param outputfile
	 * @param job_info
	 */
	public PDFStreamWorker(DigilibConfiguration dlConfig, OutputStream outputfile,
			PDFRequest job_info,
			DigilibJobCenter<DocuImage> imageJobCenter) {
		super();
		this.dlConfig = dlConfig;
		this.outstream = outputfile;
		this.job_info = job_info;
		this.imageJobCenter = imageJobCenter;
	}

	public OutputStream call() throws Exception {
		outstream = renderPDF();
		return outstream;
	}

	/**
	 * @throws DocumentException
	 * @throws InterruptedException
	 * @throws ExecutionException
	 * @throws IOException
	 * @throws ImageOpException 
	 */
	protected OutputStream renderPDF() throws InterruptedException,
			ExecutionException, IOException, ImageOpException {
		long start_time = System.currentTimeMillis();
		
		// create document object
		PdfWriter writer = new PdfWriter(outstream);
		PdfDocument pdfdoc = new PdfDocument(writer);
		doc = new Document(pdfdoc, PageSize.A4);
		logger.debug("PDF: " + outstream + " doc.open()ed ("
				+ (System.currentTimeMillis() - start_time) + "ms)");

		// add title page
		PDFTitlePage titlepage = new PDFTitlePage(job_info);
		titlepage.createPage(doc);

		// add pages
		NumRange pgs = job_info.getPages();
		for (int p : pgs) {
			// start new page
			doc.add(new AreaBreak());
			logger.debug("PDF: adding Image " + p + " to " + outstream);
            // copy request and set page number (as new Parameter)
			DigilibRequest pageRequest = new DigilibRequest(dlConfig, job_info);
            pageRequest.put("pn", new Parameter("pn", p, p));
			// create ImageJobInformation
			ImageJobDescription iji = ImageJobDescription.getRawInstance(pageRequest, job_info.getDlConfig());
			iji.prepareScaleParams();
			addImage(doc, iji);
			logger.debug("PDF: done adding Image " + p + " to " + outstream);
		}

		logger.debug("PDF: done adding all Images to " + outstream);

		doc.close();
		logger.debug("PDF: " + outstream + " doc.close() ("
				+ (System.currentTimeMillis() - start_time) + "ms)");
		writer.flush();
		writer.close();
		return outstream;
	}

	/**
	 * adds an image to the document.
	 * 
	 * @param doc
	 * @param iji
	 * @return
	 * @throws InterruptedException
	 * @throws ExecutionException
	 * @throws IOException
	 * @throws DocumentException
	 */
	public Document addImage(Document doc, ImageJobDescription iji)
			throws InterruptedException, ExecutionException, IOException {
		// create image worker
		ImageWorker job = new ImageWorker(dlConfig, iji);
		// submit
		Future<DocuImage> jobTicket = imageJobCenter.submit(job);
		// wait for result
		DocuImage img = jobTicket.get();
		Image pdfimg = new Image(ImageDataFactory.create(img.getAwtImage(), null));
		// fit the image to the page
		pdfimg.setAutoScale(true);
		// add to PDF
		doc.add(pdfimg);
		return doc;
	}

}
