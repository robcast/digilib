package digilib.pdf;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;

import org.apache.log4j.Logger;

import com.itextpdf.text.Anchor;
import com.itextpdf.text.BadElementException;
import com.itextpdf.text.Chunk;
import com.itextpdf.text.Element;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.Image;
import com.itextpdf.text.Paragraph;

import digilib.io.DigilibInfoReader;
import digilib.io.FileOpException;
import digilib.servlet.PDFCache;
import digilib.servlet.PDFRequest;

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
            File imgDir = pdfji.getImageJobInformation().getFileDirectory().getDir();
            File docDir = imgDir.getParentFile();
            File infoFn = new File(new File(docDir, "presentation"), "info.xml");
            return new DigilibInfoReader(infoFn.getAbsolutePath());
        } catch (FileOpException e) {
            logger.warn("info.xml not found");
        }
        return null;
    }
	
	/**
	 * generate iText-PDF-Contents for the title page
	 * 
	 * @return
	 */
	public Element getPageContents(){
		Paragraph content = new Paragraph();
		content.setAlignment(Element.ALIGN_CENTER);

		// add vertical whitespace
		for(int i=0; i<8; i++){
			content.add(Chunk.NEWLINE);
		}
		
		// add logo
		content.add(getLogo());
		content.add(Chunk.NEWLINE);
		content.add(Chunk.NEWLINE);

		// add title
		Anchor title = new Anchor(new Paragraph(getTitle(),FontFactory.getFont(FontFactory.HELVETICA,16)));
		String burl = job_info.getImageJobInformation().getAsString("base.url");
		
		title.setReference(burl+"digilib.jsp?fn="+job_info.getImageJobInformation().getAsString("fn"));
		content.add(title);		
		content.add(Chunk.NEWLINE);

		// add author
		if(getDate()!=" ")
			content.add(new Paragraph(getAuthor()+" ("+getDate()+")",FontFactory.getFont(FontFactory.HELVETICA,14)));
		else
			content.add(new Paragraph(getAuthor(),FontFactory.getFont(FontFactory.HELVETICA,14)));
		
		content.add(Chunk.NEWLINE);
		
		// add page numbers
		content.add(new Paragraph(getPages(), FontFactory.getFont(FontFactory.HELVETICA, 12)));


		content.add(Chunk.NEWLINE);
		content.add(Chunk.NEWLINE);
		content.add(Chunk.NEWLINE);

		// add digilib version
		content.add(new Paragraph(getDigilibVersion(),FontFactory.getFont(FontFactory.HELVETICA,10)));

		for(int i=0; i<8; i++){
			content.add(Chunk.NEWLINE);
		}
		Anchor address = new Anchor(
				new Paragraph(burl+"digilib.jsp?fn="+job_info.getImageJobInformation().getAsString("fn"), FontFactory.getFont(FontFactory.COURIER, 9))
									);
		address.setReference(burl+"digilib.jsp?fn="+job_info.getImageJobInformation().getAsString("fn"));
		
		content.add(address);

		
		return content;
	}
	
	/*
	 * Methods for the different attributes.
	 * 
	 */
	
	private Image getLogo(){
		try {
			URL url = new URL(job_info.getDlConfig().getAsString("pdf-logo"));
			if(url!=null && !url.equals("")){
				Image logo = Image.getInstance(url);
				logo.setAlignment(Element.ALIGN_CENTER);
				return logo;
			}
		} catch (BadElementException e) {
			logger.error(e.getMessage());
		} catch (MalformedURLException e) {
			logger.error(e.getMessage());
		} catch (IOException e) {
			logger.error(e.getMessage());
		}
		return null;
	}
	
	private String getTitle(){
		if(info_reader.hasInfo())
			return info_reader.getAsString("title");
		else
			return job_info.getImageJobInformation().getAsString("fn");
	}
	
	private String getAuthor(){
		if(info_reader.hasInfo())
			return info_reader.getAsString("author");
		else
			return " ";
	}
	
	private String getDate(){
		if(info_reader.hasInfo())
			return info_reader.getAsString("date");
		else
			return " ";
	}
	
	private String getPages(){
		return "Pages "+job_info.getAsString("pgs") + " (scan page numbers)";
	}

	private String getDigilibVersion(){
		return "Digilib PDFMaker v."+PDFCache.version;
	}
	
}
