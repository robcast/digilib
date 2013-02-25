function checkBrowser() {

	this.ua    = navigator.userAgent;
	this.ver   = navigator.appVersion;
	this.dom   = ( document.getElementById );
	this.opera = ( this.dom ) && ( this.ua.toLowerCase().indexOf("opera") > -1 );
	this.ie4   = ( document.all ) && ( !this.dom );
	this.ie5   = ( this.ver.indexOf("MSIE 5") > -1 ) && ( this.dom );
	this.ie6   = ( this.ver.indexOf("MSIE 6") > -1 ) && ( this.dom );
	this.ns4   = ( document.layers ) && ( !this.dom );
	this.ns6   = ( this.dom ) && ( parseInt(this.ver) >= 5 ) && ( !this.opera );
	this.ns    = this.ns4 || this.ns6;
	this.ie    = this.ie4 || this.ie5 || this.ie6;

	return this;
}

browser = new checkBrowser();

function changeBc(obj, color){
	var div;

	if (color == '' && browser.ns4) color = null;

	if (browser.ns4) div = document.layers[obj];
	else if (browser.dom) div = document.getElementById(obj).style;
	else if (browser.ie) div = document.all[obj].style;

	if (browser.dom || browser.ie) div.backgroundColor = color;
	if (browser.ns4) div.bgColor = color;
}

function makeArray(n){
	this.length = n;
	for (var i = 0; i < n; i++) {
		this[i] = new Image();
	}

	return this;
}

function preloadImages() {
	over = new makeArray(document.images.length);
	away = new makeArray(document.images.length);

	for (i = 0; i < document.images.length; i++) {
		currName = document.images[i].src.slice(0, document.images[i].src.lastIndexOf('.')-1);
		away[i].src = currName + "0.gif";
		over[i].src = currName + "1.gif";
	}
}

function overButton(n) {
	currButton = document.images[n];

	currButton.src = over[n].src;
	if (showHelp) contextHelp(n);
}

function awayButton(n) {
	currButton = document.images[n];

	currButton.src = away[n].src;
}

function overItem(obj) {
	changeBc("menu" + obj, '#770000');
	clearTimeout(timeID);
}

function awayItem(obj) {
	changeBc("menu" + obj, '#666666');
	timeID = setTimeout("hideMenu()", 700);
}

var timeID = null;

function changeMark(obj) {
	var object;

	if (browser.ns4) object = document.layers["menu" + obj].document.images[0];
	else if (browser.dom) object = document.getElementById("mark" + obj);
	else if (browser.ie) object = document.all["mark" + obj];
	
	var path = object.src.slice(0, object.src.lastIndexOf('/')+1);
	
	object.src = (object.src.indexOf("nomark") > -1) ? path + "mark.gif" : path + "nomark.gif";
}

function showMenu(obj) {
	menu(obj, true);
}

function menu(obj, show) {
	var currObj = "menu" + obj;
	var idx = 0;
	while(true) {
		if (browser.ns4 && document.layers[currObj]) document.layers[currObj].visibility = (show) ? "show" : "hide";
		else if (browser.dom && document.getElementById(currObj)) document.getElementById(currObj).style.visibility = (show) ? "visible" : "hidden";
		else if (browser.ie && document.all[currObj]) document.all[currObj].style.visibility = (show) ? "visible" : "hidden";
		else break;
		
		currObj = "menu" + obj + (++idx);
	}
	if (!show) activeMenu = '';
	else activeMenu = obj;

	timeID = setTimeout("hideMenu()", 2000);
}

function hideMenu() {
	if (activeMenu != '') menu(activeMenu, false);
	clearTimeout(timeID);
}

var activeMenu = '';


// just to be sure, that no buffer overflow can arrive
var semaphor = true;

function contextHelp(n) {

	if (helpWindow.closed) {
		changeMark(31);
		changeHelp();
		return;
	}

	if ((navigator.appVersion.indexOf("Macintosh") < 0) && semaphor) {
		semaphor = false;	
		var help = helpText[n].split("|");
	
		helpWindow.focus();
		helpWindow.document.open();
		helpWindow.document.write('<html><head><title>Context Help</title>');
		helpWindow.document.write('<style type="text/css">');
		helpWindow.document.write('.title {font-family: Verdana, sans-serif, Arial; font-size: 12px; font-weight: bold; color: #FFFFFF}');
		helpWindow.document.write('.text {font-family: Verdana, sans-serif, Arial; font-size: 10px; color: #000000}');
		helpWindow.document.write('</style></head><body bgcolor="#CCCCCC" leftmargin="7" topmargin="7" marginwidth="7" marginheight="7" onload="opener.semaphor = true;">');
		helpWindow.document.write('<table width="99%" border="0" cellspacing="0" cellpadding="3"><tr><td bgcolor="#666666" class="title">');
		helpWindow.document.write(help[0] + '</tr><tr><td class="text">');
		helpWindow.document.write(help[1] + '</tr></td></table></body></html>');
		helpWindow.document.close();	

		// stupid workaround because of netscape 6, that doesen't know the opener property
		// this workaround is still ok because netscape 6 has eventbuffer checks so no overflow
    	if (browser.ns6) {
        	semaphor = true;
		}

		// next stupid workaround because of opera 6, that somehow don't start the 'onLoad'-
		// attribute in the body tag (the helpwindow does not finish loading)
    	if (browser.opera) {
        	setTimeout("semaphor = true;", 50);
		}

	}
}

function openContextHelp() {
	if (navigator.appVersion.indexOf("Macintosh") > -1) {
		openContextHelpMac();
		return;
	}

	semaphor = false;
	
	var winWidth = 270;
	var winHeight = 130;

	var xScreen = 0.9*(screen.width-winWidth);
	var yScreen = 0.8*(screen.height-winHeight);

	helpWindow = window.open("", "ContextHelp", "width=" + winWidth + ",height=" + winHeight + ",screenX=" + xScreen + ",screenY=" + yScreen + ",left=" + xScreen + ",top=" + yScreen);

	helpWindow.focus();
	helpWindow.document.open();
	helpWindow.document.write('<html><head><title>Context Help</title>');
	helpWindow.document.write('<style type="text/css">');
	helpWindow.document.write('.title {font-family: Verdana, sans-serif, Arial; font-size: 12px; font-weight: bold; color: #FFFFFF}');
	helpWindow.document.write('.text {font-family: Verdana, sans-serif, Arial; font-size: 10px; color: #000000}');
	helpWindow.document.write('</style></head><body bgcolor="#CCCCCC" leftmargin="7" topmargin="7" marginwidth="7" marginheight="7">');
	helpWindow.document.write('<table width="99%" border="0" cellspacing="0" cellpadding="3"><tr><td bgcolor="#666666" class="title">');
	helpWindow.document.write('Context Help</tr><tr><td class="text">');
	helpWindow.document.write('Move over any button to get some more information about its function</tr></td></table></body></html>');
	helpWindow.document.close();
	
	// for some safety reason help-requests have to be blocked while opening the window
	setTimeout("semaphor = true;", 200);
}

// because macs have a strange window focus behaviour we have to go a special
// way for them - just opening a window that contains all button-descriptions
function openContextHelpMac() {

	var winWidth = 270;
	var winHeight = 600;

	var xScreen = 0.9*(screen.width-winWidth);
	var yScreen = 0.8*(screen.height-winHeight);

	helpWindow = window.open("", "ContextHelp", "width=" + winWidth + ",height=" + winHeight + ",screenX=" + xScreen + ",screenY=" + yScreen + ",left=" + xScreen + ",top=" + yScreen + ",scrollbars");

	helpWindow.focus();
	helpWindow.document.open();
	helpWindow.document.write('<html><head><title>Context Help Macintosh</title>');
	helpWindow.document.write('<style type="text/css">');
	helpWindow.document.write('.title {font-family: Verdana, sans-serif, Arial; font-size: 12px; font-weight: bold; color: #FFFFFF}');
	helpWindow.document.write('.text {font-family: Verdana, sans-serif, Arial; font-size: 10px; color: #000000}');
	helpWindow.document.write('</style></head><body bgcolor="#CCCCCC" leftmargin="7" topmargin="7" marginwidth="7" marginheight="7">');
	helpWindow.document.write('<table width="99%" border="0" cellspacing="0" cellpadding="3">');

	for (n = 0; n < helpText.length; n++) {

		help = helpText[n].split("|");
		helpWindow.document.write('<tr><td bgcolor="#666666" class="title">');
		helpWindow.document.write(help[0] + '</tr><tr><td class="text">');
		helpWindow.document.write('<p>' + help[1] + '<br>&nbsp;</p></tr></td>');
	}
	helpWindow.document.write('</table></body></html>');
	helpWindow.document.close();
}


function closeContextHelp() {
	if (helpWindow != '' && !helpWindow.closed) {
		helpWindow.close();
	}
	helpWindow = '';
}

function changeHelp() {
	showHelp = !showHelp;
	showHelp ? openContextHelp() : closeContextHelp();
}


// variable containing the contextwindow
var helpWindow = '';
