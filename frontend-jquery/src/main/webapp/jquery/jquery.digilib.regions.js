/*
 * #%L
 * optional digilib regions plugin
 * %%
 * Copyright (C) 2011 - 2013 Bibliotheca Hertziana, MPIWG Berlin
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Authors: Martin Raspe, Robert Casties
 */
/** optional digilib regions plugin

Mark up a digilib image with rectangular regions.

If the parameter "processHtmlRegions" is set, the plugin reads region data from HTML.
Region data should be declared inside in the digilib element, like so:

<map class="dl-keep dl-regioncontent">
   <area href="http://www.mpiwg-berlin.mpg.de" coords="0.1,0.1,0.4,0.1" alt="MPI fuer Wissenschaftsgeschichte"/>
   <area href="http://www.biblhertz.it" coords="0.5,0.8,0.4,0.1" alt="Bibliotheca Hertziana"/>
   <area coords="0.3,0.5,0.15,0.1" />
</map>

According to the HTML specs, "area" and "a" elements are allowed inside of a "map".
Both can have a "coords" attribute, but "area" elements can't contain child nodes.
To have regions with content use "a" tags, like so:.

<map class="dl-keep dl-regioncontent">
   <a href="http://www.mpiwg-berlin.mpg.de" coords="0.4907,0.3521,0.1458,0.107">
       MPI fuer Wissenschaftsgeschichte
   </a>
   <a href="http://www.biblhertz.it" coords="0.3413,0.2912,0.4345,0.2945">
       Bibliotheca Hertziana
   </a>
   <area coords="0.3,0.5,0.15,0.1" />
</map>

Regions can also be defined in Javascript:
Set the parameter "regions" to an array with items.
Each item should be an object containing the following fields:

rect
    a retangle with relative coordinates (0..1);
index (optional)
    a number to display in the region
attributes (optional)
    HTML attributes for the region (id, class, title)
inner (optional)
    inner HTML (has to be a jQuery object)

*/

(function ($) {
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
    // convenience variable, set in init()
    var CSS = '';
    // generate ids
    var IDCOUNT = 20000;

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
            icon : "delregions.png"
            },
        regions : {
            onclick : "toggleRegions",
            tooltip : "show or hide regions",
            icon : "showregions.png"
            },
        findcoords : {
            onclick : "findCoords",
            tooltip : "find a region by entering its relative coordinates",
            icon : "findcoords.png"
            },
        finddata : {
            onclick : "findData",
            tooltip : "find a region by entering text",
            icon : "findregion.png"
            }
        };

    var defaults = {
        // are regions shown?
        'isRegionVisible' : true,
        // are region numbers shown?
        'showRegionNumbers' : true,
        // default width for region when only point is given
        'regionWidth' : 0.005,
        // zoomfactor for displaying larger area around region (for autoZoomOnClick)
        'regionAutoZoomFactor' : 3,
        // is there region content in the page?
        'processHtmlRegions' : false,
        // region defined by users and in the URL
        'processUserRegions' : true,
        // callback for click on region
        'onClickRegion' : null,
        // callback when new user region is defined
        'onNewRegion' : null,
        // turn any region into a clickable link to its detail view
        'autoZoomOnClick' : true,
        // zoom in when displaying the found region
        'autoZoomOnFind' : false,
        // css selector for area/a elements (must also be marked with class "dl-keep")
        'areaSelector' : 'map.dl-regioncontent area, map.dl-regioncontent a',
        // general buttonset of this plugin
        'regionSet' : ['regions', 'finddata', 'findcoords', 'lessoptions', 'moreoptions'],
        // buttonset for region editing by user
        'userRegionSet' : ['defineregion', 'removeregion', 'removeallregions'],
        // url param for regions
        'rg' : null,
        // precalculated array with region data, used by createRegionsFromJS
        'regions' : null,
        // JSON array with region data (x,y,w,h,title,index), used by createRegionsFromJSON
        'regionsJSON' : null,
        // function for extracting the sort string (for the region search window)
        'regionSortString' : null,
        // region attributes to copy from HTML
        'regionAttributes' : {
            'id'    :1,
            'href'  :1,
            'name'  :1,
            'alt'   :1,
            'target':1,
            'title' :1,
            'style' :1
            }
        };

    var actions = { 

        // define a region interactively with two clicked points
        defineUserRegion : function (data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var onComplete = function (data, rect) {
                if (rect == null) return;
                var index = getRegions(data, 'regionURL').length + 1;
                var attr = {'class' : CSS+'regionURL '+CSS+'overlay'};
                var item = {'rect' : rect, 'index' : index, 'attributes' : attr};
                var $regionDiv = addRegionDiv(data, item);
                fn.highlightButtons(data, 'defineregion', 0);
                redisplay(data);
                $(data).trigger('newRegion', [$regionDiv]);
                };
            fn.highlightButtons(data, 'defineregion', 1);
            fn.defineArea(data, onComplete, CSS+'regionArea');
        },

        // remove all findregions or the last added user-defined region
        removeUserRegion : function (data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            // remove highlights
            var selector = 'div.'+CSS+'highlightregion';
            var $highlights = data.$elem.find(selector);
            if ($highlights.length > 0) {
                $highlights.removeClass(CSS+'highlightregion');
                return;
            }
            // remove findregion divs
            selector = 'div.'+CSS+'findregion';
            var $findregions = data.$elem.find(selector);
            if ($findregions.length > 0) {
                $findregions.remove();
                redisplay(data);
                return;
            }
            // remove most recently added user region
            selector = 'div.'+CSS+'regionURL';
            var $region = data.$elem.find(selector).last();
            if ($region.length > 0) {
                $region.remove();
                redisplay(data);
                return;
            }
        },

        // remove all manually added regions (defined through URL "rg" parameter)
        removeAllUserRegions : function (data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var selector = 'div.'+CSS+'regionURL, div.'+CSS+'findregion';
            var $regionDivs = data.$elem.find(selector);
            if ($regionDivs.length == 0) return;
            $regionDivs.remove();
            redisplay(data);
        },

        // show/hide regions 
        toggleRegions : function (data) {
            var show = !data.settings.isRegionVisible;
            data.settings.isRegionVisible = show;
            fn.highlightButtons(data, 'regions', show);
            renderRegions(data, 1);
            return show;
        },

        // display region coordinates in a selected edit line (for copying)
        showRegionCoords : function (data, $regionDiv) {
            var $elem = data.$elem;
            var rect = $regionDiv.data('rect');
            var text = $regionDiv.data('text');
            var coordString = packCoords(rect, ',');
            var html = '\
                <div id="'+CSS+'regionInfo" class="'+CSS+'keep '+CSS+'regionInfo">\
                    <div>'+text+'</div>\
                    <input name="coords" type="text" size="30" maxlength="40" value="'+coordString+'"/>\
                </div>';
            var $info = $(html);
            $info.appendTo($elem);
            $div = $info.find('div');
            $div.text(text);
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
            console.debug('showRegionCoords', coordString);
        },

        // draw a find region from coords and move into view
        regionFromCoords : function (data, coords) {
            var rect = parseCoords(data, coords);
            if (rect == null) {
                alert('invalid coordinates: ' + coords);
                return;
                }
            var attr = { 'class' : CSS+'findregion' };
            var item = { 'rect' : rect, 'attributes' : attr };
            var $regionDiv = addRegionDiv(data, item);
            var newZoomArea = fn.centerZoomArea(data, rect);
            console.debug('regionFromCoords', coords, rect, newZoomArea);
            redisplay(data);
            },

        // highlight regions by id
        highlightRegions : function (data, ids) {
            if (ids == null || ids.length < 1) return;
            var selector = '#'+ids.join(',#');
            var $regions = data.$elem.find(selector);
            $regions.addClass(CSS+'highlightregion');
            if (ids.length == 1) {
                var rect = $regions.data('rect');
                fn.centerZoomArea(data, rect);
                redisplay(data);
            }
            },

        // find coordinates and display as new region
        findCoords : function (data) {
            var $elem = data.$elem;
            var findSelector = '#'+CSS+'regionFindCoords';
            if (fn.isOnScreen(data, findSelector)) return; // already onscreen
            var html = '\
                <div id="'+CSS+'regionFindCoords" class="'+CSS+'keep '+CSS+'regionInfo">\
                    <div>coordinates to find:</div>\
                    <form class="'+CSS+'form">\
                        <div>\
                            <input class="'+CSS+'input" name="coords" type="text" size="30"/> \
                        </div>\
                        <input class="'+CSS+'submit" type="submit" name="sub" value="Ok"/>\
                        <input class="'+CSS+'cancel" type="button" value="Cancel"/>\
                    </form>\
                </div>';
            var $info = $(html);
            $info.appendTo($elem);
            var $form = $info.find('form');
            var $input = $info.find('input.'+CSS+'input');
            // handle submit
            $form.on('submit', function () {
                var coords = $input.val();
                actions.regionFromCoords(data, coords);
                fn.withdraw($info);
                return false;
                });
            // handle blur
            $input.on('blur', function () {
                fn.withdraw($info);
                });
            // handle cancel
            $form.find('.'+CSS+'cancel').on('click', function () {
                fn.withdraw($info);
                });
            $info.fadeIn();
            fn.centerOnScreen(data, $info);
            $input.focus();
        },

        // find a region by text data and higlight it
        findData : function (data) {
            var $elem = data.$elem;
            var findSelector = '#'+CSS+'regionFindData';
            if (fn.isOnScreen(data, findSelector)) return; // already onscreen
            var options = filteredOptions(data, 'regionHTML');
            var html = '\
                <div id="'+CSS+'regionFindData" class="'+CSS+'keep '+CSS+'regionInfo">\
                    <div>Find object:</div>\
                    <form class="'+CSS+'form">\
                        <div>\
                            <select class="'+CSS+'finddata">\
                            <option/>\
                            '+options+'\
                            </select>\
                        </div>\
                        <input class="'+CSS+'input" name="data" type="text" size="30" /> \
                        <input class="'+CSS+'submit" type="submit" name="sub" value="Ok"/>\
                        <input class="'+CSS+'cancel" type="button" value="Cancel"/>\
                    </form>\
                </div>';
            var $info = $(html);
            $info.appendTo($elem);
            var $form = $info.find('form');
            var $input = $info.find('input.'+CSS+'input');
            var $select = $info.find('select');
            var $options = $select.find('option');
            // callback if a region is selected by name
            var findRegion = function () {
                var id = [$select.val()];
                fn.withdraw($info);
                actions.highlightRegions(data, id);
                return false;
                };
            // adapt dropdown, show only matching entries 
            var filterOptions = function (filter) {
                var options = filteredOptions(data, 'regionHTML', filter);
                $select.empty();
                $select.append($(options));
                };
            // handle submit
            $form.on('submit', findRegion);
            $select.on('change', findRegion);
            $input.on('keyup', function (event) {
                // ugly: we need setTimeout here to get an updated val();
                window.setTimeout(filterOptions, 100, $input.val());
                if (event.keyCode == '38' || event.keyCode == '40') { // arrows
                    $select.focus();
                }
                });
            // handle cancel
            $form.find('.'+CSS+'cancel').on('click', function () {
                fn.withdraw($info);
                });
            $info.fadeIn();
            fn.centerOnScreen(data, $info);
            $input.focus();
        }
    };

    // make a coords string
    var packCoords = function (rect, sep) {
        if (sep == null) sep = ','; // comma as default separator
        return [
        fn.cropFloatStr(rect.x),
        fn.cropFloatStr(rect.y),
        fn.cropFloatStr(rect.width),
        fn.cropFloatStr(rect.height)
        ].join(sep);
    };

    // create a rectangle from a coords string
    var parseCoords = function (data, coords) {
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

    // create a new regionDiv and add it to data.$elem
    var newRegionDiv = function (data, attr) {
        var cls = CSS+'region';
        var $regionDiv = $('<div class="'+cls+'"/>');
        addRegionAttributes(data, $regionDiv, attr);
        data.$elem.append($regionDiv);
        return $regionDiv;
    };

    // copy attributes to a region div
    var addRegionAttributes = function (data, $regionDiv, attributes) {
        if (attributes == null) return;
        if (attributes['class']) {
            $regionDiv.addClass(attributes['class']);
            delete attributes['class'];
        }
        if (attributes['href']) {
            $regionDiv.data('href', attributes['href']);
            delete attributes['href'];
        }
        if (attributes['title']) {
            $regionDiv.data('text', attributes['title']);
        }
        // create an ID if none exists
        if (!attributes['id']) {
            attributes['id'] = CSS+IDCOUNT.toString(16);
            IDCOUNT += 1;
        }
        $regionDiv.attr(attributes);
    };

    // set region number
    var addRegionNumber = function (data, $regionDiv, index) {
        if (!data.settings.showRegionNumbers) return;
        if (!fn.isNumber(index)) return;
        var $number = $('<a class="'+CSS+'regionnumber">'+index+'</a>');
        $regionDiv.append($number);
        return $regionDiv;
    };

    // construct a region from a rectangle
    var addRegionDiv = function (data, item) {
        var $regionDiv = newRegionDiv(data, item.attributes);
        var settings = data.settings;
        // add region number
        addRegionNumber(data, $regionDiv, item.index);
        // add inner HTML
        if (item.inner) {
            $regionDiv.append(item.inner);
        }
        // store the coordinates in data
        $regionDiv.data('rect', item.rect);
        // trigger a region event on click
        $regionDiv.on('click.dlRegion', function (event) {
            $(data).trigger('regionClick', [$regionDiv]);
            });
        return $regionDiv;
    };

    // create regions from a Javascript array of items
    var createRegionsFromJS = function (data, items) {
        $.each(items, function (index, item) {
            addRegionDiv(data, item);
            });
    };

    // create regions from a JSON array of items (x,y,w,h,title,index)
    var createRegionsFromJSON = function (data, items) {
      var ww = data.settings.regionWidth;
      $.each(items, function (index, item) {
        addRegionDiv(data, {
          rect: geom.rectangle(item.x, item.y, item.w || ww, item.h || ww),
          attributes: {'class' : CSS+"regionJSON "+CSS+"overlay", title: item.title },
          index: item.index || index+1
          });
        });
    };

    // create regions from URL parameters
    var createRegionsFromURL = function (data) {
        var userRegions = unpackRegions(data);
        if (!userRegions) return;
        createRegionsFromJS(data, userRegions);
    };

    // create regions from HTML
    var createRegionsFromHTML = function (data) {
        // regions are defined in "area" tags
        var $areas = data.$elem.find(data.settings.areaSelector);
        console.debug("createRegionsFromHTML - elems found: ", $areas.length);
        $areas.each(function (index, area) {
            var $area = $(area);
            // the "title" attribute contains the text for the tooltip
            var title = $area.attr('title');
            // the "coords" attribute contains the region coords (0..1)
            var coords = $area.attr('coords');
            // create the rectangle
            var rect = parseCoords(data, coords);
            if (rect == null) {
                return console.error('bad coords in HTML:', title, coords);
            }
            // mark div class as regionHTML
            var cls = $area.attr('class') || '';
            cls += ' '+CSS+'regionHTML '+CSS+'overlay';
            var attr = {'class' : cls};
            // copy attributes
            for (var n in data.settings.regionAttributes) {
                attr[n] = $area.attr(n);
            }
            // copy inner HTML
            var $inner = $area.contents().clone();
            if (attr.href != null) {
                // wrap contents in a-tag
                var $a = $('<a href="'+attr.href+'"/>');
                $inner = $a.append($inner);
            }
            var item = {'rect' : rect, 'attributes' : attr, 'inner' : $inner};
            var $regionDiv = addRegionDiv(data, item);
        });
        // $areas.removeAttr('id');
        $areas.remove();
    };

    // select region divs (HTML or URL)
    var getRegions = function (data, selector) {
        var $regions = data.$elem.find('div.'+CSS+selector);
        return $regions;
    };

    // create a filter text matcher
    var getFilterRE = function (filter) {
        if (!filter) return null;
        // sanitize and split
        var parts = filter.replace(/([\\\(\)\-\!.+?*])/g, '\\$1').split(/\s+/);
        // match all parts anywhere in optiontext
        var regexparts = $.map(parts, function(part) {
            // one lookahead for each filter part
            return '(?=.*'+part+')';
            });
        var RE = new RegExp(regexparts.join(''), 'i');
        return RE;
        };

    // make HTML option from regions text data
    var filteredOptions = function (data, selector, filter) {
        var options = [];
        var sort = data.settings.regionSortString;
        var RE = getFilterRE(filter);
        var createOption = function (index, region) {
            var $region = $(region);
            var rect = $region.data('rect');
            if (rect == null) return;
            // var coords = packCoords(rect, ',');
            var text = $region.data('text');
            if (text == null) {
                text = $region.text();
                }
            if (RE == null || text.match(RE)) {
                var id = $region.attr('id');
                var sortstring = $region.data('sort')
                    || (typeof sort === 'function')
                        ? sort(text)
                        : text;
                var option = '<option value="'+id+'">'+text+'</option>';
                options.push([sortstring, option]);
                }
            };
        var $regions = getRegions(data, selector);
        $.each($regions, createOption);
        options.sort(function (a, b) {
            return a[0].localeCompare(b[0]);
            });
        var sorted = $.map(options, function (str, index) {
            return str[1];
            });
        // prepend an empty option
        return sorted.join('');
    };

    // show a region on top of the scaler image 
    // TODO: faster rendering for large numbers of regions?
    var renderRegion = function (data, $regionDiv, anim) {
        if (!data.imgTrafo) return;
        var zoomArea = data.zoomArea;
        var rect = $regionDiv.data('rect').copy();
        var show = data.settings.isRegionVisible;
        if (show && zoomArea.overlapsRect(rect) && !rect.containsRect(zoomArea)) {
            rect.clipTo(zoomArea);
            var screenRect = data.imgTrafo.transform(rect);
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
        var render = function (index, region) {
            renderRegion(data, $(region), anim);
            };
        var $regions = getRegions(data, 'region')
        $regions.each(render);
    };

    // read region data from URL parameters
    var unpackRegions = function (data) { 
        var rg = data.settings.rg;
        if (rg == null) return [];
        var coords = rg.split(",");
        var regions = $.map(coords, function (coord, index) {
            var pos = coord.split("/", 4);
            var rect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
            var attr = {'class' : CSS+"regionURL "+CSS+"overlay"};
            var item = {'rect' : rect, 'index' : index+1, 'attributes' : attr};
            return item;
            });
        return regions;
    };

    // pack user regions array into a URL parameter string
    var packRegions = function (data) {
        var $regions = getRegions(data, 'regionURL');
        if ($regions.length == 0 || !data.settings.processUserRegions) {
            data.settings.rg = null;
            return;
        }
        var pack = function (region, index) {
            var $region = $(region);
            var rect = $region.data('rect');
            var packed = packCoords(rect, '/');
            return packed;
            };
        var coords = $.map($regions, pack);
        var rg = coords.join(',');
        data.settings.rg = rg;
        console.debug('pack regions:', rg);
    };

    // zoom in, displaying the region in the middle of the screen
    var zoomToRegion = function (data, $regionDiv) {
        var settings = data.settings;
        var rect = $regionDiv.data('rect');
        var za = rect.copy();
        var factor = settings.regionAutoZoomFactor;
        za.width  *= factor;
        za.height *= factor;
        // var screen = fn.getFullscreenRect(data);
        za.setProportion(1, true); // avoid extreme zoomArea proportions
        za.setCenter(rect.getCenter()).stayInside(FULL_AREA);
        fn.setZoomArea(data, za);
        // hide image
        fn.fadeScalerImg(data, 'fadeOut');
        fn.redisplay(data);
    };

    // reload display after a region has been added or removed
    var redisplay = function (data) {
        packRegions(data);
        fn.redisplay(data);
    };

    // event handler, gets called when a newRegion event is triggered
    var handleNewRegion = function (evt, $regionDiv) {
        var data = this;
        var settings = data.settings;
        console.debug("regions: handleNewRegion", $regionDiv);
        if (typeof settings.onNewRegion === 'function') {
            // execute callback
            return settings.onNewRegion(data, $regionDiv);
            }
        if (typeof settings.onNewRegion === 'string') {
            // execute action
            return actions[settings.onNewRegion](data, $regionDiv);
        }
    };

    // event handler, gets called when a regionClick event is triggered
    var handleRegionClick = function (evt, $regionDiv) {
        var data = this;
        var settings = data.settings;
        console.debug("regions: handleRegionClick", $regionDiv);
        if ($regionDiv.data('href')) {
            // follow the href attribute of the region area
            window.location = $regionDiv.data('href'); //TODO: how about target?
        }
        if (typeof settings.onClickRegion === 'function') {
            // execute callback
            return settings.onClickRegion(data, $regionDiv);
        }
        if (typeof settings.onClickRegion === 'string') {
            // execute action
            return actions[settings.onClickRegion](data, $regionDiv);
        }
    };

    // event handler, reads region parameter and creates region divs
    var handleSetup = function (evt) {
        var data = this;
        var settings = data.settings;
        console.debug("regions: handleSetup", settings.rg);
        // regions with content are given in a Javascript array
        if (settings.regions) {
            createRegionsFromJS(data, settings.regions);
        }
        // regions with content are given in a JSON array
        if (settings.regionsJSON) {
            createRegionsFromJSON(data, settings.regionsJSON);
        }
        // regions with content are given in HTML divs
        if (settings.processHtmlRegions) {
            createRegionsFromHTML(data);
        }
        // regions are defined in the URL
        if (settings.processUserRegions) {
            createRegionsFromURL(data);
        }
    };

    var handleNewpage = function (evt) {
        console.debug("regions: handle newpage");
        var data = this;
        // new page, new regions
        // TODO: best way to reset?
        data.settings.rg = null;
        actions.removeAllUserRegions(data);
    };

    // event handler, sets buttons and shows regions when scaler img is reloaded
    var handleUpdate = function (evt) {
        var data = this;
        console.debug("regions: handleUpdate");
        var settings = data.settings;
        fn.highlightButtons(data, 'regions' , settings.isRegionVisible);
        renderRegions(data, 1);
    };

    // additional buttons
    var installButtons = function (data) {
        var settings = data.settings;
        var mode = settings.interactionMode;
        var buttonSettings = settings.buttonSettings[mode];
        var buttonSet = settings.regionSet;
        if (settings.processUserRegions) {
            var first = buttonSet.slice(0,1);
            var rest = buttonSet.slice(1);
            buttonSet = first.concat(settings.userRegionSet, rest);
            }
        // set regionSet to [] or '' for no buttons (when showing regions only)
        if (buttonSet.length && buttonSet.length > 0) {
            buttonSettings.regionSet = buttonSet;
            buttonSettings.buttonSets.push('regionSet');
            }
    };

    // plugin installation called by digilib on plugin object.
    var install = function (plugin) {
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
        // add "rg" to digilibParamNames
        digilib.defaults.digilibParamNames.push('rg');
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising regions plugin. data:', data);
        var $elem = data.$elem;
        var settings = data.settings;
        CSS = settings.cssPrefix;
        FULL_AREA  = geom.rectangle(0, 0, 1, 1);
        // install event handlers
        var $data = $(data);
        $data.on('setup', handleSetup);
        $data.on('update', handleUpdate);
        $data.on('newRegion', handleNewRegion);
        $data.on('regionClick', handleRegionClick);
        $data.on('newpage', handleNewpage);
        // default: autoZoom to region, when clicked
        if (settings.autoZoomOnClick && settings.onClickRegion == null) {
            settings.onClickRegion = zoomToRegion;
        }
        // install region buttons if user defined regions are allowed
        if (digilib.plugins.buttons != null) {
            installButtons(data);
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
