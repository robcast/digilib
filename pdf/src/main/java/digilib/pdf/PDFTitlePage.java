package digilib.pdf;

/*
 * #%L
 * A class for the generation of title pages for the generated pdf documents.
 * %%
 * Copyright (C) 2009 MPIWG Berlin
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
 * Authors: Christopher Mielack, Robert Casties
 */

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.action.PdfAction;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Link;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.property.TextAlignment;
import com.itextpdf.layout.property.UnitValue;

import digilib.conf.PDFRequest;
import digilib.image.ImageOpException;
import digilib.io.FileOpException;
import digilib.io.FsDocuDirectory;

/**
 * A class for the generation of a title page for the generated pdf documents.
 */
public class PDFTitlePage {

    protected PDFRequest request = null;
    protected DigilibInfoReader infoReader = null;
    protected static Logger logger = LoggerFactory.getLogger("digilib.servlet");

    /**
     * Initialize the TitlePage
     * 
     * @param pdfji
     */
    public PDFTitlePage(PDFRequest pdfji) {
        request = pdfji;
        // use MPIWG-style info.xml
        infoReader = getInfoXmlReader(pdfji);
    }

    /**
     * Read the presentation info file ../presentation/info.xml.
     * 
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
     * Add the the title page to the PDF Document.
     * 
     * @return
     */
    public Document createPage(Document content) {
        /*
         * header with logo
         */
        Table headerBlock = new Table(UnitValue.createPercentArray(new float[] { 10, 90 }));
        Image logo = getLogo();
        if (logo != null) {
            logo.setWidth(UnitValue.createPercentValue(100));
            headerBlock.addCell(new Cell().add(logo).setBorderRight(null));
        }
        String headerText = getHeaderTitle();
        if (!headerText.isEmpty()) {
            Cell textCell = new Cell().setBorderLeft(null).setPaddingLeft(12).add(new Paragraph(headerText).setBold());
            String headerSubtext = getHeaderSubtitle();
            if (headerSubtext != null) {
                textCell.add(new Paragraph(headerSubtext));
            }
            headerBlock.addCell(textCell);
        }
        content.add(headerBlock.setMarginBottom(24));

        String reference = getReference();
        if (!reference.isEmpty()) {
            /*
             * full reference
             */
            content.add(new Paragraph(reference));

        } else {
            /*
             * author
             */
            String author = getAuthor();
            if (!author.isEmpty()) {
                content.add(new Paragraph(author).setTextAlignment(TextAlignment.CENTER));
            }
            /*
             * title
             */
            String title = getTitle();
            if (!title.isEmpty()) {
                content.add(new Paragraph(title).setTextAlignment(TextAlignment.CENTER));
            }
            /*
             * date
             */
            String date = getDate();
            if (!date.isEmpty()) {
                content.add(new Paragraph(date).setTextAlignment(TextAlignment.CENTER));
            }
        }

        /*
         * page numbers
         */
        content.add(new Paragraph(getPages()).setTextAlignment(TextAlignment.CENTER));

        /*
         * URL
         */
        try {
            content.add(new Paragraph().setTextAlignment(TextAlignment.CENTER)
                    .setFont(PdfFontFactory.createFont(StandardFonts.COURIER)).setFontSize(10)
                    .add(new Link(getUrl(), PdfAction.createURI(getUrl())))
                    .setFixedPosition(24, 24, UnitValue.createPercentValue(98)));
        } catch (IOException e) {
            logger.error("{}", e);
        }

        /*
         * digilib version
         *
         * content.add(new Paragraph(getDigilibVersion()));
         */

        return content;
    }

    /*
     * Methods for the different attributes.
     * 
     */

    protected Image getLogo() {
        String url = request.getAsString("logo");
        if (url.isEmpty()) {
            url = request.getDlConfig().getAsString("pdf-logo");
        }
        try {
            if (!url.isEmpty()) {
                Image logo = new Image(ImageDataFactory.create(new URL(url)));
                return logo;
            }
        } catch (MalformedURLException e) {
            logger.error(e.getMessage());
        }
        return null;
    }

    protected String getHeaderTitle() {
        String text = request.getAsString("header-title");
        if (text.isEmpty()) {
            text = request.getDlConfig().getAsString("pdf-header-title");
        }
        return text;
    }

    protected String getHeaderSubtitle() {
        String text = request.getAsString("header-subtitle");
        if (text.isEmpty()) {
            text = request.getDlConfig().getAsString("pdf-header-subtitle");
        }
        return text;
    }

    protected String getReference() {
        String reference = request.getAsString("reference");
        return reference;
    }

    protected String getTitle() {
        String title = request.getAsString("title");
        if (!title.isEmpty()) {
            return title;
        }
        if (infoReader.hasInfo()) {
            title = infoReader.getAsString("title");
            if (title != null) {
                return title;
            }
        }
        return "[" + request.getAsString("fn") + "]";
    }

    protected String getAuthor() {
        String author = request.getAsString("author");
        if (!author.isEmpty()) {
            return author;
        }
        if (infoReader.hasInfo()) {
            author = infoReader.getAsString("author");
            if (author != null) {
                return author;
            }
        }
        return "";
    }

    protected String getDate() {
        String date = request.getAsString("date");
        if (!date.isEmpty()) {
            return date;
        }
        if (infoReader.hasInfo()) {
            date = infoReader.getAsString("date");
            if (date != null) {
                return date;
            }
        }
        return "";
    }

    protected String getPages() {
        return "Pages " + request.getAsString("pgs") + " (scan numbers)";
    }

    protected String getUrl() {
        String url = request.getAsString("online-url");
        if (!url.isEmpty()) {
            return url;
        }
        String burl = request.getAsString("base.url");
        url = burl + "/digilib.html?fn=" + request.getAsString("fn");
        return url;
    }

    /*
     * protected String getDigilibVersion(){ return
     * "PDF created by digilib PDFMaker v."+PDFCache.version; }
     */

}
