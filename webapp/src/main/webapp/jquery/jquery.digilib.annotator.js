/**
 digilib plugin for annotations.

 currently only point-like annotations (like marks).
 
 Annotations are stored on a Annotator http://annotateit.org compatible server.

 */

(function($) {

    // affine geometry
    var geom = null;
    // plugin object with digilib data
    var digilib = null;

    var buttons = {
        annotations : {
            onclick : "toggleAnnotations",
            tooltip : "show or hide annotations",
            icon : "annotations.png"
        },
        annotationuser : {
            onclick : "setAnnotationUser",
            tooltip : "set user account for annotations",
            icon : "annotation-user.png"
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
        'annotationSet' : ['annotations', 'annotationuser', 'annotationmark', 'lessoptions'],
        // URL of annotation server
        'annotationServerUrl' : 'http://virtuoso.mpiwg-berlin.mpg.de:8080/AnnotationManager/annotator',
        // URL of authentication token server
        'annotationTokenUrl' : 'http://localhost:8080/test/annotator/token',
        // annotation user name
        'annotationUser' : 'anonymous',
        // function to translate user name from annotation server format 
        'annotationServerUserString' : function() {
            if (this.user && this.user.name) {
                return this.user.name;
            }
            return this.user;
        },

        // Annotator plugin settings
        'annotatorPlugins' : {
	        //'Tags' : {},
	        'Auth' : {
	        	//token : data.annotationToken
	            //tokenUrl: data.settings.annotationTokenUrl
	            //autoFetch: false
            },
            'Permissions' : { 
            	//user: data.settings.annotationUser,
                userString : function(user) {
                    if (user && user.name) {
                        return user.name;
                    }
                    return user;
                }, 
                userId: function (user) {
                    if (user && user.id) {
                        return user.id;
                    }
                    return user;
                }
            },
            'Store' : { 
            	//prefix : data.settings.annotationServerUrl,
                annotationData: {
                	//'uri': getAnnotationPageUrl()
                }, 
                loadFromSearch: {
                    'limit': 20,
                    //'uri': getAnnotationPageUrl()
                }
            }
        }

    };

    var actions = {
        /**
         * show/hide annotations
         */
        toggleAnnotations : function (data) {
            var show = !data.settings.isAnnotationsVisible;
            data.settings.isAnnotationsVisible = show;
            digilib.fn.highlightButtons(data, 'annotations', show);
            renderAnnotations(data);
        },
        
        /**
         * set user account for annotations
         */
        setAnnotationUser : function (data, user, password) {
            var settings = data.settings;
            if (user == null) {
                // user name entered in JS-prompt
                user = window.prompt("User name:", settings.annotationUser);
                if (user != null) {
                    // password entered in JS-prompt
                    password = window.prompt("Password:", '');
                    settings.annotationUser = user;
                    data.dlOpts.annotationUser = user;
                    digilib.fn.storeOptions(data);
                    loadAnnotationToken(data, password);
                }
            } else {
                settings.annotationUser = user;
                data.dlOpts.annotationUser = user;
                digilib.fn.storeOptions(data);
                loadAnnotationToken(data, password);
            }
        },

        /**
         * set a mark-annotation by clicking (or giving a position and a text)
         *
         * @param data
         * @param mpos
         * @param text
         */
        setAnnotationMark : function (data, mpos, text) {
            if (mpos == null) {
                // interactive
                setAnnotationMark(data);
            } else {
                // use position and text (and user-id)
                var annotation = newAnnotation(data, mpos, text, null, null, data.settings.annotationUser);
                storeAnnotation(data, annotation);
                // TODO: replace with annotation returned by server
                data.annotations.push(annotation);
                digilib.fn.redisplay(data);
            }
        },
    };

    /**
     * returns an annotatable url to this digilib image
     */
    var getAnnotationPageUrl = function(data) {
        var url = data.settings.digilibBaseUrl + '/jquery/digilib.html?';
        url += digilib.fn.getParamString(data.settings, ['fn', 'pn'], digilib.defaults);
        return url;
    };
    
    /**
     * add a mark-annotation where clicked.
     */
    var setAnnotationMark = function(data) {
        var $scaler = data.$scaler;
        // unbind other handler TODO: do we need to do this?
        $scaler.off(".dlZoomDrag");
        // start event capturing
        $scaler.one('mousedown.dlSetAnnotationMark', function(evt) {
            // event handler adding a new mark
            console.log("setAnnotationMark at=", evt);
            var annotator = data.annotator;
            var mpos = geom.position(evt);
            var pos = data.imgTrafo.invtransform(mpos);
            // mark selected areas
            annotator.selectedAreas = [geom.rectangle(pos)];
            // create and edit new annotation
            var annotation = annotator.createAnnotation();
            annotator.showEditor(annotation, mpos.getAsCss());
            return false;            
        });
    };

    /**
     * place annotations on the image
     */
    var renderAnnotations = function (data) {
        console.debug("renderAnnotations!");
        if (data.annotations == null || data.annotator == null || data.$img == null || data.imgTrafo == null)
            return;
		var annotations = data.annotations;
        var cssPrefix = data.settings.cssPrefix;
        var $elem = data.$elem;
        // try to show annotation user state
        $elem.find('div#'+cssPrefix+'button-annotationuser').attr('title', 'annotation user: '+data.settings.annotationUser);
        // clear annotations
        $elem.find('div.' + cssPrefix + 'annotationmark').remove();
        if (!data.settings.isAnnotationsVisible) return;
        for (var i = 0; i < annotations.length; i++) {
            renderAnnotation(data, annotations[i]);
        }
    };

    /**
     * place single annotation on the image
     */
    var renderAnnotation = function (data, annot) {
        console.debug("renderAnnotation: annotation=", annot);
        if (annot == null || annot.annotation == null || annot.annotation.areas == null 
        	|| data.$img == null || data.imgTrafo == null)
            return;
        if (!data.settings.isAnnotationsVisible) return;
        var cssPrefix = data.settings.cssPrefix;
        var $elem = data.$elem;
        var annotator = data.annotator;
        var annotation = annot.annotation;
        var idx = annot.idx ? annot.idx : '?';
        var pos = geom.position(annotation.areas[0]);
        if (data.zoomArea.containsPosition(pos)) {
            var mpos = data.imgTrafo.transform(pos);
            console.debug("renderannotations: pos=", mpos);
            // create annotation
            var html = '<div class="'+cssPrefix+'annotationmark '+cssPrefix+'overlay annotator-hl">'+idx+'</div>';
            var $annotation = $(html);
            // save annotation in data for Annotator
            $annotation.data('annotation', annotation);
            // save reference to div
            annot.$div = $annotation;
            $elem.append($annotation);
            // hook up Annotator events
            $annotation.on("mouseover", annotator.onHighlightMouseover);
            $annotation.on("mouseout", annotator.startViewerHideTimer);
            mpos.adjustDiv($annotation);
        }
    };

	/**
	 * returns setupAnnotation function using the given data.
	 */
	var getSetupAnnotation = function(data) {
		return function (annotation) {
			// create annotation wrapper
			var ann = {
				'annotation' : annotation,
				'idx' : data.annotations.length+1
			};
			// add to list
			data.annotations.push(ann);
			// render this annotation
			renderAnnotation(data, ann);
		};
	};

	/**
	 * returns annotationDeleted function using the given data.
	 */
	var getAnnotationDeleted = function(data) {
		return function (annotation) {
			// remove annotation mark
			var annots = data.annotations;
			for (var i = 0; i < annots.length; ++i) {
				var annot = annots[i];
				if (annot.annotation === annotation) {
					// this is the right wrapper
					if (annot.$div != null) {
						// remove from screen
						annot.$div.remove();
					}
					// remove from list
					delete annots[i];
					break;
				}
			}
		};
	};
			
    /**
     * Get an authentication token from the token server.
     * 
     * Stores the token and loads annotations on success.
     */
    var loadAnnotationToken = function(data, password) {
        var settings = data.settings;
        var url = settings.annotationTokenUrl;
        var params = {'user': settings.annotationUser};
        if (password != null) {
            params.password = password;
        }
        // TODO: better error handling
        $.post(url, params)
            .done(function (authToken, authStatus) {
                console.debug("got auth token data=", authToken);
                data.annotationToken = authToken;
                data.dlOpts.annotationToken = authToken;
                digilib.fn.storeOptions(data);
                //loadAnnotations(data);
            })
            .fail(function (xhr, status) {
                console.error("got auth token error:", xhr);
                data.annotationToken = null;
                data.settings.annotationUser = "anonymous";
                //loadAnnotations(data);
            });
    };

    /** 
     * install additional buttons 
     */
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

    /** 
     * plugin installation. called by digilib on plugin object. 
     */
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing annotator plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        FULL_AREA = geom.rectangle(0, 0, 1, 1);
        // add defaults, actions, buttons
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
    };

    /** plugin initialization */
    var init = function(data) {
        console.debug('initialising annotator plugin. data:', data);
        var $data = $(data);
        // set up
        data.annotations = [];
        if (digilib.plugins.buttons != null) {
            installButtons(data);
        }
        if (data.dlOpts.annotationUser != null) {
            // get annotation user from cookie
            data.settings.annotationUser = data.dlOpts.annotationUser;
        }
        if (data.dlOpts.annotationToken != null) {
            // get annotation token from cookie
            data.annotationToken = data.dlOpts.annotationToken;
        }
        // install event handler
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
    };

    /**
     * setup creates Annotator object.
     */
    var handleSetup = function(evt) {
        console.debug("annotations: handleSetup");
        var data = this;
        if (data.annotationToken ==  null) {
            loadAnnotationToken(data);        
        }
        // set up annotator (after html has been set up)
        var uri = getAnnotationPageUrl(data);
        var annotator = new Annotator(data.$elem.get(0));
        // set plugin parameters
        var pluginParams = {
        	'Auth' : {
        		'token' : data.annotationToken,
        		'tokenUrl' : data.settings.annotationTokenUrl,
        		'autoFetch' : false
        	},
        	'Permissions' : {
        		'user' : data.settings.annotationUser
        	},
        	'Store' : {
              	'prefix' : data.settings.annotationServerUrl,
                'annotationData' : {
                  'uri': uri
                },
                'loadFromSearch' : {
                  'uri': uri
                }
        	},
        	'DigilibIntegrator' : {
        		'hooks' : {
        			'setupAnnotation' : getSetupAnnotation(data),
        			'annotationDeleted' : getAnnotationDeleted(data)
        		}
        	}
        };
        // merge with settings
        $.extend(true, pluginParams, data.settings.annotatorPlugins);
        // add plugins
        $.each(pluginParams, function (name, params) {
        	console.debug("plugin:", name, params);
        	annotator.addPlugin(name, params);
        });
		// save annotator reference		
        data.annotator = annotator;
    };

    /**
     * update renders all annotations.
     */
    var handleUpdate = function(evt) {
        console.debug("annotations: handleUpdate");
        var data = this;
        renderAnnotations(data);
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
        name : 'annotator',
        install : install,
        init : init,
        buttons : {},
        actions : {},
        fn : {},
        plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.annotator must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
