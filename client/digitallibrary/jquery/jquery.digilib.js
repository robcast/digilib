/*
 * digilib jQuery plugin
 *
 */

(function($) {
    
    var methods = {
            init : function(options) {
                return this.each(function() {
                    var $this = $(this);
                    var data = $this.data('digilib');
                
                    // If the plugin hasn't been initialized yet
                    if (!data) {
                
                        /*
                         * Do more setup stuff here
                         */

                        $(this).data('digilib', {
                            target : $this
                        });
                    }
                });
            },
            destroy : function() {
                return this.each(function(){
                    var $this = $(this);
                    var data = $this.data('digilib');
                    // Namespacing FTW
                    $(window).unbind('.digilib'); // FIXME: unbinds all digilibs
                    data.digilib.remove();
                    $this.removeData('digilib');
                });
            }
         };

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