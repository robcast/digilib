/**
 * 
 */
package digilib.pdf;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.concurrent.Callable;

import digilib.image.DocuImage;
import digilib.servlet.DigilibConfiguration;
import digilib.servlet.PDFRequest;
import digilib.util.DigilibJobCenter;

/**
 * @author casties
 *
 */
public class PDFFileWorker implements Callable<File> {
	/** the wrapped PDFStreamWorker */
    protected PDFStreamWorker streamWorker;
    
    /** the temporary output file */
    protected File tempFile;

    /** the final output file */
    protected File finalFile;

    /** Create new PDFFileWorker.
     * @param dlConfig
     * @param tempFile
     * @param job_info
     * @param imageJobCenter
     * @throws FileNotFoundException
     */
    public PDFFileWorker(DigilibConfiguration dlConfig, 
    		File tempFile, File finalFile,
			PDFRequest job_info,
			DigilibJobCenter<DocuImage> imageJobCenter) throws FileNotFoundException {
        this.tempFile = tempFile; 
    	OutputStream outstream = new FileOutputStream(tempFile);
    	this.finalFile = finalFile;
    	this.streamWorker = new PDFStreamWorker(dlConfig, outstream, job_info, imageJobCenter);
    }
    
    public File call() throws Exception {
        OutputStream outstream = null;
        try {
            outstream = streamWorker.call();
            outstream.flush();
            outstream.close();
            // move temporary to final file
            tempFile.renameTo(finalFile);
        } finally {
            if (outstream != null) {
                outstream.close();
            }
        }
        return finalFile;
    }
    
    
}
