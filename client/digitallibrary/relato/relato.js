top.name = 'f'

if ( !top.focused )
  top.focused = '';


function identity() {
  return 'Relato v0.1';
}


function frameSelected() {
  return top.focused != '';
}


function noFrameSelected() {
  alert( "No frame activated at the moment - click on the desired frame to activate it!" );
}


function nameOfSelectedFrame() {
  return top.focused.name;
}


function selectedFrameObject() {
  return top.focused;
}


function hex_color(dec) {
  var hex = "#";
  for (i = 6; i > 0; i--) {
    var pow = Math.pow(16, i);
    if (pow < dec) {
      val = parseInt(dec / pow);
      dec -= val*pow;
      if (val > 9) {
        switch (val) {
          case (10): hex += 'A'; break;
          case (11): hex += 'B'; break;
          case (12): hex += 'C'; break;
          case (13): hex += 'D'; break;
          case (14): hex += 'E'; break;
          case (15): hex += 'F'; break;
        }
      } else {
        hex += val;
      }
    } else {
      hex += "0";
    }
  } 
  return hex;
}

function init() {
  // do the initialisation just if it is top-level relato
  if ( top == window ) {
    init_rec( top, top.name );
  }
  return true;
}


function init_rec( current, name ) {
  
  if (current.frames.length > 0) {
    for ( i=0; i < current.frames.length; i++ ) {
      if (!current.frames[i].name) {
        current.frames[i].name = name + i;
      }
      current.frames[i].addEventListener( 'click', focusListener, true );
      current.frames[i].addEventListener( 'unload', unloadListener, true );
      if (current.frames[i] == selectedFrameObject()) {
//        var color = current.frames[i].document.bgColor;
//        if (color.match(/#\d{6}/)) { 
//          color = parseInt('0x' + color.slice(1)) - parseInt('0x222222');
//          if (color < 0) {
//            color = 0;
//          }
//          current.frames[i].document.bgColor = hex_color(color);
//        }
        current.frames[i].document.bgColor = '#444444';
      }
      init_rec( current.frames[i], current.frames[i].name );
    }
  }    
}


function focusListener( event ) {

  var active = this;
  
  if ( event.ctrlKey ) {
    active = this.parent;
  }

  markActiveFrame_rec( top, active );

  top.focused = active;

  // just debug information
  window.status = top.focused.name;
}


function unloadListener( event ) {
  setTimeout('init()', 250);
}

function markActiveFrame_rec(current, active) {
  
  if ( current.frames.length > 0 ) {
    for ( i=0; i < current.frames.length; i++ ) {
      markActiveFrame_rec( current.frames[i], active );
    }
  } else {
    if ( current.name.indexOf(active.name) == 0 ) {
//      var color = current.document.bgColor;
//      if (color.match(/#\d{6}/)) {
//        color = parseInt('0x' + color.slice(1)) - parseInt('0x222222');
//        if (color < 0) {
//          color = 0;
//        }
//        current.document.bgColor = hex_color(color);
//      }
      current.document.bgColor = '#444444';
    } else {
      current.document.bgColor = '#666666';
    }
  }
}


function loadFocusedFrame(url) {

  if (frameSelected()) {
    top.focused.location.href = url;
    setTimeout( 'top.init()', 1000 );
  } else {
    noFrameSelected();
  }
}


function loadNamedFrame(url, framename) {

  desired = loadNamedFrame_rec(top, framename);
  if ( desired ) {
    desired.location.href = url;
    setTimeout( 'top.init()', 1000 );
  } else {
    alert( "Error - a frame with this name does not exist!" );
  }
}

function loadNamedFrame_rec(current, framename) {

  if ( current.frames.length > 0 ) {
    for ( i=0; i < current.frames.length; i++ ) {
      thisone = loadNamedFrame_rec(current.frames[i], framename);
      if (thisone) {
        return thisone;
      }
    }
  } else {
  	if (current.name == framename) {
      return current;
    } else {
      return null;
    }
  }
}
