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
    // the digilib object
    var digilib;
    // the data object passed by digilib
    var data;
    // the functions made available by digilib
    var fn;
    // affine geometry plugin
    var geom;

    var FULL_AREA;

    var ID_PREFIX = "digilib-region-";

    var buttons = {
        addregion : {
            onclick : "defineRegion",
            tooltip : "define a region",
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
        // are region numbers shown?
        'showRegionNumbers' : false,
        // buttonset of this plugin
        'regionSet' : ['addregion', 'delregion', 'regions', 'regioninfo', 'lessoptions'],
        // url param for regions
        'rg' : null,
        };

    var actions = { 

        // define a region interactively with two clicked points
        "defineRegion" : function(data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var $elem = data.$elem;
            var $body = $('body');
            var bodyRect = geom.rectangle($body);
            var $scaler = data.$scaler;
            var scalerRect = geom.rectangle($scaler);
            var pt1, pt2;
            // overlay prevents other elements from reacting to mouse events 
            var $overlay = $('<div class="digilib-overlay"/>');
            $body.append($overlay);
            bodyRect.adjustDiv($overlay);
             // we count regions from 1
            var $regionDiv = addRegionDiv(data, data.regions.length + 1);

            // mousedown handler: start sizing
            var regionStart = function (evt) {
                pt1 = geom.position(evt);
                // setup and show zoom div
                pt1.adjustDiv($regionDiv);
                $regionDiv.width(0).height(0);
                $regionDiv.show();
                // register mouse events
                $overlay.bind("mousemove.dlRegion", regionMove);
                $overlay.bind("mouseup.dlRegion", regionEnd);
                return false;
            };

            // mousemove handler: size region
            var regionMove = function (evt) {
                pt2 = geom.position(evt);
                var rect = geom.rectangle(pt1, pt2);
                rect.clipTo(scalerRect);
                // update region
                rect.adjustDiv($regionDiv);
                return false;
            };

            // mouseup handler: end sizing
            var regionEnd = function (evt) {
                pt2 = geom.position(evt);
                // assume a click and continue if the area is too small
                var clickRect = geom.rectangle(pt1, pt2);
                if (clickRect.getArea() <= 5) return false;
                // unregister mouse events and get rid of overlay
                $overlay.unbind("mousemove.dlRegion", regionMove);
                $overlay.unbind("mouseup.dlRegion", regionEnd);
                $overlay.remove();
                // clip region
                clickRect.clipTo(scalerRect);
                clickRect.adjustDiv($regionDiv);
                storeRegion(data, $regionDiv);
                // fn.redisplay(data);
                fn.highlightButtons(data, 'addregion', 0);
                redisplay(data);
                return false;
            };

            // bind start zoom handler
            $overlay.one('mousedown.dlRegion', regionStart);
            fn.highlightButtons(data, 'addregion', 1);
        },

        // remove the last added region
        "removeRegion" : function (data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var region = data.regions.pop();
            if (region == null) return;
            var $regionDiv = region.$div; 
            $regionDiv.remove();
            redisplay(data);
        },

        // show/hide regions 
        "toggleRegions" : function (data) {
            var show = !data.settings.isRegionVisible;
            data.settings.isRegionVisible = show;
            fn.highlightButtons(data, 'regions' , show);
            showRegionDivs(data);
        }
    };

    var addRegion = actions.addRegion;

    // store a region div
    var storeRegion = function (data, $regionDiv) {
        var regions = data.regions;
        var rect = geom.rectangle($regionDiv);
        var regionRect = data.imgTrafo.invtransform(rect);
        regionRect.$div = $regionDiv;
        regions.push(regionRect);
        console.debug("regions", data.regions, "regionRect", regionRect);
    };

    // add a region to data.$elem
    var addRegionDiv = function (data, nr) {
        var $regionDiv = $('<div class="region overlay" style="display:none"/>');
        $regionDiv.attr("id", ID_PREFIX + nr);
        data.$elem.append($regionDiv);
        if (data.settings.showRegionNumbers) {
            var $regionNr = $('<div class="regionnumber" />');
            $regionNr.text(nr);
            $regionDiv.append($regionNr);
        }
        return $regionDiv;
    };

    // create a region div from the data.regions collection
    var createRegionDiv = function (data, index) {
        var regions = data.regions;
        if (index > regions.length) return null;
        var region = regions[index];
        var $regionDiv = addRegionDiv(data, index + 1); // we count regions from 1
        region.$div = $regionDiv;
        // TODO store original coords in $regionDiv.data for embedded mode?
        return $regionDiv;
    };

    // create regions 
    var createRegionDivs = function (data) {
        for (var i = 0; i < data.regions.length ; i++) {
            createRegionDiv(data, i);
        }
    };

    // show a region on top of the scaler image 
    var showRegionDiv = function (data, index) {
        if (!data.imgTrafo) return;
        var $elem = data.$elem;
        var regions = data.regions;
        if (index > regions.length) return;
        var region = regions[index]
        var $regionDiv = region.$div;
        if (!$regionDiv) {
            console.debug("showRegionDiv: region has no $div", region);
            // alert("showRegionDiv: region has no $div to show");
            return;
        }
        var regionRect = region.copy();
        var show = data.settings.isRegionVisible;
        if (show && data.zoomArea.overlapsRect(regionRect)) {
            regionRect.clipTo(data.zoomArea);
            var screenRect = data.imgTrafo.transform(regionRect);
            screenRect.adjustDiv($regionDiv);
            $regionDiv.show();
        } else {
            $regionDiv.hide();
        }
    };

    // show regions 
    var showRegionDivs = function (data) {
        for (var i = 0; i < data.regions.length ; i++) {
            showRegionDiv(data, i);
        }
    };

    var unpackRegions = function (data) { 
        // create regions from parameters
        var rg = data.settings.rg;
        if (rg == null) return;
        var regions = data.regions;
        var rs = rg.split(",");
        for (var i = 0; i < rs.length; i++) {
            var r = rs[i];
            var pos = r.split("/", 4);
            var rect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
            regions.push(rect);
            // TODO: backlink mechanism
            // var url = paramString.match(/http.*$/);
            }
    };

    // pack regions array into a parameter string
    var packRegions = function (data) {
        var regions = data.regions;
        if (!regions.length) return;
        var rg = '';
        for (var i = 0; i < regions.length; i++) {
            region = regions[i];
            if (i) {
                rg += ',';
            }
            rg += [
                fn.cropFloatStr(region.x), 
                fn.cropFloatStr(region.y),
                fn.cropFloatStr(region.width),
                fn.cropFloatStr(region.height)
                ].join('/');
        }
        data.settings.rg = rg;
    };

    var redisplay = function (data) {
        packRegions(data);
        fn.redisplay(data);
    }

    var handleSetup = function (evt) {
        data = this;
        console.debug("regions: handleSetup", data.settings.rg);
        unpackRegions(data);
        createRegionDivs(data);
    };

    var handleUpdate = function (evt) {
        data = this;
        fn.highlightButtons(data, 'regions' , data.settings.isRegionVisible);
        showRegionDivs(data);
        console.debug("regions: handleUpdate", data.settings.rg);
    };

    var handleRedisplay = function (evt) {
        data = this;
        showRegionDivs(data);
        console.debug("regions: handleRedisplay");
    };

    var handleDragZoom = function (evt, zoomArea) {
        console.debug("regions: handleDragZoom, zoomArea:", zoomArea);
        data = this;
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing regions plugin. digilib:', digilib);
        fn = digilib.fn;
        // import geometry classes
        geom = fn.geometry;
        FULL_AREA = geom.rectangle(0,0,1,1);
        // add defaults, actions, buttons
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
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
        // regions array
        data.regions = [];
        // add "rg" to digilibParamNames
        data.settings.digilibParamNames.push('rg');
    };

    // plugin object with name and install/init methods
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
        $.error("jquery.digilib.regions must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', pluginProperties);
    }
})(jQuery);
