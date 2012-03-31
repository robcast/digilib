/** optional digilib regions plugin

Mark up a digilib image with rectangular regions.

If hasRegionInfo=true reads regions from page HTML.
Element with regions has to be in digilib element, e.g.

<map class="dl-keep dl-regioncontent">
   <area href="http://www.mpiwg-berlin.mpg.de" coords="0.1,0.1,0.4,0.1" alt="MPI fuer Wissenschaftsgeschichte"/>
   <area href="http://www.biblhertz.it" coords="0.5,0.8,0.4,0.1" alt="Bibliotheca Hertziana"/>
   <area coords="0.3,0.5,0.15,0.1" />
</map>

*/

(function($) {
    // the digilib object
    var digilib = null;
    // the functions made available by digilib
    var fn = {
        // dummy function to avoid errors, gets overwritten by buttons plugin
        highlightButtons : function () {
            console.debug('regions: dummy function - highlightButtons');
            }
        };
    // affine geometry plugin
    var geom = null;

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
            onclick : "showRegionInfo",
            tooltip : "show information about regions",
            icon : "regioninfo.png"
            }
        };

    var defaults = {
        // are regions shown?
        'isRegionVisible' : true,
        // are region numbers shown?
        'showRegionNumbers' : true,
        // is there region content in the page?
        'processHtmlRegions' : false,
        // region defined by users and in the URL
        'processUserRegions' : true,
        // turn any region into a clickable link to its detail view
        'autoZoomRegionLinks' : false,
        // use full region as klickable link (instead of only number and text)
        'fullRegionLinks' : false,
        // css selector for area elements (should additionally be marked with class "keep")
        'regionContentSelector' : 'map.dl-regioncontent area',
        // buttonset of this plugin
        'regionSet' : ['regions', 'addregion', 'delregion', 'regioninfo', 'lessoptions'],
        // url param for regions
        'rg' : null
        };

    var actions = { 

        // define a region interactively with two clicked points
        defineRegion : function(data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var cssPrefix = data.settings.cssPrefix;
            var $elem = data.$elem;
            var $body = $('body');
            var bodyRect = geom.rectangle($body);
            var $scaler = data.$scaler;
            var scalerRect = geom.rectangle($scaler);
            var pt1, pt2;
            // overlay prevents other elements from reacting to mouse events 
            var $overlay = $('<div class="'+cssPrefix+'overlay" style="position:absolute"/>');
            $body.append($overlay);
            bodyRect.adjustDiv($overlay);
            var $regionDiv = addRegionDiv(data, data.regions.length);

            // mousedown handler: start sizing
            var regionStart = function (evt) {
                pt1 = geom.position(evt);
                // setup and show zoom div
                pt1.adjustDiv($regionDiv);
                $regionDiv.width(0).height(0);
                $regionDiv.show();
                // register mouse events
                $overlay.on("mousemove.dlRegion", regionMove);
                $overlay.on("mouseup.dlRegion", regionEnd);
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
                $overlay.off("mousemove.dlRegion", regionMove);
                $overlay.off("mouseup.dlRegion", regionEnd);
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
        removeRegion : function (data) {
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
        toggleRegions : function (data) {
            var show = !data.settings.isRegionVisible;
            data.settings.isRegionVisible = show;
            fn.highlightButtons(data, 'regions', show);
            renderRegions(data, 1);
        },

        // show region info in a window
        showRegionInfo : function (data) {
            var $elem = data.$elem;
            var cssPrefix = data.settings.cssPrefix;
            var infoselector = '#'+cssPrefix+'regionInfo';
            if (fn.find(data, infoselector)) {
                fn.withdraw($info);
                return;
                }
            var html = '\
                <div id="'+cssPrefix+'regionInfo" class="'+cssPrefix+'keep '+cssPrefix+'regionInfo">\
                    <table class="'+cssPrefix+'infoheader">\
                        <tr>\
                            <td class="'+cssPrefix+'infobutton html">HTML</td>\
                            <td class="'+cssPrefix+'infobutton svgattr">SVG</td>\
                            <td class="'+cssPrefix+'infobutton csv">CSV</td>\
                            <td class="'+cssPrefix+'infobutton digilib">Digilib</td>\
                            <td class="'+cssPrefix+'infobutton x">X</td>\
                        </tr>\
                    </table>\
                </div>';
            $info = $(html);
            $info.appendTo($elem);
            $info.append(regionInfoHTML(data));
            $info.append(regionInfoSVG(data));
            $info.append(regionInfoCSV(data));
            $info.append(regionInfoDigilib(data));
            var bind = function(name) {
                $info.find('.'+name).on('click.regioninfo', function () {
                    $info.find('div.'+cssPrefix+'info').hide();
                    $info.find('div.'+cssPrefix+name).show();
                    fn.centerOnScreen(data, $info);
                    });
                };
            bind('html');
            bind('svgattr');
            bind('csv');
            bind('digilib');
            $info.find('.x').on('click.regioninfo', function () {
                fn.withdraw($info);
                });
            $info.fadeIn();
            fn.centerOnScreen(data, $info);
        }
    };

    // store a region div
    var storeRegion = function (data, $regionDiv) {
        var regions = data.regions;
        var rect = geom.rectangle($regionDiv);
        var regionRect = data.imgTrafo.invtransform(rect);
        regionRect.$div = $regionDiv;
        regions.push(regionRect);
        console.debug("regions", data.regions, "regionRect", regionRect);
    };

    // html for later insertion
    var regionInfoHTML = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'html"/>');
        $infoDiv.append($('<div/>').text('<map class="'+cssPrefix+'keep '+cssPrefix+'regioncontent">'));
        $.each(data.regions, function(index, r) {
            var area = [
                fn.cropFloatStr(r.x),
                fn.cropFloatStr(r.y),
                fn.cropFloatStr(r.width),
                fn.cropFloatStr(r.height)].join(',');
            $infoDiv.append($('<div/>').text('<area coords="' + area + '"/>'));
            });
        $infoDiv.append($('<div/>').text('</map>'));
        return $infoDiv;
    };

    // SVG-style
    var regionInfoSVG = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'svgattr"/>');
        $.each(data.regions, function(index, r) {
            var area = [
                fn.cropFloatStr(r.x),
                fn.cropFloatStr(r.y),
                fn.cropFloatStr(r.width),
                fn.cropFloatStr(r.height)].join(' ');
            $infoDiv.append($('<div/>').text('"' + area + '"'));
            });
        return $infoDiv;
    };

    // SVG-style
    var regionInfoCSV = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'csv"/>');
        $.each(data.regions, function(index, r) {
            var area = [
                fn.cropFloatStr(r.x),
                fn.cropFloatStr(r.y),
                fn.cropFloatStr(r.width),
                fn.cropFloatStr(r.height)].join(',');
                $infoDiv.append($('<div/>').text(index+1 + ": " + area));
            });
        return $infoDiv;
    };
    // digilib-style
    var regionInfoDigilib = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'digilib"/>');
        $.each(data.regions, function(index, r) {
            var area = r.toString();
            $infoDiv.append($('<div/>').text(area));
            });
        return $infoDiv;
    };

    // add a region to data.$elem
    var addRegionDiv = function (data, index, attributes) {
        var settings = data.settings;
        var cssPrefix = settings.cssPrefix;
        var nr = index + 1; // we count regions from 1
        var $regionDiv = $('<div class="'+cssPrefix+'region '+cssPrefix+'overlay" style="display:none"/>');
        data.$elem.append($regionDiv);
        if (settings.showRegionNumbers) {
            var $regionLink = $('<a class="'+cssPrefix+'regionnumber">'+nr+'</a>');
            if (attributes) $regionLink.attr(attributes);
            $regionDiv.append($regionLink);
        }
        var url = null;
        if (attributes) {
            // copy attributes to div except href
            if (attributes.href) {
                url = attributes.href;
                // copy attributes
                var attrs = $.extend({}, attributes);
                delete attrs.href;
                $regionDiv.attr(attrs);
            } else {
                $regionDiv.attr(attributes);
            }
        }
        if (settings.autoZoomRegionLinks || settings.fullRegionLinks) {
            // handle click events on div
            var region = data.regions[index];
            $regionDiv.on('click.dlRegion', function(evt) {
                if (settings.fullRegionLinks && url) {
                    //TODO: how about target?
                    window.location = url;
                } 
                if (evt.target !== $regionDiv.get(0)) {
                    // this was not our event
                    return;
                }
                if (settings.autoZoomRegionLinks) {
                    // zoom to region
                    digilib.actions.zoomArea(data, region);
                }
            });
        }
        return $regionDiv;
    };

    // create a region div from the data.regions array
    var createRegionDiv = function (data, regions, index, attributes) {
        var region = regions[index];
        // check if div exists
        if (region.$div != null) return region.$div;
        // create and add div
        var $regionDiv = addRegionDiv(data, index, attributes);
        region.$div = $regionDiv;
        return $regionDiv;
    };

    // create regions from URL parameters
    var createRegionsFromURL = function (data) {
        unpackRegions(data);
        var regions = data.regions;
        $.each(regions, function(i) {
            createRegionDiv(data, regions, i);
        });
    };

    // create regions from HTML
    var createRegionsFromHTML = function (data) {
        var regions = data.regions;
        // regions are defined in "area" tags
        var $content = data.$elem.find(data.settings.regionContentSelector);
        console.debug("createRegionsFromHTML. elems: ", $content);
        $content.each(function(index, a) {
            var $a = $(a); 
            // the "coords" attribute contains the region coords (0..1)
            var coords = $a.attr('coords');
            var pos = coords.split(',', 4);
            var rect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
            rect.fromHtml = true;
            regions.push(rect);
            // copy some attributes
            var attributes = {};
            for (var n in {'id':1, 'href':1, 'title':1, 'target':1, 'style':1}) {
                attributes[n] = $a.attr(n);
            }
            // create the div
            var $regionDiv = createRegionDiv(data, regions, index, attributes);
            var $contents = $a.contents().clone();
            if (attributes.href != null) {
                // wrap contents in a-tag
                var $ca = $('<a href="'+attributes.href+'"/>');
                $ca.append($contents);
                // alt attribute is also content (BTW: area-tag has no content())
                $ca.append($a.attr('alt'));
                $regionDiv.append($ca);
            } else {
                $regionDiv.append($contents);
                // alt attribute is also content (BTW: area-tag has no content())
                $regionDiv.append($a.attr('alt'));
            }
        });
    };

    // show a region on top of the scaler image 
    var renderRegion = function (data, index, anim) {
        if (!data.imgTrafo) return;
        var regions = data.regions;
        var zoomArea = data.zoomArea;
        if (index > regions.length) return;
        var region = regions[index];
        var $regionDiv = region.$div;
        if (!$regionDiv) {
            console.error("renderRegion: region has no $div", region);
            // alert("renderRegion: region has no $div to show");
            return;
        }
        var regionRect = region.copy();
        var show = data.settings.isRegionVisible;
        if (show && zoomArea.overlapsRect(regionRect)) {
            regionRect.clipTo(zoomArea);
            var screenRect = data.imgTrafo.transform(regionRect);
            console.debug("renderRegion: pos=",geom.position(screenRect));
            if (anim) {
                $regionDiv.fadeIn();
            } else{
                $regionDiv.show();
            }
            // adjustDiv sets wrong coords when called BEFORE show()
            screenRect.adjustDiv($regionDiv);
        } else {
            if (anim) {
                $regionDiv.fadeOut();
            } else{
                $regionDiv.hide();
            }
        }
    };

    // show regions 
    var renderRegions = function (data, anim) {
        for (var i = 0; i < data.regions.length ; i++) {
            renderRegion(data, i, anim);
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
            }
    };

    // pack regions array into a parameter string
    var packRegions = function (data) {
        var regions = data.regions;
        if (!regions.length) {
            data.settings.rg = null;
            return;
        }
        var rg = '';
        for (var i = 0; i < regions.length; i++) {
            var region = regions[i];
            // skip regions from HTML
            if (region.fromHtml != null) continue;
            if (rg) {
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

    // reload display after a region has been added or removed
    var redisplay = function (data) {
        if (data.settings.processUserRegions) {
            packRegions(data);
        }
        fn.redisplay(data);
    };

    // event handler, reads region parameter and creates region divs
    var handleSetup = function (evt) {
        var data = this;
        var settings = data.settings;
        console.debug("regions: handleSetup", settings.rg);
        // regions with content are given in HTML divs
        if (settings.processHtmlRegions) {
            createRegionsFromHTML(data);
        }
        // regions are defined in the URL
        if (settings.processUserRegions) {
            createRegionsFromURL(data);
        }
    };

    // event handler, sets buttons and shows regions when scaler img is reloaded
    var handleUpdate = function (evt) {
        var data = this;
        console.debug("regions: handleUpdate");
        var settings = data.settings;
        fn.highlightButtons(data, 'regions' , settings.isRegionVisible);
        renderRegions(data);
    };

    // additional buttons
    var installButtons = function (data) {
        var settings = data.settings;
        var mode = settings.interactionMode;
        var buttonSettings = settings.buttonSettings[mode];
        // configure buttons through digilib "regionSet" option
        var buttonSet = settings.regionSet || regionSet; 
        // set regionSet to [] or '' for no buttons (when showing regions only)
        if (buttonSet.length && buttonSet.length > 0) {
            buttonSettings.regionSet = buttonSet;
            buttonSettings.buttonSets.push('regionSet');
            }
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing regions plugin. digilib:', digilib);
        // import digilib functions
        $.extend(fn, digilib.fn);
        // import geometry classes
        geom = fn.geometry;
        // add defaults, actions, buttons
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising regions plugin. data:', data);
        var $elem = data.$elem;
        var settings = data.settings;
        var cssPrefix = data.settings.cssPrefix;
        // regions array
        data.regions = [];
        // install event handlers
        var $data = $(data);
        $data.on('setup', handleSetup);
        $data.on('update', handleUpdate);
        // install buttons
        if (settings.processUserRegions) {
            // add "rg" to digilibParamNames
            settings.digilibParamNames.push('rg');
            if (digilib.plugins.buttons != null) {
                installButtons(data);
            }
        }
    };

    // plugin object with name and install/init methods
    // shared objects filled by digilib on registration
    var pluginProperties = {
            name : 'regions',
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
