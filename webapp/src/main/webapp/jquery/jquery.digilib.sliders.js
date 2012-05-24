/**
digilib sliders plugin
 */

// TODO:
// IE sets rgb contrast sliders initially to 0.4 instead of 0 - ???

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
            preview : false,
            min : 0,
            max : 360,
            step : 5,
            start : 0
            },
        brgt : {
            label : "Brightness",
            tooltip : "set numeric value to be added",
            icon : "brightness.png",
            preview : true,
            min : -255,
            max : 255,
            step : 10,
            start : 0
            },
        cont : {
            label : "Contrast",
            tooltip : "set numeric value to be multiplied",
            icon : "contrast.png",
            preview : true,
            min : -4,
            max : 4,
            step : 0.1,
            start : 0
        }
    };

    var primaryColors = ['r', 'g', 'b'];
    var colorVals = {
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
            },
        brgt : 0,
        cont : 0
    };

    var actions = {
        // shows brightness slider
        sliderBrgt : function (data) {
            // adjust min and max for contrast value (not nice to change sliderOptions)
            var maxBrgt = Math.max(Math.round(255 * Math.pow(2, data.settings.cont)), 255);
            sliderOptions.brgt.min = -maxBrgt;
            sliderOptions.brgt.max = maxBrgt;
            var onChange = function($slider, val) {
                colorVals['brgt'] = parseFloat(val);
                updatePreview($slider);
                };
            var onSubmit = function(val) {
                digilib.actions.brightness(data, val);
                };
            singleSlider(data, 'brgt', onChange, onSubmit);
        },

        // shows contrast slider
        sliderCont : function (data) {
            var onChange = function($slider, val) {
                var m = Math.pow(2, parseFloat(val));
                colorVals['cont'] = val;
                colorVals['brgt'] = 127 - (127 * m);
                updatePreview($slider);
                };
            var onSubmit = function(val) {
                digilib.actions.contrast(data, val, true);
                };
            singleSlider(data, 'cont', onChange, onSubmit);
        },

        // shows rotate slider
        sliderRot : function (data) {
            var onChange = null;
            var onSubmit = function(val) {
                digilib.actions.rotate(data, val);
                };
            singleSlider(data, 'rot', onChange, onSubmit);
        },

        // shows RGB sliders
        sliderRGB : function (data) {
            var onSubmit = function(m, a) {
                digilib.actions.setRGB(data, m, a);
                };
            rgbSlider(data, onSubmit);
        }
    };

    // update preview values for a given slider
    var updatePreview = function ($slider) {
        if ($slider == null) return;
        var cls = $slider.data('cls');
        var $preview = $slider.data('preview');
        if ($preview == null) {
            console.error("slider updatePreview without preview!");
            return;
        }
        var $td2 = $preview.find('table.'+cls+'preview td');
        // account for current brgt/cont/rgbm/rgba values
        var calcRGBValue = function (code, val) {
            var c = colorVals[code];
            var cm = Math.pow(2, c.m) * val;
            var colorVal = cm + c.a;
            var cont = Math.pow(2, colorVals.cont) * colorVal;
            var brgt = colorVals.brgt;
            var resultVal = cont + brgt;
            return Math.min(Math.max(Math.round(resultVal), 0), 255);
           };
        // color one table cell according to index position
        var setRGBValues = function (index) {
            var val = index * 32;
            var r = calcRGBValue('r', val);
            var g = calcRGBValue('g', val);
            var b = calcRGBValue('b', val);
            $(this).css('background-color', 'rgb('+r+','+g+','+b+')');
            };
        $td2.each(setRGBValues);
    };

    // assign button actions to sliders (rotate, brightness, contrast) 
    var setButtonActions = function () {
        if (fn.setButtonAction == null) {
            console.debug('sliders: could not assign button actions. Maybe jquery.digilib.buttons.js was not loaded?');
            return;
            }
        console.debug('sliders: assign new button actions. digilib:', digilib);
        fn.setButtonAction('brgt', 'sliderBrgt');
        fn.setButtonAction('cont', 'sliderCont');
        fn.setButtonAction('rot', 'sliderRot');
        fn.setButtonAction('rgb', 'sliderRGB');
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

    // get brgt/cont/rgba/rgbm params (brightness/contrast/color)
    var handleUpdate = function (evt) {
        console.debug("sliders: handleUpdate");
        var data = this;
        var settings = data.settings;
        colorVals.brgt = parseFloat(settings.brgt) || 0;
        colorVals.cont = parseFloat(settings.cont) || 0;
        setRGBcolorVals(data, 'a');
        setRGBcolorVals(data, 'm');
        var sliderSelector = '#'+ settings.cssPrefix + 'slider';
        var $slider = fn.find(data, sliderSelector);
        fn.centerOnScreen(data, $slider);
        updatePreview($slider);
    };

    // read rgb m/a parameters and set start values for sliders
    var setRGBcolorVals = function (data, code) {
        var colorparts = data.settings['rgb'+code] || '0/0/0';
        var values = colorparts.split("/");
        colorVals.r[code] = parseFloat(values[0]) || 0;
        colorVals.g[code] = parseFloat(values[1]) || 0;
        colorVals.b[code] = parseFloat(values[2]) || 0;
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
                    <input class="'+cls+'default" type="button" value="Default"/>\
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
        // handle default
        $form.find('.'+cls+'default').on('click', function () {
            var sliders = $form.find('div.'+tiny);
            sliders.each(function () {
                var reset = $(this).data('default');
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

    /** creates a TinyRange slider
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
        var resetdefault = function () {
            $text.val(opts.start);
            textChange();
        };
        // connect slider and input
        $range.on('change', rangeChange); 
        $text.on('change', textChange);
        $slider.data({
            '$text' : $text,
            '$range' : $range,
            'reset' : reset,
            'default' : resetdefault,
            'update' : null
        });
        return $slider;
    };

    /** creates a single TinyRangeSlider for param "paramname",
        the new value is passed to the "onSubmit" function.
     */
    var singleSlider = function (data, paramname, onChange, onSubmit) {
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
        var hasPreview = opts.preview;
        if (hasPreview) {
            var cls = data.settings.cssPrefix + classname;
            var $preview = preview(cls);
            $div.append($preview);
            $slider.data({
                'cls' : cls,
                'preview' : $preview,
                'update' : onChange
                });
            onChange($slider, startvalue);
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
        var $preview = preview(cls);
        $div.append($table);
        $div.append($preview);
        // create slider rows for the 3 primary colors
        var insertTableRow = function(index, value) {
            var color = colorVals[value];
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
        var onChange = function ($slider) {
            // show effects of color brightness/contrast on a grey scale
            var input = $table.data();
            $.each(primaryColors, function (index, value) {
                colorVals[value].a = parseFloat(input[value+'a'].val());
                colorVals[value].m = parseFloat(input[value+'m'].val());
                });
            updatePreview($slider);
            };
        var submitSliderValues = function () {
            // get values from sliders
            var input = $table.data();
            var rgba = input['ra'].val() + '/' + input['ga'].val() + '/' + input['ba'].val();
            var rgbm = input['rm'].val() + '/' + input['gm'].val() + '/' + input['bm'].val();
            onSubmit(rgbm, rgba);
            };
        $.each(primaryColors, insertTableRow);
        setupFormDiv(data, $div, 'rgbslider', submitSliderValues);
        // update callback is made known to each slider
        var $sliders = $div.find('div.'+css+'tinyslider');
        $sliders.data({
                'cls' : cls,
                'preview' : $preview,
                'update' : onChange
                });
        onChange($sliders);
    };

    /** creates a new preview div with 2 x 9 cells in scaled grey values
     */
    var preview = function (cls) {
        var td = new Array(10).join('<td/>');
        var html = '\
            <div class="'+cls+'preview">\
                <table class="'+cls+'grey">\
                    <tr>'+td+'</tr>\
                </table>\
                <table class="'+cls+'preview">\
                    <tr>'+td+'</tr>\
                </table>\
            </div>';
        var $div = $(html);
        // creates a table with a series of scaled grey values
        var setGreyScale = function (index) {
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
