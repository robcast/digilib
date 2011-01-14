/*
 * digilib jQuery plugin
 *
 */

(function($) {

    var defaults = {
            // base URL to Scaler servlet
            'scalerBaseUrl' : 'http://digilib.mpiwg-berlin.mpg.de/digitallibrary/servlet/Scaler',
            // list of Scaler parameters
            'scalerParamNames' : ['fn','pn','dw','dh','ww','wh','wx','wy','ws','mo',
                                  'rot','cont','brgt','rgbm','rgba','ddpi','ddpix','ddpiy'],
            // mode of operation. 
            // fullscreen: takes parameters from page URL, keeps state in page URL
            // embedded: takes parameters from Javascript options, keeps state inside object 
            'interactionMode' : 'fullscreen'
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
        var src = $elem.children('img').attr('src');
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
    
    // returns URL and query string for Scaler
    var getScalerString = function (settings) {
        var url = settings.scalerBaseUrl + '?';
        var i, parm, latter;
        // go through param names and get values from settings
        for (i = 0; i < settings.scalerParamNames.length; ++i) {
            parm = settings.scalerParamNames[i];
            if (settings[parm]) {
                // first parm gets no '&'
                url += latter ? '&' : '';
                latter = 1;
                // add parm=val
                url += parm + '=' + settings[parm];
            }
        }
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
        if (settings.interactionMode === 'fullscreen') {
            // fullscreen
            var imgSize = getFullscreenImgSize($elem);
            settings.dw = imgSize.width;
            settings.dh = imgSize.height;
            // create new html
            $elem.empty(); // TODO: should we keep stuff for customization?
            var scalerUrl = getScalerString(settings);
            var scalerHTML = '<div class="scaler"><img class="pic"/></div>'; 
            $elem.append(scalerHTML);
            var $img = $elem.find("img.pic");
            $img.attr('src', scalerUrl);
            //$img.load(scalerImgLoaded);
        } else {
            // embedded mode -- keep inner img
            var $img = $elem.detach('img');
            $elem.empty(); // TODO: should we keep stuff for customization?
            $img.addClass('pic');
            var $scaler = $('<div class="scaler"/>');
            $scaler.append($img);
            $elem.append($scaler);
            //$img.load(scalerImgLoaded);
        }
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