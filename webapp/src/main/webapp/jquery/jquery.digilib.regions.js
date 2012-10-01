/** optional digilib regions plugin

Mark up a digilib image with rectangular regions.

If hasRegionInfo=true reads regions from page HTML.
Element with regions has to be in digilib element, e.g.

<map class="dl-keep dl-regioncontent">
   <area href="http://www.mpiwg-berlin.mpg.de" coords="0.1,0.1,0.4,0.1" alt="MPI fuer Wissenschaftsgeschichte"/>
   <area href="http://www.biblhertz.it" coords="0.5,0.8,0.4,0.1" alt="Bibliotheca Hertziana"/>
   <area coords="0.3,0.5,0.15,0.1" />
</map>

According to the HTML specs, "area" and "a" elements are allowed inside of a "map".
Both can have a "coords" attribute, but "area" elements can't contain child nodes.
To have regions with content use "a" tags, e.g.

<map class="dl-keep dl-regioncontent">
   <a href="http://www.mpiwg-berlin.mpg.de" coords="0.4907,0.3521,0.1458,0.107">
       MPI fuer Wissenschaftsgeschichte
   </a>
   <a href="http://www.biblhertz.it" coords="0.3413,0.2912,0.4345,0.2945">
       Bibliotheca Hertziana
   </a>
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
        defineurlregion : {
            onclick : "defineURLRegion",
            tooltip : "define a region",
            icon : "addregion.png"
            },
        removeurlregion : {
            onclick : "removeURLRegion",
            tooltip : "delete the last region",
            icon : "delregion.png"
            },
        removeallurlregions : {
            onclick : "removeAllURLRegions",
            tooltip : "delete all regions",
            icon : "delallregions.png"
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
        // are regions being edited?
        'editRegions' : false,
        // are regions shown?
        'isRegionVisible' : true,
        // are region numbers shown?
        'showRegionNumbers' : true,
        // is there region content in the page?
        'processHtmlRegions' : false,
        // region defined by users and in the URL
        'processUserRegions' : true,
        // callback for click on region
        'onClickRegion' : null,
        // turn any region into a clickable link to its detail view (DEPRECATED)
        'autoZoomOnClick' : false,
        // css selector for area elements (must also be marked with class "dl-keep")
        'htmlRegionsSelector' : 'map.dl-regioncontent area, map.dl-regioncontent a',
        // buttonset of this plugin
        'regionSet' : ['regions', 'defineurlregion', 'removeurlregion', 'removeallurlregions', 'regioninfo', 'lessoptions'],
        // url param for regions
        'rg' : null,
        // region attributes to copy from HTML
        'regionAttributes' : {
            'id'    :1,
            'href'  :1,
            'title' :1,
            'target':1,
            'style' :1,
            'class' :1
            }
        };

    var actions = { 

        // define a region interactively with two clicked points
        defineURLRegion : function(data) {
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
            var attr = {'class' : cssPrefix+"regionURL"};
            var $regionDiv = addRegionDiv(data, data.regionsURL, data.regionsURL.length, attr);

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
                storeURLRegion(data, $regionDiv);
                // fn.redisplay(data);
                fn.highlightButtons(data, 'addregion', 0);
                redisplay(data);
                return false;
            };

            // bind start zoom handler
            $overlay.one('mousedown.dlRegion', regionStart);
            fn.highlightButtons(data, 'addregion', 1);
        },

        // remove the last added URL region
        removeURLRegion : function (data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var r = data.regionsURL.pop();
            // no more URL regions to delete
            if (r == null) return;
            var $regionDiv = r.$div;
            $regionDiv.remove();
            redisplay(data);
        },

        // remove all manually added regions (defined through URL "rg" parameter)
        removeAllURLRegions : function (data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var cssPrefix = data.settings.cssPrefix;
            var $regions = data.$elem.find('div.'+cssPrefix+'regionURL');
            $regions.remove();
            data.regionsURL = []; // remove only URL regions
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
        },

        // show region coordinates in an edit line
        showRegionCoords : function (data) {
            var $elem = data.$elem;
            var cssPrefix = data.settings.cssPrefix;
            var infoselector = '#'+cssPrefix+'regionInfo';
            if (fn.find(data, infoselector)) {
                fn.withdraw($info);
                return;
                }
            var html = '\
                <div id="'+cssPrefix+'regionInfo" class="'+cssPrefix+'keep '+cssPrefix+'regionInfo">\
                    <input name="coords" type="text" size="30" maxlength="40"/>\
                    <input type="button" name="close" />\
                </div>';
            $info = $(html);
            $info.appendTo($elem);
            var bind = function(name) {
                $info.find('.'+name).on('click.regioninfo', function () {
                    $info.find('div.'+cssPrefix+'info').hide();
                    $info.find('div.'+cssPrefix+name).show();
                    fn.centerOnScreen(data, $info);
                    });
                };
            $info.bind('button').on('click.regioninfo', function () {
                fn.withdraw($info);
                });
            $info.fadeIn();
            fn.centerOnScreen(data, $info);
        }

    };

    // store a region div
    var storeURLRegion = function (data, $regionDiv) {
        var regions = data.regionsURL;
        var rect = geom.rectangle($regionDiv);
        var rectangle = data.imgTrafo.invtransform(rect);
        rectangle.$div = $regionDiv;
        regions.push(rectangle);
        console.debug("storeURLregion", data.regionsURL, "rectangle", rectangle);
    };

    // open region as detail
    var openDetail = function (data, region) {
        digilib.actions.zoomArea(data, region);
    };

    // make a coords string
    var regionCoordsString = function (rect, sep) {
        return [
        fn.cropFloatStr(rect.x),
        fn.cropFloatStr(rect.y),
        fn.cropFloatStr(rect.width),
        fn.cropFloatStr(rect.height)
        ].join(sep);
    };

    // html for later insertion
    var regionInfoHTML = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'html"/>');
        $infoDiv.append($('<div/>').text('<map class="'+cssPrefix+'keep '+cssPrefix+'regioncontent">'));
        $.each(data.regionsURL, function(index, r) {
            var coords = regionCoordsString(r, ',');
            $infoDiv.append($('<div/>').text('<area coords="' + coords + '"/>'));
            });
        $infoDiv.append($('<div/>').text('</map>'));
        return $infoDiv;
    };

    // SVG-style
    var regionInfoSVG = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'svgattr"/>');
        $.each(data.regionsURL, function(index, r) {
            var coords = regionCoordsString(r, ' ');
            $infoDiv.append($('<div/>').text('"' + coords + '"'));
            });
        return $infoDiv;
    };

    // CSV-style
    var regionInfoCSV = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'csv"/>');
        $.each(data.regionsURL, function(index, r) {
            var coords = regionCoordsString(r, ',');
            $infoDiv.append($('<div/>').text(index+1 + ": " + coords));
            });
        return $infoDiv;
    };

    // digilib-style (h,w@x,y)
    var regionInfoDigilib = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'digilib"/>');
        $.each(data.regionsURL, function(index, r) {
            if (r.fromHtml) return;
            var coords = r.toString();
            $infoDiv.append($('<div/>').text(coords));
            });
        return $infoDiv;
    };

    // add a region to data.$elem
    var addRegionDiv = function (data, regions, index, attributes) {
        var settings = data.settings;
        var cssPrefix = settings.cssPrefix;
        // var nr = regions.length; // we count regions from 1
        var cls = cssPrefix+'region '+cssPrefix+'overlay';
        if (attributes && attributes['class']) {
            cls = cls+' '+attributes['class'];
            delete attributes['class'];
            }
        var $regionDiv = $('<div class="'+cls+'" style="display:none"/>');
        data.$elem.append($regionDiv);
        if (settings.showRegionNumbers) {
            var $regionLink = $('<a class="'+cssPrefix+'regionnumber">'+index+'</a>');
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
        // DEPRECATED
        if (settings.autoZoomOnClick) {
            if (settings.onClickRegion == null) settings.onClickRegion = openDetail;
        }
        // handle click events on div
        var region = regions[index];
        $regionDiv.on('click.dlRegion', function(evt) {
            if (settings.fullRegionLinks && url) {
                //TODO: how about target?
                window.location = url;
            } 
            if (evt.target !== $regionDiv.get(0)) {
                // this was not our event
                return;
            }
            if (typeof settings.onClickRegion === 'function') {
                // execute callback
                settings.onClickRegion(data, region);
            }
        });
        return $regionDiv;
    };

    // create a region div from the data.regions array
    var createRegionDiv = function (data, regions, index, attributes) {
        var region = regions[index];
        // check if div exists
        if (region.$div != null) return region.$div;
        // create and add div
        var $regionDiv = addRegionDiv(data, regions, index, attributes);
        region.$div = $regionDiv;
        return $regionDiv;
    };

    // create regions from URL parameters
    var createRegionsFromURL = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var attr = {'class' : cssPrefix+"regionURL"};
        unpackRegions(data);
        var regions = data.regionsURL;
        $.each(regions, function(index, region) {
            createRegionDiv(data, regions, index, attr);
        });
    };

    // create regions from HTML
    var createRegionsFromHTML = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var regions = data.regionsHTML;
        // regions are defined in "area" tags
        var $content = data.$elem.find(data.settings.htmlRegionsSelector);
        console.debug("createRegionsFromHTML. Number of elems: ", $content.length);
        $content.each(function(index, area) {
            var $area = $(area); 
            // the "coords" attribute contains the region coords (0..1)
            var coords = $area.attr('coords');
            var pos = coords.split(',', 4);
            var rect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
            rect.fromHtml = true;
            regions.push(rect);
            // copy some attributes
            var attributes = {};
            for (var n in data.settings.regionAttributes) {
                attributes[n] = $area.attr(n);
            }
            // mark div as regionHTML
            regionClass = cssPrefix+'regionHTML';
            if (attributes['class']) {
                attributes['class'] += ' ' + regionClass
            } else {
                attributes['class'] = regionClass
            }
            // create the div
            var $regionDiv = createRegionDiv(data, regions, index, attributes);
            var $contents = $area.contents().clone();
            if (attributes.href != null) {
                // wrap contents in a-tag
                var $ca = $('<a href="'+attributes.href+'"/>');
                $ca.append($contents);
                // alt attribute is also content (BTW: area-tag has no content())
                $ca.append($area.attr('alt'));
                $regionDiv.append($ca);
            } else {
                $regionDiv.append($contents);
                // alt attribute is also content (BTW: area-tag has no content())
                $regionDiv.append($area.attr('alt'));
            }
        });
    };

    // show a region on top of the scaler image 
    var renderRegion = function (data, region, anim) {
        if (!data.imgTrafo) return;
        var zoomArea = data.zoomArea;
        var $regionDiv = region.$div;
        if (!$regionDiv) {
            console.error("renderRegion: region has no $div", region);
            // alert("renderRegion: region has no $div to show");
            return;
        }
        var regionRect = region.copy();
        var show = data.settings.isRegionVisible;
        if (show && zoomArea.overlapsRect(regionRect) && !regionRect.containsRect(zoomArea)) {
            regionRect.clipTo(zoomArea);
            var screenRect = data.imgTrafo.transform(regionRect);
            // console.debug("renderRegion: pos=",geom.position(screenRect));
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
        $.each(data.regionsHTML, function(index, region) {
            renderRegion(data, region, anim);
            });
        $.each(data.regionsURL, function(index, region) {
            renderRegion(data, region, anim);
            });
    };

    var unpackRegions = function (data) { 
        // create regions from parameters
        var rg = data.settings.rg;
        if (rg == null) return;
        var regions = data.regionsURL;
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
        var regions = data.regionsURL;
        if (!regions.length) {
            data.settings.rg = null;
            return;
        }
        var rg = '';
        for (var i = 0; i < regions.length; i++) {
            var region = regions[i];
            if (rg) {
                rg += ',';
            }
            rg += regionCoordsString(region, '/');
        }
        data.settings.rg = rg;
        console.debug('pack regions:', rg);
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
        // region arrays
        data.regionsURL = [];
        data.regionsHTML = [];
        // install event handlers
        var $data = $(data);
        $data.on('setup', handleSetup);
        $data.on('update', handleUpdate);
        // install buttons
        if (settings.processUserRegions) {
            // add "rg" to digilibParamNames: TODO - check with settings.additionalParamNames?
            // settings.digilibParamNames.push('rg');
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
