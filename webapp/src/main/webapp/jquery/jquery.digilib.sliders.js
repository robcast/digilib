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

    var defaults = {};

    var sliderOptions = {
        rot : {
            label : "Rotation angle",
            tooltip : "rotate image",
            icon : "rotate.png",
            'min' : 0,
            'max' : 360,
            'step' : 0.1,
            'start' : 90
            },
        brgt : {
            label : "Brightness",
            tooltip : "set numeric value to be added",
            icon : "brightness.png",
            'min' : -255,
            'max' : 255,
            'step' : 10,
            'start' : 0
            },
        cont : {
            label : "Contrast",
            tooltip : "set numeric value to be multiplied",
            icon : "contrast.png",
            'min' : -4,
            'max' : 4,
            'step' : 0.01,
            'start' : 0
        }
    };

    var rgb = {
        r : {
            label : "red",
            color : "#800000"
            },
        g : {
            label : "green",
            color : "#008000"
            },
        b : {
            label : "blue",
            color : "#000080"
            }
        }
    var actions = {
        // shows brightness slider
        tinySliderBrgt : function (data) {
            var callback = function(val) {
                digilib.actions.brightness(data, val);
                };
            singleSlider(data, 'brgt', callback);
        },

        // shows contrast slider
        tinySliderCont : function (data) {
            var callback = function(val) {
                digilib.actions.contrast(data, val, true);
                };
            singleSlider(data, 'cont', callback);
        },

        // shows rotate slider
        tinySliderRot : function (data) {
            var callback = function(val) {
                digilib.actions.rotate(data, val);
                };
            singleSlider(data, 'rot', callback);
        },

        // shows RGB sliders
        tinySliderRGB : function (data) {
            var callback = function(m, a) {
                digilib.actions.setRGB(data, m, a);
                };
            rgbSlider(data, callback);
        }
    };

    // assign button actions to sliders (rotate, brightness, contrast) 
    var setButtonActions = function () {
        if (fn.setButtonAction == null) {
            console.debug('sliders: could not assign button actions. Maybe jquery.digilib.buttons.js was not loaded?');
            return;
            }
        console.debug('sliders: assign new button actions. digilib:', digilib);
        fn.setButtonAction('brgt', 'tinySliderBrgt');
        fn.setButtonAction('cont', 'tinySliderCont');
        fn.setButtonAction('rot', 'tinySliderRot');
        // fn.setButtonAction('rgb', 'tinySliderRGB');
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
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising sliders plugin. data:', data);
        // var settings = data.settings;
        // var $data = $(data);
        // we do setup at runtime
        // $data.bind('setup', handleSetup);
    };

    /** creates a div with a form, setup events and callback
     */
    var setupFormDiv = function (data, $content, cssSuffix, callback) {
        var cssPrefix = data.settings.cssPrefix;
        var cls = cssPrefix + cssSuffix;
        var html = '\
            <div class="'+cls+'">\
                <form class="'+cls+'">\
                    <input class="'+cls+'cancel" type="button" value="Cancel"/>\
                    <input type="submit" name="sub" value="Ok"/>\
                </form>\
            </div>';
        var $elem = data.$elem;
        var $div = $(html).appendTo($elem);
        var $form = $div.find('form');
        $form.prepend($content);
        // handle submit
        $form.on('submit', function () {
            callback();
            fn.withdraw($div);
            return false;
        });
        // handle cancel
        $form.find('.'+cls+'cancel').on('click', function () {
            fn.withdraw($div);
        });
        // show div
        $div.fadeIn();
        // fix non-HTML5 slider
        var tiny = cssPrefix + 'tinyslider';
        var $range = $form.find('input.'+tiny+'range');
        var HTML5 = $range.prop('type') === 'range';
        if (!HTML5) {
            console.debug('fix input type=range');
            $range.range({change: function (val) {
                $range.trigger('change');
            }});
        }
        fn.centerOnScreen(data, $div);
        return $div;
    };

    /** creates a TinyRangeSlider
     */
    var tinySlider = function (data, paramname, startval) {
        var $elem = data.$elem;
        var opts = sliderOptions[paramname];
        var param = startval || data.settings[paramname] || opts.start;
        var cssPrefix = data.settings.cssPrefix;
        var cls = cssPrefix + 'tinyslider';
        var html = '\
            <div class="'+cls+'frame">\
                <span>'+opts.label+'</span>\
                <input type="range" class="'+cls+'range" name="'+paramname+'" step="'+opts.step+'" min="'+opts.min+'" max="'+opts.max+'" value="'+param+'"/>\
                <input type="text" class="'+cls+'text" name="'+paramname+'" size="4" value="'+param+'"/>\
            </div>';
        var $slider = $(html);
        var $range = $slider.find('input.'+cls+'range');
        var $text = $slider.find('input.'+cls+'text');
        $slider.data({'$text' : $text, '$range' : $range});
        // connect slider and input
        $range.on('change', function () {
            var val = $range.val();
            $text.val(val);
        });
        $text.on('change', function () {
            var val = $text.val();
            $range.val(val);
            // val doesn't change the slider handle position in Tinyrange
            // can't use a jQuery "valHook" here because input type is reported as "text" (???)
            var HTML5 = $range.prop('type') === 'range';
            if (!HTML5) {
                $range.range('set', val);
            }
        });
        return $slider;
    };

    /** creates a single TinyRangeSlider for param "paramname",
        the new value is passed to the "callback" function.
     */
    var singleSlider = function (data, paramname, callback) {
        var $slider = tinySlider(data, paramname);
        var getValue = function () {
            var val = $slider.data('$text').val();
            callback(val);
            };
        setupFormDiv(data, $slider, 'singleslider', getValue);
    };

    /** creates a compound RGB slider
        the new values are passed to the "callback" function.
     */
    var rgbSlider = function (data, callback) {
        var cls = data.settings.cssPrefix + 'rgbslider';
        var $table = $('<table class="'+cls+'" />');
        var makeSliders = function(index, value) {
            // TODO: set start values
            var $tr = $('<tr/>').appendTo($table);
            var $td = $('<td class="color">'+rgb[value].label+'</td>').appendTo($tr);
            var $td = $('<td class="rgb"/>').append(tinySlider(data, 'brgt')).appendTo($tr);
            var $td = $('<td class="rgb"/>').append(tinySlider(data, 'cont')).appendTo($tr);
            }
        $.each(['r','g','b'], makeSliders);
        var getValue = function () {
            // TODO: get values from sliders
            callback(null, null);
            };
        setupFormDiv(data, $table, 'rgbslider', getValue);
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
