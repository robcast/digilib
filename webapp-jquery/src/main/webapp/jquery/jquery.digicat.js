/*
 * #%L
 * digilib-webapp
 * %%
 * Copyright (C) 2016 MPIWG Berlin
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
 * Authors: Robert Casties, 25.2.2016
 */

/**
 * digicat jQuery plugin
 */

/*
 * jslint browser: true, debug: true, forin: true
 */

(/**
     * @param $
     */
function($) {

    var defaults = {
        // version of this script
        'version' : 'jquery.digicat.js 0.1a',
        // logo url
        'logoUrl' : 'img/digilib-logo-text1.png',
        // homepage url (behind logo)
        'homeUrl' : 'http://digilib.sourceforge.net',
        // base URL to digilib webapp (e.g.
        // 'http://digilib.mpiwg-berlin.mpg.de/digitallibrary')
        'digilibBaseUrl' : null,
        // path to digilib frontend page (inside digilibBaseUrl)
        'digilibFrontendPath' : '/jquery/digicat.html',
        // base URL to Scaler servlet (usually digilibBaseUrl+'/servlet/Scaler')
        'scalerBaseUrl' : null,
        // prefix of digilib classes in CSS styles
        'cssPrefix' : 'dl-',
        // parameter defaults
        'pg' : 1,
        'rows' : 5,
        'cols' : 4,
        // list of digicat parameters
        'digicatParamNames' : [ 'fn', 'pg', 'rows', 'cols' ],
        // list of additional parameters (for page outside of digilib)
        'additionalParamNames' : [],
        // list of parameters to suppress when generating page URL
        'suppressParamNames' : null,
        // list of Scaler parameters
        'scalerParamNames' : ['fn', 'pn', 'dw', 'dh', 'ww', 'wh', 'wx', 'wy', 'ws', 'mo', 'rot', 'cont', 'brgt', 'rgbm', 'rgba',
                'ddpi', 'ddpix', 'ddpiy', 'colop'],
        // list of digilib parameters
        'digilibParamNames' : ['fn','pn','ww','wh','wx','wy','ws','mo','rot','cont','brgt','rgbm','rgba','ddpi','colop','mk','clop'],
        // reserved space in full page display (default value accounts for body margins)
        'pageInsets' : {
            'x' : 26,
            'y' : 20
        },
        // reserved space for each image
        'imageInsets' : {
            'x' : 4,
            'y' : 20
        },
        // TODO: do we need this?
        'interactionMode' : 'fullscreen'
    };

    // affine geometry plugin stub
    var geom = null;
    // list of plugins
    var plugins = {};
    // object to export functions to plugins
    var fn = null;
    // list of buttons
    var buttons = {};

    var actions = {
        /**
         * init: digilib initialization
         * 
         * @param options
         * @returns
         */
        init : function(options) {
            // import geometry classes
            if (plugins.geometry == null) {
                $.error("jquery.digicat.geometry plugin not found!");
            } else {
                // geometry plugin puts classes in the shared fn
                geom = fn.geometry;
            }
            // settings for this digilib instance are merged from defaults and
            // options
            // (no deep copy because lists would be joined)
            var settings = $.extend({}, defaults, options);
            var queryParams = {};
            queryParams = parseQueryParams();
            // filter additional parameters
            for ( var p in queryParams) {
                if ($.inArray(p, settings.digicatParamNames) < 0) {
                    settings.additionalParamNames.push(p);
                }
            }
            return this.each(function() {
                var $elem = $(this);
                var data = $elem.data('digicat');
                var params, elemSettings;
                // if the plugin hasn't been initialized yet
                if (data == null) {
                    // merge query parameters
                    params = queryParams;
                    // setup $elem.data, needs "deep copy" because of nesting
                    elemSettings = $.extend(true, {}, settings, params);
                    data = {
                        // let $(this) know about $(this) :-)
                        $elem : $elem,
                        // let $elem have its own copy of settings
                        settings : elemSettings,
                        // keep options
                        options : options,
                        // and of the URL query parameters
                        queryParams : params
                    };
                    // store in jQuery data element
                    $elem.data('digicat', data);
                } else {
                    // data exists
                    elemSettings = data.settings;
                }
                unpackParams(data);
                // list of current insets (dynamic for buttons etc.)
                data.currentInsets = {
                    'static' : elemSettings.pageInsets
                };
                // check digilib base URL
                if (elemSettings.digilibBaseUrl == null) {
                    // take current host
                    var url = window.location.toString();
                    // assume the page lives in [webapp]/jquery/
                    var pos = url.indexOf('/jquery/');
                    if (pos > 0) {
                        elemSettings.digilibBaseUrl = url.substring(0, pos);
                    } else {
                        // then maybe its the root-digilib.html
                        pos = url.indexOf('/digilib.html');
                        if (pos > 0) {
                            elemSettings.digilibBaseUrl = url.substring(0, pos);
                        }
                    }
                }
                // check scaler base URL
                if (elemSettings.scalerBaseUrl == null) {
                    if (elemSettings.digilibBaseUrl) {
                        elemSettings.scalerBaseUrl = elemSettings.digilibBaseUrl + '/servlet/Scaler';
                    }
                }
                // set up event handlers
                $(data).on('update', handleUpdate);
                // initialise plugins
                for (n in plugins) {
                    var p = plugins[n];
                    if (typeof p.init === 'function') {
                        // call the plugins init() method
                        p.init(data);
                    }
                }
                // trigger unpack params handlers
                $(data).trigger('unpack');
                // get image info from server if needed
                if (data.scaleMode === 'pixel' || data.scaleMode === 'size') {
                    loadImageInfo(data); // triggers "imageInfo" on
                    // completion
                }
                // create HTML structure for scaler
                setupDigicatDiv(data);
                // send setup event
                $(data).trigger('setup');
            });
        },

        /**
         * goto given page nr (+/-: relative)
         * 
         * @param data
         * @param pageNr
         * @returns {Boolean}
         */
        gotoPage : function(data, pageNr) {
            var settings = data.settings;
            var oldpg = settings.pg;
            if (pageNr == null) {
                pageNr = window.prompt("Goto page number", oldpg);
            }
            var pg = setNumValue(settings, "pg", pageNr);
            if (pg == null)
                return false; // nothing happened
            if (pg < 1) {
                alert("no such page (page number too low)");
                settings.pg = oldpg;
                return false;
            }
            // TODO: how do we get pt?
            if (settings.pt != null) {
                if (pg > settings.pt) {
                    alert("no such page (page number too high)");
                    settings.pg = oldpg;
                    return false;
                }
            }
            // then reload
            redisplay(data);
        },

        /** show the 'about' window
         * 
         * @param data
         */
        about : function(data) {
            //FIXME: highlightButtons(data, 'about', on);
            var $elem = data.$elem;
            var settings = data.settings;
            var cssPrefix = settings.cssPrefix;
            var aboutSelector = '#'+cssPrefix+'about';
            if (isOnScreen(data, aboutSelector)) {
                $(aboutSelector).fadeToggle();
                return;
            }
            // make relative logoUrl absolute
            var logoUrl = settings.logoUrl;
            if (logoUrl.charAt(0) !== '/' && logoUrl.substring(0,3) !== 'http') {
                logoUrl = settings.digilibBaseUrl + '/' + logoUrl;
            }
            var html = '\
                <div id="'+cssPrefix+'about" class="'+cssPrefix+'about" style="display:none">\
                    <p>Digilib Image Viewer</p>\
                    <a href="'+settings.homeUrl+'">\
                        <img class="'+settings.cssPrefix+'logo" title="Digilib" src="'+logoUrl+'"/>\
                    </a>\
                    <p>Version: '+settings.version+'</p>\
                </div>';
            var $about = $(html);
            $about.appendTo($elem);
            $about.on('click.digilib', function () {
                withdraw($about);
                });
            $about.fadeIn();
            centerOnScreen(data, $about);
        },

    };

    /**
     * return parameters from page url
     * 
     */
    var parseQueryParams = function() {
        var qs = window.location.search.slice(1);
        return parseQueryString(qs);
    };

    /**
     * parses query parameter string into parameter object
     * 
     */
    var parseQueryString = function(query) {
        var params = {};
        if (query == null)
            return params;
        var pairs = query.split("&");
        // var keys = [];
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split("=");
            if (pair.length === 2) {
                params[pair[0]] = pair[1];
                // keys.push(pair[0]);
            }
        }
        return params;
    };

    /**
     * processes some parameters into objects and stuff
     * 
     */
    var unpackParams = function(data) {
        var settings = data.settings;
        // mo (Scaler flags)
        var flags = {};
        if (settings.mo) {
            var pa = settings.mo.split(",");
            for (var i = 0; i < pa.length; i++) {
                flags[pa[i]] = pa[i];
            }
        }
        data.scalerFlags = flags;
        // retrieveOptions(data);
    };

    /**
     * put objects back into parameters
     * 
     */
    var packParams = function(data) {
        var settings = data.settings;
        // store user interface options in cookie
        // storeOptions(data);
        // trigger pack handlers
        $(data).trigger('pack');
    };

    /**
     * returns maximum size for scaler img in fullscreen mode.
     */
    var getFullscreenImgSize = function(data) {
        // var mode = data.settings.interactionMode;
        var $win = $(window);
        var winH = $win.height();
        var winW = $win.width();
        // add all current insets
        // accounting for left/right border, body margins and additional
        // requirements
        var insets = {
            'x' : 0,
            'y' : 0
        };
        for ( var n in data.currentInsets) {
            insets.x += data.currentInsets[n].x;
            insets.y += data.currentInsets[n].y;
        }
        ;
        var imgW = winW - insets.x;
        var imgH = winH - insets.y;
        return geom.size(imgW, imgH);
    };

    /** 
     * returns a rectangle.with the fullscreen dimensions 
     */
    var getFullscreenRect = function (data) {
        return geom.rectangle(getFullscreenImgSize(data));
    };

    /**
     * return a query string from key names from a parameter hash (ignores keys
     * if the same value is in defaults)
     * 
     */
    var getParamString = function(settings, keys, defaults) {
        var paramString = '';
        var nx = false;
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if ((settings[key] != null) && ((defaults == null) || (settings[key] != defaults[key]))) {
                // first param gets no '&'
                if (nx) {
                    paramString += '&';
                } else {
                    nx = true;
                }
                // add parm=val
                paramString += key + '=' + settings[key];
            }
        }
        return paramString;
    };

    /** 
     * returns URL and query string for current digicat.
     * if digilibPage != null returns URL to page in digilib installation with digilib parameters,
     * otherwise using current URL and parameters.
     * 
     */
    var getDigicatUrl = function (data, digilibPage) {
        packParams(data);
        var settings = data.settings;
        var paramList = settings.digicatParamNames;
        if (digilibPage != null) {
            var baseUrl = data.settings.digilibBaseUrl + digilibPage;
        } else {
            paramList = settings.additionalParamNames.concat(settings.digicatParamNames);
            if (settings.suppressParamNames != null) {
                // eliminate suppressed parameters from list
                paramList = $.map(paramList, function(e, idx) {
                    if ($.inArray(e, settings.suppressParamNames) >= 0) {
                        return null;
                    } else {
                        return e;
                    }
                });
            }
            // take url from current location
            var baseUrl = window.location.href;
            var pos = baseUrl.indexOf('?');
            if (pos > -1) {
                baseUrl = baseUrl.substring(0, pos);
            }
        }
        var queryString = getParamString(settings, paramList, defaults);
        return baseUrl + '?' + queryString;
    };

    /** 
     * returns URL and query string for current digilib.
     * if digilibPage != null returns URL to page in digilib installation with digilib parameters,
     * otherwise using current URL and parameters.
     * 
     */
    var getDigilibUrl = function (data, digilibPage) {
        packParams(data);
        var settings = data.settings;
        var paramList = settings.digilibParamNames;
        if (digilibPage != null) {
            var baseUrl = data.settings.digilibBaseUrl + digilibPage;
        } else {
            paramList = settings.additionalParamNames.concat(settings.digilibParamNames);
            if (settings.suppressParamNames != null) {
                // eliminate suppressed parameters from list
                paramList = $.map(paramList, function(e, idx) {
                    if ($.inArray(e, settings.suppressParamNames) >= 0) {
                        return null;
                    } else {
                        return e;
                    }
                });
            }
            // take url from current location
            var baseUrl = window.location.href;
            var pos = baseUrl.indexOf('?');
            if (pos > -1) {
                baseUrl = baseUrl.substring(0, pos);
            }
        }
        var queryString = getParamString(settings, paramList, defaults);
        return baseUrl + '?' + queryString;
    };

    /**
     * returns URL and query string for Scaler
     */
    var getScalerUrl = function(data) {
        packParams(data);
        var settings = data.settings;
        if (settings.scalerBaseUrl == null) {
            alert("ERROR: URL of digilib Scaler servlet missing!");
        }
        var keys = settings.scalerParamNames;
        var queryString = getParamString(settings, keys, defaults);
        var url = settings.scalerBaseUrl + '?' + queryString;
        return url;
    };

    /**
     * (re)load the page with the current settings.
     * 
     */
    var redisplay = function(data) {
        var settings = data.settings;
        // update location.href (browser URL) in fullscreen mode
        var url = getDigicatUrl(data);
        // reload window
        window.location = url;
    };

    var handleScalerImgError = function(data, evt, a, b) {
        console.error("error loading scaler image:", evt);
        $(data).trigger('imgerror');
    };

    /** handle "update" display event.
     */
    var handleUpdate = function (evt) {
        var data = this;
        console.debug("handleupdate.");
        setupDigicatDiv(data);
    };

    /**
     * creates HTML structure for digilib in elem
     */
    var setupDigicatDiv = function(data) {
        var settings = data.settings;
        var $elem = data.$elem;
        var cssPrefix = settings.cssPrefix;
        $elem.addClass(cssPrefix + 'digicat');
        var scalerUrl;
        var dlUrl;
        var pt = settings.pt;
        var pg = settings.pg;
        var rows = settings.rows;
        var cols = settings.cols;
        var pn = (pg - 1) * rows * cols + 1;
        var tblSize = getFullscreenImgSize(data);
        var tdw = Math.floor(tblSize.width / cols);
        var tdh = Math.floor(tblSize.height / rows);
        settings.dw = tdw - settings.imageInsets.x;
        settings.dh = tdh - settings.imageInsets.y;
        var $tbl = $('<table/>');
        var $tr;
        var $td;
        var $link;
        var $img;
        for (var ridx = 0; ridx < rows; ++ridx) {
            $tr = $('<tr/>');
            for (var cidx = 0; cidx < cols; ++cidx) {
                $td = $('<td>');
                if (pt == null || pn <= pt) {
                    settings.pn = pn;
                    /*
                     * link
                     */
                    dlUrl = getDigilibUrl(data, '/digilib.html');
                    $link = $('<a href="'+dlUrl+'" target="_blank"/>');
                    /*
                     * scaler image
                     */
                    $img = $('<img/>');
                    $img.addClass(cssPrefix + 'pic');
                    $img.on('error', function(evt, a, b) {
                        handleScalerImgError(data, evt, a, b);
                    });
                    scalerUrl = getScalerUrl(data);
                    $img.attr('src', scalerUrl);
                    /*
                     * image caption
                     */
                    $cap = $('<div/>');
                    $cap.text(pn);
                    /*
                     * assemble element
                     */
                    $link.append($img);
                    $link.append($cap);
                    $td.append($link);
                }
                $td.css('width', tdw + 'px');
                $td.css('height', tdh + 'px');
                $tr.append($td);
                pn += 1;
            }
            $tbl.append($tr);
        }
        // create new inner html, keeping buttons and content marked with class "keep"
        $elem.contents(':not(.' + cssPrefix + 'keep)').remove();
        // scaler should be the first child element?
        $elem.prepend($tbl);
        data.$tbl = $tbl;
    };

    /**
     * sets a key to a value (relative values with +/- if relative=true).
     * 
     */
    var setNumValue = function(settings, key, value) {
        if (value == null)
            return null;
        if (isNumber(value)) {
            settings[key] = value;
            return value;
        }
        var sign = value[0];
        if (sign === '+' || sign === '-') {
            if (settings[key] == null) {
                // this isn't perfect but still...
                settings[key] = 0;
            }
            settings[key] = parseFloat(settings[key]) + parseFloat(value);
        } else {
            settings[key] = value;
        }
        return settings[key];
    };

    /**
     * return if the argument is a number. from Douglas Crockford, A.10. this is
     * different from $.isNumeric().
     */
    var isNumber = function(value) {
        return typeof value === 'number' && isFinite(value);
    };

    /** center an item on the visible screen rect
     */
     var centerOnScreen = function (data, $div) {
         if ($div == null) return;
         var r = geom.rectangle($div);
         var s = getFullscreenRect(data);
         r.setCenter(s.getCenter());
         r.getPosition().adjustDiv($div);
     };

     /** find an element in digilib $elem
     */
     var find = function (data, selector) {
         var $obj = data.$elem.find(selector);
         return ($obj.length > 0) ? $obj : null;
     };

    /** does element exist in digilib?
     */
     var isOnScreen = function (data, selector) {
         var $obj = find(data, selector);
         return ($obj != null);
     };

    /**
     * functions to export to plugins.
     */
    fn = {
        geometry : geom,
        parseQueryString : parseQueryString,
        getScalerUrl : getScalerUrl,
        getParamString : getParamString,
        getDigilibUrl : getDigilibUrl,
        unpackParams : unpackParams,
        packParams : packParams,
        setNumValue : setNumValue,
        redisplay : redisplay
    };

    // hook digicat plugin into jquery
    $.fn.digicat = function(action) {
        // plugin extension mechanism, called when the plugins' code is read
        if (action === 'plugin') {
            var plugin = arguments[1];
            // each plugin needs a name
            if (plugin.name != null) {
                plugins[plugin.name] = plugin;
                // share common objects
                plugin.defaults = defaults;
                plugin.buttons = buttons;
                plugin.actions = actions;
                plugin.fn = fn;
                plugin.plugins = plugins;
                // and install
                if (typeof plugin.install === 'function') {
                    plugin.install(plugin);
                }
            }
            // plugins will be initialised when action.init is called
        } else if (actions[action]) {
            // call action on this with the remaining arguments (inserting data
            // as first argument)
            var $elem = $(this);
            var data = $elem.data('digicat');
            var args = Array.prototype.slice.call(arguments, 1);
            args.unshift(data);
            return actions[action].apply(this, args);
        } else if (typeof action === 'object' || !action) {
            // call init on the digilib jQuery object
            return actions.init.apply(this, arguments);
        } else {
            $.error('action ' + action + ' does not exist on jQuery.digicat');
        }
    };

})(jQuery);