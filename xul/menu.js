/*
Copyright (C) 2003 WTWG, Uni Bern
 
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
 
Author: Christian Luginbuehl, 01.05.2003 , Version Alcatraz 0.3
*/
function rotate() {
  value = prompt("Enter absolute rotation angle in degrees (clockwise orientation) :");
  
  if (value) {
    window.content.rotation(value);
  }
}

function color_add() {
  
  value = prompt("Enter the values you like to add to the red, green and blue color channel.\n\nFormat is R/G/B, where R,G,B are floating numbers between -255 and +255.");
  
  if (value) {
    
    values = value.split("/");
    
    if (values.length != 3) alert("Illegal format");
    else if ((values[0] < -255) || (values[0] > 255)) alert("Illegal value for red");
    else if ((values[1] < -255) || (values[1] > 255)) alert("Illegal value for green");
    else if ((values[2] < -255) || (values[2] > 255)) alert("Illegal value for blue");
    
    else window.content.rgba(value);

  }
}

function color_multiply() {
  
  value = prompt("Enter the values you like to multiply with the different color channels.\n\nFormat is R/G/B, where R,G,B are floating numbers bigger than 0.");
  
  if (value) {
    
    values = value.split("/");
    
    if (values.length != 3) alert("Illegal format");
    else if (values[0] < 0) alert("Illegal value for red");
    else if (values[1] < 0) alert("Illegal value for green");
    else if (values[2] < 0) alert("Illegal value for blue");
    
    else window.content.rgbm(value);
  
  }
}

function showMetadata(myurl){
   var arrUrl=myurl.split("?");
   var strDigilib=arrUrl[0];
   var strParams=arrUrl[1];
   var strArguments=strParams.split("&");
   var strDocDir="";
   for (i=0;i<strArguments.length;i++){
      var strArg=strArguments[i];
      var intPos=strArg.indexOf("fn=");
      if (intPos>=0){
         strDocDir=strArg.substr(intPos+3);
      }
   }
   if (strDocDir == ""){
      alert("no metadata available");
   }else{
      window.open("showMetadata.jsp?docdir="+strDocDir,"Metadata "+strDocDir,"menubar=no scrollbars=yes height=400 width=600");
   }
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
	this.ns    = this.ns4 || this.ns6;
	this.ie    = this.ie4 || this.ie5 || this.ie6;
	
	return this;
}

browser = new checkBrowser();

function overButton(n) {
  if (showHelp) contextHelp(n);
}


// just to be sure, that no buffer overflow can arrive
var semaphor = true;

function contextHelp(n) {
  
  if (helpWindow.closed) {
    changeHelp();
    return;
  }
  
  if ((navigator.appVersion.indexOf("Macintosh") < 0) && semaphor) {
    semaphor = false;
    
    var tmpHelp = helpText[n];
    tmpHelp = tmpHelp.replace(/\(br\)/,"<br>");
    var help = tmpHelp.split("|");
    
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