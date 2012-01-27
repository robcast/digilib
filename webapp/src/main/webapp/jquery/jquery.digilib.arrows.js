/**
 * digilib pan arrows for scrolling the zoomed area.
 */

(function($) {

    // affine geometry
    var geom;
    // plugin object with digilib data
    var digilib;

    var FULL_AREA;

    var buttons = {
        stub : {
            onclick : [ "doStub", 1 ],
            tooltip : "what does this button do?",
            icon : "stub.png"
        }
    };

    var defaults = {
        // arrow bar overlays for moving the zoomed area
        'showZoomArrows' : true,
        // zoom arrow bar minimal width (for small images)
        'zoomArrowMinWidth' : 6,
        // zoom arrow bar standard width
        'zoomArrowWidth' : 32,
        // by what percentage should the arrows move the zoomed area?
        'zoomArrowMoveFactor' : 0.5,
    };

    var actions = {
        /**
         * move zoomed area
         * 
         * @param data
         * @param dx
         * @param dy
         */
        moveZoomArea : function(data, dx, dy) {
            var za = data.zoomArea.copy();
            var factor = data.settings.zoomArrowMoveFactor;
            var deltaX = dx * factor * za.width;
            var deltaY = dy * factor * za.height;
            var delta = geom.position(deltaX, deltaY);
            za.addPosition(delta);
            za = FULL_AREA.fit(za);
            digilib.fn.setZoomArea(data, za);
            digilib.fn.redisplay(data);
        }

    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing arrows plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        FULL_AREA = geom.rectangle(0, 0, 1, 1);
        // add defaults, actions, buttons
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
    };

    // plugin initialization
    var init = function(data) {
        console.debug('initialising arrows plugin. data:', data);
        var $data = $(data);
        // install event handler
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
        //$data.bind('redisplay', handleRedisplay);
    };

    var handleSetup = function(evt) {
        console.debug("arrows: handleSetup");
        var data = this;
        setupZoomArrows(data);
    };

    var handleUpdate = function(evt) {
        console.debug("arrows: handleUpdate");
        var data = this;
        renderZoomArrows(data);
    };

    var handleRedisplay = function(evt) {
        console.debug("arrows: handleRedisplay");
        var data = this;
    };

    /**
     * create arrow overlays for moving the zoomed area.
     * 
     */
    var setupZoomArrows = function(data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var show = settings.showZoomArrows;
        console.log('zoom arrows:', show);
        if (!show)
            return;
        var mode = settings.interactionMode;
        var arrowNames = settings.buttonSettings[mode].arrowSet;
        if (arrowNames == null)
            return;
        // arrow divs are marked with class "keep"
        var $arrowsDiv = $('<div class="keep arrows"/>');
        $elem.append($arrowsDiv);
        // create all arrow buttons
        // TODO: do this without buttons plugin?
        $.each(arrowNames, function(i, arrowName) {
            digilib.fn.createButton(data, $arrowsDiv, arrowName);
        });
    };

    /**
     * size and show arrow overlays, called after scaler img is loaded.
     * 
     */
    var renderZoomArrows = function(data) {
        var settings = data.settings;
        var $arrowsDiv = data.$elem.find('div.arrows');
        if (digilib.fn.isFullArea(data.zoomArea) || !settings.showZoomArrows) {
            $arrowsDiv.hide();
            return;
        }
        $arrowsDiv.show();
        var r = geom.rectangle(data.$scaler);
        // calculate arrow bar width
        var aw = settings.zoomArrowWidth;
        var minWidth = settings.zoomArrowMinWidth;
        // arrow bar width should not exceed 10% of scaler width/height
        var maxWidth = Math.min(r.width, r.height) / 10;
        if (aw > maxWidth) {
            aw = maxWidth;
            if (aw < minWidth) {
                aw = minWidth;
            }
        }
        // vertical position of left/right image
        var arrowData = [ {
            name : 'up',
            rect : geom.rectangle(r.x, r.y, r.width, aw),
            show : digilib.fn.canMove(data, 0, -1)
        }, {
            name : 'down',
            rect : geom.rectangle(r.x, r.y + r.height - aw, r.width, aw),
            show : digilib.fn.canMove(data, 0, 1)
        }, {
            name : 'left',
            rect : geom.rectangle(r.x, r.y, aw, r.height),
            show : digilib.fn.canMove(data, -1, 0)
        }, {
            name : 'right',
            rect : geom.rectangle(r.x + r.width - aw, r.y, aw, r.height),
            show : digilib.fn.canMove(data, 1, 0)
        } ];
        // render a single zoom Arrow
        var render = function(i, item) {
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
                var top = (r.height - $a.height()) / 2;
                $a.css({
                    'top' : top
                }); // position : 'relative'
            }
        };
        $.each(arrowData, render);
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
        name : 'arrows',
        install : install,
        init : init,
        buttons : {},
        actions : {},
        fn : {},
        plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.arrows must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
