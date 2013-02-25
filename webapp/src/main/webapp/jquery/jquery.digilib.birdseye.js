/*
 * #%L
 * digilib bird's eye view plugin
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
/**
digilib bird's eye view plugin
 */

(function($) {

    // affine geometry plugin stub
    var geom;

    // digilib object
    var digilib;

    var FULL_AREA;

    var buttons = {
            bird : {
                'onclick' : "showBirdDiv",
                'tooltip' : "show bird's eye view",
                'icon' : "birds-eye.png"
                }
    };

    var defaults = {
            // is birdView shown?
            'isBirdDivVisible' : false,
            // is birdView automatically shown for a zoomed image and hidden when not?
            'autoBirdDiv' : false,
            // dimensions of bird's eye div
            'birdDivWidth' : 200, 
            'birdDivHeight' : 200,
            // parameters used by bird's eye div
            'birdDivParams' : ['fn','pn','dw','dh']
    };

    var actions = {
            // event handler: toggles the visibility of the bird's eye window 
            showBirdDiv : function (data, show) {
                var settings = data.settings;
                if (data.$birdDiv == null) {
                    // no bird div -> create
                    setupBirdDiv(data);
                }
                var on = digilib.fn.showDiv(settings.isBirdDivVisible, data.$birdDiv, show);
                settings.isBirdDivVisible = on;
                //digilib.fn.highlightButtons(data, 'bird', on);
                updateBirdDiv(data);
                digilib.fn.storeOptions(data);
            }
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing birdseye plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        FULL_AREA = geom.rectangle(0,0,1,1);
        // add defaults
        $.extend(digilib.defaults, defaults);
        // add actions
        $.extend(digilib.actions, actions);
        // add buttons
        $.extend(digilib.buttons, buttons);
        // insert in button list -- not elegant
        if (digilib.plugins.buttons != null) {
            // if (digilib.defaults.buttonSettings != null) {
            digilib.defaults.buttonSettings.fullscreen.standardSet.splice(9, 0, 'bird');
            digilib.defaults.buttonSettings.embedded.standardSet.splice(5, 0, 'bird');
        }
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising birdseye plugin. data:', data);
        var $data = $(data);
        // install event handler
        $data.on('setup', handleSetup);
        $data.on('update', handleUpdate);
        $data.on('redisplay', handleRedisplay);
        $data.on('changeZoomArea', handleChangeZoomArea);
    };


    var handleSetup = function (evt) {
        console.debug("birdseye: handleSetup");
        var data = this;
        // bird's eye view creation
        if (data.settings.isBirdDivVisible) {
            setupBirdDiv(data);
            data.$birdDiv.show();
        }
    };

    var handleUpdate = function (evt) {
        console.debug("birdseye: handleUpdate");
        var data = this;
        if (data.settings.isBirdDivVisible) {
            renderBirdArea(data);
            setupBirdDrag(data);
        }
    };

    var handleRedisplay = function (evt) {
    	// TODO: do we need this?
        console.debug("birdseye: handleRedisplay");
        var data = this;
        actions.showBirdDiv(data, data.settings.isBirdDivVisible);
    };

    var handleChangeZoomArea = function (evt, zoomArea) {
        //console.debug("birdseye: handleDragZoom za="+zoomArea);
    	var data = this;
        updateBirdZoom(data, zoomArea);
    };

    // returns URL for bird's eye view image
    var getBirdImgUrl = function (data) {
        var settings = data.settings;
        var birdDivOptions = {
                dw : settings.birdDivWidth,
                dh : settings.birdDivHeight
        };
        var birdSettings = $.extend({}, settings, birdDivOptions);
        // use only the relevant parameters
        var params = digilib.fn.getParamString(birdSettings, settings.birdDivParams, digilib.defaults);
        var url = settings.scalerBaseUrl + '?' + params;
        return url;
    };

    // creates HTML structure for the bird's eye view in elem
    var setupBirdDiv = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $elem = data.$elem;
        // the bird's eye div
        var $birdDiv = $('<div class="'+cssPrefix+'birdview" style="display:none"/>');
        // the detail indicator frame
        var $birdZoom = $('<div class="'+cssPrefix+'birdzoom" style="display:none; background-color:transparent;"/>');
        // the small image
        var $birdImg = $('<img class="'+cssPrefix+'birdimg"/>');
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
            // create Transform from current area and picsize
            data.birdTrafo = digilib.fn.getImgTrafo(data.$birdImg, FULL_AREA);
            // update display (zoom area indicator)
            if (data.settings.isBirdDivVisible) {
                if (birdRect.width === 0) {
                    // workaround: IE7 calls load handler when there is no size info yet 
                    setTimeout(function () { $birdImg.triggerHandler('load'); }, 200);
                    return;
                    }
                renderBirdArea(data);
                }
        };
    };

    // show zoom area indicator on bird's eye view
    var renderBirdArea = function (data) {
        if (data.$birdImg == null || ! data.$birdImg.prop('complete') || data.birdTrafo == null) return;
        var $birdZoom = data.$birdZoom;
        var zoomArea = data.zoomArea;
        var normalSize = digilib.fn.isFullArea(zoomArea);
        if (normalSize) {
            $birdZoom.hide();
            return;
        } else {
            $birdZoom.show();
        }
        // update birdTrafo
        data.birdTrafo = digilib.fn.getImgTrafo(data.$birdImg, FULL_AREA);        
        var zoomRect = data.birdTrafo.transform(zoomArea);
        console.debug("renderBirdArea:", zoomRect, "zoomArea:", zoomArea, "$birdTrafo:", data.birdTrafo);
        // acount for border width
        var bw = digilib.fn.getBorderWidth($birdZoom);
        zoomRect.addPosition({x : -bw, y : -bw});
        if (data.settings.interactionMode === 'fullscreen') {
            // no animation for fullscreen
            zoomRect.adjustDiv($birdZoom);
        } else {
            // nice animation for embedded mode :-)
            // correct offsetParent because animate doesn't use offset
            var ppos = $birdZoom.offsetParent().offset();
            var dest = {
                'left' : (zoomRect.x - ppos.left) + 'px',
                'top' : (zoomRect.y - ppos.top) + 'px',
                'width' : zoomRect.width,
                'height' : zoomRect.height
                };
            $birdZoom.animate(dest);
        }
    };

    // move bird zoom indicator to reflect zoomed detail area
    var updateBirdZoom = function(data, zoomArea) {
        if (!data.settings.isBirdDivVisible) return;
        var birdRect = data.birdTrafo.transform(zoomArea);
        var $birdZoom = data.$birdZoom;
        // acount for border width
        var bw = digilib.fn.getBorderWidth($birdZoom);
        birdRect.addPosition({x : -bw, y : -bw});
        birdRect.adjustDiv(data.$birdZoom);
    };

    // bird's eye view zoom area click and drag handler
    var setupBirdDrag = function(data) {
        var cssPrefix = data.settings.cssPrefix;
        var $birdImg = data.$birdImg;
        var $birdZoom = data.$birdZoom;
        var $document = $(document);
        var $scaler = data.$scaler;
        var startPos, newRect, birdImgRect, birdZoomRect;
        var bw = digilib.fn.getBorderWidth($birdZoom);

        // mousedown handler: start dragging bird zoom to a new position
        var birdZoomStartDrag = function(evt) {
            startPos = geom.position(evt);
            // position may have changed
            data.birdTrafo = digilib.fn.getImgTrafo($birdImg, FULL_AREA);
            birdImgRect = geom.rectangle($birdImg);
            birdZoomRect = geom.rectangle($birdZoom);
            newRect = null;
            data.$elem.find('.'+cssPrefix+'overlay').hide(); // hide all overlays (marks/regions)
            $document.on("mousemove.dlBirdMove", birdZoomMove);
            $document.on("mouseup.dlBirdMove", birdZoomEndDrag);
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
            // acount for border width
            /* newRect.addPosition({x : -bw, y : -bw});
            newRect.adjustDiv($birdZoom); */
            // reflect birdview zoom position in scaler image
            var area = data.birdTrafo.invtransform(newRect);
            $(data).trigger('changeZoomArea', area);
            return false;
        };

        // mouseup handler: reload page
        var birdZoomEndDrag = function(evt) {
            var settings = data.settings;
            $document.off("mousemove.dlBirdMove", birdZoomMove);
            $document.off("mouseup.dlBirdMove", birdZoomEndDrag);
            if (newRect == null) { 
                // no movement happened - set center to click position
                startPos = birdZoomRect.getCenter();
                birdZoomMove(evt); 
                }
            // ugly, but needed to prevent double border width compensation
            /* newRect.addPosition({x : bw, y : bw}); */
            var newArea = data.birdTrafo.invtransform(newRect);
            data.zoomArea = newArea;
            digilib.fn.redisplay(data);
            return false;
        };

        // clear old handler
        $document.off(".dlBirdMove");
        $birdImg.off(".dlBirdMove");
        $birdZoom.off(".dlBirdMove");
        if (! digilib.fn.isFullArea(data.zoomArea)) {
            // set new handler
            $birdImg.on("mousedown.dlBirdMove", birdZoomStartDrag);
            $birdZoom.on("mousedown.dlBirdMove", birdZoomStartDrag);
        }
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
            name : 'birdseye',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.birdseye must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
