/* DigilibSender.java -- image file send worker
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

import javax.servlet.http.HttpServletResponse;

import digilib.io.FileOpException;

/**
 * image file send worker.
 * 
 * @author casties
 *  
 */
public class DigilibSender extends DigilibWorker {

	private File file;

	private String mimetype;

	private HttpServletResponse response;

	/**
	 * @param file
	 * @param mimetype
	 * @param response
	 */
	public DigilibSender(File file, String mimetype,
			HttpServletResponse response) {
		super();
		this.file = file;
		this.mimetype = mimetype;
		this.response = response;
	}

	/**
	 * Actually send the file.
	 *  
	 */
	public void work() {
		logger.debug("worker " + this.getName() + " sending file:"
				+ file.getName());
		try {
			//sleep(2000);
			ServletOps.sendFileImmediately(file, mimetype, response);
		} catch (FileOpException e) {
			logger.error("Unable to send file " + file.getPath() + " because "
					+ e);
		}
		logger.debug("worker "+this.getName()+" done");
	}

}
