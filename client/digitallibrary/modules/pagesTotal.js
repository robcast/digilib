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
 
Author: Christian Luginbuehl, 22.05.2003 , Version Alcatraz 0.4

*/

/*************************************************************************
 *  pagesTotal.js : digilib-module                                       *
 *                                                                       *
 *  desc: displaying the total number of pages in a designated frame,    *
 *        when calling pagesTotal(). also overrides nextPage() and       *
 *        page() functions, by adding last-page tests.                   *
 *                                                                       *
 *************************************************************************/


/**
 * shows 'page XX of YY' in a designated frame
 */
function showTotalPages() {

  var pf = parent.pageFrame;

  if ( pf ) {
    pf.document.open();
    pf.document.write('<html><head></head>');
    pf.document.write('<body bgcolor="#CCCCCC" topmargin="5" marginheight="5">');
    pf.document.write('<p style="font-family: Verdana, Arial, Helvetica, sans-serif; text-align: center; color: #CC3333; font-size: 11px">');
    pf.document.write(dlParams.pn.value + '<b> of </b>' + dlParams.pt.value + '</p></body></html>');
    pf.document.close();
  }

}


/**
 * extending init from novaigation.js
 */
function init_pagesTotal() {

  init();
  
  showTotalPages();

}


/**
 * overriding 'page' in navigation.js
 */
function page(page, details) {

  if ( details == null ) {
    details = 1;
  }
  
  if ( page && page.indexOf('-') == 0 ) {
    if ( dlParams.pn.value > 1 ) {
      page = Math.max(parseInt(dlParams.pn.value) - parseInt(page.slice(1)), 1);
      dlParams.pn.value = page;
      display(details);
    } else {
      alert("You are already on the first page!");
    }

  } else if ( page && page.indexOf('+') == 0 ) {
    if ( parseInt(dlParams.pn.value) < parseInt(dlParams.pt.value) ) {
      page = Math.min(parseInt(dlParams.pn.value) + parseInt(page.slice(1)), dlParams.pt.value);
      dlParams.pn.value = page;
      display(details);
    } else {
      alert("You are already on the last page!");
    }
  } else if ( page && page == parseInt(page) ) {
    if ( (page > 0) && (page <= parseInt(dlParams.pt.value)) ) {
      dlParams.pn.value = parseInt(page);
      display(details);
    } else {
      alert ("Illegal page number (1 - " + dlParams.pt.value + ")!");
    }
  }

}