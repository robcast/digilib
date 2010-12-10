package digilib.servlet;

import java.io.OutputStream;
import java.util.concurrent.Callable;

import digilib.image.DocuImage;

public class PDFFileWorker extends PDFStreamWorker implements Callable<OutputStream> {

	public PDFFileWorker(DigilibConfiguration dlConfig,
			OutputStream outputfile, PDFJobInformation job_info,
			DigilibJobCenter<DocuImage> imageJobCenter) {
		super(dlConfig, outputfile, job_info, imageJobCenter);
		// TODO Auto-generated constructor stub
	}

}
