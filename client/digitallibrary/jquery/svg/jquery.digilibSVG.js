/* Copyright (c) 2011 Martin Raspe, Robert Casties
 
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
 
Authors:
  Martin Raspe, Robert Casties, 9.2.2011
*/

/**
 * digilib SVG plugin (measuring tool for use within the digilib jQuery plugin)
**/ 


/* jslint browser: true, debug: true, forin: true
*/

// fallback for console.log calls
if (typeof(console) === 'undefined') {
    var console = {
        log : function(){}, 
        debug : function(){}, 
        error : function(){}
        };
    var customConsole = true;
}

(function($) {
    console.debug('installing jquery.digilibSVG');

    var pluginName = 'digilibSVG';
    var geom;

    var defaults = {
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
            'ratio', 'intercolumn', 'line grid'],
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
        // keep original object when moving/scaling/rotating
        keepOriginal : false,
        // number of copies when drawing grids
        gridCopies : 10
        };

    // setup a div for accessing the main SVG functionality
    var setupToolBar = function(settings) {
        var $toolBar = $('<div id="svg-toolbar"/>');
        // shapes select
        var $shape = $('<select id="svg-shapes"/>');
        for (var i = 0; i < settings.shapes.length; i++) {
            var name = settings.shapes[i];
            var $opt = $('<option value="' + i + '">' + name + '</option>');
            $shape.append($opt);
            }
        // console.debug($xml);
        var $xml = $(settings.xml);
        var units = [];
        $xml.find("unit").each(function() {
            units.push({
                'name' : $(this).attr("name"),
                'factor' : $(this).attr("factor"), 
                'add' : $(this).attr("add"), 
                'subunits' : $(this).attr("subunits")
                });
            });
        settings.units = units;
        // unit selects
        var $unit1 = $('<select id="svg-convert1"/>');
        var $unit2 = $('<select id="svg-convert2"/>');
        for (var i = 0; i < units.length; i++) {
            var name = units[i].name;
            var $opt = $('<option value="' + i + '">' + name + '</option>');
            $opt.data(pluginName, units[i]);
            $unit1.append($opt);
            $unit2.append($opt.clone());
            }
        // other elements
        var $la1 = $('<span class="svg-label">pixel</span>');
        var $la2 = $('<span class="svg-label">factor</span>');
        var $la3 = $('<span class="svg-label">=</span>');
        var $la4 = $('<span class="svg-label">=</span>');
        var $px = $('<span id="svg-pixel" class="svg-number">0.0</span>');
        var $factor = $('<span id="svg-factor" class="svg-number">0.0</span>');
        var $result1 = $('<input id="svg-unit1" class="svg-input" value="0.0"/>');
        var $result2 = $('<input id="svg-unit2" class="svg-input" value="0.0"/>');
        var $angle = $('<span id="svg-angle" class="svg-number">0.0</span>');
        $('body').append($toolBar);
        $toolBar.append($shape);
        $toolBar.append($la1);
        $toolBar.append($px);
        $toolBar.append($la2);
        $toolBar.append($factor);
        $toolBar.append($la3);
        $toolBar.append($result1);
        $toolBar.append($unit1);
        $toolBar.append($la4);
        $toolBar.append($result2);
        $toolBar.append($unit2);
        $toolBar.append($angle);
        return $toolBar;
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

    var actions = {
        "init" : function(options) {
            var $digilib = this;
            var data = $digilib.data('digilib');
            var plugins = data.plugins;
            geom = plugins.geometry.init();
            var settings = $.extend({}, defaults, options);
            // prepare the AJAX callback
            // TODO: return unless interactiveMode === 'fullscreen'?
            var onLoadXML = function (xml) {
                settings.xml = xml;
                settings.$toolBar = setupToolBar(settings);
                $digilib.each(function() {
                    var $elem = $(this);
                    $elem.data(pluginName, settings);
                    });
                };
            var onLoadScalerImg = function () {
                var $svgDiv = $('<div id="svg" />');
                $('body').append($svgDiv);
                // size SVG div like scaler img
                var $scalerImg = $digilib.find('img.pic');
                var scalerImgRect = geom.rectangle($scalerImg);
                scalerImgRect.adjustDiv($svgDiv);
                console.debug('$svgDiv', scalerImgRect);
                var $svg = $svgDiv.svg({
                        'onLoad' : drawInitial
                    });
                settings.$elem = $digilib;
                settings.$svgDiv = $svgDiv;
                settings.$svg = $svg;
                // set SVG data 
                $svg.data('digilib', data);
                $svg.data(pluginName, settings);
                };
            // fetch the XML measuring unit list
            $.ajax({
                type : "GET",
                url : "svg/archimedes.xml",
                dataType : "xml",
                success : onLoadXML
                });
            data.$img.load(onLoadScalerImg);
            return this;
            }
        };

 // hook plugin into jquery
    $.fn[pluginName] = function(action) {
        if (actions[action]) {
            // call action on this with the remaining arguments (inserting data as first argument)
            var $elem = $(this);
            var data = $elem.data('digilib');
            if (!data) {
                return $.error(pluginName + ' action ' + action + ' needs a digilib element');
                }
            var args = Array.prototype.slice.call(arguments, 1);
            args.unshift(data);
            return actions[action].apply(this, args);
        } else if (typeof(action) === 'object' || !action) {
            // call init on this
            return actions.init.apply(this, arguments);
        } else {
            $.error('action ' + action + ' does not exist on jQuery.' + pluginName);
        }
    };

})(jQuery);

