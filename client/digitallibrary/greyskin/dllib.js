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
dllibVersion = "2.0";
isDigilibInitialized = false;    // gets set to true in dl_param_init
reloadPage = true; // reload the page when parameters are changed, otherwise update only "src" attribute of scaler img 

// global variables
dlTrafo = new Transform();
dlMaxArea = new Rectangle(0.0, 0.0, 1.0, 1.0);
dlArea = null;
dlMarks = null;
dlFlags = null;

// global elements
elemScaler = null;
picElem = null;


// flags for parameter sets
PARAM_FILE = 1;
PARAM_MODE = 2;
PARAM_SIZE = 4;
PARAM_IMAGE = 8;
PARAM_DPI = 16;
PARAM_MARK = 32;
PARAM_PAGES = 64;
PARAM_ALL = PARAM_FILE | PARAM_MODE | PARAM_SIZE | PARAM_IMAGE | PARAM_DPI | PARAM_MARK | PARAM_PAGES;

// mouse drag area that counts as one click 
MIN_AREA_SIZE = 3 * 3 + 1;

// standard zoom factor
ZOOMFACTOR = Math.sqrt(2);

// bird's eye view dimensions
BIRD_MAXX = 100;
BIRD_MAXY = 100;

// with of arrow bars
ARROW_WIDTH = 32;

function identify() {
        // used for identifying a digilib instance
        // Relato uses that function - lugi
        return digilibVersion;
}
/*
 * more parameter handling
 */

function initParameters() {
// file
    newParameter('fn', '',    PARAM_FILE);
    newParameter('pn', '1',   PARAM_FILE);
// mode
    newParameter('ws', '1.0', PARAM_MODE);
    newParameter('mo', '',    PARAM_MODE);
// relative dimensions of zoomed image
    newParameter('wx', '0.0', PARAM_SIZE);
    newParameter('wy', '0.0', PARAM_SIZE);
    newParameter('ww', '1.0', PARAM_SIZE);
    newParameter('wh', '1.0', PARAM_SIZE);
// image manipulation
    newParameter('brgt', '0.0', PARAM_IMAGE);
    newParameter('cont', '0.0', PARAM_IMAGE);
    newParameter('rot',  '0.0', PARAM_IMAGE);
    newParameter('rgba', '',    PARAM_IMAGE);
    newParameter('rgbm', '',    PARAM_IMAGE);
// resolution
    newParameter('ddpi',  '', PARAM_DPI);
    newParameter('ddpix', '', PARAM_DPI);
    newParameter('ddpiy', '', PARAM_DPI);
// marks
    newParameter('mk', '', PARAM_MARK);
// pages total
    newParameter('pt', '0', PARAM_PAGES);
    }

function parseArea() {
    // returns area Rectangle from current parameters
    return new Rectangle(
        getParameter("wx"),
        getParameter("wy"),
        getParameter("ww"),
        getParameter("wh"));
    }

function setParamFromArea(rect) {
    // sets digilib wx etc. from rect
    setParameter("wx", cropFloat(rect.x));
    setParameter("wy", cropFloat(rect.y));
    setParameter("ww", cropFloat(rect.width));
    setParameter("wh", cropFloat(rect.height));
    return true;
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
    // oder gibt es dafür neuen Code?
    // rotate
    var rot = getRotation(- getParameter("rot"), new Position(0.5*picsize.width, 0.5*picsize.height));
    trafo.concat(rot);
    // mirror
    if (hasFlag("hmir")) trafo.m00 = - trafo.m00; // ??
    if (hasFlag("vmir")) trafo.m11 = - trafo.m11; // ??
    return trafo;
}

function parseMarks() {
    // returns marks array from current parameters
    var marks = new Array();
    var param = getParameter("mk");
    var pairs = (param.indexOf(";") >= 0)
        ? param.split(";")    // old format with ";"
        : param.split(",");    // new format
    for (var i = 0; i < pairs.length ; i++) {
        var pos = pairs[i].split("/");
        if (pos.length > 1) marks.push(new Position(pos[0], pos[1]));
        }
    return marks;
    }

/* **********************************************
 *     marks routines
 * ******************************************** */

 function getAllMarks() {
    // returns a string with all marks in query format
    var marks = new Array();
    for (var i = 0; i < dlMarks.length; i++)
        marks.push(cropFloat(dlMarks[i].x) + "/" + cropFloat(dlMarks[i].y));
    return marks.join(",");
    }

getMarksQueryString = getAllMarks;

function addMark(evt) {
    // add a mark
    var pos = dlTrafo.invtransform(evtPosition(evt));
    dlMarks.push(pos)
    setParameter("mk", getAllMarks());
    return true;
    }

function deleteMark() {
    // delete the last mark
    var mark = dlMarks.pop();
    setParameter("mk", getAllMarks());
    return true;
    }

function deleteAllMarks() {
    // delete all marks and mk parameters
    dlMarks.length = 0;
    resetParameter("mk");
    return true;
    }

function createMarkDiv(index) {
    var div = document.createElement("div");
    div.className = "mark";
    div.id = "mark" + index;
    div.innerHTML = index + 1;
    document.body.appendChild(div);
    return div;
    }

/* **********************************************
 *     flag routines
 * ******************************************** */

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
    if (dlFlags[mode]) delete dlFlags[mode];
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


function parseAllParameters() {
    // put the query parameters (sans "?") in the parameters array
    parseParameters(location.search.slice(1));
    // treat special parameters
    dlMarks = parseMarks();
    dlArea = parseArea();
    dlFlags = parseFlags();
    }

function dl_param_init() {
    // initialisation before onload
    if (!baseLibVersion) alert("ERROR: baselib.js not loaded!");
    if (isDigilibInitialized) return false;    // dl_param_init was already run 
    // dlArea = new Rectangle(0.0, 0.0, 1.0, 1.0); // overwritten by parseAllParameters() below
    // dlMarks = new Array(); // dito
    // dlFlags = new Object(); // dito
    // parse parameters
    parseAllParameters();
    isDigilibInitialized = true;
    return true;
    }

function dl_init() {
    // initalisation on load
    if (!isDigilibInitialized) dl_param_init();
    elemScaler = getElement("scaler");
    picElem = getElement("pic", true);
    // in N4 pic is in the scaler layer
    if (picElem == null && elemScaler) {
        picElem = elemScaler.document.images[0];
        }
    // give a name to the window containing digilib
    window.name = defined(dlTarget) && dlTarget
        ? dlTarget
        : "digilib";
    // put the query parameters (sans "?") in the parameters array
        // parseAllParameters(); // has already been called in dl_param_init()
    // wait for image to load and display marks
    renderMarks();
    // done
    focus();
    }
    
initScaler = dl_init;

function loadScalerImage(detail) {
    var pic = getElement('pic');
    var scaler = getElement('scaler');
    var zoomdiv = getElement("zoom");    // test for presence only
    var overlay = getElement("overlay");    // test for presence only
    var about = getElement("bird");        // test for presence only
    var bird = getElement("bird");        // test for presence only
    var picsize = bestPicSize(scaler, 50);
    var src = "../servlet/Scaler?" 
        + getQueryString()
        + "&dw=" + picsize.width
        + "&dh=" + picsize.height;
    // debug(src);
    pic.src = src;
    initScaler();    // dl_init braucht die endgültigen Maße des pic Elements
    }

function display(detail) {
    // redisplay the page
    if (! detail) detail = PARAM_ALL;
    var queryString = getAllParameters(detail);
    if (reloadPage) {
        location.href
            = location.protocol + "//"
            + location.host
            + location.pathname
            + "?" + queryString;
    } else {
        loadScalerImage();
        }
    }

/* **********************************************
 *     interactive digilib functions
 * ******************************************** */
function renderMarks() {
    // make sure the image is loaded so we know its size
    if (defined(picElem.complete) && !picElem.complete && !browserType.isN4 ) {
        setTimeout("renderMarks()", 100);
        return;
            }
    // put the visible marks on the image
    dlTrafo = parseTrafo(picElem);
    // debugProps(dlArea, "dlArea");
    for (var i = 0; i < dlMarks.length; i++) {
    var div = document.getElementById("mark" + i) || createMarkDiv(i);
        var mark = dlMarks[i];
    // debugProps(mark, "mark");
    if (dlArea.containsPosition(mark)) {
        var mpos = dlTrafo.transform(mark); // FIX ME: transform does not change anything 
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
        unregisterEvent("mousedown", elemScaler, markEvent);
        addMark(evt);
        if ( defined(reload) && !reload ) {
            // don't redisplay
            renderMarks();
            return;
            }
        display();
        }
    
    // add a mark where clicked
    window.focus();
    // start event capturing
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
    var pt1, pt2;
    var zoomdiv = getElement("zoom");
    var overlay = getElement("overlay");
    // use overlay div to avoid <img> mousemove problems
    var rect = getElementRect(picElem);
    // FIX ME: is there a way to query the border width from CSS info?
    // rect.x -= 2; // account for overlay borders
    // rect.y -= 2;
    moveElement(overlay, rect);
    showElement(overlay, true);
    // start event capturing
    registerEvent("mousedown", overlay, zoomStart);
    registerEvent("mousedown", elemScaler, zoomStart);
    window.focus();

// mousedown handler: start moving
    function zoomStart(evt) {
        pt1 = evtPosition(evt);
        unregisterEvent("mousedown", overlay, zoomStart);
        unregisterEvent("mousedown", elemScaler, zoomStart);
        // unregisterEvent("mousedown", zoomdiv, zoomStart);
        // setup and show zoom div
        moveElement(zoomdiv, Rectangle(pt1.x, pt1.y, 0, 0));
        showElement(zoomdiv, true);
        // register move events
        registerEvent("mousemove", overlay, zoomMove);
        registerEvent("mousemove", zoomdiv, zoomMove);
        registerEvent("mousemove", elemScaler, zoomMove);
        // register up events for drag end
        registerEvent("mouseup", overlay, zoomEnd);
        registerEvent("mouseup", zoomdiv, zoomEnd);
        registerEvent("mouseup", elemScaler, zoomEnd);
        return stopEvent(evt);
        }
    
// mouseup handler: end moving
    function zoomEnd(evt) {
        pt2 = evtPosition(evt);
        // assume a click if the area is too small (up to 3 x 3 pixel)
        var clickArea = getRect(pt1, pt2).getArea();
        if (clickArea <= MIN_AREA_SIZE) return stopEvent(evt); 
        // hide zoom div
        showElement(zoomdiv, false);
        showElement(overlay, false);
        // unregister move events
        unregisterEvent("mousemove", overlay, zoomMove);
        unregisterEvent("mousemove", zoomdiv, zoomMove);
        unregisterEvent("mousemove", elemScaler, zoomMove);
        // unregister drag events
        unregisterEvent("mouseup", overlay, zoomEnd);
        unregisterEvent("mouseup", zoomdiv, zoomEnd);
        unregisterEvent("mouseup", elemScaler, zoomMove);
        // calc offsets
        var area = getRect(
            // FIX ME: liefert negative x/y Werte, wenn hmir/vmir=1
            dlTrafo.invtransform(pt1),
            dlTrafo.invtransform(pt2)
            );
        setParameter("wx", cropFloat(area.x));
        setParameter("wy", cropFloat(area.y));
        setParameter("ww", cropFloat(area.width));
        setParameter("wh", cropFloat(area.height));
        // parseArea(); // why?
        // zoomed is always fit
        setParameter("ws", 1);
        display();
        return stopEvent(evt);
        }
    
// mouse move handler
    function zoomMove(evt) {
        pt2 = evtPosition(evt);
        // update zoom div
        moveElement(zoomdiv, getRect(pt1, pt2));
        return stopEvent(evt);
        }
    
// get a rectangle from two points
    function getRect(p1, p2) {
        return new Rectangle(
            Math.min(p1.x, p2.x),
            Math.min(p1.y, p2.y),
            Math.abs(p1.x - p2.x),
            Math.abs(p1.y - p2.y)
            );
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
        unregisterEvent("mousedown", elemScaler, moveCenterEvent);
        // set parameters
        setParamFromArea(newarea);
        parseArea();
        display();
    }

    // starting event capture
    registerEvent("mousedown", elemScaler, moveCenterEvent);
}

function isFullArea(area) {
    if (!area) area = dlArea;
    return ((area.width == 1.0) && (area.height == 1.0));
    }

function canMove(movx, movy) {
    if (isFullArea()) return false;
    // debugProps(dlArea);
    return ((movx < 0) && (dlArea.x > 0))
        || ((movy < 0) && (dlArea.y > 0))
        || ((movx > 0) && (dlArea.x + dlArea.width < 1.0))
        || ((movy > 0) && (dlArea.y + dlArea.height < 1.0))
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
    var params = getAllParameters(PARAM_ALL & ~(PARAM_DPI | PARAM_PAGES)); // all without ddpi, pt
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
        if (hasFlag("q"+i)) return i;
        }
    return 1
    }

function setQuality(qual) {
    // set the image quality
    for (var i = 0; i < 3; i++) removeFlag("q" + i);
    if (qual > 2) return alert("Quality number not supported");
    addFlag("q" + i);
    setParameter("mo", getAllFlags());
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
    toggleFlag(dir == "h"
        ? "hmir"
        : "vmir"
        );
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
        display(PARAM_ALL & ~PARAM_MARK); // all, no mark
    } else {
        display(PARAM_FILE | PARAM_MODE | PARAM_PAGES); // fn, pn, ws, mo + pt
// FIX ME: currently the mirror status gets propagated to the other pages
// hmir and vmir should not be mode flags, but boolean params!!! 
    }
}

function gotoPageWin() {
    // dialog to ask for new page nr
    var pn = getParameter("pn");
    var gopage = window.prompt("Go to page", pn);
    if (gopage) gotoPage(gopage);
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
    // FIX ME: get rid of the dotted line around the buttons when focused
    }

function showAboutDiv(show) {
    // show or hide "about" div
    var elem = getElement("about");
    if (elem == null) {
        if (!show) return;
        alert("About Digilib - dialog missing in HTML code!"
            + "\nDigilib Version: " + digilibVersion
            + "\ndlLib Version: " + dllibVersion
            + "\nbaseLib Version: " + baseLibVersion);
        return;
        }
    document.getElementById("digilib-version").innerHTML = "Digilib Version: " + digilibVersion;
    document.getElementById("baselib-version").innerHTML = "baseLib Version: " + baseLibVersion;
    document.getElementById("dllib-version").innerHTML = "dlLib Version: " + dllibVersion;
    showElement(elem, show);
    }
    
function loadBirdImage() {
    var img = getElement("bird-image");
    var src = "../servlet/Scaler?" 
        + getQueryString(PARAM_FILE | PARAM_MODE)
        + "&dw=" + BIRD_MAXX 
        + "&dh=" + BIRD_MAXY;
    img.src = src;
    }
    
function showBirdDiv(show) {
    // show or hide "bird's eye" div
    var startPos; // anchor for dragging
    var newRect;  // position after drag
    var birdImg = getElement("bird-image");
    showElement(birdImg, show);
    var birdArea = getElement("bird-area");
    // dont show selector if area is full size
    if (!show || isFullArea()) {
        // hide area
        showElement(birdArea, false);
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
    showElement(birdArea, show);
    registerEvent("mousedown", birdArea, birdAreaStartDrag);

    function birdAreaStartDrag(evt) {
    // mousedown handler: start drag
        startPos = evtPosition(evt);
        registerEvent("mousemove", birdArea, birdAreaMove);
        registerEvent("mousemove", birdImg, birdAreaMove);
        registerEvent("mouseup",   birdArea, birdAreaEndDrag);
        registerEvent("mouseup",   birdImg, birdAreaEndDrag);
        
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
        unregisterEvent("mousemove", birdArea, birdAreaMove);
        unregisterEvent("mouseup",   birdArea, birdAreaEndDrag);
        unregisterEvent("mousemove", birdImg, birdAreaMove);
        unregisterEvent("mouseup",   birdImg, birdAreaEndDrag);
        setParameter("wx", cropFloat((newRect.x - birdImgRect.x) / birdImgRect.width));
        setParameter("wy", cropFloat((newRect.y - birdImgRect.y) / birdImgRect.height));
        // width and height parameters remain the same
        // setParameter("ww", cropFloat(newRect.width / birdImgRect.width));
        // setParameter("ww", cropFloat(newRect.height / birdImgRect.height));
        // parseArea(); // why?
        // zoomed is always fit
        setParameter("ws", 1);
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
    if (defined(picElem.complete) && !picElem.complete && !browserType.isN4 ) {
        setTimeout("showArrows()", 100);
        return;
        }
	var r = getElementRect(picElem);
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

