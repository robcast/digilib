/*
 * #%L
 * digilib plugin stub
 * %%
 * Copyright (C) 2011 - 2013 Bibliotheca Hertziana, MPIWG Berlin
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
digilib plugin stub
 */

(function($) {

    // affine geometry
    var geom;
    // plugin object with digilib data
    var digilib;

    var FULL_AREA;

    var buttons = {
            STUB : {
                onclick : ["doSTUB", 1],
                tooltip : "what does this button do?",
                icon : "STUB.png"
                }
    };

    var defaults = {
            // set default values for options here
            // is STUB active?
            'isSTUBActive' : true
    };

    var actions = {
            // action code goes here 
            doSTUB : function (data, param) {
                var settings = data.settings;
                console.log('isSTUBActive', settings.isSTUBActive);
                // do some useful stuff ...
            }
    };

    // plugin installation routine, called by digilib on each plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing STUB plugin. digilib:', digilib);
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
        console.debug('initialising STUB plugin. data:', data);
        var $data = $(data);
        // install event handlers
        $data.on('setup', handleSetup);
        $data.on('update', handleUpdate);
        $data.on('redisplay', handleRedisplay);
        $data.on('dragZoom', handleDragZoom);
    };


    var handleSetup = function (evt) {
        console.debug("STUB: handleSetup");
        var data = this;
    };

    var handleUpdate = function (evt) {
        console.debug("STUB: handleUpdate");
        var data = this;
    };

    var handleRedisplay = function (evt) {
        console.debug("STUB: handleRedisplay");
        var data = this;
    };

    var handleDragZoom = function (evt, zoomArea) {
        console.debug("STUB: handleDragZoom");
        var data = this;
    };

    // plugin object, containing name, install and init routines 
    // all shared objects are filled by digilib on registration
    var plugin = {
            name : 'STUB',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.pluginstub.js must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
