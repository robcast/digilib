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

function markCurrentRotation() {

  var angle = opener.content.getParameter('rot');

	if ( angle && (angle == 0.0 || angle == 90.0 || angle == 180.0 || angle == 270.0) ) {
		var item = "rotation_" + parseInt(angle);
		document.getElementById(item).setAttribute('selected', 'true');
 	} else if ( angle && angle == parseFloat(angle) ) {
		document.getElementById('rotation_custom').setAttribute('selected', 'true');
		document.getElementById('rotation_custom_value').setAttribute('value', angle);
	}
  
}


function input() {

	document.getElementById('rotation_custom').setAttribute('selected', 'true');

}

function rotate() {

	var angle = 0.0;

	var items = document.getElementById('rotation_group').childNodes;
	
	if ( document.getElementById('rotation_custom').getAttribute('selected') == 'true' ) {
		angle = document.getElementById('rotation_custom_value').value;
	} else {
		for ( i = 0; i <items.length; i++ ) {
			if ( items[i].getAttribute('selected') == 'true' ) {
				angle = items[i].getAttribute('value');
			}
		}
	}

	if ( angle != parseFloat(angle) ) {
		alert ("Illegal value!" + angle);
	}		
  
  if ( angle != opener.content.getParameter('rot') ) {
		opener.content.rotation(angle);
	}
	close();
}


function cancel() {
  
	close();

}
