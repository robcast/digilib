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
/****************************************************************************
 * - fitGIFs module for digilib                                             *
 *                                                                          *
 *                       christian luginbuehl (luginbuehl@student.unibe.ch) *
 ****************************************************************************/



/**
 * fitGIFs
 */
function fitGIFs() {

  if (att.mo != "") {

    idx_plus_after  = att.mo.indexOf("fit,");
    idx_plus_before = att.mo.indexOf(",fit");
    idx_noplus      = att.mo.indexOf("fit");
      
    if (idx_plus_after > -1) {
      att.mo = att.mo.slice(0, idx_plus_after) + att.mo.slice(idx_plus_after+5);
    } else if (idx_plus_before > -1) {
      att.mo = att.mo.slice(0, idx_plus_before) + att.mo.slice(idx_plus_before+5);
    } else if (idx_noplus > -1) {
      att.mo = att.mo.slice(0, idx_noplus) + att.mo.slice(idx_noplus+4);
    } else {
      att.mo += ",fit";
    }
  } else {
    att.mo = "fit";
  }
  
  loadPicture(2);

}
