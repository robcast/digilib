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
import digilib.io.FileOps;
import digilib.util.NumRange;
import digilib.util.OptionsSet;
import digilib.util.ParameterMap;


/** 
 * A container class for storing a set of instruction parameters 
 * used for content generator classes.
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
	 * Create a PDFRequest
	 * 
	 * @param dlcfg	The DigilibConfiguration. 
	 */
	public PDFRequest(DigilibConfiguration dlcfg) {
		super(30);
		dlConfig = dlcfg;
		initParams();
	}

	/**
	 * Create a PDFRequest with a request and config.
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
		// path of the page/document
		newParameter("fn", "", null, 's');
		// width of client in pixels
		newParameter("dw", Integer.valueOf(0), null, 's');
		// height of client in pixels
		newParameter("dh", Integer.valueOf(500), null, 's');
		// cover page header logo url
		newParameter("logo", "", null, 's');
		// cover page header title
		newParameter("header-title", "", null, 's');
		// cover page header subtitle
		newParameter("header-subtitle", "", null, 's');
		// cover page title
		newParameter("title", "", null, 's');
		// cover page author
		newParameter("author", "", null, 's');
		// cover page date
		newParameter("date", "", null, 's');
		// cover page full reference
		newParameter("reference", "", null, 's');
		// cover page online url
		newParameter("online-url", "", null, 's');

		// page number (used internally)
        newParameter("pn", Integer.valueOf(1), null, 'i');
        // base URL (from http:// to below /servlet used internally)
        newParameter("base.url", null, null, 'i');
	}
	
	/* (non-Javadoc)
     * @see digilib.servlet.ParameterMap#initOptions()
     */
    @Override
    protected void initOptions() {
        options = (OptionsSet) getValue("mo");
    }

    /**
	 * Initialize with a request.
	 * 
	 * @param request
     * @throws ImageOpException 
     * @throws IOException 
	 */
	public void setWithRequest(HttpServletRequest request) throws IOException, ImageOpException {
	    // read matching request parameters for the parameters in this map 
		for (String k : params.keySet()) {
			String v = request.getParameter(k);
			if (v != null) {
				setValueFromString(k, v);
			}
		}
		// process parameters
		String pgs = getAsString("pgs");
		if (pgs.isEmpty()) {
			throw new ImageOpException("Missing pgs parameter!");
		}
		pages = new NumRange(pgs);
		initOptions();
		// get maxnum from directory
        ImageJobDescription ij = ImageJobDescription.getRawInstance(this, dlConfig);
        DocuDirectory dir = ij.getFileDirectory();
        int dirsize = dir.size();
        String fn = getAsString("fn");
        if (dirsize == 0 || !dir.getDirName().equals(FileOps.normalName(fn))) {
        	// the directory is not the same as fn - maybe fn doesn't exist and we got the parent
        	throw new IOException("Invalid directory: "+fn);
        }
        pages.setMaxnum(dirsize);
        setBaseURL(request);
	}
	

    /**
     * Set the requests base URL parameter from a
     * javax.sevlet.http.HttpServletRequest.
     * 
     * @param request
     *            HttpServletRequest to set the base URL.
     */
    public void setBaseURL(javax.servlet.http.HttpServletRequest request) {
        String baseURL = null;
        // calculate base URL string from request until webapp
        String s = request.getRequestURL().toString();
        // get name of webapp
        String wn = request.getContextPath();
        int eop = s.lastIndexOf(wn);
        if (eop > 0) {
            baseURL = s.substring(0, eop + wn.length());
        } else {
            // fall back
            baseURL = "http://" + request.getServerName() + "/digilib";
        }
        setValue("base.url", baseURL);
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
		// create unique hash of cover page contents
		String cover = getAsString("logo") + getAsString("header-title") + getAsString("header-subtitle")
				+ getAsString("author") + getAsString("title") + getAsString("date") + getAsString("reference")
				+ getAsString("online-url");
		int coverId = cover.hashCode();
			
		String id = "fn=" + fn + "&dw=" + dw + "&dh=" + dh + "&pgs=" + pgs + "&id=" + coverId + ".pdf";
		// make safe to use as filename by urlencoding
		try {
			id = URLEncoder.encode(id, "UTF-8");
		} catch (UnsupportedEncodingException e) {
			// this shouldn't happen
		}
		return id;
	}
	
	public ImageJobDescription getImageJobInformation() throws IOException, ImageOpException{
		return ImageJobDescription.getRawInstance(this, dlConfig);
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
	public boolean isValid() {
		if (pages != null) {
			return true;
		}
		return false;
	}
	
	public DigilibConfiguration getDlConfig() {
		return dlConfig;
	}
}