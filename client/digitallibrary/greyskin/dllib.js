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
  Martin Raspe <hertzhaft@biblhertz.it>, 12.12.2005

  ! Requires baselib.js !

*/
digilibVersion = "Digilib NG";
dllibVersion = "2.040";

/****************************************************
 * digilib specific classes (must be defined first)
 ****************************************************/
 
/*
 * Marks class
 */ 
function Marks() {
	return this;
}
// Marks inherits from Array
Marks.prototype = new Array();
Marks.prototype.parse = function(query) {
	this.length = 0;
    if (query.indexOf(";") >= 0) {
        var pa = query.split(";");    // old format with ";"
    } else {
        var pa = query.split(",");    // new format
    }
    for (var i = 0; i < pa.length ; i++) {
        var pos = pa[i].split("/");
        if (pos.length > 1) this.push(new Position(pos[0], pos[1]));
    }
}
Marks.prototype.getAll = function() {
    var ma = new Array();
    for (var i = 0; i < this.length; i++) {
        ma.push(cropFloat(this[i].x) + "/" + cropFloat(this[i].y));
   	}
    return ma.join(",");
}
Marks.prototype.addEvent = function(evt) {
    // add a mark from a screen event
    var pos = dlTrafo.invtransform(evtPosition(evt));
    this.push(pos);
}

/*
 * DLParameters -- digilibs own parameter class
 */
function DLParameters() {
	// flags for parameter sets
	this.PARAM_FILE = 1;
	this.PARAM_MODE = 2;
	this.PARAM_DIM = 4;
	this.PARAM_IMAGE = 8;
	this.PARAM_DPI = 16;
	this.PARAM_SIZE = 32;
	this.PARAM_MARK = 64;
	this.PARAM_PAGES = 128;
	this.PARAM_ALL = 255;
	return this;
}
DLParameters.prototype = new Parameters();
// move the inherited getAll because we need it later
DLParameters.prototype._getAll = Parameters.prototype.getAll;
DLParameters.prototype.getAll = function(paDetail, moDetail) {
	// get Flags and Marks first
    var mo = dlFlags.getAll(moDetail);
    this.set("mo", mo);
    var mk = dlMarks.getAll();
    this.set("mk", mk);
    var ret = this._getAll(paDetail);
	return ret;
}

/*
 * DLModes -- digilibs own flags class
 */
function DLFlags() {
	// flags for mode sets
	this.MODE_QUAL = 1;
	this.MODE_SIZE = 2;
	this.MODE_MIR = 4;
	this.MODE_OTHER = 128;
	this.MODE_ALL = 255;
	return this;
}
// inherits from Flags
DLFlags.prototype = new Flags();

/********************************
 * global variables
 ********************************/
 
var isDigilibInitialized = false;    // gets set to true in dl_param_init

var dlParams;
var dlTrafo;
var dlMaxArea = new Rectangle(0.0, 0.0, 1.0, 1.0); // should be CONST
var dlArea;
var dlFlags;
var dlMarks;

// global elements
var scalerDiv = null;
var scalerImg = null;

// default inset (for scalerImg relativ to scalerDiv 
INSET = 40; // because of scrollbars of main window and scaler [Firefox bug?]

/* old parameter function compatibility stuff */
function newParameter(a,b,c) {return dlParams.define(a,b,c)};
function resetParameter(a) {return dlParams.reset(a)};
function deleteParameter(a) {return dlParams.remove(a)};
function getParameter(a) {return dlParams.get(a)};
function setParameter(a,b,c) {return dlParams.set(a,b,c)};
function hasParameter(a) {return dlParams.isSet(a)};
function getAllParameters(a) {return dlParams.getAll(a)};
getQueryString = getAllParameters;
function parseParameters(a) {return dlParams.parse(a)};
function getAllMarks() {return dlMarks.getAll()};
getMarksQueryString = getAllMarks;
function addMark(evt) {return dlMarks.addEvent(evt)};
function deleteMark() {return dlMarks.pop()};
function deleteAllMarks() {return dlMarks = new Marks()};
function hasFlag(mode) {return dlFlags.get(mode)};
function addFlag(mode) {return dlFlags.set(mode)};
function removeFlag(mode) {return dlFlags.reset(mode)};
function toggleFlag(mode) {return dlFlags.toggle(mode)};
function getAllFlags() {return dlFlags.getAll()};



// mouse drag area that counts as one click 
MIN_AREA_SIZE = 3 * 3 + 1;

// standard zoom factor
ZOOMFACTOR = Math.sqrt(2);

// bird's eye view dimensions
BIRD_MAXX = 100;
BIRD_MAXY = 100;

// with of arrow bars
ARROW_WIDTH = 32;

// with of calibration bar
CALIBRATION_WIDTH = 64;

function identify() {
        // used for identifying a digilib instance
        // Relato uses that function - lugi
        return digilibVersion;
}

/*
 * more parameter handling
 */

function parseArea() {
    // returns area Rectangle from current parameters
    return new Rectangle(
        dlParams.get("wx"),
        dlParams.get("wy"),
        dlParams.get("ww"),
        dlParams.get("wh"));
}

function setParamFromArea(rect) {
    // sets digilib wx etc. from rect
    dlParams.set("wx", cropFloat(rect.x));
    dlParams.set("wy", cropFloat(rect.y));
    dlParams.set("ww", cropFloat(rect.width));
    dlParams.set("wh", cropFloat(rect.height));
    return true;
}

function initParameters() {
    // initialisation before onload
    if (!baseLibVersion) alert("ERROR: baselib.js not loaded!");
    if (isDigilibInitialized) return false;    // dl_param_init was already run 
    dlParams = new DLParameters();
    dlFlags = new DLFlags();
    dlMarks = new Marks();
	/* request parameters */
	with (dlParams) {
	// file
	    define('fn', '',    PARAM_FILE);
	    define('pn', '1',   PARAM_FILE);
	// mode
	    define('mo', '',    PARAM_MODE);
	// relative dimensions of zoomed image
	    define('wx', '0.0', PARAM_DIM);
	    define('wy', '0.0', PARAM_DIM);
	    define('ww', '1.0', PARAM_DIM);
	    define('wh', '1.0', PARAM_DIM);
	// image manipulation
	    define('brgt', '0.0', PARAM_IMAGE);
	    define('cont', '0.0', PARAM_IMAGE);
	    define('rot',  '0.0', PARAM_IMAGE);
	    define('rgba', '',    PARAM_IMAGE);
	    define('rgbm', '',    PARAM_IMAGE);
	// resolution
	    define('ddpi',  '', PARAM_DPI);
	    define('ddpix', '', PARAM_DPI);
	    define('ddpiy', '', PARAM_DPI);
	// marks
	    define('mk', '', PARAM_MARK);
	// pages total
	    define('pt', '0', PARAM_PAGES);
	// size
	    define('ws', '1.0', PARAM_SIZE);
    }
    /* mode flags */
    with (dlFlags) {
	    define('q0', MODE_QUAL);
	    define('q1', MODE_QUAL);
	    define('q2', MODE_QUAL);
	    define('fit',   MODE_SIZE);
	    define('clip',  MODE_SIZE);
	    define('osize', MODE_SIZE);
	    define('vmir', MODE_MIR);
	    define('hmir', MODE_MIR);
	}
    // parse parameters
    parseAllParameters();
    isDigilibInitialized = true;
}

/* **********************************************
 *     parse parameters routines
 * ******************************************** */

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
    // FIX ME: Robert, kannst Du mal nachsehen, ob das folgende tut, was es soll?
    // oder gibt es dafuer neuen Code? -- ROC: Bisher funktioniert es nicht!
    // rotate
    //var rot = getRotation(- dlParams.get("rot"), new Position(0.5*picsize.width, 0.5*picsize.height));
    //trafo.concat(rot);
    // mirror
    //if (hasFlag("hmir")) trafo.m00 = - trafo.m00; // ??
    //if (hasFlag("vmir")) trafo.m11 = - trafo.m11; // ??
    return trafo;
}

/* **********************************************
 *     marks routines
 * ******************************************** */

function createMarkDiv(index) {
    var div = document.createElement("div");
    div.className = "mark";
    div.id = "mark" + index;
    div.innerHTML = index + 1;
    document.body.appendChild(div);
    return div;
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
        dlParams.set(nam, val, relative);
        display();
    } else {
        alert("ERROR: unable to process event!");
    }
    return true;
}


/* **********************************************
 *     digilib specific routines
 * ******************************************** */


function parseAllParameters() {
    // put the query parameters (sans "?") in the parameters array
    dlParams.parse(location.search.slice(1));
    // treat special parameters
    dlMarks.parse(dlParams.get("mk"));
    dlArea = parseArea();
    dlFlags.parse(dlParams.get("mo"));
}

function dl_param_init() {
    return true;
}

function dl_init() {
    // initalisation on load
    if (!isDigilibInitialized) dl_param_init();
    // wait for image to load and display marks
    renderMarks();
    // done
    focus();
}

function setScalerImage(detail) {
	// set the scaler image source (needs the browser size)
    if (!scalerDiv) scalerDiv = getElement("scaler");
    if (!scalerImg) scalerImg = getElement("pic");
    var picsize = bestPicSize(scalerDiv, 50);
    var src = "../servlet/Scaler?" 
        + dlParams.getAll(dlParams.PARAM_ALL & ~(dlParams.PARAM_MARK | dlParams.PARAM_PAGES))
        + "&dw=" + picsize.width
        + "&dh=" + picsize.height;
    // debug(src);
    scalerImg.onload = onImgLoad;
    scalerImg.src = src;
    //initScaler();    // dl_init braucht die endgueltigen Masze des pic Elements
}

function display(detail, moDetail) {
    // redisplay the page
    var queryString = dlParams.getAll(detail, moDetail);
	location.href
        = location.protocol + "//"
    	    + location.host
    	    + location.pathname
        + "?" + queryString;
}

/* **********************************************
 *     interactive digilib functions
 * ******************************************** */
function renderMarks() {
    // make sure the image is loaded so we know its size
    if (!dlTrafo) {
    		alert("ERROR: cannot render marks!");
    		return;
    	}
    // debugProps(dlArea, "dlArea");
    for (var i = 0; i < dlMarks.length; i++) {
    	var div = getElement("mark" + i, true) || createMarkDiv(i);
    	var mark = dlMarks[i];
    	// debugProps(mark, "mark");
    	if (dlArea.containsPosition(mark)) {
        	var mpos = dlTrafo.transform(mark); 
        	// debugProps(mark, "mpos");
	       	// suboptimal to place -5 pixels and not half size of mark-image
	       	// better not hide the marked spot (MR)
	       	// mpos.x = mpos.x -5;
	       	// mpos.y = mpos.y -5;
	       	moveElement(div, mpos);
	        showElement(div, true);
	    } else {
	        // hide the other marks
	        showElement(div, false);
	    }
    }
}

function setMark(reload) {

    function markEvent(evt) {
    // event handler adding a new mark
        unregisterEvent("mousedown", scalerDiv, markEvent);
        dlMarks.addEvent(evt);
        if ( defined(reload) && !reload ) {
            // don't redisplay
            renderMarks();
            return;
        }
        display();
        return stopEvent(evt);
    }
    
    // add a mark where clicked
    window.focus();
    moveCenter(false);
    // start event capturing
    registerEvent("mousedown", scalerDiv, markEvent);
}

function removeMark(reload) {
    // remove the last mark
    dlMarks.pop();
    if (defined(reload)&&(!reload)) {
        // don't redisplay
        renderMarks();
        return;
    }
    display();
}

function zoomArea() {
    var pt1, pt2;
    var zoomdiv = getElement("zoom");
    var overlay = getElement("overlay");
    // use overlay div to avoid <img> mousemove problems
    var picRect = getElementRect(scalerImg);
    // FIX ME: is there a way to query the border width from CSS info?
    // rect.x -= 2; // account for overlay borders
    // rect.y -= 2;
    moveElement(overlay, picRect);
    showElement(overlay, true);
    // start event capturing
    registerEvent("mousedown", overlay, zoomStart);
    registerEvent("mousedown", scalerImg, zoomStart);
    window.focus();

// mousedown handler: start moving
    function zoomStart(evt) {
        pt1 = evtPosition(evt);
        unregisterEvent("mousedown", overlay, zoomStart);
        unregisterEvent("mousedown", scalerImg, zoomStart);
        // setup and show zoom div
        moveElement(zoomdiv, Rectangle(pt1.x, pt1.y, 0, 0));
        showElement(zoomdiv, true);
        // register events
        registerEvent("mousemove", document, zoomMove);
        registerEvent("mouseup", document, zoomEnd);
        return stopEvent(evt);
    }
    
// mouseup handler: end moving
    function zoomEnd(evt) {
        pt2 = evtPosition(evt);
        // assume a click if the area is too small (up to 3 x 3 pixel)
        var clickRect = new Rectangle(pt1, pt2);
        clickRect.normalize();
        if (clickRect.getArea() <= MIN_AREA_SIZE) return stopEvent(evt); 
        // hide zoom div
        showElement(zoomdiv, false);
        showElement(overlay, false);
        // unregister events
        unregisterEvent("mousemove", document, zoomMove);
        unregisterEvent("mouseup", document, zoomMove);
        // clip and transform
        clickRect.clipTo(picRect);
        var area = dlTrafo.invtransform(clickRect);
        setParamFromArea(area);
        // zoomed is always fit
        dlParams.set("ws", 1);
        display();
        return stopEvent(evt);
    }
    
// mouse move handler
    function zoomMove(evt) {
        pt2 = evtPosition(evt);
        var rect = new Rectangle(pt1, pt2);
        rect.normalize();
        rect.clipTo(picRect);
        // update zoom div
        moveElement(zoomdiv, rect);
        return stopEvent(evt);
    	}
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
    dlParams.set("wx", 0.0);
    dlParams.set("wy", 0.0);
    dlParams.set("ww", 1.0);
    dlParams.set("wh", 1.0);
    display();
}


function moveCenter(on) {
    // move visible area so that it's centered around the clicked point
    if (isFullArea()) return; // nothing to do
    // starting event capture
    if (on) registerEvent("mousedown", scalerImg, moveCenterEvent);
    else  unregisterEvent("mousedown", scalerImg, moveCenterEvent);
    window.focus();
}

function moveCenterEvent(evt) {
    // move to handler
    var pt = dlTrafo.invtransform(evtPosition(evt));
    var newarea = new Rectangle(
        pt.x - 0.5 * dlArea.width,
        pt.y - 0.5 * dlArea.height,
        dlArea.width,
        dlArea.height
        );
    newarea.stayInside(dlMaxArea);
    // newarea = dlMaxArea.fit(newarea);
    // debugProps(newarea, "newarea");
    // debugProps(dlArea, "dlArea");
    if (newarea.equals(dlArea)) return; // keep event handler
    unregisterEvent("mousedown", scalerImg, moveCenterEvent);
    // set parameters
    setParamFromArea(newarea);
    parseArea();
    display();
}

function isFullArea(area) {
    if (!area) area = dlArea;
    // pixel by pixel is not always full area
    return (area.width == 1.0) && (area.height == 1.0) && ! hasFlag("clip");
}

function canMove(movx, movy) {
    if (isFullArea()) return false;
    var x2 = dlArea.x + dlArea.width;
    var y2 = dlArea.y + dlArea.height;
    // debugProps(dlArea);
    return ((movx < 0) && (dlArea.x > 0))
    	|| ((movx > 0) && (x2 < 1.0))
	|| ((movy < 0) && (dlArea.y > 0))
    	|| ((movy > 0) && (y2 < 1.0))
}

function moveBy(movx, movy) {
    // move visible area by movx and movy (in units of ww, wh)
    if (!canMove(movx, movy)) return; // nothing to do
    var newarea = dlArea.copy();
    newarea.x += parseFloat(movx)*dlArea.width;
    newarea.y += parseFloat(movy)*dlArea.height;
    newarea = dlMaxArea.fit(newarea);
    // set parameters
    setParamFromArea(newarea);
    parseArea();
    display();
}

function getRef(baseURL) {
    // returns a reference to the current digilib set
    if (!baseUrl) baseUrl 
        = location.protocol
        + "//" 
        + location.host
        + location.pathname;
    var hyperlinkRef = baseUrl;
    var params = dlParams.getAll(dlParams.PARAM_ALL & ~(dlParams.PARAM_DPI | dlParams.PARAM_PAGES)); // all without ddpi, pt
    if (params.length > 0) hyperlinkRef += "?" + params;
    return hyperlinkRef;
}

function getRefWin(type, msg) {
    // shows an alert with a reference to the current digilib set
    if (! msg) msg = "URL reference to the current view";
    prompt(msg, getRef());
}

function getQuality() {
    // returns the current q setting
    for (var i = 0; i < 3; i++) {
        if (dlFlags.get("q"+i)) return i;
    }
    return 1
}

function setQuality(qual) {
    // set the image quality
    for (var i = 0; i < 3; i++) dlFlags.reset("q" + i);
    if ((qual < 0)||(qual > 2)) return alert("Quality setting not supported");
    dlFlags.set("q" + qual);
    display();
}

function setQualityWin(msg) {
    // dialog for setting quality
    if (! msg) msg = "Quality (0..2)";
    var q = getQuality();
    var newq = window.prompt(msg, q);
    if (newq) setQuality(newq);
}

function mirror(dir) {
    // mirror the image horizontally or vertically
    if (dir == "h") {
    		dlFlags.toggle("hmir");
    	} else {
    		dlFlags.toggle("vmir");
	}
    display();
}

function gotoPage(gopage, keep) {
    // goto given page nr (+/-: relative)
    var oldpn = parseInt(dlParams.get("pn"));
    dlParams.set("pn", gopage, true);
    var pn = parseInt(dlParams.get("pn"));
    if (pn < 1) {
        alert("No such page! (Page number too low)");
        dlParams.set("pn", oldpn);
        return;
    }
    if (dlParams.isSet("pt")) {
        pt = parseInt(dlParams.get("pt"))
        if (pn > pt) {
            alert("No such page! (Page number too high)");
            dlParams.set("pn", oldpn);
            return;
        }
    }
    if (keep) {
        display(dlParams.PARAM_ALL & ~dlParams.PARAM_MARK); // all, no mark
    } else {
        display(dlParams.PARAM_FILE | dlParams.PARAM_MODE | dlParams.PARAM_PAGES, dlParams.MODE_QUAL | dlParams.MODE_OTHER); // fn, pn, ws, mo + pt
    }
}

function gotoPageWin() {
    // dialog to ask for new page nr
    var pn = dlParams.get("pn");
    var gopage = window.prompt("Go to page", pn);
    if (gopage) gotoPage(gopage);
    }

function setParamWin(param, text, relative) {
    // dialog to ask for new parameter value
    var val = dlParams.get(param);
    var newval = window.prompt(text, val);
    if (newval) {
        dlParams.set(param, newval, relative);
        display();
    }
}

function showOptions(show) {
    // show or hide option div
    var elem = getElement("dloptions");
    showElement(elem, show);
    // FIX ME: get rid of the dotted line around the buttons when focused
    }

function showAboutDiv(show) {
    // show or hide "about" div
    var elem = getElement("about");
    if (elem == null) {
        if (show) alert("About Digilib - dialog missing in HTML code!"
            + "\nDigilib Version: " + digilibVersion
            + "\JSP Version: " + jspVersion
            + "\ndlLib Version: " + dllibVersion
            + "\nbaseLib Version: " + baseLibVersion);
        return;
        }
    if (show) {
        getElement("digilib-version").innerHTML = "Digilib Version: " + digilibVersion;
        getElement("jsp-version").innerHTML = "JSP Version: " + jspVersion;
        getElement("baselib-version").innerHTML = "baseLib Version: " + baseLibVersion;
        getElement("dllib-version").innerHTML = "dlLib Version: " + dllibVersion;
        var aboutRect = getElementRect(elem);
        aboutRect.setCenter(getWinRect().getCenter());
        moveElement(elem, aboutRect);
        }
    showElement(elem, show);
    }
    
function loadBirdImage() {
    var img = getElement("bird-image");
    var src = "../servlet/Scaler?" 
        + dlParams.getAll(dlParams.PARAM_FILE)
        + "&dw=" + BIRD_MAXX 
        + "&dh=" + BIRD_MAXY;
    img.src = src;
    }
    
function showBirdDiv(show) {
    // show or hide "bird's eye" div
    var startPos; // anchor for dragging
    var newRect;  // position after drag
    var birdImg = getElement("bird-image");
    var birdArea = getElement("bird-area");
    var overlay = getElement("overlay");
    showElement(birdImg, show);
    // dont show selector if area has full size
    if (!show || isFullArea()) {
        // hide area
        showElement(birdArea, false);
        showElement(overlay, false);
        return;
        };
    var birdImgRect = getElementRect(birdImg);
    var area = parseArea();
    // scale area down to img size
    var birdAreaRect = new Rectangle(
        // what about borders ??
        birdImgRect.x + birdImgRect.width  * area.x,
        birdImgRect.y + birdImgRect.height * area.y,
        birdImgRect.width  * area.width,
        birdImgRect.height * area.height
        );
    moveElement(birdArea, birdAreaRect);
    showElement(birdArea, true);
    moveElement(overlay, birdImgRect);
    showElement(overlay, true);
    registerEvent("mousedown", overlay, birdAreaStartDrag);
    registerEvent("mousedown", birdImg, birdAreaStartDrag);

    function birdAreaStartDrag(evt) {
    // mousedown handler: start drag
        startPos = evtPosition(evt);
        unregisterEvent("mousedown", overlay, birdAreaStartDrag);
        unregisterEvent("mousedown", birdImg, birdAreaStartDrag);
        registerEvent("mousemove", document, birdAreaMove);
        registerEvent("mouseup",   document, birdAreaEndDrag);
        // debugProps(getElementRect(bird))
        return stopEvent(evt);
        }

    function birdAreaMove(evt) {
    // mousemove handler: drag
        var pos = evtPosition(evt);
        var dx = pos.x - startPos.x;
        var dy = pos.y - startPos.y;
        // move birdArea div, keeping size
        newRect = new Rectangle(
            birdAreaRect.x + dx,
            birdAreaRect.y + dy,
            birdAreaRect.width,
            birdAreaRect.height);
        // stay within image
        newRect.stayInside(birdImgRect);
        moveElement(birdArea, newRect);
        showElement(birdArea, true);
        return stopEvent(evt);
        }

    function birdAreaEndDrag(evt) {
    // mouseup handler: reload page
        unregisterEvent("mousemove", document, birdAreaMove);
        unregisterEvent("mouseup",   document, birdAreaEndDrag);
        showElement(overlay, false);
        if (newRect == null) { // no movement happened
            startPos = birdAreaRect.getCenter();
            birdAreaMove(evt); // set center to click position
            }
        dlParams.set("wx", cropFloat((newRect.x - birdImgRect.x) / birdImgRect.width));
        dlParams.set("wy", cropFloat((newRect.y - birdImgRect.y) / birdImgRect.height));
        // zoomed is always fit
        dlParams.set("ws", 1);
        display();
        return stopEvent(evt);
        }
    }

function showArrow(name, rect, show) {
    var arrow = getElement(name);
	moveElement(arrow, rect);
	showElement(arrow, show);
	}
	
function showArrows() {
    // show the 4 arrow bars on top of scaler img according to current dlArea
    if (defined(scalerImg.complete) && !scalerImg.complete && !browserType.isN4 ) {
        setTimeout("showArrows()", 100);
        return;
        }
	var r = getElementRect(scalerImg);
    showArrow('up',
        new Rectangle(r.x, r.y, r.width, ARROW_WIDTH), 
        canMove(0, -1)
        );
    showArrow('down',
        new Rectangle(r.x, r.y + r.height - ARROW_WIDTH, r.width, ARROW_WIDTH),
        canMove(0, 1)
        );
    showArrow('left',
        new Rectangle(r.x, r.y, ARROW_WIDTH, r.height),
        canMove(-1, 0)
        );
    showArrow('right',
        new Rectangle(r.x + r.width - ARROW_WIDTH, r.y, ARROW_WIDTH, r.height),
        canMove(1, 0)
        );
	}

function calibrate(direction) {
    // calibrate screen
    var startPos; // anchor for dragging
    var newRect;  // position after drag
    var calDiv = getElement("calibration");
    var pixel = calDiv.getElementsByTagName("p")[0];
    var overlay = getElement("overlay");
    moveElement(overlay, getWinRect());
    showElement(overlay, true);
    var xDir = direction == "x";
    moveCenter(false);
    registerEvent("mousedown", document, calibrationStartDrag);

    function calibrationStartDrag(evt) {
    // mousedown handler: start drag
        startPos = evtPosition(evt);
        unregisterEvent("mousedown", document, calibrationStartDrag);
        registerEvent("mousemove", document, calibrationMove);
        registerEvent("mouseup",   document, calibrationEndDrag);
        newRect = new Rectangle(
            startPos.x,
            startPos.y,
            xDir ? 1 : CALIBRATION_WIDTH,
            xDir ? CALIBRATION_WIDTH : 1
            );
        moveElement(calDiv, newRect);
        showElement(calDiv, true);
        // debugProps(getElementRect(bird))
        return stopEvent(evt);
        }

    function calibrationMove(evt) {
    // mousemove handler: drag
        var pos = evtPosition(evt);
        var dx = (xDir) ? pos.x - startPos.x : CALIBRATION_WIDTH;
        var dy = (xDir) ? CALIBRATION_WIDTH : pos.y - startPos.y;
        // move birdArea div, keeping size
        newRect = new Rectangle(startPos.x, startPos.y, dx, dy);
        pixel.innerHTML = (xDir ? dx : dy) + " px";
        moveElement(calDiv, newRect);
        showElement(calDiv, true);
        return stopEvent(evt);
        }

    function calibrationEndDrag(evt) {
    // mouseup handler: calibrate
        unregisterEvent("mousemove", document, calibrationMove);
        unregisterEvent("mouseup",   document, calibrationEndDrag);
        if (xDir) {
            var val = newRect.width * 0.254; // ratio dm/inch
            cookie.add("ddpi", val);
            cookie.add("ddpix", val);
        } else {
            var val = newRect.height * 0.254;
            cookie.add("ddpiy", val);
            }
        showElement(calDiv, false);
        showElement(overlay, false);
        moveCenter(true);
        return stopEvent(evt);
        }
    }

function originalSize(on) {
    // set osize flag, needs calibrated screen
    if (on) {
        var dpi = cookie.get("ddpi");
        if (dpi == null) {
            alert("Screen has not yet been calibrated - using default value of 72 dpi");
            dpi = 72;
            }
        dlParams.set("ddpi", dpi);
        addFlag("osize");
        display();
        }
    else removeFlag("osize");
}
    
function pixelByPixel(on) {
    // sets clip flag
    if (on) { 
        addFlag("clip");
        display();
        }
    else removeFlag("clip");
}

function pageWidth() {
    var divSize = getElementSize(scalerDiv);
    divSize.width -= INSET; // allow for scrollbars [Firefox bug?]
    var imgSize = getElementSize(scalerImg);
    if (imgSize.width < divSize.width) {
        dlParams.set("ws", cropFloat(divSize.width / imgSize.width));
        display(dlParams.PARAM_ALL & ~dlParams.PARAM_DIM); // no zoom
        };
    // TODO: how to calculate correct width if zoom is on? (plus size?)

}

function resize(factor) {
    dlParams.set("ws", factor);
    showSizeMenu(false);
    display();
}

function showSizeMenu(show) {
    var menu = getElement("sizes");
    if (show) {
        // align menu with button
        var buttonPos = getElementPosition(getElement("size"));
        moveElement(menu, new Position(buttonPos.x - 50, buttonPos.y));
        }
    showElement(menu, show);
}
// :tabSize=4:indentSize=4:noTabs=true:

