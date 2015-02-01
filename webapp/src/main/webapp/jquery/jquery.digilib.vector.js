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
 * Currently supported types: "Point", "Line", "LineString", "Rectangle", "Polygon", "Circle". 
 * coordinates is a list of pairs of relative coordinates.
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
    // implemented shape types
    var supportedShapeTypes = ['Line', 'Rectangle', 'LineString', 'Polygon', 'Circle'];

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
         * replaces all existing shapes on layer.
         * 
         * @param data
         * @param shapes
         * @param layer
         */
        setShapes : function(data, shapes, layer) {
            if (layer == null) {
                // assume shape layer is 0
                layer = data.vectorLayers[0];
            }
        	layer.shapes = shapes;
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
         * @param layer
         */
        addShape : function(data, shape, onComplete, layer) {
            if (layer == null) {
                // assume shape layer is 0
                layer = data.vectorLayers[0];
            }
            if (layer.shapes == null) {
            	layer.shapes = [];
            }
        	if (shape.geometry.coordinates == null) {
        		// define shape interactively
        		defineShape(data, shape, layer, onComplete);
        	} else {
        		layer.shapes.push(shape);
            	renderShapes(data, layer);
        	}
        },
        
        /**
         * get vector object (shape) by id.
         * 
         * @param data
         * @param id
         * @returns shape
         */
        getShapeById : function(data, id, layer) {
            if (layer == null) {
                // assume shape layer is 0
                layer = data.vectorLayers[0];
            }
        	var shapes = layer.shapes;
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
        removeShapeById : function(data, id, layer) {
            if (layer == null) {
                // assume shape layer is 0
                layer = data.vectorLayers[0];
            }
        	var shapes = layer.shapes;
         	if (shapes == null) return;
        	for (var i = 0; i < shapes.length; ++i) {
        		if (shapes[i].id === id) {
        			shapes.splice(i, 1);
        		}
        	}
        	renderShapes(data, layer);
        },
        
        /**
         * add vector layer.
         * 
         * Layer is an object with a "projection" member.
         * projection can be "relative": relative (0..1) coordinates, 
         * "screen": on-screen coordinates (needs renderFn(data, layer)).
         * A SVG layer is specified by the jQuery-HTML element "$elem" and the SVG-element "svgElem".
         * 
         * layer : {
         *   projection : relative,
         *   $elem : $(...),
         *   svgElem : ...
         * }
         * 
         * @param date
         * @param layer
         */
        addVectorLayer : function (data, layer) {
            if (layer.projection === 'relative') {
                var svg = layer.svgElem;
                // set defaults for SVG in relative coordinates
                svg.setAttributeNS(null, 'viewBox', '0 0 1 1');
                svg.setAttributeNS(null, 'preserveAspectRatio', 'none');
                var $elem = layer.$elem;
                // set defaults for HTML element
                $elem.css({'position':'absolute', 'z-index': 9, 'pointer-events':'none'});
                $elem.addClass(data.settings.cssPrefix+'overlay');
            }
            // add layer
            data.vectorLayers.push(layer);
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
        // export functions
        digilib.fn.vectorDefaultRenderFn = renderShapes;
    };

    /** 
     * plugin initialization
     */
    var init = function (data) {
        console.debug('initialising vector plugin. data:', data);
        var $data = $(data);
        // create default shapes layer
        var shapeLayer = {
            'projection': 'screen', 
            'renderFn': renderShapes,
            'shapes': []
        };
        // shapes layer is first
        data.vectorLayers = [shapeLayer];
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
    var renderLayers = function(data) {
        if (data.imgRect == null)
            return;
        for (var i in data.vectorLayers) {
            var layer = data.vectorLayers[i];
            if (layer.projection === 'screen') {
                // screen layers have render function
                if (layer.renderFn != null) {
                    layer.renderFn(data, layer);
                }
            } else if (layer.projection === 'relative') {
                var svg = layer.svgElem;
                if (svg != null) {
                    // set current viewBox (jQuery lowercases attributes)
                    svg.setAttribute('viewBox', data.zoomArea.getAsSvg());
                }
                var $elem = layer.$elem;
                if ($elem != null) {
                    // adjust layer element size and position (doesn't work with .adjustDiv())
                    $elem.css(data.imgRect.getAsCss());
                    $elem.show();
                }
            }
        }
    };
    
    /**
     * render all shapes on the layer.
     * 
     * @param data
     * @param layer
     */
    var renderShapes = function (data, layer) {
    	var shapes = layer.shapes || data.shapes;
    	console.debug("renderShapes shapes:", shapes);
    	if (shapes == null || data.imgTrafo == null || !data.settings.isVectorActive) 
    	    return;
    	if (layer == null) {
    	    // assume shape layer is 0
    	    layer = data.vectorLayers[0];
    	}
    	var $svg = layer.$elem;
        if ($svg != null) {
        	$svg.remove();
        }
    	var svgElem = svgElement('svg', {
    	    'viewBox': data.imgRect.getAsSvg(),
    	    'class': data.settings.cssPrefix+'overlay',
    		'style': 'position:absolute; z-index:10; pointer-events:none;'});
    	$svg = $(svgElem);
    	layer.svgElem = svgElem;
        layer.$elem = $svg;
    	for (var i = 0; i < shapes.length; ++i) {
    		var shape = shapes[i];
    		renderShape(data, shape, layer);
    	}
    	data.$elem.append($svg);
    	// adjust layer element size and position (doesn't work with .adjustDiv())
    	$svg.css(data.imgRect.getAsCss());
    	$svg.show();
    };
    
    /**
     * render a shape on screen.
     * 
     * Creates a SVG element and adds it to the layer.
     * Puts a reference $elem in the shape object.
     * 
     * @param data
     * @param shape
     * @param layer
     */
    var renderShape = function (data, shape, layer) {
        // make sure we have a SVG element
        if (layer.svgElem == null) {
            renderShapes(data, layer);
            return;
        }
        var $svg = $(layer.svgElem);
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
        var cssclass = props['cssclass'];
        var style = props['style'];
        var coords = shape.geometry.coordinates;
        var gt = shape.geometry.type;
        //create handles for a shape.
        var createHandles = function (shape) {
            if (!shape.properties.editable) { return };
            var $handles = [];
            shape.$vertexElems = $handles;
            var coords = shape.geometry.coordinates;
            // create handle element from a coordinate pair
            var createHandle = function (i, coord) {
                var p = trafo.transform(geom.position(coord));
                var $handle = $(svgElement('rect', {
                    'x': p.x-hs/2, 'y': p.y-hs/2, 'width': hs, 'height': hs,
                    'stroke': 'darkgrey', 'stroke-width': 1, 'fill': 'none',
                    'class': css+'svg-handle', 'style': 'pointer-events:all'}));
                $handles.push($handle);
                $handle.one("mousedown.dlVertexDrag", getVertexDragHandler(data, shape, i));
                $svg.append($handle);
                };
            $.each(coords, createHandle);
            };
        // render the shape
        if (gt === 'Point') {
            /*
             * Point
             */
            var p1 = trafo.transform(geom.position(coords[0]));
            // point uses pin-like path of size 3*pu
            var pu = hs / 3;
            var $elem = $(svgElement('path', {
                'id': id, 'class': cssclass,
                'd': 'M '+p1.x+','+p1.y+' l '+2*pu+','+pu+' c '+2*pu+','+pu+' '+0+','+3*pu+' '+(-pu)+','+pu+' Z',
                'stroke': stroke, 'stroke-width': strokeWidth, 
                'fill': fill, 'style': style}));
            shape.$elem = $elem;
            $svg.append($elem);
            if (props.editable) {
                $elem.one("mousedown.dlVertexDrag", getVertexDragHandler(data, shape, 0));
            }
        } else if (gt === 'Line') {
            /*
             * Line
             */
            var p1 = trafo.transform(geom.position(coords[0]));
            var p2 = trafo.transform(geom.position(coords[1]));
            var $elem = $(svgElement('line', {
                'id': id, 'class': cssclass,
                'x1': p1.x, 'y1': p1.y,
                'x2': p2.x, 'y2': p2.y,
                'stroke': stroke, 'stroke-width': strokeWidth, 'style': style}));
            shape.$elem = $elem;
            $svg.append($elem);
            createHandles(shape);
        } else if (gt === 'Rectangle') {
            /*
             * Rectangle
             */
            var p1 = trafo.transform(geom.position(coords[0]));
            var p2 = trafo.transform(geom.position(coords[1]));
            var rect = geom.rectangle(p1, p2);
            var $elem = $(svgElement('rect', {
                'id': id, 'class': cssclass,
                'x': rect.x, 'y': rect.y,
                'width': rect.width, 'height': rect.height,
                'stroke': stroke, 'stroke-width': strokeWidth,
                'fill': fill, 'style': style}));
            shape.$elem = $elem;
            $svg.append($elem);
            createHandles(shape);
        } else if (gt === 'Polygon') {
            /*
             * Polygon
             */
            var ps = [];
            for (var i in coords) {
                ps[i] = trafo.transform(geom.position(coords[i]));
            }
            var $elem = $(svgElement('polygon', {
                'id': id, 'class': cssclass,
                'points': ps.join(" "),
                'stroke': stroke, 'stroke-width': strokeWidth,
                'fill': fill, 'style': style}));
            shape.$elem = $elem;
            $svg.append($elem);
            createHandles(shape);
        } else if (gt === 'LineString') {
            /*
             * Polyline
             */
            var ps = [];
            for (var i in coords) {
                ps[i] = trafo.transform(geom.position(coords[i]));
            }
            var $elem = $(svgElement('polyline', {
                'id': id, 'class': cssclass,
                'points': ps.join(" "),
                'stroke': stroke, 'stroke-width': strokeWidth,
                'fill': 'none', 'style': style}));
            shape.$elem = $elem;
            $svg.append($elem);
            createHandles(shape);
        } else if (gt === 'Circle') {
            /*
             * Circle
             */
            var p1 = trafo.transform(geom.position(coords[0]));
            var p2 = trafo.transform(geom.position(coords[1]));
            var $elem = $(svgElement('circle', {
                'id': id, 'class': cssclass,
                'cx': p1.x, 'cy': p1.y, 'r' : p1.distance(p2),
                'fill' : 'none', 'stroke': stroke, 'stroke-width': strokeWidth, 
                'style': style}));
            shape.$elem = $elem;
            $svg.append($elem);
            createHandles(shape);
        } else {
        	console.error("Unable to render shape type:", gt);
        	return;
        }
        $(data).trigger("renderShape", shape);
    };

    /**
     * remove rendered shape from screen.
     * 
     * Removes the SVG elements from the layer.
     * 
     * @param data
     * @param shape
     */
    var unrenderShape = function (data, shape) {
    	// remove vertex handles
    	if (shape.$vertexElems != null) {
    		for (var i = 0; i < shape.$vertexElems.length; ++i) {
    			shape.$vertexElems[i].remove();
    		}
    		delete shape.$vertexElems;
    	}
    	// remove SVG element
    	if (shape.$elem != null) {
    		shape.$elem.remove();
    		delete shape.$elem;
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
        var imgRect = data.imgRect;
        var pt, pt0, pt1, pt2, rect;

        var dragStart = function (evt) {
            // cancel if not left-click
            if (evt.which != 1) return;
            pt0 = geom.position(evt);
            if (shapeType === 'Rectangle' || shapeType === 'Circle') {
                // save screen points of coordinates
                pt1 = data.imgTrafo.transform(geom.position(shape.geometry.coordinates[0]));
                pt2 = data.imgTrafo.transform(geom.position(shape.geometry.coordinates[1]));
            }
            $document.on("mousemove.dlVertexDrag", dragMove);
            $document.on("mouseup.dlVertexDrag", dragEnd);
            $document.on("dblclick.dlVertexDrag", dragEnd);
            return false;
        };

        var dragMove = function (evt) {
            pt = geom.position(evt);
            pt.clipTo(imgRect);
            // move handle
            $handle.attr({'x': pt.x-hs/2, 'y': pt.y-hs/2});
            // update shape SVG element
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
            } else if (shapeType === 'Polygon' || shapeType === 'LineString') {
                var points = $shape.attr('points');
                var ps = points.split(' ');
                ps[vtx] = pt.x + ',' + pt.y;
                points = ps.join(' ');
                $shape.attr('points', points);
            } else if (shapeType === 'Circle') {
                if (vtx == 0) {
                    $shape.attr({'cx': pt.x, 'cy': pt.y, 'r' : pt.distance(pt2)});
                } else if (vtx == 1) {
                    $shape.attr({'r': pt.distance(pt1)});
                }
            }
            // update shape object and trigger drag event
            if (isSupported(shapeType)) {
                var p = data.imgTrafo.invtransform(pt);
                shape.geometry.coordinates[vtx] = [p.x, p.y];
                $(data).trigger('dragShape', shape);
            }
            return false;
        };

        var dragEnd = function (evt) {
            pt = geom.position(evt);
            if ((pt.distance(pt0) < 5) && evt.type === 'mouseup') {
            	// not drag but click to start
                return false;
            }
            pt.clipTo(imgRect);
            var p1 = data.imgTrafo.invtransform(pt);
            // update shape object
            if (isSupported(shapeType)) {
                shape.geometry.coordinates[vtx] = [p1.x, p1.y];
            }
            // remove move/end handler
            $document.off("mousemove.dlVertexDrag", dragMove);
            $document.off("mouseup.dlVertexDrag", dragEnd);
            $document.off("dblclick.dlVertexDrag", dragEnd);
            // rearm start handler
            $handle.one("mousedown.dlVertexDrag", dragStart);
            if (onComplete != null) {
                onComplete(data, shape, evt);
            } else {
                $(data).trigger('changeShape', shape);
            }
            return false;
        };

        // return drag start handler
        return dragStart;
    };


    /**
     * returns true if shapeType is supported
     * 
     * @param shapeType shapeType to test
     */
    var isSupported = function(shapeType) {
        return supportedShapeTypes.indexOf(shapeType) > -1;
    };

    /** 
     * define a shape by click and drag.
     *
     * The given shape object has to have a type, but its coordinates will be overwritten.
     *
     * @param data
     * @param shape the shape to define
     * @param layer the layer to draw on
     * @onComplete function(data, shape)
     */
    var defineShape = function(data, shape, layer, onComplete) {
        if (layer == null) {
            // assume shape layer is 0
            layer = data.vectorLayers[0];
        }
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
            var vtxidx = 1;
            if (shapeType === 'Point') {
                shape.geometry.coordinates = [[p.x, p.y]];
            } else if (isSupported(shapeType)) {
                shape.geometry.coordinates = [[p.x, p.y], [p.x, p.y]];
            } else {
                console.error("defineShape: unsupported shape type: "+shapeType);
                $overlayDiv.remove();
                return false;
            }
            // save editable state and set to non-editable
            if (shape.properties != null) {
            	shape.properties._editable = shape.properties.editable;
            	shape.properties.editable = false;
            } else {
                shape.properties = {'editable' : false};
            }
            // draw shape
            renderShape(data, shape, layer);
            // vertex drag end handler
            var vertexDragDone = function (data, shape, evt) {
                var coords = shape.geometry.coordinates;
            	if (shapeType === 'LineString' || shapeType === 'Polygon') {
            		if (evt.type === 'mouseup') {
	            		// single click adds next line to LineString/Polygon
	            		unrenderShape(data, shape);
	            		// copy last vertex as starting point
	            		coords.push(coords[vtxidx].slice());
	            		vtxidx += 1;
	                    // draw shape
	                    renderShape(data, shape, layer);
	                    // execute vertex drag handler on next vertex
	            		getVertexDragHandler(data, shape, vtxidx, vertexDragDone)(evt);
	            		return false;
            		} else if (evt.type === 'dblclick') {
            		    // double click ends LineString/Polygon
            		    // remove duplicate vertices (from mouseup)
            		    var rerender = false;
	            		while (coords[vtxidx][0] === coords[vtxidx-1][0] && 
	            				coords[vtxidx][1] === coords[vtxidx-1][1]) {
                            coords.pop();
                            vtxidx -= 1;
                            rerender = true;
	            		}
	            		if (rerender) {
	            		    unrenderShape(data, shape);
	            		    renderShape(data, shape, layer);
	            		}
            		} else {
            			console.error("unknown event type!");
            			return false;
            		}
            	}
            	shapeDone(data, shape);
            };
            if (shapeType === 'Point') {
            	// just this one vertex
            	shapeDone(data, shape);
            } else {
            	// execute vertex drag handler on second vertex
            	getVertexDragHandler(data, shape, vtxidx, vertexDragDone)(evt);
            }
            return false;
        };
        
        var shapeDone = function (data, shape) {
            // defining shape done
        	if (shape.properties._editable != null) {
            	// re-set editable
            	unrenderShape(data, shape);
            	shape.properties.editable = shape.properties._editable;
            	delete shape.properties._editable;
            	renderShape(data, shape, layer);
        	}
        	// save shape
            layer.shapes.push(shape);
            $overlayDiv.remove();
            if (onComplete != null) {
                onComplete(data, shape);
            }
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
    var svgElement = function (name, attrs) {
        var elem = document.createElementNS(svgNS, name);
        if (attrs != null) {
            for (var att in attrs) {
            	if (attrs[att] != null) {
            		elem.setAttributeNS(null, att, attrs[att]);
            	}
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
