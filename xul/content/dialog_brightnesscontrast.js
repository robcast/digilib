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

function markCurrentBrightnessContrast() {

  var brightness = opener.content.getParameter('brgt');

	var items = document.getElementById('brightness_popup').childNodes;
	
	for ( i = 0; i < items.length; i++ ) {

		if ( parseFloat(items[i].getAttribute('value')) == parseFloat(brightness) ) {
			document.getElementById('brightness_list').selectedItem = items[i];
		}

	}


  var contrast = opener.content.getParameter('cont');

	items = document.getElementById('contrast_popup').childNodes;
	
	for ( i = 0; i < items.length; i++ ) {
		if ( parseFloat(items[i].getAttribute('value')) == parseFloat(contrast) ) {
			document.getElementById('contrast_list').selectedItem = items[i];
		}
	}

}


function change() {

	var brightness = 0.0;
	var contrast   = 0.0;

  var old_brightness = opener.content.getParameter('brgt');
  var old_contrast   = opener.content.getParameter('cont');

	var items = document.getElementById('brightness_popup').childNodes;
	
	for ( i = 0; i <items.length; i++ ) {
		if ( items[i].getAttribute('selected') == 'true' ) {
			brightness = items[i].getAttribute('value');
		}
	}

	items = document.getElementById('contrast_popup').childNodes;
	
	for ( i = 0; i <items.length; i++ ) {
		if ( items[i].getAttribute('selected') == 'true' ) {
			contrast = items[i].getAttribute('value');
		}
	}

  if ( (brightness != old_brightness) || (contrast != old_contrast) ) {
		opener.content.brightnessContrast(brightness, contrast);
	}

}


function close_dialog() {
  
	close();

}
