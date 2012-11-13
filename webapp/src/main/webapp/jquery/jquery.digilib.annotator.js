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
        },
        annotationregion : {
            onclick : "setAnnotationRegion",
            tooltip : "create an annotation for a region",
            icon : "annotation-region.png"
        }
    };

    var defaults = {
        // are annotations active?
        'isAnnotationsVisible' : true,
        // buttonset of this plugin
        'annotationSet' : ['annotations', 'annotationuser', 'annotationmark', 'annotationregion', 'lessoptions'],
        'annotationReadOnlySet' : ['annotations', 'lessoptions'],
        // URL of annotation server .e.g. 'http://tuxserve03.mpiwg-berlin.mpg.de/AnnotationManager/annotator'
        'annotationServerUrl' : null,
        // are the annotations read-only
        'annotationsReadOnly' : false,
        // URL of authentication token server e.g. 'http://libcoll.mpiwg-berlin.mpg.de/libviewa/template/token'
        'annotationTokenUrl' : null,
        // URL of safe authentication token server e.g. 'https://libcoll.mpiwg-berlin.mpg.de/libviewa/template/token'
        'annotationSafeTokenUrl' : null,
        // annotation user name
        'annotationUser' : 'anonymous',
		// list of Annotator plugins
		'annotatorPlugins' : ['Auth', 'Permissions', 'Store', 'DigilibIntegrator'],
        // Annotator plugin settings (some values provided in handleSetup)
        'annotatorPluginSettings' : {
	        'Auth' : {
	        	//token : data.annotationToken
	            //tokenUrl: data.settings.annotationTokenUrl
	            autoFetch: true,
	            requestMethod: 'POST',
	            requestData: {
	            	//'user': data.settings.annotationUser,
	            	//'password': data.annotationPassword
	            }
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
                    'limit': 20
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
        	var annotator = data.annotator;
        	var auth = annotator.plugins.Auth;
        	if (auth == null) {
        		console.error("setAnnotationUser: No Auth plugin!!");
        		return;
        	}
        	setAnnotationUser(data, auth, user, password);
        	// get new token
        	auth.token = null;
        	auth._unsafeToken = null;
        	auth.requestToken();
        	// save new token in cookie
        	auth.withToken(function (tkn) {
        		data.dlOpts.annotationToken = auth.token;
		        digilib.fn.storeOptions(data);
		        // clear annotations
        		data.annotations = [];
        		renderAnnotations(data);
	        	// reload annotations
        		annotator.plugins.Store.pluginInit();
        	});
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
                console.error("Currently only interactive annotations!");
            }
        },

        /**
         * set a region-annotation by clicking (or giving a position and a text)
         *
         * @param data
         * @param rect
         * @param text
         */
        setAnnotationRegion : function (data, rect, text) {
            if (rect == null) {
                // interactive
                setAnnotationRegion(data);
            } else {
                // use position and text (and user-id)
                console.error("Currently only interactive annotations!");
            }
        }
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
     * sets annotation user and password in digilib and Annotator.Auth plugin.
     * auth is Auth plugin instance.
     */
	var setAnnotationUser = function (data, auth, user, password) {
		if (user == null) {
	        // user name entered in JS-prompt
	        user = window.prompt("Please authenticate (Cancel to log out): User name", data.settings.annotationUser);
	        if (user != null && user != 'anonymous') {
	            // password entered in JS-prompt
	            password = window.prompt("Please authenticate: Password", '');
	            // set params for Auth plugin
	         	auth.options.requestData.password = password;   
	    		// try to use the safe url for the password
    			if (data.settings.annotationSafeTokenUrl != null) {
    				auth.options.tokenUrl = data.settings.annotationSafeTokenUrl;
    			} else {
    				console.warn("Sending token password over standard-URL!");
    			}
	        } else {
	        	// use anonymous user
	        	user = 'anonymous';
	         	delete auth.options.requestData.password; 
    			if (data.settings.annotationSafeTokenUrl != null) {
    				// reset url to unsafe
    				auth.options.tokenUrl = data.settings.annotationTokenUrl;
    			}
	        }
        }
        // set user in digilib
        data.settings.annotationUser = user;
        data.dlOpts.annotationUser = user;
        digilib.fn.storeOptions(data);
        // set params for Auth plugin
        auth.options.requestData.user = user;
        // set params for Permissions plugin
        var perms = data.annotator.plugins.Permissions;
        if (perms != null) {
        	perms.setUser(user);
        }
   	};


    /**
     * add a mark-annotation where clicked.
     */
    var setAnnotationMark = function(data) {
        var $scaler = data.$scaler;
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
     * add a region-annotation where clicked.
     */
    var setAnnotationRegion = function(data) {
        var annotator = data.annotator;
        digilib.fn.defineArea(data, function (data, rect) {
        	if (rect == null) return;
            // event handler adding a new mark
            console.log("setAnnotationRegion at=", rect);
            // mark selected areas
            annotator.selectedAreas = [rect];
            // create and edit new annotation
            var pos = rect.getPt1();
            var mpos = data.imgTrafo.transform(pos);
            var annotation = annotator.createAnnotation();
            annotator.showEditor(annotation, mpos.getAsCss());
        });
    };

    /**
     * place annotations on the image
     */
    var renderAnnotations = function (data) {
        if (data.annotations == null || data.annotator == null || data.$img == null || data.imgTrafo == null)
            return;
		var annotations = data.annotations;
        var cssPrefix = data.settings.cssPrefix;
        var $elem = data.$elem;
        // show annotation user state
        $elem.find('div#'+cssPrefix+'button-annotationuser').attr('title', 'annotation user: '+data.settings.annotationUser);
        // clear annotations
        $elem.find('div.'+cssPrefix+'annotationmark,div.'+cssPrefix+'annotationregion').remove();
        if (!data.settings.isAnnotationsVisible) return;
        // re-render
        for (var i = 0; i < annotations.length; i++) {
            renderAnnotation(data, annotations[i]);
        }
    };

    /**
     * place single annotation on the image
     */
    var renderAnnotation = function (data, annot) {
        if (annot == null || annot.annotation == null || annot.annotation.areas == null 
        	|| data.$img == null || data.imgTrafo == null)
            return;
        if (!data.settings.isAnnotationsVisible) return;
        var cssPrefix = data.settings.cssPrefix;
        var $elem = data.$elem;
        var annotator = data.annotator;
        var annotation = annot.annotation;
        var idx = annot.idx ? annot.idx : '?';
        var area = geom.rectangle(annotation.areas[0]);
        var screenRect = null;
        var $annotation = null;
        if (area.isRectangle()) {
        	var clippedArea = data.zoomArea.intersect(area);
        	if (clippedArea == null) return;
            screenRect = data.imgTrafo.transform(clippedArea);
            // console.debug("renderRegion: pos=",geom.position(screenRect));
	        $annotation = $('<div class="'+cssPrefix+'annotationregion '+cssPrefix+'overlay annotator-hl">'+idx+'</div>');
        	//addRegionAttributes(data, $regionDiv, attr);
        } else {
	        var pos = area.getPosition();
	        if (!data.zoomArea.containsPosition(pos)) return;
            var screenRect = data.imgTrafo.transform(pos);
            // create annotation
            var html = '<div class="'+cssPrefix+'annotationmark '+cssPrefix+'overlay annotator-hl">'+idx+'</div>';
            $annotation = $(html);
	    }
        // save annotation in data for Annotator
        $annotation.data('annotation', annotation);
        // save reference to div
        annot.$div = $annotation;
        $elem.append($annotation);
        // hook up Annotator events
        $annotation.on("mouseover", annotator.onHighlightMouseover);
        $annotation.on("mouseout", annotator.startViewerHideTimer);
        screenRect.adjustDiv($annotation);
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
	 * returns unauthorizedCallback function for Annotator authlogin plugin.  
	 */
    var getHandleUnauthorized = function (data) {
    	return function (auth) {
    		// prompt for user name and set user
    		setAnnotationUser(data, auth);
            // then try again
            return true;
       	};
    };
	
    /** 
     * install additional buttons 
     */
    var installButtons = function(data, buttonSet) {
        var settings = data.settings;
        var mode = settings.interactionMode;
        var buttonSettings = settings.buttonSettings[mode];
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
        // add defaults, actions, buttons
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
    };

    /** plugin initialization */
    var init = function(data) {
        console.debug('initialising annotator plugin. data:', data);
        var $data = $(data);
        var settings = data.settings;
        // set up list of annotation wrappers
        data.annotations = [];
        // set up buttons
        if (digilib.plugins.buttons != null) {
        	if (settings.annotationsReadOnly) {
        		installButtons(data, settings.annotationReadOnlySet);
        	} else {
        		installButtons(data, settings.annotationSet);
        	}
        }
        if (data.dlOpts.annotationUser != null) {
            // get annotation user from cookie
            settings.annotationUser = data.dlOpts.annotationUser;
        }
        // install event handler
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
    };

    /**
     * setup creates Annotator object (after HTML setup by digilib).
     */
    var handleSetup = function(evt) {
        console.debug("annotations: handleSetup");
        var data = this;
        var settings = data.settings;
        // set up annotator (after html has been set up)
        var uri = getAnnotationPageUrl(data);
        var elem = data.$elem.get(0);
        var opts = {'readOnly' : data.settings.annotationsReadOnly};
        var annotator = new Annotator(elem, opts);
        // set plugin parameters
        var pluginParams = {
        	'Auth' : {
        		'token' : data.dlOpts.annotationToken,
        		'tokenUrl' : settings.annotationTokenUrl,
        		'autoFetch' : true,
	            'requestMethod' : 'POST',
	            'requestData' : {
	            	'user': settings.annotationUser
	            },
	            'unauthorizedCallback' : getHandleUnauthorized(data)
        	},
        	'Permissions' : {
        		'user' : settings.annotationUser
        	},
        	'Store' : {
              	'prefix' : settings.annotationServerUrl,
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
        $.extend(true, pluginParams, data.settings.annotatorPluginSettings);
        // add plugins
        $.each(settings.annotatorPlugins, function (idx, name) {
        	var params = pluginParams[name];
        	console.debug("plugin:", name, params);
        	annotator.addPlugin(name, params);
        });
		// save annotator reference		
        data.annotator = annotator;
    	// save annotation token in cookie
    	var auth = annotator.plugins.Auth;
    	if (auth != null) {
	    	auth.withToken(function (tkn) {
    			data.dlOpts.annotationToken = auth.token;
	    	    digilib.fn.storeOptions(data);
    		});
    	}
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
