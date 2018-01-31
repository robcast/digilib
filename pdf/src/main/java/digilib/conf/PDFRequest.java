package digilib.conf;

import java.io.IOException;

/*
 * #%L
 * A container class for storing a set of instruction parameters 
 * used for content generator classes like MakePDF.  
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

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;

import digilib.image.ImageJobDescription;
import digilib.image.ImageOpException;
import digilib.io.DocuDirectory;
import digilib.util.NumRange;
import digilib.util.OptionsSet;
import digilib.util.ParameterMap;


/** 
 * A container class for storing a set of instruction parameters 
 * used for content generator classes like MakePDF.  
 * 
 * 
 * @author cmielack, casties
 *
 */
public class PDFRequest extends ParameterMap {

	DigilibConfiguration dlConfig = null;
	NumRange pages = null;
	/** general logger for this class */
	protected static Logger logger = Logger.getLogger("digilib.servlet");

	
	/**
	 * Initialize the PDFRequest
	 * 
	 * @param dlcfg	The DigilibConfiguration. 
	 */
	public PDFRequest(DigilibConfiguration dlcfg) {
		super(30);
		dlConfig = dlcfg;
		initParams();
	}

	/**
	 * Initialize the PDFRequest with a request.
	 * 
	 * @param dlcfg		The DigilibConfiguration. 		
	 * @param request
	 * @throws ImageOpException 
	 * @throws IOException 
	 */
	public PDFRequest(HttpServletRequest request, DigilibConfiguration dlcfg) throws IOException, ImageOpException {
		super(30);
		dlConfig = dlcfg;
		initParams();
		setWithRequest(request);
	}

	
	protected void initParams() {
		// page numbers
		newParameter("pgs", "", null, 's');
		// url of the page/document (second part)
		newParameter("fn", "", null, 's');
		// width of client in pixels
		newParameter("dw", new Integer(0), null, 's');
		// height of client in pixels
		newParameter("dh", new Integer(500), null, 's');
        // page number (used internally)
        newParameter("pn", new Integer(1), null, 'i');
	}
	
	/* (non-Javadoc)
     * @see digilib.servlet.ParameterMap#initOptions()
     */
    @Override
    protected void initOptions() {
        options = (OptionsSet) getValue("mo");
    }

    /**
	 * Read the request object.
	 * 
	 * @param request
     * @throws ImageOpException 
     * @throws IOException 
	 */
	public void setWithRequest(HttpServletRequest request) throws IOException, ImageOpException {
	    // read matching request parameters for the parameters in this map 
		for (String k : params.keySet()) {
			if (request.getParameterMap().containsKey(k)) {
				setValueFromString(k, request.getParameter(k));
			}
		}
		// process parameters
		pages = new NumRange(getAsString("pgs"));
        ImageJobDescription ij = ImageJobDescription.getInstance(this, dlConfig);
        DocuDirectory dir = ij.getFileDirectory();
        int dirsize = dir.size();
        pages.setMaxnum(dirsize);
	}
	
	
	/**
	 * Generate a filename for the pdf to be created.
	 * 
	 * @return
	 */
	public String getDocumentId(){
		String fn = getAsString("fn");
		String dh = getAsString("dh");
		String dw = getAsString("dw");
		String pgs = getAsString("pgs");
			
		String id = "fn=" + fn + "&dw=" + dw + "&dh=" + dh + "&pgs=" + pgs + ".pdf";
		// make safe to use as filename by urlencoding
		try {
			id = URLEncoder.encode(id, "UTF-8");
		} catch (UnsupportedEncodingException e) {
			// this shouldn't happen
		}
		return id;
	}

	
	public ImageJobDescription getImageJobInformation() throws IOException, ImageOpException{
		return ImageJobDescription.getInstance(this, dlConfig);
	}
	
	
	public NumRange getPages() {
	    return pages;
	}
	
	
	/**
	 * Check parameters for validity.
	 * Returns true if no errors are found.
	 * 
	 * @return
	 */
	public boolean checkValidity(){
	    if (pages != null) {
	        return true;
	    }
	    return false;
	} 
	
	public DigilibConfiguration getDlConfig(){
		return dlConfig;
	}
	
}