/*
 * #%L
 * digilib vector plugin
 * %%
 * Copyright (C) 2014 MPIWG Berlin, Bibliotheca Hertziana
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
 * digilib vector plugin.
 * 
 * Displays vector shapes on top of the image.
 * 
 * Shapes are objects with "geometry" and "properties" members.
 * Geometry is an object with "type" and "coordinates" members.
 * Types: Line, Rectangle. Coordinates are lists of pairs of relative coordinates.
 * Properties are SVG properties "stroke", "stroke-width", "fill" and other properties.
 * If a shape has an "id" member its value will be used in SVG.
 * 
 * shape = {
 *   'geometry' : {
 *     'type' : 'Line',
 *     'coordinates' : [[0.1, 0.2], [0.3, 0.4]]
 *   },
 *   'properties' : {
 *     'stroke' : 'blue'
 *   }
 * }
 * 
 */
(function($) {

    // affine geometry
    var geom = null;
    // plugin object with digilib data
    var digilib;

    var buttons = {
    };

    var defaults = {
        // is vector active?
        'isVectorActive' : true,
        // default SVG stroke
        'defaultStroke' : 'red',
        // default SVG stroke-width
        'defaultStrokeWidth' : '0.005',
        // default SVG fill
        'defaultFill' : 'none'
    };

    var actions = {
        /**
         * set list of vector objects (shapes).
         * 
         * replaces existing shapes.
         * 
         * @param data
         * @param shapes
         */
        setShapes : function(data, shapes) {
        	data.shapes = shapes;
        	renderShapes(data);
        },
	
        /**
         * add vector object (shape) or create by clicking.
         * 
         * @param data
         * @param shape
         * @param onComplete
         */
        addShape : function(data, shape, onComplete) {
        	if (data.shapes == null) {
        		data.shapes = [];
        	};
        	if (shape.geometry.coordinates == null) {
        		// define shape interactively
        		defineShape(data, shape, onComplete);
        	} else {
        		data.shapes.push(shape);
            	renderShapes(data);
        	}
        },
        
        /**
         * get vector object (shape) by id.
         * 
         * @param data
         * @param id
         * @returns shape
         */
        getShapeById : function(data, id) {
        	shapes = data.shapes;
        	if (shapes == null) return null;
        	for (var i in shapes) {
        		if (shapes[i].id === id) {
        			return shapes[i];
        		}
        	}
        	return null;
        },
        
        /**
         * remove vector object (shape) by id.
         * 
         * @param data
         * @param id
         */
        removeShapeById : function(data, id) {
        	shapes = data.shapes;
        	if (shapes == null) return;
        	for (var i in shapes) {
        		if (shapes[i].id === id) {
        			shapes.splice(i, 1);
        		}
        	}
        	displayShapes(data);
        }        	
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
    };


    var handleSetup = function (evt) {
        console.debug("vector: handleSetup");
        var data = this;
        renderShapes(data);
    };

    var renderShapes = function (data) {
    	console.debug("renderShapes shapes:", data.shapes);
    	if (data.shapes == null) return;
        if (!data.settings.isVectorActive) return;
        if (data.$svg != null) {
        	data.$svg.remove();
        }
        var settings = data.settings;
    	var svg = '<svg xmlns="http://www.w3.org/2000/svg"\
        		viewBox="0 0 1 1" preserveAspectRatio="none"\
        		class="'+settings.cssPrefix+'overlay"\
        		style="position:absolute; pointer-events:none">\n';
    	for (var i in data.shapes) {
    		var vec = data.shapes[i];
    		var id = (vec.id != null) ? 'id="'+vec.id+'"' : '';
			var props = vec.properties || {};
			var stroke = props['stroke'] || settings.defaultStroke;
			var strokeWidth = props['stroke-width'] || settings.defaultStrokeWidth;
			var fill = props['fill'] || settings.defaultFill;
			var coords = vec.geometry.coordinates;
    		var gt = vec.geometry.type;
    		if (gt === 'Line') {
        		/*
        		 * Line
        		 */
    			svg += '<line '+id+'\
    					x1="'+coords[0][0]+'" y1="'+coords[0][1]+'"\
    					x2="'+coords[1][0]+'" y2="'+coords[1][1]+'"\
    					stroke="'+stroke+'" stroke-width="'+strokeWidth+'"\
    					/>';
    		} else if (gt === 'Rectangle') {
    			/*
    			 * Rectangle
    			 */
    			var p0 = geom.position(coords[0][0], coords[0][1]);
    			var p1 = geom.position(coords[1][0], coords[1][1]);
    			var rect = geom.rectangle(p0, p1);
    			svg += '<rect '+id+'\
    					x="'+rect.x+'" y="'+rect.y+'"\
    					width="'+rect.width+'" height="'+rect.height+'"\
    					stroke="'+stroke+'" stroke-width="'+strokeWidth+'"\
    					fill="'+fill+'"\
    					/>';
    		};
    	}
    	svg += '</svg>';
    	$svg = $(svg);
    	data.$elem.append($svg);
        data.$svg = $svg;
        if (data.imgRect != null) {
        	// adjust svg element size and position (doesn't work with .adjustDiv())
        	data.$svg.css(data.imgRect.getAsCss());
        	// adjust zoom statue (use DOM setAttribute because jQuery lowercases attributes)
            data.$svg.get(0).setAttribute("viewBox", data.zoomArea.getAsSvg());
        }
    };
    
    
    var handleUpdate = function (evt) {
        console.debug("vector: handleUpdate");
        var data = this;
        if (data.imgRect != null && data.$svg != null) {
        	// adjust svg element size and position (doesn't work with .adjustDiv())
        	data.$svg.css(data.imgRect.getAsCss());
        	// adjust zoom statue (use DOM setAttribute because jQuery lowercases attributes)
            data.$svg.get(0).setAttribute("viewBox", data.zoomArea.getAsSvg());
            data.$svg.show();
        }
    };

    /** define a shape by click and drag
     * 
     */
    var defineShape = function(data, shape, onComplete) {
    	var shapeType = shape.geometry.type;
    	var shapeId = shape.id;
    	if (shapeId == null) {
    		shapeId = data.settings.cssPrefix+'shape-'+Date.now();
    		shape.id = shapeId;
    	}
        var CSS = data.settings.cssPrefix;
        var $elem = data.$elem;
        var $scaler = data.$scaler;
        var picRect = geom.rectangle($scaler);
        var $body = $('body');
        var bodyRect = geom.rectangle($body);
        var pt1, pt2;
        // overlay div prevents other elements from reacting to mouse events 
        var $overlayDiv = $('<div class="'+CSS+'shapeOverlay" style="position:absolute; z-index:100;"/>');
        $elem.append($overlayDiv);
        bodyRect.adjustDiv($overlayDiv);
        // shape element reference
        var $shape = null;
        var shapeStart = function (evt) {
            pt1 = geom.position(evt);
            // setup and show shape
            p1 = data.imgTrafo.invtransform(pt1);
            if (shapeType === 'Line' || shapeType === 'Rectangle') {
            	shape.geometry.coordinates = [[p1.x, p1.y], [p1.x, p1.y]];
            }
            data.shapes.push(shape);
            renderShapes(data);
            $shape = $('#'+shapeId);
            // register events
            $overlayDiv.on("mousemove.dlShape", shapeMove);
            $overlayDiv.on("mouseup.dlShape", shapeEnd);
            return false;
        };

        // mouse move handler
        var shapeMove = function (evt) {
            pt2 = geom.position(evt);
            pt2.clipTo(picRect);
            // update shape
            if (shapeType === 'Line') {
            	var p2 = data.imgTrafo.invtransform(pt2);
            	$shape.attr({'x2': p2.x, 'y2': p2.y});
            } else if (shapeType === 'Rectangle') {
                var clickRect = geom.rectangle(pt1, pt2);
            	var rect = data.imgTrafo.invtransform(clickRect);
            	$shape.attr({'x': rect.x, 'y': rect.y,
            		'width': rect.width, 'height': rect.height});            	
            }
            return false;
        };

        // mouseup handler: end moving
        var shapeEnd = function (evt) {
            pt2 = geom.position(evt);
            // assume a click and continue if the area is too small
            var clickRect = geom.rectangle(pt1, pt2);
            if (clickRect.width < 5 && clickRect.height < 5) {
            	if (onComplete != null) {
            		onComplete(data, null);
            	}
                return false;
            };
            // unregister events
            $overlayDiv.off("mousemove.dlShape", shapeMove);
            $overlayDiv.off("mouseup.dlShape", shapeEnd);
            // clip and transform
            clickRect.clipTo(picRect);
            var rect = data.imgTrafo.invtransform(clickRect);
            // update shape
            var p2 = rect.getPt2();
            shape.geometry.coordinates = [[rect.x, rect.y], [p2.x, p2.y]];
            console.debug("new shape:", shape);
            $overlayDiv.remove();
        	if (onComplete != null) {
        		onComplete(data, shape);
        	}            
            return false;
        };

        // start by clicking
        $overlayDiv.one('mousedown.dlShape', shapeStart);
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
