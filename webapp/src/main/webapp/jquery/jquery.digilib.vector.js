/*
 * #%L
 * digilib vector plugin
 * %%
 * Copyright (C) 2014 Bibliotheca Hertziana, MPIWG Berlin
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
 * Authors: Robert Casties, Martin Raspe
 */
/**
digilib vector plugin
 */

(function($) {

    // affine geometry
    var geom;
    // plugin object with digilib data
    var digilib;

    var buttons = {
    };

    var defaults = {
        // is vector active?
        'isVectorActive' : true
    };

    var actions = {
        /**
         * set list of vector objects (shapes)
         * 
         * @param data
         * @param shapes
         */
        setShapes : function(data, shapes) {
        	data.shapes = shapes;
        	renderShapes(data);
        },
	
    };

    // plugin installation routine, called by digilib on each plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing vector plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        // add defaults, actions, buttons to the main digilib object
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising vector plugin. data:', data);
        var $data = $(data);
        // install event handlers
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
        //$data.bind('redisplay', handleRedisplay);
        //$data.bind('dragZoom', handleDragZoom);
    };


    var handleSetup = function (evt) {
        console.debug("vector: handleSetup");
        var data = this;
        renderShapes(data);
    };

    var renderShapes = function (data) {
    	if (data.shapes == null) return;
        if (!data.settings.isVectorActive) return;
    	var svg = '<svg xmlns="http://www.w3.org/2000/svg"\
        		viewBox="0 0 1 1" preserveAspectRatio="none"\
        		class="'+data.settings.cssPrefix+'overlay"\
        		style="position:absolute; pointer-events:none">\n';
    	for (var i in data.shapes) {
    		var vec = data.shapes[i];
    		var gt = vec.geometry.type;
    		if (gt === 'Line') {
        		/*
        		 * Line
        		 */
    			var props = vec.properties || {};
    			var stroke = props['stroke'] || 'red';
    			var strokeWidth = props['stroke-width'] || '0.005';
    			var coords = vec.geometry.coordinates;
    			svg += '<line\
    					x1="'+coords[0][0]+'" y1="'+coords[0][0]+'"\
    					x2="'+coords[1][0]+'" y2="'+coords[1][0]+'"\
    					stroke="'+stroke+'" stroke-width="'+strokeWidth+'"\
    					/>';
    		} else if (gt === 'Rectangle') {
    			/*
    			 * Rectangle
    			 */
    			var props = vec.properties || {};
    			var stroke = props['stroke'] || 'red';
    			var strokeWidth = props['stroke-width'] || '0.005';
    			var fill = props['fill'] || 'none';
    			var coords = vec.geometry.coordinates;
    			var p0 = geom.position(coords[0][0], coords[0][1]);
    			var p1 = geom.position(coords[1][0], coords[1][1]);
    			var rect = geom.rectangle(p0, p1);
    			svg += '<rect\
    					x="'+rect.x+'" y="'+rect.y+'"\
    					width="'+rect.width+'" height="'+rect.height+'"\
    					stroke="'+stroke+'" stroke-width="'+strokeWidth+'"\
    					fill="'+fill+'"\
    					/>';
    		}
    	}
    	svg += '</svg>';
    	$svg = $(svg);
    	data.$elem.append($svg);
        data.$svg = $svg;    	
    };
    
    
    var handleUpdate = function (evt) {
        console.debug("vector: handleUpdate");
        var data = this;
        if (data.imgRect != null) {
        	// adjust svg element size and position (doesn't work with .adjustDiv())
        	data.$svg.css(data.imgRect.getAsCss());
        	// adjust zoom statue (use DOM setAttribute because jQuery lowercases attributes)
            data.$svg.get(0).setAttribute("viewBox", data.zoomArea.getAsSvg());
            data.$svg.show();
        }
    };

    var handleRedisplay = function (evt) {
        console.debug("vector: handleRedisplay");
        var data = this;
    };

    var handleDragZoom = function (evt, zoomArea) {
        var data = this;
    };

    // plugin object, containing name, install and init routines 
    // all shared objects are filled by digilib on registration
    var plugin = {
            name : 'vector',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.vector.js must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
