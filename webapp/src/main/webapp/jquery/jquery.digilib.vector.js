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
 * geometry is an object with "type" and "coordinates" members.
 * Currently supported types: "Line", "Rectangle". 
 * goordinates is a list of pairs of relative coordinates.
 * properties are the SVG properties "stroke", "stroke-width", "fill" and other properties.
 * A property 'editable':true will display drag-handles to change the shape.
 * Editing the shape will send a "changeShape"(shape) event.
 * If a shape has an "id" member its value will be used in SVG.
 * 
 * shape = {
 *   'geometry' : {
 *     'type' : 'Line',
 *     'coordinates' : [[0.1, 0.2], [0.3, 0.4]]
 *   },
 *   'properties' : {
 *     'stroke' : 'blue',
 *     'editable' : true
 *   }
 * }
 * 
 */
(function($) {

    // affine geometry
    var geom = null;
    // plugin object with digilib data
    var digilib = null;
    // SVG namespace
    var svgNS = 'http://www.w3.org/2000/svg';
    
    var defaults = {
        // is vector active?
        'isVectorActive' : true,
        // default SVG stroke
        'defaultStroke' : 'red',
        // default SVG stroke-width
        'defaultStrokeWidth' : '2',
        // default SVG fill
        'defaultFill' : 'none',
        // grab handle size
        'editHandleSize' : 10
    };

    var actions = {
        /**
         * set list of vector objects (shapes).
         * 
         * replaces all existing shapes.
         * 
         * @param data
         * @param shapes
         */
        setShapes : function(data, shapes) {
        	data.shapes = shapes;
        	renderShapes(data);
        },
	
        /**
         * add vector object (shape) or create one by clicking.
         * 
         * For interactive use shape has to be initialized with a shape object with
         * type but no coordinates, e.g {'geometry':{'type':'Line'}}. 
         * onComplete(data, newShape) will be called when done.
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
        	var shapes = data.shapes;
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
        	var shapes = data.shapes;
        	if (shapes == null) return;
        	for (var i in shapes) {
        		if (shapes[i].id === id) {
        			shapes.splice(i, 1);
        		}
        	}
        	renderShapes(data);
        },
        
        /**
         * add vector layer.
         * 
         * Layer is an object with "projection" and "svg" members.
         * projection can be "relative": relative (0..1) coordinates, 
         * "screen": on-screen coordinates (requires re-scaling).
         * svg is an (unattached) SVG dom object.
         * 
         * @param date
         * @param layer
         */
        addVectorLayer : function (data, layer) {
            data.vectorLayers.push(layer);
            var $svg = $(layer.svg);
            layer.$svg = $svg;
            data.$elem.append($svg);
            renderLayers(data);
        }
    };

    /**
     * plugin installation routine, called by digilib on each plugin object.
     */
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing vector plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        // add defaults, actions, buttons to the main digilib object
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        //$.extend(digilib.buttons, buttons);
    };

    /** 
     * plugin initialization
     */
    var init = function (data) {
        console.debug('initialising vector plugin. data:', data);
        var $data = $(data);
        // create default shapes layer
        data.vectorLayers = [{'projection':'screen'}];
        // install event handlers
        $data.bind('update', handleUpdate);
    };

    /**
     * handle update event
     */
    var handleUpdate = function (evt) {
        console.debug("vector: handleUpdate");
        var data = this;
        if (data.imgTrafo == null || !data.settings.isVectorActive) return;
        if (data.imgTrafo != data._vectorImgTrafo) {
            // imgTrafo changed -- redraw
            renderLayers(data);
            // save new imgTrafo
            data._vectorImgTrafo = data.imgTrafo;
        }
    };

    /**
     * render all layers on screen
     */
    var renderLayers = function (data) {
        if (data.imgRect == null) return;
        for (var i in data.vectorLayers) {
            // transform additional layers
            var layer = data.vectorLayers[i];
            if (i == 0) {
                // assume that the shapes layer is first
                renderShapes(data);
            } else if (layer.projection === 'relative') {
                // adjust svg element size and position (doesn't work with .adjustDiv())
                layer.$svg.css(data.imgRect.getAsCss());
                // set current viewBox (jQuery lowercases attributes)
                layer.$svg[0].setAttribute('viewBox', data.zoomArea.getAsSvg());
            }
        }        
    };
    
    /**
     * render all shapes on screen.
     */
    var renderShapes = function (data) {
    	console.debug("renderShapes shapes:", data.shapes);
    	if (data.shapes == null || data.imgTrafo == null || !data.settings.isVectorActive) 
    	    return;
    	var $svg = data.vectorLayers[0].$svg;
        if ($svg != null) {
        	$svg.remove();
        }
    	$svg = $(createSvg('svg', {
    	    'viewBox': data.imgRect.getAsSvg(),
    	    'class': data.settings.cssPrefix+'overlay',
    		'style': 'position:absolute; z-index:10; pointer-events:none;'}));
        // adjust svg element size and position (doesn't work with .adjustDiv())
        $svg.css(data.imgRect.getAsCss());
        data.vectorLayers[0].$svg = $svg;
    	for (var i in data.shapes) {
    		var shape = data.shapes[i];
    		renderShape(data, shape, $svg);
    	}
    	data.$elem.append($svg);
    };
    
    /**
     * render a shape on screen.
     * 
     * Creates a SVG element and adds it to $svg.
     * Puts a reference $elem in the shape object.
     */
    var renderShape = function (data, shape, $svg) {
        if ($svg == null) {
            if (data.vectorLayers[0].$svg == null) {
                renderShapes(data);
            }
            $svg = data.vectorLayers[0].$svg;
        }
        var settings = data.settings;
        var css = settings.cssPrefix;
        var hs = settings.editHandleSize;
        var trafo = data.imgTrafo;
        // use given id
        var id = digilib.fn.createId(shape.id, css+'svg-');
        // set properties
        var props = shape.properties || {};
        var stroke = props['stroke'] || settings.defaultStroke;
        var strokeWidth = props['stroke-width'] || settings.defaultStrokeWidth;
        var fill = props['fill'] || settings.defaultFill;
        var coords = shape.geometry.coordinates;
        var gt = shape.geometry.type;
        if (gt === 'Line') {
            /*
             * Line
             */
            var p1 = trafo.transform(geom.position(coords[0]));
            var p2 = trafo.transform(geom.position(coords[1]));
            var $elem = $(createSvg('line', {
                'id': id,
                'x1': p1.x, 'y1': p1.y,
                'x2': p2.x, 'y2': p2.y,
                'stroke': stroke, 'stroke-width': strokeWidth}));
            shape.$elem = $elem;
            $svg.append($elem);
            if (props.editable) {
                var $e1 = $(createSvg('rect', {
                    'x': p1.x-hs/2, 'y': p1.y-hs/2, 'width': hs, 'height': hs,
                    'stroke': 'darkgrey', 'stroke-width': 1, 'fill': 'none',
                    'class': css+'svg-handle', 'style': 'pointer-events:all'}));
                var $e2 = $(createSvg('rect', {
                    'x': p2.x-hs/2, 'y': p2.y-hs/2, 'width': hs, 'height': hs,
                    'stroke': 'darkgrey', 'stroke-width': 1, 'fill': 'none',
                    'class': css+'svg-handle', 'style': 'pointer-events:all'}));
                var $vertexElems = [$e1, $e2];
                shape.$vertexElems = $vertexElems;
                $svg.append($vertexElems);
                $e1.one("mousedown.dlVertexDrag", getVertexDragHandler(data, shape, 0));
                $e2.one("mousedown.dlVertexDrag", getVertexDragHandler(data, shape, 1));
            }
        } else if (gt === 'Rectangle') {
            /*
             * Rectangle
             */
            var p1 = trafo.transform(geom.position(coords[0]));
            var p2 = trafo.transform(geom.position(coords[1]));
            var rect = geom.rectangle(p1, p2);
            var $elem = $(createSvg('rect', {
                'id': id,
                'x': rect.x, 'y': rect.y,
                'width': rect.width, 'height': rect.height,
                'stroke': stroke, 'stroke-width': strokeWidth,
                'fill': fill}));
            shape.$elem = $elem;
            $svg.append($elem);
            if (props.editable) {
                var $e1 = $(createSvg('rect', {
                    'x': p1.x-hs/2, 'y': p1.y-hs/2, 'width': hs, 'height': hs,
                    'stroke': 'darkgrey', 'stroke-width': 1, 'fill': 'none',
                    'class': css+'svg-handle', 'style': 'pointer-events:all'}));
                var $e2 = $(createSvg('rect', {
                    'x': p2.x-hs/2, 'y': p2.y-hs/2, 'width': hs, 'height': hs,
                    'stroke': 'darkgrey', 'stroke-width': 1, 'fill': 'none',
                    'class': css+'svg-handle', 'style': 'pointer-events:all'}));
                var $vertexElems = [$e1, $e2];
                shape.$vertexElems = $vertexElems;
                $svg.append($vertexElems);
                $e1.one("mousedown.dlVertexDrag", getVertexDragHandler(data, shape, 0));
                $e2.one("mousedown.dlVertexDrag", getVertexDragHandler(data, shape, 1));
            }
        }
    };

    /**
     * return a vertexDragHandler function.
     * 
     * @param data
     * @param shape shape to drag
     * @param vtx vertex number on shape
     * @onComplete function(data, shape)
     */
    var getVertexDragHandler = function (data, shape, vtx, onComplete) {
        var $document = $(document);
        var hs = data.settings.editHandleSize;
        var $shape = shape.$elem;
        var $handle = (shape.$vertexElems != null) ? shape.$vertexElems[vtx] : $();
        var shapeType = shape.geometry.type;
        var pt, pt0, pt1, pt2, rect;

        var dragStart = function (evt) {
            // cancel if not left-click
            if (evt.which != 1) return;
            pt0 = geom.position(evt);
            if (shapeType === 'Rectangle') {
                // save rectangle screen endpoints
                pt1 = data.imgTrafo.transform(geom.position(shape.geometry.coordinates[0]));
                pt2 = data.imgTrafo.transform(geom.position(shape.geometry.coordinates[1]));
            }
            $document.on("mousemove.dlVertexDrag", dragMove);
            $document.on("mouseup.dlVertexDrag", dragEnd);            
            return false;
        };
        
        var dragMove = function (evt) {
            pt = geom.position(evt);
            pt.clipTo(data.imgRect);
            // move handle
            $handle.attr({'x': pt.x-hs/2, 'y': pt.y-hs/2});
            // update shape element
            if (shapeType === 'Line') {
                if (vtx == 0) {
                    $shape.attr({'x1': pt.x, 'y1': pt.y});
                } else if (vtx == 1) {
                    $shape.attr({'x2': pt.x, 'y2': pt.y});
                }
            } else if (shapeType === 'Rectangle') {
                if (vtx == 0) {
                    rect = geom.rectangle(pt, pt2);
                } else if (vtx == 1) {
                    rect = geom.rectangle(pt1, pt);
                }
                $shape.attr({'x': rect.x, 'y': rect.y,
                    'width': rect.width, 'height': rect.height});               
            }
            return false;
        };

        var dragEnd = function (evt) {
            pt = geom.position(evt);
            if (pt.distance(pt0) < 5) {
                return false;
            }
            pt.clipTo(data.imgRect);
            var p1 = data.imgTrafo.invtransform(pt);
            // update shape element
            if (shapeType === 'Line') {
                shape.geometry.coordinates[vtx] = [p1.x, p1.y];
            } else if (shapeType === 'Rectangle') {
                shape.geometry.coordinates[vtx] = [p1.x, p1.y];
            }
            // remove move/end handler
            $document.off("mousemove.dlVertexDrag", dragMove);
            $document.off("mouseup.dlVertexDrag", dragEnd);
            // rearm start handler
            $handle.one("mousedown.dlVertexDrag", dragStart);
            if (onComplete != null) {
                onComplete(data, shape);
            } else {
                $(data).trigger('changeShape', shape);
            }
            return false;
        };

        // return drag start handler
        return dragStart;
    };
    
    /** 
     * define a shape by click and drag.
     *
     * The given shape object has to have a type, but its coordinates will be overwritten.
     *
     * @param data
     * @param shape the shape to define
     * @onComplete function(data, shape)
     */
    var defineShape = function(data, shape, onComplete) {
        var shapeType = shape.geometry.type;
        var $elem = data.$elem;
        var $body = $('body');
        var bodyRect = geom.rectangle($body);
        // overlay div prevents other elements from reacting to mouse events 
        var $overlayDiv = $('<div class="'+data.settings.cssPrefix+'shapeOverlay" style="position:absolute; z-index:100;"/>');
        $elem.append($overlayDiv);
        bodyRect.adjustDiv($overlayDiv);
        
        var shapeStart = function (evt) {
            var pt = geom.position(evt);
            // setup shape
            var p = data.imgTrafo.invtransform(pt);
            if (shapeType === 'Line' || shapeType === 'Rectangle') {
                shape.geometry.coordinates = [[p.x, p.y], [p.x, p.y]];
            } else {
                console.error("unsupported shape type: "+shapeType);
                $overlayDiv.remove();
                return false;
            }
            // draw shape
            renderShape(data, shape);
            // execute vertex drag handler on second vertex
            getVertexDragHandler(data, shape, 1, function (data, newshape) {
                // dragging vertex done
                console.debug("new shape:", newshape);
                data.shapes.push(newshape);
                $overlayDiv.remove();
                if (onComplete != null) {
                    onComplete(data, newshape);
                }
            })(evt);
            return false;
        };
        
        // start by clicking
        $overlayDiv.one('mousedown.dlShape', shapeStart);
    };
    
    /**
     * create a SVG element with attributes.
     * 
     * @param name tag name
     * @param attrs object with attributes
     */
    var createSvg = function (name, attrs) {
        var elem = document.createElementNS(svgNS, name);
        if (attrs != null) {
            for (var att in attrs) {
                elem.setAttributeNS(null, att, attrs[att]);
            };
        }
        return elem;
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
