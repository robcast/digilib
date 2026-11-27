package digilib.pdf;

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

/**
 * A class for the generation of a title page for the generated pdf documents.
 */
public class PDFTitlePage {

    protected PDFRequest request = null;
    protected static Logger logger = LoggerFactory.getLogger("digilib.servlet");

    /**
     * Initialize the TitlePage
     * 
     * @param pdfji
     */
    public PDFTitlePage(PDFRequest pdfji) {
        request = pdfji;
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
        Table headerBlock = new Table(UnitValue.createPercentArray(new float[] { 20, 80 }));
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
        } catch (Exception e) {
            logger.error("Error creating logo: {}", e.getMessage());
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
        return "[" + request.getAsString("fn") + "]";
    }

    protected String getAuthor() {
        String author = request.getAsString("author");
        if (!author.isEmpty()) {
            return author;
        }
        return "";
    }

    protected String getDate() {
        String date = request.getAsString("date");
        if (!date.isEmpty()) {
            return date;
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
