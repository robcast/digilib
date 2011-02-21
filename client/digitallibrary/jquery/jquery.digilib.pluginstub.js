/**
digilib plugin stub
 */

(function($) {

    // affine geometry
    var geom;
    // plugin object with digilib data
    var digilib;

    var FULL_AREA;

    var buttons = {
            stub : {
                onclick : ["doStub", 1],
                tooltip : "what does this button do?",
                icon : "stub.png"
                }
    };

    var defaults = {
            // is stub active?
            'isStubActive' : true
    };

    var actions = {
            // action code goes here 
            doStub : function (data, param) {
                var settings = data.settings;
                console.log('isStubActive', settings.isStubActive);
                // do some useful stuff ...
            }
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing stub plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        FULL_AREA = geom.rectangle(0,0,1,1);
        // add defaults, actins, buttons
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising stub plugin. data:', data);
        var $data = $(data);
        // install event handler
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
        $data.bind('redisplay', handleRedisplay);
        $data.bind('dragZoom', handleDragZoom);
    };


    var handleSetup = function (evt) {
        console.debug("stub: handleSetup");
        var data = this;
    };

    var handleUpdate = function (evt) {
        console.debug("stub: handleUpdate");
        var data = this;
    };

    var handleRedisplay = function (evt) {
        console.debug("stub: handleRedisplay");
        var data = this;
    };

    var handleDragZoom = function (evt, zoomArea) {
        var data = this;
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
            name : 'pluginstub',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.pluginstub must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
