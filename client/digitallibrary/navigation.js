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
 
Author: Christian Luginbuehl, 01.05.2003 , Version Alcatraz 0.4

*/

var ZOOMFACTOR = Math.sqrt(2);

dlParams = new Object();

function newParameter(name, value, defaultValue, detail) {

  if ( !dlParams[name] ) {

    dlParams[name] = new Object();

    dlParams[name].value        = value;
    dlParams[name].defaultValue = defaultValue;
    dlParams[name].detail       = detail;

    return dlParams[name];

  } else {

    alert("Fatal: An object with name '" + name + "' already exists - cannot recreate!");
    return false;

  }
}

function getParameter(name) {

  if ( dlParams[name] ) {
    return dlParams[name].value;
  } else {
    return false;
  }
}



function listParametersAsString() {

  var params = new Array();

  for ( param in dlParams ) {
    params.push(param);
  }

  return params.join(",");

}


function listParameters() {

  var params = new Array();

  for ( param in dlParams ) {
    params.push(param);
  }

  return params;

}


function init() {

  // give a name to the window containing digilib - this way one can test if there is already a
  // digilib-window open and replace the contents of it (ex. digicat)
  top.window.name = "digilib";

  placeMarks();

  if ( document.all ) {
    this.document.onkeypress = parseKeypress;
  } else if ( typeof(document.addEventListener) == "function" ) {
    this.document.addEventListener('keypress', parseKeypress, true);
  } else {
    window.captureEvents(Event.KEYDOWN);
    window.onkeydown = parseKeypress;
  }
  
  focus();
}


function display(detail) {

  var queryString = '';

  for ( param in dlParams ) {

    if ( dlParams[param].defaultValue != dlParams[param].value ) {
      if ( dlParams[param].detail <= detail ) {
        queryString += "&" + param + "=" + dlParams[param].value;
      } else {
        queryString += "&" + param + "=" + dlParams[param].defaultValue;
      }
    }

  }

  if ( document.body ) {
  	queryString += "&dw=" + (document.body.clientWidth-30) + "&dh=" + (document.body.clientHeight-30);
  } else {
    queryString += "&dw=" + (innerWidth-30) + "&dh=" + (innerHeight-30);
  }

  queryString += "&lv=1";

  queryString = queryString.slice(1);

  location.href = location.protocol + "//" + location.host + location.pathname + "?" + queryString;

}


// constructor holding different values of a point
function Point(evt) {

	if ( document.all ) {

    this.pageX = parseInt(document.body.scrollLeft+event.clientX);
    this.pageY = parseInt(document.body.scrollLeft+event.clientY);

    this.x = this.pageX-parseInt(document.all.lay1.style.left);
    this.y = this.pageY-parseInt(document.all.lay1.style.top);

    this.relX = cropFloat(parseFloat(dlParams.wx.value)+(dlParams.ww.value*this.x/document.all.lay1.offsetWidth));
    this.relY = cropFloat(parseFloat(dlParams.wy.value)+(dlParams.wh.value*this.y/document.all.lay1.offsetHeight));

	} else {

    this.pageX = parseInt(evt.pageX);
    this.pageY = parseInt(evt.pageY);

	  if ( typeof(document.getElementById) == "function" ) {

      this.x = this.pageX-parseInt(document.getElementById("lay1").style.left);
      this.y = this.pageY-parseInt(document.getElementById("lay1").style.top);

      this.relX = cropFloat(parseFloat(dlParams.wx.value)+(dlParams.ww.value*this.x/document.pic.offsetWidth));
      this.relY = cropFloat(parseFloat(dlParams.wy.value)+(dlParams.wh.value*this.y/document.pic.offsetHeight));

    } else {

      this.x = this.pageX-document.lay1.left;
      this.y = this.pageY-document.lay1.top;

      this.relX = cropFloat(parseFloat(dlParams.wx.value)+(dlParams.ww.value*this.x/document.lay1.clip.width));
      this.relY = cropFloat(parseFloat(dlParams.wy.value)+(dlParams.wh.value*this.y/document.lay1.clip.height));

    }

  }

  return this;

}


function page(page, details) {

  if ( details == null ) {
    details = 1;
  }
  
  if ( page.indexOf('-') == 0 ) {
    if ( dlParams.pn.value > 1 ) {
      page = Math.max(parseInt(dlParams.pn.value) - parseInt(page.slice(1)), 1);
      dlParams.pn.value = page;
      display(details);
    } else {
      alert("You are already on the first page!");
    }

  } else if ( page.indexOf('+') == 0 ) {
    page = parseInt(dlParams.pn.value) + parseInt(page.slice(1));
    dlParams.pn.value = page;
    display(details);
  } else if ( page == parseInt(page) ) {
    dlParams.pn.value = parseInt(page);
    display(details);
  }

}


function digicat() {

  var url = baseUrl + "/digicat.jsp?" + dlParams.fn.value + "+" + dlParams.pn.value;
  win = window.open(url, "digicat");
  win.focus();

}


function ref(select) {

	var hyperlinkRef = baseUrl + "/digilib.jsp?";
	hyperlinkRef += dlParams.fn.value + "+" + dlParams.pn.value + "+" + dlParams.ws.value + "+";
	hyperlinkRef += dlParams.mo.value + "+" + dlParams.mk.value;
	
	if ( (dlParams.wx.value != 0) || (dlParams.wy.value != 0) || (dlParams.ww.value != 1) || (dlParams.wh.value != 1) ) {
		hyperlinkRef += "+" + dlParams.wx.value + "+" + dlParams.wy.value + "+" + dlParams.ww.value;
		hyperlinkRef += "+" + dlParams.wh.value;
	}

	if ( select == 0 ) {
		prompt("Link for LaTeX-documents", "\\href{" + hyperlinkRef + "}{TEXT}");
	} else if ( select == 1 ) {
		prompt("Link for HTML-documents", hyperlinkRef);
	}
}


function mark() {

	if ( dlParams.mk.value.split(";").length > 7 ) {
		alert("Only 8 marks are possible at the moment!");
		return;
	}

	function markEvent(evt) {

    var point = new Point(evt);

		if ( dlParams.mk.value != '' ) {
			dlParams.mk.value += ';';
		}

		dlParams.mk.value += point.relX + '/' + point.relY;

    // stopping event capture
  	if ( document.all ) {
  	  document.all.lay1.onmousedown = null;
  	} else if ( typeof(document.removeEventListener) == "function" ) {
      document.getElementById("lay1").removeEventListener("mousedown", markEvent, true);
    } else {
      document.lay1.releaseEvents(Event.MOUSEDOWN);
    }

    placeMarks();

	}

  // starting event capture
	if ( document.all ) {
	  document.all.lay1.onmousedown = markEvent;
	} else if ( typeof(document.addEventListener) == "function" ) {
    document.getElementById("lay1").addEventListener("mousedown", markEvent, true);
  } else {
    document.lay1.captureEvents(Event.MOUSEDOWN);
    document.lay1.onmousedown = markEvent;
  }
}


function placeMarks() {

	if ( dlParams.mk.value != '' ) {

		var mark = dlParams.mk.value.split(";");
		var mark_count = mark.length;

		// maximum of marks is 8
		// we do not report this error because this is already done in function 'mark'
		if ( mark_count > 8 ) mark_count = 8;

		var picWidth  = (document.all) ? parseInt(document.all.lay1.offsetWidth) : (typeof(document.getElementById) == "function") ? parseInt(document.pic.offsetWidth) : parseInt(document.pic.clip.width);
		var picHeight = (document.all) ? parseInt(document.all.lay1.offsetHeight) : (typeof(document.getElementById) == "function") ? parseInt(document.pic.offsetHeight) : parseInt(document.pic.clip.height);

		// catch the cases where the picture had not been loaded already and
		// make a timeout so that the coordinates are calculated with the real dimensions
		if ( (document.pic.complete) || (picWidth > 30) ) {

  		var xOffset = (document.all) ? parseInt(document.all.lay1.style.left) : (typeof(document.getElementById) == "function") ? parseInt(document.getElementById('lay1').style.left) : document.lay1.left;
  		var yOffset = (document.all) ? parseInt(document.all.lay1.style.top) : (typeof(document.getElementById) == "function") ? parseInt(document.getElementById('lay1').style.top) : document.lay1.top;

			for (var i = 0; i < mark_count; i++) {
				mark[i] = mark[i].split("/");

				if ( (mark[i][0] >= dlParams.wx.value) && (mark[i][1] >= dlParams.wy.value) && (mark[i][0] <= (parseFloat(dlParams.wx.value) + parseFloat(dlParams.ww.value))) && (mark[i][1] <= (parseFloat(dlParams.wy.value) + parseFloat(dlParams.wh.value))) ) {

					mark[i][0] = parseInt(xOffset + picWidth * (mark[i][0] - dlParams.wx.value)/dlParams.ww.value);
					mark[i][1] = parseInt(yOffset + picHeight * (mark[i][1] - dlParams.wy.value)/dlParams.wh.value);

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


function zoomPoint() {

  function zoomPointEvent(evt) {

    var point = new Point(evt);

		dlParams.wx.value = cropFloat(point.relX-0.5*dlParams.ww.value*(1/ZOOMFACTOR));
		dlParams.wy.value = cropFloat(point.relY-0.5*dlParams.wh.value*(1/ZOOMFACTOR));

		dlParams.ww.value = cropFloat(dlParams.ww.value*(1/ZOOMFACTOR));
		dlParams.wh.value = cropFloat(dlParams.wh.value*(1/ZOOMFACTOR));

		if ( dlParams.wx.value < 0 ) {
			dlParams.wx.value = 0;
		}
		if ( dlParams.wy.value < 0 ) {
			dlParams.wy.value = 0;
		}
		if ( dlParams.wx.value + dlParams.ww.value > 1 ) {
			dlParams.wx.value = 1 - dlParams.ww.value;
		}
		if ( dlParams.wy.value + dlParams.wh.value > 1 ) {
			dlParams.wy.value = 1 - dlParams.wh.value;
		}

    // stopping event capture
  	if ( document.all ) {
  	  document.all.lay1.onmousedown = null;
  	} else if ( typeof(document.removeEventListener) == "function" ) {
      document.getElementById("lay1").removeEventListener("mousedown", zoomPointEvent, true);
    } else {
      document.lay1.releaseEvents(Event.MOUSEDOWN);
    }
		
		display(3);
	}

  // starting event capture
	if ( document.all ) {
	  document.all.lay1.onmousedown = zoomPointEvent;
	} else if ( typeof(document.addEventListener) == "function" ) {
    document.getElementById("lay1").addEventListener("mousedown", zoomPointEvent, true);
  } else {
    document.lay1.captureEvents(Event.MOUSEDOWN);
    document.lay1.onmousedown = zoomPointEvent;
  }
}


function zoomArea() {
	var state = 0;
	var pt1, pt2;

	function click(evt) {

		if (state == 0) {
			state = 1;
			
			pt1 = new Point(evt);
			pt2 = pt1;
			
    	if ( document.all ) {

        document.all.eck1.style.left = pt1.pageX;
        document.all.eck1.style.top = pt1.pageY;
        document.all.eck2.style.left = pt2.pageX-12;
        document.all.eck2.style.top = pt1.pageY;
        document.all.eck3.style.left = pt1.pageX;
        document.all.eck3.style.top = pt2.pageY-12;
        document.all.eck4.style.left = pt2.pageX-12;
        document.all.eck4.style.top = pt2.pageY-12;

        document.all.eck1.style.visibility="visible";
        document.all.eck2.style.visibility="visible";
        document.all.eck3.style.visibility="visible";
        document.all.eck4.style.visibility="visible";

    	  document.all.lay1.onmousemove = move;
    	  document.all.eck4.onmousemove = move;

    	} else if ( typeof(document.addEventListener) == "function" ) {

        document.getElementById("eck1").style.left = pt1.pageX;
        document.getElementById("eck1").style.top = pt1.pageY;
        document.getElementById("eck2").style.left = pt2.pageX-12;
        document.getElementById("eck2").style.top = pt1.pageY;
        document.getElementById("eck3").style.left = pt1.pageX;
        document.getElementById("eck3").style.top = pt2.pageY-12;
        document.getElementById("eck4").style.left = pt2.pageX-12;
        document.getElementById("eck4").style.top = pt2.pageY-12;

        document.getElementById("eck1").style.visibility="visible";
        document.getElementById("eck2").style.visibility="visible";
        document.getElementById("eck3").style.visibility="visible";
        document.getElementById("eck4").style.visibility="visible";

        document.getElementById("lay1").addEventListener("mousemove", move, true);
        document.getElementById("eck4").addEventListener("mousemove", move, true);

      } else {

        document.eck1.moveTo(pt1.pageX, pt1.pageY);
        document.eck2.moveTo(pt2.pageX-12, pt1.pageY);
        document.eck3.moveTo(pt1.pageX, pt2.pageY-12);
        document.eck4.moveTo(pt2.pageX-12, pt2.pageY-12);

        document.eck1.visibility="show";
        document.eck2.visibility="show";
        document.eck3.visibility="show";
        document.eck4.visibility="show";

        document.lay1.captureEvents(Event.MOUSEMOVE);
        document.eck4.captureEvents(Event.MOUSEMOVE);
        document.lay1.onmousemove = move;
        document.eck4.onmousemove = move;

      }

    } else {

      pt2 = new Point(evt);
			
      if ( document.all ) {

        document.all.eck1.visibility="hidden";
        document.all.eck2.visibility="hidden";
        document.all.eck3.visibility="hidden";
        document.all.eck4.visibility="hidden";

        document.all.lay1.onmousedown = null;
        document.all.eck4.onmousedown = null;
        document.all.lay1.onmousemove = null;
        document.all.eck4.onmousemove = null;

      } else if ( typeof(document.removeEventListener) == "function" ) {

        document.getElementById("eck1").style.visibility="hidden";
        document.getElementById("eck2").style.visibility="hidden";
        document.getElementById("eck3").style.visibility="hidden";
        document.getElementById("eck4").style.visibility="hidden";

        document.getElementById("lay1").removeEventListener("mousedown", click, true);
        document.getElementById("eck4").removeEventListener("mousedown", click, true);
        document.getElementById("lay1").removeEventListener("mousemove", move, true);
        document.getElementById("eck4").removeEventListener("mousemove", move, true);

      } else {

        document.eck1.visibility="hide";
        document.eck2.visibility="hide";
        document.eck3.visibility="hide";
        document.eck4.visibility="hide";

        document.lay1.releaseEvents(Event.MOUSEDOWN);
        document.eck4.releaseEvents(Event.MOUSEDOWN);
        document.lay1.releaseEvents(Event.MOUSEMOVE);
        document.eck4.releaseEvents(Event.MOUSEMOVE);

      }

      dlParams.wx.value = cropFloat(parseFloat(Math.min(pt1.relX, pt2.relX)));
      dlParams.wy.value = cropFloat(parseFloat(Math.min(pt1.relY, pt2.relY)));

      dlParams.ww.value = cropFloat(parseFloat(Math.abs(pt1.relX-pt2.relX)));
      dlParams.wh.value = cropFloat(parseFloat(Math.abs(pt1.relY-pt2.relY)));

      if ( (dlParams.ww.value != 0) && (dlParams.wh.value != 0) ) {
        display(3);
      }
    }
  }

  function move(evt) {

    pt2 = new Point(evt);

    var eck1_left = ((pt1.pageX < pt2.pageX) ? pt1.pageX : pt2.pageX);
    var eck1_top  = ((pt1.pageY < pt2.pageY) ? pt1.pageY : pt2.pageY);
    var eck2_left = ((pt1.pageX < pt2.pageX) ? pt2.pageX : pt1.pageX)-12;;
    var eck2_top  = ((pt1.pageY < pt2.pageY) ? pt1.pageY : pt2.pageY);
    var eck3_left = ((pt1.pageX < pt2.pageX) ? pt1.pageX : pt2.pageX);
    var eck3_top  = ((pt1.pageY < pt2.pageY) ? pt2.pageY : pt1.pageY)-12;
    var eck4_left = ((pt1.pageX < pt2.pageX) ? pt2.pageX : pt1.pageX)-12;
    var eck4_top  = ((pt1.pageY < pt2.pageY) ? pt2.pageY : pt1.pageY)-12;

    if ( document.all ) {
      
      document.all.eck1.style.left = eck1_left;
      document.all.eck1.style.top  = eck1_top;
      document.all.eck2.style.left = eck2_left;
      document.all.eck2.style.top  = eck2_top;
      document.all.eck3.style.left = eck3_left;
      document.all.eck3.style.top  = eck3_top;
      document.all.eck4.style.left = eck4_left;
      document.all.eck4.style.top  = eck4_top;

    } else if ( typeof(document.getElementById) == "function" ) {

      document.getElementById("eck1").style.left = eck1_left;
      document.getElementById("eck1").style.top  = eck1_top;
      document.getElementById("eck2").style.left = eck2_left;
      document.getElementById("eck2").style.top  = eck2_top;
      document.getElementById("eck3").style.left = eck3_left;
      document.getElementById("eck3").style.top  = eck3_top;
      document.getElementById("eck4").style.left = eck4_left;
      document.getElementById("eck4").style.top  = eck4_top;

    } else {

      document.eck1.moveTo(eck1_left, eck1_top);
      document.eck2.moveTo(eck2_left, eck2_top);
      document.eck3.moveTo(eck3_left, eck3_top);
      document.eck4.moveTo(eck4_left, eck4_top);

    }
  }

  // starting event capture
  if ( document.all ) {
    document.all.lay1.onmousedown = click;
    document.all.eck4.onmousedown = click;
  } else if ( typeof(document.addEventListener) == "function" ) {
      document.getElementById("lay1").addEventListener("mousedown", click, true);
      document.getElementById("eck4").addEventListener("mousedown", click, true);
  } else {
    document.lay1.captureEvents(Event.MOUSEDOWN);
    document.eck4.captureEvents(Event.MOUSEDOWN);
    document.lay1.onmousedown = click;
    document.eck4.onmousedown = click;
  }
}


function zoomExtends() {

  dlParams.wx.value = 0.0;
  dlParams.wy.value = 0.0;
  
  dlParams.ww.value = 1.0;
  dlParams.wh.value = 1.0;

  display(3);

}


function zoomOut() {

  dlParams.wx.value = cropFloat(dlParams.wx.value-0.5*(dlParams.ww.value*(ZOOMFACTOR)-dlParams.ww.value));
  dlParams.wy.value = cropFloat(dlParams.wy.value-0.5*(dlParams.wh.value*(ZOOMFACTOR)-dlParams.wh.value));

  dlParams.ww.value = cropFloat(dlParams.ww.value*(ZOOMFACTOR));
  dlParams.wh.value = cropFloat(dlParams.wh.value*(ZOOMFACTOR));

	if ( dlParams.wx.value < 0 ) {
		dlParams.wx.value = 0;
	}
	if ( dlParams.wy.value < 0 ) {
		dlParams.wy.value = 0;
	}
  if ( dlParams.ww.value > 1 ) {
    dlParams.ww.value = 1;
  }
  if ( dlParams.wh.value > 1 ) {
    dlParams.wh.value = 1;
  }
	if ( dlParams.wx.value + dlParams.ww.value > 1 ) {
		dlParams.wx.value = 1 - dlParams.ww.value;
	}
	if ( dlParams.wy.value + dlParams.wh.value > 1 ) {
		dlParams.wy.value = 1 - dlParams.wh.value;
	}

	display(3);
}


function moveTo() {

	if ( (parseFloat(dlParams.ww.value) == 1.0) && (parseFloat(dlParams.wh.value) == 1.0) ) {
		alert("This function is only available when zoomed in!");
		return;
	}

  function moveToEvent(event) {

    var point = new Point(event);

		dlParams.wx.value = cropFloat(point.relX-0.5*dlParams.ww.value);
		dlParams.wy.value = cropFloat(point.relY-0.5*dlParams.wh.value);

		if ( dlParams.wx.value < 0 ) {
			dlParams.wx.value = 0;
		}
		if ( dlParams.wy.value < 0 ) {
			dlParams.wy.value = 0;
		}
		if ( dlParams.wx.value + dlParams.ww.value > 1 ) {
			dlParams.wx.value = 1 - dlParams.ww.value;
		}
		if ( dlParams.wy.value + dlParams.wh.value > 1 ) {
			dlParams.wy.value = 1 - dlParams.wh.value;
		}

    // stopping event capture
  	if ( document.all ) {
  	  document.all.lay1.onmousedown = null;
  	} else if ( typeof(document.removeEventListener) == "function" ) {
      document.getElementById("lay1").removeEventListener("mousedown", moveToEvent, true);
    } else {
      document.lay1.releaseEvents(Event.MOUSEDOWN)
    }
		
		display(3);
	}

  // starting event capture
	if ( document.all ) {
	  document.all.lay1.onmousedown = moveToEvent;
	} else if ( typeof(document.addEventListener) == "function" ) {
    document.getElementById("lay1").addEventListener("mousedown", moveToEvent, true);
  } else {
    document.lay1.captureEvents(Event.MOUSEDOWN);
    document.lay1.onmousedown = moveToEvent;
  }
}


function scale(factor) {

  dlParams.ws.value = cropFloat(factor);
  display(3);

}


// capturing keypresses for next and previous page
function parseKeypress(evt) {

  if ( document.all ) {

  	if ( event.keyCode == 110 ) {
		  page('+1');
  	}
  	if ( event.keyCode == 98 ) {
		  page('-1');
  	}

  	document.cancleBubble = true;

  } else {

  	if ( evt.charCode == 110 ) {
		  page('+1');
	  } else if ( evt.charCode == 98 ) {
		  page('-1');
	  } else if ( evt.which == 110 ) {
		  page('+1');
  	} else if ( evt.which == 98 ) {
    	// does not work currentlyfor Opera, because it catches the 'b'-key on it's own
    	// have to change the key or find another way - luginbuehl
		  page('-1');
  	}

  }
}


// auxiliary function to crop senseless precicsion
function cropFloat(tmp) {
  return parseInt(10000*tmp)/10000;
}
