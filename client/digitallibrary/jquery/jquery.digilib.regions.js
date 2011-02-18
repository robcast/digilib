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
    var geom;

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
    var regionSet = ['addregion', 'delregion', 'regions', 'regioninfo', 'lessoptions'];

    var actions = { 
        // define a region interactively with two clicked points
        "setRegion" : function(data) {
            $elem = data.$elem;
            $scaler = data.$scaler;
            var pt1, pt2;
            var $regionDiv = $('<div class="region" style="display:none"/>');
            $regionDiv.attr("id", "region" + data.regions.length);
            $elem.append($regionDiv);
            var picRect = geom.rectangle($scaler);

            var regionStart = function (evt) {
                pt1 = geom.position(evt);
                // setup and show zoom div
                pt1.adjustDiv($regionDiv);
                $regionDiv.width(0).height(0);
                $regionDiv.show();
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
                rect.adjustDiv($regionDiv);
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
                clickRect.adjustDiv($regionDiv);
                data.regions.push($regionDiv);
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
            var $regionDiv = data.regions.pop();
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

    // export constructor functions to digilib plugin
    var init = function (digilibdata) {
        console.log('initialising regions plugin. data:', digilibdata);
        data = digilibdata;
        data.regions = [];
        // setup geometry object
        geom = data.plugins.geometry.init();
        // add buttons and actions from this plugin
        $.extend(this.buttons, buttons);
        $.extend(this.actions, actions);
        var buttonSettings = data.settings.buttonSettings.fullscreen;
        // configure buttons through digilib "regionSet" option
        var buttonSet = data.settings.regionSet || regionSet; 
        // set regionSet to [] or '' for no buttons (when showing regions only)
        if (buttonSet.length && buttonSet.length > 0) {
            buttonSettings['regionSet'] = buttonSet;
            buttonSettings.buttonSets.push('regionSet');
            }
        fn = this.fn;
        // console.log(data.settings.buttonSettings.fullscreen.buttonSets);
        return {
        };
    };
    if ($.fn.digilib == null) {
        $.error("jquery.digilib.regions must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', {name : 'regions', init : init});
    }
})(jQuery);
