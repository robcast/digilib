/*
 * digilib jQuery plugin
 *
 */

(function($) {

    var defaults = {
            /* base URL to Scaler servlet */
            'scalerUrl' : 'http://digilib.mpiwg-berlin.mpg.de/digitallibrary/servlet/Scaler',
            /* digilib image path i.e. fn */
            'fn' : '',
            /* mode of operation. 
             * fullscreen: takes parameters from page URL, keeps state in page URL
             * embedded: takes parameters from Javascript options, keeps state inside object 
             */
            'interactionMode' : 'fullscreen'
    };
 
    /* parameters from the query string */
    var queryParams = {};
    
    var methods = {
            init : function(options) {
                var settings = $.extend({}, defaults, options);
                var isFullscreen = settings.interactionMode === 'fullscreen'; 
                if (isFullscreen) {
                    queryParams = parseQueryParams();
                    };
                return this.each(function() {
                    var $elem = $(this);
                    var data = $elem.data('digilib');
                    var elemSettings;
                    // If the plugin hasn't been initialized yet
                    if (!data) {
                        // settings for this digilib instance are merged from defaults and options
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
                });
            },
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

    // returns object with parameters from the query string or an embedded img-tag (depending on interactionMode)
    var parseQueryParams = function() {
        return parseQueryString(location.search.slice(1));
        };
        
    var parseImgParams = function($elem) {
        var src = $elem.children('img').attr('src');
        var pos = src.indexOf('?');
        var query = (pos < 0) ? '' : src.substring(pos + 1);
        var scalerUrl = src.substring(0, pos);
        var hash = parseQueryString(query);
        hash.scalerUrl = scalerUrl;
        // console.log(hash);
        return hash;
        };

    var parseQueryString = function(query) {
        var pairs = query.split("&");
        var hash = {};
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split("=");
            if (pair.length === 2) {
                hash[pair[0]] = pair[1]
                };
            };
        return hash;
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