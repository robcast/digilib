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

function markCurrentPage() {

  var current_page = opener.content.getParameter('pn');
  var total_pages  = opener.content.getParameter('pt');

  if ( total_pages ) {
    document.getElementById('dialog_desc').setAttribute('value', "Choose the page to go (1 - " + total_pages + ") :");
  }
	
  document.getElementById('page_value').setAttribute('value', current_page);

}


function go() {

  var old_current_page = opener.content.getParameter('pn');
  var total_pages      = opener.content.getParameter('pt');

  var page = document.getElementById('page_value').value;

  if ( parseInt(page) != page ) {
    alert ("Illegal value!");
  } else if ( parseInt(page) < 1 ) {
    alert ("Illegal value!");
  } else if ( total_pages && parseInt(page) > total_pages ) {
    alert ("Illegal value!");
  } else {
    var allcookies = opener.content.document.cookie;
    
    var pos = allcookies.indexOf('keeparea=');
    
    if ( pos > -1 ) {
      var start = pos + 9;
      var end   = allcookies.indexOf(';', start);
      if ( end == -1 ) {
        end = allcookies.length;
      }
      
      if ( allcookies.slice(start, end) == 'true' ) {
        opener.content.page(page, 2);
      } else {
        opener.content.page(page, 1);
      }      
    } else {
      // default
      opener.content.page(page, 2);
    }

    close();
  }

}


function cancel() {
  
  close();

}