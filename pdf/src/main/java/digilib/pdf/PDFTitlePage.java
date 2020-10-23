package digilib.pdf;

/*
 * #%L
 * A class for the generation of title pages for the generated pdf documents.
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

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;

import org.apache.log4j.Logger;

import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.pdf.action.PdfAction;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Link;
import com.itextpdf.layout.element.Paragraph;

import digilib.conf.PDFRequest;
import digilib.image.ImageOpException;
import digilib.io.FileOpException;
import digilib.io.FsDocuDirectory;
import digilib.servlet.PDFCache;

/** A class for the generation of title pages for the generated pdf documents.
 * 
 * 
 */
public class PDFTitlePage {
	
	private PDFRequest job_info = null;
	private DigilibInfoReader info_reader= null;
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	
	/**
	 * Initialize a TitlePage
	 * @param pdfji
	 */
	public PDFTitlePage(PDFRequest pdfji){
		job_info = pdfji;

		// use MPIWG-style info.xml
        info_reader = getInfoXmlReader(pdfji);
	}

    /**
     * @param pdfji
     * @return 
     */
    protected DigilibInfoReader getInfoXmlReader(PDFRequest pdfji) {
        try {
            // try to load ../presentation/info.xml
            File imgDir = ((FsDocuDirectory) pdfji.getImageJobInformation().getFileDirectory()).getDir();
            File docDir = imgDir.getParentFile();
            File infoFn = new File(new File(docDir, "presentation"), "info.xml");
            return new DigilibInfoReader(infoFn.getAbsolutePath());
        } catch (FileOpException e) {
            logger.warn("info.xml not found");
        } catch (IOException e) {
            logger.warn("image directory for info.xml not found");
        } catch (ImageOpException e) {
            logger.warn("problem with parameters for info.xml");
        }
        return null;
    }
	
	/**
	 * generate iText-PDF-Contents for the title page
	 * 
	 * @return
	 * @throws ImageOpException 
	 * @throws IOException 
	 */
	public Document createPage(Document content)  {
		// header with logo
		Paragraph logoBlock = new Paragraph();
		logoBlock.add(getLogo());
		content.add(logoBlock);

		String reference = getReference();
		if (reference != null) {
			// add full reference
			Paragraph refBlock = new Paragraph();
			refBlock.add(reference);
			content.add(refBlock);
		} else {
			// add author
			String author = getAuthor();
			if (author != null) {
				Paragraph authorBlock = new Paragraph();
				authorBlock.add(author);
				content.add(authorBlock);
			}
			// add title
			String title = getTitle();
			if (title != null) {
				Paragraph titleBlock = new Paragraph();
				titleBlock.add(title);
				content.add(titleBlock);
			}
			// add date
			String date = getDate();
			if (date != null) {
				Paragraph dateBlock = new Paragraph();
				dateBlock.add(date);
				content.add(dateBlock);
			}
		}

		// add page numbers
		Paragraph pagesBlock = new Paragraph();
		pagesBlock.add(getPages());
		content.add(pagesBlock);

		// add URL
		Paragraph urlBlock = new Paragraph();
		urlBlock.add(new Link(getUrl(), PdfAction.createURI(getUrl())));
		content.add(urlBlock);
		
		// add digilib version
		Paragraph dlBlock = new Paragraph();
		dlBlock.add(getDigilibVersion());
		content.add(dlBlock);

		return content;
	}
	
	/*
	 * Methods for the different attributes.
	 * 
	 */
	
	private Image getLogo(){
		try {
			String url = job_info.getAsString("pdf-logo");
			if (!url.isEmpty()) {
				Image logo = new Image(ImageDataFactory.create(new URL(url)));
				return logo;
			}
		} catch (MalformedURLException e) {
			logger.error(e.getMessage());
		}
		return null;
	}
	
	private String getReference(){
		return null;
	}
	
	private String getTitle() {
		if(info_reader.hasInfo())
			return info_reader.getAsString("title");
		else
			return "[" + job_info.getAsString("fn") + "]";
	}
	
	private String getAuthor(){
		if(info_reader.hasInfo())
			return info_reader.getAsString("author");
		else
			return null;
	}
	
	private String getDate(){
		if(info_reader.hasInfo())
			return info_reader.getAsString("date");
		else
			return null;
	}
	
	private String getPages(){
		return "Pages "+job_info.getAsString("pgs") + " (scan numbers)";
	}
	
	private String getUrl() {
		String url = null;
		try {
			String burl = job_info.getAsString("base.url");
			url = burl+"/digilib.html?fn="+job_info.getAsString("fn");
		} catch (Exception e) {
			// this shouldn't happen
			logger.error("Error getting link", e);
		}
		return url;
	}

	private String getDigilibVersion(){
		return "PDF created by digilib PDFMaker v."+PDFCache.version;
	}
	
}
