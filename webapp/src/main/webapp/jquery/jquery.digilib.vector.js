/*
 * #%L
 * digilib vector plugin
 * %%
 * Copyright (C) 2014 Bibliotheca Hertziana, MPIWG Berlin
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
digilib vector plugin
 */

(function($) {

    // affine geometry
    var geom;
    // plugin object with digilib data
    var digilib;

    var buttons = {
    };

    var defaults = {
            // set default values for options here
            // is STUB active?
            'isvectorActive' : true
    };

    var actions = {
    };

    // plugin installation routine, called by digilib on each plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing vector plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        FULL_AREA = geom.rectangle(0,0,1,1);
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
        $data.bind('redisplay', handleRedisplay);
        $data.bind('dragZoom', handleDragZoom);
    };


    var handleSetup = function (evt) {
        console.debug("vector: handleSetup");
        var data = this;
        var $svg = $('<svg xmlns="http://www.w3.org/2000/svg" \
        		viewBox="0 0 1 1" preserveAspectRatio="none" style="position:absolute">\
        <g style="stroke-width: 0.005; fill: none">\
        <rect x="0.0" y="0.0" width="1.0" height="1.0" style="stroke: red" />\
        <rect x="0.1" y="0.1" width="0.1" height="0.1" style="stroke: orange" />\
        </g></svg>');
        data.$elem.append($svg);
        data.$svg = $svg;
    };

    var handleUpdate = function (evt) {
        console.debug("vector: handleUpdate");
        var data = this;
        if (data.imgRect != null) {
        	data.$svg.css(data.imgRect.getAsCss());
            data.$svg.get(0).setAttribute("viewBox", data.zoomArea.getAsSvg());
        }
    };

    var handleRedisplay = function (evt) {
        console.debug("vector: handleRedisplay");
        var data = this;
    };

    var handleDragZoom = function (evt, zoomArea) {
        var data = this;
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
