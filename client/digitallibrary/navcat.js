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
 
Author: Christian Luginbuehl, 07.04.2004 , Version Alcatraz 0.6

*/

function identify() {
  return 'Digicat v0.3';
}


dcParams = new Object();

function newParameter(name, value, defaultValue, detail) {

  if ( !dcParams[name] ) {

    dcParams[name] = new Object();

    dcParams[name].value        = value;
    dcParams[name].defaultValue = defaultValue;
    dcParams[name].detail       = detail;

    return dcParams[name];

  } else {

    alert("Fatal: An object with name '" + name + "' already exists - cannot recreate!");
    return false;

  }
}

function getParameter(name) {

  if ( dcParams[name] ) {
    return dcParams[name].value;
  } else {
    return false;
  }
}



function listParametersAsString() {

  var params = new Array();

  for ( param in dcParams ) {
    params.push(param);
  }

  return params.join(",");

}


function listParameters() {

  var params = new Array();

  for ( param in dcParams ) {
    params.push(param);
  }

  return params;

}


function init() {

  var fWidth  = document.body ? document.body.clientWidth : innerWidth;
  var fHeight = document.body ? document.body.clientHeight : innerHeight;

  if (!dcParams.mo.value) {
    dcParams.mo.value = dcParams.mo.defaultValue;
  }

  var cells = dcParams.mo.value.split('x');
	
  var picWidth = (dcParams.dw.value != 0) ? dcParams.dw.value : Math.floor((fWidth-30)/cells[0])-2*cells[0]-1;
  var picHeight = (dcParams.dh.value != 0) ? dcParams.dh.value : picWidth;

  if (cells.length > 1) {
    picHeight = (dcParams.dh.value != 0) ? dcParams.dh.value : Math.floor(((fHeight-30)-12*cells[1])/cells[1])-2*cells[1]-1;
  } else {
    cells[1] = Math.ceil(dcParams.pt.value/cells[0]);
  }

  var cellWidth  = parseInt(picWidth)+8;
  var cellHeight = parseInt(picHeight)+18;
	
  document.write('<table border="0" cellspacing="1" cellpadding="0">');

 	for (var j = 0; j < cells[1]; j++) {
    document.write(' <tr>');
		for (var i = 0; i < cells[0]; i++) {
			var idx  = parseInt(dcParams.pn.value)+i+j*cells[0];
      var img  = baseUrl + "/servlet/Scaler/?fn=" + dcParams.fn.value + "&pn=" + idx;
			    img += "&dw=" + picWidth + "&dh=" + picHeight + "&mo=q0";
			document.write('  <td width="' + cellWidth + '" height="' + cellHeight + '">');
      if (idx <= dcParams.pt.value) {
	      document.write('   <a href="javascript:load(' + idx + ')"><img src="' + img + '" border="0"></a><br>' + idx);
      } else {
        document.write('   &nbsp;');
      }
			document.write('  </td>');

  	}
		document.write(' </tr>');
	}

  document.write('</table>');
}


function load(i) {
  var link = baseUrl + "/digilib.jsp?fn=" + dcParams.fn.value + "&pn=" + i + "&lv=3";

  if (typeof(top.loadFocusedFrame) == 'function') {
    top.loadFocusedFrame(link);
  } else {
	  var win = window.open(link, 'digilib');
	  win.focus();
  }	
}  


function Backpage() {

	if (att[1] <= 1) {
		att[1] = 1;
        alert("You are already on the first page!");
	}
	
    att[1] = parseInt(att[1])-parseInt(att[2]*att[3]);

    if (att[1] < 1) {
    	att[1] = 1;
    }
	loadThumbTable();
}



function Nextpage() {

    att[1] = parseInt(att[1])+parseInt(att[2]*att[3]);
	loadThumbTable();
}


// capturing keypresses for next and previous page
// ascii-values of n = 110, b = 98
function parseKeypress (event) {
	if (event.charCode == 110) {
		Nextpage();
	}
	if (event.charCode == 98) {
		Backpage();
	}
}


// initialize browser specific things (keypress caputring)
function initScripts() {
	for (var f = 0; f < frames.length; f++) {
		frames[f].document.addEventListener('keypress', parseKeypress, true);
	}
	whichFrame.focus();
}
