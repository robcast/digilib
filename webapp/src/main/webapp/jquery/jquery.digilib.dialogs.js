/*
 * #%L
 * digilib dialogs plugin
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
 * Authors: Martin Raspe, Robert Casties
 */
/**
digilib dialogs plugin
 */

(function($) {

    // plugin object with digilib data
    var digilib = null;
    // the functions made available by digilib
    var fn = null;
    // affine geometry plugin
    var geom = null;

    var modes = [
        {   name : "screen", 
            label : "fit to screen",
            tooltip : "scales the graphic file so that it fills the screen"
        },
        {   name : "pixel",
            label : "pixel by pixel",
            tooltip : "all pixels of the current part of the graphic file are shown"
        },
        {   name : "size",
            label : "original size",
            tooltip : "tries to display the current part of the graphic file in the size of the orginal resource (after screen calibration)" 
        }
    ];

    var defaults = {
    };

    var actions = {
        // shows Calibration Div
        dialogCalibration : function (data) {
            fn.showCalibrationDialog(data);
        },

        // shows ScaleModeSelector
        dialogScaleMode : function (data) {
            fn.showScaleModeDialog(data);
        }
    };

    /** creates and displays HTML structure for screen calibration
     */
    var showCalibrationDialog = function (data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var cssPrefix = settings.cssPrefix;
        var calibrationSelector = '#'+cssPrefix+'calibration';
        if (fn.isOnScreen(data, calibrationSelector)) return; // already onscreen
        var html = '\
            <div id="'+cssPrefix+'calibration" class="'+cssPrefix+'calibration">\
                <div id="'+cssPrefix+'ruler">\
                    <div id="'+cssPrefix+'cm">Please enter the length of this scale on your screen</div>\
                    <div>\
                        <input id="'+cssPrefix+'calibrationInput" size="5"/> cm\
                        <button class="'+cssPrefix+'button" id="'+cssPrefix+'calibrationOk">OK</button>\
                        <button class="'+cssPrefix+'button" id="'+cssPrefix+'calibrationCancel">Cancel</button>\
                    </div>\
                    <div id="'+cssPrefix+'calibrationError" class="'+cssPrefix+'calibration-error">Please enter a numeric value like this: 12.3</div>\
                </div>\
            </div>';
        $calDiv = $(html);
        $calDiv.appendTo($elem);
        var $input = $calDiv.find('#'+cssPrefix+'calibrationInput');
        var $ok = $calDiv.find('#'+cssPrefix+'calibrationOk');
        var $cancel = $calDiv.find('#'+cssPrefix+'calibrationCancel');
        var $error = $calDiv.find('#'+cssPrefix+'calibrationError');
        var handler = function(event) {
            // var _data = data;
            if (event.keyCode == 27 || event.target.id == cssPrefix+'calibrationCancel') {
                fn.withdraw($calDiv);
                return false;
                }
            if (event.keyCode == 13 || event.target.id == cssPrefix+'calibrationOk') {
                var w = $calDiv.width();
                var cm = $input.val();
                var dpi = fn.cropFloat(w / parseFloat(cm) * 2.54);
                console.debug('width', w, 'cm', cm, 'input dpi:', dpi);
                if (!fn.isNumber(dpi)) {
                    $input.addClass(cssPrefix+'error');
                    $error.fadeIn();
                    return;
                    }
                digilib.actions.calibrate(data, dpi);
                fn.withdraw($calDiv);
                return false;
                }
            $error.fadeOut();
            $input.removeClass(cssPrefix+'error');
            };
        $ok.on("click.dialog", handler);
        $cancel.on("click.dialog", handler);
        $input.on("keypress.dialog", handler);
        $input.on("focus.dialog", handler);
        $calDiv.fadeIn();
        fn.centerOnScreen(data, $calDiv);
        $input.focus();
        return $calDiv;
    };

    /** creates and displays HTML structure for scale mode selection
     */
    var showScaleModeDialog = function (data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var cssPrefix = settings.cssPrefix;
        var scaleModeSelector = '#'+cssPrefix+'scalemode';
        if (fn.isOnScreen(data, scaleModeSelector)) return; // already onscreen
        var html = '\
            <div id="'+cssPrefix+'scalemode" style="display:none; z-index:1000; position:absolute">\
                <select class="'+cssPrefix+'scalemode" />\
            </div>';
        $scaleDiv = $(html);
        $scaleDiv.appendTo($elem);
        var mode = fn.getScaleMode(data);
        var $select = $scaleDiv.find('select');
        for (var i = 0; i < modes.length; i++) {
            var m = modes[i];
            var selected = (m.name == mode) ? ' selected="selected"' : '';
            html = '<option name="'+m.name+'"'+selected+'>'+m.label+'</option>';
            $select.append($(html));
        }
        $select.on('change.scalemode', function(event) {
            var newMode = $select.find("option:selected").attr("name");
            console.debug('setting mode to:', newMode);
            digilib.actions.setScaleMode(data, newMode);
            fn.withdraw($scaleDiv);
            });
        $select.on('blur.scalemode', function(event) {
            fn.withdraw($scaleDiv);
            });
        // position the element next to the scale button
        $scaleDiv.fadeIn();
        $select.focus();
        if (digilib.plugins.buttons == null) {
            fn.centerOnScreen($scaleDiv);
        } else {
            var $button = fn.findButtonByName(data, 'scale');
            var buttonRect = geom.rectangle($button);
            var divRect = geom.rectangle($scaleDiv);
            $scaleDiv.offset({
                left : Math.abs(buttonRect.x - divRect.width - 4),
                top : buttonRect.y + 4
            });
        }
    };

    var setButtonActions = function () {
        if (fn.setButtonAction == null) {
            console.debug('dialogs: could not assign button actions. Maybe jquery.digilib.buttons.js was not loaded?');
            return;
            }
        console.debug('dialogs: assign new button actions. digilib:', digilib);
        fn.setButtonAction('calibrationx', 'dialogCalibration');
        fn.setButtonAction('scale', 'dialogScaleMode');
    };


    // plugin installation called by digilib on plugin object.
    var install = function (plugin) {
        digilib = plugin;
        console.debug('installing dialogs plugin. digilib:', digilib);
        fn = digilib.fn;
        // import geometry classes
        geom = fn.geometry;
        // add defaults, actions, buttons
        $.extend(true, digilib.defaults, defaults); // make deep copy
        $.extend(digilib.actions, actions);
        setButtonActions();
        // export functions
        fn.showCalibrationDialog = showCalibrationDialog;
        fn.showScaleModeDialog = showScaleModeDialog;
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising dialogs plugin. data:', data);
        var $data = $(data);
        $data.bind('setup', handleSetup);
        // create ScaleMode selector;
        // setupScaleModeDiv(data);
        // create Calibration div;
        // setupCalibrationDiv(data);
    };

    var handleSetup = function (evt) {
        console.debug("dialogs: handleSetup");
        var data = this;
        var settings = data.settings;
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
            name : 'dialogs',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.dialogs must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
