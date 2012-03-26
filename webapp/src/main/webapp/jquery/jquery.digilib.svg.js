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
  Martin Raspe, Robert Casties, 26.3.2012
*/

/**
 * digilib SVG plugin (display a SVG on top if scaler image and zoom/rotate/mirror etc.)
**/ 

/* jslint browser: true, debug: true, forin: true
*/

(function($) {

    // plugin object with digilib data
    var digilib = null;
    // the functions made available by digilib
    var fn = null;
    // affine geometry plugin
    var geom = null;

    var defaults = {};

    var actions = {
        "test" : function(options) {
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

    // plugin installation called by digilib on plugin object.
    var install = function (plugin) {
        digilib = plugin;
        console.debug('installing svg plugin. digilib:', digilib);
        fn = digilib.fn;
        // import geometry classes
        geom = fn.geometry;
        // add defaults, actions, buttons
        $.extend(true, digilib.defaults, defaults); // make deep copy
        $.extend(digilib.actions, actions);
        // export functions
        // fn.test = test;
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising digilibSVG plugin. data:', data);
        var $data = $(data);
        $data.bind('setup', handleSetup);
    };

    var handleSetup = function (evt) {
        console.debug("svg: handleSetup");
        var data = this;
        var settings = data.settings;
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
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
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
