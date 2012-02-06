/**
digilib plugin stub
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
            /** set a mark by clicking (or giving a position)
             * 
             * @param data
             * @param mpos
             */
            setMark : function (data, mpos) {
                if (mpos == null) {
                    // interactive
                    setMark(data);
                } else {
                    // use position
                    data.marks.push(pos);
                    digilib.fn.redisplay(data);
                }
            },

            /** remove the last mark
             * 
             * @param data
             */
            removeMark : function (data) {
                data.marks.pop();
                digilib.fn.redisplay(data);
            }
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing stub plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        // add defaults, actins, buttons
        $.extend(true, digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(true, digilib.buttons, buttons);
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising marks plugin. data:', data);
        var $data = $(data);
        // install event handler
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
    };


    var handleSetup = function (evt) {
        console.debug("stub: handleSetup");
        var data = this;
    };

    var handleUpdate = function (evt) {
        console.debug("stub: handleUpdate");
        var data = this;
        renderMarks(data);
    };

    /** place marks on the image
     * 
     */
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

    /** add a mark where clicked.
     * 
     */
    var setMark = function (data) {
        var $scaler = data.$scaler;
        // unbind other handler TODO: do we need to do this?
        $scaler.off(".dlZoomDrag");
        // start event capturing
        $scaler.one('mousedown.dlSetMark', function (evt) {
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
