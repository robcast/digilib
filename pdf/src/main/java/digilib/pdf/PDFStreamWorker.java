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

import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Image;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.pdf.PdfWriter;

import digilib.image.DocuImage;
import digilib.image.ImageJobDescription;
import digilib.image.ImageOpException;
import digilib.image.ImageWorker;
import digilib.conf.DigilibConfiguration;
import digilib.conf.PDFRequest;
import digilib.util.DigilibJobCenter;
import digilib.util.NumRange;
import digilib.util.Parameter;
import digilib.util.ParameterMap;

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
	protected OutputStream renderPDF() throws DocumentException, InterruptedException,
			ExecutionException, IOException, ImageOpException {
		// create document object
		doc = new Document(PageSize.A4, 0, 0, 0, 0);
		PdfWriter docwriter = null;

		long start_time = System.currentTimeMillis();

		docwriter = PdfWriter.getInstance(doc, outstream);

		setPDFProperties(doc);

		doc.open();

		addTitlePage(doc);

		logger.debug("PDF: " + outstream + " doc.open()ed ("
				+ (System.currentTimeMillis() - start_time) + "ms)");

		NumRange pgs = job_info.getPages();

		for (int p : pgs) {
			logger.debug("PDF: adding Image " + p + " to " + outstream);
            // copy request and set page number (as new Parameter)
			ParameterMap pageRequest = ParameterMap.cloneInstance(job_info);
            pageRequest.put("pn", new Parameter("pn", p, p));
			// create ImageJobInformation
			ImageJobDescription iji = ImageJobDescription.getInstance(pageRequest, job_info.getDlConfig());
			addImage(doc, iji);
			logger.debug("PDF: done adding Image " + p + " to " + outstream);
		}

		logger.debug("PDF: done adding all Images to " + outstream);

		doc.close();
		logger.debug("PDF: " + outstream + " doc.close() ("
				+ (System.currentTimeMillis() - start_time) + "ms)");
		docwriter.flush();
		docwriter.close();
		return outstream;
	}

	/**
	 * Set PDF-Meta-Attributes.
	 */
	public Document setPDFProperties(Document doc) {
		// TODO get proper Information from dlConfig
		doc.addAuthor(this.getClass().getName());
		doc.addCreationDate();
		doc.addKeywords("digilib");
		doc.addTitle("digilib PDF");
		doc.addCreator(this.getClass().getName());
		return doc;
	}

	/**
	 * Create a title page and append it to the document (should, of course, be
	 * called first)
	 * 
	 * @throws DocumentException
	 */
	public Document addTitlePage(Document doc) throws DocumentException {
		PDFTitlePage titlepage = new PDFTitlePage(job_info);
		try {
            doc.add(titlepage.getPageContents());
        } catch (IOException e) {
            throw new DocumentException(e);
        } catch (ImageOpException e) {
            throw new DocumentException(e);
        }
		doc.newPage();
		return doc;
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
			throws InterruptedException, ExecutionException, IOException,
			DocumentException {
		// create image worker
		ImageWorker job = new ImageWorker(dlConfig, iji);
		// submit
		Future<DocuImage> jobTicket = imageJobCenter.submit(job);
		// wait for result
		DocuImage img = jobTicket.get();
		// scale the image
		Image pdfimg = Image.getInstance(img.getAwtImage(), null);
		float docW = PageSize.A4.getWidth() - 2 * PageSize.A4.getBorder();
		float docH = PageSize.A4.getHeight() - 2 * PageSize.A4.getBorder();
		// fit the image to the page
		pdfimg.scaleToFit(docW, docH);
		// add to PDF
		doc.add(pdfimg);
		return doc;
	}

}
