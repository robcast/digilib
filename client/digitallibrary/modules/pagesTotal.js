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

	att[9] = parseInt(pt);
	
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
		parent.pageFrame.document.write(att[1] + '<b> of </b>' + att[9] + '</p></body></html>');
		parent.pageFrame.document.close();
	}
}


/**
 * overriding nextPage in navigation
 */
function nextPage(keepArea) {

    att[1] = parseInt(att[1]) + 1;

    if (att[1] <= att[9] || isNaN(att[9])) {
        loadPicture(0, keepArea);
    } else {
	    att[1] = parseInt(att[1]) - 1;
        alert("You are already on the last page!");
    }
}


/**
 * overriding 'page' in navigation
 */
function page(keepArea) {

	do {
    	var page = prompt("Goto Page (1 - " + att[9] + "):", 1);
    	
	} while ((page != null) && ((isNaN(page)) || (page < 1) || (page > att[9])));

   	if ((page != null) && (page != att[1])) {
		att[1] = page;
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

	var newURL  = "dlImage.jsp?"
	newURL += "fn=" + att[0] + "&pn=" + att[1] + "&ws=" + att[2] + "&mo=" + att[3];

	if (detailGrade == 0) {
		att[4] = "0/0";
	}

	if ((detailGrade == 1) || (detailGrade == 0 && !keepArea)) {
		att[5] = 0;
		att[6] = 0;
		att[7] = 1;
		att[8] = 1;
	}

	newURL += "&mk=" + att[4] + "&wx=" + att[5] + "&wy=" + att[6] + "&ww=" + att[7] + "&wh=" + att[8];

	if (navigator.appName.toLowerCase() == "netscape") {	// mozilla-browsers (netscape 4.xx, netscape 6.xx, etc.)
		newURL += "&dw=" + (innerWidth-30) + "&dh=" + (innerHeight-30);
	} else {												// ie
		newURL += "&dw=" + (document.body.clientWidth-30) + "&dh=" + (document.body.clientHeight-30);
	}

	newURL += "&pt=" + att[9];

	// debug window - checking the parameters passed to the next image
	//alert ("DEBUG MESSAGE (complete URL in loadPicture):\n\n" + newURL);

	location.href = newURL;
}