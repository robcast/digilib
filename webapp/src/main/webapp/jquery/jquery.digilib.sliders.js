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

    var sliders = {
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
            if ($panel == null) {
                return;
                };
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
            if ($panel == null) {
                return;
                };
            var opts = { 'start' : parseFloat(data.settings.brgt) };
            var $slider = fn.setupSlider(data, 'brgt', opts);
            var ok = function(d) {
                var brgt = $slider.slider('getval');
                digilib.actions.brightness(d, brgt);
                };
            $panel.data['ok'] = ok;
            $panel.fadeIn();
            $panel.prepend($slider);
            fn.centerOnScreen(data, $panel);
            $slider.slider('show');
        },

        // slider to set a contrast value
        sliderContrast : function (data) {
            var $elem = data.$elem;
            var $panel = fn.setupPanel(data);
            if ($panel == null) {
                return;
                };
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
        }
    };

    var init_ = function (options) {
        // make a slider from each element
        return this.each(function() {
            var $this = $(this);
            // var settings = data.settings;
            var settings = $.extend( defaults, options);
            console.debug('new slider: ', $this, ' settings:', settings);
            $this.data('digilib', digilibdata);
            var data = $this.data('settings');
            if (!data) {
                settings.cssclass = digilibdata.cssPrefix+'slider';
                $this.data('settings', settings);
                $this.addClass(settings.cssclass);
                var $handle = $('<div class="'+settings.cssclass+'handle" />');
                var $label = $('<div class="'+settings.cssclass+'label">'
                    +settings.label+': '+settings.start+'</div>');
                var $min = $('<div class="'+settings.cssclass+'number">'+settings.min+'</div>');
                var $max = $('<div class="'+settings.cssclass+'number">'+settings.max+'</div>');
                $this.append($handle);
                $this.append($label);
                $this.append($min);
                $this.append($max);
                $.extend(settings, {
                    '$handle' : $handle,
                    '$label' : $label,
                    '$min' : $min,
                    '$max' : $max,
                    'diff' : settings.max - settings.min,
                    'vertical' : settings.direction == 'y',
                    'val' : settings.start,
                    'handlerect' : geom.rectangle(0, 0, settings.handlesize, settings.handlesize)
                    });
                }
            });
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
            console.log('could not attach slider action ' + action 
                + ', button ' + buttonName + ' not available' );
            return;
            }
        button.onclick = action;
    };

    // set standard button actions (rotate, brightness, contrast) to slider
    var setButtonActions = function (buttons) {
        console.debug('sliders: setting button acions. digilib:', digilib);
        setButtonAction(buttons, 'rot', 'sliderRotate');
        setButtonAction(buttons, 'brgt', 'sliderBrightness');
        setButtonAction(buttons, 'cont', 'sliderContrast');
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
        // install event handler
        $data.bind('setup', handleSetup);
    };

    var handleSetup = function (evt) {
        console.debug("sliders: handleSetup");
        var data = this;
        var settings = data.settings;
    };


    /** creates the HTML structure for a panel div
     */
    var setupPanel = function (data) {
        var $elem = data.$elem;
        var panelClass = data.settings.cssPrefix + 'panel';
        var $panel = $elem.find('.' + panelClass);
        // remove panel if it exists already
        if ($panel.length > 0) {
            $panel.fadeOut(function() {
                $panel.remove();
                });
            return null;
            }
        $panel = $('<div/>');
        $panel.addClass(panelClass);
        var $okcancel = setupOkCancel(data);
        $panel.append($okcancel);
        $elem.append($panel);
        return $panel;
    };

    /** creates the HTML structure for a slider div
     */
    var setupSlider = function (data, paramname, opts) {
        var id = "slider-" + paramname;
        var $div = $('#' + id);
        if ($div.length == 0) {
            // slider not yet created
            $div = $('<div/>');
            var options = sliders[paramname];
            if (opts != null) {
                $.extend(options, opts);
                }
            $div.attr('id', id);
            // $div.slider(options);
            }
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
