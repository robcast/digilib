/*
 * #%L
 * digilib marks plugin
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
 * digilib marks plugin
 */

(function($) {

    // affine geometry
    var geom = null;
    // plugin object with digilib data
    var digilib = null;

    var buttons = {
        mark : {
            onclick : "setMark",
            tooltip : "set a mark",
            icon : "mark.png"
        },
        delmark : {
            onclick : "removeMark",
            tooltip : "delete the last mark",
            icon : "delmark.png"
        }
    };

    var defaults = {
    };

    var actions = {
        /**
         * set a mark by clicking (or giving a position)
         * 
         * @param data
         * @param mpos
         */
        setMark : function(data, mpos) {
            if (mpos == null) {
                // interactive
                setMark(data);
            } else {
                // use position
                data.marks.push(mpos);
                digilib.fn.redisplay(data);
            }
        },

        /**
         * remove the last mark
         * 
         * @param data
         */
        removeMark : function(data) {
            data.marks.pop();
            digilib.fn.redisplay(data);
        }
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing marks plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        // add defaults, actins, buttons
        $.extend(true, digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(true, digilib.buttons, buttons);
        // export packMarks for regions.js
        digilib.fn.packMarks = packMarks;
    };

    // plugin initialization
    var init = function(data) {
        console.debug('initialising marks plugin. data:', data);
        var $data = $(data);
        // install event handler
        $data.on('update', handleUpdate);
        $data.on('pack', handlePack);
        $data.on('unpack', handleUnpack);
        $data.on('newpage', handleNewpage);
    };

    var handleUpdate = function(evt) {
        console.debug("marks: handleUpdate");
        var data = this;
        if (data.marks != null) {
            renderMarks(data);
        }
    };
    
    var handleNewpage = function (evt) {
        console.debug("marks: handle newpage");
        var data = this;
        // new page, new marks
        data.marks = [];
    };

    /**
     * unpack mk parameter into marks array
     */
    var handleUnpack = function(evt) {
        var data = this;
        var settings = data.settings;
        var marks = [];
        var pa;
        if (settings.mk) {
            var mk = settings.mk;
            if (mk.indexOf(";") >= 0) {
                pa = mk.split(";"); // old format with ";"
            } else {
                pa = mk.split(","); // new format
            }
            for ( var i = 0; i < pa.length; i++) {
                var pos = pa[i].split("/");
                if (pos.length > 1) {
                    marks.push(geom.position(pos[0], pos[1]));
                }
            }
        }
        data.marks = marks;
    };

    /**
     * pack marks into parameters
     */
    var handlePack = function(data) {
        var data = this;
        var settings = data.settings;
        var marks = data.marks;
        packMarks(settings, marks);
    };

    /**
     * pack marks into parameter
     */
    var packMarks = function(settings, marks) {
        if (!marks)
            return;
        settings.mk = '';
        for ( var i = 0; i < marks.length; i++) {
            if (i) {
                settings.mk += ',';
            }
            settings.mk += digilib.fn.cropFloatStr(marks[i].x) + '/' + digilib.fn.cropFloatStr(marks[i].y);
        }
    };

    /**
     * place marks on the image
     * 
     */
    var renderMarks = function(data) {
        if (data.marks == null || data.$img == null || data.imgTrafo == null)
            return;
        var cssPrefix = data.settings.cssPrefix;
        var $elem = data.$elem;
        var marks = data.marks;
        console.debug("renderMarks: marks="+marks);
        // clear marks
        $elem.find('div.'+cssPrefix+'mark').remove();
        for ( var i = 0; i < marks.length; i++) {
            var mark = marks[i];
            if (data.zoomArea.containsPosition(mark)) {
                var mpos = data.imgTrafo.transform(mark);
                console.debug("renderMarks: pos=", mpos);
                // create mark
                var html = '<div class="'+cssPrefix+'mark '+cssPrefix+'overlay">' + (i + 1) + '</div>';
                var $mark = $(html);
                $elem.append($mark);
                mpos.adjustDiv($mark);
            }
        }
    };

    /**
     * add a mark where clicked.
     * 
     */
    var setMark = function(data) {
        var $scaler = data.$scaler;
        // unbind other handler TODO: do we need to do this?
        $scaler.off(".dlZoomDrag");
        // start event capturing
        $scaler.one('mousedown.dlSetMark', function(evt) {
            // event handler adding a new mark
            console.log("setmark at=", evt);
            var mpos = geom.position(evt);
            var pos = data.imgTrafo.invtransform(mpos);
            data.marks.push(pos);
            digilib.fn.redisplay(data);
            return false;
        });
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
        name : 'marks',
        install : install,
        init : init,
        buttons : {},
        actions : {},
        fn : {},
        plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.marks must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
