/**
digilib sliders plugin
 */
// TODO:
// - steps
// - additional input element for numeric value

(function($) {
    // plugin object with digilib data
    var digilib = null;
    // the functions made available by digilib
    var fn = null;
    // affine geometry plugin
    var geom = null;

    var defaults = {
        'label' : 'Slider',
        'direction' : 'x',
        'handlesize' : 16,
        'min' : 0,
        'max' : 100,
        'start' : 33,
        'numberoffset' : -24,
        'labeloffset' : 16,
        'rect' : null,
        'factor' : null,
        'onmove' : null // callback function
        };

    var sliderOptions = {
        rot : {
            label : "Rotation angle",
            tooltip : "rotate image",
            icon : "rotate.png",
            'min' : 0,
            'max' : 360,
            'start' : 90
            },
        brgt : {
            label : "Brightness",
            tooltip : "set numeric value to be added",
            icon : "brightness.png",
            'min' : -255,
            'max' : 255,
            'start' : 0
            },
        cont : {
            label : "Contrast",
            tooltip : "set numeric value to be multiplied",
            icon : "contrast.png",
            'min' : -4,
            'max' : 4,
            'start' : 0
        },
        red : {
            label : "Red value",
            tooltip : "set red value",
            icon : "rgb.png",
            'min' : 0,
            'max' : 255,
            'start' : 127
            },

        green : {
            label : "Green value",
            tooltip : "set green value",
            icon : "rgb.png",
            'min' : 0,
            'max' : 255,
            'start' : 127
            },

        blue : {
            label : "Blue value",
            tooltip : "set blue value",
            icon : "rgb.png",
            'min' : 0,
            'max' : 255,
            'start' : 127
            },
    };

    var actions = {
        // slider to set a rotation angle
        sliderRotate : function (data) {
            var $elem = data.$elem;
            var $panel = fn.setupPanel(data);
            var opts = { 'start' : parseFloat(data.settings.rot) };
            var $slider = fn.setupSlider(data, 'rot', opts);
            var ok = function(d) {
                var angle = $slider.slider('getval');
                digilib.actions.rotate(d, angle);
                };
            $panel.data['ok'] = ok;
            $panel.fadeIn();
            $panel.prepend($slider);
            fn.centerOnScreen(data, $panel);
            $slider.slider('show');
        },

        // slider to set a brightness value
        sliderBrightness : function (data) {
            var $elem = data.$elem;
            var $panel = fn.setupPanel(data);
            var opts = { 'start' : parseFloat(data.settings.brgt) };
            var $slider = fn.setupSlider(data, 'brgt', opts);
            var ok = function(d) {
                var brgt = $slider.slider('getval');
                digilib.actions.brightness(d, brgt);
                };
            $panel.data['ok'] = ok;
            $panel.prepend($slider);
            fn.centerOnScreen(data, $panel);
            $slider.slider('show');
        },

        // slider to set a contrast value
        sliderContrast : function (data) {
            var $elem = data.$elem;
            var $panel = fn.setupPanel(data);
            var opts = { 'start' : parseFloat(data.settings.cont) };
            var $slider = fn.setupSlider(data, 'cont', opts);
            var ok = function(d) {
                var cont = $slider.slider('getval');
                digilib.actions.contrast(d, cont, true);
                };
            $panel.data['ok'] = ok;
            $panel.fadeIn();
            $panel.prepend($slider);
            fn.centerOnScreen(data, $panel);
            $slider.slider('show');
        },

        // shows brightness slider
        tinySliderBrgt : function (data) {
            var callback = function(val) {
                digilib.actions.brightness(data, val);
                };
            setupTinyRangeSlider(data, 'brgt', callback);
        },

        // shows contrast slider
        tinySliderCont : function (data) {
            var callback = function(val) {
                digilib.actions.contrast(data, val, true);
                };
            setupTinyRangeSlider(data, 'cont', callback);
        },

        // shows rotate slider
        tinySliderRot : function (data) {
            var callback = function(val) {
                digilib.actions.rotate(data, val);
                };
            setupTinyRangeSlider(data, 'rot', callback);
        }
    };

    var getval = function (data) {
        // returns the slider value
        var $this = this;
        var settings = $this.data('settings');
        return settings.val;
    };

    var setval = function (data, val) {
        // sets the slider value and moves the handle acordingly
        var $this = this;
        var settings = $this.data('settings');
        if (val != null) settings.val = val;
        var ratio = (settings.val - settings.min) / settings.diff;
        var r = settings.rect;
        var newpos = settings.vertical
            ? geom.position(r.x + r.width / 2, r.y + ratio * r.height)
            : geom.position(r.x + ratio * r.width, r.y + r.height / 2);
        $this.slider('moveto', newpos);
    };

    var moveto = function (data, pos, calc) {
        // move the handle in response to a mouse position
        var $this = this;
        var settings = $this.data('settings');
        var r = settings.rect;
        var h = settings.handlerect;
        var handlepos = r.getCenter();
        if (settings.vertical) {
            handlepos.y = Math.min(Math.max(r.y, pos.y), r.y + r.height)
        } else {
            handlepos.x = Math.min(Math.max(r.x, pos.x), r.x + r.width)
            }
        h.setCenter(handlepos);
        h.adjustDiv(settings.$handle);
        if (calc) {
            // calculate new slider value
            var temp = settings.vertical
                ? (handlepos.y - r.y)
                : (handlepos.x - r.x);
            settings.val = fn.cropFloat(temp * settings.factor + settings.min);
            }
        if (settings.onmove) {
            settings.onmove($this);
            }
    };

    var show = function (data) {
        var $this = this;
        $this.fadeIn();
        var settings = $this.data('settings');
        // the jquery elements we need
        var $body = $('body');
        // some variables for easier calculation
        var label = settings.label + ': ';
        // calculate positions for the slider elements
        var r = geom.rectangle($this);
        settings.rect = r;
        var v = settings.vertical;
        settings.factor = v
            ? settings.diff / r.height
            : settings.diff / r.width;
        var labelpos = geom.position(r.x, r.y + settings.labeloffset);
        var minpos = v
            ? geom.position(r.x + settings.numberoffset, r.y)
            : geom.position(r.x, r.y + settings.numberoffset);
        var maxpos = v
            ? geom.position(r.x + settings.numberoffset, r.y + r.width)
            : geom.position(r.x + r.width - settings.$max.width(), r.y + settings.numberoffset);
        // adjust elements
        labelpos.adjustDiv(settings.$label);
        minpos.adjustDiv(settings.$min);
        maxpos.adjustDiv(settings.$max);
        // set the handle
        $this.slider('setval');

        // mousedown handler: start sliding
        var sliderStart = function (event) {
            $body.on("mousemove.slider", sliderMove);
            $body.on("mouseup.slider", sliderEnd);
            return false;
        };

        // mousemove handler: move slider
        var sliderMove = function (event) {
            var pos = geom.position(event);
            $this.slider('moveto', pos, true);
            settings.$label.text(label + settings.val);
            return false;
        };

        // mouseup handler: end sliding
        var sliderEnd = function (event) {
            $body.off("mousemove.slider");
            $body.off("mouseup.slider");
            return false;
        };

        // bind mousedown handler to sliderhandle
        settings.$handle.on('mousedown.slider', sliderStart);
        console.debug('show slider: ', $this, ' settings:', settings);
    };

    var destroy = function() {
        var $this = this;
        var settings = $this.data('settings');
        var $handle = settings.$handle;
        $handle.off('mousedown.slider');
        $this.fadeOut(function(){
            $this.remove()
            });
    };


    // set standard button "onclick" field to slider action
    var setButtonAction = function(buttons, buttonName, action) {
        var button = buttons[buttonName];
        if (button == null) {
            // normally this means that jquery.digilib.buttons.js was not loaded
            console.log('could not attach slider action ' + action 
                + ', button ' + buttonName + ' not available' );
            return;
            }
        button.onclick = action;
    };

    // set standard button actions (rotate, brightness, contrast) to slider
    var setButtonActions = function (buttons) {
        console.debug('sliders: setting button acions. digilib:', digilib);
        setButtonAction(buttons, 'brgt', 'tinySliderBrgt');
        setButtonAction(buttons, 'cont', 'tinySliderCont');
        setButtonAction(buttons, 'rot', 'tinySliderRot');
    };

    // plugin installation called by digilib on plugin object.
    var install = function (plugin) {
        digilib = plugin;
        console.debug('installing sliders plugin. digilib:', digilib);
        fn = digilib.fn;
        // import geometry classes
        geom = fn.geometry;
        // add defaults, actions, buttons
        $.extend(true, digilib.defaults, defaults); // make deep copy
        $.extend(digilib.actions, actions);
        setButtonActions(digilib.buttons);
        // export functions
        fn.setupSlider = setupSlider;
        fn.setupPanel = setupPanel;
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising sliders plugin. data:', data);
        var settings = data.settings;
        var $data = $(data);
        // we do setup at runtime
        // $data.bind('setup', handleSetup);
    };

    /** creates the HTML structure for a panel div
     */
    var setupPanel = function (data) {
        var $elem = data.$elem;
        var panelClass = data.settings.cssPrefix + 'panel';
        var $panel = $elem.find('.' + panelClass);
        if ($panel.length == 0) {
            // new panel
            $panel = $('<div/>');
            $panel.addClass(panelClass);
            $elem.append($panel);
            $panel.fadeIn();
        } else {
            // panel exists, so empty it
            $panel.empty();
        }
        var $okcancel = setupOkCancel(data);
        $panel.append($okcancel);
        return $panel;
    };

    /** creates the HTML structure for a slider div
     */
    var setupSlider = function (data, paramname, opts) {
        var id = "slider-" + paramname;
        var $div = $('#' + id);
        if ($div.length > 0) {
            return $div;
            }
        // slider not yet created
        var cssClass = data.cssPrefix+'slider';
        var html = '\
            <div id="'+id+' class="'+cssClass+'">\
                <div class="'+cssClass+'handle"/>\
                <div class="'+cssClass+'number">'+options.min+'</div>\
                <div class="'+cssClass+'number">'+options.max+'</div>\
                <div class="'+cssClass+'label">\
                    <span>'+options.label+'</span>\
                    <input class="'+cssClass+'input">'+options.start+'</input>\
                </div>\
            </div>';
        var $div = $(html);
        var $handle = $div.find('div.'+cssClass+'handle');
        var $label = $div.find('div.'+cssClass+'label');
        var $input = $div.find('div.'+cssClass+'input');
        var $numbers = $div.find('div.'+cssClass+'number');
        var $min = $numbers[0];
        var $max = $numbers[1];
        var options = defaults;
        $.extend(options, sliderOptions[paramname], opts);
        $.extend(options, {
            '$handle' : $handle,
            '$label' : $label,
            '$input' : $input,
            '$min' : $min,
            '$max' : $max,
            'diff' : options.max - options.min,
            'vertical' : options.direction == 'y',
            'val' : options.start,
            'handlerect' : geom.rectangle(0, 0, options.handlesize, options.handlesize)
            });
        $div.data(options);
        console.debug('new slider: ', $div, ', options: ', options);
        return $div;
    };

    /** creates the HTML structure for a ok and cancel div
     */
    var setupOkCancel = function (data) {
        var settings = data.settings;
        var cssPrefix = settings.cssPrefix;
        var html = '\
            <div>\
                <button class="'+cssPrefix+'button" id="'+cssPrefix+'Ok">OK</button>\
                <button class="'+cssPrefix+'button" id="'+cssPrefix+'Cancel">Cancel</button>\
            </div>';
        var $div = $(html);
        var handler = function(event) {
            var $panel = $(this).parents('.'+cssPrefix+'panel');
            if (event.keyCode == 27 || event.target.id == cssPrefix+'Cancel') {
                var callback = $panel.data['cancel'];
                if (callback) {
                    callback(data);
                    }
                }
            if (event.keyCode == 13 || event.target.id == cssPrefix+'Ok') {
                var callback = $panel.data['ok'];
                if (callback) {
                    callback(data);
                    }
                }
            $panel.fadeOut(function() {
                $panel.remove();
                });
            return false;
            };
        $div.children().on('click', handler);
        return $div;
    };

    /** creates a TinyRangeSlider
     */
    var setupTinyRangeSlider = function (data, paramname, callback) {
        var $elem = data.$elem;
        var opts = sliderOptions[paramname];
        var param = data.settings[paramname] || opts.start;
        var cssPrefix = data.settings.cssPrefix;
        var cssClass = cssPrefix + 'tinyslider';
        var sliderHtml = '\
            <div class="'+cssClass+'" style="width:300px; background-color:white; padding:10px;" title="'+opts.tooltip+'">\
                <form class="'+cssClass+'">\
                    <span>'+opts.label+'</span>\
                    <input type="range" class="'+cssClass+'range" name="'+paramname+'" min="'+opts.min+'" max="'+opts.max+'" value="'+param+'"/>\
                    <input type="text" class="'+cssClass+'text" name="'+paramname+'" size="3" value="'+param+'"/>\
                    <br/>\
                    <input class="'+cssClass+'cancel" type="button" value="Cancel"/><input type="submit" name="sub" value="Ok"/>\
                </form>\
            </div>';
        var $slider = $(sliderHtml);
        $elem.append($slider);
        var $range = $slider.find('input.'+cssClass+'range');
        var $text = $slider.find('input.'+cssClass+'text');
        // fix non-HTML5 slider
        var HTML5 = $range.prop('type') === 'range';
        if (!HTML5) {
            console.debug('fix input type=range');
            $range.range({change: function (val) {
                $range.trigger('change');
            }});
        }
        // connect slider and input
        $range.on('change', function () {
            // TinyRange rounds to integer values, not always desired
            var val = $range.val();
            $text.val(val);
        });
        $text.on('change', function () {
            var val = $text.val();
            $range.val(val);
            // val() doesn't update handle, but set changes value :-/
            // $range.range('set', val);
        });
        // handle submit
        $slider.find('form').on('submit', function () {
            console.debug("brgt-form:", this, " sub=", this.sub);
            callback($text.val());
            // digilib.actions.brightness(data, brgt);
            $slider.remove();
            return false;
        });
        // handle cancel
        $slider.find('.'+cssClass+'cancel').on('click', function () {
            $slider.remove();
        });
        $slider.fadeIn();
        fn.centerOnScreen(data, $slider);
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
        name : 'sliders',
        install : install,
        init : init,
        buttons : {},
        actions : {},
        fn : {},
        plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.sliders must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
