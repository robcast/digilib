/** required digilib geometry plugin
 */

(function($) {

    // affine geometry plugin stub
    var geom;

    var FULL_AREA;

    var buttons = {
            bird : {
                onclick : "showBirdDiv",
                tooltip : "show bird's eye view",
                icon : "birds-eye.png"
                }
    };

    var actions = {
            // event handler: toggles the visibility of the bird's eye window 
            showBirdDiv : function (data, show) {
                var settings = data.settings;
                if (data.$birdDiv == null) {
                    // no bird div -> create
                    setupBirdDiv(data);
                }
                var on = showDiv(settings.isBirdDivVisible, data.$birdDiv, show);
                settings.isBirdDivVisible = on;
                highlightButtons(data, 'bird', on);
                updateBirdDiv(data);
                storeOptions(data);
            }
    };       
       
    // plugin initialization called by digilib on plugin object.
    var install = function() {
        // import geometry classes
        geom = this.fn.geometry;
        FULL_AREA = digilib.fn.FULL_AREA;
        // TODO: add actions
        // TODO: add buttons
        // TODO: add event handlers
    };
        
        
    // returns URL for bird's eye view image
    var getBirdImgUrl = function (data, moreParams) {
        var settings = data.settings;
        var birdDivOptions = {
                dw : settings.birdDivWidth,
                dh : settings.birdDivHeight
        };
        var birdSettings = $.extend({}, settings, birdDivOptions);
        // use only the relevant parameters
        if (moreParams == null) {
            var params = getParamString(birdSettings, settings.birdDivParams, defaults);
        } else {
            // filter scaler flags
            if (birdSettings.mo != null) {
                var mo = '';
                if (data.scalerFlags.hmir != null) {
                    mo += 'hmir,';
                }
                if (data.scalerFlags.vmir != null) {
                    mo += 'vmir';
                }
                birdSettings.mo = mo;
            }
            var params = getParamString(birdSettings, 
                    settings.birdDivParams.concat(moreParams), defaults);
        }
        var url = settings.scalerBaseUrl + '?' + params;
        return url;
    };

    // creates HTML structure for the bird's eye view in elem
    var setupBirdDiv = function (data) {
        var $elem = data.$elem;
        // the bird's eye div
        var $birdDiv = $('<div class="birdview" style="display:none"/>');
        // the detail indicator frame
        var $birdZoom = $('<div class="birdzoom" style="display:none; background-color:transparent;"/>');
        // the small image
        var $birdImg = $('<img class="birdimg"/>');
        data.$birdDiv = $birdDiv;
        data.$birdZoom = $birdZoom;
        data.$birdImg = $birdImg;
        $elem.append($birdDiv);
        $birdDiv.append($birdZoom);
        $birdDiv.append($birdImg);
        // $birdZoom.css(data.settings.birdIndicatorStyle);
        var birdUrl = getBirdImgUrl(data);
        $birdImg.load(birdImgLoadedHandler(data));
        $birdImg.error(function () {console.error("error loading birdview image");});
        $birdImg.attr('src', birdUrl);
    };

    // update bird's eye view
    var updateBirdDiv = function (data) {
        if (!data.settings.isBirdDivVisible) return;
        var $birdImg = data.$birdImg;
        var oldsrc = $birdImg.attr('src');
        var newsrc = getBirdImgUrl(data);
        if (oldsrc !== newsrc) {
            $birdImg.attr('src', newsrc);
            // onload handler re-renders
        } else {
            // re-render
            renderBirdArea(data);
            // enable click and drag
            setupBirdDrag(data);
        }
    };

    // returns function for load event of bird's eye view img
    var birdImgLoadedHandler = function (data) {
        return function () {
            var $birdImg = $(this);
            var birdRect = geom.rectangle($birdImg);
            console.debug("birdImg loaded!", $birdImg, "rect=", birdRect, "data=", data);
            if (birdRect.width === 0) {
                // malheureusement IE7 calls load handler when there is no size info yet 
                setTimeout(function () { $birdImg.triggerHandler('load'); }, 200);
                }
            // update display (zoom area indicator)
            updateDisplay(data);
        };
    };

    // show zoom area indicator on bird's eye view
    var renderBirdArea = function (data) {
        if (data.$birdImg == null || ! data.$birdImg.get(0).complete) return;
        var $birdZoom = data.$birdZoom;
        var zoomArea = data.zoomArea;
        var normalSize = isFullArea(zoomArea);
        if (normalSize) {
            $birdZoom.hide();
            return;
        } else {
            $birdZoom.show();
        }
        // create Transform from current area and picsize
        data.birdTrafo = getImgTrafo(data.$birdImg, FULL_AREA);
        var zoomRect = data.birdTrafo.transform(zoomArea);
        console.debug("renderBirdArea:", zoomRect, "zoomArea:", zoomArea, "$birdTrafo:", data.birdTrafo);
        // acount for border width
        var bw = getBorderWidth($birdZoom);
        zoomRect.addPosition({x : -bw, y : -bw});
        if (data.settings.interactionMode === 'fullscreen') {
            // no animation for fullscreen
            zoomRect.adjustDiv($birdZoom);
        } else {
            // nice animation for embedded mode :-)
            // correct offsetParent because animate doesn't use offset
            var ppos = $birdZoom.offsetParent().offset();
            var dest = {
                left : (zoomRect.x - ppos.left) + 'px',
                top : (zoomRect.y - ppos.top) + 'px',
                width : zoomRect.width,
                height : zoomRect.height
                };
            $birdZoom.animate(dest);
        }
    };

    // bird's eye view zoom area click and drag handler
    var setupBirdDrag = function(data) {
        var $birdImg = data.$birdImg;
        var $birdZoom = data.$birdZoom;
        var $document = $(document);
        var $scaler = data.$scaler;
        var startPos, newRect, birdImgRect, birdZoomRect, fullRect, scalerPos;
        var bw = getBorderWidth($birdZoom);

        // mousedown handler: start dragging bird zoom to a new position
        var birdZoomStartDrag = function(evt) {
            startPos = geom.position(evt);
            // position may have changed
            data.birdTrafo = getImgTrafo($birdImg, FULL_AREA);
            birdImgRect = geom.rectangle($birdImg);
            birdZoomRect = geom.rectangle($birdZoom);
            scalerPos = geom.position($scaler);
            newRect = null;
            fullRect = setZoomBG(data); // setup zoom background image
            $document.bind("mousemove.dlBirdMove", birdZoomMove);
            $document.bind("mouseup.dlBirdMove", birdZoomEndDrag);
            return false;
        };

        // mousemove handler: drag
        var birdZoomMove = function(evt) {
            var pos = geom.position(evt);
            var delta = startPos.delta(pos);
            // move birdZoom div, keeping size
            newRect = birdZoomRect.copy();
            newRect.addPosition(delta);
            newRect.stayInside(birdImgRect);
            // reflect birdview zoom position in scaler image
            var area = data.birdTrafo.invtransform(newRect);
            var imgArea = data.imgTrafo.transform(area);
            var offset = imgArea.getPosition().neg();
            offset.add(scalerPos);
            if (fullRect) {
                var bgPos = fullRect.getPosition().add(offset);
            } else {
                var bgPos = offset;
            }
            // move the background image to the new position
            data.$scaler.css({
                'background-position' : bgPos.x + "px " + bgPos.y + "px"
                });
            // acount for border width
            newRect.addPosition({x : -bw, y : -bw});
            newRect.adjustDiv($birdZoom);
            return false;
        };

        // mouseup handler: reload page
        var birdZoomEndDrag = function(evt) {
            var settings = data.settings;
            $document.unbind("mousemove.dlBirdMove", birdZoomMove);
            $document.unbind("mouseup.dlBirdMove", birdZoomEndDrag);
            if (newRect == null) { 
                // no movement happened - set center to click position
                startPos = birdZoomRect.getCenter();
                birdZoomMove(evt); 
                }
            // ugly, but needed to prevent double border width compensation
            newRect.addPosition({x : bw, y : bw});
            var newArea = data.birdTrafo.invtransform(newRect);
            data.zoomArea = newArea;
            redisplay(data);
            return false;
        };

        // clear old handler
        $document.unbind(".dlBirdMove");
        $birdImg.unbind(".dlBirdMove");
        $birdZoom.unbind(".dlBirdMove");
        if (! isFullArea(data.zoomArea)) {
            // set new handler
            $birdImg.bind("mousedown.dlBirdMove", birdZoomStartDrag);
            $birdZoom.bind("mousedown.dlBirdMove", birdZoomStartDrag);
        }
    };

    // move bird zoom indicator to reflect zoomed detail area
    var setBirdZoom = function(data, rect) {
        var part = data.imgTrafo.invtransform(rect);
        // area = FULL_AREA.fit(part); // no, we want to see where we transcend the borders
        birdTrafo = getImgTrafo(data.$birdImg, FULL_AREA);
        var birdRect = birdTrafo.transform(part);
        var $birdZoom = data.$birdZoom;
        // acount for border width
        var bw = getBorderWidth($birdZoom);
        birdRect.addPosition({x : -bw, y : -bw});
        birdRect.adjustDiv(data.$birdZoom);
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var digilib = {
            name : 'birdseye',
            install : install,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };
            
    if ($.fn.digilib == null) {
        $.error("jquery.digilib.birdview must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', digilib);
    }
})(jQuery);
