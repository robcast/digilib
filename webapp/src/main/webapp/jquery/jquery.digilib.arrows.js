/*
 * #%L
 * digilib-webapp
 * %%
 * Copyright (C) 2011 - 2013 MPIWG Berlin, Bibliotheca Hertziana
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
 * Authors: Robert Casties, Martin Raspe
 */
/**
 * digilib pan arrows for scrolling the zoomed area.
 */

(function($) {

    // affine geometry
    var geom = null;
    // plugin object with digilib data
    var digilib = null;

    var FULL_AREA = null;

    var defaults = {
        // arrow bars for moving the zoomed area
        'showZoomArrows' : true,
        // by what fraction should the arrows move the zoomed area?
        'zoomArrowMoveFactor' : 0.5,
        // defaults for digilib buttons
        'buttonSettings' : {
            'fullscreen' : {
                // path to button images (must end with a slash)
                'imagePath' : 'img/fullscreen/32/',
                'arrowSetSize' : 16,
                'arrowSet' : [ "up", "down", "left", "right" ]
            },
            'embedded' : {
                'imagePath' : 'img/embedded/16/',
                'arrowSetSize' : 8,
                'arrowSet' : [ "up", "down", "left", "right" ]
            }
        }
    };

    var buttons = {
        up : {
            onclick : [ "moveZoomArea", 0, -1 ],
            tooltip : "move zoom area up",
            icon : "up.png"
        },
        down : {
            onclick : [ "moveZoomArea", 0, 1 ],
            tooltip : "move zoom area down",
            icon : "down.png"
        },
        left : {
            onclick : [ "moveZoomArea", -1, 0 ],
            tooltip : "move zoom area left",
            icon : "left.png"
        },
        right : {
            onclick : [ "moveZoomArea", 1, 0 ],
            tooltip : "move zoom area right",
            icon : "right.png"
        }
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
            // rotate and mirror change direction of cooordinate system
            var trafo = data.imgTrafo;
            var tdx = (trafo.m00 > 0) ? dx : -dx;
            var tdy = (trafo.m11 > 0) ? dy : -dy;
            if (Math.abs(trafo.m00) < Math.abs(trafo.m01)) {
                tdx = (trafo.m01 > 0) ? -dy : dy;
                tdy = (trafo.m10 > 0) ? -dx : dx;
            }
            var deltaX = tdx * factor * za.width;
            var deltaY = tdy * factor * za.height;
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
        // add defaults, actions
        $.extend(true, digilib.defaults, defaults); // make deep copy
        $.extend(digilib.buttons, buttons);
        $.extend(digilib.actions, actions);
        // update buttons reference in defaults
        digilib.defaults.buttons = digilib.buttons;
    };

    // plugin initialization
    var init = function(data) {
        console.debug('initialising arrows plugin. data:', data);
        var $data = $(data);
        // adjust insets
        data.currentInsets['arrows'] = getInsets(data);
        // install event handler
        $data.bind('setup', handleSetup);
        $data.bind('changeZoomArea', handleChangeZoomArea);
    };

    var handleSetup = function(evt) {
        console.debug("arrows: handleSetup");
        var data = this;
        setupZoomArrows(data);
    };

    var handleChangeZoomArea = function(evt, newZa) {
        console.debug("arrows: handleChangeZoomArea");
        var data = this;
        renderZoomArrows(data, newZa);
    };


    /** 
     * returns insets for arrows (based on canMove and arrowSetSize
     */
    var getInsets = function(data, za) {
        var settings = data.settings;
        var insets = {
            'x' : 0,
            'y' : 0
        };
        if (settings.showZoomArrows) {
            var mode = settings.interactionMode;
            var bw = settings.buttonSettings[mode].arrowSetSize;
            if (digilib.fn.canMove(data, 0, -1, za))
                insets.y += bw;
            if (digilib.fn.canMove(data, 0, 1, za))
                insets.y += bw;
            if (digilib.fn.canMove(data, -1, 0, za))
                insets.x += bw;
            if (digilib.fn.canMove(data, 1, 0, za))
                insets.x += bw;
        }
        return insets;
    };

    /**
     * creates HTML structure for a single button
     */
    var createButton = function(data, $div, buttonName, show) {
        var $elem = data.$elem;
        var settings = data.settings;
        var mode = settings.interactionMode;
        var cssPrefix = settings.cssPrefix;
        var imagePath = settings.buttonSettings[mode].imagePath;
        // make relative imagePath absolute
        if (imagePath.charAt(0) !== '/' && imagePath.substring(0, 7) !== 'http://') {
            imagePath = settings.digilibBaseUrl + '/jquery/' + imagePath;
        }
        var buttonConfig = settings.buttons[buttonName];
        // button properties
        var action = buttonConfig.onclick;
        var tooltip = buttonConfig.tooltip;
        var icon = imagePath + buttonConfig.icon;
        // construct the button html
        var $button = $('<div class="'+cssPrefix+'keep"><a href=""><img class="'+cssPrefix+'button" src="' + icon + '"/></a></div>');
        if (!show) {
            $button.hide();
        }
        $div.append($button);
        // add attributes and bindings
        $button.attr('title', tooltip);
        $button.addClass(cssPrefix+'arrow-' + buttonName);
        // create handler for the buttons on the div (necessary for horizontal
        // scroll arrows)
        $div.on('click.digilib', function(evt) {
            // the handler function calls digilib with action and parameters
            console.debug('click action=', action, ' evt=', evt);
            $elem.digilib.apply($elem, action);
            return false;
        });
        return $button;
    };

    /**
     * create arrows for moving the zoomed area.
     */
    var setupZoomArrows = function(data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var cssPrefix = settings.cssPrefix;
        var show = settings.showZoomArrows;
        console.log('zoom arrows:', show);
        if (!show)
            return;
        var mode = settings.interactionMode;
        var arrowNames = settings.buttonSettings[mode].arrowSet;
        if (arrowNames == null) {
            console.error("No buttons for scroll arrows!");
            settings.showZoomArrows = false;
            return;
        }
        // wrap scaler img in table
        data.$scaler.wrap('<table class="'+cssPrefix+'scalertable"><tbody><tr class="'+cssPrefix+'midrow"><td/></tr></tbody></table>');
        // middle row with img has three elements
        data.$scaler.parent().before('<td class="'+cssPrefix+'arrow '+cssPrefix+'left" valign="middle"/>')
            .after('<td class="'+cssPrefix+'arrow '+cssPrefix+'right" valign="middle"/>');
        // first and last row has only one
        var $table = $elem.find('table.'+cssPrefix+'scalertable');
        $table.find('tr.'+cssPrefix+'midrow')
            .before('<tr class="'+cssPrefix+'firstrow"><td colspan="3" class="'+cssPrefix+'arrow '+cssPrefix+'up" align="center"/></tr>')
            .after('<tr class="'+cssPrefix+'lasttrow"><td colspan="3" class="'+cssPrefix+'arrow '+cssPrefix+'down" align="center"/></tr>');
        // add arrow buttons
        var ar = {};
        ar.$up = createButton(data, $table.find('td.'+cssPrefix+'up'), 'up', digilib.fn.canMove(data, 0, -1));
        ar.$down = createButton(data, $table.find('td.'+cssPrefix+'down'), 'down', digilib.fn.canMove(data, 0, 1));
        ar.$left = createButton(data, $table.find('td.'+cssPrefix+'left'), 'left', digilib.fn.canMove(data, -1, 0));
        ar.$right = createButton(data, $table.find('td.'+cssPrefix+'right'), 'right', digilib.fn.canMove(data, 1, 0));
        data.arrows = ar;

    };

    /**
     * show or hide arrows, called after scaler img is loaded.
     * 
     * @param za New zoom area (optional)
     */
    var renderZoomArrows = function(data, za) {
        var settings = data.settings;
        var arrows = data.arrows;
        if (za == null) {
            za = data.zoomArea;
        }
        if (digilib.fn.isFullArea(za) || !settings.showZoomArrows) {
            arrows.$up.hide();
            arrows.$down.hide();
            arrows.$left.hide();
            arrows.$right.hide();
            data.currentInsets['arrows'] = {'x' : 0, 'y' : 0};
            return;
        }
        if (digilib.fn.canMove(data, 0, -1, za)) {
            arrows.$up.show();
        } else {
            arrows.$up.hide();
        }
        if (digilib.fn.canMove(data, 0, 1, za)) {
            arrows.$down.show();
        } else {
            arrows.$down.hide();
        }
        if (digilib.fn.canMove(data, -1, 0, za)) {
            arrows.$left.show();
        } else {
            arrows.$left.hide();
        }
        if (digilib.fn.canMove(data, 1, 0, za)) {
            arrows.$right.show();
        } else {
            arrows.$right.hide();
        }
        // adjust insets
        data.currentInsets['arrows'] = getInsets(data, za);
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
