package digilib.pdf;

/*
 * #%L
 * PDF Worker that writes in a file.
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
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.concurrent.Callable;

import digilib.image.DocuImage;
import digilib.conf.DigilibConfiguration;
import digilib.conf.PDFRequest;
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
