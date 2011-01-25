/*
 * digilib jQuery plugin
 *
 */

// fallback for console.log calls
if (typeof(console) === 'undefined') {
    var console = {
            log : function(){},
            debug : function(){},
            error : function(){}
    };
}

(function($) {
    var buttons = {
        reference : {
            onclick : "javascript:getRefWin()",
            tooltip : "get a reference URL",
            img : "reference.png"
            },
        zoomin : {
            onclick : ["zoomBy", 1.4],
            tooltip : "zoom in",
            img : "zoom-in.png"
            },
        zoomout : {
            onclick : ["zoomBy", 0.7],
            tooltip : "zoom out",
            img : "zoom-out.png"
            },
        zoomarea : {
            onclick : "zoomArea",
            tooltip : "zoom area",
            img : "zoom-area.png"
            },
        zoomfull : {
            onclick : "zoomFull",
            tooltip : "view the whole image",
            img : "zoom-full.png"
            },
        pagewidth : {
            onclick : ["zoomFull", "width"],
            tooltip : "page width",
            img : "pagewidth.png"
            },
        back : {
            onclick : ["gotoPage", "-1"],
            tooltip : "goto previous image",
            img : "back.png"
            },
        fwd : {
            onclick : ["gotoPage", "+1"],
            tooltip : "goto next image",
            img : "fwd.png"
            },
        page : {
            onclick : "javascript:gotoPageWin()",
            tooltip : "specify image",
            img : "page.png"
            },
        bird : {
            onclick : "showBirdDiv",
            tooltip : "show bird's eye view",
            img : "birds-eye.png"
            },
        help : {
            onclick : "showAboutDiv",
            tooltip : "about Digilib",
            img : "help.png"
            },
        reset : {
            onclick : "javascript:resetImage()",
            tooltip : "reset image",
            img : "reset.png"
            },
        mark : {
            onclick : "setMark",
            tooltip : "set a mark",
            img : "mark.png"
            },
        delmark : {
            onclick : "removeMark",
            tooltip : "delete the last mark",
            img : "delmark.png"
            },
        hmir : {
            onclick : ["mirror", "h"],
            tooltip : "mirror horizontally",
            img : "mirror-horizontal.png"
            },
        vmir : {
            onclick : ["mirror", "v"],
            tooltip : "mirror vertically",
            img : "mirror-vertical.png"
            },
        rot : {
            onclick : "rotate",
            tooltip : "rotate image",
            img : "rotate.png"
            },
        brgt : {
            onclick : "brightness",
            tooltip : "set brightness",
            img : "brightness.png"
            },
        cont : {
            onclick : "contrast",
            tooltip : "set contrast",
            img : "contrast.png"
            },
        rgb : {
            onclick : "javascript:setParamWin('rgb', '...')",
            tooltip : "set rgb values",
            img : "rgb.png"
            },
        quality : {
            onclick : "javascript:setQualityWin('Quality (0..2)')",
            tooltip : "set image quality",
            img : "quality.png"
            },
        size : {
            onclick : "javascript:toggleSizeMenu()",
            tooltip : "set page size",
            img : "size.png"
            },
        calibrationx : {
            onclick : "javascript:calibrate('x')",
            tooltip : "calibrate screen x-ratio",
            img : "calibration-x.png"
            },
        scale : {
            onclick : "javascript:toggleScaleMenu()",
            tooltip : "change image scale",
            img : "original-size.png"
            },
        options : {
            onclick : "javascript:toggleOptionDiv()",
            tooltip : "hide options",
            img : "options.png"
            },
        SEP : {
            img : "sep.png"
            }
        };

    var defaults = {
        // version of this script
        'version' : 'jquery.digilib.js 0.9',
        // logo url
        'logoUrl' : '../img/digilib-logo-text1.png',
        // homepage url (behind logo)
        'homeUrl' : 'http://digilib.berlios.de',
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
        'digilibParamNames' : ['fn','pn','ww','wh','wx','wy','ws','mo','rot','cont','brgt','rgbm','rgba','mk','clop'],
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
                //'standardSet' : ["reference","zoomin","zoomout","zoomarea","zoomfull","pagewidth","back","fwd","page","bird","SEP","help","reset","options"],
                'standardSet' : ["reference","zoomin","zoomout","zoomarea","zoomfull","pagewidth","mark","delmark","hmir","vmir","back","fwd","page","rot","brgt","cont","rgb","quality","size","calibrationx","scale","bird","help","options"],
                'specialSet' : ["mark","delmark","hmir","vmir","rot","brgt","cont","rgb","quality","size","calibrationx","scale","SEP","options"],
                'customSet' : []
                },
            'embedded' : {
                'imagePath' : 'img/embedded/16/',
                'standardSet' : ["reference","zoomin","zoomout","zoomarea","zoomfull","hmir","vmir","back","fwd","page","rot","brgt","cont","rgb","quality","size","scale","bird","help","options"],
                'specialSet' : ["mark","delmark","hmir","vmir","rot","brgt","cont","rgb","quality","size","calibrationx","scale","SEP","options"],
                'customSet' : []
                }
            },
        // button groups
        // is birdView shown?
        'isBirdDivVisible' : false,
        // dimensions of bird's eye div
        'birdDivOptions' : {'dw' : 200, 'dh' : 200},
        // style of the zoom area indicator in the bird's eye div 
        'birdIndicatorStyle' : {'border' : '2px solid #ff0000' },
        // style of zoom area "rubber band"
        'zoomrectStyle' : {'border' : '2px solid #ff0000' },
        // is the "about" window shown?
        'isAboutDivVisible' : false

        };

    // affine geometry classes
    var geom = dlGeometry();

    var MAX_ZOOMAREA = geom.rectangle(0, 0, 1, 1);

    var actions = {
        // init: digilib initialization
        init : function(options) {
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
                var elemSettings;
                // if the plugin hasn't been initialized yet
                if (!data) {
                    // merge query parameters
                    if (isFullscreen) {
                        elemSettings = $.extend({}, settings, queryParams);
                    } else {
                        elemSettings = $.extend({}, settings, parseImgParams($elem));
                    }
                    // store $(this) element in the settings
                    data =  {
                            $elem : $elem,
                            settings : elemSettings,
                            queryParams : queryParams
                    };
                    // store in data element
                    $elem.data('digilib', data);
                }
                unpackParams(data);
                // create HTML structure
                setupScalerDiv(data);
                setupButtons(data, 'standardSet');
                // bird's eye view creation
                if (elemSettings.isBirdDivVisible) {
                    setupBirdDiv(data);
                }
                // about window creation - TODO: could be deferred? restrict to only one item?
                setupAboutDiv(data);
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
            data.settings.isAboutDivVisible = showDiv(data.settings.isAboutDivVisible, data.$aboutDiv, show);
        },

        // event handler: toggles the visibility of the bird's eye window 
        showBirdDiv : function (data, show) {
            if (data.$birdDiv == null) {
                // no bird div -> create
                setupBirdDiv(data);
            }
            // TODO: keep bird view visible after reload (parameter, cookie?)
            data.settings.isBirdDivVisible = showDiv(data.settings.isBirdDivVisible, data.$birdDiv, show);
        },

        // goto given page nr (+/-: relative)
        gotoPage : function (data, pageNr) {
            var settings = data.settings;
            var oldpn = settings.pn;
            var pn = setNumValue(settings, "pn", pageNr);
            if (pn == null) return false; // nothing happened
            if (pn < 1) {
                alert("no such page (page number too low)");
                settings.pn = oldpn;
                return false;
                }
            if (settings.pt) {
                if (pn > settings.pt) {
                    alert("no such page (page number too high)");
                    settings.pn = oldpn;
                    return false;
                    }
                }
            // reset mk and others(?)
            data.marks = [];
            data.zoomArea = MAX_ZOOMAREA;
            // then reload
            redisplay(data);
        },

        // zoom by a given factor
        zoomBy : function (data, factor) {
            zoomBy(data, factor);
        },

        // zoom interactively
        zoomArea : function (data) {
            zoomArea(data);
        },

        // zoom out to full page
        zoomFull : function (data, mode) {
            data.zoomArea = MAX_ZOOMAREA;
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
        }
    };

    // returns parameters from page url
    var parseQueryParams = function() {
        return parseQueryString(window.location.search.slice(1));
    };

    // returns parameters from embedded img-element
    var parseImgParams = function($elem) {
        var src = $elem.find('img').first().attr('src');
        if (!src) {
            return null;
        }
        var pos = src.indexOf('?');
        var query = (pos < 0) ? '' : src.substring(pos + 1);
        var scalerUrl = src.substring(0, pos);
        var params = parseQueryString(query);
        params.scalerBaseUrl = scalerUrl;
        return params;
    };

    // parses query parameter string into parameter object
    var parseQueryString = function(query) {
        var pairs = query.split("&");
        var params = {};
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
        var settings = data.settings;
        if (settings.scalerBaseUrl == null) {
            alert("ERROR: URL of digilib Scaler servlet missing!");
        }
        packParams(data);
        var keys = settings.scalerParamNames;
        var queryString = getParamString(settings, keys, defaults);
        var url = settings.scalerBaseUrl + '?' + queryString;
        return url;
    };

    // returns URL and query string for current digilib
    var getDigilibUrl = function (data) {
        packParams(data);
        var settings = data.settings;
        var queryString = getParamString(settings, settings.digilibParamNames, defaults);
        var url = window.location.toString();
        var pos = url.indexOf('?');
        var baseUrl = url.substring(0, pos);
        var newurl = baseUrl + '?' + queryString;
        return newurl;
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
        // clop (digilib options)
        var opts = {};
        if (settings.clop) {
            var pa = settings.clop.split(",");
            for (var i = 0; i < pa.length ; i++) {
                opts[pa[i]] = pa[i];
            }
        }
        data.dlOpts = opts;
        // birdview option
        if (opts.birdview) {
            settings.isBirdDivVisible = 1; 
        }
    };

    // put objects back into parameters
    var packParams = function (data) {
        var settings = data.settings;
        // zoom area
        if (data.zoomArea) {
            settings.wx = cropFloat(data.zoomArea.x);
            settings.wy = cropFloat(data.zoomArea.y);
            settings.ww = cropFloat(data.zoomArea.width);
            settings.wh = cropFloat(data.zoomArea.height);
        }
        // marks
        if (data.marks) {
            settings.mk = '';
            for (var i = 0; i < data.marks.length; i++) {
                if (i) {
                    settings.mk += ',';
                }
                settings.mk += cropFloat(data.marks[i].x).toString() + '/' + cropFloat(data.marks[i].y).toString();
            }
        }
        // Scaler flags
        if (data.scalerFlags) {
            var mo = '';
            for (var f in data.scalerFlags) {
                if (mo) {
                    mo += ',';
                }
                mo += f;
            }
            settings.mo = mo;
        }
        // digilib option birdview
        if (settings.isBirdDivVisible) {
            data.dlOpts.birdview = 1;
        } else {
            delete data.dlOpts.birdview;
        }
        // digilib options
        if (data.dlOpts) {
            var clop = '';
            for (var o in data.dlOpts) {
                if (clop) {
                    clop += ',';
                }
                clop += o;
            }
            settings.clop = clop;
        }
    };

    // (re)load the img from a new scaler URL
    var redisplay = function (data) {
        var settings = data.settings; 
        if (settings.interactionMode === 'fullscreen') {
            // update location.href (browser URL) in fullscreen mode
            var url = getDigilibUrl(data);
            var history = window.history;
            if (typeof(history.pushState) === 'function') {
                console.debug("we could modify history, but we don't...");
            }
            window.location = url;
        } else {
            // embedded mode -- just change img src
            var url = getScalerUrl(data);
            data.$img.attr('src', url);
            };
    };

    // returns maximum size for scaler img in fullscreen mode
    var getFullscreenImgSize = function($elem) {
        var $win = $(window);
        var winH = $win.height();
        var winW = $win.width();
        // TODO: account for borders?
        return geom.size(winW, winH);
    };

    // creates HTML structure for digilib in elem
    var setupScalerDiv = function (data) {
        var settings = data.settings;
        var $elem = data.$elem;
        var $img;
        if (settings.interactionMode === 'fullscreen') {
            // fullscreen
            var imgSize = getFullscreenImgSize($elem);
            // fitwidth/height omits destination height/width
            if (data.dlOpts['fitheight'] == null) {
                settings.dw = imgSize.width;
            }
            if (data.dlOpts['fitwidth'] == null) {
                settings.dh = imgSize.height;
            }
            $img = $('<img/>');
            var scalerUrl = getScalerUrl(data);
            $img.attr('src', scalerUrl);
        } else {
            // embedded mode -- try to keep img tag
            $img = $elem.find('img');
            if ($img.length > 0) {
                console.debug("img detach:",$img);
                $img.detach();
            } else {
                $img = $('<img/>');
                var scalerUrl = getScalerUrl(data);
                $img.attr('src', scalerUrl);
            }
        }
        // create new html
        $elem.empty(); // TODO: should we keep stuff for customization?
        var $scaler = $('<div class="scaler"/>');
        $elem.append($scaler);
        $scaler.append($img);
        $img.addClass('pic');
        data.$scaler = $scaler;
        data.$img = $img;
        $img.load(scalerImgLoadedHandler(data));
    };

    // creates HTML structure for buttons in elem
    var setupButtons = function (data, actionGroup) {
        var $elem = data.$elem;
        var settings = data.settings;
        // if (settings.interactionMode === 'fullscreen') {
        var $buttonsDiv = $('<div class="buttons"></div>');
        $elem.append($buttonsDiv);
        var mode = settings.interactionMode;
        var buttonSettings = settings.buttonSettings[mode];
        var actionNames = buttonSettings[actionGroup];
        for (var i = 0; i < actionNames.length; i++) {
            var actionName = actionNames[i];
            var buttonConfig = settings.buttons[actionName];
            // construct the button html
            var $button = $('<div class="button"></div>');
            var $a = $('<a/>');
            var $img = $('<img class="button"/>');
            $buttonsDiv.append($button);
            $button.append($a);
            $a.append($img);
            // add attributes and bindings
            $button.attr('title', buttonConfig.tooltip);
            $button.addClass('button-' + actionName);
            // create handler for the buttons
            $a.bind('click.digilib', (function () {
                // we create a new closure to capture the value of action
                var action = buttonConfig.onclick;
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
            $img.attr('src', buttonSettings.imagePath + buttonConfig.img);
            }
        // make buttons div scroll if too large for window
        if ($buttonsDiv.height() > $(window).height() - 10) {
            $buttonsDiv.css('position', 'absolute');
        }
        return $buttonsDiv;
    };

    // creates HTML structure for the bird's eye view in elem
    var setupBirdDiv = function (data) {
        var $elem = data.$elem;
        var settings = data.settings;
        // use only the relevant parameters
        var keys = ['fn','pn','dw','dh'];
        var birdSettings = $.extend({}, settings, settings.birdDivOptions);
        var birdUrl = settings.scalerBaseUrl + '?' + getParamString(birdSettings, keys);
        // the bird's eye div
        var $birdDiv = $('<div class="birdview" style="display:none"/>');
        // the detail indicator frame
        var $birdzoomDiv = $('<div class="birdzoom" style="display:none; position:absolute; background-color:transparent;"/>');
        // the small image
        var $birdImg = $('<img class="birdimg"/>');
        $elem.append($birdDiv);
        $birdDiv.append($birdzoomDiv);
        $birdDiv.append($birdImg);
        $birdzoomDiv.css(data.settings.birdIndicatorStyle);
        data.$birdDiv = $birdDiv;
        data.$birdImg = $birdImg;
        $birdImg.load(birdImgLoadedHandler(data));
        $birdImg.attr('src', birdUrl);
        if (data.settings.isBirdDivVisible) {
            $birdDiv.fadeIn();
        }
    };

    // creates HTML structure for the about view in elem
    var setupAboutDiv = function (data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var $aboutDiv = $('<div class="about" style="display:none"/>');
        var $header = $('<p>Digilib Graphic Viewer</p>');
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
        // click hides
        $aboutDiv.bind('click.digilib', function () { 
            settings.isAboutDivVisible = showDiv(settings.isAboutDivVisible, $aboutDiv, 0);
            return false;
        });
        data.$aboutDiv = $aboutDiv;
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

    // create Transform from area and $img
    var getImgTrafo = function ($img, area, data) {
        var picrect = geom.rectangle($img);
        var trafo = geom.transform();
        // zoom area offset
        trafo.concat(trafo.getTranslation(geom.position(-area.x, -area.y)));
        // zoom area size
        trafo.concat(trafo.getScale(geom.size(1/area.width, 1/area.height)));
        // rotate
        if (data) {
            /* var rot = trafo.getRotationAround(parseFloat(data.settings.rot), 
                    geom.position(0.5 * area.width + area.x, 0.5 * area.height + area.y)); */
            var rot = trafo.getRotationAround(parseFloat(data.settings.rot), 
                    geom.position(0.5, 0.5));
            trafo.concat(rot);
        }
        // scale to screen position and size
        trafo.concat(trafo.getScale(picrect));
        trafo.concat(trafo.getTranslation(picrect));
        return trafo;
    };
    
    // returns function for load event of scaler img
    var scalerImgLoadedHandler = function (data) {
        var $img = data.$img;
        return function () {
            console.debug("img loaded! this=", this, " data=", data);
            // create Transform from current area and picsize
            data.imgTrafo = getImgTrafo($img, data.zoomArea, data);
            // display marks
            renderMarks(data);
            //digilib.showArrows(); // show arrow overlays for zoom navigation
            var $birdImg = data.$birdImg;
            if ($birdImg) {
                $birdImg.triggerHandler('load');
                };
        };
    };

    // returns function for load event of bird's eye view img
    var birdImgLoadedHandler = function (data) {
        var $img = data.$birdImg;
        return function () {
            if (!$img) return;
            // console.debug("birdimg loaded! this=", this, " data=", data);
            // create Transform from current area and picsize
            data.birdTrafo = getImgTrafo($img, MAX_ZOOMAREA);
            // display red indicator around zoomarea
            renderBirdArea(data);
        };
    };

    // place marks on the image
    var renderMarks = function (data) {
        var $elem = data.$elem;
        var marks = data.marks;
        // TODO: clear marks first(?)
        for (var i = 0; i < marks.length; i++) {
            var mark = marks[i];
            if (data.zoomArea.containsPosition(mark)) {
                var mpos = data.imgTrafo.transform(mark);
                console.debug("renderMarks: mpos=",mpos);
                // create mark
                var html = '<div class="mark">'+(i+1)+'</div>';
                var $mark = $(html);
                $elem.append($mark);
                $mark.offset({left : mpos.x, top : mpos.y});
            }
        }
    };

    var renderBirdArea = function (data) {
        var $ind = data.$birdDiv.find('div.birdzoom');
        var zoomArea = data.zoomArea;
        var indRect = data.birdTrafo.transform(zoomArea);
        var coords = {
            left : indRect.x-2, // acount for frame width
            top : indRect.y-2,
            width : indRect.width,
            height: indRect.height
            };
        var normalSize = isFullArea(zoomArea);
        if (data.settings.interactionMode === 'fullscreen') {
            // no animation for fullscreen
            if (normalSize) return $ind.hide(); 
            $ind.width(coords.width);
            $ind.height(coords.height);
            $ind.offset(coords);
            $ind.show();
            return;
            };
        // nice animation for embedded mode :-)
        var makeCompleteFunction = function($ind, normalSize) {
            return function() { 
                if (normalSize) $ind.hide(); 
                };
            };
        var opts = {
            'complete' : makeCompleteFunction($ind, normalSize)
            };
        if (!normalSize && $ind.css('display') === 'none') $ind.show();
        $ind.animate(coords, opts);
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
        newarea = MAX_ZOOMAREA.fit(newarea);
        data.zoomArea = newarea;
        redisplay(data);
    };

    // add a mark where clicked
    var setMark = function (data) {
        var $scaler = data.$scaler;
        // start event capturing
        $scaler.one('click.digilib', function (evt) {
            // event handler adding a new mark
            var mpos = geom.position(evt);
            var pos = data.imgTrafo.invtransform(mpos);
            data.marks.push(pos);
            redisplay(data);
            return false; // do we even get here?
        });
    };

    var zoomArea = function(data) {
        $elem = data.$elem;
        $scaler = data.$scaler;
        var pt1, pt2;
        var $zoomDiv = $('<div class="zoomrect" style="display:none"/>');
        $elem.append($zoomDiv);
        $zoomDiv.css(data.settings.zoomrectStyle);
        var picRect = geom.rectangle($scaler);
        // FIX ME: is there a way to query the border width from CSS info?
        // rect.x -= 2; // account for overlay borders
        // rect.y -= 2;

        var zoomStart = function (evt) {
            pt1 = geom.position(evt);
            // setup and show zoom div
            //moveElement(zoomdiv, Rectangle(pt1.x, pt1.y, 0, 0));
            $zoomDiv.offset({left : pt1.x, top : pt1.y});
            $zoomDiv.width(0).height(0);
            $zoomDiv.show();
            // register events
            $elem.bind("mousemove.digilib", zoomMove);
            $elem.bind("mouseup.digilib", zoomEnd);
            return false;
        };

        // mouseup handler: end moving
        var zoomEnd = function (evt) {
            pt2 = geom.position(evt);
            // assume a click and continue if the area is too small
            var clickRect = geom.rectangle(pt1, pt2);
            if (clickRect.getArea() <= 5) {
                return false;
            }
            // hide zoom div
            $zoomDiv.remove();
            // unregister events
            $elem.unbind("mousemove.digilib", zoomMove);
            $elem.unbind("mouseup.digilib", zoomEnd);
            // clip and transform
            clickRect.clipTo(picRect);
            var area = data.imgTrafo.invtransform(clickRect);
            data.zoomArea = area;
            // zoomed is always fit
            data.settings.ws = 1;
            redisplay(data);
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

        // bind start zoom handler
        $scaler.one('mousedown.digilib', zoomStart);
    };

    // sets a key to a value (relative values with +/- if relative=true)
    var setNumValue = function(settings, key, value) {
        if (isNumber(value)) return settings[key] = value; 
        var sign = value.substring(0,1);
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

    // auxiliary function (from old dllib.js)
    isFullArea = function(area) {
        return (area.width === 1.0) && (area.height === 1.0);
    };

    // auxiliary function (from Douglas Crockford, A.10)
    var isNumber = function isNumber(value) {
            return typeof value === 'number' && isFinite(value);
    };

    // auxiliary function to crop senseless precision
    var cropFloat = function (x) {
        return parseInt(10000 * x, 10) / 10000;
    };

    // hook plugin into jquery
    $.fn.digilib = function(action) {
        if (actions[action]) {
            // call action on this with the remaining arguments (inserting data as first argument)
            var $elem = $(this);
            var data = $elem.data('digilib');
            var args = Array.prototype.slice.call(arguments, 1);
            args.unshift(data);
            return actions[action].apply(this, args);
        } else if (typeof(action) === 'object' || !action) {
            // call init on this
            return actions.init.apply(this, arguments);
        } else {
            $.error( 'action ' + action + ' does not exist on jQuery.digilib' );
        }
    };
    
})(jQuery);