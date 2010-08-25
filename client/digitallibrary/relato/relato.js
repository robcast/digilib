top.name = 'f';

if ( !top.focused )
  top.focused = new Object();


function identify() {
  return 'Relato v0.1';
}


function frameSelected() {
  return top.focused != '';
}


function frameSelectable(name) {
  // created by xls
  var frames = protectedFrames();
  var selectable = true;
  for (var i=0; i<frames.length; i++) {
    if (frames[i] == name) {
      selectable = false;
    }
  }
  return selectable;
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
      if (frameSelectable(current.frames[i].name)) {
        current.frames[i].addEventListener( 'click', focusListener, true );
        if (current.frames[i].name == nameOfSelectedFrame()) {
          top.focused = current.frames[i];
        }
      } else {
        if (current.frames[i] == selectedFrameObject()) {
          top.focused = '';
        }
      } 
      current.frames[i].addEventListener( 'unload', unloadListener, true );
      init_rec( current.frames[i], current.frames[i].name );
    }
  }    
}


function listFrames() {

  var frames = new Array();

  function listFrames_rec( current )  {

    if (current.frames.length > 0) {
      for (var i=0; i < current.frames.length; i++) {
        listFrames_rec(current.frames[i]);
      }
    } else {
      frames.push(current);
    }
  }

  listFrames_rec(top);

  return frames;

}


function getXML() {
  query_string = location.search;
  query_string.search(/xml=([^\&]*)\&/);
  return RegExp.$1;
} 


function blink() {
  orig_color = top.focused.document.bgColor;
  top.focused.document.bgColor="black";
  setTimeout('top.focused.document.bgColor="' + orig_color + '"', 100);
}


function focusListener( event ) {

  var active = this;
  
  if ( event.ctrlKey ) {
    active = this.parent;
  }

  // can be used in future to mark several frames 
  // markActiveFrame_rec( top, active );

  top.focused = active;

  blink();

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
