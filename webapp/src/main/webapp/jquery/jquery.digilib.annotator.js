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
    // version of this plugin
    var version = 'jquery.digilib.annotator.js 1.3.6';

    // affine geometry
    var geom = null;
    // plugin object with digilib data
    var digilib = null;
    // the functions made available by digilib
    var fn = {};
    // annotation shape layer
    var annotationLayer = null;

    // translate shapes to Digilib
    var shapeTypeMap = {
      point: 'Point',
      rectangle: 'Rectangle',
      linestring: 'LineString',
      polygon: 'Polygon'
      };

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
        annotationrect : {
            onclick : "setAnnotationRect",
            tooltip : "create an annotation for a rectangular region",
            icon : "annotation-region.png"
        },
        annotationpolygon : {
            onclick : "setAnnotationPolygon",
            tooltip : "create an annotation for a polygon region (end with doubleclick)",
            icon : "annotation-polygon.png"
        },
        annotationpolyline : {
            onclick : "setAnnotationPolyline",
            tooltip : "create an annotation for a polyline (end with doubleclick)",
            icon : "annotation-polyline.png"
        }
    };

    // for defaults see below (we need to define the functions used in annotatorPluginSettings first)

    var actions = {
        /**
         * show/hide annotations
         */
        toggleAnnotations : function (data) {
            var show = !data.dlOpts.isAnnotationsVisible;
            data.dlOpts.isAnnotationsVisible = show;
            fn.storeOptions(data);
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
        	if (user == null) {
				if (fn.showUserPasswordDialog != null) {
					fn.showUserPasswordDialog(data, "Please enter user name and password for annotation server.", 
							function (userInput, passInput) {
								console.debug("got username and password for annotation auth.");
								setAnnotationUser(data, auth, userInput, passInput);
							});
				} else {
			        // fall back to JS-prompt
			        user = window.prompt("Please authenticate (Cancel to log out): User name", data.settings.annotationUser);
			        if (user != null && user != 'anonymous') {
			            // password entered in JS-prompt
			            password = window.prompt("Please authenticate: Password (Beware! Password is visible!)", '');
			        }
					setAnnotationUser(data, auth, user, password);
				}
        	} else {
	        	// set new user in digilib and Annotator Auth plugin
	        	setAnnotationUser(data, auth, user, password);
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
                addAnnotationShape(data, 'point');
            } else {
                // use position and text (and user-id)
                console.error("Sorry, currently only interactive annotations!");
            }
        },

        /**
         * set a rectangle-annotation by clicking (or giving a position and a text)
         *
         * @param data
         * @param rect
         * @param text
         */
        setAnnotationRect : function (data, rect, text) {
            if (rect == null) {
                // interactive
                addAnnotationShape(data, 'rectangle');
            } else {
                // use position and text (and user-id)
                console.error("Sorry, currently only interactive annotations!");
            }
        },
        
        /**
         * set a polygon-annotation by clicking (or giving a position and a text)
         *
         * @param data
         * @param polygon
         * @param text
         */
        setAnnotationPolygon : function (data, polygon, text) {
            if (polygon == null) {
                // interactive
                addAnnotationShape(data, 'polygon');
            } else {
                // use position and text (and user-id)
                console.error("Sorry, currently only interactive annotations!");
            }
        },

        /**
         * set a polyline-annotation by clicking (or giving a position and a text)
         *
         * @param data
         * @param poly
         * @param text
         */
        setAnnotationPolyline : function (data, polyline, text) {
            if (polyline == null) {
                // interactive
                addAnnotationShape(data, 'linestring');
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
        if (user != null && user != '' && user != 'anonymous') {
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
        console.debug("setting annotation user to "+user);
        // set user in digilib
        data.settings.annotationUser = user;
        data.dlOpts.annotationUser = user;
        fn.storeOptions(data);
        var annotator = data.annotator;
        // set params for Auth plugin
        auth.options.requestData.user = user;
        // set params for Permissions plugin
        var perms = annotator.plugins.GroupPermissions || annotator.plugins.Permissions;
        if (perms != null) {
        	perms.setUser(user);
        }
    	// get new token
    	auth.token = null;
    	auth._unsafeToken = null;
    	// save new token in cookie
    	auth.withToken(function (tkn) {
    		console.debug("setting new annotation token.", tkn, auth.token);
    		data.dlOpts.annotationToken = auth.token;
		    fn.storeOptions(data);
	        // clear annotations
    		data.annotations = [];
    		data.annotator.plugins.Store.annotations = [];
        	// reload annotations
    		data.annotator.plugins.Store.pluginInit();
    	});
   	};


    /**
     * Add a shape-annotation where clicked.
     */
	    var addAnnotationShape = function(data, type) {
		var onComplete = function(data, shape) {
			if (!shape.type in data.shapeFactory) {
				console.error("Unsupported annotation shape=" + type);
				return;
			}
			// annotation shape is different from digilib vector shape
			var annoshape = {
				type : type,
				geometry : shape.geometry
			};
			if (shape.geometry.type === 'Point') {
				// point needs "x", "y" coordinate members
				var c = shape.geometry.coordinates;
				annoshape.geometry = geom.position(c[0]);
			}
			if (shape.geometry.type === 'Rectangle') {
				// rectangle needs "x", "y", "width", "height" coordinate members
				var c = shape.geometry.coordinates;
				annoshape.geometry = geom.rectangle(geom.position(c[0]), geom.position(c[1]));
			}
			annoshape.geometry.units = 'fraction';
			// screen position for annotation editor
			var pos = geom.position(shape.geometry.coordinates[0]);
			var mpos = data.imgTrafo.transform(pos);
			console.debug("creating annotation shape:", annoshape);
			// show annotatorjs edit box
			addAnnotationContent(data, annoshape, mpos);
		};
		// initial digilib vector shape
		var shape = {
			geometry : {
				type : shapeTypeMap[type]
			}
		};
		digilib.actions.addShape(data, shape, annotationLayer, onComplete);
	};
    
    
    /**
	 * Show editor, edit and save new annotation.
	 */
    var addAnnotationContent = function (data, shape, screenPos) {
      var annotator = data.annotator;
      annotator.selectedShapes = [shape];
      // create and edit new annotation
      var annotation = annotator.createAnnotation();
      annotation.editing = true;
      var cleanup = function () {
        annotator.unsubscribe('annotationStore', store);
        annotator.unsubscribe('annotationEditorSubmit', save);
        annotator.unsubscribe('annotationEditorHidden', cancel);
        delete annotation.editing;
      };
      var save = function () {
        console.log("annotation save");
        cleanup();
        annotator.setupAnnotation(annotation);
        // UGLY: depends on data.annotations(side effect of setupAnnotation)
        var annoWrapper = data.annotations[data.annotations.length -1];
        // calculate shape coordinates
        createShape(data, annoWrapper);
        // Fire annotationCreated events so that the Annotator Store plugin saves the annotation in the Db 
        annotator.publish('annotationCreated', [annotation]);
      };
      var store = function (stored) {
        if (stored == null) {
          console.warn('Annotation Store did not return the stored annotation');
          stored = annotation;
          }
        console.debug("annotation stored", stored);
        renderAnnotations(data);
      };
      var cancel = function () {
        console.log("annotation cancel");
        cleanup();
        renderAnnotations(data);
      };
      annotator.subscribe('annotationStored', store);
      annotator.subscribe('annotationEditorSubmit', save);
      annotator.subscribe('annotationEditorHidden', cancel);
      annotator.showEditor(annotation, screenPos.getAsCss());
    };
    
    /**
     * Render all annotations on the image
     */
    var renderAnnotations = function (data) {
        if (data.annotations == null || data.annotator == null)
            return;
        var annotations = data.annotations;
        var cssPrefix = data.settings.cssPrefix;
        var $elem = data.$elem;
        // show annotation user state
        $elem.find('div#'+cssPrefix+'button-annotationuser').attr('title', 'annotation user: '+data.settings.annotationUser);
        // create vector shapes
        var shapes = [];
        if (data.dlOpts.isAnnotationsVisible) {
            for (var i = 0; i < annotations.length; ++i) {
                var annot = annotations[i];
                var annoshapes = createShape(data, annot);
                annotationLayer.shapeindex[annot.annotation.id] = annoshapes;
                shapes = shapes.concat(annoshapes);
            }
        }
        annotationLayer.shapes = shapes;
        // render vector layer
        if (data.$img != null && data.imgTrafo != null) {
        	annotationLayer.renderFn(data, annotationLayer);
        }
    };

    /**
     * Create a vector shape for an annotation.
     * 
     * @param annot annotation wrapper object
     * @returns array of vector shape objects
     */
    var createShape = function (data, annot) {
        if (annot == null || annot.annotation == null)
            return;
        if (!data.dlOpts.isAnnotationsVisible) return;
        var cssPrefix = data.settings.cssPrefix;
        var annotation = annot.annotation;
        var idx = '';
        if (data.settings.showAnnotationNumbers) {
            // show annotation number
            idx = annot.idx ? annot.idx : '?';
        }
        var id = fn.createId(annotation.id, cssPrefix+'annot-');
        if (annotation.id == null) {
        	console.warn("substituting annotation id!");
        	annotation.id = id;
        }
        var annoShape = null;
        var area = null;
        var type = null;
        var shape = null;
        var shapes = [];
        if (annotation.areas != null && annotation.shapes == null) {
            console.warn("Annotation uses legacy 'areas' format! Converting...");
            // convert legacy annotation areas into shapes
            area = geom.rectangle(annotation.areas[0]);
            annoShape = {
                'geometry' : area,
                'type': area.isRectangle() ? 'rectangle' : 'point'
                };
            delete annotation.areas;
            annotation.shapes = [annoShape];
        }
        if (annotation.shapes == null) return;
        for (var i = 0; i < annotation.shapes.length; ++i) {
            if (i > 0) {
                // make shape id unique
                id = id + "." + i;
            }
            // create vector shape for annotation
            annoShape = annotation.shapes[i];
            type = annoShape.type;
            var coordinates;
            if (type === "point") {
                area = geom.position(annoShape.geometry);
                coordinates = [[area.x, area.y]];
            } else if (type === "rectangle") {
                area = geom.rectangle(annoShape.geometry);
                var pt1 = area.getPt1();
                var pt2 = area.getPt2();
                coordinates = [[pt1.x, pt1.y], [pt2.x, pt2.y]];
            } else if (type in shapeTypeMap) {
                coordinates = annoShape.geometry.coordinates;
            } else {
                console.error("Unsupported annotation shape="+type);
                return;
            }
            // different css class for area-like shapes
            if (type === "rectangle" || type === "polygon") {
                var cssclass = cssPrefix+'svg-annotationregion annotator-hl';
            } else {
            	var cssclass = cssPrefix+'svg-annotation annotator-hl';
            }
            var shape = {
               'id': id,
               'annotation': annotation,
               'geometry': {
                 'type': shapeTypeMap[type],
                 'units' : 'fraction',
                 'coordinates': coordinates
                 },
               'properties': {
                  'stroke': 'yellow',
                  'cssclass': cssclass,
                  'style': 'pointer-events:all'
                  }
               };
            // console.debug('createshape: '+type, annoShape, shape);
            shapes.push(shape);
        }
        return shapes;
    };
    
    /**
     * renderShape event handler attaches annotation handlers to the SVG shape.
     * 
     * @param shape
     */
    var handleRenderShape = function (evt, shape) {
        if (shape.annotation == null) return;
        var data = this;
        var cssPrefix = data.settings.cssPrefix;
        var annotator = data.annotator;
        var annotation = shape.annotation;
        var id = annotation.id;
        // annotation shape
        var annoShape = annotation.shapes[0];
        var $annotation = shape.$elem;
        // save annotation in data for Annotator
        $annotation.data('annotation', annotation);
        $annotation.attr('data-annotation-id', id)
        //$annotation.data('rect', area);
        // add shared css class from annotations collection
        if (annotation.cssclass != null) {
            // $annotation.addClass(annotation.cssclass);
            $annotation[0].classList.add(annotation.cssclass);
        }
        // add individual css class from this annotation
        if (annoShape.cssclass != null) {
            $annotation[0].classList.add(shape.cssclass);
        }
        // no mouseover when editing
        if (shape.properties.editable || annotation.editing) {
            $annotation[0].classList.remove('annotator-hl');
        } else {
          $annotation.on("mouseover", annotator.onHighlightMouseover);
          $annotation.on("mouseout", annotator.startViewerHideTimer);
        }
        /* $annotation.on('click.dlAnnotation', function(event) {
            $(data).trigger('annotationClick', [$annotation]);
        }); */ 
        // assume that everything was rendered (eventually)
        annotationLayer.dirty = false;
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
			annotationLayer.dirty = true;
		};
	};

	/**
	 * returns annotationDeleted function using the given data.
	 */
	var getAnnotationDeleted = function(data) {
		return function (annotation) {
			// remove annotation mark
			console.debug("delete annotation.");
			var annots = data.annotations;
			for (var i = 0; i < annots.length; ++i) {
				var annot = annots[i];
				if (annot.annotation === annotation) {
					// this is the right wrapper -- delete
					annots.splice(i, 1);
					renderAnnotations(data);
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
    		actions.setAnnotationUser(data);
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
        'annotationSet' : ['annotations', 'annotationuser', 'annotationmark', 'annotationrect', 'annotationpolygon', 'annotationpolyline', 'lessoptions'],
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
        'annotatorPlugins' : ['Auth', 'Permissions', 'Store', 'DigilibIntegrator'],
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
            },
            'Store' : { 
                'prefix' : getAnnotationServerUrl,
                'annotationData': {
                    'uri': getAnnotationPageUri
                }, 
                'loadFromSearch': {
                    'uri': getAnnotationPageUri
                }
            },
            'DigilibIntegrator' : {
                'hooks' : {
                    'setupAnnotation' : getSetupAnnotation,
                    'annotationDeleted' : getAnnotationDeleted
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
        if (digilib.plugins.vector == null) {
            console.error('annotator plugin: vector plugin is missing, aborting installation.');
            return;
        }
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
        $data.on('setup', handleSetup);
        $data.on('update', handleUpdate);
        //$data.on('annotationClick', handleAnnotationClick);
    };

    /**
     * setup creates Annotator object (after HTML setup by digilib).
     */
    var handleSetup = function(evt) {
        console.debug("annotations: handleSetup");
        var data = this;
        var settings = data.settings;
        // merge isVisible setting with value from cookie
        if (data.dlOpts.isAnnotationsVisible == null) {
            data.dlOpts.isAnnotationsVisible = settings.isAnnotationsVisible;
        } else if (typeof data.dlOpts.isAnnotationsVisible == 'string') {
            // make string into boolean
	    data.dlOpts.isAnnotationsVisible = (data.dlOpts.isAnnotationsVisible == 'true');
        }
        // create annotation shapes layer
        annotationLayer = {
            'projection': 'screen', 
            'renderFn': fn.vectorDefaultRenderFn,
            'shapes': [],
            'shapeindex': {}
        };
        digilib.actions.addVectorLayer(data, annotationLayer);
        // make annotationLayer accessible for plugins
        data.annotationLayer = annotationLayer;
        $(data).on("renderShape", handleRenderShape);
        // set up annotator (after html has been set up)
        var uri = getAnnotationPageUri(data);
        var elem = data.$elem.get(0);
        var opts = {'readOnly' : data.settings.annotationsReadOnly};
        var annotator = new Annotator(elem, opts);
        console.debug("annotator created");
        // unbind Annotator selection events so they don't annoy us
        $(document).off("mousedown", annotator.checkForStartSelection);
        $(document).off("mouseup", annotator.checkForEndSelection);
        // set plugin parameters
        var pluginParams = {};
        // merge settings 
        // (deep copy of defaults from plugin and options from HTML)
        $.extend(true, pluginParams, defaults.annotatorPluginSettings, data.settings.annotatorPluginSettings);
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
            var params = pluginParams[name];
            evalParams(params);
        	console.debug("plugin:", name, params);
        	annotator.addPlugin(name, params);
        });
		// save annotator reference		
        data.annotator = annotator;
        annotator.subscribe("annotationsLoaded", function () {
        	console.debug("annotations loaded!");
        	renderAnnotations(data);
        });
    	// save annotation token in cookie
    	var auth = annotator.plugins.Auth;
    	if (auth != null) {
	    	auth.withToken(function (tkn) {
    			data.dlOpts.annotationToken = auth.token;
	    	    fn.storeOptions(data);
    		});
    	}
    };

    /**
     * update renders all annotations.
     */
    var handleUpdate = function(evt) {
        console.debug("annotations: handleUpdate");
        var data = this;
        if (annotationLayer.dirty === true) {
        	renderAnnotations(data);
        }
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

    if (typeof(Annotator) === 'undefined') {
        $.error("Annotator.js Javascript not found!");
    }    
    if ($.fn.digilib == null) {
        $.error("jquery.digilib.annotator must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
