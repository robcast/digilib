package digilib.servlet;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;

import org.apache.log4j.Logger;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;

import digilib.io.DocuDirCache;

/** A class for the generation of title pages for the generated pdf documents.
 * 
 * 
 */
public class PDFTitlePage {
	
	private PDFJobInformation job_info = null;
	private DigilibInfoReader info_reader= null;
	private DocuDirCache dirCache = null;
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	
	/**
	 * Initialize a TitlePage
	 * @param pdfji
	 */
	public PDFTitlePage(PDFJobInformation pdfji){
		job_info = pdfji;
		dirCache = (DocuDirCache) job_info.getDlConfig().getValue("servlet.dir.cache");

		String fn = getBase(dirCache.getDirectory(pdfji.getImageJobInformation().getAsString("fn")).getDir().getPath()) + "presentation/info.xml";
		
		info_reader = new DigilibInfoReader(fn);
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

		// add credits
		content.add(new Paragraph("MPIWG Berlin 2009", FontFactory.getFont(FontFactory.HELVETICA,10)));

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
	
	/**
	 * return base directory of an image directory
	 * 
	 * @param path
	 * @return
	 */
	private String getBase(String path){
		if(path.contains("/")){
			String[] x = path.split("/");
			String newpath = "";
			for(int i=0; i<x.length-1; i++){
				newpath += x[i]+"/";
			}
			return newpath;
		}
		else
			return "";
	}
	

	/**
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
			e.printStackTrace();
		} catch (MalformedURLException e) {
			logger.error(e.getMessage());
			e.printStackTrace();
		} catch (IOException e) {
			logger.error(e.getMessage());
			e.printStackTrace();
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
		return "Digilib PDFMaker v."+PDFMaker.version;
	}
	
}
