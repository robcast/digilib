/* navigation_ie -- JS library for digilib (IE version)

  Digital Image Library servlet components

  Copyright (C) 2001, 2002 Christian Luginbuehl (luginbuehl@student.unibe.ch)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*/

// these two global variables have to be initialised before the frist use of the functions below
// to fill in the attributes you can use the function initPicture provided below
// - array with all attributes
var att = new Array();

// - variable to store the path to the frame, in which the pictures should be created
var whichFrame = parent.mainFrame;

// give a name to the window containing digilib - this way one can test if there is already a
// digilib-window open and replace the contents of it (ex. digicat)
window.name = "digilib";

// function that launches the ScaleServlet
// the different detailGrades:
// 		0 -> back, next, page
//		1 -> zoomout
//		2 -> zoomarea, zoompoint, moveto, scaledef

function loadPicture(detailGrade, keepArea) {

//	alert("wx: " + att[5] + "\tww: " + att[7] + "\nwy: " + att[6] + "\twh: " + att[8]);

	// sorry about that, but IE needs to have a document body to calc the frames width and height
	whichFrame.document.open();
	whichFrame.document.write('<html><head></head><body bgcolor="#666666" topmargin="10" leftmargin="10" marginwidth="10" magrinheight="10">');

	var newPicture  = "http://" + location.host + "/docuserver/digitallibrary/servlet/Scaler/"
	newPicture += att[0] + "?" + "pn=" + att[1] + "&ws=" + att[2];
	newPicture += "&dw=" + (whichFrame.document.body.clientWidth-30) + "&dh=" + (whichFrame.document.body.clientHeight-30);
	newPicture += "&mo=" + att[3];

	if (detailGrade == 0) {
		att[4] = "0/0";
	}

	if ((detailGrade == 1) || (detailGrade == 0 && !keepArea)) {
		att[5] = 0;
		att[6] = 0;
		att[7] = 1;
		att[8] = 1;
	}
	newPicture += "&wx=" + att[5] + "&wy=" + att[6] + "&ww=" + att[7] + "&wh=" + att[8];

	whichFrame.document.write('<div ID="lay1" style="position:absolute; left:10;  top:10;  visibility:visible"><img name="pic" src="' + newPicture + '"></div>');
	whichFrame.document.write('<div ID="dot0" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/mark1.gif"></div>');
	whichFrame.document.write('<div ID="dot1" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/mark2.gif"></div>');
	whichFrame.document.write('<div ID="dot2" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/mark3.gif"></div>');
	whichFrame.document.write('<div ID="dot3" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/mark4.gif"></div>');
	whichFrame.document.write('<div ID="dot4" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/mark5.gif"></div>');
	whichFrame.document.write('<div ID="dot5" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/mark6.gif"></div>');
	whichFrame.document.write('<div ID="dot6" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/mark7.gif"></div>');
	whichFrame.document.write('<div ID="dot7" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/mark8.gif"></div>');
	whichFrame.document.write('<div ID="eck1" style="position:absolute; left:-20; top:120; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/olinks.gif"></div>');
	whichFrame.document.write('<div ID="eck2" style="position:absolute; left:-20; top:140; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/orechts.gif"></div>');
	whichFrame.document.write('<div ID="eck3" style="position:absolute; left:-20; top:160; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/ulinks.gif"></div>');
	whichFrame.document.write('<div ID="eck4" style="position:absolute; left:-20; top:180; visibility:hidden"><img src="http://' + location.host + '/docuserver/digitallibrary/urechts.gif"></div>');

	whichFrame.document.write('</body></html>');
	
	whichFrame.document.close();

	initScripts();
	
	pageInfo();

	setmark();
}


function Backpage(keepArea) {

    att[1] = parseInt(att[1]) - 1;

    if (att[1] > 0) {
        loadPicture(0, keepArea);
    } else {
	    att[1] = parseInt(att[1]) + 1;
        alert("You are already on the first page!");
    }
}


function Nextpage(keepArea) {

    att[1] = parseInt(att[1]) + 1;

    if (att[1] <= parent.numPages) {
        loadPicture(0, keepArea);
    } else {
	    att[1] = parseInt(att[1]) - 1;
        alert("You are already on the last page!");
    }
}


function Page(keepArea) {

	do {
    	page = prompt("Goto Page (1 - " + parent.numPages + "):", 1);
	} while ((page != null) && ((page < 1) || (page > parent.numPages)));

   	if (page != null && page != att[1]) {
		att[1] = page;
		loadPicture(0, keepArea);
	}
}


function Digicat() {
	var url = "http://" + location.host + "/docuserver/digitallibrary/digicat.html?" + att[0] + "+" + att[1];
	win = window.open(url, "digicat");
	win.focus();
}


function Ref(refselect) {

	var hyperlinkRef = "http://" + location.host + "/docuserver/digitallibrary/digilib.jsp?";
	hyperlinkRef += att[0] + "+" + att[1] + "+" + att[2] + "+" + att[3] + "+" + att[4];
	
	if ((att[5] != 0) || (att[6] != 0) || (att[7] != 1) || (att[8] != 1)) {
		hyperlinkRef += "+" + att[5] + "+" + att[6] + "+" + att[7] + "+" + att[8];
	}

    if (refselect == 1) {
        prompt("Link for HTML--documents", hyperlinkRef);
    } else {
        prompt("Link for LaTeX--documents", "\\href{" + hyperlinkRef + "}{TEXT}");
    }
}


function Mark(refselect) {

	if (att[4].split(";").length > 7) {
		alert("Only 8 marks are possible at the moment!");
		return;
	}

    whichFrame.document.all.lay1.onmousedown = function() {
		e = whichFrame.event;

        if ((att[4] != "") && (att[4] != "0/0")) {
            att[4] += ";";
        } else {
            att[4] = "";
        }

		markX = cropFloat(att[5]+att[7]*(whichFrame.document.body.scrollLeft+e.x-parseInt(whichFrame.document.all.lay1.style.left))/whichFrame.document.all.lay1.offsetWidth);
		markY = cropFloat(att[6]+att[8]*(whichFrame.document.body.scrollTop+e.y-parseInt(whichFrame.document.all.lay1.style.top))/whichFrame.document.all.lay1.offsetHeight);

        att[4] += markX + "/" + markY;

        whichFrame.document.all.lay1.cancleBubble = true;
        
        setmark();
    }
}


function Zoomrect() {
    var state = 0;
    var x1, y1, x2, y2;
        
    function Click() {
		e = whichFrame.event;

        if (state == 0) {
            state = 1;
            
            x1 = whichFrame.document.body.scrollLeft+e.x;
            y1 = whichFrame.document.body.scrollTop+e.y;           
            x2 = x1;
            y2 = y1;

			whichFrame.document.all.eck1.style.left = x1;
			whichFrame.document.all.eck1.style.top = y1;
			whichFrame.document.all.eck2.style.left = x2-12;
			whichFrame.document.all.eck2.style.top = y1;
			whichFrame.document.all.eck3.style.left = x1;
			whichFrame.document.all.eck3.style.top = y2-12;
			whichFrame.document.all.eck4.style.left = x2-12;
			whichFrame.document.all.eck4.style.top = y2-12;

			whichFrame.document.all.eck1.style.visibility="visible";
			whichFrame.document.all.eck2.style.visibility="visible";
			whichFrame.document.all.eck3.style.visibility="visible";
			whichFrame.document.all.eck4.style.visibility="visible";
            
            whichFrame.document.all.lay1.onmousemove = Move;
            whichFrame.document.all.eck4.onmousemove = Move;
            
        } else {

			x1 -= parseInt(whichFrame.document.all.lay1.style.left);
			y1 -= parseInt(whichFrame.document.all.lay1.style.top);			

            x2 = whichFrame.document.body.scrollLeft+e.x-parseInt(whichFrame.document.all.lay1.style.left);
            y2 = whichFrame.document.body.scrollTop+e.y-parseInt(whichFrame.document.all.lay1.style.left);         

            whichFrame.document.all.eck1.visibility="hidden";
            whichFrame.document.all.eck2.visibility="hidden";
            whichFrame.document.all.eck3.visibility="hidden";
            whichFrame.document.all.eck4.visibility="hidden";

			whichFrame.document.all.lay1.cancleBubble = true;
			whichFrame.document.all.eck4.cancleBubble = true;

            att[5] = cropFloat(att[5]+att[7]*((x1 < x2) ? x1 : x2)/whichFrame.document.all.lay1.offsetWidth);
            att[6] = cropFloat(att[6]+att[8]*((y1 < y2) ? y1 : y2)/whichFrame.document.all.lay1.offsetHeight);

            att[7] = cropFloat(att[7]*Math.abs(x1-x2)/whichFrame.document.all.lay1.offsetWidth);
            att[8] = cropFloat(att[8]*Math.abs(y1-y2)/whichFrame.document.all.lay1.offsetHeight);
                        
            if (att[7] != 0 && att[8] != 0) {
              loadPicture(2);
            }
        }
    }

    function Move() {
		e = whichFrame.event;

        x2 = whichFrame.document.body.scrollLeft+e.x;
        y2 = whichFrame.document.body.scrollTop+e.y;           

		whichFrame.document.all.eck1.style.left = ((x1 < x2) ? x1 : x2);
		whichFrame.document.all.eck1.style.top = ((y1 < y2) ? y1 : y2);
		whichFrame.document.all.eck2.style.left = ((x1 < x2) ? x2 : x1)-12;
		whichFrame.document.all.eck2.style.top = ((y1 < y2) ? y1 : y2);
		whichFrame.document.all.eck3.style.left = ((x1 < x2) ? x1 : x2);
		whichFrame.document.all.eck3.style.top = ((y1 < y2) ? y2 : y1)-12;
		whichFrame.document.all.eck4.style.left = ((x1 < x2) ? x2 : x1)-12;
		whichFrame.document.all.eck4.style.top = ((y1 < y2) ? y2 : y1)-12;
    }

    whichFrame.document.all.lay1.onmousedown = Click;
    whichFrame.document.all.eck4.onmousedown = Click;
}


function Zoomin() {

    whichFrame.document.all.lay1.onmousedown = function() {
		e = whichFrame.event;

		att[5] = cropFloat(att[5]+att[7]*(whichFrame.document.body.scrollLeft+e.x-parseInt(whichFrame.document.all.lay1.style.left))/whichFrame.document.all.lay1.offsetWidth-0.5*att[7]*0.7);
		att[6] = cropFloat(att[6]+att[8]*(whichFrame.document.body.scrollTop+e.y-parseInt(whichFrame.document.all.lay1.style.top))/whichFrame.document.all.lay1.offsetHeight-0.5*att[8]*0.7);

		att[7] = cropFloat(att[7]*0.7);
		att[8] = cropFloat(att[8]*0.7);

		if (att[5] < 0) {
			att[5] = 0;
		}
		if (att[6] < 0) {
			att[6] = 0;
		}
		if (att[5]+att[7] > 1) {
			att[5] = 1-att[7];
		}
		if (att[6]+att[8] > 1) {
			att[6] = 1-att[8];
		}

	    whichFrame.document.all.lay1.cancleBubble = true;

		loadPicture(2);
	}
}


function Zoomout() {
    loadPicture(1);
}


function Moveto() {

    whichFrame.document.all.lay1.onmousedown = function() {
		e = whichFrame.event;

		att[5] = cropFloat(att[5]+att[7]*(whichFrame.document.body.scrollLeft+e.x-parseInt(whichFrame.document.all.lay1.style.left))/whichFrame.document.all.lay1.offsetWidth-0.5*att[7]);
		att[6] = cropFloat(att[6]+att[8]*(whichFrame.document.body.scrollTop+e.y-parseInt(whichFrame.document.all.lay1.style.top))/whichFrame.document.all.lay1.offsetHeight-0.5*att[8]);

		if (att[5] < 0) {
			att[5] = 0;
		}
		if (att[6] < 0) {
			att[6] = 0;
		}
		if (att[5]+att[7] > 1) {
			att[5] = 1-att[7];
		}
		if (att[6]+att[8] > 1) {
			att[6] = 1-att[8];
		}

	    whichFrame.document.all.lay1.cancleBubble = true;

        loadPicture(2);
	}
}


function Scaledef(scaledef) {

    att[2] = scaledef;
    loadPicture(2);
}


function setmark() {
	if ((att[4] != "") && (att[4] != "0/0")) {
		var mark = att[4].split(";");

		var countMarks = mark.length;
		
		// maximum of marks is 8
		// we do not report this error because this is already done in func. "Mark"
		if (countMarks > 8) countMarks = 8;

		var picWidth  = whichFrame.document.all.lay1.offsetWidth;
		var picHeight = whichFrame.document.all.lay1.offsetHeight;

		// catch the cases where the picture had not been loaded already and
		// make a timeout so that the coordinates are calculated with the real dimensions
		if (picWidth > 30) {

			var xoffset = parseInt(whichFrame.document.all.lay1.style.left);
			var yoffset = parseInt(whichFrame.document.all.lay1.style.top);

			for (var i = 0; i < countMarks; i++) {
				mark[i] = mark[i].split("/");

				if ((mark[i][0] > att[5]) && (mark[i][1] > att[6]) && (mark[i][0] < (att[5]+att[7])) && (mark[i][1] < (att[6]+att[8]))) {

					mark[i][0] = parseInt(xoffset+picWidth*(mark[i][0]-att[5])/att[7]);
					mark[i][1] = parseInt(yoffset+picHeight*(mark[i][1]-att[6])/att[8]);

					whichFrame.document.getElementById("dot" + i).style.left = mark[i][0]-5;
					whichFrame.document.getElementById("dot" + i).style.top = mark[i][1]-5;
					whichFrame.document.getElementById("dot" + i).style.visibility = "visible";
				}
			}
		} else {
			setTimeout("setmark()", 100);
		}
	}
}


// capturing keypresses for next and previous page
function parseKeypress() {
	e = whichFrame.event;

	if (e.keyCode == 110) {
		Nextpage();
	}
	if (e.keyCode == 98) {
		Backpage();
	}
	whichFrame.document.cancleBubble = true;
}


// auxiliary function to crop senseless precicsion
function cropFloat(tmp) {
	return parseInt(10000*tmp)/10000;
}


// initialize browser specific things (keypress caputring)
function initScripts() {
	whichFrame.document.onkeypress = parseKeypress;
	whichFrame.focus();
}


// fill in the values of the "att"-array
function initPicture(picURL) {
	att = picURL.split("+");

	if (att[0].lastIndexOf("/") == att[0].length-1) {
		att[0] = att[0].substring(0, att[0].length-1);
	}
	
	if (att.length < 2 || att[1] == "") {
		att[1] = 1;
	}
	if (att.length < 3 || att[2] == "") {
		att[2] = "1.0";
	}

	if (att.length < 4) {
		att[3] = "";
	}

	if (att[3].indexOf("f") > -1) {
		att[3] = "fit";
	}

	if (att.length < 5 || att[4] == "") {
		att[4] = "0/0";
	}

	// converts the old mark format (0-1000) to new format(0.0 - 1.0)
	if (att[4] != "0/0") {
		var tmp = att[4].split(";");
		
		att[4] = "";
		
		for (i = 0; i < tmp.length; i++) {
			tmp[i] = tmp[i].split("/");

			if (tmp[i][0] > 1 && tmp[i][1] > 1) {
				tmp[i][0] /= 1000;
				tmp[i][1] /= 1000;
			}
			
			att[4] += tmp[i][0] + "/" + tmp[i][1] + ";";
		}
		att[4] = att[4].slice(0, -1);
	}
	
	if (att.length < 7) {
		att[5] = 0;
		att[6] = 0;
		att[7] = 1;
		att[8] = 1;
	} else {
		att[5] = parseFloat(att[5]);
		att[6] = parseFloat(att[6]);
		att[7] = parseFloat(att[7]);
		att[8] = parseFloat(att[8]);
	}
}


function pageInfo() {
	
	// bug in netscape 4.xx (confunding px and pt)
	var fontsize = document.layers ? "11pt" : "11px";

	if (window.pageFrame) {
		pageFrame.document.open();
		pageFrame.document.write('<html><head></head><body bgcolor="#CCCCCC" topmargin="5" marginheight="5">');
		pageFrame.document.write('<p style="font-family: Verdana, Arial, Helvetica, sans-serif; text-align: center; color: #CC3333; font-size: ' + fontsize + '">');
		pageFrame.document.write(att[1] + '<b> of </b>' + numPages + '</p></body></html>');
		pageFrame.document.close();
	}
}
