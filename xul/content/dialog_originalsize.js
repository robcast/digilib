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

var VERTICAL_PIXELS   = 500;
var HORIZONTAL_PIXELS = 500;

function getCurrentOriginalSize() {

  var v_value = getSetting('originalsize_v_value');
  var v_unit  = getSetting('originalsize_v_unit');
  var h_value = getSetting('originalsize_h_value');
  var h_unit  = getSetting('originalsize_h_unit');

  document.getElementById('vertical_value').setAttribute('value', v_value);
  document.getElementById('horizontal_value').setAttribute('value', h_value);

  var items = document.getElementById('vertical_unit_popup').childNodes;

  for ( i = 0; i <items.length; i++ ) {
    if ( items[i].getAttribute('value') == v_unit ) {
      document.getElementById('vertical_unit_list').selectedItem = items[i];
    }
  }

  items = document.getElementById('horizontal_unit_popup').childNodes;

  for ( i = 0; i <items.length; i++ ) {
    if ( items[i].getAttribute('value') == h_unit ) {
      document.getElementById('horizontal_unit_list').selectedItem = items[i];
    }
  }

}


function apply() {

  var v_value   = document.getElementById('vertical_value').value;
  var h_value = document.getElementById('horizontal_value').value;

  var v_unit;
  var h_unit;
	
  var items = document.getElementById('vertical_unit_popup').childNodes;

  for ( i = 0; i <items.length; i++ ) {
    if ( items[i].getAttribute('selected') == 'true' ) {
      v_unit = items[i].getAttribute('value');
    }
  }

  items = document.getElementById('vertical_unit_popup').childNodes;
	
  for ( i = 0; i <items.length; i++ ) {
    if ( items[i].getAttribute('selected') == 'true' ) {
      h_unit = items[i].getAttribute('value');
    }
  }

  if ( (parseFloat(v_value) == v_value) &&
       (parseFloat(h_value) == h_value) ) {

    saveSetting('originalsize_v_value', v_value);
    saveSetting('originalsize_v_unit', v_unit);
    saveSetting('originalsize_h_value', h_value);
    saveSetting('originalsize_h_unit', h_unit);

    var dpi_v = (v_unit == "inch") ? VERTICAL_PIXELS / v_value :
                (v_unit == "cm")   ? VERTICAL_PIXELS / (v_value/2.54) :
                 v_value;

    var dpi_h = (h_unit == "inch") ? VERTICAL_PIXELS / h_value :
                (h_unit == "cm")   ? VERTICAL_PIXELS / (h_value/2.54) :
                 h_value;

  	opener.content.originalSize(dpi_v, dpi_h);

    close();

  } else {
    alert("Illegal value(s)!");
  }

}


function cancel() {
  
	close();

}
