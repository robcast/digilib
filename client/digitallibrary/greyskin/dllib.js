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
  Robert Casties, 4.9.2009
  
  ! Requires baselib.js !
*/
digilibVersion = "Digilib NG";
dllibVersion = "2.041";

function identify() {
        // used for identifying a digilib instance
        // Relato uses that function - lugi
        return digilibVersion;
}

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
Marks.prototype.addEvent = function(evt, digilib) {
    // add a mark from a screen event
    if (!digilib) digilib = dl;
    var pos = digilib.trafo.invtransform(evtPosition(evt));
    this.push(pos);
}

/*
 * DLParameters -- digilib parameter class
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
	this.PARAM_CLIENT = 256;
	/* request parameters */
	with (this) {
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
	    // client side options
	    define('clop', '', PARAM_CLIENT);
	}
	return this;
}
DLParameters.prototype = new Parameters();
// move the inherited getAll because we need it later
DLParameters.prototype._getAll = Parameters.prototype.getAll;
DLParameters.prototype.getAll = function(paDetail, moDetail, digilib) {
	if (!digilib) digilib = dl;
	// get Flags and Marks first
    var mo = digilib.flags.getAll(moDetail);
    this.set("mo", mo);
    var clop = digilib.opts.getAll();
    this.set("clop", clop);
    var mk = digilib.marks.getAll();
    this.set("mk", mk);
    var ret = this._getAll(paDetail);
	return ret;
}

/*
 * DLModes -- digilib flags class
 */
function DLFlags() {
    // flags for mode sets
    this.MODE_QUAL = 1;
    this.MODE_SIZE = 2;
    this.MODE_MIR = 4;
    this.MODE_OTHER = 128;
    this.MODE_ALL = 255;
    /* mode flags */
    with (this) {
        define('q0', MODE_QUAL);
        define('q1', MODE_QUAL);
        define('q2', MODE_QUAL);
        define('fit',   MODE_SIZE);
        define('clip',  MODE_SIZE);
        define('osize', MODE_SIZE);
        define('vmir', MODE_MIR);
        define('hmir', MODE_MIR);
    }
    return this;
}
// inherits from Flags
DLFlags.prototype = new Flags();


/*
 * Digilib -- digilib base class
 */
function Digilib() {
    if (!baseLibVersion) alert("ERROR: baselib.js not loaded!");
    /* constants */
    this.MAX_AREA = new Rectangle(0.0, 0.0, 1.0, 1.0);
    // default inset (for scalerImg relativ to scalerDiv 
    this.INSET = 40; // because of scrollbars of main window and scaler [Firefox bug?]
    // mouse drag area that counts as one click 
    this.MIN_AREA_SIZE = 3 * 3 + 1;
    // standard zoom factor
    this.ZOOMFACTOR = Math.sqrt(2);
    // bird's eye view dimensions
    this.BIRD_MAXX = 200;
    this.BIRD_MAXY = 200;
    // witdh of arrow bars
    this.ARROW_WIDTH = 32;
    // width of calibration bar
    this.CALIBRATION_WIDTH = 64;
    /* variables */
    this.fitOnlyWidth = false;
    this.fitOnlyHeight = false;
    this.trafo = null;
    // page elements
    this.scalerDiv = null;
    this.scalerImg = null;
    this.buttons1Div = null;
    this.buttons2Div = null;
    /* parse parameters */
    this.params = new DLParameters();
    // put the query parameters (sans "?") in the parameters array
    this.params.parse(location.search.slice(1));
    // treat special parameters
    this.area = this.parseArea();
    this.marks = new Marks();
    this.marks.parse(this.params.get("mk"));
    this.flags = new DLFlags();
    this.flags.parse(this.params.get("mo"));
    this.opts = new Flags();
    this.opts.parse(this.params.get("clop"));
    return this;
}
Digilib.prototype.setDLParam = function(e, s, relative) {
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
        dl.params.set(nam, val, relative);
        display();
    } else {
        alert("ERROR: unable to process event!");
    }
    return true;
}
Digilib.prototype.parseArea = function() {
    // returns area Rectangle from current parameters
    return new Rectangle(
        this.params.get("wx"),
        this.params.get("wy"),
        this.params.get("ww"),
        this.params.get("wh"));
}
Digilib.prototype.setParamFromArea = function(rect) {
    // sets digilib wx etc. from rect
    this.params.set("wx", cropFloat(rect.x));
    this.params.set("wy", cropFloat(rect.y));
    this.params.set("ww", cropFloat(rect.width));
    this.params.set("wh", cropFloat(rect.height));
    return true;
}

Digilib.prototype.parseTrafo = function(elem) {
    // returns Transform from current dlArea and picsize
    var picsize = getElementRect(elem);
    var trafo = new Transform();
    // subtract area offset and size
    trafo.concat(trafo.getTranslation(new Position(-this.area.x, -this.area.y)));
    trafo.concat(trafo.getScale(new Size(1/this.area.width, 1/this.area.height)));
    // scale to screen size
    trafo.concat(trafo.getScale(picsize));
    trafo.concat(trafo.getTranslation(picsize));
    // FIX ME: Robert, kannst Du mal nachsehen, ob das folgende tut, was es soll?
    // oder gibt es dafuer neuen Code? -- ROC: Bisher funktioniert es nicht!
    // rotate
    //var rot = getRotation(- dl.params.get("rot"), new Position(0.5*picsize.width, 0.5*picsize.height));
    //trafo.concat(rot);
    // mirror
    //if (hasFlag("hmir")) trafo.m00 = - trafo.m00; // ??
    //if (hasFlag("vmir")) trafo.m11 = - trafo.m11; // ??
    return trafo;
}

Digilib.prototype.onLoad = function() {
    // initialize digilib; called by body.onload
    this.scalerDiv = getElement("scaler", true);
    this.scalerImg = getElement("pic", true);
    this.buttons1Div = getElement("buttons", true);
    this.buttons2Div = getElement("options", true);
    /*
     * if (this.scalerImg == null && this.scalerDiv) { // in N4 pic is in the
     * scaler layer this.scalerImg = this.scalerDiv.document.images[0]; }
     */
    if ((!this.scalerImg)||(!this.scalerDiv)) {
        alert("Sorry, digilib doesn't work here!");
        return false;
    }
    // fix fixed menus
    var ms1 = getElementSize(this.buttons1Div);
    var ms2 = getElementSize(this.buttons2Div);
    var maxh = (ms1.height > ms2.height) ? ms1.height : ms2.height;
    var wins = getWinSize();
    if ((wins.height <= maxh) || (browserType.isIE && (browserType.versIE < 7))) {
        // unlock fixed menus to absolute if window is too small or IE
        this.buttons1Div.style.position = "absolute";
        this.buttons2Div.style.position = "absolute";
    }
    this.setScalerImage();	// setzt auch onImgLoad
    this.setBirdImage();	// laedt das Bird's Eye Bild
}

Digilib.prototype.setScalerImage = function() {
    // set the scaler image source (needs the browser size)
    var picsize = bestPicSize(this.scalerDiv);
    var menusize = getElementSize(this.buttons1Div);
    // subtract menu width
    picsize.width -= menusize.width;
    picsize.height -= this.INSET;
    // compose Scaler URL
    var src = "../servlet/Scaler?" 
        + this.params.getAll(this.params.PARAM_ALL & ~(this.params.PARAM_MARK | this.params.PARAM_PAGES));
    if (this.opts.get('fitwidth')) {
        src += "&dw=" + picsize.width;
    } else if (this.opts.get('fitheight')) {
        src += "&dh=" + picsize.height;
    } else {
        src += "&dw=" + picsize.width + "&dh=" + picsize.height;
    }
    // debug(src);
    this.scalerImg.onload = onImgLoad;
    this.scalerImg.src = src;

    var digilib = this;
    // this is a local callback function that can use the current scope

    function onImgLoad() {
        if (! digilib)
            return;
        // make sure the image is loaded so we know its size
        /* this test seems to have problems sometimes :-(
	    if (defined(digilib.scalerImg.complete) && !digilib.scalerImg.complete) {
			alert("ERROR: the image seems not to be complete in onImgLoad!?");
		} */
        digilib.trafo = digilib.parseTrafo(digilib.scalerImg);
        // display marks
        digilib.renderMarks();
        digilib.showBirdDiv(isBirdDivVisible);
        digilib.showArrows();		// show arrow overlays for zoom navigation
        //digilib.moveCenter(true);	// click to move point to center
        // new Slider("sizes", 1, 5, 2);
        
        //Drag Image (6.9.2009, not yet working)
        //registerEvent("mousedown", digilib.scalerDiv, dragImage);

        focus();
    }
}

Digilib.prototype.renderMarks = function() {
    // make sure the image is loaded so we know its size
    if (!this.trafo) {
        alert("ERROR: trafo missing, cannot render marks!");
        return;
    }
    // debugProps(dlArea, "dlArea");
    for (var i = 0; i < this.marks.length; i++) {
        var div = getElement("mark" + i, true) || createMarkDiv(i);
        var mark = this.marks[i];
        // debugProps(mark, "mark");
        if (this.area.containsPosition(mark)) {
            var mpos = this.trafo.transform(mark);
            // debugProps(mark, "mpos");
            // better not hide the marked spot (MR)
            // suboptimal to place -5 pixels and not half size of mark-image
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

Digilib.prototype.display = function(detail, moDetail) {
    // redisplay the page
    var queryString = this.params.getAll(detail, moDetail);
	location.href
        = location.protocol + "//"
    	    + location.host
    	    + location.pathname
        + "?" + queryString;
}

/* **********************************************
 *     interactive digilib functions
 * ******************************************** */

Digilib.prototype.setMark = function() {
    // add a mark where clicked
    window.focus();
    this.moveCenter(false);
    
    // start event capturing
    registerEvent("mousedown", this.scalerDiv, markEvent);

    // our own reference to this for the local function
    var digilib = this;
	
    function markEvent(evt) {
    // event handler adding a new mark
        unregisterEvent("mousedown", digilib.scalerDiv, markEvent);
        digilib.marks.addEvent(evt);
        digilib.display();
        return stopEvent(evt);
    }
    
}

Digilib.prototype.removeMark = function() {
    // remove the last mark
    this.marks.pop();
    this.display();
}

Digilib.prototype.resetImage = function() {
    // reset the image to its original state
    this.display(this.params.PARAM_FILE); // keep only fn/pn
}

Digilib.prototype.dragImage = function(evt) {
    // drag the image and load a new detail on mouse up
    // makes sense only when zoomed
    if (this.isFullArea())
        return;
    var startPos = evtPosition(evt);
    var picRect = getElementRect(this.scalerImg);
    var newRect;  // position after drag
    // start event capturing
    registerEvent("mousemove", document, moveDragEvent);
    registerEvent("mouseup", document, moveEndEvent);
    window.focus();
    
	// our own reference to this for the local function
	var digilib = this;

	function moveDragEvent(evt) {
    // mousemove handler: drag
        var pos = evtPosition(evt);
        var dx = pos.x - startPos.x;
        var dy = pos.y - startPos.y;
        // move scalerImg div
        newRect = new Rectangle(
            picRect.x + dx,
            picRect.y + dy,
            picRect.width,
            picRect.height);
        // move scalerImg to new position
        moveElement(this.scalerImg, newRect);
        return stopEvent(evt);
	    }

	function moveEndEvent(evt) {
    // mouseup handler: reload page
        unregisterEvent("mousemove", document, moveDragEvent);
        unregisterEvent("mouseup", document, moveEndEvent);
        if (newRect == null) { // no movement happened
            return stopEvent(evt);
            }
        var newX = cropFloat(newRect.x - picRect.x);
        var newY = cropFloat(newRect.y - picRect.y);
        // if (newX < 0) newX = 0; 
        // if (newY < 0) newY = 0; 
        digilib.params.set("wx", newX);
        digilib.params.set("wy", newY);
        // zoomed is always fit
        // digilib.params.set("ws", 1);
        digilib.display();
        return stopEvent(evt);
    }
}

Digilib.prototype.zoomArea = function() {
    var pt1, pt2;
    var zoomdiv = getElement("zoom");
    var overlay = getElement("overlay");
    // use overlay div to avoid <img> mousemove problems
    var picRect = getElementRect(this.scalerImg);
    // FIX ME: is there a way to query the border width from CSS info?
    // rect.x -= 2; // account for overlay borders
    // rect.y -= 2;
    moveElement(overlay, picRect);
    showElement(overlay, true);
    // start event capturing
    registerEvent("mousedown", overlay, zoomStart);
    registerEvent("mousedown", this.scalerImg, zoomStart);
    window.focus();

    // our own reference to "this" for the local functions
    var digilib = this;
	
    // mousedown handler: start moving
    function zoomStart(evt) {
        pt1 = evtPosition(evt);
        unregisterEvent("mousedown", overlay, zoomStart);
        unregisterEvent("mousedown", digilib.scalerImg, zoomStart);
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
        if (clickRect.getArea() <= digilib.MIN_AREA_SIZE) {
            return stopEvent(evt);
        }
        // hide zoom div
        showElement(zoomdiv, false);
        showElement(overlay, false);
        // unregister events
        unregisterEvent("mousemove", document, zoomMove);
        unregisterEvent("mouseup", document, zoomEnd);
        // clip and transform
        clickRect.clipTo(picRect);
        var area = digilib.trafo.invtransform(clickRect);
        digilib.setParamFromArea(area);
        // zoomed is always fit
        digilib.params.set("ws", 1);
        digilib.display();
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

Digilib.prototype.zoomBy = function(factor) {
    // zooms by the given factor
    var newarea = this.area.copy();
    newarea.width /= factor;
    newarea.height /= factor;
    newarea.x -= 0.5 * (newarea.width - this.area.width);
    newarea.y -= 0.5 * (newarea.height - this.area.height);
    newarea = this.MAX_AREA.fit(newarea);
    this.setParamFromArea(newarea);
    this.display();
}


Digilib.prototype.zoomFullpage = function(fit) {
    // zooms out to show the whole image
    this.params.set("wx", 0.0);
    this.params.set("wy", 0.0);
    this.params.set("ww", 1.0);
    this.params.set("wh", 1.0);
    if (fit == "width") {
    		this.opts.set('fitwidth');
    	} else if (fit == "height") {
    		this.opts.set('fitheight');
    	} else {
    		this.opts.reset('fitwidth');
    		this.opts.reset('fitheight');
	}
    this.display();
}


Digilib.prototype.moveCenter = function(on) {
    // move visible area so that it's centered around the clicked point
    if (this.isFullArea()) return; // nothing to do
    // starting event capture
    if (on) registerEvent("mousedown", this.scalerImg, moveCenterEvent);
    else  unregisterEvent("mousedown", this.scalerImg, moveCenterEvent);
    window.focus();
    
	// our own reference to this for the local function
	var digilib = this;

	function moveCenterEvent(evt) {
	    // move to handler
	    var pt = digilib.trafo.invtransform(evtPosition(evt));
	    var newarea = digilib.area.copy();
		newarea.setCenter(pt);
	    newarea.stayInside(this.MAX_AREA);
	    // newarea = dlMaxArea.fit(newarea);
	    // debugProps(newarea, "newarea");
	    // debugProps(dlArea, "dlArea");
	    if (newarea.equals(digilib.area)) return; // keep event handler
	    unregisterEvent("mousedown", digilib.scalerImg, moveCenterEvent);
	    // set parameters
	    digilib.setParamFromArea(newarea);
		digilib.display();
	}
}

Digilib.prototype.isFullArea = function(area) {
    if (!area) area = this.area;
    return (area.width == 1.0) && (area.height == 1.0);
}

Digilib.prototype.canMove = function(movx, movy) {
    if (this.isFullArea()) return false;
    var x2 = this.area.x + this.area.width;
    var y2 = this.area.y + this.area.height;
    // debugProps(dlArea);
    return ((movx < 0) && (this.area.x > 0))
    	|| ((movx > 0) && (x2 < 1.0))
	|| ((movy < 0) && (this.area.y > 0))
    	|| ((movy > 0) && (y2 < 1.0))
}

Digilib.prototype.moveBy = function(movx, movy) {
    // move visible area by movx and movy (in units of ww, wh)
    if (!this.canMove(movx, movy)) return; // nothing to do
    var newarea = this.area.copy();
    newarea.x += parseFloat(movx)*this.area.width;
    newarea.y += parseFloat(movy)*this.area.height;
    newarea = this.MAX_AREA.fit(newarea);
    // set parameters
    this.setParamFromArea(newarea);
    this.display();
}

Digilib.prototype.getRef = function(baseUrl) {
    // returns a reference to the current digilib set
    if (!baseUrl) baseUrl 
        = location.protocol
        + "//" 
        + location.host
        + location.pathname;
    var hyperlinkRef = baseUrl;
    with (this.params) {
    		// all without ddpi, pt
    		var ps = getAll(PARAM_ALL & ~(PARAM_DPI | PARAM_PAGES | PARAM_CLIENT)); 
    	}
    if (ps.length > 0) hyperlinkRef += "?" + ps;
    return hyperlinkRef;
}

Digilib.prototype.getRefWin = function(type, msg) {
    // shows an alert with a reference to the current digilib set
    if (! msg) msg = "URL reference to the current view";
    prompt(msg, this.getRef());
}

Digilib.prototype.getQuality = function() {
    // returns the current q setting
    for (var i = 0; i < 3; i++) {
        if (this.flags.get("q"+i)) return i;
    }
    return 1
}

Digilib.prototype.setQuality = function(qual) {
    // set the image quality
    if ((qual < 0)||(qual > 2)) return alert("Quality setting not supported");
    for (var i = 0; i < 3; i++) this.flags.reset("q" + i);
    this.flags.set("q" + qual);
    this.display();
}

Digilib.prototype.setQualityWin = function(msg) {
    // dialog for setting quality
    if (! msg) msg = "Quality (0..2)";
    var q = this.getQuality();
    var newq = window.prompt(msg, q);
    if (newq) this.setQuality(newq);
}

Digilib.prototype.mirror = function(dir) {
    // mirror the image horizontally or vertically
    if (dir == "h") {
    		this.flags.toggle("hmir");
    	} else {
    		this.flags.toggle("vmir");
	}
    this.display();
}

Digilib.prototype.gotoPage = function(gopage, keep) {
    // goto given page nr (+/-: relative)
    var oldpn = parseInt(this.params.get("pn"));
    // set with relative=true uses the sign
    this.params.set("pn", gopage, true);
    // now check the outcome
    var pn = parseInt(this.params.get("pn"));
    if (pn < 1) {
        alert("No such page! (Page number too low)");
        this.params.set("pn", oldpn);
        return;
    }
    if (this.params.isSet("pt")) {
        pt = parseInt(this.params.get("pt"))
        if (pn > pt) {
            alert("No such page! (Page number too high)");
            this.params.set("pn", oldpn);
            return;
        }
    }
    if (keep) {
        this.display(this.params.PARAM_ALL & ~this.params.PARAM_MARK); // all, no mark
    } else {
        this.display(this.params.PARAM_FILE | this.params.PARAM_MODE | this.params.PARAM_PAGES, this.params.MODE_QUAL | this.params.MODE_OTHER); // fn, pn, ws, mo + pt
    }
}

Digilib.prototype.gotoPageWin = function() {
    // dialog to ask for new page nr
    var pn = this.params.get("pn");
    var gopage = window.prompt("Go to page", pn);
    if (gopage) this.gotoPage(gopage);
}

Digilib.prototype.setParamWin = function(param, text, relative) {
    // dialog to ask for new parameter value
    var val = this.params.get(param);
    var newval = window.prompt(text, val);
    if (newval) {
        this.params.set(param, newval, relative);
        this.display();
    }
}

Digilib.prototype.showOptions = function(show) {
    // show or hide option div
    var elem = getElement("dloptions");
    showElement(elem, show);
    // FIX ME: get rid of the dotted line around the buttons when focused
    }

Digilib.prototype.showAboutDiv = function(show) {
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
    
Digilib.prototype.setBirdImage = function() {
    var img = getElement("bird-image");
    var src = "../servlet/Scaler?" 
        + this.params.getAll(this.params.PARAM_FILE)
        + "&dw=" + this.BIRD_MAXX 
        + "&dh=" + this.BIRD_MAXY;
    img.src = src;
}
    
Digilib.prototype.showBirdDiv = function(show) {
    // show or hide "bird's eye" div
    var startPos; // anchor for dragging
    var newRect;  // position after drag
    var birdImg = getElement("bird-image");
    var birdArea = getElement("bird-area");
    var overlay = getElement("bird-overlay");
    showElement(birdImg, show);
    // dont show selector if area has full size
    if (!show || this.isFullArea()) {
        // hide area
        showElement(birdArea, false);
        showElement(overlay, false);
        return;
    };
    var birdImgRect = getElementRect(birdImg);
    var area = this.area;
    if (this.flags.get("osize") || this.flags.get("clip")) {
    		// in original-size and pixel-by-pixel mode the area size is not valid
    		var birdAreaRect = new Rectangle(
        		birdImgRect.x + birdImgRect.width  * area.x,
        		birdImgRect.y + birdImgRect.height * area.y, 
        		5, 
        		5);
    } else {
    		// scale area down to img size
    		var birdAreaRect = new Rectangle(
        		// what about borders ??
        		birdImgRect.x + birdImgRect.width  * area.x,
	        birdImgRect.y + birdImgRect.height * area.y,
	        birdImgRect.width  * area.width,
	        birdImgRect.height * area.height);
	}
    moveElement(birdArea, birdAreaRect);
    showElement(birdArea, true);
    moveElement(overlay, birdImgRect);
    showElement(overlay, true);
    registerEvent("mousedown", overlay, birdAreaStartDrag);
    registerEvent("mousedown", birdImg, birdAreaStartDrag);

	// our own reference to this for local functions
	var digilib = this;

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
        digilib.params.set("wx", cropFloat((newRect.x - birdImgRect.x) / birdImgRect.width));
        digilib.params.set("wy", cropFloat((newRect.y - birdImgRect.y) / birdImgRect.height));
        // zoomed is always fit
        digilib.params.set("ws", 1);
        digilib.display();
        return stopEvent(evt);
    }
}

Digilib.prototype.showArrow = function(name, rect, show) {
    var arrow = getElement(name);
    moveElement(arrow, rect);
    showElement(arrow, show);
}
	
Digilib.prototype.showArrows = function() {
    // show the 4 arrow bars on top of scaler img according to current dlArea
    var r = getElementRect(this.scalerImg);
    this.showArrow('up',
        new Rectangle(r.x, r.y, r.width, this.ARROW_WIDTH), 
        this.canMove(0, -1)
        );
    this.showArrow('down',
        new Rectangle(r.x, r.y + r.height - this.ARROW_WIDTH, r.width, this.ARROW_WIDTH),
        this.canMove(0, 1)
        );
    this.showArrow('left',
        new Rectangle(r.x, r.y, this.ARROW_WIDTH, r.height),
        this.canMove(-1, 0)
        );
    this.showArrow('right',
        new Rectangle(r.x + r.width - this.ARROW_WIDTH, r.y, this.ARROW_WIDTH, r.height),
        this.canMove(1, 0)
        );
	}

Digilib.prototype.calibrate = function() {
    // calibrate screen resolution
    var calDiv = getElement("calibration");
    var calRect = getElementRect(calDiv);
    moveCenter(false);
    var wins = getWinSize();
    calRect.setCenter(new Position(wins.width / 2, wins.height / 2));
    moveElement(calDiv, calRect);
    showElement(calDiv, true);
    var cm = window.prompt("The length of the scale on your screen in centimeter:");
    if (cm) {
    		var dpi = calRect.width / parseFloat(cm) * 2.54;
    		this.params.set("ddpi", cropFloat(dpi));
    	}
    	showElement(calDiv, false);
}


Digilib.prototype.setScale = function(scale) {
	// sets original-size, pixel-by-pixel or fit-to-screen scale type
	if (scale == "pixel") {
		// pixel by pixel
		this.flags.set("clip");
		this.flags.reset("osize");
		this.flags.reset("fit");
	} else if (scale == "original") {
		// original size -- needs calibrated screen
        if (!this.params.isSet("ddpi")) {
        		var dpi = cookie.get("ddpi");
	        if (dpi == null) {
    		        alert("Your screen has not yet been calibrated - using default value of 72 dpi");
            		dpi = 72;
            	}
        		this.params.set("ddpi", dpi);
        	}
        this.flags.set("osize");
        this.flags.reset("clip");
		this.flags.reset("fit");
    } else {
    		// scale to screen size (default)
    		this.flags.reset("clip");
    		this.flags.reset("osize");
    	}
    this.display();
}

Digilib.prototype.getScale = function() {
	// returns scale type
	if (this.flags.get("clip")) {
		return "pixel";
	} else if (this.flags.get("osize")) {
		return "original";
	} else {
		return "fit";
	}
}	

Digilib.prototype.pageWidth = function() {
	this.zoomFullpage('width');
}

Digilib.prototype.setSize = function(factor) {
    this.params.set("ws", factor);
    this.display();
}

Digilib.prototype.showMenu = function(menuId, buttonId, show) {
    var menu = getElement(menuId);
    if (show) {
        // align right side of menu with button
        var buttonPos = getElementPosition(getElement(buttonId));
        var menusize = getElementSize(menu);
        moveElement(menu, new Position(buttonPos.x - menusize.width - 3, buttonPos.y));
        }
    showElement(menu, show);
}


/********************************
 * global variables
 ********************************/

var dl = new Digilib();

/* old parameter function compatibility stuff */
function newParameter(a,b,c) {return dl.params.define(a,b,c)};
function resetParameter(a) {return dl.params.reset(a)};
function deleteParameter(a) {return dl.params.remove(a)};
function getParameter(a) {return dl.params.get(a)};
function setParameter(a,b,c) {return dl.params.set(a,b,c)};
function hasParameter(a) {return dl.params.isSet(a)};
function getAllParameters(a) {return dl.params.getAll(a)};
getQueryString = getAllParameters;
function parseParameters(a) {return dl.params.parse(a)};
function getAllMarks() {return dl.marks.getAll()};
getMarksQueryString = getAllMarks;
function addMark(evt) {return dl.marks.addEvent(evt)};
function deleteMark() {return dl.marks.pop()};
function deleteAllMarks() {return dl.marks = new Marks()};
function hasFlag(mode) {return dl.flags.get(mode)};
function addFlag(mode) {return dl.flags.set(mode)};
function removeFlag(mode) {return dl.flags.reset(mode)};
function toggleFlag(mode) {return dl.flags.toggle(mode)};
function getAllFlags() {return dl.flags.getAll()};
/* old digilib function compatibility */
function setDLParam(e, s, relative) {dl.setDLParam(e, s, relative)};
function display(detail, moDetail) {dl.display(detail, moDetail)};
function setMark(reload) {dl.setMark(reload)};
function removeMark(reload) {dl.removeMark(reload)};
function resetImage() {dl.resetImage()};
function dragImage(evt) {dl.dragImage(evt)};
function zoomArea() {dl.zoomArea()};
function zoomBy(factor) {dl.zoomBy(factor)};
function zoomFullpage(a) {dl.zoomFullpage(a)};
function moveCenter(on) {dl.moveCenter(on)};
function isFullArea(area) {dl.isFullArea(area)};
function canMove(movx, movy) {dl.canMove(movx, movy)};
function moveBy(movx, movy) {dl.moveBy(movx, movy)};
function getRef(baseURL) {dl.getRef(baseURL)};
function getRefWin(type, msg) {dl.getRefWin(type, msg)};
function getQuality() {dl.getQuality()};
function setQuality(qual) {dl.setQuality(qual)};
function setQualityWin(msg) {dl.setQualityWin(msg)};
function mirror(dir) {dl.mirror(dir)};
function gotoPage(gopage, keep) {dl.gotoPage(gopage, keep)};
function gotoPageWin() {dl.gotoPageWin()};
function setParamWin(param, text, relative) {dl.setParamWin(param, text, relative)};
function showOptions(show) {dl.showOptions(show)};
function showBirdDiv(show) {dl.showBirdDiv(show)};
function showAboutDiv(show) {dl.showAboutDiv(show)};
function calibrate(direction) {dl.calibrate(direction)};
function setScale(a) {dl.setScale(a)};
function getScale(a) {dl.getScale(a)};
function originalSize(on) {dl.originalSize(on)};
function pixelByPixel(on) {dl.pixelByPixel(on)};
function pageWidth() {dl.pageWidth()};
function setSize(factor) {dl.setSize(factor)};
function showMenu(a,b,c) {dl.showMenu(a,b,c)};


// :tabSize=4:indentSize=4:noTabs=true:

