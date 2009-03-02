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
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;

import javax.servlet.http.HttpServletResponse;

import com.lowagie.text.BadElementException;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.pdf.PdfWriter;

import digilib.image.DocuImage;
import digilib.image.DocuImageImpl;
import digilib.image.ImageLoaderDocuImage;
import digilib.image.ImageOpException;
import digilib.image.ImageOps;
import digilib.servlet.DigilibImageWorker;
import digilib.io.FileOpException;
import digilib.io.ImageFile;

/**
 * worker for pdf operations.
 * 
 * @author cmielack
 * 
 */
public class DigilibPDFWorker extends DigilibWorker {

	private DigilibConfiguration dlConfig = null;

	private Document doc = null;

	private String filename = null;
	
	private PDFJobInformation job_info = null;
	
	public DigilibPDFWorker(DigilibConfiguration dlConfig, PDFJobInformation pdfji, String filename) {
		super();
		// TODO dlConfig 
		this.dlConfig = dlConfig;
		this.job_info = pdfji;
		this.filename = filename;
	}

	public void run() {
		// create document object
		doc = new Document(PageSize.A4, 0,0,0,0);
		PdfWriter docwriter = null;
		File output_file = new File(PDFCache.cache_directory + filename);
		FileOutputStream fos;

		try {
			fos = new FileOutputStream(output_file);
		} catch (FileNotFoundException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
			return;
		}

		
		long start_time = System.currentTimeMillis();

		
		try {
			docwriter = PdfWriter.getInstance(doc, fos);
			
			setPDFProperties();

			doc.open();

			logger.debug("- doc.open()ed ("+(System.currentTimeMillis()-start_time) + "ms)");
			start_time = System.currentTimeMillis();
			

			Integer[] pgs = get_pgs();

			for(Integer p: pgs){
				addImage(p);
			}
			
			
			
		}
		catch(Exception e) {
			logger.error(e.getMessage());
			error = e;
			return;
		}
		
		finally {
			if (doc!=null){
				doc.close();
				logger.debug("- doc.close() ("+(System.currentTimeMillis()-start_time) + "ms)");
			}
			if (docwriter!=null){
				docwriter.close();
			}
		}

		
		
		try {
			fos.flush();
		} catch (IOException e) {
			e.printStackTrace();
			error = e;
		}
		finally{
			if(fos!=null){
				try {
					fos.close();
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}
	}

	public void setPDFProperties(){
		// TODO get proper Information from dlConfig
		doc.addAuthor(this.getClass().getName());
		doc.addCreationDate();
		doc.addKeywords("digilib");
		doc.addTitle("digilib PDF");
		doc.addCreator(this.getClass().getName());
	}
	
	public Integer[] get_pgs(){
		String pages = job_info.getAsString("pgs");
		ArrayList<Integer> pgs = new ArrayList<Integer>();
		Integer[] out = null;
		
		String intervals[] = pages.split(",");
		
		
		// convert the page-interval-strings into a list containing every single page
		for(String interval: intervals){
			if(interval.indexOf("-") > -1){
				String nums[] = interval.split("-");
				
				for(int i=Integer.valueOf(nums[0]); i <= Integer.valueOf(nums[1]); i++){
					pgs.add(i);
				}
			}
			else{
				pgs.add(Integer.valueOf(interval));
			}
		}
		out = new Integer[pgs.size()];

		pgs.toArray(out);
		return out;
	}
	
	public void addImage(int pn) {
		// create ImageJobInformation
		ImageJobInformation iji = job_info.getImageJobInformation();
		iji.setValue("pn", pn);
		// create image worker
		DigilibImageWorker image_worker = new DigilibImageWorker(dlConfig, null, iji);
		try {
			ImageLoaderDocuImage img = (ImageLoaderDocuImage) image_worker.render();

			Image theimg = Image.getInstance(img.getImage(),null);
			
			float docW = PageSize.A4.getWidth() - 2*PageSize.A4.getBorder(); 
			float docH= PageSize.A4.getHeight()- 2*PageSize.A4.getBorder();

			
			theimg.scaleToFit(docW,docH);
			
			
			doc.add(theimg);
			
		} catch (FileOpException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		} catch (ImageOpException e) {
			e.printStackTrace();
		} catch (BadElementException e) {
			e.printStackTrace();
		} catch (DocumentException e) {
			e.printStackTrace();
		}
	}


	
	
	
	// unnecessary 
	@Override
	public DocuImage render() throws Exception {
		return null;
	}

	@Override
	public void write(DocuImage img) throws Exception {
		
	}
	
}