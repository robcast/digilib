/*
 * #%L
 * digilib SVG plugin
 * %%
 * Copyright (C) 2012 - 2013 Bibliotheca Hertziana, MPIWG Berlin
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
 * Authors: Martin Raspe, Robert Casties, 26.3.2012
 */
/**
 * digilib SVG plugin (display a SVG on top if scaler image and zoom/rotate/mirror etc.)
**/ 

/* jslint browser: true, debug: true, forin: true
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
            console.debug('svg: dummy function - highlightButtons');
            }
        };
    // affine geometry plugin
    var geom = null;
    // convenience variable, set in init()
    var CSS = '';

    var buttons = {
        toolbar : {
            onclick : "toolbar",
            tooltip : "show toolbar",
            icon : "showregions.png"
            },
        line : {
            onclick : "line",
            tooltip : "draw measuring line",
            icon : "addregion.png"
            }
        };

    var defaults = {
        // buttonset of this plugin
        svgSet : ['toolbar', 'line'],
        // choice of colors offered by toolbar
        lineColors : ['white', 'red', 'yellow', 'green', 'blue', 'black'],
        // default color
        lineColor : 'white',
        // color while the line is drawn
        drawColor : 'green',
        // color of selected objects
        selectColor : 'red',
        // drawing shapes
        shapes : ['line', 'polyline', 'rectangle', 'square', 'circle', 'arch',
            'ratio', 'intercolumnium', 'line grid'],
        // default shape
        shape : 'line',
        // measuring unit (index into list)
        unit : 1,
        // converted unit (index into list)
        converted : 2,
        // last measured distance 
        lastDistance : 0,
        // last measured angle 
        lastAngle : 0,
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
        drawFromCenter : false,
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

    var actions = {
        toolbar : function(data) {
            var $toolbar = data.settings.$toolbar;
            if ($toolbar) {
                return $toolbar.toggle();
                };
            $toolbar = setupToolbar(data);
            var onLoadXML = function (xml) {
                $xml = $(xml);
                data.settings.$xml = $xml;
                loadToolbarData(data, $toolbar, $xml);
                };
            // fetch the XML measuring unit list
            $.ajax({
                type : "GET",
                url : "svg/archimedes.xml",
                dataType : "xml",
                success : onLoadXML
                });
            // data.$img.load(onLoadScalerImg);
            return this;
            },
        line : function(data) {
            //
            }
        };

    // setup a div for accessing the main SVG functionality
    var setupToolbar = function(data) {
        var html = '\
            <div id="svg-toolbar">\
                <select id="svg-shapes"/>\
                <span class="svg-label">pixel</span>\
                <span id="svg-pixel" class="svg-number">0.0</span>\
                <span class="svg-label">factor</span>\
                <span id="svg-factor" class="svg-number">0.0</span>\
                <input id="svg-value1" class="svg-input" value="0.0"/>\
                <span class="svg-label">=</span>\
                <select id="svg-unit1"/>\
                <input id="svg-value2" class="svg-input" value="0.0"/>\
                <span class="svg-label">=</span>\
                <select id="svg-unit2"/>\
                <span id="svg-angle" class="svg-number">0.0</span>\
            </div>';
        var $toolbar = $(html);
        data.$elem.append($toolbar);
        data.settings.$toolbar = $toolbar;
        $toolbar.show();
        return $toolbar;
        };

    // load shapes into select element
    var loadShapes = function(data, $toolbar) {
        var $shape = $toolbar.find('#svg-shapes');
        $.each(data.settings.shapes, function(index, name) {
            var $opt = $('<option value="'+index+'">'+name+'</option>');
            $shape.append($opt);
            });
    };

    // load units into select elements
    var loadSections = function(data, $toolbar, $xml) {
        var $unit1 = $toolbar.find('#svg-unit1');
        var $unit2 = $toolbar.find('#svg-unit2');
        $xml.find("section").each(function(index, section) {
            var $section = $(section);
            var name = $section.attr("name");
            var $opt = $('<option class="section" disabled="disabled">'+name+'</option>');
            $unit1.append($opt);
            $unit2.append($opt.clone());
            $section.find("unit").each(function(index, unit) {
                var $unit = $(unit);
                var name = $unit.attr("name");
                var factor = $unit.attr("factor"); 
                var $opt = $('<option class="unit" value="'+factor+'">'+ name+'</option>');
                $opt.data('unit', {
                    'name' : name,
                    'factor' : factor, 
                    'add' : $unit.attr("add"), 
                    'subunits' : $unit.attr("subunits")
                    });
                $unit1.append($opt);
                $unit2.append($opt.clone());
                });
            });
    };

    // setup a div for accessing the main SVG functionality
    var loadToolbarData = function(data, $toolbar, $xml) {
        loadShapes(data, $toolbar);
        loadSections(data, $toolbar, $xml);
    };

    var drawInitial = function ($svg) {
        console.debug('SVG is ready');
        var $svgDiv = $(this);
        var rect = geom.rectangle($svgDiv);
        $svg.line(0, 0, rect.width, rect.height,
            {stroke: 'white', strokeWidth: 2});
        $svg.line(0, rect.height, rect.width, 0,
            {stroke: 'red', strokeWidth: 2});
        };

    var handleSetup = function (evt) {
        console.debug("svg: handleSetup");
        var data = this;
        var settings = data.settings;
    };

    // additional buttons
    var installButtons = function (data) {
        var settings = data.settings;
        var mode = settings.interactionMode;
        var buttonSettings = settings.buttonSettings[mode];
        var buttonSet = settings.svgSet;
        if (buttonSet.length && buttonSet.length > 0) {
            buttonSettings.svgSet = buttonSet;
            buttonSettings.buttonSets.push('svgSet');
            }
    };

    // plugin installation called by digilib on plugin object.
    var install = function (plugin) {
        digilib = plugin;
        console.debug('installing svg plugin. digilib:', digilib);
        fn = digilib.fn;
        // import geometry classes
        geom = fn.geometry;
        // add defaults, actions, buttons
        $.extend(true, digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(true, digilib.buttons, buttons);
        // export functions
        // fn.test = test;
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising svg plugin. data:', data);
        var settings = data.settings;
        CSS = settings.cssPrefix;
        FULL_AREA  = geom.rectangle(0, 0, 1, 1);
        // install event handlers
        var $data = $(data);
        $data.on('setup', handleSetup);
        // $data.on('update', handleUpdate);
        // install region buttons if user defined regions are allowed
        if (digilib.plugins.buttons != null) {
            installButtons(data);
        }
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var pluginProperties = {
            name : 'svg',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.svg must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', pluginProperties);
    }
})(jQuery);
