/* DigilibJob.java -- digilib job for worker
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

import digilib.image.DocuImage;

/** digilib job for worker.
 * 
 * @author casties
 *
 */
public class DigilibJob {

	private DigilibConfiguration config;
	
	private DigilibRequest request;
	
	private DocuImage image;
	
	
	/**
	 * @return Returns the config.
	 */
	public DigilibConfiguration getConfig() {
		return config;
	}
	/**
	 * @param config The config to set.
	 */
	public void setConfig(DigilibConfiguration config) {
		this.config = config;
	}
	/**
	 * @return Returns the image.
	 */
	public DocuImage getImage() {
		return image;
	}
	/**
	 * @param image The image to set.
	 */
	public void setImage(DocuImage image) {
		this.image = image;
	}
	/**
	 * @return Returns the request.
	 */
	public DigilibRequest getRequest() {
		return request;
	}
	/**
	 * @param request The request to set.
	 */
	public void setRequest(DigilibRequest request) {
		this.request = request;
	}
}
