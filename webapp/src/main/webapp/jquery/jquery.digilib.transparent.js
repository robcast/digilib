/*
 * #%L
 * digilib transparent plugin
 * %%
 * Copyright (C) 2011 - 2014 Bibliotheca Hertziana, MPIWG Berlin
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
digilib transparent plugin
 */

(function($) {

    // affine geometry
    var geom;
    // plugin object with digilib data
    var digilib;

    var FULL_AREA;

    // the functions made available by digilib
    var fn = {
        // dummy function to avoid errors, gets overwritten by buttons plugin
        highlightButtons : function () {
            console.debug('transparent: dummy function - highlightButtons');
            }
        };

    var buttons = {
            toggletransparent : {
                onclick : "toggleTransparent",
                tooltip : "show transparent image",
                icon : "toggle-transparent.png"
                },
            setopacity : {
                onclick : "setOpacity",
                tooltip : "set the opacity of the transparent image",
                icon : "set-opacity.png"
                },
            movetransparent : {
                onclick : "moveTransparent",
                tooltip : "move the transparent image",
                icon : "move-transparent.png"
                },
            zoomtransparent : {
                onclick : "zoomTransparent",
                tooltip : "zomm the transparent image",
                icon : "zoom-transparent.png"
                },
    };

    var defaults = {
        // is transparent image visible?
        'isTransparentVisible' : false,
        // Transparency of image
        'opacity' : 0.5,
        // digilib file path for transparent image
        'tfn' : '',
        // digilib file number for transparent image
        'tpn' : '',
        // relative digilib coordinates for transparent image
        'trect' : null,
        // general buttonset of this plugin
        'transparentSet' : ['toggletransparent', 'setopacity', 'movetransparent', 'zoomtransparent']
        };

    var actions = {
            // show or hide transparent image
            toggleTransparent : function (data, param) {
                var settings = data.settings;
                var show = !data.settings.isTransparentVisible;
                data.settings.isTransparentVisible = show;
                fn.highlightButtons(data, 'transparent', show);
                renderTransparent(data);
                console.log('toggleTransparent');
            },
            // make the scaler image shine through
            setOpacity : function (data, param) {
                var settings = data.settings;
                console.log('setOpacity');
            },
            // move the transparent image with respect to the scaler image
            moveTransparent : function (data, param) {
                var settings = data.settings;
                console.log('moveTransparent');
            },
            // zoom the transparent image with respect to the scaler image
            zoomTransparent : function (data, param) {
                var settings = data.settings;
                console.log('zoomTransparent');
            }
    };

    // show a transparent image on top of the scaler image 
    var renderTransparent = function (data) {
        //var zoomArea = data.zoomArea;
        //if (!data.imgTrafo) return;
        var settings = data.settings;
        var cssPrefix = data.settings.cssPrefix;
        var selector = '#'+cssPrefix+'transparent';
        var $tp = data.$tp;
        if ($tp == null) {
            $tp = $('<div id="'+cssPrefix+'transparent"/>');
            var queryString = fn.getParamString(settings, ['dw', 'dh']);
            var file = settings.tfn
                ? "&fn=" + settings.tfn
                : "&pn=" + settings.tpn;
            var url = settings.scalerBaseUrl + '?' + queryString + file;
            var css = {
                'position' : 'absolute',
                'background-image' : 'url(' + url + ')',
                'background-repeat' : 'no-repeat',
                'background-position' : '0px 0px',
                'opacity' : settings.opacity
                };
            $tp.css(css);
            data.$elem.append($tp);
            data.$tp = $tp;
            }
        var show = data.settings.isTransparentVisible;
        if (show){ 
            $tp.fadeIn();
            data.imgRect.adjustDiv($tp);
            }
        else {
            $tp.fadeOut();
        }
    };

    // reload display after the transparent has been moved or resized
    var redisplay = function (data) {
        packParams(data);
        fn.redisplay(data);
    };

    // read transparent img from URL parameters
    var unpackParams = function (data) { 
        var tc = data.settings.tc;
        if (tc == null) return ;
        var pos = coord.split("/", 4);
        var rect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
        return rect;
    };

    // pack transparent coords into URL parameter string
    var packParams = function (data) {
        var rect = data.settings.trect;
        var packed = packCoords(rect, '/');
        console.debug('pack transparent coordinates:', packed);
        return packed;
    };

    // additional buttons
    var installButtons = function (data) {
        var settings = data.settings;
        var mode = settings.interactionMode;
        var buttonSettings = settings.buttonSettings[mode];
        var buttonSet = settings.transparentSet;
        if (buttonSet.length && buttonSet.length > 0) {
            buttonSettings.transparentSet = buttonSet;
            buttonSettings.buttonSets.push('transparentSet');
            }
    };

    // plugin installation routine, called by digilib on each plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing transparent plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        // import digilib functions
        $.extend(fn, digilib.fn);
        FULL_AREA = geom.rectangle(0,0,1,1);
        // add defaults, actions, buttons to the main digilib object
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising transparent plugin. data:', data);
        var $data = $(data);
        // install event handlers
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
        $data.bind('redisplay', handleRedisplay);
        $data.bind('dragZoom', handleDragZoom);
        // install buttons if button plugin is present
        if (digilib.plugins.buttons != null) {
            installButtons(data);
        }
    };


    var handleSetup = function (evt) {
        console.debug("transparent: handleSetup");
        var data = this;
    };

    var handleUpdate = function (evt) {
        console.debug("transparent: handleUpdate");
        var data = this;
    };

    var handleRedisplay = function (evt) {
        console.debug("transparent: handleRedisplay");
        var data = this;
    };

    var handleDragZoom = function (evt, zoomArea) {
        var data = this;
    };

    // plugin object, containing name, install and init routines 
    // all shared objects are filled by digilib on registration
    var plugin = {
            name : 'transparent',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.transparent.js must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
