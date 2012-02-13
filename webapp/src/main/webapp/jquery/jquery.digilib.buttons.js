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
        help : {
            onclick : "showAboutDiv",
            tooltip : "about Digilib",
            icon : "help.png"
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
            onclick : ["slider", "rot"],
            tooltip : "rotate image",
            icon : "rotate.png"
            },
        brgt : {
            onclick : "brightness",
            //onclick : ["slider", "brgt"],
            tooltip : "set brightness",
            icon : "brightness.png"
            },
        cont : {
            onclick : "contrast",
            //onclick : ["slider", "cont"],
            tooltip : "set contrast",
            icon : "contrast.png"
            },
        rgb : {
            onclick : "javascript:setParamWin('rgb', '...')",
            //onclick : ["multislider", "rgb"],
            tooltip : "set rgb values",
            icon : "rgb.png"
            },
        quality : {
            onclick : "setQuality",
            tooltip : "set image quality",
            icon : "quality.png"
            },
        size : {
            onclick : "javascript:toggleSizeMenu()",
            tooltip : "set page size",
            icon : "size.png"
            },
        calibrationx : {
            onclick : "showCalibrationDiv",
            tooltip : "calibrate screen resolution",
            icon : "calibration-x.png"
            },
        scale : {
            onclick : "showScaleModeSelector",
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
            icon : "options.png"
            },
        lessoptions : {
            onclick : ["moreButtons", "-1"],
            tooltip : "less options",
            icon : "options.png"
            },
        SEP : {
            icon : "sep.png"
            }
        };

    var sliders = {
        rot : {
            label : "Rotation angle",
            tooltip : "rotate image",
            icon : "rotate.png",
            'min' : 0,
            'max' : 360,
            'val' : 90
            },
        brgt : {
            label : "Brightness: Value to add",
            tooltip : "set brightness",
            icon : "brightness.png",
            'min' : -255,
            'max' : 255,
            'val' : 0
            },
        cont : {
            label : "Contrast: Value to multiply",
            tooltip : "set contrast",
            icon : "contrast.png",
            'min' : -8,
            'max' : 8,
            'val' : 0
        },
        red : {
            label : "Red value",
            tooltip : "set red value",
            icon : "rgb.png",
            'min' : 0,
            'max' : 255,
            'val' : 127
            },

        green : {
            label : "Green value",
            tooltip : "set green value",
            icon : "rgb.png",
            'min' : 0,
            'max' : 255,
            'val' : 127
            },

        blue : {
            label : "Blue value",
            tooltip : "set blue value",
            icon : "rgb.png",
            'min' : 0,
            'max' : 255,
            'val' : 127
            },
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
        // defaults for digilib buttons
        'buttonSettings' : {
            'fullscreen' : {
                // path to button images (must end with a slash)
                'imagePath' : 'img/fullscreen/',
                'buttonSetWidth' : 36,
                'standardSet' : ["reference","zoomin","zoomout","zoomarea","zoomfull","pagewidth","back","fwd","page","help","reset","toggleoptions"],
                'specialSet' : ["mark","delmark","hmir","vmir","rot","brgt","cont","rgb","quality","size","calibrationx","scale","lessoptions"],
                'buttonSets' : ['standardSet', 'specialSet']
                },
            'embedded' : {
                'imagePath' : 'img/embedded/16/',
                'buttonSetWidth' : 18,
                'standardSet' : ["reference","zoomin","zoomout","zoomarea","zoomfull","help","reset","toggleoptions"],
                'specialSet' : ["mark","delmark","hmir","vmir","rot","brgt","cont","rgb","quality","scale","lessoptions"],
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
            },
            // single slider control for parameters
            slider : function (data, paramname) {
                var $elem = data.$elem;
                var $div = $('<div/>');
                var options = sliders[paramname];
                console.debug ('Creating slider', $div, options);
                $div.attr('id', paramname + "-slider");
                $div.slider(options);
                $elem.append($div);
                centerOnScreen(data, $div);
                $div.slider('show');
            },
            // shows Calibration Div
            showCalibrationDiv : function (data) {
                var $elem = data.$elem;
                var cssPrefix = data.settings.cssPrefix;
                var $calDiv = $elem.find('.'+cssPrefix+'calibration');
                var $input = $elem.find('.'+cssPrefix+'calibration-input');
                $calDiv.fadeIn();
                $input.focus();
            },

            // shows ScaleModeSelector
            showScaleModeSelector : function (data) {
                var $elem = data.$elem;
                var cssPrefix = data.settings.cssPrefix;
                var $div = $elem.find('div#'+cssPrefix+'scalemode');
                if ($div.is(':visible')) {
                    $div.fadeOut();
                    return;
                    }
                // select current mode
                var mode = data.scaleMode;
                $div.find('option').each(function () {
                	$(this).prop('selected', $(this).attr('name') == mode);
                });
                var $button = $elem.find('div.'+cssPrefix+'button-scale');
                var buttonRect = geom.rectangle($button);
                $('body').on("click.scalemode", function(event) {
                        $div.fadeOut();
                        });
                $div.fadeIn();
                var divRect = geom.rectangle($div);
                $div.offset({
                    left : Math.abs(buttonRect.x - divRect.width - 4),
                    top : buttonRect.y + 4
                    });
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
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising buttons plugin. data:', data);
        // add insets
        data.currentInsets['buttons'] = getInsets(data);
        // install event handler
        var $data = $(data);
        $data.bind('setup', handleSetup);
        sliderPlugin(jQuery, data);
    };

    var handleSetup = function (evt) {
        console.debug("buttons: handleSetup");
        var data = this;
        var settings = data.settings;
        // create buttons before scaler 
        for (var i = 0; i < settings.visibleButtonSets; ++i) {
            showButtons(data, true, i);
        }
        // create ScaleMode selector;
        setupScaleModeDiv(data);
        // create Calibration div;
        setupCalibrationDiv(data);
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

    var centerOnScreen = function (data, $div) {
        var r = geom.rectangle($div);
        var s = fn.getFullscreenRect(data);
        r.setCenter(s.getCenter());
        r.adjustDiv($div);
    };

    // slider
    var sliderPlugin = function($, digilibdata) {
        var cssPrefix = digilibdata.settings.cssPrefix;
        var defaults = {
            'id' : 'slider',
            'class' : cssPrefix+'slider',
            'label' : 'Slider',
            'direction' : 'x',
            'handlesize' : 16,
            'min' : 0,
            'max' : 100,
            'val' : 33
            };
        var methods = {
            init : function( options ) {
                // make a slider from each element
                return this.each(function() {
                    var $this = $(this);
                    // var settings = data.settings;
                    var settings = $.extend( defaults, options);
                    console.debug('New slider instance: ', $this, ' data:', settings);
                    $this.data('digilib', digilibdata);
                    var data = $this.data('settings');
                    if (!data) {
                        $this.data('settings', settings);
                        $this.addClass(settings.class);
                        var $sliderhandle = $('<div class="'+settings.class+'handle" />');
                        settings.$handle = $sliderhandle;
                        $this.append($sliderhandle);
                        }
                });
            },
            setval : function(data, val) {
                settings.val =
                    val < settings.min ? settings.min :
                    val > settings.max() ? settings.max :
                    val;
            },
            setpos : function() {
                var $this = this;
                var settings = $this.data('settings');
                var $sliderhandle = settings.$handle;
                var delta = settings.val / Math.abs(settings.max - settings.min);
                var r = geom.rectangle($this);
                var s = geom.rectangle(0, 0, settings.handlesize, settings.handlesize);
                var newpos;
                if (settings.direction == 'y') {
                    // s.width = r.width;
                    newpos = geom.position(r.x + r.width / 2, r.y + delta * r.height);
                    }
                else {
                    // s.height = r.height;
                    newpos = geom.position(r.x + delta * r.width, r.y + r.height / 2);
                    }
                s.setCenter(newpos).adjustDiv($sliderhandle);
                return $this;
            },
            getval : function(data) {
                var $this = this;
                var settings = $this.data('settings');
            },
            show : function(data) {
                var $this = this;
                var settings = $this.data('settings');
                var $sliderhandle = settings.$handle;
                var $body = $('body');
                $this.fadeIn();
                $this.slider('setpos');
                var r = geom.rectangle($this);
                var pt;

                // mousedown handler: start sliding
                var sliderStart = function (event) {
                    // overlay prevents other elements from reacting to mouse events 
                    // var $overlay = $('<div class="digilib-overlay" style="position:absolute"/>');
                    $body.on("mousemove.slider", sliderMove);
                    $body.on("mouseup.slider", sliderEnd);
                    return false;
                };

                // mousemove handler: move slider
                var sliderMove = function (event) {
                    pt = geom.position(event);
                    var s = geom.rectangle($sliderhandle);
                    var c = s.getCenter();
                    var newpos;
                    if (settings.direction == 'y') {
                        newpos = geom.position(c.x, Math.min(Math.max(r.y, pt.y), r.y + r.height));
                        }
                    else {
                        newpos = geom.position(Math.min(Math.max(r.x, pt.x), r.x + r.width), c.y);
                        }
                    s.setCenter(newpos).adjustDiv($sliderhandle);
                    return false;
                };

                // mouseup handler: end sliding
                var sliderEnd = function (event) {
                    pt = geom.position(event);
                    $body.off("mousemove.slider");
                    $body.off("mouseup.slider");
                    // $this.slider('getval');
                    // $this.slider('destroy');
                    // settings.callback(settings.val);
                    fn.redisplay(data);
                    return false;
                };

            // bind start handler
            $body.one('mousedown.slider', sliderStart);
            },
            destroy : function( ) {
                var $this = this;
                var settings = $this.data('settings');
                $this.fadeOut(function(){
                    $this.remove()
                    });
            }
        };
        // TODO:
        // - take start value from a given param
        // - set the param after sliding
        // - show min/max/current values on slider
        $.fn.slider = function( method ) {
            if ( methods[method] ) {
                // call a method
                var $elem = $(this);
                var data = $elem.data('digilib');
                var args = Array.prototype.slice.call(arguments, 1);
                args.unshift(data);
                return methods[method].apply(this, args);
                }
            else if ( !method || typeof method === 'object' ) {
                // call init(), with an optional object containing options
                return methods.init.apply( this, arguments );
                }
            else {
                $.error( 'Method ' +  method + ' does not exist on digilib.handles.slider!' );
                }
        };
    };

    /** creates HTML structure for the calibration div
     */
    var setupCalibrationDiv = function (data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var cssPrefix = settings.cssPrefix;
        var html = '\
            <div id="'+cssPrefix+'calibration" class="'+cssPrefix+'calibration">\
                <div class="'+cssPrefix+'ruler">\
                    <div class="'+cssPrefix+'cm">Please enter the length of this scale on your screen</div>\
                    <div>\
                        <input id="'+cssPrefix+'calibration-input" size="5"/> cm\
                        <button class="'+cssPrefix+'calibration-button" id="'+cssPrefix+'calibrationOk">OK</button>\
                        <button class="'+cssPrefix+'calibration-button" id="'+cssPrefix+'calibrationCancel">Cancel</button>\
                    </div>\
                    <div class="'+cssPrefix+'calibration-error">Please enter a numeric value like this: 12.3</div>\
                </div>\
            </div>';
        var $calDiv = $(html);
        $elem.append($calDiv);
        var $input = $calDiv.find('input');
        var $ok = $calDiv.find('#'+cssPrefix+'calibrationOk');
        var $cancel = $calDiv.find("#calibrationCancel");
        data.calibrationDiv = $calDiv;
        data.calibrationErrorDiv = $calDiv.find('div.'+cssPrefix+'calibration-error');
        data.calibrationInput = $input;
        centerOnScreen(data, $calDiv);
        var handler = function(event) {
            var _data = data;
            if (event.keyCode == 27 || event.target.id == cssPrefix+'calibrationCancel') {
                $calDiv.fadeOut();
                return false;
                }
            if (event.keyCode == 13 || event.target.id == cssPrefix+'calibrationOk') {
                changeCalibration(_data);
                return false;
                }
            _data.calibrationInput.removeClass(cssPrefix+'error');
            };
        $ok.on("click", handler);
        $cancel.on("click", handler);
        $input.on("keypress", handler);
    };

    /** creates HTML structure for the scale mode menu
     */
    var setupScaleModeDiv = function (data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var cssPrefix = settings.cssPrefix;
        var currentMode = digilib.fn.getScaleMode(data);
        var $scaleModeDiv = $('<div id="'+cssPrefix+'scalemode" style="display:none; z-index:9999; position:absolute"/>');
        data.scaleModeDiv = $scaleModeDiv;
        var $scaleModeSelect = $('<select class="'+cssPrefix+'scalemode" />');
        $elem.append($scaleModeDiv);
        $scaleModeDiv.append($scaleModeSelect);
        for (var i = 0; i < modes.length; i++) {
            var mode = modes[i];
            var selected = (mode.name == currentMode) ? ' selected="selected"' : '';
            $scaleModeSelect.append($('<option name="'
                    + mode.name + '"' + selected + '>' 
                    + mode.label + '</option>'));
        }
        $scaleModeDiv.on("click.scalemode", function(event) {
            return false;
            });
        $scaleModeSelect.on('change.scalemode', function(event) {
            var d = data;
            changeMode(event, d);
            });
    };

    /** event handler
     */
    var changeMode = function (event, data) {
        var $select = $(event.target);
        var newMode = $select.find("option:selected").attr("name");
        console.debug('setting mode to:', newMode);
        var $div = data.scaleModeDiv;
        $('body').off("click.scalemode");
        $div.fadeOut();
        digilib.actions.setScaleMode(data, newMode);
    };

    /** event handler
     */
    var changeCalibration = function (data) {
        var $calDiv = data.calibrationDiv;
        var $input = data.calibrationInput;
        var cm = $input.val();
        var w = $calDiv.width();
  		var dpi = fn.cropFloat(w / parseFloat(cm) * 2.54);
  		console.debug('width', w, 'cm', cm, 'input dpi:', dpi);
  		if(!fn.isNumber(dpi)) {
  		    $input.addClass(data.settings.cssPrefix+'error');
  		    return;
  		    }
  		digilib.actions.calibrate(data, dpi);
        $calDiv.fadeOut();
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
        if (imagePath.charAt(0) !== '/' && imagePath.substring(0,3) !== 'http') {
        	imagePath = settings.digilibBaseUrl + '/jquery/' + imagePath;
        }
        var buttonConfig = settings.buttons[buttonName];
        // button properties
        var action = buttonConfig.onclick;
        var tooltip = buttonConfig.tooltip;
        var icon = imagePath + buttonConfig.icon;
        // construct the button html
        var $button = $('<div class="'+cssPrefix+'button"></div>');
        var $a = $('<a href=""/>');
        var $img = $('<img class="'+cssPrefix+'button"/>');
        $div.append($button);
        $button.append($a);
        $a.append($img);
        // add attributes and bindings
        $button.attr('title', tooltip);
        $button.addClass(cssPrefix+'button-'+buttonName);
        $img.attr('src', icon);
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
            createButton(data, $buttonsDiv, buttonName);
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
            var $button = $buttons.find('div.'+cssPrefix+'button-' + name);
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
        highlight('help', settings.isAboutDivVisible);
        highlight('hmir', flags.hmir);
        highlight('vmir', flags.vmir);
        highlight('quality', flags.q1 || flags.q2);
        highlight('zoomin', ! isFullArea(data.zoomArea));
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
