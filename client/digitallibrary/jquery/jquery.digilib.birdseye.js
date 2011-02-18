/** required digilib geometry plugin
 */

(function($) {

    // affine geometry plugin stub
    var geom;

    var FULL_AREA;

    var actions = {
    };       
       
    // init: plugin initialization
    var plugInit = function(data) {
        // import geometry classes
        geom = digilib.fn.geometry;
        FULL_AREA = digilib.fn.FULL_AREA;
        // TODO: add actions
        // TODO: add buttons
        // TODO: add event handlers
    };
        
        
    // plugin object with name and init
    // shared objects filled by digilib on registration
    var digilib = {
            name : 'birdseye',
            init : plugInit,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };
            
    if ($.fn.digilib == null) {
        $.error("jquery.digilib.birdview must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', digilib);
    }
})(jQuery);
