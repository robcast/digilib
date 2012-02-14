/* Copyright (c) 2011 Martin Raspe, Robert Casties
 
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
 
Authors:
  Martin Raspe, Robert Casties, 11.1.2011
*/

/**
 * digilib jQuery plugin
**/ 

/*jslint browser: true, debug: true, forin: true
*/

// fallback for console.log calls
if (typeof console === 'undefined') {
    var console = {
        log : function(){}, 
        debug : function(){}, 
        error : function(){}
        };
    var customConsole = false; // set to true if debugging for MS IE
}

(function($) {

    var defaults = {
        // version of this script
        'version' : 'jquery.digilib.js 2.1.5b2',
        // logo url
        'logoUrl' : 'img/digilib-logo-text1.png',
        // homepage url (behind logo)
        'homeUrl' : 'http://digilib.berlios.de',
        // base URL to digilib (e.g. 'http://digilib.mpiwg-berlin.mpg.de/digitallibrary')
        'digilibBaseUrl' : null,
        // base URL to Scaler servlet (usually digilibBaseUrl+'/servlet/Scaler')
        'scalerBaseUrl' : null,
        // prefix of digilib classes in CSS styles
        'cssPrefix' : 'dl-',
        // list of Scaler parameters
        'scalerParamNames' : ['fn','pn','dw','dh','ww','wh','wx','wy','ws','mo',
                              'rot','cont','brgt','rgbm','rgba','ddpi','ddpix','ddpiy'],
        // Scaler parameter defaults
        'pn' : 1,
        'ww' : 1.0,
        'wh' : 1.0,
        'wx' : 0.0,
        'wy' : 0.0,
        'ws' : 1.0,
        'mo' : '',
        'rot' : 0,
        'cont' : 0,
        'brgt' : 0,
        'rgbm' : '0/0/0',
        'rgba' : '0/0/0',
        'ddpi' : null,
        'ddpix' : null,
        'ddpiy' : null,
        // list of digilib parameters
        'digilibParamNames' : ['fn','pn','ww','wh','wx','wy','ws','mo','rot','cont','brgt','rgbm','rgba','ddpi','mk','clop'],
        // digilib parameter defaults
        'mk' : '',
        'clop' : '',
        // list of additional parameters (for page outside of digilib)
        'additionalParamNames' : [],
        // list of parameters to suppress when generating page URL
        'suppressParamNames' : null,
        // mode of operation: 
        // fullscreen = take parameters from page URL, keep state in page URL
        // embedded = take parameters from Javascript options, keep state inside object 
        'interactionMode' : 'fullscreen',
        // is the "about" window shown?
        'isAboutDivVisible' : false,
        // default size of preview image for drag-scroll (preferrably same as Bird's Eye View image)
        'previewImgWidth' : 200,
        'previewImgHeight' : 200,
        // maximum width or height of preview background image for drag-scroll
        'maxBgSize' : 10000,
        // parameters used by background image
        'previewImgParamNames' : ['fn','pn','dw','dh','mo','rot'],
        // reserved space in full page display (default value accounts for body margins)
        'scalerInsets' : { 'x' : 26, 'y': 20 }
        };

    // list of plugins
    var plugins = {};
    // object to export functions to plugins
    var fn = null;
    // affine geometry plugin stub
    var geom = null;
    // rectangle with maximum zoom area
    var FULL_AREA = null;
    // limit for float comparison
    var EPSILON = 0.0001;
    // list of buttons
    var buttons = {};

    var actions = {
            
        /** init: digilib initialization
         * 
         * @param options
         * @returns
         */
        init : function(options) {
            // import geometry classes
            if (plugins.geometry == null) {
                $.error("jquery.digilib.geometry plugin not found!");
                // last straw: old version
                geom = dlGeometry();
            } else {
                // geometry plugin puts classes in the shared fn
                geom = fn.geometry;
            }
            FULL_AREA  = geom.rectangle(0, 0, 1, 1);

            // settings for this digilib instance are merged from defaults and options
            var settings = $.extend({}, defaults, options);
            var isFullscreen = settings.interactionMode === 'fullscreen';
            var queryParams = {};
            if (isFullscreen) {
            	queryParams = parseQueryParams();
            	// filter additional parameters
            	for (var p in queryParams) {
            		if ($.inArray(p, settings.digilibParamNames) < 0) {
            			settings.additionalParamNames.push(p);
            		}
            	}
            }
            return this.each(function() {
                var $elem = $(this);
                var data = $elem.data('digilib');
                var params, elemSettings;
                // if the plugin hasn't been initialized yet
                if (!data) {
                    // merge query parameters
                    if (isFullscreen) {
                        params = queryParams;
                    } else {
                        params = parseImgParams($elem);
                        if ($.cookie) {
                            // retrieve params from cookie
                            var ck = "digilib-embed:fn:" + escape(params.fn) + ":pn:" + (params.pn || '1');
                            var cs = $.cookie(ck);
                            console.debug("get cookie=", ck, " value=", cs);
                            if (cs) {
                                var cp = parseQueryString(cs);
                                // ignore fn and pn from cookie TODO: should we keep pn?
                                delete cp.fn;
                                delete cp.pn;
                                $.extend(params, cp);
                            }
                        }
                    }
                    // setup $elem.data, needs "deep copy" because of nesting
                    elemSettings = $.extend(true, {}, settings, params);
                    data = {
                            // let $(this) know about $(this) :-)
                            $elem : $elem,
                            // let $elem have its own copy of settings
                            settings : elemSettings,
                            // and of the URL query parameters
                            queryParams : params
                    };
                    // store in jQuery data element
                    $elem.data('digilib', data);
                } else {
                	// data exists
                	elemSettings = data.settings;
                }
                unpackParams(data);
                // list of current insets (dynamic for buttons etc.)
                data.currentInsets = {'static' : elemSettings.scalerInsets};
                // check if browser knows *background-size
                for (var bs in {'':1, '-moz-':1, '-webkit-':1, '-o-':1}) {
                    if ($elem.css(bs+'background-size')) {
                        data.hasBgSize = true;
                        data.bgSizeName = bs+'background-size';
                        break;
                    }
                }
                data.hasPreviewBg = false;
                // check if browser supports AJAX-like URL-replace without reload
                data.hasAsyncReload = (typeof history.replaceState === 'function');
                // check if browser sets complete on cached images
                data.hasCachedComplete = ! $.browser.mozilla;
                // check digilib base URL
                if (elemSettings.digilibBaseUrl == null) {
                    if (isFullscreen) {
                        // take current host
                        var url = window.location.toString();
                        // assume the page lives in [webapp]/jquery/
                        var pos = url.indexOf('/jquery/');
                        if (pos > 0) {
                            elemSettings.digilibBaseUrl = url.substring(0, pos);
                        }
                    } else {
                    	// may be we got the scaler URL from the img
                        var url = elemSettings.scalerBaseUrl;
                        if (url) {
                            // build it from scaler URL
                            var pos = url.indexOf('/servlet/Scaler');
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
                $(data).on('update', handleUpdate); // handleUpdate needs to be the first handler for update
                $(data).on('changeZoomArea', handleChangeZoomArea);
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
                    loadImageInfo(data); // triggers "imageInfo" on completion
                }
                // create HTML structure for scaler
                setupScalerDiv(data);
                // about window creation - TODO: could be deferred? restrict to only one item?
                setupAboutDiv(data);
                // send setup event
                $(data).trigger('setup');
            });
        },

        /** destroy: clean up digilib
         * 
         * @param data
         * @returns
         */
        destroy : function(data) {
            return this.each(function(){
                var $elem = $(this);
                $(window).off('.digilib'); // unbind all digilibs(?)
                data.digilib.remove();
                $elem.removeData('digilib');
            });
        },

        /** show or hide the 'about' window
         * 
         * @param data
         * @param show
         */
        showAboutDiv : function(data, show) {
            var on = showDiv(data.settings.isAboutDivVisible, data.$aboutDiv, show);
            data.settings.isAboutDivVisible = on;
            //FIXME: highlightButtons(data, 'help', on);
        },

        /** goto given page nr (+/-: relative)
         * 
         * @param data
         * @param pageNr
         * @returns {Boolean}
         */
        gotoPage : function (data, pageNr) {
            var settings = data.settings;
            var oldpn = settings.pn;
            if (pageNr == null) {
                pageNr = window.prompt("Goto page number", oldpn);
            }
            var pn = setNumValue(settings, "pn", pageNr);
            if (pn == null) return false; // nothing happened
            if (pn < 1) {
                alert("no such page (page number too low)");
                settings.pn = oldpn;
                return false;
                }
            // TODO: how do we get pt?
            if (settings.pt != null) {
                if (pn > settings.pt) {
                    alert("no such page (page number too high)");
                    settings.pn = oldpn;
                    return false;
                    }
                }
            // reset mk and others(?)
            data.marks = [];
            data.zoomArea = FULL_AREA.copy();
            // then reload
            redisplay(data);
        },

        /** zoom by a given factor
         * 
         * @param data
         * @param factor
         */
        zoomBy : function (data, factor) {
            zoomBy(data, factor);
        },

        /** zoom to area (or interactive)
         * 
         * @param data
         * @param area
         */
        zoomArea : function (data, area) {
            if (area == null) {
                // interactively
                zoomArea(data);
            } else {
                data.zoomArea = geom.rectangle(area);
                redisplay(data);
            }
        },

        /** zoom out to full page
         * 
         * @param data
         * @param mode
         */
        zoomFull : function (data, mode) {
            data.zoomArea = FULL_AREA.copy();
            setFitMode(data, mode);
            // zoom full only works in screen mode
            setScaleMode(data, 'screen');
            redisplay(data);
        },

        /** mirror the image
         * 
         * @param data
         * @param mode
         */
        mirror : function (data, mode) {
            var flags = data.scalerFlags;
            if (mode === 'h') {
                if (flags.hmir) {
                    delete flags.hmir;
                } else {
                    flags.hmir = 1;
                }
            } else {
                if (flags.vmir) {
                    delete flags.vmir;
                } else {
                    flags.vmir = 1;
                }
            }
            redisplay(data);
        },

        /** rotate the image
         * 
         * @param data
         * @param angle
         */
        rotate : function (data, angle) {
            var rot = data.settings.rot;
            if (angle == null) {
                angle = window.prompt("Rotation angle:", rot);
            }
            data.settings.rot = angle;
            redisplay(data);
        },

        /** change brightness
         * 
         * @param data
         * @param factor
         */
        brightness : function (data, factor) {
            var brgt = data.settings.brgt;
            if (factor == null) {
                factor = window.prompt("Brightness (-255..255)", brgt);
            }
            data.settings.brgt = factor;
            redisplay(data);
        },

        /** change contrast
         * 
         * @param data
         * @param factor
         */
        contrast : function (data, factor) {
            var cont = data.settings.cont;
            if (factor == null) {
                factor = window.prompt("Contrast (-8, 8)", cont);
            }
            data.settings.cont = factor;
            redisplay(data);
        },

        /** reset image parameters to defaults 
         * TODO: improve this!
         * 
         * @param data
         */
        reset : function (data) {
            var settings = data.settings;
            var paramNames = settings.digilibParamNames;
            var params = data.queryParams;
            // delete all digilib parameters
            for (var i = 0; i < paramNames.length; i++) {
                var paramName = paramNames[i];
                delete settings[paramName];
                }
            settings.fn = params.fn || ''; // no default defined
            settings.pn = params.pn || defaults.pn;
            var size = getFullscreenImgSize(data);
            settings.dw = params.dw || size.width;
            settings.dh = params.dh || size.height;
            settings.isBirdDivVisible = false;
            settings.visibleButtonSets = 1; // FIXME
            // resets zoomArea, marks, scalerflags
            data.zoomArea = FULL_AREA.copy();
            data.marks = [];
            data.scalerFlags = {};
            delete data.dlOpts.fitwidth;
            delete data.dlOpts.fitheight;
            data.scaleMode = 'screen';
            redisplay(data);
        },

        /** presents a reference url (returns value if noprompt)
         * 
         * @param data
         * @param noprompt
         * @returns
         */
        reference : function (data, noprompt) {
            var url = getDigilibUrl(data);
            if (noprompt == null) {
                window.prompt("URL reference to the current view", url);
                // return nothing so we can use is in javascript: url without reload
                return;
            }
            return url;
        },

        /** 
         * Returns URL to the full digilib.html with the current parameters.
         * Redirects immediately with mode=open.
         * 
         * @param data
         * @param mode
         */
        digilibUrl : function (data, mode) {
            var url = getDigilibUrl(data, '/jquery/digilib.html');
            if (mode === 'open') {
                // redirect
                window.location = url;
            } else if (mode === 'open_new') {
                // open new window
                window.open(url);
                return;
            }
            return url;
        },
        
        
        /** set image quality
         * 
         * @param data
         * @param qual
         */
        setQuality : function (data, qual) {
            var oldq = getQuality(data);
            if (qual == null) {
                qual = window.prompt("Image quality (0..2)", oldq);
            }
            qual = parseInt(qual, 10);
            if (qual >= 0 && qual <= 2) {
                setQuality(data, qual);
                redisplay(data);
            }
        },

        /** calibrate (set client screen dpi)
         * 
         * @param data
         * @param res
         */
        calibrate : function (data, res) {
            var oldRes = data.settings.ddpi;
            if (res == null) {
                res = window.prompt("Display resolution (dpi)", oldRes);
            }
            if (res != null) {
                data.settings.ddpi = res;
                redisplay(data);
            }
        },

        /** set image scale mode
         * 
         * @param data
         * @param mode
         */
        setScaleMode : function (data, mode) {
            var oldM = getScaleMode(data);
            if (mode == null) {
                mode = window.prompt("Image scale mode (screen, pixel, size)", oldM);
            }
            if (mode != null) {
                setScaleMode(data, mode);
                redisplay(data);
            }
        }
    // end of actions
    };

    /** return parameters from page url
     * 
     */
    var parseQueryParams = function() {
        return parseQueryString(window.location.search.slice(1));
    };

    /** 
     * returns parameters from embedded img-element
     * 
     */
    var parseImgParams = function($elem) {
        var src = $elem.find('img').first().attr('src');
        if (!src) return null;
        var pos = src.indexOf('?');
        var query = (pos < 0) ? '' : src.substring(pos + 1);
        var scalerUrl = src.substring(0, pos);
        var params = parseQueryString(query);
        params.scalerBaseUrl = scalerUrl;
        return params;
    };

    /** 
     * parses query parameter string into parameter object
     * 
     */
    var parseQueryString = function(query) {
        var params = {};
        if (query == null) return params;
        var pairs = query.split("&");
        //var keys = [];
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split("=");
            if (pair.length === 2) {
                params[pair[0]] = pair[1];
                //keys.push(pair[0]);
            }
        }
        return params;
    };

    /** 
     * return a query string from key names from a parameter hash 
     * (ignores keys if the same value is in defaults)
     * 
     */
    var getParamString = function (settings, keys, defaults) {
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
     * returns URL and query string for Scaler
     */
    var getScalerUrl = function (data) {
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

    /** returns URL for preview background image
     * 
     */
    var getPreviewImgUrl = function (data, moreParams) {
        var settings = data.settings;
        var bgOptions = {
                dw : settings.previewImgWidth,
                dh : settings.previewImgHeight
        };
        var bgSettings = $.extend({}, settings, bgOptions);
        // filter scaler flags (use only hmir and vmir)
        if (bgSettings.mo != null) {
            var mo = '';
            if (data.scalerFlags.hmir != null) {
                mo += 'hmir,';
            }
            if (data.scalerFlags.vmir != null) {
                mo += 'vmir';
            }
            bgSettings.mo = mo;
        }
        var params = getParamString(bgSettings, settings.previewImgParamNames, defaults);
        var url = settings.scalerBaseUrl + '?' + params;
        return url;
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

    /** loads image information from digilib server via HTTP
     * 
     */
    var loadImageInfo = function (data) {
        var settings = data.settings;
        // bind default function (only once)
        $(data).off('imageInfo', handleImageInfo);
        $(data).on('imageInfo', handleImageInfo);
        var url = settings.digilibBaseUrl + '/ImgInfo-json.jsp';
        url += '?' + getParamString(settings, ['fn', 'pn'], defaults);
        // TODO: better error handling
        $.getJSON(url, function (json) {
            console.debug("got json data=", json);
            data.imgInfo = json;
            // send event
            $(data).trigger('imageInfo', [json]);
        });
    };

    /** processes some parameters into objects and stuff
     * 
     */
    var unpackParams = function (data) {
        var settings = data.settings;
        // zoom area
        var zoomArea = geom.rectangle(settings.wx, settings.wy, settings.ww, settings.wh);
        data.zoomArea = zoomArea;
        // mo (Scaler flags)
        var flags = {};
        if (settings.mo) {
            var pa = settings.mo.split(",");
            for (var i = 0; i < pa.length ; i++) {
                flags[pa[i]] = pa[i];
                }
            }
        data.scalerFlags = flags;
        data.scaleMode = getScaleMode(data);
        retrieveOptions(data);
    };

    /** put area into parameters
     * 
     */
    var packArea = function (settings, area) {
        if (!area) return;
        // zoom area
        settings.wx = cropFloat(area.x);
        settings.wy = cropFloat(area.y);
        settings.ww = cropFloat(area.width);
        settings.wh = cropFloat(area.height);
    };

    /** pack scaler flags into parameters
     * 
     */
    var packScalerFlags = function (settings, flags) {
        if (!flags) return;
        var mo = '';
        for (var f in flags) {
            if (mo) {
                mo += ',';
            }
            mo += f;
        }
        settings.mo = mo;
    };

    /** put objects back into parameters
     * 
     */
    var packParams = function (data) {
        var settings = data.settings;
        packArea(settings, data.zoomArea);
        packScalerFlags(settings, data.scalerFlags);
        // store user interface options in cookie
        storeOptions(data);
        // trigger pack handlers
        $(data).trigger('pack');
    };

    /** store digilib options in a cookie   
     * 
     */
    var storeOptions = function (data) {
        var settings = data.settings;
        if (data.dlOpts) {
            // save digilib settings in options
            data.dlOpts.birdview = settings.isBirdDivVisible ? 1 : 0;
            data.dlOpts.buttons = settings.visibleButtonSets;
            var clop = '';
            for (var o in data.dlOpts) {
                if (clop) {
                    clop += '&';
                    }
                clop += o + '=' + data.dlOpts[o];
                }
            if ($.cookie) {
                var ck = "digilib:fn:" + escape(settings.fn) + ":pn:" + settings.pn;
                console.debug("set cookie=", ck, " value=", clop);
                $.cookie(ck, clop);
                }
        }
        if (settings.interactionMode !== 'fullscreen' && $.cookie) {
            // store normal parameters in cookie for embedded mode
            var qs = getParamString(settings, settings.digilibParamNames, defaults);
            var ck = "digilib-embed:fn:" + escape(settings.fn) + ":pn:" + settings.pn;
            console.debug("set cookie=", ck, " value=", qs);
            $.cookie(ck, qs);
        }
    };

    /** retrieve digilib options from a cookie
     * 
     */
    var retrieveOptions = function (data) {
        // clop (digilib options)
        var opts = {};
        var settings = data.settings;
        if ($.cookie) {
            // read from cookie
            var ck = "digilib:fn:" + escape(settings.fn) + ":pn:" + settings.pn;
            var cp = $.cookie(ck);
            console.debug("get cookie=", ck, " value=", cp);
            // in query string format
            opts = parseQueryString(cp);
            }
        data.dlOpts = opts;
        // birdview option
        if (opts.birdview != null) {
            settings.isBirdDivVisible = opts.birdview === '1';
            }
        // visible button sets
        if (opts.buttons != null) {
            settings.visibleButtonSets = opts.buttons;
            }
    };

    /** (re)load the image with the current settings.
     * 
     */
    var redisplay = function (data) {
        var settings = data.settings; 
        if (settings.interactionMode === 'fullscreen') {
            // update location.href (browser URL) in fullscreen mode
            var url = getDigilibUrl(data);
            var history = window.history;
            if (data.hasAsyncReload) {
                console.debug("faking reload to "+url);
                // change url without reloading (stateObj, title, url)
                // TODO: we really need to push the state in stateObj and listen to pop-events
                try {
                	history.replaceState({}, '', url);
                	// show busy cursor
                	$('body').css('cursor', 'progress');
                	data.$scaler.css('cursor', 'progress');
                	// change img src
                	var $img = data.$img;
                	var imgurl = getScalerUrl(data);
                	$img.attr('src', imgurl);
                	// trigger load event if image is cached. Doesn't work with Firefox!!
                	if (data.hasCachedComplete && $img.prop('complete')) {
                	    console.debug("cached img.load");
                	    $img.trigger('load');
                	}
                	if (data.scalerFlags.clip != null || data.scalerFlags.osize != null) {
                    	// we need image info, do we have it?
                		if (data.imgInfo == null) {
                			loadImageInfo(data);
                		}
                	}
                	// update if we have a preview
                	if (data.hasPreviewBg) {
                	    $(data).trigger('update');
                	}
                	//FIXME: highlightButtons(data);
                	// send event
                	$(data).trigger('redisplay');
                } catch (e) {
                	console.error("replaceState("+url+") didn't work: "+e);
                    // reload window
                    window.location = url;
                }
            } else {
                // reload window
                window.location = url;
            }
        } else {
            // embedded mode -- just change img src
        	// show busy cursor
        	$('body').css('cursor', 'progress');
        	data.$scaler.css('cursor', 'progress');
        	var $img = data.$img;
            var url = getScalerUrl(data);
            $img.attr('src', url);
        	// trigger load event if image is cached
        	if ($img.prop('complete')) $img.trigger('load');
        	if (data.scalerFlags.clip != null || data.scalerFlags.osize != null) {
            	// we need image info, do we have it?
        		if (data.imgInfo == null) {
        			loadImageInfo(data);
        		}
        	}
            //FIXME: highlightButtons(data);
            // send event
            $(data).trigger('redisplay');
        }
    };

    /** update display (overlays etc.)
     * (just triggers "update" event)
     */
    var updateDisplay = function (data) {
        // send event
        $(data).trigger('update');
    };

    /** handle "update" display event.
     * updates image transform, etc.
     */
    var handleUpdate = function (evt) {
    	var data = this;
        updateImgTrafo(data);
        setupZoomDrag(data);
    };

    /** 
     * returns maximum size for scaler img in fullscreen mode.
     */
    var getFullscreenImgSize = function (data) {
        //var mode = data.settings.interactionMode;
        var $win = $(window);
        var winH = $win.height();
        var winW = $win.width();
        // add all current insets
        // accounting for left/right border, body margins and additional requirements
        var insets = { 'x' : 0, 'y' : 0};
        for (var n in data.currentInsets) {
            insets.x += data.currentInsets[n].x;
            insets.y += data.currentInsets[n].y;
        };
        var imgW = winW - insets.x;
        var imgH = winH - insets.y;
        console.debug('getFullscreenImgSize - screen w/h:', winW, winH, 'window.width', $win.width(), 'img w/h:', imgW, imgH);
        return geom.size(imgW, imgH);
    };

    /** 
     * returns a rectangle.with the fullscreen dimensions 
     */
    var getFullscreenRect = function (data) {
        return geom.rectangle(getFullscreenImgSize(data));
    };

    /** 
     * creates HTML structure for digilib in elem
     */
    var setupScalerDiv = function (data) {
        var settings = data.settings;
        var $elem = data.$elem;
        var cssPrefix = settings.cssPrefix;
        $elem.addClass(cssPrefix+'digilib');
        var $img;
        var scalerUrl;
        if (settings.interactionMode === 'fullscreen') {
            // fullscreen
            $elem.addClass(cssPrefix+'fullscreen');
            var imgSize = getFullscreenImgSize(data);
            data.fullscreenImgSize = imgSize;
            // fitwidth/height omits destination height/width
            if (data.dlOpts.fitheight == null) {
                settings.dw = imgSize.width;
            }
            if (data.dlOpts.fitwidth == null) {
                settings.dh = imgSize.height;
            }
            scalerUrl = getScalerUrl(data);
            $img = $('<img/>');
        } else {
            // embedded mode -- try to keep img tag
            $elem.addClass(cssPrefix+'embedded');
            scalerUrl = getScalerUrl(data);
            $img = $elem.find('img');
            if ($img.length > 0) {
                var oldUrl = $img.attr('src');
                // keep img attributes from html
                var title = $img.attr('title');
                var alt = $img.attr('alt');
                if (oldUrl === scalerUrl) {
                    console.debug("img detach:", $img);
                    $img.detach();
                } else {
                    $img = $('<img/>');
                    $img.attr("title", title);
                    $img.attr("alt", alt);
                }
            } else {
                $img = $('<img/>');
            }
        }
        // create new inner html, keeping buttons and content marked with "keep" class
        $elem.contents(':not(.'+cssPrefix+'keep)').remove();
        var $scaler = $('<div class="'+cssPrefix+'scaler"/>');
        // scaler should be the first child element?
        $elem.prepend($scaler);
        $scaler.append($img);
        $img.addClass(cssPrefix+'pic');
        data.$scaler = $scaler;
        data.$img = $img;
        // set busy cursor
        $('body').css('cursor','progress');
    	data.$scaler.css('cursor', 'progress');
        // set up image load handler before setting the src attribute (IE bug)
        $img.load(scalerImgLoadedHandler(data));
        $img.error(function () {console.error("error loading scaler image");});
        $img.attr('src', scalerUrl);
    };

    /** creates HTML structure for the about view in elem
     * 
     */
    var setupAboutDiv = function (data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var $aboutDiv = $('<div class="'+settings.cssPrefix+'about" style="display:none"/>');
        var $header = $('<p>Digilib Image Viewer</p>');
        var $link = $('<a/>');
        var $logo = $('<img class="'+settings.cssPrefix+'logo" title="digilib"/>');
        var $content = $('<p/>');
        $elem.append($aboutDiv);
        $aboutDiv.append($header);
        $aboutDiv.append($link);
        $aboutDiv.append($content);
        $link.append($logo);
        logoUrl = settings.logoUrl;
        // make relative logoUrl absolute
        if (logoUrl.charAt(0) !== '/' && logoUrl.substring(0,3) !== 'http') {
        	logoUrl = settings.digilibBaseUrl + '/' + logoUrl;
        }
        $logo.attr('src', logoUrl);
        $link.attr('href', settings.homeUrl);
        $content.text('Version: ' + settings.version);
        data.$aboutDiv = $aboutDiv;
        // click hides
        $aboutDiv.on('click.digilib', function () {
            actions['showAboutDiv'](data, false);
            });
    };

    /** shows some window e.g. 'about' (toggle visibility if show is null)
     * 
     */
    var showDiv = function (isVisible, $div, show) {
        if (show == null) {
            // toggle visibility
            isVisible = !isVisible;
        } else {
            // set visibility
            isVisible = show;
            }
        if (isVisible) {
            $div.fadeIn();
        } else {
            $div.fadeOut();
            }
        return isVisible;
    };

    /** Create Transform from zoom area and image size and parameters.
     * Returns Transform between normalized coordinates and image pixel coordinates.
     */
    var getImgTrafo = function ($img, area, rot, hmir, vmir, mode, data) {
        var picrect = geom.rectangle($img);
        // handle pixel-by-pixel and original-size modes 
        if (mode != null) {
            var imgInfo = data.imgInfo;
            if (mode === 'pixel') {
                // scaler mo=clip - image area size does not come from ww, wh
                if (imgInfo != null) {
                    area.width = picrect.width / imgInfo.width;
                    area.height = picrect.height / imgInfo.height;
                } else {
                    console.error("No image info for pixel mode!");
                }
            }
            if (mode === 'size') {
                // scaler mo=osize - image area size does not come from ww, wh
                if (imgInfo != null) {
                    var ddpi = parseFloat(data.settings.ddpi);
                    area.width = (picrect.width / ddpi) / (imgInfo.width / imgInfo.dpi_x);
                    area.height = (picrect.height / ddpi) / (imgInfo.height / imgInfo.dpi_y);
                } else {
                    console.error("No image info for original size mode!");
                }
            }
        }
        var trafo = geom.transform();
        // move zoom area offset to center
        trafo.concat(trafo.getTranslation(geom.position(-area.x, -area.y)));
        // scale zoom area size to [1,1]
        trafo.concat(trafo.getScale(geom.size(1/area.width, 1/area.height)));
        // rotate and mirror (around transformed image center i.e. [0.5,0.5])
        if (rot || hmir || vmir) {
            // move [0.5,0.5] to center
            trafo.concat(trafo.getTranslation(geom.position(-0.5, -0.5)));
            if (hmir) {
                // mirror about center
                trafo.concat(trafo.getMirror('y'));
                }
            if (vmir) {
                // mirror about center
                trafo.concat(trafo.getMirror('x'));
                }
            if (rot) {
                // rotate around center
                trafo.concat(trafo.getRotation(parseFloat(rot)));
                }
            // move back
            trafo.concat(trafo.getTranslation(geom.position(0.5, 0.5)));
            }
        // scale to screen position and size
        trafo.concat(trafo.getScale(picrect));
        trafo.concat(trafo.getTranslation(picrect));
        return trafo;
    };

    /** update current scaler image transform
     */
    var updateImgTrafo = function (data) {
        var $img = data.$img;
        if ($img == null)
            return;
        var imgLoaded = $.browser.msie
            ? $img.prop('width') > 0
            : $img.prop('complete');
        if (imgLoaded || data.hasPreviewBg) {
			// create Transform from current zoomArea and image size
			data.imgTrafo = getImgTrafo($img, data.zoomArea, data.settings.rot,
					data.scalerFlags.hmir, data.scalerFlags.vmir,
					data.scaleMode, data);
			console.debug("imgTrafo=", data.imgTrafo);
		}
    };

    /** return handler for load event of scaler img
     * (necessary for closure with data object)
     */
    var scalerImgLoadedHandler = function (data) {
        return function () {
            var $img = $(this);
            console.debug("scaler img loaded=",$img);
            var $scaler = data.$scaler;
            var imgRect = geom.rectangle($img);
            data.imgRect = imgRect;
        	// reset busy cursor
        	$('body').css('cursor', 'auto');
        	$scaler.css('cursor', 'auto');
            // adjust scaler div size (beware: setting position makes the element relative)
            imgRect.getSize().adjustDiv($scaler);
            // show image in case it was hidden (for example in zoomDrag)
            $img.css('visibility', 'visible');
            $scaler.css({'opacity' : '1', 'background' : 'transparent'});
            data.hasPreviewBg = false;
            // update display (render marks, etc.)
            updateDisplay(data);
        };
    };

    /** handle imageInfo loaded event
     * 
     */
    var handleImageInfo = function (evt, json) {
    	console.debug("handleImageInfo:", json);
        var data = this;
        updateDisplay(data);
    };

    /** handle changeZoomArea event
     * 
     */
    var handleChangeZoomArea = function (evt, newZa) {
    	console.debug("handleChangeZoomArea:", newZa);
    	var data = this;
    	// hide all overlays (marks/regions)
        data.$elem.find('.'+data.settings.cssPrefix+'overlay').hide();
    	setPreviewBg(data, newZa);
    };
    
    
    /** zoom by the given factor.
     * 
     */
    var zoomBy = function(data, factor) {
        var area = data.zoomArea;
        var newarea = area.copy();
        // scale
        newarea.width /= factor;
        newarea.height /= factor;
        // and recenter
        newarea.x -= 0.5 * (newarea.width - area.width);
        newarea.y -= 0.5 * (newarea.height - area.height);
        newarea = FULL_AREA.fit(newarea);
        setZoomArea(data, newarea);
        // reset modes
        setScaleMode(data, 'screen');
        setFitMode(data, 'both');
        redisplay(data);
    };

    /** zoom to the area around two clicked points.
     * 
     */
    var zoomArea = function(data) {
        $elem = data.$elem;
        $scaler = data.$scaler;
        var pt1, pt2;
        var $zoomDiv = $('<div class="'+data.settings.cssPrefix+'zoomrect" style="display:none"/>');
        $elem.append($zoomDiv);
        // $zoomDiv.css(data.settings.zoomrectStyle);
        var picRect = geom.rectangle($scaler);
        // FIX ME: is there a way to query the border width from CSS info?
        // rect.x -= 2; // account for overlay borders
        // rect.y -= 2;

        var zoomStart = function (evt) {
            pt1 = geom.position(evt);
            // setup and show zoom div
            pt1.adjustDiv($zoomDiv);
            $zoomDiv.width(0).height(0);
            $zoomDiv.show();
            // register events
            $elem.on("mousemove.dlZoomArea", zoomMove);
            $elem.on("mouseup.dlZoomArea", zoomEnd);
            return false;
        };

        // mouse move handler
        var zoomMove = function (evt) {
            pt2 = geom.position(evt);
            var rect = geom.rectangle(pt1, pt2);
            rect.clipTo(picRect);
            // update zoom div
            rect.adjustDiv($zoomDiv);
            return false;
        };

        // mouseup handler: end moving
        var zoomEnd = function (evt) {
            pt2 = geom.position(evt);
            // assume a click and continue if the area is too small
            var clickRect = geom.rectangle(pt1, pt2);
            if (clickRect.getArea() <= 5) return false;
            // hide zoom div
            $zoomDiv.remove();
            // unregister events
            $elem.off("mousemove.dlZoomArea", zoomMove);
            $elem.off("mouseup.dlZoomArea", zoomEnd);
            // clip and transform
            clickRect.clipTo(picRect);
            var area = data.imgTrafo.invtransform(clickRect);
            setZoomArea(data, area);
            // reset modes
            setFitMode(data, 'both');
            setScaleMode(data, 'screen');
            redisplay(data);
            return false;
        };

        // clear old handler (also ZoomDrag)
        $scaler.off('.dlZoomArea');
        $scaler.off(".dlZoomDrag");
        $elem.off('.dlZoomArea');
        // bind start zoom handler
        $scaler.one('mousedown.dlZoomArea', zoomStart);
    };

    /** set preview background.
     * optional newZoomArea scales and moves background to preview.
     */
    var setPreviewBg = function(data, newZoomArea) {
        var $scaler = data.$scaler;
        var $img = data.$img;
        var imgTrafo = data.imgTrafo;
        var scalerPos = geom.position($scaler);
        var bgRect = null;
        // hide the scaler img, show background of div instead
        $img.css('visibility', 'hidden');
        // use current image as first background
        var scalerCss = {
        		'background-image' : 'url(' + $img.attr('src') + ')',
                'background-repeat' : 'no-repeat',
                'background-position' : '0px 0px',
                'opacity' : '0.7',
                'cursor' : 'move'
        };
        if (newZoomArea != null) {
        	// check if aspect ratio has changed
        	if (newZoomArea.getAspect() !== data.zoomArea.getAspect()) {
        		console.debug("aspect ratio changed!");
        		// what now?
        	}
        	// get transform for new zoomArea (use 'screen' instead of data.scaleMode)
        	imgTrafo = getImgTrafo($img, newZoomArea, data.settings.rot,
					data.scalerFlags.hmir, data.scalerFlags.vmir,
					'screen', data);
        	// for new background coordinates transform old zoomArea with new Transform
        	bgRect = imgTrafo.transform(data.zoomArea);
        	// correct offset because background is relative
        	bgRect.addPosition(scalerPos.neg());
        	// position background
        	scalerCss['background-position'] = Math.round(bgRect.x) + 'px '+ Math.round(bgRect.y) + 'px';
        }
        if (data.hasBgSize) {
        	// scale background using CSS3-background-size
        	if (bgRect != null && (bgRect.height < data.settings.maxBgSize && bgRect.width < data.settings.maxBgSize)) {
        		scalerCss[data.bgSizeName] = Math.round(bgRect.width) + 'px ' + Math.round(bgRect.height) + 'px';
        	} else {
        		scalerCss[data.bgSizeName] = 'auto';
        	}
            // additional full-size background using CSS3
            fullRect = imgTrafo.transform(FULL_AREA);
            if (fullRect.height < data.settings.maxBgSize && fullRect.width < data.settings.maxBgSize) {
                // correct offset because background is relative
                fullRect.addPosition(scalerPos.neg());
                var url = getPreviewImgUrl(data);
                // add second background url, size and position
                scalerCss['background-image'] += ', url(' + url + ')';
                scalerCss[data.bgSizeName] += ', ' + Math.round(fullRect.width) + 'px ' + Math.round(fullRect.height) + 'px';
                scalerCss['background-position'] += ', ' + Math.round(fullRect.x) + 'px '+ Math.round(fullRect.y) + 'px';
            }
        }
        $scaler.css(scalerCss);
        data.hasPreviewBg = true;
    };
    
    /** setup handlers for dragging the zoomed image.
     * 
     */
    var setupZoomDrag = function(data) {
        var startPos, delta;
        var $document = $(document);
        var $data = $(data);
        var $elem = data.$elem;
        var $scaler = data.$scaler;
        var $img = data.$img;

        // drag the image and load a new detail on mouse up
        var dragStart = function (evt) {
        	// cancel if not left-click
        	if (evt.which != 1) return;
            console.debug("dragstart at=", evt);
            // don't start dragging if not zoomed
            if (isFullArea(data.zoomArea)) return false;
            $elem.find(".overlay").hide(); // hide all overlays (marks/regions)
            startPos = geom.position(evt);
            delta = null;
            // set low res background immediately on mousedown
            setPreviewBg(data);
            $document.on("mousemove.dlZoomDrag", dragMove);
            $document.on("mouseup.dlZoomDrag", dragEnd);
            return false;
            };

        // mousemove handler: drag zoomed image
        var dragMove = function (evt) {
            var pos = geom.position(evt);
            delta = startPos.delta(pos);
            // send message event with current zoom position
            var za = geom.rectangle($img);
            za.addPosition(delta.neg());
            // transform back
            var newArea = data.imgTrafo.invtransform(za);
            $data.trigger('changeZoomArea', newArea);
            return false;
            };

        // mouseup handler: reload zoomed image in new position
        var dragEnd = function (evt) {
            $scaler.css('cursor', 'auto');
            $document.off("mousemove.dlZoomDrag", dragMove);
            $document.off("mouseup.dlZoomDrag", dragEnd);
            if (delta == null || delta.distance() < 2) {
                // no movement
                $img.css('visibility', 'visible');
                $scaler.css({'opacity' : '1', 'background-image' : 'none'});
                data.hasPreviewBg = false;
                // unhide marks etc.
                updateDisplay(data);
                return false; 
            }
            // get old zoom area (screen coordinates)
            var za = geom.rectangle($img);
            // move
            za.addPosition(delta.neg());
            // transform back
            var newArea = data.imgTrafo.invtransform(za);
            data.zoomArea = FULL_AREA.fit(newArea);
            redisplay(data);
            return false;
            };

        // clear old handler
        $document.off(".dlZoomDrag");
        $scaler.off(".dlZoomDrag");
        if (! isFullArea(data.zoomArea)) {
            // set handler
            $scaler.on("mousedown.dlZoomDrag", dragStart);
        }
    };

    /** set the zoom area.
     * also triggers "changeZoomArea" event.
     */
    var setZoomArea = function(data, za) {
        $(data).trigger('changeZoomArea', za);
        data.oldZoomArea = data.zoomArea;
        data.zoomArea = za;
    };
    
    /** get image quality as a number (0..2).
     * 
     */
    var getQuality = function (data) {
        var flags = data.scalerFlags;
        var q = flags.q2 || flags.q1 || 'q0'; // assume q0 as default
        return parseInt(q[1], 10);
    };

    /** set image quality as a number (0..2).
     * 
     */
    var setQuality = function (data, qual) {
        var flags = data.scalerFlags;
        // clear flags
        for (var i = 0; i < 3; ++i) {
            delete flags['q'+i];
            }
        flags['q'+qual] = 'q'+qual;
    };

    /** get image scale mode (screen, pixel, size).
     * 
     */
    var getScaleMode = function (data) {
        if (data.scalerFlags.clip != null) {
            return 'pixel';
        } else if (data.scalerFlags.osize != null) {
            return 'size';
        }
        // mo=fit is default
        return 'screen';
    };

    /** set image scale mode (screen, pixel, size).
     * 
     */
    var setScaleMode = function (data, mode) {
        delete data.scalerFlags.fit;
        delete data.scalerFlags.clip;
        delete data.scalerFlags.osize;
        if (mode === 'pixel') {
            data.scalerFlags.clip = 'clip';
        } else if (mode === 'size') {
            data.scalerFlags.osize = 'osize';
        }
        // mo=fit is default
        // save mode
        data.scaleMode = mode;
    };

    /** get screen fit mode (width, height, both).
     * 
     */
    var getFitMode = function (data) {
    	if (data.dlOpts.fitwidth != null) {
    		return "width";
    	} else if (data.dlOpts.fitheight != null) {
    		return "height";
    	}
    	// "both" is default
    	return "both";
    };
    
    /** 
     * set screen fit mode (width, height, both).
     */
    var setFitMode = function (data, mode) {
        var settings = data.settings;
        var imgSize = data.fullscreenImgSize;
    	if (mode === 'width') {
    		data.dlOpts.fitwidth = 1;
    		delete data.dlOpts.fitheight;
    		if (imgSize != null) {
    		    // fitwidth omits destination height
    		    settings.dw = imgSize.width;
    		    settings.dh = null;
    		}
    	} else if (mode === 'height') {
    		data.dlOpts.fitheight = 1;
    		delete data.dlOpts.fitwidth;
            if (imgSize != null) {
                // fitheight omits destination width
                settings.dw = null;
                settings.dh = imgSize.height;
            }
    	} else {
    		delete data.dlOpts.fitwidth;
    		delete data.dlOpts.fitheight;
            if (imgSize != null) {
                settings.dw = imgSize.width;
                settings.dh = imgSize.height;
            }
    	}
    };
    	
    /** sets a key to a value (relative values with +/- if relative=true).
     * 
     */
    var setNumValue = function(settings, key, value) {
        if (value == null) return null;
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

    /** return width of border on $elem.
     * assumes equal border width on all sides.
     */
    var getBorderWidth = function($elem) {
        var border = $elem.outerWidth() - $elem.width();
        return border/2;
    };

    /** return if the current zoomarea can be moved further.
     * 
     */
    var canMove = function(data, movx, movy) {
        var za = data.zoomArea;
        if (isFullArea(za)) return false;
        var x2 = za.x + za.width;
        var y2 = za.y + za.height;
        return (((movx < 0) && (za.x > 0))
            || ((movx > 0) && (x2 < 1.0))
            || ((movy < 0) && (za.y > 0))
            || ((movy > 0) && (y2 < 1.0)));
    };

    /** return if area is maximal.
     * 
     */
    var isFullArea = function (area) {
        return (area.width === 1.0) && (area.height === 1.0);
    };

    /** return if the argument is a number.
     * from Douglas Crockford, A.10.
     * this is different from $.isNumeric().
     */
    var isNumber = function (value) {
        return typeof value === 'number' && isFinite(value);
    };
    /** return number with reduced precision.
     * ("crop senseless precision")
     */
    var cropFloat = function (x) {
        return parseInt(10000 * x, 10) / 10000;
    };

    /** return string from number with reduced precision.
     * 
     */
    var cropFloatStr = function (x) {
        return cropFloat(x).toString();
    };

    // fallback for console.log calls
    if (customConsole) {
        var logFunction = function(type) {
            return function(){
                var $debug = $('#'+defaults.cssPrefix+'debug'); // debug div
                if (!$debug) return;
                var args = Array.prototype.slice.call(arguments);
                var argtext = args.join(' ');
                var $logDiv = $('<div/>');
                $logDiv.addClass(type);
                $logDiv.text(argtext);
                $debug.append($logDiv);
                };
            };
        console.log = logFunction('_log'); 
        console.debug = logFunction('_debug'); 
        console.error = logFunction('_error');
        }

    /** functions to export to plugins.
     */
    fn = {
            geometry : geom,
            parseQueryString : parseQueryString,
            getScalerUrl : getScalerUrl,
            getParamString : getParamString,
            getDigilibUrl : getDigilibUrl,
            unpackParams : unpackParams,
            packParams : packParams,
            packArea : packArea,
            packScalerFlags : packScalerFlags,
            storeOptions : storeOptions,
            redisplay : redisplay,
            updateDisplay : updateDisplay,
            showDiv : showDiv,
            setZoomArea : setZoomArea,
            setPreviewBg : setPreviewBg,
            getImgTrafo : getImgTrafo,
            getQuality : getQuality,
            setQuality : setQuality,
            getScaleMode : getScaleMode,
            setScaleMode : setScaleMode,
            getFitMode : getFitMode,
            setFitMode : setFitMode,
            canMove : canMove,
            isFullArea : isFullArea,
            isNumber : isNumber,
            getFullscreenRect : getFullscreenRect,
            getBorderWidth : getBorderWidth,
            cropFloat : cropFloat,
            cropFloatStr : cropFloatStr
    };

    // hook digilib plugin into jquery
    $.fn.digilib = function (action) {
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
            // call action on this with the remaining arguments (inserting data as first argument)
            var $elem = $(this);
            var data = $elem.data('digilib');
            var args = Array.prototype.slice.call(arguments, 1);
            args.unshift(data);
            return actions[action].apply(this, args);
        } else if (typeof action === 'object' || !action) {
            // call init on the digilib jQuery object
            return actions.init.apply(this, arguments);
        } else {
            $.error('action ' + action + ' does not exist on jQuery.digilib');
        }
    };

})(jQuery);
