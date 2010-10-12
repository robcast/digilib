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

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;

import com.itextpdf.text.BadElementException;
import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Image;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.pdf.PdfWriter;

import digilib.image.DocuImage;
import digilib.image.ImageOpException;
import digilib.io.FileOpException;

/**
 * Worker for pdf generation.
 * 
 * @author cmielack
 * 
 */
public class DigilibPDFWorker extends DigilibWorker {

	private DigilibConfiguration dlConfig = null;

	private Document doc = null;

	private File outputfile = null;
	
	private PDFJobInformation job_info = null;
	
	public DigilibPDFWorker(DigilibConfiguration dlConfig, PDFJobInformation pdfji, File outputfile) {
		super();
		// TODO dlConfig 
		this.dlConfig = dlConfig;
		this.job_info = pdfji;
		this.outputfile = outputfile;
	}

	public void run() {
		// create document object
		doc = new Document(PageSize.A4, 0,0,0,0);
		PdfWriter docwriter = null;
		FileOutputStream fos;
		
		try {
			fos = new FileOutputStream(outputfile);
		} catch (FileNotFoundException e1) {
			// TODO Auto-generated catch block
			logger.error(e1.getMessage());
			e1.printStackTrace();
			return;
		}
		
		long start_time = System.currentTimeMillis();
		
		try {
			docwriter = PdfWriter.getInstance(doc, fos);
			
			setPDFProperties();

			doc.open();

			addTitlePage();
			
			logger.debug("- "+outputfile+" doc.open()ed ("+(System.currentTimeMillis()-start_time) + "ms)");
			start_time = System.currentTimeMillis();

			//Integer[] pgs = job_info.getPageNrs();//get_pgs();
			NumRange pgs = job_info.getPages();

			for(Integer p: pgs){
				logger.debug(" - adding Image "+p+" to " + outputfile);
				addImage(p);
				logger.debug(" - done adding Image "+p+" to " + outputfile);
			}
			
			logger.debug(" - done adding all Images to " + outputfile);
			
		} catch(Exception e) {
			logger.error(e.getMessage());
			error = e;
			return;
		} finally {
			if (doc!=null){
				doc.close();
				logger.debug("- "+outputfile+" doc.close() ("+(System.currentTimeMillis()-start_time) + "ms)");
			}
			if (docwriter!=null){
				docwriter.close();
			}
		}

		try {
			fos.flush();
		} catch (IOException e) {
			logger.error(e.getMessage());
			e.printStackTrace();
			error = e;
		} finally{
			if(fos!=null){
				try {
					fos.close();
				} catch (IOException e) {
					logger.error(e.getMessage());
					e.printStackTrace();
				}
			}
		}
	}

	/**
	 * Set PDF-Meta-Attributes.
	 */
	public void setPDFProperties(){
		// TODO get proper Information from dlConfig
		doc.addAuthor(this.getClass().getName());
		doc.addCreationDate();
		doc.addKeywords("digilib");
		doc.addTitle("digilib PDF");
		doc.addCreator(this.getClass().getName());
	}
	
	/**
	 * Create a title page and append it to the document (should, of course, be called first)
	 * @throws DocumentException
	 */
	public void addTitlePage() throws DocumentException{
		PDFTitlePage titlepage = new PDFTitlePage(job_info);
		doc.add(titlepage.getPageContents());
		doc.newPage();
	}
		
	/**
	 * add the image with page number 'pn' to the document.
	 * 
	 * @param pn
	 */
	public void addImage(int pn) {
		// create ImageJobInformation
		ImageJobInformation iji = job_info.getImageJobInformation();
		iji.setValue("pn", pn);
		// create image worker
		DigilibImageWorker image_worker = new DigilibImageWorker(dlConfig, null, iji);
		try {
			DocuImage img = image_worker.render();

			Image pdfimg = Image.getInstance(img.getAwtImage(),null);
			
			float docW = PageSize.A4.getWidth() - 2 * PageSize.A4.getBorder(); 
			float docH = PageSize.A4.getHeight() - 2 * PageSize.A4.getBorder();
			
			pdfimg.scaleToFit(docW,docH);
			
			doc.add(pdfimg);
			
		} catch (FileOpException e) {
			logger.error(e.getMessage());
			e.printStackTrace();
		} catch (IOException e) {
			logger.error(e.getMessage());
			e.printStackTrace();
		} catch (ImageOpException e) {
			logger.error(e.getMessage());
			e.printStackTrace();
		} catch (BadElementException e) {
			logger.error(e.getMessage());
			e.printStackTrace();
		} catch (DocumentException e) {
			logger.error(e.getMessage());
			e.printStackTrace();
		}
	}


	
	
	
	@Override
	public DocuImage render() throws Exception {
		return null;
	}

	@Override
	public void write(DocuImage img) throws Exception {
		
	}
	
}