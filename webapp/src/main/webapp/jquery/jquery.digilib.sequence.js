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
    var fn;

    var FULL_AREA;

    var buttons = {
            seq : {
                onclick : ["doSequence", 1],
                tooltip : "what does this button do?",
                icon : "seq.png"
                }
    };

    var defaults = {
            // array of images to show sequentially
            'imageSequence' : null,
            // optional prefix for image file names
            'imageSequenceBase' : null,
            // contains the HTML to be shown as caption
            'imageSequenceCaption' : null,
            // show captions for sequential images?
            'imageSequenceShowCaptions' : false
    };

    var hasSequence = function(settings) {
        return settings.imageSequence != null;
    };

    var actions = {
         // replaces digilib.fn.gotoPage (monkey patch)
        gotoPage : function (data, pageNr) {
            var settings = data.settings;
            var currentPn = settings.pn;
            if (hasSequence(settings)) {
                settings.pt = settings.imageSequence.length;
                }
            if (pageNr == null) {
                pageNr = window.prompt("Goto image at index", currentPn);
                }
            if (pageNr == '-0') {
                pageNr = settings.pt;
                }
            var pn = fn.setNumValue(settings, "pn", pageNr);
            if (pn == null) return false; // nothing happened
            if (pn < 1) {
                alert("no such image (index number too low)");
                settings.pn = currentPn;
                return false;
                }
            // set fn and pn parameters
            if (settings.pt != null) {
                if (pn > settings.pt) {
                    alert("no such image (index number too high)");
                    settings.pn = currentPn;
                    return false;
                    }
                settings.pn = pn;
                setSequenceFn(settings);
                }
            // reset mk and others(?)
            data.marks = [];
            data.zoomArea = FULL_AREA.copy();
            // then reload
            fn.redisplay(data);
            }
    };

    // set the fn parameter for the current page index number
    var setSequenceFn = function(settings) {
        var pn = settings.pn;
        if (hasSequence(settings)) {
             settings.fn = settings.imageSequenceBase == null
                  ? settings.imageSequence[pn-1].fn
                  : settings.imageSequenceBase + '/' + settings.imageSequence[pn-1].fn;
             }
        return settings.fn
    };

    // plugin installation routine, called by digilib on each plugin object.
    var install = function(plugin) {
        digilib = plugin;
        fn = plugin.fn;
        console.debug('installing sequence plugin. digilib:', digilib);
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
        console.debug('initialising sequence plugin. data:', data);
        var $data = $(data);
        // monkey patch for the original action in jquery.digilib.js
        digilib.fn.gotoPage = actions.gotoPage;
        // install event handlers
        $data.bind('unpack', handleUnpack);
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
        $data.bind('redisplay', handleRedisplay);
        $data.bind('dragZoom', handleDragZoom);
    };

    // set parameters for the first image to show
    var handleUnpack = function (evt) {
        var data = this;
        var settings = data.settings;
        if (settings.pn == null) {
            settings.pn = '1';
            }
        setSequenceFn(settings);
        // console.warn("fn", settings.fn, "pn", settings.pn);
        settings.suppressParamNames = ['pt', 'fn'];
    };

    var handleSetup = function (evt) {
        console.debug("sequence: handleSetup");
        var data = this;
    };

    var handleUpdate = function (evt) {
        console.debug("sequence: handleUpdate");
        var data = this;
    };

    var handleRedisplay = function (evt) {
        var data = this;
        var settings = data.settings;
        // console.warn("fn", settings.fn, "pn", settings.pn);
    };

    var handleDragZoom = function (evt, zoomArea) {
        var data = this;
    };

    // plugin object, containing name, install and init routines
    // all shared objects are filled by digilib on registration
    var plugin = {
            name : 'sequence',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.sequence.js must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
