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
 * - imago module for digilib                                               *
 *                                                                          *
 *  adds brightness and color manipulation to digilib                       *
 *                                                                          *
 *                       christian luginbuehl (luginbuehl@student.unibe.ch) *
 ****************************************************************************/

// overriding (some kind of inheriting) init in navigation_XX.js
function init_imago(pu, pn, ws, mo, mk, wx, wy, ww, wh, pt, brgt, cont, rot, rgba, rgbm) {

	// debug window to check the parameters passed
	//alert ("DEBUG message (parameters in init imago.js):\n\npu = " + pu + "\npn = " + pn + "\nws = " + ws + "\nmo = " + mo + "\nmk = " + mk + "\nwx = " + wx + "\nwy = " + wy + "\nww = " + ww + "\nwh = " + wh + "\npt = " + pt + "\nbrgt = " + brgt + "\ncont = " + cont + "\nrot = " + rot + "\nrgba = " + rgba + "\nrgbm = " + rgbm);

	// calling original init
	init_pagesTotal(pu, pn, ws, mo, mk, wx, wy, ww, wh, pt);

	att.brgt = parseInt(brgt);
	att.cont = parseFloat(cont);
	att.rot  = parseFloat(rot);
	att.rgba = rgba;
	att.rgbm = rgbm;
	
	focus();
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
		att.brgt = 0;
		att.cont = 0;
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

	newQuery += "&brgt=" + att.brgt;
	newQuery += "&cont=" + att.cont;
	newQuery += "&rot=" + att.rot;
	newQuery += "&rgba=" + att.rgba;
	newQuery += "&rgbm=" + att.rgbm;

	newQuery += "&lv=1";

	// debug window - checking the parameters passed to the next image
	//alert ("DEBUG MESSAGE (query-string in loadPicture):\n\n" + newQuery);
        //alert(location.host + ":" + location.port + location.pathname);
	location.href = location.protocol + "//" + location.host + location.pathname + "?" + newQuery;
}


/**
 * brightness (value of brightness between -255 - +255)
 */
function brightness(value) {

  if ((value < -255) || (value > 255)) {

    alert ("Illegal brightness value (-255 to +255)");
    
  } else {
    
    att.brgt = value;

    loadPicture(2);
  }

}

/**
 * contrast (value of contrast - range?)
 */
function contrast(value) {

  att.cont = parseFloat(value);

  loadPicture(2);

}

/**
 * rotation (value from 0 to 360 degrees)
 */
function rotation(value) {

  value = parseFloat(value) % 360;
  
  if (value < 0) {
    value += 360;
  }

  att.rot = value;

  loadPicture(2);

}

/**
 * rgb add (r/g/b, each value from -255 to +255)
 */
function rgba(value) {

  values = value.split("/");
  
  if (values.length != 3) {
    alert ("Illegal parameter format (r/g/b)");
  } else if ((values[0] < -255) || (values[0] > 255)) {
    alert ("Illegal red additioner (-255 to 255)");
  } else if ((values[1] < -255) || (values[1] > 255)) {
    alert ("Illegal green additioner (-255 to 255)");
  } else if ((values[2] < -255) || (values[2] > 255)) {
    alert ("Illegal blue additioner (-255 to 255)");
  } else {
 
    att.rgba = value;
    loadPicture(2);

  }
}

/**
 * rgb multiply (r/g/b, each value from ??? )
 */
function rgbm(value) {

  values = value.split("/");
  
  if (values.length != 3) {
    alert ("Illegal parameter format (r/g/b)");
  } else {
 
    att.rgbm = value;
    loadPicture(2);

  }
}
