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
  Robert Casties, 2.11.2004

*/

function base_init() {
    // init function
    baseScriptVersion = "1.1b";
    dlParams = new Object();
    browserType = getBrowserType();
}


function getInt(n) {
    // returns always an integer
    n = parseInt(n);
    if (isNaN(n)) return 0;
    return n;
}

function defined(x) {
    // returns if x is defined
    return (typeof arguments[0] != "undefined");
}

function cropFloat(x) {
    // auxiliary function to crop senseless precision
    return parseInt(10000*x)/10000;
}

function getBrowserType() {
    // browser sniffer
    var bt = Object();
    bt.doDHTML = false;
    bt.versIE = 0;

    if ((! document.cssonly && document.layers) || document.all || document.getElementById) {
	var vers = navigator.appVersion.split('MSIE ');
	vers = vers[vers.length - 1];
	bt.versIE = getInt(vers);
	bt.isIE = navigator.userAgent.indexOf('MSIE') >= 0;
	bt.isMac = navigator.platform.indexOf('Mac') >= 0;
	bt.isWin = navigator.platform.indexOf('Win') >= 0;
	bt.isN4 = (navigator.userAgent.indexOf('Mozilla/4.') >= 0) && ! bt.isIE;
	bt.isIEWin = bt.versIE > 0 && bt.isWin;
	if (navigator.appVersion.indexOf('MSIE') < 0 || ! bt.isMac || bt.versIE >= 5) {
	    bt.doDHTML = true;
	    bt.isOpera = navigator.userAgent.indexOf(' Opera ') >= 0;
	    bt.isKonq = navigator.userAgent.indexOf(' Konqueror') >= 0;
	}
    }
    return bt;
}

// fixes for javascript < 1.2
if (! Array.prototype.push) {
    Array.prototype.push = function(val) {
	this[this.length] = val;
	return this.length;
    }
    Array.prototype.pop = function() {
	var val = this[this.length-1];
	this.length -= 1;
	return val;
    }
}


/* **********************************************
 *     geometry classes
 * ******************************************** */

/*
 * Size class
 */
function Size(w, h) {
    this.width = parseFloat(w);
    this.height = parseFloat(h);
    return this;
}
Size.prototype.toString = function() {
    return this.width + "x" + this.height;
}


/*
 * Position class
 */
function Position(x, y) {
    this.x = parseFloat(x);
    this.y = parseFloat(y);
    return this;
}
Position.prototype.toString = function() {
    return this.x + "," + this.y;
}

/*
 * Rectangle class
 */
function Rectangle(x, y, w, h) {
    this.x = parseFloat(x);
    this.y = parseFloat(y);
    this.width = parseFloat(w);
    this.height = parseFloat(h);
    return this;
}
Rectangle.prototype.toString = function() {
    return this.width+"x"+this.height+"@"+this.x+","+this.y;
}
Rectangle.prototype.copy = function() {
    // returns a copy of this Rectangle
    return new Rectangle(this.x, this.y, this.width, this.height);
}
Rectangle.prototype.getPosition = function() {
    // returns the position of this Rectangle
    return new Position(this.x, this.y);
}
Rectangle.prototype.getSize = function() {
    // returns the size of this Rectangle
    return new Size(this.width, this.height);
}
Rectangle.prototype.getArea = function() {
    // returns the area of this Rectangle
    return (this.width * this.height);
}
Rectangle.prototype.containsPosition = function(pos) {
    // returns if the given Position lies in this Rectangle
    return ((pos.x >= this.x)&&(pos.y >= this.y)&&(pos.x <= this.x+this.width)&&(pos.y <= this.y+this.width));
}
Rectangle.prototype.intersect = function(rect) {
    // returns the intersection of the given Rectangle and this one
    var sec = rect.copy();
    if (sec.x < this.x) {
	sec.width = sec.width - (this.x - sec.x);
	sec.x = this.x;
    }
    if (sec.y < this.y) {
	sec.height = sec.height - (this.y - sec.y);
	sec.y = this.y;
    }
    if (sec.x + sec.width > this.x + this.width) {
	sec.width = (this.x + this.width) - sec.x;
    }
    if (sec.y + sec.height > this.y + this.height) {
	sec.height = (this.y + this.height) - sec.y;
    }
    return sec;
}
Rectangle.prototype.fit = function(rect) {
    // returns a Rectangle that fits into this one (by moving first)
    var sec = rect.copy();
    sec.x = Math.max(sec.x, this.x);
    sec.x = Math.max(sec.x, this.x);
    if (sec.x + sec.width > this.x + this.width) {
	sec.x = this.x + this.width - sec.width;
    }
    if (sec.y + sec.height > this.y + this.height) {
	sec.y = this.y + this.height - sec.height;
    }
    return sec.intersect(this);
}

/*
 * Transform class
 *
 * defines a class of affine transformations
 */
function Transform() {
    this.m00 = 1.0;
    this.m01 = 0.0;
    this.m02 = 0.0;
    this.m10 = 0.0;
    this.m11 = 1.0;
    this.m12 = 0.0;
    this.m20 = 0.0;
    this.m21 = 0.0;
    this.m22 = 1.0;
    return this;
}
Transform.prototype.concat = function(traf) {
    // add Transform traf to this Transform
    for (var i = 0; i < 3; i++) {
	for (var j = 0; j < 3; j++) {
	    var c = 0.0;
	    for (var k = 0; k < 3; k++) {
		c += traf["m"+i+k] * this["m"+k+j];
	    }
	    this["m"+i+j] = c;
	}
    }
    return this;
}
Transform.prototype.transform = function(rect) {
    // returns transformed Rectangle or Position with this Transform applied
    var x = this.m00 * rect.x + this.m01 * rect.y + this.m02;
    var y = this.m10 * rect.x + this.m11 * rect.y + this.m12;
    if (rect.width) {
	var width = this.m00 * rect.width + this.m01 * rect.height;
	var height = this.m10 * rect.width + this.m11 * rect.height;
	return new Rectangle(x, y, width, height);
    }
    return new Position(x, y);
}
Transform.prototype.invtransform = function(pos) {
    // returns transformed Position pos with the inverse of this Transform applied
    var det = this.m00 * this.m11 - this.m01 * this.m10;
    var x = (this.m11 * pos.x - this.m01 * pos.y - this.m11 * this.m02 + this.m01 * this.m12) / det;
    var y = (- this.m10 * pos.x + this.m00 * pos.y + this.m10 * this.m02 - this.m00 * this.m12) / det;
    return new Position(x, y);
}
function getRotation(angle, pos) {
    // returns a Transform that is a rotation by angle degrees around [pos.x, pos.y]
    var traf = new Transform();
    if (angle != 0) {
	var t = 2.0 * Math.PI * parseFloat(angle) / 360.0;
	traf.m00 = Math.cos(t);
	traf.m01 = - Math.sin(t);
	traf.m10 = Math.sin(t);
	traf.m11 = Math.cos(t);
	traf.m02 = pos.x - pos.x * Math.cos(t) + pos.y * Math.sin(t);
	traf.m12 = pos.y - pos.x * Math.sin(t) - pos.y * Math.cos(t);
    }
    return traf;
}
function getTranslation(pos) {
    // returns a Transform that is a translation by [pos.x, pos,y]
    var traf = new Transform();
    traf.m02 = pos.x;
    traf.m12 = pos.y;
    return traf;
}
function getScale(size) {
    // returns a Transform that is a scale by [size.width, size.height]
    var traf = new Transform();
    traf.m00 = size.width;
    traf.m11 = size.height;
    return traf;
}


/* **********************************************
 *     parameter routines
 * ******************************************** */

function newParameter(name, defaultValue, detail) {
    // create a new parameter with a name and a default value
    if (defined(dlParams[name])) {
	alert("Fatal: An object with name '" + name + "' already exists - cannot recreate!");
	return false;
    } else {
	dlParams[name] = new Object();
	dlParams[name].defaultValue = defaultValue;
	dlParams[name].hasValue = false;
	dlParams[name].value = defaultValue;
	dlParams[name].detail = detail;
	return dlParams[name];
    }
}

function getParameter(name) {
    // returns the named parameter value or its default value
    if (defined(dlParams) && defined(dlParams[name])) {
	if (dlParams[name].hasValue) {
	    return dlParams[name].value;
	} else {
	    return dlParams[name].defaultValue;
	}
    } else {
	return null;
    }
}

function setParameter(name, value) {
    // sets parameter value
    if (defined(dlParams[name])) {
	dlParams[name].value = value;
	dlParams[name].hasValue = true;
	return true;
    }
    return false;
}

function hasParameter(name) {
    // returns if the parameter's value has been set
    if (defined(dlParams[name])) {
	return dlParams[name].hasValue;
    }
    return false;
}

function getAllParameters(detail) {
    // returns a string of all parameters in query format
    if (! detail) {
	detail = 10;
    }
    var params = new Array();
    for ( param in dlParams ) {
	if ((dlParams[param].detail <= detail)&&(dlParams[param].hasValue)) {
	    var val = getParameter(param);
	    if (val != "") {
		params.push(param + "=" + val);
	    }
	}
    }
    return params.join("&");
}

function parseParameters(query) {
    // gets parameter values from query format string
    var params = query.split("&");
    for (var i = 0; i < params.length; i++) {
	var keyval = params[i].split("=");
	if (keyval.length == 2) {
	    setParameter(keyval[0], keyval[1]);
	}
    }
}


/* **********************************************
 *     HTML/DOM routines
 * ******************************************** */

function getElement(tagid, quiet) {
    // returns the element object with the id tagid
    var e;
    if (document.getElementById) {
	e = document.getElementById(tagid);
    } else if (document.all) {
	alert("document.all!");
	e = document.all[tagid];
    } else if (document.layers) {
        e = document.layers[tagid];
    } 
    if (e) {
	return e;
    } else {
	if (! quiet) {
	    alert("unable to find element: "+tagid);
	}
	return null;
    }
}

function getElementPosition(elem) {
    // returns a Position with the position of the element
    var x = 0;
    var y = 0;
    if (defined(elem.offsetLeft)) {
	var e = elem;
	while (e) {
	    if (defined(e.clientLeft)) {
		// special for IE
		if (browserType.isMac) {
		    if (e.offsetParent.tagName == "BODY") {
			// IE for Mac extraspecial
			x += e.clientLeft;
			y += e.clientTop;
			break;
		    }
		} else {
		    if ((e.tagName != "TABLE") && (e.tagName != "BODY")) {
			x += e.clientLeft;
			y += e.clientTop;
		    }
		}
	    }
	    x += e.offsetLeft;
	    y += e.offsetTop;
	    e = e.offsetParent;
	}
    } else if (defined(elem.x)) {
	x = elem.x;
	y = elem.y;
    } else if (defined(elem.pageX)) {
	x = elem.pageX;
	y = elem.pageY;
    } else {
	alert("unable to get position of "+elem+" (id:"+elem.id+")");
    }
    return new Position(getInt(x), getInt(y));
}

function getElementSize(elem) {
    // returns a Rectangle with the size of the element
    var width = 0;
    var height = 0;
    if (defined(elem.offsetWidth)) {
	width = elem.offsetWidth;
	height = elem.offsetHeight;
    } else if (defined(elem.width)) {
	width = elem.width;
	height = elem.height;
    } else if (defined(elem.clip.width)) {
	width = elem.clip.width;
	height = elem.clip.height;
    } else {
	alert("unable to get size of "+elem+" (id:"+elem.id+")");
    }
    return new Size(getInt(width), getInt(height));
}

function getElementRect(elem) {
    // returns a Rectangle with the size and position of the element
    var pos = getElementPosition(elem);
    var size = getElementSize(elem);
    return new Rectangle(pos.x, pos.y, size.width, size.height);
}



function moveElement(elem, rect) {
    // moves and sizes the element
    if (elem.style) {
	if (defined(rect.x)) {
	    elem.style.left = Math.round(rect.x) + "px";
	    elem.style.top = Math.round(rect.y) + "px";
	}
	if (defined(rect.width)) {
	    elem.style.width = Math.round(rect.width) + "px";
	    elem.style.height = Math.round(rect.height) + "px";
	}
    } else if (document.layers) {
	if (defined(rect.x)) {
	    elem.pageX = getInt(rect.x);
	    elem.pageY = getInt(rect.y);
	}
	if (defined(rect.width)) {
	    elem.clip.width = getInt(rect.width);
	    elem.clip.height = getInt(rect.height);
	}
    } else {
    	alert("moveelement: no style nor layer property!");
	return false;
    }
    return true;
}

function showElement(elem, show) {
    // shows or hides the element
    if (elem.style) {
	if (show) {
	    elem.style.visibility = "visible";
	} else {
	    elem.style.visibility = "hidden";
	}
    } else if (defined(elem.visibility)) {
	if (show) {
	    elem.visibility = "show";
	} else {
	    elem.visibility = "hide";
	}
    } else {
	alert("showelement: no style nor layer property!");
    }
    return true;
}

function evtPosition(evt) {
    // returns the on-screen Position of the Event 
    var x;
    var y;
    evt = (evt) ? evt : window.event;
    if (!evt) {
	alert("no event found! "+evt);
	return;
    }
    if (defined(evt.pageX)) {
	x = parseInt(evt.pageX);
	y = parseInt(evt.pageY);
    } else if (defined(evt.clientX)) {
	x = parseInt(document.body.scrollLeft+evt.clientX);
	y = parseInt(document.body.scrollTop+evt.clientY);
    } else {
	alert("evtPosition: don't know how to deal with "+evt);
    }
    return new Position(x, y);
}

function registerEvent(type, elem, handler) {
    // register the given event handler on the indicated element
    if (elem.addEventListener) {
	elem.addEventListener(type, handler, false);
    } else {
	if (type == "mousedown") {
	    if (elem.captureEvents) {
		elem.captureEvents(Event.MOUSEDOWN);
	    }
	    elem.onmousedown = handler;
	} else if (type == "mouseup") {
	    if (elem.captureEvents) {
		elem.captureEvents(Event.MOUSEUP);
	    }
	    elem.onmouseup = handler;
	} else if (type == "mousemove") {
	    if (elem.captureEvents) {
		elem.captureEvents(Event.MOUSEMOVE);
	    }
	    elem.onmousemove = handler;
	} else if (type == "keypress") {
	    if (elem.captureEvents) {
		elem.captureEvents(Event.KEYPRESS);
	    }
	    elem.onkeypress = handler;
	} else {
	    alert("registerEvent: unknown event type "+type);
	    return false;
	}
    }
    return true;
}

function unregisterEvent(type, elem, handler) {
    // unregister the given event handler from the indicated element
    if (elem.removeEventListener) {
	elem.removeEventListener(type, handler, false);
    } else {
	if (type == "mousedown") {
	    if (elem.releaseEvents) {
		elem.releaseEvents(Event.MOUSEDOWN);
	    }
	    elem.onmousedown = null;
	} else if (type == "mouseup") {
	    if (elem.releaseEvents) {
		elem.releaseEvents(Event.MOUSEUP);
	    }
	    elem.onmouseup = null;
	} else if (type == "mousemove") {
	    if (elem.releaseEvents) {
		elem.releaseEvents(Event.MOUSEMOVE);
	    }
	    elem.onmousemove = null;
	} else if (type == "keypress") {
	    if (elem.releaseEvents) {
		elem.releaseEvents(Event.KEYPRESS);
	    }
	    elem.onkeypress = null;
	} else {
	    alert("unregisterEvent: unknown event type "+type);
	    return false;
	}
    }
    return true;
}


// old registerXXYY API for compatibility
function registerMouseDown(elem, handler) {
    return registerEvent("mousedown", elem, handler);
}
function unregisterMouseDown(elem, handler) {
    return unregisterEvent("mousedown", elem, handler);
}
function registerMouseMove(elem, handler) {
    return registerEvent("mousemove", elem, handler);
}
function unregisterMouseMove(elem, handler) {
    return unregisterEvent("mousemove", elem, handler);
}
function registerKeyDown(handler) {
    return registerEvent("keypress", elem, handler);
}


function getWinSize() {
    // returns a Size with the current window size (mostly from www.quirksmode.org)
    var wsize = new Size(100, 100);
    if (defined(self.innerHeight))  {
	// all except Explorer
	if ((self.innerWidth == 0)||(self.innerHeight == 0)) {
	    // Safari 1.2 bug
	    if (parent) {
		parent.innerHeight;
		parent.innerWidth;
	    }
	}
	wsize.width = self.innerWidth;
	wsize.height = self.innerHeight;
    } else if (document.documentElement && document.documentElement.clientHeight) {
	// Explorer 6 Strict Mode
	wsize.width = document.documentElement.clientWidth;
	wsize.height = document.documentElement.clientHeight;
    } else if (document.body) {
	// other Explorers
	wsize.width = document.body.clientWidth;
	wsize.height = document.body.clientHeight;
    }
    return wsize;
}

function openWin(url, name, params) {
    // open browser window
    var ow = window.open(url, name, params);
    ow.focus();
}
