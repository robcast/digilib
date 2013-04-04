package digilib.conf;

import java.io.OutputStream;
import java.util.List;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;

import digilib.image.DocuImage;
import digilib.util.DigilibJobCenter;

/*
 * #%L
 * DigilibConfiguration -- Holding all parameters for digilib servlet.
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2001 - 2013 MPIWG Berlin
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
 * Author: Robert Casties (robcast@berlios.de)
 */


/**
 * Class to hold the digilib servlet configuration parameters. The parameters
 * can be read from the digilib-config file and be passed to other servlets or
 * beans. <br>
 * errorImgFileName: image file to send in case of error. <br>
 * denyImgFileName: image file to send if access is denied. <br>
 * baseDirs: array of base directories in order of preference (prescaled
 * versions first). <br>
 * useAuth: use authentication information. <br>
 * authConfPath: authentication configuration file. <br>
 * ... <br>
 * 
 * @author casties
 * 
 */
public class PDFServletConfiguration extends DigilibServletConfiguration {

    private DigilibJobCenter<OutputStream> pdfExecutor;
    private DigilibJobCenter<DocuImage> pdfImageExecutor;

    public String getVersion() {
        return "2.2.0 pdf";
    }

    /**
     * Constructs PDFServletConfiguration and defines all parameters and their default values.
     */
    public PDFServletConfiguration() {
        super();
        /*
         * Definition of additional parameters and default values. System parameters that
         * are not read from config file have a type 's'.
         */

        // Executor for PDF operations
        newParameter("servlet.worker.pdfexecutor", null, null, 's');
        // Executor for PDF-image operations
        newParameter("servlet.worker.pdfimageexecutor", null, null, 's');

        /*
         * parameters that can be read from config file have a type 'f'
         */

        // number of pdf-generation threads
        newParameter("pdf-worker-threads", new Integer(1), null, 'f');
        // max number of waiting pdf-generation threads
        newParameter("pdf-max-waiting-threads", new Integer(20), null, 'f');
        // number of pdf-image generation threads
        newParameter("pdf-image-worker-threads", new Integer(1), null, 'f');
        // max number of waiting pdf-image generation threads
        newParameter("pdf-image-max-waiting-threads", new Integer(10), null, 'f');
        // PDF generation temp directory
        newParameter("pdf-temp-dir", "pdf_temp", null, 'f');
        // PDF generation cache directory
        newParameter("pdf-cache-dir", "pdf_cache", null, 'f');
    }

    /* (non-Javadoc)
     * @see digilib.conf.DigilibServletConfiguration#configure(javax.servlet.ServletContext)
     */
    @Override
    public void configure(ServletContext context) {
        super.configure(context);
        PDFServletConfiguration dlConfig = this;
        // PDF worker threads
        int pnt = dlConfig.getAsInt("pdf-worker-threads");
        int pmt = dlConfig.getAsInt("pdf-max-waiting-threads");
        pdfExecutor = new DigilibJobCenter<OutputStream>(pnt, pmt, false, "servlet.worker.pdfexecutor");
        dlConfig.setValue("servlet.worker.pdfexecutor", pdfExecutor);
        // PDF image worker threads
        int pint = dlConfig.getAsInt("pdf-image-worker-threads");
        int pimt = dlConfig.getAsInt("pdf-image-max-waiting-threads");
        pdfImageExecutor = new DigilibJobCenter<DocuImage>(pint, pimt, false, "servlet.worker.pdfimageexecutor");
        dlConfig.setValue("servlet.worker.pdfimageexecutor", pdfImageExecutor);
    }

    /* (non-Javadoc)
     * @see digilib.conf.DigilibServletConfiguration#contextDestroyed(javax.servlet.ServletContextEvent)
     */
    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        super.contextDestroyed(sce);
        if (pdfExecutor != null) {
            // shut down pdf thread pool
            List<Runnable> rj = pdfExecutor.shutdownNow();
            int nrj = rj.size();
            if (nrj > 0) {
                logger.error("Still running threads when shutting down PDF job queue: " + nrj);
            }
        }
        if (pdfImageExecutor != null) {
            // shut down pdf image thread pool
            List<Runnable> rj = pdfImageExecutor.shutdownNow();
            int nrj = rj.size();
            if (nrj > 0) {
                logger.error("Still running threads when shutting down PDF-image job queue: " + nrj);
            }
        }
    }


}
