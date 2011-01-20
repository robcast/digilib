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
    var actions = {
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
            onclick : "javascript:zoomArea()",
            tooltip : "zoom area",
            img : "zoom-area.png"
            },
        zoomfull : {
            onclick : "zoomFullpage",
            tooltip : "view the whole image",
            img : "zoom-full.png"
            },
        pagewidth : {
            onclick : "javascript:zoomFullpage('width')",
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
            onclick : "javascript:removeMark()",
            tooltip : "delete the last mark",
            img : "delmark.png"
            },
        hmir : {
            onclick : "javascript:mirror('h')",
            tooltip : "mirror horizontally",
            img : "mirror-horizontal.png"
            },
        vmir : {
            onclick : "javascript:mirror('v')",
            tooltip : "mirror vertically",
            img : "mirror-vertical.png"
            },
        rot : {
            onclick : "javascript:setParamWin('rot', 'Rotate (0..360) clockwise')",
            tooltip : "rotate image",
            img : "rotate.png"
            },
        brgt : {
            onclick : "javascript:setParamWin('brgt', 'Brightness (-255..255)')",
            tooltip : "set brightness",
            img : "brightness.png"
            },
        cont : {
            onclick : "javascript:setParamWin('cont', 'Contrast (0..8)')",
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
        // the root digilib element, for easy retrieval
        'digilibRoot' : null,
        // version of this script
        'version' : 'jquery.digilib.js 0.9',
        // logo url
        'logoUrl' : '../img/digilib-logo-text1.png',
        // homepage url (behind logo)
        'homeUrl' : 'http://digilib.berlios.de',
        // base URL to Scaler servlet
        'scalerBaseUrl' : 'http://digilib.mpiwg-berlin.mpg.de/digitallibrary/servlet/Scaler',
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
        'digilibParamNames' : ['fn','pn','ww','wh','wx','wy','ws','mo','rot','cont','brgt','rgbm','rgba',
                               'mk'],
        // digilib parameter defaults
        'mk' : '',
        // mode of operation: 
        // fullscreen = take parameters from page URL, keep state in page URL
        // embedded = take parameters from Javascript options, keep state inside object 
        'interactionMode' : 'fullscreen',
        // actions
        'actions' : actions,
        // path to button images (must end with a slash)
        'buttonsImagePath' : '../greyskin/', 
        // actions groups
        'actionsStandard' : ["reference","zoomin","zoomout","zoomarea","zoomfull","pagewidth","mark","back","fwd","page","bird","SEP","help","reset","options"],
        'actionsSpecial' : ["mark","delmark","hmir","vmir","rot","brgt","cont","rgb","quality","size","calibrationx","scale","SEP","options"],
        'actionsCustom' : [],
        // is birdView shown?
        'isBirdDivVisible' : false,
        // dimensions of bird's eye window
        'birdDivOptions' : {'dw' : 200, 'dh' : 200},
        // is the "about" window shown?
        'isAboutDivVisible' : false

        };
 
    // affine geometry classes
    var geom = dlGeometry();
    
    var MAX_ZOOMAREA = geom.rectangle(0, 0, 1, 1);
    
    var methods = {
            // digilib initialization
            init : function(options) {
                // settings for this digilib instance are merged from defaults and options
                var settings = $.extend({}, defaults, options);
                var isFullscreen = settings.interactionMode === 'fullscreen';
                var queryParams = {};
                if (isFullscreen) {
                    queryParams = parseQueryParams();
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
                    setupButtons(data, 'actionsStandard');
                    // bird's eye view creation
                    if (settings.isBirdDivVisible) {
                        setupBirdDiv(data);
                    }
                    // about window creation - TODO: could be deferred? restrict to only one item?
                    setupAboutDiv(data);
                });
            },

            // clean up digilib
            destroy : function() {
                return this.each(function(){
                    var $elem = $(this);
                    var data = $elem.data('digilib');
                    // Namespacing FTW
                    $(window).unbind('.digilib'); // unbinds all digilibs(?)
                    data.digilib.remove();
                    $elem.removeData('digilib');
                });
            },

            // show or hide the 'about' window
            showAboutDiv : function(show) {
                var $elem = $(this);
                var data = $elem.data('digilib');
                data.settings.isAboutDivVisible = showDiv(data.settings.isAboutDivVisible, data.$aboutDiv, show);
            },

            // event handler: toggles the visibility of the bird's eye window 
            showBirdDiv : function (show) {
                var $elem = $(this);
                var data = $elem.data('digilib');
                if (data.$birdDiv == null) {
                    // no bird div -> create
                    setupBirdDiv(data);
                }
                data.settings.isBirdDivVisible = showDiv(data.settings.isBirdDivVisible, data.$birdDiv, show);
            },
            
            // goto given page nr (+/-: relative)
            gotoPage : function (pageNr) {
                var $elem = $(this);
                var data = $elem.data('digilib');
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
            zoomBy : function (factor) {
                var $elem = $(this);
                var data = $elem.data('digilib');
                zoomBy(data, factor);
            },

            // zoom out to full page
            zoomFullpage : function () {
                var $elem = $(this);
                var data = $elem.data('digilib');
                data.zoomArea = MAX_ZOOMAREA;
                redisplay(data);
            },

            // set a mark by clicking (or giving a position)
            setMark : function (mpos) {
                var $elem = $(this);
                var data = $elem.data('digilib');
                if (mpos == null) {
                    // interactive
                    setMark(data);
                } else {
                    // use position
                    data.marks.push(pos);
                    redisplay(data);
                }
            }
    };

    // sets a key to a value (relative values with +/- if relative=true)
    var setNumValue = function(settings, key, value) {
        if (isNumber(value)) return settings[key] = value; 
        var sign = value.substring(0,1);
        if (sign === '+' || sign === '-') {
            if (settings[key] == null) {
                // this doesn't make much sense but still...
                settings[key] = 0;
            }
            settings[key] = parseFloat(settings[key]) + parseFloat(value);
        } else {
    		settings[key] = value;
        }
    	return settings[key];
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
        var latter = false;
        for (i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if ((settings[key] != null) && ((defaults == null) || (settings[key] !== defaults[key]))) {
                // first param gets no '&'
                paramString += latter ? '&' : '';
                latter = true;
                // add parm=val
                paramString += key + '=' + settings[key];
            }
        }
        return paramString;
    };

    // returns URL and query string for Scaler
    var getScalerUrl = function (data) {
        var settings = data.settings;
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
        var mk = settings.mk || '';
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
        data.marks = marks;
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
            var ma = [];
            for (var i = 0; i < data.marks.length; i++) {
                ma.push(cropFloat(data.marks[i].x) + "/" + cropFloat(data.marks[i].y));
            }
            settings.mk = ma.join(",");
        }
    };
    
    // returns maximum size for scaler img in fullscreen mode
    var getFullscreenImgSize = function($elem) {
        var winH = $(window).height();
        var winW = $(window).width();
        // TODO: account for borders?
        return geom.size(winW, winH);
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
        }
    };

    // creates HTML structure for digilib in elem
    var setupScalerDiv = function (data) {
        var settings = data.settings;
        var $elem = data.$elem;
        var $img;
        if (settings.interactionMode === 'fullscreen') {
            // fullscreen
            var imgSize = getFullscreenImgSize($elem);
            settings.dw = imgSize.width;
            settings.dh = imgSize.height;
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
        data.$img = $img;
        $img.load(scalerImgLoadedHandler(data));
    };

    // creates HTML structure for buttons in elem
    var setupButtons = function (data, actionGroup) {
        var $elem = data.$elem;
        var settings = data.settings;
        if (settings.interactionMode === 'fullscreen') {
            // fullscreen -- create new
            var $buttonsDiv = $('<div class="buttons"></div>');
            $elem.append($buttonsDiv);
            var actionNames = settings[actionGroup];
            for (var i = 0; i < actionNames.length; i++) {
                var actionName = actionNames[i];
                var actionSettings = settings.actions[actionName];
                // construct the button html
                var $button = $('<div class="button"></div>');
                var $a = $('<a/>');
                var $img = $('<img class="button"/>');
                $buttonsDiv.append($button);
                $button.append($a);
                $a.append($img);
                // add attributes and bindings
                $button.attr('title', actionSettings.tooltip);
                $button.addClass('button-' + actionName);
                // create handler for the buttons
                $a.bind('click', (function () {
                    // we create a new closure to capture the value of method
                    var method = actionSettings.onclick;
                    if ($.isArray(method)) {
                        // the handler function calls digilib with method and parameters
                        return function () {
                            console.debug('click method=', method);
                            $elem.digilib.apply($elem, method);
                        };
                    } else {
                        // the handler function calls digilib with method
                        return function () {
                            console.debug('click method=', method);
                            $elem.digilib(method);
                        };
                    }
                })());
                $img.attr('src', settings.buttonsImagePath + actionSettings.img);
            }
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
        var $birdviewDiv = $('<div class="birdview" style="display:none"/>');
        // the detail indicator frame
        var $birdzoomDiv = $('<div class="birdzoom"/>');
        // the small image
        var $birdImg = $('<img class="birdimg"/>');
        $elem.append($birdviewDiv);
        $birdviewDiv.append($birdzoomDiv);
        $birdviewDiv.append($birdImg);
        $birdImg.attr('src', birdUrl);
        if (data.settings.isBirdDivVisible) {
            $birdviewDiv.fadeIn();
        }
        data.$birdDiv = $birdviewDiv;
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
        $aboutDiv.bind('click', function () { 
            settings.isAboutDivVisible = showDiv(settings.isAboutDivVisible, $aboutDiv, 0);
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

    // returns function for load event of scaler img
    var scalerImgLoadedHandler = function (data) {
        var settings = data.settings;
        var $elem = data.$elem;
        var $img = data.$img;
        
        return function () {
            console.debug("img loaded! this=", this, " data=", data);
            var area = data.zoomArea;
            // create Transform from current area and picsize
            var picpos = $img.offset();
            var picrect = geom.rectangle(picpos.left, picpos.top, $img.width(), $img.height());
            var trafo = geom.transform();
            // subtract area offset and size
            trafo.concat(trafo.getTranslation(geom.position(- area.x, - area.y)));
            trafo.concat(trafo.getScale(geom.size(1/area.width, 1/area.height)));
            // scale to screen size
            trafo.concat(trafo.getScale(picrect));
            trafo.concat(trafo.getTranslation(picrect));
            data.imgTrafo = trafo;
            // display marks
            renderMarks(data);
            //digilib.showArrows(); // show arrow overlays for zoom navigation
            // done -- hide about div --- 
            // --- why? This only leads to suprise effects when displayed programmatically
            // settings.isAboutDivVisible = showDiv(null, data.$aboutDiv, 0);
        };
    };

    // place marks on the image
    var renderMarks = function (data) {
        var $elem = data.$elem;
        var marks = data.marks;
        for (var i = 0; i < marks.length; i++) {
            var mark = marks[i];
            if (data.zoomArea.containsPosition(mark)) {
                var mpos = data.imgTrafo.transform(mark);
                // create mark
                var html = '<div class="mark">'+(i+1)+'</div>';
                var $mark = $(html);
                $elem.append($mark);
                $mark.offset({ left : mpos.x, top : mpos.y});
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
        newarea = MAX_ZOOMAREA.fit(newarea);
        data.zoomArea = newarea;
        redisplay(data);
    };

    // add a mark where clicked
    var setMark = function (data) {
        var $div = data.$elem;
        var $img = data.$img;
        console.debug("setmark");
        // start event capturing
        $img.one('click.digilib', function (evt) {
            // event handler adding a new mark
            console.debug("setmark.click evt=",evt);
            var mpos = geom.position(evt.pageX, evt.pageY);
            var pos = data.imgTrafo.invtransform(mpos);
            data.marks.push(pos);
            redisplay(data);
            //return stopEvent(evt);
        });
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
    $.fn.digilib = function(method) {
        if (methods[method]) {
            // call method on this with the remaining arguments
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof(method) === 'object' || !method) {
            // call init on this
            return methods.init.apply(this, arguments);
        } else {
            $.error( 'Method ' + method + ' does not exist on jQuery.digilib' );
        }
    };
    
})(jQuery);