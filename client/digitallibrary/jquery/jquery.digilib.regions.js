/** optional digilib regions plugin

markup a digilib image with rectangular regions

TODO:
- store region in params/cookie, regarding zoom, mirror, rotation (like marks)
- set regions programmatically
- read regions from params/cookie and display
- backlink mechanism
- don't write to data.settings?
*/

(function($) {
    // the data object passed by digilib
    var data;
    var buttons;
    var fn;
    // affine geometry plugin stub
    var geom;

    var FULL_AREA;

    var buttons = {
        addregion : {
            onclick : "setRegion",
            tooltip : "set a region",
            icon : "addregion.png"
            },
        delregion : {
            onclick : "removeRegion",
            tooltip : "delete the last region",
            icon : "delregion.png"
            },
        regions : {
            onclick : "toggleRegions",
            tooltip : "show or hide regions",
            icon : "regions.png"
            },
        regioninfo : {
            onclick : "infoRegions",
            tooltip : "information about regions",
            icon : "regioninfo.png"
            }
        };

    var defaults = {
        // are regions shown?
        'isRegionVisible' : true,
        // buttonset of this plugin
        'regionSet' : ['addregion', 'delregion', 'regions', 'regioninfo', 'lessoptions'],
        // array of defined regions
        'regions' : []
    };

    var actions = { 
        // define a region interactively with two clicked points
        "setRegion" : function(data) {
            var $elem = data.$elem;
            var $scaler = data.$scaler;
            var picRect = geom.rectangle($scaler);
            var pt1, pt2;
            // TODO: temporary rectangle only, pass values to "addRegion" factory
            var $tempDiv = $('<div class="region" style="display:none"/>');
            $elem.append($tempDiv);

            var regionStart = function (evt) {
                pt1 = geom.position(evt);
                // setup and show zoom div
                pt1.adjustDiv($tempDiv);
                $tempDiv.width(0).height(0);
                $tempDiv.show();
                // register events
                $elem.bind("mousemove.dlRegion", regionMove);
                $elem.bind("mouseup.dlRegion", regionEnd);
                return false;
            };

            // mouse move handler
            var regionMove = function (evt) {
                pt2 = geom.position(evt);
                var rect = geom.rectangle(pt1, pt2);
                rect.clipTo(picRect);
                // update zoom div
                rect.adjustDiv($tempDiv);
                return false;
            };

            // mouseup handler: end moving
            var regionEnd = function (evt) {
                pt2 = geom.position(evt);
                // assume a click and continue if the area is too small
                var clickRect = geom.rectangle(pt1, pt2);
                if (clickRect.getArea() <= 5) return false;
                // unregister events
                $elem.unbind("mousemove.dlRegion", regionMove);
                $elem.unbind("mouseup.dlRegion", regionEnd);
                // clip and transform
                clickRect.clipTo(picRect);
                clickRect.adjustDiv($tempDiv);
                $tempDiv.remove();
                data.settings.regions.push(clickRect);
                // fn.redisplay(data);
                return false;
            };

            // clear old handler (also ZoomDrag)
            $scaler.unbind('.dlRegion');
            $elem.unbind('.dlRegion');
            // bind start zoom handler
            $scaler.one('mousedown.dlRegion', regionStart);
        },

        // remove the last added region
        "removeRegion" : function (data) {
            var $regionDiv = data.settings.regions.pop();
            $regionDiv.remove();
            // fn.redisplay(data);
        },

        // add a region programmatically
        "addRegion" : function(data, pos, url) {
            // TODO: backlink mechanism
            if (pos.length === 4) {
                // TODO: trafo
                var $regionDiv = $('<div class="region" style="display:none"/>');
                $regionDiv.attr("id", "region" + i);
                var regionRect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
                regionRect.adjustDiv($regionDiv);
                if (!data.regions) {
                    data.regions = [];
                    }
                data.regions.push($regionDiv);
            }
        }
    };

    var addRegion = actions.addRegion;

    var realizeRegions = function (data) { 
        // create regions from parameters
        var settings = data.settings;
        var rg = settings.rg;
        var regions = rg.split(",");
        for (var i = 0; i < regions.length ; i++) {
            var pos = regions.split("/", 4);
            // TODO: backlink mechanism
            var url = paramString.match(/http.*$/);
            addRegion(data, pos, url);
            }
    };

    // display current regions
    var renderRegions = function (data) { 
        var regions = data.regions;
        for (var i = 0; i < regions.length; i++) {
            var region = regions[i];
            if (data.zoomArea.containsPosition(region)) {
                var rpos = data.imgTrafo.transform(region);
                console.debug("renderRegions: rpos=", rpos);
                // create region
                var $regionDiv = $('<div class="region" style="display:none"/>');
                $regionDiv.attr("id", "region" + data.regions.length);
                $elem.append($regionDiv);
                rpos.adjustDiv($regionDiv);
                }
            }
    };

    var serializeRegions = function (data) {
        if (data.regions) {
            settings.rg = '';
            for (var i = 0; i < data.regions.length; i++) {
                if (i) {
                    settings.rg += ',';
                    }
                settings.rg +=
                    cropFloat(data.regions[i].x).toString() + '/' + 
                    cropFloat(data.regions[i].y).toString() + '/' +
                    cropFloat(data.regions[i].width).toString() + '/' +
                    cropFloat(data.regions[i].height).toString();
                }
            }
    };

    var handleSetup = function (evt) {
        console.debug("regions: handleSetup");
        data = this;
//        if (data.settings.isBirdDivVisible) {
//            setupBirdDiv(data);
//            data.$birdDiv.show();
//        }
    };

    var handleUpdate = function (evt) {
        console.debug("regions: handleUpdate");
        data = this;
//        if (data.settings.isBirdDivVisible) {
//            renderBirdArea(data);
//            setupBirdDrag(data);
//        }
    };

    var handleRedisplay = function (evt) {
        console.debug("regions: handleRedisplay");
        data = this;
//        if (data.settings.isBirdDivVisible) {
//            updateBirdDiv(data);
//        }
    };

    var handleDragZoom = function (evt, zoomArea) {
        console.debug("regions: handleDragZoom, zoomArea:", zoomArea);
        data = this;
//        if (data.settings.isBirdDivVisible) {
//            setBirdZoom(data, zoomArea);
//        }
    };

    // plugin installation called by digilib on plugin object.
    var install = function(digilib) {
        // import geometry classes
        geom = digilib.fn.geometry;
        FULL_AREA = geom.rectangle(0,0,1,1);
        // add defaults
        $.extend(digilib.defaults, defaults);
        // add actions
        $.extend(digilib.actions, actions);
        // add buttons
        $.extend(digilib.buttons, buttons);
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising regions plugin. data:', data);
        var $data = $(data);
        var buttonSettings = data.settings.buttonSettings.fullscreen;
        // configure buttons through digilib "regionSet" option
        var buttonSet = data.settings.regionSet || regionSet; 
        // set regionSet to [] or '' for no buttons (when showing regions only)
        if (buttonSet.length && buttonSet.length > 0) {
            buttonSettings['regionSet'] = buttonSet;
            buttonSettings.buttonSets.push('regionSet');
            }
        // install event handler
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
        $data.bind('redisplay', handleRedisplay);
        $data.bind('dragZoom', handleDragZoom);
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var pluginProperties = {
            name : 'region',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.birdview must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', pluginProperties);
    }
})(jQuery);
