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
 
Author: Christian Luginbuehl, 01.05.2003 , Version Alcatraz 0.5
*/


function dialog_page() {
	window.openDialog("chrome://alcatraz/content/dialog_page.xul", "dialog_page", "chrome,dialog,resizable=no", "");
}


function dialog_options() {
	window.openDialog("chrome://alcatraz/content/dialog_options.xul", "dialog_options", "chrome,dialog,resizable=no", "");
}


function updatePageDisplay() {
  if ( typeof(window.content.getParameter) == 'function' ) {
    var actual = window.content.getParameter('pn');
    var total  = window.content.getParameter('pt');
    
    if ( (parseInt(actual) > 0) && (parseInt(total) > 0)) {
      document.getElementById('button_page').setAttribute('label', actual + " of " + total);
    }
  }

  setTimeout('updatePageDisplay()', 200);
}
setTimeout('updatePageDisplay()', 200);


function page(value) {

  var keeparea = getSetting( 'keeparea' );

  if ( keeparea == 'true' ) {
    window.content.page(value, 2);
  } else if ( keeparea == 'false' ) {
    window.content.page(value, 1);
  } else {
    // no preferences saved
    window.content.page(value, 1);
  }

}


function zoomIn() {

  var zoomkind = getSetting( 'zoomkind' );
  
  if ( zoomkind == 'zoomarea' ) {
    window.content.zoomArea();
  } else if ( zoomkind == 'zoompoint' ) {
    window.content.zoomPoint();
  } else {
    // no preferences saved
    window.content.zoomArea();
  }
  
}


function zoomOut() {

  var zoomkind = getSetting( 'zoomkind' );
  
  if ( zoomkind == 'zoomarea' ) {
    window.content.zoomExtends();
  } else if ( zoomkind == 'zoompoint' ) {
    window.content.zoomOut();
  } else {
    // no preferences saved
    window.content.zoomExtends();
  }
  
}


function change_help() {

  if ( document.getElementById('item_contexthelp').getAttribute('checked') == 'true' ) {

    document.getElementById('button_first').setAttribute('tooltiptext', 'Go to the first page of this document');
    document.getElementById('button_prev').setAttribute('tooltiptext', 'Go to the previous page of this document');
    document.getElementById('button_page').setAttribute('tooltiptext', 'Go to a specific page you enter');
    document.getElementById('button_next').setAttribute('tooltiptext', 'Go to the next page of this document');
    document.getElementById('button_last').setAttribute('tooltiptext', 'Go to the last page of this document');
    document.getElementById('button_mark').setAttribute('tooltiptext', 'Place marks on the picture. Left-click on the image to place a numbered mark');
    document.getElementById('button_ref').setAttribute('tooltiptext', 'Get a hyperlink eighter which can reproduce your selected area and marks');
    document.getElementById('button_thumbs').setAttribute('tooltiptext', 'Open a thumbnailview of the current document (image serie)');
    document.getElementById('button_zoomin').setAttribute('tooltiptext', 'Zoom into the picture (behaviour is selected under ? -> Options)');
    document.getElementById('button_zoomout').setAttribute('tooltiptext', 'Zooms out of the selected region');

    document.getElementById('button_help').setAttribute('tooltiptext', 'Change default options or (de)select the context-help');

    document.getElementById('button_scale').setAttribute('tooltiptext', 'Select the factor the picture will be scaled to (relative to the size of the working area)');
    document.getElementById('button_mirror').setAttribute('tooltiptext', 'Mirrors the image eighter horizontally or vertically');
    document.getElementById('button_rotate').setAttribute('tooltiptext', 'Rotate the image by the angle you specify');
    document.getElementById('button_brightnesscontrast').setAttribute('tooltiptext', 'Adjust the brightness and contrast of the picture');
    document.getElementById('button_colors').setAttribute('tooltiptext', 'Adjust the values of each RGB color-channel');

  } else {

    var buttons = document.getElementsByTagName('button');
    
  	for ( i = 0; i < buttons.length; i++ ) {
	  	buttons[i].removeAttribute('tooltiptext');
	  }

  }

}
