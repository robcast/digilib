/*

Copyright (C) 2003 WTWG, Uni Bern
 
This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.
 
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
 
You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA
 
Author: Christian Luginbuehl, 22.05.2003 , Version Alcatraz 0.4

*/

/*************************************************************************
 *  newReferences.js : digilib-module                                    *
 *                                                                       *
 *  desc: creates references in the new parameter format (key-value)     *
 *                                                                       *
 *************************************************************************/


/**
 * ref, overriding original one
 */
function ref(select) {

  var hyperlinkRef = baseUrl + "/digilib.jsp?";

  if ( select >= 2 ) {
    
    // no original size is referenced at the moment,
    // because the dpi values are not constant from user to user
    removeMoFlag('osize');

    var parameterString = '';
    
    for ( param in dlParams ) {
      if ( (dlParams[param].detail < 9) && (dlParams[param].defaultValue != dlParams[param].value) ) {
        parameterString += "&" + param + "=" + dlParams[param].value;
      }
    }
    
    if (select == 2) {
      parameterString += "&lv=3";    // level three
      parameterString = parameterString.slice(1);
      prompt("Alcatraz-style HTML link", hyperlinkRef + parameterString);
    } else {
      parameterString += "&lv=1";    // i just really want the image
      parameterString = parameterString.slice(1);
      return hyperlinkRef + parameterString;
    }

  } else {
                
    var parameterString = '';

  	parameterString += dlParams.fn.value + "+" + dlParams.pn.value + "+" + dlParams.ws.value + "+";
  	parameterString += dlParams.mo.value + "+" + dlParams.mk.value;
	
  	if ( (dlParams.wx.value != 0) || (dlParams.wy.value != 0) || (dlParams.ww.value != 1) || (dlParams.wh.value != 1) ) {
  		parameterString += "+" + dlParams.wx.value + "+" + dlParams.wy.value + "+" + dlParams.ww.value;
  		parameterString += "+" + dlParams.wh.value;
  	}

    if ( select == 1 ) {
      prompt("Link for HTML-documents", hyperlinkRef + parameterString);
    }
    
    if ( select == 0 ) {
      prompt("Link for LaTeX-documents", "\\href{" + hyperlinkRef + parameterString + "}{TEXT}");
    }
  }
}
