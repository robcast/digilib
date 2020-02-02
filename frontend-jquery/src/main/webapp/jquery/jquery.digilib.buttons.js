/*
 * #%L
 * digilib buttons plugin
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
digilib buttons plugin
 */

(function($) {

    // plugin object with digilib data
    var digilib = null;
    // the functions made available by digilib
    var fn = null;
    // affine geometry plugin
    var geom = null;

    var buttons = {
        reference : {
            onclick : "reference",
            tooltip : "get a reference URL",
            icon : "reference.png"
            },
        zoomin : {
            onclick : ["zoomBy", 1.4],
            tooltip : "zoom in",
            icon : "zoom-in.png"
            },
        zoomout : {
            onclick : ["zoomBy", 0.7],
            tooltip : "zoom out",
            icon : "zoom-out.png"
            },
        zoomarea : {
            onclick : "zoomArea",
            tooltip : "zoom area",
            icon : "zoom-area.png"
            },
        zoomfull : {
            onclick : "zoomFull",
            tooltip : "view the whole image",
            icon : "zoom-full.png"
            },
        pagewidth : {
            onclick : ["zoomFull", "width"],
            tooltip : "page width",
            icon : "pagewidth.png"
            },
        back : {
            onclick : ["gotoPage", "-1"],
            tooltip : "goto previous image",
            icon : "back.png"
            },
        fwd : {
            onclick : ["gotoPage", "+1"],
            tooltip : "goto next image",
            icon : "fwd.png"
            },
        page : {
            onclick : "gotoPage",
            tooltip : "goto image number",
            icon : "page.png"
            },
        about : {
            onclick : "about",
            tooltip : "about Digilib",
            icon : "info.png"
            },
        reset : {
            onclick : "reset",
            tooltip : "reset image",
            icon : "reset.png"
            },
        hmir : {
            onclick : ["mirror", "h"],
            tooltip : "mirror horizontally",
            icon : "mirror-horizontal.png"
            },
        vmir : {
            onclick : ["mirror", "v"],
            tooltip : "mirror vertically",
            icon : "mirror-vertical.png"
            },
        rot : {
            onclick : "rotate",
            tooltip : "rotate image",
            icon : "rotate.png"
            },
        brgt : {
            onclick : "brightness",
            tooltip : "set brightness",
            icon : "brightness.png"
            },
        cont : {
            onclick : "contrast",
            tooltip : "set contrast",
            icon : "contrast.png"
            },
        rgb : {
            onclick : "setRGB",
            tooltip : "set rgb values",
            icon : "rgb.png"
            },
        quality : {
            onclick : "setQuality",
            tooltip : "set image quality",
            icon : "quality.png"
            },
        size : {
            onclick : "setSize",
            tooltip : "set page size",
            icon : "size-bigger.png"
            },
        calibrationx : {
            // onclick : "showCalibrationDiv",
            onclick : "calibrate",
            tooltip : "calibrate screen resolution",
            icon : "calibration.png"
            },
        scale : {
            // onclick : "showScaleModeSelector",
            onclick : "setScaleMode",
            tooltip : "change image scale",
            icon : "original-size.png"
            },
        toggleoptions : {
            onclick : "moreButtons",
            tooltip : "more options",
            icon : "options.png"
            },
        moreoptions : {
            onclick : ["moreButtons", "+1"],
            tooltip : "more options",
            icon : "buttons-more.png"
            },
        lessoptions : {
            onclick : ["moreButtons", "-1"],
            tooltip : "less options",
            icon : "buttons-less.png"
            },
        SEP : {
            icon : "sep.png"
            }
        };

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
        // buttons (reference added later)
        'buttons' : null,
        // disabled buttons (should be an array of button names)
        'buttonsDisabled' : [],
        // show buttons needed for consecutive (book-like) consultation of image files
        'showPageButtons' : true,
        // defaults for digilib buttons
        'buttonSettings' : {
            'fullscreen' : {
                // path to button images (must end with a slash)
                'imagePath' : 'img/fullscreen/32/',
                'buttonSetWidth' : 36,
                'standardSet' : ["reference","zoomin","zoomout","zoomarea","zoomfull","pagewidth","back","fwd","page","about","reset","moreoptions"],
                'specialSet' : ["mark","delmark","hmir","vmir","rot","brgt","cont","rgb","quality","size","calibrationx","scale","lessoptions","moreoptions"],
                'pageSet' : ["back","fwd","page"],
                'buttonSets' : ['standardSet', 'specialSet']
                },
            'embedded' : {
                'imagePath' : 'img/embedded/16/',
                'buttonSetWidth' : 18,
                'standardSet' : ["reference","zoomin","zoomout","zoomarea","zoomfull","about","reset","moreoptions"],
                'specialSet' : ["mark","delmark","hmir","vmir","rot","brgt","cont","rgb","quality","scale","lessoptions"],
                'pageSet' : ["back","fwd","page"],
                'buttonSets' : ['standardSet', 'specialSet']
                }
        },
        // number of visible button groups
        'visibleButtonSets' : 1
    };

    var actions = {
            // display more (or less) button sets
            moreButtons : function (data, more) {
                var settings = data.settings;
                if (more == null) {
                    // toggle more or less (only works for 2 sets)
                    var maxbtns = settings.buttonSettings[settings.interactionMode].buttonSets.length;
                    if (settings.visibleButtonSets >= maxbtns) {
                        more = '-1';
                    } else {
                        more = '+1';
                    }
                }
                if (more === '-1') {
                    // remove set
                    var setIdx = settings.visibleButtonSets - 1;
                    if (showButtons(data, false, setIdx, true)) {
                        settings.visibleButtonSets--;
                    }
                } else {
                    // add set
                    var setIdx = settings.visibleButtonSets;
                    if (showButtons(data, true, setIdx, true)) {
                        settings.visibleButtonSets++;
                    }
                }
                // adjust insets
                data.currentInsets['buttons'] = getInsets(data);
                // persist setting
                fn.storeOptions(data);
            }
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing buttons plugin. digilib:', digilib);
        fn = digilib.fn;
        // import geometry classes
        geom = fn.geometry;
        // add defaults, actions, buttons
        $.extend(digilib.buttons, buttons);
        $.extend(true, digilib.defaults, defaults); // make deep copy
        $.extend(digilib.actions, actions);
        // update buttons reference in defaults
        digilib.defaults.buttons = digilib.buttons;
        // export functions
        fn.createButton = createButton;
        fn.highlightButtons = highlightButtons;
        fn.setButtonAction = setButtonAction;
        fn.findButtonByName = findButtonByName;
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising buttons plugin. data:', data);
        var settings = data.settings;
        // add insets
        data.currentInsets['buttons'] = getInsets(data);
        if (!settings.showPageButtons) {
            var pageSet = settings.buttonSettings[settings.interactionMode].pageSet;
            $.merge(settings.buttonsDisabled, pageSet);
        }
        // install event handler
        var $data = $(data);
        $data.bind('setup', handleSetup);
    };

    var handleSetup = function (evt) {
        console.debug("buttons: handleSetup");
        var data = this;
        var settings = data.settings;
        // create buttons before scaler 
        for (var i = 0; i < settings.visibleButtonSets; ++i) {
            showButtons(data, true, i);
        }
        disableButtons(data);
    };

    /** 
     * returns insets for buttons (based on visibleButtonSets and buttonSetWidth
     */
    var getInsets = function (data) {
        var settings = data.settings;
        var bw = settings.visibleButtonSets * settings.buttonSettings[settings.interactionMode].buttonSetWidth;
        var insets = {'x' : bw, 'y' : 0};
        return insets;
    };

    /**
     *  creates HTML structure for a single button
     */
    var createButton = function (data, $div, buttonName) {
        var $elem = data.$elem;
        var settings = data.settings;
        var cssPrefix = settings.cssPrefix;
        var mode = settings.interactionMode;
        var imagePath = settings.buttonSettings[mode].imagePath;
        // make relative imagePath absolute
        if (imagePath.charAt(0) !== '/' && imagePath.substring(0,7) !== 'http://') {
        	imagePath = settings.digilibBaseUrl + '/jquery/' + imagePath;
        }
        var buttonConfig = settings.buttons[buttonName];
        if (buttonConfig == null) {
            console.error('Could not create button: ' + buttonName);
            return;
            }
        // button properties
        var action = buttonConfig.onclick;
        var tooltip = buttonConfig.tooltip;
        var iconId = buttonConfig.icon.slice(0, -4);
        // construct the button html
        var html = '\
            <div id="'+cssPrefix+'button-'+buttonName+'" class="'+cssPrefix+'button" title="'+tooltip+'">\
                <a href="">\
                    <div id="'+cssPrefix+'button-'+iconId+'-img"></div>\
                </a>\
            </div>';
        var $button = $(html);
        $button.appendTo($div);
        // create handler for the buttons
        $button.on('click.digilib', (function () {
            // we create a new closure to capture the value of action
            if ($.isArray(action)) {
                // the handler function calls digilib with action and parameters
                return function (evt) {
                    console.debug('click action=', action, ' evt=', evt);
                    $elem.digilib.apply($elem, action);
                    return false;
                };
            } else {
                // the handler function calls digilib with action
                return function (evt) {
                    console.debug('click action=', action, ' evt=', evt);
                    $elem.digilib(action);
                    return false;
                };
            }
        })());
        return $button;
    };

    // creates HTML structure for buttons in elem
    var createButtons = function (data, buttonSetIdx) {
        var $elem = data.$elem;
        var settings = data.settings;
        var mode = settings.interactionMode;
        var cssPrefix = settings.cssPrefix;
        var buttonSettings = settings.buttonSettings[mode];
        var buttonGroup = buttonSettings.buttonSets[buttonSetIdx];
        if (buttonGroup == null) {
            // no buttons here
            return;
        }
        // button divs are marked with class "keep"
        var $buttonsDiv = $('<div class="'+cssPrefix+'keep '+cssPrefix+'buttons"/>');
        var buttonNames = buttonSettings[buttonGroup];
        for (var i = 0; i < buttonNames.length; i++) {
            var buttonName = buttonNames[i];
            var $button = createButton(data, $buttonsDiv, buttonName);
            settings.buttons[buttonName].button = $button;
        }
        // make buttons div scroll if too large for window
        if ($buttonsDiv.height() > $(window).height() - 10) {
            $buttonsDiv.css('position', 'absolute');
        }
        // buttons hidden at first
        $buttonsDiv.hide();
        $elem.append($buttonsDiv);
        if (data.$buttonSets == null) {
            // first button set
            data.$buttonSets = [$buttonsDiv];
        } else {
            $elem.append($buttonsDiv);
            data.$buttonSets[buttonSetIdx] = $buttonsDiv;
        }
        return $buttonsDiv;
    };

    // display more (or less) button sets
    var showButtons = function (data, more, setIdx, animated) {
        var atime = animated ? 'fast': 0;
        var cssPrefix = data.settings.cssPrefix;
        // get button width from settings
        var mode = data.settings.interactionMode;
        var btnWidth = data.settings.buttonSettings[mode].buttonSetWidth;
        if (more) {
            // add set
            var $otherSets = data.$elem.find('div.'+cssPrefix+'buttons:visible');
            var $set;
            if (data.$buttonSets && data.$buttonSets[setIdx]) {
                // set exists
                $set = data.$buttonSets[setIdx];
            } else {
                $set = createButtons(data, setIdx);
                }
            if ($set == null) return false;
            // include border in calculation
            //var btnWidth = $set.outerWidth();
            // console.debug("btnWidth", btnWidth);
            // move remaining sets left and show new set
            if ($otherSets.length > 0) {
                    $otherSets.animate({right : '+='+btnWidth+'px'}, atime,
                            function () {$set.show();});
            } else {
                $set.show();
            }
        } else {
            // remove set
            var $set = data.$buttonSets[setIdx];
            if ($set == null) return false;
            //var btnWidth = $set.outerWidth();
            // hide last set
            $set.hide();
            // take remaining sets and move right
            var $otherSets = data.$elem.find('div.'+cssPrefix+'buttons:visible');
            $otherSets.animate({right : '-='+btnWidth+'px'}, atime);
        }
        return true;
    };

    // check for buttons to highlight TODO: improve this!
    var highlightButtons = function (data, name, on) {
        var cssPrefix = data.settings.cssPrefix;
        var $buttons = data.$elem.find('div.'+cssPrefix+'buttons:visible'); // include hidden?
        // add a class for highlighted button
        var highlight = function (name, on) {
            var $button = findButtonByName(data, name);
            if (on) {
                $button.addClass(cssPrefix+'button-on');
            } else {
                $button.removeClass(cssPrefix+'button-on');
            }
        };
        if (name != null) {
            return highlight(name, on);
            }
        var flags = data.scalerFlags;
        var settings = data.settings;
        highlight('rot', settings.rot);
        highlight('brgt', settings.brgt);
        highlight('cont', settings.cont);
        highlight('bird', settings.isBirdDivVisible);
        highlight('hmir', flags.hmir);
        highlight('vmir', flags.vmir);
        highlight('quality', flags.q1 || flags.q2);
        highlight('zoomin', ! isFullArea(data.zoomArea));
        };

    // find a button
    var findButtonByName = function (data, name) {
        var $elem = data.$elem;
        var cssPrefix = data.settings.cssPrefix;
        var $button = $elem.find('#'+cssPrefix+'button-'+name);
        console.debug("find button", name, $button);
        return $button;
    };

    // hide disabled buttons
    var disableButtons = function (data, buttonnames) {
        // if present, buttonnames should be an array of button names
        var $elem = data.$elem;
        var settings = data.settings;
        var cssPrefix = settings.cssPrefix;
        var disabled = buttonnames || settings.buttonsDisabled;
        $.each(disabled, function(index, name) {
            var $button = findButtonByName(data, name);
            $button.addClass(cssPrefix+'disabled');
            });
        console.debug('disabled buttons:', disabled);
    };

    // set standard button "onclick" field to a new action
    var setButtonAction = function(buttonName, action) {
        var button = buttons[buttonName];
        if (button == null) {
            console.log('could not set button action ' + action 
                + ', button ' + buttonName + ' not available' );
            return;
            }
        button.onclick = action;
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
            name : 'buttons',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.buttons must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
