/*
 * #%L
 * digicat base library
 * %%
 * Copyright (C) 2004 - 2013 IT-Group MPIWG, WTWG Uni Bern and others
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Authors: 
 *  Christian Luginbuehl, 07.04.2004 , Version Alcatraz 0.6
 *  Robert Casties, 28.10.2004
 *  Martin Raspe, 28.12.2011
 * 
 * !! requires baselib.js !!
 */

function identify() {
  return 'Digicat v0.4';
}

var cells = null;


function dc_init() {
  // put the query parameters (sans "?") in the parameters array
  parseParameters(location.search.slice(1));
}

function display(detail) {
    // redisplay the page
    if (! detail) {
	detail = 9;
    }
    var queryString = getAllParameters(detail);
    location.href = location.protocol + "//" + location.host + location.pathname + "?" + queryString;
}

function dc_render(doc) {
    // creates the HTML for the image table
    var wsize = getWinSize();
    var fWidth  = wsize.width;
    var fHeight = wsize.height;

    var mx = getParameter("mx");
    cells = mx.split('x');

    var dw = getParameter("dw");
    var dh = getParameter("dh");
    var pt = getParameter("pt");
    var pn = parseInt(getParameter("pn"));
    var fn = getParameter("fn");
    if (fn == "") {
        fn = "/"; // empty fn prevents page numbers to work
        }
    var par_mo = (hasParameter("mo")) ? "&mo="+getParameter("mo") : "";

    var picWidth = (dw != 0) ? dw : Math.floor((fWidth-30)/cells[0])-2*cells[0]-1;
    var picHeight = (dh != 0) ? dh : picWidth;

    if (cells.length > 1) {
	picHeight = (dh != 0) ? dh : Math.floor(((fHeight-30)-12*cells[1])/cells[1])-2*cells[1]-1;
    } else {
	cells[1] = Math.ceil(pt/cells[0]);
    }

    var cellWidth  = parseInt(picWidth)+8;
    var cellHeight = parseInt(picHeight)+18;

    doc.writeln('<table width="100%" height="100%" border="0" cellspacing="1" cellpadding="0">');

    for (var j = 0; j < cells[1]; j++) {
	doc.writeln('<tr>');
	for (var i = 0; i < cells[0]; i++) {
	    var idx  = pn+i+j*cells[0];
	    // create a relative link. ".." because we are in subdirectory "oldskin"
	    var img  = "../servlet/Scaler?fn=" + fn + "&pn=" + idx;
	    img += "&dw=" + picWidth + "&dh=" + picHeight + par_mo;
	    doc.write('<td width="'+cellWidth+'" height="'+cellHeight+'">');
	    if (idx <= pt) {
		doc.write('<a href="'+dl_link(idx, fn, par_mo)+'" target="_blank"><img src="'+img+'" border="0"></a><div class="number">'+idx+'</div>');
	    } else {
		doc.write('<div class="nonumber">'+idx+'</div>');
	    }
	    doc.writeln('</td>');
	}
	doc.writeln(' </tr>');
    }
    doc.writeln('</table>');
}

function dl_link(pn, fn, par_mo) {
    // create a relative link. ".." because we are in subdirectory "oldskin"
    var link = "../jquery/digilib.html?fn=" + fn + "&pn=" + pn + par_mo;
    return link;
}

function Backpage() {
    var pn = parseInt(getParameter("pn"));
    if (pn <= 1) {
	pn = 1;
        alert("You are already on the first page!");
    }

    pn = pn - parseInt(cells[0]*cells[1]);

    if (pn < 1) {
    	pn = 1;
    }
    setParameter("pn", pn);
    display();
}

function Nextpage() {
    var pn = parseInt(getParameter("pn"));
    pn = pn + parseInt(cells[0]*cells[1]);
    setParameter("pn", pn);
    display();
}
