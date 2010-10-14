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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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
 * Initalisation servlet for setup tasks.
 * 
 * @author casties
 *  
 */
public class Initialiser extends HttpServlet {

	private static final long serialVersionUID = -5126621114382549343L;

	/** servlet version */
	public static final String iniVersion = "0.1b2";

	/** gengeral logger for this class */
	private static Logger logger = Logger.getLogger("digilib.init");

	/** AuthOps instance */
	AuthOps authOp;

	/** DocuDirCache instance */
	DocuDirCache dirCache;

	/** DigilibConfiguration instance */
	DigilibConfiguration dlConfig;

	/** use authorization database */
	boolean useAuthentication = false;

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
		dlConfig = (DigilibConfiguration) context
				.getAttribute("digilib.servlet.configuration");
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
					authOp = new XMLAuthOps(authConf);
					dlConfig.setValue("servlet.auth.op", authOp);
					dlConfig.setValue("auth-file", authConf);
				}
				// DocuImage class
				DocuImage di = dlConfig.getDocuImageInstance();
				dlConfig.setValue("servlet.docuimage.class", di.getClass().getName());
                ImageOps.setDocuImage(di);
				// worker threads
				int nt = dlConfig.getAsInt("worker-threads");
				//DigilibWorker1.setSemaphore(nt, true);
				ExecutorService imageEx = Executors.newFixedThreadPool(nt);
                dlConfig.setValue("servlet.worker.imageexecutor", imageEx);				
				int mt = dlConfig.getAsInt("max-waiting-threads");
				//DigilibWorker1.setMaxWaitingThreads(mt);
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
			logger.warn("Already initialised?");
			// set our AuthOps
			useAuthentication = dlConfig.getAsBoolean("use-authorization");
			// AuthOps instance
			authOp = (AuthOps) dlConfig.getValue("servlet.auth.op");
			// DocuDirCache instance
			dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
		}
	}

}
