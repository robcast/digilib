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
 *  imago.js : digilib-module                                            *
 *                                                                       *
 *  desc: adds different image manipulation functions.                   *
 *                                                                       *
 *************************************************************************/


/**
 * brightness (value of brightness between -255 - +255)
 */
function brightness(value) {

  if ( (value >= -255) && (value <= 255) ) {
    
    dlParams.brgt.value = value;
    display(3);

  }

}


/**
 * contrast (value of contrast - range?)
 */
function contrast(value) {

  dlParams.cont.value = parseFloat(value);
  display(3);

}


/**
 * brightness/contrast in one call
 */
function brightnessContrast(brightness, contrast) {

  dlParams.cont.value = parseFloat(contrast);

  if ( (brightness >= -255) && (brightness <= 255) ) {

    dlParams.brgt.value = parseFloat(brightness);
    display(3);

  }

}


/**
 * mirror (horizontal or vertical)
 */
function mirror(direction) {

  if ( direction == 'v' ) {
    if ( dlParams.mo.value.indexOf('vmir') > -1 ) {
      removeMoFlag('vmir');
    } else {
      addMoFlag('vmir');
    }
  }
  
  if ( direction == 'h' ) {
    if ( dlParams.mo.value.indexOf('hmir') > -1 ) {
      removeMoFlag('hmir');
    } else {
      addMoFlag('hmir');
    }
  }

  display(3);

}


/**
 * rotation
 */
function rotation(value) {

  value = parseFloat(value) % 360;
  
  if ( value < 0 ) {
    value += 360;
  }

  dlParams.rot.value = value;
  display(3);

}


/**
 * rgb add (r/g/b, each value from -255 to +255)
 */
function rgba(value) {

  values = value.split("/");
  
  if ( values.length != 3 ) {
    alert ("Illegal parameter format (r/g/b)");
  } else if ( (values[0] < -255) || (values[0] > 255) ) {
    alert ("Illegal red additioner (-255 to 255)");
  } else if ( (values[1] < -255) || (values[1] > 255) ) {
    alert ("Illegal green additioner (-255 to 255)");
  } else if ( (values[2] < -255) || (values[2] > 255) ) {
    alert ("Illegal blue additioner (-255 to 255)");
  } else {
 
    dlParams.rgba.value = value;
    display(3);

  }
}


/**
 * rgb mutiply (r/g/b, range?)
 */
function rgbm(value) {

  values = value.split("/");
  
  if ( values.length != 3 ) {
    alert ("Illegal parameter format (r/g/b)");
  } else if ( !isFinite(values[0]) ) {
    alert ("Illegal red exponent");
  } else if ( !isFinite(values[1]) ) {
    alert ("Illegal green exponent");
  } else if ( !isFinite(values[2]) ) {
    alert ("Illegal blue exponent");
  } else {
 
    dlParams.rgbm.value = value;
    display(3);

  }
}


/**
 * rgba/rgbm in one call
 */
function colors(rgba, rgbm) {

  add  = rgba.split("/");
  mult = rgba.split("/");
  
  if ( (add.length) == 3 && (mult.length == 3) &&
       (add[0] >= -255) && (add[0] <= 255) &&
       (add[1] >= -255) && (add[1] <= 255) &&
       (add[2] >= -255) && (add[2] <= 255) &&
       (isFinite(mult[0])) &&
       (isFinite(mult[1])) &&
       (isFinite(mult[2])) ) {

    dlParams.rgba.value = rgba;
    dlParams.rgbm.value = rgbm;

    display(3);

  }
}


/**
 * pixel by pixel view of images
 */
function pixelByPixel() {

  removeMoFlag('osize');

  addMoFlag('clip');
  
  // change scale to 1
  dlParams.ws.value = 1.0;
  
  display(3);

}


/**
 * original size view of images
 */
function originalSize(dpi_v, dpi_h) {

  removeMoFlag('clip');
  
  addMoFlag('osize');
  
  // change scale to 1
  dlParams.ws.value = 1.0;

  dlParams.ddpix.value = dpi_h;
  dlParams.ddpiy.value = dpi_v;
  
  display(3);

}


/**
 * scale (overriding old one)
 *   as pixel by pixel is some kind of scale, it does turn scale factor to 1 
 *   if chosen. also if a scale factor is chosen,
 *   then pixel by pixel is turned off.
 */
function scale(factor) {

	dlParams.ws.value = factor;

  removeMoFlag('clip');
  removeMoFlag('osize');

	display(3);

}


/**
 * placeMarks (overriding old one)
 *   take care of rotation and mirroring when placing marks
 */
function placeMarks() {

	if ( dlParams.mk.value != '' ) {

		var mark = dlParams.mk.value.split(";");
		var mark_count = mark.length;

		// maximum of marks is 8
		// we do not report this error because this is already done in function 'mark'
		if ( mark_count > 8 ) mark_count = 8;

		var picWidth  = (document.all) ? parseInt(document.all.lay1.offsetWidth) : (typeof(document.getElementById) == "function") ? parseInt(document.pic.offsetWidth) : parseInt(document.lay1.clip.width);
		var picHeight = (document.all) ? parseInt(document.all.lay1.offsetHeight) : (typeof(document.getElementById) == "function") ? parseInt(document.pic.offsetHeight) : parseInt(document.lay1.clip.height);

		// catch the cases where the picture had not been loaded already and
		// make a timeout so that the coordinates are calculated with the real dimensions
		if (  (picWidth > 30) || (document.pic.complete) ) {

  		var xOffset = (document.all) ? parseInt(document.all.lay1.style.left) : (typeof(document.getElementById) == "function") ? parseInt(document.getElementById('lay1').style.left) : document.lay1.left;
  		var yOffset = (document.all) ? parseInt(document.all.lay1.style.top) : (typeof(document.getElementById) == "function") ? parseInt(document.getElementById('lay1').style.top) : document.lay1.top;

			for (var i = 0; i < mark_count; i++) {
				mark[i] = mark[i].split("/");

				if ( (parseFloat(mark[i][0]) >= parseFloat(dlParams.wx.value)) && 
				     (parseFloat(mark[i][1]) >= parseFloat(dlParams.wy.value)) &&
				     (parseFloat(mark[i][0]) <= (parseFloat(dlParams.wx.value) + parseFloat(dlParams.ww.value))) &&
				     (parseFloat(mark[i][1]) <= (parseFloat(dlParams.wy.value) + parseFloat(dlParams.wh.value))) ) {

					mark[i][0] = (mark[i][0] - dlParams.wx.value)/dlParams.ww.value;
 					mark[i][1] = (mark[i][1] - dlParams.wy.value)/dlParams.wh.value;
 					
          // mirror
          if ( dlParams.mo.value.indexOf('hmir') > -1 ) {
  					mark[i][0] = 1 - mark[i][0];
          }
          if ( dlParams.mo.value.indexOf('vmir') > -1 ) {
  					mark[i][1] = 1 - mark[i][1];
          }

          // just the beginning - not working currently
          var ang_rad = dlParams.rot.value*2*3.1415926/360;
          
          var ws = Math.sin(ang_rad)/(Math.cos(ang_rad)*dlParams.ww.value/dlParams.wh.value+Math.sin(ang_rad)) * picWidth;
          var wc = (Math.cos(ang_rad)*dlParams.ww.value/dlParams.wh.value)/(Math.cos(ang_rad)*dlParams.ww.value/dlParams.wh.value+Math.sin(ang_rad)) * picWidth;

          var hs = (Math.sin(ang_rad)*dlParams.ww.value/dlParams.wh.value)/(Math.sin(ang_rad)*dlParams.ww.value/dlParams.wh.value+Math.cos(ang_rad)) * picHeight;
          var hc = Math.cos(ang_rad)/(Math.sin(ang_rad)*dlParams.ww.value/dlParams.wh.value+Math.cos(ang_rad)) * picHeight;

          var origPicWidth  = Math.sqrt(Math.pow(wc, 2) + Math.pow(hs, 2));
          var origPicHeight = Math.sqrt(Math.pow(ws, 2) + Math.pow(hc, 2));
          // end of the beginning ;-)
          
					mark[i][0] = parseInt(xOffset + picWidth * mark[i][0]);
 					mark[i][1] = parseInt(yOffset + picHeight * mark[i][1]);

					if ( (document.all) || (typeof(document.getElementById) == "function") ) {
            // suboptimal to place -5 pixels and not half size of mark-image
            // should be changed in the future
            document.getElementById("dot" + i).style.left = mark[i][0]-5;
            document.getElementById("dot" + i).style.top = mark[i][1]-5;
            document.getElementById("dot" + i).style.visibility = "visible";
          } else {
     				document.layers[i+1].moveTo(mark[i][0]-5, mark[i][1]-5);
    				document.layers[i+1].visibility = "show";
          }
				}
			}

		} else {
			setTimeout("placeMarks()", 100);
		}
	}
}


/****
 * helper functions
 ****/

/**
 * Point (overriding old one)
 *   constructor holding different values of a point
 *  depending also on mirror or rotation
 */
function Point(evt) {

	if ( document.all ) {

    this.pageX = parseInt(document.body.scrollLeft+event.clientX);
    this.pageY = parseInt(document.body.scrollLeft+event.clientY);

    this.x = this.pageX-parseInt(document.all.lay1.style.left);
    this.y = this.pageY-parseInt(document.all.lay1.style.top);

    // mirror
    if ( dlParams.mo.value.indexOf('hmir') > -1 ) {
      this.relX = cropFloat(parseFloat(parseFloat(dlParams.wx.value)+parseFloat(dlParams.ww.value))-(dlParams.ww.value*this.x/document.all.lay1.offsetWidth));
    } else {
      this.relX = cropFloat(parseFloat(dlParams.wx.value)+(dlParams.ww.value*this.x/document.all.lay1.offsetWidth));
    }
    if ( dlParams.mo.value.indexOf('vmir') > -1 ) {
      this.relY = cropFloat(parseFloat(parseFloat(dlParams.wy.value)+parseFloat(dlParams.wh.value))-(dlParams.wh.value*this.y/document.all.lay1.offsetHeight));
    } else {
      this.relY = cropFloat(parseFloat(dlParams.wy.value)+(dlParams.wh.value*this.y/document.all.lay1.offsetHeight));
    }

	} else {

    this.pageX = parseInt(evt.pageX);
    this.pageY = parseInt(evt.pageY);

	  if ( typeof(document.getElementById) == "function" ) {

      this.x = this.pageX-parseInt(document.getElementById("lay1").style.left);
      this.y = this.pageY-parseInt(document.getElementById("lay1").style.top);

      // mirror
      if ( dlParams.mo.value.indexOf('hmir') > -1 ) {
        this.relX = cropFloat(parseFloat(parseFloat(dlParams.wx.value)+parseFloat(dlParams.ww.value))-(dlParams.ww.value*this.x/document.pic.offsetWidth));
      } else {
        this.relX = cropFloat(parseFloat(dlParams.wx.value)+(dlParams.ww.value*this.x/document.pic.offsetWidth));
      }
      if ( dlParams.mo.value.indexOf('vmir') > -1 ) {
        this.relY = cropFloat(parseFloat(parseFloat(dlParams.wy.value)+parseFloat(dlParams.wh.value))-(dlParams.wh.value*this.y/document.pic.offsetHeight));
      } else {
        this.relY = cropFloat(parseFloat(dlParams.wy.value)+(dlParams.wh.value*this.y/document.pic.offsetHeight));
      }

    } else {

      this.x = this.pageX-document.lay1.left;
      this.y = this.pageY-document.lay1.top;

      // mirror
      if ( dlParams.mo.value.indexOf('hmir') > -1 ) {
        this.relX = cropFloat(parseFloat(parseFloat(dlParams.wx.value)+parseFloat(dlParams.ww.value))-(dlParams.ww.value*this.x/document.lay1.clip.width));
      } else {
        this.relX = cropFloat(parseFloat(dlParams.wx.value)+(dlParams.ww.value*this.x/document.lay1.clip.width));
      }
      if ( dlParams.mo.value.indexOf('vmir') > -1 ) {
        this.relY = cropFloat(parseFloat(parseFloat(dlParams.wy.value)+parseFloat(dlParams.wh.value))-(dlParams.wh.value*this.y/document.lay1.clip.height));
      } else {
        this.relY = cropFloat(parseFloat(dlParams.wy.value)+(dlParams.wh.value*this.y/document.lay1.clip.height));
      }

    }

  }

  return this;

}


/**
 * removeMoFlag from mo parameter
 */
function removeMoFlag(name) {

  if ( dlParams.mo.value != '' ) {

    var idx_comma_after  = dlParams.mo.value.indexOf(name + ',');
    var idx_comma_before = dlParams.mo.value.indexOf(',' + name);
    var idx_nocomma      = dlParams.mo.value.indexOf(name);
    
    if ( idx_comma_after > -1 ) {
      dlParams.mo.value = dlParams.mo.value.slice(0, idx_comma_after) + dlParams.mo.value.slice(idx_comma_after+name.length+1);
    }else if ( idx_comma_before > -1 ) {
      dlParams.mo.value = dlParams.mo.value.slice(0, idx_comma_before) + dlParams.mo.value.slice(idx_comma_before+name.length+1);
    } else if ( idx_nocomma > -1 ) {
      dlParams.mo.value = dlParams.mo.value.slice(0, idx_nocomma) + dlParams.mo.value.slice(idx_nocomma+name.length);
    }
  }

}


/**
 * addMoFlag from mo parameter
 */
function addMoFlag(name) {

  if ( dlParams.mo.value.indexOf(name) == -1 ) {

    if ( dlParams.mo.value.length > 0 ) {
      dlParams.mo.value += ',' + name;
    } else {
      dlParams.mo.value = name;
    }
  }

}