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
// this global variable has to be initialised before the frist use of the functions below
// to fill in the attributes you can use the function init provided below
// - array with all attributes
var att = new Object();

// fill in the values of the "att"-array
function init(fn, pn, ws, mo, mk, wx, wy, ww, wh) {

	// debug window to check the parameters passed
	//alert ("DEBUG message (parameters in init):\n\npu = " + pu + "\npn = " + pn + "\nws = " + ws + "\nmo = " + mo + "\nmk = " + mk + "\nwx = " + wx + "\nwy = " + wy + "\nww = " + ww + "\nwh = " + wh);

	// attaching the values to the att-array
	att.fn = fn;
	att.pn = parseInt(pn);
	att.ws = parseFloat(ws);
	att.mo = mo;
	att.mk = mk;
	att.wx = parseFloat(wx);
	att.wy = parseFloat(wy);
	att.ww = parseFloat(ww);
	att.wh = parseFloat(wh);
	
	// compatablility issue
// dangerous at the time - lugi
//	if (att.mo.indexOf("f") > -1) {
//		att.mo = "fit";
//	}

	// converts the old mark format (0-1000) to new format(0.0 - 1.0)
	// could even be useless now
	if (att.mk != "0/0" && att.mk != "") {
		var tmp = att.mk.split(";");
		
		att.mk = "";
		
		for (i = 0; i < tmp.length; i++) {
			tmp[i] = tmp[i].split("/");

			if (tmp[i][0] > 1 && tmp[i][1] > 1) {
				tmp[i][0] /= 1000;
				tmp[i][1] /= 1000;
			}
			
			att.mk += tmp[i][0] + "/" + tmp[i][1] + ";";
		}
		att.mk = att.mk.slice(0, -1);
	}

	// initialisation stuff
	// ====================
	
	setMarks();

	this.document.addEventListener('keypress', parseKeypress, true);
	focus();
	
	// give a name to the window containing digilib - this way one can test if there is already a
	// digilib-window open and replace the contents of it (ex. digicat)
	top.window.name = "digilib";
}


// function that launches the ScaleServlet
// the different detailGrades:
// 		0 -> back, next, page
//		1 -> zoomout
//		2 -> zoomarea, zoompoint, moveto, scaledef

function loadPicture(detailGrade, keepArea) {

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
	newQuery += "&dw=" + (innerWidth-30) + "&dh=" + (innerHeight-30);
	newQuery += "&lv=1"

	// debug window - checking the parameters passed to the next image
	alert ("DEBUG MESSAGE (query-string in loadPicture):\n\n" + newQuery);

	location.href = location.protocol + "//" + location.host + location.pathname + "?" + newQuery;
}


// constructor holding different values of a point
function Point(event) {

	this.pageX = parseInt(event.pageX);
	this.pageY = parseInt(event.pageY);
	
	this.x = this.pageX-parseInt(document.getElementById("lay1").style.left);
	this.y = this.pageY-parseInt(document.getElementById("lay1").style.top);
	
	this.relX = cropFloat(att.wx+(att.ww*this.x/document.pic.offsetWidth));
	this.relY = cropFloat(att.wy+(att.wh*this.y/document.pic.offsetHeight));

	return this;
}


function backPage(keepArea) {

    att.pn = parseInt(att.pn) - 1;

    if (att.pn > 0) {
        loadPicture(0, keepArea);
    } else {
	    att.pn = parseInt(att.pn) + 1;
        alert("You are already on the first page!");
    }
}


function nextPage(keepArea) {

    att.pn = parseInt(att.pn) + 1;

	loadPicture(0, keepArea);
}


function page(keepArea) {

	do {
    	page = prompt("Goto Page:", 1);
	} while ((page != null) && (page < 1));

   	if (page != null && page != att.pn) {
		att.pn = page;
		loadPicture(0, keepArea);
	}
}


function digicat() {
	var url = baseUrl + "/digicat.jsp?" + att.fn + "+" + att.pn;
	win = window.open(url, "digicat");
	win.focus();
}


function ref(refselect) {

	var hyperlinkRef = baseUrl + "/digilib.jsp?";
	hyperlinkRef += att.fn + "+" + att.pn + "+" + att.ws + "+" + att.mo + "+" + att.mk;
	
	if ((att.wx != 0) || (att.wy != 0) || (att.ww != 1) || (att.wh != 1)) {
		hyperlinkRef += "+" + att.wx + "+" + att.wy + "+" + att.ww + "+" + att.wh;
	}

	if (refselect == 1) {
		prompt("Link for HTML--documents", hyperlinkRef);
	} else {
		prompt("Link for LaTeX--documents", "\\href{" + hyperlinkRef + "}{TEXT}");
	}
}


function mark() {

	if (att.mk.split(";").length > 7) {
		alert("Only 8 marks are possible at the moment!");
		return;
	}

	function markEvent(event) {
    var point = new Point(event);
    
		if ((att.mk != "") && (att.mk != "0/0")) {
			att.mk += ";";
		} else {
			att.mk = "";
		}
		att.mk += point.relX + "/" + point.relY;

		document.getElementById("lay1").removeEventListener("mousedown", markEvent, true);		
		setMarks();
	}

	document.getElementById("lay1").addEventListener("mousedown", markEvent, true);		
}


function zoomArea() {
	var state = 0;
	var pt1, pt2;

	function click(event) {

		if (state == 0) {
			state = 1;
			
			pt1 = new Point(event);
			pt2 = pt1;
			
			document.getElementById("eck1").style.left = pt1.pageX;
			document.getElementById("eck1").style.top = pt1.pageY;
			document.getElementById("eck2").style.left = pt2.pageX-12;
			document.getElementById("eck2").style.top = pt1.pageY;
			document.getElementById("eck3").style.left = pt1.pageX;
			document.getElementById("eck3").style.top = pt2.pageY-12;
			document.getElementById("eck4").style.left = pt2.pageX-12;
			document.getElementById("eck4").style.top = pt2.pageY-12;

			document.getElementById("eck1").style.visibility="visible";
			document.getElementById("eck2").style.visibility="visible";
			document.getElementById("eck3").style.visibility="visible";
			document.getElementById("eck4").style.visibility="visible";
			
			document.getElementById("lay1").addEventListener("mousemove", move, true);		
			document.getElementById("eck4").addEventListener("mousemove", move, true);		

		} else {

			pt2 = new Point(event);
			
			document.getElementById("lay1").removeEventListener("mousedown", click, true);		
			document.getElementById("eck4").removeEventListener("mousedown", click, true);		
			
			document.getElementById("lay1").removeEventListener("mousemove", move, true);		
			document.getElementById("eck4").removeEventListener("mousemove", move, true);		

			document.getElementById("eck1").style.visibility="hidden";
			document.getElementById("eck2").style.visibility="hidden";
			document.getElementById("eck3").style.visibility="hidden";
			document.getElementById("eck4").style.visibility="hidden";

			att.wx = parseFloat(Math.min(pt1.relX, pt2.relX));
			att.wy = parseFloat(Math.min(pt1.relY, pt2.relY));

			att.ww = parseFloat(Math.abs(pt1.relX-pt2.relX));
			att.wh = parseFloat(Math.abs(pt1.relY-pt2.relY));

			if (att.ww != 0 && att.wh != 0) {
				loadPicture(2);
			}
		}
	}

	function move(event) {

		pt2 = new Point(event);

		document.getElementById("eck1").style.left = ((pt1.pageX < pt2.pageX) ? pt1.pageX : pt2.pageX);
		document.getElementById("eck1").style.top = ((pt1.pageY < pt2.pageY) ? pt1.pageY : pt2.pageY);
		document.getElementById("eck2").style.left = ((pt1.pageX < pt2.pageX) ? pt2.pageX : pt1.pageX)-12;
		document.getElementById("eck2").style.top = ((pt1.pageY < pt2.pageY) ? pt1.pageY : pt2.pageY);
		document.getElementById("eck3").style.left = ((pt1.pageX < pt2.pageX) ? pt1.pageX : pt2.pageX);
		document.getElementById("eck3").style.top = ((pt1.pageY < pt2.pageY) ? pt2.pageY : pt1.pageY)-12;
		document.getElementById("eck4").style.left = ((pt1.pageX < pt2.pageX) ? pt2.pageX : pt1.pageX)-12;
		document.getElementById("eck4").style.top = ((pt1.pageY < pt2.pageY) ? pt2.pageY : pt1.pageY)-12;
	}

	document.getElementById("lay1").addEventListener("mousedown", click, true);		
	document.getElementById("eck4").addEventListener("mousedown", click, true);		
}


function zoomPoint() {

	function zoomPointEvent(event) {
	    var point = new Point(event);

		att.wx = cropFloat(point.relX-0.5*att.ww*0.7);
		att.wy = cropFloat(point.relY-0.5*att.wh*0.7);

		att.ww = cropFloat(att.ww*0.7);
		att.wh = cropFloat(att.wh*0.7);

		if (att.wx < 0) {
			att.wx = 0;
		}
		if (att.wy < 0) {
			att.wy = 0;
		}
		if (att.wx+att.ww > 1) {
			att.wx = 1-att.ww;
		}
		if (att.wy+att.wh > 1) {
			att.wy = 1-att.wh;
		}

		document.getElementById("lay1").removeEventListener("mousedown", zoomPointEvent, true);
		
		loadPicture(2);
	}

	document.getElementById("lay1").addEventListener("mousedown", zoomPointEvent, true);
}


function zoomOut() {

	loadPicture(1);
}


function moveTo() {

	function moveToEvent(event) {

	    var point = new Point(event);

		att.wx = cropFloat(point.relX-0.5*att.ww);
		att.wy = cropFloat(point.relY-0.5*att.wh);

		if (att.wx < 0) {
			att.wx = 0;
		}
		if (att.wy < 0) {
			att.wy = 0;
		}
		if (att.wx+att.ww > 1) {
			att.wx = 1-att.ww;
		}
		if (att.wy+att.wh > 1) {
			att.wy = 1-att.wh;
		}

		document.getElementById("lay1").removeEventListener("mousedown", moveToEvent, true);		
		
		loadPicture(2);
	}

	document.getElementById("lay1").addEventListener("mousedown", moveToEvent, true);
}


function scale(scaledef) {

	att.ws = scaledef;
	loadPicture(2);
}


function setMarks() {

	if (att.mk != "" && att.mk != "0/0") {
		var mark = att.mk.split(";");

		var countMarks = mark.length;
		
		// maximum of marks is 8
		// we do not report this error because this is already done in func. "Mark"
		if (countMarks > 8) countMarks = 8;

		var picWidth = document.pic.offsetWidth;
		var picHeight = document.pic.offsetHeight;

		// catch the cases where the picture had not been loaded already and
		// make a timeout so that the coordinates are calculated with the real dimensions
		if (document.pic.complete) {
			var xoffset = parseInt(document.getElementById("lay1").style.left);
			var yoffset = parseInt(document.getElementById("lay1").style.top);

			for (var i = 0; i < countMarks; i++) {
				mark[i] = mark[i].split("/");

				if ((mark[i][0] >= att.wx) && (mark[i][1] >= att.wy) && (mark[i][0] <= (att.wx+att.ww)) && (mark[i][1] <= (att.wy+att.wh))) {

					mark[i][0] = parseInt(xoffset+picWidth*(mark[i][0]-att.wx)/att.ww);
					mark[i][1] = parseInt(yoffset+picHeight*(mark[i][1]-att.wy)/att.wh);


					document.getElementById("dot" + i).style.left = mark[i][0]-5;
					document.getElementById("dot" + i).style.top = mark[i][1]-5;
					document.getElementById("dot" + i).style.visibility = "visible";
				}
			}
		} else {
			setTimeout("setMarks()", 100);
		}
	}
}

// capturing keypresses for next and previous page
// ascii-values of n = 110, b = 98
function parseKeypress (event) {
	if (event.charCode == 110) {
		nextPage();
	}
	if (event.charCode == 98) {
		backPage();
	}
}


// auxiliary function to crop senseless precicsion
function cropFloat(tmp) {
	return parseInt(10000*tmp)/10000;
}
