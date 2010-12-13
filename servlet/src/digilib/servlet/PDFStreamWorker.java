package digilib.servlet;

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

public class PDFStreamWorker implements Callable<OutputStream> {

	protected static Logger logger = Logger.getLogger(PDFStreamWorker.class);

	protected DigilibConfiguration dlConfig = null;

	protected Document doc = null;

	protected OutputStream outstream = null;

	protected PDFJobDescription job_info = null;

	protected DigilibJobCenter<DocuImage> imageJobCenter = null;

	/**
	 * @param dlConfig
	 * @param outputfile
	 * @param job_info
	 */
	public PDFStreamWorker(DigilibConfiguration dlConfig, OutputStream outputfile,
			PDFJobDescription job_info,
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
	 */
	protected OutputStream renderPDF() throws DocumentException, InterruptedException,
			ExecutionException, IOException {
		// create document object
		doc = new Document(PageSize.A4, 0, 0, 0, 0);
		PdfWriter docwriter = null;

		long start_time = System.currentTimeMillis();

		docwriter = PdfWriter.getInstance(doc, outstream);

		setPDFProperties(doc);

		doc.open();

		addTitlePage(doc);

		logger.debug("- " + outstream + " doc.open()ed ("
				+ (System.currentTimeMillis() - start_time) + "ms)");
		start_time = System.currentTimeMillis();

		NumRange pgs = job_info.getPages();

		for (int p : pgs) {
			logger.debug(" - adding Image " + p + " to " + outstream);
			// create ImageJobInformation
			ImageJobDescription iji = job_info.getImageJobInformation();
			iji.setValue("pn", p);
			addImage(doc, iji);
			logger.debug(" - done adding Image " + p + " to " + outstream);
		}

		logger.debug(" - done adding all Images to " + outstream);

		doc.close();
		logger.debug("- " + outstream + " doc.close() ("
				+ (System.currentTimeMillis() - start_time) + "ms)");
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
		doc.add(titlepage.getPageContents());
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
		// TODO: do we really scale this again?
		pdfimg.scaleToFit(docW, docH);
		// add to PDF
		doc.add(pdfimg);
		return doc;
	}

}
