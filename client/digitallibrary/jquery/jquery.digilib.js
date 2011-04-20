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
    var buttons = {
        reference : {
            onclick : "reference",
            tooltip : "get a reference URL",
            icon : "reference.png"
            },
        zoomin : {
            onclick : ["zoomBy", 1.4],
            tooltip : "zoom in",
            icon : "zoom-in.png"
            },
        zoomout : {
            onclick : ["zoomBy", 0.7],
            tooltip : "zoom out",
            icon : "zoom-out.png"
            },
        zoomarea : {
            onclick : "zoomArea",
            tooltip : "zoom area",
            icon : "zoom-area.png"
            },
        zoomfull : {
            onclick : "zoomFull",
            tooltip : "view the whole image",
            icon : "zoom-full.png"
            },
        pagewidth : {
            onclick : ["zoomFull", "width"],
            tooltip : "page width",
            icon : "pagewidth.png"
            },
        back : {
            onclick : ["gotoPage", "-1"],
            tooltip : "goto previous image",
            icon : "back.png"
            },
        fwd : {
            onclick : ["gotoPage", "+1"],
            tooltip : "goto next image",
            icon : "fwd.png"
            },
        page : {
            onclick : "gotoPage",
            tooltip : "goto image number",
            icon : "page.png"
            },
        help : {
            onclick : "showAboutDiv",
            tooltip : "about Digilib",
            icon : "help.png"
            },
        reset : {
            onclick : "reset",
            tooltip : "reset image",
            icon : "reset.png"
            },
        mark : {
            onclick : "setMark",
            tooltip : "set a mark",
            icon : "mark.png"
            },
        delmark : {
            onclick : "removeMark",
            tooltip : "delete the last mark",
            icon : "delmark.png"
            },
        hmir : {
            onclick : ["mirror", "h"],
            tooltip : "mirror horizontally",
            icon : "mirror-horizontal.png"
            },
        vmir : {
            onclick : ["mirror", "v"],
            tooltip : "mirror vertically",
            icon : "mirror-vertical.png"
            },
        rot : {
            onclick : "rotate",
            tooltip : "rotate image",
            icon : "rotate.png"
            },
        brgt : {
            onclick : "brightness",
            tooltip : "set brightness",
            icon : "brightness.png"
            },
        cont : {
            onclick : "contrast",
            tooltip : "set contrast",
            icon : "contrast.png"
            },
        rgb : {
            onclick : "javascript:setParamWin('rgb', '...')",
            tooltip : "set rgb values",
            icon : "rgb.png"
            },
        quality : {
            onclick : "setQuality",
            tooltip : "set image quality",
            icon : "quality.png"
            },
        size : {
            onclick : "javascript:toggleSizeMenu()",
            tooltip : "set page size",
            icon : "size.png"
            },
        calibrationx : {
            onclick : "calibrate",
            tooltip : "calibrate screen resolution",
            icon : "calibration-x.png"
            },
        scale : {
            onclick : "setScaleMode",
            tooltip : "change image scale",
            icon : "original-size.png"
            },
        toggleoptions : {
            onclick : "moreButtons",
            tooltip : "more options",
            icon : "options.png"
            },
        moreoptions : {
            onclick : ["moreButtons", "+1"],
            tooltip : "more options",
            icon : "options.png"
            },
        lessoptions : {
            onclick : ["moreButtons", "-1"],
            tooltip : "less options",
            icon : "options.png"
            },
        up : {
            onclick : ["moveZoomArea", 0, -1],
            tooltip : "move zoom area up",
            icon : "up.png"
            },
        down : {
            onclick : ["moveZoomArea", 0, 1],
            tooltip : "move zoom area down",
            icon : "down.png"
            },
        left : {
            onclick : ["moveZoomArea", -1, 0],
            tooltip : "move zoom area left",
            icon : "left.png"
            },
        right : {
            onclick : ["moveZoomArea", 1, 0],
            tooltip : "move zoom area right",
            icon : "right.png"
            },
        SEP : {
            icon : "sep.png"
            }
        };

    var defaults = {
        // version of this script
        'version' : 'jquery.digilib.js 0.9',
        // logo url
        'logoUrl' : '../img/digilib-logo-text1.png',
        // homepage url (behind logo)
        'homeUrl' : 'http://digilib.berlios.de',
        // base URL to digilib viewer (for reference URLs)
        'digilibBaseUrl' : null,
        // base URL to Scaler servlet
        'scalerBaseUrl' : null,
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
        // mode of operation: 
        // fullscreen = take parameters from page URL, keep state in page URL
        // embedded = take parameters from Javascript options, keep state inside object 
        'interactionMode' : 'fullscreen',
        // buttons
        'buttons' : buttons,
        // defaults for digilib buttons
        'buttonSettings' : {
            'fullscreen' : {
                // path to button images (must end with a slash)
                'imagePath' : 'img/fullscreen/',
                'buttonSetWidth' : 36,
                'standardSet' : ["reference","zoomin","zoomout","zoomarea","zoomfull","pagewidth","back","fwd","page","help","reset","toggleoptions"],
                'specialSet' : ["mark","delmark","hmir","vmir","rot","brgt","cont","rgb","quality","size","calibrationx","scale","lessoptions"],
                'arrowSet' : ["up", "down", "left", "right"],
                'buttonSets' : ['standardSet', 'specialSet']
                },
            'embedded' : {
                'imagePath' : 'img/embedded/16/',
                'buttonSetWidth' : 18,
                'standardSet' : ["reference","zoomin","zoomout","zoomarea","zoomfull","help","reset","toggleoptions"],
                'specialSet' : ["mark","delmark","hmir","vmir","rot","brgt","cont","rgb","quality","scale","lessoptions"],
                'arrowSet' : ["up", "down", "left", "right"],
                'buttonSets' : ['standardSet', 'specialSet']
                },
        },
        // arrow bar overlays for moving the zoomed area
        'showZoomArrows' : true,
        // zoom arrow bar minimal width (for small images)
        'zoomArrowMinWidth' : 6,
        // zoom arrow bar standard width
        'zoomArrowWidth' : 32,
        // by what percentage should the arrows move the zoomed area?
        'zoomArrowMoveFactor' : 0.5,
        // number of visible button groups
        'visibleButtonSets' : 1,
        // is the "about" window shown?
        'isAboutDivVisible' : false,
        // default size of background image for drag-scroll (same as Bird's Eye View image)
        'bgImgWidth' : 200,
        'bgImgHeight' : 200,
        // maximum width or height of background image for drag-scroll
        'maxBgSize' : 10000,
        // parameters used by background image
        'bgImgParams' : ['fn','pn','dw','dh','mo','rot'],
        // reserved space in full page display (default value accounts for vertical scrollbar)
        'scalerInset' : 10
        };

    // list of plugins
    var plugins = {};
    // object to export functions to plugins
    var fn;
    // affine geometry plugin stub
    var geom;

    var FULL_AREA;

    var actions = {
        // init: digilib initialization
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
                // check scalerBaseUrl
                if (settings.scalerBaseUrl == null) {
                    // try the host this came from
                    var h = window.location.host;
                    if (window.location.host) {
                        var url = window.location.href;
                        // assume the page lives in [webapp]/jquery/
                        var pos = url.indexOf('jquery/');
                        if (pos > 0) {
                            settings.scalerBaseUrl = url.substring(0, pos) + 'servlet/Scaler';
                        }
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
                            queryParams : params,
                            // TODO: move plugins reference out of data
                            plugins : plugins
                    };
                    // store in jQuery data element
                    $elem.data('digilib', data);
                }
                unpackParams(data);
                // check if browser knows *background-size
                for (var bs in {'':1, '-moz-':1, '-webkit-':1, '-o-':1}) {
                    if ($elem.css(bs+'background-size')) {
                        data.hasBgSize = true;
                        data.bgSizeName = bs+'background-size';
                        break;
                    }
                }
                // check digilib base URL
                if (elemSettings.digilibBaseUrl == null) {
                    if (isFullscreen) {
                        // take current host
                        var url = window.location.toString();
                        var pos = url.indexOf('?');
                        elemSettings.digilibBaseUrl = url.substring(0, pos);
                    } else {
                        var url = elemSettings.scalerBaseUrl;
                        if (url) {
                            // build it from scaler URL
                            var bp = url.indexOf('/servlet/Scaler');
                            elemSettings.digilibBaseUrl = url.substring(0, bp) + '/digilib.jsp';
                        }
                    }
                }
                // initialise plugins
                for (n in plugins) {
                    var p = plugins[n];
                    if (typeof p.init === 'function') {
                        p.init(data);
                    }
                }
                // get image info from server if needed
                if (data.scaleMode === 'pixel' || data.scaleMode === 'size') {
                    $(data).bind('imageInfo', handleImageInfo);
                    loadImageInfo(data); // triggers "imageInfo" on completion
                }
                // create buttons before scaler 
                for (var i = 0; i < elemSettings.visibleButtonSets; ++i) {
                    showButtons(data, true, i);
                    }
                // create HTML structure for scaler, taking width of buttons div into account
                setupScalerDiv(data);
                highlightButtons(data);
                // about window creation - TODO: could be deferred? restrict to only one item?
                setupAboutDiv(data);
                // arrow overlays for moving zoomed detail
                setupZoomArrows(data);
                // send setup event
                $(data).trigger('setup');
            });
        },

        // destroy: clean up digilib
        destroy : function(data) {
            return this.each(function(){
                var $elem = $(this);
                $(window).unbind('.digilib'); // unbind all digilibs(?)
                data.digilib.remove();
                $elem.removeData('digilib');
            });
        },

        // show or hide the 'about' window
        showAboutDiv : function(data, show) {
            var on = showDiv(data.settings.isAboutDivVisible, data.$aboutDiv, show);
            data.settings.isAboutDivVisible = on;
            highlightButtons(data, 'help', on);
        },

        // goto given page nr (+/-: relative)
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
            if (settings.pt) {
                if (pn > settings.pt) {
                    alert("no such page (page number too high)");
                    settings.pn = oldpn;
                    return false;
                    }
                }
            // reset mk and others(?)
            data.marks = [];
            data.zoomArea = FULL_AREA;
            // then reload
            redisplay(data);
        },

        // zoom by a given factor
        zoomBy : function (data, factor) {
            zoomBy(data, factor);
        },

        // zoom to area (or interactive)
        zoomArea : function (data, area) {
            var settings = data.settings;
            if (area == null) {
                // interactively
                zoomArea(data);
            } else {
                data.zoomArea = geom.rectangle(area);
                redisplay(data);
            }
        },

        // zoom out to full page
        zoomFull : function (data, mode) {
            data.zoomArea = FULL_AREA;
            if (mode === 'width') {
                data.dlOpts.fitwidth = 1;
                delete data.dlOpts.fitheight;
            } else if (mode === 'height') {
                data.dlOpts.fitheight = 1;
                delete data.dlOpts.fitwidth;
            } else {
                delete data.dlOpts.fitwidth;
                delete data.dlOpts.fitheight;
            }
            redisplay(data);
        },

        // move zoomed area
        moveZoomArea : function (data, dx, dy) {
            var za = data.zoomArea;
            var factor = data.settings.zoomArrowMoveFactor;
            var deltaX = dx * factor * za.width;
            var deltaY = dy * factor * za.height;
            za.addPosition(geom.position(deltaX, deltaY));
            data.zoomArea = FULL_AREA.fit(za);
            redisplay(data);
        },

        // set a mark by clicking (or giving a position)
        setMark : function (data, mpos) {
            if (mpos == null) {
                // interactive
                setMark(data);
            } else {
                // use position
                data.marks.push(pos);
                redisplay(data);
            }
        },

        // remove the last mark
        removeMark : function (data) {
            data.marks.pop();
            redisplay(data);
        },

        // mirror the image
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

        // rotate the image
        rotate : function (data, angle) {
            var rot = data.settings.rot;
            if (angle == null) {
                angle = window.prompt("Rotation angle:", rot);
            }
            data.settings.rot = angle;
            redisplay(data);
        },

        // change brightness
        brightness : function (data, factor) {
            var brgt = data.settings.brgt;
            if (factor == null) {
                factor = window.prompt("Brightness (-255..255)", brgt);
            }
            data.settings.brgt = factor;
            redisplay(data);
        },

        // change contrast
        contrast : function (data, factor) {
            var cont = data.settings.cont;
            if (factor == null) {
                factor = window.prompt("Contrast (-8, 8)", cont);
            }
            data.settings.cont = factor;
            redisplay(data);
        },

        // display more (or less) button sets
        moreButtons : function (data, more) {
            var settings = data.settings;
            if (more == null) {
                // toggle more or less (only works for 2 sets)
                var maxbtns = settings.buttonSettings[settings.interactionMode].buttonSets.length;
                if (settings.visibleButtonSets >= maxbtns) {
                    more = '-1';
                } else {
                    more = '+1';
                }
            }
            if (more === '-1') {
                // remove set
                var setIdx = settings.visibleButtonSets - 1;
                if (showButtons(data, false, setIdx, true)) {
                    settings.visibleButtonSets--;
                }
            } else {
                // add set
                var setIdx = settings.visibleButtonSets;
                if (showButtons(data, true, setIdx, true)) {
                    settings.visibleButtonSets++;
                }
            }
            // persist setting
            storeOptions(data);
        },

        // reset image parameters to defaults
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
            settings.dw = params.dw;
            settings.dh = params.dh;
            settings.isBirdDivVisible = false;
            settings.visibleButtonSets = 1;
            // resets zoomArea, marks, scalerflags
            data.zoomArea = FULL_AREA;
            data.marks = [];
            data.scalerFlags = {};
            delete data.dlOpts.fitwidth;
            delete data.dlOpts.fitheight;
            redisplay(data);
        },

        // presents a reference url (returns value if noprompt)
        reference : function (data, noprompt) {
            var settings = data.settings;
            var url = getDigilibUrl(data);
            if (noprompt == null) {
                window.prompt("URL reference to the current view", url);
            }
            return url;
        },

        // set image quality
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

        // calibrate (only faking)
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

        // set image scale mode
        setScaleMode : function (data, mode) {
            var oldM = getScaleMode(data);
            if (mode == null) {
                mode = window.prompt("Image scale mode (screen, pixel, size)", oldM);
            }
            if (mode != null) {
                setScaleMode(data, mode);
                data.scaleMode = mode;
                redisplay(data);
            }
        }

    // end of actions
    };

    // returns parameters from page url
    var parseQueryParams = function() {
        return parseQueryString(window.location.search.slice(1));
    };

    // returns parameters from embedded img-element
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

    // parses query parameter string into parameter object
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

    // returns a query string from key names from a parameter hash (ignoring if the same value is in defaults)
    var getParamString = function (settings, keys, defaults) {
        var paramString = '';
        var nx = false;
        for (i = 0; i < keys.length; ++i) {
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

    // returns URL and query string for Scaler
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

    // returns URL for bird's eye view image
    var getBgImgUrl = function (data, moreParams) {
        var settings = data.settings;
        var bgOptions = {
                dw : settings.bgImgWidth,
                dh : settings.bgImgHeight
        };
        var bgSettings = $.extend({}, settings, bgOptions);
        // filter scaler flags
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
        var params = getParamString(bgSettings, settings.bgImgParams, defaults);
        var url = settings.scalerBaseUrl + '?' + params;
        return url;
    };

    // returns URL and query string for current digilib
    var getDigilibUrl = function (data) {
        packParams(data);
        var settings = data.settings;
        var queryString = getParamString(settings, settings.digilibParamNames, defaults);
        return settings.digilibBaseUrl + '?' + queryString;
    };

    // loads image information from digilib server via HTTP
    var loadImageInfo = function (data) {
        var settings = data.settings;
        var p = settings.scalerBaseUrl.indexOf('/servlet/Scaler');
        var url = settings.scalerBaseUrl.substring(0, p) + '/ImgInfo-json.jsp';
        url += '?' + getParamString(settings, ['fn', 'pn'], defaults);
        // TODO: better error handling
        $.getJSON(url, function (json) {
            console.debug("got json data=", json);
            data.imgInfo = json;
            // send event
            $(data).trigger('imageInfo', [json]);
        });
    };

    // processes some parameters into objects and stuff
    var unpackParams = function (data) {
        var settings = data.settings;
        // zoom area
        var zoomArea = geom.rectangle(settings.wx, settings.wy, settings.ww, settings.wh);
        data.zoomArea = zoomArea;
        // marks
        var marks = [];
        if (settings.mk) {
            var mk = settings.mk;
            if (mk.indexOf(";") >= 0) {
                var pa = mk.split(";");    // old format with ";"
            } else {
                var pa = mk.split(",");    // new format
            }
            for (var i = 0; i < pa.length ; i++) {
                var pos = pa[i].split("/");
                if (pos.length > 1) {
                    marks.push(geom.position(pos[0], pos[1]));
                    }
                }
            }
        data.marks = marks;
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

    // put area into parameters
    var packArea = function (settings, area) {
        if (!area) return;
        // zoom area
        settings.wx = cropFloat(area.x);
        settings.wy = cropFloat(area.y);
        settings.ww = cropFloat(area.width);
        settings.wh = cropFloat(area.height);
    };

    // put marks into parameters
    var packMarks = function (settings, marks) {
        if (!marks) return;
        settings.mk = '';
        for (var i = 0; i < marks.length; i++) {
            if (i) {
                settings.mk += ',';
                }
            settings.mk +=
                cropFloatStr(marks[i].x) + '/' + 
                cropFloatStr(marks[i].y);
            }
    };

    // pack scaler flags into parameters
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

    // put objects back into parameters
    var packParams = function (data) {
        var settings = data.settings;
        packArea(settings, data.zoomArea);
        packMarks(settings, data.marks);
        packScalerFlags(settings, data.scalerFlags);
        // store user interface options in cookie
        storeOptions(data);
    };

    var storeOptions = function (data) {
        // save digilib options in cookie
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

    // (re)load the img from a new scaler URL
    var redisplay = function (data) {
        var settings = data.settings; 
        if (settings.interactionMode === 'fullscreen') {
            // update location.href (browser URL) in fullscreen mode
            var url = getDigilibUrl(data);
            var history = window.history;
            if (typeof history.pushState === 'function') {
                console.debug("faking reload to "+url);
                // change url without reloading (stateObj, title, url)
                // TODO: we really need to push the state in stateObj and listen to pop-events
                history.replaceState({}, '', url);
                // change img src
                var imgurl = getScalerUrl(data);
                data.$img.attr('src', imgurl);
                highlightButtons(data);
                // send event
                $(data).trigger('redisplay');
            } else {
                // reload window
                window.location = url;
            }
        } else {
            // embedded mode -- just change img src
            var url = getScalerUrl(data);
            data.$img.attr('src', url);
            highlightButtons(data);
            // send event
            $(data).trigger('redisplay');
            }
    };

    // update display (overlays etc.)
    var updateDisplay = function (data) {
        updateImgTrafo(data);
        renderMarks(data);
        setupZoomDrag(data);
        renderZoomArrows(data);
        // send event
        $(data).trigger('update');
    };

    // returns maximum size for scaler img in fullscreen mode
    var getFullscreenImgSize = function (data) {
        var mode = data.settings.interactionMode;
        var $win = $(window);
        var winH = $win.height();
        var winW = $win.width();
        var $body = $('body');
        // include standard body margins and check plausibility
        var borderW = $body.outerWidth(true) - $body.width();
        if (borderW === 0 || borderW > 100) {
            console.debug("fixing border width for getFullscreenImgSize!");
            borderW = data.settings.scalerInset;
        }
        var borderH = $body.outerHeight(true) - $body.height();
        if (borderH === 0 || borderH > 100) {
            console.debug("fixing border height for getFullscreenImgSize!");
            borderH = 5;
        }
        var buttonsW = 0; 
        if (data.settings.visibleButtonSets) {
            // get button width from settings
            buttonsW = data.settings.buttonSettings[mode].buttonSetWidth;
            // TODO: leave space for all button sets?
        }
        // account for left/right border, body margins and additional requirements
        var imgW = winW - borderW - buttonsW;
        var imgH = winH - borderH;
        console.debug(winW, winH, 'winW:', $win.width(), 'border:', borderW, 'buttonsW:', buttonsW, 'calc:', imgW);
        return geom.size(imgW, imgH);
    };

    // creates HTML structure for digilib in elem
    var setupScalerDiv = function (data) {
        var settings = data.settings;
        var $elem = data.$elem;
        $elem.addClass('digilib');
        var $img;
        var scalerUrl;
        if (settings.interactionMode === 'fullscreen') {
            // fullscreen
            $elem.addClass('dl_fullscreen');
            var imgSize = getFullscreenImgSize(data);
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
            $elem.addClass('dl_embedded');
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
        $elem.contents(":not(.keep)").remove();
        var $scaler = $('<div class="scaler"/>');
        // scaler should be the first child element?
        $elem.prepend($scaler);
        $scaler.append($img);
        $img.addClass('pic');
        data.$scaler = $scaler;
        data.$img = $img;
        // setup image load handler before setting the src attribute (IE bug)
        $img.load(scalerImgLoadedHandler(data));
        $img.error(function () {console.error("error loading scaler image");});
        $img.attr('src', scalerUrl);
    };

    // creates HTML structure for a single button
    var createButton = function (data, $div, buttonName) {
        var $elem = data.$elem;
        var settings = data.settings;
        var mode = settings.interactionMode;
        var imagePath = settings.buttonSettings[mode].imagePath;
        var buttonConfig = settings.buttons[buttonName];
        // button properties
        var action = buttonConfig.onclick;
        var tooltip = buttonConfig.tooltip;
        var icon = imagePath + buttonConfig.icon;
        // construct the button html
        var $button = $('<div class="button"></div>');
        var $a = $('<a/>');
        var $img = $('<img class="button"/>');
        $div.append($button);
        $button.append($a);
        $a.append($img);
        // add attributes and bindings
        $button.attr('title', tooltip);
        $button.addClass('button-' + buttonName);
        $img.attr('src', icon);
        // create handler for the buttons
        $button.bind('click.digilib', (function () {
            // we create a new closure to capture the value of action
            if ($.isArray(action)) {
                // the handler function calls digilib with action and parameters
                return function (evt) {
                    console.debug('click action=', action, ' evt=', evt);
                    $elem.digilib.apply($elem, action);
                    return false;
                };
            } else {
                // the handler function calls digilib with action
                return function (evt) {
                    console.debug('click action=', action, ' evt=', evt);
                    $elem.digilib(action);
                    return false;
                };
            }
        })());
    };

    // creates HTML structure for buttons in elem
    var createButtons = function (data, buttonSetIdx) {
        var $elem = data.$elem;
        var settings = data.settings;
        var mode = settings.interactionMode;
        var buttonSettings = settings.buttonSettings[mode];
        var buttonGroup = buttonSettings.buttonSets[buttonSetIdx];
        if (buttonGroup == null) {
            // no buttons here
            return;
        }
        // button divs are marked with class "keep"
        var $buttonsDiv = $('<div class="keep buttons"/>');
        var buttonNames = buttonSettings[buttonGroup];
        for (var i = 0; i < buttonNames.length; i++) {
            var buttonName = buttonNames[i];
            createButton(data, $buttonsDiv, buttonName);
        }
        // make buttons div scroll if too large for window
        if ($buttonsDiv.height() > $(window).height() - 10) {
            $buttonsDiv.css('position', 'absolute');
        }
        // buttons hidden at first
        $buttonsDiv.hide();
        $elem.append($buttonsDiv);
        if (data.$buttonSets == null) {
            // first button set
            data.$buttonSets = [$buttonsDiv];
        } else {
            $elem.append($buttonsDiv);
            data.$buttonSets[buttonSetIdx] = $buttonsDiv;
        }
        return $buttonsDiv;
    };

    // creates arrow overlays for moving the zoomed area
    var setupZoomArrows = function (data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var show = settings.showZoomArrows;
        console.log('zoom arrows:', show);
        if (!show) return;
        var mode = settings.interactionMode;
        var arrowNames = settings.buttonSettings[mode].arrowSet;
        if (arrowNames == null) return;
        // arrow divs are marked with class "keep"
        var $arrowsDiv = $('<div class="keep arrows"/>');
        $elem.append($arrowsDiv);
        // create all arrow buttons
        $.each(arrowNames, function(i, arrowName){
            createButton(data, $arrowsDiv, arrowName);
            });
    };

    // size and show arrow overlays, called after scaler img is loaded
    var renderZoomArrows = function (data) {
        var settings = data.settings;
        var $arrowsDiv = data.$elem.find('div.arrows');
        if (isFullArea(data.zoomArea) || !settings.showZoomArrows) {
            $arrowsDiv.hide();
            return;
            }
        $arrowsDiv.show();
        var r = geom.rectangle(data.$scaler);
        // calculate arrow bar width
        var aw = settings.zoomArrowWidth;
        var minWidth = settings.zoomArrowMinWidth;
        // arrow bar width should not exceed 10% of scaler width/height
        var maxWidth = Math.min(r.width, r.height)/10;
        if (aw > maxWidth) {
            aw = maxWidth;
            if (aw < minWidth) {
                aw = minWidth;
            }
        }
        // vertical position of left/right image
        var arrowData = [{
            name : 'up',
            rect : geom.rectangle(r.x, r.y, r.width, aw), 
            show : canMove(data, 0, -1)
        }, {
            name : 'down',
            rect : geom.rectangle(r.x, r.y + r.height - aw, r.width, aw),
            show : canMove(data, 0, 1)
        }, {
            name : 'left',
            rect : geom.rectangle(r.x, r.y, aw, r.height),
            show : canMove(data, -1, 0)
        }, {
            name : 'right',
            rect : geom.rectangle(r.x + r.width - aw, r.y, aw, r.height),
            show : canMove(data, 1, 0)
        }];
        // render a single zoom Arrow
        var render = function (i, item) {
            var $arrow = $arrowsDiv.find('div.button-' + item.name);
            if (item.show) {
                $arrow.show();
            } else {
                $arrow.hide();
                return;
            }
            var r = item.rect; 
            r.adjustDiv($arrow);
            var $a = $arrow.contents('a');
            var $img = $a.contents('img');
            $img.width(aw).height(aw);
            // hack for missing vertical-align
            if (item.name.match(/left|right/)) {
                var top = (r.height - $a.height())/2;
                $a.css({'top' : top}); // position : 'relative'
                }
        };
        $.each(arrowData, render);
    };

    // creates HTML structure for the about view in elem
    var setupAboutDiv = function (data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var $aboutDiv = $('<div class="about" style="display:none"/>');
        var $header = $('<p>Digilib Image Viewer</p>');
        var $link = $('<a/>');
        var $logo = $('<img class="logo" title="digilib"/>');
        var $content = $('<p/>');
        $elem.append($aboutDiv);
        $aboutDiv.append($header);
        $aboutDiv.append($link);
        $aboutDiv.append($content);
        $link.append($logo);
        $logo.attr('src', settings.logoUrl);
        $link.attr('href', settings.homeUrl);
        $content.text('Version: ' + settings.version);
        data.$aboutDiv = $aboutDiv;
        // click hides
        $aboutDiv.bind('click.digilib', function () {
            actions['showAboutDiv'](data, false);
            });
    };

    // shows some window e.g. 'about' (toggle visibility if show is null)
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

    // display more (or less) button sets
    var showButtons = function (data, more, setIdx, animated) {
        var atime = animated ? 'fast': 0;
        // get button width from settings
        var mode = data.settings.interactionMode;
        var btnWidth = data.settings.buttonSettings[mode].buttonSetWidth;
        if (more) {
            // add set
            var $otherSets = data.$elem.find('div.buttons:visible');
            var $set;
            if (data.$buttonSets && data.$buttonSets[setIdx]) {
                // set exists
                $set = data.$buttonSets[setIdx];
            } else {
                $set = createButtons(data, setIdx);
                }
            if ($set == null) return false;
            // include border in calculation
            //var btnWidth = $set.outerWidth();
            // console.debug("btnWidth", btnWidth);
            // move remaining sets left and show new set
            if ($otherSets.length > 0) {
                    $otherSets.animate({right : '+='+btnWidth+'px'}, atime,
                            function () {$set.show();});
            } else {
                $set.show();
            }
        } else {
            // remove set
            var $set = data.$buttonSets[setIdx];
            if ($set == null) return false;
            //var btnWidth = $set.outerWidth();
            // hide last set
            $set.hide();
            // take remaining sets and move right
            var $otherSets = data.$elem.find('div.buttons:visible');
            $otherSets.animate({right : '-='+btnWidth+'px'}, atime);
        }
        return true;
    };

    // check for buttons to highlight
    var highlightButtons = function (data, name, on) {
        var $buttons = data.$elem.find('div.buttons:visible'); // include hidden?
        // add a class for highlighted button
        var highlight = function (name, on) {
            var $button = $buttons.find('div.button-' + name);
            if (on) {
                $button.addClass('button-on');
            } else {
                $button.removeClass('button-on');
            }
        };
        if (name != null) {
            return highlight(name, on);
            }
        var flags = data.scalerFlags;
        var settings = data.settings;
        highlight('rot', settings.rot);
        highlight('brgt', settings.brgt);
        highlight('cont', settings.cont);
        highlight('bird', settings.isBirdDivVisible);
        highlight('help', settings.isAboutDivVisible);
        highlight('hmir', flags.hmir);
        highlight('vmir', flags.vmir);
        highlight('quality', flags.q1 || flags.q2);
        highlight('zoomin', ! isFullArea(data.zoomArea));
        };

    // create Transform from area and $img
    var getImgTrafo = function ($img, area, rot, hmir, vmir, mode, data) {
        var picrect = geom.rectangle($img);
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

    // update scaler image transform
    var updateImgTrafo = function (data) {
        var $img = data.$img;
        if ($img == null)
            return;
        var image  = $img.get(0);
        var imgLoaded = $.browser.msie
            ? image.width > 0
            : image.complete;
        if (imgLoaded) {
            // create Transform from current zoomArea and image size
            data.imgTrafo = getImgTrafo($img, data.zoomArea,
                    data.settings.rot, data.scalerFlags.hmir, data.scalerFlags.vmir,
                    data.scaleMode, data);
            // console.debug("imgTrafo=", data.imgTrafo);
        }
    };

    // returns handler for load event of scaler img
    var scalerImgLoadedHandler = function (data) {
        return function () {
            var $img = $(this);
            console.debug("scaler img loaded=",$img);
            var $scaler = data.$scaler;
            var imgRect = geom.rectangle($img);
            // adjust scaler div size
            imgRect.adjustDiv($scaler);
            // show image in case it was hidden (for example in zoomDrag)
            $img.css('visibility', 'visible');
            $scaler.css({'opacity' : '1', 'background-image' : 'none'});
            // update display (render marks, etc.)
            updateDisplay(data);
        };
    };

    // handler for imageInfo loaded event
    var handleImageInfo = function (evt, json) {
        var data = this;
        updateDisplay(data);
    };

    // place marks on the image
    var renderMarks = function (data) {
        if (data.$img == null || data.imgTrafo == null) return;
        console.debug("renderMarks: img=",data.$img," imgtrafo=",data.imgTrafo);
        var $elem = data.$elem;
        var marks = data.marks;
        // clear marks
        $elem.find('div.mark').remove();
        for (var i = 0; i < marks.length; i++) {
            var mark = marks[i];
            if (data.zoomArea.containsPosition(mark)) {
                var mpos = data.imgTrafo.transform(mark);
                console.debug("renderMarks: pos=",mpos);
                // create mark
                var html = '<div class="mark overlay">'+(i+1)+'</div>';
                var $mark = $(html);
                $mark.attr("id", "digilib-mark-"+(i+1));
                $elem.append($mark);
                mpos.adjustDiv($mark);
                }
            }
    };

    // zooms by the given factor
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
        data.zoomArea = newarea;
        redisplay(data);
    };

    // add a mark where clicked
    var setMark = function (data) {
        var $scaler = data.$scaler;
        // unbind other handler
        $scaler.unbind(".dlZoomDrag");
        // start event capturing
        $scaler.one('mousedown.dlSetMark', function (evt) {
            // event handler adding a new mark
            console.log("setmark at=", evt);
            var mpos = geom.position(evt);
            var pos = data.imgTrafo.invtransform(mpos);
            data.marks.push(pos);
            redisplay(data);
            return false;
        });
    };

    // zoom to the area around two clicked points
    var zoomArea = function(data) {
        $elem = data.$elem;
        $scaler = data.$scaler;
        var pt1, pt2;
        var $zoomDiv = $('<div class="zoomrect" style="display:none"/>');
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
            $elem.bind("mousemove.dlZoomArea", zoomMove);
            $elem.bind("mouseup.dlZoomArea", zoomEnd);
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
            $elem.unbind("mousemove.dlZoomArea", zoomMove);
            $elem.unbind("mouseup.dlZoomArea", zoomEnd);
            // clip and transform
            clickRect.clipTo(picRect);
            var area = data.imgTrafo.invtransform(clickRect);
            data.zoomArea = area;
            // zoomed is always fit
            data.settings.ws = 1;
            delete data.dlOpts.fitwidth;
            delete data.dlOpts.fitheight;
            redisplay(data);
            return false;
        };

        // clear old handler (also ZoomDrag)
        $scaler.unbind('.dlZoomArea');
        $scaler.unbind(".dlZoomDrag");
        $elem.unbind('.dlZoomArea');
        // bind start zoom handler
        $scaler.one('mousedown.dlZoomArea', zoomStart);
    };

    // set zoom background
    var setZoomBG = function(data) {
        var $scaler = data.$scaler;
        var $img = data.$img;
        var fullRect = null;
        // hide the scaler img, show background of div instead
        $img.css('visibility', 'hidden');
        var scalerCss = {
            'background-image' : 'url(' + $img.attr('src') + ')',
            'background-repeat' : 'no-repeat',
            'background-position' : 'left top',
            'opacity' : '0.5',
            'cursor' : 'move'
            };
        if (data.hasBgSize) {
            // full-size background using CSS3-background-size
            fullRect = data.imgTrafo.transform(FULL_AREA);
            if (fullRect.height < data.settings.maxBgSize && fullRect.width < data.settings.maxBgSize) {
                // correct offset because background is relative
                var scalerPos = geom.position($scaler);
                fullRect.addPosition(scalerPos.neg());
                var url = getBgImgUrl(data);
                scalerCss['background-image'] = 'url(' + url + ')';
                scalerCss[data.bgSizeName] = fullRect.width + 'px ' + fullRect.height + 'px';
                scalerCss['background-position'] = fullRect.x + 'px '+ fullRect.y + 'px';
            } else {
                // too big
                fullRect = null;
                }
            }
            $scaler.css(scalerCss);
            // isBgReady = true;
        return fullRect;
    };

    // setup handlers for dragging the zoomed image
    var setupZoomDrag = function(data) {
        var startPos, delta, fullRect;
        var $document = $(document);
        var $data = $(data);
        var $elem = data.$elem;
        var $scaler = data.$scaler;
        var $img = data.$img;

        // drag the image and load a new detail on mouse up
        var dragStart = function (evt) {
            console.debug("dragstart at=", evt);
            // don't start dragging if not zoomed
            if (isFullArea(data.zoomArea)) return false;
            $elem.find(".overlay").hide(); // hide all overlays (marks/regions)
            startPos = geom.position(evt);
            delta = null;
            // set low res background immediately on mousedown
            fullRect = setZoomBG(data);
            $document.bind("mousemove.dlZoomDrag", dragMove);
            $document.bind("mouseup.dlZoomDrag", dragEnd);
            return false;
            };

        // mousemove handler: drag zoomed image
        var dragMove = function (evt) {
            var pos = geom.position(evt);
            delta = startPos.delta(pos);
            if (fullRect) {
                var bgPos = fullRect.getPosition().add(delta);
            } else {
                var bgPos = delta;
            }
            // move the background image to the new position
            $scaler.css({
                'background-position' : bgPos.x + "px " + bgPos.y + "px"
                });
            // send message event with current zoom position
            var za = geom.rectangle($img);
            za.addPosition(delta.neg());
            $data.trigger('dragZoom', [za]);
            //TODO: setBirdZoom(data, za);
            return false;
            };

        // mouseup handler: reload zoomed image in new position
        var dragEnd = function (evt) {
            $scaler.css('cursor', 'auto');
            $document.unbind("mousemove.dlZoomDrag", dragMove);
            $document.unbind("mouseup.dlZoomDrag", dragEnd);
            if (delta == null || delta.distance() < 2) {
                // no movement
                $img.css('visibility', 'visible');
                $scaler.css({'opacity' : '1', 'background-image' : 'none'});
                // unhide marks
                data.$elem.find('div.mark').show();
                $(data).trigger('redisplay');
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
        $document.unbind(".dlZoomDrag");
        $scaler.unbind(".dlZoomDrag");
        if (! isFullArea(data.zoomArea)) {
            // set handler
            $scaler.bind("mousedown.dlZoomDrag", dragStart);
        }
    };

    // get image quality as a number (0..2)
    var getQuality = function (data) {
        var flags = data.scalerFlags;
        var q = flags.q2 || flags.q1 || 'q0'; // assume q0 as default
        return parseInt(q[1], 10);
    };

    // set image quality as a number (0..2)
    var setQuality = function (data, qual) {
        var flags = data.scalerFlags;
        // clear flags
        for (var i = 0; i < 3; ++i) {
            delete flags['q'+i];
            }
        flags['q'+qual] = 'q'+qual;
    };

    // get image scale mode (screen, pixel, size)
    var getScaleMode = function (data) {
        if (data.scalerFlags.clip != null) {
            return 'pixel';
        } else if (data.scalerFlags.osize != null) {
            return 'size';
        }
        // mo=fit is default
        return 'screen';
    };

    // set image scale mode (screen, pixel, size)
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
    };

     // sets a key to a value (relative values with +/- if relative=true)
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

    // auxiliary function, assuming equal border width on all sides
    var getBorderWidth = function($elem) {
        var border = $elem.outerWidth() - $elem.width();
        return border/2;
    };

    // auxiliary function, can the current zoomarea be moved further?
    var canMove = function(data, movx, movy) {
        var za = data.zoomArea;
        if (isFullArea(za)) return false;
        var x2 = za.x + za.width;
        var y2 = za.y + za.height;
        return ((movx < 0) && (za.x > 0))
            || ((movx > 0) && (x2 < 1.0))
            || ((movy < 0) && (za.y > 0))
            || ((movy > 0) && (y2 < 1.0))
    };

    // auxiliary function (from old dllib.js)
    var isFullArea = function (area) {
        return (area.width === 1.0) && (area.height === 1.0);
    };

    // auxiliary function (from Douglas Crockford, A.10)
    var isNumber = function (value) {
        return typeof value === 'number' && isFinite(value);
    };

    // auxiliary function to crop senseless precision
    var cropFloat = function (x) {
        return parseInt(10000 * x, 10) / 10000;
    };

    // idem, string version
    var cropFloatStr = function (x) {
        return cropFloat(x).toString();
    };

    // fallback for console.log calls
    if (customConsole) {
        var logFunction = function(type) {
            return function(){
                var $debug = $('#debug'); // debug div
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

    // functions to export to plugins
    fn = {
            geometry : geom,
            parseQueryString : parseQueryString,
            getScalerUrl : getScalerUrl,
            getParamString : getParamString,
            getDigilibUrl : getDigilibUrl,
            unpackParams : unpackParams,
            packParams : packParams,
            packArea : packArea,
            packMarks : packMarks,
            packScalerFlags : packScalerFlags,
            storeOptions : storeOptions,
            redisplay : redisplay,
            updateDisplay : updateDisplay,
            highlightButtons : highlightButtons,
            showDiv : showDiv,
            setZoomBG : setZoomBG,
            getImgTrafo : getImgTrafo,
            getQuality : getQuality,
            setQuality : setQuality,
            getScaleMode : getScaleMode,
            setScaleMode : setScaleMode,
            canMove : canMove,
            isFullArea : isFullArea,
            isNumber : isNumber,
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