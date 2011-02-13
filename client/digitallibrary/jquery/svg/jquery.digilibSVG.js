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
        var $toolbar = $('<div id="svg-toolbar"/>');
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
        var $unit = $('<select id="svg-unit"/>');
        var $conv = $('<select id="svg-convert"/>');
        for (var i = 0; i < units.length; i++) {
            var name = units[i].name;
            var $opt = $('<option value="' + i + '">' + name + '</option>');
            $unit.append($opt);
            $conv.append($opt.clone());
            }
        // other elements
        var $px = $('<span id="svg-pixel"/>');
        var $pxlabel = $('<span id="svg-pixellabel"> px x </span>');
        var $pxfactor = $('<span id="svg-pixelfactor"/>');
        $('body').append($toolbar);
        $toolbar.append($shape);
        $toolbar.append($px);
        $toolbar.append($pxlabel);
        $toolbar.append($pxfactor);
        $toolbar.append($unit);
        $toolbar.append($conv);
        };

    var actions = {
        "init" : function(options) {
            var $digilib = this;
            var settings = $.extend({}, defaults, options);
            // prepare the AJAX call back
            var onLoadXML = function (xml) {
                settings.xml = xml;
                setupToolBar(settings);
                $digilib.each(function() {
                    var $elem = $(this);
                    $elem.data(pluginName, settings);
                    });
                };
            // fetch the XML measuring unit list
            $.ajax({
                type : "GET",
                url : "svg/archimedes.xml",
                dataType : "xml",
                success : onLoadXML
                });
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

