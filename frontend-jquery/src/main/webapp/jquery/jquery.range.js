/*
 * jQuery.range - A tiny, easily styleable range selector
 * Tom Moor, http://tommoor.com
 * Copyright (c) 2011 Tom Moor
 * MIT Licensed
 * @version 1.0
 */

/*
 * minor bug fixes (c) 2012 Martin Raspe (hertzhaft@biblhertz.it)
*/

(function($){

  var TinyRange = function(){
    // locals
    var options;
    var $input;
    var $rail;
    var $handle;
    var $handle2;
    var $selection;
    var $dragging;
    var $original;
    var jump;
    var size;
    var defaults = {
      orientation: 'horizontal', // todo
      range: false,
      values: false,
      snap: false,
      change: null,
      blur: null
    };
    
    var jumpHandle = function(ev) {
      ev.pageX = ev.pageX - $input.offset().left;
      
      // get closest handle
      var x1 = $handle.position().left;
      var dist = ev.pageX - x1;
      
      if($handle2){
        var x2 = $handle2.position().left;
        var dist2 = ev.pageX - x2;
      }

      // move towards click
      if(!$handle2 || Math.abs(dist) < Math.abs(dist2) ){
        if(dist > 0) moveHandle($handle, valueToPx(jump)+x1);
        if(dist < 0) moveHandle($handle, -valueToPx(jump)+x1);
      } else {
        if(dist2 > 0) moveHandle($handle2, valueToPx(jump)+x2);
        if(dist2 < 0) moveHandle($handle2, -valueToPx(jump)+x2);
      }
    }
    
    var moveHandle = function($h, p, update){

      var boundR = $input.width()-size;
      var boundL = 0;

      if(options.range){
        if($h[0] === $handle[0]){
          boundR = $handle2.position().left;
        } else {
          boundL = $handle.position().left;
        }
      }
      
      if(p >= boundR){
        p = boundR;
      } else if(p <= boundL){
        p = boundL;
      }
      
// leads to erratic behaviour with "step" attribute
//      if(options.snap && p !== boundR){
//         var snapPx = valueToPx(options.snap);
//         p = Math.round(p/snapPx) * snapPx;
//      }
      
      $h.css({'left': p, 'position': 'absolute'});
      if(options.range) updateSelection();
      if(update !== false) updateValues();
    }
    
    var dragStart = function(ev){
      ev.stopPropagation();
      ev.preventDefault();
      
      $dragging = $(this);
    };
    
    var drag = function(ev){
     
      if($dragging){
        ev.preventDefault();
        var pos = ev.pageX - $input.offset().left;
        
        moveHandle($dragging, pos);
      }
    };
    
    var updateSelection = function(){
    
      var p = $handle.position().left;
      var w = $handle2.position().left-p;
      $selection.css({
        'left': p, 
        'width': w,
        'position': 'absolute'
      });
    };
    
    var dragEnd = function(ev){
      if($dragging){
        $dragging = null;
        if (options.blur == null) {
          // send original blur event
          $original.blur();
        } else {
          options.blur(options.values);
        }
      }
    };
    
    var updateValues = function(){

      var prev;
      if(options.range){
      
        prev = options.values.slice(); // clone
        options.values[0] = bound(pxToValue($handle.position().left));
        options.values[1] = bound(pxToValue($handle2.position().left));
        
        // set value on original element
        $original.val(options.values[0] +','+options.values[1]);
      } else {
      
        prev = options.values;
        options.values = bound(pxToValue($handle.position().left));
        
        // set value on original element
        $original.val(options.values);
      }

      if(options.values !== prev) {
          if (options.change == null) {
            // trigger original change event
            $original.change();
          } else {
            options.change(options.values);
          }
      }
    };
    
    var updateHandles = function(){

      if (options.values != null) {
        if (options.range){
          moveHandle($handle2, valueToPx(options.values[1]), false);
          moveHandle($handle, valueToPx(options.values[0]), false);
        } else {
          moveHandle($handle, valueToPx(options.values), false);
        }
      }
      
      updateValues();
    };
    
    var pxToValue = function (px) {
      var w = $input.width() - size;
      var valspan = options.max - options.min;
      var v = px * valspan / w + options.min;
      if (options.snap) {
        var tmp = v < 0
            ? Math.floor(v / options.snap) * options.snap
            : Math.round(v / options.snap) * options.snap;
        // hack to cut off floating point imprecision
        var result = parseFloat(tmp.toFixed(4));
        return result;
        }
      return Math.round(v);
    };

    var valueToPx = function (val) {
      var w = $input.width() - size;
      var valspan = options.max - options.min;
      var valpos = val - options.min;
      var v = valpos * w / valspan;
      return v;
    };

    var bound = function(input){
      return Math.max(Math.min(input, options.max), options.min);
    };

    var methods = {
      init : function (o) {
        // element already replaced
        if($(this).data('TinyRange')) return this;
        // options 
        defaults.min = parseFloat($(this).attr('min'));
        defaults.max = parseFloat($(this).attr('max'));
        defaults.snap = parseFloat($(this).attr('step'));

        // options passed into plugin override input attributes
        options = $.extend(defaults, o);

        if(options.values){
          //
        } else if(options.range){
          options.values = [0, options.max];
        } else {
          options.values = parseFloat($(this).attr('value'));
        }
        // how far do handles jump on click, default to step value
        jump = options.snap ? options.snap : options.max/10;
        // create dom elements
        $input  = $('<div/>', {'class': 'range-input'}).mousedown(jumpHandle);
        $rail   = $('<div/>', {'class': 'range-rail'}).appendTo($input);
        if(options.range) $selection = $('<div/>', {'class': 'range-selection'}).appendTo($input); 
        $handle = $('<a/>', {'class': 'range-handle'}).appendTo($input).mousedown(dragStart);
        if(options.range) $handle2 = $handle.clone(true).appendTo($input);
        // replace dom element
        $(this).after($input);
        $(this).hide();
        $original = $(this);
        // attach events
        $(document).bind('mouseup', dragEnd);
        $(document).bind('mousemove', drag);
        // position handles
        size = $handle.width();
        updateHandles();
        return this;
      },

      set: function(input){

        if(typeof input === 'string'){
          options.values = bound(input); 
        } else if(typeof input === 'object' && input.length === 2){
          options.values[0] = bound(input[0]);
          options.values[1] = bound(input[1]);
        }
        updateHandles();
      },

      destroy : function(){
        $input.remove();
        $(this).show().data('TinyRange', false);
        $(document).unbind('mouseup', dragEnd);
        $(document).unbind('mousemove', drag);
        return this;
      }
    };

    return methods;
  };

  $.fn.range = function(method) {
  
    // so that arguments are accessible within each closure
    var args = arguments;

    return this.each(function(){
      var state = $(this).data('TinyRange');

      // Method calling logic
      if (state && state[method] ) {
        state[ method ].apply( this, Array.prototype.slice.call( args, 1 ));
      } else if ( typeof method === 'object' || ! method ) {
      
        // create new tinyrange
        var tr = (new TinyRange(this));
        tr.init.apply( this, args );
        
        // save state in jquery data
        $(this).data('TinyRange', tr);
        
      } else {
        $.error( 'Method ' +  method + ' does not exist on jQuery.range' );
      }    
    });
  };
})(jQuery);
