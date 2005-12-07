/* Copyright (C) 2003,2004 IT-Group MPIWG, WTWG Uni Bern and others
 
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
 
Authors:
  Christian Luginbuehl, 01.05.2003 (first version)
  DW 24.03.2004 (Changed for digiLib in Zope)
  Robert Casties, 8.11.2005

  ! Requires baselib.js !

*/


function identify() {
        // used for identifying a digilib instance
        // Relato uses that function - lugi
        return "Digilib 0.6";
}


/*
 * more parameter handling
 */

function parseArea() {
    // returns area Rectangle from current parameters
    return new Rectangle(getParameter("wx"), getParameter("wy"), getParameter("ww"), getParameter("wh"));
}

function setParamFromArea(rect) {
    // sets digilib wx etc. from rect
    setParameter("wx", cropFloat(rect.x));
    setParameter("wy", cropFloat(rect.y));
    setParameter("ww", cropFloat(rect.width));
    setParameter("wh", cropFloat(rect.height));
    return true;
}

function parseTrafo(elem) {
    // returns Transform from current dlArea and picsize
    var picsize = getElementRect(elem);
    var trafo = new Transform();
    // subtract area offset and size
    trafo.concat(getTranslation(new Position(-dlArea.x, -dlArea.y)));
    trafo.concat(getScale(new Size(1/dlArea.width, 1/dlArea.height)));
    // scale to screen size
    trafo.concat(getScale(picsize));
    trafo.concat(getTranslation(picsize));
    // rotate
    //trafo.concat(getRotation(- getParameter("rot"), new Position(0.5*picsize.width, 0.5*picsize.height)));
    // mirror
    //if (hasFlag("hmir")) {
    //trafo.m00 = - trafo.m00;
    //}
    //if (hasFlag("vmir")) {
    //trafo.m11 = - trafo.m11;
    //}
    return trafo;
}


function parseMarks() {
    // returns marks array from current parameters
    var marks = new Array();
    var ma;
    var mk = getParameter("mk");
    if (mk.indexOf(";") >= 0) {
        // old format with ";"
        ma = mk.split(";");
    } else {
        ma = mk.split(",");
    }
    for (var i = 0; i < ma.length ; i++) {
        var pos = ma[i].split("/");
        if (pos.length > 1) {
            marks.push(new Position(pos[0], pos[1]));
        }
    }
    return marks;
}

function getAllMarks() {
    // returns a string with all marks in query format
    var marks = new Array();
    for (var i = 0; i < dlMarks.length; i++) {
        marks.push(cropFloat(dlMarks[i].x) + "/" + cropFloat(dlMarks[i].y));
    }
    return marks.join(",");
}

function addMark(pos) {
    // add a mark
    dlMarks.push(pos);
    setParameter("mk", getAllMarks());
    return true;
}

function deleteMark() {
    // delete the last mark
    dlMarks.pop();
    setParameter("mk", getAllMarks());
    return true;
}

function hasFlag(mode) {
    // returns if mode flag is set
    return (dlFlags[mode]);
}

function addFlag(mode) {
    // add a mode flag
    dlFlags[mode] = mode;
    setParameter("mo", getAllFlags());
    return true;
}

function removeFlag(mode) {
    // remove a mode flag
    if (dlFlags[mode]) {
        delete dlFlags[mode];
    }
    setParameter("mo", getAllFlags());
    return true;
}

function toggleFlag(mode) {
    // change a mode flag
    if (dlFlags[mode]) {
        delete dlFlags[mode];
    } else {
        dlFlags[mode] = mode;
    }
    setParameter("mo", getAllFlags());
    return true;
}

function getAllFlags() {
    // returns a string with all flags in query format
    var fa = new Array();
    for (var f in dlFlags) {
        if ((f != "")&&(dlFlags[f] != null)) {
            fa.push(f);
        }
    }
    return fa.join(",");
}

function parseFlags() {
    // sets dlFlags from the current parameters
    var flags = new Object();
    var fa = getParameter("mo").split(",");
    for (var i = 0; i < fa.length ; i++) {
        var f = fa[i];
        if (f != "") {
            flags[f] = f;
        }
    }
    return flags;
}    


function bestPicSize(elem, inset) {
    // returns a Size with the best image size for the given element
    if (! defined(inset)) {
        inset = 25;
    }
    var ws = getWinSize();
    var es = getElementPosition(elem);
    if (es) {
        ws.width = ws.width - es.x - inset;
        ws.height = ws.height - es.y - inset;
    }
    return ws;
}

function setDLParam(e, s, relative) {
	// sets parameter based on HTML event
	var nam;
    var val;
    if (s.type && (s.type == "select-one")) {
        nam = s.name;
        val = s.options[s.selectedIndex].value;
    } else if (s.name && s.value) {
        nam = s.name;
        val = s.value;
    }
    if (nam && val) {
        setParameter(nam, val, relative);
        display();
    } else {
        alert("ERROR: unable to process event!");
    }
    return true;
}


/* **********************************************
 *     digilib specific routines
 * ******************************************** */


function dl_param_init() {
    // parameter initialisation before onload
    if (!baseScriptVersion) {
        base_init();
    }
    dlScriptVersion = "1.2b";
    dlArea = new Rectangle(0.0, 0.0, 1.0, 1.0);
    dlMaxArea = new Rectangle(0.0, 0.0, 1.0, 1.0);
    dlTrafo = new Transform();
    dlMarks = new Array();
    dlFlags = new Object();
    elemScaler = null;
    picElem = null;
    ZOOMFACTOR = Math.sqrt(2);

    // put the query parameters (sans "?") in the parameters array
    parseParameters(location.search.slice(1));
    // treat special parameters
    dlMarks = parseMarks();
    dlArea = parseArea();
    dlFlags = parseFlags();
}


function dl_init() {
    // initalisation on load
    if (!dlScriptVersion) {
        dl_param_init();
    }
    elemScaler = getElement("scaler", true);
    picElem = getElement("pic", true);
    if (picElem == null && elemScaler) {
        // in N4 pic is in the scaler layer
        picElem = elemScaler.document.images[0];
    }
    if ((!elemScaler)||(!picElem)) {
        alert("Sorry, digilib doesn't work here!");
        return false;
    }
    // give a name to the window containing digilib
    if (defined(dlTarget)&&(dlTarget)) {
        window.name = dlTarget;
    } else {
        window.name = "digilib";
    }
    // put the query parameters (sans "?") in the parameters array
    parseParameters(location.search.slice(1));
    // treat special parameters
    dlMarks = parseMarks();
    dlArea = parseArea();
    dlFlags = parseFlags();
    // wait for image to load and display marks
    renderMarks();
    // done
    focus();
    return;
}


function display(detail) {
    // redisplay the page
    if (! detail) {
        detail = 255;
    }
    var queryString = getAllParameters(detail);
    location.href = location.protocol + "//" + location.host + location.pathname + "?" + queryString;
}


/* **********************************************
 *     interactive digilib functions
 * ******************************************** */


function renderMarks() {
    // put the visible marks on the image
    var mark_count = dlMarks.length;
    // make shure the image is loaded so we know its size
    if (defined(picElem.complete) && picElem.complete == false && ! browserType.isN4 ) {
        setTimeout("renderMarks()", 100);
    } else {
        dlTrafo = parseTrafo(picElem);
        for (var i = 0; i < 8; i++) {
            var me = getElement("dot"+i);
            if (i < mark_count) {
                if (dlArea.containsPosition(dlMarks[i])) {
                    var mpos = dlTrafo.transform(dlMarks[i]);
                    // suboptimal to place -5 pixels and not half size of mark-image
                    mpos.x = mpos.x -5;
                    mpos.y = mpos.y -5;
                    moveElement(me, mpos);
                    showElement(me, true);
                }
            } else {
                // hide the other marks
                showElement(me, false);
            }
        }
    }
}


function setMark(reload) {
    // add a mark where clicked
    if ( dlMarks.length > 7 ) {
        alert("Only 8 marks are possible at the moment!");
        return;
    }
    window.focus();

    function markEvent(evt) {
        // event handler adding a new mark
        unregisterEvent("mousedown", elemScaler, markEvent);
        var p = dlTrafo.invtransform(evtPosition(evt));
        addMark(p);
        if (defined(reload)&&(!reload)) {
            // don't redisplay
            renderMarks();
            return;
        }
        display();
    }

    // starting event capture
    registerEvent("mousedown", elemScaler, markEvent);
}


function removeMark(reload) {
    // remove the last mark
    deleteMark();
    if (defined(reload)&&(!reload)) {
        // don't redisplay
        renderMarks();
        return;
    }
    display();
}


function zoomArea() {
    var click = 1;
    var pt1, pt2;
    var eck1pos, eck2pos, eck3pos, eck4pos;
    window.focus();
    var eck1 = getElement("eck1");
    var eck2 = getElement("eck2");
    var eck3 = getElement("eck3");
    var eck4 = getElement("eck4");

    function zoomClick(evt) {
        // mouse click handler
        if (click == 1) {
            // first click -- start moving
            click = 2;
            pt1 = evtPosition(evt);
            pt2 = pt1;
            eck1pos = pt1;
            eck2pos = new Position(pt1.x - 12, pt1.y);
            eck3pos = new Position(pt1.x, pt1.y - 12);
            eck4pos = new Position(pt1.y - 12, pt1.y - 12);
            moveElement(eck1, eck1pos);
            moveElement(eck2, eck2pos);
            moveElement(eck3, eck3pos);
            moveElement(eck4, eck4pos);
            showElement(eck1, true);
            showElement(eck2, true);
            showElement(eck3, true);
            showElement(eck4, true);
            // show moving
            registerEvent("mousemove", elemScaler, zoomMove);
            registerEvent("mousemove", eck4, zoomMove);
            // enable drag-to-zoom
            registerEvent("mouseup", elemScaler, zoomClick);
            registerEvent("mouseup", eck4, zoomClick);
        } else {
            // second click -- end moving
            pt2 = evtPosition(evt);
            showElement(eck1, false);
            showElement(eck2, false);
            showElement(eck3, false);
            showElement(eck4, false);
            unregisterEvent("mousemove", elemScaler, zoomMove);
            unregisterEvent("mousemove", eck4, zoomMove);
            unregisterEvent("mousedown", elemScaler, zoomClick);
            unregisterEvent("mousedown", eck4, zoomClick);
            var p1 = dlTrafo.invtransform(pt1);
            var p2 = dlTrafo.invtransform(pt2);
            var ww = p2.x-p1.x;
            var wh = p2.y-p1.y;
            if ((ww > 0)&&(wh > 0)) {
                setParameter("wx", cropFloat(p1.x));
                setParameter("wy", cropFloat(p1.y));
                setParameter("ww", cropFloat(ww));
                setParameter("wh", cropFloat(wh));
                parseArea();
                // zoomed is always fit
                setParameter("ws", 1);
                display();
            }
        }
    }

    function zoomMove(evt) {
        // mouse move handler
        pt2 = evtPosition(evt);
        // restrict marks to move right and down
        eck1pos = pt1;
        eck2pos = new Position(Math.max(pt1.x, pt2.x)-12, pt1.y);
        eck3pos = new Position(pt1.x, Math.max(pt1.y, pt2.y)-12);
        eck4pos = new Position(Math.max(pt1.x, pt2.x)-12, Math.max(pt1.y, pt2.y)-12);
        moveElement(eck1, eck1pos);
        moveElement(eck2, eck2pos);
        moveElement(eck3, eck3pos);
        moveElement(eck4, eck4pos);
    }

    // starting event capture
    registerEvent("mousedown", elemScaler, zoomClick);
    registerEvent("mousedown", eck4, zoomClick);
}

function zoomBy(factor) {
    // zooms by the given factor
    var newarea = dlArea.copy();
    newarea.width /= factor;
    newarea.height /= factor;
    newarea.x -= 0.5 * (newarea.width - dlArea.width);
    newarea.y -= 0.5 * (newarea.height - dlArea.height);
    newarea = dlMaxArea.fit(newarea);
    setParamFromArea(newarea);
    display();
}


function zoomFullpage() {
    // zooms out to show the whole image
    setParameter("wx", 0.0);
    setParameter("wy", 0.0);
    setParameter("ww", 1.0);
    setParameter("wh", 1.0);
    display();
}


function moveCenter() {
    // move visible area so that it's centered around the clicked point
    if ( (dlArea.width == 1.0) && (dlArea.height == 1.0) ) {
        // nothing to do
        return;
    }
    window.focus();

    function moveCenterEvent(evt) {
        // move to handler
        unregisterEvent("mousedown", elemScaler, moveCenterEvent);
        var pt = dlTrafo.invtransform(evtPosition(evt));
        var newarea = new Rectangle(pt.x-0.5*dlArea.width, pt.y-0.5*dlArea.height, dlArea.width, dlArea.height);
        newarea = dlMaxArea.fit(newarea);
        // set parameters
        setParamFromArea(newarea);
        parseArea();
        display();
    }

    // starting event capture
    registerEvent("mousedown", elemScaler, moveCenterEvent);
}

function moveBy(movx, movy) {
    // move visible area by movx and movy (in units of ww, wh)
    if ((dlArea.width == 1.0)&&(dlArea.height == 1.0)) {
        // nothing to do
        return;
    }
    var newarea = dlArea.copy();
    newarea.x += parseFloat(movx)*dlArea.width;
    newarea.y += parseFloat(movy)*dlArea.height;
    newarea = dlMaxArea.fit(newarea);
    // set parameters
    setParamFromArea(newarea);
    parseArea();
    display();
}

function getRef() {
    // returns a reference to the current digilib set
    if (! baseUrl) {
        var baseUrl = location.protocol + "//" + location.host + location.pathname;
    }
    var hyperlinkRef = baseUrl;
    var par = getAllParameters(7+16); // all without ddpi, pt
    if (par.length > 0) {
        hyperlinkRef += "?" + par;
    }
    return hyperlinkRef;
}

function getRefWin(type, msg) {
    // shows an alert with a reference to the current digilib set
    if (! msg) {
        msg = "Link for HTML documents";
    }
    prompt(msg, getRef());
}

function getQuality() {
	// returns the current q setting
    for (var i = 0; i < 3; i++) {
        if (hasFlag("q"+i)) {
        	return i;
        }
    }
    return 1
}

function setQuality(qual) {
    // set the image quality
    for (var i = 0; i < 3; i++) {
        removeFlag("q"+i);
        if (i == qual) {
            addFlag("q"+i);
        }
    }
    setParameter("mo", getAllFlags());
    display();
}    

function setQualityWin(msg) {
	// dialog for setting quality
	if (! msg) {
		msg = "Quality (0..2)";
	}
	var q = getQuality();
	var newq = window.prompt(msg, q);
	if (newq) {
		setQuality(newq);
	}
}

function mirror(dir) {
    // mirror the image horizontally or vertically
    if (dir == "h") {
        toggleFlag("hmir");
    } else {
        toggleFlag("vmir");
    }
    setParameter("mo", getAllFlags());
    display();
}

function gotoPage(gopage, keep) {
	// goto given page nr (+/-: relative)
	var oldpn = parseInt(getParameter("pn"));
	setParameter("pn", gopage, true);
	var pn = parseInt(getParameter("pn"));
	if (pn < 1) {
		alert("No such page! (Page number too low)");
		setParameter("pn", oldpn);
		return;
	}
	if (hasParameter("pt")) {
		pt = parseInt(getParameter("pt"))
		if (pn > pt) {
			alert("No such page! (Page number too high)");
			setParameter("pn", oldpn);
			return;
		}
	}
	if (keep) {
		display(15+32); // all, no mark
	} else {	
		display(3+32); // fn, pn, ws, mo + pt
	}
}

function gotoPageWin() {
	// dialog to ask for new page nr
	var pn = getParameter("pn");
	var gopage = window.prompt("Go to page", pn);
	if (gopage) {
		gotoPage(gopage);
	}
}

function setParamWin(param, text, relative) {
	// dialog to ask for new parameter value
	var val = getParameter(param);
	var newval = window.prompt(text, val);
	if (newval) {
		setParameter(param, newval, relative);
		display();
	}
}

function showOptions(show) {
	// show or hide option div
	var elem = getElement("dloptions");
	showElement(elem, show);
}