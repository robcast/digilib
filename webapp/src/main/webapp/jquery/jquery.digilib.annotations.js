/**
 digilib plugin for annotations.

 currently only point-like (like marks).

 */

(function($) {

    // affine geometry
    var geom;
    // plugin object with digilib data
    var digilib;

    var FULL_AREA;

    var buttons = {
        annotations : {
            onclick : "toggleAnnotations",
            tooltip : "show or hide annotations",
            icon : "annotations.png"
        },
        annotationmark : {
            onclick : "setAnnotationMark",
            tooltip : "create an annotation for a point",
            icon : "annotation-mark.png"
        }
    };

    var defaults = {
        // are annotations active?
        'isAnnotationsVisible' : true,
        // buttonset of this plugin
        'annotationSet' : ['annotations', 'annotationmark', 'lessoptions'],
        // URL of annotation server
        'annotationServerUrl' : 'http://virtuoso.mpiwg-berlin.mpg.de:8080/AnnotationManager/annotator',
        // URL of authentication token server
        'annotationTokenUrl' : 'http://localhost:8080/test/annotator/token?user=anonymous',
        // annotation user name
        'annotationUser' : 'anonymous'
    };

    var actions = {
        /**
         * show/hide annotations
         */
        toggleAnnotations : function(data) {
            var show = !data.settings.isAnnotationsVisible;
            data.settings.isAnnotationsVisible = show;
            fn.highlightButtons(data, 'annotations', show);
            renderAnnotations(data);
        },

        /**
         * set a mark-annotation by clicking (or giving a position and a text)
         *
         * @param data
         * @param mpos
         * @param text
         */
        setAnnotationMark : function(data, mpos, text) {
            if (mpos == null) {
                // interactive
                setAnnotationMark(data);
            } else {
                // use position and text
                var annotation = newAnnotation(mpos, text);
                storeAnnotation(data, annotation);
                data.annotations.push(annotation);
                digilib.fn.redisplay(data);
            }
        },
    };

    var newAnnotation = function(mpos, text, id, uri, user) {
        var annot = {
            pos : mpos,
            text : text,
            id : id,
            uri : uri,
            user : user
        };
        return annot;
    };

    /**
     * returns an annotatable url to this digilib image
     */
    var getAnnotationPageUrl = function(data) {
        var url = data.settings.digilibBaseUrl + '/jquery/digilib.html?';
        url += digilib.fn.getParamString(data.settings, ['fn', 'pn'], digilib.defaults);
        return url;
    }
    /**
     * add a mark-annotation where clicked.
     *
     */
    var setAnnotationMark = function(data) {
        var $scaler = data.$scaler;
        // unbind other handler TODO: do we need to do this?
        $scaler.off(".dlZoomDrag");
        // start event capturing
        $scaler.one('mousedown.dlSetAnnotationMark', function(evt) {
            // event handler adding a new mark
            console.log("setAnnotationMark at=", evt);
            var mpos = geom.position(evt);
            var pos = data.imgTrafo.invtransform(mpos);
            var text = window.prompt("Annotation text:");
            if (text == null)
                return false;
            var annotation = newAnnotation(pos, text);
            storeAnnotation(data, annotation);
            data.annotations.push(annotation);
            digilib.fn.redisplay(data);
            return false;
        });
    };

    /**
     * place annotations on the image
     *
     */
    var renderAnnotations = function(data) {
        if (data.annotations == null || data.$img == null || data.imgTrafo == null)
            return;
        var cssPrefix = data.settings.cssPrefix;
        var $elem = data.$elem;
        var annotations = data.annotations;
        console.debug("renderAnnotations: annotations=" + annotations);
        // clear annotations
        $elem.find('div.' + cssPrefix + 'annotationmark').remove();
        for (var i = 0; i < annotations.length; i++) {
            var annotation = annotations[i];
            if (data.zoomArea.containsPosition(annotation.pos)) {
                var mpos = data.imgTrafo.transform(annotation.pos);
                console.debug("renderannotations: pos=", mpos);
                // create annotation
                var html = '<div class="' + cssPrefix + 'annotationmark ' + cssPrefix + 'overlay">' + (i + 1) + '</div>';
                var $annotation = $(html);
                // set text as tooltip TODO: have real popup with editing
                $annotation.attr('title', "Annotation: " + annotation.text);
                $elem.append($annotation);
                mpos.adjustDiv($annotation);
            }
        }
    };

    var loadAnnotationToken = function(data) {
        var settings = data.settings;
        var url = settings.annotationTokenUrl;
        // TODO: better error handling
        $.get(url, function(authToken, authStatus) {
            console.debug("got auth token data=", authToken);
            data.annotationToken = authToken;
            loadAnnotations(data);
        });
    };

    var loadAnnotations = function(data) {
        var settings = data.settings;
        var url = settings.annotationServerUrl + '/search';
        var pageUrl = getAnnotationPageUrl(data);
        // send authentication token in header
        headers = {
            'x-annotator-auth-token' : data.annotationToken
        };
        // get only annotations with this url
        var query = {
            limit : 20,
            uri : pageUrl
        };
        $.ajax(url, {
            dataType : 'json',
            data : query,
            headers : headers,
            success : function(annotData, annotStatus) {
                console.debug("got annotation data=", annotData);
                data.annotationData = annotData;
                parseAnnotations(data, annotData);
                renderAnnotations(data);
            }
        });
    };

    var parseAnnotations = function(data, annotationData) {
        var annotations = [];
        for (var i = 0; i < annotationData.rows.length; ++i) {
            var ann = annotationData.rows[i];
            var annot = parseAnnotation(ann)
            if (annot != null) {
                annotations.push(annot);
            }
        }
        data.annotations = annotations;
    };

    var parseAnnotation = function(ann) {
        // TODO: check validity of annotation data
        if (ann.areas != null && ann.areas.length > 0) {
            var area = ann.areas[0];
            var pos = geom.position(area.x, area.y);
            return newAnnotation(pos, ann.text, ann.id, ann.uri, ann.user);
        }
        return null;
    };

    var storeAnnotation = function(data, annotation) {
        console.debug("storeAnnotation:", annotation);
        var settings = data.settings;
        var url = settings.annotationServerUrl + '/annotations';
        var pageUrl = getAnnotationPageUrl(data);
        // send authentication token in header
        headers = {
            'x-annotator-auth-token' : data.annotationToken
        };
        // create annotation object to send
        var annotData = {
            areas : [{
                x : annotation.pos.x,
                y : annotation.pos.y
            }],
            text : annotation.text,
            uri : pageUrl,
            user : settings.annotationUser
        };
        var dataString = JSON.stringify(annotData);
        $.ajax(url, {
            type : 'POST',
            dataType : 'json',
            contentType : 'application/json',
            data : dataString,
            headers : headers,
            success : function(annotData, annotStatus) {
                console.debug("sent annotation data, got=", annotData, " status=" + annotStatus);
                var annot = parseAnnotation(annotData);
                // TODO: we have to add the returned data to the real annotation!
                //renderAnnotations(data);
            }
        });

    }
    /** install additional buttons */
    var installButtons = function(data) {
        var settings = data.settings;
        var mode = settings.interactionMode;
        var buttonSettings = settings.buttonSettings[mode];
        // configure buttons through digilib "annotationSet" option
        var buttonSet = settings.annotationSet || annotationSet;
        // set annotationSet to [] or '' for no buttons (when showing annotations only)
        if (buttonSet.length && buttonSet.length > 0) {
            buttonSettings.annotationSet = buttonSet;
            buttonSettings.buttonSets.push('annotationSet');
        }
    };

    /** plugin installation called by digilib on plugin object. */
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing annotations plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        FULL_AREA = geom.rectangle(0, 0, 1, 1);
        // add defaults, actins, buttons
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
    };

    /** plugin initialization */
    var init = function(data) {
        console.debug('initialising annotations plugin. data:', data);
        var $data = $(data);
        // set up
        data.annotations = [];
        if (digilib.plugins.buttons != null) {
            installButtons(data);
        }
        // install event handler
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
    };

    var handleSetup = function(evt) {
        console.debug("annotations: handleSetup");
        var data = this;
        // load annotations from server
        loadAnnotationToken(data);
    };

    var handleUpdate = function(evt) {
        console.debug("annotations: handleUpdate");
        var data = this;
        if (data.marks != null) {
            renderAnnotations(data);
        }
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
        name : 'annotations',
        install : install,
        init : init,
        buttons : {},
        actions : {},
        fn : {},
        plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.annotations must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
