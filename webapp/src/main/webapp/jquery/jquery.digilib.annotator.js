/*
 * #%L
 * digilib plugin for annotations.
 * %%
 * Copyright (C) 2012 - 2013 MPIWG Berlin
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
 * digilib plugin for annotations.
 *
 * Currently supported are point-like annotations (like marks) and rectangular region annotations.
 *
 * Annotations are displayed using code from the Annotator (http://annotatorjs.org) project
 * and stored on a Annotator-API compatible server.
 */
(function($) {

    // affine geometry
    var geom = null;
    // plugin object with digilib data
    var digilib = null;
    // the functions made available by digilib
    var fn = {};
    // the normal zoom area
    var FULL_AREA = null;

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

    // for defaults see below (we need to define the functions used in annotatorPluginSettings first)

    var actions = {
        /**
         * show/hide annotations
         */
        toggleAnnotations : function (data) {
            var show = !data.settings.isAnnotationsVisible;
            data.settings.isAnnotationsVisible = show;
            fn.highlightButtons(data, 'annotations', show);
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
        	// set new user in digilib and Annotator Auth plugin
        	setAnnotationUser(data, auth, user, password);
        	// get new token
        	auth.token = null;
        	auth._unsafeToken = null;
        	auth.requestToken();
        	// save new token in cookie
        	auth.withToken(function (tkn) {
        		data.dlOpts.annotationToken = auth.token;
		        fn.storeOptions(data);
		        // clear annotations
        		data.annotations = [];
        		renderAnnotations(data);
	        	// reload annotations
        		annotator.load(data.annotatorLoadQuery);
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
                console.error("Sorry, currently only interactive annotations!");
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
                console.error("Sorry, currently only interactive annotations!");
            }
        }
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
     * returns an annotatable uri to this digilib image
     */
    var getAnnotationPageUri = function(data) {
        var settings = data.settings;
        var uri = settings.annotationPageUri; 
        if (uri == null) {
            // default uri with digilibBaseUrl
            uri = settings.digilibBaseUrl + settings.digilibFrontendPath;
            uri += '?' + fn.getParamString(data.settings, ['fn', 'pn'], digilib.defaults);
        } else if (typeof uri === 'function') {
            // call function
            uri = uri(data);
        }
        return uri;
    };

    /**
     * Set annotation user and password in digilib and Annotator.Auth plugin.
     * 
     * @param auth Auth plugin instance.
     * @param user user name (optional)
     * @param password password (optional)
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
        fn.storeOptions(data);
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
        $scaler.one('mousedown.dlSetAnnotationMark', function (evt) {
            // event handler adding a new mark
            console.log("setAnnotationMark at=", evt);
            var mpos = geom.position(evt);
            var pos = data.imgTrafo.invtransform(mpos);
            // mark selection shape
            var shape = {'type' : 'point', 'units' : 'fraction', 'geometry' : geom.position(pos)};
            // create and edit new annotation
            createAnnotation(data, shape, mpos.getAsCss());
            return false;
        });
    };

    /**
     * Add a region-annotation where clicked.
     */
    var setAnnotationRegion = function (data) {
        fn.defineArea(data, function (data, rect) {
        	if (rect == null) return;
            // event handler adding a new mark
            console.log("setAnnotationRegion at=", rect);
            // mark selection shape
            var shape = {'type' : 'rectangle', 'units' : 'fraction', 'geometry' : rect};
            var pos = rect.getPt1();
            var mpos = data.imgTrafo.transform(pos);
            // create and edit new annotation
            createAnnotation(data, shape, mpos.getAsCss());
        });
    };

    /**
     * create an empty annotation with the given shape, show the editor at the given position,
     * and store the annotation using Annotator.
     * 
     *  @param shape shape object
     *  @param editorPos css position object
     *  @returns promise
     */
    var createAnnotation = function (data, shape, editorPos) {
        var annotator = data.annotator;
        var annotation = {'shapes' : [shape]};
        annotator.publish('beforeAnnotationCreated', [annotation]);
        annotator.setupAnnotation(annotation);
        // edit the annotation (returns a promise)
        var dfd = annotator.editAnnotation(annotation, editorPos);
        dfd.then(function (annotation) {
            // store annotation (returns deferred)
            return annotator.annotations.create(annotation)
            // handle storage errors
            .fail(function () {
                console.error("Error storing annotation!");
                // TODO: more error handling?
            });
        });
        dfd.done(function (annotation) {
            annotator.publish('annotationCreated', [annotation]);
        });
        // clean up (if, for example, editing was cancelled, or storage failed)
        dfd.fail(function (annotation) {
            console.warn("Editing annotation cancelled!");
            deleteAnnotation(data, annotation);
        });
        return dfd;
    };
    
    /**
     * Render all annotations on the image.
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
     * Render a single annotation on the image.
     * 
     * @param annot annotation wrapper object
     */
    var renderAnnotation = function (data, annot) {
        if (annot == null || annot.annotation == null || data.$img == null || data.imgTrafo == null)
            return;
        if (!data.settings.isAnnotationsVisible) return;
        var cssPrefix = data.settings.cssPrefix;
        var $elem = data.$elem;
        var annotator = data.annotator;
        var annotation = annot.annotation;
        var idx = '';
        if (data.settings.showAnnotationNumbers) {
            // show annotation number
            idx = annot.idx ? annot.idx : '?';
        }
        var shape = null;
        var area = null;
        var type = null;
        if (annotation.shapes != null) {
            // annotation shape
            shape = annotation.shapes[0];
            type = shape.type;
            if (type === "point") {
                area = geom.position(shape.geometry);
            } else if (type === "rectangle") {
                area = geom.rectangle(shape.geometry);
            } else {
                console.error("Unsupported shape type="+type);
                return;
            }
        } else if (annotation.areas != null) {
            // legacy annotation areas
            shape = annotation.areas[0];
            area = geom.rectangle(shape);
            if (area.isRectangle()) {
                type = 'rectangle';
            } else {
                type = 'point';
            }
        } else {
            console.error("Unable to render this annotation!");
            return;
        }
        var screenRect = null;
        var $annotation = null;
        if (type === 'rectangle') {
            // render rectangle
        	var clippedArea = data.zoomArea.intersect(area);
        	if (clippedArea == null) return;
            screenRect = data.imgTrafo.transform(clippedArea);
	        $annotation = $('<div class="'+cssPrefix+'annotationregion '+cssPrefix+'overlay annotator-hl">'+idx+'</div>');
        } else {
            // render point
	        if (!data.zoomArea.containsPosition(area)) return;
            screenRect = data.imgTrafo.transform(area);
            // create annotation
            var html = '<div class="'+cssPrefix+'annotationmark '+cssPrefix+'overlay annotator-hl">'+idx+'</div>';
            $annotation = $(html);
	    }
        // save annotation in data for Annotator
        $annotation.data('annotation', annotation);
        $annotation.data('rect', area);
        // add shared css class from annotations collection
        if (annotation.cssclass != null) {
            $annotation.addClass(annotation.cssclass);
        }
        // add individual css class from this annotation
        if (shape.cssclass != null) {
            $annotation.addClass(shape.cssclass);
        }
        // save reference to div
        annot.$div = $annotation;
        $elem.append($annotation);
        // hook up Annotator events
        $annotation.on("mouseover", annotator.onHighlightMouseover);
        $annotation.on("mouseout", annotator.startViewerHideTimer);
        $annotation.on('click.dlAnnotation', function(event) {
            $(data).trigger('annotationClick', [$annotation]);
        }); 
        screenRect.adjustDiv($annotation);
    };

    
    /**
     * Delete annotation from digilib.
     * 
     * Finds the corresponding digilib annotation wrapper, removes any elements from screen, 
     * and deletes the wrapper from the list.
     * 
     * @param annotation the annotation object to delete.
     */
    var deleteAnnotation = function(data, annotation) {
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
                annots.splice(i, 1);
                break;
            }
        }
    };
        

    /**
     * Our modified version of Annotator.
     */
    var DigilibAnnotator = Annotator.extend({
        /** 
         * Set digilib data object in Annotator 
         */
        'setDigilibData' : function (data) {
            // set digilib data in options
            this.options.digilibData = data;
        },
        /**
         * Initialises an annotation from an object representation.
         * Overwrites Annotator.setupAnnotation().
         * 
         * Checks for image annotations, creates a wrapper, adds wrapper to list,
         * and renders the annotation.
         */
        'setupAnnotation' : function (annotation) {
            // digilibData has to be set in the options
            var data = this.options.digilibData;
            // is this a digilib image annotation?
            if (annotation.shapes != null || annotation.areas != null) {
                // create annotation wrapper
                var ann = {
                    'annotation' : annotation,
                    'idx' : data.annotations.length+1
                };
                // add to list
                data.annotations.push(ann);
                // render this annotation
                renderAnnotation(data, ann);
            } else {
                // Invoke the built-in implementation
                Annotator.prototype.setupAnnotation.call(this, annotation);
            }
            return annotation;
        },
        /**
         * Handler for annotationDeleted event for digilib annotations.
         */
        'onDigilibAnnotationDeleted' : function (annotation) {
            // remove digilib annotation
            var data = this.options.digilibData;
            deleteAnnotation(data, annotation);
        }
    });

    
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
	 * returns the annotation server URL.
	 */
	var getAnnotationServerUrl = function (data) {
		return data.settings.annotationServerUrl;
	};
	
	/**
	 * returns the annotation token URL.
	 */
	var getAnnotationTokenUrl = function (data) {
		return data.settings.annotationTokenUrl;
	};
	
    /**
     * returns the cached annotation token.
     */
    var getAnnotationToken = function (data) {
        return data.dlOpts.annotationToken;
    };

	/**
	 * returns the annotation user.
	 */
	var getAnnotationUser = function (data) {
		return data.settings.annotationUser;
	};
	

	/**
	 * zoom in and display the annotation in the middle of the screen.
	 */
    var zoomToAnnotation = function (data, $div) {
        var settings = data.settings;
        var rect = $div.data('rect');
        var za = geom.rectangle(rect);
        var w = settings.annotationAutoWidth;
        if (za.width == null || za.width == 0) za.width = w; 
        if (za.height == null || za.height == 0) za.height = w; 
        var factor = settings.annotationAutoZoomFactor;
        za.width  *= factor;
        za.height *= factor;
        za.setProportion(1, true); // avoid extreme zoomArea proportions
        if (rect.width != null) {
            za.setCenter(rect.getCenter()).stayInside(FULL_AREA);
        }
        fn.setZoomArea(data, za);
        fn.redisplay(data);
    };


    /**
     * event handler, gets called when a annotationClick event is triggered
     */
    var handleAnnotationClick = function (evt, $div) {
        var data = this;
        var settings = data.settings;
        console.debug("annotations: handleAnnotationClick", $div);
        if (typeof settings.annotationOnClick === 'function') {
            // execute callback
            return settings.annotationOnClick(data, $div);
        }
        if (typeof settings.annotationOnClick === 'string') {
            // execute action
            return actions[settings.annotationOnClick](data, $div);
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
        // show numbers in rectangle annotations
        'showAnnotationNumbers' : true,
        // default width for annotation when only point is given
        'annotationAutoWidth' : 0.005,
        // zoomfactor for displaying larger area around region (for autoZoomOnClick)
        'annotationAutoZoomFactor' : 3,
        // zoom in and center on click on the annotation area
        'annotationOnClick' : zoomToAnnotation,
        // are the annotations read-only
        'annotationsReadOnly' : false,
        // URL of authentication token server e.g. 'http://libcoll.mpiwg-berlin.mpg.de/libviewa/template/token'
        'annotationTokenUrl' : null,
        // URL of safe authentication token server e.g. 'https://libcoll.mpiwg-berlin.mpg.de/libviewa/template/token'
        'annotationSafeTokenUrl' : null,
        // annotation user name
        'annotationUser' : 'anonymous',
        // string or function that returns the uri of the page being annotated
        'annotationPageUri' : null,
        // list of Annotator plugins
        'annotatorPlugins' : ['Auth', 'Permissions'],
        // Annotator plugin settings (values that are functions are replaced by fn(data))
        'annotatorPluginSettings' : {
            'Auth' : {
                'token' : getAnnotationToken,
                'tokenUrl' : getAnnotationTokenUrl,
                'autoFetch' : true,
                'requestMethod' : 'POST',
                'requestData' : {
                    'user': getAnnotationUser
                },
                'unauthorizedCallback' : getHandleUnauthorized
            },
            'Permissions' : { 
                'user' : getAnnotationUser,
                // userString and userId have to remain functions after evaluation
                'userString' : function (data) {
                    return function(user) {
                        if (user && user.name) {
                            return user.name;
                        }
                        return user;
                    };
                }, 
                'userId' : function (data) {
                    return function(user) {
                        if (user && user.id) {
                            return user.id;
                        }
                        return user;
                    };
                }
            }
        }
    };

    /** 
     * plugin installation. called by digilib on plugin object. 
     */
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing annotator plugin. digilib:', digilib);
        // import digilib functions
        $.extend(fn, digilib.fn);
        // import geometry classes
        geom = fn.geometry;
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
        FULL_AREA = geom.rectangle(0, 0, 1, 1);
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
        $data.on('annotationClick', handleAnnotationClick);
    };

    /**
     * setup creates Annotator object (after HTML setup by digilib).
     */
    var handleSetup = function(evt) {
        console.debug("annotations: handleSetup");
        var data = this;
        var settings = data.settings;
        // set up annotator (after html has been set up)
        var uri = getAnnotationPageUri(data);
        var elem = data.$elem.get(0);
        var opts = {
            'store' : {
                'type' : Annotator.Plugin.Store,
                'prefix' : getAnnotationServerUrl(data),
                'annotationData' : {'uri' : uri}                
            },
            'loadQuery' : null,
            'readOnly' : data.settings.annotationsReadOnly,
        };
        console.debug("creating annotator.");
        var annotator = new DigilibAnnotator(elem, opts);
        annotator.setDigilibData(data);
        // save annotator reference     
        data.annotator = annotator;
        // set plugin parameters
        var pluginParams = {};
        // merge settings 
        // (deep copy of defaults from plugin and options from HTML)
        $.extend(true, pluginParams, defaults.annotatorPluginSettings, data.options.annotatorPluginSettings);
        // function to evaluate plugin settings
        var evalParams = function (params) {
            if (params == null) return;
        	// eval functions in params
        	$.each(params, function (idx, param) {
        		if (typeof param === 'function') {
        		    // replace function by value
        			params[idx] = param(data);
        		} else if (param == null) {
        		    // delete value null
        			delete params[idx];
                } else if (typeof param === 'object') {
                    // evaluate sub-objects
                    evalParams(param);
        		}
        	});
        };
        // add plugins
        $.each(settings.annotatorPlugins, function (idx, name) {
            // ignore Store plugin (added by Annotator constructor)
            if (name === 'Store') return;
            var params = pluginParams[name];
            evalParams(params);
        	console.debug("plugin:", name, params);
        	annotator.addPlugin(name, params);
        });
        // subscribe annotation delete event
        annotator.subscribe("annotationDeleted", annotator.onDigilibAnnotationDeleted);
    	// save annotation token in cookie
    	var auth = annotator.plugins.Auth;
    	if (auth != null) {
	    	auth.withToken(function (tkn) {
    			data.dlOpts.annotationToken = auth.token;
	    	    fn.storeOptions(data);
    		});
    	}
    	// load annotations
    	var query = {'uri' : uri};
    	annotator.load(query);
        data.annotatorLoadQuery = query;
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

    if (Annotator == null) {
        $.error("Annotator.js Javascript not found!");
    }    
    if ($.fn.digilib == null) {
        $.error("jquery.digilib.annotator must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
