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
(function ($) {

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
         * replaces all existing shapes on layer.
         * 
         * @param data
         * @param shapes
         * @param layer
         */
        setShapes : function (data, shapes, layer) {
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
        addShape : function (data, shape, onComplete, layer) {
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
        getShapeById : function (data, id, layer) {
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
        removeShapeById : function (data, id, layer) {
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
    var install = function (plugin) {
        digilib = plugin;
        console.debug('installing vector plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        // add defaults, actions, buttons to the main digilib object
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        // export functions
        digilib.fn.vectorDefaultRenderFn = renderShapes;
        digilib.fn.svgElement = svgElement;
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
        // pluggable SVG create functions 
        data.shapeFactory = getShapeFactory(data);
        setupHandleFactory(data);
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
        if (data.imgRect == null)
            return;
        for (var i in data.vectorLayers) {
            var layer = data.vectorLayers[i];
            if (layer.projection === 'screen') {
                // screen layers have render function
                if (layer.renderFn == null) {
                	// user renderShapes as default
                	layer.renderFn = renderShapes;
                }
                layer.renderFn(data, layer);
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
        if (layer == null) {
            // assume shape layer is 0
            layer = data.vectorLayers[0];
        }
    	var shapes = layer.shapes || data.shapes;
    	console.debug("renderShapes shapes:", shapes);
    	if (shapes == null || data.imgTrafo == null || !data.settings.isVectorActive) 
    	    return;
    	// set up shapes
        for (var i = 0; i < shapes.length; ++i) {
            var shape = shapes[i];
            data.shapeFactory[shape.geometry.type].setup(data, shape);
        }
        // sort shapes by size descending
        shapes.sort(function (a, b) {
           console.debug("sort.compare:",a.properties.sorta,b.properties.sorta);
           return (b.properties.sorta - a.properties.sorta); 
        });
        console.debug("renderShapes: sorted shapes:", shapes);
        // set up SVG
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
     * setup Shape SVG creation functions
     * (more functions can be plugged into data.settings.ShapeFactory)
     * 
     * @param data
     */
    var getShapeFactory = function (data) {
        var settings = data.settings;
        var css = settings.cssPrefix;
        var hs = settings.editHandleSize;
        // set standard SVG attributes
        var svgAttr = function (shape) {
            var props = shape.properties;
            return {
                'id': shape.id || digilib.fn.createId(shape.id, css+'svg-'),
                'stroke': props['stroke'] || settings.defaultStroke,
                'stroke-width' : props['stroke-width'] || settings.defaultStrokeWidth,
                'fill' : props['fill'] || settings.defaultFill,
                'class' : props['cssclass'],
                'style' : props['style']
                };
            };
        var factory = {
            'Point' : {
                'setup' : function (data, shape) {
                    shape.properties.maxvtx = 1;
                    shape.properties.sorta = 0;
                },
                'svg' : function (shape) {
                    var $s = $(svgElement('path', svgAttr(shape)));
                    $s.place = function () {
                        // point uses pin-like path of size 3*pu
                        var p = shape.properties.screenpos[0];
                        var pu = hs / 3;
                        this.attr({'d': 'M '+p.x+','+p.y+' l '+2*pu+','+pu+' c '+2*pu+','+pu+' '+0+','+3*pu+' '+(-pu)+','+pu+' Z'});
                        };
                    return $s;
                }
            },
            'Line' : {
                'setup' : function (data, shape) {
                    shape.properties.maxvtx = 2;
                    shape.properties.bbox = getBboxRect(data, shape);
                    shape.properties.sorta = 0;
                },
                'svg' : function (shape) {
                    var $s = $(svgElement('line', svgAttr(shape)));
                    $s.place = function () {
                        var p = shape.properties.screenpos;
                        this.attr({'x1': p[0].x, 'y1': p[0].y, 'x2': p[1].x, 'y2': p[1].y});
                        };
                    return $s;
                }
            },
            'Rectangle' : {
                'setup' : function (data, shape) {
                    shape.properties.maxvtx = 2;
                    shape.properties.bbox = getBboxRect(data, shape);
                    if (shape.properties.bbox != null) {
                        shape.properties.sorta = shape.properties.bbox.getArea();
                    }
                },
                'svg' : function (shape) {
                    var $s = $(svgElement('rect', svgAttr(shape)));
                    $s.place = function () {
                        var p = shape.properties.screenpos;
                        var r = geom.rectangle(p[0], p[1]);
                        this.attr({'x': r.x, 'y': r.y, 'width': r.width, 'height': r.height});
                        };
                    return $s;
                }
            },
            'Polygon' : {
                'setup' : function (data, shape) {
                    shape.properties.bbox = getBboxRect(data, shape);
                    if (shape.properties.bbox != null) {
                        shape.properties.sorta = shape.properties.bbox.getArea();
                    }
                },
                'svg' : function (shape) {
                    var $s = $(svgElement('polygon', svgAttr(shape)));
                    $s.place = function () {
                        var p = shape.properties.screenpos;
                        this.attr({'points': p.join(" ")});
                        };
                    return $s;
                }
            },
            'LineString' : {
                'setup' : function (data, shape) {
                    shape.properties.bbox = getBboxRect(data, shape);
                    if (shape.properties.bbox != null) {
                        shape.properties.sorta = shape.properties.bbox.getArea();
                    }
                },
                'svg' : function (shape) {
                    var $s = $(svgElement('polyline', svgAttr(shape)));
                    $s.place = function () {
                        var p = shape.properties.screenpos;
                        this.attr({'points': p.join(" ")});
                        };
                    return $s;
                }
            },
            'Circle' : {
                'setup' : function (data, shape) {
                    shape.properties.maxvtx = 2;
                    // TODO: bbox not really accurate
                    shape.properties.bbox = getBboxRect(data, shape);
                    if (shape.properties.bbox != null) {
                        shape.properties.sorta = shape.properties.bbox.getArea();
                    }
                },
                'svg' : function (shape) {
                    var $s = $(svgElement('circle', svgAttr(shape)));
                    $s.place = function () {
                        var p = shape.properties.screenpos;
                        this.attr({'cx': p[0].x, 'cy': p[0].y, 'r': p[0].distance(p[1])});
                        };
                    return $s;
                }
            },
            'Ellipse' : {
                'setup' : function (data, shape) {
                    shape.properties.maxvtx = 2;
                    // TODO: bbox not really accurate
                    shape.properties.bbox = getBboxRect(data, shape);
                    if (shape.properties.bbox != null) {
                        shape.properties.sorta = shape.properties.bbox.getArea();
                    }
                },
                'svg' : function (shape) {
                    var $s = $(svgElement('ellipse', svgAttr(shape)));
                    $s.place = function () {
                        var p = shape.properties.screenpos;
                        this.attr({'cx': p[0].x, 'cy': p[0].y,
                            'rx' : Math.abs(p[0].x - p[1].x),
                            'ry' : Math.abs(p[0].y - p[1].y)});
                        };
                    return $s;
                    }
                }
            };

        return factory;
    };

    /**
     * setup handle creation functions
     * (more functions can be plugged into data.settings.handleFactory)
     * 
     * @param data
     */
    var setupHandleFactory = function (data) {
        var settings = data.settings;
        var css = settings.cssPrefix;
        var hs = settings.editHandleSize;
        var d = hs/2;
        var attr = {
            'stroke': 'darkgrey',
            'stroke-width': 1,
            'fill': 'none',
            'class': css+'svg-handle',
            'style': 'pointer-events:all'
            };
        var factory = {
            'square' : function () {
                var $h = $(svgElement('rect', attr));
                $h.attr({'width': hs, 'height': hs});
                $h.moveTo = function (p) {
                    this.attr({'x': p.x-d, 'y': p.y-d });
                    };
                return $h;
                },
            'diamond' : function () {
                var $h = $(svgElement('polygon', attr));
                $h.moveTo = function (p) {
                    this.attr('points', (p.x-d) +','+ p.y+ ' '+p.x +','+(p.y+d)+' '+(p.x+d)+','+p.y+' '+p.x+','+(p.y-d));
                    };
                return $h;
                },
            'cross' : function () {
                var $h = $(svgElement('path', attr));
                $h.moveTo = function (p) {
                    this.attr('d', 'M'+(p.x-d) +','+ p.y+ ' L'+(p.x+d)+','+p.y+' M'+p.x+','+(p.y+d)+' L'+p.x+','+(p.y-d));
                    };
                return $h;
                }
            };
        data.handleFactory = factory;
    };

    /**
     * create handles for a shape.
     * 
     * Creates SVG elements for each screen point and append it to the SVG element.
     * 
     * @param data
     * @param shape
     * @param svg The SVG element where to append handle elements
     * @param func If present, use a special create function
     */
    //create handles for a shape.
    var createHandles = function (data, shape, layer) {
        if (!shape.properties.editable) { return };
        var $svg = $(layer.svgElem);
        var trafo = data.imgTrafo;
        // type of handle can be stated in layer
        var type = layer.handleType;
        var newHandle = data.handleFactory[type] || data.handleFactory['square'];
        var handles = [];
        var createHandle = function (i, item) {
            var p = trafo.transform(geom.position(item));
            var $handle = newHandle();
            $handle.moveTo(p);
            handles.push($handle);
            $svg.append($handle);
            return $handle;
            };
        var coords = shape.geometry.coordinates;
        $.each(coords, createHandle);
        // vertexElems must be defined before calling getVertexDragHandler()
        shape.$vertexElems = handles;
        var done = function (data, shape, evt) {
            unrenderShape(data, shape);
            renderShape(data, shape, layer);
            }
        var attachEvent = function (i, item) {
            item.one("mousedown.dlVertexDrag", getVertexDragHandler(data, shape, i, done));
            };
        $.each(handles, attachEvent);
    };

    /**
     * calculate screen positions from coordinates for a shape.
     * 
     * @param data
     * @param shape
     */
    var createScreenCoords = function (data, shape) {
        var coords = shape.geometry.coordinates;
        var trafo = data.imgTrafo;
        var screenpos = $.map(coords, function (coord) {
            return trafo.transform(geom.position(coord));
            });
        shape.properties.screenpos = screenpos;
        return screenpos;
    };

    var getBboxRect = function (data, shape) {
        var coords = shape.geometry.coordinates;
        if (coords == null) return null;
        var xmin = 1;
        var xmax = 0;
        var ymin = 1;
        var ymax = 0;
        var x, y;
        for (var i = 0; i < coords.length; ++i) {
            x = coords[i][0];
            y = coords[i][1];
            xmin = (x < xmin) ? x : xmin;
            xmax = (x > xmax) ? x : xmax;
            ymin = (y < ymin) ? y : ymin;
            ymax = (y > ymax) ? y : ymax;            
        }
        return geom.rectangle(xmin, ymin, xmax-xmin, ymax-ymin);
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
        var shapeType = shape.geometry.type;
        if (!isSupported(data, shapeType)) {
            console.error("renderShape: unsupported shape type: "+shapeType);
            return;
        }
        // create the SVG
        var $elem = data.shapeFactory[shapeType].svg(shape);
        shape.$elem = $elem;
        // place the SVG on screen
        createScreenCoords(data, shape);
        $elem.place();
        // render the SVG
        $(layer.svgElem).append($elem);
        createHandles(data, shape, layer);
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
     * @onComplete function (data, shape)
     */
    var getVertexDragHandler = function (data, shape, vtx, onComplete) {
        var $document = $(document);
        var imgRect = data.imgRect;
        var $shape = shape.$elem;
        var $handle = (shape.$vertexElems != null) ? shape.$vertexElems[vtx] : null;
        var shapeType = shape.geometry.type;
        var props = shape.properties;
        var pos = props.screenpos;
        var pStart; // save startpoint

        var placeHandle = function (i, $handle) {
            $handle.moveTo(pos[i]);
            };

        var placeHandles = function () {
            $.each(shape.$vertexElems, placeHandle);
            };

        var dragStart = function (evt) { // start dragging
            // cancel if not left-click
            if (evt.which != 1) return;
            pStart = geom.position(evt);
            props.startpos = pStart;
            props.vtx = vtx;
            $(data).trigger('positionShape', shape);
            $document.on("mousemove.dlVertexDrag", dragMove);
            $document.on("mouseup.dlVertexDrag", dragEnd);
            $document.on("dblclick.dlVertexDrag", dragEnd);
            return false;
        };

        var dragMove = function (evt) { // dragging
            var pt = geom.position(evt);
            pt.clipTo(imgRect);
            pos[vtx].moveTo(pt);
            if (isSupported(data, shapeType)) {
                // trigger drag event (may manipulate screen position)
                $(data).trigger('positionShape', shape);
                // update vertex coords of shape
                shape.geometry.coordinates[vtx] = data.imgTrafo.invtransform(pos[vtx]).toArray();
                // update shape SVG element
                $shape.place();
                // move handles accordingly
                if (shape.$vertexElems != null) placeHandles();
                $(data).trigger('dragShape', shape);
            }
            return false;
        };

        var dragEnd = function (evt) { // end dragging
            var pt = geom.position(evt);
            if ((pt.distance(pStart) < 5) && evt.type === 'mouseup') {
            	// not drag but click to start
                return false;
            }
            dragMove(evt);
            // remove move/end handler
            $document.off("mousemove.dlVertexDrag", dragMove);
            $document.off("mouseup.dlVertexDrag", dragEnd);
            $document.off("dblclick.dlVertexDrag", dragEnd);
            // call setup to update bbox
            data.shapeFactory[shapeType].setup(data, shape);
            // rearm start handler
            if ($handle != null) {
            	$handle.one("mousedown.dlVertexDrag", dragStart);
            }
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
    var isSupported = function (data, shapeType) {
        return data.shapeFactory[shapeType] != null;
    };

    /** 
     * define a shape by click and drag.
     *
     * The given shape object has to have a type, but its coordinates will be overwritten.
     *
     * @param data
     * @param shape the shape to define
     * @param layer the layer to draw on
     * @onComplete function (data, shape)
     */
    var defineShape = function (data, shape, layer, onComplete) {
        if (layer == null) {
            // assume shape layer is 0
            layer = data.vectorLayers[0];
        }
        var shapeType = shape.geometry.type;
        // call setup to make sure maxvtx is set
        data.shapeFactory[shapeType].setup(data, shape);
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
            var p1 = data.imgTrafo.invtransform(pt).toArray();
            var p2 = p1.slice(0);
            var vtx = 1;
            if (shapeType === 'Point') {
                shape.geometry.coordinates = [p1];
            } else if (isSupported(data, shapeType)) {
                shape.geometry.coordinates = [p1, p2];
            } else {
                console.error("defineShape: unsupported shape type: "+shapeType);
                $overlayDiv.remove();
                return false;
            }
            // shape is not editable by default
            if (shape.properties == null) {
                shape.properties = {'editable' : false};
                }
            // save first mousedown position
            shape.properties.screenpos = [pt];
            shape.properties.vtx = vtx;
            // draw shape
            renderShape(data, shape, layer);
            // vertex drag end handler
            var vertexDragDone = function (data, shape, evt) {
                var coords = shape.geometry.coordinates;
                var max = shape.properties.maxvtx;
            	if (max == null || vtx < max-1) {
            	// multipoint shape (e. g. Polygon, LineString)
            		if (evt.type === 'mouseup') {
	            		// single click adds next point
	            		unrenderShape(data, shape);
	            		// copy last vertex as starting point
	            		coords.push(coords[vtx].slice());
	            		vtx += 1;
	                    // draw shape
	                    shape.properties.vtx = vtx;
	                    renderShape(data, shape, layer);
	                    // execute vertex drag handler on next vertex
	            		getVertexDragHandler(data, shape, vtx, vertexDragDone)(evt);
	            		return false;
            		} else if (evt.type === 'dblclick') {
            		    // double click ends multipoint shape
            		    var rerender = false;
            		    // remove duplicate vertices (from mouseup)
	            		while (coords[vtx][0] === coords[vtx-1][0] &&
	            				coords[vtx][1] === coords[vtx-1][1]) {
                            coords.pop();
                            vtx -= 1;
                            rerender = true;
	            		}
	            		if (rerender) {
	            		    unrenderShape(data, shape);
	            		    shape.properties.vtx = vtx;
	            		    renderShape(data, shape, layer);
	            		}
            		} else {
            			console.error("unknown event type!");
            			return false;
            		}
            	}
            	shapeDone(data, shape);
            };
            if (vtx === shape.properties.maxvtx) {
            	// last vertex
            	shapeDone(data, shape);
            } else {
            	// execute vertex drag handler on next vertex
            	getVertexDragHandler(data, shape, vtx, vertexDragDone)(evt);
            }
            return false;
        };

        var shapeDone = function (data, shape) {
            // defining shape done
            unrenderShape(data, shape);
            // call setup to update bbox
            data.shapeFactory[shapeType].setup(data, shape);
            renderShape(data, shape, layer);
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
