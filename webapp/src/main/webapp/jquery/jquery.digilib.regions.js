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
    // the normal zoom area
    var FULL_AREA = null;
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
        defineregion : {
            onclick : "defineUserRegion",
            tooltip : "define a region",
            icon : "addregion.png"
            },
        removeregion : {
            onclick : "removeUserRegion",
            tooltip : "delete the last user defined region",
            icon : "delregion.png"
            },
        removeallregions : {
            onclick : "removeAllUserRegions",
            tooltip : "delete all user defined regions",
            icon : "delallregions.png"
            },
        regions : {
            onclick : "toggleRegions",
            tooltip : "show or hide regions",
            icon : "regions.png"
            },
        findcoords : {
            onclick : "findCoords",
            tooltip : "find coords and display as a new region",
            icon : "regions.png"
            },
        regioninfo : {
            onclick : "showRegionInfo",
            tooltip : "show information about user defined regions",
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
        // default width for region when only point is given
        'regionWidth' : 0.005,
        // is there region content in the page?
        'processHtmlRegions' : false,
        // region defined by users and in the URL
        'processUserRegions' : true,
        // callback for click on region
        'onClickRegion' : null,
        // callback when new user region is defined
        'onNewRegion' : null,
        // turn any region into a clickable link to its detail view (DEPRECATED)
        'autoZoomOnClick' : false,
        // css selector for area/a elements (must also be marked with class "dl-keep")
        'htmlRegionsSelector' : 'map.dl-regioncontent area, map.dl-regioncontent a',
        // buttonset of this plugin
        'regionSet' : ['regions', 'defineregion', 'removeregion', 'removeallregions', 'regioninfo', 'findcoords', 'lessoptions'],
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
        defineUserRegion : function(data) {
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
            var $regionDiv = addRegionDiv(data, data.userRegions, data.userRegions.length, attr);

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
                var region = storeUserRegion(data, $regionDiv);
                // fn.redisplay(data);
                fn.highlightButtons(data, 'defineregion', 0);
                redisplay(data);
                $(data).trigger('newRegion', region);
                return false;
            };

            // bind start zoom handler
            $overlay.one('mousedown.dlRegion', regionStart);
            fn.highlightButtons(data, 'defineregion', 1);
        },

        // remove the last added URL region
        removeUserRegion : function (data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var r = data.userRegions.pop();
            // no more URL regions to delete
            if (r == null) return;
            var $regionDiv = r.$div;
            $regionDiv.remove();
            redisplay(data);
        },

        // remove all manually added regions (defined through URL "rg" parameter)
        removeAllUserRegions : function (data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var cssPrefix = data.settings.cssPrefix;
            var $regions = data.$elem.find('div.'+cssPrefix+'regionURL');
            $regions.remove();
            data.userRegions = []; // remove only URL regions
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

        // display region coordinates in an edit line
        showRegionCoords : function (data, region) {
            var $elem = data.$elem;
            var cssPrefix = data.settings.cssPrefix;
            // var infoselector = '#'+cssPrefix+'regionInfo';
            // var $info = fn.find(data, infoselector);
            var coords = regionCoordsString(region, ',');
            var html = '\
                <div id="'+cssPrefix+'regionInfo" class="'+cssPrefix+'keep '+cssPrefix+'regionInfo">\
                    <input name="coords" type="text" size="30" maxlength="40" value="'+coords+'"/>\
                </div>';
            var $info = $(html);
            $info.appendTo($elem);
            $input = $info.find('input');
            $input.on('focus.regioninfo', function (event) {
                this.select();
                });
            $input.on('blur.regioninfo', function (event) {
                fn.withdraw($info);
                return false;
                });
            $input.on('keypress.regioninfo', function (event) {
                fn.withdraw($info);  // OBS: "return false" disables copy!
                });
            $input.prop("readonly",true);
            $info.fadeIn();
            fn.centerOnScreen(data, $info);
            $input.focus();
            console.debug('showRegionCoords', coords);
        },

        // draw a find region from coords and move into view
        regionFromCoords : function (data, coords) {
            var rect = parseCoordsString(data, coords);
            if (rect == null) {
                alert('invalid coordinates: ' + coords);
                return;
                }
            var cssPrefix = data.settings.cssPrefix;
            var attr = { 'class' : cssPrefix+'regionURL '+cssPrefix+'findregion' };
            createRegion(data, data.userRegions, rect, attr);
            var za = data.zoomArea;
            if (!fn.isFullArea(za)) {
                za.setCenter(rect.getCenter()).stayInside(FULL_AREA);
                if (!za.containsRect(rect)) {
                    za = FULL_AREA.copy();
                    }
                fn.setZoomArea(data, za);
                }
            console.debug('regionFromCoords', coords, rect, za);
            redisplay(data);
            },

        // find coordinates and display as new region
        findCoords : function (data) {
            var $elem = data.$elem;
            var cssPrefix = data.settings.cssPrefix;
            var html = '\
                <div id="'+cssPrefix+'regionInfo" class="'+cssPrefix+'keep '+cssPrefix+'regionInfo">\
                    <div>coordinates to find:</div>\
                    <form class="'+cssPrefix+'form">\
                        <div>\
                            <input class="'+cssPrefix+'input" name="coords" type="text" size="30" maxlength="40"/> \
                        </div>\
                        <input class="'+cssPrefix+'submit" type="submit" name="sub" value="Ok"/>\
                        <input class="'+cssPrefix+'cancel" type="button" value="Cancel"/>\
                    </form>\
                </div>';
            var $info = $(html);
            $info.appendTo($elem);
            var $form = $info.find('form');
            var $input = $info.find('input.'+cssPrefix+'input');
            // handle submit
            $form.on('submit', function () {
                var coords = $input.val();
                actions.regionFromCoords(data, coords);
                fn.withdraw($info);
                return false;
            });
            // handle cancel
            $form.find('.'+cssPrefix+'cancel').on('click', function () {
                fn.withdraw($info);
            });
            $info.fadeIn();
            fn.centerOnScreen(data, $info);
            $input.focus();
        }
    };

    // store a region div
    var storeUserRegion = function (data, $regionDiv) {
        var regions = data.userRegions;
        var rect = geom.rectangle($regionDiv);
        var rectangle = data.imgTrafo.invtransform(rect);
        rectangle.$div = $regionDiv;
        regions.push(rectangle);
        console.debug("storeUserRegion", data.userRegions, "rectangle", rectangle);
        return rectangle;
    };

    // open region as detail
    var openDetail = function (data, region) {
        digilib.actions.zoomArea(data, region);
    };

    // make a coords string
    var regionCoordsString = function (rect, sep) {
        if (sep == null) sep = ','; // comma as default separator
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
        $.each(data.userRegions, function(index, r) {
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
        $.each(data.userRegions, function(index, r) {
            var coords = regionCoordsString(r, ' ');
            $infoDiv.append($('<div/>').text('"' + coords + '"'));
            });
        return $infoDiv;
    };

    // CSV-style
    var regionInfoCSV = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'csv"/>');
        $.each(data.userRegions, function(index, r) {
            var coords = regionCoordsString(r, ',');
            $infoDiv.append($('<div/>').text(index+1 + ": " + coords));
            });
        return $infoDiv;
    };

    // digilib-style (h,w@x,y)
    var regionInfoDigilib = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'digilib"/>');
        $.each(data.userRegions, function(index, r) {
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
        if (attributes) {
            // copy attributes to div except href
            if (attributes.href) {
                region.href = attributes.href;
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
            $(data).trigger('regionClick', region);
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

    // create a rectangle from a coords string
    var parseCoordsString = function (data, coords) {
        var pos = coords.match(/[0-9.]+/g); // TODO: check validity?
        if (pos == null) {
            return null;
            }
        var rect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
        if (!fn.isNumber(rect.x) || !fn.isNumber(rect.y)) {
            return null;
            }
        if (!rect.getArea()) {
            var pt = rect.getPosition();
            rect.width = data.settings.regionWidth;
            rect.height = rect.width;
            rect.setCenter(pt);
            }
        return rect;
    };

    // create a regions from a rectangle
    var createRegion = function (data, regions, rect, attributes) {
        var index = regions.length;
        regions.push(rect);
        var $regionDiv = createRegionDiv(data, regions, index, attributes);
        return $regionDiv;
    };

    // create regions from URL parameters
    var createRegionsFromURL = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var attr = {'class' : cssPrefix+"regionURL"};
        unpackRegions(data);
        var regions = data.userRegions;
        $.each(regions, function(index, region) {
            createRegionDiv(data, regions, index, attr);
        });
    };

    // create regions from HTML
    var createRegionsFromHTML = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var regions = data.htmlRegions;
        // regions are defined in "area" tags
        var $content = data.$elem.find(data.settings.htmlRegionsSelector);
        console.debug("createRegionsFromHTML. Number of elems: ", $content.length);
        $content.each(function(index, area) {
            var $area = $(area); 
            // the "coords" attribute contains the region coords (0..1)
            var coords = $area.attr('coords');
            var title = $area.attr('title');
            // create the rectangle
            var rect = parseCoordsString(data, coords);
            if (rect == null) {
                return console.error('bad coords in HTML:', title, coords);
            }
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
            rect.text = title;
            rect.fromHtml = true;
            var $regionDiv = createRegion(data, regions, rect, attributes);
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

    // list of HTML regions matching text in its title attribute
    var matchRegionText = function (data, text) {
        var regions = data.htmlRegions;
        var re = new RegExp(text);
        return $.grep(regions, function(item, index) {
            return re.match(item.text);
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
        $.each(data.htmlRegions, function(index, region) {
            renderRegion(data, region, anim);
            });
        $.each(data.userRegions, function(index, region) {
            renderRegion(data, region, anim);
            });
    };

    // read region data from URL parameters
    var unpackRegions = function (data) { 
        var rg = data.settings.rg;
        if (rg == null) return;
        var regions = data.userRegions;
        var rs = rg.split(",");
        for (var i = 0; i < rs.length; i++) {
            var r = rs[i];
            var pos = r.split("/", 4);
            var rect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
            regions.push(rect);
            }
    };

    // pack user regions array into a URL parameter string
    var packRegions = function (data) {
        var regions = data.userRegions;
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

    // event handler, gets called when a newRegion event is triggered
    var handleNewRegion = function (evt, region) {
        var data = this;
        var settings = data.settings;
        console.debug("regions: handleNewRegion", region);
        if (typeof settings.onNewRegion === 'function') {
            // execute callback
            return settings.onNewRegion(data, region);
            }
        if (typeof settings.onNewRegion === 'string') {
            // execute action
            return actions[settings.onNewRegion](data, region);
        }
    };

    // event handler, gets called when a regionClick event is triggered
    var handleRegionClick = function (evt, region) {
        var data = this;
        var settings = data.settings;
        console.debug("regions: handleRegionClick", region);
        if (region.href) {
            // follow the href attribute of the region area
            window.location = region.href; //TODO: how about target?
        }
        if (typeof settings.onClickRegion === 'function') {
            // execute callback
            return settings.onClickRegion(data, region);
        }
        if (typeof settings.onClickRegion === 'string') {
            // execute action
            return actions[settings.onClickRegion](data, region);
        }
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
        FULL_AREA  = geom.rectangle(0, 0, 1, 1);
        // region arrays
        data.userRegions = [];
        data.htmlRegions = [];
        // install event handlers
        var $data = $(data);
        $data.on('setup', handleSetup);
        $data.on('update', handleUpdate);
        $data.on('newRegion', handleNewRegion);
        $data.on('regionClick', handleRegionClick);
        // install buttons
        if (settings.processUserRegions) {
            // add "rg" to digilibParamNames
            // settings.digilibParamNames.push('rg');
            // TODO: this leads double params, because
            // settings.additionalParamNames is created earlier than this plugin's init() action 
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
