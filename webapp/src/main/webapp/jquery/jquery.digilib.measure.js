/*
 * #%L
 * digilib measure plugin
 * %%
 * Copyright (C) 2012 - 2014 Bibliotheca Hertziana, MPIWG Berlin
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
 * Authors: Martin Raspe, Robert Casties, 2012-2014
 */
/**
 * digilib measure plugin (measure distances on the digilib image in historic units etc.)
**/ 

/* jslint browser: true, debug: true, forin: true
*/

/* TODO:
    - infowindow for shapes
        - display fractions
        - display angles
        - display Vitruvian intercolumnium types
    - display shapes overlay? (angles, distances?)
    - move shapes (shift+drag?)
    - confine oval to sensible measurements
    - better grid
    - snap vertex to next "round" unit / sub-unit while dragging (on keypress?)
*/


(function($) {

    // the digilib object
    var digilib = null;
    // the normal zoom area
    var FULL_AREA = null;

    // the functions made available by digilib
    var fn = {
        // dummy function to avoid errors, gets overwritten by buttons plugin
        highlightButtons : function () {
            console.debug('measure: dummy function - highlightButtons');
            }
        };
    // affine geometry plugin
    var geom = null;
    // convenience variable, set in init()
    var CSS = '';
    // shape currently being drawn/dragged
    var currentShape;
    // current key state: keystate[event.key] = event
    var keystate = {};
    // shiftPressed = event.shiftKey;
    // altPressed   = event.altKey;
    // ctrlPressed  = event.ctrlKey;

    // the conversion data
    var UNITS = {
        comment : [
          "Angaben nach:",
          "Klimpert, Richard: Lexikon der Münzen, Maße, Gewichte, Zählarten und Zeitgrößen aller Länder der Erde 2) Berlin 1896 (Reprint Graz 1972)",
          "Doursther, Horace: Dictionnaire universel des poids et mesures anciens et modernes. Paris 1840 (Reprint Amsterdam 1965)"
          ],
        sections : [{
            name  : "Längenmaße: metrisch",
            group  : "1",
            units  : [{
				name : "m",
				factor : "1"
				},
				{
				name : "mm",
				factor : "0.001"
				},
				{
				name : "cm",
				factor : "0.01"
				},
				{
				name : "dm",
				factor : "0.1"
				},
				{
				name : "km",
				factor : "1000"
				}]
            },
            {
            name  : "Längenmaße: nautisch",
            group  : "1",
            units  : [{
				name : "geographische Meile",
				factor : "7420"
				},
				{
				name : "Seemeile",
				factor : "1854.965"
				},
				{
				name : "fathom",
				factor : "1.828782"
				},
				{
				name : "cable",
				factor : "182.8782"
				},
				{
				name : "league",
				factor : "5564.895"
				}]
            },
            {
            name  : "Längenmaße: England",
            group  : "1",
            units  : [{
				name : "foot",
				factor : "0.304797",
				subunits : "12"
				},
				{
				name : "inch",
				factor : "0.02539975"
				},
				{
				name : "yard",
				factor : "0.914391",
				subunits : "3"
				},
				{
				name : "pole",
				factor : "5.0291505",
				subunits : "11"
				},
				{
				name : "chain",
				factor : "20.116602",
				subunits : "4"
				},
				{
				name : "furlong",
				factor : "201.16602"
				},
				{
				name : "mile",
				factor : "1609.32816",
				subunits : "8"
				}]
            },
            {
            name  : "Längenmaße: Italien",
            group  : "1",
            units  : [{
				name : "palmo d'architetto (Rom)",
				factor : "0.223425",
				subunits : "12"
				},
				{
				name : "braccio (Florenz)",
				factor : "0.5836"
				},
				{
				name : "braccio (Mailand)",
				factor : "0.5949"
				},
				{
				name : "canna d'architetto (Rom)",
				factor : "2.23425"
				},
				{
				name : "canna di commercio (Rom)",
				factor : "1.9920"
				},
				{
				name : "canna d'architetto (Florenz)",
				factor : "2.9180"
				},
				{
				name : "canna di commercio (Florenz)",
				factor : "2.3344"
				},
				{
				name : "canna (Neapel)",
				factor : "2.0961"
				},
				{
				name : "miglio (Lombardei)",
				factor : "1784.808"
				},
				{
				name : "miglio (Neapel)",
				factor : "1855.110"
				},
				{
				name : "miglio (Rom)",
				factor : "1489.50"
				},
				{
				name : "minuta (Rom)",
				factor : "0.00372375"
				},
				{
				name : "oncia (Rom)",
				factor : "0.01861875"
				},
				{
				name : "oncia (Mailand)",
				factor : "0.49575"
				},
				{
				name : "palmo di commercio (Rom)",
				factor : "0.249"
				},
				{
				name : "palmo (Florenz)",
				factor : "0.2918"
				},
				{
				name : "piede (Brescia)",
				factor : "0.471"
				},
				{
				name : "piede (Carrara)",
				factor : "0.2933"
				},
				{
				name : "piede (Como)",
				factor : "0.4512"
				},
				{
				name : "piede (Modena)",
				factor : "0.523048"
				},
				{
				name : "piede (Reggio Em.)",
				factor : "0.530898"
				},
				{
				name : "piede (Venedig)",
				factor : "0.347735"
				},
				{
				name : "piede (Vicenza)",
				factor : "0.3574"
				},
				{
				name : "piede (Verona)",
				factor : "0.3429"
				},
				{
				name : "piede (Rom)",
				factor : "0.297587"
				},
				{
				name : "piede Lombardo",
				factor : "0.435185"
				},
				{
				name : "piede liprando (Turin)",
				factor : "0.51377"
				},
				{
				name : "piede manuale (Turin)",
				factor : "0.342511"
				},
				{
				name : "piede (Neapel, 'palmo')",
				factor : "0.26455"
				},
				{
				name : "soldo (Florenz)",
				factor : "0.2918"
				},
				{
				name : "trabucco piemontese (Turin)",
				factor : "3.08259"
				}]
            },
            {
            name  : "Längenmaße: Niederlande",
            group  : "1",
            units  : [{
				name : "voet (Amsterdam)",
				factor : "0.283113"
				},
				{
				name : "voet (Antwerpen)",
				factor : "0.2868"
				},
				{
				name : "voet (Aelst)",
				factor : "0.2772"
				},
				{
				name : "voet (Breda)",
				factor : "0.28413"
				},
				{
				name : "voet (Brügge)",
				factor : "0.27439"
				},
				{
				name : "voet (Brüssel)",
				factor : "0.2757503"
				},
				{
				name : "voet (Groningen)",
				factor : "0.2922"
				},
				{
				name : "voet (Haarlem)",
				factor : "0.2858"
				},
				{
				name : "voet (Kortrijk)",
				factor : "0.2977"
				},
				{
				name : "voet (Tournai)",
				factor : "0.2977"
				},
				{
				name : "voet (Utrecht)",
				factor : "0.2683"
				},
				{
				name : "voet (Ypern)",
				factor : "0.2739"
				},
				{
				name : "pied (Hainaut)",
				factor : "0.2934"
				},
				{
				name : "pied St. Hubert (Lüttich)",
				factor : "0.294698"
				},
				{
				name : "pied St. Lambert (Lüttich)",
				factor : "0.291796"
				},
				{
				name : "pied Ste. Gertrude (Nivelles)",
				factor : "0.27709"
				},
				{
				name : "steenvoet (Oudenaerde)",
				factor : "0.2977"
				},
				{
				name : "houtvoet (Oudenaerde)",
				factor : "0.292"
				}]
            },
            {
            name  : "Längenmaße: Frankreich",
            group  : "1",
            units  : [{
				name : "pied du Roi (Paris)",
				factor : "0.32483938497"
				},
				{
				name : "pied (Arras)",
				factor : "0.29777"
				},
				{
				name : "pied (Cambrai)",
				factor : "0.29777"
				},
				{
				name : "Burgundischer Fuß",
				factor : "0.33212"
				}]
            },
            {
            name  : "Längenmaße: Südeuropa",
            group  : "1",
            units  : [{
				name : "pié de Burgos (Spanien)",
				factor : "0.278635"
				},
				{
				name : "pé (Portugal)",
				factor : "0.33"
				}]
            },
            {
            name  : "Längenmaße: deutschspr. Länder",
            group  : "1",
            units  : [{
				name : "Fuß (Basel)",
				factor : "0.29820"
				},
				{
				name : "Fuß (Bayern)",
				factor : "0.2918592"
				},
				{
				name : "Fuß (Braunschweig)",
				factor : "0.2853624"
				},
				{
				name : "Fuß (Gotha)",
				factor : "0.287622"
				},
				{
				name : "Fuß (Hamburg)",
				factor : "0.286575"
				},
				{
				name : "Fuß (Hessen)",
				factor : "0.287669"
				},
				{
				name : "Fuß (Köln)",
				factor : "0.2876"
				},
				{
				name : "Fuß (Mecklenburg)",
				factor : "0.291006"
				},
				{
				name : "Fuß (Münster)",
				factor : "0.2908"
				},
				{
				name : "Fuß (Pommern)",
				factor : "0.2921"
				},
				{
				name : "Fuß (rheinisch)",
				factor : "0.3138535"
				},
				{
				name : "Fuß (Sachsen)",
				factor : "0.2831901"
				},
				{
				name : "Fuß (Preußen)",
				factor : "0.3138535"
				},
				{
				name : "Fuß (Wien)",
				factor : "0.3180807"
				},
				{
				name : "Fuß (Württemberg)",
				factor : "0.2864903"
				},
				{
				name : "Werkschuh (Frankfurt)",
				factor : "0.2846143"
				},
				{
				name : "Meile (Preußen)",
				factor : "7532.485"
				},
				{
				name : "Postmeile (Österreich)",
				factor : "7585.937"
				},
				{
				name : "Dezimalfuß (Preußen)",
				factor : "0.3766242"
				}]
            },
            {
            name  : "Längenmaße: Osteuropa",
            group  : "1",
            units  : [{
				name : "Fuß (Böhmen)",
				factor : "0.2964"
				},
				{
				name : "Fuß (Mähren)",
				factor : "0.29596"
				},
				{
				name : "stopa (Krakauer Fuß)",
				factor : "0.3564"
				},
				{
				name : "stopa (Warschauer Fuß)",
				factor : "0.288"
				},
				{
				name : "Fuß (Rußland)",
				factor : "0.3556"
				},
				{
				name : "arschin",
				factor : "0.7112"
				},
				{
				name : "saschen (Faden)",
				factor : "2.133"
				},
				{
				name : "werst",
				factor : "1066.8"
				},
				{
				name : "milja",
				factor : "7468"
				}]
            },
            {
            name  : "Längenmaße: Antike",
            group  : "1",
            units  : [{
				name : "pes romanus",
				factor : "0.2945"
				},
				{
				name : "pollex (Zoll)",
				factor : "0.0245416667"
				},
				{
				name : "digitus (Fingerbreite)",
				factor : "0.01840625"
				},
				{
				name : "palmus (Handbreite)",
				factor : "0.073625"
				},
				{
				name : "cubitus (Elle)",
				factor : "0.44175"
				},
				{
				name : "passus (Doppelschritt)",
				factor : "1.4725"
				},
				{
				name : "pertica",
				factor : "2.945"
				},
				{
				name : "actus",
				factor : "35.34"
				},
				{
				name : "mille passus (Meile)",
				factor : "1472.5"
				},
				{
				name : "stadium (600 Fuß)",
				factor : "176.7"
				},
				{
				name : "stadium (1/8 Meile)",
				factor : "184.0625"
				},
				{
				name : "stadion (Olympia)",
				factor : "192.25"
				},
				{
				name : "Fuß (attisch)",
				factor : "0.308"
				},
				{
				name : "Fuß (Babylon)",
				factor : "0.35"
				},
				{
				name : "Fuß (Delphi)",
				factor : "0.1848"
				},
				{
				name : "Fuß (Olympia)",
				factor : "0.32041667"
				}]
            },
            {
            name  : "Fläche",
            group  : "4",
            units  : [{
				name : "qm",
				factor : "1"
				},
				{
				name : "qmm",
				factor : "0.000001"
				},
				{
				name : "qcm",
				factor : "0.0001"
				},
				{
				name : "qdm",
				factor : "0.01"
				},
				{
				name : "Ar",
				factor : "100"
				},
				{
				name : "Morgen",
				factor : "2500"
				},
				{
				name : "Hektar",
				factor : "10000"
				},
				{
				name : "qkm",
				factor : "1000000"
				},
				{
				name : "square inch",
				factor : "0.0006452"
				},
				{
				name : "square foot",
				factor : "0.09288"
				},
				{
				name : "square yard",
				factor : "0.836",
				subunits : "9"
				},
				{
				name : "pole (rod, perch)",
				factor : "25.289"
				},
				{
				name : "rood",
				factor : "1012",
				subunits : "40"
				},
				{
				name : "acre",
				factor : "4048",
				subunits : "4"
				},
				{
				name : "square mile",
				factor : "2590000"
				}]
            },
            {
            name  : "Sonstige",
            group  : "0",
            units  : [{
				name : "Maßstab 1:200",
				factor : "200"
				},
				{
				name : "Maßstab",
				factor : "1:100",
				add : "100"
				},
				{
				name : "Maßstab 1:75",
				factor : "75"
				},
				{
				name : "Maßstab 1:60",
				factor : "60"
				},
				{
				name : "Maßstab",
				factor : "1:50",
				add : "50"
				},
				{
				name : "Maßstab 1:25",
				factor : "25"
				},
				{
				name : "Maßstab 1:20",
				factor : "20"
				},
				{
				name : "Maßstab 1:10",
				factor : "10"
				},
				{
				name : "Maßstab 1:5",
				factor : "5"
				},
				{
				name : "Maßstab 1:3",
				factor : "3"
				}]
          }]
        };
    var buttons = {
        measure : {
            onclick : "measurebar",
            tooltip : "show the measuring toolbar",
            icon : "measure.png"
            },
        drawshape : {
            onclick : "drawshape",
            tooltip : "draw a shape",
            }
        };

    var defaults = {
        // buttonset of this plugin
        measureButtonSet : ['measurebar'],
        // unit data
        units : UNITS,
        // styles for shapes
        styles : {
            shape : {
                stroke : 'red',
                strokewidth : 1,
                fill : 'none'
                },
            constr : {
                stroke : 'cornsilk',
                strokewidth : 1,
                fill : 'none'
                },
            guide : {
                stroke : 'blue',
                strokewidth : 1,
                fill : 'none'
                },
            selected : {
                stroke : 'cyan',
                strokewidth : 1,
                fill : 'none'
                },
            handle : {
                stroke : 'blue',
                strokewidth : 1,
                fill : 'none',
                hover : {
                    fill : 'red',
                    }
                }
            },
        // implemented styles
        implementedStyles : ['shape', 'constr', 'guide', 'selected'],
        // implemented measuring shape types, for select widget
        implementedShapes : ['Line', 'LineString', 'Proportion', 'Rect', 'Rectangle', 'Polygon', 'Circle', 'Ellipse', 'Oval', 'Grid'],
        // all measuring shape types
        shapeInfo : {
            Line :       { name : 'line',           display : 'length', },
            LineString : { name : 'linestring',     display : 'length'  },
            Proportion : { name : 'proportion',     display : 'length'  },
            Rectangle :  { name : 'box',            display : 'area'    },
            Rect :       { name : 'rectangle',      display : 'area'    },
            Square :     { name : 'square',         display : 'length'  },
            Polygon :    { name : 'polygon',        display : 'area'    },
            Circle :     { name : 'circle',         display : 'radius'  },
            Ellipse :    { name : 'ellipse',        display : 'area'    },
            Oval :       { name : 'oval',           display : 'distance'  },
            Grid :       { name : 'linegrid',       display : 'spacing' }
            },
        // currently selected shape type
        activeShapeType : 'Line',
        // last measured distance
        lastMeasuredValue : 0,
        // measuring unit (index into unit list)
        unitFrom : 17,
        // converted unit (index into unit list)
        unitTo : 0,
        // maximal denominator for mixed fractions
        maxDenominator : 20,
        // number of decimal places for convert results
        maxDecimals : 3,
        // show convert result as mixed fraction?
        showMixedFraction : false,
        // show angle relative to last line?
        showRelativeAngle : false,
        // show distance numbers?
        showDistanceNumbers : true,
        // show ratio of rectangle sides?
        showRectangleRatios : false,
        // draw line ends as small crosses
        drawEndPoints : true,
        // draw mid points of lines
        drawMidPoints : false,
        // draw circle centers
        drawCenters : false,
        // draw rectangles from the diagonal and one point
        drawFromDiagonal : false,
        // draw circles from center
        drawFromCenter : true,
        // snap to endpoints
        snapEndPoints : false,
        // snap to mid points of lines
        snapMidPoints : false,
        // snap to circle centers
        snapCenters : false,
        // snap distance (in screen pixels)
        snapDistance : 5,
        // keep original object when moving/scaling/rotating
        keepOriginal : false,
        // number of copies when drawing grids
        gridCopies : 10
        };

    // debug routine
    var _debug_shape = function (msg, shape) {
        // console.debug('measure: ' + msg, shape.geometry.type, shape.geometry.coordinates);
        return;
        };

    // plugin actions
    var actions = {
        measurebar : function(data) {
            var $measureBar = data.$measureBar;
            if ($measureBar == null) {
                $measureBar = setupMeasureBar(data);
				};
			$measureBar.toggle();
			var on = $measureBar.is(":visible");
			attachKeyHandlers(data, on);
			showSVG(data, on);
			return;
            },
        drawshape : function(data) {
            var shape = newShape(data);
            var layer = data.measureLayer;
            $(data).trigger('createShape', shape);
            digilib.actions.addShape(data, shape, shapeCompleted, layer);
            _debug_shape('action drawshape', shape);
            }
        };

    // callback for vector.drawshape
    var shapeCompleted = function(data, shape) {
        _debug_shape('shapeCompleted', shape);
        data.measureWidgets.startb.removeClass('dl-drawing');
        if (shape == null || shape.geometry.coordinates == null) {
            return false; // do nothing if no line was produced
            };
        $(data).trigger('changeShape', shape); // update widgets
        return false;
        };

    // callback for vector.drawshape
    var onCreateShape = function(event, shape) {
        var data = this;
        data.measureWidgets.startb.addClass('dl-drawing');
        _debug_shape('onCreateShape', shape);
    };

    // event handler for positionShape
    var onPositionShape = function(event, shape) {
        var data = this;
        currentShape = shape;
        if (keystate['x'] != null) { // change only x-Dimension of mouse pointer
            manipulatePosition(shape, lockDimension('y'));
            }
        if (keystate['y'] != null) { // change only y-Dimension of mouse pointer
            manipulatePosition(shape, lockDimension('x'));
            }
        if (keystate['s'] != null) { // snap to next unit
            manipulatePosition(shape, snapToUnit(data));
            }
        // console.debug('onPositionShape', shape.properties.screenpos);
    };

    // event handler for dragShape
    var onDragShape = function(event, shape) {
        var data = this;
        updateInfo(data, shape);
        _debug_shape('onDragShape', shape);
    };

    // event handler for changeShape
    var onChangeShape = function(event, shape) {
        var data = this;
        updateInfo(data, shape);
        currentShape = null;
        _debug_shape('onChangeShape', shape);
    };

    // event handler for renderShape
    var onRenderShape = function(event, shape) {
        // event handler for updating shape info
        var info = function(event) {
            selectShape(data, shape);
            updateInfo(data, shape);
            _debug_shape('onClick', shape);
            };
        var data = this;
        var $elem = shape.$elem;
        $elem.on('click.measure', info);
        _debug_shape('onRenderShape', shape);
        };

    // round to 4 decimal places after point
    var mRound = function (num) {
        return Math.round(num * 10000 + 0.00001) / 10000
        };

    // get last vertex before current one
    var getLastVertex = function(shape, vertex) {
        var props = shape.properties;
        var vtx = vertex == null ? props.vtx : vertex;
        return (vtx === 0) ? props.screenpos.length-1 : vtx-1;
        };

    // calculate the distance of a shape vertex to the last (in rectified digilib coords)
    var getVertexDistance = function(data, shape, vtx) {
        if (vtx == null) {
            vtx = shape.properties.vtx; }
        var coords = shape.geometry.coordinates;
        var last = getLastVertex(shape, vtx);
        // safely assume that screenpos and coords have equal length?
        var dist = fn.getDistance(data, geom.position(coords[last]), geom.position(coords[vtx]));
        return dist.rectified;
        };

    // calculate distance from current to last vertex (in rectified digilib coords)
    var rectifiedDist = function(data, shape) {
        var coords = shape.geometry.coordinates;
        var total = 0;
        if (shape.geometry.type === 'LineString') { // sum up distances
            for (vtx = 1; vtx < coords.length; vtx++) {
                total += getVertexDistance(data, shape, vtx);
                }
        } else {
            total = getVertexDistance(data, shape);
            }
        return total;
        };

    // calculate the area of a polygon (rectified digilib coords)
    var rectifiedArea = function(data, shape) {
        var ar = fn.getImgAspectRatio(data);
        var rectifyPoint = function (c) {
            return geom.position(ar * c[0], c[1]);
            };
        var coords = $.map(shape.geometry.coordinates, rectifyPoint);
         // formula for ellipse area
        if (shape.geometry.type === 'Ellipse') {
            return Math.abs((coords[0].x-coords[1].x) * (coords[0].y-coords[1].y) * Math.PI);
            }
        // algorithm for polygon area
        var area = 0;
        j = coords.length-1; // set j to the last vertex
        for (i = 0; i < coords.length; i++) {
            area += (coords[j].x + coords[i].x) * (coords[j].y - coords[i].y); 
            j = i;  // set j to the current vertex, i increments
            }
        return Math.abs(area/2);
        };

    // recalculate factor after a new value was entered into input element "value1"
    var changeFactor = function(data) {
        var widgets = data.measureWidgets;
        var val = parseFloat(widgets.value1.val());
        var fac = val / data.lastMeasuredValue;
        data.measureFactor = fac;
        convertUnits(data);
    };

    // convert measured value to second unit and display
    var updateMeasures = function(data, val, type) {
        var info = data.settings.shapeInfo[type]
        var widgets = data.measureWidgets;
        var display = info.display;
        var u1 = parseFloat(widgets.unit1.val());
        var u2 = parseFloat(widgets.unit2.val());
        var ratio = u1 / u2;
        var result = (display === 'area') // TODO: display unit²
            ? val * ratio * ratio
            : val * ratio;
        widgets.shape.val(type);
        widgets.value1.val(fn.cropFloatStr(mRound(val)));
        widgets.value2.text(fn.cropFloatStr(mRound(result)));
        };

    // convert measured pixel values to new units
    var convertUnits = function(data) {
        var type = getActiveShapeType(data);
        var display = data.settings.shapeInfo[type].display;
        var val = data.lastMeasuredValue;
        var fac = data.measureFactor;
        var result = (display === 'area')
            ? val * fac * fac
            : val * fac;
        updateMeasures(data, result, type);
        };

    // display info for shape
    var updateInfo = function(data, shape) {
        var type = shape.geometry.type;
        var display = data.settings.shapeInfo[type].display;
        var val = (display === 'area')
            ? rectifiedArea(data, shape)
            : rectifiedDist(data, shape);
        data.lastMeasuredValue = val;
        setActiveShapeType(data, type);
        convertUnits(data);
        };

    // select/unselect shape (or toggle)
    var selectShape = function(data, shape, select) {
        var css = CSS+'selected';
        if (select == null) { // toggle
            select = !shape.properties.selected }
        var cssclass = shapeClass(shape.geometry.type, select ? css : null)
        shape.$elem.attr("class", cssclass);
        shape.properties.cssclass = cssclass;
        shape.properties.selected = select;
    };

    // construct CSS class for svg shape
    var shapeClass = function(shapeType, more) {
        var css = CSS+'shape '+CSS+shapeType;
        if (more != null) { css += ' '+more };
        return css;
        };

    // create a shape of the currently selected shape type
    var newShape = function(data) {
        var shapeType = getActiveShapeType(data);
        var style = data.settings.styles.shape;
        return {
            'id': fn.createId(null, CSS),
            'geometry': {
                'type': shapeType
                },
            'properties': {
                'editable': true,
                'selected': false,
                'stroke': style['stroke'],
                'stroke-width': style['stroke-width'],
                'cssclass': shapeClass(shapeType)
                // 'center' : data.settings.drawFromCenter
                }
            };
        };

    // disable the calibration input 
    var setCalibrationInputState = function(data) {
        var widgets = data.measureWidgets;
        var type = getActiveShapeType(data);
        var display = data.settings.shapeInfo[type].display;
        var state = display !== 'length' && display !== 'radius' && display !== 'spacing';
        widgets.value1.prop('disabled', state);
        widgets.type.text(display);
        };

    // returns a screenpoint manipulation function
    var snapToUnit = function(data) {
        // snap to the next rounded unit distance
        return function(shape) {
            var props = shape.properties;
            var screenpos = props.screenpos;
            var vtx = props.vtx;
            if (screenpos == null || vtx == null) {
                return; }
            var lastPos = screenpos[getLastVertex(shape)];
            var thisPos = screenpos[vtx]; // mouse position
            var fac = data.measureFactor;
            shape.geometry.coordinates[vtx] = data.imgTrafo.invtransform(thisPos);
            var unitDist = getVertexDistance(data, shape) * fac;
            var roundDist = Math.round(unitDist); // round to the nearest integer
            var newPos = (roundDist === 0)
                ? thisPos
                : lastPos.scale(thisPos, roundDist/unitDist); // calculate snap position
            screenpos[vtx].moveTo(newPos);
            };
        };

    // returns a screenpoint manipulation function
    var lockDimension = function(dim) {
        // lock one dimension of the current screen pos to that of the previous
        return function(shape) {
            var props = shape.properties;
            var startpos = props.startpos;
            var screenpos = props.screenpos;
            var vtx = props.vtx;
            if (startpos == null || screenpos == null || vtx == null) {
                return; }
            screenpos[vtx][dim] = startpos[dim];
            };
        };

    // manipulate the screen points of the shape
    var manipulatePosition = function(shape, manipulate) {
        // apply the manipulation function
        manipulate(shape);
        };

    // return the current shape type
    var getActiveShapeType = function(data) {
        return data.settings.activeShapeType;
        };

    // set the current shape type (from shape select widget)
    var changeShapeType = function(data) {
        data.settings.activeShapeType = data.measureWidgets.shape.val();
        setCalibrationInputState(data);
        };

    // set the current shape type
    var setActiveShapeType = function(data, type) {
        data.settings.activeShapeType = type;
        setCalibrationInputState(data);
        };

    // update Line Style classes (overwrite CSS)
    var updateLineStyles = function(data) {
        var s = data.settings;
        var $lineStyles = s.$lineStyles;
        var style = s.styles;
        $lineStyles.html(
            '.'+CSS+'guide {stroke: '+style.guide.stroke+'} '+
            '.'+CSS+'constr {stroke: '+style.constr.stroke+'} '+
            '.'+CSS+'selected {stroke: '+style.selected.stroke+'}'
            );
        var widget = data.measureWidgets;
        var styleName = s.implementedStyles;
        var bg = 'background-color';
        var setColor = function(i, item) {
            widget[item+'color'].css(bg, style[item].stroke)
            };
        $.each(styleName, setColor);
    };

    // load shape types into select element
    var populateShapeSelect = function(data) {
        var $shape = data.measureWidgets.shape;
        var shapeInfo = data.settings.shapeInfo;
        var implementedShape = data.settings.implementedShapes;
        var addOption = function(index, type) {
            $shape.append($('<option value="'+ type + '">' + shapeInfo[type].name + '</option>'));
            };
        $.each(implementedShape, addOption);
        $shape.children()[0].selected = true;
    };

    // load units into select elements
    var populateUnitSelects = function(data) {
        var widgets = data.measureWidgets;
        var $u1 = widgets.unit1;
        var $u2 = widgets.unit2;
        var section = data.settings.units.sections;
        var addOptions = function(i, item) {
            var $opt = $('<option class="dl-section" disabled="disabled">'+ item.name +'</option>');
            $u1.append($opt);
            $u2.append($opt.clone());
            var unit = item.units;
            var addOption = function(i, item) {
				var $opt = $('<option class="dl-units" value="'+ item.factor + '">'+ item.name + '</option>');
				$opt.data('unit', item);
				$u1.append($opt);
				$u2.append($opt.clone());
				};
            $.each(unit, addOption);
            };
        $.each(section, addOptions);
        $u1.children(':not(:disabled)')[data.settings.unitFrom].selected = true;
        $u2.children(':not(:disabled)')[data.settings.unitTo].selected = true;
    };

    // show or hide SVG element (not possible via jQuery .hide/.show)
    var showSVG = function(data, on) {
        var layer = data.measureLayer;
        $svg = layer.$elem;
        if (on) {
            $svg.removeAttr("display"); }
        else {
            $svg.attr("display", "none"); }
    };

    // initial position of measure bar (bottom left of browser window)
    var setScreenPosition = function(data, $bar) {
        if ($bar == null) return;
        var barH = geom.rectangle($bar).height;
        var screenH = fn.getFullscreenRect(data).height;
        geom.position(10, screenH - barH).adjustDiv($bar);
    };

    // drag measureBar around
    var dragMeasureBar = function(event) {
        var $div = $(this).parent();
        var x = $div.offset().left - event.pageX;
        var y = $div.offset().top - event.pageY;
        $(document.body).on('mousemove.measure', function(event) {
            $div.offset({
                left : event.pageX + x,
                top  : event.pageY + y
            });
        }).on('mouseup.measure', function(event) {
            $(document.body).off('mousemove.measure').off('mouseup.measure');
            });
        return false;
        };

    // remove selected shapes - or the most recent one, if none was selected
    var removeSelectedShapes = function(data) {
        var layer = data.measureLayer;
        var shapes = layer.shapes;
        if (shapes == null) return;
        var shapesDeleted = 0;
        for (var c = shapes.length; c > 0; --c) {
            var index = c-1;
            if (shapes[index].properties.selected) {
                shapesDeleted++;
                shapes.splice(index, 1);
                }
            }
        if (shapesDeleted === 0 && shapes.length > 0) {
            shapes.pop();
            shapesDeleted++;
            };
        layer.renderFn(data, layer);
        console.debug('measure: shapes deleted:', shapesDeleted);
        };

    // keydown event handler (active when measure bar is visible)
    var onKeyDown = function(event, data) {
        var code = event.keyCode;
        var key = event.key;
        // delete selected shapes
        if (code === 46 || key === 'Delete') {
            removeSelectedShapes(data);
            return false;
            }
        // manipulate current vertex position of shape
        if (code === 88 || key === 'x' ||
            code === 89 || key === 'y' ||
            code === 83 || key === 's') {
            if (keystate[key] == null) {
                // fire mousemove event with manipulated coords on keydown
                keystate[key] = event; // save key state
                if (currentShape == null) { return true };
                var props = currentShape.properties;
                var pt = props.screenpos[props.vtx]; // get vertex position
                var eventpos = { pageX: pt.x, pageY: pt.y };
                var evt = jQuery.Event("mousemove.dlVertexDrag", eventpos);
                $(document).trigger(evt);
                }
            return false;
            }
        };

    // keyup event handler (active when measure bar is visible)
    var onKeyUp = function(event, data) {
        var code = event.keyCode;
        var key = event.key;
        delete keystate[key]; // invalidate key state
        return false;
        };

    // attach/detach keyup/down event handlers
    var attachKeyHandlers = function(data, on) {
        if (on) {
            $(document.body).on('keydown.measure', 
                function(evt) { onKeyDown(evt, data) });
            $(document.body).on('keyup.measure', 
                function(evt) { onKeyUp(evt, data) });
            }
        else {
            $(document.body).off('keydown.measure');
            $(document.body).off('keyup.measure');
            }
        keystate = {};
        };

    // set up additional SVG shapes
    var setupSvgFactory = function(data) {
        var factory = data.svgFactory;
        if (factory == null) {
            console.error("No SVG factory found: jquery.digilib.vector not loaded?");
            return;
            }
        factory['Proportion'] = function (shape) {
            var $s = factory['LineString'](shape);
            shape.properties.maxvtx = 3;
            return $s;
            };
        factory['Rect'] = function (shape) {
            var trafo = data.imgTrafo;
            var $s = factory['Polygon'](shape);
            var props = shape.properties;
            props.maxvtx = 3;
            $s.place = function () {
                var p = props.screenpos;
                var vtx = props.vtx;
                if (p.length > 2) { // p[2] is the mouse pointer
                    var line1 = geom.line(p[0], p[1]); // base line
                    var line2 = line1.parallel(p[2]);
                    var p3 = line1.perpendicular().intersection(line2);
                    var p2 = p3.copy().add(line1.vector());
                    p[2] = p2.mid(p3); // handle position
                    shape.geometry.coordinates[2] = trafo.invtransform(p[2]).toArray();
                    props.pos = [p2, p3]; // save other points
                    }
                this.attr({points: [p[0], p[1], p2, p3].join(" ")});
                };
            return $s;
            };
        factory['Oval'] = function (shape) {
            var trafo = data.imgTrafo;
            var $s = factory['Rect'](shape);
            var props = shape.properties;
            var place = $s.place;
            var guide = CSS+'guide';
            var constr = CSS+'constr';
            $s.attr({'class' : guide});
            props.maxvtx = 4;
            var $g = $(fn.svgElement('g', {'id': shape.id + '-oval'}));
            var $c1 = $(fn.svgElement('circle', {'id': shape.id + '-circ1', 'class': guide }));
            var $c2 = $(fn.svgElement('circle', {'id': shape.id + '-circ2', 'class': guide }));
            var $p1 = $(fn.svgElement('path',   {'id': shape.id + '-lines', 'class': guide }));
            var $p2 = $(fn.svgElement('path',   {'id': shape.id + '-arc', stroke: props.stroke, fill: 'none' }));
            var $p3 = $(fn.svgElement('path',   {'id': shape.id + '-constr', 'class': constr })); // debug construction
            $g.append($s).append($c1).append($c2).append($p1).append($p2).append($p3);
            $g.place = function () {
                var p = props.screenpos;
                place.call($s); // place the framing rectangle (polygon)
                if (p.length > 3) { // p[3] is the mouse pointer
                    var side0 = geom.line(p[0], p[1])
                    var side1 = geom.line(p[1], props.pos[0]);
                    var side2 = geom.line(props.pos[0], props.pos[1]);
                    var side3 = geom.line(props.pos[1], p[0]);
                    var mid0 = side0.mid(); // midpoints of sides
                    var mid1 = side1.mid();
                    var mid2 = side2.mid();
                    var mid3 = side3.mid();
                    var axis0 = side0.parallel(mid3); // short axis
                    var axis1 = side1.parallel(mid0); // long axis
                    var maxDiam = axis0.length()-1; // maximal diameter for small circles
                    var handle = axis1.perpendicularPoint(p[3]); // drag point projected on long axis
                    if (handle.distance(mid0) > axis1.length()) { // constrain handle
                        handle.moveTo(mid2);
                    } else if (handle.distance(mid2) > maxDiam) {
                        handle.moveTo(geom.line(mid2, handle).length(maxDiam).point());
                        }
                    var m1 = handle.mid(mid2); // midpoints of the small circles
                    var m2 = axis0.mirror(m1);
                    var rad1 = m1.distance(mid2); // radius of the small circles
                    var rd = axis0.copy().length(rad1).point(); // radius distance from short axis
                    var ld = geom.line(rd, m1);
                    var md = rd.mid(m1);
                    var bi = ld.perpendicular(md); // perpendicular bisector
                    var m3 = axis0.intersection(bi); // midpoints of the big circles
                    var m4 = axis1.mirror(m3);
                    var fp1 = geom.line(m3, m1).addEnd(rad1); // the four fitting points
                    var fp2 = geom.line(m3, m2).addEnd(rad1);
                    var fp3 = geom.line(m4, m1).addEnd(rad1);
                    var fp4 = geom.line(m4, m2).addEnd(rad1);
                    var rad2 = m3.distance(fp1); // radius of the big circles
                    // place the SVG shapes
                    $c1.attr({cx: m1.x, cy: m1.y, r: rad1});
                    $c2.attr({cx: m2.x, cy: m2.y, r: rad1});
                    $p1.attr({d: // the guides
                        'M'+fp1+' L'+m3+' '+fp2+
                        'M'+fp3+' L'+m4+' '+fp4+
                        'M'+mid0+' L'+mid2+
                        'M'+mid1+' L'+mid3});
                    $p2.attr({d: 'M'+fp2+ // the arcs
                        ' A'+rad2+','+rad2+' 0 0,1 '+fp1+
                        ' A'+rad1+','+rad1+' 0 0,1 '+fp3+
                        ' A'+rad2+','+rad2+' 0 0,1 '+fp4+
                        ' A'+rad1+','+rad1+' 0 0,1 '+fp2});
                    $p3.attr({d: 'M'+rd+' L'+m1+' M'+md+' '+m3}); // debug construction
                    p[3] = handle;
                    shape.geometry.coordinates[3] = trafo.invtransform(handle).toArray();
                    }
                };
            return $g;
            };
        factory['Grid'] = function (shape) {
            var $s = factory['Line'](shape);
            var place = $s.place;
            var gridID = shape.id + '-grid';
            var props = shape.properties;
            props.maxvtx = 2;
            var $g = $(fn.svgElement('g', {id: shape.id + '-g'}));
            var $defs = $(fn.svgElement('defs'));
            var $pat = $(fn.svgElement('pattern', {id: gridID, height: '10%', width: '10%', patternUnits: 'objectBoundingBox'}));
            var $path = $(fn.svgElement('path', {d: "M1000,0 L0,0 0,1000", fill: 'none', stroke: props.stroke, 'stroke-width': '1'}));
            var $r = $(fn.svgElement('rect', {id: shape.id + '-rect', stroke: props.stroke, fill: 'url(#'+gridID+')'}));
            $g.append($defs.append($pat.append($path))).append($r).append($s);
            $g.place = function () {
                place.call($s);
                var p = props.screenpos;
                var d = p[0].distance(p[1]);
                var angle = mRound(p[0].deg(p[1]));
                var scale = 10;
                var fac = Math.ceil((1-scale)/2);
                var x = p[0].x + fac * d;
                var y = p[0].y + (fac-1) * d;
                var transform = 'rotate('+angle+' '+p[0].x+' '+p[0].y+')';
                $r.attr({x:x, y:y, height:d*scale, width:d*scale, transform:transform});
                $pat.attr({patternTransform:transform});
                };
            return $g;
            };
        };

    // add a style element to head, for changing line class styles
    var setupLineStyles = function(data) {
        var $head = $('head');
        var $lineStyles = $('<style></style>');
        $head.append($lineStyles);
        data.settings.$lineStyles = $lineStyles;
        updateLineStyles(data);
        var widget = data.measureWidgets;
        if ($.fn.colorPicker == null) {
            return; }
        var styleName = data.settings.implementedStyles;
        var style = data.settings.styles;
        var setupColorPicker = function(i, item) {
            var changeStroke = function(color) {
                style[item].stroke = color;
                updateLineStyles(data);
                };
            var w = widget[item+'color'];
            w.colorPicker({
                pickerDefault : style[item].stroke,
                onColorChange : changeStroke
                });
            };
        $.each(styleName, setupColorPicker);
        };

    var setupMeasureBar = function(data) {
        console.debug('measure: setupMeasureBar');
        var widgets = {
            names : [
                'info',
                'startb', 'shape',
                'type',
                'value1', 'unit1', 'eq',
                'value2', 'unit2',
                'shapecolor', 'guidecolor', 'constrcolor', 'selectedcolor',
                'move'
                ],
            info :       $('<img id="dl-measure-info" src="img/info.png" title="display info window for shapes"></img>'),
            startb :     $('<button id="dl-measure-startb" title="click to draw a measuring shape on top of the image">M</button>'),
            shape :      $('<select id="dl-measure-shape" title="select a shape to use for measuring" />'),
			eq :         $('<span class="dl-measure-label">=</span>'),
			type :       $('<span id="dl-measure-shapetype" class="dl-measure-label">length</span>'),
			fac :        $('<span id="dl-measure-factor" class="dl-measure-number" />'),
			value1 :     $('<input id="dl-measure-value1" class="dl-measure-input" title="last measured value - click to change the value" value="0.0" />'),
			value2 :     $('<span id="dl-measure-value2" class="dl-measure-label" title="last measured value, converted to the secondary unit" value="0.0"/>'),
			unit1 :      $('<select id="dl-measure-unit1" title="current measuring unit - click to change" />'),
			unit2 :      $('<select id="dl-measure-unit2" title="secondary measuring unit - click to change" />'),
			angle :      $('<span id="dl-measure-angle" class="dl-measure-number" title="last measured angle" />'),
            shapecolor : $('<span id="dl-measure-shapecolor" title="select line color for shapes"></span>'),
            guidecolor : $('<span id="dl-measure-guidecolor" title="select guide line color for shapes"></span>'),
            constrcolor :$('<span id="dl-measure-constrcolor" title="select construction line color for shapes"></span>'),
            selectedcolor :$('<span id="dl-measure-selectedcolor" title="select line color for selected shapes"></span>'),
            move :       $('<img id="dl-measure-move" src="img/move.png" title="move measuring bar around the screen"></img>')
		    };
        var $measureBar = $('<div id="dl-measure-toolbar" />');
        var widgetName = widgets.names;
        var appendWidget = function (i, item) {
            $measureBar.append(widgets[item]);
            };
        $.each(widgetName, appendWidget);
        data.$elem.append($measureBar);
        data.$measureBar = $measureBar;
        widgets.fac.text(fn.cropFloatStr(data.measureFactor));
        data.measureWidgets = widgets;
        populateShapeSelect(data);
        populateUnitSelects(data);
        setupMeasureWidgets(data);
        setupLineStyles(data);
        setScreenPosition(data, $measureBar);
        widgets.move.on('mousedown.measure', dragMeasureBar);
        return $measureBar;
        };

    // wire the draw button and widgets
    var setupMeasureWidgets = function (data) {
        console.debug('measure: setupMeasureWidgets');
        var widgets = data.measureWidgets;
        var $startb = widgets.startb;
        var buttonConfig = buttons['drawshape']; // not in data.settings.buttons
        // button properties
        var action = buttonConfig.onclick;
        var tooltip = buttonConfig.tooltip;
        $startb.attr('title', tooltip);
        $elem = data.$elem;
        $startb.on('mousedown.measure', function(evt) {
            // prevent mousedown event ot bubble up to measureBar (no dragging!)
            console.debug('measure: startb mousedown=', action, ' evt=', evt);
            $elem.digilib(action);
            return false;
            });
        widgets.shape.on('change.measure',  function(evt) { changeShapeType(data) });
        widgets.value1.on('change.measure', function(evt) { changeFactor(data) });
        widgets.unit1.on('change.measure',  function(evt) { convertUnits(data) });
        widgets.unit2.on('change.measure',  function(evt) { convertUnits(data) });
        widgets.unit1.attr('tabindex', -1);
        widgets.unit2.attr('tabindex', -1);
        widgets.value1.attr('tabindex', -1);
        };

    // event handler for setup phase
    var handleSetup = function (evt) {
        console.debug("measure: handleSetup");
        var data = this;
        data.lastMeasuredValue = 0;
        data.lastMeasuredAngle = 0;
        data.measureFactor = 1.0,
        setupMeasureBar(data);
        setupSvgFactory(data);
        data.measureLayer = {
            'shapes': [],
            'projection': 'screen',
            'handleType': 'diamond'
            };
        digilib.actions.addVectorLayer(data, data.measureLayer);
        };

    // event handler for scaler update
    var handleUpdate = function (evt) {
        var data = this;
        console.debug("measure: handleUpdate");
        };

    // plugin installation called by digilib on plugin object
    var install = function (plugin) {
        digilib = plugin;
        if (digilib.plugins.vector == null) {
            console.error('measure: jquery.digilib.vector.js is missing, aborting installation.');
            return;
            }
        console.debug('installing measure plugin. digilib:', digilib);
        fn = digilib.fn;
        // import geometry classes
        geom = fn.geometry;
        // add defaults, actions, buttons
        $.extend(true, digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(true, digilib.buttons, buttons);
        // insert in button list -- not elegant
        if (digilib.plugins.buttons != null) {
            // if (digilib.defaults.buttonSettings != null) {
            digilib.defaults.buttonSettings.fullscreen.standardSet.splice(10, 0, 'measure');
            }
        // export functions
        // fn.test = test;
        };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising measure plugin. data:', data);
        var settings = data.settings;
        CSS = settings.cssPrefix+'measure-';
        FULL_AREA  = geom.rectangle(0, 0, 1, 1);
        // install event handlers
        var $data = $(data);
        $data.on('setup', handleSetup);
        $data.on('update', handleUpdate);
        $data.on('createShape', onCreateShape);
        $data.on('renderShape', onRenderShape);
        $data.on('changeShape', onChangeShape);
        $data.on('positionShape', onPositionShape);
        $data.on('dragShape', onDragShape);
        };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var pluginProperties = {
            name : 'measure',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
        };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.measure must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', pluginProperties);
    }
})(jQuery);
