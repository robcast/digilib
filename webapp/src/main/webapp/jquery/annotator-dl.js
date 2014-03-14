/*
** Annotator v2.0.0-dev-e25ce72
** https://github.com/okfn/annotator/
**
** Copyright 2014, the Annotator project contributors.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/okfn/annotator/blob/master/LICENSE
**
** Built at: 2014-03-14 15:39:01Z
*/
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.Annotator=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/**
 * Standalone extraction of Backbone.Events, no external dependency required.
 * Degrades nicely when Backone/underscore are already available in the current
 * global context.
 *
 * Note that docs suggest to use underscore's `_.extend()` method to add Events
 * support to some given object. A `mixin()` method has been added to the Events
 * prototype to avoid using underscore for that sole purpose:
 *
 *     var myEventEmitter = BackboneEvents.mixin({});
 *
 * Or for a function constructor:
 *
 *     function MyConstructor(){}
 *     MyConstructor.prototype.foo = function(){}
 *     BackboneEvents.mixin(MyConstructor.prototype);
 *
 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
 * (c) 2013 Nicolas Perriault
 */
/* global exports:true, define, module */
(function() {
  var root = this,
      breaker = {},
      nativeForEach = Array.prototype.forEach,
      hasOwnProperty = Object.prototype.hasOwnProperty,
      slice = Array.prototype.slice,
      idCounter = 0;

  // Returns a partial implementation matching the minimal API subset required
  // by Backbone.Events
  function miniscore() {
    return {
      keys: Object.keys,

      uniqueId: function(prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
      },

      has: function(obj, key) {
        return hasOwnProperty.call(obj, key);
      },

      each: function(obj, iterator, context) {
        if (obj == null) return;
        if (nativeForEach && obj.forEach === nativeForEach) {
          obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
          for (var i = 0, l = obj.length; i < l; i++) {
            if (iterator.call(context, obj[i], i, obj) === breaker) return;
          }
        } else {
          for (var key in obj) {
            if (this.has(obj, key)) {
              if (iterator.call(context, obj[key], key, obj) === breaker) return;
            }
          }
        }
      },

      once: function(func) {
        var ran = false, memo;
        return function() {
          if (ran) return memo;
          ran = true;
          memo = func.apply(this, arguments);
          func = null;
          return memo;
        };
      }
    };
  }

  var _ = miniscore(), Events;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Mixin utility
  Events.mixin = function(proto) {
    var exports = ['on', 'once', 'off', 'trigger', 'stopListening', 'listenTo',
                   'listenToOnce', 'bind', 'unbind'];
    _.each(exports, function(name) {
      proto[name] = this[name];
    }, this);
    return proto;
  };

  // Export Events as BackboneEvents depending on current context
  if (typeof define === "function") {
    define(function() {
      return Events;
    });
  } else if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Events;
    }
    exports.BackboneEvents = Events;
  } else {
    root.BackboneEvents = Events;
  }
})(this);

},{}],2:[function(_dereq_,module,exports){
module.exports = _dereq_('./backbone-events-standalone');

},{"./backbone-events-standalone":1}],3:[function(_dereq_,module,exports){
(function (definition) {
  if (typeof exports === "object") {
    module.exports = definition();
  }
  else if (typeof define === 'function' && define.amd) {
    define(definition);
  }
  else {
    window.BackboneExtend = definition();
  }
})(function () {
  "use strict";
  
  // mini-underscore
  var _ = {
    has: function (obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    },
  
    extend: function(obj) {
      for (var i=1; i<arguments.length; ++i) {
        var source = arguments[i];
        if (source) {
          for (var prop in source) {
            obj[prop] = source[prop];
          }
        }
      }
      return obj;
    }
  };

  /// Following code is pasted from Backbone.js ///

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Expose the extend function
  return extend;
});

},{}],4:[function(_dereq_,module,exports){
var AnnotationProvider, StorageProvider,
  __hasProp = {}.hasOwnProperty;

StorageProvider = _dereq_('./storage');

AnnotationProvider = (function() {
  AnnotationProvider.configure = function(registry) {
    if (registry['annotations'] == null) {
      registry['annotations'] = new this(registry);
    }
    return registry.include(StorageProvider);
  };

  function AnnotationProvider(registry) {
    this.registry = registry;
  }

  AnnotationProvider.prototype.create = function(obj) {
    if (obj == null) {
      obj = {};
    }
    return this._cycle(obj, 'create');
  };

  AnnotationProvider.prototype.update = function(obj) {
    if (obj.id == null) {
      throw new TypeError("annotation must have an id for update()");
    }
    return this._cycle(obj, 'update');
  };

  AnnotationProvider.prototype["delete"] = function(obj) {
    if (obj.id == null) {
      throw new TypeError("annotation must have an id for delete()");
    }
    return this._cycle(obj, 'delete');
  };

  AnnotationProvider.prototype.query = function(query) {
    return this.registry['store'].query(query);
  };

  AnnotationProvider.prototype.load = function(query) {
    return this.query(query);
  };

  AnnotationProvider.prototype._cycle = function(obj, storeFunc) {
    var safeCopy;
    safeCopy = $.extend(true, {}, obj);
    delete safeCopy._local;
    return this.registry['store'][storeFunc](safeCopy).then((function(_this) {
      return function(ret) {
        var k, v;
        for (k in obj) {
          if (!__hasProp.call(obj, k)) continue;
          v = obj[k];
          if (k !== '_local') {
            delete obj[k];
          }
        }
        $.extend(obj, ret);
        return obj;
      };
    })(this));
  };

  return AnnotationProvider;

})();

module.exports = AnnotationProvider;


},{"./storage":26}],"annotator":[function(_dereq_,module,exports){
module.exports=_dereq_('haW+cw');
},{}],"haW+cw":[function(_dereq_,module,exports){
var AnnotationProvider, Annotator, Delegator, Editor, Notification, Range, Registry, Util, Viewer, Widget, extend, g, handleError, notification, _Annotator, _ref, _t,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

extend = _dereq_('backbone-extend-standalone');

Delegator = _dereq_('./class');

Range = _dereq_('./range');

Util = _dereq_('./util');

Widget = _dereq_('./widget');

Viewer = _dereq_('./viewer');

Editor = _dereq_('./editor');

Notification = _dereq_('./notification');

Registry = _dereq_('./registry');

AnnotationProvider = _dereq_('./annotations');

_t = Util.TranslationString;

_Annotator = this.Annotator;

handleError = function() {
  return console.error.apply(console, arguments);
};

Annotator = (function(_super) {
  __extends(Annotator, _super);

  Annotator.prototype.events = {
    ".annotator-adder button click": "onAdderClick",
    ".annotator-adder button mousedown": "onAdderMousedown",
    ".annotator-hl mouseover": "onHighlightMouseover",
    ".annotator-hl mouseout": "startViewerHideTimer"
  };

  Annotator.prototype.html = {
    adder: '<div class="annotator-adder"><button type="button">' + _t('Annotate') + '</button></div>',
    wrapper: '<div class="annotator-wrapper"></div>'
  };

  Annotator.prototype.options = {
    store: null,
    readOnly: false,
    loadQuery: {}
  };

  Annotator.prototype.plugins = {};

  Annotator.prototype.editor = null;

  Annotator.prototype.viewer = null;

  Annotator.prototype.selectedRanges = null;

  Annotator.prototype.mouseIsDown = false;

  Annotator.prototype.ignoreMouseup = false;

  Annotator.prototype.viewerHideTimer = null;

  function Annotator(element, options) {
    this.onEditAnnotation = __bind(this.onEditAnnotation, this);
    this.onAdderClick = __bind(this.onAdderClick, this);
    this.onAdderMousedown = __bind(this.onAdderMousedown, this);
    this.onHighlightMouseover = __bind(this.onHighlightMouseover, this);
    this.checkForEndSelection = __bind(this.checkForEndSelection, this);
    this.checkForStartSelection = __bind(this.checkForStartSelection, this);
    this.clearViewerHideTimer = __bind(this.clearViewerHideTimer, this);
    this.startViewerHideTimer = __bind(this.startViewerHideTimer, this);
    this.showViewer = __bind(this.showViewer, this);
    this.onEditorSubmit = __bind(this.onEditorSubmit, this);
    this.onEditorHide = __bind(this.onEditorHide, this);
    this.showEditor = __bind(this.showEditor, this);
    Annotator.__super__.constructor.apply(this, arguments);
    this.plugins = {};
    Annotator._instances.push(this);
    if (!Annotator.supported()) {
      return this;
    }
    Registry.createApp(this, options);
  }

  Annotator.extend = extend;

  Annotator.prototype._setupWrapper = function() {
    this.wrapper = $(this.html.wrapper);
    this.element.find('script').remove();
    this.element.wrapInner(this.wrapper);
    this.wrapper = this.element.find('.annotator-wrapper');
    return this;
  };

  Annotator.prototype._setupViewer = function() {
    this.viewer = new Annotator.Viewer({
      readOnly: this.options.readOnly
    });
    this.viewer.hide().on("edit", this.onEditAnnotation).on("delete", (function(_this) {
      return function(annotation) {
        _this.viewer.hide();
        _this.publish('beforeAnnotationDeleted', [annotation]);
        _this.cleanupAnnotation(annotation);
        return _this.annotations["delete"](annotation).done(function() {
          return _this.publish('annotationDeleted', [annotation]);
        });
      };
    })(this)).addField({
      load: (function(_this) {
        return function(field, annotation) {
          if (annotation.text) {
            $(field).html(Util.escape(annotation.text));
          } else {
            $(field).html("<i>" + (_t('No Comment')) + "</i>");
          }
          return _this.publish('annotationViewerTextField', [field, annotation]);
        };
      })(this)
    }).element.appendTo(this.wrapper).bind({
      "mouseover": this.clearViewerHideTimer,
      "mouseout": this.startViewerHideTimer
    });
    return this;
  };

  Annotator.prototype._setupEditor = function() {
    this.editor = new Annotator.Editor();
    this.editor.hide().on('hide', this.onEditorHide).on('save', this.onEditorSubmit).addField({
      type: 'textarea',
      label: _t('Comments') + '\u2026',
      load: function(field, annotation) {
        return $(field).find('textarea').val(annotation.text || '');
      },
      submit: function(field, annotation) {
        return annotation.text = $(field).find('textarea').val();
      }
    });
    this.editor.element.appendTo(this.wrapper);
    return this;
  };

  Annotator.prototype._setupDocumentEvents = function() {
    $(document).bind({
      "mouseup": this.checkForEndSelection,
      "mousedown": this.checkForStartSelection
    });
    return this;
  };

  Annotator.prototype._setupDynamicStyle = function() {
    var max, sel, style, x;
    style = $('#annotator-dynamic-style');
    if (!style.length) {
      style = $('<style id="annotator-dynamic-style"></style>').appendTo(document.head);
    }
    sel = '*' + ((function() {
      var _i, _len, _ref, _results;
      _ref = ['adder', 'outer', 'notice', 'filter'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        x = _ref[_i];
        _results.push(":not(.annotator-" + x + ")");
      }
      return _results;
    })()).join('');
    max = Util.maxZIndex($(document.body).find(sel));
    max = Math.max(max, 1000);
    style.text([".annotator-adder, .annotator-outer, .annotator-notice {", "  z-index: " + (max + 20) + ";", "}", ".annotator-filter {", "  z-index: " + (max + 10) + ";", "}"].join("\n"));
    return this;
  };

  Annotator.prototype.load = function(query) {
    return this.annotations.load(query).then((function(_this) {
      return function(annotations, meta) {
        return _this.loadAnnotations(annotations);
      };
    })(this));
  };

  Annotator.prototype.destroy = function() {
    var idx, name, plugin, _ref;
    $(document).unbind({
      "mouseup": this.checkForEndSelection,
      "mousedown": this.checkForStartSelection
    });
    $('#annotator-dynamic-style').remove();
    this.adder.remove();
    this.viewer.destroy();
    this.editor.destroy();
    this.wrapper.find('.annotator-hl').each(function() {
      $(this).contents().insertBefore(this);
      return $(this).remove();
    });
    this.wrapper.contents().insertBefore(this.wrapper);
    this.wrapper.remove();
    this.element.data('annotator', null);
    _ref = this.plugins;
    for (name in _ref) {
      plugin = _ref[name];
      this.plugins[name].destroy();
    }
    this.removeEvents();
    idx = Annotator._instances.indexOf(this);
    if (idx !== -1) {
      return Annotator._instances.splice(idx, 1);
    }
  };

  Annotator.prototype.getSelectedRanges = function() {
    var browserRange, i, normedRange, r, ranges, rangesToIgnore, selection, _i, _len;
    selection = Util.getGlobal().getSelection();
    ranges = [];
    rangesToIgnore = [];
    if (!selection.isCollapsed) {
      ranges = (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = selection.rangeCount; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          r = selection.getRangeAt(i);
          browserRange = new Range.BrowserRange(r);
          normedRange = browserRange.normalize().limit(this.wrapper[0]);
          if (normedRange === null) {
            rangesToIgnore.push(r);
          }
          _results.push(normedRange);
        }
        return _results;
      }).call(this);
      selection.removeAllRanges();
    }
    for (_i = 0, _len = rangesToIgnore.length; _i < _len; _i++) {
      r = rangesToIgnore[_i];
      selection.addRange(r);
    }
    return $.grep(ranges, function(range) {
      if (range) {
        selection.addRange(range.toRange());
      }
      return range;
    });
  };

  Annotator.prototype.setupAnnotation = function(annotation) {
    var e, normed, normedRanges, r, root, _i, _j, _len, _len1, _ref;
    root = this.wrapper[0];
    normedRanges = [];
    _ref = annotation.ranges;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      r = _ref[_i];
      try {
        normedRanges.push(Range.sniff(r).normalize(root));
      } catch (_error) {
        e = _error;
        if (e instanceof Range.RangeError) {
          this.publish('rangeNormalizeFail', [annotation, r, e]);
        } else {
          throw e;
        }
      }
    }
    annotation.quote = [];
    annotation.ranges = [];
    annotation._local = {};
    annotation._local.highlights = [];
    for (_j = 0, _len1 = normedRanges.length; _j < _len1; _j++) {
      normed = normedRanges[_j];
      annotation.quote.push($.trim(normed.text()));
      annotation.ranges.push(normed.serialize(this.wrapper[0], '.annotator-hl'));
      $.merge(annotation._local.highlights, this.highlightRange(normed));
    }
    annotation.quote = annotation.quote.join(' / ');
    $(annotation._local.highlights).data('annotation', annotation);
    return annotation;
  };

  Annotator.prototype.cleanupAnnotation = function(annotation) {
    var h, _i, _len, _ref, _ref1;
    if (((_ref = annotation._local) != null ? _ref.highlights : void 0) != null) {
      _ref1 = annotation._local.highlights;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        h = _ref1[_i];
        if (h.parentNode != null) {
          $(h).replaceWith(h.childNodes);
        }
      }
      delete annotation._local.highlights;
    }
    return annotation;
  };

  Annotator.prototype.loadAnnotations = function(annotations) {
    var clone, loader;
    if (annotations == null) {
      annotations = [];
    }
    loader = (function(_this) {
      return function(annList) {
        var n, now, _i, _len;
        if (annList == null) {
          annList = [];
        }
        now = annList.splice(0, 10);
        for (_i = 0, _len = now.length; _i < _len; _i++) {
          n = now[_i];
          _this.setupAnnotation(n);
        }
        if (annList.length > 0) {
          return setTimeout((function() {
            return loader(annList);
          }), 10);
        } else {
          return _this.publish('annotationsLoaded', [clone]);
        }
      };
    })(this);
    clone = annotations.slice();
    loader(annotations);
    return this;
  };

  Annotator.prototype.dumpAnnotations = function() {
    if (this.plugins['Store']) {
      return this.plugins['Store'].dumpAnnotations();
    } else {
      console.warn(_t("Can't dump annotations without Store plugin."));
      return false;
    }
  };

  Annotator.prototype.highlightRange = function(normedRange, cssClass) {
    var hl, node, white, _i, _len, _ref, _results;
    if (cssClass == null) {
      cssClass = 'annotator-hl';
    }
    white = /^\s*$/;
    hl = $("<span class='" + cssClass + "'></span>");
    _ref = normedRange.textNodes();
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      node = _ref[_i];
      if (!white.test(node.nodeValue)) {
        _results.push($(node).wrapAll(hl).parent().show()[0]);
      }
    }
    return _results;
  };

  Annotator.prototype.highlightRanges = function(normedRanges, cssClass) {
    var highlights, r, _i, _len;
    if (cssClass == null) {
      cssClass = 'annotator-hl';
    }
    highlights = [];
    for (_i = 0, _len = normedRanges.length; _i < _len; _i++) {
      r = normedRanges[_i];
      $.merge(highlights, this.highlightRange(r, cssClass));
    }
    return highlights;
  };

  Annotator.prototype.addPlugin = function(name, options) {
    var klass, _base;
    if (this.plugins[name]) {
      console.error(_t("You cannot have more than one instance of any plugin."));
    } else {
      klass = Annotator.Plugin[name];
      if (typeof klass === 'function') {
        this.plugins[name] = new klass(this.element[0], options);
        this.plugins[name].annotator = this;
        if (typeof (_base = this.plugins[name]).pluginInit === "function") {
          _base.pluginInit();
        }
      } else {
        console.error(_t("Could not load ") + name + _t(" plugin. Have you included the appropriate <script> tag?"));
      }
    }
    return this;
  };

  Annotator.prototype.editAnnotation = function(annotation, position) {
    var dfd, reject, resolve;
    dfd = $.Deferred();
    resolve = dfd.resolve.bind(dfd, annotation);
    reject = dfd.reject.bind(dfd, annotation);
    this.showEditor(annotation, position);
    this.subscribe('annotationEditorSubmit', resolve);
    this.once('annotationEditorHidden', (function(_this) {
      return function() {
        _this.unsubscribe('annotationEditorSubmit', resolve);
        if (dfd.state() === 'pending') {
          return reject();
        }
      };
    })(this));
    return dfd.promise();
  };

  Annotator.prototype.showEditor = function(annotation, location) {
    this.editor.element.css(location);
    this.editor.load(annotation);
    this.publish('annotationEditorShown', [this.editor, annotation]);
    return this;
  };

  Annotator.prototype.onEditorHide = function() {
    this.publish('annotationEditorHidden', [this.editor]);
    return this.ignoreMouseup = false;
  };

  Annotator.prototype.onEditorSubmit = function(annotation) {
    return this.publish('annotationEditorSubmit', [this.editor, annotation]);
  };

  Annotator.prototype.showViewer = function(annotations, location) {
    this.viewer.element.css(location);
    this.viewer.load(annotations);
    return this.publish('annotationViewerShown', [this.viewer, annotations]);
  };

  Annotator.prototype.startViewerHideTimer = function() {
    if (!this.viewerHideTimer) {
      return this.viewerHideTimer = setTimeout(this.viewer.hide, 250);
    }
  };

  Annotator.prototype.clearViewerHideTimer = function() {
    clearTimeout(this.viewerHideTimer);
    return this.viewerHideTimer = false;
  };

  Annotator.prototype.checkForStartSelection = function(event) {
    if (!(event && this.isAnnotator(event.target))) {
      this.startViewerHideTimer();
    }
    return this.mouseIsDown = true;
  };

  Annotator.prototype.checkForEndSelection = function(event) {
    var container, range, _i, _len, _ref;
    this.mouseIsDown = false;
    if (this.ignoreMouseup) {
      return;
    }
    this.selectedRanges = this.getSelectedRanges();
    _ref = this.selectedRanges;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      range = _ref[_i];
      container = range.commonAncestor;
      if ($(container).hasClass('annotator-hl')) {
        container = $(container).parents('[class!=annotator-hl]')[0];
      }
      if (this.isAnnotator(container)) {
        return;
      }
    }
    if (event && this.selectedRanges.length) {
      return this.adder.css(Util.mousePosition(event, this.wrapper[0])).show();
    } else {
      return this.adder.hide();
    }
  };

  Annotator.prototype.isAnnotator = function(element) {
    return !!$(element).parents().addBack().filter('[class^=annotator-]').not(this.wrapper).length;
  };

  Annotator.prototype.configure = function(registry) {
    this.registry = registry;
    return registry.include(AnnotationProvider);
  };

  Annotator.prototype.run = function(registry) {
    this.registry = registry;
    if (!this.options.readOnly) {
      this._setupDocumentEvents();
    }
    this._setupWrapper()._setupViewer()._setupEditor();
    this._setupDynamicStyle();
    this.adder = $(this.html.adder).appendTo(this.wrapper).hide();
    if (this.options.loadQuery) {
      return this.load(this.options.loadQuery);
    }
  };

  Annotator.prototype.onHighlightMouseover = function(event) {
    var annotations;
    this.clearViewerHideTimer();
    if (this.mouseIsDown || this.viewer.isShown()) {
      return false;
    }
    annotations = $(event.target).parents('.annotator-hl').addBack().map(function() {
      return $(this).data("annotation");
    });
    return this.showViewer($.makeArray(annotations), Util.mousePosition(event, this.wrapper[0]));
  };

  Annotator.prototype.onAdderMousedown = function(event) {
    if (event != null) {
      event.preventDefault();
    }
    return this.ignoreMouseup = true;
  };

  Annotator.prototype.onAdderClick = function(event) {
    var annotation, position;
    if (event != null) {
      event.preventDefault();
    }
    position = this.adder.position();
    this.adder.hide();
    annotation = {
      ranges: this.selectedRanges
    };
    return $.when(annotation).done((function(_this) {
      return function(annotation) {
        return _this.publish('beforeAnnotationCreated', [annotation]);
      };
    })(this)).then((function(_this) {
      return function(annotation) {
        return _this.setupAnnotation(annotation);
      };
    })(this)).done((function(_this) {
      return function(annotation) {
        return $(annotation._local.highlights).addClass('annotator-hl-temporary');
      };
    })(this)).then((function(_this) {
      return function(annotation) {
        return _this.editAnnotation(annotation, position);
      };
    })(this)).then((function(_this) {
      return function(annotation) {
        return _this.annotations.create(annotation).fail(handleError);
      };
    })(this)).done((function(_this) {
      return function(annotation) {
        return $(annotation._local.highlights).removeClass('annotator-hl-temporary');
      };
    })(this)).done((function(_this) {
      return function(annotation) {
        return _this.publish('annotationCreated', [annotation]);
      };
    })(this)).fail(this.cleanupAnnotation);
  };

  Annotator.prototype.onEditAnnotation = function(annotation) {
    var position;
    position = this.viewer.element.position();
    this.viewer.hide();
    return $.when(annotation).done((function(_this) {
      return function(annotation) {
        return _this.publish('beforeAnnotationUpdated', [annotation]);
      };
    })(this)).then((function(_this) {
      return function(annotation) {
        return _this.editAnnotation(annotation, position);
      };
    })(this)).then((function(_this) {
      return function(annotation) {
        return _this.annotations.update(annotation).fail(handleError);
      };
    })(this)).done((function(_this) {
      return function(annotation) {
        return _this.publish('annotationUpdated', [annotation]);
      };
    })(this));
  };

  return Annotator;

})(Delegator);

Annotator.Plugin = (function(_super) {
  __extends(Plugin, _super);

  function Plugin(element, options) {
    Plugin.__super__.constructor.apply(this, arguments);
  }

  Plugin.prototype.pluginInit = function() {};

  Plugin.prototype.destroy = function() {
    return this.removeEvents();
  };

  return Plugin;

})(Delegator);

g = Util.getGlobal();

if (((_ref = g.document) != null ? _ref.evaluate : void 0) == null) {
  $.getScript('http://assets.annotateit.org/vendor/xpath.min.js');
}

if (g.getSelection == null) {
  $.getScript('http://assets.annotateit.org/vendor/ierange.min.js');
}

if (g.JSON == null) {
  $.getScript('http://assets.annotateit.org/vendor/json2.min.js');
}

if (g.Node == null) {
  g.Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  };
}

Annotator.Delegator = Delegator;

Annotator.Range = Range;

Annotator.Util = Util;

Annotator.Widget = Widget;

Annotator.Viewer = Viewer;

Annotator.Editor = Editor;

Annotator.Notification = Notification;

notification = new Notification;

Annotator.showNotification = notification.show;

Annotator.hideNotification = notification.hide;

Annotator._instances = [];

Annotator._t = _t;

Annotator.supported = function() {
  return (function() {
    return !!this.getSelection;
  })();
};

Annotator.noConflict = function() {
  Util.getGlobal().Annotator = _Annotator;
  return this;
};

$.fn.annotator = function(options) {
  var args;
  args = Array.prototype.slice.call(arguments, 1);
  return this.each(function() {
    var instance;
    instance = $.data(this, 'annotator');
    if (instance) {
      return options && instance[options].apply(instance, args);
    } else {
      instance = new Annotator(this, options);
      return $.data(this, 'annotator', instance);
    }
  });
};

module.exports = Annotator;


_dereq_('annotator-plugin-authlogin');
_dereq_('annotator-plugin-filter');
_dereq_('annotator-plugin-markdown');
_dereq_('annotator-plugin-permissions');
_dereq_('annotator-plugin-store');
_dereq_('annotator-plugin-tags');
_dereq_('annotator-plugin-unsupported');

},{"./annotations":4,"./class":7,"./editor":8,"./notification":9,"./range":24,"./registry":25,"./util":27,"./viewer":28,"./widget":29,"annotator-plugin-authlogin":"M3jdsG","annotator-plugin-filter":"EZHTbU","annotator-plugin-markdown":"CyErHP","annotator-plugin-permissions":"HUruzR","annotator-plugin-store":"vOrhum","annotator-plugin-tags":"rXlHIq","annotator-plugin-unsupported":"Q5LRaO","backbone-extend-standalone":3}],7:[function(_dereq_,module,exports){
var BackboneEvents, Delegator, Util,
  __slice = [].slice,
  __hasProp = {}.hasOwnProperty;

Util = _dereq_('./util');

Delegator = (function() {
  Delegator.prototype.events = {};

  Delegator.prototype.options = {};

  Delegator.prototype.element = null;

  function Delegator(element, options) {
    this.options = $.extend(true, {}, this.options, options);
    this.element = $(element);
    this._closures = {};
    this.addEvents();
  }

  Delegator.prototype.addEvents = function() {
    var event, _i, _len, _ref, _results;
    _ref = Delegator._parseEvents(this.events);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      event = _ref[_i];
      _results.push(this._addEvent(event.selector, event.event, event.functionName));
    }
    return _results;
  };

  Delegator.prototype.removeEvents = function() {
    var event, _i, _len, _ref, _results;
    _ref = Delegator._parseEvents(this.events);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      event = _ref[_i];
      _results.push(this._removeEvent(event.selector, event.event, event.functionName));
    }
    return _results;
  };

  Delegator.prototype._addEvent = function(selector, event, functionName) {
    var closure;
    closure = (function(_this) {
      return function() {
        return _this[functionName].apply(_this, arguments);
      };
    })(this);
    if (selector === '' && Delegator._isCustomEvent(event)) {
      this.subscribe(event, closure);
    } else {
      this.element.delegate(selector, event, closure);
    }
    this._closures["" + selector + "/" + event + "/" + functionName] = closure;
    return this;
  };

  Delegator.prototype._removeEvent = function(selector, event, functionName) {
    var closure;
    closure = this._closures["" + selector + "/" + event + "/" + functionName];
    if (selector === '' && Delegator._isCustomEvent(event)) {
      this.unsubscribe(event, closure);
    } else {
      this.element.undelegate(selector, event, closure);
    }
    delete this._closures["" + selector + "/" + event + "/" + functionName];
    return this;
  };

  Delegator.prototype.publish = function(name, args) {
    if (args == null) {
      args = [];
    }
    return this.trigger.apply(this, [name].concat(__slice.call(args)));
  };

  Delegator.prototype.subscribe = function(event, callback, context) {
    if (context == null) {
      context = this;
    }
    return this.on(event, callback, context);
  };

  Delegator.prototype.unsubscribe = function(event, callback, context) {
    if (context == null) {
      context = this;
    }
    return this.off(event, callback, context);
  };

  return Delegator;

})();

Delegator._parseEvents = function(eventsObj) {
  var event, events, functionName, sel, selector, _i, _ref;
  events = [];
  for (sel in eventsObj) {
    functionName = eventsObj[sel];
    _ref = sel.split(' '), selector = 2 <= _ref.length ? __slice.call(_ref, 0, _i = _ref.length - 1) : (_i = 0, []), event = _ref[_i++];
    events.push({
      selector: selector.join(' '),
      event: event,
      functionName: functionName
    });
  }
  return events;
};

Delegator.natives = (function() {
  var key, specials, val;
  specials = (function() {
    var _ref, _results;
    _ref = $.event.special;
    _results = [];
    for (key in _ref) {
      if (!__hasProp.call(_ref, key)) continue;
      val = _ref[key];
      _results.push(key);
    }
    return _results;
  })();
  return "blur focus focusin focusout load resize scroll unload click dblclick\nmousedown mouseup mousemove mouseover mouseout mouseenter mouseleave\nchange select submit keydown keypress keyup error".split(/[^a-z]+/).concat(specials);
})();

Delegator._isCustomEvent = function(event) {
  event = event.split('.')[0];
  return $.inArray(event, Delegator.natives) === -1;
};

BackboneEvents = _dereq_('backbone-events-standalone');

BackboneEvents.mixin(Delegator.prototype);

module.exports = Delegator;


},{"./util":27,"backbone-events-standalone":2}],8:[function(_dereq_,module,exports){
var Editor, Util, Widget, _t,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Util = _dereq_('./util');

Widget = _dereq_('./widget');

_t = Util.TranslationString;

Editor = (function(_super) {
  __extends(Editor, _super);

  Editor.prototype.events = {
    "form submit": "submit",
    ".annotator-save click": "submit",
    ".annotator-cancel click": "hide",
    ".annotator-cancel mouseover": "onCancelButtonMouseover",
    "textarea keydown": "processKeypress"
  };

  Editor.prototype.classes = {
    hide: 'annotator-hide',
    focus: 'annotator-focus'
  };

  Editor.prototype.html = "<div class=\"annotator-outer annotator-editor\">\n  <form class=\"annotator-widget\">\n    <ul class=\"annotator-listing\"></ul>\n    <div class=\"annotator-controls\">\n      <a href=\"#cancel\" class=\"annotator-cancel\">" + _t('Cancel') + "</a>\n<a href=\"#save\" class=\"annotator-save annotator-focus\">" + _t('Save') + "</a>\n    </div>\n  </form>\n</div>";

  Editor.prototype.options = {};

  function Editor(options) {
    this.onCancelButtonMouseover = __bind(this.onCancelButtonMouseover, this);
    this.processKeypress = __bind(this.processKeypress, this);
    this.submit = __bind(this.submit, this);
    this.load = __bind(this.load, this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    Editor.__super__.constructor.call(this, $(this.html)[0], options);
    this.fields = [];
    this.annotation = {};
  }

  Editor.prototype.show = function(event) {
    Util.preventEventDefault(event);
    this.element.removeClass(this.classes.hide);
    this.element.find('.annotator-save').addClass(this.classes.focus);
    this.checkOrientation();
    this.element.find(":input:first").focus();
    this.setupDraggables();
    return this.publish('show');
  };

  Editor.prototype.hide = function(event) {
    Util.preventEventDefault(event);
    this.element.addClass(this.classes.hide);
    return this.publish('hide');
  };

  Editor.prototype.load = function(annotation) {
    var field, _i, _len, _ref;
    this.annotation = annotation;
    this.publish('load', [this.annotation]);
    _ref = this.fields;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      field = _ref[_i];
      field.load(field.element, this.annotation);
    }
    return this.show();
  };

  Editor.prototype.submit = function(event) {
    var field, _i, _len, _ref;
    Util.preventEventDefault(event);
    _ref = this.fields;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      field = _ref[_i];
      field.submit(field.element, this.annotation);
    }
    this.publish('save', [this.annotation]);
    return this.hide();
  };

  Editor.prototype.addField = function(options) {
    var element, field, input;
    field = $.extend({
      id: 'annotator-field-' + Util.uuid(),
      type: 'input',
      label: '',
      load: function() {},
      submit: function() {}
    }, options);
    input = null;
    element = $('<li class="annotator-item" />');
    field.element = element[0];
    switch (field.type) {
      case 'textarea':
        input = $('<textarea />');
        break;
      case 'input':
      case 'checkbox':
        input = $('<input />');
        break;
      case 'select':
        input = $('<select />');
    }
    element.append(input);
    input.attr({
      id: field.id,
      placeholder: field.label
    });
    if (field.type === 'checkbox') {
      input[0].type = 'checkbox';
      element.addClass('annotator-checkbox');
      element.append($('<label />', {
        "for": field.id,
        html: field.label
      }));
    }
    this.element.find('ul:first').append(element);
    this.fields.push(field);
    return field.element;
  };

  Editor.prototype.checkOrientation = function() {
    var controls, list;
    Editor.__super__.checkOrientation.apply(this, arguments);
    list = this.element.find('ul');
    controls = this.element.find('.annotator-controls');
    if (this.element.hasClass(this.classes.invert.y)) {
      controls.insertBefore(list);
    } else if (controls.is(':first-child')) {
      controls.insertAfter(list);
    }
    return this;
  };

  Editor.prototype.processKeypress = function(event) {
    if (event.keyCode === 27) {
      return this.hide();
    } else if (event.keyCode === 13 && !event.shiftKey) {
      return this.submit();
    }
  };

  Editor.prototype.onCancelButtonMouseover = function() {
    return this.element.find('.' + this.classes.focus).removeClass(this.classes.focus);
  };

  Editor.prototype.setupDraggables = function() {
    var classes, controls, cornerItem, editor, mousedown, onMousedown, onMousemove, onMouseup, resize, textarea, throttle;
    this.element.find('.annotator-resize').remove();
    if (this.element.hasClass(this.classes.invert.y)) {
      cornerItem = this.element.find('.annotator-item:last');
    } else {
      cornerItem = this.element.find('.annotator-item:first');
    }
    if (cornerItem) {
      $('<span class="annotator-resize"></span>').appendTo(cornerItem);
    }
    mousedown = null;
    classes = this.classes;
    editor = this.element;
    textarea = null;
    resize = editor.find('.annotator-resize');
    controls = editor.find('.annotator-controls');
    throttle = false;
    onMousedown = function(event) {
      if (event.target === this) {
        mousedown = {
          element: this,
          top: event.pageY,
          left: event.pageX
        };
        textarea = editor.find('textarea:first');
        $(window).bind({
          'mouseup.annotator-editor-resize': onMouseup,
          'mousemove.annotator-editor-resize': onMousemove
        });
        return event.preventDefault();
      }
    };
    onMouseup = function() {
      mousedown = null;
      return $(window).unbind('.annotator-editor-resize');
    };
    onMousemove = (function(_this) {
      return function(event) {
        var diff, directionX, directionY, height, width;
        if (mousedown && throttle === false) {
          diff = {
            top: event.pageY - mousedown.top,
            left: event.pageX - mousedown.left
          };
          if (mousedown.element === resize[0]) {
            height = textarea.outerHeight();
            width = textarea.outerWidth();
            directionX = editor.hasClass(classes.invert.x) ? -1 : 1;
            directionY = editor.hasClass(classes.invert.y) ? 1 : -1;
            textarea.height(height + (diff.top * directionY));
            textarea.width(width + (diff.left * directionX));
            if (textarea.outerHeight() !== height) {
              mousedown.top = event.pageY;
            }
            if (textarea.outerWidth() !== width) {
              mousedown.left = event.pageX;
            }
          } else if (mousedown.element === controls[0]) {
            editor.css({
              top: parseInt(editor.css('top'), 10) + diff.top,
              left: parseInt(editor.css('left'), 10) + diff.left
            });
            mousedown.top = event.pageY;
            mousedown.left = event.pageX;
          }
          throttle = true;
          return setTimeout(function() {
            return throttle = false;
          }, 1000 / 60);
        }
      };
    })(this);
    resize.bind('mousedown', onMousedown);
    return controls.bind('mousedown', onMousedown);
  };

  return Editor;

})(Widget);

module.exports = Editor;


},{"./util":27,"./widget":29}],9:[function(_dereq_,module,exports){
var Delegator, Notification, Util,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Delegator = _dereq_('./class');

Util = _dereq_('./util');

Notification = (function(_super) {
  __extends(Notification, _super);

  Notification.prototype.events = {
    "click": "hide"
  };

  Notification.prototype.options = {
    html: "<div class='annotator-notice'></div>",
    classes: {
      show: "annotator-notice-show",
      info: "annotator-notice-info",
      success: "annotator-notice-success",
      error: "annotator-notice-error"
    }
  };

  function Notification(options) {
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    Notification.__super__.constructor.call(this, $(this.options.html)[0], options);
  }

  Notification.prototype.show = function(message, status) {
    if (status == null) {
      status = Notification.INFO;
    }
    this.currentStatus = status;
    this._appendElement();
    $(this.element).addClass(this.options.classes.show).addClass(this.options.classes[this.currentStatus]).html(Util.escape(message || ""));
    setTimeout(this.hide, 5000);
    return this;
  };

  Notification.prototype.hide = function() {
    if (this.currentStatus == null) {
      this.currentStatus = Annotator.Notification.INFO;
    }
    $(this.element).removeClass(this.options.classes.show).removeClass(this.options.classes[this.currentStatus]);
    return this;
  };

  Notification.prototype._appendElement = function() {
    if (this.element.parentNode == null) {
      return $(this.element).appendTo(document.body);
    }
  };

  return Notification;

})(Delegator);

Notification.INFO = 'info';

Notification.SUCCESS = 'success';

Notification.ERROR = 'error';

module.exports = Notification;


},{"./class":7,"./util":27}],"annotator-plugin-authlogin":[function(_dereq_,module,exports){
module.exports=_dereq_('M3jdsG');
},{}],"M3jdsG":[function(_dereq_,module,exports){
var Annotator, base64Decode, base64UrlDecode, createDateFromISO8601, parseToken,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator = _dereq_('annotator');

createDateFromISO8601 = function(string) {
  var d, date, offset, regexp, time, _ref;
  regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" + "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\\.([0-9]+))?)?" + "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
  d = string.match(new RegExp(regexp));
  offset = 0;
  date = new Date(d[1], 0, 1);
  if (d[3]) {
    date.setMonth(d[3] - 1);
  }
  if (d[5]) {
    date.setDate(d[5]);
  }
  if (d[7]) {
    date.setHours(d[7]);
  }
  if (d[8]) {
    date.setMinutes(d[8]);
  }
  if (d[10]) {
    date.setSeconds(d[10]);
  }
  if (d[12]) {
    date.setMilliseconds(Number("0." + d[12]) * 1000);
  }
  if (d[14]) {
    offset = (Number(d[16]) * 60) + Number(d[17]);
    offset *= (_ref = d[15] === '-') != null ? _ref : {
      1: -1
    };
  }
  offset -= date.getTimezoneOffset();
  time = Number(date) + (offset * 60 * 1000);
  date.setTime(Number(time));
  return date;
};

base64Decode = function(data) {
  var ac, b64, bits, dec, h1, h2, h3, h4, i, o1, o2, o3, tmp_arr;
  if (typeof atob !== "undefined" && atob !== null) {
    return atob(data);
  } else {
    b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    i = 0;
    ac = 0;
    dec = "";
    tmp_arr = [];
    if (!data) {
      return data;
    }
    data += '';
    while (i < data.length) {
      h1 = b64.indexOf(data.charAt(i++));
      h2 = b64.indexOf(data.charAt(i++));
      h3 = b64.indexOf(data.charAt(i++));
      h4 = b64.indexOf(data.charAt(i++));
      bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
      o1 = bits >> 16 & 0xff;
      o2 = bits >> 8 & 0xff;
      o3 = bits & 0xff;
      if (h3 === 64) {
        tmp_arr[ac++] = String.fromCharCode(o1);
      } else if (h4 === 64) {
        tmp_arr[ac++] = String.fromCharCode(o1, o2);
      } else {
        tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
      }
    }
    return tmp_arr.join('');
  }
};

base64UrlDecode = function(data) {
  var i, m, _i, _ref;
  m = data.length % 4;
  if (m !== 0) {
    for (i = _i = 0, _ref = 4 - m; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      data += '=';
    }
  }
  data = data.replace(/-/g, '+');
  data = data.replace(/_/g, '/');
  return base64Decode(data);
};

parseToken = function(token) {
  var head, payload, sig, _ref;
  _ref = token.split('.'), head = _ref[0], payload = _ref[1], sig = _ref[2];
  return JSON.parse(base64UrlDecode(payload));
};

Annotator.Plugin.Auth = (function(_super) {
  __extends(Auth, _super);

  Auth.prototype.options = {
    token: null,
    tokenUrl: '/auth/token',
    autoFetch: true,
    requestMethod: 'GET',
    requestData: null,
    unauthorizedCallback: null
  };

  function Auth(element, options) {
    Auth.__super__.constructor.apply(this, arguments);
    this.waitingForToken = [];
  }

  Auth.prototype.pluginInit = function() {
    if (this.options.token) {
      return this.setToken(this.options.token);
    } else {
      return this.requestToken();
    }
  };

  Auth.prototype.requestToken = function() {
    this.requestInProgress = true;
    return $.ajax({
      url: this.options.tokenUrl,
      dataType: 'text',
      data: this.options.requestData,
      type: this.options.requestMethod,
      xhrFields: {
        withCredentials: true
      }
    }).done((function(_this) {
      return function(data, status, xhr) {
        return _this.setToken(data);
      };
    })(this)).fail((function(_this) {
      return function(xhr, status, err) {
        var callback, msg;
        if (xhr.status === 401) {
          callback = _this.options.unauthorizedCallback;
          if ((callback != null) && callback(_this)) {
            _this.retryTimeout = setTimeout((function() {
              return _this.requestToken();
            }), 1000);
            return;
          }
        }
        msg = Annotator._t("Couldn't get auth token:");
        console.error("" + msg + " " + err, xhr);
        return Annotator.showNotification("" + msg + " " + xhr.responseText, Annotator.Notification.ERROR);
      };
    })(this)).always((function(_this) {
      return function() {
        return _this.requestInProgress = false;
      };
    })(this));
  };

  Auth.prototype.setToken = function(token) {
    var _results;
    this.token = token;
    this._unsafeToken = parseToken(token);
    if (this.haveValidToken()) {
      if (this.options.autoFetch) {
        this.refreshTimeout = setTimeout(((function(_this) {
          return function() {
            return _this.requestToken();
          };
        })(this)), (this.timeToExpiry() - 2) * 1000);
      }
      this.updateHeaders();
      _results = [];
      while (this.waitingForToken.length > 0) {
        _results.push(this.waitingForToken.pop()(this._unsafeToken));
      }
      return _results;
    } else {
      console.warn(Annotator._t("Didn't get a valid token."));
      if (this.options.autoFetch) {
        console.warn(Annotator._t("Getting a new token in 10s."));
        return setTimeout(((function(_this) {
          return function() {
            return _this.requestToken();
          };
        })(this)), 10 * 1000);
      }
    }
  };

  Auth.prototype.haveValidToken = function() {
    var allFields;
    allFields = this._unsafeToken && this._unsafeToken.issuedAt && this._unsafeToken.ttl && this._unsafeToken.consumerKey;
    if (allFields && this.timeToExpiry() > 0) {
      return true;
    } else {
      return false;
    }
  };

  Auth.prototype.timeToExpiry = function() {
    var expiry, issue, now, timeToExpiry;
    now = new Date().getTime() / 1000;
    issue = createDateFromISO8601(this._unsafeToken.issuedAt).getTime() / 1000;
    expiry = issue + this._unsafeToken.ttl;
    timeToExpiry = expiry - now;
    if (timeToExpiry > 0) {
      return timeToExpiry;
    } else {
      return 0;
    }
  };

  Auth.prototype.updateHeaders = function() {
    var _ref;
    if (((_ref = this.annotator.registry.store) != null ? _ref.setHeader : void 0) != null) {
      return this.annotator.registry.store.setHeader('x-annotator-auth-token', this.token);
    }
  };

  Auth.prototype.withToken = function(callback) {
    if (callback == null) {
      return;
    }
    if (this.haveValidToken()) {
      return callback(this._unsafeToken);
    } else {
      this.waitingForToken.push(callback);
      if (!this.requestInProgress) {
        return this.requestToken();
      }
    }
  };

  return Auth;

})(Annotator.Plugin);

module.exports = Annotator.Plugin.Auth;


},{"annotator":"haW+cw"}],"EZHTbU":[function(_dereq_,module,exports){
var Annotator,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator = _dereq_('annotator');

Annotator.Plugin.Filter = (function(_super) {
  __extends(Filter, _super);

  Filter.prototype.events = {
    ".annotator-filter-property input focus": "_onFilterFocus",
    ".annotator-filter-property input blur": "_onFilterBlur",
    ".annotator-filter-property input keyup": "_onFilterKeyup",
    ".annotator-filter-previous click": "_onPreviousClick",
    ".annotator-filter-next click": "_onNextClick",
    ".annotator-filter-clear click": "_onClearClick"
  };

  Filter.prototype.classes = {
    active: 'annotator-filter-active',
    hl: {
      hide: 'annotator-hl-filtered',
      active: 'annotator-hl-active'
    }
  };

  Filter.prototype.html = {
    element: "<div class=\"annotator-filter\">\n  <strong>" + Annotator._t('Navigate:') + "</strong>\n<span class=\"annotator-filter-navigation\">\n  <button type=\"button\" class=\"annotator-filter-previous\">" + Annotator._t('Previous') + "</button>\n<button type=\"button\" class=\"annotator-filter-next\">" + Annotator._t('Next') + "</button>\n</span>\n<strong>" + Annotator._t('Filter by:') + "</strong>\n</div>",
    filter: "<span class=\"annotator-filter-property\">\n  <label></label>\n  <input/>\n  <button type=\"button\" class=\"annotator-filter-clear\">" + Annotator._t('Clear') + "</button>\n</span>"
  };

  Filter.prototype.options = {
    appendTo: 'body',
    filters: [],
    addAnnotationFilter: true,
    isFiltered: function(input, property) {
      var keyword, _i, _len, _ref;
      if (!(input && property)) {
        return false;
      }
      _ref = input.split(/\s+/);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        keyword = _ref[_i];
        if (property.indexOf(keyword) === -1) {
          return false;
        }
      }
      return true;
    }
  };

  function Filter(element, options) {
    this._onPreviousClick = __bind(this._onPreviousClick, this);
    this._onNextClick = __bind(this._onNextClick, this);
    this._onFilterKeyup = __bind(this._onFilterKeyup, this);
    this._onFilterBlur = __bind(this._onFilterBlur, this);
    this._onFilterFocus = __bind(this._onFilterFocus, this);
    this.updateHighlights = __bind(this.updateHighlights, this);
    var _base;
    element = $(this.html.element).appendTo((options != null ? options.appendTo : void 0) || this.options.appendTo);
    Filter.__super__.constructor.call(this, element, options);
    (_base = this.options).filters || (_base.filters = []);
    this.filter = $(this.html.filter);
    this.filters = [];
    this.current = 0;
  }

  Filter.prototype.pluginInit = function() {
    var filter, _i, _len, _ref;
    _ref = this.options.filters;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      filter = _ref[_i];
      this.addFilter(filter);
    }
    this.updateHighlights();
    this._setupListeners()._insertSpacer();
    if (this.options.addAnnotationFilter === true) {
      return this.addFilter({
        label: Annotator._t('Annotation'),
        property: 'text'
      });
    }
  };

  Filter.prototype.destroy = function() {
    var currentMargin, html;
    Filter.__super__.destroy.apply(this, arguments);
    html = $('html');
    currentMargin = parseInt(html.css('padding-top'), 10) || 0;
    html.css('padding-top', currentMargin - this.element.outerHeight());
    return this.element.remove();
  };

  Filter.prototype._insertSpacer = function() {
    var currentMargin, html;
    html = $('html');
    currentMargin = parseInt(html.css('padding-top'), 10) || 0;
    html.css('padding-top', currentMargin + this.element.outerHeight());
    return this;
  };

  Filter.prototype._setupListeners = function() {
    var event, events, _i, _len;
    events = ['annotationsLoaded', 'annotationCreated', 'annotationUpdated', 'annotationDeleted'];
    for (_i = 0, _len = events.length; _i < _len; _i++) {
      event = events[_i];
      this.annotator.subscribe(event, this.updateHighlights);
    }
    return this;
  };

  Filter.prototype.addFilter = function(options) {
    var f, filter;
    filter = $.extend({
      label: '',
      property: '',
      isFiltered: this.options.isFiltered
    }, options);
    if (!((function() {
      var _i, _len, _ref, _results;
      _ref = this.filters;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        f = _ref[_i];
        if (f.property === filter.property) {
          _results.push(f);
        }
      }
      return _results;
    }).call(this)).length) {
      filter.id = 'annotator-filter-' + filter.property;
      filter.annotations = [];
      filter.element = this.filter.clone().appendTo(this.element);
      filter.element.find('label').html(filter.label).attr('for', filter.id);
      filter.element.find('input').attr({
        id: filter.id,
        placeholder: Annotator._t('Filter by ') + filter.label + '\u2026'
      });
      filter.element.find('button').hide();
      filter.element.data('filter', filter);
      this.filters.push(filter);
    }
    return this;
  };

  Filter.prototype.updateFilter = function(filter) {
    var annotation, annotations, input, property, _i, _len, _ref;
    filter.annotations = [];
    this.updateHighlights();
    this.resetHighlights();
    input = $.trim(filter.element.find('input').val());
    if (input) {
      annotations = this.highlights.map(function() {
        return $(this).data('annotation');
      });
      _ref = $.makeArray(annotations);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        annotation = _ref[_i];
        property = annotation[filter.property];
        if (filter.isFiltered(input, property)) {
          filter.annotations.push(annotation);
        }
      }
      return this.filterHighlights();
    }
  };

  Filter.prototype.updateHighlights = function() {
    this.highlights = this.annotator.element.find('.annotator-hl:visible');
    return this.filtered = this.highlights.not(this.classes.hl.hide);
  };

  Filter.prototype.filterHighlights = function() {
    var activeFilters, annotation, annotations, filtered, highlights, index, uniques, _i, _len, _ref;
    activeFilters = $.grep(this.filters, function(filter) {
      return !!filter.annotations.length;
    });
    filtered = ((_ref = activeFilters[0]) != null ? _ref.annotations : void 0) || [];
    if (activeFilters.length > 1) {
      annotations = [];
      $.each(activeFilters, function() {
        return $.merge(annotations, this.annotations);
      });
      uniques = [];
      filtered = [];
      $.each(annotations, function() {
        if ($.inArray(this, uniques) === -1) {
          return uniques.push(this);
        } else {
          return filtered.push(this);
        }
      });
    }
    highlights = this.highlights;
    for (index = _i = 0, _len = filtered.length; _i < _len; index = ++_i) {
      annotation = filtered[index];
      highlights = highlights.not(annotation.highlights);
    }
    highlights.addClass(this.classes.hl.hide);
    this.filtered = this.highlights.not(this.classes.hl.hide);
    return this;
  };

  Filter.prototype.resetHighlights = function() {
    this.highlights.removeClass(this.classes.hl.hide);
    this.filtered = this.highlights;
    return this;
  };

  Filter.prototype._onFilterFocus = function(event) {
    var input;
    input = $(event.target);
    input.parent().addClass(this.classes.active);
    return input.next('button').show();
  };

  Filter.prototype._onFilterBlur = function(event) {
    var input;
    if (!event.target.value) {
      input = $(event.target);
      input.parent().removeClass(this.classes.active);
      return input.next('button').hide();
    }
  };

  Filter.prototype._onFilterKeyup = function(event) {
    var filter;
    filter = $(event.target).parent().data('filter');
    if (filter) {
      return this.updateFilter(filter);
    }
  };

  Filter.prototype._findNextHighlight = function(previous) {
    var active, annotation, current, index, next, offset, operator, resetOffset;
    if (!this.highlights.length) {
      return this;
    }
    offset = previous ? 0 : -1;
    resetOffset = previous ? -1 : 0;
    operator = previous ? 'lt' : 'gt';
    active = this.highlights.not('.' + this.classes.hl.hide);
    current = active.filter('.' + this.classes.hl.active);
    if (!current.length) {
      current = active.eq(offset);
    }
    annotation = current.data('annotation');
    index = active.index(current[0]);
    next = active.filter(":" + operator + "(" + index + ")").not(annotation.highlights).eq(resetOffset);
    if (!next.length) {
      next = active.eq(resetOffset);
    }
    return this._scrollToHighlight(next.data('annotation').highlights);
  };

  Filter.prototype._onNextClick = function(event) {
    return this._findNextHighlight();
  };

  Filter.prototype._onPreviousClick = function(event) {
    return this._findNextHighlight(true);
  };

  Filter.prototype._scrollToHighlight = function(highlight) {
    highlight = $(highlight);
    this.highlights.removeClass(this.classes.hl.active);
    highlight.addClass(this.classes.hl.active);
    return $('html, body').animate({
      scrollTop: highlight.offset().top - (this.element.height() + 20)
    }, 150);
  };

  Filter.prototype._onClearClick = function(event) {
    return $(event.target).prev('input').val('').keyup().blur();
  };

  return Filter;

})(Annotator.Plugin);

module.exports = Annotator.Plugin.Filter;


},{"annotator":"haW+cw"}],"annotator-plugin-filter":[function(_dereq_,module,exports){
module.exports=_dereq_('EZHTbU');
},{}],"CyErHP":[function(_dereq_,module,exports){
var Annotator,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator = _dereq_('annotator');

Annotator.Plugin.Markdown = (function(_super) {
  __extends(Markdown, _super);

  Markdown.prototype.events = {
    'annotationViewerTextField': 'updateTextField'
  };

  function Markdown(element, options) {
    this.updateTextField = __bind(this.updateTextField, this);
    if ((typeof Showdown !== "undefined" && Showdown !== null ? Showdown.converter : void 0) != null) {
      Markdown.__super__.constructor.apply(this, arguments);
      this.converter = new Showdown.converter();
    } else {
      console.error(Annotator._t("To use the Markdown plugin, you must include Showdown into the page first."));
    }
  }

  Markdown.prototype.updateTextField = function(field, annotation) {
    var text;
    text = Annotator.Util.escape(annotation.text || '');
    return $(field).html(this.convert(text));
  };

  Markdown.prototype.convert = function(text) {
    return this.converter.makeHtml(text);
  };

  return Markdown;

})(Annotator.Plugin);

module.exports = Annotator.Plugin.Markdown;


},{"annotator":"haW+cw"}],"annotator-plugin-markdown":[function(_dereq_,module,exports){
module.exports=_dereq_('CyErHP');
},{}],"HUruzR":[function(_dereq_,module,exports){
var Annotator,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator = _dereq_('annotator');

Annotator.Plugin.Permissions = (function(_super) {
  __extends(Permissions, _super);

  Permissions.prototype.options = {
    showViewPermissionsCheckbox: true,
    showEditPermissionsCheckbox: true,
    userId: function(user) {
      return user;
    },
    userString: function(user) {
      return user;
    },
    userAuthorize: function(action, annotation, user) {
      var token, tokens, _i, _len;
      if (annotation.permissions) {
        tokens = annotation.permissions[action] || [];
        if (tokens.length === 0) {
          return true;
        }
        for (_i = 0, _len = tokens.length; _i < _len; _i++) {
          token = tokens[_i];
          if (this.userId(user) === token) {
            return true;
          }
        }
        return false;
      } else if (annotation.user) {
        if (user) {
          return this.userId(user) === this.userId(annotation.user);
        } else {
          return false;
        }
      }
      return true;
    },
    user: '',
    permissions: {
      'read': [],
      'update': [],
      'delete': [],
      'admin': []
    }
  };

  function Permissions(element, options) {
    this._setAuthFromToken = __bind(this._setAuthFromToken, this);
    this.updateViewer = __bind(this.updateViewer, this);
    this.updateAnnotationPermissions = __bind(this.updateAnnotationPermissions, this);
    this.updatePermissionsField = __bind(this.updatePermissionsField, this);
    this.addFieldsToAnnotation = __bind(this.addFieldsToAnnotation, this);
    Permissions.__super__.constructor.apply(this, arguments);
    if (this.options.user) {
      this.setUser(this.options.user);
      delete this.options.user;
    }
  }

  Permissions.prototype.pluginInit = function() {
    var createCallback, self;
    if (!Annotator.supported()) {
      return;
    }
    this.annotator.subscribe('beforeAnnotationCreated', this.addFieldsToAnnotation);
    self = this;
    createCallback = function(method, type) {
      return function(field, annotation) {
        return self[method].call(self, type, field, annotation);
      };
    };
    if (!this.user && this.annotator.plugins.Auth) {
      this.annotator.plugins.Auth.withToken(this._setAuthFromToken);
    }
    if (this.options.showViewPermissionsCheckbox === true) {
      this.annotator.editor.addField({
        type: 'checkbox',
        label: Annotator._t('Allow anyone to <strong>view</strong> this annotation'),
        load: createCallback('updatePermissionsField', 'read'),
        submit: createCallback('updateAnnotationPermissions', 'read')
      });
    }
    if (this.options.showEditPermissionsCheckbox === true) {
      this.annotator.editor.addField({
        type: 'checkbox',
        label: Annotator._t('Allow anyone to <strong>edit</strong> this annotation'),
        load: createCallback('updatePermissionsField', 'update'),
        submit: createCallback('updateAnnotationPermissions', 'update')
      });
    }
    this.annotator.viewer.addField({
      load: this.updateViewer
    });
    if (this.annotator.plugins.Filter) {
      return this.annotator.plugins.Filter.addFilter({
        label: Annotator._t('User'),
        property: 'user',
        isFiltered: (function(_this) {
          return function(input, user) {
            var keyword, _i, _len, _ref;
            user = _this.options.userString(user);
            if (!(input && user)) {
              return false;
            }
            _ref = input.split(/\s*/);
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              keyword = _ref[_i];
              if (user.indexOf(keyword) === -1) {
                return false;
              }
            }
            return true;
          };
        })(this)
      });
    }
  };

  Permissions.prototype.setUser = function(user) {
    return this.user = user;
  };

  Permissions.prototype.addFieldsToAnnotation = function(annotation) {
    if (annotation) {
      annotation.permissions = this.options.permissions;
      if (this.user) {
        return annotation.user = this.user;
      }
    }
  };

  Permissions.prototype.authorize = function(action, annotation, user) {
    if (user === void 0) {
      user = this.user;
    }
    if (this.options.userAuthorize) {
      return this.options.userAuthorize.call(this.options, action, annotation, user);
    } else {
      return true;
    }
  };

  Permissions.prototype.updatePermissionsField = function(action, field, annotation) {
    var input;
    field = $(field).show();
    input = field.find('input').removeAttr('disabled');
    if (!this.authorize('admin', annotation)) {
      field.hide();
    }
    if (this.authorize(action, annotation || {}, null)) {
      return input.attr('checked', 'checked');
    } else {
      return input.removeAttr('checked');
    }
  };

  Permissions.prototype.updateAnnotationPermissions = function(type, field, annotation) {
    var dataKey;
    if (!annotation.permissions) {
      annotation.permissions = this.options.permissions;
    }
    dataKey = type + '-permissions';
    if ($(field).find('input').is(':checked')) {
      return annotation.permissions[type] = [];
    } else {
      return annotation.permissions[type] = [this.options.userId(this.user)];
    }
  };

  Permissions.prototype.updateViewer = function(field, annotation, controls) {
    var user, username;
    field = $(field);
    username = this.options.userString(annotation.user);
    if (annotation.user && username && typeof username === 'string') {
      user = Annotator.Util.escape(this.options.userString(annotation.user));
      field.html(user).addClass('annotator-user');
    } else {
      field.remove();
    }
    if (controls) {
      if (!this.authorize('update', annotation)) {
        controls.hideEdit();
      }
      if (!this.authorize('delete', annotation)) {
        return controls.hideDelete();
      }
    }
  };

  Permissions.prototype._setAuthFromToken = function(token) {
    return this.setUser(token.userId);
  };

  return Permissions;

})(Annotator.Plugin);

module.exports = Annotator.Plugin.Permissions;


},{"annotator":"haW+cw"}],"annotator-plugin-permissions":[function(_dereq_,module,exports){
module.exports=_dereq_('HUruzR');
},{}],"vOrhum":[function(_dereq_,module,exports){
var Annotator,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Annotator = _dereq_('annotator');

Annotator.Plugin.Store = (function() {
  Store.prototype.options = {
    annotationData: {},
    emulateHTTP: false,
    emulateJSON: false,
    headers: {},
    prefix: '/store',
    urls: {
      create: '/annotations',
      read: '/annotations/:id',
      update: '/annotations/:id',
      destroy: '/annotations/:id',
      search: '/search'
    }
  };

  function Store(options) {
    this._onError = __bind(this._onError, this);
    this.options = $.extend(true, {}, this.options, options);
  }

  Store.prototype.create = function(annotation) {
    return this._apiRequest('create', annotation);
  };

  Store.prototype.update = function(annotation) {
    return this._apiRequest('update', annotation);
  };

  Store.prototype["delete"] = function(annotation) {
    return this._apiRequest('destroy', annotation);
  };

  Store.prototype.query = function(queryObj) {
    var dfd;
    dfd = $.Deferred();
    this._apiRequest('search', queryObj).done(function(obj) {
      var rows;
      rows = obj.rows;
      delete obj.rows;
      return dfd.resolve(rows, obj);
    }).fail(function() {
      return dfd.reject.apply(dfd, arguments);
    });
    return dfd.promise();
  };

  Store.prototype.setHeader = function(key, value) {
    return this.options.headers[key] = value;
  };

  Store.prototype._apiRequest = function(action, obj) {
    var id, options, request, url;
    id = obj && obj.id;
    url = this._urlFor(action, id);
    options = this._apiRequestOptions(action, obj);
    request = $.ajax(url, options);
    request._id = id;
    request._action = action;
    return request;
  };

  Store.prototype._apiRequestOptions = function(action, obj) {
    var data, method, opts;
    method = this._methodFor(action);
    opts = {
      type: method,
      dataType: "json",
      error: this._onError,
      headers: this.options.headers
    };
    if (this.options.emulateHTTP && (method === 'PUT' || method === 'DELETE')) {
      opts.headers = $.extend(opts.headers, {
        'X-HTTP-Method-Override': method
      });
      opts.type = 'POST';
    }
    if (action === "search") {
      opts = $.extend(opts, {
        data: obj
      });
      return opts;
    }
    if (action === "create" || action === "update") {
      obj = $.extend(obj, this.options.annotationData);
    }
    data = obj && JSON.stringify(obj);
    if (this.options.emulateJSON) {
      opts.data = {
        json: data
      };
      if (this.options.emulateHTTP) {
        opts.data._method = method;
      }
      return opts;
    }
    opts = $.extend(opts, {
      data: data,
      contentType: "application/json; charset=utf-8"
    });
    return opts;
  };

  Store.prototype._urlFor = function(action, id) {
    var url;
    url = this.options.prefix != null ? this.options.prefix : '';
    url += this.options.urls[action];
    url = url.replace(/\/:id/, id != null ? '/' + id : '');
    url = url.replace(/:id/, id != null ? id : '');
    return url;
  };

  Store.prototype._methodFor = function(action) {
    var table;
    table = {
      'create': 'POST',
      'read': 'GET',
      'update': 'PUT',
      'destroy': 'DELETE',
      'search': 'GET'
    };
    return table[action];
  };

  Store.prototype._onError = function(xhr) {
    var action, message;
    action = xhr._action;
    message = Annotator._t("Sorry we could not ") + action + Annotator._t(" this annotation");
    if (xhr._action === 'search') {
      message = Annotator._t("Sorry we could not search the store for annotations");
    } else if (xhr._action === 'read' && !xhr._id) {
      message = Annotator._t("Sorry we could not ") + action + Annotator._t(" the annotations from the store");
    }
    switch (xhr.status) {
      case 401:
        message = Annotator._t("Sorry you are not allowed to ") + action + Annotator._t(" this annotation");
        break;
      case 404:
        message = Annotator._t("Sorry we could not connect to the annotations store");
        break;
      case 500:
        message = Annotator._t("Sorry something went wrong with the annotation store");
    }
    Annotator.showNotification(message, Annotator.Notification.ERROR);
    return console.error(Annotator._t("API request failed:") + (" '" + xhr.status + "'"));
  };

  return Store;

})();

module.exports = Annotator.Plugin.Store;


},{"annotator":"haW+cw"}],"annotator-plugin-store":[function(_dereq_,module,exports){
module.exports=_dereq_('vOrhum');
},{}],"annotator-plugin-tags":[function(_dereq_,module,exports){
module.exports=_dereq_('rXlHIq');
},{}],"rXlHIq":[function(_dereq_,module,exports){
var Annotator,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator = _dereq_('annotator');

Annotator.Plugin.Tags = (function(_super) {
  __extends(Tags, _super);

  function Tags() {
    this.setAnnotationTags = __bind(this.setAnnotationTags, this);
    this.updateField = __bind(this.updateField, this);
    return Tags.__super__.constructor.apply(this, arguments);
  }

  Tags.prototype.options = {
    parseTags: function(string) {
      var tags;
      string = $.trim(string);
      tags = [];
      if (string) {
        tags = string.split(/\s+/);
      }
      return tags;
    },
    stringifyTags: function(array) {
      return array.join(" ");
    }
  };

  Tags.prototype.field = null;

  Tags.prototype.input = null;

  Tags.prototype.pluginInit = function() {
    if (!Annotator.supported()) {
      return;
    }
    this.field = this.annotator.editor.addField({
      label: Annotator._t('Add some tags here') + '\u2026',
      load: this.updateField,
      submit: this.setAnnotationTags
    });
    this.annotator.viewer.addField({
      load: this.updateViewer
    });
    if (this.annotator.plugins.Filter) {
      this.annotator.plugins.Filter.addFilter({
        label: Annotator._t('Tag'),
        property: 'tags',
        isFiltered: Annotator.Plugin.Tags.filterCallback
      });
    }
    return this.input = $(this.field).find(':input');
  };

  Tags.prototype.parseTags = function(string) {
    return this.options.parseTags(string);
  };

  Tags.prototype.stringifyTags = function(array) {
    return this.options.stringifyTags(array);
  };

  Tags.prototype.updateField = function(field, annotation) {
    var value;
    value = '';
    if (annotation.tags) {
      value = this.stringifyTags(annotation.tags);
    }
    return this.input.val(value);
  };

  Tags.prototype.setAnnotationTags = function(field, annotation) {
    return annotation.tags = this.parseTags(this.input.val());
  };

  Tags.prototype.updateViewer = function(field, annotation) {
    field = $(field);
    if (annotation.tags && $.isArray(annotation.tags) && annotation.tags.length) {
      return field.addClass('annotator-tags').html(function() {
        var string;
        return string = $.map(annotation.tags, function(tag) {
          return '<span class="annotator-tag">' + Annotator.Util.escape(tag) + '</span>';
        }).join(' ');
      });
    } else {
      return field.remove();
    }
  };

  return Tags;

})(Annotator.Plugin);

Annotator.Plugin.Tags.filterCallback = function(input, tags) {
  var keyword, keywords, matches, tag, _i, _j, _len, _len1;
  if (tags == null) {
    tags = [];
  }
  matches = 0;
  keywords = [];
  if (input) {
    keywords = input.split(/\s+/g);
    for (_i = 0, _len = keywords.length; _i < _len; _i++) {
      keyword = keywords[_i];
      if (tags.length) {
        for (_j = 0, _len1 = tags.length; _j < _len1; _j++) {
          tag = tags[_j];
          if (tag.indexOf(keyword) !== -1) {
            matches += 1;
          }
        }
      }
    }
  }
  return matches === keywords.length;
};

module.exports = Annotator.Plugin.Tags;


},{"annotator":"haW+cw"}],"annotator-plugin-unsupported":[function(_dereq_,module,exports){
module.exports=_dereq_('Q5LRaO');
},{}],"Q5LRaO":[function(_dereq_,module,exports){
var Annotator,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator = _dereq_('annotator');

Annotator.Plugin.Unsupported = (function(_super) {
  __extends(Unsupported, _super);

  function Unsupported() {
    return Unsupported.__super__.constructor.apply(this, arguments);
  }

  Unsupported.prototype.options = {
    message: Annotator._t("Sorry your current browser does not support the Annotator")
  };

  Unsupported.prototype.pluginInit = function() {
    if (!Annotator.supported()) {
      return $((function(_this) {
        return function() {
          Annotator.showNotification(_this.options.message);
          if ((window.XMLHttpRequest === void 0) && (ActiveXObject !== void 0)) {
            return $('html').addClass('ie6');
          }
        };
      })(this));
    }
  };

  return Unsupported;

})(Annotator.Plugin);

module.exports = Annotator.Plugin.Unsupported;


},{"annotator":"haW+cw"}],24:[function(_dereq_,module,exports){
var Range, Util,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Util = _dereq_('./util');

Range = {};

Range.sniff = function(r) {
  if (r.commonAncestorContainer != null) {
    return new Range.BrowserRange(r);
  } else if (typeof r.start === "string") {
    return new Range.SerializedRange(r);
  } else if (r.start && typeof r.start === "object") {
    return new Range.NormalizedRange(r);
  } else {
    console.error(_t("Could not sniff range type"));
    return false;
  }
};

Range.nodeFromXPath = function(xpath, root) {
  var customResolver, evaluateXPath, namespace, node, segment;
  if (root == null) {
    root = document;
  }
  evaluateXPath = function(xp, nsResolver) {
    var exception;
    if (nsResolver == null) {
      nsResolver = null;
    }
    try {
      return document.evaluate('.' + xp, root, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } catch (_error) {
      exception = _error;
      console.log("XPath evaluation failed.");
      console.log("Trying fallback...");
      return Util.nodeFromXPath(xp, root);
    }
  };
  if (!$.isXMLDoc(document.documentElement)) {
    return evaluateXPath(xpath);
  } else {
    customResolver = document.createNSResolver(document.ownerDocument === null ? document.documentElement : document.ownerDocument.documentElement);
    node = evaluateXPath(xpath, customResolver);
    if (!node) {
      xpath = ((function() {
        var _i, _len, _ref, _results;
        _ref = xpath.split('/');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          segment = _ref[_i];
          if (segment && segment.indexOf(':') === -1) {
            _results.push(segment.replace(/^([a-z]+)/, 'xhtml:$1'));
          } else {
            _results.push(segment);
          }
        }
        return _results;
      })()).join('/');
      namespace = document.lookupNamespaceURI(null);
      customResolver = function(ns) {
        if (ns === 'xhtml') {
          return namespace;
        } else {
          return document.documentElement.getAttribute('xmlns:' + ns);
        }
      };
      node = evaluateXPath(xpath, customResolver);
    }
    return node;
  }
};

Range.RangeError = (function(_super) {
  __extends(RangeError, _super);

  function RangeError(type, message, parent) {
    this.type = type;
    this.message = message;
    this.parent = parent != null ? parent : null;
    RangeError.__super__.constructor.call(this, this.message);
  }

  return RangeError;

})(Error);

Range.BrowserRange = (function() {
  function BrowserRange(obj) {
    this.commonAncestorContainer = obj.commonAncestorContainer;
    this.startContainer = obj.startContainer;
    this.startOffset = obj.startOffset;
    this.endContainer = obj.endContainer;
    this.endOffset = obj.endOffset;
  }

  BrowserRange.prototype.normalize = function(root) {
    var n, node, nr, r;
    if (this.tainted) {
      console.error(_t("You may only call normalize() once on a BrowserRange!"));
      return false;
    } else {
      this.tainted = true;
    }
    r = {};
    if (this.startContainer.nodeType === Node.ELEMENT_NODE) {
      r.start = Util.getFirstTextNodeNotBefore(this.startContainer.childNodes[this.startOffset]);
      r.startOffset = 0;
    } else {
      r.start = this.startContainer;
      r.startOffset = this.startOffset;
    }
    if (this.endContainer.nodeType === Node.ELEMENT_NODE) {
      node = this.endContainer.childNodes[this.endOffset];
      if (node != null) {
        n = node;
        while ((n != null) && (n.nodeType !== Node.TEXT_NODE)) {
          n = n.firstChild;
        }
        if (n != null) {
          r.end = n;
          r.endOffset = 0;
        }
      }
      if (r.end == null) {
        if (this.endOffset) {
          node = this.endContainer.childNodes[this.endOffset - 1];
        } else {
          node = this.endContainer.previousSibling;
        }
        r.end = Util.getLastTextNodeUpTo(node);
        r.endOffset = r.end.nodeValue.length;
      }
    } else {
      r.end = this.endContainer;
      r.endOffset = this.endOffset;
    }
    nr = {};
    if (r.startOffset > 0) {
      if (r.start.nodeValue.length > r.startOffset) {
        nr.start = r.start.splitText(r.startOffset);
      } else {
        nr.start = r.start.nextSibling;
      }
    } else {
      nr.start = r.start;
    }
    if (r.start === r.end) {
      if (nr.start.nodeValue.length > (r.endOffset - r.startOffset)) {
        nr.start.splitText(r.endOffset - r.startOffset);
      }
      nr.end = nr.start;
    } else {
      if (r.end.nodeValue.length > r.endOffset) {
        r.end.splitText(r.endOffset);
      }
      nr.end = r.end;
    }
    nr.commonAncestor = this.commonAncestorContainer;
    while (nr.commonAncestor.nodeType !== Node.ELEMENT_NODE) {
      nr.commonAncestor = nr.commonAncestor.parentNode;
    }
    return new Range.NormalizedRange(nr);
  };

  BrowserRange.prototype.serialize = function(root, ignoreSelector) {
    return this.normalize(root).serialize(root, ignoreSelector);
  };

  return BrowserRange;

})();

Range.NormalizedRange = (function() {
  function NormalizedRange(obj) {
    this.commonAncestor = obj.commonAncestor;
    this.start = obj.start;
    this.end = obj.end;
  }

  NormalizedRange.prototype.normalize = function(root) {
    return this;
  };

  NormalizedRange.prototype.limit = function(bounds) {
    var nodes, parent, startParents, _i, _len, _ref;
    nodes = $.grep(this.textNodes(), function(node) {
      return node.parentNode === bounds || $.contains(bounds, node.parentNode);
    });
    if (!nodes.length) {
      return null;
    }
    this.start = nodes[0];
    this.end = nodes[nodes.length - 1];
    startParents = $(this.start).parents();
    _ref = $(this.end).parents();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      parent = _ref[_i];
      if (startParents.index(parent) !== -1) {
        this.commonAncestor = parent;
        break;
      }
    }
    return this;
  };

  NormalizedRange.prototype.serialize = function(root, ignoreSelector) {
    var end, serialization, start;
    serialization = function(node, isEnd) {
      var n, nodes, offset, origParent, textNodes, xpath, _i, _len;
      if (ignoreSelector) {
        origParent = $(node).parents(":not(" + ignoreSelector + ")").eq(0);
      } else {
        origParent = $(node).parent();
      }
      xpath = Util.xpathFromNode(origParent, root)[0];
      textNodes = Util.getTextNodes(origParent);
      nodes = textNodes.slice(0, textNodes.index(node));
      offset = 0;
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        n = nodes[_i];
        offset += n.nodeValue.length;
      }
      if (isEnd) {
        return [xpath, offset + node.nodeValue.length];
      } else {
        return [xpath, offset];
      }
    };
    start = serialization(this.start);
    end = serialization(this.end, true);
    return new Range.SerializedRange({
      start: start[0],
      end: end[0],
      startOffset: start[1],
      endOffset: end[1]
    });
  };

  NormalizedRange.prototype.text = function() {
    var node;
    return ((function() {
      var _i, _len, _ref, _results;
      _ref = this.textNodes();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(node.nodeValue);
      }
      return _results;
    }).call(this)).join('');
  };

  NormalizedRange.prototype.textNodes = function() {
    var end, start, textNodes, _ref;
    textNodes = Util.getTextNodes($(this.commonAncestor));
    _ref = [textNodes.index(this.start), textNodes.index(this.end)], start = _ref[0], end = _ref[1];
    return $.makeArray(textNodes.slice(start, +end + 1 || 9e9));
  };

  NormalizedRange.prototype.toRange = function() {
    var range;
    range = document.createRange();
    range.setStartBefore(this.start);
    range.setEndAfter(this.end);
    return range;
  };

  return NormalizedRange;

})();

Range.SerializedRange = (function() {
  function SerializedRange(obj) {
    this.start = obj.start;
    this.startOffset = obj.startOffset;
    this.end = obj.end;
    this.endOffset = obj.endOffset;
  }

  SerializedRange.prototype.normalize = function(root) {
    var contains, e, length, node, p, range, targetOffset, tn, _i, _j, _len, _len1, _ref, _ref1;
    range = {};
    _ref = ['start', 'end'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      p = _ref[_i];
      try {
        node = Range.nodeFromXPath(this[p], root);
      } catch (_error) {
        e = _error;
        throw new Range.RangeError(p, ("Error while finding " + p + " node: " + this[p] + ": ") + e, e);
      }
      if (!node) {
        throw new Range.RangeError(p, "Couldn't find " + p + " node: " + this[p]);
      }
      length = 0;
      targetOffset = this[p + 'Offset'];
      if (p === 'end') {
        targetOffset--;
      }
      _ref1 = Util.getTextNodes($(node));
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        tn = _ref1[_j];
        if (length + tn.nodeValue.length > targetOffset) {
          range[p + 'Container'] = tn;
          range[p + 'Offset'] = this[p + 'Offset'] - length;
          break;
        } else {
          length += tn.nodeValue.length;
        }
      }
      if (range[p + 'Offset'] == null) {
        throw new Range.RangeError("" + p + "offset", "Couldn't find offset " + this[p + 'Offset'] + " in element " + this[p]);
      }
    }
    contains = document.compareDocumentPosition == null ? function(a, b) {
      return a.contains(b);
    } : function(a, b) {
      return a.compareDocumentPosition(b) & 16;
    };
    $(range.startContainer).parents().each(function() {
      if (contains(this, range.endContainer)) {
        range.commonAncestorContainer = this;
        return false;
      }
    });
    return new Range.BrowserRange(range).normalize(root);
  };

  SerializedRange.prototype.serialize = function(root, ignoreSelector) {
    return this.normalize(root).serialize(root, ignoreSelector);
  };

  SerializedRange.prototype.toObject = function() {
    return {
      start: this.start,
      startOffset: this.startOffset,
      end: this.end,
      endOffset: this.endOffset
    };
  };

  return SerializedRange;

})();

module.exports = Range;


},{"./util":27}],25:[function(_dereq_,module,exports){
var Registry,
  __hasProp = {}.hasOwnProperty;

Registry = (function() {
  Registry.createApp = function(appModule, settings) {
    if (settings == null) {
      settings = {};
    }
    return (new this(settings)).run(appModule);
  };

  function Registry(settings) {
    this.settings = settings != null ? settings : {};
  }

  Registry.prototype.include = function(module) {
    module.configure(this);
    return this;
  };

  Registry.prototype.run = function(app) {
    var k, v;
    if (this.app) {
      throw new Error("Registry is already bound to a running application");
    }
    this.include(app);
    for (k in this) {
      if (!__hasProp.call(this, k)) continue;
      v = this[k];
      app[k] = v;
    }
    this.app = app;
    return app.run(this);
  };

  return Registry;

})();

module.exports = Registry;


},{}],26:[function(_dereq_,module,exports){
var StorageProvider;

StorageProvider = (function() {
  StorageProvider.configure = function(registry) {
    var klass, store, _ref;
    klass = (_ref = registry.settings.store) != null ? _ref.type : void 0;
    if (typeof klass === 'function') {
      store = new klass(registry.settings.store);
    } else {
      store = new this(registry);
    }
    return registry['store'] != null ? registry['store'] : registry['store'] = store;
  };

  function StorageProvider(registry) {
    this.registry = registry;
  }

  StorageProvider.prototype.id = (function() {
    var counter;
    counter = 0;
    return function() {
      return counter++;
    };
  })();

  StorageProvider.prototype.create = function(annotation) {
    var dfd;
    dfd = $.Deferred();
    if (annotation.id == null) {
      annotation.id = this.id();
    }
    dfd.resolve(annotation);
    return dfd.promise();
  };

  StorageProvider.prototype.update = function(annotation) {
    var dfd;
    dfd = $.Deferred();
    dfd.resolve(annotation);
    return dfd.promise();
  };

  StorageProvider.prototype["delete"] = function(annotation) {
    var dfd;
    dfd = $.Deferred();
    dfd.resolve(annotation);
    return dfd.promise();
  };

  StorageProvider.prototype.query = function(queryObj) {
    var dfd;
    dfd = $.Deferred();
    dfd.resolve([], {});
    return dfd.promise();
  };

  return StorageProvider;

})();

module.exports = StorageProvider;


},{}],27:[function(_dereq_,module,exports){
var Util, gettext, xpath, _gettext, _ref, _t;

xpath = _dereq_('./xpath');

gettext = null;

if (typeof Gettext !== "undefined" && Gettext !== null) {
  _gettext = new Gettext({
    domain: "annotator"
  });
  gettext = function(msgid) {
    return _gettext.gettext(msgid);
  };
} else {
  gettext = function(msgid) {
    return msgid;
  };
}

_t = function(msgid) {
  return gettext(msgid);
};

if (!(typeof jQuery !== "undefined" && jQuery !== null ? (_ref = jQuery.fn) != null ? _ref.jquery : void 0 : void 0)) {
  console.error(_t("Annotator requires jQuery: have you included lib/vendor/jquery.js?"));
}

if (!(JSON && JSON.parse && JSON.stringify)) {
  console.error(_t("Annotator requires a JSON implementation: have you included lib/vendor/json2.js?"));
}

Util = {};

Util.TranslationString = _t;

Util.flatten = function(array) {
  var flatten;
  flatten = function(ary) {
    var el, flat, _i, _len;
    flat = [];
    for (_i = 0, _len = ary.length; _i < _len; _i++) {
      el = ary[_i];
      flat = flat.concat(el && $.isArray(el) ? flatten(el) : el);
    }
    return flat;
  };
  return flatten(array);
};

Util.contains = function(parent, child) {
  var node;
  node = child;
  while (node != null) {
    if (node === parent) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
};

Util.getTextNodes = function(jq) {
  var getTextNodes;
  getTextNodes = function(node) {
    var nodes;
    if (node && node.nodeType !== Node.TEXT_NODE) {
      nodes = [];
      if (node.nodeType !== Node.COMMENT_NODE) {
        node = node.lastChild;
        while (node) {
          nodes.push(getTextNodes(node));
          node = node.previousSibling;
        }
      }
      return nodes.reverse();
    } else {
      return node;
    }
  };
  return jq.map(function() {
    return Util.flatten(getTextNodes(this));
  });
};

Util.getLastTextNodeUpTo = function(n) {
  var result;
  switch (n.nodeType) {
    case Node.TEXT_NODE:
      return n;
    case Node.ELEMENT_NODE:
      if (n.lastChild != null) {
        result = Util.getLastTextNodeUpTo(n.lastChild);
        if (result != null) {
          return result;
        }
      }
      break;
  }
  n = n.previousSibling;
  if (n != null) {
    return Util.getLastTextNodeUpTo(n);
  } else {
    return null;
  }
};

Util.getFirstTextNodeNotBefore = function(n) {
  var result;
  switch (n.nodeType) {
    case Node.TEXT_NODE:
      return n;
    case Node.ELEMENT_NODE:
      if (n.firstChild != null) {
        result = Util.getFirstTextNodeNotBefore(n.firstChild);
        if (result != null) {
          return result;
        }
      }
      break;
  }
  n = n.nextSibling;
  if (n != null) {
    return Util.getFirstTextNodeNotBefore(n);
  } else {
    return null;
  }
};

Util.readRangeViaSelection = function(range) {
  var sel;
  sel = Util.getGlobal().getSelection();
  sel.removeAllRanges();
  sel.addRange(range.toRange());
  return sel.toString();
};

Util.xpathFromNode = function(el, relativeRoot) {
  var exception, result;
  try {
    result = xpath.simpleXPathJQuery.call(el, relativeRoot);
  } catch (_error) {
    exception = _error;
    console.log("jQuery-based XPath construction failed! Falling back to manual.");
    result = xpath.simpleXPathPure.call(el, relativeRoot);
  }
  return result;
};

Util.nodeFromXPath = function(xp, root) {
  var idx, name, node, step, steps, _i, _len, _ref1;
  steps = xp.substring(1).split("/");
  node = root;
  for (_i = 0, _len = steps.length; _i < _len; _i++) {
    step = steps[_i];
    _ref1 = step.split("["), name = _ref1[0], idx = _ref1[1];
    idx = idx != null ? parseInt((idx != null ? idx.split("]") : void 0)[0]) : 1;
    node = xpath.findChild(node, name.toLowerCase(), idx);
  }
  return node;
};

Util.escape = function(html) {
  return html.replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

Util.uuid = (function() {
  var counter;
  counter = 0;
  return function() {
    return counter++;
  };
})();

Util.getGlobal = function() {
  return (function() {
    return this;
  })();
};

Util.maxZIndex = function($elements) {
  var all, el;
  all = (function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = $elements.length; _i < _len; _i++) {
      el = $elements[_i];
      if ($(el).css('position') === 'static') {
        _results.push(-1);
      } else {
        _results.push(parseInt($(el).css('z-index'), 10) || -1);
      }
    }
    return _results;
  })();
  return Math.max.apply(Math, all);
};

Util.mousePosition = function(e, offsetEl) {
  var offset, _ref1;
  if ((_ref1 = $(offsetEl).css('position')) !== 'absolute' && _ref1 !== 'fixed' && _ref1 !== 'relative') {
    offsetEl = $(offsetEl).offsetParent()[0];
  }
  offset = $(offsetEl).offset();
  return {
    top: e.pageY - offset.top,
    left: e.pageX - offset.left
  };
};

Util.preventEventDefault = function(event) {
  return event != null ? typeof event.preventDefault === "function" ? event.preventDefault() : void 0 : void 0;
};

module.exports = Util;


},{"./xpath":30}],28:[function(_dereq_,module,exports){
var LinkParser, Util, Viewer, Widget, _t,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Util = _dereq_('./util');

Widget = _dereq_('./widget');

_t = Util.TranslationString;

Viewer = (function(_super) {
  __extends(Viewer, _super);

  Viewer.prototype.events = {
    ".annotator-edit click": "onEditClick",
    ".annotator-delete click": "onDeleteClick"
  };

  Viewer.prototype.classes = {
    hide: 'annotator-hide',
    showControls: 'annotator-visible'
  };

  Viewer.prototype.html = {
    element: "<div class=\"annotator-outer annotator-viewer\">\n  <ul class=\"annotator-widget annotator-listing\"></ul>\n</div>",
    item: "<li class=\"annotator-annotation annotator-item\">\n  <span class=\"annotator-controls\">\n    <a href=\"#\" title=\"View as webpage\" class=\"annotator-link\">View as webpage</a>\n    <button type=\"button\" title=\"Edit\" class=\"annotator-edit\">Edit</button>\n    <button type=\"button\" title=\"Delete\" class=\"annotator-delete\">Delete</button>\n  </span>\n</li>"
  };

  Viewer.prototype.options = {
    readOnly: false
  };

  function Viewer(options) {
    this.onDeleteClick = __bind(this.onDeleteClick, this);
    this.onEditClick = __bind(this.onEditClick, this);
    this.load = __bind(this.load, this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    Viewer.__super__.constructor.call(this, $(this.html.element)[0], options);
    this.item = $(this.html.item)[0];
    this.fields = [];
    this.annotations = [];
  }

  Viewer.prototype.show = function(event) {
    var controls;
    Util.preventEventDefault(event);
    controls = this.element.find('.annotator-controls').addClass(this.classes.showControls);
    setTimeout(((function(_this) {
      return function() {
        return controls.removeClass(_this.classes.showControls);
      };
    })(this)), 500);
    this.element.removeClass(this.classes.hide);
    return this.checkOrientation().publish('show');
  };

  Viewer.prototype.isShown = function() {
    return !this.element.hasClass(this.classes.hide);
  };

  Viewer.prototype.hide = function(event) {
    Util.preventEventDefault(event);
    this.element.addClass(this.classes.hide);
    return this.publish('hide');
  };

  Viewer.prototype.load = function(annotations) {
    var annotation, controller, controls, del, edit, element, field, item, link, links, list, _i, _j, _len, _len1, _ref, _ref1;
    this.annotations = annotations || [];
    list = this.element.find('ul:first').empty();
    _ref = this.annotations;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      annotation = _ref[_i];
      item = $(this.item).clone().appendTo(list).data('annotation', annotation);
      controls = item.find('.annotator-controls');
      link = controls.find('.annotator-link');
      edit = controls.find('.annotator-edit');
      del = controls.find('.annotator-delete');
      links = new LinkParser(annotation.links || []).get('alternate', {
        'type': 'text/html'
      });
      if (links.length === 0 || (links[0].href == null)) {
        link.remove();
      } else {
        link.attr('href', links[0].href);
      }
      if (this.options.readOnly) {
        edit.remove();
        del.remove();
      } else {
        controller = {
          showEdit: function() {
            return edit.removeAttr('disabled');
          },
          hideEdit: function() {
            return edit.attr('disabled', 'disabled');
          },
          showDelete: function() {
            return del.removeAttr('disabled');
          },
          hideDelete: function() {
            return del.attr('disabled', 'disabled');
          }
        };
      }
      _ref1 = this.fields;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        field = _ref1[_j];
        element = $(field.element).clone().appendTo(item)[0];
        field.load(element, annotation, controller);
      }
    }
    this.publish('load', [this.annotations]);
    return this.show();
  };

  Viewer.prototype.addField = function(options) {
    var field;
    field = $.extend({
      load: function() {}
    }, options);
    field.element = $('<div />')[0];
    this.fields.push(field);
    field.element;
    return this;
  };

  Viewer.prototype.onEditClick = function(event) {
    return this.onButtonClick(event, 'edit');
  };

  Viewer.prototype.onDeleteClick = function(event) {
    return this.onButtonClick(event, 'delete');
  };

  Viewer.prototype.onButtonClick = function(event, type) {
    var item;
    item = $(event.target).parents('.annotator-annotation');
    return this.publish(type, [item.data('annotation')]);
  };

  return Viewer;

})(Widget);

LinkParser = (function() {
  function LinkParser(data) {
    this.data = data;
  }

  LinkParser.prototype.get = function(rel, cond) {
    var d, k, keys, match, v, _i, _len, _ref, _results;
    if (cond == null) {
      cond = {};
    }
    cond = $.extend({}, cond, {
      rel: rel
    });
    keys = (function() {
      var _results;
      _results = [];
      for (k in cond) {
        if (!__hasProp.call(cond, k)) continue;
        v = cond[k];
        _results.push(k);
      }
      return _results;
    })();
    _ref = this.data;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      d = _ref[_i];
      match = keys.reduce((function(m, k) {
        return m && (d[k] === cond[k]);
      }), true);
      if (match) {
        _results.push(d);
      } else {
        continue;
      }
    }
    return _results;
  };

  return LinkParser;

})();

module.exports = Viewer;


},{"./util":27,"./widget":29}],29:[function(_dereq_,module,exports){
var Delegator, Util, Widget,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Delegator = _dereq_('./class');

Util = _dereq_('./util');

Widget = (function(_super) {
  __extends(Widget, _super);

  Widget.prototype.classes = {
    hide: 'annotator-hide',
    invert: {
      x: 'annotator-invert-x',
      y: 'annotator-invert-y'
    }
  };

  function Widget(element, options) {
    Widget.__super__.constructor.apply(this, arguments);
    this.classes = $.extend({}, Widget.prototype.classes, this.classes);
  }

  Widget.prototype.destroy = function() {
    this.removeEvents();
    return this.element.remove();
  };

  Widget.prototype.checkOrientation = function() {
    var current, offset, viewport, widget, window;
    this.resetOrientation();
    window = $(Util.getGlobal());
    widget = this.element.children(":first");
    offset = widget.offset();
    viewport = {
      top: window.scrollTop(),
      right: window.width() + window.scrollLeft()
    };
    current = {
      top: offset.top,
      right: offset.left + widget.width()
    };
    if ((current.top - viewport.top) < 0) {
      this.invertY();
    }
    if ((current.right - viewport.right) > 0) {
      this.invertX();
    }
    return this;
  };

  Widget.prototype.resetOrientation = function() {
    this.element.removeClass(this.classes.invert.x).removeClass(this.classes.invert.y);
    return this;
  };

  Widget.prototype.invertX = function() {
    this.element.addClass(this.classes.invert.x);
    return this;
  };

  Widget.prototype.invertY = function() {
    this.element.addClass(this.classes.invert.y);
    return this;
  };

  Widget.prototype.isInvertedY = function() {
    return this.element.hasClass(this.classes.invert.y);
  };

  Widget.prototype.isInvertedX = function() {
    return this.element.hasClass(this.classes.invert.x);
  };

  return Widget;

})(Delegator);

module.exports = Widget;


},{"./class":7,"./util":27}],30:[function(_dereq_,module,exports){
var findChild, getNodeName, getNodePosition, simpleXPathJQuery, simpleXPathPure;

simpleXPathJQuery = function(relativeRoot) {
  var jq;
  jq = this.map(function() {
    var elem, idx, path, tagName;
    path = '';
    elem = this;
    while ((elem != null ? elem.nodeType : void 0) === Node.ELEMENT_NODE && elem !== relativeRoot) {
      tagName = elem.tagName.replace(":", "\\:");
      idx = $(elem.parentNode).children(tagName).index(elem) + 1;
      idx = "[" + idx + "]";
      path = "/" + elem.tagName.toLowerCase() + idx + path;
      elem = elem.parentNode;
    }
    return path;
  });
  return jq.get();
};

simpleXPathPure = function(relativeRoot) {
  var getPathSegment, getPathTo, jq, rootNode;
  getPathSegment = function(node) {
    var name, pos;
    name = getNodeName(node);
    pos = getNodePosition(node);
    return "" + name + "[" + pos + "]";
  };
  rootNode = relativeRoot;
  getPathTo = function(node) {
    var xpath;
    xpath = '';
    while (node !== rootNode) {
      if (node == null) {
        throw new Error("Called getPathTo on a node which was not a descendant of @rootNode. " + rootNode);
      }
      xpath = (getPathSegment(node)) + '/' + xpath;
      node = node.parentNode;
    }
    xpath = '/' + xpath;
    xpath = xpath.replace(/\/$/, '');
    return xpath;
  };
  jq = this.map(function() {
    var path;
    path = getPathTo(this);
    return path;
  });
  return jq.get();
};

findChild = function(node, type, index) {
  var child, children, found, name, _i, _len;
  if (!node.hasChildNodes()) {
    throw new Error("XPath error: node has no children!");
  }
  children = node.childNodes;
  found = 0;
  for (_i = 0, _len = children.length; _i < _len; _i++) {
    child = children[_i];
    name = getNodeName(child);
    if (name === type) {
      found += 1;
      if (found === index) {
        return child;
      }
    }
  }
  throw new Error("XPath error: wanted child not found.");
};

getNodeName = function(node) {
  var nodeName;
  nodeName = node.nodeName.toLowerCase();
  switch (nodeName) {
    case "#text":
      return "text()";
    case "#comment":
      return "comment()";
    case "#cdata-section":
      return "cdata-section()";
    default:
      return nodeName;
  }
};

getNodePosition = function(node) {
  var pos, tmp;
  pos = 0;
  tmp = node;
  while (tmp) {
    if (tmp.nodeName === node.nodeName) {
      pos++;
    }
    tmp = tmp.previousSibling;
  }
  return pos;
};

module.exports = {
  simpleXPathJQuery: simpleXPathJQuery,
  simpleXPathPure: simpleXPathPure,
  findChild: findChild
};


},{}]},{},["haW+cw"])

("haW+cw")
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnL2Fubm90YXRvci1kaWdpbGliLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2JhY2tib25lLWV4dGVuZC1zdGFuZGFsb25lL2JhY2tib25lLWV4dGVuZC1zdGFuZGFsb25lLmpzIiwiYW5ub3RhdGlvbnMuY29mZmVlIiwiYW5ub3RhdG9yLmNvZmZlZSIsImNsYXNzLmNvZmZlZSIsImVkaXRvci5jb2ZmZWUiLCJub3RpZmljYXRpb24uY29mZmVlIiwicGx1Z2luL2F1dGhsb2dpbi5jb2ZmZWUiLCJwbHVnaW4vZmlsdGVyLmNvZmZlZSIsInBsdWdpbi9tYXJrZG93bi5jb2ZmZWUiLCJwbHVnaW4vcGVybWlzc2lvbnMuY29mZmVlIiwicGx1Z2luL3N0b3JlLmNvZmZlZSIsInBsdWdpbi90YWdzLmNvZmZlZSIsInBsdWdpbi91bnN1cHBvcnRlZC5jb2ZmZWUiLCJyYW5nZS5jb2ZmZWUiLCJyZWdpc3RyeS5jb2ZmZWUiLCJzdG9yYWdlLmNvZmZlZSIsInV0aWwuY29mZmVlIiwidmlld2VyLmNvZmZlZSIsIndpZGdldC5jb2ZmZWUiLCJ4cGF0aC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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XSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIFN0YW5kYWxvbmUgZXh0cmFjdGlvbiBvZiBCYWNrYm9uZS5FdmVudHMsIG5vIGV4dGVybmFsIGRlcGVuZGVuY3kgcmVxdWlyZWQuXG4gKiBEZWdyYWRlcyBuaWNlbHkgd2hlbiBCYWNrb25lL3VuZGVyc2NvcmUgYXJlIGFscmVhZHkgYXZhaWxhYmxlIGluIHRoZSBjdXJyZW50XG4gKiBnbG9iYWwgY29udGV4dC5cbiAqXG4gKiBOb3RlIHRoYXQgZG9jcyBzdWdnZXN0IHRvIHVzZSB1bmRlcnNjb3JlJ3MgYF8uZXh0ZW5kKClgIG1ldGhvZCB0byBhZGQgRXZlbnRzXG4gKiBzdXBwb3J0IHRvIHNvbWUgZ2l2ZW4gb2JqZWN0LiBBIGBtaXhpbigpYCBtZXRob2QgaGFzIGJlZW4gYWRkZWQgdG8gdGhlIEV2ZW50c1xuICogcHJvdG90eXBlIHRvIGF2b2lkIHVzaW5nIHVuZGVyc2NvcmUgZm9yIHRoYXQgc29sZSBwdXJwb3NlOlxuICpcbiAqICAgICB2YXIgbXlFdmVudEVtaXR0ZXIgPSBCYWNrYm9uZUV2ZW50cy5taXhpbih7fSk7XG4gKlxuICogT3IgZm9yIGEgZnVuY3Rpb24gY29uc3RydWN0b3I6XG4gKlxuICogICAgIGZ1bmN0aW9uIE15Q29uc3RydWN0b3IoKXt9XG4gKiAgICAgTXlDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZm9vID0gZnVuY3Rpb24oKXt9XG4gKiAgICAgQmFja2JvbmVFdmVudHMubWl4aW4oTXlDb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuICpcbiAqIChjKSAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIEluYy5cbiAqIChjKSAyMDEzIE5pY29sYXMgUGVycmlhdWx0XG4gKi9cbi8qIGdsb2JhbCBleHBvcnRzOnRydWUsIGRlZmluZSwgbW9kdWxlICovXG4oZnVuY3Rpb24oKSB7XG4gIHZhciByb290ID0gdGhpcyxcbiAgICAgIGJyZWFrZXIgPSB7fSxcbiAgICAgIG5hdGl2ZUZvckVhY2ggPSBBcnJheS5wcm90b3R5cGUuZm9yRWFjaCxcbiAgICAgIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcbiAgICAgIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLFxuICAgICAgaWRDb3VudGVyID0gMDtcblxuICAvLyBSZXR1cm5zIGEgcGFydGlhbCBpbXBsZW1lbnRhdGlvbiBtYXRjaGluZyB0aGUgbWluaW1hbCBBUEkgc3Vic2V0IHJlcXVpcmVkXG4gIC8vIGJ5IEJhY2tib25lLkV2ZW50c1xuICBmdW5jdGlvbiBtaW5pc2NvcmUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtleXM6IE9iamVjdC5rZXlzLFxuXG4gICAgICB1bmlxdWVJZDogZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgICAgIHZhciBpZCA9ICsraWRDb3VudGVyICsgJyc7XG4gICAgICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICAgICAgfSxcblxuICAgICAgaGFzOiBmdW5jdGlvbihvYmosIGtleSkge1xuICAgICAgICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG4gICAgICB9LFxuXG4gICAgICBlYWNoOiBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICBpZiAobmF0aXZlRm9yRWFjaCAmJiBvYmouZm9yRWFjaCA9PT0gbmF0aXZlRm9yRWFjaCkge1xuICAgICAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gb2JqLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmhhcyhvYmosIGtleSkpIHtcbiAgICAgICAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2tleV0sIGtleSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgb25jZTogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICB2YXIgcmFuID0gZmFsc2UsIG1lbW87XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAocmFuKSByZXR1cm4gbWVtbztcbiAgICAgICAgICByYW4gPSB0cnVlO1xuICAgICAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgZnVuYyA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHZhciBfID0gbWluaXNjb3JlKCksIEV2ZW50cztcblxuICAvLyBCYWNrYm9uZS5FdmVudHNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gQSBtb2R1bGUgdGhhdCBjYW4gYmUgbWl4ZWQgaW4gdG8gKmFueSBvYmplY3QqIGluIG9yZGVyIHRvIHByb3ZpZGUgaXQgd2l0aFxuICAvLyBjdXN0b20gZXZlbnRzLiBZb3UgbWF5IGJpbmQgd2l0aCBgb25gIG9yIHJlbW92ZSB3aXRoIGBvZmZgIGNhbGxiYWNrXG4gIC8vIGZ1bmN0aW9ucyB0byBhbiBldmVudDsgYHRyaWdnZXJgLWluZyBhbiBldmVudCBmaXJlcyBhbGwgY2FsbGJhY2tzIGluXG4gIC8vIHN1Y2Nlc3Npb24uXG4gIC8vXG4gIC8vICAgICB2YXIgb2JqZWN0ID0ge307XG4gIC8vICAgICBfLmV4dGVuZChvYmplY3QsIEJhY2tib25lLkV2ZW50cyk7XG4gIC8vICAgICBvYmplY3Qub24oJ2V4cGFuZCcsIGZ1bmN0aW9uKCl7IGFsZXJ0KCdleHBhbmRlZCcpOyB9KTtcbiAgLy8gICAgIG9iamVjdC50cmlnZ2VyKCdleHBhbmQnKTtcbiAgLy9cbiAgRXZlbnRzID0ge1xuXG4gICAgLy8gQmluZCBhbiBldmVudCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uIFBhc3NpbmcgYFwiYWxsXCJgIHdpbGwgYmluZFxuICAgIC8vIHRoZSBjYWxsYmFjayB0byBhbGwgZXZlbnRzIGZpcmVkLlxuICAgIG9uOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcbiAgICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCAodGhpcy5fZXZlbnRzW25hbWVdID0gW10pO1xuICAgICAgZXZlbnRzLnB1c2goe2NhbGxiYWNrOiBjYWxsYmFjaywgY29udGV4dDogY29udGV4dCwgY3R4OiBjb250ZXh0IHx8IHRoaXN9KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBCaW5kIGFuIGV2ZW50IHRvIG9ubHkgYmUgdHJpZ2dlcmVkIGEgc2luZ2xlIHRpbWUuIEFmdGVyIHRoZSBmaXJzdCB0aW1lXG4gICAgLy8gdGhlIGNhbGxiYWNrIGlzIGludm9rZWQsIGl0IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICBvbmNlOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uY2UnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIG9uY2UgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYub2ZmKG5hbWUsIG9uY2UpO1xuICAgICAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSk7XG4gICAgICBvbmNlLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgcmV0dXJuIHRoaXMub24obmFtZSwgb25jZSwgY29udGV4dCk7XG4gICAgfSxcblxuICAgIC8vIFJlbW92ZSBvbmUgb3IgbWFueSBjYWxsYmFja3MuIElmIGBjb250ZXh0YCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAgIC8vIGNhbGxiYWNrcyB3aXRoIHRoYXQgZnVuY3Rpb24uIElmIGBjYWxsYmFja2AgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgICAvLyBjYWxsYmFja3MgZm9yIHRoZSBldmVudC4gSWYgYG5hbWVgIGlzIG51bGwsIHJlbW92ZXMgYWxsIGJvdW5kXG4gICAgLy8gY2FsbGJhY2tzIGZvciBhbGwgZXZlbnRzLlxuICAgIG9mZjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICAgIHZhciByZXRhaW4sIGV2LCBldmVudHMsIG5hbWVzLCBpLCBsLCBqLCBrO1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIWV2ZW50c0FwaSh0aGlzLCAnb2ZmJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkpIHJldHVybiB0aGlzO1xuICAgICAgaWYgKCFuYW1lICYmICFjYWxsYmFjayAmJiAhY29udGV4dCkge1xuICAgICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIG5hbWVzID0gbmFtZSA/IFtuYW1lXSA6IF8ua2V5cyh0aGlzLl9ldmVudHMpO1xuICAgICAgZm9yIChpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICAgIGlmIChldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0pIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHNbbmFtZV0gPSByZXRhaW4gPSBbXTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgfHwgY29udGV4dCkge1xuICAgICAgICAgICAgZm9yIChqID0gMCwgayA9IGV2ZW50cy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgICAgZXYgPSBldmVudHNbal07XG4gICAgICAgICAgICAgIGlmICgoY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjay5fY2FsbGJhY2spIHx8XG4gICAgICAgICAgICAgICAgICAoY29udGV4dCAmJiBjb250ZXh0ICE9PSBldi5jb250ZXh0KSkge1xuICAgICAgICAgICAgICAgIHJldGFpbi5wdXNoKGV2KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXJldGFpbi5sZW5ndGgpIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIFRyaWdnZXIgb25lIG9yIG1hbnkgZXZlbnRzLCBmaXJpbmcgYWxsIGJvdW5kIGNhbGxiYWNrcy4gQ2FsbGJhY2tzIGFyZVxuICAgIC8vIHBhc3NlZCB0aGUgc2FtZSBhcmd1bWVudHMgYXMgYHRyaWdnZXJgIGlzLCBhcGFydCBmcm9tIHRoZSBldmVudCBuYW1lXG4gICAgLy8gKHVubGVzcyB5b3UncmUgbGlzdGVuaW5nIG9uIGBcImFsbFwiYCwgd2hpY2ggd2lsbCBjYXVzZSB5b3VyIGNhbGxiYWNrIHRvXG4gICAgLy8gcmVjZWl2ZSB0aGUgdHJ1ZSBuYW1lIG9mIHRoZSBldmVudCBhcyB0aGUgZmlyc3QgYXJndW1lbnQpLlxuICAgIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gdGhpcztcbiAgICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgaWYgKCFldmVudHNBcGkodGhpcywgJ3RyaWdnZXInLCBuYW1lLCBhcmdzKSkgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgICAgdmFyIGFsbEV2ZW50cyA9IHRoaXMuX2V2ZW50cy5hbGw7XG4gICAgICBpZiAoZXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGV2ZW50cywgYXJncyk7XG4gICAgICBpZiAoYWxsRXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGFsbEV2ZW50cywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBUZWxsIHRoaXMgb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGVpdGhlciBzcGVjaWZpYyBldmVudHMgLi4uIG9yXG4gICAgLy8gdG8gZXZlcnkgb2JqZWN0IGl0J3MgY3VycmVudGx5IGxpc3RlbmluZyB0by5cbiAgICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzO1xuICAgICAgaWYgKCFsaXN0ZW5lcnMpIHJldHVybiB0aGlzO1xuICAgICAgdmFyIGRlbGV0ZUxpc3RlbmVyID0gIW5hbWUgJiYgIWNhbGxiYWNrO1xuICAgICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xuICAgICAgaWYgKG9iaikgKGxpc3RlbmVycyA9IHt9KVtvYmouX2xpc3RlbmVySWRdID0gb2JqO1xuICAgICAgZm9yICh2YXIgaWQgaW4gbGlzdGVuZXJzKSB7XG4gICAgICAgIGxpc3RlbmVyc1tpZF0ub2ZmKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICAgICAgaWYgKGRlbGV0ZUxpc3RlbmVyKSBkZWxldGUgdGhpcy5fbGlzdGVuZXJzW2lkXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICB9O1xuXG4gIC8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHNwbGl0IGV2ZW50IHN0cmluZ3MuXG4gIHZhciBldmVudFNwbGl0dGVyID0gL1xccysvO1xuXG4gIC8vIEltcGxlbWVudCBmYW5jeSBmZWF0dXJlcyBvZiB0aGUgRXZlbnRzIEFQSSBzdWNoIGFzIG11bHRpcGxlIGV2ZW50XG4gIC8vIG5hbWVzIGBcImNoYW5nZSBibHVyXCJgIGFuZCBqUXVlcnktc3R5bGUgZXZlbnQgbWFwcyBge2NoYW5nZTogYWN0aW9ufWBcbiAgLy8gaW4gdGVybXMgb2YgdGhlIGV4aXN0aW5nIEFQSS5cbiAgdmFyIGV2ZW50c0FwaSA9IGZ1bmN0aW9uKG9iaiwgYWN0aW9uLCBuYW1lLCByZXN0KSB7XG4gICAgaWYgKCFuYW1lKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIEhhbmRsZSBldmVudCBtYXBzLlxuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBuYW1lKSB7XG4gICAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW2tleSwgbmFtZVtrZXldXS5jb25jYXQocmVzdCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBzcGFjZSBzZXBhcmF0ZWQgZXZlbnQgbmFtZXMuXG4gICAgaWYgKGV2ZW50U3BsaXR0ZXIudGVzdChuYW1lKSkge1xuICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChldmVudFNwbGl0dGVyKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW25hbWVzW2ldXS5jb25jYXQocmVzdCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIEEgZGlmZmljdWx0LXRvLWJlbGlldmUsIGJ1dCBvcHRpbWl6ZWQgaW50ZXJuYWwgZGlzcGF0Y2ggZnVuY3Rpb24gZm9yXG4gIC8vIHRyaWdnZXJpbmcgZXZlbnRzLiBUcmllcyB0byBrZWVwIHRoZSB1c3VhbCBjYXNlcyBzcGVlZHkgKG1vc3QgaW50ZXJuYWxcbiAgLy8gQmFja2JvbmUgZXZlbnRzIGhhdmUgMyBhcmd1bWVudHMpLlxuICB2YXIgdHJpZ2dlckV2ZW50cyA9IGZ1bmN0aW9uKGV2ZW50cywgYXJncykge1xuICAgIHZhciBldiwgaSA9IC0xLCBsID0gZXZlbnRzLmxlbmd0aCwgYTEgPSBhcmdzWzBdLCBhMiA9IGFyZ3NbMV0sIGEzID0gYXJnc1syXTtcbiAgICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4KTsgcmV0dXJuO1xuICAgICAgY2FzZSAxOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEpOyByZXR1cm47XG4gICAgICBjYXNlIDI6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIpOyByZXR1cm47XG4gICAgICBjYXNlIDM6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIsIGEzKTsgcmV0dXJuO1xuICAgICAgZGVmYXVsdDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suYXBwbHkoZXYuY3R4LCBhcmdzKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGxpc3Rlbk1ldGhvZHMgPSB7bGlzdGVuVG86ICdvbicsIGxpc3RlblRvT25jZTogJ29uY2UnfTtcblxuICAvLyBJbnZlcnNpb24tb2YtY29udHJvbCB2ZXJzaW9ucyBvZiBgb25gIGFuZCBgb25jZWAuIFRlbGwgKnRoaXMqIG9iamVjdCB0b1xuICAvLyBsaXN0ZW4gdG8gYW4gZXZlbnQgaW4gYW5vdGhlciBvYmplY3QgLi4uIGtlZXBpbmcgdHJhY2sgb2Ygd2hhdCBpdCdzXG4gIC8vIGxpc3RlbmluZyB0by5cbiAgXy5lYWNoKGxpc3Rlbk1ldGhvZHMsIGZ1bmN0aW9uKGltcGxlbWVudGF0aW9uLCBtZXRob2QpIHtcbiAgICBFdmVudHNbbWV0aG9kXSA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnMgfHwgKHRoaXMuX2xpc3RlbmVycyA9IHt9KTtcbiAgICAgIHZhciBpZCA9IG9iai5fbGlzdGVuZXJJZCB8fCAob2JqLl9saXN0ZW5lcklkID0gXy51bmlxdWVJZCgnbCcpKTtcbiAgICAgIGxpc3RlbmVyc1tpZF0gPSBvYmo7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgICBvYmpbaW1wbGVtZW50YXRpb25dKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFsaWFzZXMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuICBFdmVudHMuYmluZCAgID0gRXZlbnRzLm9uO1xuICBFdmVudHMudW5iaW5kID0gRXZlbnRzLm9mZjtcblxuICAvLyBNaXhpbiB1dGlsaXR5XG4gIEV2ZW50cy5taXhpbiA9IGZ1bmN0aW9uKHByb3RvKSB7XG4gICAgdmFyIGV4cG9ydHMgPSBbJ29uJywgJ29uY2UnLCAnb2ZmJywgJ3RyaWdnZXInLCAnc3RvcExpc3RlbmluZycsICdsaXN0ZW5UbycsXG4gICAgICAgICAgICAgICAgICAgJ2xpc3RlblRvT25jZScsICdiaW5kJywgJ3VuYmluZCddO1xuICAgIF8uZWFjaChleHBvcnRzLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICBwcm90b1tuYW1lXSA9IHRoaXNbbmFtZV07XG4gICAgfSwgdGhpcyk7XG4gICAgcmV0dXJuIHByb3RvO1xuICB9O1xuXG4gIC8vIEV4cG9ydCBFdmVudHMgYXMgQmFja2JvbmVFdmVudHMgZGVwZW5kaW5nIG9uIGN1cnJlbnQgY29udGV4dFxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEV2ZW50cztcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50cztcbiAgICB9XG4gICAgZXhwb3J0cy5CYWNrYm9uZUV2ZW50cyA9IEV2ZW50cztcbiAgfSBlbHNlIHtcbiAgICByb290LkJhY2tib25lRXZlbnRzID0gRXZlbnRzO1xuICB9XG59KSh0aGlzKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9iYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZScpO1xuIiwiKGZ1bmN0aW9uIChkZWZpbml0aW9uKSB7XG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpO1xuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShkZWZpbml0aW9uKTtcbiAgfVxuICBlbHNlIHtcbiAgICB3aW5kb3cuQmFja2JvbmVFeHRlbmQgPSBkZWZpbml0aW9uKCk7XG4gIH1cbn0pKGZ1bmN0aW9uICgpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIFxuICAvLyBtaW5pLXVuZGVyc2NvcmVcbiAgdmFyIF8gPSB7XG4gICAgaGFzOiBmdW5jdGlvbiAob2JqLCBrZXkpIHtcbiAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICAgIH0sXG4gIFxuICAgIGV4dGVuZDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICBmb3IgKHZhciBpPTE7IGk8YXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG4gIH07XG5cbiAgLy8vIEZvbGxvd2luZyBjb2RlIGlzIHBhc3RlZCBmcm9tIEJhY2tib25lLmpzIC8vL1xuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb3JyZWN0bHkgc2V0IHVwIHRoZSBwcm90b3R5cGUgY2hhaW4sIGZvciBzdWJjbGFzc2VzLlxuICAvLyBTaW1pbGFyIHRvIGBnb29nLmluaGVyaXRzYCwgYnV0IHVzZXMgYSBoYXNoIG9mIHByb3RvdHlwZSBwcm9wZXJ0aWVzIGFuZFxuICAvLyBjbGFzcyBwcm9wZXJ0aWVzIHRvIGJlIGV4dGVuZGVkLlxuICB2YXIgZXh0ZW5kID0gZnVuY3Rpb24ocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgY2hpbGQ7XG5cbiAgICAvLyBUaGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHRoZSBuZXcgc3ViY2xhc3MgaXMgZWl0aGVyIGRlZmluZWQgYnkgeW91XG4gICAgLy8gKHRoZSBcImNvbnN0cnVjdG9yXCIgcHJvcGVydHkgaW4geW91ciBgZXh0ZW5kYCBkZWZpbml0aW9uKSwgb3IgZGVmYXVsdGVkXG4gICAgLy8gYnkgdXMgdG8gc2ltcGx5IGNhbGwgdGhlIHBhcmVudCdzIGNvbnN0cnVjdG9yLlxuICAgIGlmIChwcm90b1Byb3BzICYmIF8uaGFzKHByb3RvUHJvcHMsICdjb25zdHJ1Y3RvcicpKSB7XG4gICAgICBjaGlsZCA9IHByb3RvUHJvcHMuY29uc3RydWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoaWxkID0gZnVuY3Rpb24oKXsgcmV0dXJuIHBhcmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9O1xuICAgIH1cblxuICAgIC8vIEFkZCBzdGF0aWMgcHJvcGVydGllcyB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24sIGlmIHN1cHBsaWVkLlxuICAgIF8uZXh0ZW5kKGNoaWxkLCBwYXJlbnQsIHN0YXRpY1Byb3BzKTtcblxuICAgIC8vIFNldCB0aGUgcHJvdG90eXBlIGNoYWluIHRvIGluaGVyaXQgZnJvbSBgcGFyZW50YCwgd2l0aG91dCBjYWxsaW5nXG4gICAgLy8gYHBhcmVudGAncyBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICB2YXIgU3Vycm9nYXRlID0gZnVuY3Rpb24oKXsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9O1xuICAgIFN1cnJvZ2F0ZS5wcm90b3R5cGUgPSBwYXJlbnQucHJvdG90eXBlO1xuICAgIGNoaWxkLnByb3RvdHlwZSA9IG5ldyBTdXJyb2dhdGUoKTtcblxuICAgIC8vIEFkZCBwcm90b3R5cGUgcHJvcGVydGllcyAoaW5zdGFuY2UgcHJvcGVydGllcykgdG8gdGhlIHN1YmNsYXNzLFxuICAgIC8vIGlmIHN1cHBsaWVkLlxuICAgIGlmIChwcm90b1Byb3BzKSBfLmV4dGVuZChjaGlsZC5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuXG4gICAgLy8gU2V0IGEgY29udmVuaWVuY2UgcHJvcGVydHkgaW4gY2FzZSB0aGUgcGFyZW50J3MgcHJvdG90eXBlIGlzIG5lZWRlZFxuICAgIC8vIGxhdGVyLlxuICAgIGNoaWxkLl9fc3VwZXJfXyA9IHBhcmVudC5wcm90b3R5cGU7XG5cbiAgICByZXR1cm4gY2hpbGQ7XG4gIH07XG5cbiAgLy8gRXhwb3NlIHRoZSBleHRlbmQgZnVuY3Rpb25cbiAgcmV0dXJuIGV4dGVuZDtcbn0pO1xuIiwiU3RvcmFnZVByb3ZpZGVyID0gcmVxdWlyZSgnLi9zdG9yYWdlJylcblxuXG4jIFB1YmxpYzogUHJvdmlkZXMgQ1JVRCBtZXRob2RzIGZvciBhbm5vdGF0aW9ucyB3aGljaCBjYWxsIGNvcnJlc3BvbmRpbmcgcmVnaXN0cnkgaG9va3MuXG5jbGFzcyBBbm5vdGF0aW9uUHJvdmlkZXJcblxuICBAY29uZmlndXJlOiAocmVnaXN0cnkpIC0+XG4gICAgcmVnaXN0cnlbJ2Fubm90YXRpb25zJ10gPz0gbmV3IHRoaXMocmVnaXN0cnkpXG4gICAgcmVnaXN0cnkuaW5jbHVkZShTdG9yYWdlUHJvdmlkZXIpXG5cbiAgY29uc3RydWN0b3I6IChAcmVnaXN0cnkpIC0+XG5cbiAgIyBDcmVhdGVzIGFuZCByZXR1cm5zIGEgbmV3IGFubm90YXRpb24gb2JqZWN0LlxuICAjXG4gICMgUnVucyB0aGUgJ2JlZm9yZUNyZWF0ZUFubm90YXRpb24nIGhvb2sgdG8gYWxsb3cgdGhlIG5ldyBhbm5vdGF0aW9uIHRvXG4gICMgYmUgaW5pdGlhbGl6ZWQgb3IgcHJldmVudGVkLlxuICAjXG4gICMgUnVucyB0aGUgJ2NyZWF0ZUFubm90YXRpb24nIGhvb2sgd2hlbiB0aGUgbmV3IGFubm90YXRpb24gaXMgaW5pdGlhbGl6ZWQuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAuY3JlYXRlKHt9KVxuICAjXG4gICMgICByZWdpc3RyeS5vbiAnYmVmb3JlQW5ub3RhdGlvbkNyZWF0ZWQnLCAoYW5ub3RhdGlvbikgLT5cbiAgIyAgICAgYW5ub3RhdGlvbi5teVByb3BlcnR5ID0gJ1RoaXMgaXMgYSBjdXN0b20gcHJvcGVydHknXG4gICMgICByZWdpc3RyeS5jcmVhdGUoe30pICMgUmVzb2x2ZXMgdG8ge215UHJvcGVydHk6IFwiVGhpcyBpcyBh4oCmXCJ9XG4gICNcbiAgIyBSZXR1cm5zIGEgUHJvbWlzZSBvZiBhbiBhbm5vdGF0aW9uIE9iamVjdC5cbiAgY3JlYXRlOiAob2JqPXt9KSAtPlxuICAgIHRoaXMuX2N5Y2xlKG9iaiwgJ2NyZWF0ZScpXG5cbiAgIyBVcGRhdGVzIGFuIGFubm90YXRpb24uXG4gICNcbiAgIyBQdWJsaXNoZXMgdGhlICdiZWZvcmVBbm5vdGF0aW9uVXBkYXRlZCcgYW5kICdhbm5vdGF0aW9uVXBkYXRlZCcgZXZlbnRzLlxuICAjIExpc3RlbmVycyB3aXNoaW5nIHRvIG1vZGlmeSBhbiB1cGRhdGVkIGFubm90YXRpb24gc2hvdWxkIHN1YnNjcmliZSB0b1xuICAjICdiZWZvcmVBbm5vdGF0aW9uVXBkYXRlZCcgd2hpbGUgbGlzdGVuZXJzIHN0b3JpbmcgYW5ub3RhdGlvbnMgc2hvdWxkXG4gICMgc3Vic2NyaWJlIHRvICdhbm5vdGF0aW9uVXBkYXRlZCcuXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBPYmplY3QgdG8gdXBkYXRlLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgYW5ub3RhdGlvbiA9IHt0YWdzOiAnYXBwbGVzIG9yYW5nZXMgcGVhcnMnfVxuICAjICAgcmVnaXN0cnkub24gJ2JlZm9yZUFubm90YXRpb25VcGRhdGVkJywgKGFubm90YXRpb24pIC0+XG4gICMgICAgICMgdmFsaWRhdGUgb3IgbW9kaWZ5IGEgcHJvcGVydHkuXG4gICMgICAgIGFubm90YXRpb24udGFncyA9IGFubm90YXRpb24udGFncy5zcGxpdCgnICcpXG4gICMgICByZWdpc3RyeS51cGRhdGUoYW5ub3RhdGlvbilcbiAgIyAgICMgPT4gUmV0dXJucyBbXCJhcHBsZXNcIiwgXCJvcmFuZ2VzXCIsIFwicGVhcnNcIl1cbiAgI1xuICAjIFJldHVybnMgYSBQcm9taXNlIG9mIGFuIGFubm90YXRpb24gT2JqZWN0LlxuICB1cGRhdGU6IChvYmopIC0+XG4gICAgaWYgbm90IG9iai5pZD9cbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhbm5vdGF0aW9uIG11c3QgaGF2ZSBhbiBpZCBmb3IgdXBkYXRlKClcIilcbiAgICB0aGlzLl9jeWNsZShvYmosICd1cGRhdGUnKVxuXG4gICMgUHVibGljOiBEZWxldGVzIHRoZSBhbm5vdGF0aW9uLlxuICAjXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gT2JqZWN0IHRvIGRlbGV0ZS5cbiAgI1xuICAjIFJldHVybnMgYSBQcm9taXNlIG9mIGFuIGFubm90YXRpb24gT2JqZWN0LlxuICBkZWxldGU6IChvYmopIC0+XG4gICAgaWYgbm90IG9iai5pZD9cbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhbm5vdGF0aW9uIG11c3QgaGF2ZSBhbiBpZCBmb3IgZGVsZXRlKClcIilcbiAgICB0aGlzLl9jeWNsZShvYmosICdkZWxldGUnKVxuXG4gICMgUHVibGljOiBRdWVyaWVzIHRoZSBzdG9yZVxuICAjXG4gICMgcXVlcnkgLSBBbiBPYmplY3QgZGVmaW5pbmcgYSBxdWVyeS4gVGhpcyBtYXkgYmUgaW50ZXJwcmV0ZWQgZGlmZmVyZW50bHkgYnlcbiAgIyAgICAgICAgIGRpZmZlcmVudCBzdG9yZXMuXG4gICNcbiAgIyBSZXR1cm5zIGEgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHN0b3JlIHJldHVybiB2YWx1ZS5cbiAgcXVlcnk6IChxdWVyeSkgLT5cbiAgICByZXR1cm4gQHJlZ2lzdHJ5WydzdG9yZSddLnF1ZXJ5KHF1ZXJ5KVxuXG4gICMgUHVibGljOiBRdWVyaWVzIHRoZSBzdG9yZVxuICAjXG4gICMgcXVlcnkgLSBBbiBPYmplY3QgZGVmaW5pbmcgYSBxdWVyeS4gVGhpcyBtYXkgYmUgaW50ZXJwcmV0ZWQgZGlmZmVyZW50bHkgYnlcbiAgIyAgICAgICAgIGRpZmZlcmVudCBzdG9yZXMuXG4gICNcbiAgIyBSZXR1cm5zIGEgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGFubm90YXRpb25zLlxuICBsb2FkOiAocXVlcnkpIC0+XG4gICAgcmV0dXJuIHRoaXMucXVlcnkocXVlcnkpXG5cbiAgIyBQcml2YXRlOiBjeWNsZSBhIHN0b3JlIGV2ZW50LCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBhbm5vdGF0aW9uIG9iamVjdCBhbmRcbiAgIyB1cGRhdGluZyBpdCBhcyBuZWNlc3NhcnkuXG4gIF9jeWNsZTogKG9iaiwgc3RvcmVGdW5jKSAtPlxuICAgIHNhZmVDb3B5ID0gJC5leHRlbmQodHJ1ZSwge30sIG9iailcbiAgICBkZWxldGUgc2FmZUNvcHkuX2xvY2FsXG5cbiAgICBAcmVnaXN0cnlbJ3N0b3JlJ11bc3RvcmVGdW5jXShzYWZlQ29weSlcbiAgICAgIC50aGVuIChyZXQpID0+XG4gICAgICAgICMgRW1wdHkgb2JqZWN0IHdpdGhvdXQgY2hhbmdpbmcgaWRlbnRpdHlcbiAgICAgICAgZm9yIG93biBrLCB2IG9mIG9ialxuICAgICAgICAgIGlmIGsgIT0gJ19sb2NhbCdcbiAgICAgICAgICAgIGRlbGV0ZSBvYmpba11cblxuICAgICAgICAjIFVwZGF0ZSB3aXRoIHN0b3JlIHJldHVybiB2YWx1ZVxuICAgICAgICAkLmV4dGVuZChvYmosIHJldClcblxuICAgICAgICByZXR1cm4gb2JqIFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFubm90YXRpb25Qcm92aWRlclxuIiwiZXh0ZW5kID0gcmVxdWlyZSAnYmFja2JvbmUtZXh0ZW5kLXN0YW5kYWxvbmUnXG5cbkRlbGVnYXRvciA9IHJlcXVpcmUgJy4vY2xhc3MnXG5SYW5nZSA9IHJlcXVpcmUgJy4vcmFuZ2UnXG5VdGlsID0gcmVxdWlyZSAnLi91dGlsJ1xuV2lkZ2V0ID0gcmVxdWlyZSAnLi93aWRnZXQnXG5WaWV3ZXIgPSByZXF1aXJlICcuL3ZpZXdlcidcbkVkaXRvciA9IHJlcXVpcmUgJy4vZWRpdG9yJ1xuTm90aWZpY2F0aW9uID0gcmVxdWlyZSAnLi9ub3RpZmljYXRpb24nXG5SZWdpc3RyeSA9IHJlcXVpcmUgJy4vcmVnaXN0cnknXG5cbkFubm90YXRpb25Qcm92aWRlciA9IHJlcXVpcmUgJy4vYW5ub3RhdGlvbnMnXG5cbl90ID0gVXRpbC5UcmFuc2xhdGlvblN0cmluZ1xuXG5cblxuIyBTZWxlY3Rpb24gYW5kIHJhbmdlIGNyZWF0aW9uIHJlZmVyZW5jZSBmb3IgdGhlIGZvbGxvd2luZyBjb2RlOlxuIyBodHRwOi8vd3d3LnF1aXJrc21vZGUub3JnL2RvbS9yYW5nZV9pbnRyby5odG1sXG4jXG4jIEkndmUgcmVtb3ZlZCBhbnkgc3VwcG9ydCBmb3IgSUUgVGV4dFJhbmdlIChzZWUgY29tbWl0IGQ3MDg1YmYyIGZvciBjb2RlKVxuIyBmb3IgdGhlIG1vbWVudCwgaGF2aW5nIG5vIG1lYW5zIG9mIHRlc3RpbmcgaXQuXG5cbiMgU3RvcmUgYSByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgQW5ub3RhdG9yIG9iamVjdC5cbl9Bbm5vdGF0b3IgPSB0aGlzLkFubm90YXRvclxuXG5oYW5kbGVFcnJvciA9IC0+XG4gIGNvbnNvbGUuZXJyb3IuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKVxuXG5jbGFzcyBBbm5vdGF0b3IgZXh0ZW5kcyBEZWxlZ2F0b3JcbiAgIyBFdmVudHMgdG8gYmUgYm91bmQgb24gQW5ub3RhdG9yI2VsZW1lbnQuXG4gIGV2ZW50czpcbiAgICBcIi5hbm5vdGF0b3ItYWRkZXIgYnV0dG9uIGNsaWNrXCI6ICAgICBcIm9uQWRkZXJDbGlja1wiXG4gICAgXCIuYW5ub3RhdG9yLWFkZGVyIGJ1dHRvbiBtb3VzZWRvd25cIjogXCJvbkFkZGVyTW91c2Vkb3duXCJcbiAgICBcIi5hbm5vdGF0b3ItaGwgbW91c2VvdmVyXCI6ICAgICAgICAgICBcIm9uSGlnaGxpZ2h0TW91c2VvdmVyXCJcbiAgICBcIi5hbm5vdGF0b3ItaGwgbW91c2VvdXRcIjogICAgICAgICAgICBcInN0YXJ0Vmlld2VySGlkZVRpbWVyXCJcblxuICBodG1sOlxuICAgIGFkZGVyOiAgICc8ZGl2IGNsYXNzPVwiYW5ub3RhdG9yLWFkZGVyXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCI+JyArIF90KCdBbm5vdGF0ZScpICsgJzwvYnV0dG9uPjwvZGl2PidcbiAgICB3cmFwcGVyOiAnPGRpdiBjbGFzcz1cImFubm90YXRvci13cmFwcGVyXCI+PC9kaXY+J1xuXG4gIG9wdGlvbnM6ICMgQ29uZmlndXJhdGlvbiBvcHRpb25zXG5cbiAgICBzdG9yZTogbnVsbCAjIFN0b3JlIHBsdWdpbiB0byB1c2UuIElmIG51bGwsIEFubm90YXRvciB3aWxsIHVzZSBhIGRlZmF1bHQgc3RvcmUuXG5cbiAgICByZWFkT25seTogZmFsc2UgIyBTdGFydCBBbm5vdGF0b3IgaW4gcmVhZC1vbmx5IG1vZGUuIE5vIGNvbnRyb2xzIHdpbGwgYmUgc2hvd24uXG5cbiAgICBsb2FkUXVlcnk6IHt9ICMgSW5pdGlhbCBxdWVyeSB0byBsb2FkIEFubm90YXRpb25zXG5cbiAgcGx1Z2luczoge31cblxuICBlZGl0b3I6IG51bGxcblxuICB2aWV3ZXI6IG51bGxcblxuICBzZWxlY3RlZFJhbmdlczogbnVsbFxuXG4gIG1vdXNlSXNEb3duOiBmYWxzZVxuXG4gIGlnbm9yZU1vdXNldXA6IGZhbHNlXG5cbiAgdmlld2VySGlkZVRpbWVyOiBudWxsXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgdGhlIEFubm90YXRvci4gUmVxdWlyZXMgYSBET00gRWxlbWVudCBpblxuICAjIHdoaWNoIHRvIHdhdGNoIGZvciBhbm5vdGF0aW9ucyBhcyB3ZWxsIGFzIGFueSBvcHRpb25zLlxuICAjXG4gICMgTk9URTogSWYgdGhlIEFubm90YXRvciBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBjdXJyZW50IGJyb3dzZXIgaXQgd2lsbCBub3RcbiAgIyBwZXJmb3JtIGFueSBzZXR1cCBhbmQgc2ltcGx5IHJldHVybiBhIGJhc2ljIG9iamVjdC4gVGhpcyBhbGxvd3MgcGx1Z2luc1xuICAjIHRvIHN0aWxsIGJlIGxvYWRlZCBidXQgd2lsbCBub3QgZnVuY3Rpb24gYXMgZXhwZWN0ZWQuIEl0IGlzIHJlY2NvbWVuZGVkXG4gICMgdG8gY2FsbCBBbm5vdGF0b3Iuc3VwcG9ydGVkKCkgYmVmb3JlIGNyZWF0aW5nIHRoZSBpbnN0YW5jZSBvciB1c2luZyB0aGVcbiAgIyBVbnN1cHBvcnRlZCBwbHVnaW4gd2hpY2ggd2lsbCBub3RpZnkgdXNlcnMgdGhhdCB0aGUgQW5ub3RhdG9yIHdpbGwgbm90IHdvcmsuXG4gICNcbiAgIyBlbGVtZW50IC0gQSBET00gRWxlbWVudCBpbiB3aGljaCB0byBhbm5vdGF0ZS5cbiAgIyBvcHRpb25zIC0gQW4gb3B0aW9ucyBPYmplY3QuIE5PVEU6IFRoZXJlIGFyZSBjdXJyZW50bHkgbm8gdXNlciBvcHRpb25zLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgYW5ub3RhdG9yID0gbmV3IEFubm90YXRvcihkb2N1bWVudC5ib2R5KVxuICAjXG4gICMgICAjIEV4YW1wbGUgb2YgY2hlY2tpbmcgZm9yIHN1cHBvcnQuXG4gICMgICBpZiBBbm5vdGF0b3Iuc3VwcG9ydGVkKClcbiAgIyAgICAgYW5ub3RhdG9yID0gbmV3IEFubm90YXRvcihkb2N1bWVudC5ib2R5KVxuICAjICAgZWxzZVxuICAjICAgICAjIEZhbGxiYWNrIGZvciB1bnN1cHBvcnRlZCBicm93c2Vycy5cbiAgI1xuICAjIFJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIEFubm90YXRvci5cbiAgY29uc3RydWN0b3I6IChlbGVtZW50LCBvcHRpb25zKSAtPlxuICAgIHN1cGVyXG4gICAgQHBsdWdpbnMgPSB7fVxuXG4gICAgQW5ub3RhdG9yLl9pbnN0YW5jZXMucHVzaCh0aGlzKVxuXG4gICAgIyBSZXR1cm4gZWFybHkgaWYgdGhlIGFubm90YXRvciBpcyBub3Qgc3VwcG9ydGVkLlxuICAgIHJldHVybiB0aGlzIHVubGVzcyBBbm5vdGF0b3Iuc3VwcG9ydGVkKClcblxuICAgICMgQ3JlYXRlIHRoZSByZWdpc3RyeSBhbmQgc3RhcnQgdGhlIGFwcGxpY2F0aW9uXG4gICAgUmVnaXN0cnkuY3JlYXRlQXBwKHRoaXMsIG9wdGlvbnMpXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYSBzdWJjbGFzcyBvZiBBbm5vdGF0b3IuXG4gICNcbiAgIyBTZWUgdGhlIGRvY3VtZW50YXRpb24gZnJvbSBCYWNrYm9uZTogaHR0cDovL2JhY2tib25lanMub3JnLyNNb2RlbC1leHRlbmRcbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHZhciBFeHRlbmRlZEFubm90YXRvciA9IEFubm90YXRvci5leHRlbmQoe1xuICAjICAgICBzZXR1cEFubm90YXRpb246IGZ1bmN0aW9uIChhbm5vdGF0aW9uKSB7XG4gICMgICAgICAgLy8gSW52b2tlIHRoZSBidWlsdC1pbiBpbXBsZW1lbnRhdGlvblxuICAjICAgICAgIHRyeSB7XG4gICMgICAgICAgICBBbm5vdGF0b3IucHJvdG90eXBlLnNldHVwQW5ub3RhdGlvbi5jYWxsKHRoaXMsIGFubm90YXRpb24pO1xuICAjICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgIyAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgQW5ub3RhdG9yLlJhbmdlLlJhbmdlRXJyb3IpIHtcbiAgIyAgICAgICAgICAgLy8gVHJ5IHRvIGxvY2F0ZSB0aGUgQW5ub3RhdGlvbiB1c2luZyB0aGUgcXVvdGVcbiAgIyAgICAgICAgIH0gZWxzZSB7XG4gICMgICAgICAgICAgIHRocm93IGU7XG4gICMgICAgICAgICB9XG4gICMgICAgICAgfVxuICAjXG4gICMgICAgICAgcmV0dXJuIGFubm90YXRpb247XG4gICMgICB9KTtcbiAgI1xuICAjICAgdmFyIGFubm90YXRvciA9IG5ldyBFeHRlbmRlZEFubm90YXRvcihkb2N1bWVudC5ib2R5LCAvKiB7b3B0aW9uc30gKi8pO1xuICBAZXh0ZW5kOiBleHRlbmRcblxuICAjIFdyYXBzIHRoZSBjaGlsZHJlbiBvZiBAZWxlbWVudCBpbiBhIEB3cmFwcGVyIGRpdi4gTk9URTogVGhpcyBtZXRob2Qgd2lsbCBhbHNvXG4gICMgcmVtb3ZlIGFueSBzY3JpcHQgZWxlbWVudHMgaW5zaWRlIEBlbGVtZW50IHRvIHByZXZlbnQgdGhlbSByZS1leGVjdXRpbmcuXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZiB0byBhbGxvdyBjaGFpbmluZy5cbiAgX3NldHVwV3JhcHBlcjogLT5cbiAgICBAd3JhcHBlciA9ICQoQGh0bWwud3JhcHBlcilcblxuICAgICMgV2UgbmVlZCB0byByZW1vdmUgYWxsIHNjcmlwdHMgd2l0aGluIHRoZSBlbGVtZW50IGJlZm9yZSB3cmFwcGluZyB0aGVcbiAgICAjIGNvbnRlbnRzIHdpdGhpbiBhIGRpdi4gT3RoZXJ3aXNlIHdoZW4gc2NyaXB0cyBhcmUgcmVhcHBlbmRlZCB0byB0aGUgRE9NXG4gICAgIyB0aGV5IHdpbGwgcmUtZXhlY3V0ZS4gVGhpcyBpcyBhbiBpc3N1ZSBmb3Igc2NyaXB0cyB0aGF0IGNhbGxcbiAgICAjIGRvY3VtZW50LndyaXRlKCkgLSBzdWNoIGFzIGFkcyAtIGFzIHRoZXkgd2lsbCBjbGVhciB0aGUgcGFnZS5cbiAgICBAZWxlbWVudC5maW5kKCdzY3JpcHQnKS5yZW1vdmUoKVxuICAgIEBlbGVtZW50LndyYXBJbm5lcihAd3JhcHBlcilcbiAgICBAd3JhcHBlciA9IEBlbGVtZW50LmZpbmQoJy5hbm5vdGF0b3Itd3JhcHBlcicpXG5cbiAgICB0aGlzXG5cbiAgIyBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIEFubm90YXRvci5WaWV3ZXIgYW5kIGFzc2lnbnMgaXQgdG8gdGhlIEB2aWV3ZXJcbiAgIyBwcm9wZXJ0eSwgYXBwZW5kcyBpdCB0byB0aGUgQHdyYXBwZXIgYW5kIHNldHMgdXAgZXZlbnQgbGlzdGVuZXJzLlxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgdG8gYWxsb3cgY2hhaW5pbmcuXG4gIF9zZXR1cFZpZXdlcjogLT5cbiAgICBAdmlld2VyID0gbmV3IEFubm90YXRvci5WaWV3ZXIocmVhZE9ubHk6IEBvcHRpb25zLnJlYWRPbmx5KVxuICAgIEB2aWV3ZXIuaGlkZSgpXG4gICAgICAub24oXCJlZGl0XCIsIHRoaXMub25FZGl0QW5ub3RhdGlvbilcbiAgICAgIC5vbihcImRlbGV0ZVwiLCAoYW5ub3RhdGlvbikgPT5cbiAgICAgICAgQHZpZXdlci5oaWRlKClcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdiZWZvcmVBbm5vdGF0aW9uRGVsZXRlZCcsIFthbm5vdGF0aW9uXSlcbiAgICAgICAgIyBEZWxldGUgaGlnaGxpZ2h0IGVsZW1lbnRzLlxuICAgICAgICB0aGlzLmNsZWFudXBBbm5vdGF0aW9uKGFubm90YXRpb24pXG4gICAgICAgICMgRGVsZXRlIGFubm90YXRpb25cbiAgICAgICAgdGhpcy5hbm5vdGF0aW9ucy5kZWxldGUoYW5ub3RhdGlvbilcbiAgICAgICAgICAuZG9uZSA9PiB0aGlzLnB1Ymxpc2goJ2Fubm90YXRpb25EZWxldGVkJywgW2Fubm90YXRpb25dKVxuICAgICAgKVxuICAgICAgLmFkZEZpZWxkKHtcbiAgICAgICAgbG9hZDogKGZpZWxkLCBhbm5vdGF0aW9uKSA9PlxuICAgICAgICAgIGlmIGFubm90YXRpb24udGV4dFxuICAgICAgICAgICAgJChmaWVsZCkuaHRtbChVdGlsLmVzY2FwZShhbm5vdGF0aW9uLnRleHQpKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICQoZmllbGQpLmh0bWwoXCI8aT4je190ICdObyBDb21tZW50J308L2k+XCIpXG4gICAgICAgICAgdGhpcy5wdWJsaXNoKCdhbm5vdGF0aW9uVmlld2VyVGV4dEZpZWxkJywgW2ZpZWxkLCBhbm5vdGF0aW9uXSlcbiAgICAgIH0pXG4gICAgICAuZWxlbWVudC5hcHBlbmRUbyhAd3JhcHBlcikuYmluZCh7XG4gICAgICAgIFwibW91c2VvdmVyXCI6IHRoaXMuY2xlYXJWaWV3ZXJIaWRlVGltZXJcbiAgICAgICAgXCJtb3VzZW91dFwiOiAgdGhpcy5zdGFydFZpZXdlckhpZGVUaW1lclxuICAgICAgfSlcbiAgICB0aGlzXG5cbiAgIyBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIHRoZSBBbm5vdGF0b3IuRWRpdG9yIGFuZCBhc3NpZ25zIGl0IHRvIEBlZGl0b3IuXG4gICMgQXBwZW5kcyB0aGlzIHRvIHRoZSBAd3JhcHBlciBhbmQgc2V0cyB1cCBldmVudCBsaXN0ZW5lcnMuXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZiBmb3IgY2hhaW5pbmcuXG4gIF9zZXR1cEVkaXRvcjogLT5cbiAgICBAZWRpdG9yID0gbmV3IEFubm90YXRvci5FZGl0b3IoKVxuICAgIEBlZGl0b3IuaGlkZSgpXG4gICAgICAub24oJ2hpZGUnLCB0aGlzLm9uRWRpdG9ySGlkZSlcbiAgICAgIC5vbignc2F2ZScsIHRoaXMub25FZGl0b3JTdWJtaXQpXG4gICAgICAuYWRkRmllbGQoe1xuICAgICAgICB0eXBlOiAndGV4dGFyZWEnLFxuICAgICAgICBsYWJlbDogX3QoJ0NvbW1lbnRzJykgKyAnXFx1MjAyNidcbiAgICAgICAgbG9hZDogKGZpZWxkLCBhbm5vdGF0aW9uKSAtPlxuICAgICAgICAgICQoZmllbGQpLmZpbmQoJ3RleHRhcmVhJykudmFsKGFubm90YXRpb24udGV4dCB8fCAnJylcbiAgICAgICAgc3VibWl0OiAoZmllbGQsIGFubm90YXRpb24pIC0+XG4gICAgICAgICAgYW5ub3RhdGlvbi50ZXh0ID0gJChmaWVsZCkuZmluZCgndGV4dGFyZWEnKS52YWwoKVxuICAgICAgfSlcblxuICAgIEBlZGl0b3IuZWxlbWVudC5hcHBlbmRUbyhAd3JhcHBlcilcbiAgICB0aGlzXG5cbiAgIyBTZXRzIHVwIHRoZSBzZWxlY3Rpb24gZXZlbnQgbGlzdGVuZXJzIHRvIHdhdGNoIG1vdXNlIGFjdGlvbnMgb24gdGhlIGRvY3VtZW50LlxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgZm9yIGNoYWluaW5nLlxuICBfc2V0dXBEb2N1bWVudEV2ZW50czogLT5cbiAgICAkKGRvY3VtZW50KS5iaW5kKHtcbiAgICAgIFwibW91c2V1cFwiOiAgIHRoaXMuY2hlY2tGb3JFbmRTZWxlY3Rpb25cbiAgICAgIFwibW91c2Vkb3duXCI6IHRoaXMuY2hlY2tGb3JTdGFydFNlbGVjdGlvblxuICAgIH0pXG4gICAgdGhpc1xuXG4gICMgU2V0cyB1cCBhbnkgZHluYW1pY2FsbHkgY2FsY3VsYXRlZCBDU1MgZm9yIHRoZSBBbm5vdGF0b3IuXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZiBmb3IgY2hhaW5pbmcuXG4gIF9zZXR1cER5bmFtaWNTdHlsZTogLT5cbiAgICBzdHlsZSA9ICQoJyNhbm5vdGF0b3ItZHluYW1pYy1zdHlsZScpXG5cbiAgICBpZiAoIXN0eWxlLmxlbmd0aClcbiAgICAgIHN0eWxlID0gJCgnPHN0eWxlIGlkPVwiYW5ub3RhdG9yLWR5bmFtaWMtc3R5bGVcIj48L3N0eWxlPicpLmFwcGVuZFRvKGRvY3VtZW50LmhlYWQpXG5cbiAgICBzZWwgPSAnKicgKyAoXCI6bm90KC5hbm5vdGF0b3ItI3t4fSlcIiBmb3IgeCBpbiBbJ2FkZGVyJywgJ291dGVyJywgJ25vdGljZScsICdmaWx0ZXInXSkuam9pbignJylcblxuICAgICMgdXNlIHRoZSBtYXhpbXVtIHotaW5kZXggaW4gdGhlIHBhZ2VcbiAgICBtYXggPSBVdGlsLm1heFpJbmRleCgkKGRvY3VtZW50LmJvZHkpLmZpbmQoc2VsKSlcblxuICAgICMgYnV0IGRvbid0IGdvIHNtYWxsZXIgdGhhbiAxMDEwLCBiZWNhdXNlIHRoaXMgaXNuJ3QgYnVsbGV0cHJvb2YgLS1cbiAgICAjIGR5bmFtaWMgZWxlbWVudHMgaW4gdGhlIHBhZ2UgKG5vdGlmaWNhdGlvbnMsIGRpYWxvZ3MsIGV0Yy4pIG1heSB3ZWxsXG4gICAgIyBoYXZlIGhpZ2ggei1pbmRpY2VzIHRoYXQgd2UgY2FuJ3QgY2F0Y2ggdXNpbmcgdGhlIGFib3ZlIG1ldGhvZC5cbiAgICBtYXggPSBNYXRoLm1heChtYXgsIDEwMDApXG5cbiAgICBzdHlsZS50ZXh0IFtcbiAgICAgIFwiLmFubm90YXRvci1hZGRlciwgLmFubm90YXRvci1vdXRlciwgLmFubm90YXRvci1ub3RpY2Uge1wiXG4gICAgICBcIiAgei1pbmRleDogI3ttYXggKyAyMH07XCJcbiAgICAgIFwifVwiXG4gICAgICBcIi5hbm5vdGF0b3ItZmlsdGVyIHtcIlxuICAgICAgXCIgIHotaW5kZXg6ICN7bWF4ICsgMTB9O1wiXG4gICAgICBcIn1cIlxuICAgIF0uam9pbihcIlxcblwiKVxuXG4gICAgdGhpc1xuXG4gICMgUHVibGljOiBMb2FkIGFuZCBkcmF3IGFubm90YXRpb25zIGZyb20gYSBnaXZlbiBxdWVyeS5cbiAgI1xuICAjIHF1ZXJ5IC0gdGhlIHF1ZXJ5IHRvIHBhc3MgdG8gdGhlIGJhY2tlbmRcbiAgI1xuICAjIFJldHVybnMgYSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiBsb2FkaW5nIGlzIGNvbXBsZXRlLlxuICBsb2FkOiAocXVlcnkpIC0+XG4gICAgQGFubm90YXRpb25zLmxvYWQocXVlcnkpXG4gICAgICAudGhlbiAoYW5ub3RhdGlvbnMsIG1ldGEpID0+XG4gICAgICAgIHRoaXMubG9hZEFubm90YXRpb25zKGFubm90YXRpb25zKVxuXG4gICMgUHVibGljOiBEZXN0cm95IHRoZSBjdXJyZW50IEFubm90YXRvciBpbnN0YW5jZSwgdW5iaW5kaW5nIGFsbCBldmVudHMgYW5kXG4gICMgZGlzcG9zaW5nIG9mIGFsbCByZWxldmFudCBlbGVtZW50cy5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgZGVzdHJveTogLT5cbiAgICAkKGRvY3VtZW50KS51bmJpbmQoe1xuICAgICAgXCJtb3VzZXVwXCI6ICAgdGhpcy5jaGVja0ZvckVuZFNlbGVjdGlvblxuICAgICAgXCJtb3VzZWRvd25cIjogdGhpcy5jaGVja0ZvclN0YXJ0U2VsZWN0aW9uXG4gICAgfSlcblxuICAgICQoJyNhbm5vdGF0b3ItZHluYW1pYy1zdHlsZScpLnJlbW92ZSgpXG5cbiAgICBAYWRkZXIucmVtb3ZlKClcbiAgICBAdmlld2VyLmRlc3Ryb3koKVxuICAgIEBlZGl0b3IuZGVzdHJveSgpXG5cbiAgICBAd3JhcHBlci5maW5kKCcuYW5ub3RhdG9yLWhsJykuZWFjaCAtPlxuICAgICAgJCh0aGlzKS5jb250ZW50cygpLmluc2VydEJlZm9yZSh0aGlzKVxuICAgICAgJCh0aGlzKS5yZW1vdmUoKVxuXG4gICAgQHdyYXBwZXIuY29udGVudHMoKS5pbnNlcnRCZWZvcmUoQHdyYXBwZXIpXG4gICAgQHdyYXBwZXIucmVtb3ZlKClcbiAgICBAZWxlbWVudC5kYXRhKCdhbm5vdGF0b3InLCBudWxsKVxuXG4gICAgZm9yIG5hbWUsIHBsdWdpbiBvZiBAcGx1Z2luc1xuICAgICAgQHBsdWdpbnNbbmFtZV0uZGVzdHJveSgpXG5cbiAgICB0aGlzLnJlbW92ZUV2ZW50cygpXG4gICAgaWR4ID0gQW5ub3RhdG9yLl9pbnN0YW5jZXMuaW5kZXhPZih0aGlzKVxuICAgIGlmIGlkeCAhPSAtMVxuICAgICAgQW5ub3RhdG9yLl9pbnN0YW5jZXMuc3BsaWNlKGlkeCwgMSlcblxuICAjIFB1YmxpYzogR2V0cyB0aGUgY3VycmVudCBzZWxlY3Rpb24gZXhjbHVkaW5nIGFueSBub2RlcyB0aGF0IGZhbGwgb3V0c2lkZSBvZlxuICAjIHRoZSBAd3JhcHBlci4gVGhlbiByZXR1cm5zIGFuZCBBcnJheSBvZiBOb3JtYWxpemVkUmFuZ2UgaW5zdGFuY2VzLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBBIHNlbGVjdGlvbiBpbnNpZGUgQHdyYXBwZXJcbiAgIyAgIGFubm90YXRpb24uZ2V0U2VsZWN0ZWRSYW5nZXMoKVxuICAjICAgIyA9PiBSZXR1cm5zIFtOb3JtYWxpemVkUmFuZ2VdXG4gICNcbiAgIyAgICMgQSBzZWxlY3Rpb24gb3V0c2lkZSBvZiBAd3JhcHBlclxuICAjICAgYW5ub3RhdGlvbi5nZXRTZWxlY3RlZFJhbmdlcygpXG4gICMgICAjID0+IFJldHVybnMgW11cbiAgI1xuICAjIFJldHVybnMgQXJyYXkgb2YgTm9ybWFsaXplZFJhbmdlIGluc3RhbmNlcy5cbiAgZ2V0U2VsZWN0ZWRSYW5nZXM6IC0+XG4gICAgc2VsZWN0aW9uID0gVXRpbC5nZXRHbG9iYWwoKS5nZXRTZWxlY3Rpb24oKVxuXG4gICAgcmFuZ2VzID0gW11cbiAgICByYW5nZXNUb0lnbm9yZSA9IFtdXG4gICAgdW5sZXNzIHNlbGVjdGlvbi5pc0NvbGxhcHNlZFxuICAgICAgcmFuZ2VzID0gZm9yIGkgaW4gWzAuLi5zZWxlY3Rpb24ucmFuZ2VDb3VudF1cbiAgICAgICAgciA9IHNlbGVjdGlvbi5nZXRSYW5nZUF0KGkpXG4gICAgICAgIGJyb3dzZXJSYW5nZSA9IG5ldyBSYW5nZS5Ccm93c2VyUmFuZ2UocilcbiAgICAgICAgbm9ybWVkUmFuZ2UgPSBicm93c2VyUmFuZ2Uubm9ybWFsaXplKCkubGltaXQoQHdyYXBwZXJbMF0pXG5cbiAgICAgICAgIyBJZiB0aGUgbmV3IHJhbmdlIGZhbGxzIGZ1bGx5IG91dHNpZGUgdGhlIHdyYXBwZXIsIHdlXG4gICAgICAgICMgc2hvdWxkIGFkZCBpdCBiYWNrIHRvIHRoZSBkb2N1bWVudCBidXQgbm90IHJldHVybiBpdCBmcm9tXG4gICAgICAgICMgdGhpcyBtZXRob2RcbiAgICAgICAgcmFuZ2VzVG9JZ25vcmUucHVzaChyKSBpZiBub3JtZWRSYW5nZSBpcyBudWxsXG5cbiAgICAgICAgbm9ybWVkUmFuZ2VcblxuICAgICAgIyBCcm93c2VyUmFuZ2Ujbm9ybWFsaXplKCkgbW9kaWZpZXMgdGhlIERPTSBzdHJ1Y3R1cmUgYW5kIGRlc2VsZWN0cyB0aGVcbiAgICAgICMgdW5kZXJseWluZyB0ZXh0IGFzIGEgcmVzdWx0LiBTbyBoZXJlIHdlIHJlbW92ZSB0aGUgc2VsZWN0ZWQgcmFuZ2VzIGFuZFxuICAgICAgIyByZWFwcGx5IHRoZSBuZXcgb25lcy5cbiAgICAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKVxuXG4gICAgZm9yIHIgaW4gcmFuZ2VzVG9JZ25vcmVcbiAgICAgIHNlbGVjdGlvbi5hZGRSYW5nZShyKVxuXG4gICAgIyBSZW1vdmUgYW55IHJhbmdlcyB0aGF0IGZlbGwgb3V0c2lkZSBvZiBAd3JhcHBlci5cbiAgICAkLmdyZXAgcmFuZ2VzLCAocmFuZ2UpIC0+XG4gICAgICAjIEFkZCB0aGUgbm9ybWVkIHJhbmdlIGJhY2sgdG8gdGhlIHNlbGVjdGlvbiBpZiBpdCBleGlzdHMuXG4gICAgICBzZWxlY3Rpb24uYWRkUmFuZ2UocmFuZ2UudG9SYW5nZSgpKSBpZiByYW5nZVxuICAgICAgcmFuZ2VcblxuXG4gICMgUHVibGljOiBJbml0aWFsaXNlcyBhbiBhbm5vdGF0aW9uIGZyb20gYW4gb2JqZWN0IHJlcHJlc2VudGF0aW9uLiBJdCBmaW5kc1xuICAjIHRoZSBzZWxlY3RlZCByYW5nZSBhbmQgaGlnbGlnaHRzIHRoZSBzZWxlY3Rpb24gaW4gdGhlIERPTS5cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdCB0byBpbml0aWFsaXNlLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBDcmVhdGUgYSBicmFuZCBuZXcgYW5ub3RhdGlvbiBmcm9tIHRoZSBjdXJyZW50bHkgc2VsZWN0ZWQgdGV4dC5cbiAgIyAgIGFubm90YXRpb24gPSBhbm5vdGF0b3Iuc2V0dXBBbm5vdGF0aW9uKHtyYW5nZXM6IGFubm90YXRvci5zZWxlY3RlZFJhbmdlc30pXG4gICMgICAjIGFubm90YXRpb24gaGFzIG5vdyBiZWVuIGFzc2lnbmVkIHRoZSBjdXJyZW50bHkgc2VsZWN0ZWQgcmFuZ2VcbiAgIyAgICMgYW5kIGEgaGlnaGxpZ2h0IGFwcGVuZGVkIHRvIHRoZSBET00uXG4gICNcbiAgIyAgICMgQWRkIGFuIGV4aXN0aW5nIGFubm90YXRpb24gdGhhdCBoYXMgYmVlbiBzdG9yZWQgZWxzZXdlcmUgdG8gdGhlIERPTS5cbiAgIyAgIGFubm90YXRpb24gPSBnZXRTdG9yZWRBbm5vdGF0aW9uV2l0aFNlcmlhbGl6ZWRSYW5nZXMoKVxuICAjICAgYW5ub3RhdGlvbiA9IGFubm90YXRvci5zZXR1cEFubm90YXRpb24oYW5ub3RhdGlvbilcbiAgI1xuICAjIFJldHVybnMgdGhlIGluaXRpYWxpc2VkIGFubm90YXRpb24uXG4gIHNldHVwQW5ub3RhdGlvbjogKGFubm90YXRpb24pIC0+XG4gICAgcm9vdCA9IEB3cmFwcGVyWzBdXG5cbiAgICBub3JtZWRSYW5nZXMgPSBbXVxuICAgIGZvciByIGluIGFubm90YXRpb24ucmFuZ2VzXG4gICAgICB0cnlcbiAgICAgICAgbm9ybWVkUmFuZ2VzLnB1c2goUmFuZ2Uuc25pZmYocikubm9ybWFsaXplKHJvb3QpKVxuICAgICAgY2F0Y2ggZVxuICAgICAgICBpZiBlIGluc3RhbmNlb2YgUmFuZ2UuUmFuZ2VFcnJvclxuICAgICAgICAgIHRoaXMucHVibGlzaCgncmFuZ2VOb3JtYWxpemVGYWlsJywgW2Fubm90YXRpb24sIHIsIGVdKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgIyBPaCBKYXZhc2NyaXB0LCB3aHkgeW91IHNvIGNyYXA/IFRoaXMgd2lsbCBsb3NlIHRoZSB0cmFjZWJhY2suXG4gICAgICAgICAgdGhyb3cgZVxuXG4gICAgYW5ub3RhdGlvbi5xdW90ZSAgICAgID0gW11cbiAgICBhbm5vdGF0aW9uLnJhbmdlcyAgICAgPSBbXVxuICAgIGFubm90YXRpb24uX2xvY2FsID0ge31cbiAgICBhbm5vdGF0aW9uLl9sb2NhbC5oaWdobGlnaHRzID0gW11cblxuICAgIGZvciBub3JtZWQgaW4gbm9ybWVkUmFuZ2VzXG4gICAgICBhbm5vdGF0aW9uLnF1b3RlLnB1c2ggICAgICAkLnRyaW0obm9ybWVkLnRleHQoKSlcbiAgICAgIGFubm90YXRpb24ucmFuZ2VzLnB1c2ggICAgIG5vcm1lZC5zZXJpYWxpemUoQHdyYXBwZXJbMF0sICcuYW5ub3RhdG9yLWhsJylcbiAgICAgICQubWVyZ2UgYW5ub3RhdGlvbi5fbG9jYWwuaGlnaGxpZ2h0cywgdGhpcy5oaWdobGlnaHRSYW5nZShub3JtZWQpXG5cbiAgICAjIEpvaW4gYWxsIHRoZSBxdW90ZXMgaW50byBvbmUgc3RyaW5nLlxuICAgIGFubm90YXRpb24ucXVvdGUgPSBhbm5vdGF0aW9uLnF1b3RlLmpvaW4oJyAvICcpXG5cbiAgICAjIFNhdmUgdGhlIGFubm90YXRpb24gZGF0YSBvbiBlYWNoIGhpZ2hsaWdodGVyIGVsZW1lbnQuXG4gICAgJChhbm5vdGF0aW9uLl9sb2NhbC5oaWdobGlnaHRzKS5kYXRhKCdhbm5vdGF0aW9uJywgYW5ub3RhdGlvbilcblxuICAgIGFubm90YXRpb25cblxuICAjIFB1YmxpYzogRGVsZXRlcyB0aGUgYW5ub3RhdGlvbiBieSByZW1vdmluZyB0aGUgaGlnaGxpZ2h0IGZyb20gdGhlIERPTS5cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdCB0byBkZWxldGUuXG4gICNcbiAgIyBSZXR1cm5zIGRlbGV0ZWQgYW5ub3RhdGlvbi5cbiAgY2xlYW51cEFubm90YXRpb246IChhbm5vdGF0aW9uKSAtPlxuICAgIGlmIGFubm90YXRpb24uX2xvY2FsPy5oaWdobGlnaHRzP1xuICAgICAgZm9yIGggaW4gYW5ub3RhdGlvbi5fbG9jYWwuaGlnaGxpZ2h0cyB3aGVuIGgucGFyZW50Tm9kZT9cbiAgICAgICAgJChoKS5yZXBsYWNlV2l0aChoLmNoaWxkTm9kZXMpXG4gICAgICBkZWxldGUgYW5ub3RhdGlvbi5fbG9jYWwuaGlnaGxpZ2h0c1xuXG4gICAgYW5ub3RhdGlvblxuXG4gICMgUHVibGljOiBMb2FkcyBhbiBBcnJheSBvZiBhbm5vdGF0aW9ucyBpbnRvIHRoZSBAZWxlbWVudC4gQnJlYWtzIHRoZSB0YXNrXG4gICMgaW50byBjaHVua3Mgb2YgMTAgYW5ub3RhdGlvbnMuXG4gICNcbiAgIyBhbm5vdGF0aW9ucyAtIEFuIEFycmF5IG9mIGFubm90YXRpb24gT2JqZWN0cy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGxvYWRBbm5vdGF0aW9uc0Zyb21TdG9yZSAoYW5ub3RhdGlvbnMpIC0+XG4gICMgICAgIGFubm90YXRvci5sb2FkQW5ub3RhdGlvbnMoYW5ub3RhdGlvbnMpXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZiBmb3IgY2hhaW5pbmcuXG4gIGxvYWRBbm5vdGF0aW9uczogKGFubm90YXRpb25zPVtdKSAtPlxuICAgIGxvYWRlciA9IChhbm5MaXN0PVtdKSA9PlxuICAgICAgbm93ID0gYW5uTGlzdC5zcGxpY2UoMCwxMClcblxuICAgICAgZm9yIG4gaW4gbm93XG4gICAgICAgIHRoaXMuc2V0dXBBbm5vdGF0aW9uKG4pXG5cbiAgICAgICMgSWYgdGhlcmUgYXJlIG1vcmUgdG8gZG8sIGRvIHRoZW0gYWZ0ZXIgYSAxMG1zIGJyZWFrIChmb3IgYnJvd3NlclxuICAgICAgIyByZXNwb25zaXZlbmVzcykuXG4gICAgICBpZiBhbm5MaXN0Lmxlbmd0aCA+IDBcbiAgICAgICAgc2V0VGltZW91dCgoLT4gbG9hZGVyKGFubkxpc3QpKSwgMTApXG4gICAgICBlbHNlXG4gICAgICAgIHRoaXMucHVibGlzaCAnYW5ub3RhdGlvbnNMb2FkZWQnLCBbY2xvbmVdXG5cbiAgICBjbG9uZSA9IGFubm90YXRpb25zLnNsaWNlKClcbiAgICBsb2FkZXIgYW5ub3RhdGlvbnNcblxuICAgIHRoaXNcblxuICAjIFB1YmxpYzogQ2FsbHMgdGhlIFN0b3JlI2R1bXBBbm5vdGF0aW9ucygpIG1ldGhvZC5cbiAgI1xuICAjIFJldHVybnMgZHVtcGVkIGFubm90YXRpb25zIEFycmF5IG9yIGZhbHNlIGlmIFN0b3JlIGlzIG5vdCBsb2FkZWQuXG4gIGR1bXBBbm5vdGF0aW9uczogKCkgLT5cbiAgICBpZiBAcGx1Z2luc1snU3RvcmUnXVxuICAgICAgQHBsdWdpbnNbJ1N0b3JlJ10uZHVtcEFubm90YXRpb25zKClcbiAgICBlbHNlXG4gICAgICBjb25zb2xlLndhcm4oX3QoXCJDYW4ndCBkdW1wIGFubm90YXRpb25zIHdpdGhvdXQgU3RvcmUgcGx1Z2luLlwiKSlcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICMgUHVibGljOiBXcmFwcyB0aGUgRE9NIE5vZGVzIHdpdGhpbiB0aGUgcHJvdmlkZWQgcmFuZ2Ugd2l0aCBhIGhpZ2hsaWdodFxuICAjIGVsZW1lbnQgb2YgdGhlIHNwZWNpZmllZCBjbGFzc8KgYW5kIHJldHVybnMgdGhlIGhpZ2hsaWdodCBFbGVtZW50cy5cbiAgI1xuICAjIG5vcm1lZFJhbmdlIC0gQSBOb3JtYWxpemVkUmFuZ2UgdG8gYmUgaGlnaGxpZ2h0ZWQuXG4gICMgY3NzQ2xhc3MgLSBBIENTUyBjbGFzcyB0byB1c2UgZm9yIHRoZSBoaWdobGlnaHQgKGRlZmF1bHQ6ICdhbm5vdGF0b3ItaGwnKVxuICAjXG4gICMgUmV0dXJucyBhbiBhcnJheSBvZiBoaWdobGlnaHQgRWxlbWVudHMuXG4gIGhpZ2hsaWdodFJhbmdlOiAobm9ybWVkUmFuZ2UsIGNzc0NsYXNzPSdhbm5vdGF0b3ItaGwnKSAtPlxuICAgIHdoaXRlID0gL15cXHMqJC9cblxuICAgIGhsID0gJChcIjxzcGFuIGNsYXNzPScje2Nzc0NsYXNzfSc+PC9zcGFuPlwiKVxuXG4gICAgIyBJZ25vcmUgdGV4dCBub2RlcyB0aGF0IGNvbnRhaW4gb25seSB3aGl0ZXNwYWNlIGNoYXJhY3RlcnMuIFRoaXMgcHJldmVudHNcbiAgICAjIHNwYW5zIGJlaW5nIGluamVjdGVkIGJldHdlZW4gZWxlbWVudHMgdGhhdCBjYW4gb25seSBjb250YWluIGEgcmVzdHJpY3RlZFxuICAgICMgc3Vic2V0IG9mIG5vZGVzIHN1Y2ggYXMgdGFibGUgcm93cyBhbmQgbGlzdHMuIFRoaXMgZG9lcyBtZWFuIHRoYXQgdGhlcmVcbiAgICAjIG1heSBiZSB0aGUgb2RkIGFiYW5kb25lZCB3aGl0ZXNwYWNlIG5vZGUgaW4gYSBwYXJhZ3JhcGggdGhhdCBpcyBza2lwcGVkXG4gICAgIyBidXQgYmV0dGVyIHRoYW4gYnJlYWtpbmcgdGFibGUgbGF5b3V0cy5cbiAgICBmb3Igbm9kZSBpbiBub3JtZWRSYW5nZS50ZXh0Tm9kZXMoKSB3aGVuIG5vdCB3aGl0ZS50ZXN0KG5vZGUubm9kZVZhbHVlKVxuICAgICAgJChub2RlKS53cmFwQWxsKGhsKS5wYXJlbnQoKS5zaG93KClbMF1cblxuICAjIFB1YmxpYzogaGlnaGxpZ2h0IGEgbGlzdCBvZiByYW5nZXNcbiAgI1xuICAjIG5vcm1lZFJhbmdlcyAtIEFuIGFycmF5IG9mIE5vcm1hbGl6ZWRSYW5nZXMgdG8gYmUgaGlnaGxpZ2h0ZWQuXG4gICMgY3NzQ2xhc3MgLSBBIENTUyBjbGFzcyB0byB1c2UgZm9yIHRoZSBoaWdobGlnaHQgKGRlZmF1bHQ6ICdhbm5vdGF0b3ItaGwnKVxuICAjXG4gICMgUmV0dXJucyBhbiBhcnJheSBvZiBoaWdobGlnaHQgRWxlbWVudHMuXG4gIGhpZ2hsaWdodFJhbmdlczogKG5vcm1lZFJhbmdlcywgY3NzQ2xhc3M9J2Fubm90YXRvci1obCcpIC0+XG4gICAgaGlnaGxpZ2h0cyA9IFtdXG4gICAgZm9yIHIgaW4gbm9ybWVkUmFuZ2VzXG4gICAgICAkLm1lcmdlIGhpZ2hsaWdodHMsIHRoaXMuaGlnaGxpZ2h0UmFuZ2UociwgY3NzQ2xhc3MpXG4gICAgaGlnaGxpZ2h0c1xuXG4gICMgUHVibGljOiBSZWdpc3RlcnMgYSBwbHVnaW4gd2l0aCB0aGUgQW5ub3RhdG9yLiBBIHBsdWdpbiBjYW4gb25seSBiZVxuICAjIHJlZ2lzdGVyZWQgb25jZS4gVGhlIHBsdWdpbiB3aWxsIGJlIGluc3RhbnRpYXRlZCBpbiB0aGUgZm9sbG93aW5nIG9yZGVyLlxuICAjXG4gICMgMS4gQSBuZXcgaW5zdGFuY2Ugb2YgdGhlIHBsdWdpbiB3aWxsIGJlIGNyZWF0ZWQgKHByb3ZpZGluZyB0aGUgQGVsZW1lbnQgYW5kXG4gICMgICAgb3B0aW9ucyBhcyBwYXJhbXMpIHRoZW4gYXNzaWduZWQgdG8gdGhlIEBwbHVnaW5zIHJlZ2lzdHJ5LlxuICAjIDIuIFRoZSBjdXJyZW50IEFubm90YXRvciBpbnN0YW5jZSB3aWxsIGJlIGF0dGFjaGVkIHRvIHRoZSBwbHVnaW4uXG4gICMgMy4gVGhlIFBsdWdpbiNwbHVnaW5Jbml0KCkgbWV0aG9kIHdpbGwgYmUgY2FsbGVkIGlmIGl0IGV4aXN0cy5cbiAgI1xuICAjIG5hbWUgICAgLSBQbHVnaW4gdG8gaW5zdGFudGlhdGUuIE11c3QgYmUgaW4gdGhlIEFubm90YXRvci5QbHVnaW5zIG5hbWVzcGFjZS5cbiAgIyBvcHRpb25zIC0gQW55IG9wdGlvbnMgdG8gYmUgcHJvdmlkZWQgdG8gdGhlIHBsdWdpbiBjb25zdHJ1Y3Rvci5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGFubm90YXRvclxuICAjICAgICAuYWRkUGx1Z2luKCdUYWdzJylcbiAgIyAgICAgLmFkZFBsdWdpbignU3RvcmUnLCB7XG4gICMgICAgICAgcHJlZml4OiAnL3N0b3JlJ1xuICAjICAgICB9KVxuICAjICAgICAuYWRkUGx1Z2luKCdQZXJtaXNzaW9ucycsIHtcbiAgIyAgICAgICB1c2VyOiAnQmlsbCdcbiAgIyAgICAgfSlcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIHRvIGFsbG93IGNoYWluaW5nLlxuICBhZGRQbHVnaW46IChuYW1lLCBvcHRpb25zKSAtPlxuICAgIGlmIEBwbHVnaW5zW25hbWVdXG4gICAgICBjb25zb2xlLmVycm9yIF90KFwiWW91IGNhbm5vdCBoYXZlIG1vcmUgdGhhbiBvbmUgaW5zdGFuY2Ugb2YgYW55IHBsdWdpbi5cIilcbiAgICBlbHNlXG4gICAgICBrbGFzcyA9IEFubm90YXRvci5QbHVnaW5bbmFtZV1cbiAgICAgIGlmIHR5cGVvZiBrbGFzcyBpcyAnZnVuY3Rpb24nXG4gICAgICAgIEBwbHVnaW5zW25hbWVdID0gbmV3IGtsYXNzKEBlbGVtZW50WzBdLCBvcHRpb25zKVxuICAgICAgICBAcGx1Z2luc1tuYW1lXS5hbm5vdGF0b3IgPSB0aGlzXG4gICAgICAgIEBwbHVnaW5zW25hbWVdLnBsdWdpbkluaXQ/KClcbiAgICAgIGVsc2VcbiAgICAgICAgY29uc29sZS5lcnJvciBfdChcIkNvdWxkIG5vdCBsb2FkIFwiKSArIG5hbWUgKyBfdChcIiBwbHVnaW4uIEhhdmUgeW91IGluY2x1ZGVkIHRoZSBhcHByb3ByaWF0ZSA8c2NyaXB0PiB0YWc/XCIpXG4gICAgdGhpcyAjIGFsbG93IGNoYWluaW5nXG5cbiAgIyBQdWJsaWM6IFdhaXRzIGZvciB0aGUgQGVkaXRvciB0byBzdWJtaXQgb3IgaGlkZSwgcmV0dXJuaW5nIGEgcHJvbWlzZSB0aGF0XG4gICMgaXMgcmVzb2x2ZWQgb3IgcmVqZWN0ZWQgZGVwZW5kaW5nIG9uIHdoZXRoZXIgdGhlIGFubm90YXRpb24gd2FzIHNhdmVkIG9yXG4gICMgY2FuY2VsbGVkLlxuICBlZGl0QW5ub3RhdGlvbjogKGFubm90YXRpb24sIHBvc2l0aW9uKSAtPlxuICAgIGRmZCA9ICQuRGVmZXJyZWQoKVxuICAgIHJlc29sdmUgPSBkZmQucmVzb2x2ZS5iaW5kKGRmZCwgYW5ub3RhdGlvbilcbiAgICByZWplY3QgPSBkZmQucmVqZWN0LmJpbmQoZGZkLCBhbm5vdGF0aW9uKVxuXG4gICAgdGhpcy5zaG93RWRpdG9yKGFubm90YXRpb24sIHBvc2l0aW9uKVxuICAgIHRoaXMuc3Vic2NyaWJlKCdhbm5vdGF0aW9uRWRpdG9yU3VibWl0JywgcmVzb2x2ZSlcbiAgICB0aGlzLm9uY2UgJ2Fubm90YXRpb25FZGl0b3JIaWRkZW4nLCA9PlxuICAgICAgdGhpcy51bnN1YnNjcmliZSgnYW5ub3RhdGlvbkVkaXRvclN1Ym1pdCcsIHJlc29sdmUpXG4gICAgICByZWplY3QoKSBpZiBkZmQuc3RhdGUoKSBpcyAncGVuZGluZydcblxuICAgIGRmZC5wcm9taXNlKClcblxuICAjIFB1YmxpYzogTG9hZHMgdGhlIEBlZGl0b3Igd2l0aCB0aGUgcHJvdmlkZWQgYW5ub3RhdGlvbiBhbmQgdXBkYXRlcyBpdHNcbiAgIyBwb3NpdGlvbiBpbiB0aGUgd2luZG93LlxuICAjXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gdG8gbG9hZCBpbnRvIHRoZSBlZGl0b3IuXG4gICMgbG9jYXRpb24gICAtIFBvc2l0aW9uIHRvIHNldCB0aGUgRWRpdG9yIGluIHRoZSBmb3JtIHt0b3A6IHksIGxlZnQ6IHh9XG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBhbm5vdGF0b3Iuc2hvd0VkaXRvcih7dGV4dDogXCJteSBjb21tZW50XCJ9LCB7dG9wOiAzNCwgbGVmdDogMjM0fSlcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIHRvIGFsbG93IGNoYWluaW5nLlxuICBzaG93RWRpdG9yOiAoYW5ub3RhdGlvbiwgbG9jYXRpb24pID0+XG4gICAgQGVkaXRvci5lbGVtZW50LmNzcyhsb2NhdGlvbilcbiAgICBAZWRpdG9yLmxvYWQoYW5ub3RhdGlvbilcbiAgICB0aGlzLnB1Ymxpc2goJ2Fubm90YXRpb25FZGl0b3JTaG93bicsIFtAZWRpdG9yLCBhbm5vdGF0aW9uXSlcbiAgICB0aGlzXG5cbiAgIyBDYWxsYmFjayBtZXRob2QgY2FsbGVkIHdoZW4gdGhlIEBlZGl0b3IgZmlyZXMgdGhlIFwiaGlkZVwiIGV2ZW50LiBJdHNlbGZcbiAgIyBwdWJsaXNoZXMgdGhlICdhbm5vdGF0aW9uRWRpdG9ySGlkZGVuJyBldmVudCBhbmQgcmVzZXRzIHRoZSBAaWdub3JlTW91c2V1cFxuICAjIHByb3BlcnR5IHRvIGFsbG93IGxpc3RlbmluZyB0byBtb3VzZSBldmVudHMuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIG9uRWRpdG9ySGlkZTogPT5cbiAgICB0aGlzLnB1Ymxpc2goJ2Fubm90YXRpb25FZGl0b3JIaWRkZW4nLCBbQGVkaXRvcl0pXG4gICAgQGlnbm9yZU1vdXNldXAgPSBmYWxzZVxuXG4gICMgQ2FsbGJhY2sgbWV0aG9kIGNhbGxlZCB3aGVuIHRoZSBAZWRpdG9yIGZpcmVzIHRoZSBcInNhdmVcIiBldmVudC4gSXRzZWxmXG4gICMgcHVibGlzaGVzIHRoZSAnYW5ub3RhdGlvbkVkaXRvclN1Ym1pdCcgZXZlbnQgYW5kIGNyZWF0ZXMvdXBkYXRlcyB0aGVcbiAgIyBlZGl0ZWQgYW5ub3RhdGlvbi5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgb25FZGl0b3JTdWJtaXQ6IChhbm5vdGF0aW9uKSA9PlxuICAgIHRoaXMucHVibGlzaCgnYW5ub3RhdGlvbkVkaXRvclN1Ym1pdCcsIFtAZWRpdG9yLCBhbm5vdGF0aW9uXSlcblxuICAjIFB1YmxpYzogTG9hZHMgdGhlIEB2aWV3ZXIgd2l0aCBhbiBBcnJheSBvZiBhbm5vdGF0aW9ucyBhbmQgcG9zaXRpb25zIGl0XG4gICMgYXQgdGhlIGxvY2F0aW9uIHByb3ZpZGVkLiBDYWxscyB0aGUgJ2Fubm90YXRpb25WaWV3ZXJTaG93bicgZXZlbnQuXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gQXJyYXkgb2YgYW5ub3RhdGlvbnMgdG8gbG9hZCBpbnRvIHRoZSB2aWV3ZXIuXG4gICMgbG9jYXRpb24gICAtIFBvc2l0aW9uIHRvIHNldCB0aGUgVmlld2VyIGluIHRoZSBmb3JtIHt0b3A6IHksIGxlZnQ6IHh9XG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBhbm5vdGF0b3Iuc2hvd1ZpZXdlcihcbiAgIyAgICBbe3RleHQ6IFwibXkgY29tbWVudFwifSwge3RleHQ6IFwibXkgb3RoZXIgY29tbWVudFwifV0sXG4gICMgICAge3RvcDogMzQsIGxlZnQ6IDIzNH0pXG4gICMgICApXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZiB0byBhbGxvdyBjaGFpbmluZy5cbiAgc2hvd1ZpZXdlcjogKGFubm90YXRpb25zLCBsb2NhdGlvbikgPT5cbiAgICBAdmlld2VyLmVsZW1lbnQuY3NzKGxvY2F0aW9uKVxuICAgIEB2aWV3ZXIubG9hZChhbm5vdGF0aW9ucylcblxuICAgIHRoaXMucHVibGlzaCgnYW5ub3RhdGlvblZpZXdlclNob3duJywgW0B2aWV3ZXIsIGFubm90YXRpb25zXSlcblxuICAjIEFubm90YXRvciNlbGVtZW50IGV2ZW50IGNhbGxiYWNrLiBBbGxvd3MgMjUwbXMgZm9yIG1vdXNlIHBvaW50ZXIgdG8gZ2V0IGZyb21cbiAgIyBhbm5vdGF0aW9uIGhpZ2hsaWdodCB0byBAdmlld2VyIHRvIG1hbmlwdWxhdGUgYW5ub3RhdGlvbnMuIElmIHRpbWVyIGV4cGlyZXNcbiAgIyB0aGUgQHZpZXdlciBpcyBoaWRkZW4uXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHN0YXJ0Vmlld2VySGlkZVRpbWVyOiA9PlxuICAgICMgRG9uJ3QgZG8gdGhpcyBpZiB0aW1lciBoYXMgYWxyZWFkeSBiZWVuIHNldCBieSBhbm90aGVyIGFubm90YXRpb24uXG4gICAgaWYgbm90IEB2aWV3ZXJIaWRlVGltZXJcbiAgICAgIEB2aWV3ZXJIaWRlVGltZXIgPSBzZXRUaW1lb3V0IEB2aWV3ZXIuaGlkZSwgMjUwXG5cbiAgIyBWaWV3ZXIjZWxlbWVudCBldmVudCBjYWxsYmFjay4gQ2xlYXJzIHRoZSB0aW1lciBzZXQgYnlcbiAgIyBBbm5vdGF0b3Ijc3RhcnRWaWV3ZXJIaWRlVGltZXIoKSB3aGVuIHRoZSBAdmlld2VyIGlzIG1vdXNlZCBvdmVyLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBjbGVhclZpZXdlckhpZGVUaW1lcjogKCkgPT5cbiAgICBjbGVhclRpbWVvdXQoQHZpZXdlckhpZGVUaW1lcilcbiAgICBAdmlld2VySGlkZVRpbWVyID0gZmFsc2VcblxuICAjIEFubm90YXRvciNlbGVtZW50IGNhbGxiYWNrLiBTZXRzIHRoZSBAbW91c2VJc0Rvd24gcHJvcGVydHkgdXNlZCB0b1xuICAjIGRldGVybWluZSBpZiBhIHNlbGVjdGlvbiBtYXkgaGF2ZSBzdGFydGVkIHRvIHRydWUuIEFsc28gY2FsbHNcbiAgIyBBbm5vdGF0b3Ijc3RhcnRWaWV3ZXJIaWRlVGltZXIoKSB0byBoaWRlIHRoZSBBbm5vdGF0b3Ijdmlld2VyLlxuICAjXG4gICMgZXZlbnQgLSBBIG1vdXNlZG93biBFdmVudCBvYmplY3QuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIGNoZWNrRm9yU3RhcnRTZWxlY3Rpb246IChldmVudCkgPT5cbiAgICB1bmxlc3MgZXZlbnQgYW5kIHRoaXMuaXNBbm5vdGF0b3IoZXZlbnQudGFyZ2V0KVxuICAgICAgdGhpcy5zdGFydFZpZXdlckhpZGVUaW1lcigpXG4gICAgQG1vdXNlSXNEb3duID0gdHJ1ZVxuXG4gICMgQW5ub3RhdG9yI2VsZW1lbnQgY2FsbGJhY2suIENoZWNrcyB0byBzZWUgaWYgYSBzZWxlY3Rpb24gaGFzIGJlZW4gbWFkZVxuICAjIG9uIG1vdXNldXAgYW5kIGlmIHNvIGRpc3BsYXlzIHRoZSBBbm5vdGF0b3IjYWRkZXIuIElmIEBpZ25vcmVNb3VzZXVwIGlzXG4gICMgc2V0IHdpbGwgZG8gbm90aGluZy4gQWxzbyByZXNldHMgdGhlIEBtb3VzZUlzRG93biBwcm9wZXJ0eS5cbiAgI1xuICAjIGV2ZW50IC0gQSBtb3VzZXVwIEV2ZW50IG9iamVjdC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgY2hlY2tGb3JFbmRTZWxlY3Rpb246IChldmVudCkgPT5cbiAgICBAbW91c2VJc0Rvd24gPSBmYWxzZVxuXG4gICAgIyBUaGlzIHByZXZlbnRzIHRoZSBub3RlIGltYWdlIGZyb20ganVtcGluZyBhd2F5IG9uIHRoZSBtb3VzZXVwXG4gICAgIyBvZiBhIGNsaWNrIG9uIGljb24uXG4gICAgaWYgQGlnbm9yZU1vdXNldXBcbiAgICAgIHJldHVyblxuXG4gICAgIyBHZXQgdGhlIGN1cnJlbnRseSBzZWxlY3RlZCByYW5nZXMuXG4gICAgQHNlbGVjdGVkUmFuZ2VzID0gdGhpcy5nZXRTZWxlY3RlZFJhbmdlcygpXG5cbiAgICBmb3IgcmFuZ2UgaW4gQHNlbGVjdGVkUmFuZ2VzXG4gICAgICBjb250YWluZXIgPSByYW5nZS5jb21tb25BbmNlc3RvclxuICAgICAgaWYgJChjb250YWluZXIpLmhhc0NsYXNzKCdhbm5vdGF0b3ItaGwnKVxuICAgICAgICBjb250YWluZXIgPSAkKGNvbnRhaW5lcikucGFyZW50cygnW2NsYXNzIT1hbm5vdGF0b3ItaGxdJylbMF1cbiAgICAgIHJldHVybiBpZiB0aGlzLmlzQW5ub3RhdG9yKGNvbnRhaW5lcilcblxuICAgIGlmIGV2ZW50IGFuZCBAc2VsZWN0ZWRSYW5nZXMubGVuZ3RoXG4gICAgICBAYWRkZXJcbiAgICAgICAgLmNzcyhVdGlsLm1vdXNlUG9zaXRpb24oZXZlbnQsIEB3cmFwcGVyWzBdKSlcbiAgICAgICAgLnNob3coKVxuICAgIGVsc2VcbiAgICAgIEBhZGRlci5oaWRlKClcblxuICAjIFB1YmxpYzogRGV0ZXJtaW5lcyBpZiB0aGUgcHJvdmlkZWQgZWxlbWVudCBpcyBwYXJ0IG9mIHRoZSBhbm5vdGF0b3IgcGx1Z2luLlxuICAjIFVzZWZ1bCBmb3IgaWdub3JpbmcgbW91c2UgYWN0aW9ucyBvbiB0aGUgYW5ub3RhdG9yIGVsZW1lbnRzLlxuICAjIE5PVEU6IFRoZSBAd3JhcHBlciBpcyBub3QgaW5jbHVkZWQgaW4gdGhpcyBjaGVjay5cbiAgI1xuICAjIGVsZW1lbnQgLSBBbiBFbGVtZW50IG9yIFRleHROb2RlIHRvIGNoZWNrLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAjICAgYW5ub3RhdG9yLmlzQW5ub3RhdG9yKHNwYW4pICMgPT4gUmV0dXJucyBmYWxzZVxuICAjXG4gICMgICBhbm5vdGF0b3IuaXNBbm5vdGF0b3IoYW5ub3RhdG9yLnZpZXdlci5lbGVtZW50KSAjID0+IFJldHVybnMgdHJ1ZVxuICAjXG4gICMgUmV0dXJucyB0cnVlIGlmIHRoZSBlbGVtZW50IGlzIGEgY2hpbGQgb2YgYW4gYW5ub3RhdG9yIGVsZW1lbnQuXG4gIGlzQW5ub3RhdG9yOiAoZWxlbWVudCkgLT5cbiAgICAhISQoZWxlbWVudCkucGFyZW50cygpLmFkZEJhY2soKS5maWx0ZXIoJ1tjbGFzc149YW5ub3RhdG9yLV0nKS5ub3QoQHdyYXBwZXIpLmxlbmd0aFxuXG4gIGNvbmZpZ3VyZTogKEByZWdpc3RyeSkgLT5cbiAgICByZWdpc3RyeS5pbmNsdWRlKEFubm90YXRpb25Qcm92aWRlcilcblxuICBydW46IChAcmVnaXN0cnkpIC0+XG4gICAgIyBTZXQgdXAgdGhlIGNvcmUgaW50ZXJmYWNlIGNvbXBvbmVudHNcbiAgICB0aGlzLl9zZXR1cERvY3VtZW50RXZlbnRzKCkgdW5sZXNzIEBvcHRpb25zLnJlYWRPbmx5XG4gICAgdGhpcy5fc2V0dXBXcmFwcGVyKCkuX3NldHVwVmlld2VyKCkuX3NldHVwRWRpdG9yKClcbiAgICB0aGlzLl9zZXR1cER5bmFtaWNTdHlsZSgpXG5cbiAgICAjIENyZWF0ZSBhZGRlclxuICAgIHRoaXMuYWRkZXIgPSAkKHRoaXMuaHRtbC5hZGRlcikuYXBwZW5kVG8oQHdyYXBwZXIpLmhpZGUoKVxuXG4gICAgIyBEbyBpbml0aWFsIGxvYWRcbiAgICBpZiBAb3B0aW9ucy5sb2FkUXVlcnkgdGhlbiB0aGlzLmxvYWQoQG9wdGlvbnMubG9hZFF1ZXJ5KVxuXG4gICMgQW5ub3RhdG9yI2VsZW1lbnQgY2FsbGJhY2suIERpc3BsYXlzIHZpZXdlciB3aXRoIGFsbCBhbm5vdGF0aW9uc1xuICAjIGFzc29jaWF0ZWQgd2l0aCBoaWdobGlnaHQgRWxlbWVudHMgdW5kZXIgdGhlIGN1cnNvci5cbiAgI1xuICAjIGV2ZW50IC0gQSBtb3VzZW92ZXIgRXZlbnQgb2JqZWN0LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBvbkhpZ2hsaWdodE1vdXNlb3ZlcjogKGV2ZW50KSA9PlxuICAgICMgQ2FuY2VsIGFueSBwZW5kaW5nIGhpZGluZyBvZiB0aGUgdmlld2VyLlxuICAgIHRoaXMuY2xlYXJWaWV3ZXJIaWRlVGltZXIoKVxuXG4gICAgIyBEb24ndCBkbyBhbnl0aGluZyBpZiB3ZSdyZSBtYWtpbmcgYSBzZWxlY3Rpb24gb3JcbiAgICAjIGFscmVhZHkgZGlzcGxheWluZyB0aGUgdmlld2VyXG4gICAgcmV0dXJuIGZhbHNlIGlmIEBtb3VzZUlzRG93biBvciBAdmlld2VyLmlzU2hvd24oKVxuXG4gICAgYW5ub3RhdGlvbnMgPSAkKGV2ZW50LnRhcmdldClcbiAgICAgIC5wYXJlbnRzKCcuYW5ub3RhdG9yLWhsJylcbiAgICAgIC5hZGRCYWNrKClcbiAgICAgIC5tYXAgLT4gcmV0dXJuICQodGhpcykuZGF0YShcImFubm90YXRpb25cIilcblxuICAgIHRoaXMuc2hvd1ZpZXdlcigkLm1ha2VBcnJheShhbm5vdGF0aW9ucyksIFV0aWwubW91c2VQb3NpdGlvbihldmVudCwgQHdyYXBwZXJbMF0pKVxuXG4gICMgQW5ub3RhdG9yI2VsZW1lbnQgY2FsbGJhY2suIFNldHMgQGlnbm9yZU1vdXNldXAgdG8gdHJ1ZSB0byBwcmV2ZW50XG4gICMgdGhlIGFubm90YXRpb24gc2VsZWN0aW9uIGV2ZW50cyBmaXJpbmcgd2hlbiB0aGUgYWRkZXIgaXMgY2xpY2tlZC5cbiAgI1xuICAjIGV2ZW50IC0gQSBtb3VzZWRvd24gRXZlbnQgb2JqZWN0XG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIG9uQWRkZXJNb3VzZWRvd246IChldmVudCkgPT5cbiAgICBldmVudD8ucHJldmVudERlZmF1bHQoKVxuICAgIEBpZ25vcmVNb3VzZXVwID0gdHJ1ZVxuXG4gICMgQW5ub3RhdG9yI2VsZW1lbnQgY2FsbGJhY2suIERpc3BsYXlzIHRoZSBAZWRpdG9yIGluIHBsYWNlIG9mIHRoZSBAYWRkZXIgYW5kXG4gICMgbG9hZHMgaW4gYSBuZXdseSBjcmVhdGVkIGFubm90YXRpb24gT2JqZWN0LiBUaGUgY2xpY2sgZXZlbnQgaXMgdXNlZCBhcyB3ZWxsXG4gICMgYXMgdGhlIG1vdXNlZG93biBzbyB0aGF0IHdlIGdldCB0aGUgOmFjdGl2ZSBzdGF0ZSBvbiB0aGUgQGFkZGVyIHdoZW4gY2xpY2tlZFxuICAjXG4gICMgZXZlbnQgLSBBIG1vdXNlZG93biBFdmVudCBvYmplY3RcbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgb25BZGRlckNsaWNrOiAoZXZlbnQpID0+XG4gICAgZXZlbnQ/LnByZXZlbnREZWZhdWx0KClcblxuICAgICMgSGlkZSB0aGUgYWRkZXJcbiAgICBwb3NpdGlvbiA9IEBhZGRlci5wb3NpdGlvbigpXG4gICAgQGFkZGVyLmhpZGUoKVxuICAgIGFubm90YXRpb24gPSB7cmFuZ2VzOiBAc2VsZWN0ZWRSYW5nZXN9XG5cbiAgICAkLndoZW4oYW5ub3RhdGlvbilcblxuICAgICAgLmRvbmUgKGFubm90YXRpb24pID0+XG4gICAgICAgIHRoaXMucHVibGlzaCgnYmVmb3JlQW5ub3RhdGlvbkNyZWF0ZWQnLCBbYW5ub3RhdGlvbl0pXG5cbiAgICAgICMgU2V0IHVwIHRoZSBhbm5vdGF0aW9uXG4gICAgICAudGhlbiAoYW5ub3RhdGlvbikgPT5cbiAgICAgICAgdGhpcy5zZXR1cEFubm90YXRpb24oYW5ub3RhdGlvbilcblxuICAgICAgIyBTaG93IGEgdGVtcG9yYXJ5IGhpZ2hsaWdodCBzbyB0aGUgdXNlciBjYW4gc2VlIHdoYXQgdGhleSBzZWxlY3RlZFxuICAgICAgLmRvbmUgKGFubm90YXRpb24pID0+XG4gICAgICAgICQoYW5ub3RhdGlvbi5fbG9jYWwuaGlnaGxpZ2h0cykuYWRkQ2xhc3MoJ2Fubm90YXRvci1obC10ZW1wb3JhcnknKVxuXG4gICAgICAjIEVkaXQgdGhlIGFubm90YXRpb25cbiAgICAgIC50aGVuIChhbm5vdGF0aW9uKSA9PlxuICAgICAgICB0aGlzLmVkaXRBbm5vdGF0aW9uKGFubm90YXRpb24sIHBvc2l0aW9uKVxuICAgICAgLnRoZW4gKGFubm90YXRpb24pID0+XG4gICAgICAgIHRoaXMuYW5ub3RhdGlvbnMuY3JlYXRlKGFubm90YXRpb24pXG4gICAgICAgICAgIyBIYW5kbGUgc3RvcmFnZSBlcnJvcnNcbiAgICAgICAgICAuZmFpbChoYW5kbGVFcnJvcilcblxuICAgICAgIyBDbGVhbiB1cCB0aGUgaGlnaGxpZ2h0c1xuICAgICAgLmRvbmUgKGFubm90YXRpb24pID0+XG4gICAgICAgICQoYW5ub3RhdGlvbi5fbG9jYWwuaGlnaGxpZ2h0cykucmVtb3ZlQ2xhc3MoJ2Fubm90YXRvci1obC10ZW1wb3JhcnknKVxuXG4gICAgICAuZG9uZSAoYW5ub3RhdGlvbikgPT5cbiAgICAgICAgdGhpcy5wdWJsaXNoKCdhbm5vdGF0aW9uQ3JlYXRlZCcsIFthbm5vdGF0aW9uXSlcblxuICAgICAgIyBDbGVhbiB1cCAoaWYsIGZvciBleGFtcGxlLCBlZGl0aW5nIHdhcyBjYW5jZWxsZWQsIG9yIHN0b3JhZ2UgZmFpbGVkKVxuICAgICAgLmZhaWwodGhpcy5jbGVhbnVwQW5ub3RhdGlvbilcblxuICAjIEFubm90YXRvciN2aWV3ZXIgY2FsbGJhY2sgZnVuY3Rpb24uIERpc3BsYXlzIHRoZSBBbm5vdGF0b3IjZWRpdG9yIGluIHRoZVxuICAjIHBvc2l0aW9ucyBvZiB0aGUgQW5ub3RhdG9yI3ZpZXdlciBhbmQgbG9hZHMgdGhlIHBhc3NlZCBhbm5vdGF0aW9uIGZvclxuICAjIGVkaXRpbmcuXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBPYmplY3QgZm9yIGVkaXRpbmcuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIG9uRWRpdEFubm90YXRpb246IChhbm5vdGF0aW9uKSA9PlxuICAgIHBvc2l0aW9uID0gQHZpZXdlci5lbGVtZW50LnBvc2l0aW9uKClcbiAgICBAdmlld2VyLmhpZGUoKVxuXG4gICAgJC53aGVuKGFubm90YXRpb24pXG5cbiAgICAgIC5kb25lIChhbm5vdGF0aW9uKSA9PlxuICAgICAgICB0aGlzLnB1Ymxpc2goJ2JlZm9yZUFubm90YXRpb25VcGRhdGVkJywgW2Fubm90YXRpb25dKVxuXG4gICAgICAudGhlbiAoYW5ub3RhdGlvbikgPT5cbiAgICAgICAgdGhpcy5lZGl0QW5ub3RhdGlvbihhbm5vdGF0aW9uLCBwb3NpdGlvbilcbiAgICAgIC50aGVuIChhbm5vdGF0aW9uKSA9PlxuICAgICAgICB0aGlzLmFubm90YXRpb25zLnVwZGF0ZShhbm5vdGF0aW9uKVxuICAgICAgICAgICMgSGFuZGxlIHN0b3JhZ2UgZXJyb3JzXG4gICAgICAgICAgLmZhaWwoaGFuZGxlRXJyb3IpXG5cbiAgICAgIC5kb25lIChhbm5vdGF0aW9uKSA9PlxuICAgICAgICB0aGlzLnB1Ymxpc2goJ2Fubm90YXRpb25VcGRhdGVkJywgW2Fubm90YXRpb25dKVxuXG4jIENyZWF0ZSBuYW1lc3BhY2UgZm9yIEFubm90YXRvciBwbHVnaW5zXG5jbGFzcyBBbm5vdGF0b3IuUGx1Z2luIGV4dGVuZHMgRGVsZWdhdG9yXG4gIGNvbnN0cnVjdG9yOiAoZWxlbWVudCwgb3B0aW9ucykgLT5cbiAgICBzdXBlclxuXG4gIHBsdWdpbkluaXQ6IC0+XG5cbiAgZGVzdHJveTogLT5cbiAgICB0aGlzLnJlbW92ZUV2ZW50cygpXG5cbiMgU25pZmYgdGhlIGJyb3dzZXIgZW52aXJvbm1lbnQgYW5kIGF0dGVtcHQgdG8gYWRkIG1pc3NpbmcgZnVuY3Rpb25hbGl0eS5cbmcgPSBVdGlsLmdldEdsb2JhbCgpXG5cbmlmIG5vdCBnLmRvY3VtZW50Py5ldmFsdWF0ZT9cbiAgJC5nZXRTY3JpcHQoJ2h0dHA6Ly9hc3NldHMuYW5ub3RhdGVpdC5vcmcvdmVuZG9yL3hwYXRoLm1pbi5qcycpXG5cbmlmIG5vdCBnLmdldFNlbGVjdGlvbj9cbiAgJC5nZXRTY3JpcHQoJ2h0dHA6Ly9hc3NldHMuYW5ub3RhdGVpdC5vcmcvdmVuZG9yL2llcmFuZ2UubWluLmpzJylcblxuaWYgbm90IGcuSlNPTj9cbiAgJC5nZXRTY3JpcHQoJ2h0dHA6Ly9hc3NldHMuYW5ub3RhdGVpdC5vcmcvdmVuZG9yL2pzb24yLm1pbi5qcycpXG5cbiMgRW5zdXJlIHRoZSBOb2RlIGNvbnN0YW50cyBhcmUgZGVmaW5lZFxuaWYgbm90IGcuTm9kZT9cbiAgZy5Ob2RlID1cbiAgICBFTEVNRU5UX05PREUgICAgICAgICAgICAgICAgOiAgMVxuICAgIEFUVFJJQlVURV9OT0RFICAgICAgICAgICAgICA6ICAyXG4gICAgVEVYVF9OT0RFICAgICAgICAgICAgICAgICAgIDogIDNcbiAgICBDREFUQV9TRUNUSU9OX05PREUgICAgICAgICAgOiAgNFxuICAgIEVOVElUWV9SRUZFUkVOQ0VfTk9ERSAgICAgICA6ICA1XG4gICAgRU5USVRZX05PREUgICAgICAgICAgICAgICAgIDogIDZcbiAgICBQUk9DRVNTSU5HX0lOU1RSVUNUSU9OX05PREUgOiAgN1xuICAgIENPTU1FTlRfTk9ERSAgICAgICAgICAgICAgICA6ICA4XG4gICAgRE9DVU1FTlRfTk9ERSAgICAgICAgICAgICAgIDogIDlcbiAgICBET0NVTUVOVF9UWVBFX05PREUgICAgICAgICAgOiAxMFxuICAgIERPQ1VNRU5UX0ZSQUdNRU5UX05PREUgICAgICA6IDExXG4gICAgTk9UQVRJT05fTk9ERSAgICAgICAgICAgICAgIDogMTJcblxuXG4jIEV4cG9ydCBvdGhlciBtb2R1bGVzIGZvciB1c2UgaW4gcGx1Z2lucy5cbkFubm90YXRvci5EZWxlZ2F0b3IgPSBEZWxlZ2F0b3JcbkFubm90YXRvci5SYW5nZSA9IFJhbmdlXG5Bbm5vdGF0b3IuVXRpbCA9IFV0aWxcbkFubm90YXRvci5XaWRnZXQgPSBXaWRnZXRcbkFubm90YXRvci5WaWV3ZXIgPSBWaWV3ZXJcbkFubm90YXRvci5FZGl0b3IgPSBFZGl0b3JcbkFubm90YXRvci5Ob3RpZmljYXRpb24gPSBOb3RpZmljYXRpb25cblxuIyBBdHRhY2ggbm90aWZpY2F0aW9uIG1ldGhvZHMgdG8gdGhlIEFubm90YXRpb24gb2JqZWN0XG5ub3RpZmljYXRpb24gPSBuZXcgTm90aWZpY2F0aW9uXG5Bbm5vdGF0b3Iuc2hvd05vdGlmaWNhdGlvbiA9IG5vdGlmaWNhdGlvbi5zaG93XG5Bbm5vdGF0b3IuaGlkZU5vdGlmaWNhdGlvbiA9IG5vdGlmaWNhdGlvbi5oaWRlXG5cbiMgRXhwb3NlIGEgZ2xvYmFsIGluc3RhbmNlIHJlZ2lzdHJ5XG5Bbm5vdGF0b3IuX2luc3RhbmNlcyA9IFtdXG5cbiMgQmluZCBnZXR0ZXh0IGhlbHBlciBzbyBwbHVnaW5zIGNhbiB1c2UgbG9jYWxpc2F0aW9uLlxuQW5ub3RhdG9yLl90ID0gX3RcblxuIyBSZXR1cm5zIHRydWUgaWYgdGhlIEFubm90YXRvciBjYW4gYmUgdXNlZCBpbiB0aGUgY3VycmVudCBicm93c2VyLlxuQW5ub3RhdG9yLnN1cHBvcnRlZCA9IC0+ICgtPiAhIXRoaXMuZ2V0U2VsZWN0aW9uKSgpXG5cbiMgUmVzdG9yZXMgdGhlIEFubm90YXRvciBwcm9wZXJ0eSBvbiB0aGUgZ2xvYmFsIG9iamVjdCB0byBpdCdzXG4jIHByZXZpb3VzIHZhbHVlIGFuZCByZXR1cm5zIHRoZSBBbm5vdGF0b3IuXG5Bbm5vdGF0b3Iubm9Db25mbGljdCA9IC0+XG4gIFV0aWwuZ2V0R2xvYmFsKCkuQW5ub3RhdG9yID0gX0Fubm90YXRvclxuICB0aGlzXG5cbiMgQ3JlYXRlIGdsb2JhbCBhY2Nlc3MgZm9yIEFubm90YXRvclxuJC5mbi5hbm5vdGF0b3IgPSAob3B0aW9ucykgLT5cbiAgYXJncyA9IEFycmF5OjpzbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgdGhpcy5lYWNoIC0+XG4gICAgIyBjaGVjayB0aGUgZGF0YSgpIGNhY2hlLCBpZiBpdCdzIHRoZXJlIHdlJ2xsIGNhbGwgdGhlIG1ldGhvZCByZXF1ZXN0ZWRcbiAgICBpbnN0YW5jZSA9ICQuZGF0YSh0aGlzLCAnYW5ub3RhdG9yJylcbiAgICBpZiBpbnN0YW5jZVxuICAgICAgb3B0aW9ucyAmJiBpbnN0YW5jZVtvcHRpb25zXS5hcHBseShpbnN0YW5jZSwgYXJncylcbiAgICBlbHNlXG4gICAgICBpbnN0YW5jZSA9IG5ldyBBbm5vdGF0b3IodGhpcywgb3B0aW9ucylcbiAgICAgICQuZGF0YSh0aGlzLCAnYW5ub3RhdG9yJywgaW5zdGFuY2UpXG5cblxuIyBFeHBvcnQgQW5ub3RhdG9yIG9iamVjdC5cbm1vZHVsZS5leHBvcnRzID0gQW5ub3RhdG9yXG4iLCJVdGlsID0gcmVxdWlyZSAnLi91dGlsJ1xuXG5cbiMgUHVibGljOiBEZWxlZ2F0b3IgaXMgdGhlIGJhc2UgY2xhc3MgdGhhdCBhbGwgb2YgQW5ub3RhdG9ycyBvYmplY3RzIGluaGVyaXRcbiMgZnJvbS4gSXQgcHJvdmlkZXMgYmFzaWMgZnVuY3Rpb25hbGl0eSBzdWNoIGFzIGluc3RhbmNlIG9wdGlvbnMsIGV2ZW50XG4jIGRlbGVnYXRpb24gYW5kIHB1Yi9zdWIgbWV0aG9kcy5cbmNsYXNzIERlbGVnYXRvclxuICAjIFB1YmxpYzogRXZlbnRzIG9iamVjdC4gVGhpcyBjb250YWlucyBhIGtleS9wYWlyIGhhc2ggb2YgZXZlbnRzL21ldGhvZHMgdGhhdFxuICAjIHNob3VsZCBiZSBib3VuZC4gU2VlIERlbGVnYXRvciNhZGRFdmVudHMoKSBmb3IgdXNhZ2UuXG4gIGV2ZW50czoge31cblxuICAjIFB1YmxpYzogT3B0aW9ucyBvYmplY3QuIEV4dGVuZGVkIG9uIGluaXRpYWxpc2F0aW9uLlxuICBvcHRpb25zOiB7fVxuXG4gICMgQSBqUXVlcnkgb2JqZWN0IHdyYXBwaW5nIHRoZSBET00gRWxlbWVudCBwcm92aWRlZCBvbiBpbml0aWFsaXNhdGlvbi5cbiAgZWxlbWVudDogbnVsbFxuXG4gICMgUHVibGljOiBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0aGF0IHNldHMgdXAgdGhlIGluc3RhbmNlLiBCaW5kcyB0aGUgQGV2ZW50c1xuICAjIGhhc2ggYW5kIGV4dGVuZHMgdGhlIEBvcHRpb25zIG9iamVjdC5cbiAgI1xuICAjIGVsZW1lbnQgLSBUaGUgRE9NIGVsZW1lbnQgdGhhdCB0aGlzIGludGFuY2UgcmVwcmVzZW50cy5cbiAgIyBvcHRpb25zIC0gQW4gT2JqZWN0IGxpdGVyYWwgb2Ygb3B0aW9ucy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGVsZW1lbnQgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ215LWVsZW1lbnQnKVxuICAjICAgaW5zdGFuY2UgPSBuZXcgRGVsZWdhdG9yKGVsZW1lbnQsIHtcbiAgIyAgICAgb3B0aW9uOiAnbXktb3B0aW9uJ1xuICAjICAgfSlcbiAgI1xuICAjIFJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgRGVsZWdhdG9yLlxuICBjb25zdHJ1Y3RvcjogKGVsZW1lbnQsIG9wdGlvbnMpIC0+XG4gICAgQG9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgQG9wdGlvbnMsIG9wdGlvbnMpXG4gICAgQGVsZW1lbnQgPSAkKGVsZW1lbnQpXG5cbiAgICAjIERlbGVnYXRvciBjcmVhdGVzIGNsb3N1cmVzIGZvciBlYWNoIGV2ZW50IGl0IGJpbmRzLiBUaGlzIGlzIGEgcHJpdmF0ZVxuICAgICMgcmVnaXN0cnkgb2YgY3JlYXRlZCBjbG9zdXJlcywgdXNlZCB0byBlbmFibGUgZXZlbnQgdW5iaW5kaW5nLlxuICAgIEBfY2xvc3VyZXMgPSB7fVxuXG4gICAgdGhpcy5hZGRFdmVudHMoKVxuXG4gICMgUHVibGljOiBiaW5kcyB0aGUgZnVuY3Rpb24gbmFtZXMgaW4gdGhlIEBldmVudHMgT2JqZWN0IHRvIHRoZWlyIGV2ZW50cy5cbiAgI1xuICAjIFRoZSBAZXZlbnRzIE9iamVjdCBzaG91bGQgYmUgYSBzZXQgb2Yga2V5L3ZhbHVlIHBhaXJzIHdoZXJlIHRoZSBrZXkgaXMgdGhlXG4gICMgZXZlbnQgbmFtZSB3aXRoIG9wdGlvbmFsIENTUyBzZWxlY3Rvci4gVGhlIHZhbHVlIHNob3VsZCBiZSBhIFN0cmluZyBtZXRob2RcbiAgIyBuYW1lIG9uIHRoZSBjdXJyZW50IGNsYXNzLlxuICAjXG4gICMgVGhpcyBpcyBjYWxsZWQgYnkgdGhlIGRlZmF1bHQgRGVsZWdhdG9yIGNvbnN0cnVjdG9yIGFuZCBzbyBzaG91bGRuJ3QgdXN1YWxseVxuICAjIG5lZWQgdG8gYmUgY2FsbGVkIGJ5IHRoZSB1c2VyLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBUaGlzIHdpbGwgYmluZCB0aGUgY2xpY2tlZEVsZW1lbnQoKSBtZXRob2QgdG8gdGhlIGNsaWNrIGV2ZW50IG9uIEBlbGVtZW50LlxuICAjICAgQG9wdGlvbnMgPSB7XCJjbGlja1wiOiBcImNsaWNrZWRFbGVtZW50XCJ9XG4gICNcbiAgIyAgICMgVGhpcyB3aWxsIGRlbGVnYXRlIHRoZSBzdWJtaXRGb3JtKCkgbWV0aG9kIHRvIHRoZSBzdWJtaXQgZXZlbnQgb24gdGhlXG4gICMgICAjIGZvcm0gd2l0aGluIHRoZSBAZWxlbWVudC5cbiAgIyAgIEBvcHRpb25zID0ge1wiZm9ybSBzdWJtaXRcIjogXCJzdWJtaXRGb3JtXCJ9XG4gICNcbiAgIyAgICMgVGhpcyB3aWxsIGJpbmQgdGhlIHVwZGF0ZUFubm90YXRpb25TdG9yZSgpIG1ldGhvZCB0byB0aGUgY3VzdG9tXG4gICMgICAjIGFubm90YXRpb246c2F2ZSBldmVudC4gTk9URTogQmVjYXVzZSB0aGlzIGlzIGEgY3VzdG9tIGV2ZW50IHRoZVxuICAjICAgIyBEZWxlZ2F0b3Ijc3Vic2NyaWJlKCkgbWV0aG9kIHdpbGwgYmUgdXNlZCBhbmQgdXBkYXRlQW5ub3RhdGlvblN0b3JlKClcbiAgIyAgICMgd2lsbCBub3QgcmVjaWV2ZSBhbiBldmVudCBwYXJhbWV0ZXIgbGlrZSB0aGUgcHJldmlvdXMgdHdvIGV4YW1wbGVzLlxuICAjICAgQG9wdGlvbnMgPSB7XCJhbm5vdGF0aW9uOnNhdmVcIjogXCJ1cGRhdGVBbm5vdGF0aW9uU3RvcmVcIn1cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgYWRkRXZlbnRzOiAtPlxuICAgIGZvciBldmVudCBpbiBEZWxlZ2F0b3IuX3BhcnNlRXZlbnRzKEBldmVudHMpXG4gICAgICB0aGlzLl9hZGRFdmVudChldmVudC5zZWxlY3RvciwgZXZlbnQuZXZlbnQsIGV2ZW50LmZ1bmN0aW9uTmFtZSlcblxuICAjIFB1YmxpYzogdW5iaW5kcyBmdW5jdGlvbnMgcHJldmlvdXNseSBib3VuZCB0byBldmVudHMgYnkgYWRkRXZlbnRzKCkuXG4gICNcbiAgIyBUaGUgQGV2ZW50cyBPYmplY3Qgc2hvdWxkIGJlIGEgc2V0IG9mIGtleS92YWx1ZSBwYWlycyB3aGVyZSB0aGUga2V5IGlzIHRoZVxuICAjIGV2ZW50IG5hbWUgd2l0aCBvcHRpb25hbCBDU1Mgc2VsZWN0b3IuIFRoZSB2YWx1ZSBzaG91bGQgYmUgYSBTdHJpbmcgbWV0aG9kXG4gICMgbmFtZSBvbiB0aGUgY3VycmVudCBjbGFzcy5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgcmVtb3ZlRXZlbnRzOiAtPlxuICAgIGZvciBldmVudCBpbiBEZWxlZ2F0b3IuX3BhcnNlRXZlbnRzKEBldmVudHMpXG4gICAgICB0aGlzLl9yZW1vdmVFdmVudChldmVudC5zZWxlY3RvciwgZXZlbnQuZXZlbnQsIGV2ZW50LmZ1bmN0aW9uTmFtZSlcblxuICAjIEJpbmRzIGFuIGV2ZW50IHRvIGEgY2FsbGJhY2sgZnVuY3Rpb24gcmVwcmVzZW50ZWQgYnkgYSBTdHJpbmcuIEEgc2VsZWN0b3JcbiAgIyBjYW4gYmUgcHJvdmlkZWQgaW4gb3JkZXIgdG8gd2F0Y2ggZm9yIGV2ZW50cyBvbiBhIGNoaWxkIGVsZW1lbnQuXG4gICNcbiAgIyBUaGUgZXZlbnQgY2FuIGJlIGFueSBzdGFuZGFyZCBldmVudCBzdXBwb3J0ZWQgYnkgalF1ZXJ5IG9yIGEgY3VzdG9tIFN0cmluZy5cbiAgIyBJZiBhIGN1c3RvbSBzdHJpbmcgaXMgdXNlZCB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gd2lsbCBub3QgcmVjZWl2ZSBhbiBldmVudFxuICAjIG9iamVjdCBhcyBpdHMgZmlyc3QgcGFyYW1ldGVyLlxuICAjXG4gICMgc2VsZWN0b3IgICAgIC0gU2VsZWN0b3IgU3RyaW5nIG1hdGNoaW5nIGNoaWxkIGVsZW1lbnRzLiAoZGVmYXVsdDogJycpXG4gICMgZXZlbnQgICAgICAgIC0gVGhlIGV2ZW50IHRvIGxpc3RlbiBmb3IuXG4gICMgZnVuY3Rpb25OYW1lIC0gQSBTdHJpbmcgZnVuY3Rpb24gbmFtZSB0byBiaW5kIHRvIHRoZSBldmVudC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgTGlzdGVucyBmb3IgYWxsIGNsaWNrIGV2ZW50cyBvbiBpbnN0YW5jZS5lbGVtZW50LlxuICAjICAgaW5zdGFuY2UuX2FkZEV2ZW50KCcnLCAnY2xpY2snLCAnb25DbGljaycpXG4gICNcbiAgIyAgICMgRGVsZWdhdGVzIHRoZSBpbnN0YW5jZS5vbklucHV0Rm9jdXMoKSBtZXRob2QgdG8gZm9jdXMgZXZlbnRzIG9uIGFsbFxuICAjICAgIyBmb3JtIGlucHV0cyB3aXRoaW4gaW5zdGFuY2UuZWxlbWVudC5cbiAgIyAgIGluc3RhbmNlLl9hZGRFdmVudCgnZm9ybSA6aW5wdXQnLCAnZm9jdXMnLCAnb25JbnB1dEZvY3VzJylcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmLlxuICBfYWRkRXZlbnQ6IChzZWxlY3RvciwgZXZlbnQsIGZ1bmN0aW9uTmFtZSkgLT5cbiAgICBjbG9zdXJlID0gPT4gdGhpc1tmdW5jdGlvbk5hbWVdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcblxuICAgIGlmIHNlbGVjdG9yID09ICcnIGFuZCBEZWxlZ2F0b3IuX2lzQ3VzdG9tRXZlbnQoZXZlbnQpXG4gICAgICB0aGlzLnN1YnNjcmliZShldmVudCwgY2xvc3VyZSlcbiAgICBlbHNlXG4gICAgICBAZWxlbWVudC5kZWxlZ2F0ZShzZWxlY3RvciwgZXZlbnQsIGNsb3N1cmUpXG5cbiAgICBAX2Nsb3N1cmVzW1wiI3tzZWxlY3Rvcn0vI3tldmVudH0vI3tmdW5jdGlvbk5hbWV9XCJdID0gY2xvc3VyZVxuXG4gICAgdGhpc1xuXG4gICMgVW5iaW5kcyBhIGZ1bmN0aW9uIHByZXZpb3VzbHkgYm91bmQgdG8gYW4gZXZlbnQgYnkgdGhlIF9hZGRFdmVudCBtZXRob2QuXG4gICNcbiAgIyBUYWtlcyB0aGUgc2FtZSBhcmd1bWVudHMgYXMgX2FkZEV2ZW50KCksIGFuZCBhbiBldmVudCB3aWxsIG9ubHkgYmVcbiAgIyBzdWNjZXNzZnVsbHkgdW5ib3VuZCBpZiB0aGUgYXJndW1lbnRzIHRvIHJlbW92ZUV2ZW50KCkgYXJlIGV4YWN0bHkgdGhlIHNhbWVcbiAgIyBhcyB0aGUgb3JpZ2luYWwgYXJndW1lbnRzIHRvIF9hZGRFdmVudCgpLiBUaGlzIHdvdWxkIHVzdWFsbHkgYmUgY2FsbGVkIGJ5XG4gICMgX3JlbW92ZUV2ZW50cygpLlxuICAjXG4gICMgc2VsZWN0b3IgICAgIC0gU2VsZWN0b3IgU3RyaW5nIG1hdGNoaW5nIGNoaWxkIGVsZW1lbnRzLiAoZGVmYXVsdDogJycpXG4gICMgZXZlbnQgICAgICAgIC0gVGhlIGV2ZW50IHRvIGxpc3RlbiBmb3IuXG4gICMgZnVuY3Rpb25OYW1lIC0gQSBTdHJpbmcgZnVuY3Rpb24gbmFtZSB0byBiaW5kIHRvIHRoZSBldmVudC5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmLlxuICBfcmVtb3ZlRXZlbnQ6IChzZWxlY3RvciwgZXZlbnQsIGZ1bmN0aW9uTmFtZSkgLT5cbiAgICBjbG9zdXJlID0gQF9jbG9zdXJlc1tcIiN7c2VsZWN0b3J9LyN7ZXZlbnR9LyN7ZnVuY3Rpb25OYW1lfVwiXVxuXG4gICAgaWYgc2VsZWN0b3IgPT0gJycgYW5kIERlbGVnYXRvci5faXNDdXN0b21FdmVudChldmVudClcbiAgICAgIHRoaXMudW5zdWJzY3JpYmUoZXZlbnQsIGNsb3N1cmUpXG4gICAgZWxzZVxuICAgICAgQGVsZW1lbnQudW5kZWxlZ2F0ZShzZWxlY3RvciwgZXZlbnQsIGNsb3N1cmUpXG5cbiAgICBkZWxldGUgQF9jbG9zdXJlc1tcIiN7c2VsZWN0b3J9LyN7ZXZlbnR9LyN7ZnVuY3Rpb25OYW1lfVwiXVxuXG4gICAgdGhpc1xuXG4gICMgUHVibGljOiBGaXJlcyBhbiBldmVudCBhbmQgY2FsbHMgYWxsIHN1YnNjcmliZWQgY2FsbGJhY2tzIHdpdGggcGFyYW1ldGVyc1xuICAjIHByb3ZpZGVkLiBUaGlzIGlzIGVzc2VudGlhbGx5IGFuIGFsaWFzIHRvIEJhY2tib25lLkV2ZW50cyAudHJpZ2dlcigpXG4gICMgZXhjZXB0IHRoYXQgdGhlIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGluIGFuIEFycmF5IGFzIHRoZSBzZWNvbmQgcGFyYW1ldGVyXG4gICMgcmF0aGVyIHRoYW4gdXNpbmcgYSB2YXJpYWJsZSBudW1iZXIgb2YgYXJndW1lbnRzLlxuICBwdWJsaXNoOiAobmFtZSwgYXJncz1bXSkgLT5cbiAgICB0aGlzLnRyaWdnZXIuYXBwbHkodGhpcywgW25hbWUsIGFyZ3MuLi5dKVxuXG4gICMgUHVibGljOiBBbiBhbGlhcyBmb3IgLm9uKCkgZnJvbSBCYWNrYm9uZS5FdmVudHNcbiAgc3Vic2NyaWJlOiAoZXZlbnQsIGNhbGxiYWNrLCBjb250ZXh0PXRoaXMpIC0+XG4gICAgdGhpcy5vbihldmVudCwgY2FsbGJhY2ssIGNvbnRleHQpXG5cbiAgIyBQdWJsaWM6IEFuIGFsaWFzIGZvciAub2ZmKCkgZnJvbSBCYWNrYm9uZS5FdmVudHNcbiAgdW5zdWJzY3JpYmU6IChldmVudCwgY2FsbGJhY2ssIGNvbnRleHQ9dGhpcykgLT5cbiAgICB0aGlzLm9mZihldmVudCwgY2FsbGJhY2ssIGNvbnRleHQpXG5cblxuIyBQYXJzZSB0aGUgQGV2ZW50cyBvYmplY3Qgb2YgYSBEZWxlZ2F0b3IgaW50byBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmdcbiMgc3RyaW5nLXZhbHVlZCBcInNlbGVjdG9yXCIsIFwiZXZlbnRcIiwgYW5kIFwiZnVuY1wiIGtleXMuXG5EZWxlZ2F0b3IuX3BhcnNlRXZlbnRzID0gKGV2ZW50c09iaikgLT5cbiAgICBldmVudHMgPSBbXVxuICAgIGZvciBzZWwsIGZ1bmN0aW9uTmFtZSBvZiBldmVudHNPYmpcbiAgICAgIFtzZWxlY3Rvci4uLiwgZXZlbnRdID0gc2VsLnNwbGl0ICcgJ1xuICAgICAgZXZlbnRzLnB1c2goe1xuICAgICAgICBzZWxlY3Rvcjogc2VsZWN0b3Iuam9pbignICcpLFxuICAgICAgICBldmVudDogZXZlbnQsXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogZnVuY3Rpb25OYW1lXG4gICAgICB9KVxuICAgIHJldHVybiBldmVudHNcblxuXG4jIE5hdGl2ZSBqUXVlcnkgZXZlbnRzIHRoYXQgc2hvdWxkIHJlY2lldmUgYW4gZXZlbnQgb2JqZWN0LiBQbHVnaW5zIGNhblxuIyBhZGQgdGhlaXIgb3duIG1ldGhvZHMgdG8gdGhpcyBpZiByZXF1aXJlZC5cbkRlbGVnYXRvci5uYXRpdmVzID0gZG8gLT5cbiAgc3BlY2lhbHMgPSAoa2V5IGZvciBvd24ga2V5LCB2YWwgb2YgJC5ldmVudC5zcGVjaWFsKVxuICBcIlwiXCJcbiAgYmx1ciBmb2N1cyBmb2N1c2luIGZvY3Vzb3V0IGxvYWQgcmVzaXplIHNjcm9sbCB1bmxvYWQgY2xpY2sgZGJsY2xpY2tcbiAgbW91c2Vkb3duIG1vdXNldXAgbW91c2Vtb3ZlIG1vdXNlb3ZlciBtb3VzZW91dCBtb3VzZWVudGVyIG1vdXNlbGVhdmVcbiAgY2hhbmdlIHNlbGVjdCBzdWJtaXQga2V5ZG93biBrZXlwcmVzcyBrZXl1cCBlcnJvclxuICBcIlwiXCIuc3BsaXQoL1teYS16XSsvKS5jb25jYXQoc3BlY2lhbHMpXG5cblxuIyBDaGVja3MgdG8gc2VlIGlmIHRoZSBwcm92aWRlZCBldmVudCBpcyBhIERPTSBldmVudCBzdXBwb3J0ZWQgYnkgalF1ZXJ5IG9yXG4jIGEgY3VzdG9tIHVzZXIgZXZlbnQuXG4jXG4jIGV2ZW50IC0gU3RyaW5nIGV2ZW50IG5hbWUuXG4jXG4jIEV4YW1wbGVzXG4jXG4jICAgRGVsZWdhdG9yLl9pc0N1c3RvbUV2ZW50KCdjbGljaycpICAgICAgICAgICAgICAjID0+IGZhbHNlXG4jICAgRGVsZWdhdG9yLl9pc0N1c3RvbUV2ZW50KCdtb3VzZWRvd24nKSAgICAgICAgICAjID0+IGZhbHNlXG4jICAgRGVsZWdhdG9yLl9pc0N1c3RvbUV2ZW50KCdhbm5vdGF0aW9uOmNyZWF0ZWQnKSAjID0+IHRydWVcbiNcbiMgUmV0dXJucyB0cnVlIGlmIGV2ZW50IGlzIGEgY3VzdG9tIHVzZXIgZXZlbnQuXG5EZWxlZ2F0b3IuX2lzQ3VzdG9tRXZlbnQgPSAoZXZlbnQpIC0+XG4gIFtldmVudF0gPSBldmVudC5zcGxpdCgnLicpXG4gICQuaW5BcnJheShldmVudCwgRGVsZWdhdG9yLm5hdGl2ZXMpID09IC0xXG5cblxuIyBNaXggaW4gYmFja2JvbmUgZXZlbnRzXG5CYWNrYm9uZUV2ZW50cyA9IHJlcXVpcmUgJ2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lJ1xuQmFja2JvbmVFdmVudHMubWl4aW4oRGVsZWdhdG9yOjopXG5cbiMgRXhwb3J0IERlbGVnYXRvciBvYmplY3Rcbm1vZHVsZS5leHBvcnRzID0gRGVsZWdhdG9yXG4iLCJVdGlsID0gcmVxdWlyZSAnLi91dGlsJ1xuV2lkZ2V0ID0gcmVxdWlyZSAnLi93aWRnZXQnXG5cblxuX3QgPSBVdGlsLlRyYW5zbGF0aW9uU3RyaW5nXG5cblxuIyBQdWJsaWM6IENyZWF0ZXMgYW4gZWxlbWVudCBmb3IgZWRpdGluZyBhbm5vdGF0aW9ucy5cbmNsYXNzIEVkaXRvciBleHRlbmRzIFdpZGdldFxuXG4gICMgRXZlbnRzIHRvIGJlIGJvdW5kIHRvIEBlbGVtZW50LlxuICBldmVudHM6XG4gICAgXCJmb3JtIHN1Ym1pdFwiOiAgICAgICAgICAgICAgICAgXCJzdWJtaXRcIlxuICAgIFwiLmFubm90YXRvci1zYXZlIGNsaWNrXCI6ICAgICAgIFwic3VibWl0XCJcbiAgICBcIi5hbm5vdGF0b3ItY2FuY2VsIGNsaWNrXCI6ICAgICBcImhpZGVcIlxuICAgIFwiLmFubm90YXRvci1jYW5jZWwgbW91c2VvdmVyXCI6IFwib25DYW5jZWxCdXR0b25Nb3VzZW92ZXJcIlxuICAgIFwidGV4dGFyZWEga2V5ZG93blwiOiAgICAgICAgICAgIFwicHJvY2Vzc0tleXByZXNzXCJcblxuICAjIENsYXNzZXMgdG8gdG9nZ2xlIHN0YXRlLlxuICBjbGFzc2VzOlxuICAgIGhpZGU6ICAnYW5ub3RhdG9yLWhpZGUnXG4gICAgZm9jdXM6ICdhbm5vdGF0b3ItZm9jdXMnXG5cbiAgIyBIVE1MIHRlbXBsYXRlIGZvciBAZWxlbWVudC5cbiAgaHRtbDogXCJcIlwiXG4gICAgICAgIDxkaXYgY2xhc3M9XCJhbm5vdGF0b3Itb3V0ZXIgYW5ub3RhdG9yLWVkaXRvclwiPlxuICAgICAgICAgIDxmb3JtIGNsYXNzPVwiYW5ub3RhdG9yLXdpZGdldFwiPlxuICAgICAgICAgICAgPHVsIGNsYXNzPVwiYW5ub3RhdG9yLWxpc3RpbmdcIj48L3VsPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFubm90YXRvci1jb250cm9sc1wiPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiI2NhbmNlbFwiIGNsYXNzPVwiYW5ub3RhdG9yLWNhbmNlbFwiPlwiXCJcIiArIF90KCdDYW5jZWwnKSArIFwiXCJcIjwvYT5cbiAgICAgICAgICAgICAgPGEgaHJlZj1cIiNzYXZlXCIgY2xhc3M9XCJhbm5vdGF0b3Itc2F2ZSBhbm5vdGF0b3ItZm9jdXNcIj5cIlwiXCIgKyBfdCgnU2F2ZScpICsgXCJcIlwiPC9hPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9mb3JtPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgXCJcIlwiXG5cbiAgb3B0aW9uczoge30gIyBDb25maWd1cmF0aW9uIG9wdGlvbnNcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiB0aGUgRWRpdG9yIG9iamVjdC4gVGhpcyB3aWxsIGNyZWF0ZSB0aGVcbiAgIyBAZWxlbWVudCBmcm9tIHRoZSBAaHRtbCBzdHJpbmcgYW5kIHNldCB1cCBhbGwgZXZlbnRzLlxuICAjXG4gICMgb3B0aW9ucyAtIEFuIE9iamVjdCBsaXRlcmFsIGNvbnRhaW5pbmcgb3B0aW9ucy4gVGhlcmUgYXJlIGN1cnJlbnRseSBub1xuICAjICAgICAgICAgICBvcHRpb25zIGltcGxlbWVudGVkLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBDcmVhdGVzIGEgbmV3IGVkaXRvciwgYWRkcyBhIGN1c3RvbSBmaWVsZCBhbmRcbiAgIyAgICMgbG9hZHMgYW4gYW5ub3RhdGlvbiBmb3IgZWRpdGluZy5cbiAgIyAgIGVkaXRvciA9IG5ldyBBbm5vdGF0b3IuRWRpdG9yXG4gICMgICBlZGl0b3IuYWRkRmllbGQoe1xuICAjICAgICBsYWJlbDogJ015IGN1c3RvbSBpbnB1dCBmaWVsZCcsXG4gICMgICAgIHR5cGU6ICAndGV4dGFyZWEnXG4gICMgICAgIGxvYWQ6ICBzb21lTG9hZENhbGxiYWNrXG4gICMgICAgIHNhdmU6ICBzb21lU2F2ZUNhbGxiYWNrXG4gICMgICB9KVxuICAjICAgZWRpdG9yLmxvYWQoYW5ub3RhdGlvbilcbiAgI1xuICAjIFJldHVybnMgYSBuZXcgRWRpdG9yIGluc3RhbmNlLlxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XG4gICAgc3VwZXIgJChAaHRtbClbMF0sIG9wdGlvbnNcblxuICAgIEBmaWVsZHMgPSBbXVxuICAgIEBhbm5vdGF0aW9uID0ge31cblxuICAjIFB1YmxpYzogRGlzcGxheXMgdGhlIEVkaXRvciBhbmQgZmlyZXMgYSBcInNob3dcIiBldmVudC5cbiAgIyBDYW4gYmUgdXNlZCBhcyBhbiBldmVudCBjYWxsYmFjayBhbmQgd2lsbCBjYWxsIEV2ZW50I3ByZXZlbnREZWZhdWx0KClcbiAgIyBvbiB0aGUgc3VwcGxpZWQgZXZlbnQuXG4gICNcbiAgIyBldmVudCAtIEV2ZW50IG9iamVjdCBwcm92aWRlZCBpZiBtZXRob2QgaXMgY2FsbGVkIGJ5IGV2ZW50XG4gICMgICAgICAgICBsaXN0ZW5lciAoZGVmYXVsdDp1bmRlZmluZWQpXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIERpc3BsYXlzIHRoZSBlZGl0b3IuXG4gICMgICBlZGl0b3Iuc2hvdygpXG4gICNcbiAgIyAgICMgRGlzcGxheXMgdGhlIGVkaXRvciBvbiBjbGljayAocHJldmVudHMgZGVmYXVsdCBhY3Rpb24pLlxuICAjICAgJCgnYS5zaG93LWVkaXRvcicpLmJpbmQoJ2NsaWNrJywgZWRpdG9yLnNob3cpXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZi5cbiAgc2hvdzogKGV2ZW50KSA9PlxuICAgIFV0aWwucHJldmVudEV2ZW50RGVmYXVsdCBldmVudFxuXG4gICAgQGVsZW1lbnQucmVtb3ZlQ2xhc3MoQGNsYXNzZXMuaGlkZSlcbiAgICBAZWxlbWVudC5maW5kKCcuYW5ub3RhdG9yLXNhdmUnKS5hZGRDbGFzcyhAY2xhc3Nlcy5mb2N1cylcblxuICAgICMgaW52ZXJ0IGlmIG5lY2Vzc2FyeVxuICAgIHRoaXMuY2hlY2tPcmllbnRhdGlvbigpXG5cbiAgICAjIGdpdmUgbWFpbiB0ZXh0YXJlYSBmb2N1c1xuICAgIEBlbGVtZW50LmZpbmQoXCI6aW5wdXQ6Zmlyc3RcIikuZm9jdXMoKVxuXG4gICAgdGhpcy5zZXR1cERyYWdnYWJsZXMoKVxuXG4gICAgdGhpcy5wdWJsaXNoKCdzaG93JylcblxuXG4gICMgUHVibGljOiBIaWRlcyB0aGUgRWRpdG9yIGFuZCBmaXJlcyBhIFwiaGlkZVwiIGV2ZW50LiBDYW4gYmUgdXNlZCBhcyBhbiBldmVudFxuICAjIGNhbGxiYWNrIGFuZCB3aWxsIGNhbGwgRXZlbnQjcHJldmVudERlZmF1bHQoKSBvbiB0aGUgc3VwcGxpZWQgZXZlbnQuXG4gICNcbiAgIyBldmVudCAtIEV2ZW50IG9iamVjdCBwcm92aWRlZCBpZiBtZXRob2QgaXMgY2FsbGVkIGJ5IGV2ZW50XG4gICMgICAgICAgICBsaXN0ZW5lciAoZGVmYXVsdDp1bmRlZmluZWQpXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIEhpZGVzIHRoZSBlZGl0b3IuXG4gICMgICBlZGl0b3IuaGlkZSgpXG4gICNcbiAgIyAgICMgSGlkZSB0aGUgZWRpdG9yIG9uIGNsaWNrIChwcmV2ZW50cyBkZWZhdWx0IGFjdGlvbikuXG4gICMgICAkKCdhLmhpZGUtZWRpdG9yJykuYmluZCgnY2xpY2snLCBlZGl0b3IuaGlkZSlcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmLlxuICBoaWRlOiAoZXZlbnQpID0+XG4gICAgVXRpbC5wcmV2ZW50RXZlbnREZWZhdWx0IGV2ZW50XG5cbiAgICBAZWxlbWVudC5hZGRDbGFzcyhAY2xhc3Nlcy5oaWRlKVxuICAgIHRoaXMucHVibGlzaCgnaGlkZScpXG5cbiAgIyBQdWJsaWM6IExvYWRzIGFuIGFubm90YXRpb24gaW50byB0aGUgRWRpdG9yIGFuZCBkaXNwbGF5cyBpdCBzZXR0aW5nXG4gICMgRWRpdG9yI2Fubm90YXRpb24gdG8gdGhlIHByb3ZpZGVkIGFubm90YXRpb24uIEl0IGZpcmVzIHRoZSBcImxvYWRcIiBldmVudFxuICAjIHByb3ZpZGluZyB0aGUgY3VycmVudCBhbm5vdGF0aW9uIHN1YnNjcmliZXJzIGNhbiBtb2RpZnkgdGhlIGFubm90YXRpb25cbiAgIyBiZWZvcmUgaXQgdXBkYXRlcyB0aGUgZWRpdG9yIGZpZWxkcy5cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdCB0byBkaXNwbGF5IGZvciBlZGl0aW5nLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBEaXBsYXlzIHRoZSBlZGl0b3Igd2l0aCB0aGUgYW5ub3RhdGlvbiBsb2FkZWQuXG4gICMgICBlZGl0b3IubG9hZCh7dGV4dDogJ015IEFubm90YXRpb24nfSlcbiAgI1xuICAjICAgZWRpdG9yLm9uKCdsb2FkJywgKGFubm90YXRpb24pIC0+XG4gICMgICAgIGNvbnNvbGUubG9nIGFubm90YXRpb24udGV4dFxuICAjICAgKS5sb2FkKHt0ZXh0OiAnTXkgQW5ub3RhdGlvbid9KVxuICAjICAgIyA9PiBPdXRwdXRzIFwiTXkgQW5ub3RhdGlvblwiXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZi5cbiAgbG9hZDogKGFubm90YXRpb24pID0+XG4gICAgQGFubm90YXRpb24gPSBhbm5vdGF0aW9uXG5cbiAgICB0aGlzLnB1Ymxpc2goJ2xvYWQnLCBbQGFubm90YXRpb25dKVxuXG4gICAgZm9yIGZpZWxkIGluIEBmaWVsZHNcbiAgICAgIGZpZWxkLmxvYWQoZmllbGQuZWxlbWVudCwgQGFubm90YXRpb24pXG5cbiAgICB0aGlzLnNob3coKVxuXG4gICMgUHVibGljOiBIaWRlcyB0aGUgRWRpdG9yIGFuZCBwYXNzZXMgdGhlIGFubm90YXRpb24gdG8gYWxsIHJlZ2lzdGVyZWQgZmllbGRzXG4gICMgc28gdGhleSBjYW4gdXBkYXRlIGl0cyBzdGF0ZS4gSXQgdGhlbiBmaXJlcyB0aGUgXCJzYXZlXCIgZXZlbnQgc28gdGhhdCBvdGhlclxuICAjIHBhcnRpZXMgY2FuIGZ1cnRoZXIgbW9kaWZ5IHRoZSBhbm5vdGF0aW9uLlxuICAjIENhbiBiZSB1c2VkIGFzIGFuIGV2ZW50IGNhbGxiYWNrIGFuZCB3aWxsIGNhbGwgRXZlbnQjcHJldmVudERlZmF1bHQoKSBvbiB0aGVcbiAgIyBzdXBwbGllZCBldmVudC5cbiAgI1xuICAjIGV2ZW50IC0gRXZlbnQgb2JqZWN0IHByb3ZpZGVkIGlmIG1ldGhvZCBpcyBjYWxsZWQgYnkgZXZlbnRcbiAgIyAgICAgICAgIGxpc3RlbmVyIChkZWZhdWx0OnVuZGVmaW5lZClcbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgU3VibWl0cyB0aGUgZWRpdG9yLlxuICAjICAgZWRpdG9yLnN1Ym1pdCgpXG4gICNcbiAgIyAgICMgU3VibWl0cyB0aGUgZWRpdG9yIG9uIGNsaWNrIChwcmV2ZW50cyBkZWZhdWx0IGFjdGlvbikuXG4gICMgICAkKCdidXR0b24uc3VibWl0LWVkaXRvcicpLmJpbmQoJ2NsaWNrJywgZWRpdG9yLnN1Ym1pdClcbiAgI1xuICAjICAgIyBBcHBlbmRzIFwiQ29tbWVudDogXCIgdG8gdGhlIGFubm90YXRpb24gY29tbWVudCB0ZXh0LlxuICAjICAgZWRpdG9yLm9uKCdzYXZlJywgKGFubm90YXRpb24pIC0+XG4gICMgICAgIGFubm90YXRpb24udGV4dCA9IFwiQ29tbWVudDogXCIgKyBhbm5vdGF0aW9uLnRleHRcbiAgIyAgICkuc3VibWl0KClcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmLlxuICBzdWJtaXQ6IChldmVudCkgPT5cbiAgICBVdGlsLnByZXZlbnRFdmVudERlZmF1bHQgZXZlbnRcblxuICAgIGZvciBmaWVsZCBpbiBAZmllbGRzXG4gICAgICBmaWVsZC5zdWJtaXQoZmllbGQuZWxlbWVudCwgQGFubm90YXRpb24pXG5cbiAgICB0aGlzLnB1Ymxpc2goJ3NhdmUnLCBbQGFubm90YXRpb25dKVxuXG4gICAgdGhpcy5oaWRlKClcblxuICAjIFB1YmxpYzogQWRkcyBhbiBhZGRpb25hbCBmb3JtIGZpZWxkIHRvIHRoZSBlZGl0b3IuIENhbGxiYWNrcyBjYW4gYmUgcHJvdmlkZWRcbiAgIyB0byB1cGRhdGUgdGhlIHZpZXcgYW5kIGFub3RhdGlvbnMgb24gbG9hZCBhbmQgc3VibWlzc2lvbi5cbiAgI1xuICAjIG9wdGlvbnMgLSBBbiBvcHRpb25zIE9iamVjdC4gT3B0aW9ucyBhcmUgYXMgZm9sbG93czpcbiAgIyAgICAgICAgICAgaWQgICAgIC0gQSB1bmlxdWUgaWQgZm9yIHRoZSBmb3JtIGVsZW1lbnQgd2lsbCBhbHNvIGJlIHNldCBhcyB0aGVcbiAgIyAgICAgICAgICAgICAgICAgICAgXCJmb3JcIiBhdHRydWJ1dGUgb2YgYSBsYWJlbCBpZiB0aGVyZSBpcyBvbmUuIERlZmF1bHRzIHRvXG4gICMgICAgICAgICAgICAgICAgICAgIGEgdGltZXN0YW1wLiAoZGVmYXVsdDogXCJhbm5vdGF0b3ItZmllbGQte3RpbWVzdGFtcH1cIilcbiAgIyAgICAgICAgICAgdHlwZSAgIC0gSW5wdXQgdHlwZSBTdHJpbmcuIE9uZSBvZiBcImlucHV0XCIsIFwidGV4dGFyZWFcIixcbiAgIyAgICAgICAgICAgICAgICAgICAgXCJjaGVja2JveFwiLCBcInNlbGVjdFwiIChkZWZhdWx0OiBcImlucHV0XCIpXG4gICMgICAgICAgICAgIGxhYmVsICAtIExhYmVsIHRvIGRpc3BsYXkgZWl0aGVyIGluIGEgbGFiZWwgRWxlbWVudCBvciBhcyBwbGFjZS1cbiAgIyAgICAgICAgICAgICAgICAgICAgaG9sZGVyIHRleHQgZGVwZW5kaW5nIG9uIHRoZSB0eXBlLiAoZGVmYXVsdDogXCJcIilcbiAgIyAgICAgICAgICAgbG9hZCAgIC0gQ2FsbGJhY2sgRnVuY3Rpb24gY2FsbGVkIHdoZW4gdGhlIGVkaXRvciBpcyBsb2FkZWQgd2l0aCBhXG4gICMgICAgICAgICAgICAgICAgICAgIG5ldyBhbm5vdGF0aW9uLiBSZWNpZXZlcyB0aGUgZmllbGQgPGxpPiBlbGVtZW50IGFuZCB0aGVcbiAgIyAgICAgICAgICAgICAgICAgICAgYW5ub3RhdGlvbiB0byBiZSBsb2FkZWQuXG4gICMgICAgICAgICAgIHN1Ym1pdCAtIENhbGxiYWNrIEZ1bmN0aW9uIGNhbGxlZCB3aGVuIHRoZSBlZGl0b3IgaXMgc3VibWl0dGVkLlxuICAjICAgICAgICAgICAgICAgICAgICBSZWNpZXZlcyB0aGUgZmllbGQgPGxpPiBlbGVtZW50IGFuZCB0aGUgYW5ub3RhdGlvbiB0byBiZVxuICAjICAgICAgICAgICAgICAgICAgICB1cGRhdGVkLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBBZGQgYSBuZXcgaW5wdXQgZWxlbWVudC5cbiAgIyAgIGVkaXRvci5hZGRGaWVsZCh7XG4gICMgICAgIGxhYmVsOiBcIlRhZ3NcIixcbiAgI1xuICAjICAgICAjIFRoaXMgaXMgY2FsbGVkIHdoZW4gdGhlIGVkaXRvciBpcyBsb2FkZWQgdXNlIGl0IHRvIHVwZGF0ZSB5b3VyIGlucHV0LlxuICAjICAgICBsb2FkOiAoZmllbGQsIGFubm90YXRpb24pIC0+XG4gICMgICAgICAgIyBEbyBzb21ldGhpbmcgd2l0aCB0aGUgYW5ub3RhdGlvbi5cbiAgIyAgICAgICB2YWx1ZSA9IGdldFRhZ1N0cmluZyhhbm5vdGF0aW9uLnRhZ3MpXG4gICMgICAgICAgJChmaWVsZCkuZmluZCgnaW5wdXQnKS52YWwodmFsdWUpXG4gICNcbiAgIyAgICAgIyBUaGlzIGlzIGNhbGxlZCB3aGVuIHRoZSBlZGl0b3IgaXMgc3VibWl0dGVkIHVzZSBpdCB0byByZXRyaWV2ZSBkYXRhXG4gICMgICAgICMgZnJvbSB5b3VyIGlucHV0IGFuZCBzYXZlIGl0IHRvIHRoZSBhbm5vdGF0aW9uLlxuICAjICAgICBzdWJtaXQ6IChmaWVsZCwgYW5ub3RhdGlvbikgLT5cbiAgIyAgICAgICB2YWx1ZSA9ICQoZmllbGQpLmZpbmQoJ2lucHV0JykudmFsKClcbiAgIyAgICAgICBhbm5vdGF0aW9uLnRhZ3MgPSBnZXRUYWdzRnJvbVN0cmluZyh2YWx1ZSlcbiAgIyAgIH0pXG4gICNcbiAgIyAgICMgQWRkIGEgbmV3IGNoZWNrYm94IGVsZW1lbnQuXG4gICMgICBlZGl0b3IuYWRkRmllbGQoe1xuICAjICAgICB0eXBlOiAnY2hlY2tib3gnLFxuICAjICAgICBpZDogJ2Fubm90YXRvci1maWVsZC1teS1jaGVja2JveCcsXG4gICMgICAgIGxhYmVsOiAnQWxsb3cgYW55b25lIHRvIHNlZSB0aGlzIGFubm90YXRpb24nLFxuICAjICAgICBsb2FkOiAoZmllbGQsIGFubm90YXRpb24pIC0+XG4gICMgICAgICAgIyBDaGVjayB3aGF0IHN0YXRlIG9mIGlucHV0IHNob3VsZCBiZS5cbiAgIyAgICAgICBpZiBjaGVja2VkXG4gICMgICAgICAgICAkKGZpZWxkKS5maW5kKCdpbnB1dCcpLmF0dHIoJ2NoZWNrZWQnLCAnY2hlY2tlZCcpXG4gICMgICAgICAgZWxzZVxuICAjICAgICAgICAgJChmaWVsZCkuZmluZCgnaW5wdXQnKS5yZW1vdmVBdHRyKCdjaGVja2VkJylcblxuICAjICAgICBzdWJtaXQ6IChmaWVsZCwgYW5ub3RhdGlvbikgLT5cbiAgIyAgICAgICBjaGVja2VkID0gJChmaWVsZCkuZmluZCgnaW5wdXQnKS5pcygnOmNoZWNrZWQnKVxuICAjICAgICAgICMgRG8gc29tZXRoaW5nLlxuICAjICAgfSlcbiAgI1xuICAjIFJldHVybnMgdGhlIGNyZWF0ZWQgPGxpPiBFbGVtZW50LlxuICBhZGRGaWVsZDogKG9wdGlvbnMpIC0+XG4gICAgZmllbGQgPSAkLmV4dGVuZCh7XG4gICAgICBpZDogICAgICdhbm5vdGF0b3ItZmllbGQtJyArIFV0aWwudXVpZCgpXG4gICAgICB0eXBlOiAgICdpbnB1dCdcbiAgICAgIGxhYmVsOiAgJydcbiAgICAgIGxvYWQ6ICAgLT5cbiAgICAgIHN1Ym1pdDogLT5cbiAgICB9LCBvcHRpb25zKVxuXG4gICAgaW5wdXQgPSBudWxsXG4gICAgZWxlbWVudCA9ICQoJzxsaSBjbGFzcz1cImFubm90YXRvci1pdGVtXCIgLz4nKVxuICAgIGZpZWxkLmVsZW1lbnQgPSBlbGVtZW50WzBdXG5cbiAgICBzd2l0Y2ggKGZpZWxkLnR5cGUpXG4gICAgICB3aGVuICd0ZXh0YXJlYScgICAgICAgICAgdGhlbiBpbnB1dCA9ICQoJzx0ZXh0YXJlYSAvPicpXG4gICAgICB3aGVuICdpbnB1dCcsICdjaGVja2JveCcgdGhlbiBpbnB1dCA9ICQoJzxpbnB1dCAvPicpXG4gICAgICB3aGVuICdzZWxlY3QnIHRoZW4gaW5wdXQgPSAkKCc8c2VsZWN0IC8+JylcblxuICAgIGVsZW1lbnQuYXBwZW5kKGlucHV0KVxuXG4gICAgaW5wdXQuYXR0cih7XG4gICAgICBpZDogZmllbGQuaWRcbiAgICAgIHBsYWNlaG9sZGVyOiBmaWVsZC5sYWJlbFxuICAgIH0pXG5cbiAgICBpZiBmaWVsZC50eXBlID09ICdjaGVja2JveCdcbiAgICAgIGlucHV0WzBdLnR5cGUgPSAnY2hlY2tib3gnXG4gICAgICBlbGVtZW50LmFkZENsYXNzKCdhbm5vdGF0b3ItY2hlY2tib3gnKVxuICAgICAgZWxlbWVudC5hcHBlbmQoJCgnPGxhYmVsIC8+Jywge2ZvcjogZmllbGQuaWQsIGh0bWw6IGZpZWxkLmxhYmVsfSkpXG5cbiAgICBAZWxlbWVudC5maW5kKCd1bDpmaXJzdCcpLmFwcGVuZChlbGVtZW50KVxuXG4gICAgQGZpZWxkcy5wdXNoIGZpZWxkXG5cbiAgICBmaWVsZC5lbGVtZW50XG5cbiAgY2hlY2tPcmllbnRhdGlvbjogLT5cbiAgICBzdXBlclxuXG4gICAgbGlzdCA9IEBlbGVtZW50LmZpbmQoJ3VsJylcbiAgICBjb250cm9scyA9IEBlbGVtZW50LmZpbmQoJy5hbm5vdGF0b3ItY29udHJvbHMnKVxuXG4gICAgaWYgQGVsZW1lbnQuaGFzQ2xhc3MoQGNsYXNzZXMuaW52ZXJ0LnkpXG4gICAgICBjb250cm9scy5pbnNlcnRCZWZvcmUobGlzdClcbiAgICBlbHNlIGlmIGNvbnRyb2xzLmlzKCc6Zmlyc3QtY2hpbGQnKVxuICAgICAgY29udHJvbHMuaW5zZXJ0QWZ0ZXIobGlzdClcblxuICAgIHRoaXNcblxuICAjIEV2ZW50IGNhbGxiYWNrLiBMaXN0ZW5zIGZvciB0aGUgZm9sbG93aW5nIHNwZWNpYWwga2V5cHJlc3Nlcy5cbiAgIyAtIGVzY2FwZTogSGlkZXMgdGhlIGVkaXRvclxuICAjIC0gZW50ZXI6ICBTdWJtaXRzIHRoZSBlZGl0b3JcbiAgI1xuICAjIGV2ZW50IC0gQSBrZXlkb3duIEV2ZW50IG9iamVjdC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZ1xuICBwcm9jZXNzS2V5cHJlc3M6IChldmVudCkgPT5cbiAgICBpZiBldmVudC5rZXlDb2RlIGlzIDI3ICMgXCJFc2NhcGVcIiBrZXkgPT4gYWJvcnQuXG4gICAgICB0aGlzLmhpZGUoKVxuICAgIGVsc2UgaWYgZXZlbnQua2V5Q29kZSBpcyAxMyBhbmQgIWV2ZW50LnNoaWZ0S2V5XG4gICAgICAjIElmIFwicmV0dXJuXCIgd2FzIHByZXNzZWQgd2l0aG91dCB0aGUgc2hpZnQga2V5LCB3ZSdyZSBkb25lLlxuICAgICAgdGhpcy5zdWJtaXQoKVxuXG4gICMgRXZlbnQgY2FsbGJhY2suIFJlbW92ZXMgdGhlIGZvY3VzIGNsYXNzIGZyb20gdGhlIHN1Ym1pdCBidXR0b24gd2hlbiB0aGVcbiAgIyBjYW5jZWwgYnV0dG9uIGlzIGhvdmVyZWQuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmdcbiAgb25DYW5jZWxCdXR0b25Nb3VzZW92ZXI6ID0+XG4gICAgQGVsZW1lbnQuZmluZCgnLicgKyBAY2xhc3Nlcy5mb2N1cykucmVtb3ZlQ2xhc3MoQGNsYXNzZXMuZm9jdXMpXG5cbiAgIyBTZXRzIHVwIG1vdXNlIGV2ZW50cyBmb3IgcmVzaXppbmcgYW5kIGRyYWdnaW5nIHRoZSBlZGl0b3Igd2luZG93LlxuICAjIHdpbmRvdyBldmVudHMgYXJlIGJvdW5kIG9ubHkgd2hlbiBuZWVkZWQgYW5kIHRocm90dGxlZCB0byBvbmx5IHVwZGF0ZVxuICAjIHRoZSBwb3NpdGlvbnMgYXQgbW9zdCA2MCB0aW1lcyBhIHNlY29uZC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgc2V0dXBEcmFnZ2FibGVzOiAoKSAtPlxuICAgIEBlbGVtZW50LmZpbmQoJy5hbm5vdGF0b3ItcmVzaXplJykucmVtb3ZlKClcblxuICAgICMgRmluZCB0aGUgZmlyc3QvbGFzdCBpdGVtIGVsZW1lbnQgZGVwZW5kaW5nIG9uIG9yaWVudGF0aW9uXG4gICAgaWYgQGVsZW1lbnQuaGFzQ2xhc3MoQGNsYXNzZXMuaW52ZXJ0LnkpXG4gICAgICBjb3JuZXJJdGVtID0gQGVsZW1lbnQuZmluZCgnLmFubm90YXRvci1pdGVtOmxhc3QnKVxuICAgIGVsc2VcbiAgICAgIGNvcm5lckl0ZW0gPSBAZWxlbWVudC5maW5kKCcuYW5ub3RhdG9yLWl0ZW06Zmlyc3QnKVxuXG4gICAgaWYgY29ybmVySXRlbVxuICAgICAgJCgnPHNwYW4gY2xhc3M9XCJhbm5vdGF0b3ItcmVzaXplXCI+PC9zcGFuPicpLmFwcGVuZFRvKGNvcm5lckl0ZW0pXG5cbiAgICBtb3VzZWRvd24gPSBudWxsXG4gICAgY2xhc3NlcyAgID0gQGNsYXNzZXNcbiAgICBlZGl0b3IgICAgPSBAZWxlbWVudFxuICAgIHRleHRhcmVhICA9IG51bGxcbiAgICByZXNpemUgICAgPSBlZGl0b3IuZmluZCgnLmFubm90YXRvci1yZXNpemUnKVxuICAgIGNvbnRyb2xzICA9IGVkaXRvci5maW5kKCcuYW5ub3RhdG9yLWNvbnRyb2xzJylcbiAgICB0aHJvdHRsZSAgPSBmYWxzZVxuXG4gICAgb25Nb3VzZWRvd24gPSAoZXZlbnQpIC0+XG4gICAgICBpZiBldmVudC50YXJnZXQgPT0gdGhpc1xuICAgICAgICBtb3VzZWRvd24gPSB7XG4gICAgICAgICAgZWxlbWVudDogdGhpc1xuICAgICAgICAgIHRvcDogICAgIGV2ZW50LnBhZ2VZXG4gICAgICAgICAgbGVmdDogICAgZXZlbnQucGFnZVhcbiAgICAgICAgfVxuXG4gICAgICAgICMgRmluZCB0aGUgZmlyc3QgdGV4dCBhcmVhIGlmIHRoZXJlIGlzIG9uZS5cbiAgICAgICAgdGV4dGFyZWEgPSBlZGl0b3IuZmluZCgndGV4dGFyZWE6Zmlyc3QnKVxuXG4gICAgICAgICQod2luZG93KS5iaW5kKHtcbiAgICAgICAgICAnbW91c2V1cC5hbm5vdGF0b3ItZWRpdG9yLXJlc2l6ZSc6ICAgb25Nb3VzZXVwXG4gICAgICAgICAgJ21vdXNlbW92ZS5hbm5vdGF0b3ItZWRpdG9yLXJlc2l6ZSc6IG9uTW91c2Vtb3ZlXG4gICAgICAgIH0pXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuICAgIG9uTW91c2V1cCA9IC0+XG4gICAgICBtb3VzZWRvd24gPSBudWxsXG4gICAgICAkKHdpbmRvdykudW5iaW5kICcuYW5ub3RhdG9yLWVkaXRvci1yZXNpemUnXG5cbiAgICBvbk1vdXNlbW92ZSA9IChldmVudCkgPT5cbiAgICAgIGlmIG1vdXNlZG93biBhbmQgdGhyb3R0bGUgPT0gZmFsc2VcbiAgICAgICAgZGlmZiA9IHtcbiAgICAgICAgICB0b3A6ICBldmVudC5wYWdlWSAtIG1vdXNlZG93bi50b3BcbiAgICAgICAgICBsZWZ0OiBldmVudC5wYWdlWCAtIG1vdXNlZG93bi5sZWZ0XG4gICAgICAgIH1cblxuICAgICAgICBpZiBtb3VzZWRvd24uZWxlbWVudCA9PSByZXNpemVbMF1cbiAgICAgICAgICBoZWlnaHQgPSB0ZXh0YXJlYS5vdXRlckhlaWdodCgpXG4gICAgICAgICAgd2lkdGggID0gdGV4dGFyZWEub3V0ZXJXaWR0aCgpXG5cbiAgICAgICAgICBkaXJlY3Rpb25YID0gaWYgZWRpdG9yLmhhc0NsYXNzKGNsYXNzZXMuaW52ZXJ0LngpIHRoZW4gLTEgZWxzZSAgMVxuICAgICAgICAgIGRpcmVjdGlvblkgPSBpZiBlZGl0b3IuaGFzQ2xhc3MoY2xhc3Nlcy5pbnZlcnQueSkgdGhlbiAgMSBlbHNlIC0xXG5cbiAgICAgICAgICB0ZXh0YXJlYS5oZWlnaHQgaGVpZ2h0ICsgKGRpZmYudG9wICAqIGRpcmVjdGlvblkpXG4gICAgICAgICAgdGV4dGFyZWEud2lkdGggIHdpZHRoICArIChkaWZmLmxlZnQgKiBkaXJlY3Rpb25YKVxuXG4gICAgICAgICAgIyBPbmx5IHVwZGF0ZSB0aGUgbW91c2Vkb3duIG9iamVjdCBpZiB0aGUgZGltZW5zaW9uc1xuICAgICAgICAgICMgaGF2ZSBjaGFuZ2VkLCBvdGhlcndpc2UgdGhleSBoYXZlIHJlYWNoZWQgdGhlaXIgbWluaW11bVxuICAgICAgICAgICMgdmFsdWVzLlxuICAgICAgICAgIG1vdXNlZG93bi50b3AgID0gZXZlbnQucGFnZVkgdW5sZXNzIHRleHRhcmVhLm91dGVySGVpZ2h0KCkgPT0gaGVpZ2h0XG4gICAgICAgICAgbW91c2Vkb3duLmxlZnQgPSBldmVudC5wYWdlWCB1bmxlc3MgdGV4dGFyZWEub3V0ZXJXaWR0aCgpICA9PSB3aWR0aFxuXG4gICAgICAgIGVsc2UgaWYgbW91c2Vkb3duLmVsZW1lbnQgPT0gY29udHJvbHNbMF1cbiAgICAgICAgICBlZGl0b3IuY3NzKHtcbiAgICAgICAgICAgIHRvcDogIHBhcnNlSW50KGVkaXRvci5jc3MoJ3RvcCcpLCAxMCkgICsgZGlmZi50b3BcbiAgICAgICAgICAgIGxlZnQ6IHBhcnNlSW50KGVkaXRvci5jc3MoJ2xlZnQnKSwgMTApICsgZGlmZi5sZWZ0XG4gICAgICAgICAgfSlcblxuICAgICAgICAgIG1vdXNlZG93bi50b3AgID0gZXZlbnQucGFnZVlcbiAgICAgICAgICBtb3VzZWRvd24ubGVmdCA9IGV2ZW50LnBhZ2VYXG5cbiAgICAgICAgdGhyb3R0bGUgPSB0cnVlO1xuICAgICAgICBzZXRUaW1lb3V0KC0+XG4gICAgICAgICAgdGhyb3R0bGUgPSBmYWxzZVxuICAgICAgICAsIDEwMDAvNjApXG5cbiAgICByZXNpemUuYmluZCAgICdtb3VzZWRvd24nLCBvbk1vdXNlZG93blxuICAgIGNvbnRyb2xzLmJpbmQgJ21vdXNlZG93bicsIG9uTW91c2Vkb3duXG5cblxuIyBFeHBvcnQgdGhlIEVkaXRvciBvYmplY3Rcbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yXG4iLCJEZWxlZ2F0b3IgPSByZXF1aXJlICcuL2NsYXNzJ1xuVXRpbCA9IHJlcXVpcmUgJy4vdXRpbCdcblxuXG4jIFB1YmxpYzogQSBzaW1wbGUgbm90aWZpY2F0aW9uIHN5c3RlbSB0aGF0IGNhbiBiZSB1c2VkIHRvIGRpc3BsYXkgaW5mb3JtYXRpb24sXG4jIHdhcm5pbmdzIGFuZCBlcnJvcnMgdG8gdGhlIHVzZXIuIERpc3BsYXkgb2Ygbm90aWZpY2F0aW9ucyBhcmUgY29udHJvbGxlZFxuIyBjbXBsZXRlbHkgYnkgQ1NTIGJ5IGFkZGluZy9yZW1vdmluZyB0aGUgQG9wdGlvbnMuY2xhc3Nlcy5zaG93IGNsYXNzLiBUaGlzXG4jIGFsbG93cyBzdHlsaW5nL2FuaW1hdGlvbiB1c2luZyBDU1MgcmF0aGVyIHRoYW4gaGFyZGNvZGluZyBzdHlsZXMuXG5jbGFzcyBOb3RpZmljYXRpb24gZXh0ZW5kcyBEZWxlZ2F0b3JcblxuICAjIFNldHMgZXZlbnRzIHRvIGJlIGJvdW5kIHRvIHRoZSBAZWxlbWVudC5cbiAgZXZlbnRzOlxuICAgIFwiY2xpY2tcIjogXCJoaWRlXCJcblxuICAjIERlZmF1bHQgb3B0aW9ucy5cbiAgb3B0aW9uczpcbiAgICBodG1sOiBcIjxkaXYgY2xhc3M9J2Fubm90YXRvci1ub3RpY2UnPjwvZGl2PlwiXG4gICAgY2xhc3NlczpcbiAgICAgIHNob3c6ICAgIFwiYW5ub3RhdG9yLW5vdGljZS1zaG93XCJcbiAgICAgIGluZm86ICAgIFwiYW5ub3RhdG9yLW5vdGljZS1pbmZvXCJcbiAgICAgIHN1Y2Nlc3M6IFwiYW5ub3RhdG9yLW5vdGljZS1zdWNjZXNzXCJcbiAgICAgIGVycm9yOiAgIFwiYW5ub3RhdG9yLW5vdGljZS1lcnJvclwiXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgIE5vdGlmaWNhdGlvbiBhbmQgYXBwZW5kcyBpdCB0byB0aGVcbiAgIyBkb2N1bWVudCBib2R5LlxuICAjXG4gICMgb3B0aW9ucyAtIFRoZSBmb2xsb3dpbmcgb3B0aW9ucyBjYW4gYmUgcHJvdmlkZWQuXG4gICMgICAgICAgICAgIGNsYXNzZXMgLSBBIE9iamVjdCBsaXRlcmFsIG9mIGNsYXNzZXMgdXNlZCB0byBkZXRlcm1pbmUgc3RhdGUuXG4gICMgICAgICAgICAgIGh0bWwgICAgLSBBbiBIVE1MIHN0cmluZyB1c2VkIHRvIGNyZWF0ZSB0aGUgbm90aWZpY2F0aW9uLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBEaXNwbGF5cyBhIG5vdGlmaWNhdGlvbiB3aXRoIHRoZSB0ZXh0IFwiSGVsbG8gV29ybGRcIlxuICAjICAgbm90aWZpY2F0aW9uID0gbmV3IEFubm90YXRvci5Ob3RpZmljYXRpb25cbiAgIyAgIG5vdGlmaWNhdGlvbi5zaG93KFwiSGVsbG8gV29ybGRcIilcbiAgI1xuICAjIFJldHVybnNcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIHN1cGVyICQoQG9wdGlvbnMuaHRtbClbMF0sIG9wdGlvbnNcblxuICAjIFB1YmxpYzogRGlzcGxheXMgdGhlIGFubm90YXRpb24gd2l0aCBtZXNzYWdlIGFuZCBvcHRpb25hbCBzdGF0dXMuIFRoZVxuICAjIG1lc3NhZ2Ugd2lsbCBoaWRlIGl0c2VsZiBhZnRlciA1IHNlY29uZHMgb3IgaWYgdGhlIHVzZXIgY2xpY2tzIG9uIGl0LlxuICAjXG4gICMgbWVzc2FnZSAtIEEgbWVzc2FnZSBTdHJpbmcgdG8gZGlzcGxheSAoSFRNTCB3aWxsIGJlIGVzY2FwZWQpLlxuICAjIHN0YXR1cyAgLSBBIHN0YXR1cyBjb25zdGFudC4gVGhpcyB3aWxsIGFwcGx5IGEgY2xhc3MgdG8gdGhlIGVsZW1lbnQgZm9yXG4gICMgICAgICAgICAgIHN0eWxpbmcuIChkZWZhdWx0OiBBbm5vdGF0b3IuTm90aWZpY2F0aW9uLklORk8pXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIERpc3BsYXlzIGEgbm90aWZpY2F0aW9uIHdpdGggdGhlIHRleHQgXCJIZWxsbyBXb3JsZFwiXG4gICMgICBub3RpZmljYXRpb24uc2hvdyhcIkhlbGxvIFdvcmxkXCIpXG4gICNcbiAgIyAgICMgRGlzcGxheXMgYSBub3RpZmljYXRpb24gd2l0aCB0aGUgdGV4dCBcIkFuIGVycm9yIGhhcyBvY2N1cnJlZFwiXG4gICMgICBub3RpZmljYXRpb24uc2hvdyhcIkFuIGVycm9yIGhhcyBvY2N1cnJlZFwiLCBBbm5vdGF0b3IuTm90aWZpY2F0aW9uLkVSUk9SKVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYuXG4gIHNob3c6IChtZXNzYWdlLCBzdGF0dXM9Tm90aWZpY2F0aW9uLklORk8pID0+XG4gICAgQGN1cnJlbnRTdGF0dXMgPSBzdGF0dXNcbiAgICB0aGlzLl9hcHBlbmRFbGVtZW50KClcblxuICAgICQoQGVsZW1lbnQpXG4gICAgICAuYWRkQ2xhc3MoQG9wdGlvbnMuY2xhc3Nlcy5zaG93KVxuICAgICAgLmFkZENsYXNzKEBvcHRpb25zLmNsYXNzZXNbQGN1cnJlbnRTdGF0dXNdKVxuICAgICAgLmh0bWwoVXRpbC5lc2NhcGUobWVzc2FnZSB8fCBcIlwiKSlcblxuICAgIHNldFRpbWVvdXQgdGhpcy5oaWRlLCA1MDAwXG4gICAgdGhpc1xuXG4gICMgUHVibGljOiBIaWRlcyB0aGUgbm90aWZpY2F0aW9uLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBIaWRlcyB0aGUgbm90aWZpY2F0aW9uLlxuICAjICAgbm90aWZpY2F0aW9uLmhpZGUoKVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYuXG4gIGhpZGU6ID0+XG4gICAgQGN1cnJlbnRTdGF0dXMgPz0gQW5ub3RhdG9yLk5vdGlmaWNhdGlvbi5JTkZPXG4gICAgJChAZWxlbWVudClcbiAgICAgIC5yZW1vdmVDbGFzcyhAb3B0aW9ucy5jbGFzc2VzLnNob3cpXG4gICAgICAucmVtb3ZlQ2xhc3MoQG9wdGlvbnMuY2xhc3Nlc1tAY3VycmVudFN0YXR1c10pXG4gICAgdGhpc1xuXG4gICMgUHJpdmF0ZTogRW5zdXJlcyB0aGUgbm90aWZpY2F0aW9uIGVsZW1lbnQgaGFzIGJlZW4gYWRkZWQgdG8gdGhlIGRvY3VtZW50XG4gICMgd2hlbiBpdCBpcyBuZWVkZWQuXG4gIF9hcHBlbmRFbGVtZW50OiAtPlxuICAgIGlmIG5vdCBAZWxlbWVudC5wYXJlbnROb2RlP1xuICAgICAgJChAZWxlbWVudCkuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcblxuIyBDb25zdGFudHMgZm9yIGNvbnRyb2xsaW5nIHRoZSBkaXNwbGF5IG9mIHRoZSBub3RpZmljYXRpb24uIEVhY2ggY29uc3RhbnRcbiMgYWRkcyBhIGRpZmZlcmVudCBjbGFzcyB0byB0aGUgTm90aWZpY2F0aW9uI2VsZW1lbnQuXG5Ob3RpZmljYXRpb24uSU5GTyAgICA9ICdpbmZvJ1xuTm90aWZpY2F0aW9uLlNVQ0NFU1MgPSAnc3VjY2Vzcydcbk5vdGlmaWNhdGlvbi5FUlJPUiAgID0gJ2Vycm9yJ1xuXG4jIEV4cG9ydCBOb3RpZmljYXRpb24gb2JqZWN0XG5tb2R1bGUuZXhwb3J0cyA9IE5vdGlmaWNhdGlvblxuIiwiQW5ub3RhdG9yID0gcmVxdWlyZSgnYW5ub3RhdG9yJylcblxuXG4jIFB1YmxpYzogQ3JlYXRlcyBhIERhdGUgb2JqZWN0IGZyb20gYW4gSVNPODYwMSBmb3JtYXR0ZWQgZGF0ZSBTdHJpbmcuXG4jXG4jIHN0cmluZyAtIElTTzg2MDEgZm9ybWF0dGVkIGRhdGUgU3RyaW5nLlxuI1xuIyBSZXR1cm5zIERhdGUgaW5zdGFuY2UuXG5jcmVhdGVEYXRlRnJvbUlTTzg2MDEgPSAoc3RyaW5nKSAtPlxuICByZWdleHAgPSAoXG4gICAgXCIoWzAtOV17NH0pKC0oWzAtOV17Mn0pKC0oWzAtOV17Mn0pXCIgK1xuICAgIFwiKFQoWzAtOV17Mn0pOihbMC05XXsyfSkoOihbMC05XXsyfSkoXFxcXC4oWzAtOV0rKSk/KT9cIiArXG4gICAgXCIoWnwoKFstK10pKFswLTldezJ9KTooWzAtOV17Mn0pKSk/KT8pPyk/XCJcbiAgKVxuXG4gIGQgPSBzdHJpbmcubWF0Y2gobmV3IFJlZ0V4cChyZWdleHApKVxuXG4gIG9mZnNldCA9IDBcbiAgZGF0ZSA9IG5ldyBEYXRlKGRbMV0sIDAsIDEpXG5cbiAgZGF0ZS5zZXRNb250aChkWzNdIC0gMSkgaWYgZFszXVxuICBkYXRlLnNldERhdGUoZFs1XSkgaWYgZFs1XVxuICBkYXRlLnNldEhvdXJzKGRbN10pIGlmIGRbN11cbiAgZGF0ZS5zZXRNaW51dGVzKGRbOF0pIGlmIGRbOF1cbiAgZGF0ZS5zZXRTZWNvbmRzKGRbMTBdKSBpZiBkWzEwXVxuICBkYXRlLnNldE1pbGxpc2Vjb25kcyhOdW1iZXIoXCIwLlwiICsgZFsxMl0pICogMTAwMCkgaWYgZFsxMl1cblxuICBpZiBkWzE0XVxuICAgIG9mZnNldCA9IChOdW1iZXIoZFsxNl0pICogNjApICsgTnVtYmVyKGRbMTddKVxuICAgIG9mZnNldCAqPSAoKGRbMTVdID09ICctJykgPyAxIDogLTEpXG5cbiAgb2Zmc2V0IC09IGRhdGUuZ2V0VGltZXpvbmVPZmZzZXQoKVxuICB0aW1lID0gKE51bWJlcihkYXRlKSArIChvZmZzZXQgKiA2MCAqIDEwMDApKVxuXG4gIGRhdGUuc2V0VGltZShOdW1iZXIodGltZSkpXG4gIGRhdGVcblxuYmFzZTY0RGVjb2RlID0gKGRhdGEpIC0+XG4gIGlmIGF0b2I/XG4gICAgIyBHZWNrbyBhbmQgV2Via2l0IHByb3ZpZGUgbmF0aXZlIGNvZGUgZm9yIHRoaXNcbiAgICBhdG9iKGRhdGEpXG4gIGVsc2VcbiAgICAjIEFkYXB0ZWQgZnJvbSBNSVQvQlNEIGxpY2Vuc2VkIGNvZGUgYXQgaHR0cDovL3BocGpzLm9yZy9mdW5jdGlvbnMvYmFzZTY0X2RlY29kZVxuICAgICMgdmVyc2lvbiAxMTA5LjIwMTVcbiAgICBiNjQgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89XCJcbiAgICBpID0gMFxuICAgIGFjID0gMFxuICAgIGRlYyA9IFwiXCJcbiAgICB0bXBfYXJyID0gW11cblxuICAgIGlmIG5vdCBkYXRhXG4gICAgICByZXR1cm4gZGF0YVxuXG4gICAgZGF0YSArPSAnJ1xuXG4gICAgd2hpbGUgaSA8IGRhdGEubGVuZ3RoXG4gICAgICAjIHVucGFjayBmb3VyIGhleGV0cyBpbnRvIHRocmVlIG9jdGV0cyB1c2luZyBpbmRleCBwb2ludHMgaW4gYjY0XG4gICAgICBoMSA9IGI2NC5pbmRleE9mKGRhdGEuY2hhckF0KGkrKykpXG4gICAgICBoMiA9IGI2NC5pbmRleE9mKGRhdGEuY2hhckF0KGkrKykpXG4gICAgICBoMyA9IGI2NC5pbmRleE9mKGRhdGEuY2hhckF0KGkrKykpXG4gICAgICBoNCA9IGI2NC5pbmRleE9mKGRhdGEuY2hhckF0KGkrKykpXG5cbiAgICAgIGJpdHMgPSBoMSA8PCAxOCB8IGgyIDw8IDEyIHwgaDMgPDwgNiB8IGg0XG5cbiAgICAgIG8xID0gYml0cyA+PiAxNiAmIDB4ZmZcbiAgICAgIG8yID0gYml0cyA+PiA4ICYgMHhmZlxuICAgICAgbzMgPSBiaXRzICYgMHhmZlxuXG4gICAgICBpZiBoMyA9PSA2NFxuICAgICAgICB0bXBfYXJyW2FjKytdID0gU3RyaW5nLmZyb21DaGFyQ29kZShvMSlcbiAgICAgIGVsc2UgaWYgaDQgPT0gNjRcbiAgICAgICAgdG1wX2FyclthYysrXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUobzEsIG8yKVxuICAgICAgZWxzZVxuICAgICAgICB0bXBfYXJyW2FjKytdID0gU3RyaW5nLmZyb21DaGFyQ29kZShvMSwgbzIsIG8zKVxuXG4gICAgdG1wX2Fyci5qb2luKCcnKVxuXG5iYXNlNjRVcmxEZWNvZGUgPSAoZGF0YSkgLT5cbiAgbSA9IGRhdGEubGVuZ3RoICUgNFxuICBpZiBtICE9IDBcbiAgICBmb3IgaSBpbiBbMC4uLjQgLSBtXVxuICAgICAgZGF0YSArPSAnPSdcbiAgZGF0YSA9IGRhdGEucmVwbGFjZSgvLS9nLCAnKycpXG4gIGRhdGEgPSBkYXRhLnJlcGxhY2UoL18vZywgJy8nKVxuICBiYXNlNjREZWNvZGUoZGF0YSlcblxucGFyc2VUb2tlbiA9ICh0b2tlbikgLT5cbiAgW2hlYWQsIHBheWxvYWQsIHNpZ10gPSB0b2tlbi5zcGxpdCgnLicpXG4gIEpTT04ucGFyc2UoYmFzZTY0VXJsRGVjb2RlKHBheWxvYWQpKVxuXG4jIFB1YmxpYzogU3VwcG9ydHMgdGhlIFN0b3JlIHBsdWdpbiBieSBwcm92aWRpbmcgQXV0aGVudGljYXRpb24gaGVhZGVycy5cbmNsYXNzIEFubm90YXRvci5QbHVnaW4uQXV0aCBleHRlbmRzIEFubm90YXRvci5QbHVnaW5cbiAgIyBVc2VyIG9wdGlvbnMgdGhhdCBjYW4gYmUgcHJvdmlkZWQuXG4gIG9wdGlvbnM6XG5cbiAgICAjIEFuIGF1dGhlbnRpY2F0aW9uIHRva2VuLiBVc2VkIHRvIHNraXAgdGhlIHJlcXVlc3QgdG8gdGhlIHNlcnZlciBmb3IgYVxuICAgICMgYSB0b2tlbi5cbiAgICB0b2tlbjogbnVsbFxuXG4gICAgIyBUaGUgVVJMIG9uIHRoZSBsb2NhbCBzZXJ2ZXIgdG8gcmVxdWVzdCBhbiBhdXRoZW50aWNhdGlvbiB0b2tlbi5cbiAgICB0b2tlblVybDogJy9hdXRoL3Rva2VuJ1xuXG4gICAgIyBJZiB0cnVlIHdpbGwgdHJ5IGFuZCBmZXRjaCBhIHRva2VuIHdoZW4gdGhlIHBsdWdpbiBpcyBpbml0aWFsaXNlZC5cbiAgICBhdXRvRmV0Y2g6IHRydWVcbiAgICBcbiAgICAjIEhUVFAgbWV0aG9kIHRvIHVzZSBmb3IgZmV0Y2hpbmcgdGhlIHRva2VuXG4gICAgcmVxdWVzdE1ldGhvZDogJ0dFVCdcbiAgICBcbiAgICAjIGRhdGEgdG8gc2VuZCB3aGVuIGZldGNoaW5nIHRoZSB0b2tlblxuICAgIHJlcXVlc3REYXRhOiBudWxsXG4gICAgXG4gICAgIyBjYWxsYmFjayB3aGVuIGxvZ2luIHJlcXVpcmVkXG4gICAgdW5hdXRob3JpemVkQ2FsbGJhY2s6IG51bGxcblxuICAjIFB1YmxpYzogQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBBdXRoIHBsdWdpbi5cbiAgI1xuICAjIGVsZW1lbnQgLSBUaGUgZWxlbWVudCB0byBiaW5kIGFsbCBldmVudHMgdG8uIFVzdWFsbHkgdGhlIEFubm90YXRvciNlbGVtZW50LlxuICAjIG9wdGlvbnMgLSBBbiBPYmplY3QgbGl0ZXJhbCBjb250YWluaW5nIHVzZXIgb3B0aW9ucy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHBsdWdpbiA9IG5ldyBBbm5vdGF0b3IuUGx1Z2luLkF1dGgoYW5ub3RhdG9yLmVsZW1lbnQsIHtcbiAgIyAgICAgdG9rZW5Vcmw6ICcvbXkvY3VzdG9tL3BhdGgnXG4gICMgICB9KVxuICAjXG4gICMgUmV0dXJucyBpbnN0YW5jZSBvZiBBdXRoLlxuICBjb25zdHJ1Y3RvcjogKGVsZW1lbnQsIG9wdGlvbnMpIC0+XG4gICAgc3VwZXJcblxuICAgICMgTGlzdCBvZiBmdW5jdGlvbnMgdG8gYmUgZXhlY3V0ZWQgd2hlbiB3ZSBoYXZlIGEgdmFsaWQgdG9rZW4uXG4gICAgQHdhaXRpbmdGb3JUb2tlbiA9IFtdXG5cbiAgIyBQdWJsaWM6IEluaXRpYWxpc2VzIHRoZSBwbHVnaW4uXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHBsdWdpbkluaXQ6IC0+XG4gICAgaWYgQG9wdGlvbnMudG9rZW5cbiAgICAgIHRoaXMuc2V0VG9rZW4oQG9wdGlvbnMudG9rZW4pXG4gICAgZWxzZVxuICAgICAgdGhpcy5yZXF1ZXN0VG9rZW4oKVxuXG4gICMgUHVibGljOiBNYWtlcyBhIHJlcXVlc3QgdG8gdGhlIGxvY2FsIHNlcnZlciBmb3IgYW4gYXV0aGVudGljYXRpb24gdG9rZW4uXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBhdXRoLnJlcXVlc3RUb2tlbigpXG4gICNcbiAgIyBSZXR1cm5zIGpxWEhSIG9iamVjdC5cbiAgcmVxdWVzdFRva2VuOiAtPlxuICAgIEByZXF1ZXN0SW5Qcm9ncmVzcyA9IHRydWVcblxuICAgICQuYWpheFxuICAgICAgdXJsOiBAb3B0aW9ucy50b2tlblVybFxuICAgICAgZGF0YVR5cGU6ICd0ZXh0J1xuICAgICAgZGF0YTogQG9wdGlvbnMucmVxdWVzdERhdGFcbiAgICAgIHR5cGU6IEBvcHRpb25zLnJlcXVlc3RNZXRob2RcbiAgICAgIHhockZpZWxkczpcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlICMgU2VuZCBhbnkgYXV0aCBjb29raWVzIHRvIHRoZSBiYWNrZW5kXG5cbiAgICAjIG9uIHN1Y2Nlc3MsIHNldCB0aGUgYXV0aCB0b2tlblxuICAgIC5kb25lIChkYXRhLCBzdGF0dXMsIHhocikgPT5cbiAgICAgIHRoaXMuc2V0VG9rZW4oZGF0YSlcblxuICAgICMgb24gZmFpbHVyZSwgcmVsYXkgYW55IG1lc3NhZ2UgZ2l2ZW4gYnkgdGhlIHNlcnZlciB0byB0aGUgdXNlciB3aXRoIGEgbm90aWZpY2F0aW9uXG4gICAgLmZhaWwgKHhociwgc3RhdHVzLCBlcnIpID0+XG4gICAgICBpZiB4aHIuc3RhdHVzID09IDQwMVxuICAgICAgICBjYWxsYmFjayA9IEBvcHRpb25zLnVuYXV0aG9yaXplZENhbGxiYWNrIFxuICAgICAgICBpZiBjYWxsYmFjaz8gYW5kIGNhbGxiYWNrKHRoaXMpXG4gICAgICAgICAgIyB0cnkgYWdhaW4gaW4gMXMgaWYgY2FsbGJhY2sgcmV0dXJucyB0cnVlXG4gICAgICAgICAgQHJldHJ5VGltZW91dCA9IHNldFRpbWVvdXQgKCgpID0+IHRoaXMucmVxdWVzdFRva2VuKCkpLCAxMDAwXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgXG4gICAgICBtc2cgPSBBbm5vdGF0b3IuX3QoXCJDb3VsZG4ndCBnZXQgYXV0aCB0b2tlbjpcIilcbiAgICAgIGNvbnNvbGUuZXJyb3IgXCIje21zZ30gI3tlcnJ9XCIsIHhoclxuICAgICAgQW5ub3RhdG9yLnNob3dOb3RpZmljYXRpb24oXCIje21zZ30gI3t4aHIucmVzcG9uc2VUZXh0fVwiLCBBbm5vdGF0b3IuTm90aWZpY2F0aW9uLkVSUk9SKVxuXG4gICAgIyBhbHdheXMgcmVzZXQgdGhlIHJlcXVlc3RJblByb2dyZXNzIGluZGljYXRvclxuICAgIC5hbHdheXMgPT5cbiAgICAgIEByZXF1ZXN0SW5Qcm9ncmVzcyA9IGZhbHNlXG5cbiAgIyBQdWJsaWM6IFNldHMgdGhlIEB0b2tlbiBhbmQgY2hlY2tzIGl0J3MgdmFsaWRpdHkuIElmIHRoZSB0b2tlbiBpcyBpbnZhbGlkXG4gICMgcmVxdWVzdHMgYSBuZXcgb25lIGZyb20gdGhlIHNlcnZlci5cbiAgI1xuICAjIHRva2VuIC0gQSB0b2tlbiBzdHJpbmcuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBhdXRoLnNldFRva2VuKCdleUpoLi4uOWpRM0knKVxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBzZXRUb2tlbjogKHRva2VuKSAtPlxuICAgIEB0b2tlbiA9IHRva2VuXG4gICAgIyBQYXJzZSB0aGUgdG9rZW4gd2l0aG91dCB2ZXJpZnlpbmcgaXRzIGF1dGhlbnRpY2l0eTpcbiAgICBAX3Vuc2FmZVRva2VuID0gcGFyc2VUb2tlbih0b2tlbilcblxuICAgIGlmIHRoaXMuaGF2ZVZhbGlkVG9rZW4oKVxuICAgICAgaWYgQG9wdGlvbnMuYXV0b0ZldGNoXG4gICAgICAgICMgU2V0IHRpbWVvdXQgdG8gZmV0Y2ggbmV3IHRva2VuIDIgc2Vjb25kcyBiZWZvcmUgY3VycmVudCB0b2tlbiBleHBpcnlcbiAgICAgICAgQHJlZnJlc2hUaW1lb3V0ID0gc2V0VGltZW91dCAoKCkgPT4gdGhpcy5yZXF1ZXN0VG9rZW4oKSksICh0aGlzLnRpbWVUb0V4cGlyeSgpIC0gMikgKiAxMDAwXG5cbiAgICAgICMgU2V0IGhlYWRlcnMgZmllbGQgb24gdGhpcy5lbGVtZW50XG4gICAgICB0aGlzLnVwZGF0ZUhlYWRlcnMoKVxuXG4gICAgICAjIFJ1biBjYWxsYmFja3Mgd2FpdGluZyBmb3IgdG9rZW5cbiAgICAgIHdoaWxlIEB3YWl0aW5nRm9yVG9rZW4ubGVuZ3RoID4gMFxuICAgICAgICBAd2FpdGluZ0ZvclRva2VuLnBvcCgpKEBfdW5zYWZlVG9rZW4pXG5cbiAgICBlbHNlXG4gICAgICBjb25zb2xlLndhcm4gQW5ub3RhdG9yLl90KFwiRGlkbid0IGdldCBhIHZhbGlkIHRva2VuLlwiKVxuICAgICAgaWYgQG9wdGlvbnMuYXV0b0ZldGNoXG4gICAgICAgIGNvbnNvbGUud2FybiBBbm5vdGF0b3IuX3QoXCJHZXR0aW5nIGEgbmV3IHRva2VuIGluIDEwcy5cIilcbiAgICAgICAgc2V0VGltZW91dCAoKCkgPT4gdGhpcy5yZXF1ZXN0VG9rZW4oKSksIDEwICogMTAwMFxuXG4gICMgUHVibGljOiBDaGVja3MgdGhlIHZhbGlkaXR5IG9mIHRoZSBjdXJyZW50IHRva2VuLiBOb3RlIHRoYXQgdGhpcyAqZG9lc1xuICAjIG5vdCogY2hlY2sgdGhlIGF1dGhlbnRpY2l0eSBvZiB0aGUgdG9rZW4uXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBhdXRoLmhhdmVWYWxpZFRva2VuKCkgIyA9PiBSZXR1cm5zIHRydWUgaWYgdmFsaWQuXG4gICNcbiAgIyBSZXR1cm5zIHRydWUgaWYgdGhlIHRva2VuIGlzIHZhbGlkLlxuICBoYXZlVmFsaWRUb2tlbjogKCkgLT5cbiAgICBhbGxGaWVsZHMgPSAoXG4gICAgICBAX3Vuc2FmZVRva2VuIGFuZFxuICAgICAgQF91bnNhZmVUb2tlbi5pc3N1ZWRBdCBhbmRcbiAgICAgIEBfdW5zYWZlVG9rZW4udHRsIGFuZFxuICAgICAgQF91bnNhZmVUb2tlbi5jb25zdW1lcktleVxuICAgIClcblxuICAgIGlmIGFsbEZpZWxkcyAmJiB0aGlzLnRpbWVUb0V4cGlyeSgpID4gMFxuICAgICAgcmV0dXJuIHRydWVcbiAgICBlbHNlXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAjIFB1YmxpYzogQ2FsY3VsYXRlcyB0aGUgdGltZSBpbiBzZWNvbmRzIHVudGlsIHRoZSBjdXJyZW50IHRva2VuIGV4cGlyZXMuXG4gICNcbiAgIyBSZXR1cm5zIE51bWJlciBvZiBzZWNvbmRzIHVudGlsIHRva2VuIGV4cGlyZXMuXG4gIHRpbWVUb0V4cGlyeTogLT5cbiAgICBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAvIDEwMDBcbiAgICBpc3N1ZSA9IGNyZWF0ZURhdGVGcm9tSVNPODYwMShAX3Vuc2FmZVRva2VuLmlzc3VlZEF0KS5nZXRUaW1lKCkgLyAxMDAwXG5cbiAgICBleHBpcnkgPSBpc3N1ZSArIEBfdW5zYWZlVG9rZW4udHRsXG4gICAgdGltZVRvRXhwaXJ5ID0gZXhwaXJ5IC0gbm93XG5cbiAgICBpZiAodGltZVRvRXhwaXJ5ID4gMCkgdGhlbiB0aW1lVG9FeHBpcnkgZWxzZSAwXG5cbiAgIyBQdWJsaWM6IFVwZGF0ZXMgdGhlIGhlYWRlcnMgdG8gYmUgc2VudCB3aXRoIHRoZSBTdG9yZSByZXF1ZXN0cy5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgdXBkYXRlSGVhZGVyczogLT5cbiAgICBpZiB0aGlzLmFubm90YXRvci5yZWdpc3RyeS5zdG9yZT8uc2V0SGVhZGVyP1xuICAgICAgdGhpcy5hbm5vdGF0b3IucmVnaXN0cnkuc3RvcmUuc2V0SGVhZGVyKCd4LWFubm90YXRvci1hdXRoLXRva2VuJywgQHRva2VuKVxuXG4gICMgUnVucyB0aGUgcHJvdmlkZWQgY2FsbGJhY2sgaWYgYSB2YWxpZCB0b2tlbiBpcyBhdmFpbGFibGUuIE90aGVyd2lzZSByZXF1ZXN0c1xuICAjIGEgdG9rZW4gdW50aWwgaXQgcmVjaWV2ZXMgYSB2YWxpZCBvbmUuXG4gICNcbiAgIyBjYWxsYmFjayAtIEEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gY2FsbCBvbmNlIGEgdmFsaWQgdG9rZW4gaXMgb2J0YWluZWQuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBhdXRoLndpdGhUb2tlbiAtPlxuICAjICAgICBzdG9yZS5sb2FkQW5ub3RhdGlvbnMoKVxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICB3aXRoVG9rZW46IChjYWxsYmFjaykgLT5cbiAgICBpZiBub3QgY2FsbGJhY2s/XG4gICAgICByZXR1cm5cblxuICAgIGlmIHRoaXMuaGF2ZVZhbGlkVG9rZW4oKVxuICAgICAgY2FsbGJhY2soQF91bnNhZmVUb2tlbilcbiAgICBlbHNlXG4gICAgICB0aGlzLndhaXRpbmdGb3JUb2tlbi5wdXNoKGNhbGxiYWNrKVxuICAgICAgaWYgbm90IEByZXF1ZXN0SW5Qcm9ncmVzc1xuICAgICAgICB0aGlzLnJlcXVlc3RUb2tlbigpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBBbm5vdGF0b3IuUGx1Z2luLkF1dGhcbiIsIkFubm90YXRvciA9IHJlcXVpcmUoJ2Fubm90YXRvcicpXG5cblxuY2xhc3MgQW5ub3RhdG9yLlBsdWdpbi5GaWx0ZXIgZXh0ZW5kcyBBbm5vdGF0b3IuUGx1Z2luXG4gICMgRXZlbnRzIGFuZCBjYWxsYmFja3MgdG8gYmluZCB0byB0aGUgRmlsdGVyI2VsZW1lbnQuXG4gIGV2ZW50czpcbiAgICBcIi5hbm5vdGF0b3ItZmlsdGVyLXByb3BlcnR5IGlucHV0IGZvY3VzXCI6IFwiX29uRmlsdGVyRm9jdXNcIlxuICAgIFwiLmFubm90YXRvci1maWx0ZXItcHJvcGVydHkgaW5wdXQgYmx1clwiOiAgXCJfb25GaWx0ZXJCbHVyXCJcbiAgICBcIi5hbm5vdGF0b3ItZmlsdGVyLXByb3BlcnR5IGlucHV0IGtleXVwXCI6IFwiX29uRmlsdGVyS2V5dXBcIlxuICAgIFwiLmFubm90YXRvci1maWx0ZXItcHJldmlvdXMgY2xpY2tcIjogICAgICAgXCJfb25QcmV2aW91c0NsaWNrXCJcbiAgICBcIi5hbm5vdGF0b3ItZmlsdGVyLW5leHQgY2xpY2tcIjogICAgICAgICAgIFwiX29uTmV4dENsaWNrXCJcbiAgICBcIi5hbm5vdGF0b3ItZmlsdGVyLWNsZWFyIGNsaWNrXCI6ICAgICAgICAgIFwiX29uQ2xlYXJDbGlja1wiXG5cbiAgIyBDb21tb24gY2xhc3NlcyB1c2VkIHRvIGNoYW5nZSBwbHVnaW4gc3RhdGUuXG4gIGNsYXNzZXM6XG4gICAgYWN0aXZlOiAgICdhbm5vdGF0b3ItZmlsdGVyLWFjdGl2ZSdcbiAgICBobDpcbiAgICAgIGhpZGU6ICAgJ2Fubm90YXRvci1obC1maWx0ZXJlZCdcbiAgICAgIGFjdGl2ZTogJ2Fubm90YXRvci1obC1hY3RpdmUnXG5cbiAgIyBIVE1MIHRlbXBsYXRlcyBmb3IgdGhlIHBsdWdpbiBVSS5cbiAgaHRtbDpcbiAgICBlbGVtZW50OiBcIlwiXCJcbiAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYW5ub3RhdG9yLWZpbHRlclwiPlxuICAgICAgICAgICAgICAgPHN0cm9uZz5cIlwiXCIgKyBBbm5vdGF0b3IuX3QoJ05hdmlnYXRlOicpICsgXCJcIlwiPC9zdHJvbmc+XG4gICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImFubm90YXRvci1maWx0ZXItbmF2aWdhdGlvblwiPlxuICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImFubm90YXRvci1maWx0ZXItcHJldmlvdXNcIj5cIlwiXCIgKyBBbm5vdGF0b3IuX3QoJ1ByZXZpb3VzJykgKyBcIlwiXCI8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJhbm5vdGF0b3ItZmlsdGVyLW5leHRcIj5cIlwiXCIgKyBBbm5vdGF0b3IuX3QoJ05leHQnKSArIFwiXCJcIjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgPHN0cm9uZz5cIlwiXCIgKyBBbm5vdGF0b3IuX3QoJ0ZpbHRlciBieTonKSArIFwiXCJcIjwvc3Ryb25nPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgIFwiXCJcIlxuICAgIGZpbHRlcjogIFwiXCJcIlxuICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYW5ub3RhdG9yLWZpbHRlci1wcm9wZXJ0eVwiPlxuICAgICAgICAgICAgICAgPGxhYmVsPjwvbGFiZWw+XG4gICAgICAgICAgICAgICA8aW5wdXQvPlxuICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJhbm5vdGF0b3ItZmlsdGVyLWNsZWFyXCI+XCJcIlwiICsgQW5ub3RhdG9yLl90KCdDbGVhcicpICsgXCJcIlwiPC9idXR0b24+XG4gICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgIFwiXCJcIlxuXG4gICMgRGVmYXVsdCBvcHRpb25zIGZvciB0aGUgcGx1Z2luLlxuICBvcHRpb25zOlxuICAgICMgQSBDU1Mgc2VsZWN0b3Igb3IgRWxlbWVudCB0byBhcHBlbmQgdGhlIHBsdWdpbiB0b29sYmFyIHRvLlxuICAgIGFwcGVuZFRvOiAnYm9keSdcblxuICAgICMgQW4gYXJyYXkgb2YgZmlsdGVycyBjYW4gYmUgcHJvdmlkZWQgb24gaW5pdGlhbGlzYXRpb24uXG4gICAgZmlsdGVyczogW11cblxuICAgICMgQWRkcyBhIGRlZmF1bHQgZmlsdGVyIG9uIGFubm90YXRpb25zLlxuICAgIGFkZEFubm90YXRpb25GaWx0ZXI6IHRydWVcblxuICAgICMgUHVibGljOiBEZXRlcm1pbmVzIGlmIHRoZSBwcm9wZXJ0eSBpcyBjb250YWluZWQgd2l0aGluIHRoZSBwcm92aWRlZFxuICAgICMgYW5ub3RhdGlvbiBwcm9wZXJ0eS4gRGVmYXVsdCBpcyB0byBzcGxpdCB0aGUgc3RyaW5nIG9uIHNwYWNlcyBhbmQgb25seVxuICAgICMgcmV0dXJuIHRydWUgaWYgYWxsIGtleXdvcmRzIGFyZSBjb250YWluZWQgaW4gdGhlIHN0cmluZy4gVGhpcyBtZXRob2RcbiAgICAjIGNhbiBiZSBvdmVycmlkZGVuIGJ5IHRoZSB1c2VyIHdoZW4gaW5pdGlhbGlzaW5nIHRoZSBwbHVnaW4uXG4gICAgI1xuICAgICMgc3RyaW5nICAgLSBBbiBpbnB1dCBTdHJpbmcgZnJvbSB0aGUgZml0bGVyLlxuICAgICMgcHJvcGVydHkgLSBUaGUgYW5ub3RhdGlvbiBwcm9wZXJ5IHRvIHF1ZXJ5LlxuICAgICNcbiAgICAjIEV4YW1wbGVzXG4gICAgI1xuICAgICMgICBwbHVnaW4ub3B0aW9uLmdldEtleXdvcmRzKCdoZWxsbycsICdoZWxsbyB3b3JsZCBob3cgYXJlIHlvdT8nKVxuICAgICMgICAjID0+IFJldHVybnMgdHJ1ZVxuICAgICNcbiAgICAjICAgcGx1Z2luLm9wdGlvbi5nZXRLZXl3b3JkcygnaGVsbG8gYmlsbCcsICdoZWxsbyB3b3JsZCBob3cgYXJlIHlvdT8nKVxuICAgICMgICAjID0+IFJldHVybnMgZmFsc2VcbiAgICAjXG4gICAgIyBSZXR1cm5zIGFuIEFycmF5IG9mIGtleXdvcmQgU3RyaW5ncy5cbiAgICBpc0ZpbHRlcmVkOiAoaW5wdXQsIHByb3BlcnR5KSAtPlxuICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBpbnB1dCBhbmQgcHJvcGVydHlcblxuICAgICAgZm9yIGtleXdvcmQgaW4gKGlucHV0LnNwbGl0IC9cXHMrLylcbiAgICAgICAgcmV0dXJuIGZhbHNlIGlmIHByb3BlcnR5LmluZGV4T2Yoa2V5d29yZCkgPT0gLTFcblxuICAgICAgcmV0dXJuIHRydWVcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgRmlsdGVyIHBsdWdpbi5cbiAgI1xuICAjIGVsZW1lbnQgLSBUaGUgQW5ub3RhdG9yIGVsZW1lbnQgKHRoaXMgaXMgaWdub3JlZCBieSB0aGUgcGx1Z2luKS5cbiAgIyBvcHRpb25zIC0gQW4gT2JqZWN0IGxpdGVyYWwgb2Ygb3B0aW9ucy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGZpbHRlciA9IG5ldyBBbm5vdGF0b3IuUGx1Z2luLkZpbHRlcihhbm5vdGF0b3IuZWxlbWVudClcbiAgI1xuICAjIFJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIEZpbHRlciBwbHVnaW4uXG4gIGNvbnN0cnVjdG9yOiAoZWxlbWVudCwgb3B0aW9ucykgLT5cbiAgICAjIEFzIG1vc3QgZXZlbnRzIGZvciB0aGlzIHBsdWdpbiBhcmUgcmVsYXRpdmUgdG8gdGhlIHRvb2xiYXIgd2hpY2ggaXNcbiAgICAjIG5vdCBpbnNpZGUgdGhlIEFubm90YXRvciNFbGVtZW50IHdlIG92ZXJyaWRlIHRoZSBlbGVtZW50IHByb3BlcnR5LlxuICAgICMgQW5ub3RhdG9yI0VsZW1lbnQgY2FuIHN0aWxsIGJlIGFjY2Vzc2VkIHZpYSBAYW5ub3RhdG9yLmVsZW1lbnQuXG4gICAgZWxlbWVudCA9ICQoQGh0bWwuZWxlbWVudCkuYXBwZW5kVG8ob3B0aW9ucz8uYXBwZW5kVG8gb3IgQG9wdGlvbnMuYXBwZW5kVG8pXG5cbiAgICBzdXBlciBlbGVtZW50LCBvcHRpb25zXG5cbiAgICBAb3B0aW9ucy5maWx0ZXJzIG9yPSBbXVxuXG4gICAgQGZpbHRlciAgPSAkKEBodG1sLmZpbHRlcilcbiAgICBAZmlsdGVycyA9IFtdXG4gICAgQGN1cnJlbnQgID0gMFxuXG4gICMgUHVibGljOiBBZGRzIG5ldyBmaWx0ZXJzLiBVcGRhdGVzIHRoZSBAaGlnaGxpZ2h0cyBjYWNoZSBhbmQgY3JlYXRlcyBldmVudFxuICAjIGxpc3RlbmVycyBvbiB0aGUgYW5ub3RhdG9yIG9iamVjdC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgcGx1Z2luSW5pdDogLT5cbiAgICBmb3IgZmlsdGVyIGluIEBvcHRpb25zLmZpbHRlcnNcbiAgICAgIHRoaXMuYWRkRmlsdGVyKGZpbHRlcilcblxuICAgIHRoaXMudXBkYXRlSGlnaGxpZ2h0cygpXG4gICAgdGhpcy5fc2V0dXBMaXN0ZW5lcnMoKS5faW5zZXJ0U3BhY2VyKClcblxuICAgIGlmIEBvcHRpb25zLmFkZEFubm90YXRpb25GaWx0ZXIgPT0gdHJ1ZVxuICAgICAgdGhpcy5hZGRGaWx0ZXIge2xhYmVsOiBBbm5vdGF0b3IuX3QoJ0Fubm90YXRpb24nKSwgcHJvcGVydHk6ICd0ZXh0J31cblxuICAjIFB1YmxpYzogcmVtb3ZlIHRoZSBmaWx0ZXIgcGx1Z2luIGluc3RhbmNlIGFuZCB1bmJpbmQgZXZlbnRzLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBkZXN0cm95OiAtPlxuICAgIHN1cGVyXG4gICAgaHRtbCA9ICQoJ2h0bWwnKVxuICAgIGN1cnJlbnRNYXJnaW4gPSBwYXJzZUludChodG1sLmNzcygncGFkZGluZy10b3AnKSwgMTApIHx8IDBcbiAgICBodG1sLmNzcygncGFkZGluZy10b3AnLCBjdXJyZW50TWFyZ2luIC0gQGVsZW1lbnQub3V0ZXJIZWlnaHQoKSlcbiAgICBAZWxlbWVudC5yZW1vdmUoKVxuXG4gICMgQWRkcyBtYXJnaW4gdG8gdGhlIGN1cnJlbnQgZG9jdW1lbnQgdG8gZW5zdXJlIHRoYXQgdGhlIGFubm90YXRpb24gdG9vbGJhclxuICAjIGRvZXNuJ3QgY292ZXIgdGhlIHBhZ2Ugd2hlbiBub3Qgc2Nyb2xsZWQuXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZlxuICBfaW5zZXJ0U3BhY2VyOiAtPlxuICAgIGh0bWwgPSAkKCdodG1sJylcbiAgICBjdXJyZW50TWFyZ2luID0gcGFyc2VJbnQoaHRtbC5jc3MoJ3BhZGRpbmctdG9wJyksIDEwKSB8fCAwXG4gICAgaHRtbC5jc3MoJ3BhZGRpbmctdG9wJywgY3VycmVudE1hcmdpbiArIEBlbGVtZW50Lm91dGVySGVpZ2h0KCkpXG4gICAgdGhpc1xuXG4gICMgTGlzdGVucyB0byBhbm5vdGF0aW9uIGNoYW5nZSBldmVudHMgb24gdGhlIEFubm90YXRvciBpbiBvcmRlciB0byByZWZyZXNoXG4gICMgdGhlIEBhbm5vdGF0aW9ucyBjb2xsZWN0aW9uLlxuICAjIFRPRE86IE1ha2UgdGhpcyBtb3JlIGdyYW51bGFyIHNvIHRoZSBlbnRpcmUgY29sbGVjdGlvbiBpc24ndCByZWxvYWRlZCBmb3JcbiAgIyBldmVyeSBzaW5nbGUgY2hhbmdlLlxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYuXG4gIF9zZXR1cExpc3RlbmVyczogLT5cbiAgICBldmVudHMgPSBbXG4gICAgICAnYW5ub3RhdGlvbnNMb2FkZWQnLCAnYW5ub3RhdGlvbkNyZWF0ZWQnLFxuICAgICAgJ2Fubm90YXRpb25VcGRhdGVkJywgJ2Fubm90YXRpb25EZWxldGVkJ1xuICAgIF1cblxuICAgIGZvciBldmVudCBpbiBldmVudHNcbiAgICAgIEBhbm5vdGF0b3Iuc3Vic2NyaWJlIGV2ZW50LCB0aGlzLnVwZGF0ZUhpZ2hsaWdodHNcbiAgICB0aGlzXG5cbiAgIyBQdWJsaWM6IEFkZHMgYSBmaWx0ZXIgdG8gdGhlIHRvb2xiYXIuIFRoZSBmaWx0ZXIgbXVzdCBoYXZlIGJvdGggYSBsYWJlbFxuICAjIGFuZCBhIHByb3BlcnR5IG9mIGFuIGFubm90YXRpb24gb2JqZWN0IHRvIGZpbHRlciBvbi5cbiAgI1xuICAjIG9wdGlvbnMgLSBBbiBPYmplY3QgbGl0ZXJhbCBjb250YWluaW5nIHRoZSBmaWx0ZXJzIG9wdGlvbnMuXG4gICMgICAgICAgICAgIGxhYmVsICAgICAgLSBBIHB1YmxpYyBmYWNpbmcgU3RyaW5nIHRvIHJlcHJlc2VudCB0aGUgZmlsdGVyLlxuICAjICAgICAgICAgICBwcm9wZXJ0eSAgIC0gQW4gYW5ub3RhdGlvbiBwcm9wZXJ0eSBTdHJpbmcgdG8gZmlsdGVyIG9uLlxuICAjICAgICAgICAgICBpc0ZpbHRlcmVkIC0gQSBjYWxsYmFjayBGdW5jdGlvbiB0aGF0IHJlY2lldmVzIHRoZSBmaWVsZCBpbnB1dFxuICAjICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgYW5kIHRoZSBhbm5vdGF0aW9uIHByb3BlcnR5IHZhbHVlLiBTZWVcbiAgIyAgICAgICAgICAgICAgICAgICAgICAgIEBvcHRpb25zLmlzRmlsdGVyZWQoKSBmb3IgZGV0YWlscy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgU2V0IHVwIGEgZmlsdGVyIHRvIGZpbHRlciBvbiB0aGUgYW5ub3RhdGlvbi51c2VyIHByb3BlcnR5LlxuICAjICAgZmlsdGVyLmFkZEZpbHRlcih7XG4gICMgICAgIGxhYmVsOiBVc2VyLFxuICAjICAgICBwcm9wZXJ0eTogJ3VzZXInXG4gICMgICB9KVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgdG8gYWxsb3cgY2hhaW5pbmcuXG4gIGFkZEZpbHRlcjogKG9wdGlvbnMpIC0+XG4gICAgZmlsdGVyID0gJC5leHRlbmQoe1xuICAgICAgbGFiZWw6ICcnXG4gICAgICBwcm9wZXJ0eTogJydcbiAgICAgIGlzRmlsdGVyZWQ6IEBvcHRpb25zLmlzRmlsdGVyZWRcbiAgICB9LCBvcHRpb25zKVxuXG4gICAgIyBTa2lwIGlmIGEgZmlsdGVyIGZvciB0aGlzIHByb3BlcnR5IGhhcyBiZWVuIGxvYWRlZC5cbiAgICB1bmxlc3MgKGYgZm9yIGYgaW4gQGZpbHRlcnMgd2hlbiBmLnByb3BlcnR5ID09IGZpbHRlci5wcm9wZXJ0eSkubGVuZ3RoXG4gICAgICBmaWx0ZXIuaWQgPSAnYW5ub3RhdG9yLWZpbHRlci0nICsgZmlsdGVyLnByb3BlcnR5XG4gICAgICBmaWx0ZXIuYW5ub3RhdGlvbnMgPSBbXVxuICAgICAgZmlsdGVyLmVsZW1lbnQgPSBAZmlsdGVyLmNsb25lKCkuYXBwZW5kVG8oQGVsZW1lbnQpXG4gICAgICBmaWx0ZXIuZWxlbWVudC5maW5kKCdsYWJlbCcpXG4gICAgICAgIC5odG1sKGZpbHRlci5sYWJlbClcbiAgICAgICAgLmF0dHIoJ2ZvcicsIGZpbHRlci5pZClcbiAgICAgIGZpbHRlci5lbGVtZW50LmZpbmQoJ2lucHV0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgIGlkOiBmaWx0ZXIuaWRcbiAgICAgICAgICBwbGFjZWhvbGRlcjogQW5ub3RhdG9yLl90KCdGaWx0ZXIgYnkgJykgKyBmaWx0ZXIubGFiZWwgKyAnXFx1MjAyNidcbiAgICAgICAgfSlcbiAgICAgIGZpbHRlci5lbGVtZW50LmZpbmQoJ2J1dHRvbicpLmhpZGUoKVxuXG4gICAgICAjIEFkZCB0aGUgZmlsdGVyIHRvIHRoZSBlbGVtZW50cyBkYXRhIHN0b3JlLlxuICAgICAgZmlsdGVyLmVsZW1lbnQuZGF0YSAnZmlsdGVyJywgZmlsdGVyXG5cbiAgICAgIEBmaWx0ZXJzLnB1c2ggZmlsdGVyXG5cbiAgICB0aGlzXG5cbiAgIyBQdWJsaWM6IFVwZGF0ZXMgdGhlIGZpbHRlci5hbm5vdGF0aW9ucyBwcm9wZXJ0eS4gVGhlbiB1cGRhdGVzIHRoZSBzdGF0ZVxuICAjIG9mIHRoZSBlbGVtZW50cyBpbiB0aGUgRE9NLiBDYWxscyB0aGUgZmlsdGVyLmlzRmlsdGVyZWQoKSBtZXRob2QgdG9cbiAgIyBkZXRlcm1pbmUgaWYgdGhlIGFubm90YXRpb24gc2hvdWxkIHJlbWFpbi5cbiAgI1xuICAjIGZpbHRlciAtIEEgZmlsdGVyIE9iamVjdCBmcm9tIEBmaWx0ZXJzXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBmaWx0ZXIudXBkYXRlRmlsdGVyKG15RmlsdGVyKVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgZm9yIGNoYWluaW5nXG4gIHVwZGF0ZUZpbHRlcjogKGZpbHRlcikgLT5cbiAgICBmaWx0ZXIuYW5ub3RhdGlvbnMgPSBbXVxuXG4gICAgdGhpcy51cGRhdGVIaWdobGlnaHRzKClcbiAgICB0aGlzLnJlc2V0SGlnaGxpZ2h0cygpXG4gICAgaW5wdXQgPSAkLnRyaW0gZmlsdGVyLmVsZW1lbnQuZmluZCgnaW5wdXQnKS52YWwoKVxuXG4gICAgaWYgaW5wdXRcbiAgICAgIGFubm90YXRpb25zID0gQGhpZ2hsaWdodHMubWFwIC0+ICQodGhpcykuZGF0YSgnYW5ub3RhdGlvbicpXG5cbiAgICAgIGZvciBhbm5vdGF0aW9uIGluICQubWFrZUFycmF5KGFubm90YXRpb25zKVxuICAgICAgICBwcm9wZXJ0eSA9IGFubm90YXRpb25bZmlsdGVyLnByb3BlcnR5XVxuICAgICAgICBpZiBmaWx0ZXIuaXNGaWx0ZXJlZCBpbnB1dCwgcHJvcGVydHlcbiAgICAgICAgICBmaWx0ZXIuYW5ub3RhdGlvbnMucHVzaCBhbm5vdGF0aW9uXG5cbiAgICAgIHRoaXMuZmlsdGVySGlnaGxpZ2h0cygpXG5cbiAgIyBQdWJsaWM6IFVwZGF0ZXMgdGhlIEBoaWdobGlnaHRzIHByb3BlcnR5IHdpdGggdGhlIGxhdGVzdCBoaWdobGlnaHRcbiAgIyBlbGVtZW50cyBpbiB0aGUgRE9NLlxuICAjXG4gICMgUmV0dXJucyBhIGpRdWVyeSBjb2xsZWN0aW9uIG9mIHRoZSBoaWdobGlnaHQgZWxlbWVudHMuXG4gIHVwZGF0ZUhpZ2hsaWdodHM6ID0+XG4gICAgIyBJZ25vcmUgYW55IGhpZGRlbiBoaWdobGlnaHRzLlxuICAgIEBoaWdobGlnaHRzID0gQGFubm90YXRvci5lbGVtZW50LmZpbmQoJy5hbm5vdGF0b3ItaGw6dmlzaWJsZScpXG4gICAgQGZpbHRlcmVkICAgPSBAaGlnaGxpZ2h0cy5ub3QoQGNsYXNzZXMuaGwuaGlkZSlcblxuICAjIFB1YmxpYzogUnVucyB0aHJvdWdoIGVhY2ggb2YgdGhlIGZpbHRlcnMgYW5kIHJlbW92ZXMgYWxsIGhpZ2hsaWdodHMgbm90XG4gICMgY3VycmVudGx5IGluIHNjb3BlLlxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgZm9yIGNoYWluaW5nLlxuICBmaWx0ZXJIaWdobGlnaHRzOiAtPlxuICAgIGFjdGl2ZUZpbHRlcnMgPSAkLmdyZXAgQGZpbHRlcnMsIChmaWx0ZXIpIC0+ICEhZmlsdGVyLmFubm90YXRpb25zLmxlbmd0aFxuXG4gICAgZmlsdGVyZWQgPSBhY3RpdmVGaWx0ZXJzWzBdPy5hbm5vdGF0aW9ucyB8fCBbXVxuICAgIGlmIGFjdGl2ZUZpbHRlcnMubGVuZ3RoID4gMVxuICAgICAgIyBJZiB0aGVyZSBhcmUgbW9yZSB0aGFuIG9uZSBmaWx0ZXIgdGhlbiBvbmx5IGFubm90YXRpb25zIG1hdGNoZWQgaW4gZXZlcnlcbiAgICAgICMgZmlsdGVyIHNob3VsZCByZW1haW4uXG4gICAgICBhbm5vdGF0aW9ucyA9IFtdXG4gICAgICAkLmVhY2ggYWN0aXZlRmlsdGVycywgLT5cbiAgICAgICAgJC5tZXJnZShhbm5vdGF0aW9ucywgdGhpcy5hbm5vdGF0aW9ucylcblxuICAgICAgdW5pcXVlcyAgPSBbXVxuICAgICAgZmlsdGVyZWQgPSBbXVxuICAgICAgJC5lYWNoIGFubm90YXRpb25zLCAtPlxuICAgICAgICBpZiAkLmluQXJyYXkodGhpcywgdW5pcXVlcykgPT0gLTFcbiAgICAgICAgICB1bmlxdWVzLnB1c2ggdGhpc1xuICAgICAgICBlbHNlXG4gICAgICAgICAgZmlsdGVyZWQucHVzaCB0aGlzXG5cbiAgICBoaWdobGlnaHRzID0gQGhpZ2hsaWdodHNcbiAgICBmb3IgYW5ub3RhdGlvbiwgaW5kZXggaW4gZmlsdGVyZWRcbiAgICAgIGhpZ2hsaWdodHMgPSBoaWdobGlnaHRzLm5vdChhbm5vdGF0aW9uLmhpZ2hsaWdodHMpXG5cbiAgICBoaWdobGlnaHRzLmFkZENsYXNzKEBjbGFzc2VzLmhsLmhpZGUpXG5cbiAgICBAZmlsdGVyZWQgPSBAaGlnaGxpZ2h0cy5ub3QoQGNsYXNzZXMuaGwuaGlkZSlcbiAgICB0aGlzXG5cbiAgIyBQdWJsaWM6IFJlbW92ZXMgaGlkZGVuIGNsYXNzIGZyb20gYWxsIGFubm90YXRpb25zLlxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgZm9yIGNoYWluaW5nLlxuICByZXNldEhpZ2hsaWdodHM6IC0+XG4gICAgQGhpZ2hsaWdodHMucmVtb3ZlQ2xhc3MoQGNsYXNzZXMuaGwuaGlkZSlcbiAgICBAZmlsdGVyZWQgPSBAaGlnaGxpZ2h0c1xuICAgIHRoaXNcblxuICAjIFVwZGF0ZXMgdGhlIGZpbHRlciBmaWVsZCBvbiBmb2N1cy5cbiAgI1xuICAjIGV2ZW50IC0gQSBmb2N1cyBFdmVudCBvYmplY3QuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmdcbiAgX29uRmlsdGVyRm9jdXM6IChldmVudCkgPT5cbiAgICBpbnB1dCA9ICQoZXZlbnQudGFyZ2V0KVxuICAgIGlucHV0LnBhcmVudCgpLmFkZENsYXNzKEBjbGFzc2VzLmFjdGl2ZSlcbiAgICBpbnB1dC5uZXh0KCdidXR0b24nKS5zaG93KClcblxuICAjIFVwZGF0ZXMgdGhlIGZpbHRlciBmaWVsZCBvbiBibHVyLlxuICAjXG4gICMgZXZlbnQgLSBBIGJsdXIgRXZlbnQgb2JqZWN0LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBfb25GaWx0ZXJCbHVyOiAoZXZlbnQpID0+XG4gICAgdW5sZXNzIGV2ZW50LnRhcmdldC52YWx1ZVxuICAgICAgaW5wdXQgPSAkKGV2ZW50LnRhcmdldClcbiAgICAgIGlucHV0LnBhcmVudCgpLnJlbW92ZUNsYXNzKEBjbGFzc2VzLmFjdGl2ZSlcbiAgICAgIGlucHV0Lm5leHQoJ2J1dHRvbicpLmhpZGUoKVxuXG4gICMgVXBkYXRlcyB0aGUgZmlsdGVyIGJhc2VkIG9uIHRoZSBpZCBvZiB0aGUgZmlsdGVyIGVsZW1lbnQuXG4gICNcbiAgIyBldmVudCAtIEEga2V5dXAgRXZlbnRcbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgX29uRmlsdGVyS2V5dXA6IChldmVudCkgPT5cbiAgICBmaWx0ZXIgPSAkKGV2ZW50LnRhcmdldCkucGFyZW50KCkuZGF0YSgnZmlsdGVyJylcbiAgICB0aGlzLnVwZGF0ZUZpbHRlciBmaWx0ZXIgaWYgZmlsdGVyXG5cbiAgIyBMb2NhdGVzIHRoZSBuZXh0L3ByZXZpb3VzIGhpZ2hsaWdodGVkIGVsZW1lbnQgaW4gQGhpZ2hsaWdodHMgZnJvbSB0aGVcbiAgIyBjdXJyZW50IG9uZSBvciBnb2VzIHRvIHRoZSB2ZXJ5IGZpcnN0L2xhc3QgZWxlbWVudCByZXNwZWN0aXZlbHkuXG4gICNcbiAgIyBwcmV2aW91cyAtIElmIHRydWUgZmluZHMgdGhlIHByZXZpb3VzbHkgaGlnaGxpZ2h0ZWQgZWxlbWVudC5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmLlxuICBfZmluZE5leHRIaWdobGlnaHQ6IChwcmV2aW91cykgLT5cbiAgICByZXR1cm4gdGhpcyB1bmxlc3MgQGhpZ2hsaWdodHMubGVuZ3RoXG5cbiAgICBvZmZzZXQgICAgICA9IGlmIHByZXZpb3VzIHRoZW4gMCAgICBlbHNlIC0xXG4gICAgcmVzZXRPZmZzZXQgPSBpZiBwcmV2aW91cyB0aGVuIC0xICAgZWxzZSAwXG4gICAgb3BlcmF0b3IgICAgPSBpZiBwcmV2aW91cyB0aGVuICdsdCcgZWxzZSAnZ3QnXG5cbiAgICBhY3RpdmUgID0gQGhpZ2hsaWdodHMubm90KCcuJyArIEBjbGFzc2VzLmhsLmhpZGUpXG4gICAgY3VycmVudCA9IGFjdGl2ZS5maWx0ZXIoJy4nICsgQGNsYXNzZXMuaGwuYWN0aXZlKVxuICAgIGN1cnJlbnQgPSBhY3RpdmUuZXEob2Zmc2V0KSB1bmxlc3MgY3VycmVudC5sZW5ndGhcblxuICAgIGFubm90YXRpb24gPSBjdXJyZW50LmRhdGEgJ2Fubm90YXRpb24nXG5cbiAgICBpbmRleCA9IGFjdGl2ZS5pbmRleCBjdXJyZW50WzBdXG4gICAgbmV4dCAgPSBhY3RpdmUuZmlsdGVyKFwiOiN7b3BlcmF0b3J9KCN7aW5kZXh9KVwiKS5ub3QoYW5ub3RhdGlvbi5oaWdobGlnaHRzKS5lcShyZXNldE9mZnNldClcbiAgICBuZXh0ICA9IGFjdGl2ZS5lcShyZXNldE9mZnNldCkgdW5sZXNzIG5leHQubGVuZ3RoXG5cbiAgICB0aGlzLl9zY3JvbGxUb0hpZ2hsaWdodCBuZXh0LmRhdGEoJ2Fubm90YXRpb24nKS5oaWdobGlnaHRzXG5cbiAgIyBMb2NhdGVzIHRoZSBuZXh0IGhpZ2hsaWdodGVkIGVsZW1lbnQgaW4gQGhpZ2hsaWdodHMgZnJvbSB0aGUgY3VycmVudCBvbmVcbiAgIyBvciBnb2VzIHRvIHRoZSB2ZXJ5IGZpcnN0IGVsZW1lbnQuXG4gICNcbiAgIyBldmVudCAtIEEgY2xpY2sgRXZlbnQuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmdcbiAgX29uTmV4dENsaWNrOiAoZXZlbnQpID0+XG4gICAgdGhpcy5fZmluZE5leHRIaWdobGlnaHQoKVxuXG4gICMgTG9jYXRlcyB0aGUgcHJldmlvdXMgaGlnaGxpZ2h0ZWQgZWxlbWVudCBpbiBAaGlnaGxpZ2h0cyBmcm9tIHRoZSBjdXJyZW50IG9uZVxuICAjIG9yIGdvZXMgdG8gdGhlIHZlcnkgbGFzdCBlbGVtZW50LlxuICAjXG4gICMgZXZlbnQgLSBBIGNsaWNrIEV2ZW50LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nXG4gIF9vblByZXZpb3VzQ2xpY2s6IChldmVudCkgPT5cbiAgICB0aGlzLl9maW5kTmV4dEhpZ2hsaWdodCB0cnVlXG5cbiAgIyBTY3JvbGxzIHRvIHRoZSBoaWdobGlnaHQgcHJvdmlkZWQuIEFuIGFkZHMgYW4gYWN0aXZlIGNsYXNzIHRvIGl0LlxuICAjXG4gICMgaGlnaGxpZ2h0IC0gRWl0aGVyIGhpZ2hsaWdodCBFbGVtZW50IG9yIGFuIEFycmF5IG9mIGVsZW1lbnRzLiBUaGlzIHZhbHVlXG4gICMgICAgICAgICAgICAgaXMgdXN1YWxseSByZXRyaWV2ZWQgZnJvbSBhbm5vdGF0aW9uLmhpZ2hsaWdodHMuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIF9zY3JvbGxUb0hpZ2hsaWdodDogKGhpZ2hsaWdodCkgLT5cbiAgICBoaWdobGlnaHQgPSAkKGhpZ2hsaWdodClcblxuICAgIEBoaWdobGlnaHRzLnJlbW92ZUNsYXNzKEBjbGFzc2VzLmhsLmFjdGl2ZSlcbiAgICBoaWdobGlnaHQuYWRkQ2xhc3MoQGNsYXNzZXMuaGwuYWN0aXZlKVxuXG4gICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuICAgICAgc2Nyb2xsVG9wOiBoaWdobGlnaHQub2Zmc2V0KCkudG9wIC0gKEBlbGVtZW50LmhlaWdodCgpICsgMjApXG4gICAgfSwgMTUwKVxuXG4gICMgQ2xlYXJzIHRoZSByZWxldmFudCBpbnB1dCB3aGVuIHRoZSBjbGVhciBidXR0b24gaXMgY2xpY2tlZC5cbiAgI1xuICAjIGV2ZW50IC0gQSBjbGljayBFdmVudCBvYmplY3QuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIF9vbkNsZWFyQ2xpY2s6IChldmVudCkgLT5cbiAgICAkKGV2ZW50LnRhcmdldCkucHJldignaW5wdXQnKS52YWwoJycpLmtleXVwKCkuYmx1cigpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBBbm5vdGF0b3IuUGx1Z2luLkZpbHRlclxuIiwiQW5ub3RhdG9yID0gcmVxdWlyZSgnYW5ub3RhdG9yJylcblxuXG4jIFBsdWdpbiB0aGF0IHJlbmRlcnMgYW5ub3RhdGlvbiBjb21tZW50cyBkaXNwbGF5ZWQgaW4gdGhlIFZpZXdlciBpbiBNYXJrZG93bi5cbiMgUmVxdWlyZXMgU2hvd2Rvd24gbGlicmFyeSB0byBiZSBwcmVzZW50IGluIHRoZSBwYWdlIHdoZW4gaW5pdGlhbGlzZWQuXG5jbGFzcyBBbm5vdGF0b3IuUGx1Z2luLk1hcmtkb3duIGV4dGVuZHMgQW5ub3RhdG9yLlBsdWdpblxuICAjIEV2ZW50cyB0byBiZSBib3VuZCB0byB0aGUgQGVsZW1lbnQuXG4gIGV2ZW50czpcbiAgICAnYW5ub3RhdGlvblZpZXdlclRleHRGaWVsZCc6ICd1cGRhdGVUZXh0RmllbGQnXG5cbiAgIyBQdWJsaWM6IEluaXRhaWxpc2VzIGFuIGluc3RhbmNlIG9mIHRoZSBNYXJrZG93biBwbHVnaW4uXG4gICNcbiAgIyBlbGVtZW50IC0gVGhlIEFubm90YXRvciNlbGVtZW50LlxuICAjIG9wdGlvbnMgLSBBbiBvcHRpb25zIE9iamVjdCAodGhlcmUgYXJlIGN1cnJlbnRseSBubyBvcHRpb25zKS5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHBsdWdpbiA9IG5ldyBBbm5vdGF0b3IuUGx1Z2luLk1hcmtkb3duKGFubm90YXRvci5lbGVtZW50KVxuICAjXG4gICMgUmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiBBbm5vdGF0b3IuUGx1Z2luLk1hcmtkb3duLlxuICBjb25zdHJ1Y3RvcjogKGVsZW1lbnQsIG9wdGlvbnMpIC0+XG4gICAgaWYgU2hvd2Rvd24/LmNvbnZlcnRlcj9cbiAgICAgIHN1cGVyXG4gICAgICBAY29udmVydGVyID0gbmV3IFNob3dkb3duLmNvbnZlcnRlcigpXG4gICAgZWxzZVxuICAgICAgY29uc29sZS5lcnJvciBBbm5vdGF0b3IuX3QoXCJUbyB1c2UgdGhlIE1hcmtkb3duIHBsdWdpbiwgeW91IG11c3QgaW5jbHVkZSBTaG93ZG93biBpbnRvIHRoZSBwYWdlIGZpcnN0LlwiKVxuXG4gICMgQW5ub3RhdG9yIGV2ZW50IGNhbGxiYWNrLiBEaXNwbGF5cyB0aGUgYW5ub3RhdGlvbi50ZXh0IGFzIGEgTWFya2Rvd25cbiAgIyByZW5kZXJlZCB2ZXJzaW9uLlxuICAjXG4gICMgZmllbGQgICAgICAtIFRoZSB2aWV3ZXIgZmllbGQgRWxlbWVudC5cbiAgIyBhbm5vdGF0aW9uIC0gVGhlIGFubm90YXRpb24gT2JqZWN0IGJlaW5nIGRpc3BsYXllZC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgTm9ybWFsbHkgY2FsbGVkIGJ5IEFubm90YXRvciN2aWV3ZXIoKVxuICAjICAgcGx1Z2luLnVwZGF0ZVRleHRGaWVsZChmaWVsZCwge3RleHQ6ICdNeSBfbWFya2Rvd25fIGNvbW1lbnQnfSlcbiAgIyAgICQoZmllbGQpLmh0bWwoKSAjID0+IFJldHVybnMgXCJNeSA8ZW0+bWFya2Rvd248L2VtPiBjb21tZW50XCJcbiAgI1xuICAjIFJldHVybnMgbm90aGluZ1xuICB1cGRhdGVUZXh0RmllbGQ6IChmaWVsZCwgYW5ub3RhdGlvbikgPT5cbiAgICAjIEVzY2FwZSBhbnkgSFRNTCBpbiB0aGUgdGV4dCB0byBwcmV2ZW50IFhTUy5cbiAgICB0ZXh0ID0gQW5ub3RhdG9yLlV0aWwuZXNjYXBlKGFubm90YXRpb24udGV4dCB8fCAnJylcbiAgICAkKGZpZWxkKS5odG1sKHRoaXMuY29udmVydCh0ZXh0KSlcblxuICAjIENvbnZlcnRzIHByb3ZpZGVkIHRleHQgaW50byBtYXJrZG93bi5cbiAgI1xuICAjIHRleHQgLSBBIFN0cmluZyBvZiBNYXJrZG93biB0byByZW5kZXIgYXMgSFRNTC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyBwbHVnaW4uY29udmVydCgnVGhpcyBpcyBfdmVyeV8gYmFzaWMgW01hcmtkb3duXShodHRwOi8vZGFyaW5nZmlyZWJhbGwuY29tKScpXG4gICMgIyA9PiBSZXR1cm5zIFwiVGhpcyBpcyA8ZW0+dmVyeTxlbT4gYmFzaWMgPGEgaHJlZj1cImh0dHA6Ly8uLi5cIj5NYXJrZG93bjwvYT5cIlxuICAjXG4gICMgUmV0dXJucyBIVE1MIHN0cmluZy5cbiAgY29udmVydDogKHRleHQpIC0+XG4gICAgQGNvbnZlcnRlci5tYWtlSHRtbCB0ZXh0XG5cblxubW9kdWxlLmV4cG9ydHMgPSBBbm5vdGF0b3IuUGx1Z2luLk1hcmtkb3duXG4iLCJBbm5vdGF0b3IgPSByZXF1aXJlKCdhbm5vdGF0b3InKVxuXG5cbiMgUHVibGljOiBQbHVnaW4gZm9yIHNldHRpbmcgcGVybWlzc2lvbnMgb24gbmV3bHkgY3JlYXRlZCBhbm5vdGF0aW9ucyBhcyB3ZWxsIGFzXG4jIG1hbmFnaW5nIHVzZXIgcGVybWlzc2lvbnMgc3VjaCBhcyB2aWV3aW5nL2VkaXRpbmcvZGVsZXRpbmcgYW5ub3Rpb25zLlxuI1xuIyBlbGVtZW50IC0gQSBET00gRWxlbWVudCB1cG9uIHdoaWNoIGV2ZW50cyBhcmUgYm91bmQuIFdoZW4gaW5pdGlhbGlzZWQgYnlcbiMgICAgICAgICAgIHRoZSBBbm5vdGF0b3IgaXQgaXMgdGhlIEFubm90YXRvciBlbGVtZW50LlxuIyBvcHRpb25zIC0gQW4gT2JqZWN0IGxpdGVyYWwgY29udGFpbmluZyBjdXN0b20gb3B0aW9ucy5cbiNcbiMgRXhhbXBsZXNcbiNcbiMgICBuZXcgQW5ub3RhdG9yLnBsdWdpbi5QZXJtaXNzaW9ucyhhbm5vdGF0b3IuZWxlbWVudCwge1xuIyAgICAgdXNlcjogJ0FsaWNlJ1xuIyAgIH0pXG4jXG4jIFJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIFBlcm1pc3Npb25zIE9iamVjdC5cbmNsYXNzIEFubm90YXRvci5QbHVnaW4uUGVybWlzc2lvbnMgZXh0ZW5kcyBBbm5vdGF0b3IuUGx1Z2luXG5cbiAgIyBBIE9iamVjdCBsaXRlcmFsIG9mIGRlZmF1bHQgb3B0aW9ucyBmb3IgdGhlIGNsYXNzLlxuICBvcHRpb25zOlxuXG4gICAgIyBEaXNwbGF5cyBhbiBcIkFueW9uZSBjYW4gdmlldyB0aGlzIGFubm90YXRpb25cIiBjaGVja2JveCBpbiB0aGUgRWRpdG9yLlxuICAgIHNob3dWaWV3UGVybWlzc2lvbnNDaGVja2JveDogdHJ1ZVxuXG4gICAgIyBEaXNwbGF5cyBhbiBcIkFueW9uZSBjYW4gZWRpdCB0aGlzIGFubm90YXRpb25cIiBjaGVja2JveCBpbiB0aGUgRWRpdG9yLlxuICAgIHNob3dFZGl0UGVybWlzc2lvbnNDaGVja2JveDogdHJ1ZVxuXG4gICAgIyBQdWJsaWM6IFVzZWQgYnkgdGhlIHBsdWdpbiB0byBkZXRlcm1pbmUgYSB1bmlxdWUgaWQgZm9yIHRoZSBAdXNlciBwcm9wZXJ0eS5cbiAgICAjIEJ5IGRlZmF1bHQgdGhpcyBhY2NlcHRzIGFuZCByZXR1cm5zIHRoZSB1c2VyIFN0cmluZyBidXQgY2FuIGJlIG92ZXItXG4gICAgIyByaWRkZW4gaW4gdGhlIEBvcHRpb25zIG9iamVjdCBwYXNzZWQgaW50byB0aGUgY29uc3RydWN0b3IuXG4gICAgI1xuICAgICMgdXNlciAtIEEgU3RyaW5nIHVzZXJuYW1lIG9yIG51bGwgaWYgbm8gdXNlciBpcyBzZXQuXG4gICAgI1xuICAgICMgUmV0dXJucyB0aGUgU3RyaW5nIHByb3ZpZGVkIGFzIHVzZXIgb2JqZWN0LlxuICAgIHVzZXJJZDogKHVzZXIpIC0+IHVzZXJcblxuICAgICMgUHVibGljOiBVc2VkIGJ5IHRoZSBwbHVnaW4gdG8gZGV0ZXJtaW5lIGEgZGlzcGxheSBuYW1lIGZvciB0aGUgQHVzZXJcbiAgICAjIHByb3BlcnR5LiBCeSBkZWZhdWx0IHRoaXMgYWNjZXB0cyBhbmQgcmV0dXJucyB0aGUgdXNlciBTdHJpbmcgYnV0IGNhbiBiZVxuICAgICMgb3Zlci1yaWRkZW4gaW4gdGhlIEBvcHRpb25zIG9iamVjdCBwYXNzZWQgaW50byB0aGUgY29uc3RydWN0b3IuXG4gICAgI1xuICAgICMgdXNlciAtIEEgU3RyaW5nIHVzZXJuYW1lIG9yIG51bGwgaWYgbm8gdXNlciBpcyBzZXQuXG4gICAgI1xuICAgICMgUmV0dXJucyB0aGUgU3RyaW5nIHByb3ZpZGVkIGFzIHVzZXIgb2JqZWN0XG4gICAgdXNlclN0cmluZzogKHVzZXIpIC0+IHVzZXJcblxuICAgICMgUHVibGljOiBVc2VkIGJ5IFBlcm1pc3Npb25zI2F1dGhvcml6ZSB0byBkZXRlcm1pbmUgd2hldGhlciBhIHVzZXIgY2FuXG4gICAgIyBwZXJmb3JtIGFuIGFjdGlvbiBvbiBhbiBhbm5vdGF0aW9uLiBPdmVycmlkaW5nIHRoaXMgZnVuY3Rpb24gYWxsb3dzXG4gICAgIyBhIGZhciBtb3JlIGNvbXBsZXggcGVybWlzc2lvbnMgc3lzeWVtLlxuICAgICNcbiAgICAjIEJ5IGRlZmF1bHQgdGhpcyBhdXRob3JpemVzIHRoZSBhY3Rpb24gaWYgYW55IG9mIHRocmVlIHNjZW5hcmlvcyBhcmUgdHJ1ZTpcbiAgICAjXG4gICAgIyAgICAgMSkgdGhlIGFubm90YXRpb24gaGFzIGEgJ3Blcm1pc3Npb25zJyBvYmplY3QsIGFuZCBlaXRoZXIgdGhlIGZpZWxkIGZvclxuICAgICMgICAgICAgIHRoZSBzcGVjaWZpZWQgYWN0aW9uIGlzIG1pc3NpbmcsIGVtcHR5LCBvciBjb250YWlucyB0aGUgdXNlcklkIG9mIHRoZVxuICAgICMgICAgICAgIGN1cnJlbnQgdXNlciwgaS5lLiBAb3B0aW9ucy51c2VySWQoQHVzZXIpXG4gICAgI1xuICAgICMgICAgIDIpIHRoZSBhbm5vdGF0aW9uIGhhcyBhICd1c2VyJyBwcm9wZXJ0eSwgYW5kIEBvcHRpb25zLnVzZXJJZChAdXNlcikgbWF0Y2hlc1xuICAgICMgICAgICAgICdhbm5vdGF0aW9uLnVzZXInXG4gICAgI1xuICAgICMgICAgIDMpIHRoZSBhbm5vdGF0aW9uIGhhcyBubyAncGVybWlzc2lvbnMnIG9yICd1c2VyJyBwcm9wZXJ0aWVzXG4gICAgI1xuICAgICMgYW5ub3RhdGlvbiAtIFRoZSBhbm5vdGF0aW9uIG9uIHdoaWNoIHRoZSBhY3Rpb24gaXMgYmVpbmcgcmVxdWVzdGVkLlxuICAgICMgYWN0aW9uIC0gVGhlIGFjdGlvbiBiZWluZyByZXF1ZXN0ZWQ6IGUuZy4gJ3VwZGF0ZScsICdkZWxldGUnLlxuICAgICMgdXNlciAtIFRoZSB1c2VyIG9iamVjdCAob3Igc3RyaW5nKSByZXF1ZXN0aW5nIHRoZSBhY3Rpb24uIFRoaXMgaXMgdXN1YWxseVxuICAgICMgICAgICAgIGF1dG9tYXRpY2FsbHkgcGFzc2VkIGJ5IFBlcm1pc3Npb25zI2F1dGhvcml6ZSBhcyB0aGUgY3VycmVudCB1c2VyIChAdXNlcilcbiAgICAjXG4gICAgIyAgIHBlcm1pc3Npb25zLnNldFVzZXIobnVsbClcbiAgICAjICAgcGVybWlzc2lvbnMuYXV0aG9yaXplKCd1cGRhdGUnLCB7fSlcbiAgICAjICAgIyA9PiB0cnVlXG4gICAgI1xuICAgICMgICBwZXJtaXNzaW9ucy5zZXRVc2VyKCdhbGljZScpXG4gICAgIyAgIHBlcm1pc3Npb25zLmF1dGhvcml6ZSgndXBkYXRlJywge3VzZXI6ICdhbGljZSd9KVxuICAgICMgICAjID0+IHRydWVcbiAgICAjICAgcGVybWlzc2lvbnMuYXV0aG9yaXplKCd1cGRhdGUnLCB7dXNlcjogJ2JvYid9KVxuICAgICMgICAjID0+IGZhbHNlXG4gICAgI1xuICAgICMgICBwZXJtaXNzaW9ucy5zZXRVc2VyKCdhbGljZScpXG4gICAgIyAgIHBlcm1pc3Npb25zLmF1dGhvcml6ZSgndXBkYXRlJywge1xuICAgICMgICAgIHVzZXI6ICdib2InLFxuICAgICMgICAgIHBlcm1pc3Npb25zOiBbJ3VwZGF0ZSc6IFsnYWxpY2UnLCAnYm9iJ11dXG4gICAgIyAgIH0pXG4gICAgIyAgICMgPT4gdHJ1ZVxuICAgICMgICBwZXJtaXNzaW9ucy5hdXRob3JpemUoJ2Rlc3Ryb3knLCB7XG4gICAgIyAgICAgdXNlcjogJ2JvYicsXG4gICAgIyAgICAgcGVybWlzc2lvbnM6IFtcbiAgICAjICAgICAgICd1cGRhdGUnOiBbJ2FsaWNlJywgJ2JvYiddXG4gICAgIyAgICAgICAnZGVzdHJveSc6IFsnYm9iJ11cbiAgICAjICAgICBdXG4gICAgIyAgIH0pXG4gICAgIyAgICMgPT4gZmFsc2VcbiAgICAjXG4gICAgIyBSZXR1cm5zIGEgQm9vbGVhbiwgdHJ1ZSBpZiB0aGUgdXNlciBpcyBhdXRob3Jpc2VkIGZvciB0aGUgdG9rZW4gcHJvdmlkZWQuXG4gICAgdXNlckF1dGhvcml6ZTogKGFjdGlvbiwgYW5ub3RhdGlvbiwgdXNlcikgLT5cbiAgICAgICMgRmluZS1ncmFpbmVkIGN1c3RvbSBhdXRob3JpemF0aW9uXG4gICAgICBpZiBhbm5vdGF0aW9uLnBlcm1pc3Npb25zXG4gICAgICAgIHRva2VucyA9IGFubm90YXRpb24ucGVybWlzc2lvbnNbYWN0aW9uXSB8fCBbXVxuXG4gICAgICAgIGlmIHRva2Vucy5sZW5ndGggPT0gMFxuICAgICAgICAgICMgRW1wdHkgb3IgbWlzc2luZyB0b2tlbnMgYXJyYXk6IGFueW9uZSBjYW4gcGVyZm9ybSBhY3Rpb24uXG4gICAgICAgICAgcmV0dXJuIHRydWVcblxuICAgICAgICBmb3IgdG9rZW4gaW4gdG9rZW5zXG4gICAgICAgICAgaWYgdGhpcy51c2VySWQodXNlcikgPT0gdG9rZW5cbiAgICAgICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgICAgIyBObyB0b2tlbnMgbWF0Y2hlZDogYWN0aW9uIHNob3VsZCBub3QgYmUgcGVyZm9ybWVkLlxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgIyBDb2Fyc2UtZ3JhaW5lZCBhdXRob3JpemF0aW9uXG4gICAgICBlbHNlIGlmIGFubm90YXRpb24udXNlclxuICAgICAgICBpZiB1c2VyXG4gICAgICAgICAgcmV0dXJuIHRoaXMudXNlcklkKHVzZXIpID09IHRoaXMudXNlcklkKGFubm90YXRpb24udXNlcilcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICAjIE5vIGF1dGhvcml6YXRpb24gaW5mbyBvbiBhbm5vdGF0aW9uOiBmcmVlLWZvci1hbGwhXG4gICAgICB0cnVlXG5cbiAgICAjIERlZmF1bHQgdXNlciBvYmplY3QuXG4gICAgdXNlcjogJydcblxuICAgICMgRGVmYXVsdCBwZXJtaXNzaW9ucyBmb3IgYWxsIGFubm90YXRpb25zLiBBbnlvbmUgY2FuIGRvIGFueXRoaW5nXG4gICAgIyAoYXNzdW1pbmcgZGVmYXVsdCB1c2VyQXV0aG9yaXplIGZ1bmN0aW9uKS5cbiAgICBwZXJtaXNzaW9uczoge1xuICAgICAgJ3JlYWQnOiAgIFtdXG4gICAgICAndXBkYXRlJzogW11cbiAgICAgICdkZWxldGUnOiBbXVxuICAgICAgJ2FkbWluJzogIFtdXG4gICAgfVxuXG4gICMgVGhlIGNvbnN0cnVjdG9yIGNhbGxlZCB3aGVuIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBQZXJtaXNzaW9uc1xuICAjIHBsdWdpbiBpcyBjcmVhdGVkLiBTZWUgY2xhc3MgZG9jdW1lbnRhdGlvbiBmb3IgdXNhZ2UuXG4gICNcbiAgIyBlbGVtZW50IC0gQSBET00gRWxlbWVudCB1cG9uIHdoaWNoIGV2ZW50cyBhcmUgYm91bmQuLlxuICAjIG9wdGlvbnMgLSBBbiBPYmplY3QgbGl0ZXJhbCBjb250YWluaW5nIGN1c3RvbSBvcHRpb25zLlxuICAjXG4gICMgUmV0dXJucyBhbiBpbnN0YW5jZSBvZiB0aGUgUGVybWlzc2lvbnMgb2JqZWN0LlxuICBjb25zdHJ1Y3RvcjogKGVsZW1lbnQsIG9wdGlvbnMpIC0+XG4gICAgc3VwZXJcblxuICAgIGlmIEBvcHRpb25zLnVzZXJcbiAgICAgIHRoaXMuc2V0VXNlcihAb3B0aW9ucy51c2VyKVxuICAgICAgZGVsZXRlIEBvcHRpb25zLnVzZXJcblxuICAjIFB1YmxpYzogSW5pdGlhbGl6ZXMgdGhlIHBsdWdpbiBhbmQgcmVnaXN0ZXJzIGZpZWxkcyB3aXRoIHRoZVxuICAjIEFubm90YXRvci5FZGl0b3IgYW5kIEFubm90YXRvci5WaWV3ZXIuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHBsdWdpbkluaXQ6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBBbm5vdGF0b3Iuc3VwcG9ydGVkKClcblxuICAgIEBhbm5vdGF0b3Iuc3Vic2NyaWJlKCdiZWZvcmVBbm5vdGF0aW9uQ3JlYXRlZCcsIHRoaXMuYWRkRmllbGRzVG9Bbm5vdGF0aW9uKVxuXG4gICAgc2VsZiA9IHRoaXNcbiAgICBjcmVhdGVDYWxsYmFjayA9IChtZXRob2QsIHR5cGUpIC0+XG4gICAgICAoZmllbGQsIGFubm90YXRpb24pIC0+IHNlbGZbbWV0aG9kXS5jYWxsKHNlbGYsIHR5cGUsIGZpZWxkLCBhbm5vdGF0aW9uKVxuXG4gICAgIyBTZXQgdXAgdXNlciBhbmQgZGVmYXVsdCBwZXJtaXNzaW9ucyBmcm9tIGF1dGggdG9rZW4gaWYgbm9uZSBjdXJyZW50bHkgZ2l2ZW5cbiAgICBpZiAhQHVzZXIgYW5kIEBhbm5vdGF0b3IucGx1Z2lucy5BdXRoXG4gICAgICBAYW5ub3RhdG9yLnBsdWdpbnMuQXV0aC53aXRoVG9rZW4odGhpcy5fc2V0QXV0aEZyb21Ub2tlbilcblxuICAgIGlmIEBvcHRpb25zLnNob3dWaWV3UGVybWlzc2lvbnNDaGVja2JveCA9PSB0cnVlXG4gICAgICBAYW5ub3RhdG9yLmVkaXRvci5hZGRGaWVsZCh7XG4gICAgICAgIHR5cGU6ICAgJ2NoZWNrYm94J1xuICAgICAgICBsYWJlbDogIEFubm90YXRvci5fdCgnQWxsb3cgYW55b25lIHRvIDxzdHJvbmc+dmlldzwvc3Ryb25nPiB0aGlzIGFubm90YXRpb24nKVxuICAgICAgICBsb2FkOiAgIGNyZWF0ZUNhbGxiYWNrKCd1cGRhdGVQZXJtaXNzaW9uc0ZpZWxkJywgJ3JlYWQnKVxuICAgICAgICBzdWJtaXQ6IGNyZWF0ZUNhbGxiYWNrKCd1cGRhdGVBbm5vdGF0aW9uUGVybWlzc2lvbnMnLCAncmVhZCcpXG4gICAgICB9KVxuXG4gICAgaWYgQG9wdGlvbnMuc2hvd0VkaXRQZXJtaXNzaW9uc0NoZWNrYm94ID09IHRydWVcbiAgICAgIEBhbm5vdGF0b3IuZWRpdG9yLmFkZEZpZWxkKHtcbiAgICAgICAgdHlwZTogICAnY2hlY2tib3gnXG4gICAgICAgIGxhYmVsOiAgQW5ub3RhdG9yLl90KCdBbGxvdyBhbnlvbmUgdG8gPHN0cm9uZz5lZGl0PC9zdHJvbmc+IHRoaXMgYW5ub3RhdGlvbicpXG4gICAgICAgIGxvYWQ6ICAgY3JlYXRlQ2FsbGJhY2soJ3VwZGF0ZVBlcm1pc3Npb25zRmllbGQnLCAndXBkYXRlJylcbiAgICAgICAgc3VibWl0OiBjcmVhdGVDYWxsYmFjaygndXBkYXRlQW5ub3RhdGlvblBlcm1pc3Npb25zJywgJ3VwZGF0ZScpXG4gICAgICB9KVxuXG4gICAgIyBTZXR1cCB0aGUgZGlzcGxheSBvZiBhbm5vdGF0aW9ucyBpbiB0aGUgVmlld2VyLlxuICAgIEBhbm5vdGF0b3Iudmlld2VyLmFkZEZpZWxkKHtcbiAgICAgIGxvYWQ6IHRoaXMudXBkYXRlVmlld2VyXG4gICAgfSlcblxuICAgICMgQWRkIGEgZmlsdGVyIHRvIHRoZSBGaWx0ZXIgcGx1Z2luIGlmIGxvYWRlZC5cbiAgICBpZiBAYW5ub3RhdG9yLnBsdWdpbnMuRmlsdGVyXG4gICAgICBAYW5ub3RhdG9yLnBsdWdpbnMuRmlsdGVyLmFkZEZpbHRlcih7XG4gICAgICAgIGxhYmVsOiBBbm5vdGF0b3IuX3QoJ1VzZXInKVxuICAgICAgICBwcm9wZXJ0eTogJ3VzZXInXG4gICAgICAgIGlzRmlsdGVyZWQ6IChpbnB1dCwgdXNlcikgPT5cbiAgICAgICAgICB1c2VyID0gQG9wdGlvbnMudXNlclN0cmluZyh1c2VyKVxuXG4gICAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBpbnB1dCBhbmQgdXNlclxuICAgICAgICAgIGZvciBrZXl3b3JkIGluIChpbnB1dC5zcGxpdCAvXFxzKi8pXG4gICAgICAgICAgICByZXR1cm4gZmFsc2UgaWYgdXNlci5pbmRleE9mKGtleXdvcmQpID09IC0xXG5cbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSlcblxuICAjIFB1YmxpYzogU2V0cyB0aGUgUGVybWlzc2lvbnMjdXNlciBwcm9wZXJ0eS5cbiAgI1xuICAjIHVzZXIgLSBBIFN0cmluZyBvciBPYmplY3QgdG8gcmVwcmVzZW50IHRoZSBjdXJyZW50IHVzZXIuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBwZXJtaXNzaW9ucy5zZXRVc2VyKCdBbGljZScpXG4gICNcbiAgIyAgIHBlcm1pc3Npb25zLnNldFVzZXIoe2lkOiAzNSwgbmFtZTogJ0FsaWNlJ30pXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHNldFVzZXI6ICh1c2VyKSAtPlxuICAgIEB1c2VyID0gdXNlclxuXG4gICMgRXZlbnQgY2FsbGJhY2s6IEFwcGVuZHMgdGhlIEB1c2VyIGFuZCBAb3B0aW9ucy5wZXJtaXNzaW9ucyBvYmplY3RzIHRvIHRoZVxuICAjIHByb3ZpZGVkIGFubm90YXRpb24gb2JqZWN0LiBPbmx5IGFwcGVuZHMgdGhlIHVzZXIgaWYgb25lIGhhcyBiZWVuIHNldC5cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIG9iamVjdC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGFubm90YXRpb24gPSB7dGV4dDogJ015IGNvbW1lbnQnfVxuICAjICAgcGVybWlzc2lvbnMuYWRkRmllbGRzVG9Bbm5vdGF0aW9uKGFubm90YXRpb24pXG4gICMgICBjb25zb2xlLmxvZyhhbm5vdGF0aW9uKVxuICAjICAgIyA9PiB7dGV4dDogJ015IGNvbW1lbnQnLCBwZXJtaXNzaW9uczogey4uLn19XG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIGFkZEZpZWxkc1RvQW5ub3RhdGlvbjogKGFubm90YXRpb24pID0+XG4gICAgaWYgYW5ub3RhdGlvblxuICAgICAgYW5ub3RhdGlvbi5wZXJtaXNzaW9ucyA9IEBvcHRpb25zLnBlcm1pc3Npb25zXG4gICAgICBpZiBAdXNlclxuICAgICAgICBhbm5vdGF0aW9uLnVzZXIgPSBAdXNlclxuXG4gICMgUHVibGljOiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHByb3ZpZGVkIGFjdGlvbiBjYW4gYmUgcGVyZm9ybWVkIG9uIHRoZVxuICAjIGFubm90YXRpb24uIFRoaXMgdXNlcyB0aGUgdXNlci1jb25maWd1cmFibGUgJ3VzZXJBdXRob3JpemUnIG1ldGhvZCB0b1xuICAjIGRldGVybWluZSBpZiBhbiBhbm5vdGF0aW9uIGlzIGFubm90YXRhYmxlLiBTZWUgdGhlIGRlZmF1bHQgbWV0aG9kIGZvclxuICAjIGRvY3VtZW50YXRpb24gb24gaXRzIGJlaGF2aW91ci5cbiAgI1xuICAjIFJldHVybnMgYSBCb29sZWFuLCB0cnVlIGlmIHRoZSBhY3Rpb24gY2FuIGJlIHBlcmZvcm1lZCBvbiB0aGUgYW5ub3RhdGlvbi5cbiAgYXV0aG9yaXplOiAoYWN0aW9uLCBhbm5vdGF0aW9uLCB1c2VyKSAtPlxuICAgIHVzZXIgPSBAdXNlciBpZiB1c2VyID09IHVuZGVmaW5lZFxuXG4gICAgaWYgQG9wdGlvbnMudXNlckF1dGhvcml6ZVxuICAgICAgcmV0dXJuIEBvcHRpb25zLnVzZXJBdXRob3JpemUuY2FsbChAb3B0aW9ucywgYWN0aW9uLCBhbm5vdGF0aW9uLCB1c2VyKVxuXG4gICAgZWxzZSAjIHVzZXJBdXRob3JpemUgbnVsbGVkIG91dDogZnJlZS1mb3ItYWxsIVxuICAgICAgcmV0dXJuIHRydWVcblxuICAjIEZpZWxkIGNhbGxiYWNrOiBVcGRhdGVzIHRoZSBzdGF0ZSBvZiB0aGUgXCJhbnlvbmUgY2Fu4oCmXCIgY2hlY2tib3hlc1xuICAjXG4gICMgYWN0aW9uICAgICAtIFRoZSBhY3Rpb24gU3RyaW5nLCBlaXRoZXIgXCJ2aWV3XCIgb3IgXCJ1cGRhdGVcIlxuICAjIGZpZWxkICAgICAgLSBBIERPTSBFbGVtZW50IGNvbnRhaW5pbmcgYSBmb3JtIGlucHV0LlxuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgdXBkYXRlUGVybWlzc2lvbnNGaWVsZDogKGFjdGlvbiwgZmllbGQsIGFubm90YXRpb24pID0+XG4gICAgZmllbGQgPSAkKGZpZWxkKS5zaG93KClcbiAgICBpbnB1dCA9IGZpZWxkLmZpbmQoJ2lucHV0JykucmVtb3ZlQXR0cignZGlzYWJsZWQnKVxuXG4gICAgIyBEbyBub3Qgc2hvdyBmaWVsZCBpZiBjdXJyZW50IHVzZXIgaXMgbm90IGFkbWluLlxuICAgIGZpZWxkLmhpZGUoKSB1bmxlc3MgdGhpcy5hdXRob3JpemUoJ2FkbWluJywgYW5ub3RhdGlvbilcblxuICAgICMgU2VlIGlmIHdlIGNhbiBhdXRob3Jpc2Ugd2l0aG91dCBhIHVzZXIuXG4gICAgaWYgdGhpcy5hdXRob3JpemUoYWN0aW9uLCBhbm5vdGF0aW9uIHx8IHt9LCBudWxsKVxuICAgICAgaW5wdXQuYXR0cignY2hlY2tlZCcsICdjaGVja2VkJylcbiAgICBlbHNlXG4gICAgICBpbnB1dC5yZW1vdmVBdHRyKCdjaGVja2VkJylcblxuXG4gICMgRmllbGQgY2FsbGJhY2s6IHVwZGF0ZXMgdGhlIGFubm90YXRpb24ucGVybWlzc2lvbnMgb2JqZWN0IGJhc2VkIG9uIHRoZSBzdGF0ZVxuICAjIG9mIHRoZSBmaWVsZCBjaGVja2JveC4gSWYgaXQgaXMgY2hlY2tlZCB0aGVuIHBlcm1pc3Npb25zIGFyZSBzZXQgdG8gd29ybGRcbiAgIyB3cml0YWJsZSBvdGhlcndpc2UgdGhleSB1c2UgdGhlIG9yaWdpbmFsIHNldHRpbmdzLlxuICAjXG4gICMgYWN0aW9uICAgICAtIFRoZSBhY3Rpb24gU3RyaW5nLCBlaXRoZXIgXCJ2aWV3XCIgb3IgXCJ1cGRhdGVcIlxuICAjIGZpZWxkICAgICAgLSBBIERPTSBFbGVtZW50IHJlcHJlc2VudGluZyB0aGUgYW5ub3RhdGlvbiBlZGl0b3IuXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gT2JqZWN0LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICB1cGRhdGVBbm5vdGF0aW9uUGVybWlzc2lvbnM6ICh0eXBlLCBmaWVsZCwgYW5ub3RhdGlvbikgPT5cbiAgICBhbm5vdGF0aW9uLnBlcm1pc3Npb25zID0gQG9wdGlvbnMucGVybWlzc2lvbnMgdW5sZXNzIGFubm90YXRpb24ucGVybWlzc2lvbnNcblxuICAgIGRhdGFLZXkgPSB0eXBlICsgJy1wZXJtaXNzaW9ucydcblxuICAgIGlmICQoZmllbGQpLmZpbmQoJ2lucHV0JykuaXMoJzpjaGVja2VkJylcbiAgICAgIGFubm90YXRpb24ucGVybWlzc2lvbnNbdHlwZV0gPSBbXVxuICAgIGVsc2VcbiAgICAgICMgQ2xlYXJseSwgdGhlIHBlcm1pc3Npb25zIG1vZGVsIGFsbG93cyBmb3IgbW9yZSBjb21wbGV4IGVudHJpZXMgdGhhbiB0aGlzLFxuICAgICAgIyBidXQgb3VyIFVJIHByZXNlbnRzIGEgY2hlY2tib3gsIHNvIHdlIGNhbiBvbmx5IGludGVycHJldCBcInByZXZlbnQgb3RoZXJzXG4gICAgICAjIGZyb20gdmlld2luZ1wiIGFzIG1lYW5pbmcgXCJhbGxvdyBvbmx5IG1lIHRvIHZpZXdcIi4gVGhpcyBtYXkgd2FudCBjaGFuZ2luZ1xuICAgICAgIyBpbiB0aGUgZnV0dXJlLlxuICAgICAgYW5ub3RhdGlvbi5wZXJtaXNzaW9uc1t0eXBlXSA9IFtAb3B0aW9ucy51c2VySWQoQHVzZXIpXVxuXG4gICMgRmllbGQgY2FsbGJhY2s6IHVwZGF0ZXMgdGhlIGFubm90YXRpb24gdmlld2VyIHRvIGlubHVkZSB0aGUgZGlzcGxheSBuYW1lXG4gICMgZm9yIHRoZSB1c2VyIG9idGFpbmVkIHRocm91Z2ggUGVybWlzc2lvbnMjb3B0aW9ucy51c2VyU3RyaW5nKCkuXG4gICNcbiAgIyBmaWVsZCAgICAgIC0gQSBESVYgRWxlbWVudCByZXByZXNlbnRpbmcgdGhlIGFubm90YXRpb24gZmllbGQuXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gT2JqZWN0IHRvIGRpc3BsYXkuXG4gICMgY29udHJvbHMgICAtIEEgY29udHJvbCBPYmplY3QgdG8gdG9nZ2xlIHRoZSBkaXNwbGF5IG9mIGFubm90YXRpb24gY29udHJvbHMuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHVwZGF0ZVZpZXdlcjogKGZpZWxkLCBhbm5vdGF0aW9uLCBjb250cm9scykgPT5cbiAgICBmaWVsZCA9ICQoZmllbGQpXG5cbiAgICB1c2VybmFtZSA9IEBvcHRpb25zLnVzZXJTdHJpbmcgYW5ub3RhdGlvbi51c2VyXG4gICAgaWYgYW5ub3RhdGlvbi51c2VyIGFuZCB1c2VybmFtZSBhbmQgdHlwZW9mIHVzZXJuYW1lID09ICdzdHJpbmcnXG4gICAgICB1c2VyID0gQW5ub3RhdG9yLlV0aWwuZXNjYXBlKEBvcHRpb25zLnVzZXJTdHJpbmcoYW5ub3RhdGlvbi51c2VyKSlcbiAgICAgIGZpZWxkLmh0bWwodXNlcikuYWRkQ2xhc3MoJ2Fubm90YXRvci11c2VyJylcbiAgICBlbHNlXG4gICAgICBmaWVsZC5yZW1vdmUoKVxuXG4gICAgaWYgY29udHJvbHNcbiAgICAgIGNvbnRyb2xzLmhpZGVFZGl0KCkgICB1bmxlc3MgdGhpcy5hdXRob3JpemUoJ3VwZGF0ZScsIGFubm90YXRpb24pXG4gICAgICBjb250cm9scy5oaWRlRGVsZXRlKCkgdW5sZXNzIHRoaXMuYXV0aG9yaXplKCdkZWxldGUnLCBhbm5vdGF0aW9uKVxuXG4gICMgU2V0cyB0aGUgUGVybWlzc2lvbnMjdXNlciBwcm9wZXJ0eSBvbiB0aGUgYmFzaXMgb2YgYSByZWNlaXZlZCBhdXRoVG9rZW4uXG4gICNcbiAgIyB0b2tlbiAtIHRoZSBhdXRoVG9rZW4gcmVjZWl2ZWQgYnkgdGhlIEF1dGggcGx1Z2luXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIF9zZXRBdXRoRnJvbVRva2VuOiAodG9rZW4pID0+XG4gICAgdGhpcy5zZXRVc2VyKHRva2VuLnVzZXJJZClcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEFubm90YXRvci5QbHVnaW4uUGVybWlzc2lvbnNcbiIsIkFubm90YXRvciA9IHJlcXVpcmUoJ2Fubm90YXRvcicpXG5cblxuIyBQdWJsaWM6IFRoZSBTdG9yZSBwbHVnaW4gY2FuIGJlIHVzZWQgdG8gcGVyc2lzdCBhbm5vdGF0aW9ucyB0byBhIGRhdGFiYXNlXG4jIHJ1bm5pbmcgb24geW91ciBzZXJ2ZXIuIEl0IGhhcyBhIHNpbXBsZSBjdXN0b21pc2FibGUgaW50ZXJmYWNlIHRoYXQgY2FuIGJlXG4jIGltcGxlbWVudGVkIHdpdGggYW55IHdlYiBmcmFtZXdvcmsuIEl0IHdvcmtzIGJ5IGxpc3RlbmluZyB0byBldmVudHMgcHVibGlzaGVkXG4jIGJ5IHRoZSBBbm5vdGF0b3IgYW5kIG1ha2luZyBhcHByb3ByaWF0ZSByZXF1ZXN0cyB0byB0aGUgc2VydmVyIGRlcGVuZGluZyBvblxuIyB0aGUgZXZlbnQuXG4jXG4jIFRoZSBzdG9yZSBoYW5kbGVzIGZpdmUgZGlzdGluY3QgYWN0aW9ucyBcInJlYWRcIiwgXCJzZWFyY2hcIiwgXCJjcmVhdGVcIiwgXCJ1cGRhdGVcIlxuIyBhbmQgXCJkZXN0cm95XCIuIFRoZSByZXF1ZXN0cyBtYWRlIGNhbiBiZSBjdXN0b21pc2VkIHdpdGggb3B0aW9ucyB3aGVuIHRoZVxuIyBwbHVnaW4gaXMgYWRkZWQgdG8gdGhlIEFubm90YXRvci5cbmNsYXNzIEFubm90YXRvci5QbHVnaW4uU3RvcmVcblxuICAjIFVzZXIgY3VzdG9taXNhYmxlIG9wdGlvbnMgYXZhaWxhYmxlLlxuICBvcHRpb25zOlxuXG4gICAgIyBDdXN0b20gbWV0YSBkYXRhIHRoYXQgd2lsbCBiZSBhdHRhY2hlZCB0byBldmVyeSBhbm5vdGF0aW9uIHRoYXQgaXMgc2VudFxuICAgICMgdG8gdGhlIHNlcnZlci4gVGhpcyBfd2lsbF8gb3ZlcnJpZGUgcHJldmlvdXMgdmFsdWVzLlxuICAgIGFubm90YXRpb25EYXRhOiB7fVxuXG4gICAgIyBTaG91bGQgdGhlIHBsdWdpbiBlbXVsYXRlIEhUVFAgbWV0aG9kcyBsaWtlIFBVVCBhbmQgREVMRVRFIGZvclxuICAgICMgaW50ZXJhY3Rpb24gd2l0aCBsZWdhY3kgd2ViIHNlcnZlcnM/IFNldHRpbmcgdGhpcyB0byBgdHJ1ZWAgd2lsbCBmYWtlXG4gICAgIyBIVFRQIGBQVVRgIGFuZCBgREVMRVRFYCByZXF1ZXN0cyB3aXRoIGFuIEhUVFAgYFBPU1RgLCBhbmQgd2lsbCBzZXQgdGhlXG4gICAgIyByZXF1ZXN0IGhlYWRlciBgWC1IVFRQLU1ldGhvZC1PdmVycmlkZWAgd2l0aCB0aGUgbmFtZSBvZiB0aGUgZGVzaXJlZFxuICAgICMgbWV0aG9kLlxuICAgIGVtdWxhdGVIVFRQOiBmYWxzZVxuXG4gICAgIyBTaG91bGQgdGhlIHBsdWdpbiBlbXVsYXRlIEpTT04gUE9TVC9QVVQgcGF5bG9hZHMgYnkgc2VuZGluZyBpdHMgcmVxdWVzdHNcbiAgICAjIGFzIGFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCB3aXRoIGEgc2luZ2xlIGtleSwgXCJqc29uXCJcbiAgICBlbXVsYXRlSlNPTjogZmFsc2VcblxuICAgICMgQSBzZXQgb2YgY3VzdG9tIGhlYWRlcnMgdGhhdCB3aWxsIGJlIHNlbnQgd2l0aCBldmVyeSByZXF1ZXN0LiBTZWUgYWxzbyB0aGVcbiAgICAjIHNldEhlYWRlciBtZXRob2QuXG4gICAgaGVhZGVyczoge31cblxuICAgICMgVGhpcyBpcyB0aGUgQVBJIGVuZHBvaW50LiBJZiB0aGUgc2VydmVyIHN1cHBvcnRzIENyb3NzIE9yaWdpbiBSZXNvdXJjZVxuICAgICMgU2hhcmluZyAoQ09SUykgYSBmdWxsIFVSTCBjYW4gYmUgdXNlZCBoZXJlLlxuICAgIHByZWZpeDogJy9zdG9yZSdcblxuICAgICMgVGhlIHNlcnZlciBVUkxzIGZvciBlYWNoIGF2YWlsYWJsZSBhY3Rpb24uIFRoZXNlIFVSTHMgY2FuIGJlIGFueXRoaW5nIGJ1dFxuICAgICMgbXVzdCByZXNwb25kIHRvIHRoZSBhcHByb3ByYWl0ZSBIVFRQIG1ldGhvZC4gVGhlIHRva2VuIFwiOmlkXCIgY2FuIGJlIHVzZWRcbiAgICAjIGFueXdoZXJlIGluIHRoZSBVUkwgYW5kIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCB0aGUgYW5ub3RhdGlvbiBpZC5cbiAgICAjXG4gICAgIyByZWFkOiAgICBHRVRcbiAgICAjIGNyZWF0ZTogIFBPU1RcbiAgICAjIHVwZGF0ZTogIFBVVFxuICAgICMgZGVzdHJveTogREVMRVRFXG4gICAgIyBzZWFyY2g6ICBHRVRcbiAgICB1cmxzOlxuICAgICAgY3JlYXRlOiAgJy9hbm5vdGF0aW9ucydcbiAgICAgIHJlYWQ6ICAgICcvYW5ub3RhdGlvbnMvOmlkJ1xuICAgICAgdXBkYXRlOiAgJy9hbm5vdGF0aW9ucy86aWQnXG4gICAgICBkZXN0cm95OiAnL2Fubm90YXRpb25zLzppZCdcbiAgICAgIHNlYXJjaDogICcvc2VhcmNoJ1xuXG4gICMgUHVibGljOiBUaGUgY29udHNydWN0b3IgaW5pdGFpbGFzZXMgdGhlIFN0b3JlIGluc3RhbmNlLiBJdCByZXF1aXJlcyB0aGVcbiAgIyBBbm5vdGF0b3IjZWxlbWVudCBhbmQgYW4gT2JqZWN0IG9mIG9wdGlvbnMuXG4gICNcbiAgIyBlbGVtZW50IC0gVGhpcyBtdXN0IGJlIHRoZSBBbm5vdGF0b3IjZWxlbWVudCBpbiBvcmRlciB0byBsaXN0ZW4gZm9yIGV2ZW50cy5cbiAgIyBvcHRpb25zIC0gQW4gT2JqZWN0IG9mIGtleS92YWx1ZSB1c2VyIG9wdGlvbnMuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBzdG9yZSA9IG5ldyBBbm5vdGF0b3IuUGx1Z2luLlN0b3JlKEFubm90YXRvci5lbGVtZW50LCB7XG4gICMgICAgIHByZWZpeDogJ2h0dHA6Ly9hbm5vdGF0ZWl0Lm9yZycsXG4gICMgICAgIGFubm90YXRpb25EYXRhOiB7XG4gICMgICAgICAgdXJpOiB3aW5kb3cubG9jYXRpb24uaHJlZlxuICAjICAgICB9XG4gICMgICB9KVxuICAjXG4gICMgUmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiBTdG9yZS5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIEBvcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIEBvcHRpb25zLCBvcHRpb25zKVxuXG4gICMgUHVibGljOiBDYWxsYmFjayBtZXRob2QgZm9yIGFubm90YXRpb25DcmVhdGVkIGV2ZW50LiBSZWNlaXZlcyBhbiBhbm5vdGF0aW9uXG4gICMgYW5kIHNlbmRzIGEgUE9TVCByZXF1ZXN0IHRvIHRoZSBzZXZlciB1c2luZyB0aGUgVVJJIGZvciB0aGUgXCJjcmVhdGVcIiBhY3Rpb24uXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBPYmplY3QgdGhhdCB3YXMgY3JlYXRlZC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHN0b3JlLmFubm90YXRpb25DcmVhdGVkKHt0ZXh0OiBcIm15IG5ldyBhbm5vdGF0aW9uIGNvbW1lbnRcIn0pXG4gICMgICAjID0+IFJlc3VsdHMgaW4gYW4gSFRUUCBQT1NUIHJlcXVlc3QgdG8gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZVxuICAjICAgIyAgICBhbm5vdGF0aW9uIGFzIHNlcmlhbGlzZWQgSlNPTi5cbiAgI1xuICAjIFJldHVybnMgYSBqcVhIUiBvYmplY3QuXG4gIGNyZWF0ZTogKGFubm90YXRpb24pIC0+XG4gICAgdGhpcy5fYXBpUmVxdWVzdCgnY3JlYXRlJywgYW5ub3RhdGlvbilcblxuICAjIFB1YmxpYzogQ2FsbGJhY2sgbWV0aG9kIGZvciBhbm5vdGF0aW9uVXBkYXRlZCBldmVudC4gUmVjZWl2ZXMgYW4gYW5ub3RhdGlvblxuICAjIGFuZCBzZW5kcyBhIFBVVCByZXF1ZXN0IHRvIHRoZSBzZXZlciB1c2luZyB0aGUgVVJJIGZvciB0aGUgXCJ1cGRhdGVcIiBhY3Rpb24uXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBPYmplY3QgdGhhdCB3YXMgdXBkYXRlZC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHN0b3JlLmFubm90YXRpb25VcGRhdGVkKHtpZDogXCJibGFoXCIsIHRleHQ6IFwidXBkYXRlZCBhbm5vdGF0aW9uIGNvbW1lbnRcIn0pXG4gICMgICAjID0+IFJlc3VsdHMgaW4gYW4gSFRUUCBQVVQgcmVxdWVzdCB0byB0aGUgc2VydmVyIGNvbnRhaW5pbmcgdGhlXG4gICMgICAjICAgIGFubm90YXRpb24gYXMgc2VyaWFsaXNlZCBKU09OLlxuICAjXG4gICMgUmV0dXJucyBhIGpxWEhSIG9iamVjdC5cbiAgdXBkYXRlOiAoYW5ub3RhdGlvbikgLT5cbiAgICB0aGlzLl9hcGlSZXF1ZXN0KCd1cGRhdGUnLCBhbm5vdGF0aW9uKVxuXG4gICMgUHVibGljOiBDYWxsYmFjayBtZXRob2QgZm9yIGFubm90YXRpb25EZWxldGVkIGV2ZW50LiBSZWNlaXZlcyBhbiBhbm5vdGF0aW9uXG4gICMgYW5kIHNlbmRzIGEgREVMRVRFIHJlcXVlc3QgdG8gdGhlIHNlcnZlciB1c2luZyB0aGUgVVJJIGZvciB0aGUgZGVzdHJveVxuICAjIGFjdGlvbi5cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdCB0aGF0IHdhcyBkZWxldGVkLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgc3RvcmUuYW5ub3RhdGlvbkRlbGV0ZWQoe3RleHQ6IFwibXkgbmV3IGFubm90YXRpb24gY29tbWVudFwifSlcbiAgIyAgICMgPT4gUmVzdWx0cyBpbiBhbiBIVFRQIERFTEVURSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIuXG4gICNcbiAgIyBSZXR1cm5zIGEganFYSFIgb2JqZWN0LlxuICBkZWxldGU6IChhbm5vdGF0aW9uKSAtPlxuICAgIHRoaXMuX2FwaVJlcXVlc3QoJ2Rlc3Ryb3knLCBhbm5vdGF0aW9uKVxuXG4gICMgUHVibGljOiBTZWFyY2hlcyBmb3IgYW5ub3RhdGlvbnMgbWF0Y2hpbmcgdGhlIHNwZWNpZmllZCBxdWVyeS5cbiAgI1xuICAjIFJldHVybnMgYSBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgcXVlcnkgcmVzdWx0cyBhbmQgcXVlcnkgbWV0YWRhdGEuXG4gIHF1ZXJ5OiAocXVlcnlPYmopIC0+XG4gICAgZGZkID0gJC5EZWZlcnJlZCgpXG4gICAgdGhpcy5fYXBpUmVxdWVzdCgnc2VhcmNoJywgcXVlcnlPYmopXG4gICAgICAuZG9uZSAob2JqKSAtPlxuICAgICAgICByb3dzID0gb2JqLnJvd3NcbiAgICAgICAgZGVsZXRlIG9iai5yb3dzXG4gICAgICAgIGRmZC5yZXNvbHZlKHJvd3MsIG9iailcbiAgICAgIC5mYWlsICgpIC0+XG4gICAgICAgIGRmZC5yZWplY3QuYXBwbHkoZGZkLCBhcmd1bWVudHMpXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcblxuICAjIFB1YmxpYzogU2V0IGEgY3VzdG9tIEhUVFAgaGVhZGVyIHRvIGJlIHNlbnQgd2l0aCBldmVyeSByZXF1ZXN0LlxuICAjXG4gICMga2V5ICAgLSBUaGUgaGVhZGVyIG5hbWUuXG4gICMgdmFsdWUgLSBUaGUgaGVhZGVyIHZhbHVlLlxuICAjXG4gICMgRXhhbXBsZXM6XG4gICNcbiAgIyAgIHN0b3JlLnNldEhlYWRlcignWC1NeS1DdXN0b20tSGVhZGVyJywgJ015Q3VzdG9tVmFsdWUnKVxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBzZXRIZWFkZXI6IChrZXksIHZhbHVlKSAtPlxuICAgIHRoaXMub3B0aW9ucy5oZWFkZXJzW2tleV0gPSB2YWx1ZVxuXG4gICMgQ2FsbGJhY2sgbWV0aG9kIGZvciBTdG9yZSNsb2FkQW5ub3RhdGlvbnNGcm9tU2VhcmNoKCkuIFByb2Nlc3NlcyB0aGUgZGF0YVxuICAjIHJldHVybmVkIGZyb20gdGhlIHNlcnZlciAoYSBKU09OIGFycmF5IG9mIGFubm90YXRpb24gT2JqZWN0cykgYW5kIHVwZGF0ZXNcbiAgIyB0aGUgcmVnaXN0cnkgYXMgd2VsbCBhcyBsb2FkaW5nIHRoZW0gaW50byB0aGUgQW5ub3RhdG9yLlxuICAjIFJldHVybnMgdGhlIGpRdWVyeSBYTUxIdHRwUmVxdWVzdCB3cmFwcGVyIGVuYWJsaW5nIGFkZGl0aW9uYWwgY2FsbGJhY2tzIHRvXG4gICMgYmUgYXBwbGllZCBhcyB3ZWxsIGFzIGN1c3RvbSBlcnJvciBoYW5kbGluZy5cbiAgI1xuICAjIGFjdGlvbiAgICAtIFRoZSBhY3Rpb24gU3RyaW5nIGVnLiBcInJlYWRcIiwgXCJzZWFyY2hcIiwgXCJjcmVhdGVcIiwgXCJ1cGRhdGVcIlxuICAjICAgICAgICAgICAgIG9yIFwiZGVzdG9yeVwiLlxuICAjIG9iaiAgICAgICAtIFRoZSBkYXRhIHRvIGJlIHNlbnQsIGVpdGhlciBhbm5vdGF0aW9uIG9iamVjdCBvciBxdWVyeSBzdHJpbmcuXG4gICMgb25TdWNjZXNzIC0gQSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsIG9uIHN1Y2Nlc3NmdWwgcmVxdWVzdC5cbiAgI1xuICAjIEV4YW1wbGVzOlxuICAjXG4gICMgICBzdG9yZS5fYXBpUmVxdWVzdCgncmVhZCcsIHtpZDogNH0sIChkYXRhKSAtPiBjb25zb2xlLmxvZyhkYXRhKSlcbiAgIyAgICMgPT4gT3V0cHV0cyB0aGUgYW5ub3RhdGlvbiByZXR1cm5lZCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICNcbiAgIyBSZXR1cm5zIFhNTEh0dHBSZXF1ZXN0IG9iamVjdC5cbiAgX2FwaVJlcXVlc3Q6IChhY3Rpb24sIG9iaikgLT5cbiAgICBpZCA9IG9iaiAmJiBvYmouaWRcbiAgICB1cmwgPSB0aGlzLl91cmxGb3IoYWN0aW9uLCBpZClcbiAgICBvcHRpb25zID0gdGhpcy5fYXBpUmVxdWVzdE9wdGlvbnMoYWN0aW9uLCBvYmopXG5cbiAgICByZXF1ZXN0ID0gJC5hamF4KHVybCwgb3B0aW9ucylcblxuICAgICMgQXBwZW5kIHRoZSBpZCBhbmQgYWN0aW9uIHRvIHRoZSByZXF1ZXN0IG9iamVjdFxuICAgICMgZm9yIHVzZSBpbiB0aGUgZXJyb3IgY2FsbGJhY2suXG4gICAgcmVxdWVzdC5faWQgPSBpZFxuICAgIHJlcXVlc3QuX2FjdGlvbiA9IGFjdGlvblxuICAgIHJlcXVlc3RcblxuICAjIEJ1aWxkcyBhbiBvcHRpb25zIG9iamVjdCBzdWl0YWJsZSBmb3IgdXNlIGluIGEgalF1ZXJ5LmFqYXgoKSBjYWxsLlxuICAjXG4gICMgYWN0aW9uICAgIC0gVGhlIGFjdGlvbiBTdHJpbmcgZWcuIFwicmVhZFwiLCBcInNlYXJjaFwiLCBcImNyZWF0ZVwiLCBcInVwZGF0ZVwiXG4gICMgICAgICAgICAgICAgb3IgXCJkZXN0cm95XCIuXG4gICMgb2JqICAgICAgIC0gVGhlIGRhdGEgdG8gYmUgc2VudCwgZWl0aGVyIGFubm90YXRpb24gb2JqZWN0IG9yIHF1ZXJ5IHN0cmluZy5cbiAgI1xuICAjIFJldHVybnMgT2JqZWN0IGxpdGVyYWwgb2YgJC5hamF4KCkgb3B0aW9ucy5cbiAgX2FwaVJlcXVlc3RPcHRpb25zOiAoYWN0aW9uLCBvYmopIC0+XG4gICAgbWV0aG9kID0gdGhpcy5fbWV0aG9kRm9yKGFjdGlvbilcblxuICAgIG9wdHMgPSB7XG4gICAgICB0eXBlOiAgICAgbWV0aG9kLFxuICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgZXJyb3I6ICAgIHRoaXMuX29uRXJyb3IsXG4gICAgICBoZWFkZXJzOiAgdGhpcy5vcHRpb25zLmhlYWRlcnNcbiAgICB9XG5cbiAgICAjIElmIGVtdWxhdGVIVFRQIGlzIGVuYWJsZWQsIHdlIHNlbmQgYSBQT1NUIGFuZCBwdXQgdGhlIHJlYWwgbWV0aG9kIGluIGFuXG4gICAgIyBIVFRQIHJlcXVlc3QgaGVhZGVyLlxuICAgIGlmIEBvcHRpb25zLmVtdWxhdGVIVFRQIGFuZCBtZXRob2QgaW4gWydQVVQnLCAnREVMRVRFJ11cbiAgICAgIG9wdHMuaGVhZGVycyA9ICQuZXh0ZW5kKG9wdHMuaGVhZGVycywgeydYLUhUVFAtTWV0aG9kLU92ZXJyaWRlJzogbWV0aG9kfSlcbiAgICAgIG9wdHMudHlwZSA9ICdQT1NUJ1xuXG4gICAgIyBEb24ndCBKU09OaWZ5IG9iaiBpZiBtYWtpbmcgc2VhcmNoIHJlcXVlc3QuXG4gICAgaWYgYWN0aW9uIGlzIFwic2VhcmNoXCJcbiAgICAgIG9wdHMgPSAkLmV4dGVuZChvcHRzLCBkYXRhOiBvYmopXG4gICAgICByZXR1cm4gb3B0c1xuICAgIFxuICAgICMgYWRkIGFubm90YXRpb25EYXRhICBcbiAgICBpZiBhY3Rpb24gaXMgXCJjcmVhdGVcIiBvciBhY3Rpb24gaXMgXCJ1cGRhdGVcIlxuICAgICAgb2JqID0gJC5leHRlbmQob2JqLCBAb3B0aW9ucy5hbm5vdGF0aW9uRGF0YSlcbiAgICBcbiAgICBkYXRhID0gb2JqICYmIEpTT04uc3RyaW5naWZ5KG9iailcblxuICAgICMgSWYgZW11bGF0ZUpTT04gaXMgZW5hYmxlZCwgd2Ugc2VuZCBhIGZvcm0gcmVxdWVzdCAodGhlIGNvcnJlY3RcbiAgICAjIGNvbnRlbnRUeXBlIHdpbGwgYmUgc2V0IGF1dG9tYXRpY2FsbHkgYnkgalF1ZXJ5KSwgYW5kIHB1dCB0aGVcbiAgICAjIEpTT04tZW5jb2RlZCBwYXlsb2FkIGluIHRoZSBcImpzb25cIiBrZXkuXG4gICAgaWYgQG9wdGlvbnMuZW11bGF0ZUpTT05cbiAgICAgIG9wdHMuZGF0YSA9IHtqc29uOiBkYXRhfVxuICAgICAgaWYgQG9wdGlvbnMuZW11bGF0ZUhUVFBcbiAgICAgICAgb3B0cy5kYXRhLl9tZXRob2QgPSBtZXRob2RcbiAgICAgIHJldHVybiBvcHRzXG5cbiAgICBvcHRzID0gJC5leHRlbmQob3B0cywge1xuICAgICAgZGF0YTogZGF0YVxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiXG4gICAgfSlcbiAgICByZXR1cm4gb3B0c1xuXG4gICMgQnVpbGRzIHRoZSBhcHByb3ByaWF0ZSBVUkwgZnJvbSB0aGUgb3B0aW9ucyBmb3IgdGhlIGFjdGlvbiBwcm92aWRlZC5cbiAgI1xuICAjIGFjdGlvbiAtIFRoZSBhY3Rpb24gU3RyaW5nLlxuICAjIGlkICAgICAtIFRoZSBhbm5vdGF0aW9uIGlkIGFzIGEgU3RyaW5nIG9yIE51bWJlci5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHN0b3JlLl91cmxGb3IoJ3VwZGF0ZScsIDM0KVxuICAjICAgIyA9PiBSZXR1cm5zIFwiL3N0b3JlL2Fubm90YXRpb25zLzM0XCJcbiAgI1xuICAjICAgc3RvcmUuX3VybEZvcignc2VhcmNoJylcbiAgIyAgICMgPT4gUmV0dXJucyBcIi9zdG9yZS9zZWFyY2hcIlxuICAjXG4gICMgUmV0dXJucyBVUkwgU3RyaW5nLlxuICBfdXJsRm9yOiAoYWN0aW9uLCBpZCkgLT5cbiAgICB1cmwgPSBpZiBAb3B0aW9ucy5wcmVmaXg/IHRoZW4gQG9wdGlvbnMucHJlZml4IGVsc2UgJydcbiAgICB1cmwgKz0gQG9wdGlvbnMudXJsc1thY3Rpb25dXG4gICAgIyBJZiB0aGVyZSdzIGEgJy86aWQnIGluIHRoZSBVUkwsIGVpdGhlciBmaWxsIGluIHRoZSBJRCBvciByZW1vdmUgdGhlXG4gICAgIyBzbGFzaDpcbiAgICB1cmwgPSB1cmwucmVwbGFjZSgvXFwvOmlkLywgaWYgaWQ/IHRoZW4gJy8nICsgaWQgZWxzZSAnJylcbiAgICAjIElmIHRoZXJlJ3MgYSBiYXJlICc6aWQnIGluIHRoZSBVUkwsIHRoZW4gc3Vic3RpdHV0ZSBkaXJlY3RseTpcbiAgICB1cmwgPSB1cmwucmVwbGFjZSgvOmlkLywgaWYgaWQ/IHRoZW4gaWQgZWxzZSAnJylcblxuICAgIHVybFxuXG4gICMgTWFwcyBhbiBhY3Rpb24gdG8gYW4gSFRUUCBtZXRob2QuXG4gICNcbiAgIyBhY3Rpb24gLSBUaGUgYWN0aW9uIFN0cmluZy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHN0b3JlLl9tZXRob2RGb3IoJ3JlYWQnKSAgICAjID0+IFwiR0VUXCJcbiAgIyAgIHN0b3JlLl9tZXRob2RGb3IoJ3VwZGF0ZScpICAjID0+IFwiUFVUXCJcbiAgIyAgIHN0b3JlLl9tZXRob2RGb3IoJ2Rlc3Ryb3knKSAjID0+IFwiREVMRVRFXCJcbiAgI1xuICAjIFJldHVybnMgSFRUUCBtZXRob2QgU3RyaW5nLlxuICBfbWV0aG9kRm9yOiAoYWN0aW9uKSAtPlxuICAgIHRhYmxlID0ge1xuICAgICAgJ2NyZWF0ZSc6ICAnUE9TVCdcbiAgICAgICdyZWFkJzogICAgJ0dFVCdcbiAgICAgICd1cGRhdGUnOiAgJ1BVVCdcbiAgICAgICdkZXN0cm95JzogJ0RFTEVURSdcbiAgICAgICdzZWFyY2gnOiAgJ0dFVCdcbiAgICB9XG5cbiAgICB0YWJsZVthY3Rpb25dXG5cbiAgIyBqUXVlcnkuYWpheCgpIGNhbGxiYWNrLiBEaXNwbGF5cyBhbiBlcnJvciBub3RpZmljYXRpb24gdG8gdGhlIHVzZXIgaWZcbiAgIyB0aGUgcmVxdWVzdCBmYWlsZWQuXG4gICNcbiAgIyB4aHIgLSBUaGUgalhNTEh0dHBSZXF1ZXN0IG9iamVjdC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgX29uRXJyb3I6ICh4aHIpID0+XG4gICAgYWN0aW9uICA9IHhoci5fYWN0aW9uXG4gICAgbWVzc2FnZSA9IEFubm90YXRvci5fdChcIlNvcnJ5IHdlIGNvdWxkIG5vdCBcIikgKyBhY3Rpb24gKyBBbm5vdGF0b3IuX3QoXCIgdGhpcyBhbm5vdGF0aW9uXCIpXG5cbiAgICBpZiB4aHIuX2FjdGlvbiA9PSAnc2VhcmNoJ1xuICAgICAgbWVzc2FnZSA9IEFubm90YXRvci5fdChcIlNvcnJ5IHdlIGNvdWxkIG5vdCBzZWFyY2ggdGhlIHN0b3JlIGZvciBhbm5vdGF0aW9uc1wiKVxuICAgIGVsc2UgaWYgeGhyLl9hY3Rpb24gPT0gJ3JlYWQnICYmICF4aHIuX2lkXG4gICAgICBtZXNzYWdlID0gQW5ub3RhdG9yLl90KFwiU29ycnkgd2UgY291bGQgbm90IFwiKSArIGFjdGlvbiArIEFubm90YXRvci5fdChcIiB0aGUgYW5ub3RhdGlvbnMgZnJvbSB0aGUgc3RvcmVcIilcblxuICAgIHN3aXRjaCB4aHIuc3RhdHVzXG4gICAgICB3aGVuIDQwMSB0aGVuIG1lc3NhZ2UgPSBBbm5vdGF0b3IuX3QoXCJTb3JyeSB5b3UgYXJlIG5vdCBhbGxvd2VkIHRvIFwiKSArIGFjdGlvbiArIEFubm90YXRvci5fdChcIiB0aGlzIGFubm90YXRpb25cIilcbiAgICAgIHdoZW4gNDA0IHRoZW4gbWVzc2FnZSA9IEFubm90YXRvci5fdChcIlNvcnJ5IHdlIGNvdWxkIG5vdCBjb25uZWN0IHRvIHRoZSBhbm5vdGF0aW9ucyBzdG9yZVwiKVxuICAgICAgd2hlbiA1MDAgdGhlbiBtZXNzYWdlID0gQW5ub3RhdG9yLl90KFwiU29ycnkgc29tZXRoaW5nIHdlbnQgd3Jvbmcgd2l0aCB0aGUgYW5ub3RhdGlvbiBzdG9yZVwiKVxuXG4gICAgQW5ub3RhdG9yLnNob3dOb3RpZmljYXRpb24gbWVzc2FnZSwgQW5ub3RhdG9yLk5vdGlmaWNhdGlvbi5FUlJPUlxuXG4gICAgY29uc29sZS5lcnJvciBBbm5vdGF0b3IuX3QoXCJBUEkgcmVxdWVzdCBmYWlsZWQ6XCIpICsgXCIgJyN7eGhyLnN0YXR1c30nXCJcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEFubm90YXRvci5QbHVnaW4uU3RvcmVcbiIsIkFubm90YXRvciA9IHJlcXVpcmUoJ2Fubm90YXRvcicpXG5cblxuIyBQdWJsaWM6IFRhZ3MgcGx1Z2luIGFsbG93cyB1c2VycyB0byB0YWcgdGhpZXIgYW5ub3RhdGlvbnMgd2l0aCBtZXRhZGF0YVxuIyBzdG9yZWQgaW4gYW4gQXJyYXkgb24gdGhlIGFubm90YXRpb24gYXMgdGFncy5cbmNsYXNzIEFubm90YXRvci5QbHVnaW4uVGFncyBleHRlbmRzIEFubm90YXRvci5QbHVnaW5cblxuICBvcHRpb25zOlxuICAgICMgQ29uZmlndXJhYmxlIGZ1bmN0aW9uIHdoaWNoIGFjY2VwdHMgYSBzdHJpbmcgKHRoZSBjb250ZW50cylcbiAgICAjIG9mIHRoZSB0YWdzIGlucHV0IGFzIGFuIGFyZ3VtZW50LCBhbmQgcmV0dXJucyBhbiBhcnJheSBvZlxuICAgICMgdGFncy5cbiAgICBwYXJzZVRhZ3M6IChzdHJpbmcpIC0+XG4gICAgICBzdHJpbmcgPSAkLnRyaW0oc3RyaW5nKVxuXG4gICAgICB0YWdzID0gW11cbiAgICAgIHRhZ3MgPSBzdHJpbmcuc3BsaXQoL1xccysvKSBpZiBzdHJpbmdcbiAgICAgIHRhZ3NcblxuICAgICMgQ29uZmlndXJhYmxlIGZ1bmN0aW9uIHdoaWNoIGFjY2VwdHMgYW4gYXJyYXkgb2YgdGFncyBhbmRcbiAgICAjIHJldHVybnMgYSBzdHJpbmcgd2hpY2ggd2lsbCBiZSB1c2VkIHRvIGZpbGwgdGhlIHRhZ3MgaW5wdXQuXG4gICAgc3RyaW5naWZ5VGFnczogKGFycmF5KSAtPlxuICAgICAgYXJyYXkuam9pbihcIiBcIilcblxuICAjIFRoZSBmaWVsZCBlbGVtZW50IGFkZGVkIHRvIHRoZSBBbm5vdGF0b3IuRWRpdG9yIHdyYXBwZWQgaW4galF1ZXJ5LiBDYWNoZWQgdG9cbiAgIyBzYXZlIGhhdmluZyB0byByZWNyZWF0ZSBpdCBldmVyeXRpbWUgdGhlIGVkaXRvciBpcyBkaXNwbGF5ZWQuXG4gIGZpZWxkOiBudWxsXG5cbiAgIyBUaGUgaW5wdXQgZWxlbWVudCBhZGRlZCB0byB0aGUgQW5ub3RhdG9yLkVkaXRvciB3cmFwcGVkIGluIGpRdWVyeS4gQ2FjaGVkIHRvXG4gICMgc2F2ZSBoYXZpbmcgdG8gcmVjcmVhdGUgaXQgZXZlcnl0aW1lIHRoZSBlZGl0b3IgaXMgZGlzcGxheWVkLlxuICBpbnB1dDogbnVsbFxuXG4gICMgUHVibGljOiBJbml0aWFsaXNlcyB0aGUgcGx1Z2luIGFuZCBhZGRzIGN1c3RvbSBmaWVsZHMgdG8gYm90aCB0aGVcbiAgIyBhbm5vdGF0b3Igdmlld2VyIGFuZCBlZGl0b3IuIFRoZSBwbHVnaW4gYWxzbyBjaGVja3MgaWYgdGhlIGFubm90YXRvciBpc1xuICAjIHN1cHBvcnRlZCBieSB0aGUgY3VycmVudCBicm93c2VyLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBwbHVnaW5Jbml0OiAtPlxuICAgIHJldHVybiB1bmxlc3MgQW5ub3RhdG9yLnN1cHBvcnRlZCgpXG5cbiAgICBAZmllbGQgPSBAYW5ub3RhdG9yLmVkaXRvci5hZGRGaWVsZCh7XG4gICAgICBsYWJlbDogIEFubm90YXRvci5fdCgnQWRkIHNvbWUgdGFncyBoZXJlJykgKyAnXFx1MjAyNidcbiAgICAgIGxvYWQ6ICAgdGhpcy51cGRhdGVGaWVsZFxuICAgICAgc3VibWl0OiB0aGlzLnNldEFubm90YXRpb25UYWdzXG4gICAgfSlcblxuICAgIEBhbm5vdGF0b3Iudmlld2VyLmFkZEZpZWxkKHtcbiAgICAgIGxvYWQ6IHRoaXMudXBkYXRlVmlld2VyXG4gICAgfSlcblxuICAgICMgQWRkIGEgZmlsdGVyIHRvIHRoZSBGaWx0ZXIgcGx1Z2luIGlmIGxvYWRlZC5cbiAgICBpZiBAYW5ub3RhdG9yLnBsdWdpbnMuRmlsdGVyXG4gICAgICBAYW5ub3RhdG9yLnBsdWdpbnMuRmlsdGVyLmFkZEZpbHRlclxuICAgICAgICBsYWJlbDogQW5ub3RhdG9yLl90KCdUYWcnKVxuICAgICAgICBwcm9wZXJ0eTogJ3RhZ3MnXG4gICAgICAgIGlzRmlsdGVyZWQ6IEFubm90YXRvci5QbHVnaW4uVGFncy5maWx0ZXJDYWxsYmFja1xuXG4gICAgQGlucHV0ID0gJChAZmllbGQpLmZpbmQoJzppbnB1dCcpXG5cbiAgIyBQdWJsaWM6IEV4dHJhY3RzIHRhZ3MgZnJvbSB0aGUgcHJvdmlkZWQgU3RyaW5nLlxuICAjXG4gICMgc3RyaW5nIC0gQSBTdHJpbmcgb2YgdGFncyBzZXBlcmF0ZWQgYnkgc3BhY2VzLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgcGx1Z2luLnBhcnNlVGFncygnY2FrZSBjaG9jb2xhdGUgY2FiYmFnZScpXG4gICMgICAjID0+IFsnY2FrZScsICdjaG9jb2xhdGUnLCAnY2FiYmFnZSddXG4gICNcbiAgIyBSZXR1cm5zIEFycmF5IG9mIHBhcnNlZCB0YWdzLlxuICBwYXJzZVRhZ3M6IChzdHJpbmcpIC0+XG4gICAgQG9wdGlvbnMucGFyc2VUYWdzKHN0cmluZylcblxuICAjIFB1YmxpYzogVGFrZXMgYW4gYXJyYXkgb2YgdGFncyBhbmQgc2VyaWFsaXNlcyB0aGVtIGludG8gYSBTdHJpbmcuXG4gICNcbiAgIyBhcnJheSAtIEFuIEFycmF5IG9mIHRhZ3MuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBwbHVnaW4uc3RyaW5naWZ5VGFncyhbJ2Nha2UnLCAnY2hvY29sYXRlJywgJ2NhYmJhZ2UnXSlcbiAgIyAgICMgPT4gJ2Nha2UgY2hvY29sYXRlIGNhYmJhZ2UnXG4gICNcbiAgIyBSZXR1cm5zIEFycmF5IG9mIHBhcnNlZCB0YWdzLlxuICBzdHJpbmdpZnlUYWdzOiAoYXJyYXkpIC0+XG4gICAgQG9wdGlvbnMuc3RyaW5naWZ5VGFncyhhcnJheSlcblxuICAjIEFubm90YXRvci5FZGl0b3IgY2FsbGJhY2sgZnVuY3Rpb24uIFVwZGF0ZXMgdGhlIEBpbnB1dCBmaWVsZCB3aXRoIHRoZVxuICAjIHRhZ3MgYXR0YWNoZWQgdG8gdGhlIHByb3ZpZGVkIGFubm90YXRpb24uXG4gICNcbiAgIyBmaWVsZCAgICAgIC0gVGhlIHRhZ3MgZmllbGQgRWxlbWVudCBjb250YWluaW5nIHRoZSBpbnB1dCBFbGVtZW50LlxuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIG9iamVjdCB0byBiZSBlZGl0ZWQuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBmaWVsZCA9ICQoJzxsaT48aW5wdXQgLz48L2xpPicpWzBdXG4gICMgICBwbHVnaW4udXBkYXRlRmllbGQoZmllbGQsIHt0YWdzOiBbJ2FwcGxlcycsICdvcmFuZ2VzJywgJ2Nha2UnXX0pXG4gICMgICBmaWVsZC52YWx1ZSAjID0+IFJldHVybnMgJ2FwcGxlcyBvcmFuZ2VzIGNha2UnXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHVwZGF0ZUZpZWxkOiAoZmllbGQsIGFubm90YXRpb24pID0+XG4gICAgdmFsdWUgPSAnJ1xuICAgIHZhbHVlID0gdGhpcy5zdHJpbmdpZnlUYWdzKGFubm90YXRpb24udGFncykgaWYgYW5ub3RhdGlvbi50YWdzXG5cbiAgICBAaW5wdXQudmFsKHZhbHVlKVxuXG4gICMgQW5ub3RhdG9yLkVkaXRvciBjYWxsYmFjayBmdW5jdGlvbi4gVXBkYXRlcyB0aGUgYW5ub3RhdGlvbiBmaWVsZCB3aXRoIHRoZVxuICAjIGRhdGEgcmV0cmlldmVkIGZyb20gdGhlIEBpbnB1dCBwcm9wZXJ0eS5cbiAgI1xuICAjIGZpZWxkICAgICAgLSBUaGUgdGFncyBmaWVsZCBFbGVtZW50IGNvbnRhaW5pbmcgdGhlIGlucHV0IEVsZW1lbnQuXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gb2JqZWN0IHRvIGJlIHVwZGF0ZWQuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBhbm5vdGF0aW9uID0ge31cbiAgIyAgIGZpZWxkID0gJCgnPGxpPjxpbnB1dCB2YWx1ZT1cImNha2UgY2hvY29sYXRlIGNhYmJhZ2VcIiAvPjwvbGk+JylbMF1cbiAgI1xuICAjICAgcGx1Z2luLnNldEFubm90YXRpb25UYWdzKGZpZWxkLCBhbm5vdGF0aW9uKVxuICAjICAgYW5ub3RhdGlvbi50YWdzICMgPT4gUmV0dXJucyBbJ2Nha2UnLCAnY2hvY29sYXRlJywgJ2NhYmJhZ2UnXVxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBzZXRBbm5vdGF0aW9uVGFnczogKGZpZWxkLCBhbm5vdGF0aW9uKSA9PlxuICAgIGFubm90YXRpb24udGFncyA9IHRoaXMucGFyc2VUYWdzKEBpbnB1dC52YWwoKSlcblxuICAjIEFubm90YXRvci5WaWV3ZXIgY2FsbGJhY2sgZnVuY3Rpb24uIFVwZGF0ZXMgdGhlIGFubm90YXRpb24gZGlzcGxheSB3aXRoIHRhZ3NcbiAgIyByZW1vdmVzIHRoZSBmaWVsZCBmcm9tIHRoZSBWaWV3ZXIgaWYgdGhlcmUgYXJlIG5vIHRhZ3MgdG8gZGlzcGxheS5cbiAgI1xuICAjIGZpZWxkICAgICAgLSBUaGUgRWxlbWVudCB0byBwb3B1bGF0ZSB3aXRoIHRhZ3MuXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gb2JqZWN0IHRvIGJlIGRpc3BsYXkuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBmaWVsZCA9ICQoJzxkaXYgLz4nKVswXVxuICAjICAgcGx1Z2luLnVwZGF0ZUZpZWxkKGZpZWxkLCB7dGFnczogWydhcHBsZXMnXX0pXG4gICMgICBmaWVsZC5pbm5lckhUTUwgIyA9PiBSZXR1cm5zICc8c3BhbiBjbGFzcz1cImFubm90YXRvci10YWdcIj5hcHBsZXM8L3NwYW4+J1xuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICB1cGRhdGVWaWV3ZXI6IChmaWVsZCwgYW5ub3RhdGlvbikgLT5cbiAgICBmaWVsZCA9ICQoZmllbGQpXG5cbiAgICBpZiBhbm5vdGF0aW9uLnRhZ3MgYW5kICQuaXNBcnJheShhbm5vdGF0aW9uLnRhZ3MpIGFuZCBhbm5vdGF0aW9uLnRhZ3MubGVuZ3RoXG4gICAgICBmaWVsZC5hZGRDbGFzcygnYW5ub3RhdG9yLXRhZ3MnKS5odG1sKC0+XG4gICAgICAgIHN0cmluZyA9ICQubWFwKGFubm90YXRpb24udGFncywodGFnKSAtPlxuICAgICAgICAgICAgJzxzcGFuIGNsYXNzPVwiYW5ub3RhdG9yLXRhZ1wiPicgKyBBbm5vdGF0b3IuVXRpbC5lc2NhcGUodGFnKSArICc8L3NwYW4+J1xuICAgICAgICApLmpvaW4oJyAnKVxuICAgICAgKVxuICAgIGVsc2VcbiAgICAgIGZpZWxkLnJlbW92ZSgpXG5cbiMgQ2hlY2tzIGFuIGlucHV0IHN0cmluZyBvZiBrZXl3b3JkcyBhZ2FpbnN0IGFuIGFycmF5IG9mIHRhZ3MuIElmIHRoZSBrZXl3b3Jkc1xuIyBtYXRjaCBfYWxsXyB0YWdzIHRoZSBmdW5jdGlvbiByZXR1cm5zIHRydWUuIFRoaXMgc2hvdWxkIGJlIHVzZWQgYXMgYSBjYWxsYmFja1xuIyBpbiB0aGUgRmlsdGVyIHBsdWdpbi5cbiNcbiMgaW5wdXQgLSBBIFN0cmluZyBvZiBrZXl3b3JkcyBmcm9tIGEgaW5wdXQgZmllbGQuXG4jXG4jIEV4YW1wbGVzXG4jXG4jICAgVGFncy5maWx0ZXJDYWxsYmFjaygnY2F0IGRvZyBtb3VzZScsIFsnY2F0JywgJ2RvZycsICdtb3VzZSddKSAvLz0+IHRydWVcbiMgICBUYWdzLmZpbHRlckNhbGxiYWNrKCdjYXQgZG9nJywgWydjYXQnLCAnZG9nJywgJ21vdXNlJ10pIC8vPT4gdHJ1ZVxuIyAgIFRhZ3MuZmlsdGVyQ2FsbGJhY2soJ2NhdCBkb2cnLCBbJ2NhdCddKSAvLz0+IGZhbHNlXG4jXG4jIFJldHVybnMgdHJ1ZSBpZiB0aGUgaW5wdXQga2V5d29yZHMgbWF0Y2ggYWxsIHRhZ3MuXG5Bbm5vdGF0b3IuUGx1Z2luLlRhZ3MuZmlsdGVyQ2FsbGJhY2sgPSAoaW5wdXQsIHRhZ3MgPSBbXSkgLT5cbiAgbWF0Y2hlcyAgPSAwXG4gIGtleXdvcmRzID0gW11cbiAgaWYgaW5wdXRcbiAgICBrZXl3b3JkcyA9IGlucHV0LnNwbGl0KC9cXHMrL2cpXG4gICAgZm9yIGtleXdvcmQgaW4ga2V5d29yZHMgd2hlbiB0YWdzLmxlbmd0aFxuICAgICAgbWF0Y2hlcyArPSAxIGZvciB0YWcgaW4gdGFncyB3aGVuIHRhZy5pbmRleE9mKGtleXdvcmQpICE9IC0xXG5cbiAgbWF0Y2hlcyA9PSBrZXl3b3Jkcy5sZW5ndGhcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEFubm90YXRvci5QbHVnaW4uVGFnc1xuIiwiQW5ub3RhdG9yID0gcmVxdWlyZSgnYW5ub3RhdG9yJylcblxuXG4jIFBsdWdpbiB0aGF0IHdpbGwgZGlzcGxheSBhIG5vdGlmaWNhdGlvbiB0byB0aGUgdXNlciBpZiB0aGllciBicm93c2VyIGRvZXNcbiMgbm90IHN1cHBvcnQgdGhlIEFubm90YXRvci5cbmNsYXNzIEFubm90YXRvci5QbHVnaW4uVW5zdXBwb3J0ZWQgZXh0ZW5kcyBBbm5vdGF0b3IuUGx1Z2luXG4gICMgT3B0aW9ucyBPYmplY3QsIG1lc3NhZ2Ugc2V0cyB0aGUgbWVzc2FnZSBkaXNwbGF5ZWQgaW4gdGhlIGJyb3dzZXIuXG4gIG9wdGlvbnM6XG4gICAgbWVzc2FnZTogQW5ub3RhdG9yLl90KFwiU29ycnkgeW91ciBjdXJyZW50IGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGUgQW5ub3RhdG9yXCIpXG5cbiAgIyBQdWJsaWM6IENoZWNrcyB0aGUgQW5ub3RhdG9yLnN1cHBvcnRlZCgpIG1ldGhvZCBhbmQgaWYgdW5zdXBwb3J0ZWQgZGlzcGxheXNcbiAgIyBAb3B0aW9ucy5tZXNzYWdlIGluIGEgbm90aWZpY2F0aW9uLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBwbHVnaW5Jbml0OiAtPlxuICAgIHVubGVzcyBBbm5vdGF0b3Iuc3VwcG9ydGVkKClcbiAgICAgICQoPT5cbiAgICAgICAgIyBPbiBkb2N1bWVudCBsb2FkIGRpc3BsYXkgbm90aWZpY2F0aW9uLlxuICAgICAgICBBbm5vdGF0b3Iuc2hvd05vdGlmaWNhdGlvbihAb3B0aW9ucy5tZXNzYWdlKVxuXG4gICAgICAgICMgQWRkIGEgY2xhc3MgaWYgd2UncmUgaW4gSUU2LiBBIGJpdCBvZiBhIGhhY2sgYnV0IHdlIG5lZWQgdG8gYmUgYWJsZVxuICAgICAgICAjIHRvIHNldCB0aGUgbm90aWZpY2F0aW9uIHBvc2l0aW9uIGluIHRoZSBDU1MuXG4gICAgICAgIGlmICh3aW5kb3cuWE1MSHR0cFJlcXVlc3QgPT0gdW5kZWZpbmVkKSBhbmQgKEFjdGl2ZVhPYmplY3QgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICQoJ2h0bWwnKS5hZGRDbGFzcygnaWU2JylcbiAgICAgIClcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEFubm90YXRvci5QbHVnaW4uVW5zdXBwb3J0ZWRcbiIsIlV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuXG5cblJhbmdlID0ge31cblxuIyBQdWJsaWM6IERldGVybWluZXMgdGhlIHR5cGUgb2YgUmFuZ2Ugb2YgdGhlIHByb3ZpZGVkIG9iamVjdCBhbmQgcmV0dXJuc1xuIyBhIHN1aXRhYmxlIFJhbmdlIGluc3RhbmNlLlxuI1xuIyByIC0gQSByYW5nZSBPYmplY3QuXG4jXG4jIEV4YW1wbGVzXG4jXG4jICAgc2VsZWN0aW9uID0gd2luZG93LmdldFNlbGVjdGlvbigpXG4jICAgUmFuZ2Uuc25pZmYoc2VsZWN0aW9uLmdldFJhbmdlQXQoMCkpXG4jICAgIyA9PiBSZXR1cm5zIGEgQnJvd3NlclJhbmdlIGluc3RhbmNlLlxuI1xuIyBSZXR1cm5zIGEgUmFuZ2Ugb2JqZWN0IG9yIGZhbHNlLlxuUmFuZ2Uuc25pZmYgPSAocikgLT5cbiAgaWYgci5jb21tb25BbmNlc3RvckNvbnRhaW5lcj9cbiAgICBuZXcgUmFuZ2UuQnJvd3NlclJhbmdlKHIpXG4gIGVsc2UgaWYgdHlwZW9mIHIuc3RhcnQgaXMgXCJzdHJpbmdcIlxuICAgIG5ldyBSYW5nZS5TZXJpYWxpemVkUmFuZ2UocilcbiAgZWxzZSBpZiByLnN0YXJ0IGFuZCB0eXBlb2Ygci5zdGFydCBpcyBcIm9iamVjdFwiXG4gICAgbmV3IFJhbmdlLk5vcm1hbGl6ZWRSYW5nZShyKVxuICBlbHNlXG4gICAgY29uc29sZS5lcnJvcihfdChcIkNvdWxkIG5vdCBzbmlmZiByYW5nZSB0eXBlXCIpKVxuICAgIGZhbHNlXG5cbiMgUHVibGljOiBGaW5kcyBhbiBFbGVtZW50IE5vZGUgdXNpbmcgYW4gWFBhdGggcmVsYXRpdmUgdG8gdGhlIGRvY3VtZW50IHJvb3QuXG4jXG4jIElmIHRoZSBkb2N1bWVudCBpcyBzZXJ2ZWQgYXMgYXBwbGljYXRpb24veGh0bWwreG1sIGl0IHdpbGwgdHJ5IGFuZCByZXNvbHZlXG4jIGFueSBuYW1lc3BhY2VzIHdpdGhpbiB0aGUgWFBhdGguXG4jXG4jIHhwYXRoIC0gQW4gWFBhdGggU3RyaW5nIHRvIHF1ZXJ5LlxuI1xuIyBFeGFtcGxlc1xuI1xuIyAgIG5vZGUgPSBSYW5nZS5ub2RlRnJvbVhQYXRoKCcvaHRtbC9ib2R5L2Rpdi9wWzJdJylcbiMgICBpZiBub2RlXG4jICAgICAjIERvIHNvbWV0aGluZyB3aXRoIHRoZSBub2RlLlxuI1xuIyBSZXR1cm5zIHRoZSBOb2RlIGlmIGZvdW5kIG90aGVyd2lzZSBudWxsLlxuUmFuZ2Uubm9kZUZyb21YUGF0aCA9ICh4cGF0aCwgcm9vdD1kb2N1bWVudCkgLT5cbiAgZXZhbHVhdGVYUGF0aCA9ICh4cCwgbnNSZXNvbHZlcj1udWxsKSAtPlxuICAgIHRyeVxuICAgICAgZG9jdW1lbnQuZXZhbHVhdGUoJy4nICsgeHAsIHJvb3QsIG5zUmVzb2x2ZXIsIFhQYXRoUmVzdWx0LkZJUlNUX09SREVSRURfTk9ERV9UWVBFLCBudWxsKS5zaW5nbGVOb2RlVmFsdWVcbiAgICBjYXRjaCBleGNlcHRpb25cbiAgICAgICMgVGhlcmUgYXJlIGNhc2VzIHdoZW4gdGhlIGV2YWx1YXRpb24gZmFpbHMsIGJlY2F1c2UgdGhlXG4gICAgICAjIEhUTUwgZG9jdW1lbnRzIGNvbnRhaW5zIG5vZGVzIHdpdGggaW52YWxpZCBuYW1lcyxcbiAgICAgICMgZm9yIGV4YW1wbGUgdGFncyB3aXRoIGVxdWFsIHNpZ25zIGluIHRoZW0sIG9yIHNvbWV0aGluZyBsaWtlIHRoYXQuXG4gICAgICAjIEluIHRoZXNlIGNhc2VzLCB0aGUgWFBhdGggZXhwcmVzc2lvbnMgd2lsbCBoYXZlIHRoZXNlIGFib21pbmF0aW9ucyxcbiAgICAgICMgdG9vLCBhbmQgdGhlbiB0aGV5IGNhbiBub3QgYmUgZXZhbHVhdGVkLlxuICAgICAgIyBJbiB0aGVzZSBjYXNlcywgd2UgZ2V0IGFuIFhQYXRoRXhjZXB0aW9uLCB3aXRoIGVycm9yIGNvZGUgNTIuXG4gICAgICAjIFNlZSBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMy1YUGF0aC94cGF0aC5odG1sI1hQYXRoRXhjZXB0aW9uXG4gICAgICAjIFRoaXMgZG9lcyBub3QgbmVjZXNzYXJpbHkgbWFrZSBhbnkgc2Vuc2UsIGJ1dCB0aGlzIHdoYXQgd2Ugc2VlXG4gICAgICAjIGhhcHBlbmluZy5cbiAgICAgIGNvbnNvbGUubG9nIFwiWFBhdGggZXZhbHVhdGlvbiBmYWlsZWQuXCJcbiAgICAgIGNvbnNvbGUubG9nIFwiVHJ5aW5nIGZhbGxiYWNrLi4uXCJcbiAgICAgICMgV2UgaGF2ZSBhIGFuICdldmFsdWF0b3InIGZvciB0aGUgcmVhbGx5IHNpbXBsZSBleHByZXNzaW9ucyB0aGF0XG4gICAgICAjIHNob3VsZCB3b3JrIGZvciB0aGUgc2ltcGxlIGV4cHJlc3Npb25zIHdlIGdlbmVyYXRlLlxuICAgICAgVXRpbC5ub2RlRnJvbVhQYXRoKHhwLCByb290KVxuXG4gIGlmIG5vdCAkLmlzWE1MRG9jIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICAgIGV2YWx1YXRlWFBhdGggeHBhdGhcbiAgZWxzZVxuICAgICMgV2UncmUgaW4gYW4gWE1MIGRvY3VtZW50LCBjcmVhdGUgYSBuYW1lc3BhY2UgcmVzb2x2ZXIgZnVuY3Rpb24gdG8gdHJ5XG4gICAgIyBhbmQgcmVzb2x2ZSBhbnkgbmFtZXNwYWNlcyBpbiB0aGUgY3VycmVudCBkb2N1bWVudC5cbiAgICAjIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0RPTS9kb2N1bWVudC5jcmVhdGVOU1Jlc29sdmVyXG4gICAgY3VzdG9tUmVzb2x2ZXIgPSBkb2N1bWVudC5jcmVhdGVOU1Jlc29sdmVyKFxuICAgICAgaWYgZG9jdW1lbnQub3duZXJEb2N1bWVudCA9PSBudWxsXG4gICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICAgICAgZWxzZVxuICAgICAgICBkb2N1bWVudC5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICAgIClcbiAgICBub2RlID0gZXZhbHVhdGVYUGF0aCB4cGF0aCwgY3VzdG9tUmVzb2x2ZXJcblxuICAgIHVubGVzcyBub2RlXG4gICAgICAjIElmIHRoZSBwcmV2aW91cyBzZWFyY2ggZmFpbGVkIHRvIGZpbmQgYSBub2RlIHRoZW4gd2UgbXVzdCB0cnkgdG9cbiAgICAgICMgcHJvdmlkZSBhIGN1c3RvbSBuYW1lc3BhY2UgcmVzb2x2ZXIgdG8gdGFrZSBpbnRvIGFjY291bnQgdGhlIGRlZmF1bHRcbiAgICAgICMgbmFtZXNwYWNlLiBXZSBhbHNvIHByZWZpeCBhbGwgbm9kZSBuYW1lcyB3aXRoIGEgY3VzdG9tIHhodG1sIG5hbWVzcGFjZVxuICAgICAgIyBlZy4gJ2RpdicgPT4gJ3hodG1sOmRpdicuXG4gICAgICB4cGF0aCA9IChmb3Igc2VnbWVudCBpbiB4cGF0aC5zcGxpdCAnLydcbiAgICAgICAgaWYgc2VnbWVudCBhbmQgc2VnbWVudC5pbmRleE9mKCc6JykgPT0gLTFcbiAgICAgICAgICBzZWdtZW50LnJlcGxhY2UoL14oW2Etel0rKS8sICd4aHRtbDokMScpXG4gICAgICAgIGVsc2Ugc2VnbWVudFxuICAgICAgKS5qb2luKCcvJylcblxuICAgICAgIyBGaW5kIHRoZSBkZWZhdWx0IGRvY3VtZW50IG5hbWVzcGFjZS5cbiAgICAgIG5hbWVzcGFjZSA9IGRvY3VtZW50Lmxvb2t1cE5hbWVzcGFjZVVSSSBudWxsXG5cbiAgICAgICMgVHJ5IGFuZCByZXNvbHZlIHRoZSBuYW1lc3BhY2UsIGZpcnN0IHNlZWluZyBpZiBpdCBpcyBhbiB4aHRtbCBub2RlXG4gICAgICAjIG90aGVyd2lzZSBjaGVjayB0aGUgaGVhZCBhdHRyaWJ1dGVzLlxuICAgICAgY3VzdG9tUmVzb2x2ZXIgID0gKG5zKSAtPlxuICAgICAgICBpZiBucyA9PSAneGh0bWwnIHRoZW4gbmFtZXNwYWNlXG4gICAgICAgIGVsc2UgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmdldEF0dHJpYnV0ZSgneG1sbnM6JyArIG5zKVxuXG4gICAgICBub2RlID0gZXZhbHVhdGVYUGF0aCB4cGF0aCwgY3VzdG9tUmVzb2x2ZXJcbiAgICBub2RlXG5cbmNsYXNzIFJhbmdlLlJhbmdlRXJyb3IgZXh0ZW5kcyBFcnJvclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAbWVzc2FnZSwgQHBhcmVudD1udWxsKSAtPlxuICAgIHN1cGVyKEBtZXNzYWdlKVxuXG4jIFB1YmxpYzogQ3JlYXRlcyBhIHdyYXBwZXIgYXJvdW5kIGEgcmFuZ2Ugb2JqZWN0IG9idGFpbmVkIGZyb20gYSBET01TZWxlY3Rpb24uXG5jbGFzcyBSYW5nZS5Ccm93c2VyUmFuZ2VcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiBCcm93c2VyUmFuZ2UuXG4gICNcbiAgIyBvYmplY3QgLSBBIHJhbmdlIG9iamVjdCBvYnRhaW5lZCB2aWEgRE9NU2VsZWN0aW9uI2dldFJhbmdlQXQoKS5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHNlbGVjdGlvbiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuICAjICAgcmFuZ2UgPSBuZXcgUmFuZ2UuQnJvd3NlclJhbmdlKHNlbGVjdGlvbi5nZXRSYW5nZUF0KDApKVxuICAjXG4gICMgUmV0dXJucyBhbiBpbnN0YW5jZSBvZiBCcm93c2VyUmFuZ2UuXG4gIGNvbnN0cnVjdG9yOiAob2JqKSAtPlxuICAgIEBjb21tb25BbmNlc3RvckNvbnRhaW5lciA9IG9iai5jb21tb25BbmNlc3RvckNvbnRhaW5lclxuICAgIEBzdGFydENvbnRhaW5lciAgICAgICAgICA9IG9iai5zdGFydENvbnRhaW5lclxuICAgIEBzdGFydE9mZnNldCAgICAgICAgICAgICA9IG9iai5zdGFydE9mZnNldFxuICAgIEBlbmRDb250YWluZXIgICAgICAgICAgICA9IG9iai5lbmRDb250YWluZXJcbiAgICBAZW5kT2Zmc2V0ICAgICAgICAgICAgICAgPSBvYmouZW5kT2Zmc2V0XG5cbiAgIyBQdWJsaWM6IG5vcm1hbGl6ZSB3b3JrcyBhcm91bmQgdGhlIGZhY3QgdGhhdCBicm93c2VycyBkb24ndCBnZW5lcmF0ZVxuICAjIHJhbmdlcy9zZWxlY3Rpb25zIGluIGEgY29uc2lzdGVudCBtYW5uZXIuIFNvbWUgKFNhZmFyaSkgd2lsbCBjcmVhdGVcbiAgIyByYW5nZXMgdGhhdCBoYXZlIChzYXkpIGEgdGV4dE5vZGUgc3RhcnRDb250YWluZXIgYW5kIGVsZW1lbnROb2RlXG4gICMgZW5kQ29udGFpbmVyLiBPdGhlcnMgKEZpcmVmb3gpIHNlZW0gdG8gb25seSBldmVyIGdlbmVyYXRlXG4gICMgdGV4dE5vZGUvdGV4dE5vZGUgb3IgZWxlbWVudE5vZGUvZWxlbWVudE5vZGUgcGFpcnMuXG4gICNcbiAgIyBSZXR1cm5zIGFuIGluc3RhbmNlIG9mIFJhbmdlLk5vcm1hbGl6ZWRSYW5nZVxuICBub3JtYWxpemU6IChyb290KSAtPlxuICAgIGlmIEB0YWludGVkXG4gICAgICBjb25zb2xlLmVycm9yKF90KFwiWW91IG1heSBvbmx5IGNhbGwgbm9ybWFsaXplKCkgb25jZSBvbiBhIEJyb3dzZXJSYW5nZSFcIikpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICBlbHNlXG4gICAgICBAdGFpbnRlZCA9IHRydWVcblxuICAgIHIgPSB7fVxuXG4gICAgIyBMb29rIGF0IHRoZSBzdGFydFxuICAgIGlmIEBzdGFydENvbnRhaW5lci5ub2RlVHlwZSBpcyBOb2RlLkVMRU1FTlRfTk9ERVxuICAgICAgIyBXZSBhcmUgZGVhbGluZyB3aXRoIGVsZW1lbnQgbm9kZXMgIFxuICAgICAgci5zdGFydCA9IFV0aWwuZ2V0Rmlyc3RUZXh0Tm9kZU5vdEJlZm9yZSBAc3RhcnRDb250YWluZXIuY2hpbGROb2Rlc1tAc3RhcnRPZmZzZXRdXG4gICAgICByLnN0YXJ0T2Zmc2V0ID0gMFxuICAgIGVsc2VcbiAgICAgICMgV2UgYXJlIGRlYWxpbmcgd2l0aCBzaW1wbGUgdGV4dCBub2Rlc1xuICAgICAgci5zdGFydCA9IEBzdGFydENvbnRhaW5lclxuICAgICAgci5zdGFydE9mZnNldCA9IEBzdGFydE9mZnNldFxuXG4gICAgIyBMb29rIGF0IHRoZSBlbmRcbiAgICBpZiBAZW5kQ29udGFpbmVyLm5vZGVUeXBlIGlzIE5vZGUuRUxFTUVOVF9OT0RFXG4gICAgICAjIEdldCBzcGVjaWZpZWQgbm9kZS5cbiAgICAgIG5vZGUgPSBAZW5kQ29udGFpbmVyLmNoaWxkTm9kZXNbQGVuZE9mZnNldF1cblxuICAgICAgaWYgbm9kZT8gIyBEb2VzIHRoYXQgbm9kZSBleGlzdD9cbiAgICAgICAgIyBMb29rIGZvciBhIHRleHQgbm9kZSBlaXRoZXIgYXQgdGhlIGltbWVkaWF0ZSBiZWdpbm5pbmcgb2Ygbm9kZVxuICAgICAgICBuID0gbm9kZVxuICAgICAgICB3aGlsZSBuPyBhbmQgKG4ubm9kZVR5cGUgaXNudCBOb2RlLlRFWFRfTk9ERSlcbiAgICAgICAgICBuID0gbi5maXJzdENoaWxkXG4gICAgICAgIGlmIG4/ICMgRGlkIHdlIGZpbmQgYSB0ZXh0IG5vZGUgYXQgdGhlIHN0YXJ0IG9mIHRoaXMgZWxlbWVudD9cbiAgICAgICAgICByLmVuZCA9IG5cbiAgICAgICAgICByLmVuZE9mZnNldCA9IDBcblxuICAgICAgdW5sZXNzIHIuZW5kPyAgXG4gICAgICAgICMgV2UgbmVlZCB0byBmaW5kIGEgdGV4dCBub2RlIGluIHRoZSBwcmV2aW91cyBzaWJsaW5nIG9mIHRoZSBub2RlIGF0IHRoZVxuICAgICAgICAjIGdpdmVuIG9mZnNldCwgaWYgb25lIGV4aXN0cywgb3IgaW4gdGhlIHByZXZpb3VzIHNpYmxpbmcgb2YgaXRzIGNvbnRhaW5lci5cbiAgICAgICAgaWYgQGVuZE9mZnNldFxuICAgICAgICAgIG5vZGUgPSBAZW5kQ29udGFpbmVyLmNoaWxkTm9kZXNbQGVuZE9mZnNldCAtIDFdXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBub2RlID0gQGVuZENvbnRhaW5lci5wcmV2aW91c1NpYmxpbmdcbiAgICAgICAgci5lbmQgPSBVdGlsLmdldExhc3RUZXh0Tm9kZVVwVG8gbm9kZVxuICAgICAgICByLmVuZE9mZnNldCA9IHIuZW5kLm5vZGVWYWx1ZS5sZW5ndGhcblxuICAgIGVsc2UgIyBXZSBhcmUgZGVhbGluZyB3aXRoIHNpbXBsZSB0ZXh0IG5vZGVzXG4gICAgICByLmVuZCA9IEBlbmRDb250YWluZXJcbiAgICAgIHIuZW5kT2Zmc2V0ID0gQGVuZE9mZnNldFxuXG4gICAgIyBXZSBoYXZlIGNvbGxlY3RlZCB0aGUgaW5pdGlhbCBkYXRhLlxuXG4gICAgIyBOb3cgbGV0J3Mgc3RhcnQgdG8gc2xpY2UgJiBkaWNlIHRoZSB0ZXh0IGVsZW1lbnRzIVxuICAgIG5yID0ge31cblxuICAgIGlmIHIuc3RhcnRPZmZzZXQgPiAwXG4gICAgICAjIERvIHdlIHJlYWxseSBoYXZlIHRvIGN1dD9cbiAgICAgIGlmIHIuc3RhcnQubm9kZVZhbHVlLmxlbmd0aCA+IHIuc3RhcnRPZmZzZXRcbiAgICAgICAgIyBZZXMuIEN1dC5cbiAgICAgICAgbnIuc3RhcnQgPSByLnN0YXJ0LnNwbGl0VGV4dChyLnN0YXJ0T2Zmc2V0KVxuICAgICAgZWxzZVxuICAgICAgICAjIEF2b2lkIHNwbGl0dGluZyBvZmYgemVyby1sZW5ndGggcGllY2VzLlxuICAgICAgICBuci5zdGFydCA9IHIuc3RhcnQubmV4dFNpYmxpbmdcbiAgICBlbHNlXG4gICAgICBuci5zdGFydCA9IHIuc3RhcnRcblxuICAgICMgaXMgdGhlIHdob2xlIHNlbGVjdGlvbiBpbnNpZGUgb25lIHRleHQgZWxlbWVudCA/XG4gICAgaWYgci5zdGFydCBpcyByLmVuZFxuICAgICAgaWYgbnIuc3RhcnQubm9kZVZhbHVlLmxlbmd0aCA+IChyLmVuZE9mZnNldCAtIHIuc3RhcnRPZmZzZXQpXG4gICAgICAgIG5yLnN0YXJ0LnNwbGl0VGV4dChyLmVuZE9mZnNldCAtIHIuc3RhcnRPZmZzZXQpXG4gICAgICBuci5lbmQgPSBuci5zdGFydFxuICAgIGVsc2UgIyBubywgdGhlIGVuZCBvZiB0aGUgc2VsZWN0aW9uIGlzIGluIGEgc2VwYXJhdGUgdGV4dCBlbGVtZW50XG4gICAgICAjIGRvZXMgdGhlIGVuZCBuZWVkIHRvIGJlIGN1dD9cbiAgICAgIGlmIHIuZW5kLm5vZGVWYWx1ZS5sZW5ndGggPiByLmVuZE9mZnNldFxuICAgICAgICByLmVuZC5zcGxpdFRleHQoci5lbmRPZmZzZXQpXG4gICAgICBuci5lbmQgPSByLmVuZFxuXG4gICAgIyBNYWtlIHN1cmUgdGhlIGNvbW1vbiBhbmNlc3RvciBpcyBhbiBlbGVtZW50IG5vZGUuXG4gICAgbnIuY29tbW9uQW5jZXN0b3IgPSBAY29tbW9uQW5jZXN0b3JDb250YWluZXJcbiAgICB3aGlsZSBuci5jb21tb25BbmNlc3Rvci5ub2RlVHlwZSBpc250IE5vZGUuRUxFTUVOVF9OT0RFXG4gICAgICBuci5jb21tb25BbmNlc3RvciA9IG5yLmNvbW1vbkFuY2VzdG9yLnBhcmVudE5vZGVcblxuICAgIG5ldyBSYW5nZS5Ob3JtYWxpemVkUmFuZ2UobnIpXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYSByYW5nZSBzdWl0YWJsZSBmb3Igc3RvcmFnZS5cbiAgI1xuICAjIHJvb3QgICAgICAgICAgIC0gQSByb290IEVsZW1lbnQgZnJvbSB3aGljaCB0byBhbmNob3IgdGhlIHNlcmlhbGlzYXRpb24uXG4gICMgaWdub3JlU2VsZWN0b3IgLSBBIHNlbGVjdG9yIFN0cmluZyBvZiBlbGVtZW50cyB0byBpZ25vcmUuIEZvciBleGFtcGxlXG4gICMgICAgICAgICAgICAgICAgICBlbGVtZW50cyBpbmplY3RlZCBieSB0aGUgYW5ub3RhdG9yLlxuICAjXG4gICMgUmV0dXJucyBhbiBpbnN0YW5jZSBvZiBTZXJpYWxpemVkUmFuZ2UuXG4gIHNlcmlhbGl6ZTogKHJvb3QsIGlnbm9yZVNlbGVjdG9yKSAtPlxuICAgIHRoaXMubm9ybWFsaXplKHJvb3QpLnNlcmlhbGl6ZShyb290LCBpZ25vcmVTZWxlY3RvcilcblxuIyBQdWJsaWM6IEEgbm9ybWFsaXNlZCByYW5nZSBpcyBtb3N0IGNvbW1vbmx5IHVzZWQgdGhyb3VnaG91dCB0aGUgYW5ub3RhdG9yLlxuIyBpdHMgdGhlIHJlc3VsdCBvZiBhIGRlc2VyaWFsaXNlZCBTZXJpYWxpemVkUmFuZ2Ugb3IgYSBCcm93c2VyUmFuZ2Ugd2l0aFxuIyBvdXQgYnJvd3NlciBpbmNvbnNpc3RlbmNpZXMuXG5jbGFzcyBSYW5nZS5Ob3JtYWxpemVkUmFuZ2VcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiBhIE5vcm1hbGl6ZWRSYW5nZS5cbiAgI1xuICAjIFRoaXMgaXMgdXN1YWxseSBjcmVhdGVkIGJ5IGNhbGxpbmcgdGhlIC5ub3JtYWxpemUoKSBtZXRob2Qgb24gb25lIG9mIHRoZVxuICAjIG90aGVyIFJhbmdlIGNsYXNzZXMgcmF0aGVyIHRoYW4gbWFudWFsbHkuXG4gICNcbiAgIyBvYmogLSBBbiBPYmplY3QgbGl0ZXJhbC4gU2hvdWxkIGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzLlxuICAjICAgICAgIGNvbW1vbkFuY2VzdG9yOiBBIEVsZW1lbnQgdGhhdCBlbmNvbXBhc3NlcyBib3RoIHRoZSBzdGFydCBhbmQgZW5kIG5vZGVzXG4gICMgICAgICAgc3RhcnQ6ICAgICAgICAgIFRoZSBmaXJzdCBUZXh0Tm9kZSBpbiB0aGUgcmFuZ2UuXG4gICMgICAgICAgZW5kICAgICAgICAgICAgIFRoZSBsYXN0IFRleHROb2RlIGluIHRoZSByYW5nZS5cbiAgI1xuICAjIFJldHVybnMgYW4gaW5zdGFuY2Ugb2YgTm9ybWFsaXplZFJhbmdlLlxuICBjb25zdHJ1Y3RvcjogKG9iaikgLT5cbiAgICBAY29tbW9uQW5jZXN0b3IgPSBvYmouY29tbW9uQW5jZXN0b3JcbiAgICBAc3RhcnQgICAgICAgICAgPSBvYmouc3RhcnRcbiAgICBAZW5kICAgICAgICAgICAgPSBvYmouZW5kXG5cbiAgIyBQdWJsaWM6IEZvciBBUEkgY29uc2lzdGVuY3kuXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZi5cbiAgbm9ybWFsaXplOiAocm9vdCkgLT5cbiAgICB0aGlzXG5cbiAgIyBQdWJsaWM6IExpbWl0cyB0aGUgbm9kZXMgd2l0aGluIHRoZSBOb3JtYWxpemVkUmFuZ2UgdG8gdGhvc2UgY29udGFpbmVkXG4gICMgd2l0aGluZyB0aGUgYm91bmRzIHBhcmFtZXRlci4gSXQgcmV0dXJucyBhbiB1cGRhdGVkIHJhbmdlIHdpdGggYWxsXG4gICMgcHJvcGVydGllcyB1cGRhdGVkLiBOT1RFOiBNZXRob2QgcmV0dXJucyBudWxsIGlmIGFsbCBub2RlcyBmYWxsIG91dHNpZGVcbiAgIyBvZiB0aGUgYm91bmRzLlxuICAjXG4gICMgYm91bmRzIC0gQW4gRWxlbWVudCB0byBsaW1pdCB0aGUgcmFuZ2UgdG8uXG4gICNcbiAgIyBSZXR1cm5zIHVwZGF0ZWQgc2VsZiBvciBudWxsLlxuICBsaW1pdDogKGJvdW5kcykgLT5cbiAgICBub2RlcyA9ICQuZ3JlcCB0aGlzLnRleHROb2RlcygpLCAobm9kZSkgLT5cbiAgICAgIG5vZGUucGFyZW50Tm9kZSA9PSBib3VuZHMgb3IgJC5jb250YWlucyhib3VuZHMsIG5vZGUucGFyZW50Tm9kZSlcblxuICAgIHJldHVybiBudWxsIHVubGVzcyBub2Rlcy5sZW5ndGhcblxuICAgIEBzdGFydCA9IG5vZGVzWzBdXG4gICAgQGVuZCAgID0gbm9kZXNbbm9kZXMubGVuZ3RoIC0gMV1cblxuICAgIHN0YXJ0UGFyZW50cyA9ICQoQHN0YXJ0KS5wYXJlbnRzKClcbiAgICBmb3IgcGFyZW50IGluICQoQGVuZCkucGFyZW50cygpXG4gICAgICBpZiBzdGFydFBhcmVudHMuaW5kZXgocGFyZW50KSAhPSAtMVxuICAgICAgICBAY29tbW9uQW5jZXN0b3IgPSBwYXJlbnRcbiAgICAgICAgYnJlYWtcbiAgICB0aGlzXG5cbiAgIyBDb252ZXJ0IHRoaXMgcmFuZ2UgaW50byBhbiBvYmplY3QgY29uc2lzdGluZyBvZiB0d28gcGFpcnMgb2YgKHhwYXRoLFxuICAjIGNoYXJhY3RlciBvZmZzZXQpLCB3aGljaCBjYW4gYmUgZWFzaWx5IHN0b3JlZCBpbiBhIGRhdGFiYXNlLlxuICAjXG4gICMgcm9vdCAtICAgICAgICAgICBUaGUgcm9vdCBFbGVtZW50IHJlbGF0aXZlIHRvIHdoaWNoIFhQYXRocyBzaG91bGQgYmUgY2FsY3VsYXRlZFxuICAjIGlnbm9yZVNlbGVjdG9yIC0gQSBzZWxlY3RvciBTdHJpbmcgb2YgZWxlbWVudHMgdG8gaWdub3JlLiBGb3IgZXhhbXBsZVxuICAjICAgICAgICAgICAgICAgICAgZWxlbWVudHMgaW5qZWN0ZWQgYnkgdGhlIGFubm90YXRvci5cbiAgI1xuICAjIFJldHVybnMgYW4gaW5zdGFuY2Ugb2YgU2VyaWFsaXplZFJhbmdlLlxuICBzZXJpYWxpemU6IChyb290LCBpZ25vcmVTZWxlY3RvcikgLT5cblxuICAgIHNlcmlhbGl6YXRpb24gPSAobm9kZSwgaXNFbmQpIC0+XG4gICAgICBpZiBpZ25vcmVTZWxlY3RvclxuICAgICAgICBvcmlnUGFyZW50ID0gJChub2RlKS5wYXJlbnRzKFwiOm5vdCgje2lnbm9yZVNlbGVjdG9yfSlcIikuZXEoMClcbiAgICAgIGVsc2VcbiAgICAgICAgb3JpZ1BhcmVudCA9ICQobm9kZSkucGFyZW50KClcblxuICAgICAgeHBhdGggPSBVdGlsLnhwYXRoRnJvbU5vZGUob3JpZ1BhcmVudCwgcm9vdClbMF1cbiAgICAgIHRleHROb2RlcyA9IFV0aWwuZ2V0VGV4dE5vZGVzKG9yaWdQYXJlbnQpXG5cbiAgICAgICMgQ2FsY3VsYXRlIHJlYWwgb2Zmc2V0IGFzIHRoZSBjb21iaW5lZCBsZW5ndGggb2YgYWxsIHRoZVxuICAgICAgIyBwcmVjZWRpbmcgdGV4dE5vZGUgc2libGluZ3MuIFdlIGluY2x1ZGUgdGhlIGxlbmd0aCBvZiB0aGVcbiAgICAgICMgbm9kZSBpZiBpdCdzIHRoZSBlbmQgbm9kZS5cbiAgICAgIG5vZGVzID0gdGV4dE5vZGVzLnNsaWNlKDAsIHRleHROb2Rlcy5pbmRleChub2RlKSlcbiAgICAgIG9mZnNldCA9IDBcbiAgICAgIGZvciBuIGluIG5vZGVzXG4gICAgICAgIG9mZnNldCArPSBuLm5vZGVWYWx1ZS5sZW5ndGhcblxuICAgICAgaWYgaXNFbmQgdGhlbiBbeHBhdGgsIG9mZnNldCArIG5vZGUubm9kZVZhbHVlLmxlbmd0aF0gZWxzZSBbeHBhdGgsIG9mZnNldF1cblxuICAgIHN0YXJ0ID0gc2VyaWFsaXphdGlvbihAc3RhcnQpXG4gICAgZW5kICAgPSBzZXJpYWxpemF0aW9uKEBlbmQsIHRydWUpXG5cbiAgICBuZXcgUmFuZ2UuU2VyaWFsaXplZFJhbmdlKHtcbiAgICAgICMgWFBhdGggc3RyaW5nc1xuICAgICAgc3RhcnQ6IHN0YXJ0WzBdXG4gICAgICBlbmQ6IGVuZFswXVxuICAgICAgIyBDaGFyYWN0ZXIgb2Zmc2V0cyAoaW50ZWdlcilcbiAgICAgIHN0YXJ0T2Zmc2V0OiBzdGFydFsxXVxuICAgICAgZW5kT2Zmc2V0OiBlbmRbMV1cbiAgICB9KVxuXG4gICMgUHVibGljOiBDcmVhdGVzIGEgY29uY2F0ZW5hdGVkIFN0cmluZyBvZiB0aGUgY29udGVudHMgb2YgYWxsIHRoZSB0ZXh0IG5vZGVzXG4gICMgd2l0aGluIHRoZSByYW5nZS5cbiAgI1xuICAjIFJldHVybnMgYSBTdHJpbmcuXG4gIHRleHQ6IC0+XG4gICAgKGZvciBub2RlIGluIHRoaXMudGV4dE5vZGVzKClcbiAgICAgIG5vZGUubm9kZVZhbHVlXG4gICAgKS5qb2luICcnXG5cbiAgIyBQdWJsaWM6IEZldGNoZXMgb25seSB0aGUgdGV4dCBub2RlcyB3aXRoaW4gdGggcmFuZ2UuXG4gICNcbiAgIyBSZXR1cm5zIGFuIEFycmF5IG9mIFRleHROb2RlIGluc3RhbmNlcy5cbiAgdGV4dE5vZGVzOiAtPlxuICAgIHRleHROb2RlcyA9IFV0aWwuZ2V0VGV4dE5vZGVzKCQodGhpcy5jb21tb25BbmNlc3RvcikpXG4gICAgW3N0YXJ0LCBlbmRdID0gW3RleHROb2Rlcy5pbmRleCh0aGlzLnN0YXJ0KSwgdGV4dE5vZGVzLmluZGV4KHRoaXMuZW5kKV1cbiAgICAjIFJldHVybiB0aGUgdGV4dE5vZGVzIHRoYXQgZmFsbCBiZXR3ZWVuIHRoZSBzdGFydCBhbmQgZW5kIGluZGV4ZXMuXG4gICAgJC5tYWtlQXJyYXkgdGV4dE5vZGVzW3N0YXJ0Li5lbmRdXG5cbiAgIyBQdWJsaWM6IENvbnZlcnRzIHRoZSBOb3JtYWxpemVkIHJhbmdlIHRvIGEgbmF0aXZlIGJyb3dzZXIgcmFuZ2UuXG4gICNcbiAgIyBTZWU6IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0RPTS9yYW5nZVxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgc2VsZWN0aW9uID0gd2luZG93LmdldFNlbGVjdGlvbigpXG4gICMgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKClcbiAgIyAgIHNlbGVjdGlvbi5hZGRSYW5nZShub3JtZWRSYW5nZS50b1JhbmdlKCkpXG4gICNcbiAgIyBSZXR1cm5zIGEgUmFuZ2Ugb2JqZWN0LlxuICB0b1JhbmdlOiAtPlxuICAgIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxuICAgIHJhbmdlLnNldFN0YXJ0QmVmb3JlKEBzdGFydClcbiAgICByYW5nZS5zZXRFbmRBZnRlcihAZW5kKVxuICAgIHJhbmdlXG5cbiMgUHVibGljOiBBIHJhbmdlIHN1aXRhYmxlIGZvciBzdG9yaW5nIGluIGxvY2FsIHN0b3JhZ2Ugb3Igc2VyaWFsaXppbmcgdG8gSlNPTi5cbmNsYXNzIFJhbmdlLlNlcmlhbGl6ZWRSYW5nZVxuXG4gICMgUHVibGljOiBDcmVhdGVzIGEgU2VyaWFsaXplZFJhbmdlXG4gICNcbiAgIyBvYmogLSBUaGUgc3RvcmVkIG9iamVjdC4gSXQgc2hvdWxkIGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzLlxuICAjICAgICAgIHN0YXJ0OiAgICAgICBBbiB4cGF0aCB0byB0aGUgRWxlbWVudCBjb250YWluaW5nIHRoZSBmaXJzdCBUZXh0Tm9kZVxuICAjICAgICAgICAgICAgICAgICAgICByZWxhdGl2ZSB0byB0aGUgcm9vdCBFbGVtZW50LlxuICAjICAgICAgIHN0YXJ0T2Zmc2V0OiBUaGUgb2Zmc2V0IHRvIHRoZSBzdGFydCBvZiB0aGUgc2VsZWN0aW9uIGZyb20gb2JqLnN0YXJ0LlxuICAjICAgICAgIGVuZDogICAgICAgICBBbiB4cGF0aCB0byB0aGUgRWxlbWVudCBjb250YWluaW5nIHRoZSBsYXN0IFRleHROb2RlXG4gICMgICAgICAgICAgICAgICAgICAgIHJlbGF0aXZlIHRvIHRoZSByb290IEVsZW1lbnQuXG4gICMgICAgICAgc3RhcnRPZmZzZXQ6IFRoZSBvZmZzZXQgdG8gdGhlIGVuZCBvZiB0aGUgc2VsZWN0aW9uIGZyb20gb2JqLmVuZC5cbiAgI1xuICAjIFJldHVybnMgYW4gaW5zdGFuY2Ugb2YgU2VyaWFsaXplZFJhbmdlXG4gIGNvbnN0cnVjdG9yOiAob2JqKSAtPlxuICAgIEBzdGFydCAgICAgICA9IG9iai5zdGFydFxuICAgIEBzdGFydE9mZnNldCA9IG9iai5zdGFydE9mZnNldFxuICAgIEBlbmQgICAgICAgICA9IG9iai5lbmRcbiAgICBAZW5kT2Zmc2V0ICAgPSBvYmouZW5kT2Zmc2V0XG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYSBOb3JtYWxpemVkUmFuZ2UuXG4gICNcbiAgIyByb290IC0gVGhlIHJvb3QgRWxlbWVudCBmcm9tIHdoaWNoIHRoZSBYUGF0aHMgd2VyZSBnZW5lcmF0ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEgTm9ybWFsaXplZFJhbmdlIGluc3RhbmNlLlxuICBub3JtYWxpemU6IChyb290KSAtPlxuICAgIHJhbmdlID0ge31cblxuICAgIGZvciBwIGluIFsnc3RhcnQnLCAnZW5kJ11cbiAgICAgIHRyeVxuICAgICAgICBub2RlID0gUmFuZ2Uubm9kZUZyb21YUGF0aCh0aGlzW3BdLCByb290KVxuICAgICAgY2F0Y2ggZVxuICAgICAgICB0aHJvdyBuZXcgUmFuZ2UuUmFuZ2VFcnJvcihwLCBcIkVycm9yIHdoaWxlIGZpbmRpbmcgI3twfSBub2RlOiAje3RoaXNbcF19OiBcIiArIGUsIGUpXG5cbiAgICAgIGlmIG5vdCBub2RlXG4gICAgICAgIHRocm93IG5ldyBSYW5nZS5SYW5nZUVycm9yKHAsIFwiQ291bGRuJ3QgZmluZCAje3B9IG5vZGU6ICN7dGhpc1twXX1cIilcblxuICAgICAgIyBVbmZvcnR1bmF0ZWx5LCB3ZSAqY2FuJ3QqIGd1YXJhbnRlZSBvbmx5IG9uZSB0ZXh0Tm9kZSBwZXJcbiAgICAgICMgZWxlbWVudE5vZGUsIHNvIHdlIGhhdmUgdG8gd2FsayBhbG9uZyB0aGUgZWxlbWVudCdzIHRleHROb2RlcyB1bnRpbFxuICAgICAgIyB0aGUgY29tYmluZWQgbGVuZ3RoIG9mIHRoZSB0ZXh0Tm9kZXMgdG8gdGhhdCBwb2ludCBleGNlZWRzIG9yXG4gICAgICAjIG1hdGNoZXMgdGhlIHZhbHVlIG9mIHRoZSBvZmZzZXQuXG4gICAgICBsZW5ndGggPSAwXG4gICAgICB0YXJnZXRPZmZzZXQgPSB0aGlzW3AgKyAnT2Zmc2V0J11cblxuICAgICAgIyBSYW5nZSBleGNsdWRlcyBpdHMgZW5kcG9pbnQgYmVjYXVzZSBpdCBkZXNjcmliZXMgdGhlIGJvdW5kYXJ5IHBvc2l0aW9uLlxuICAgICAgIyBUYXJnZXQgdGhlIHN0cmluZyBpbmRleCBvZiB0aGUgbGFzdCBjaGFyYWN0ZXIgaW5zaWRlIHRoZSByYW5nZS5cbiAgICAgIGlmIHAgaXMgJ2VuZCcgdGhlbiB0YXJnZXRPZmZzZXQtLVxuXG4gICAgICBmb3IgdG4gaW4gVXRpbC5nZXRUZXh0Tm9kZXMoJChub2RlKSlcbiAgICAgICAgaWYgKGxlbmd0aCArIHRuLm5vZGVWYWx1ZS5sZW5ndGggPiB0YXJnZXRPZmZzZXQpXG4gICAgICAgICAgcmFuZ2VbcCArICdDb250YWluZXInXSA9IHRuXG4gICAgICAgICAgcmFuZ2VbcCArICdPZmZzZXQnXSA9IHRoaXNbcCArICdPZmZzZXQnXSAtIGxlbmd0aFxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBsZW5ndGggKz0gdG4ubm9kZVZhbHVlLmxlbmd0aFxuXG4gICAgICAjIElmIHdlIGZhbGwgb2ZmIHRoZSBlbmQgb2YgdGhlIGZvciBsb29wIHdpdGhvdXQgaGF2aW5nIHNldFxuICAgICAgIyAnc3RhcnRPZmZzZXQnLydlbmRPZmZzZXQnLCB0aGUgZWxlbWVudCBoYXMgc2hvcnRlciBjb250ZW50IHRoYW4gd2hlblxuICAgICAgIyB3ZSBhbm5vdGF0ZWQsIHNvIHRocm93IGFuIGVycm9yOlxuICAgICAgaWYgbm90IHJhbmdlW3AgKyAnT2Zmc2V0J10/XG4gICAgICAgIHRocm93IG5ldyBSYW5nZS5SYW5nZUVycm9yKFwiI3twfW9mZnNldFwiLCBcIkNvdWxkbid0IGZpbmQgb2Zmc2V0ICN7dGhpc1twICsgJ09mZnNldCddfSBpbiBlbGVtZW50ICN7dGhpc1twXX1cIilcblxuICAgICMgSGVyZSdzIGFuIGVsZWdhbnQgbmV4dCBzdGVwLi4uXG4gICAgI1xuICAgICMgICByYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lciA9ICQocmFuZ2Uuc3RhcnRDb250YWluZXIpLnBhcmVudHMoKS5oYXMocmFuZ2UuZW5kQ29udGFpbmVyKVswXVxuICAgICNcbiAgICAjIC4uLmJ1dCB1bmZvcnR1bmF0ZWx5IE5vZGUuY29udGFpbnMoKSBpcyBicm9rZW4gaW4gU2FmYXJpIDUuMS41ICg3NTM0LjU1LjMpXG4gICAgIyBhbmQgcHJlc3VtYWJseSBvdGhlciBlYXJsaWVyIHZlcnNpb25zIG9mIFdlYktpdC4gSW4gcGFydGljdWxhciwgaW4gYVxuICAgICMgZG9jdW1lbnQgbGlrZVxuICAgICNcbiAgICAjICAgPHA+SGVsbG88L3A+XG4gICAgI1xuICAgICMgdGhlIGNvZGVcbiAgICAjXG4gICAgIyAgIHAgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgncCcpWzBdXG4gICAgIyAgIHAuY29udGFpbnMocC5maXJzdENoaWxkKVxuICAgICNcbiAgICAjIHJldHVybnMgYGZhbHNlYC4gWWF5LlxuICAgICNcbiAgICAjIFNvIGluc3RlYWQsIHdlIHN0ZXAgdGhyb3VnaCB0aGUgcGFyZW50cyBmcm9tIHRoZSBib3R0b20gdXAgYW5kIHVzZVxuICAgICMgTm9kZS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbigpIHRvIGRlY2lkZSB3aGVuIHRvIHNldCB0aGVcbiAgICAjIGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyIGFuZCBiYWlsIG91dC5cblxuICAgIGNvbnRhaW5zID1cbiAgICAgIGlmIG5vdCBkb2N1bWVudC5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbj9cbiAgICAgICAgIyBJRVxuICAgICAgICAoYSwgYikgLT4gYS5jb250YWlucyhiKVxuICAgICAgZWxzZVxuICAgICAgICAjIEV2ZXJ5b25lIGVsc2VcbiAgICAgICAgKGEsIGIpIC0+IGEuY29tcGFyZURvY3VtZW50UG9zaXRpb24oYikgJiAxNlxuXG4gICAgJChyYW5nZS5zdGFydENvbnRhaW5lcikucGFyZW50cygpLmVhY2ggLT5cbiAgICAgIGlmIGNvbnRhaW5zKHRoaXMsIHJhbmdlLmVuZENvbnRhaW5lcilcbiAgICAgICAgcmFuZ2UuY29tbW9uQW5jZXN0b3JDb250YWluZXIgPSB0aGlzXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgbmV3IFJhbmdlLkJyb3dzZXJSYW5nZShyYW5nZSkubm9ybWFsaXplKHJvb3QpXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYSByYW5nZSBzdWl0YWJsZSBmb3Igc3RvcmFnZS5cbiAgI1xuICAjIHJvb3QgICAgICAgICAgIC0gQSByb290IEVsZW1lbnQgZnJvbSB3aGljaCB0byBhbmNob3IgdGhlIHNlcmlhbGlzYXRpb24uXG4gICMgaWdub3JlU2VsZWN0b3IgLSBBIHNlbGVjdG9yIFN0cmluZyBvZiBlbGVtZW50cyB0byBpZ25vcmUuIEZvciBleGFtcGxlXG4gICMgICAgICAgICAgICAgICAgICBlbGVtZW50cyBpbmplY3RlZCBieSB0aGUgYW5ub3RhdG9yLlxuICAjXG4gICMgUmV0dXJucyBhbiBpbnN0YW5jZSBvZiBTZXJpYWxpemVkUmFuZ2UuXG4gIHNlcmlhbGl6ZTogKHJvb3QsIGlnbm9yZVNlbGVjdG9yKSAtPlxuICAgIHRoaXMubm9ybWFsaXplKHJvb3QpLnNlcmlhbGl6ZShyb290LCBpZ25vcmVTZWxlY3RvcilcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgcmFuZ2UgYXMgYW4gT2JqZWN0IGxpdGVyYWwuXG4gIHRvT2JqZWN0OiAtPlxuICAgIHtcbiAgICAgIHN0YXJ0OiBAc3RhcnRcbiAgICAgIHN0YXJ0T2Zmc2V0OiBAc3RhcnRPZmZzZXRcbiAgICAgIGVuZDogQGVuZFxuICAgICAgZW5kT2Zmc2V0OiBAZW5kT2Zmc2V0XG4gICAgfVxuXG5cbiMgRXhwb3J0IFJhbmdlIG9iamVjdC5cbm1vZHVsZS5leHBvcnRzID0gUmFuZ2VcbiIsIiMgUmVnaXN0cnkgaXMgYSBmYWN0b3J5IGZvciBhbm5vdGF0b3IgYXBwbGljYXRpb25zIHByb3ZpZGluZyBhIHNpbXBsZSBydW50aW1lXG4jIGV4dGVuc2lvbiBpbnRlcmZhY2UgYW5kIGFwcGxpY2F0aW9uIGxvYWRlci4gSXQgaXMgdXNlZCB0byBwYXNzIHNldHRpbmdzIHRvXG4jIGV4dGVuc2lvbiBtb2R1bGVzIGFuZCBwcm92aWRlIGEgbWVhbnMgYnkgd2hpY2ggZXh0ZW5zaW9ucyBjYW4gZXhwb3J0XG4jIGZ1bmN0aW9uYWxpdHkgdG8gYXBwbGljYXRpb25zLlxuY2xhc3MgUmVnaXN0cnlcblxuICAjIFB1YmxpYzogQ3JlYXRlIGFuIGluc3RhbmNlIG9mIHRoZSBhcHBsaWNhdGlvbiBkZWZpbmVkIGJ5IHRoZSBwcm92aWRlZFxuICAjIG1vZHVsZS4gVGhlIGFwcGxpY2F0aW9uIHdpbGwgcmVjZWl2ZSBhIG5ldyByZWdpc3RyeSBpbnN0YW5jZSB3aG9zZSBzZXR0aW5nc1xuICAjIG1heSBiZSBwcm92aWRlZCBhcyBhIHNlY29uZCBhcmd1bWVudCB0byB0aGlzIG1ldGhvZC4gVGhlIHJlZ2lzdHJ5IHdpbGxcbiAgIyBpbW1lZGlhdGVseSBpbnZva2UgdGhlIHJ1biBjYWxsYmFjayBvZiB0aGUgbW9kdWxlLlxuICBAY3JlYXRlQXBwOiAoYXBwTW9kdWxlLCBzZXR0aW5ncz17fSkgLT5cbiAgICAobmV3IHRoaXMoc2V0dGluZ3MpKS5ydW4oYXBwTW9kdWxlKVxuXG4gIGNvbnN0cnVjdG9yOiAoQHNldHRpbmdzPXt9KSAtPlxuXG4gICMgUHVibGljOiBJbmNsdWRlIGEgbW9kdWxlLiBBIG1vZHVsZSBpcyBhbnkgT2JqZWN0IHdpdGggYSBmdWN0aW9uIHByb3BlcnR5XG4gICMgbmFtZWQgJ2NvbmZpZ3VyZWAuIFRoaXMgZnVuY3Rpb24gaXMgaW1tZWRpYXRlbHkgaW52b2tlZCB3aXRoIHRoZSByZWdpc3RyeVxuICAjIGluc3RhbmNlIGFzIHRoZSBvbmx5IGFyZ3VtZW50LlxuICBpbmNsdWRlOiAobW9kdWxlKSAtPlxuICAgIG1vZHVsZS5jb25maWd1cmUodGhpcylcbiAgICB0aGlzXG5cbiAgIyBQdWJsaWM6IFJ1biBhbiBhcHBsaWNhdGlvbi4gQW4gYXBwbGljYXRpb24gaXMgYSBtb2R1bGUgd2l0aCBhIGZ1bmN0aW9uXG4gICMgcHJvcGVydHkgbmFtZWQgJ3J1bicuIFRoZSBhcHBsaWNhdGlvbiBpcyBpbW1lZGlhdGVseSBpbmNsdWRlZCBhbmQgaXRzIHJ1blxuICAjIGNhbGxiYWNrIGludm9rZWQgd2l0aCB0aGUgcmVnaXN0cnkgaW5zdGFuY2UgYXMgdGhlIG9ubHkgYXJndW1lbnQuXG4gIHJ1bjogKGFwcCkgLT5cbiAgICBpZiB0aGlzLmFwcFxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVnaXN0cnkgaXMgYWxyZWFkeSBib3VuZCB0byBhIHJ1bm5pbmcgYXBwbGljYXRpb25cIilcblxuICAgIHRoaXMuaW5jbHVkZShhcHApXG5cbiAgICBmb3Igb3duIGssIHYgb2YgdGhpc1xuICAgICAgYXBwW2tdID0gdlxuXG4gICAgdGhpcy5hcHAgPSBhcHBcbiAgICBhcHAucnVuKHRoaXMpXG5cbm1vZHVsZS5leHBvcnRzID0gUmVnaXN0cnlcbiIsIiMgUHVibGljOiBBZGRzIHBlcnNpc3RlbmNlIGhvb2tzIGZvciBhbm5vdGF0aW9ucy5cbmNsYXNzIFN0b3JhZ2VQcm92aWRlclxuXG4gIEBjb25maWd1cmU6IChyZWdpc3RyeSkgLT5cbiAgICBrbGFzcyA9IHJlZ2lzdHJ5LnNldHRpbmdzLnN0b3JlPy50eXBlXG5cbiAgICBpZiB0eXBlb2Yoa2xhc3MpIGlzICdmdW5jdGlvbidcbiAgICAgIHN0b3JlID0gbmV3IGtsYXNzKHJlZ2lzdHJ5LnNldHRpbmdzLnN0b3JlKVxuICAgIGVsc2VcbiAgICAgIHN0b3JlID0gbmV3IHRoaXMocmVnaXN0cnkpXG5cbiAgICByZWdpc3RyeVsnc3RvcmUnXSA/PSBzdG9yZVxuXG4gIGNvbnN0cnVjdG9yOiAoQHJlZ2lzdHJ5KSAtPlxuXG4gICMgUHVibGljOiBnZXQgYW4gdW5pcXVlIGlkZW50aWZpZXJcbiAgaWQ6ICgtPiBjb3VudGVyID0gMDsgLT4gY291bnRlcisrKSgpXG5cbiAgIyBQdWJsaWM6IGNyZWF0ZSBhbiBhbm5vdGF0aW9uXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBPYmplY3QgdG8gY3JlYXRlLlxuICAjXG4gICMgUmV0dXJucyBhIHByb21pc2Ugb2YgdGhlIG5ldyBhbm5vdGF0aW9uIE9iamVjdC5cbiAgY3JlYXRlOiAoYW5ub3RhdGlvbikgLT5cbiAgICBkZmQgPSAkLkRlZmVycmVkKClcbiAgICBpZiBub3QgYW5ub3RhdGlvbi5pZD9cbiAgICAgIGFubm90YXRpb24uaWQgPSB0aGlzLmlkKClcbiAgICBkZmQucmVzb2x2ZShhbm5vdGF0aW9uKVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG5cbiAgIyBQdWJsaWM6IHVwZGF0ZSBhbiBhbm5vdGF0aW9uXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBPYmplY3QgdG8gYmUgdXBkYXRlZC5cbiAgI1xuICAjIFJldHVybnMgYSBwcm9taXNlIG9mIHRoZSB1cGRhdGVkIGFubm90YXRpb24gT2JqZWN0LlxuICB1cGRhdGU6IChhbm5vdGF0aW9uKSAtPlxuICAgIGRmZCA9ICQuRGVmZXJyZWQoKVxuICAgIGRmZC5yZXNvbHZlKGFubm90YXRpb24pXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcblxuICAjIFB1YmxpYzogZGVsZXRlIGFuIGFubm90YXRpb25cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdCB0byBiZSBkZWxldGVkLlxuICAjXG4gICMgUmV0dXJucyBhIHByb21pc2Ugb2YgdGhlIHJlc3VsdCBvZiB0aGUgZGVsZXRlIG9wZXJhdGlvbi5cbiAgZGVsZXRlOiAoYW5ub3RhdGlvbikgLT5cbiAgICBkZmQgPSAkLkRlZmVycmVkKClcbiAgICBkZmQucmVzb2x2ZShhbm5vdGF0aW9uKVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG5cbiAgIyBQdWJsaWM6IHF1ZXJ5IHRoZSBzdG9yZSBmb3IgYW5ub3RhdGlvbnNcbiAgI1xuICAjIFJldHVybnMgYSBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgcXVlcnkgcmVzdWx0cyBhbmQgcXVlcnkgbWV0YWRhdGEuXG4gIHF1ZXJ5OiAocXVlcnlPYmopIC0+XG4gICAgZGZkID0gJC5EZWZlcnJlZCgpXG4gICAgZGZkLnJlc29sdmUoW10sIHt9KVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZVByb3ZpZGVyXG4iLCJ4cGF0aCA9IHJlcXVpcmUgJy4veHBhdGgnXG5cblxuIyBJMThOXG5nZXR0ZXh0ID0gbnVsbFxuXG5pZiBHZXR0ZXh0P1xuICBfZ2V0dGV4dCA9IG5ldyBHZXR0ZXh0KGRvbWFpbjogXCJhbm5vdGF0b3JcIilcbiAgZ2V0dGV4dCA9IChtc2dpZCkgLT4gX2dldHRleHQuZ2V0dGV4dChtc2dpZClcbmVsc2VcbiAgZ2V0dGV4dCA9IChtc2dpZCkgLT4gbXNnaWRcblxuX3QgPSAobXNnaWQpIC0+IGdldHRleHQobXNnaWQpXG5cbnVubGVzcyBqUXVlcnk/LmZuPy5qcXVlcnlcbiAgY29uc29sZS5lcnJvcihfdChcIkFubm90YXRvciByZXF1aXJlcyBqUXVlcnk6IGhhdmUgeW91IGluY2x1ZGVkIGxpYi92ZW5kb3IvanF1ZXJ5LmpzP1wiKSlcblxudW5sZXNzIEpTT04gYW5kIEpTT04ucGFyc2UgYW5kIEpTT04uc3RyaW5naWZ5XG4gIGNvbnNvbGUuZXJyb3IoX3QoXCJBbm5vdGF0b3IgcmVxdWlyZXMgYSBKU09OIGltcGxlbWVudGF0aW9uOiBoYXZlIHlvdSBpbmNsdWRlZCBsaWIvdmVuZG9yL2pzb24yLmpzP1wiKSlcblxuVXRpbCA9IHt9XG5cbiMgUHVibGljOiBDcmVhdGUgYSBHZXR0ZXh0IHRyYW5zbGF0ZWQgc3RyaW5nIGZyb20gYSBtZXNzYWdlIGlkXG4jXG4jIFJldHVybnMgYSBTdHJpbmdcblV0aWwuVHJhbnNsYXRpb25TdHJpbmcgPSBfdFxuXG5cbiMgUHVibGljOiBGbGF0dGVuIGEgbmVzdGVkIGFycmF5IHN0cnVjdHVyZVxuI1xuIyBSZXR1cm5zIGFuIGFycmF5XG5VdGlsLmZsYXR0ZW4gPSAoYXJyYXkpIC0+XG4gIGZsYXR0ZW4gPSAoYXJ5KSAtPlxuICAgIGZsYXQgPSBbXVxuXG4gICAgZm9yIGVsIGluIGFyeVxuICAgICAgZmxhdCA9IGZsYXQuY29uY2F0KGlmIGVsIGFuZCAkLmlzQXJyYXkoZWwpIHRoZW4gZmxhdHRlbihlbCkgZWxzZSBlbClcblxuICAgIHJldHVybiBmbGF0XG5cbiAgZmxhdHRlbihhcnJheSlcblxuIyBQdWJsaWM6IGRlY2lkZXMgd2hldGhlciBub2RlIEEgaXMgYW4gYW5jZXN0b3Igb2Ygbm9kZSBCLlxuI1xuIyBUaGlzIGZ1bmN0aW9uIHB1cnBvc2VmdWxseSBpZ25vcmVzIHRoZSBuYXRpdmUgYnJvd3NlciBmdW5jdGlvbiBmb3IgdGhpcyxcbiMgYmVjYXVzZSBpdCBhY3RzIHdlaXJkIGluIFBoYW50b21KUy5cbiMgSXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9hcml5YS9waGFudG9tanMvaXNzdWVzLzExNDc5XG5VdGlsLmNvbnRhaW5zID0gKHBhcmVudCwgY2hpbGQpIC0+XG4gIG5vZGUgPSBjaGlsZFxuICB3aGlsZSBub2RlP1xuICAgIGlmIG5vZGUgaXMgcGFyZW50IHRoZW4gcmV0dXJuIHRydWVcbiAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlXG4gIHJldHVybiBmYWxzZVxuXG4jIFB1YmxpYzogRmluZHMgYWxsIHRleHQgbm9kZXMgd2l0aGluIHRoZSBlbGVtZW50cyBpbiB0aGUgY3VycmVudCBjb2xsZWN0aW9uLlxuI1xuIyBSZXR1cm5zIGEgbmV3IGpRdWVyeSBjb2xsZWN0aW9uIG9mIHRleHQgbm9kZXMuXG5VdGlsLmdldFRleHROb2RlcyA9IChqcSkgLT5cbiAgZ2V0VGV4dE5vZGVzID0gKG5vZGUpIC0+XG4gICAgaWYgbm9kZSBhbmQgbm9kZS5ub2RlVHlwZSAhPSBOb2RlLlRFWFRfTk9ERVxuICAgICAgbm9kZXMgPSBbXVxuXG4gICAgICAjIElmIG5vdCBhIGNvbW1lbnQgdGhlbiB0cmF2ZXJzZSBjaGlsZHJlbiBjb2xsZWN0aW5nIHRleHQgbm9kZXMuXG4gICAgICAjIFdlIHRyYXZlcnNlIHRoZSBjaGlsZCBub2RlcyBtYW51YWxseSByYXRoZXIgdGhhbiB1c2luZyB0aGUgLmNoaWxkTm9kZXNcbiAgICAgICMgcHJvcGVydHkgYmVjYXVzZSBJRTkgZG9lcyBub3QgdXBkYXRlIHRoZSAuY2hpbGROb2RlcyBwcm9wZXJ0eSBhZnRlclxuICAgICAgIyAuc3BsaXRUZXh0KCkgaXMgY2FsbGVkIG9uIGEgY2hpbGQgdGV4dCBub2RlLlxuICAgICAgaWYgbm9kZS5ub2RlVHlwZSAhPSBOb2RlLkNPTU1FTlRfTk9ERVxuICAgICAgICAjIFN0YXJ0IGF0IHRoZSBsYXN0IGNoaWxkIGFuZCB3YWxrIGJhY2t3YXJkcyB0aHJvdWdoIHNpYmxpbmdzLlxuICAgICAgICBub2RlID0gbm9kZS5sYXN0Q2hpbGRcbiAgICAgICAgd2hpbGUgbm9kZVxuICAgICAgICAgIG5vZGVzLnB1c2ggZ2V0VGV4dE5vZGVzKG5vZGUpXG4gICAgICAgICAgbm9kZSA9IG5vZGUucHJldmlvdXNTaWJsaW5nXG5cbiAgICAgICMgRmluYWxseSByZXZlcnNlIHRoZSBhcnJheSBzbyB0aGF0IG5vZGVzIGFyZSBpbiB0aGUgY29ycmVjdCBvcmRlci5cbiAgICAgIHJldHVybiBub2Rlcy5yZXZlcnNlKClcbiAgICBlbHNlXG4gICAgICByZXR1cm4gbm9kZVxuXG4gIGpxLm1hcCAtPiBVdGlsLmZsYXR0ZW4oZ2V0VGV4dE5vZGVzKHRoaXMpKVxuXG4jIFB1YmxpYzogZGV0ZXJtaW5lIHRoZSBsYXN0IHRleHQgbm9kZSBpbnNpZGUgb3IgYmVmb3JlIHRoZSBnaXZlbiBub2RlXG5VdGlsLmdldExhc3RUZXh0Tm9kZVVwVG8gPSAobikgLT5cbiAgc3dpdGNoIG4ubm9kZVR5cGVcbiAgICB3aGVuIE5vZGUuVEVYVF9OT0RFXG4gICAgICByZXR1cm4gbiAjIFdlIGhhdmUgZm91bmQgb3VyIHRleHQgbm9kZS5cbiAgICB3aGVuIE5vZGUuRUxFTUVOVF9OT0RFXG4gICAgICAjIFRoaXMgaXMgYW4gZWxlbWVudCwgd2UgbmVlZCB0byBkaWcgaW5cbiAgICAgIGlmIG4ubGFzdENoaWxkPyAjIERvZXMgaXQgaGF2ZSBjaGlsZHJlbiBhdCBhbGw/XG4gICAgICAgIHJlc3VsdCA9IFV0aWwuZ2V0TGFzdFRleHROb2RlVXBUbyBuLmxhc3RDaGlsZFxuICAgICAgICBpZiByZXN1bHQ/IHRoZW4gcmV0dXJuIHJlc3VsdCAgICAgICAgXG4gICAgZWxzZVxuICAgICAgIyBOb3QgYSB0ZXh0IG5vZGUsIGFuZCBub3QgYW4gZWxlbWVudCBub2RlLlxuICAjIENvdWxkIG5vdCBmaW5kIGEgdGV4dCBub2RlIGluIGN1cnJlbnQgbm9kZSwgZ28gYmFja3dhcmRzXG4gIG4gPSBuLnByZXZpb3VzU2libGluZ1xuICBpZiBuP1xuICAgIFV0aWwuZ2V0TGFzdFRleHROb2RlVXBUbyBuXG4gIGVsc2VcbiAgICBudWxsXG5cbiMgUHVibGljOiBkZXRlcm1pbmUgdGhlIGZpcnN0IHRleHQgbm9kZSBpbiBvciBhZnRlciB0aGUgZ2l2ZW4galF1ZXJ5IG5vZGUuXG5VdGlsLmdldEZpcnN0VGV4dE5vZGVOb3RCZWZvcmUgPSAobikgLT5cbiAgc3dpdGNoIG4ubm9kZVR5cGVcbiAgICB3aGVuIE5vZGUuVEVYVF9OT0RFXG4gICAgICByZXR1cm4gbiAjIFdlIGhhdmUgZm91bmQgb3VyIHRleHQgbm9kZS5cbiAgICB3aGVuIE5vZGUuRUxFTUVOVF9OT0RFXG4gICAgICAjIFRoaXMgaXMgYW4gZWxlbWVudCwgd2UgbmVlZCB0byBkaWcgaW5cbiAgICAgIGlmIG4uZmlyc3RDaGlsZD8gIyBEb2VzIGl0IGhhdmUgY2hpbGRyZW4gYXQgYWxsP1xuICAgICAgICByZXN1bHQgPSBVdGlsLmdldEZpcnN0VGV4dE5vZGVOb3RCZWZvcmUgbi5maXJzdENoaWxkXG4gICAgICAgIGlmIHJlc3VsdD8gdGhlbiByZXR1cm4gcmVzdWx0XG4gICAgZWxzZVxuICAgICAgIyBOb3QgYSB0ZXh0IG9yIGFuIGVsZW1lbnQgbm9kZS5cbiAgIyBDb3VsZCBub3QgZmluZCBhIHRleHQgbm9kZSBpbiBjdXJyZW50IG5vZGUsIGdvIGZvcndhcmRcbiAgbiA9IG4ubmV4dFNpYmxpbmdcbiAgaWYgbj9cbiAgICBVdGlsLmdldEZpcnN0VGV4dE5vZGVOb3RCZWZvcmUgblxuICBlbHNlXG4gICAgbnVsbFxuXG4jIFB1YmxpYzogcmVhZCBvdXQgdGhlIHRleHQgdmFsdWUgb2YgYSByYW5nZSB1c2luZyB0aGUgc2VsZWN0aW9uIEFQSVxuI1xuIyBUaGlzIG1ldGhvZCBzZWxlY3RzIHRoZSBzcGVjaWZpZWQgcmFuZ2UsIGFuZCBhc2tzIGZvciB0aGUgc3RyaW5nXG4jIHZhbHVlIG9mIHRoZSBzZWxlY3Rpb24uIFdoYXQgdGhpcyByZXR1cm5zIGlzIHZlcnkgY2xvc2UgdG8gd2hhdCB0aGUgdXNlclxuIyBhY3R1YWxseSBzZWVzLlxuVXRpbC5yZWFkUmFuZ2VWaWFTZWxlY3Rpb24gPSAocmFuZ2UpIC0+XG4gIHNlbCA9IFV0aWwuZ2V0R2xvYmFsKCkuZ2V0U2VsZWN0aW9uKCkgIyBHZXQgdGhlIGJyb3dzZXIgc2VsZWN0aW9uIG9iamVjdFxuICBzZWwucmVtb3ZlQWxsUmFuZ2VzKCkgICAgICAgICAgICAgICAgICMgY2xlYXIgdGhlIHNlbGVjdGlvblxuICBzZWwuYWRkUmFuZ2UgcmFuZ2UudG9SYW5nZSgpICAgICAgICAgICMgU2VsZWN0IHRoZSByYW5nZVxuICBzZWwudG9TdHJpbmcoKSAgICAgICAgICAgICAgICAgICAgICAgICMgUmVhZCBvdXQgdGhlIHNlbGVjdGlvblxuXG5VdGlsLnhwYXRoRnJvbU5vZGUgPSAoZWwsIHJlbGF0aXZlUm9vdCkgLT5cbiAgdHJ5XG4gICAgcmVzdWx0ID0geHBhdGguc2ltcGxlWFBhdGhKUXVlcnkuY2FsbCBlbCwgcmVsYXRpdmVSb290XG4gIGNhdGNoIGV4Y2VwdGlvblxuICAgIGNvbnNvbGUubG9nIFwialF1ZXJ5LWJhc2VkIFhQYXRoIGNvbnN0cnVjdGlvbiBmYWlsZWQhIEZhbGxpbmcgYmFjayB0byBtYW51YWwuXCJcbiAgICByZXN1bHQgPSB4cGF0aC5zaW1wbGVYUGF0aFB1cmUuY2FsbCBlbCwgcmVsYXRpdmVSb290XG4gIHJlc3VsdFxuXG5VdGlsLm5vZGVGcm9tWFBhdGggPSAoeHAsIHJvb3QpIC0+XG4gIHN0ZXBzID0geHAuc3Vic3RyaW5nKDEpLnNwbGl0KFwiL1wiKVxuICBub2RlID0gcm9vdFxuICBmb3Igc3RlcCBpbiBzdGVwc1xuICAgIFtuYW1lLCBpZHhdID0gc3RlcC5zcGxpdCBcIltcIlxuICAgIGlkeCA9IGlmIGlkeD8gdGhlbiBwYXJzZUludCAoaWR4Py5zcGxpdCBcIl1cIilbMF0gZWxzZSAxXG4gICAgbm9kZSA9IHhwYXRoLmZpbmRDaGlsZCBub2RlLCBuYW1lLnRvTG93ZXJDYXNlKCksIGlkeFxuXG4gIG5vZGVcblxuVXRpbC5lc2NhcGUgPSAoaHRtbCkgLT5cbiAgaHRtbFxuICAgIC5yZXBsYWNlKC8mKD8hXFx3KzspL2csICcmYW1wOycpXG4gICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpXG5cblV0aWwudXVpZCA9ICgtPiBjb3VudGVyID0gMDsgLT4gY291bnRlcisrKSgpXG5cblV0aWwuZ2V0R2xvYmFsID0gLT4gKC0+IHRoaXMpKClcblxuIyBSZXR1cm4gdGhlIG1heGltdW0gei1pbmRleCBvZiBhbnkgZWxlbWVudCBpbiAkZWxlbWVudHMgKGEgalF1ZXJ5IGNvbGxlY3Rpb24pLlxuVXRpbC5tYXhaSW5kZXggPSAoJGVsZW1lbnRzKSAtPlxuICBhbGwgPSBmb3IgZWwgaW4gJGVsZW1lbnRzXG4gICAgICAgICAgaWYgJChlbCkuY3NzKCdwb3NpdGlvbicpID09ICdzdGF0aWMnXG4gICAgICAgICAgICAtMVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHBhcnNlSW50KCQoZWwpLmNzcygnei1pbmRleCcpLCAxMCkgb3IgLTFcbiAgTWF0aC5tYXguYXBwbHkoTWF0aCwgYWxsKVxuXG5VdGlsLm1vdXNlUG9zaXRpb24gPSAoZSwgb2Zmc2V0RWwpIC0+XG4gICMgSWYgdGhlIG9mZnNldCBlbGVtZW50IGlzIG5vdCBhIHBvc2l0aW9uaW5nIHJvb3QgdXNlIGl0cyBvZmZzZXQgcGFyZW50XG4gIHVubGVzcyAkKG9mZnNldEVsKS5jc3MoJ3Bvc2l0aW9uJykgaW4gWydhYnNvbHV0ZScsICdmaXhlZCcsICdyZWxhdGl2ZSddXG4gICAgb2Zmc2V0RWwgPSAkKG9mZnNldEVsKS5vZmZzZXRQYXJlbnQoKVswXVxuICBvZmZzZXQgPSAkKG9mZnNldEVsKS5vZmZzZXQoKVxuICB7XG4gICAgdG9wOiAgZS5wYWdlWSAtIG9mZnNldC50b3AsXG4gICAgbGVmdDogZS5wYWdlWCAtIG9mZnNldC5sZWZ0XG4gIH1cblxuIyBDaGVja3MgdG8gc2VlIGlmIGFuIGV2ZW50IHBhcmFtZXRlciBpcyBwcm92aWRlZCBhbmQgY29udGFpbnMgdGhlIHByZXZlbnRcbiMgZGVmYXVsdCBtZXRob2QuIElmIGl0IGRvZXMgaXQgY2FsbHMgaXQuXG4jXG4jIFRoaXMgaXMgdXNlZnVsIGZvciBtZXRob2RzIHRoYXQgY2FuIGJlIG9wdGlvbmFsbHkgdXNlZCBhcyBjYWxsYmFja3NcbiMgd2hlcmUgdGhlIGV4aXN0YW5jZSBvZiB0aGUgcGFyYW1ldGVyIG11c3QgYmUgY2hlY2tlZCBiZWZvcmUgY2FsbGluZy5cblV0aWwucHJldmVudEV2ZW50RGVmYXVsdCA9IChldmVudCkgLT5cbiAgZXZlbnQ/LnByZXZlbnREZWZhdWx0PygpXG5cblxuIyBFeHBvcnQgVXRpbCBvYmplY3Rcbm1vZHVsZS5leHBvcnRzID0gVXRpbFxuIiwiVXRpbCA9IHJlcXVpcmUgJy4vdXRpbCdcbldpZGdldCA9IHJlcXVpcmUgJy4vd2lkZ2V0J1xuXG5cbl90ID0gVXRpbC5UcmFuc2xhdGlvblN0cmluZ1xuXG5cbiMgUHVibGljOiBDcmVhdGVzIGFuIGVsZW1lbnQgZm9yIHZpZXdpbmcgYW5ub3RhdGlvbnMuXG5jbGFzcyBWaWV3ZXIgZXh0ZW5kcyBXaWRnZXRcblxuICAjIEV2ZW50cyB0byBiZSBib3VuZCB0byB0aGUgQGVsZW1lbnQuXG4gIGV2ZW50czpcbiAgICBcIi5hbm5vdGF0b3ItZWRpdCBjbGlja1wiOiAgIFwib25FZGl0Q2xpY2tcIlxuICAgIFwiLmFubm90YXRvci1kZWxldGUgY2xpY2tcIjogXCJvbkRlbGV0ZUNsaWNrXCJcblxuICAjIENsYXNzZXMgZm9yIHRvZ2dsaW5nIGFubm90YXRvciBzdGF0ZS5cbiAgY2xhc3NlczpcbiAgICBoaWRlOiAnYW5ub3RhdG9yLWhpZGUnXG4gICAgc2hvd0NvbnRyb2xzOiAnYW5ub3RhdG9yLXZpc2libGUnXG5cbiAgIyBIVE1MIHRlbXBsYXRlcyBmb3IgQGVsZW1lbnQgYW5kIEBpdGVtIHByb3BlcnRpZXMuXG4gIGh0bWw6XG4gICAgZWxlbWVudDpcIlwiXCJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhbm5vdGF0b3Itb3V0ZXIgYW5ub3RhdG9yLXZpZXdlclwiPlxuICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJhbm5vdGF0b3Itd2lkZ2V0IGFubm90YXRvci1saXN0aW5nXCI+PC91bD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgXCJcIlwiXG4gICAgaXRlbTogICBcIlwiXCJcbiAgICAgICAgICAgIDxsaSBjbGFzcz1cImFubm90YXRvci1hbm5vdGF0aW9uIGFubm90YXRvci1pdGVtXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYW5ub3RhdG9yLWNvbnRyb2xzXCI+XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiB0aXRsZT1cIlZpZXcgYXMgd2VicGFnZVwiIGNsYXNzPVwiYW5ub3RhdG9yLWxpbmtcIj5WaWV3IGFzIHdlYnBhZ2U8L2E+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJFZGl0XCIgY2xhc3M9XCJhbm5vdGF0b3ItZWRpdFwiPkVkaXQ8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIkRlbGV0ZVwiIGNsYXNzPVwiYW5ub3RhdG9yLWRlbGV0ZVwiPkRlbGV0ZTwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgXCJcIlwiXG5cbiAgIyBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgb3B0aW9uczpcbiAgICByZWFkT25seTogZmFsc2UgIyBTdGFydCB0aGUgdmlld2VyIGluIHJlYWQtb25seSBtb2RlLiBObyBjb250cm9scyB3aWxsIGJlIHNob3duLlxuXG4gICMgUHVibGljOiBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIHRoZSBWaWV3ZXIgb2JqZWN0LiBUaGlzIHdpbGwgY3JlYXRlIHRoZVxuICAjIEBlbGVtZW50IGZyb20gdGhlIEBodG1sLmVsZW1lbnQgc3RyaW5nIGFuZCBzZXQgdXAgYWxsIGV2ZW50cy5cbiAgI1xuICAjIG9wdGlvbnMgLSBBbiBPYmplY3QgbGl0ZXJhbCBjb250YWluaW5nIG9wdGlvbnMuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIENyZWF0ZXMgYSBuZXcgdmlld2VyLCBhZGRzIGEgY3VzdG9tIGZpZWxkIGFuZCBkaXNwbGF5cyBhbiBhbm5vdGF0aW9uLlxuICAjICAgdmlld2VyID0gbmV3IEFubm90YXRvci5WaWV3ZXIoKVxuICAjICAgdmlld2VyLmFkZEZpZWxkKHtcbiAgIyAgICAgbG9hZDogc29tZUxvYWRDYWxsYmFja1xuICAjICAgfSlcbiAgIyAgIHZpZXdlci5sb2FkKGFubm90YXRpb24pXG4gICNcbiAgIyBSZXR1cm5zIGEgbmV3IFZpZXdlciBpbnN0YW5jZS5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIHN1cGVyICQoQGh0bWwuZWxlbWVudClbMF0sIG9wdGlvbnNcblxuICAgIEBpdGVtICAgPSAkKEBodG1sLml0ZW0pWzBdXG4gICAgQGZpZWxkcyA9IFtdXG4gICAgQGFubm90YXRpb25zID0gW11cblxuICAjIFB1YmxpYzogRGlzcGxheXMgdGhlIFZpZXdlciBhbmQgZmlyc3QgdGhlIFwic2hvd1wiIGV2ZW50LiBDYW4gYmUgdXNlZCBhcyBhblxuICAjIGV2ZW50IGNhbGxiYWNrIGFuZCB3aWxsIGNhbGwgRXZlbnQjcHJldmVudERlZmF1bHQoKSBvbiB0aGUgc3VwcGxpZWQgZXZlbnQuXG4gICNcbiAgIyBldmVudCAtIEV2ZW50IG9iamVjdCBwcm92aWRlZCBpZiBtZXRob2QgaXMgY2FsbGVkIGJ5IGV2ZW50XG4gICMgICAgICAgICBsaXN0ZW5lciAoZGVmYXVsdDp1bmRlZmluZWQpXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIERpc3BsYXlzIHRoZSBlZGl0b3IuXG4gICMgICB2aWV3ZXIuc2hvdygpXG4gICNcbiAgIyAgICMgRGlzcGxheXMgdGhlIHZpZXdlciBvbiBjbGljayAocHJldmVudHMgZGVmYXVsdCBhY3Rpb24pLlxuICAjICAgJCgnYS5zaG93LXZpZXdlcicpLmJpbmQoJ2NsaWNrJywgdmlld2VyLnNob3cpXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZi5cbiAgc2hvdzogKGV2ZW50KSA9PlxuICAgIFV0aWwucHJldmVudEV2ZW50RGVmYXVsdCBldmVudFxuXG4gICAgY29udHJvbHMgPSBAZWxlbWVudFxuICAgICAgLmZpbmQoJy5hbm5vdGF0b3ItY29udHJvbHMnKVxuICAgICAgLmFkZENsYXNzKEBjbGFzc2VzLnNob3dDb250cm9scylcbiAgICBzZXRUaW1lb3V0KCg9PiBjb250cm9scy5yZW1vdmVDbGFzcyhAY2xhc3Nlcy5zaG93Q29udHJvbHMpKSwgNTAwKVxuXG4gICAgQGVsZW1lbnQucmVtb3ZlQ2xhc3MoQGNsYXNzZXMuaGlkZSlcbiAgICB0aGlzLmNoZWNrT3JpZW50YXRpb24oKS5wdWJsaXNoKCdzaG93JylcblxuICAjIFB1YmxpYzogQ2hlY2tzIHRvIHNlZSBpZiB0aGUgVmlld2VyIGlzIGN1cnJlbnRseSBkaXNwbGF5ZWQuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICB2aWV3ZXIuc2hvdygpXG4gICMgICB2aWV3ZXIuaXNTaG93bigpICMgPT4gUmV0dXJucyB0cnVlXG4gICNcbiAgIyAgIHZpZXdlci5oaWRlKClcbiAgIyAgIHZpZXdlci5pc1Nob3duKCkgIyA9PiBSZXR1cm5zIGZhbHNlXG4gICNcbiAgIyBSZXR1cm5zIHRydWUgaWYgdGhlIFZpZXdlciBpcyB2aXNpYmxlLlxuICBpc1Nob3duOiAtPlxuICAgIG5vdCBAZWxlbWVudC5oYXNDbGFzcyhAY2xhc3Nlcy5oaWRlKVxuXG4gICMgUHVibGljOiBIaWRlcyB0aGUgRWRpdG9yIGFuZCBmaXJlcyB0aGUgXCJoaWRlXCIgZXZlbnQuIENhbiBiZSB1c2VkIGFzIGFuIGV2ZW50XG4gICMgY2FsbGJhY2sgYW5kIHdpbGwgY2FsbCBFdmVudCNwcmV2ZW50RGVmYXVsdCgpIG9uIHRoZSBzdXBwbGllZCBldmVudC5cbiAgI1xuICAjIGV2ZW50IC0gRXZlbnQgb2JqZWN0IHByb3ZpZGVkIGlmIG1ldGhvZCBpcyBjYWxsZWQgYnkgZXZlbnRcbiAgIyAgICAgICAgIGxpc3RlbmVyIChkZWZhdWx0OnVuZGVmaW5lZClcbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgSGlkZXMgdGhlIGVkaXRvci5cbiAgIyAgIHZpZXdlci5oaWRlKClcbiAgI1xuICAjICAgIyBIaWRlIHRoZSB2aWV3ZXIgb24gY2xpY2sgKHByZXZlbnRzIGRlZmF1bHQgYWN0aW9uKS5cbiAgIyAgICQoJ2EuaGlkZS12aWV3ZXInKS5iaW5kKCdjbGljaycsIHZpZXdlci5oaWRlKVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYuXG4gIGhpZGU6IChldmVudCkgPT5cbiAgICBVdGlsLnByZXZlbnRFdmVudERlZmF1bHQgZXZlbnRcblxuICAgIEBlbGVtZW50LmFkZENsYXNzKEBjbGFzc2VzLmhpZGUpXG4gICAgdGhpcy5wdWJsaXNoKCdoaWRlJylcblxuICAjIFB1YmxpYzogTG9hZHMgYW5ub3RhdGlvbnMgaW50byB0aGUgdmlld2VyIGFuZCBzaG93cyBpdC4gRmlyZXMgdGhlIFwibG9hZFwiXG4gICMgZXZlbnQgb25jZSB0aGUgdmlld2VyIGlzIGxvYWRlZCBwYXNzaW5nIHRoZSBhbm5vdGF0aW9ucyBpbnRvIHRoZSBjYWxsYmFjay5cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBBcnJheSBvZiBhbm5vdGF0aW9uIGVsZW1lbnRzLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgdmlld2VyLmxvYWQoW2Fubm90YXRpb24xLCBhbm5vdGF0aW9uMiwgYW5ub3RhdGlvbjNdKVxuICAjXG4gICMgUmV0dXJucyBpdHNsZWYuXG4gIGxvYWQ6IChhbm5vdGF0aW9ucykgPT5cbiAgICBAYW5ub3RhdGlvbnMgPSBhbm5vdGF0aW9ucyB8fCBbXVxuXG4gICAgbGlzdCA9IEBlbGVtZW50LmZpbmQoJ3VsOmZpcnN0JykuZW1wdHkoKVxuICAgIGZvciBhbm5vdGF0aW9uIGluIEBhbm5vdGF0aW9uc1xuICAgICAgaXRlbSA9ICQoQGl0ZW0pLmNsb25lKCkuYXBwZW5kVG8obGlzdCkuZGF0YSgnYW5ub3RhdGlvbicsIGFubm90YXRpb24pXG4gICAgICBjb250cm9scyA9IGl0ZW0uZmluZCgnLmFubm90YXRvci1jb250cm9scycpXG5cbiAgICAgIGxpbmsgPSBjb250cm9scy5maW5kKCcuYW5ub3RhdG9yLWxpbmsnKVxuICAgICAgZWRpdCA9IGNvbnRyb2xzLmZpbmQoJy5hbm5vdGF0b3ItZWRpdCcpXG4gICAgICBkZWwgID0gY29udHJvbHMuZmluZCgnLmFubm90YXRvci1kZWxldGUnKVxuXG4gICAgICBsaW5rcyA9IG5ldyBMaW5rUGFyc2VyKGFubm90YXRpb24ubGlua3Mgb3IgW10pLmdldCgnYWx0ZXJuYXRlJywgeyd0eXBlJzogJ3RleHQvaHRtbCd9KVxuICAgICAgaWYgbGlua3MubGVuZ3RoIGlzIDAgb3Igbm90IGxpbmtzWzBdLmhyZWY/XG4gICAgICAgIGxpbmsucmVtb3ZlKClcbiAgICAgIGVsc2VcbiAgICAgICAgbGluay5hdHRyKCdocmVmJywgbGlua3NbMF0uaHJlZilcblxuICAgICAgaWYgQG9wdGlvbnMucmVhZE9ubHlcbiAgICAgICAgZWRpdC5yZW1vdmUoKVxuICAgICAgICBkZWwucmVtb3ZlKClcbiAgICAgIGVsc2VcbiAgICAgICAgY29udHJvbGxlciA9IHtcbiAgICAgICAgICBzaG93RWRpdDogLT4gZWRpdC5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpXG4gICAgICAgICAgaGlkZUVkaXQ6IC0+IGVkaXQuYXR0cignZGlzYWJsZWQnLCAnZGlzYWJsZWQnKVxuICAgICAgICAgIHNob3dEZWxldGU6IC0+IGRlbC5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpXG4gICAgICAgICAgaGlkZURlbGV0ZTogLT4gZGVsLmF0dHIoJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJylcbiAgICAgICAgfVxuXG4gICAgICBmb3IgZmllbGQgaW4gQGZpZWxkc1xuICAgICAgICBlbGVtZW50ID0gJChmaWVsZC5lbGVtZW50KS5jbG9uZSgpLmFwcGVuZFRvKGl0ZW0pWzBdXG4gICAgICAgIGZpZWxkLmxvYWQoZWxlbWVudCwgYW5ub3RhdGlvbiwgY29udHJvbGxlcilcblxuICAgIHRoaXMucHVibGlzaCgnbG9hZCcsIFtAYW5ub3RhdGlvbnNdKVxuXG4gICAgdGhpcy5zaG93KClcblxuICAjIFB1YmxpYzogQWRkcyBhbiBhZGRpb25hbCBmaWVsZCB0byBhbiBhbm5vdGF0aW9uIHZpZXcuIEEgY2FsbGJhY2sgY2FuIGJlXG4gICMgcHJvdmlkZWQgdG8gdXBkYXRlIHRoZSB2aWV3IG9uIGxvYWQuXG4gICNcbiAgIyBvcHRpb25zIC0gQW4gb3B0aW9ucyBPYmplY3QuIE9wdGlvbnMgYXJlIGFzIGZvbGxvd3M6XG4gICMgICAgICAgICAgIGxvYWQgLSBDYWxsYmFjayBGdW5jdGlvbiBjYWxsZWQgd2hlbiB0aGUgdmlldyBpcyBsb2FkZWQgd2l0aCBhblxuICAjICAgICAgICAgICAgICAgICAgYW5ub3RhdGlvbi4gUmVjaWV2ZXMgYSBuZXdseSBjcmVhdGVkIGNsb25lIG9mIEBpdGVtIGFuZFxuICAjICAgICAgICAgICAgICAgICAgdGhlIGFubm90YXRpb24gdG8gYmUgZGlzcGxheWVkIChpdCB3aWxsIGJlIGNhbGxlZCBvbmNlXG4gICMgICAgICAgICAgICAgICAgICBmb3IgZWFjaCBhbm5vdGF0aW9uIGJlaW5nIGxvYWRlZCkuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIERpc3BsYXkgYSB1c2VyIG5hbWUuXG4gICMgICB2aWV3ZXIuYWRkRmllbGQoe1xuICAjICAgICAjIFRoaXMgaXMgY2FsbGVkIHdoZW4gdGhlIHZpZXdlciBpcyBsb2FkZWQuXG4gICMgICAgIGxvYWQ6IChmaWVsZCwgYW5ub3RhdGlvbikgLT5cbiAgIyAgICAgICBmaWVsZCA9ICQoZmllbGQpXG4gICNcbiAgIyAgICAgICBpZiBhbm5vdGF0aW9uLnVzZXJcbiAgIyAgICAgICAgIGZpZWxkLnRleHQoYW5ub3RhdGlvbi51c2VyKSAjIERpc3BsYXkgdGhlIHVzZXJcbiAgIyAgICAgICBlbHNlXG4gICMgICAgICAgICBmaWVsZC5yZW1vdmUoKSAgICAgICAgICAgICAgIyBEbyBub3QgZGlzcGxheSB0aGUgZmllbGQuXG4gICMgICB9KVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYuXG4gIGFkZEZpZWxkOiAob3B0aW9ucykgLT5cbiAgICBmaWVsZCA9ICQuZXh0ZW5kKHtcbiAgICAgIGxvYWQ6IC0+XG4gICAgfSwgb3B0aW9ucylcblxuICAgIGZpZWxkLmVsZW1lbnQgPSAkKCc8ZGl2IC8+JylbMF1cbiAgICBAZmllbGRzLnB1c2ggZmllbGRcbiAgICBmaWVsZC5lbGVtZW50XG4gICAgdGhpc1xuXG4gICMgQ2FsbGJhY2sgZnVuY3Rpb246IGNhbGxlZCB3aGVuIHRoZSBlZGl0IGJ1dHRvbiBpcyBjbGlja2VkLlxuICAjXG4gICMgZXZlbnQgLSBBbiBFdmVudCBvYmplY3QuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIG9uRWRpdENsaWNrOiAoZXZlbnQpID0+XG4gICAgdGhpcy5vbkJ1dHRvbkNsaWNrKGV2ZW50LCAnZWRpdCcpXG5cbiAgIyBDYWxsYmFjayBmdW5jdGlvbjogY2FsbGVkIHdoZW4gdGhlIGRlbGV0ZSBidXR0b24gaXMgY2xpY2tlZC5cbiAgI1xuICAjIGV2ZW50IC0gQW4gRXZlbnQgb2JqZWN0LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBvbkRlbGV0ZUNsaWNrOiAoZXZlbnQpID0+XG4gICAgdGhpcy5vbkJ1dHRvbkNsaWNrKGV2ZW50LCAnZGVsZXRlJylcblxuICAjIEZpcmVzIGFuIGV2ZW50IG9mIHR5cGUgYW5kIHBhc3NlcyBpbiB0aGUgYXNzb2NpYXRlZCBhbm5vdGF0aW9uLlxuICAjXG4gICMgZXZlbnQgLSBBbiBFdmVudCBvYmplY3QuXG4gICMgdHlwZSAgLSBUaGUgdHlwZSBvZiBldmVudCB0byBmaXJlLiBFaXRoZXIgXCJlZGl0XCIgb3IgXCJkZWxldGVcIi5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgb25CdXR0b25DbGljazogKGV2ZW50LCB0eXBlKSAtPlxuICAgIGl0ZW0gPSAkKGV2ZW50LnRhcmdldCkucGFyZW50cygnLmFubm90YXRvci1hbm5vdGF0aW9uJylcblxuICAgIHRoaXMucHVibGlzaCh0eXBlLCBbaXRlbS5kYXRhKCdhbm5vdGF0aW9uJyldKVxuXG4jIFByaXZhdGU6IHNpbXBsZSBwYXJzZXIgZm9yIGh5cGVybWVkaWEgbGluayBzdHJ1Y3R1cmVcbiNcbiMgRXhhbXBsZXM6XG4jXG4jICAgbGlua3MgPSBbXG4jICAgICB7IHJlbDogJ2FsdGVybmF0ZScsIGhyZWY6ICdodHRwOi8vZXhhbXBsZS5jb20vcGFnZXMvMTQuanNvbicsIHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuIyAgICAgeyByZWw6ICdwcmV2JzogaHJlZjogJ2h0dHA6Ly9leGFtcGxlLmNvbS9wYWdlcy8xMycgfVxuIyAgIF1cbiNcbiMgICBscCA9IExpbmtQYXJzZXIobGlua3MpXG4jICAgbHAuZ2V0KCdhbHRlcm5hdGUnKSAgICAgICAgICAgICAgICAgICAgICAjID0+IFsgeyByZWw6ICdhbHRlcm5hdGUnLCBocmVmOiAnaHR0cDovLy4uLicsIC4uLiB9IF1cbiMgICBscC5nZXQoJ2FsdGVybmF0ZScsIHt0eXBlOiAndGV4dC9odG1sJ30pICMgPT4gW11cbiNcbmNsYXNzIExpbmtQYXJzZXJcbiAgY29uc3RydWN0b3I6IChAZGF0YSkgLT5cblxuICBnZXQ6IChyZWwsIGNvbmQ9e30pIC0+XG4gICAgY29uZCA9ICQuZXh0ZW5kKHt9LCBjb25kLCB7cmVsOiByZWx9KVxuICAgIGtleXMgPSAoayBmb3Igb3duIGssIHYgb2YgY29uZClcbiAgICBmb3IgZCBpbiBAZGF0YVxuICAgICAgbWF0Y2ggPSBrZXlzLnJlZHVjZSAoKG0sIGspIC0+IG0gYW5kIChkW2tdIGlzIGNvbmRba10pKSwgdHJ1ZVxuICAgICAgaWYgbWF0Y2hcbiAgICAgICAgZFxuICAgICAgZWxzZVxuICAgICAgICBjb250aW51ZVxuXG5cbiMgRXhwb3J0IHRoZSBWaWV3ZXIgb2JqZWN0XG5tb2R1bGUuZXhwb3J0cyA9IFZpZXdlclxuIiwiRGVsZWdhdG9yID0gcmVxdWlyZSAnLi9jbGFzcydcblV0aWwgPSByZXF1aXJlICcuL3V0aWwnXG5cblxuIyBQdWJsaWM6IEJhc2UgY2xhc3MgZm9yIHRoZSBFZGl0b3IgYW5kIFZpZXdlciBlbGVtZW50cy4gQ29udGFpbnMgbWV0aG9kcyB0aGF0XG4jIGFyZSBzaGFyZWQgYmV0d2VlbiB0aGUgdHdvLlxuY2xhc3MgV2lkZ2V0IGV4dGVuZHMgRGVsZWdhdG9yXG4gICMgQ2xhc3NlcyB1c2VkIHRvIGFsdGVyIHRoZSB3aWRnZXRzIHN0YXRlLlxuICBjbGFzc2VzOlxuICAgIGhpZGU6ICdhbm5vdGF0b3ItaGlkZSdcbiAgICBpbnZlcnQ6XG4gICAgICB4OiAnYW5ub3RhdG9yLWludmVydC14J1xuICAgICAgeTogJ2Fubm90YXRvci1pbnZlcnQteSdcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhIG5ldyBXaWRnZXQgaW5zdGFuY2UuXG4gICNcbiAgIyBlbGVtZW50IC0gVGhlIEVsZW1lbnQgdGhhdCByZXByZXNlbnRzIHRoZSB3aWRnZXQgaW4gdGhlIERPTS5cbiAgIyBvcHRpb25zIC0gQW4gT2JqZWN0IGxpdGVyYWwgb2Ygb3B0aW9ucy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAjICAgd2lkZ2V0ICA9IG5ldyBBbm5vdGF0b3IuV2lkZ2V0KGVsZW1lbnQpXG4gICNcbiAgIyBSZXR1cm5zIGEgbmV3IFdpZGdldCBpbnN0YW5jZS5cbiAgY29uc3RydWN0b3I6IChlbGVtZW50LCBvcHRpb25zKSAtPlxuICAgIHN1cGVyXG4gICAgQGNsYXNzZXMgPSAkLmV4dGVuZCB7fSwgV2lkZ2V0LnByb3RvdHlwZS5jbGFzc2VzLCBAY2xhc3Nlc1xuXG4gICMgUHVibGljOiBVbmJpbmQgdGhlIHdpZGdldCdzIGV2ZW50cyBhbmQgcmVtb3ZlIGl0cyBlbGVtZW50IGZyb20gdGhlIERPTS5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgZGVzdHJveTogLT5cbiAgICB0aGlzLnJlbW92ZUV2ZW50cygpXG4gICAgQGVsZW1lbnQucmVtb3ZlKClcblxuICBjaGVja09yaWVudGF0aW9uOiAtPlxuICAgIHRoaXMucmVzZXRPcmllbnRhdGlvbigpXG5cbiAgICB3aW5kb3cgICA9ICQoVXRpbC5nZXRHbG9iYWwoKSlcbiAgICB3aWRnZXQgICA9IEBlbGVtZW50LmNoaWxkcmVuKFwiOmZpcnN0XCIpXG4gICAgb2Zmc2V0ICAgPSB3aWRnZXQub2Zmc2V0KClcbiAgICB2aWV3cG9ydCA9IHtcbiAgICAgIHRvcDogICB3aW5kb3cuc2Nyb2xsVG9wKCksXG4gICAgICByaWdodDogd2luZG93LndpZHRoKCkgKyB3aW5kb3cuc2Nyb2xsTGVmdCgpXG4gICAgfVxuICAgIGN1cnJlbnQgPSB7XG4gICAgICB0b3A6ICAgb2Zmc2V0LnRvcFxuICAgICAgcmlnaHQ6IG9mZnNldC5sZWZ0ICsgd2lkZ2V0LndpZHRoKClcbiAgICB9XG5cbiAgICBpZiAoY3VycmVudC50b3AgLSB2aWV3cG9ydC50b3ApIDwgMFxuICAgICAgdGhpcy5pbnZlcnRZKClcblxuICAgIGlmIChjdXJyZW50LnJpZ2h0IC0gdmlld3BvcnQucmlnaHQpID4gMFxuICAgICAgdGhpcy5pbnZlcnRYKClcblxuICAgIHRoaXNcblxuICAjIFB1YmxpYzogUmVzZXRzIG9yaWVudGF0aW9uIG9mIHdpZGdldCBvbiB0aGUgWCAmIFkgYXhpcy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHdpZGdldC5yZXNldE9yaWVudGF0aW9uKCkgIyBXaWRnZXQgaXMgb3JpZ2luYWwgd2F5IHVwLlxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgZm9yIGNoYWluaW5nLlxuICByZXNldE9yaWVudGF0aW9uOiAtPlxuICAgIEBlbGVtZW50LnJlbW92ZUNsYXNzKEBjbGFzc2VzLmludmVydC54KS5yZW1vdmVDbGFzcyhAY2xhc3Nlcy5pbnZlcnQueSlcbiAgICB0aGlzXG5cbiAgIyBQdWJsaWM6IEludmVydHMgdGhlIHdpZGdldCBvbiB0aGUgWCBheGlzLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgd2lkZ2V0LmludmVydFgoKSAjIFdpZGdldCBpcyBub3cgcmlnaHQgYWxpZ25lZC5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIGZvciBjaGFpbmluZy5cbiAgaW52ZXJ0WDogLT5cbiAgICBAZWxlbWVudC5hZGRDbGFzcyBAY2xhc3Nlcy5pbnZlcnQueFxuICAgIHRoaXNcblxuICAjIFB1YmxpYzogSW52ZXJ0cyB0aGUgd2lkZ2V0IG9uIHRoZSBZIGF4aXMuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICB3aWRnZXQuaW52ZXJ0WSgpICMgV2lkZ2V0IGlzIG5vdyB1cHNpZGUgZG93bi5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIGZvciBjaGFpbmluZy5cbiAgaW52ZXJ0WTogLT5cbiAgICBAZWxlbWVudC5hZGRDbGFzcyBAY2xhc3Nlcy5pbnZlcnQueVxuICAgIHRoaXNcblxuICAjIFB1YmxpYzogRmluZCBvdXQgd2hldGhlciBvciBub3QgdGhlIHdpZGdldCBpcyBjdXJyZW50bHkgdXBzaWRlIGRvd25cbiAgI1xuICAjIFJldHVybnMgYSBib29sZWFuOiB0cnVlIGlmIHRoZSB3aWRnZXQgaXMgdXBzaWRlIGRvd25cbiAgaXNJbnZlcnRlZFk6IC0+XG4gICAgQGVsZW1lbnQuaGFzQ2xhc3MgQGNsYXNzZXMuaW52ZXJ0LnlcblxuICAjIFB1YmxpYzogRmluZCBvdXQgd2hldGhlciBvciBub3QgdGhlIHdpZGdldCBpcyBjdXJyZW50bHkgcmlnaHQgYWxpZ25lZFxuICAjXG4gICMgUmV0dXJucyBhIGJvb2xlYW46IHRydWUgaWYgdGhlIHdpZGdldCBpcyByaWdodCBhbGlnbmVkXG4gIGlzSW52ZXJ0ZWRYOiAtPlxuICAgIEBlbGVtZW50Lmhhc0NsYXNzIEBjbGFzc2VzLmludmVydC54XG5cblxuIyBFeHBvcnQgdGhlIFdpZGdldCBvYmplY3Rcbm1vZHVsZS5leHBvcnRzID0gV2lkZ2V0XG4iLCIjIEEgc2ltcGxlIFhQYXRoIGV2YWx1YXRvciB1c2luZyBqUXVlcnkgd2hpY2ggY2FuIGV2YWx1YXRlIHF1ZXJpZXMgb2ZcbnNpbXBsZVhQYXRoSlF1ZXJ5ID0gKHJlbGF0aXZlUm9vdCkgLT5cbiAganEgPSB0aGlzLm1hcCAtPlxuICAgIHBhdGggPSAnJ1xuICAgIGVsZW0gPSB0aGlzXG5cbiAgICB3aGlsZSBlbGVtPy5ub2RlVHlwZSA9PSBOb2RlLkVMRU1FTlRfTk9ERSBhbmQgZWxlbSBpc250IHJlbGF0aXZlUm9vdFxuICAgICAgdGFnTmFtZSA9IGVsZW0udGFnTmFtZS5yZXBsYWNlKFwiOlwiLCBcIlxcXFw6XCIpXG4gICAgICBpZHggPSAkKGVsZW0ucGFyZW50Tm9kZSkuY2hpbGRyZW4odGFnTmFtZSkuaW5kZXgoZWxlbSkgKyAxXG5cbiAgICAgIGlkeCAgPSBcIlsje2lkeH1dXCJcbiAgICAgIHBhdGggPSBcIi9cIiArIGVsZW0udGFnTmFtZS50b0xvd2VyQ2FzZSgpICsgaWR4ICsgcGF0aFxuICAgICAgZWxlbSA9IGVsZW0ucGFyZW50Tm9kZVxuXG4gICAgcGF0aFxuXG4gIGpxLmdldCgpXG5cbiMgQSBzaW1wbGUgWFBhdGggZXZhbHVhdG9yIHVzaW5nIG9ubHkgc3RhbmRhcmQgRE9NIG1ldGhvZHMgd2hpY2ggY2FuXG4jIGV2YWx1YXRlIHF1ZXJpZXMgb2YgdGhlIGZvcm0gL3RhZ1tpbmRleF0vdGFnW2luZGV4XS5cbnNpbXBsZVhQYXRoUHVyZSA9IChyZWxhdGl2ZVJvb3QpIC0+XG5cbiAgZ2V0UGF0aFNlZ21lbnQgPSAobm9kZSkgLT5cbiAgICBuYW1lID0gZ2V0Tm9kZU5hbWUgbm9kZVxuICAgIHBvcyA9IGdldE5vZGVQb3NpdGlvbiBub2RlXG4gICAgXCIje25hbWV9WyN7cG9zfV1cIlxuXG4gIHJvb3ROb2RlID0gcmVsYXRpdmVSb290XG5cbiAgZ2V0UGF0aFRvID0gKG5vZGUpIC0+XG4gICAgeHBhdGggPSAnJztcbiAgICB3aGlsZSBub2RlICE9IHJvb3ROb2RlXG4gICAgICB1bmxlc3Mgbm9kZT9cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yIFwiQ2FsbGVkIGdldFBhdGhUbyBvbiBhIG5vZGUgd2hpY2ggd2FzIG5vdCBhIGRlc2NlbmRhbnQgb2YgQHJvb3ROb2RlLiBcIiArIHJvb3ROb2RlXG4gICAgICB4cGF0aCA9IChnZXRQYXRoU2VnbWVudCBub2RlKSArICcvJyArIHhwYXRoXG4gICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlXG4gICAgeHBhdGggPSAnLycgKyB4cGF0aFxuICAgIHhwYXRoID0geHBhdGgucmVwbGFjZSAvXFwvJC8sICcnXG4gICAgeHBhdGhcblxuICBqcSA9IHRoaXMubWFwIC0+XG4gICAgcGF0aCA9IGdldFBhdGhUbyB0aGlzXG5cbiAgICBwYXRoXG5cbiAganEuZ2V0KClcblxuZmluZENoaWxkID0gKG5vZGUsIHR5cGUsIGluZGV4KSAtPlxuICB1bmxlc3Mgbm9kZS5oYXNDaGlsZE5vZGVzKClcbiAgICB0aHJvdyBuZXcgRXJyb3IgXCJYUGF0aCBlcnJvcjogbm9kZSBoYXMgbm8gY2hpbGRyZW4hXCJcbiAgY2hpbGRyZW4gPSBub2RlLmNoaWxkTm9kZXNcbiAgZm91bmQgPSAwXG4gIGZvciBjaGlsZCBpbiBjaGlsZHJlblxuICAgIG5hbWUgPSBnZXROb2RlTmFtZSBjaGlsZFxuICAgIGlmIG5hbWUgaXMgdHlwZVxuICAgICAgZm91bmQgKz0gMVxuICAgICAgaWYgZm91bmQgaXMgaW5kZXhcbiAgICAgICAgcmV0dXJuIGNoaWxkXG4gIHRocm93IG5ldyBFcnJvciBcIlhQYXRoIGVycm9yOiB3YW50ZWQgY2hpbGQgbm90IGZvdW5kLlwiXG5cbiMgR2V0IHRoZSBub2RlIG5hbWUgZm9yIHVzZSBpbiBnZW5lcmF0aW5nIGFuIHhwYXRoIGV4cHJlc3Npb24uXG5nZXROb2RlTmFtZSA9IChub2RlKSAtPlxuICAgIG5vZGVOYW1lID0gbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgc3dpdGNoIG5vZGVOYW1lXG4gICAgICB3aGVuIFwiI3RleHRcIiB0aGVuIHJldHVybiBcInRleHQoKVwiXG4gICAgICB3aGVuIFwiI2NvbW1lbnRcIiB0aGVuIHJldHVybiBcImNvbW1lbnQoKVwiXG4gICAgICB3aGVuIFwiI2NkYXRhLXNlY3Rpb25cIiB0aGVuIHJldHVybiBcImNkYXRhLXNlY3Rpb24oKVwiXG4gICAgICBlbHNlIHJldHVybiBub2RlTmFtZVxuXG4jIEdldCB0aGUgaW5kZXggb2YgdGhlIG5vZGUgYXMgaXQgYXBwZWFycyBpbiBpdHMgcGFyZW50J3MgY2hpbGQgbGlzdFxuZ2V0Tm9kZVBvc2l0aW9uID0gKG5vZGUpIC0+XG4gIHBvcyA9IDBcbiAgdG1wID0gbm9kZVxuICB3aGlsZSB0bXBcbiAgICBpZiB0bXAubm9kZU5hbWUgaXMgbm9kZS5ub2RlTmFtZVxuICAgICAgcG9zKytcbiAgICB0bXAgPSB0bXAucHJldmlvdXNTaWJsaW5nXG4gIHBvc1xuXG5cbm1vZHVsZS5leHBvcnRzID1cbiAgc2ltcGxlWFBhdGhKUXVlcnk6IHNpbXBsZVhQYXRoSlF1ZXJ5XG4gIHNpbXBsZVhQYXRoUHVyZTogc2ltcGxlWFBhdGhQdXJlXG4gIGZpbmRDaGlsZDogZmluZENoaWxkXG4iXX0=