// this global variable has to be initialised before the frist use of the functions below
// to fill in the attributes you can use the function init provided below
// array with all attributes
var att = new Array();

// fill in the values of the "att"-array
function init(fn, pn, ws, mo, mk, wx, wy, ww, wh) {

	// debug window to check the parameters passed
	//alert ("DEBUG message (parameters in init):\n\npu = " + pu + "\npn = " + pn + "\nws = " + ws + "\nmo = " + mo + "\nmk = " + mk + "\nwx = " + wx + "\nwy = " + wy + "\nww = " + ww + "\nwh = " + wh);

	// attaching the values to the att-array
	att[0] = fn;
	att[1] = parseInt(pn);
	att[2] = parseFloat(ws);
	att[3] = mo;
	att[4] = mk;
	att[5] = parseFloat(wx);
	att[6] = parseFloat(wy);
	att[7] = parseFloat(ww);
	att[8] = parseFloat(wh);
	
	// compatablility issue
	if (att[3].indexOf("f") > -1) {
		att[3] = "fit";
	}

	// converts the old mark format (0-1000) to new format(0.0 - 1.0)
	// could even be useless now
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

	// initialisation stuff
	// ====================
	
	setMarks();

	window.captureEvents(Event.KEYDOWN);
	window.onkeydown = parseKeypress;

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

	var newQuery = "fn=" + att[0] + "&pn=" + att[1] + "&ws=" + att[2] + "&mo=" + att[3];

	if (detailGrade == 0) {
		att[4] = "0/0";
	}

	if ((detailGrade == 1) || (detailGrade == 0 && !keepArea)) {
		att[5] = 0;
		att[6] = 0;
		att[7] = 1;
		att[8] = 1;
	}

	newQuery += "&mk=" + att[4] + "&wx=" + att[5] + "&wy=" + att[6] + "&ww=" + att[7] + "&wh=" + att[8];
	newQuery += "&dw=" + (innerWidth-30) + "&dh=" + (innerHeight-30);

	// debug window - checking the parameters passed to the next image
	//alert ("DEBUG MESSAGE (query-string in loadPicture):\n\n" + newQuery);

	location.href = location.pathname + "?" + newQuery;
}


// constructor holding different values of a point
function Point(event) {

	this.pageX = parseInt(event.pageX);
	this.pageY = parseInt(event.pageY);
	
	this.x = this.pageX-document.lay1.left;
	this.y = this.pageY-document.lay1.top;
	
	this.relX = cropFloat(att[5]+(att[7]*this.x/document.lay1.clip.width));
	this.relY = cropFloat(att[6]+(att[8]*this.y/document.lay1.clip.height));

	return this;
}


function backPage(keepArea) {

    att[1] = parseInt(att[1]) - 1;

    if (att[1] > 0) {
        loadPicture(0, keepArea);
    } else {
	    att[1] = parseInt(att[1]) + 1;
        alert("You are already on the first page!");
    }
}


function nextPage(keepArea) {

    att[1] = parseInt(att[1]) + 1;

	loadPicture(0, keepArea);
}


function page(keepArea) {

	do {
    	page = prompt("Goto Page:", 1);
	} while ((page != null) && (page < 1));

   	if (page != null && page != att[1]) {
		att[1] = page;
		loadPicture(0, keepArea);
	}
}


function digicat() {
	var url = "http://" + location.host + "/docuserver/digitallibrary/digicat.html?" + att[0] + "+" + att[1];
	win = window.open(url, "digicat");
	win.focus();
}


function ref(refselect) {

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


function mark(refselect) {

    document.lay1.captureEvents(Event.MOUSEDOWN);
    document.lay1.onmousedown = function(event) {
	    var point = new Point(event);

        if ((att[4] != "") && (att[4] != "0/0")) {
            att[4] += ";";
        } else {
            att[4] = "";
        }

        att[4] += point.relX + "/" + point.relY;

        document.lay1.releaseEvents(Event.MOUSEDOWN);
        setMarks();
	}
}


function zoomArea() {
    var state = 0;
    var pt1, pt2;
        
    function click(event) {

        if (state == 0) {
            state = 1;
            
			pt1 = new Point(event);
			pt2 = pt1;

            document.eck1.moveTo(pt1.pageX, pt1.pageY);
            document.eck2.moveTo(pt2.pageX-12, pt1.pageY);
            document.eck3.moveTo(pt1.pageX, pt2.pageY-12);
            document.eck4.moveTo(pt2.pageX-12, pt2.pageY-12);

            document.eck1.visibility="show";
            document.eck2.visibility="show";
            document.eck3.visibility="show";
            document.eck4.visibility="show";
            
            document.lay1.captureEvents(Event.MOUSEMOVE);
            document.eck4.captureEvents(Event.MOUSEMOVE);

            document.lay1.onmousemove = move;
            document.eck4.onmousemove = move;
            
        } else {

			pt2 = new Point(event);

            document.lay1.releaseEvents(Event.MOUSEDOWN | Event.MOUSEMOVE);
            document.eck4.releaseEvents(Event.MOUSEDOWN | Event.MOUSEMOVE);

            document.eck1.visibility="hide";
            document.eck2.visibility="hide";
            document.eck3.visibility="hide";
            document.eck4.visibility="hide";

			att[5] = Math.min(pt1.relX, pt2.relX);
			att[6] = Math.min(pt1.relY, pt2.relY);

            att[7] = Math.abs(pt1.relX-pt2.relX);
            att[8] = Math.abs(pt1.relY-pt2.relY);
                        
            if (att[7] != 0 && att[8] != 0) {
              loadPicture(2);
            }
        }
    }

    function move(event) {

		pt2 = new Point(event);           

            document.eck1.moveTo(((pt1.pageX < pt2.pageX) ? pt1.pageX : pt2.pageX), ((pt1.pageY < pt2.pageY) ? pt1.pageY : pt2.pageY));
            document.eck2.moveTo(((pt1.pageX < pt2.pageX) ? pt2.pageX : pt1.pageX)-12, ((pt1.pageY < pt2.pageY) ? pt1.pageY : pt2.pageY));
            document.eck3.moveTo(((pt1.pageX < pt2.pageX) ? pt1.pageX : pt2.pageX), ((pt1.pageY < pt2.pageY) ? pt2.pageY : pt1.pageY)-12);
            document.eck4.moveTo(((pt1.pageX < pt2.pageX) ? pt2.pageX : pt1.pageX)-12, ((pt1.pageY < pt2.pageY) ? pt2.pageY : pt1.pageY)-12);
    }

    document.lay1.captureEvents(Event.MOUSEDOWN);
    document.eck4.captureEvents(Event.MOUSEDOWN);

    document.lay1.onmousedown = click;
    document.eck4.onmousedown = click;
}


function zoomPoint() {

    document.lay1.captureEvents(Event.MOUSEDOWN);
    document.lay1.onmousedown = function(event) {
		var point = new Point(event);
		
		att[5] = cropFloat(point.relX-0.5*att[7]*0.7);
		att[6] = cropFloat(point.relY-0.5*att[8]*0.7);

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

        releaseEvents(Event.MOUSEDOWN);

        loadPicture(2);
    }
}


function zoomOut() {
    loadPicture(1);
}


function moveTo() {

    document.lay1.captureEvents(Event.MOUSEDOWN);
    document.lay1.onmousedown = function(event) {
		var point = new Point(event);

		att[5] = cropFloat(point.relX-0.5*att[7]);
		att[6] = cropFloat(point.relY-0.5*att[8]);

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

        releaseEvents(Event.MOUSEDOWN);

        loadPicture(2);
	}
}


function scale(scaledef) {

    att[2] = scaledef;
    loadPicture(2);
}


function setMarks() {
	if ((att[4] != "") && (att[4] != "0/0")) {
		var mark = att[4].split(";");

		var countMarks = mark.length;
		
		// maximum of marks is 8
		// we do not report this error because this is already done in func. "Mark"
		if (countMarks > 8) countMarks = 8;

		var picWidth  = document.lay1.clip.width;
		var picHeight = document.lay1.clip.height;

		for (var i = 0; i < countMarks; i++) {
			mark[i] = mark[i].split("/");

			if ((mark[i][0] > att[5]) && (mark[i][1] > att[6]) && (mark[i][0] < (att[5]+att[7])) && (mark[i][1] < (att[6]+att[8]))) {

				mark[i][0] = parseInt(document.lay1.x + (picWidth*(mark[i][0]-att[5]))/att[7]);
				mark[i][1] = parseInt(document.lay1.y + (picHeight*(mark[i][1]-att[6]))/att[8]);

				document.layers[i+1].moveTo(mark[i][0]-5, mark[i][1]-5);
				document.layers[i+1].visibility = "show";
			}
		}
	}
}


// capturing keypresses for next and previous page
function parseKeypress(event) {
	var whichCode = (window.Event) ? event.which : event.keyCode;
	if (String.fromCharCode(whichCode) == "n") {
		nextPage();
	}
	if (String.fromCharCode(whichCode) == "b") {
		backPage();
	}
}


// auxiliary function to crop senseless precicsion
function cropFloat(tmp) {
	return parseInt(10000*tmp)/10000;
}
