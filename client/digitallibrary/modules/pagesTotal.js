/*
Copyright (C) 2003 WTWG, Uni Bern
 
This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.
 
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
 
You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA
 
Author: Christian Luginbuehl, 01.05.2003 , Version Alcatraz 0.3
*/
/****************************************************************************
 * - sample module for digilib                                              *
 *                                                                          *
 *                       christian luginbuehl (luginbuehl@student.unibe.ch) *
 ****************************************************************************/

// overriding (some kind of inheriting) init in navigation13_XX.js
function init_pagesTotal(pu, pn, ws, mo, mk, wx, wy, ww, wh, pt) {

	// debug window to check the parameters passed
	//alert ("DEBUG message (parameters in init pagesTotal.js):\n\npu = " + pu + "\npn = " + pn + "\nws = " + ws + "\nmo = " + mo + "\nmk = " + mk + "\nwx = " + wx + "\nwy = " + wy + "\nww = " + ww + "\nwh = " + wh + "\npt = " + pt);

	// calling original init
	init(pu, pn, ws, mo, mk, wx, wy, ww, wh);

	att.pt = parseInt(pt);
	
	pagesTotal();

	focus();
}


/**
 * shows page XX of YY in a dedicated frame
 *
 * ATTENTION: some stuff is still to do, because of some incompatibilities between servlet and client
 *            i should be able to read the total number of pages in dlImage.jsp
 */
function pagesTotal() {

	if (parent.pageFrame) {
		parent.pageFrame.document.open();
		parent.pageFrame.document.write('<html><head></head><body bgcolor="#CCCCCC" topmargin="5" marginheight="5">');
		parent.pageFrame.document.write('<p style="font-family: Verdana, Arial, Helvetica, sans-serif; text-align: center; color: #CC3333; font-size: 11px">');
		parent.pageFrame.document.write(att.pn + '<b> of </b>' + att.pt + '</p></body></html>');
		parent.pageFrame.document.close();
	}
}


/**
 * overriding nextPage in navigation
 */
function nextPage(keepArea) {

    att.pn = parseInt(att.pn) + 1;

    if (att.pn <= att.pt || isNaN(att.pt)) {
        loadPicture(0, keepArea);
    } else {
	    att.pn = parseInt(att.pn) - 1;
        alert("You are already on the last page!");
    }
}


/**
 * overriding 'page' in navigation
 */
function page(keepArea) {

	do {
    	var page = prompt("Goto Page (1 - " + att.pt + "):", 1);
    	
	} while ((page != null) && ((isNaN(page)) || (page < 1) || (page > att.pt)));

   	if ((page != null) && (page != att.pn)) {
		att.pn = page;
		loadPicture(0, keepArea);
	}
}


/**
 * overriding 'loadPicture' in navigation
 */
function loadPicture(detailGrade, keepArea) {

	// the different detailGrades:
	// 		0 -> back, next, page
	//		1 -> zoomout
	//		2 -> zoomarea, zoompoint, moveto, scaledef

	var newQuery = "fn=" + att.fn + "&pn=" + att.pn + "&ws=" + att.ws + "&mo=" + att.mo;

	if (detailGrade == 0) {
		att.mk = "0/0";
	}

	if ((detailGrade == 1) || (detailGrade == 0 && !keepArea)) {
		att.wx = 0;
		att.wy = 0;
		att.ww = 1;
		att.wh = 1;
	}

	newQuery += "&mk=" + att.mk + "&wx=" + att.wx + "&wy=" + att.wy + "&ww=" + att.ww + "&wh=" + att.wh;

	if (navigator.appName.toLowerCase() == "netscape") {	// mozilla-browsers (netscape 4.xx, netscape 6.xx, etc.)
		newQuery += "&dw=" + (innerWidth-30) + "&dh=" + (innerHeight-30);
	} else {												// ie, opera
		newQuery += "&dw=" + (document.body.clientWidth-30) + "&dh=" + (document.body.clientHeight-30);
	}
	
	newQuery += "&pt=" + att.pt;
	newQuery += "&lv=1";

	// debug window - checking the parameters passed to the next image
	//alert ("DEBUG MESSAGE (query-string in loadPicture):\n\n" + newQuery);

	location.href = location.protocol + "//" + location.host + location.pathname + "?" + newQuery;
}
