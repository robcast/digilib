package digilib.conf;

import java.io.File;
import java.io.OutputStream;
import java.util.List;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.annotation.WebListener;

import digilib.image.DocuImage;
import digilib.io.FileOps;
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
 * 
 * @author casties
 * 
 */
@WebListener
public class PDFServletConfiguration extends DigilibServletConfiguration {

    public static final String PDF_SERVLET_CONFIG_KEY = "digilib.pdf.servlet.configuration";
    public static final String PDF_IMAGEEXECUTOR_KEY = "pdf.servlet.worker.imageexecutor";
    public static final String PDF_EXECUTOR_KEY = "pdf.servlet.worker.pdfexecutor";
    public static final String PDF_WORKDIR_KEY = "pdf.servlet.work.dir";
    public static final String PDF_CACHEDIR_KEY = "pdf.servlet.cache.dir";

    public static String getClassVersion() {
        return DigilibServletConfiguration.getClassVersion() + " pdf";
    }

    /* non-static getVersion for Java inheritance */
    @Override
    public String getVersion() {
    	return getClassVersion();
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
        newParameter(PDF_EXECUTOR_KEY, null, null, 's');
        // Executor for PDF-image operations
        newParameter(PDF_IMAGEEXECUTOR_KEY, null, null, 's');
        // working directory for PDF generation
        newParameter(PDF_WORKDIR_KEY, null, null, 's');
        // cache directory for PDF files
        newParameter(PDF_CACHEDIR_KEY, null, null, 's');

        /*
         * parameters that can be read from config file have a type 'f'
         */

        // number of pdf-generation threads
        newParameter("pdf-worker-threads", Integer.valueOf(1), null, 'f');
        // max number of waiting pdf-generation threads
        newParameter("pdf-max-waiting-threads", Integer.valueOf(20), null, 'f');
        // number of pdf-image generation threads
        newParameter("pdf-image-worker-threads", Integer.valueOf(1), null, 'f');
        // max number of waiting pdf-image generation threads
        newParameter("pdf-image-max-waiting-threads", Integer.valueOf(10), null, 'f');
        // PDF generation temp directory
        newParameter("pdf-temp-dir", "pdf_temp", null, 'f');
        // PDF generation cache directory
        newParameter("pdf-cache-dir", "pdf_cache", null, 'f');
        // logo for PDFs
        newParameter("pdf-logo", "https://robcast.github.io/digilib/images/digilib-logo-big.png", null, 'f');
    }

    /* (non-Javadoc)
     * @see digilib.conf.DigilibServletConfiguration#configure(javax.servlet.ServletContext)
     */
    @Override
    public void configure(ServletContext context) {
        super.configure(context);
        configurePdfServlet(context);
    }

    /**
     * @param context 
     */
    protected void configurePdfServlet(ServletContext context) {
        PDFServletConfiguration config = this;
        // PDF worker threads
        int pnt = config.getAsInt("pdf-worker-threads");
        int pmt = config.getAsInt("pdf-max-waiting-threads");
        DigilibJobCenter<OutputStream> pdfExecutor = new DigilibJobCenter<OutputStream>(pnt, pmt, false, "servlet.worker.pdfexecutor");
        config.setValue(PDF_EXECUTOR_KEY, pdfExecutor);
        // PDF image worker threads
        int pint = config.getAsInt("pdf-image-worker-threads");
        int pimt = config.getAsInt("pdf-image-max-waiting-threads");
        DigilibJobCenter<DocuImage> pdfImageExecutor = new DigilibJobCenter<DocuImage>(pint, pimt, false, "servlet.worker.pdfimageexecutor");
        config.setValue(PDF_IMAGEEXECUTOR_KEY, pdfImageExecutor);
        /*
         * set up temporary directories
         */
        String temp_fn = config.getAsString("pdf-temp-dir");
        File temp_directory = new File(temp_fn);
        if (!temp_directory.exists()) {
            // try to create
            temp_directory.mkdirs();
        } else {
            // rid the temporary directory of possible incomplete document files
            FileOps.emptyDirectory(temp_directory);
        }
        config.setValue(PDF_WORKDIR_KEY, temp_directory);
        String cache_fn = config.getAsString("pdf-cache-dir");
        File cache_directory = new File(cache_fn);
        if (!cache_directory.exists()) {
            // try to create
            cache_directory.mkdirs();
        }
        config.setValue(PDF_CACHEDIR_KEY, cache_directory);

        /*
         * set as the PDF servlets main config
         */
        context.setAttribute(PDF_SERVLET_CONFIG_KEY, this);
    }

    /**
     * Initialisation on first run.
     */
    public void contextInitialized(ServletContextEvent cte) {
        ServletContext context = cte.getServletContext();
        context.log("***** Digital Image Library PDF Servlet Configuration (" + getVersion() + ") *****");

        // see if there is a Configuration instance
        DigilibServletConfiguration dlConfig = DigilibServletConfiguration.getCurrentConfig(context);
        DigilibServletConfiguration pdfConfig = PDFServletConfiguration.getCurrentConfig(context);
        if (dlConfig == null && pdfConfig == null) {
            // there is no config yet - full configure
            try {
                readConfig(context);
                configure(context);
            } catch (Exception e) {
                logger.error("Error reading digilib servlet configuration:", e);
            }
        } else if (pdfConfig == null){
            // merge the existing config
            logger.debug("PDFServletConfiguration re-using config!");
            try {
                // read config file
                readConfig(context);
                // add configured 's' Parameters from dlConfig
                params.putAll(dlConfig.getParameters('s'));
                // just configure PDF stuff
                logger.info("***** Digital Image Library PDF Servlet Configuration (" + getVersion() + ") *****");
                configurePdfServlet(context);
            } catch (Exception e) {
                logger.error("Error reading digilib servlet configuration:", e);
            }
        } else {
            logger.warn("PDFServletConfiguration already configured!");            
        }
    }

    /* (non-Javadoc)
     * @see digilib.conf.DigilibServletConfiguration#contextDestroyed(javax.servlet.ServletContextEvent)
     */
    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        super.contextDestroyed(sce);
        ServletContext context = sce.getServletContext();
        DigilibServletConfiguration config = PDFServletConfiguration.getCurrentConfig(context);
        @SuppressWarnings("unchecked")
        DigilibJobCenter<DocuImage>  pdfExecutor = (DigilibJobCenter<DocuImage>) config.getValue(PDF_EXECUTOR_KEY);
        if (pdfExecutor  != null) {
            // shut down pdf thread pool
            List<Runnable> rj = pdfExecutor.shutdownNow();
            int nrj = rj.size();
            if (nrj > 0) {
                logger.error("Still running threads when shutting down PDF job queue: " + nrj);
            }
        }
        @SuppressWarnings("unchecked")
        DigilibJobCenter<DocuImage>  pdfImageExecutor = (DigilibJobCenter<DocuImage>) config.getValue(PDF_IMAGEEXECUTOR_KEY);
        if (pdfImageExecutor != null) {
            // shut down pdf image thread pool
            List<Runnable> rj = pdfImageExecutor.shutdownNow();
            int nrj = rj.size();
            if (nrj > 0) {
                logger.error("Still running threads when shutting down PDF-image job queue: " + nrj);
            }
        }
    }

    /**
     * Returns the current DigilibConfiguration from the context.
     * 
     * @param context
     * @return
     */
    public static DigilibServletConfiguration getCurrentConfig(ServletContext context) {
        DigilibServletConfiguration config = (DigilibServletConfiguration) context
                .getAttribute(PDFServletConfiguration.PDF_SERVLET_CONFIG_KEY);
        return config;
    }

}
