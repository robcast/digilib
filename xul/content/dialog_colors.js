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

function markCurrentColors() {

  var add  = opener.content.getParameter('rgba');
  var mult = opener.content.getParameter('rgbm');

  if ( add == '' ) {
    add = "0/0/0";
  }

  if ( mult == '' ) {
    mult = "0/0/0";
  }

  add  = add.split("/");
  mult = mult.split("/");

	var items = document.getElementById('add_red_popup').childNodes;

	for ( i = 0; i < items.length; i++ ) {
		if ( parseFloat(items[i].getAttribute('value')) == parseFloat(add[0]) ) {
			document.getElementById('add_red_list').selectedItem = items[i];
		}
	}

	items = document.getElementById('add_green_popup').childNodes;

	for ( i = 0; i < items.length; i++ ) {
		if ( parseFloat(items[i].getAttribute('value')) == parseFloat(add[1]) ) {
			document.getElementById('add_green_list').selectedItem = items[i];
		}
	}

	items = document.getElementById('add_blue_popup').childNodes;

	for ( i = 0; i < items.length; i++ ) {
		if ( parseFloat(items[i].getAttribute('value')) == parseFloat(add[2]) ) {
			document.getElementById('add_blue_list').selectedItem = items[i];
		}
	}

	items = document.getElementById('mult_red_popup').childNodes;

	for ( i = 0; i < items.length; i++ ) {
		if ( parseFloat(items[i].getAttribute('value')) == parseFloat(mult[0]) ) {
			document.getElementById('mult_red_list').selectedItem = items[i];
		}
	}

	items = document.getElementById('mult_green_popup').childNodes;

	for ( i = 0; i < items.length; i++ ) {
		if ( parseFloat(items[i].getAttribute('value')) == parseFloat(mult[1]) ) {
			document.getElementById('mult_green_list').selectedItem = items[i];
		}
	}

	items = document.getElementById('mult_blue_popup').childNodes;

	for ( i = 0; i < items.length; i++ ) {
		if ( parseFloat(items[i].getAttribute('value')) == parseFloat(mult[2]) ) {
			document.getElementById('mult_blue_list').selectedItem = items[i];
		}
	}


}


function change() {

  var old_add  = opener.content.getParameter('rgba');
  var old_mult = opener.content.getParameter('rgbm');

  var add  = new Array();
  var mult = new Array();

  if ( old_add == '' ) {
    old_add = "0/0/0";
  }

  if ( old_mult == '' ) {
    old_mult = "0/0/0";
  }
  

	var items = document.getElementById('add_red_popup').childNodes;
	
	for ( i = 0; i <items.length; i++ ) {
		if ( items[i].getAttribute('selected') == 'true' ) {
			add[0] = items[i].getAttribute('value');
		}
	}

	items = document.getElementById('add_green_popup').childNodes;
	
	for ( i = 0; i <items.length; i++ ) {
		if ( items[i].getAttribute('selected') == 'true' ) {
			add[1] = items[i].getAttribute('value');
		}
	}

	items = document.getElementById('add_blue_popup').childNodes;
	
	for ( i = 0; i <items.length; i++ ) {
		if ( items[i].getAttribute('selected') == 'true' ) {
			add[2] = items[i].getAttribute('value');
		}
	}

  add = add.join("/");
  
	items = document.getElementById('mult_red_popup').childNodes;
	
	for ( i = 0; i <items.length; i++ ) {
		if ( items[i].getAttribute('selected') == 'true' ) {
			mult[0] = items[i].getAttribute('value');
		}
	}

	items = document.getElementById('mult_green_popup').childNodes;
	
	for ( i = 0; i <items.length; i++ ) {
		if ( items[i].getAttribute('selected') == 'true' ) {
			mult[1] = items[i].getAttribute('value');
		}
	}

	items = document.getElementById('mult_blue_popup').childNodes;
	
	for ( i = 0; i <items.length; i++ ) {
		if ( items[i].getAttribute('selected') == 'true' ) {
			mult[2] = items[i].getAttribute('value');
		}
	}

  mult = mult.join("/");
  
  if ( (add != old_add) || (mult != old_mult) ) {
		opener.content.colors(add, mult);
	}
}


function close_dialog() {
  
	window.close();

}
