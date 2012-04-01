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
            indicator : false,
            'min' : 0,
            'max' : 360,
            'step' : 0.1,
            'start' : 90
            },
        brgt : {
            label : "Brightness",
            tooltip : "set numeric value to be added",
            icon : "brightness.png",
            indicator : true,
            'min' : -255,
            'max' : 255,
            'step' : 10,
            'start' : 0
            },
        cont : {
            label : "Contrast",
            tooltip : "set numeric value to be multiplied",
            icon : "contrast.png",
            indicator : true,
            'min' : -4,
            'max' : 4,
            'step' : 0.01,
            'start' : 0
        }
    };

    var primaryColors = ['r', 'g', 'b'];
    var rgb = {
        r : {
            label : "red",
            color : "#800000",
            a : 0,
            m : 0
            },
        g : {
            label : "green",
            color : "#008000",
            a : 0,
            m : 0
            },
        b : {
            label : "blue",
            color : "#000080",
            a : 0,
            m : 0
            }
        }
    var actions = {
        // shows brightness slider
        tinySliderBrgt : function (data) {
            var onSubmit = function(val) {
                digilib.actions.brightness(data, val);
                };
            singleSlider(data, 'brgt', onSubmit);
        },

        // shows contrast slider
        tinySliderCont : function (data) {
            var onSubmit = function(val) {
                digilib.actions.contrast(data, val, true);
                };
            singleSlider(data, 'cont', onSubmit);
        },

        // shows rotate slider
        tinySliderRot : function (data) {
            var onSubmit = function(val) {
                digilib.actions.rotate(data, val);
                };
            singleSlider(data, 'rot', onSubmit);
        },

        // shows RGB sliders
        tinySliderRGB : function (data) {
            var onSubmit = function(m, a) {
                digilib.actions.setRGB(data, m, a);
                };
            rgbSlider(data, onSubmit);
        }
    };

    var indicators = {
        brgt : function ($slider, value) {
            var brgt = parseFloat(value);
            var cls = $slider.data('cls');
            var $ind = $slider.data('indicator');
            var $td = $ind.find('table.'+cls+'indicator td');
            var setBgColor = function (index) {
                var val = index * 32;
                var grey = Math.min(Math.max(Math.round(val + brgt), 0), 255);
                console.debug('brgt', index, val, brgt, "=", val+brgt)
                $(this).css('background-color', 'rgb('+grey+','+grey+','+grey+')');
                };
            $td.each(setBgColor);
            },

        cont : function ($slider, value) { 
            var cont = parseFloat(value);
            var cls = $slider.data('cls');
            var $ind = $slider.data('indicator');
            var $td = $ind.find('table.'+cls+'indicator td');
            var setBgColor = function (index) {
                var val = index * 32;
                var grey = Math.min(Math.max(Math.round(Math.pow(2, cont) * val), 0), 255);
                $(this).css('background-color', 'rgb('+grey+','+grey+','+grey+')');
                };
            $td.each(setBgColor);
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
        fn.setButtonAction('rgb', 'tinySliderRGB');
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
        var $data = $(data);
        $data.bind('update', handleUpdate);
    };

    // get rgba/rgbm params (color brightness/contrast) 
    var handleUpdate = function (evt) {
        console.debug("sliders: handleUpdate");
        var data = this;
        setStartValues(data, 'a');
        setStartValues(data, 'm');
        var sliderSelector = '#'+ data.settings.cssPrefix + 'slider';
        fn.centerOnScreen(data, fn.find(data, sliderSelector));
    };

    // set m/a start values for sliders
    var setStartValues = function (data, code) {
        var colorparts = data.settings['rgb'+code];
        if (colorparts == null) return;
        var values = colorparts.split("/");
        rgb.r[code] = values[0] || 0;
        rgb.g[code] = values[1] || 0;
        rgb.b[code] = values[2] || 0;
        };

    /** creates a div with a form, setup events and callback
     */
    var setupFormDiv = function (data, $content, cssSuffix, onSubmit) {
        var cssPrefix = data.settings.cssPrefix;
        var cls = cssPrefix + cssSuffix;
        var tiny = cssPrefix + 'tinyslider';
        var $elem = data.$elem;
        var sliderSelector = '#'+cssPrefix+'slider';
        if (fn.isOnScreen(data, sliderSelector)) return; // already onscreen
        var html = '\
            <div id="'+cssPrefix+'slider" class="'+cls+'">\
                <form class="'+cls+'">\
                    <input class="'+cls+'cancel" type="button" value="Cancel"/>\
                    <input class="'+cls+'reset" type="button" value="Reset"/>\
                    <input type="submit" name="sub" value="Ok"/>\
                </form>\
            </div>';
        $div = $(html).appendTo($elem);
        var $form = $div.find('form');
        $form.prepend($content);
        // handle submit
        $form.on('submit', function () {
            onSubmit();
            fn.withdraw($div);
            return false;
        });
        // handle reset
        $form.find('.'+cls+'reset').on('click', function () {
            var sliders = $form.find('div.'+tiny);
            sliders.each(function () {
                var reset = $(this).data('reset');
                reset();
                });
        });
        // handle cancel
        $form.find('.'+cls+'cancel').on('click', function () {
            fn.withdraw($div);
        });
        // show div
        $div.fadeIn();
        // fix non-HTML5 slider
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
    var tinySlider = function (data, paramname, startvalue) {
        var $elem = data.$elem;
        var opts = sliderOptions[paramname];
        var cssPrefix = data.settings.cssPrefix;
        var cls = cssPrefix + 'tinyslider';
        var html = '\
            <div class="'+cls+'">\
                <span>'+opts.label+'</span>\
                <input type="range" class="'+cls+'range" name="'+paramname+'" step="'+opts.step+'" min="'+opts.min+'" max="'+opts.max+'" value="'+startvalue+'"/>\
                <input type="text" class="'+cls+'text" name="'+paramname+'" size="4" value="'+startvalue+'"/>\
            </div>';
        var $slider = $(html);
        var $range = $slider.find('input.'+cls+'range');
        var $text = $slider.find('input.'+cls+'text');
        var rangeChange = function () {
            // crop floating point imprecision
            var val = parseFloat($range.val()).toFixed(4);
            $text.val(parseFloat(val));
            var update = $slider.data('update');
            if ($.isFunction(update)) {
                update($slider, val);
            }
        };
        var textChange = function () {
            var val = $text.val();
            $range.val(val);
            // val doesn't change the slider handle position in Tinyrange
            // can't use a jQuery "valHook" here because input type is reported as "text" (???)
            var HTML5 = $range.prop('type') === 'range';
            if (!HTML5) {
                $range.range('set', val);
            }
            var update = $slider.data('update');
            if ($.isFunction(update)) {
                update($slider, val);
            }
        };
        var reset = function () {
            $text.val(startvalue);
            textChange();
        };
        // connect slider and input
        $range.on('change', rangeChange); 
        $text.on('change', textChange);
        $slider.data({
            '$text' : $text,
            '$range' : $range,
            'reset' : reset,
            'update' : null
        });
        return $slider;
    };

    /** creates a single TinyRangeSlider for param "paramname",
        the new value is passed to the "onSubmit" function.
     */
    var singleSlider = function (data, paramname, onSubmit) {
        var classname = 'singleslider';
        var $div = $('<div/>');
        var opts = sliderOptions[paramname];
        var startvalue = data.settings[paramname] || opts.start;
        var $slider = tinySlider(data, paramname, startvalue);
        var getValue = function () {
            // get the new value and do something with it
            var val = $slider.data('$text').val();
            onSubmit(val);
            };
        $div.append($slider);
        setupFormDiv(data, $div, classname, getValue);
        var hasIndicator = opts.indicator;
        if (hasIndicator) {
            var cls = data.settings.cssPrefix + classname;
            var $ind = indicator(cls);
            $div.append($ind);
            update = indicators[paramname];
            $slider.data({
                'cls' : cls,
                'indicator' : $ind,
                'update' : update
                });
            update($slider, startvalue);
        }
    };

    /** creates a compound RGB slider
        the new values are passed to the "onSubmit" function.
     */
    var rgbSlider = function (data, onSubmit) {
        var css = data.settings.cssPrefix;
        var cls = css + 'rgbslider';
        var $div = $('<div/>');
        var $table = $('<table class="'+cls+'" />');
        var $ind = indicator(cls);
        $div.append($table);
        $div.append($ind);
        var insertTableRow = function(index, value) {
            var color = rgb[value];
            // start values are set in "handleSetup"
            var $tr = $('<tr/>').appendTo($table);
            var html = '\
                <td class="'+css+'color '+css+value+'">\
                    <div>'+color.label+'</div>\
                </td>';
            $(html).appendTo($tr);
            var $brgt = tinySlider(data, 'brgt', color.a);
            var $cont = tinySlider(data, 'cont', color.m);
            $table.data(value+'a', $brgt.data('$text'));
            $table.data(value+'m', $cont.data('$text'));
            $('<td class="'+css+'rgb"/>').append($brgt).appendTo($tr);
            $('<td class="'+css+'rgb"/>').append($cont).appendTo($tr);
            };
        var getSliderValues = function () {
            // get values from sliders
            var input = $table.data();
            var rgba = input['ra'].val() + '/' + input['ga'].val() + '/' + input['ba'].val();
            var rgbm = input['rm'].val() + '/' + input['gm'].val() + '/' + input['bm'].val();
            onSubmit(rgbm, rgba);
            };
        var update = function () {
            // show effects of color brightness/contrast on a grey scale
            var input = $table.data();
            var ra = parseFloat(input['ra'].val());
            var ga = parseFloat(input['ga'].val());
            var ba = parseFloat(input['ba'].val());
            var rm = parseFloat(input['rm'].val());
            var gm = parseFloat(input['gm'].val());
            var bm = parseFloat(input['bm'].val());
            var setRGBValue = function (index) {
                var val = index * 32;
                var r = Math.min(Math.max(Math.round(Math.pow(2, rm) * val + ra), 0), 255);
                var g = Math.min(Math.max(Math.round(Math.pow(2, gm) * val + ga), 0), 255);
                var b = Math.min(Math.max(Math.round(Math.pow(2, bm) * val + ba), 0), 255);
                $(this).css('background-color', 'rgb('+r+','+g+','+b+')');
                };
            $ind.find('table.'+cls+'indicator td').each(setRGBValue);
            };
        $.each(primaryColors, insertTableRow);
        setupFormDiv(data, $div, 'rgbslider', getSliderValues);
        $div.find('div.'+css+'tinyslider').data('update', update);
        update();
    };

    /** creates an indicator div with 2 x 9 cells in scaled grey values
     */
    var indicator = function (cls) {
        var td = new Array(10).join('<td/>');
        var html = '\
            <div class="'+cls+'indicator">\
                <table class="'+cls+'grey">\
                    <tr>'+td+'</tr>\
                </table>\
                <table class="'+cls+'indicator">\
                    <tr>'+td+'</tr>\
                </table>\
            </div>';
        var $div = $(html);
        var setGreyScale = function (index) {
            // sets a series of grey values
            var val = index * 32;
            $(this).css('background-color', 'rgb('+val+','+val+','+val+')');
            };
        $div.find('table.'+cls+'grey td').each(setGreyScale);
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
