/* Initialiser.java -- initalisation servlet for setup tasks
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 2004 Robert Casties (robcast@mail.berlios.de)
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 * 
 * Please read license.txt for the full details. A copy of the GPL may be found
 * at http://www.gnu.org/copyleft/lgpl.html
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 *  
 * Created on 18.10.2004
 */
package digilib.servlet;

import java.io.File;
import java.io.OutputStream;
import java.util.List;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;

import org.apache.log4j.Logger;
import org.apache.log4j.xml.DOMConfigurator;

import digilib.auth.AuthOps;
import digilib.auth.XMLAuthOps;
import digilib.image.DocuImage;
import digilib.image.ImageOps;
import digilib.io.AliasingDocuDirCache;
import digilib.io.DocuDirCache;
import digilib.io.FileOps;

/**
 * Singleton initalisation servlet for setup tasks and resources.
 * 
 * @author casties
 *  
 */
public class Initialiser extends HttpServlet {

	/** servlet version */
	public static final String iniVersion = "0.2";

	/** gengeral logger for this class */
	private static Logger logger = Logger.getLogger("digilib.init");

	/** DocuDirCache instance */
	DocuDirCache dirCache;

	/** DigilibConfiguration instance */
	DigilibConfiguration dlConfig;

	/** Executor for digilib image jobs */
	DigilibJobCenter imageEx;
	
	/** Executor for PDF jobs */
	DigilibJobCenter pdfEx;
	
	/** Executor for PDF image jobs */
	DigilibJobCenter pdfImageEx;
	
	/**
	 * Initialisation on first run.
	 * 
	 * @see javax.servlet.Servlet#init(javax.servlet.ServletConfig)
	 */
	public void init(ServletConfig config) throws ServletException {
		super.init(config);

		System.out
				.println("***** Digital Image Library Initialisation Servlet (version "
						+ iniVersion + ") *****");

		// get our ServletContext
		ServletContext context = config.getServletContext();
		// see if there is a Configuration instance
		dlConfig = (DigilibConfiguration) context.getAttribute("digilib.servlet.configuration");
		if (dlConfig == null) {
			// create new Configuration
			try {
				dlConfig = new DigilibConfiguration(config);

				/*
				 * further initialization
				 */

				// set up the logger
				File logConf = ServletOps.getConfigFile((File) dlConfig
						.getValue("log-config-file"), config);
				DOMConfigurator.configure(logConf.getAbsolutePath());
				dlConfig.setValue("log-config-file", logConf);
				// say hello in the log file
				logger
						.info("***** Digital Image Library Initialisation Servlet (version "
								+ iniVersion + ") *****");
				// directory cache
				String[] bd = (String[]) dlConfig.getValue("basedir-list");
				int[] fcs = { FileOps.CLASS_IMAGE, FileOps.CLASS_TEXT,
						FileOps.CLASS_SVG };
				if (dlConfig.getAsBoolean("use-mapping")) {
					// with mapping file
					File mapConf = ServletOps.getConfigFile((File) dlConfig
							.getValue("mapping-file"), config);
					dirCache = new AliasingDocuDirCache(bd, fcs, mapConf,
							dlConfig);
					dlConfig.setValue("mapping-file", mapConf);
				} else {
					// without mapping
					dirCache = new DocuDirCache(bd, fcs, dlConfig);
				}
				dlConfig.setValue("servlet.dir.cache", dirCache);
				// useAuthentication
				if (dlConfig.getAsBoolean("use-authorization")) {
					// DB version
					//authOp = new DBAuthOpsImpl(util);
					// XML version
					File authConf = ServletOps.getConfigFile((File) dlConfig
							.getValue("auth-file"), config);
					AuthOps authOp = new XMLAuthOps(authConf);
					dlConfig.setValue("servlet.auth.op", authOp);
					dlConfig.setValue("auth-file", authConf);
				}
				// DocuImage class
				DocuImage di = dlConfig.getDocuImageInstance();
				dlConfig.setValue("servlet.docuimage.class", di.getClass().getName());
                ImageOps.setDocuImage(di);
				// digilib worker threads
				int nt = dlConfig.getAsInt("worker-threads");
                int mt = dlConfig.getAsInt("max-waiting-threads");
				imageEx = new DigilibJobCenter<DocuImage>(nt, mt, true);
                dlConfig.setValue("servlet.worker.imageexecutor", imageEx);				
				// PDF worker threads
				int pnt = dlConfig.getAsInt("pdf-worker-threads");
                int pmt = dlConfig.getAsInt("pdf-max-waiting-threads");
				pdfEx = new DigilibJobCenter<OutputStream>(pnt, pmt, true);
                dlConfig.setValue("servlet.worker.pdfexecutor", pdfEx);				
				// digilib worker threads
				int pint = dlConfig.getAsInt("pdf-image-worker-threads");
                int pimt = dlConfig.getAsInt("pdf-image-max-waiting-threads");
				pdfImageEx = new DigilibJobCenter<DocuImage>(pint, pimt, true);
                dlConfig.setValue("servlet.worker.pdfimageexecutor", pdfImageEx);				
				// set as the servlets main config
				context.setAttribute("digilib.servlet.configuration", dlConfig);

			} catch (Exception e) {
				throw new ServletException(e);
			}
		} else {
			// say hello in the log file
			logger
					.info("***** Digital Image Library Initialisation Servlet (version "
							+ iniVersion + ") *****");
			logger.warn("Already initialised!");
		}
	}

    /** clean up local resources
     * @see javax.servlet.GenericServlet#destroy()
     */
    @Override
    public void destroy() {
        if (dirCache != null) {
            // shut down dirCache?
            dirCache = null;
        }
        if (imageEx != null) {
            // shut down image thread pool
            List<Runnable> rj = imageEx.shutdownNow();
            int nrj = rj.size();
            if (nrj > 0) {
                logger.error("Still running threads when shutting down image job queue: "+nrj);
            }
        }
        super.destroy();
    }

}
