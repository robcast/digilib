/****************************************************************************
 * - module for digilib: adds a menu for digilib functionality              *
 *                                                                          *
 *   pressing [ctrl] + [left mousebutton] to bring it up                    *
 *                                                                          *
 *   to install this module, you do not just have to load it in             *
 *   dlImage.jsp (like every module), but you also have to put the          *
 *   following three lines in the <body> of dlImage.jsp:                    *
 *                                                                          *
 *      <script language="JavaScript">                                      *
 *        cm_htmlCode();                                                    *
 *      </script>                                                           *
 *                                                                          *
 *                       christian luginbuehl (luginbuehl@student.unibe.ch) *
 ****************************************************************************/

browser = new checkBrowser();

var menu = false;

if (browser.ns4) {
	document.captureEvents(Event.MOUSEDOWN);
	document.onmousedown = showmenu;
} else if (browser.ns6) {
	document.addEventListener("mousedown", showmenu, true);
} else {
	document.onmousedown = showmenu;
}


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
	this.ns    = ( this.ns4 ) || ( this.ns6 );
	this.ie    = ( this.ie4 ) || ( this.ie5 ) || ( this.ie6 );

	return this;
}


function showmenu(event) {

	if (browser.ns4) {
		if (event.which == 1 && (event.modifiers == Event.CONTROL_MASK) && !menu) {
			menu = true;
			document.layers["menu"].left = Math.min(event.pageX + 3, innerWidth - 160 + pageXOffset);
			document.layers["menu"].top  = Math.min(event.pageY + 3, innerHeight - 180 + pageYOffset);
			document.layers["menu"].clip.width = 140;
			document.layers["menu"].bgColor = "#DDDDDD";
			document.layers["menu"].margin = 4;
			document.layers["menu"].visibility = "show";
		} else if (menu) {
			menu = false;
			document.layers["menu"].visibility = "hide";
		}

	} else if (browser.ns6) {
		if (event.which == 1 && event.ctrlKey && !menu) {
			menu = true;
			document.getElementById("menu").style.left = Math.min(event.pageX + 3, innerWidth - 160 + pageXOffset);
			document.getElementById("menu").style.top  = Math.min(event.pageY + 3, innerHeight - 160 + pageYOffset);
			document.getElementById("menu").style.visibility = "visible";
		} else if (menu) {
			menu = false;
			document.getElementById("menu").style.visibility = "hidden";
		}
	} else {
		event = window.event;

		if (event.button == 1 && event.ctrlKey && !menu) {
			menu = true;
			document.all["menu"].style.left = event.x + 3;
			document.all["menu"].style.top  = event.y + 3;
			document.all["menu"].style.visibility = "visible";
		} else if (menu) {
			menu = false;
			document.all["menu"].style.visibility = "hidden";
		}
	}
}


function cm_htmlCode() {
	
	document.write('<style type="text/css">\n');
	document.write(' table                       {border-left: 1px solid #CCCCCC; border-top: 1px solid #CCCCCC; border-right: 1px solid #000000; border-bottom: 1px solid #000000; }\n');
	document.write(' td                          {font-family: verdana; color: #666666; font-size: 11px; text-decoration: none}\n');
	document.write(' a:link, a:visited, a:active {font-family: verdana; color: #666666; font-size: 11px; font-weight: bold; text-decoration: none}\n');
	document.write(' a:hover                     {font-family: verdana; color: #000000; font-size: 11px; text-decoration: none}\n');
	document.write('</style>\n');
	document.write('<div ID="menu" style="position:absolute; width: 140px; background-color: #DDDDDD; visibility:hidden">\n');
  	document.write(' <table width="140" align="center" cellspacing="0" cellpadding="0">\n');
   	document.write('  <tr><td><a href="#" onmousedown="backPage(false)">&nbsp;&nbsp;prev</a></td></tr>\n');
   	document.write('  <tr><td><a href="#" onmousedown="nextPage(false)">&nbsp;&nbsp;next</a></td></tr>\n');
   	document.write('  <tr><td><a href="#" onmousedown="page(false)">&nbsp;&nbsp;page #</a></td></tr>\n');
   	document.write('  <tr><td align="center"><img src="modules/cm_separator.gif" width="136" height="3"></td></tr>\n');
   	document.write('  <tr><td><a href="#" onmousedown="mark()">&nbsp;&nbsp;mark</a></td></tr>\n');
   	document.write('  <tr><td>&nbsp;&nbsp;reference <a href="#" onmousedown="ref(1)">html</a> <a href="#" onmousedown="ref(0)">latex</a></td></tr>\n');
   	document.write('  <tr><td align="center"><img src="modules/cm_separator.gif" width="136" height="3"></td></tr>\n');
   	document.write('  <tr><td><a href="#" onmousedown="zoomArea()">&nbsp;&nbsp;zoom area</a></td></tr>\n');
   	document.write('  <tr><td><a href="#" onmousedown="zoomPoint()">&nbsp;&nbsp;zoom point</a></td></tr>\n');
   	document.write('  <tr><td><a href="#" onmousedown="moveTo()">&nbsp;&nbsp;move to</a></td></tr>\n');
   	document.write('  <tr><td><a href="#" onmousedown="zoomOut()">&nbsp;&nbsp;zoom out</a></td></tr>\n');
   	document.write('  <tr><td align="center"><img src="modules/cm_separator.gif" width="136" height="3"></td></tr>\n');
   	document.write('  <tr><td>&nbsp;&nbsp;scale <a href="#" onmousedown="scale(0.7)">0.7</a> <a href="#" onmousedown="scale(1.0)">1.0</a> <a href="#" onmousedown="scale(2.0)">2.0</a> <a href="#" onmousedown="scale(3.0)">3.0</a></td></tr>\n');
  	document.write(' </table>\n');
	document.write('</div>\n');
	
}
