// this global variable has to be initialised before the frist use of the functions below
// to fill in the attributes you can use the function init provided below
// - array with all attributes
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

	this.document.onkeypress = parseKeypress;
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
	newQuery += "&dw=" + (document.body.clientWidth-30) + "&dh=" + (document.body.clientHeight-30);

	// debug window - checking the parameters passed to the next image
	//alert ("DEBUG MESSAGE (query-string in loadPicture):\n\n" + newQuery);

	location.href = location.pathname + "?" + newQuery;
}


// constructor holding different values of a point
function Point(event) {

	this.pageX = parseInt(document.body.scrollLeft+event.x);
	this.pageY = parseInt(document.body.scrollTop+event.y);
	
	this.x = this.pageX-parseInt(document.all.lay1.style.left);
	this.y = this.pageY-parseInt(document.all.lay1.style.top);
	
	this.relX = cropFloat(att[5]+(att[7]*this.x/document.all.lay1.offsetWidth));
	this.relY = cropFloat(att[6]+(att[8]*this.y/document.all.lay1.offsetHeight));

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
	var url = "digicat.html?" + att[0] + "+" + att[1];
	win = window.open(url, "digicat");
	win.focus();
}


function ref(refselect) {

	var hyperlinkRef = baseUrl + "/digilib.jsp?";
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

    document.all.lay1.onmousedown = function() {
		var point = new Point(event);

		if (att[4].split(";").length > 7) {
			alert("Only 8 marks are possible at the moment!");
			return;
		}

        if ((att[4] != "") && (att[4] != "0/0")) {
            att[4] += ";";
        } else {
            att[4] = "";
        }

        att[4] += point.relX + "/" + point.relY;

        document.all.lay1.onmousedown = function() {}
        
        setMarks();
    }
}


function zoomArea() {
    var state = 0;
    var pt1, pt2;
        
    function click() {
        if (state == 0) {
            state = 1;
            
			pt1 = new Point(event);
			pt2 = pt1;

			document.all.eck1.style.left = pt1.pageX;
			document.all.eck1.style.top = pt1.pageY;
			document.all.eck2.style.left = pt2.pageX-12;
			document.all.eck2.style.top = pt1.pageY;
			document.all.eck3.style.left = pt1.pageX;
			document.all.eck3.style.top = pt2.pageY-12;
			document.all.eck4.style.left = pt2.pageX-12;
			document.all.eck4.style.top = pt2.pageY-12;

			document.all.eck1.style.visibility="visible";
			document.all.eck2.style.visibility="visible";
			document.all.eck3.style.visibility="visible";
			document.all.eck4.style.visibility="visible";
            
            document.all.lay1.onmousemove = move;
            document.all.eck4.onmousemove = move;
            
        } else {
			pt2 = new Point(event);

            document.all.eck1.visibility="hidden";
            document.all.eck2.visibility="hidden";
            document.all.eck3.visibility="hidden";
            document.all.eck4.visibility="hidden";

			document.all.lay1.cancleBubble = true;
			document.all.eck4.cancleBubble = true;

            att[5] = Math.min(pt1.relX, pt2.relX);
            att[6] = Math.min(pt1.relY, pt2.relY);

            att[7] = Math.abs(pt1.relX-pt2.relX);
            att[8] = Math.abs(pt1.relY-pt2.relY);
                        
            if (att[7] != 0 && att[8] != 0) {
              loadPicture(2);
            }
        }
    }

    function move() {
		pt2 = new Point(event);

		document.all.eck1.style.left = ((pt1.pageX < pt2.pageX) ? pt1.pageX : pt2.pageX);
		document.all.eck1.style.top = ((pt1.pageY < pt2.pageY) ? pt1.pageY : pt2.pageY);
		document.all.eck2.style.left = ((pt1.pageX < pt2.pageX) ? pt2.pageX : pt1.pageX)-12;
		document.all.eck2.style.top = ((pt1.pageY < pt2.pageY) ? pt1.pageY : pt2.pageY);
		document.all.eck3.style.left = ((pt1.pageX < pt2.pageX) ? pt1.pageX : pt2.pageX);
		document.all.eck3.style.top = ((pt1.pageY < pt2.pageY) ? pt2.pageY : pt1.pageY)-12;
		document.all.eck4.style.left = ((pt1.pageX < pt2.pageX) ? pt2.pageX : pt1.pageX)-12;
		document.all.eck4.style.top = ((pt1.pageY < pt2.pageY) ? pt2.pageY : pt1.pageY)-12;
    }

    document.all.lay1.onmousedown = click;
    document.all.eck4.onmousedown = click;
}


function zoomPoint() {

    document.all.lay1.onmousedown = function() {
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

	    document.all.lay1.cancleBubble = true;

		loadPicture(2);
	}
}


function zoomOut() {
    loadPicture(1);
}


function moveTo() {

    document.all.lay1.onmousedown = function() {
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

	    document.all.lay1.cancleBubble = true;

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

		var picWidth  = document.all.lay1.offsetWidth;
		var picHeight = document.all.lay1.offsetHeight;

		// catch the cases where the picture had not been loaded already and
		// make a timeout so that the coordinates are calculated with the real dimensions
		if (picWidth > 30) {

			var xoffset = parseInt(document.all.lay1.style.left);
			var yoffset = parseInt(document.all.lay1.style.top);

			for (var i = 0; i < countMarks; i++) {
				mark[i] = mark[i].split("/");

				if ((mark[i][0] > att[5]) && (mark[i][1] > att[6]) && (mark[i][0] < (att[5]+att[7])) && (mark[i][1] < (att[6]+att[8]))) {

					mark[i][0] = parseInt(xoffset+picWidth*(mark[i][0]-att[5])/att[7]);
					mark[i][1] = parseInt(yoffset+picHeight*(mark[i][1]-att[6])/att[8]);

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
function parseKeypress() {
	e = event;

	if (e.keyCode == 110) {
		Nextpage();
	}
	if (e.keyCode == 98) {
		Backpage();
	}
	document.cancleBubble = true;
}


// auxiliary function to crop senseless precicsion
function cropFloat(tmp) {
	return parseInt(10000*tmp)/10000;
}
