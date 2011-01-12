/*
 * digilib jQuery plugin
 *
 */

(function($) {

    var defaults = {
            /* base URL to Scaler servlet */
            'scalerUrl' : 'http://digilib.mpiwg-berlin.mpg.de/digitallibrary/servlet/Scaler',
            /* digilib image path i.e. fn */
            'imagePath' : '',
            /* mode of operation. 
             * fullscreen: takes parameters from page URL, keeps state in page URL
             * embedded: takes parameters from Javascript options, keeps state inside object 
             */
            'interactionMode' : 'fullscreen'
    };
 
    /* parameters from the query string */
    var params = {};
    
    var methods = {
            init : function(options) {
                return this.each(function() {
                    var $elem = $(this);
                    var data = $elem.data('digilib');
                    // If the plugin hasn't been initialized yet
                    if (!data) {
                        // settings for this digilib instance are merged from defaults and options
                        var settings = $.extend({}, defaults, options);
                        // merge query parameters
                        settings = $.extend(settings, parseParams(settings.interactionMode));
                        // store in data element
                        $elem.data('digilib', {
                            target : $elem,
                            settings : settings
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
    var parseParams = function(interactionMode) {
        alert("parseParams() not implemented");
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