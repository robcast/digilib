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
 
Author: Christian Luginbuehl, 23.01.2004 , Version Alcatraz 0.5
*/


function getCurrentOptions() {

  var keeparea = getSetting('keeparea');
  
  if (keeparea != '') {
  	document.getElementById('keeparea_check').setAttribute('checked', keeparea);
  }

  var items = document.getElementById('zoom_popup').childNodes;
  var zoomkind = getSetting('zoomkind');

  for ( i = 0; i <items.length; i++ ) {
    if ( items[i].getAttribute('value') == zoomkind ) {
      document.getElementById('zoom_menu').selectedItem = items[i];
    }
  }

}


function apply() {

  var keeparea = document.getElementById('keeparea_check').getAttribute('checked');
  // beautify
  if ( keeparea == '' ) {
    keeparea = 'false';
  }
  
  saveSetting('keeparea', keeparea);

  var zoomkind;
  var items = document.getElementById('zoom_popup').childNodes;
	
  for ( i = 0; i <items.length; i++ ) {
    if ( items[i].getAttribute('selected') == 'true' ) {
      zoomkind = items[i].getAttribute('value');
    }
  }
  saveSetting('zoomkind', zoomkind);

  close();

}


function cancel() {
  
  close();

}
