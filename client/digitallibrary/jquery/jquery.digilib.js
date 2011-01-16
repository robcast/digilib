/*
 * digilib jQuery plugin
 *
 */

(function($) {
    var buttons = {
        reference : {
            onclick : "javascript:getRefWin()",
            tooltip : "get a reference URL",
            img : "reference.png"
            },
        zoomin : {
            onclick : "javascript:dl.zoomBy(1.4)",
            tooltip : "zoom in",
            img : "zoom-in.png"
            },
        zoomout : {
            onclick : "javascript:zoomBy(0.7)",
            tooltip : "zoom out",
            img : "zoom-out.png"
            },
        zoomarea : {
            onclick : "javascript:zoomArea()",
            tooltip : "zoom area",
            img : "zoom-area.png"
            },
        zoomfull : {
            onclick : "javascript:zoomFullpage()",
            tooltip : "view the whole image",
            img : "zoom-full.png"
            },
        pagewidth : {
            onclick : "javascript:zoomFullpage('width')",
            tooltip : "page width",
            img : "pagewidth.png"
            },
        back : {
            onclick : "javascript:gotoPage('-1')",
            tooltip : "goto previous image",
            img : "back.png"
            },
        fwd : {
            onclick : "javascript:gotoPage('+1')",
            tooltip : "goto next image",
            img : "fwd.png"
            },
        page : {
            onclick : "javascript:gotoPageWin()",
            tooltip : "specify image",
            img : "page.png"
            },
        bird : {
            onclick : "javascript:toggleBirdDiv()",
            tooltip : "show bird's eye view",
            img : "birds-eye.png"
            },
        help : {
            onclick : "javascript:toggleAboutDiv()",
            tooltip : "about Digilib",
            img : "help.png"
            },
        reset : {
            onclick : "javascript:resetImage()",
            tooltip : "reset image",
            img : "reset.png"
            },
        mark : {
            onclick : "javascript:setMark()",
            tooltip : "set a mark",
            img : "mark.png"
            },
        delmark : {
            onclick : "javascript:removeMark()",
            tooltip : "delete the last mark",
            img : "delmark.png"
            },
        hmir : {
            onclick : "javascript:mirror('h')",
            tooltip : "mirror horizontally",
            img : "mirror-horizontal.png"
            },
        vmir : {
            onclick : "javascript:mirror('v')",
            tooltip : "mirror vertically",
            img : "mirror-vertical.png"
            },
        rot : {
            onclick : "javascript:setParamWin('rot', 'Rotate (0..360) clockwise')",
            tooltip : "rotate image",
            img : "rotate.png"
            },
        brgt : {
            onclick : "javascript:setParamWin('brgt', 'Brightness (-255..255)')",
            tooltip : "set brightness",
            img : "brightness.png"
            },
        cont : {
            onclick : "javascript:setParamWin('cont', 'Contrast (0..8)')",
            tooltip : "set contrast",
            img : "contrast.png"
            },
        rgb : {
            onclick : "javascript:setParamWin('rgb', '...')",
            tooltip : "set rgb values",
            img : "rgb.png"
            },
        quality : {
            onclick : "javascript:setQualityWin('Quality (0..2)')",
            tooltip : "set image quality",
            img : "quality.png"
            },
        size : {
            onclick : "javascript:toggleSizeMenu()",
            tooltip : "set page size",
            img : "size.png"
            },
        calibrationx : {
            onclick : "javascript:calibrate('x')",
            tooltip : "calibrate screen x-ratio",
            img : "calibration-x.png"
            },
        scale : {
            onclick : "javascript:toggleScaleMenu()",
            tooltip : "change image scale",
            img : "original-size.png"
            },
        options : {
            onclick : "javascript:toggleOptionDiv()",
            tooltip : "hide options",
            img : "options.png"
            },
        SEP : {
            img : "sep.png"
            }
        };
        
    var defaults = {
        // version of this script
        'version' : 'jquery.digilib.js 1.0',
        // logo url
        'logoUrl' : '../img/digilib-logo-text1.png',
        // repository url
        'reposUrl' : 'http://digilib.berlios.de',
        // base URL to Scaler servlet
        'scalerBaseUrl' : 'http://digilib.mpiwg-berlin.mpg.de/digitallibrary/servlet/Scaler',
        // list of Scaler parameters
            'scalerParamNames' : ['fn','pn','dw','dh','ww','wh','wx','wy','ws','mo',
                                  'rot','cont','brgt','rgbm','rgba','ddpi','ddpix','ddpiy'],
        // mode of operation. 
        // fullscreen: takes parameters from page URL, keeps state in page URL
        // embedded: takes parameters from Javascript options, keeps state inside object 
        'interactionMode' : 'fullscreen',
        // buttons
        'buttons' : buttons,
        // path to button images (must end with a slash)
        'buttonsImagePath' : '../greyskin/', 
        // button groups
        'buttonsStandard' : ["reference","zoomin","zoomout","zoomarea","zoomfull","pagewidth","back","fwd","page","bird","SEP","help","reset","options"],
        'buttonsSpecial' : ["mark","delmark","hmir","vmir","rot","brgt","cont","rgb","quality","size","calibrationx","scale","SEP","options"],
        'buttonsCustom' : [],
        // is birdView shown?
        'isBirdDivVisible' : false,
        // dimensions of bird's eye window
        'birdMaxX' : 200,
        'birdMaxY' : 200,
        // is the "about" window shown?
        'isAboutDivVisible' : false

        };
 
    // parameters from the query string
    var queryParams = {};

    // affine geometry classes
    var geom = dlGeometry();
    
    var methods = {
            // digilib initialization
            init : function(options) {
                // settings for this digilib instance are merged from defaults and options
                var settings = $.extend({}, defaults, options);
                var isFullscreen = settings.interactionMode === 'fullscreen'; 
                if (isFullscreen) {
                    queryParams = parseQueryParams();
                    };
                return this.each(function() {
                    var $elem = $(this);
                    var data = $elem.data('digilib');
                    var elemSettings;
                    // if the plugin hasn't been initialized yet
                    if (!data) {
                        // merge query parameters
                        if (isFullscreen) {
                            elemSettings = $.extend({}, settings, queryParams);
                        } else {
                            elemSettings = $.extend({}, settings, parseImgParams($elem));
                        };
                        // store in data element
                        $elem.data('digilib', {
                            target : $elem,
                            settings : elemSettings
                        });
                    }
                    // create HTML structure
                    setupScalerDiv($elem, elemSettings);
                    setupButtons($elem, elemSettings, 'buttonsStandard');
                    setupBirdviewDiv($elem, elemSettings);
                    setupAboutDiv($elem, elemSettings);
                });
            },

            // clean up digilib
            destroy : function() {
                return this.each(function(){
                    var $this = $(this);
                    var data = $this.data('digilib');
                    // Namespacing FTW
                    $(window).unbind('.digilib'); // unbinds all digilibs(?)
                    data.digilib.remove();
                    $this.removeData('digilib');
                });
            }
    };

    // returns parameters from page url
    var parseQueryParams = function() {
        return parseQueryString(location.search.slice(1));
        };
        
    // returns parameters taken from embedded img-element
    var parseImgParams = function($elem) {
        var src = $elem.find('img').first().attr('src');
        if (!src) {
            return null;
        }
        var pos = src.indexOf('?');
        var query = (pos < 0) ? '' : src.substring(pos + 1);
        var scalerUrl = src.substring(0, pos);
        var hash = parseQueryString(query);
        hash.scalerBaseUrl = scalerUrl;
        // console.log(hash);
        return hash;
        };

    // parses query parameter string into parameter object
    var parseQueryString = function(query) {
        var pairs = query.split("&");
        var hash = {};
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split("=");
            if (pair.length === 2) {
                hash[pair[0]] = pair[1];
                };
            };
        return hash;
        };
    
    // returns a query string from key names from a parameter hash
    var makeParamString = function (settings, keys) {
        var paramString = '';
        var latter = false;
        for (i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (settings[key]) {
                // first param gets no '&'
                paramString += latter ? '&' : '';
                latter = true;
                // add parm=val
                paramString += key + '=' + settings[key];
                };
        }
        return paramString;
        };

    // returns URL and query string for Scaler
    var getScalerString = function (settings) {
        var keys = settings.scalerParamNames;
        var queryString = makeParamString(settings, keys);
        var url = settings.scalerBaseUrl + '?' + queryString;
        return url;
    };

    // returns maximum size for scaler img in fullscreen mode
    var getFullscreenImgSize = function($elem) {
        var winH = $(window).height();
        var winW = $(window).width();
        // TODO: account for borders?
        return geom.size(winW, winH);
    };
    
    // creates HTML structure for digilib in elem
    var setupScalerDiv = function ($elem, settings) {
        var rewrite;
        if (settings.interactionMode === 'fullscreen') {
            // fullscreen
            var imgSize = getFullscreenImgSize($elem);
            settings.dw = imgSize.width;
            settings.dh = imgSize.height;
            $img = $('<img/>');
            var scalerUrl = getScalerString(settings);
            $img.attr('src', scalerUrl);
            $img.addClass('pic');
        } else {
            // embedded mode -- try to keep img tag
            var $img = $elem.find('img');
            if ($img.length > 0) {
                console.debug("img detach:",$img);
                $img.detach();
                $img.addClass('picsi');
            } else {
                $img = $('<img/>');
                var scalerUrl = getScalerString(settings);
                $img.attr('src', scalerUrl);
                $img.addClass('pic');
            }
        }
        // create new html
        $elem.empty(); // TODO: should we keep stuff for customization?
        var $scaler = $('<div class="scaler"/>');
        $elem.append($scaler);
        $scaler.append($img);
        $img.load(scalerImgLoadedFn(settings));
    };

    // creates HTML structure for buttons in elem
    var setupButtons = function ($elem, settings, buttonGroup) {
        if (settings.interactionMode === 'fullscreen') {
            // fullscreen -- create new
            var $buttonsDiv = $('<div class="buttons"></div>');
            $elem.append($buttonsDiv);
            var buttonNames = settings[buttonGroup];
            for (var i = 0; i < buttonNames.length; i++) {
                var buttonName = buttonNames[i];
                var buttonSettings = settings.buttons[buttonName];
                // construct the button html
                var $button = $('<div class="button"></div>');
                var $a = $('<a/>');
                var $img = $('<img class="button"/>');
                $buttonsDiv.append($button);
                $button.append($a);
                $a.append($img);
                // add attributes and bindings
                $button.attr('title', buttonSettings.tooltip);
                $button.addClass('button-' + buttonName);
                // let the clicked <a> element know about the digilib context 
                $a.data('digilib', { 'name' : buttonName, 'settings' : settings } );
                $a.bind('click', function() {
                    // get the context settings
                    var data = $(this).data('digilib');
                    // find the action for the clicked element
                    console.log(data.settings.buttons[data.name].onclick);
                    });
                // binding mit closure
                //(function(){ var action = buttonSettings.onclick;
                //    $a.bind('click', function(){ console.log( action )} );
                //})();
                $img.attr('src', settings.buttonsImagePath + buttonSettings.img);
            };
        }
        return $buttonsDiv;
    };

    // creates HTML structure for the bird's eye view in elem
    var setupBirdviewDiv = function ($elem, settings) {
        // use only the relevant parameters
        var keys = ['fn','pn','dw','dh'];
        var birdDimensions = {
            'dw' : settings.birdMaxX,
            'dh' : settings.birdMaxY
            };
        var birdSettings = $.extend({}, settings, birdDimensions);
        var birdUrl = settings.scalerBaseUrl + '?' + makeParamString(birdSettings, keys);
        // the bird's eye div
        var $birdviewDiv = $('<div class="birdview"/>');
        // the detail indicator frame
        var $birdzoomDiv = $('<div class="birdzoom"/>');
        // the small image
        var $birdImg = $('<img class="birdimg"/>');
        $elem.append($birdviewDiv);
        $birdviewDiv.append($birdzoomDiv);
        $birdviewDiv.append($birdImg);
        $birdImg.attr('src', birdUrl);
        };

    // creates HTML structure for the bird's eye view in elem
    var setupAboutDiv = function ($elem, settings) {
        var $aboutDiv = $('<div class="about"/>');
        var $header = $('<p>Digilib Graphic Viewer</p>');
        var $link = $('<a/>');
        var $logo = $('<img class="logo" title="digilib"/>');
        var $content = $('<p/>');
        $elem.append($aboutDiv);
        $aboutDiv.append($header);
        $aboutDiv.append($link);
        $aboutDiv.append($content);
        $link.append($logo);
        $logo.attr('src', settings.logoUrl);
        $link.attr('href', settings.reposUrl);
        $content.text('Version: ' + settings.version);
        };

    // returns function for load event of scaler img
    var scalerImgLoadedFn = function(settings) {
        return function() {
            console.debug("img loaded! settings=", settings);
        };
    };
    // hook plugin into jquery
    $.fn.digilib = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof(method) === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.digilib' );
        }
    };
    
})(jQuery);