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
 
Author: Christian Luginbuehl, 26.02.2004 , Version Alcatraz 0.6
*/


function markCurrentScale() {

	var menuitems = document.getElementById('scale_popup').childNodes;
	
	for ( i = 0; i < menuitems.length; i++ ) {
		menuitems[i].setAttribute('checked', 'false');
	}

  if ( window.content.getParameter('mo').indexOf('clip') > -1 ) {
		document.getElementById('scale_pbp').setAttribute('checked', 'true');
 	} else if ( window.content.getParameter('mo').indexOf('osize') > -1 ) {
		document.getElementById('scale_os').setAttribute('checked', 'true');
 	} else {
   	var item = "scale_" + window.content.getParameter('ws').replace(/\./, "");

		if ( document.getElementById(item) ) {
			document.getElementById(item).setAttribute('checked', 'true');
		}
	}
    
}


function markCurrentMirror() {

	var menuitems = document.getElementById('mirror_popup').childNodes;
	
	for ( i = 0; i < menuitems.length; i++ ) {
		menuitems[i].setAttribute('checked', 'false');
	}

  if ( window.content.getParameter('mo').indexOf('hmir') > -1 ) {
		document.getElementById('mirror_h').setAttribute('checked', 'true');
 	}

  if ( window.content.getParameter('mo').indexOf('vmir') > -1 ) {
		document.getElementById('mirror_v').setAttribute('checked', 'true');
 	}
    
}


function dialog_originalsize() {
	window.openDialog("chrome://alcatraz/content/dialog_originalsize.xul", "dialog_originalsize", "chrome,dialog,resizable=no", "");
}


function dialog_rotate() {
	window.openDialog("chrome://alcatraz/content/dialog_rotate.xul", "dialog_rotate", "chrome,dialog,resizable=no", "");
}


function dialog_brightnesscontrast() {
	window.openDialog("chrome://alcatraz/content/dialog_brightnesscontrast.xul", "dialog_brightnesscontrast", "chrome,dialog,resizable=no", "");
}


function dialog_colors() {
	window.openDialog("chrome://alcatraz/content/dialog_colors.xul", "dialog_colors", "chrome,dialog,resizable=no", "");
}