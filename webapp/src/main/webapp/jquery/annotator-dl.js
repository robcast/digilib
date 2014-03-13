/*
** Annotator v2.0.0-dev-5b27640
** https://github.com/okfn/annotator/
**
** Copyright 2014, the Annotator project contributors.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/okfn/annotator/blob/master/LICENSE
**
** Built at: 2014-03-13 15:20:20Z
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
    if (this.options.token) {
      this.setToken(this.options.token);
    } else {
      this.requestToken();
    }
  }

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
    var current;
    current = this.element.data('annotator:headers');
    return this.element.data('annotator:headers', $.extend(current, {
      'x-annotator-auth-token': this.token
    }));
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
      error: this._onError
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnL2Fubm90YXRvci1kaWdpbGliLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2JhY2tib25lLWV4dGVuZC1zdGFuZGFsb25lL2JhY2tib25lLWV4dGVuZC1zdGFuZGFsb25lLmpzIiwiYW5ub3RhdGlvbnMuY29mZmVlIiwiYW5ub3RhdG9yLmNvZmZlZSIsImNsYXNzLmNvZmZlZSIsImVkaXRvci5jb2ZmZWUiLCJub3RpZmljYXRpb24uY29mZmVlIiwicGx1Z2luL2F1dGhsb2dpbi5jb2ZmZWUiLCJwbHVnaW4vZmlsdGVyLmNvZmZlZSIsInBsdWdpbi9tYXJrZG93bi5jb2ZmZWUiLCJwbHVnaW4vcGVybWlzc2lvbnMuY29mZmVlIiwicGx1Z2luL3N0b3JlLmNvZmZlZSIsInBsdWdpbi90YWdzLmNvZmZlZSIsInBsdWdpbi91bnN1cHBvcnRlZC5jb2ZmZWUiLCJyYW5nZS5jb2ZmZWUiLCJyZWdpc3RyeS5jb2ZmZWUiLCJzdG9yYWdlLmNvZmZlZSIsInV0aWwuY29mZmVlIiwidmlld2VyLmNvZmZlZSIsIndpZGdldC5jb2ZmZWUiLCJ4cGF0aC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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S0FBWixDQUFQO0FBQ0EsUUFBRyxTQUFRLElBQVg7QUFDRSxlQUFTLENBQVQ7QUFDQSxVQUFHLFVBQVMsS0FBWjtBQUNFLGVBQU8sS0FBUCxDQURGO09BRkY7S0FGRjtBQUFBLEdBSkE7QUFVQSxRQUFVLFVBQU0sc0NBQU4sQ0FBVixDQVhVO0FBQUEsQ0E5Q1o7O0FBQUEsV0E0REEsR0FBYyxTQUFDLElBQUQ7QUFDVjtBQUFBLGFBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFkLEVBQVg7QUFDQSxVQUFPLFFBQVA7QUFBQSxTQUNPLE9BRFA7QUFDb0IsYUFBTyxRQUFQLENBRHBCO0FBQUEsU0FFTyxVQUZQO0FBRXVCLGFBQU8sV0FBUCxDQUZ2QjtBQUFBLFNBR08sZ0JBSFA7QUFHNkIsYUFBTyxpQkFBUCxDQUg3QjtBQUFBO0FBSU8sYUFBTyxRQUFQLENBSlA7QUFBQSxHQUZVO0FBQUEsQ0E1RGQ7O0FBQUEsZUFxRUEsR0FBa0IsU0FBQyxJQUFEO0FBQ2hCO0FBQUEsUUFBTSxDQUFOO0FBQUEsRUFDQSxNQUFNLElBRE47QUFFQSxTQUFNLEdBQU47QUFDRSxRQUFHLEdBQUcsQ0FBQyxRQUFKLEtBQWdCLElBQUksQ0FBQyxRQUF4QjtBQUNFLFlBREY7S0FBQTtBQUFBLElBRUEsTUFBTSxHQUFHLENBQUMsZUFGVixDQURGO0VBQUEsQ0FGQTtTQU1BLElBUGdCO0FBQUEsQ0FyRWxCOztBQUFBLE1BK0VNLENBQUMsT0FBUCxHQUNFO0FBQUEscUJBQW1CLGlCQUFuQjtBQUFBLEVBQ0EsaUJBQWlCLGVBRGpCO0FBQUEsRUFFQSxXQUFXLFNBRlg7Q0FoRkYiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogU3RhbmRhbG9uZSBleHRyYWN0aW9uIG9mIEJhY2tib25lLkV2ZW50cywgbm8gZXh0ZXJuYWwgZGVwZW5kZW5jeSByZXF1aXJlZC5cbiAqIERlZ3JhZGVzIG5pY2VseSB3aGVuIEJhY2tvbmUvdW5kZXJzY29yZSBhcmUgYWxyZWFkeSBhdmFpbGFibGUgaW4gdGhlIGN1cnJlbnRcbiAqIGdsb2JhbCBjb250ZXh0LlxuICpcbiAqIE5vdGUgdGhhdCBkb2NzIHN1Z2dlc3QgdG8gdXNlIHVuZGVyc2NvcmUncyBgXy5leHRlbmQoKWAgbWV0aG9kIHRvIGFkZCBFdmVudHNcbiAqIHN1cHBvcnQgdG8gc29tZSBnaXZlbiBvYmplY3QuIEEgYG1peGluKClgIG1ldGhvZCBoYXMgYmVlbiBhZGRlZCB0byB0aGUgRXZlbnRzXG4gKiBwcm90b3R5cGUgdG8gYXZvaWQgdXNpbmcgdW5kZXJzY29yZSBmb3IgdGhhdCBzb2xlIHB1cnBvc2U6XG4gKlxuICogICAgIHZhciBteUV2ZW50RW1pdHRlciA9IEJhY2tib25lRXZlbnRzLm1peGluKHt9KTtcbiAqXG4gKiBPciBmb3IgYSBmdW5jdGlvbiBjb25zdHJ1Y3RvcjpcbiAqXG4gKiAgICAgZnVuY3Rpb24gTXlDb25zdHJ1Y3Rvcigpe31cbiAqICAgICBNeUNvbnN0cnVjdG9yLnByb3RvdHlwZS5mb28gPSBmdW5jdGlvbigpe31cbiAqICAgICBCYWNrYm9uZUV2ZW50cy5taXhpbihNeUNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG4gKlxuICogKGMpIDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgSW5jLlxuICogKGMpIDIwMTMgTmljb2xhcyBQZXJyaWF1bHRcbiAqL1xuLyogZ2xvYmFsIGV4cG9ydHM6dHJ1ZSwgZGVmaW5lLCBtb2R1bGUgKi9cbihmdW5jdGlvbigpIHtcbiAgdmFyIHJvb3QgPSB0aGlzLFxuICAgICAgYnJlYWtlciA9IHt9LFxuICAgICAgbmF0aXZlRm9yRWFjaCA9IEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLFxuICAgICAgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICAgICAgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UsXG4gICAgICBpZENvdW50ZXIgPSAwO1xuXG4gIC8vIFJldHVybnMgYSBwYXJ0aWFsIGltcGxlbWVudGF0aW9uIG1hdGNoaW5nIHRoZSBtaW5pbWFsIEFQSSBzdWJzZXQgcmVxdWlyZWRcbiAgLy8gYnkgQmFja2JvbmUuRXZlbnRzXG4gIGZ1bmN0aW9uIG1pbmlzY29yZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAga2V5czogT2JqZWN0LmtleXMsXG5cbiAgICAgIHVuaXF1ZUlkOiBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICAgICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICAgICAgcmV0dXJuIHByZWZpeCA/IHByZWZpeCArIGlkIDogaWQ7XG4gICAgICB9LFxuXG4gICAgICBoYXM6IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgICAgIH0sXG5cbiAgICAgIGVhY2g6IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICAgICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm47XG4gICAgICAgIGlmIChuYXRpdmVGb3JFYWNoICYmIG9iai5mb3JFYWNoID09PSBuYXRpdmVGb3JFYWNoKSB7XG4gICAgICAgICAgb2JqLmZvckVhY2goaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgICAgaWYgKHRoaXMuaGFzKG9iaiwga2V5KSkge1xuICAgICAgICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpba2V5XSwga2V5LCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBvbmNlOiBmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgIHZhciByYW4gPSBmYWxzZSwgbWVtbztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChyYW4pIHJldHVybiBtZW1vO1xuICAgICAgICAgIHJhbiA9IHRydWU7XG4gICAgICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICBmdW5jID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgdmFyIF8gPSBtaW5pc2NvcmUoKSwgRXZlbnRzO1xuXG4gIC8vIEJhY2tib25lLkV2ZW50c1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBBIG1vZHVsZSB0aGF0IGNhbiBiZSBtaXhlZCBpbiB0byAqYW55IG9iamVjdCogaW4gb3JkZXIgdG8gcHJvdmlkZSBpdCB3aXRoXG4gIC8vIGN1c3RvbSBldmVudHMuIFlvdSBtYXkgYmluZCB3aXRoIGBvbmAgb3IgcmVtb3ZlIHdpdGggYG9mZmAgY2FsbGJhY2tcbiAgLy8gZnVuY3Rpb25zIHRvIGFuIGV2ZW50OyBgdHJpZ2dlcmAtaW5nIGFuIGV2ZW50IGZpcmVzIGFsbCBjYWxsYmFja3MgaW5cbiAgLy8gc3VjY2Vzc2lvbi5cbiAgLy9cbiAgLy8gICAgIHZhciBvYmplY3QgPSB7fTtcbiAgLy8gICAgIF8uZXh0ZW5kKG9iamVjdCwgQmFja2JvbmUuRXZlbnRzKTtcbiAgLy8gICAgIG9iamVjdC5vbignZXhwYW5kJywgZnVuY3Rpb24oKXsgYWxlcnQoJ2V4cGFuZGVkJyk7IH0pO1xuICAvLyAgICAgb2JqZWN0LnRyaWdnZXIoJ2V4cGFuZCcpO1xuICAvL1xuICBFdmVudHMgPSB7XG5cbiAgICAvLyBCaW5kIGFuIGV2ZW50IHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi4gUGFzc2luZyBgXCJhbGxcImAgd2lsbCBiaW5kXG4gICAgLy8gdGhlIGNhbGxiYWNrIHRvIGFsbCBldmVudHMgZmlyZWQuXG4gICAgb246IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb24nLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgICAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdIHx8ICh0aGlzLl9ldmVudHNbbmFtZV0gPSBbXSk7XG4gICAgICBldmVudHMucHVzaCh7Y2FsbGJhY2s6IGNhbGxiYWNrLCBjb250ZXh0OiBjb250ZXh0LCBjdHg6IGNvbnRleHQgfHwgdGhpc30pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIEJpbmQgYW4gZXZlbnQgdG8gb25seSBiZSB0cmlnZ2VyZWQgYSBzaW5nbGUgdGltZS4gQWZ0ZXIgdGhlIGZpcnN0IHRpbWVcbiAgICAvLyB0aGUgY2FsbGJhY2sgaXMgaW52b2tlZCwgaXQgd2lsbCBiZSByZW1vdmVkLlxuICAgIG9uY2U6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb25jZScsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgb25jZSA9IF8ub25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5vZmYobmFtZSwgb25jZSk7XG4gICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9KTtcbiAgICAgIG9uY2UuX2NhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICByZXR1cm4gdGhpcy5vbihuYW1lLCBvbmNlLCBjb250ZXh0KTtcbiAgICB9LFxuXG4gICAgLy8gUmVtb3ZlIG9uZSBvciBtYW55IGNhbGxiYWNrcy4gSWYgYGNvbnRleHRgIGlzIG51bGwsIHJlbW92ZXMgYWxsXG4gICAgLy8gY2FsbGJhY2tzIHdpdGggdGhhdCBmdW5jdGlvbi4gSWYgYGNhbGxiYWNrYCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAgIC8vIGNhbGxiYWNrcyBmb3IgdGhlIGV2ZW50LiBJZiBgbmFtZWAgaXMgbnVsbCwgcmVtb3ZlcyBhbGwgYm91bmRcbiAgICAvLyBjYWxsYmFja3MgZm9yIGFsbCBldmVudHMuXG4gICAgb2ZmOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgdmFyIHJldGFpbiwgZXYsIGV2ZW50cywgbmFtZXMsIGksIGwsIGosIGs7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhZXZlbnRzQXBpKHRoaXMsICdvZmYnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSkgcmV0dXJuIHRoaXM7XG4gICAgICBpZiAoIW5hbWUgJiYgIWNhbGxiYWNrICYmICFjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgbmFtZXMgPSBuYW1lID8gW25hbWVdIDogXy5rZXlzKHRoaXMuX2V2ZW50cyk7XG4gICAgICBmb3IgKGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgICAgaWYgKGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSkge1xuICAgICAgICAgIHRoaXMuX2V2ZW50c1tuYW1lXSA9IHJldGFpbiA9IFtdO1xuICAgICAgICAgIGlmIChjYWxsYmFjayB8fCBjb250ZXh0KSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwLCBrID0gZXZlbnRzLmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICAgICAgICBldiA9IGV2ZW50c1tqXTtcbiAgICAgICAgICAgICAgaWYgKChjYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrLl9jYWxsYmFjaykgfHxcbiAgICAgICAgICAgICAgICAgIChjb250ZXh0ICYmIGNvbnRleHQgIT09IGV2LmNvbnRleHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0YWluLnB1c2goZXYpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghcmV0YWluLmxlbmd0aCkgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gVHJpZ2dlciBvbmUgb3IgbWFueSBldmVudHMsIGZpcmluZyBhbGwgYm91bmQgY2FsbGJhY2tzLiBDYWxsYmFja3MgYXJlXG4gICAgLy8gcGFzc2VkIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyBgdHJpZ2dlcmAgaXMsIGFwYXJ0IGZyb20gdGhlIGV2ZW50IG5hbWVcbiAgICAvLyAodW5sZXNzIHlvdSdyZSBsaXN0ZW5pbmcgb24gYFwiYWxsXCJgLCB3aGljaCB3aWxsIGNhdXNlIHlvdXIgY2FsbGJhY2sgdG9cbiAgICAvLyByZWNlaXZlIHRoZSB0cnVlIG5hbWUgb2YgdGhlIGV2ZW50IGFzIHRoZSBmaXJzdCBhcmd1bWVudCkuXG4gICAgdHJpZ2dlcjogZnVuY3Rpb24obmFtZSkge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAndHJpZ2dlcicsIG5hbWUsIGFyZ3MpKSByZXR1cm4gdGhpcztcbiAgICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgICB2YXIgYWxsRXZlbnRzID0gdGhpcy5fZXZlbnRzLmFsbDtcbiAgICAgIGlmIChldmVudHMpIHRyaWdnZXJFdmVudHMoZXZlbnRzLCBhcmdzKTtcbiAgICAgIGlmIChhbGxFdmVudHMpIHRyaWdnZXJFdmVudHMoYWxsRXZlbnRzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIFRlbGwgdGhpcyBvYmplY3QgdG8gc3RvcCBsaXN0ZW5pbmcgdG8gZWl0aGVyIHNwZWNpZmljIGV2ZW50cyAuLi4gb3JcbiAgICAvLyB0byBldmVyeSBvYmplY3QgaXQncyBjdXJyZW50bHkgbGlzdGVuaW5nIHRvLlxuICAgIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoIWxpc3RlbmVycykgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgZGVsZXRlTGlzdGVuZXIgPSAhbmFtZSAmJiAhY2FsbGJhY2s7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgICBpZiAob2JqKSAobGlzdGVuZXJzID0ge30pW29iai5fbGlzdGVuZXJJZF0gPSBvYmo7XG4gICAgICBmb3IgKHZhciBpZCBpbiBsaXN0ZW5lcnMpIHtcbiAgICAgICAgbGlzdGVuZXJzW2lkXS5vZmYobmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuICAgICAgICBpZiAoZGVsZXRlTGlzdGVuZXIpIGRlbGV0ZSB0aGlzLl9saXN0ZW5lcnNbaWRdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gIH07XG5cbiAgLy8gUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gc3BsaXQgZXZlbnQgc3RyaW5ncy5cbiAgdmFyIGV2ZW50U3BsaXR0ZXIgPSAvXFxzKy87XG5cbiAgLy8gSW1wbGVtZW50IGZhbmN5IGZlYXR1cmVzIG9mIHRoZSBFdmVudHMgQVBJIHN1Y2ggYXMgbXVsdGlwbGUgZXZlbnRcbiAgLy8gbmFtZXMgYFwiY2hhbmdlIGJsdXJcImAgYW5kIGpRdWVyeS1zdHlsZSBldmVudCBtYXBzIGB7Y2hhbmdlOiBhY3Rpb259YFxuICAvLyBpbiB0ZXJtcyBvZiB0aGUgZXhpc3RpbmcgQVBJLlxuICB2YXIgZXZlbnRzQXBpID0gZnVuY3Rpb24ob2JqLCBhY3Rpb24sIG5hbWUsIHJlc3QpIHtcbiAgICBpZiAoIW5hbWUpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gSGFuZGxlIGV2ZW50IG1hcHMuXG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcbiAgICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBba2V5LCBuYW1lW2tleV1dLmNvbmNhdChyZXN0KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHNwYWNlIHNlcGFyYXRlZCBldmVudCBuYW1lcy5cbiAgICBpZiAoZXZlbnRTcGxpdHRlci50ZXN0KG5hbWUpKSB7XG4gICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KGV2ZW50U3BsaXR0ZXIpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBbbmFtZXNbaV1dLmNvbmNhdChyZXN0KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gQSBkaWZmaWN1bHQtdG8tYmVsaWV2ZSwgYnV0IG9wdGltaXplZCBpbnRlcm5hbCBkaXNwYXRjaCBmdW5jdGlvbiBmb3JcbiAgLy8gdHJpZ2dlcmluZyBldmVudHMuIFRyaWVzIHRvIGtlZXAgdGhlIHVzdWFsIGNhc2VzIHNwZWVkeSAobW9zdCBpbnRlcm5hbFxuICAvLyBCYWNrYm9uZSBldmVudHMgaGF2ZSAzIGFyZ3VtZW50cykuXG4gIHZhciB0cmlnZ2VyRXZlbnRzID0gZnVuY3Rpb24oZXZlbnRzLCBhcmdzKSB7XG4gICAgdmFyIGV2LCBpID0gLTEsIGwgPSBldmVudHMubGVuZ3RoLCBhMSA9IGFyZ3NbMF0sIGEyID0gYXJnc1sxXSwgYTMgPSBhcmdzWzJdO1xuICAgIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICAgIGNhc2UgMDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgpOyByZXR1cm47XG4gICAgICBjYXNlIDE6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSk7IHJldHVybjtcbiAgICAgIGNhc2UgMjogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMik7IHJldHVybjtcbiAgICAgIGNhc2UgMzogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMiwgYTMpOyByZXR1cm47XG4gICAgICBkZWZhdWx0OiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5hcHBseShldi5jdHgsIGFyZ3MpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgbGlzdGVuTWV0aG9kcyA9IHtsaXN0ZW5UbzogJ29uJywgbGlzdGVuVG9PbmNlOiAnb25jZSd9O1xuXG4gIC8vIEludmVyc2lvbi1vZi1jb250cm9sIHZlcnNpb25zIG9mIGBvbmAgYW5kIGBvbmNlYC4gVGVsbCAqdGhpcyogb2JqZWN0IHRvXG4gIC8vIGxpc3RlbiB0byBhbiBldmVudCBpbiBhbm90aGVyIG9iamVjdCAuLi4ga2VlcGluZyB0cmFjayBvZiB3aGF0IGl0J3NcbiAgLy8gbGlzdGVuaW5nIHRvLlxuICBfLmVhY2gobGlzdGVuTWV0aG9kcywgZnVuY3Rpb24oaW1wbGVtZW50YXRpb24sIG1ldGhvZCkge1xuICAgIEV2ZW50c1ttZXRob2RdID0gZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xuICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCAodGhpcy5fbGlzdGVuZXJzID0ge30pO1xuICAgICAgdmFyIGlkID0gb2JqLl9saXN0ZW5lcklkIHx8IChvYmouX2xpc3RlbmVySWQgPSBfLnVuaXF1ZUlkKCdsJykpO1xuICAgICAgbGlzdGVuZXJzW2lkXSA9IG9iajtcbiAgICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcbiAgICAgIG9ialtpbXBsZW1lbnRhdGlvbl0obmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWxpYXNlcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gIEV2ZW50cy5iaW5kICAgPSBFdmVudHMub247XG4gIEV2ZW50cy51bmJpbmQgPSBFdmVudHMub2ZmO1xuXG4gIC8vIE1peGluIHV0aWxpdHlcbiAgRXZlbnRzLm1peGluID0gZnVuY3Rpb24ocHJvdG8pIHtcbiAgICB2YXIgZXhwb3J0cyA9IFsnb24nLCAnb25jZScsICdvZmYnLCAndHJpZ2dlcicsICdzdG9wTGlzdGVuaW5nJywgJ2xpc3RlblRvJyxcbiAgICAgICAgICAgICAgICAgICAnbGlzdGVuVG9PbmNlJywgJ2JpbmQnLCAndW5iaW5kJ107XG4gICAgXy5lYWNoKGV4cG9ydHMsIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHByb3RvW25hbWVdID0gdGhpc1tuYW1lXTtcbiAgICB9LCB0aGlzKTtcbiAgICByZXR1cm4gcHJvdG87XG4gIH07XG5cbiAgLy8gRXhwb3J0IEV2ZW50cyBhcyBCYWNrYm9uZUV2ZW50cyBkZXBlbmRpbmcgb24gY3VycmVudCBjb250ZXh0XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRXZlbnRzO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gRXZlbnRzO1xuICAgIH1cbiAgICBleHBvcnRzLkJhY2tib25lRXZlbnRzID0gRXZlbnRzO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuQmFja2JvbmVFdmVudHMgPSBFdmVudHM7XG4gIH1cbn0pKHRoaXMpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lJyk7XG4iLCIoZnVuY3Rpb24gKGRlZmluaXRpb24pIHtcbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XG4gIH1cbiAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKGRlZmluaXRpb24pO1xuICB9XG4gIGVsc2Uge1xuICAgIHdpbmRvdy5CYWNrYm9uZUV4dGVuZCA9IGRlZmluaXRpb24oKTtcbiAgfVxufSkoZnVuY3Rpb24gKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgXG4gIC8vIG1pbmktdW5kZXJzY29yZVxuICB2YXIgXyA9IHtcbiAgICBoYXM6IGZ1bmN0aW9uIChvYmosIGtleSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG4gICAgfSxcbiAgXG4gICAgZXh0ZW5kOiBmdW5jdGlvbihvYmopIHtcbiAgICAgIGZvciAodmFyIGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH1cbiAgfTtcblxuICAvLy8gRm9sbG93aW5nIGNvZGUgaXMgcGFzdGVkIGZyb20gQmFja2JvbmUuanMgLy8vXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvcnJlY3RseSBzZXQgdXAgdGhlIHByb3RvdHlwZSBjaGFpbiwgZm9yIHN1YmNsYXNzZXMuXG4gIC8vIFNpbWlsYXIgdG8gYGdvb2cuaW5oZXJpdHNgLCBidXQgdXNlcyBhIGhhc2ggb2YgcHJvdG90eXBlIHByb3BlcnRpZXMgYW5kXG4gIC8vIGNsYXNzIHByb3BlcnRpZXMgdG8gYmUgZXh0ZW5kZWQuXG4gIHZhciBleHRlbmQgPSBmdW5jdGlvbihwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIHZhciBjaGlsZDtcblxuICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgdGhlIG5ldyBzdWJjbGFzcyBpcyBlaXRoZXIgZGVmaW5lZCBieSB5b3VcbiAgICAvLyAodGhlIFwiY29uc3RydWN0b3JcIiBwcm9wZXJ0eSBpbiB5b3VyIGBleHRlbmRgIGRlZmluaXRpb24pLCBvciBkZWZhdWx0ZWRcbiAgICAvLyBieSB1cyB0byBzaW1wbHkgY2FsbCB0aGUgcGFyZW50J3MgY29uc3RydWN0b3IuXG4gICAgaWYgKHByb3RvUHJvcHMgJiYgXy5oYXMocHJvdG9Qcm9wcywgJ2NvbnN0cnVjdG9yJykpIHtcbiAgICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGQgPSBmdW5jdGlvbigpeyByZXR1cm4gcGFyZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH07XG4gICAgfVxuXG4gICAgLy8gQWRkIHN0YXRpYyBwcm9wZXJ0aWVzIHRvIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiwgaWYgc3VwcGxpZWQuXG4gICAgXy5leHRlbmQoY2hpbGQsIHBhcmVudCwgc3RhdGljUHJvcHMpO1xuXG4gICAgLy8gU2V0IHRoZSBwcm90b3R5cGUgY2hhaW4gdG8gaW5oZXJpdCBmcm9tIGBwYXJlbnRgLCB3aXRob3V0IGNhbGxpbmdcbiAgICAvLyBgcGFyZW50YCdzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgIHZhciBTdXJyb2dhdGUgPSBmdW5jdGlvbigpeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH07XG4gICAgU3Vycm9nYXRlLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgY2hpbGQucHJvdG90eXBlID0gbmV3IFN1cnJvZ2F0ZSgpO1xuXG4gICAgLy8gQWRkIHByb3RvdHlwZSBwcm9wZXJ0aWVzIChpbnN0YW5jZSBwcm9wZXJ0aWVzKSB0byB0aGUgc3ViY2xhc3MsXG4gICAgLy8gaWYgc3VwcGxpZWQuXG4gICAgaWYgKHByb3RvUHJvcHMpIF8uZXh0ZW5kKGNoaWxkLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7XG5cbiAgICAvLyBTZXQgYSBjb252ZW5pZW5jZSBwcm9wZXJ0eSBpbiBjYXNlIHRoZSBwYXJlbnQncyBwcm90b3R5cGUgaXMgbmVlZGVkXG4gICAgLy8gbGF0ZXIuXG4gICAgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTtcblxuICAgIHJldHVybiBjaGlsZDtcbiAgfTtcblxuICAvLyBFeHBvc2UgdGhlIGV4dGVuZCBmdW5jdGlvblxuICByZXR1cm4gZXh0ZW5kO1xufSk7XG4iLCJTdG9yYWdlUHJvdmlkZXIgPSByZXF1aXJlKCcuL3N0b3JhZ2UnKVxuXG5cbiMgUHVibGljOiBQcm92aWRlcyBDUlVEIG1ldGhvZHMgZm9yIGFubm90YXRpb25zIHdoaWNoIGNhbGwgY29ycmVzcG9uZGluZyByZWdpc3RyeSBob29rcy5cbmNsYXNzIEFubm90YXRpb25Qcm92aWRlclxuXG4gIEBjb25maWd1cmU6IChyZWdpc3RyeSkgLT5cbiAgICByZWdpc3RyeVsnYW5ub3RhdGlvbnMnXSA/PSBuZXcgdGhpcyhyZWdpc3RyeSlcbiAgICByZWdpc3RyeS5pbmNsdWRlKFN0b3JhZ2VQcm92aWRlcilcblxuICBjb25zdHJ1Y3RvcjogKEByZWdpc3RyeSkgLT5cblxuICAjIENyZWF0ZXMgYW5kIHJldHVybnMgYSBuZXcgYW5ub3RhdGlvbiBvYmplY3QuXG4gICNcbiAgIyBSdW5zIHRoZSAnYmVmb3JlQ3JlYXRlQW5ub3RhdGlvbicgaG9vayB0byBhbGxvdyB0aGUgbmV3IGFubm90YXRpb24gdG9cbiAgIyBiZSBpbml0aWFsaXplZCBvciBwcmV2ZW50ZWQuXG4gICNcbiAgIyBSdW5zIHRoZSAnY3JlYXRlQW5ub3RhdGlvbicgaG9vayB3aGVuIHRoZSBuZXcgYW5ub3RhdGlvbiBpcyBpbml0aWFsaXplZC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIC5jcmVhdGUoe30pXG4gICNcbiAgIyAgIHJlZ2lzdHJ5Lm9uICdiZWZvcmVBbm5vdGF0aW9uQ3JlYXRlZCcsIChhbm5vdGF0aW9uKSAtPlxuICAjICAgICBhbm5vdGF0aW9uLm15UHJvcGVydHkgPSAnVGhpcyBpcyBhIGN1c3RvbSBwcm9wZXJ0eSdcbiAgIyAgIHJlZ2lzdHJ5LmNyZWF0ZSh7fSkgIyBSZXNvbHZlcyB0byB7bXlQcm9wZXJ0eTogXCJUaGlzIGlzIGHigKZcIn1cbiAgI1xuICAjIFJldHVybnMgYSBQcm9taXNlIG9mIGFuIGFubm90YXRpb24gT2JqZWN0LlxuICBjcmVhdGU6IChvYmo9e30pIC0+XG4gICAgdGhpcy5fY3ljbGUob2JqLCAnY3JlYXRlJylcblxuICAjIFVwZGF0ZXMgYW4gYW5ub3RhdGlvbi5cbiAgI1xuICAjIFB1Ymxpc2hlcyB0aGUgJ2JlZm9yZUFubm90YXRpb25VcGRhdGVkJyBhbmQgJ2Fubm90YXRpb25VcGRhdGVkJyBldmVudHMuXG4gICMgTGlzdGVuZXJzIHdpc2hpbmcgdG8gbW9kaWZ5IGFuIHVwZGF0ZWQgYW5ub3RhdGlvbiBzaG91bGQgc3Vic2NyaWJlIHRvXG4gICMgJ2JlZm9yZUFubm90YXRpb25VcGRhdGVkJyB3aGlsZSBsaXN0ZW5lcnMgc3RvcmluZyBhbm5vdGF0aW9ucyBzaG91bGRcbiAgIyBzdWJzY3JpYmUgdG8gJ2Fubm90YXRpb25VcGRhdGVkJy5cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdCB0byB1cGRhdGUuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBhbm5vdGF0aW9uID0ge3RhZ3M6ICdhcHBsZXMgb3JhbmdlcyBwZWFycyd9XG4gICMgICByZWdpc3RyeS5vbiAnYmVmb3JlQW5ub3RhdGlvblVwZGF0ZWQnLCAoYW5ub3RhdGlvbikgLT5cbiAgIyAgICAgIyB2YWxpZGF0ZSBvciBtb2RpZnkgYSBwcm9wZXJ0eS5cbiAgIyAgICAgYW5ub3RhdGlvbi50YWdzID0gYW5ub3RhdGlvbi50YWdzLnNwbGl0KCcgJylcbiAgIyAgIHJlZ2lzdHJ5LnVwZGF0ZShhbm5vdGF0aW9uKVxuICAjICAgIyA9PiBSZXR1cm5zIFtcImFwcGxlc1wiLCBcIm9yYW5nZXNcIiwgXCJwZWFyc1wiXVxuICAjXG4gICMgUmV0dXJucyBhIFByb21pc2Ugb2YgYW4gYW5ub3RhdGlvbiBPYmplY3QuXG4gIHVwZGF0ZTogKG9iaikgLT5cbiAgICBpZiBub3Qgb2JqLmlkP1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFubm90YXRpb24gbXVzdCBoYXZlIGFuIGlkIGZvciB1cGRhdGUoKVwiKVxuICAgIHRoaXMuX2N5Y2xlKG9iaiwgJ3VwZGF0ZScpXG5cbiAgIyBQdWJsaWM6IERlbGV0ZXMgdGhlIGFubm90YXRpb24uXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBPYmplY3QgdG8gZGVsZXRlLlxuICAjXG4gICMgUmV0dXJucyBhIFByb21pc2Ugb2YgYW4gYW5ub3RhdGlvbiBPYmplY3QuXG4gIGRlbGV0ZTogKG9iaikgLT5cbiAgICBpZiBub3Qgb2JqLmlkP1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFubm90YXRpb24gbXVzdCBoYXZlIGFuIGlkIGZvciBkZWxldGUoKVwiKVxuICAgIHRoaXMuX2N5Y2xlKG9iaiwgJ2RlbGV0ZScpXG5cbiAgIyBQdWJsaWM6IFF1ZXJpZXMgdGhlIHN0b3JlXG4gICNcbiAgIyBxdWVyeSAtIEFuIE9iamVjdCBkZWZpbmluZyBhIHF1ZXJ5LiBUaGlzIG1heSBiZSBpbnRlcnByZXRlZCBkaWZmZXJlbnRseSBieVxuICAjICAgICAgICAgZGlmZmVyZW50IHN0b3Jlcy5cbiAgI1xuICAjIFJldHVybnMgYSBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgc3RvcmUgcmV0dXJuIHZhbHVlLlxuICBxdWVyeTogKHF1ZXJ5KSAtPlxuICAgIHJldHVybiBAcmVnaXN0cnlbJ3N0b3JlJ10ucXVlcnkocXVlcnkpXG5cbiAgIyBQdWJsaWM6IFF1ZXJpZXMgdGhlIHN0b3JlXG4gICNcbiAgIyBxdWVyeSAtIEFuIE9iamVjdCBkZWZpbmluZyBhIHF1ZXJ5LiBUaGlzIG1heSBiZSBpbnRlcnByZXRlZCBkaWZmZXJlbnRseSBieVxuICAjICAgICAgICAgZGlmZmVyZW50IHN0b3Jlcy5cbiAgI1xuICAjIFJldHVybnMgYSBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgYW5ub3RhdGlvbnMuXG4gIGxvYWQ6IChxdWVyeSkgLT5cbiAgICByZXR1cm4gdGhpcy5xdWVyeShxdWVyeSlcblxuICAjIFByaXZhdGU6IGN5Y2xlIGEgc3RvcmUgZXZlbnQsIGtlZXBpbmcgdHJhY2sgb2YgdGhlIGFubm90YXRpb24gb2JqZWN0IGFuZFxuICAjIHVwZGF0aW5nIGl0IGFzIG5lY2Vzc2FyeS5cbiAgX2N5Y2xlOiAob2JqLCBzdG9yZUZ1bmMpIC0+XG4gICAgc2FmZUNvcHkgPSAkLmV4dGVuZCh0cnVlLCB7fSwgb2JqKVxuICAgIGRlbGV0ZSBzYWZlQ29weS5fbG9jYWxcblxuICAgIEByZWdpc3RyeVsnc3RvcmUnXVtzdG9yZUZ1bmNdKHNhZmVDb3B5KVxuICAgICAgLnRoZW4gKHJldCkgPT5cbiAgICAgICAgIyBFbXB0eSBvYmplY3Qgd2l0aG91dCBjaGFuZ2luZyBpZGVudGl0eVxuICAgICAgICBmb3Igb3duIGssIHYgb2Ygb2JqXG4gICAgICAgICAgaWYgayAhPSAnX2xvY2FsJ1xuICAgICAgICAgICAgZGVsZXRlIG9ialtrXVxuXG4gICAgICAgICMgVXBkYXRlIHdpdGggc3RvcmUgcmV0dXJuIHZhbHVlXG4gICAgICAgICQuZXh0ZW5kKG9iaiwgcmV0KVxuXG4gICAgICAgIHJldHVybiBvYmogXG5cbm1vZHVsZS5leHBvcnRzID0gQW5ub3RhdGlvblByb3ZpZGVyXG4iLCJleHRlbmQgPSByZXF1aXJlICdiYWNrYm9uZS1leHRlbmQtc3RhbmRhbG9uZSdcblxuRGVsZWdhdG9yID0gcmVxdWlyZSAnLi9jbGFzcydcblJhbmdlID0gcmVxdWlyZSAnLi9yYW5nZSdcblV0aWwgPSByZXF1aXJlICcuL3V0aWwnXG5XaWRnZXQgPSByZXF1aXJlICcuL3dpZGdldCdcblZpZXdlciA9IHJlcXVpcmUgJy4vdmlld2VyJ1xuRWRpdG9yID0gcmVxdWlyZSAnLi9lZGl0b3InXG5Ob3RpZmljYXRpb24gPSByZXF1aXJlICcuL25vdGlmaWNhdGlvbidcblJlZ2lzdHJ5ID0gcmVxdWlyZSAnLi9yZWdpc3RyeSdcblxuQW5ub3RhdGlvblByb3ZpZGVyID0gcmVxdWlyZSAnLi9hbm5vdGF0aW9ucydcblxuX3QgPSBVdGlsLlRyYW5zbGF0aW9uU3RyaW5nXG5cblxuXG4jIFNlbGVjdGlvbiBhbmQgcmFuZ2UgY3JlYXRpb24gcmVmZXJlbmNlIGZvciB0aGUgZm9sbG93aW5nIGNvZGU6XG4jIGh0dHA6Ly93d3cucXVpcmtzbW9kZS5vcmcvZG9tL3JhbmdlX2ludHJvLmh0bWxcbiNcbiMgSSd2ZSByZW1vdmVkIGFueSBzdXBwb3J0IGZvciBJRSBUZXh0UmFuZ2UgKHNlZSBjb21taXQgZDcwODViZjIgZm9yIGNvZGUpXG4jIGZvciB0aGUgbW9tZW50LCBoYXZpbmcgbm8gbWVhbnMgb2YgdGVzdGluZyBpdC5cblxuIyBTdG9yZSBhIHJlZmVyZW5jZSB0byB0aGUgY3VycmVudCBBbm5vdGF0b3Igb2JqZWN0LlxuX0Fubm90YXRvciA9IHRoaXMuQW5ub3RhdG9yXG5cbmhhbmRsZUVycm9yID0gLT5cbiAgY29uc29sZS5lcnJvci5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpXG5cbmNsYXNzIEFubm90YXRvciBleHRlbmRzIERlbGVnYXRvclxuICAjIEV2ZW50cyB0byBiZSBib3VuZCBvbiBBbm5vdGF0b3IjZWxlbWVudC5cbiAgZXZlbnRzOlxuICAgIFwiLmFubm90YXRvci1hZGRlciBidXR0b24gY2xpY2tcIjogICAgIFwib25BZGRlckNsaWNrXCJcbiAgICBcIi5hbm5vdGF0b3ItYWRkZXIgYnV0dG9uIG1vdXNlZG93blwiOiBcIm9uQWRkZXJNb3VzZWRvd25cIlxuICAgIFwiLmFubm90YXRvci1obCBtb3VzZW92ZXJcIjogICAgICAgICAgIFwib25IaWdobGlnaHRNb3VzZW92ZXJcIlxuICAgIFwiLmFubm90YXRvci1obCBtb3VzZW91dFwiOiAgICAgICAgICAgIFwic3RhcnRWaWV3ZXJIaWRlVGltZXJcIlxuXG4gIGh0bWw6XG4gICAgYWRkZXI6ICAgJzxkaXYgY2xhc3M9XCJhbm5vdGF0b3ItYWRkZXJcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIj4nICsgX3QoJ0Fubm90YXRlJykgKyAnPC9idXR0b24+PC9kaXY+J1xuICAgIHdyYXBwZXI6ICc8ZGl2IGNsYXNzPVwiYW5ub3RhdG9yLXdyYXBwZXJcIj48L2Rpdj4nXG5cbiAgb3B0aW9uczogIyBDb25maWd1cmF0aW9uIG9wdGlvbnNcblxuICAgIHN0b3JlOiBudWxsICMgU3RvcmUgcGx1Z2luIHRvIHVzZS4gSWYgbnVsbCwgQW5ub3RhdG9yIHdpbGwgdXNlIGEgZGVmYXVsdCBzdG9yZS5cblxuICAgIHJlYWRPbmx5OiBmYWxzZSAjIFN0YXJ0IEFubm90YXRvciBpbiByZWFkLW9ubHkgbW9kZS4gTm8gY29udHJvbHMgd2lsbCBiZSBzaG93bi5cblxuICAgIGxvYWRRdWVyeToge30gIyBJbml0aWFsIHF1ZXJ5IHRvIGxvYWQgQW5ub3RhdGlvbnNcblxuICBwbHVnaW5zOiB7fVxuXG4gIGVkaXRvcjogbnVsbFxuXG4gIHZpZXdlcjogbnVsbFxuXG4gIHNlbGVjdGVkUmFuZ2VzOiBudWxsXG5cbiAgbW91c2VJc0Rvd246IGZhbHNlXG5cbiAgaWdub3JlTW91c2V1cDogZmFsc2VcblxuICB2aWV3ZXJIaWRlVGltZXI6IG51bGxcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiB0aGUgQW5ub3RhdG9yLiBSZXF1aXJlcyBhIERPTSBFbGVtZW50IGluXG4gICMgd2hpY2ggdG8gd2F0Y2ggZm9yIGFubm90YXRpb25zIGFzIHdlbGwgYXMgYW55IG9wdGlvbnMuXG4gICNcbiAgIyBOT1RFOiBJZiB0aGUgQW5ub3RhdG9yIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGN1cnJlbnQgYnJvd3NlciBpdCB3aWxsIG5vdFxuICAjIHBlcmZvcm0gYW55IHNldHVwIGFuZCBzaW1wbHkgcmV0dXJuIGEgYmFzaWMgb2JqZWN0LiBUaGlzIGFsbG93cyBwbHVnaW5zXG4gICMgdG8gc3RpbGwgYmUgbG9hZGVkIGJ1dCB3aWxsIG5vdCBmdW5jdGlvbiBhcyBleHBlY3RlZC4gSXQgaXMgcmVjY29tZW5kZWRcbiAgIyB0byBjYWxsIEFubm90YXRvci5zdXBwb3J0ZWQoKSBiZWZvcmUgY3JlYXRpbmcgdGhlIGluc3RhbmNlIG9yIHVzaW5nIHRoZVxuICAjIFVuc3VwcG9ydGVkIHBsdWdpbiB3aGljaCB3aWxsIG5vdGlmeSB1c2VycyB0aGF0IHRoZSBBbm5vdGF0b3Igd2lsbCBub3Qgd29yay5cbiAgI1xuICAjIGVsZW1lbnQgLSBBIERPTSBFbGVtZW50IGluIHdoaWNoIHRvIGFubm90YXRlLlxuICAjIG9wdGlvbnMgLSBBbiBvcHRpb25zIE9iamVjdC4gTk9URTogVGhlcmUgYXJlIGN1cnJlbnRseSBubyB1c2VyIG9wdGlvbnMuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBhbm5vdGF0b3IgPSBuZXcgQW5ub3RhdG9yKGRvY3VtZW50LmJvZHkpXG4gICNcbiAgIyAgICMgRXhhbXBsZSBvZiBjaGVja2luZyBmb3Igc3VwcG9ydC5cbiAgIyAgIGlmIEFubm90YXRvci5zdXBwb3J0ZWQoKVxuICAjICAgICBhbm5vdGF0b3IgPSBuZXcgQW5ub3RhdG9yKGRvY3VtZW50LmJvZHkpXG4gICMgICBlbHNlXG4gICMgICAgICMgRmFsbGJhY2sgZm9yIHVuc3VwcG9ydGVkIGJyb3dzZXJzLlxuICAjXG4gICMgUmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgQW5ub3RhdG9yLlxuICBjb25zdHJ1Y3RvcjogKGVsZW1lbnQsIG9wdGlvbnMpIC0+XG4gICAgc3VwZXJcbiAgICBAcGx1Z2lucyA9IHt9XG5cbiAgICBBbm5vdGF0b3IuX2luc3RhbmNlcy5wdXNoKHRoaXMpXG5cbiAgICAjIFJldHVybiBlYXJseSBpZiB0aGUgYW5ub3RhdG9yIGlzIG5vdCBzdXBwb3J0ZWQuXG4gICAgcmV0dXJuIHRoaXMgdW5sZXNzIEFubm90YXRvci5zdXBwb3J0ZWQoKVxuXG4gICAgIyBDcmVhdGUgdGhlIHJlZ2lzdHJ5IGFuZCBzdGFydCB0aGUgYXBwbGljYXRpb25cbiAgICBSZWdpc3RyeS5jcmVhdGVBcHAodGhpcywgb3B0aW9ucylcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhIHN1YmNsYXNzIG9mIEFubm90YXRvci5cbiAgI1xuICAjIFNlZSB0aGUgZG9jdW1lbnRhdGlvbiBmcm9tIEJhY2tib25lOiBodHRwOi8vYmFja2JvbmVqcy5vcmcvI01vZGVsLWV4dGVuZFxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgdmFyIEV4dGVuZGVkQW5ub3RhdG9yID0gQW5ub3RhdG9yLmV4dGVuZCh7XG4gICMgICAgIHNldHVwQW5ub3RhdGlvbjogZnVuY3Rpb24gKGFubm90YXRpb24pIHtcbiAgIyAgICAgICAvLyBJbnZva2UgdGhlIGJ1aWx0LWluIGltcGxlbWVudGF0aW9uXG4gICMgICAgICAgdHJ5IHtcbiAgIyAgICAgICAgIEFubm90YXRvci5wcm90b3R5cGUuc2V0dXBBbm5vdGF0aW9uLmNhbGwodGhpcywgYW5ub3RhdGlvbik7XG4gICMgICAgICAgfSBjYXRjaCAoZSkge1xuICAjICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBBbm5vdGF0b3IuUmFuZ2UuUmFuZ2VFcnJvcikge1xuICAjICAgICAgICAgICAvLyBUcnkgdG8gbG9jYXRlIHRoZSBBbm5vdGF0aW9uIHVzaW5nIHRoZSBxdW90ZVxuICAjICAgICAgICAgfSBlbHNlIHtcbiAgIyAgICAgICAgICAgdGhyb3cgZTtcbiAgIyAgICAgICAgIH1cbiAgIyAgICAgICB9XG4gICNcbiAgIyAgICAgICByZXR1cm4gYW5ub3RhdGlvbjtcbiAgIyAgIH0pO1xuICAjXG4gICMgICB2YXIgYW5ub3RhdG9yID0gbmV3IEV4dGVuZGVkQW5ub3RhdG9yKGRvY3VtZW50LmJvZHksIC8qIHtvcHRpb25zfSAqLyk7XG4gIEBleHRlbmQ6IGV4dGVuZFxuXG4gICMgV3JhcHMgdGhlIGNoaWxkcmVuIG9mIEBlbGVtZW50IGluIGEgQHdyYXBwZXIgZGl2LiBOT1RFOiBUaGlzIG1ldGhvZCB3aWxsIGFsc29cbiAgIyByZW1vdmUgYW55IHNjcmlwdCBlbGVtZW50cyBpbnNpZGUgQGVsZW1lbnQgdG8gcHJldmVudCB0aGVtIHJlLWV4ZWN1dGluZy5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIHRvIGFsbG93IGNoYWluaW5nLlxuICBfc2V0dXBXcmFwcGVyOiAtPlxuICAgIEB3cmFwcGVyID0gJChAaHRtbC53cmFwcGVyKVxuXG4gICAgIyBXZSBuZWVkIHRvIHJlbW92ZSBhbGwgc2NyaXB0cyB3aXRoaW4gdGhlIGVsZW1lbnQgYmVmb3JlIHdyYXBwaW5nIHRoZVxuICAgICMgY29udGVudHMgd2l0aGluIGEgZGl2LiBPdGhlcndpc2Ugd2hlbiBzY3JpcHRzIGFyZSByZWFwcGVuZGVkIHRvIHRoZSBET01cbiAgICAjIHRoZXkgd2lsbCByZS1leGVjdXRlLiBUaGlzIGlzIGFuIGlzc3VlIGZvciBzY3JpcHRzIHRoYXQgY2FsbFxuICAgICMgZG9jdW1lbnQud3JpdGUoKSAtIHN1Y2ggYXMgYWRzIC0gYXMgdGhleSB3aWxsIGNsZWFyIHRoZSBwYWdlLlxuICAgIEBlbGVtZW50LmZpbmQoJ3NjcmlwdCcpLnJlbW92ZSgpXG4gICAgQGVsZW1lbnQud3JhcElubmVyKEB3cmFwcGVyKVxuICAgIEB3cmFwcGVyID0gQGVsZW1lbnQuZmluZCgnLmFubm90YXRvci13cmFwcGVyJylcblxuICAgIHRoaXNcblxuICAjIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgQW5ub3RhdG9yLlZpZXdlciBhbmQgYXNzaWducyBpdCB0byB0aGUgQHZpZXdlclxuICAjIHByb3BlcnR5LCBhcHBlbmRzIGl0IHRvIHRoZSBAd3JhcHBlciBhbmQgc2V0cyB1cCBldmVudCBsaXN0ZW5lcnMuXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZiB0byBhbGxvdyBjaGFpbmluZy5cbiAgX3NldHVwVmlld2VyOiAtPlxuICAgIEB2aWV3ZXIgPSBuZXcgQW5ub3RhdG9yLlZpZXdlcihyZWFkT25seTogQG9wdGlvbnMucmVhZE9ubHkpXG4gICAgQHZpZXdlci5oaWRlKClcbiAgICAgIC5vbihcImVkaXRcIiwgdGhpcy5vbkVkaXRBbm5vdGF0aW9uKVxuICAgICAgLm9uKFwiZGVsZXRlXCIsIChhbm5vdGF0aW9uKSA9PlxuICAgICAgICBAdmlld2VyLmhpZGUoKVxuICAgICAgICB0aGlzLnB1Ymxpc2goJ2JlZm9yZUFubm90YXRpb25EZWxldGVkJywgW2Fubm90YXRpb25dKVxuICAgICAgICAjIERlbGV0ZSBoaWdobGlnaHQgZWxlbWVudHMuXG4gICAgICAgIHRoaXMuY2xlYW51cEFubm90YXRpb24oYW5ub3RhdGlvbilcbiAgICAgICAgIyBEZWxldGUgYW5ub3RhdGlvblxuICAgICAgICB0aGlzLmFubm90YXRpb25zLmRlbGV0ZShhbm5vdGF0aW9uKVxuICAgICAgICAgIC5kb25lID0+IHRoaXMucHVibGlzaCgnYW5ub3RhdGlvbkRlbGV0ZWQnLCBbYW5ub3RhdGlvbl0pXG4gICAgICApXG4gICAgICAuYWRkRmllbGQoe1xuICAgICAgICBsb2FkOiAoZmllbGQsIGFubm90YXRpb24pID0+XG4gICAgICAgICAgaWYgYW5ub3RhdGlvbi50ZXh0XG4gICAgICAgICAgICAkKGZpZWxkKS5odG1sKFV0aWwuZXNjYXBlKGFubm90YXRpb24udGV4dCkpXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgJChmaWVsZCkuaHRtbChcIjxpPiN7X3QgJ05vIENvbW1lbnQnfTwvaT5cIilcbiAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Fubm90YXRpb25WaWV3ZXJUZXh0RmllbGQnLCBbZmllbGQsIGFubm90YXRpb25dKVxuICAgICAgfSlcbiAgICAgIC5lbGVtZW50LmFwcGVuZFRvKEB3cmFwcGVyKS5iaW5kKHtcbiAgICAgICAgXCJtb3VzZW92ZXJcIjogdGhpcy5jbGVhclZpZXdlckhpZGVUaW1lclxuICAgICAgICBcIm1vdXNlb3V0XCI6ICB0aGlzLnN0YXJ0Vmlld2VySGlkZVRpbWVyXG4gICAgICB9KVxuICAgIHRoaXNcblxuICAjIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgdGhlIEFubm90YXRvci5FZGl0b3IgYW5kIGFzc2lnbnMgaXQgdG8gQGVkaXRvci5cbiAgIyBBcHBlbmRzIHRoaXMgdG8gdGhlIEB3cmFwcGVyIGFuZCBzZXRzIHVwIGV2ZW50IGxpc3RlbmVycy5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIGZvciBjaGFpbmluZy5cbiAgX3NldHVwRWRpdG9yOiAtPlxuICAgIEBlZGl0b3IgPSBuZXcgQW5ub3RhdG9yLkVkaXRvcigpXG4gICAgQGVkaXRvci5oaWRlKClcbiAgICAgIC5vbignaGlkZScsIHRoaXMub25FZGl0b3JIaWRlKVxuICAgICAgLm9uKCdzYXZlJywgdGhpcy5vbkVkaXRvclN1Ym1pdClcbiAgICAgIC5hZGRGaWVsZCh7XG4gICAgICAgIHR5cGU6ICd0ZXh0YXJlYScsXG4gICAgICAgIGxhYmVsOiBfdCgnQ29tbWVudHMnKSArICdcXHUyMDI2J1xuICAgICAgICBsb2FkOiAoZmllbGQsIGFubm90YXRpb24pIC0+XG4gICAgICAgICAgJChmaWVsZCkuZmluZCgndGV4dGFyZWEnKS52YWwoYW5ub3RhdGlvbi50ZXh0IHx8ICcnKVxuICAgICAgICBzdWJtaXQ6IChmaWVsZCwgYW5ub3RhdGlvbikgLT5cbiAgICAgICAgICBhbm5vdGF0aW9uLnRleHQgPSAkKGZpZWxkKS5maW5kKCd0ZXh0YXJlYScpLnZhbCgpXG4gICAgICB9KVxuXG4gICAgQGVkaXRvci5lbGVtZW50LmFwcGVuZFRvKEB3cmFwcGVyKVxuICAgIHRoaXNcblxuICAjIFNldHMgdXAgdGhlIHNlbGVjdGlvbiBldmVudCBsaXN0ZW5lcnMgdG8gd2F0Y2ggbW91c2UgYWN0aW9ucyBvbiB0aGUgZG9jdW1lbnQuXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZiBmb3IgY2hhaW5pbmcuXG4gIF9zZXR1cERvY3VtZW50RXZlbnRzOiAtPlxuICAgICQoZG9jdW1lbnQpLmJpbmQoe1xuICAgICAgXCJtb3VzZXVwXCI6ICAgdGhpcy5jaGVja0ZvckVuZFNlbGVjdGlvblxuICAgICAgXCJtb3VzZWRvd25cIjogdGhpcy5jaGVja0ZvclN0YXJ0U2VsZWN0aW9uXG4gICAgfSlcbiAgICB0aGlzXG5cbiAgIyBTZXRzIHVwIGFueSBkeW5hbWljYWxseSBjYWxjdWxhdGVkIENTUyBmb3IgdGhlIEFubm90YXRvci5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIGZvciBjaGFpbmluZy5cbiAgX3NldHVwRHluYW1pY1N0eWxlOiAtPlxuICAgIHN0eWxlID0gJCgnI2Fubm90YXRvci1keW5hbWljLXN0eWxlJylcblxuICAgIGlmICghc3R5bGUubGVuZ3RoKVxuICAgICAgc3R5bGUgPSAkKCc8c3R5bGUgaWQ9XCJhbm5vdGF0b3ItZHluYW1pYy1zdHlsZVwiPjwvc3R5bGU+JykuYXBwZW5kVG8oZG9jdW1lbnQuaGVhZClcblxuICAgIHNlbCA9ICcqJyArIChcIjpub3QoLmFubm90YXRvci0je3h9KVwiIGZvciB4IGluIFsnYWRkZXInLCAnb3V0ZXInLCAnbm90aWNlJywgJ2ZpbHRlciddKS5qb2luKCcnKVxuXG4gICAgIyB1c2UgdGhlIG1heGltdW0gei1pbmRleCBpbiB0aGUgcGFnZVxuICAgIG1heCA9IFV0aWwubWF4WkluZGV4KCQoZG9jdW1lbnQuYm9keSkuZmluZChzZWwpKVxuXG4gICAgIyBidXQgZG9uJ3QgZ28gc21hbGxlciB0aGFuIDEwMTAsIGJlY2F1c2UgdGhpcyBpc24ndCBidWxsZXRwcm9vZiAtLVxuICAgICMgZHluYW1pYyBlbGVtZW50cyBpbiB0aGUgcGFnZSAobm90aWZpY2F0aW9ucywgZGlhbG9ncywgZXRjLikgbWF5IHdlbGxcbiAgICAjIGhhdmUgaGlnaCB6LWluZGljZXMgdGhhdCB3ZSBjYW4ndCBjYXRjaCB1c2luZyB0aGUgYWJvdmUgbWV0aG9kLlxuICAgIG1heCA9IE1hdGgubWF4KG1heCwgMTAwMClcblxuICAgIHN0eWxlLnRleHQgW1xuICAgICAgXCIuYW5ub3RhdG9yLWFkZGVyLCAuYW5ub3RhdG9yLW91dGVyLCAuYW5ub3RhdG9yLW5vdGljZSB7XCJcbiAgICAgIFwiICB6LWluZGV4OiAje21heCArIDIwfTtcIlxuICAgICAgXCJ9XCJcbiAgICAgIFwiLmFubm90YXRvci1maWx0ZXIge1wiXG4gICAgICBcIiAgei1pbmRleDogI3ttYXggKyAxMH07XCJcbiAgICAgIFwifVwiXG4gICAgXS5qb2luKFwiXFxuXCIpXG5cbiAgICB0aGlzXG5cbiAgIyBQdWJsaWM6IExvYWQgYW5kIGRyYXcgYW5ub3RhdGlvbnMgZnJvbSBhIGdpdmVuIHF1ZXJ5LlxuICAjXG4gICMgcXVlcnkgLSB0aGUgcXVlcnkgdG8gcGFzcyB0byB0aGUgYmFja2VuZFxuICAjXG4gICMgUmV0dXJucyBhIFByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIGxvYWRpbmcgaXMgY29tcGxldGUuXG4gIGxvYWQ6IChxdWVyeSkgLT5cbiAgICBAYW5ub3RhdGlvbnMubG9hZChxdWVyeSlcbiAgICAgIC50aGVuIChhbm5vdGF0aW9ucywgbWV0YSkgPT5cbiAgICAgICAgdGhpcy5sb2FkQW5ub3RhdGlvbnMoYW5ub3RhdGlvbnMpXG5cbiAgIyBQdWJsaWM6IERlc3Ryb3kgdGhlIGN1cnJlbnQgQW5ub3RhdG9yIGluc3RhbmNlLCB1bmJpbmRpbmcgYWxsIGV2ZW50cyBhbmRcbiAgIyBkaXNwb3Npbmcgb2YgYWxsIHJlbGV2YW50IGVsZW1lbnRzLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBkZXN0cm95OiAtPlxuICAgICQoZG9jdW1lbnQpLnVuYmluZCh7XG4gICAgICBcIm1vdXNldXBcIjogICB0aGlzLmNoZWNrRm9yRW5kU2VsZWN0aW9uXG4gICAgICBcIm1vdXNlZG93blwiOiB0aGlzLmNoZWNrRm9yU3RhcnRTZWxlY3Rpb25cbiAgICB9KVxuXG4gICAgJCgnI2Fubm90YXRvci1keW5hbWljLXN0eWxlJykucmVtb3ZlKClcblxuICAgIEBhZGRlci5yZW1vdmUoKVxuICAgIEB2aWV3ZXIuZGVzdHJveSgpXG4gICAgQGVkaXRvci5kZXN0cm95KClcblxuICAgIEB3cmFwcGVyLmZpbmQoJy5hbm5vdGF0b3ItaGwnKS5lYWNoIC0+XG4gICAgICAkKHRoaXMpLmNvbnRlbnRzKCkuaW5zZXJ0QmVmb3JlKHRoaXMpXG4gICAgICAkKHRoaXMpLnJlbW92ZSgpXG5cbiAgICBAd3JhcHBlci5jb250ZW50cygpLmluc2VydEJlZm9yZShAd3JhcHBlcilcbiAgICBAd3JhcHBlci5yZW1vdmUoKVxuICAgIEBlbGVtZW50LmRhdGEoJ2Fubm90YXRvcicsIG51bGwpXG5cbiAgICBmb3IgbmFtZSwgcGx1Z2luIG9mIEBwbHVnaW5zXG4gICAgICBAcGx1Z2luc1tuYW1lXS5kZXN0cm95KClcblxuICAgIHRoaXMucmVtb3ZlRXZlbnRzKClcbiAgICBpZHggPSBBbm5vdGF0b3IuX2luc3RhbmNlcy5pbmRleE9mKHRoaXMpXG4gICAgaWYgaWR4ICE9IC0xXG4gICAgICBBbm5vdGF0b3IuX2luc3RhbmNlcy5zcGxpY2UoaWR4LCAxKVxuXG4gICMgUHVibGljOiBHZXRzIHRoZSBjdXJyZW50IHNlbGVjdGlvbiBleGNsdWRpbmcgYW55IG5vZGVzIHRoYXQgZmFsbCBvdXRzaWRlIG9mXG4gICMgdGhlIEB3cmFwcGVyLiBUaGVuIHJldHVybnMgYW5kIEFycmF5IG9mIE5vcm1hbGl6ZWRSYW5nZSBpbnN0YW5jZXMuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIEEgc2VsZWN0aW9uIGluc2lkZSBAd3JhcHBlclxuICAjICAgYW5ub3RhdGlvbi5nZXRTZWxlY3RlZFJhbmdlcygpXG4gICMgICAjID0+IFJldHVybnMgW05vcm1hbGl6ZWRSYW5nZV1cbiAgI1xuICAjICAgIyBBIHNlbGVjdGlvbiBvdXRzaWRlIG9mIEB3cmFwcGVyXG4gICMgICBhbm5vdGF0aW9uLmdldFNlbGVjdGVkUmFuZ2VzKClcbiAgIyAgICMgPT4gUmV0dXJucyBbXVxuICAjXG4gICMgUmV0dXJucyBBcnJheSBvZiBOb3JtYWxpemVkUmFuZ2UgaW5zdGFuY2VzLlxuICBnZXRTZWxlY3RlZFJhbmdlczogLT5cbiAgICBzZWxlY3Rpb24gPSBVdGlsLmdldEdsb2JhbCgpLmdldFNlbGVjdGlvbigpXG5cbiAgICByYW5nZXMgPSBbXVxuICAgIHJhbmdlc1RvSWdub3JlID0gW11cbiAgICB1bmxlc3Mgc2VsZWN0aW9uLmlzQ29sbGFwc2VkXG4gICAgICByYW5nZXMgPSBmb3IgaSBpbiBbMC4uLnNlbGVjdGlvbi5yYW5nZUNvdW50XVxuICAgICAgICByID0gc2VsZWN0aW9uLmdldFJhbmdlQXQoaSlcbiAgICAgICAgYnJvd3NlclJhbmdlID0gbmV3IFJhbmdlLkJyb3dzZXJSYW5nZShyKVxuICAgICAgICBub3JtZWRSYW5nZSA9IGJyb3dzZXJSYW5nZS5ub3JtYWxpemUoKS5saW1pdChAd3JhcHBlclswXSlcblxuICAgICAgICAjIElmIHRoZSBuZXcgcmFuZ2UgZmFsbHMgZnVsbHkgb3V0c2lkZSB0aGUgd3JhcHBlciwgd2VcbiAgICAgICAgIyBzaG91bGQgYWRkIGl0IGJhY2sgdG8gdGhlIGRvY3VtZW50IGJ1dCBub3QgcmV0dXJuIGl0IGZyb21cbiAgICAgICAgIyB0aGlzIG1ldGhvZFxuICAgICAgICByYW5nZXNUb0lnbm9yZS5wdXNoKHIpIGlmIG5vcm1lZFJhbmdlIGlzIG51bGxcblxuICAgICAgICBub3JtZWRSYW5nZVxuXG4gICAgICAjIEJyb3dzZXJSYW5nZSNub3JtYWxpemUoKSBtb2RpZmllcyB0aGUgRE9NIHN0cnVjdHVyZSBhbmQgZGVzZWxlY3RzIHRoZVxuICAgICAgIyB1bmRlcmx5aW5nIHRleHQgYXMgYSByZXN1bHQuIFNvIGhlcmUgd2UgcmVtb3ZlIHRoZSBzZWxlY3RlZCByYW5nZXMgYW5kXG4gICAgICAjIHJlYXBwbHkgdGhlIG5ldyBvbmVzLlxuICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpXG5cbiAgICBmb3IgciBpbiByYW5nZXNUb0lnbm9yZVxuICAgICAgc2VsZWN0aW9uLmFkZFJhbmdlKHIpXG5cbiAgICAjIFJlbW92ZSBhbnkgcmFuZ2VzIHRoYXQgZmVsbCBvdXRzaWRlIG9mIEB3cmFwcGVyLlxuICAgICQuZ3JlcCByYW5nZXMsIChyYW5nZSkgLT5cbiAgICAgICMgQWRkIHRoZSBub3JtZWQgcmFuZ2UgYmFjayB0byB0aGUgc2VsZWN0aW9uIGlmIGl0IGV4aXN0cy5cbiAgICAgIHNlbGVjdGlvbi5hZGRSYW5nZShyYW5nZS50b1JhbmdlKCkpIGlmIHJhbmdlXG4gICAgICByYW5nZVxuXG5cbiAgIyBQdWJsaWM6IEluaXRpYWxpc2VzIGFuIGFubm90YXRpb24gZnJvbSBhbiBvYmplY3QgcmVwcmVzZW50YXRpb24uIEl0IGZpbmRzXG4gICMgdGhlIHNlbGVjdGVkIHJhbmdlIGFuZCBoaWdsaWdodHMgdGhlIHNlbGVjdGlvbiBpbiB0aGUgRE9NLlxuICAjXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gT2JqZWN0IHRvIGluaXRpYWxpc2UuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIENyZWF0ZSBhIGJyYW5kIG5ldyBhbm5vdGF0aW9uIGZyb20gdGhlIGN1cnJlbnRseSBzZWxlY3RlZCB0ZXh0LlxuICAjICAgYW5ub3RhdGlvbiA9IGFubm90YXRvci5zZXR1cEFubm90YXRpb24oe3JhbmdlczogYW5ub3RhdG9yLnNlbGVjdGVkUmFuZ2VzfSlcbiAgIyAgICMgYW5ub3RhdGlvbiBoYXMgbm93IGJlZW4gYXNzaWduZWQgdGhlIGN1cnJlbnRseSBzZWxlY3RlZCByYW5nZVxuICAjICAgIyBhbmQgYSBoaWdobGlnaHQgYXBwZW5kZWQgdG8gdGhlIERPTS5cbiAgI1xuICAjICAgIyBBZGQgYW4gZXhpc3RpbmcgYW5ub3RhdGlvbiB0aGF0IGhhcyBiZWVuIHN0b3JlZCBlbHNld2VyZSB0byB0aGUgRE9NLlxuICAjICAgYW5ub3RhdGlvbiA9IGdldFN0b3JlZEFubm90YXRpb25XaXRoU2VyaWFsaXplZFJhbmdlcygpXG4gICMgICBhbm5vdGF0aW9uID0gYW5ub3RhdG9yLnNldHVwQW5ub3RhdGlvbihhbm5vdGF0aW9uKVxuICAjXG4gICMgUmV0dXJucyB0aGUgaW5pdGlhbGlzZWQgYW5ub3RhdGlvbi5cbiAgc2V0dXBBbm5vdGF0aW9uOiAoYW5ub3RhdGlvbikgLT5cbiAgICByb290ID0gQHdyYXBwZXJbMF1cblxuICAgIG5vcm1lZFJhbmdlcyA9IFtdXG4gICAgZm9yIHIgaW4gYW5ub3RhdGlvbi5yYW5nZXNcbiAgICAgIHRyeVxuICAgICAgICBub3JtZWRSYW5nZXMucHVzaChSYW5nZS5zbmlmZihyKS5ub3JtYWxpemUocm9vdCkpXG4gICAgICBjYXRjaCBlXG4gICAgICAgIGlmIGUgaW5zdGFuY2VvZiBSYW5nZS5SYW5nZUVycm9yXG4gICAgICAgICAgdGhpcy5wdWJsaXNoKCdyYW5nZU5vcm1hbGl6ZUZhaWwnLCBbYW5ub3RhdGlvbiwgciwgZV0pXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAjIE9oIEphdmFzY3JpcHQsIHdoeSB5b3Ugc28gY3JhcD8gVGhpcyB3aWxsIGxvc2UgdGhlIHRyYWNlYmFjay5cbiAgICAgICAgICB0aHJvdyBlXG5cbiAgICBhbm5vdGF0aW9uLnF1b3RlICAgICAgPSBbXVxuICAgIGFubm90YXRpb24ucmFuZ2VzICAgICA9IFtdXG4gICAgYW5ub3RhdGlvbi5fbG9jYWwgPSB7fVxuICAgIGFubm90YXRpb24uX2xvY2FsLmhpZ2hsaWdodHMgPSBbXVxuXG4gICAgZm9yIG5vcm1lZCBpbiBub3JtZWRSYW5nZXNcbiAgICAgIGFubm90YXRpb24ucXVvdGUucHVzaCAgICAgICQudHJpbShub3JtZWQudGV4dCgpKVxuICAgICAgYW5ub3RhdGlvbi5yYW5nZXMucHVzaCAgICAgbm9ybWVkLnNlcmlhbGl6ZShAd3JhcHBlclswXSwgJy5hbm5vdGF0b3ItaGwnKVxuICAgICAgJC5tZXJnZSBhbm5vdGF0aW9uLl9sb2NhbC5oaWdobGlnaHRzLCB0aGlzLmhpZ2hsaWdodFJhbmdlKG5vcm1lZClcblxuICAgICMgSm9pbiBhbGwgdGhlIHF1b3RlcyBpbnRvIG9uZSBzdHJpbmcuXG4gICAgYW5ub3RhdGlvbi5xdW90ZSA9IGFubm90YXRpb24ucXVvdGUuam9pbignIC8gJylcblxuICAgICMgU2F2ZSB0aGUgYW5ub3RhdGlvbiBkYXRhIG9uIGVhY2ggaGlnaGxpZ2h0ZXIgZWxlbWVudC5cbiAgICAkKGFubm90YXRpb24uX2xvY2FsLmhpZ2hsaWdodHMpLmRhdGEoJ2Fubm90YXRpb24nLCBhbm5vdGF0aW9uKVxuXG4gICAgYW5ub3RhdGlvblxuXG4gICMgUHVibGljOiBEZWxldGVzIHRoZSBhbm5vdGF0aW9uIGJ5IHJlbW92aW5nIHRoZSBoaWdobGlnaHQgZnJvbSB0aGUgRE9NLlxuICAjXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gT2JqZWN0IHRvIGRlbGV0ZS5cbiAgI1xuICAjIFJldHVybnMgZGVsZXRlZCBhbm5vdGF0aW9uLlxuICBjbGVhbnVwQW5ub3RhdGlvbjogKGFubm90YXRpb24pIC0+XG4gICAgaWYgYW5ub3RhdGlvbi5fbG9jYWw/LmhpZ2hsaWdodHM/XG4gICAgICBmb3IgaCBpbiBhbm5vdGF0aW9uLl9sb2NhbC5oaWdobGlnaHRzIHdoZW4gaC5wYXJlbnROb2RlP1xuICAgICAgICAkKGgpLnJlcGxhY2VXaXRoKGguY2hpbGROb2RlcylcbiAgICAgIGRlbGV0ZSBhbm5vdGF0aW9uLl9sb2NhbC5oaWdobGlnaHRzXG5cbiAgICBhbm5vdGF0aW9uXG5cbiAgIyBQdWJsaWM6IExvYWRzIGFuIEFycmF5IG9mIGFubm90YXRpb25zIGludG8gdGhlIEBlbGVtZW50LiBCcmVha3MgdGhlIHRhc2tcbiAgIyBpbnRvIGNodW5rcyBvZiAxMCBhbm5vdGF0aW9ucy5cbiAgI1xuICAjIGFubm90YXRpb25zIC0gQW4gQXJyYXkgb2YgYW5ub3RhdGlvbiBPYmplY3RzLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgbG9hZEFubm90YXRpb25zRnJvbVN0b3JlIChhbm5vdGF0aW9ucykgLT5cbiAgIyAgICAgYW5ub3RhdG9yLmxvYWRBbm5vdGF0aW9ucyhhbm5vdGF0aW9ucylcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIGZvciBjaGFpbmluZy5cbiAgbG9hZEFubm90YXRpb25zOiAoYW5ub3RhdGlvbnM9W10pIC0+XG4gICAgbG9hZGVyID0gKGFubkxpc3Q9W10pID0+XG4gICAgICBub3cgPSBhbm5MaXN0LnNwbGljZSgwLDEwKVxuXG4gICAgICBmb3IgbiBpbiBub3dcbiAgICAgICAgdGhpcy5zZXR1cEFubm90YXRpb24obilcblxuICAgICAgIyBJZiB0aGVyZSBhcmUgbW9yZSB0byBkbywgZG8gdGhlbSBhZnRlciBhIDEwbXMgYnJlYWsgKGZvciBicm93c2VyXG4gICAgICAjIHJlc3BvbnNpdmVuZXNzKS5cbiAgICAgIGlmIGFubkxpc3QubGVuZ3RoID4gMFxuICAgICAgICBzZXRUaW1lb3V0KCgtPiBsb2FkZXIoYW5uTGlzdCkpLCAxMClcbiAgICAgIGVsc2VcbiAgICAgICAgdGhpcy5wdWJsaXNoICdhbm5vdGF0aW9uc0xvYWRlZCcsIFtjbG9uZV1cblxuICAgIGNsb25lID0gYW5ub3RhdGlvbnMuc2xpY2UoKVxuICAgIGxvYWRlciBhbm5vdGF0aW9uc1xuXG4gICAgdGhpc1xuXG4gICMgUHVibGljOiBDYWxscyB0aGUgU3RvcmUjZHVtcEFubm90YXRpb25zKCkgbWV0aG9kLlxuICAjXG4gICMgUmV0dXJucyBkdW1wZWQgYW5ub3RhdGlvbnMgQXJyYXkgb3IgZmFsc2UgaWYgU3RvcmUgaXMgbm90IGxvYWRlZC5cbiAgZHVtcEFubm90YXRpb25zOiAoKSAtPlxuICAgIGlmIEBwbHVnaW5zWydTdG9yZSddXG4gICAgICBAcGx1Z2luc1snU3RvcmUnXS5kdW1wQW5ub3RhdGlvbnMoKVxuICAgIGVsc2VcbiAgICAgIGNvbnNvbGUud2FybihfdChcIkNhbid0IGR1bXAgYW5ub3RhdGlvbnMgd2l0aG91dCBTdG9yZSBwbHVnaW4uXCIpKVxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgIyBQdWJsaWM6IFdyYXBzIHRoZSBET00gTm9kZXMgd2l0aGluIHRoZSBwcm92aWRlZCByYW5nZSB3aXRoIGEgaGlnaGxpZ2h0XG4gICMgZWxlbWVudCBvZiB0aGUgc3BlY2lmaWVkIGNsYXNzwqBhbmQgcmV0dXJucyB0aGUgaGlnaGxpZ2h0IEVsZW1lbnRzLlxuICAjXG4gICMgbm9ybWVkUmFuZ2UgLSBBIE5vcm1hbGl6ZWRSYW5nZSB0byBiZSBoaWdobGlnaHRlZC5cbiAgIyBjc3NDbGFzcyAtIEEgQ1NTIGNsYXNzIHRvIHVzZSBmb3IgdGhlIGhpZ2hsaWdodCAoZGVmYXVsdDogJ2Fubm90YXRvci1obCcpXG4gICNcbiAgIyBSZXR1cm5zIGFuIGFycmF5IG9mIGhpZ2hsaWdodCBFbGVtZW50cy5cbiAgaGlnaGxpZ2h0UmFuZ2U6IChub3JtZWRSYW5nZSwgY3NzQ2xhc3M9J2Fubm90YXRvci1obCcpIC0+XG4gICAgd2hpdGUgPSAvXlxccyokL1xuXG4gICAgaGwgPSAkKFwiPHNwYW4gY2xhc3M9JyN7Y3NzQ2xhc3N9Jz48L3NwYW4+XCIpXG5cbiAgICAjIElnbm9yZSB0ZXh0IG5vZGVzIHRoYXQgY29udGFpbiBvbmx5IHdoaXRlc3BhY2UgY2hhcmFjdGVycy4gVGhpcyBwcmV2ZW50c1xuICAgICMgc3BhbnMgYmVpbmcgaW5qZWN0ZWQgYmV0d2VlbiBlbGVtZW50cyB0aGF0IGNhbiBvbmx5IGNvbnRhaW4gYSByZXN0cmljdGVkXG4gICAgIyBzdWJzZXQgb2Ygbm9kZXMgc3VjaCBhcyB0YWJsZSByb3dzIGFuZCBsaXN0cy4gVGhpcyBkb2VzIG1lYW4gdGhhdCB0aGVyZVxuICAgICMgbWF5IGJlIHRoZSBvZGQgYWJhbmRvbmVkIHdoaXRlc3BhY2Ugbm9kZSBpbiBhIHBhcmFncmFwaCB0aGF0IGlzIHNraXBwZWRcbiAgICAjIGJ1dCBiZXR0ZXIgdGhhbiBicmVha2luZyB0YWJsZSBsYXlvdXRzLlxuICAgIGZvciBub2RlIGluIG5vcm1lZFJhbmdlLnRleHROb2RlcygpIHdoZW4gbm90IHdoaXRlLnRlc3Qobm9kZS5ub2RlVmFsdWUpXG4gICAgICAkKG5vZGUpLndyYXBBbGwoaGwpLnBhcmVudCgpLnNob3coKVswXVxuXG4gICMgUHVibGljOiBoaWdobGlnaHQgYSBsaXN0IG9mIHJhbmdlc1xuICAjXG4gICMgbm9ybWVkUmFuZ2VzIC0gQW4gYXJyYXkgb2YgTm9ybWFsaXplZFJhbmdlcyB0byBiZSBoaWdobGlnaHRlZC5cbiAgIyBjc3NDbGFzcyAtIEEgQ1NTIGNsYXNzIHRvIHVzZSBmb3IgdGhlIGhpZ2hsaWdodCAoZGVmYXVsdDogJ2Fubm90YXRvci1obCcpXG4gICNcbiAgIyBSZXR1cm5zIGFuIGFycmF5IG9mIGhpZ2hsaWdodCBFbGVtZW50cy5cbiAgaGlnaGxpZ2h0UmFuZ2VzOiAobm9ybWVkUmFuZ2VzLCBjc3NDbGFzcz0nYW5ub3RhdG9yLWhsJykgLT5cbiAgICBoaWdobGlnaHRzID0gW11cbiAgICBmb3IgciBpbiBub3JtZWRSYW5nZXNcbiAgICAgICQubWVyZ2UgaGlnaGxpZ2h0cywgdGhpcy5oaWdobGlnaHRSYW5nZShyLCBjc3NDbGFzcylcbiAgICBoaWdobGlnaHRzXG5cbiAgIyBQdWJsaWM6IFJlZ2lzdGVycyBhIHBsdWdpbiB3aXRoIHRoZSBBbm5vdGF0b3IuIEEgcGx1Z2luIGNhbiBvbmx5IGJlXG4gICMgcmVnaXN0ZXJlZCBvbmNlLiBUaGUgcGx1Z2luIHdpbGwgYmUgaW5zdGFudGlhdGVkIGluIHRoZSBmb2xsb3dpbmcgb3JkZXIuXG4gICNcbiAgIyAxLiBBIG5ldyBpbnN0YW5jZSBvZiB0aGUgcGx1Z2luIHdpbGwgYmUgY3JlYXRlZCAocHJvdmlkaW5nIHRoZSBAZWxlbWVudCBhbmRcbiAgIyAgICBvcHRpb25zIGFzIHBhcmFtcykgdGhlbiBhc3NpZ25lZCB0byB0aGUgQHBsdWdpbnMgcmVnaXN0cnkuXG4gICMgMi4gVGhlIGN1cnJlbnQgQW5ub3RhdG9yIGluc3RhbmNlIHdpbGwgYmUgYXR0YWNoZWQgdG8gdGhlIHBsdWdpbi5cbiAgIyAzLiBUaGUgUGx1Z2luI3BsdWdpbkluaXQoKSBtZXRob2Qgd2lsbCBiZSBjYWxsZWQgaWYgaXQgZXhpc3RzLlxuICAjXG4gICMgbmFtZSAgICAtIFBsdWdpbiB0byBpbnN0YW50aWF0ZS4gTXVzdCBiZSBpbiB0aGUgQW5ub3RhdG9yLlBsdWdpbnMgbmFtZXNwYWNlLlxuICAjIG9wdGlvbnMgLSBBbnkgb3B0aW9ucyB0byBiZSBwcm92aWRlZCB0byB0aGUgcGx1Z2luIGNvbnN0cnVjdG9yLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgYW5ub3RhdG9yXG4gICMgICAgIC5hZGRQbHVnaW4oJ1RhZ3MnKVxuICAjICAgICAuYWRkUGx1Z2luKCdTdG9yZScsIHtcbiAgIyAgICAgICBwcmVmaXg6ICcvc3RvcmUnXG4gICMgICAgIH0pXG4gICMgICAgIC5hZGRQbHVnaW4oJ1Blcm1pc3Npb25zJywge1xuICAjICAgICAgIHVzZXI6ICdCaWxsJ1xuICAjICAgICB9KVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgdG8gYWxsb3cgY2hhaW5pbmcuXG4gIGFkZFBsdWdpbjogKG5hbWUsIG9wdGlvbnMpIC0+XG4gICAgaWYgQHBsdWdpbnNbbmFtZV1cbiAgICAgIGNvbnNvbGUuZXJyb3IgX3QoXCJZb3UgY2Fubm90IGhhdmUgbW9yZSB0aGFuIG9uZSBpbnN0YW5jZSBvZiBhbnkgcGx1Z2luLlwiKVxuICAgIGVsc2VcbiAgICAgIGtsYXNzID0gQW5ub3RhdG9yLlBsdWdpbltuYW1lXVxuICAgICAgaWYgdHlwZW9mIGtsYXNzIGlzICdmdW5jdGlvbidcbiAgICAgICAgQHBsdWdpbnNbbmFtZV0gPSBuZXcga2xhc3MoQGVsZW1lbnRbMF0sIG9wdGlvbnMpXG4gICAgICAgIEBwbHVnaW5zW25hbWVdLmFubm90YXRvciA9IHRoaXNcbiAgICAgICAgQHBsdWdpbnNbbmFtZV0ucGx1Z2luSW5pdD8oKVxuICAgICAgZWxzZVxuICAgICAgICBjb25zb2xlLmVycm9yIF90KFwiQ291bGQgbm90IGxvYWQgXCIpICsgbmFtZSArIF90KFwiIHBsdWdpbi4gSGF2ZSB5b3UgaW5jbHVkZWQgdGhlIGFwcHJvcHJpYXRlIDxzY3JpcHQ+IHRhZz9cIilcbiAgICB0aGlzICMgYWxsb3cgY2hhaW5pbmdcblxuICAjIFB1YmxpYzogV2FpdHMgZm9yIHRoZSBAZWRpdG9yIHRvIHN1Ym1pdCBvciBoaWRlLCByZXR1cm5pbmcgYSBwcm9taXNlIHRoYXRcbiAgIyBpcyByZXNvbHZlZCBvciByZWplY3RlZCBkZXBlbmRpbmcgb24gd2hldGhlciB0aGUgYW5ub3RhdGlvbiB3YXMgc2F2ZWQgb3JcbiAgIyBjYW5jZWxsZWQuXG4gIGVkaXRBbm5vdGF0aW9uOiAoYW5ub3RhdGlvbiwgcG9zaXRpb24pIC0+XG4gICAgZGZkID0gJC5EZWZlcnJlZCgpXG4gICAgcmVzb2x2ZSA9IGRmZC5yZXNvbHZlLmJpbmQoZGZkLCBhbm5vdGF0aW9uKVxuICAgIHJlamVjdCA9IGRmZC5yZWplY3QuYmluZChkZmQsIGFubm90YXRpb24pXG5cbiAgICB0aGlzLnNob3dFZGl0b3IoYW5ub3RhdGlvbiwgcG9zaXRpb24pXG4gICAgdGhpcy5zdWJzY3JpYmUoJ2Fubm90YXRpb25FZGl0b3JTdWJtaXQnLCByZXNvbHZlKVxuICAgIHRoaXMub25jZSAnYW5ub3RhdGlvbkVkaXRvckhpZGRlbicsID0+XG4gICAgICB0aGlzLnVuc3Vic2NyaWJlKCdhbm5vdGF0aW9uRWRpdG9yU3VibWl0JywgcmVzb2x2ZSlcbiAgICAgIHJlamVjdCgpIGlmIGRmZC5zdGF0ZSgpIGlzICdwZW5kaW5nJ1xuXG4gICAgZGZkLnByb21pc2UoKVxuXG4gICMgUHVibGljOiBMb2FkcyB0aGUgQGVkaXRvciB3aXRoIHRoZSBwcm92aWRlZCBhbm5vdGF0aW9uIGFuZCB1cGRhdGVzIGl0c1xuICAjIHBvc2l0aW9uIGluIHRoZSB3aW5kb3cuXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiB0byBsb2FkIGludG8gdGhlIGVkaXRvci5cbiAgIyBsb2NhdGlvbiAgIC0gUG9zaXRpb24gdG8gc2V0IHRoZSBFZGl0b3IgaW4gdGhlIGZvcm0ge3RvcDogeSwgbGVmdDogeH1cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGFubm90YXRvci5zaG93RWRpdG9yKHt0ZXh0OiBcIm15IGNvbW1lbnRcIn0sIHt0b3A6IDM0LCBsZWZ0OiAyMzR9KVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgdG8gYWxsb3cgY2hhaW5pbmcuXG4gIHNob3dFZGl0b3I6IChhbm5vdGF0aW9uLCBsb2NhdGlvbikgPT5cbiAgICBAZWRpdG9yLmVsZW1lbnQuY3NzKGxvY2F0aW9uKVxuICAgIEBlZGl0b3IubG9hZChhbm5vdGF0aW9uKVxuICAgIHRoaXMucHVibGlzaCgnYW5ub3RhdGlvbkVkaXRvclNob3duJywgW0BlZGl0b3IsIGFubm90YXRpb25dKVxuICAgIHRoaXNcblxuICAjIENhbGxiYWNrIG1ldGhvZCBjYWxsZWQgd2hlbiB0aGUgQGVkaXRvciBmaXJlcyB0aGUgXCJoaWRlXCIgZXZlbnQuIEl0c2VsZlxuICAjIHB1Ymxpc2hlcyB0aGUgJ2Fubm90YXRpb25FZGl0b3JIaWRkZW4nIGV2ZW50IGFuZCByZXNldHMgdGhlIEBpZ25vcmVNb3VzZXVwXG4gICMgcHJvcGVydHkgdG8gYWxsb3cgbGlzdGVuaW5nIHRvIG1vdXNlIGV2ZW50cy5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgb25FZGl0b3JIaWRlOiA9PlxuICAgIHRoaXMucHVibGlzaCgnYW5ub3RhdGlvbkVkaXRvckhpZGRlbicsIFtAZWRpdG9yXSlcbiAgICBAaWdub3JlTW91c2V1cCA9IGZhbHNlXG5cbiAgIyBDYWxsYmFjayBtZXRob2QgY2FsbGVkIHdoZW4gdGhlIEBlZGl0b3IgZmlyZXMgdGhlIFwic2F2ZVwiIGV2ZW50LiBJdHNlbGZcbiAgIyBwdWJsaXNoZXMgdGhlICdhbm5vdGF0aW9uRWRpdG9yU3VibWl0JyBldmVudCBhbmQgY3JlYXRlcy91cGRhdGVzIHRoZVxuICAjIGVkaXRlZCBhbm5vdGF0aW9uLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBvbkVkaXRvclN1Ym1pdDogKGFubm90YXRpb24pID0+XG4gICAgdGhpcy5wdWJsaXNoKCdhbm5vdGF0aW9uRWRpdG9yU3VibWl0JywgW0BlZGl0b3IsIGFubm90YXRpb25dKVxuXG4gICMgUHVibGljOiBMb2FkcyB0aGUgQHZpZXdlciB3aXRoIGFuIEFycmF5IG9mIGFubm90YXRpb25zIGFuZCBwb3NpdGlvbnMgaXRcbiAgIyBhdCB0aGUgbG9jYXRpb24gcHJvdmlkZWQuIENhbGxzIHRoZSAnYW5ub3RhdGlvblZpZXdlclNob3duJyBldmVudC5cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBBcnJheSBvZiBhbm5vdGF0aW9ucyB0byBsb2FkIGludG8gdGhlIHZpZXdlci5cbiAgIyBsb2NhdGlvbiAgIC0gUG9zaXRpb24gdG8gc2V0IHRoZSBWaWV3ZXIgaW4gdGhlIGZvcm0ge3RvcDogeSwgbGVmdDogeH1cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGFubm90YXRvci5zaG93Vmlld2VyKFxuICAjICAgIFt7dGV4dDogXCJteSBjb21tZW50XCJ9LCB7dGV4dDogXCJteSBvdGhlciBjb21tZW50XCJ9XSxcbiAgIyAgICB7dG9wOiAzNCwgbGVmdDogMjM0fSlcbiAgIyAgIClcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIHRvIGFsbG93IGNoYWluaW5nLlxuICBzaG93Vmlld2VyOiAoYW5ub3RhdGlvbnMsIGxvY2F0aW9uKSA9PlxuICAgIEB2aWV3ZXIuZWxlbWVudC5jc3MobG9jYXRpb24pXG4gICAgQHZpZXdlci5sb2FkKGFubm90YXRpb25zKVxuXG4gICAgdGhpcy5wdWJsaXNoKCdhbm5vdGF0aW9uVmlld2VyU2hvd24nLCBbQHZpZXdlciwgYW5ub3RhdGlvbnNdKVxuXG4gICMgQW5ub3RhdG9yI2VsZW1lbnQgZXZlbnQgY2FsbGJhY2suIEFsbG93cyAyNTBtcyBmb3IgbW91c2UgcG9pbnRlciB0byBnZXQgZnJvbVxuICAjIGFubm90YXRpb24gaGlnaGxpZ2h0IHRvIEB2aWV3ZXIgdG8gbWFuaXB1bGF0ZSBhbm5vdGF0aW9ucy4gSWYgdGltZXIgZXhwaXJlc1xuICAjIHRoZSBAdmlld2VyIGlzIGhpZGRlbi5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgc3RhcnRWaWV3ZXJIaWRlVGltZXI6ID0+XG4gICAgIyBEb24ndCBkbyB0aGlzIGlmIHRpbWVyIGhhcyBhbHJlYWR5IGJlZW4gc2V0IGJ5IGFub3RoZXIgYW5ub3RhdGlvbi5cbiAgICBpZiBub3QgQHZpZXdlckhpZGVUaW1lclxuICAgICAgQHZpZXdlckhpZGVUaW1lciA9IHNldFRpbWVvdXQgQHZpZXdlci5oaWRlLCAyNTBcblxuICAjIFZpZXdlciNlbGVtZW50IGV2ZW50IGNhbGxiYWNrLiBDbGVhcnMgdGhlIHRpbWVyIHNldCBieVxuICAjIEFubm90YXRvciNzdGFydFZpZXdlckhpZGVUaW1lcigpIHdoZW4gdGhlIEB2aWV3ZXIgaXMgbW91c2VkIG92ZXIuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIGNsZWFyVmlld2VySGlkZVRpbWVyOiAoKSA9PlxuICAgIGNsZWFyVGltZW91dChAdmlld2VySGlkZVRpbWVyKVxuICAgIEB2aWV3ZXJIaWRlVGltZXIgPSBmYWxzZVxuXG4gICMgQW5ub3RhdG9yI2VsZW1lbnQgY2FsbGJhY2suIFNldHMgdGhlIEBtb3VzZUlzRG93biBwcm9wZXJ0eSB1c2VkIHRvXG4gICMgZGV0ZXJtaW5lIGlmIGEgc2VsZWN0aW9uIG1heSBoYXZlIHN0YXJ0ZWQgdG8gdHJ1ZS4gQWxzbyBjYWxsc1xuICAjIEFubm90YXRvciNzdGFydFZpZXdlckhpZGVUaW1lcigpIHRvIGhpZGUgdGhlIEFubm90YXRvciN2aWV3ZXIuXG4gICNcbiAgIyBldmVudCAtIEEgbW91c2Vkb3duIEV2ZW50IG9iamVjdC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgY2hlY2tGb3JTdGFydFNlbGVjdGlvbjogKGV2ZW50KSA9PlxuICAgIHVubGVzcyBldmVudCBhbmQgdGhpcy5pc0Fubm90YXRvcihldmVudC50YXJnZXQpXG4gICAgICB0aGlzLnN0YXJ0Vmlld2VySGlkZVRpbWVyKClcbiAgICBAbW91c2VJc0Rvd24gPSB0cnVlXG5cbiAgIyBBbm5vdGF0b3IjZWxlbWVudCBjYWxsYmFjay4gQ2hlY2tzIHRvIHNlZSBpZiBhIHNlbGVjdGlvbiBoYXMgYmVlbiBtYWRlXG4gICMgb24gbW91c2V1cCBhbmQgaWYgc28gZGlzcGxheXMgdGhlIEFubm90YXRvciNhZGRlci4gSWYgQGlnbm9yZU1vdXNldXAgaXNcbiAgIyBzZXQgd2lsbCBkbyBub3RoaW5nLiBBbHNvIHJlc2V0cyB0aGUgQG1vdXNlSXNEb3duIHByb3BlcnR5LlxuICAjXG4gICMgZXZlbnQgLSBBIG1vdXNldXAgRXZlbnQgb2JqZWN0LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBjaGVja0ZvckVuZFNlbGVjdGlvbjogKGV2ZW50KSA9PlxuICAgIEBtb3VzZUlzRG93biA9IGZhbHNlXG5cbiAgICAjIFRoaXMgcHJldmVudHMgdGhlIG5vdGUgaW1hZ2UgZnJvbSBqdW1waW5nIGF3YXkgb24gdGhlIG1vdXNldXBcbiAgICAjIG9mIGEgY2xpY2sgb24gaWNvbi5cbiAgICBpZiBAaWdub3JlTW91c2V1cFxuICAgICAgcmV0dXJuXG5cbiAgICAjIEdldCB0aGUgY3VycmVudGx5IHNlbGVjdGVkIHJhbmdlcy5cbiAgICBAc2VsZWN0ZWRSYW5nZXMgPSB0aGlzLmdldFNlbGVjdGVkUmFuZ2VzKClcblxuICAgIGZvciByYW5nZSBpbiBAc2VsZWN0ZWRSYW5nZXNcbiAgICAgIGNvbnRhaW5lciA9IHJhbmdlLmNvbW1vbkFuY2VzdG9yXG4gICAgICBpZiAkKGNvbnRhaW5lcikuaGFzQ2xhc3MoJ2Fubm90YXRvci1obCcpXG4gICAgICAgIGNvbnRhaW5lciA9ICQoY29udGFpbmVyKS5wYXJlbnRzKCdbY2xhc3MhPWFubm90YXRvci1obF0nKVswXVxuICAgICAgcmV0dXJuIGlmIHRoaXMuaXNBbm5vdGF0b3IoY29udGFpbmVyKVxuXG4gICAgaWYgZXZlbnQgYW5kIEBzZWxlY3RlZFJhbmdlcy5sZW5ndGhcbiAgICAgIEBhZGRlclxuICAgICAgICAuY3NzKFV0aWwubW91c2VQb3NpdGlvbihldmVudCwgQHdyYXBwZXJbMF0pKVxuICAgICAgICAuc2hvdygpXG4gICAgZWxzZVxuICAgICAgQGFkZGVyLmhpZGUoKVxuXG4gICMgUHVibGljOiBEZXRlcm1pbmVzIGlmIHRoZSBwcm92aWRlZCBlbGVtZW50IGlzIHBhcnQgb2YgdGhlIGFubm90YXRvciBwbHVnaW4uXG4gICMgVXNlZnVsIGZvciBpZ25vcmluZyBtb3VzZSBhY3Rpb25zIG9uIHRoZSBhbm5vdGF0b3IgZWxlbWVudHMuXG4gICMgTk9URTogVGhlIEB3cmFwcGVyIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGlzIGNoZWNrLlxuICAjXG4gICMgZWxlbWVudCAtIEFuIEVsZW1lbnQgb3IgVGV4dE5vZGUgdG8gY2hlY2suXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gICMgICBhbm5vdGF0b3IuaXNBbm5vdGF0b3Ioc3BhbikgIyA9PiBSZXR1cm5zIGZhbHNlXG4gICNcbiAgIyAgIGFubm90YXRvci5pc0Fubm90YXRvcihhbm5vdGF0b3Iudmlld2VyLmVsZW1lbnQpICMgPT4gUmV0dXJucyB0cnVlXG4gICNcbiAgIyBSZXR1cm5zIHRydWUgaWYgdGhlIGVsZW1lbnQgaXMgYSBjaGlsZCBvZiBhbiBhbm5vdGF0b3IgZWxlbWVudC5cbiAgaXNBbm5vdGF0b3I6IChlbGVtZW50KSAtPlxuICAgICEhJChlbGVtZW50KS5wYXJlbnRzKCkuYWRkQmFjaygpLmZpbHRlcignW2NsYXNzXj1hbm5vdGF0b3ItXScpLm5vdChAd3JhcHBlcikubGVuZ3RoXG5cbiAgY29uZmlndXJlOiAoQHJlZ2lzdHJ5KSAtPlxuICAgIHJlZ2lzdHJ5LmluY2x1ZGUoQW5ub3RhdGlvblByb3ZpZGVyKVxuXG4gIHJ1bjogKEByZWdpc3RyeSkgLT5cbiAgICAjIFNldCB1cCB0aGUgY29yZSBpbnRlcmZhY2UgY29tcG9uZW50c1xuICAgIHRoaXMuX3NldHVwRG9jdW1lbnRFdmVudHMoKSB1bmxlc3MgQG9wdGlvbnMucmVhZE9ubHlcbiAgICB0aGlzLl9zZXR1cFdyYXBwZXIoKS5fc2V0dXBWaWV3ZXIoKS5fc2V0dXBFZGl0b3IoKVxuICAgIHRoaXMuX3NldHVwRHluYW1pY1N0eWxlKClcblxuICAgICMgQ3JlYXRlIGFkZGVyXG4gICAgdGhpcy5hZGRlciA9ICQodGhpcy5odG1sLmFkZGVyKS5hcHBlbmRUbyhAd3JhcHBlcikuaGlkZSgpXG5cbiAgICAjIERvIGluaXRpYWwgbG9hZFxuICAgIGlmIEBvcHRpb25zLmxvYWRRdWVyeSB0aGVuIHRoaXMubG9hZChAb3B0aW9ucy5sb2FkUXVlcnkpXG5cbiAgIyBBbm5vdGF0b3IjZWxlbWVudCBjYWxsYmFjay4gRGlzcGxheXMgdmlld2VyIHdpdGggYWxsIGFubm90YXRpb25zXG4gICMgYXNzb2NpYXRlZCB3aXRoIGhpZ2hsaWdodCBFbGVtZW50cyB1bmRlciB0aGUgY3Vyc29yLlxuICAjXG4gICMgZXZlbnQgLSBBIG1vdXNlb3ZlciBFdmVudCBvYmplY3QuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIG9uSGlnaGxpZ2h0TW91c2VvdmVyOiAoZXZlbnQpID0+XG4gICAgIyBDYW5jZWwgYW55IHBlbmRpbmcgaGlkaW5nIG9mIHRoZSB2aWV3ZXIuXG4gICAgdGhpcy5jbGVhclZpZXdlckhpZGVUaW1lcigpXG5cbiAgICAjIERvbid0IGRvIGFueXRoaW5nIGlmIHdlJ3JlIG1ha2luZyBhIHNlbGVjdGlvbiBvclxuICAgICMgYWxyZWFkeSBkaXNwbGF5aW5nIHRoZSB2aWV3ZXJcbiAgICByZXR1cm4gZmFsc2UgaWYgQG1vdXNlSXNEb3duIG9yIEB2aWV3ZXIuaXNTaG93bigpXG5cbiAgICBhbm5vdGF0aW9ucyA9ICQoZXZlbnQudGFyZ2V0KVxuICAgICAgLnBhcmVudHMoJy5hbm5vdGF0b3ItaGwnKVxuICAgICAgLmFkZEJhY2soKVxuICAgICAgLm1hcCAtPiByZXR1cm4gJCh0aGlzKS5kYXRhKFwiYW5ub3RhdGlvblwiKVxuXG4gICAgdGhpcy5zaG93Vmlld2VyKCQubWFrZUFycmF5KGFubm90YXRpb25zKSwgVXRpbC5tb3VzZVBvc2l0aW9uKGV2ZW50LCBAd3JhcHBlclswXSkpXG5cbiAgIyBBbm5vdGF0b3IjZWxlbWVudCBjYWxsYmFjay4gU2V0cyBAaWdub3JlTW91c2V1cCB0byB0cnVlIHRvIHByZXZlbnRcbiAgIyB0aGUgYW5ub3RhdGlvbiBzZWxlY3Rpb24gZXZlbnRzIGZpcmluZyB3aGVuIHRoZSBhZGRlciBpcyBjbGlja2VkLlxuICAjXG4gICMgZXZlbnQgLSBBIG1vdXNlZG93biBFdmVudCBvYmplY3RcbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgb25BZGRlck1vdXNlZG93bjogKGV2ZW50KSA9PlxuICAgIGV2ZW50Py5wcmV2ZW50RGVmYXVsdCgpXG4gICAgQGlnbm9yZU1vdXNldXAgPSB0cnVlXG5cbiAgIyBBbm5vdGF0b3IjZWxlbWVudCBjYWxsYmFjay4gRGlzcGxheXMgdGhlIEBlZGl0b3IgaW4gcGxhY2Ugb2YgdGhlIEBhZGRlciBhbmRcbiAgIyBsb2FkcyBpbiBhIG5ld2x5IGNyZWF0ZWQgYW5ub3RhdGlvbiBPYmplY3QuIFRoZSBjbGljayBldmVudCBpcyB1c2VkIGFzIHdlbGxcbiAgIyBhcyB0aGUgbW91c2Vkb3duIHNvIHRoYXQgd2UgZ2V0IHRoZSA6YWN0aXZlIHN0YXRlIG9uIHRoZSBAYWRkZXIgd2hlbiBjbGlja2VkXG4gICNcbiAgIyBldmVudCAtIEEgbW91c2Vkb3duIEV2ZW50IG9iamVjdFxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBvbkFkZGVyQ2xpY2s6IChldmVudCkgPT5cbiAgICBldmVudD8ucHJldmVudERlZmF1bHQoKVxuXG4gICAgIyBIaWRlIHRoZSBhZGRlclxuICAgIHBvc2l0aW9uID0gQGFkZGVyLnBvc2l0aW9uKClcbiAgICBAYWRkZXIuaGlkZSgpXG4gICAgYW5ub3RhdGlvbiA9IHtyYW5nZXM6IEBzZWxlY3RlZFJhbmdlc31cblxuICAgICQud2hlbihhbm5vdGF0aW9uKVxuXG4gICAgICAuZG9uZSAoYW5ub3RhdGlvbikgPT5cbiAgICAgICAgdGhpcy5wdWJsaXNoKCdiZWZvcmVBbm5vdGF0aW9uQ3JlYXRlZCcsIFthbm5vdGF0aW9uXSlcblxuICAgICAgIyBTZXQgdXAgdGhlIGFubm90YXRpb25cbiAgICAgIC50aGVuIChhbm5vdGF0aW9uKSA9PlxuICAgICAgICB0aGlzLnNldHVwQW5ub3RhdGlvbihhbm5vdGF0aW9uKVxuXG4gICAgICAjIFNob3cgYSB0ZW1wb3JhcnkgaGlnaGxpZ2h0IHNvIHRoZSB1c2VyIGNhbiBzZWUgd2hhdCB0aGV5IHNlbGVjdGVkXG4gICAgICAuZG9uZSAoYW5ub3RhdGlvbikgPT5cbiAgICAgICAgJChhbm5vdGF0aW9uLl9sb2NhbC5oaWdobGlnaHRzKS5hZGRDbGFzcygnYW5ub3RhdG9yLWhsLXRlbXBvcmFyeScpXG5cbiAgICAgICMgRWRpdCB0aGUgYW5ub3RhdGlvblxuICAgICAgLnRoZW4gKGFubm90YXRpb24pID0+XG4gICAgICAgIHRoaXMuZWRpdEFubm90YXRpb24oYW5ub3RhdGlvbiwgcG9zaXRpb24pXG4gICAgICAudGhlbiAoYW5ub3RhdGlvbikgPT5cbiAgICAgICAgdGhpcy5hbm5vdGF0aW9ucy5jcmVhdGUoYW5ub3RhdGlvbilcbiAgICAgICAgICAjIEhhbmRsZSBzdG9yYWdlIGVycm9yc1xuICAgICAgICAgIC5mYWlsKGhhbmRsZUVycm9yKVxuXG4gICAgICAjIENsZWFuIHVwIHRoZSBoaWdobGlnaHRzXG4gICAgICAuZG9uZSAoYW5ub3RhdGlvbikgPT5cbiAgICAgICAgJChhbm5vdGF0aW9uLl9sb2NhbC5oaWdobGlnaHRzKS5yZW1vdmVDbGFzcygnYW5ub3RhdG9yLWhsLXRlbXBvcmFyeScpXG5cbiAgICAgIC5kb25lIChhbm5vdGF0aW9uKSA9PlxuICAgICAgICB0aGlzLnB1Ymxpc2goJ2Fubm90YXRpb25DcmVhdGVkJywgW2Fubm90YXRpb25dKVxuXG4gICAgICAjIENsZWFuIHVwIChpZiwgZm9yIGV4YW1wbGUsIGVkaXRpbmcgd2FzIGNhbmNlbGxlZCwgb3Igc3RvcmFnZSBmYWlsZWQpXG4gICAgICAuZmFpbCh0aGlzLmNsZWFudXBBbm5vdGF0aW9uKVxuXG4gICMgQW5ub3RhdG9yI3ZpZXdlciBjYWxsYmFjayBmdW5jdGlvbi4gRGlzcGxheXMgdGhlIEFubm90YXRvciNlZGl0b3IgaW4gdGhlXG4gICMgcG9zaXRpb25zIG9mIHRoZSBBbm5vdGF0b3Ijdmlld2VyIGFuZCBsb2FkcyB0aGUgcGFzc2VkIGFubm90YXRpb24gZm9yXG4gICMgZWRpdGluZy5cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdCBmb3IgZWRpdGluZy5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgb25FZGl0QW5ub3RhdGlvbjogKGFubm90YXRpb24pID0+XG4gICAgcG9zaXRpb24gPSBAdmlld2VyLmVsZW1lbnQucG9zaXRpb24oKVxuICAgIEB2aWV3ZXIuaGlkZSgpXG5cbiAgICAkLndoZW4oYW5ub3RhdGlvbilcblxuICAgICAgLmRvbmUgKGFubm90YXRpb24pID0+XG4gICAgICAgIHRoaXMucHVibGlzaCgnYmVmb3JlQW5ub3RhdGlvblVwZGF0ZWQnLCBbYW5ub3RhdGlvbl0pXG5cbiAgICAgIC50aGVuIChhbm5vdGF0aW9uKSA9PlxuICAgICAgICB0aGlzLmVkaXRBbm5vdGF0aW9uKGFubm90YXRpb24sIHBvc2l0aW9uKVxuICAgICAgLnRoZW4gKGFubm90YXRpb24pID0+XG4gICAgICAgIHRoaXMuYW5ub3RhdGlvbnMudXBkYXRlKGFubm90YXRpb24pXG4gICAgICAgICAgIyBIYW5kbGUgc3RvcmFnZSBlcnJvcnNcbiAgICAgICAgICAuZmFpbChoYW5kbGVFcnJvcilcblxuICAgICAgLmRvbmUgKGFubm90YXRpb24pID0+XG4gICAgICAgIHRoaXMucHVibGlzaCgnYW5ub3RhdGlvblVwZGF0ZWQnLCBbYW5ub3RhdGlvbl0pXG5cbiMgQ3JlYXRlIG5hbWVzcGFjZSBmb3IgQW5ub3RhdG9yIHBsdWdpbnNcbmNsYXNzIEFubm90YXRvci5QbHVnaW4gZXh0ZW5kcyBEZWxlZ2F0b3JcbiAgY29uc3RydWN0b3I6IChlbGVtZW50LCBvcHRpb25zKSAtPlxuICAgIHN1cGVyXG5cbiAgcGx1Z2luSW5pdDogLT5cblxuICBkZXN0cm95OiAtPlxuICAgIHRoaXMucmVtb3ZlRXZlbnRzKClcblxuIyBTbmlmZiB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCBhbmQgYXR0ZW1wdCB0byBhZGQgbWlzc2luZyBmdW5jdGlvbmFsaXR5LlxuZyA9IFV0aWwuZ2V0R2xvYmFsKClcblxuaWYgbm90IGcuZG9jdW1lbnQ/LmV2YWx1YXRlP1xuICAkLmdldFNjcmlwdCgnaHR0cDovL2Fzc2V0cy5hbm5vdGF0ZWl0Lm9yZy92ZW5kb3IveHBhdGgubWluLmpzJylcblxuaWYgbm90IGcuZ2V0U2VsZWN0aW9uP1xuICAkLmdldFNjcmlwdCgnaHR0cDovL2Fzc2V0cy5hbm5vdGF0ZWl0Lm9yZy92ZW5kb3IvaWVyYW5nZS5taW4uanMnKVxuXG5pZiBub3QgZy5KU09OP1xuICAkLmdldFNjcmlwdCgnaHR0cDovL2Fzc2V0cy5hbm5vdGF0ZWl0Lm9yZy92ZW5kb3IvanNvbjIubWluLmpzJylcblxuIyBFbnN1cmUgdGhlIE5vZGUgY29uc3RhbnRzIGFyZSBkZWZpbmVkXG5pZiBub3QgZy5Ob2RlP1xuICBnLk5vZGUgPVxuICAgIEVMRU1FTlRfTk9ERSAgICAgICAgICAgICAgICA6ICAxXG4gICAgQVRUUklCVVRFX05PREUgICAgICAgICAgICAgIDogIDJcbiAgICBURVhUX05PREUgICAgICAgICAgICAgICAgICAgOiAgM1xuICAgIENEQVRBX1NFQ1RJT05fTk9ERSAgICAgICAgICA6ICA0XG4gICAgRU5USVRZX1JFRkVSRU5DRV9OT0RFICAgICAgIDogIDVcbiAgICBFTlRJVFlfTk9ERSAgICAgICAgICAgICAgICAgOiAgNlxuICAgIFBST0NFU1NJTkdfSU5TVFJVQ1RJT05fTk9ERSA6ICA3XG4gICAgQ09NTUVOVF9OT0RFICAgICAgICAgICAgICAgIDogIDhcbiAgICBET0NVTUVOVF9OT0RFICAgICAgICAgICAgICAgOiAgOVxuICAgIERPQ1VNRU5UX1RZUEVfTk9ERSAgICAgICAgICA6IDEwXG4gICAgRE9DVU1FTlRfRlJBR01FTlRfTk9ERSAgICAgIDogMTFcbiAgICBOT1RBVElPTl9OT0RFICAgICAgICAgICAgICAgOiAxMlxuXG5cbiMgRXhwb3J0IG90aGVyIG1vZHVsZXMgZm9yIHVzZSBpbiBwbHVnaW5zLlxuQW5ub3RhdG9yLkRlbGVnYXRvciA9IERlbGVnYXRvclxuQW5ub3RhdG9yLlJhbmdlID0gUmFuZ2VcbkFubm90YXRvci5VdGlsID0gVXRpbFxuQW5ub3RhdG9yLldpZGdldCA9IFdpZGdldFxuQW5ub3RhdG9yLlZpZXdlciA9IFZpZXdlclxuQW5ub3RhdG9yLkVkaXRvciA9IEVkaXRvclxuQW5ub3RhdG9yLk5vdGlmaWNhdGlvbiA9IE5vdGlmaWNhdGlvblxuXG4jIEF0dGFjaCBub3RpZmljYXRpb24gbWV0aG9kcyB0byB0aGUgQW5ub3RhdGlvbiBvYmplY3Rcbm5vdGlmaWNhdGlvbiA9IG5ldyBOb3RpZmljYXRpb25cbkFubm90YXRvci5zaG93Tm90aWZpY2F0aW9uID0gbm90aWZpY2F0aW9uLnNob3dcbkFubm90YXRvci5oaWRlTm90aWZpY2F0aW9uID0gbm90aWZpY2F0aW9uLmhpZGVcblxuIyBFeHBvc2UgYSBnbG9iYWwgaW5zdGFuY2UgcmVnaXN0cnlcbkFubm90YXRvci5faW5zdGFuY2VzID0gW11cblxuIyBCaW5kIGdldHRleHQgaGVscGVyIHNvIHBsdWdpbnMgY2FuIHVzZSBsb2NhbGlzYXRpb24uXG5Bbm5vdGF0b3IuX3QgPSBfdFxuXG4jIFJldHVybnMgdHJ1ZSBpZiB0aGUgQW5ub3RhdG9yIGNhbiBiZSB1c2VkIGluIHRoZSBjdXJyZW50IGJyb3dzZXIuXG5Bbm5vdGF0b3Iuc3VwcG9ydGVkID0gLT4gKC0+ICEhdGhpcy5nZXRTZWxlY3Rpb24pKClcblxuIyBSZXN0b3JlcyB0aGUgQW5ub3RhdG9yIHByb3BlcnR5IG9uIHRoZSBnbG9iYWwgb2JqZWN0IHRvIGl0J3NcbiMgcHJldmlvdXMgdmFsdWUgYW5kIHJldHVybnMgdGhlIEFubm90YXRvci5cbkFubm90YXRvci5ub0NvbmZsaWN0ID0gLT5cbiAgVXRpbC5nZXRHbG9iYWwoKS5Bbm5vdGF0b3IgPSBfQW5ub3RhdG9yXG4gIHRoaXNcblxuIyBDcmVhdGUgZ2xvYmFsIGFjY2VzcyBmb3IgQW5ub3RhdG9yXG4kLmZuLmFubm90YXRvciA9IChvcHRpb25zKSAtPlxuICBhcmdzID0gQXJyYXk6OnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICB0aGlzLmVhY2ggLT5cbiAgICAjIGNoZWNrIHRoZSBkYXRhKCkgY2FjaGUsIGlmIGl0J3MgdGhlcmUgd2UnbGwgY2FsbCB0aGUgbWV0aG9kIHJlcXVlc3RlZFxuICAgIGluc3RhbmNlID0gJC5kYXRhKHRoaXMsICdhbm5vdGF0b3InKVxuICAgIGlmIGluc3RhbmNlXG4gICAgICBvcHRpb25zICYmIGluc3RhbmNlW29wdGlvbnNdLmFwcGx5KGluc3RhbmNlLCBhcmdzKVxuICAgIGVsc2VcbiAgICAgIGluc3RhbmNlID0gbmV3IEFubm90YXRvcih0aGlzLCBvcHRpb25zKVxuICAgICAgJC5kYXRhKHRoaXMsICdhbm5vdGF0b3InLCBpbnN0YW5jZSlcblxuXG4jIEV4cG9ydCBBbm5vdGF0b3Igb2JqZWN0LlxubW9kdWxlLmV4cG9ydHMgPSBBbm5vdGF0b3JcbiIsIlV0aWwgPSByZXF1aXJlICcuL3V0aWwnXG5cblxuIyBQdWJsaWM6IERlbGVnYXRvciBpcyB0aGUgYmFzZSBjbGFzcyB0aGF0IGFsbCBvZiBBbm5vdGF0b3JzIG9iamVjdHMgaW5oZXJpdFxuIyBmcm9tLiBJdCBwcm92aWRlcyBiYXNpYyBmdW5jdGlvbmFsaXR5IHN1Y2ggYXMgaW5zdGFuY2Ugb3B0aW9ucywgZXZlbnRcbiMgZGVsZWdhdGlvbiBhbmQgcHViL3N1YiBtZXRob2RzLlxuY2xhc3MgRGVsZWdhdG9yXG4gICMgUHVibGljOiBFdmVudHMgb2JqZWN0LiBUaGlzIGNvbnRhaW5zIGEga2V5L3BhaXIgaGFzaCBvZiBldmVudHMvbWV0aG9kcyB0aGF0XG4gICMgc2hvdWxkIGJlIGJvdW5kLiBTZWUgRGVsZWdhdG9yI2FkZEV2ZW50cygpIGZvciB1c2FnZS5cbiAgZXZlbnRzOiB7fVxuXG4gICMgUHVibGljOiBPcHRpb25zIG9iamVjdC4gRXh0ZW5kZWQgb24gaW5pdGlhbGlzYXRpb24uXG4gIG9wdGlvbnM6IHt9XG5cbiAgIyBBIGpRdWVyeSBvYmplY3Qgd3JhcHBpbmcgdGhlIERPTSBFbGVtZW50IHByb3ZpZGVkIG9uIGluaXRpYWxpc2F0aW9uLlxuICBlbGVtZW50OiBudWxsXG5cbiAgIyBQdWJsaWM6IENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRoYXQgc2V0cyB1cCB0aGUgaW5zdGFuY2UuIEJpbmRzIHRoZSBAZXZlbnRzXG4gICMgaGFzaCBhbmQgZXh0ZW5kcyB0aGUgQG9wdGlvbnMgb2JqZWN0LlxuICAjXG4gICMgZWxlbWVudCAtIFRoZSBET00gZWxlbWVudCB0aGF0IHRoaXMgaW50YW5jZSByZXByZXNlbnRzLlxuICAjIG9wdGlvbnMgLSBBbiBPYmplY3QgbGl0ZXJhbCBvZiBvcHRpb25zLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgZWxlbWVudCAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbXktZWxlbWVudCcpXG4gICMgICBpbnN0YW5jZSA9IG5ldyBEZWxlZ2F0b3IoZWxlbWVudCwge1xuICAjICAgICBvcHRpb246ICdteS1vcHRpb24nXG4gICMgICB9KVxuICAjXG4gICMgUmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiBEZWxlZ2F0b3IuXG4gIGNvbnN0cnVjdG9yOiAoZWxlbWVudCwgb3B0aW9ucykgLT5cbiAgICBAb3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBAb3B0aW9ucywgb3B0aW9ucylcbiAgICBAZWxlbWVudCA9ICQoZWxlbWVudClcblxuICAgICMgRGVsZWdhdG9yIGNyZWF0ZXMgY2xvc3VyZXMgZm9yIGVhY2ggZXZlbnQgaXQgYmluZHMuIFRoaXMgaXMgYSBwcml2YXRlXG4gICAgIyByZWdpc3RyeSBvZiBjcmVhdGVkIGNsb3N1cmVzLCB1c2VkIHRvIGVuYWJsZSBldmVudCB1bmJpbmRpbmcuXG4gICAgQF9jbG9zdXJlcyA9IHt9XG5cbiAgICB0aGlzLmFkZEV2ZW50cygpXG5cbiAgIyBQdWJsaWM6IGJpbmRzIHRoZSBmdW5jdGlvbiBuYW1lcyBpbiB0aGUgQGV2ZW50cyBPYmplY3QgdG8gdGhlaXIgZXZlbnRzLlxuICAjXG4gICMgVGhlIEBldmVudHMgT2JqZWN0IHNob3VsZCBiZSBhIHNldCBvZiBrZXkvdmFsdWUgcGFpcnMgd2hlcmUgdGhlIGtleSBpcyB0aGVcbiAgIyBldmVudCBuYW1lIHdpdGggb3B0aW9uYWwgQ1NTIHNlbGVjdG9yLiBUaGUgdmFsdWUgc2hvdWxkIGJlIGEgU3RyaW5nIG1ldGhvZFxuICAjIG5hbWUgb24gdGhlIGN1cnJlbnQgY2xhc3MuXG4gICNcbiAgIyBUaGlzIGlzIGNhbGxlZCBieSB0aGUgZGVmYXVsdCBEZWxlZ2F0b3IgY29uc3RydWN0b3IgYW5kIHNvIHNob3VsZG4ndCB1c3VhbGx5XG4gICMgbmVlZCB0byBiZSBjYWxsZWQgYnkgdGhlIHVzZXIuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIFRoaXMgd2lsbCBiaW5kIHRoZSBjbGlja2VkRWxlbWVudCgpIG1ldGhvZCB0byB0aGUgY2xpY2sgZXZlbnQgb24gQGVsZW1lbnQuXG4gICMgICBAb3B0aW9ucyA9IHtcImNsaWNrXCI6IFwiY2xpY2tlZEVsZW1lbnRcIn1cbiAgI1xuICAjICAgIyBUaGlzIHdpbGwgZGVsZWdhdGUgdGhlIHN1Ym1pdEZvcm0oKSBtZXRob2QgdG8gdGhlIHN1Ym1pdCBldmVudCBvbiB0aGVcbiAgIyAgICMgZm9ybSB3aXRoaW4gdGhlIEBlbGVtZW50LlxuICAjICAgQG9wdGlvbnMgPSB7XCJmb3JtIHN1Ym1pdFwiOiBcInN1Ym1pdEZvcm1cIn1cbiAgI1xuICAjICAgIyBUaGlzIHdpbGwgYmluZCB0aGUgdXBkYXRlQW5ub3RhdGlvblN0b3JlKCkgbWV0aG9kIHRvIHRoZSBjdXN0b21cbiAgIyAgICMgYW5ub3RhdGlvbjpzYXZlIGV2ZW50LiBOT1RFOiBCZWNhdXNlIHRoaXMgaXMgYSBjdXN0b20gZXZlbnQgdGhlXG4gICMgICAjIERlbGVnYXRvciNzdWJzY3JpYmUoKSBtZXRob2Qgd2lsbCBiZSB1c2VkIGFuZCB1cGRhdGVBbm5vdGF0aW9uU3RvcmUoKVxuICAjICAgIyB3aWxsIG5vdCByZWNpZXZlIGFuIGV2ZW50IHBhcmFtZXRlciBsaWtlIHRoZSBwcmV2aW91cyB0d28gZXhhbXBsZXMuXG4gICMgICBAb3B0aW9ucyA9IHtcImFubm90YXRpb246c2F2ZVwiOiBcInVwZGF0ZUFubm90YXRpb25TdG9yZVwifVxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBhZGRFdmVudHM6IC0+XG4gICAgZm9yIGV2ZW50IGluIERlbGVnYXRvci5fcGFyc2VFdmVudHMoQGV2ZW50cylcbiAgICAgIHRoaXMuX2FkZEV2ZW50KGV2ZW50LnNlbGVjdG9yLCBldmVudC5ldmVudCwgZXZlbnQuZnVuY3Rpb25OYW1lKVxuXG4gICMgUHVibGljOiB1bmJpbmRzIGZ1bmN0aW9ucyBwcmV2aW91c2x5IGJvdW5kIHRvIGV2ZW50cyBieSBhZGRFdmVudHMoKS5cbiAgI1xuICAjIFRoZSBAZXZlbnRzIE9iamVjdCBzaG91bGQgYmUgYSBzZXQgb2Yga2V5L3ZhbHVlIHBhaXJzIHdoZXJlIHRoZSBrZXkgaXMgdGhlXG4gICMgZXZlbnQgbmFtZSB3aXRoIG9wdGlvbmFsIENTUyBzZWxlY3Rvci4gVGhlIHZhbHVlIHNob3VsZCBiZSBhIFN0cmluZyBtZXRob2RcbiAgIyBuYW1lIG9uIHRoZSBjdXJyZW50IGNsYXNzLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICByZW1vdmVFdmVudHM6IC0+XG4gICAgZm9yIGV2ZW50IGluIERlbGVnYXRvci5fcGFyc2VFdmVudHMoQGV2ZW50cylcbiAgICAgIHRoaXMuX3JlbW92ZUV2ZW50KGV2ZW50LnNlbGVjdG9yLCBldmVudC5ldmVudCwgZXZlbnQuZnVuY3Rpb25OYW1lKVxuXG4gICMgQmluZHMgYW4gZXZlbnQgdG8gYSBjYWxsYmFjayBmdW5jdGlvbiByZXByZXNlbnRlZCBieSBhIFN0cmluZy4gQSBzZWxlY3RvclxuICAjIGNhbiBiZSBwcm92aWRlZCBpbiBvcmRlciB0byB3YXRjaCBmb3IgZXZlbnRzIG9uIGEgY2hpbGQgZWxlbWVudC5cbiAgI1xuICAjIFRoZSBldmVudCBjYW4gYmUgYW55IHN0YW5kYXJkIGV2ZW50IHN1cHBvcnRlZCBieSBqUXVlcnkgb3IgYSBjdXN0b20gU3RyaW5nLlxuICAjIElmIGEgY3VzdG9tIHN0cmluZyBpcyB1c2VkIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB3aWxsIG5vdCByZWNlaXZlIGFuIGV2ZW50XG4gICMgb2JqZWN0IGFzIGl0cyBmaXJzdCBwYXJhbWV0ZXIuXG4gICNcbiAgIyBzZWxlY3RvciAgICAgLSBTZWxlY3RvciBTdHJpbmcgbWF0Y2hpbmcgY2hpbGQgZWxlbWVudHMuIChkZWZhdWx0OiAnJylcbiAgIyBldmVudCAgICAgICAgLSBUaGUgZXZlbnQgdG8gbGlzdGVuIGZvci5cbiAgIyBmdW5jdGlvbk5hbWUgLSBBIFN0cmluZyBmdW5jdGlvbiBuYW1lIHRvIGJpbmQgdG8gdGhlIGV2ZW50LlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBMaXN0ZW5zIGZvciBhbGwgY2xpY2sgZXZlbnRzIG9uIGluc3RhbmNlLmVsZW1lbnQuXG4gICMgICBpbnN0YW5jZS5fYWRkRXZlbnQoJycsICdjbGljaycsICdvbkNsaWNrJylcbiAgI1xuICAjICAgIyBEZWxlZ2F0ZXMgdGhlIGluc3RhbmNlLm9uSW5wdXRGb2N1cygpIG1ldGhvZCB0byBmb2N1cyBldmVudHMgb24gYWxsXG4gICMgICAjIGZvcm0gaW5wdXRzIHdpdGhpbiBpbnN0YW5jZS5lbGVtZW50LlxuICAjICAgaW5zdGFuY2UuX2FkZEV2ZW50KCdmb3JtIDppbnB1dCcsICdmb2N1cycsICdvbklucHV0Rm9jdXMnKVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYuXG4gIF9hZGRFdmVudDogKHNlbGVjdG9yLCBldmVudCwgZnVuY3Rpb25OYW1lKSAtPlxuICAgIGNsb3N1cmUgPSA9PiB0aGlzW2Z1bmN0aW9uTmFtZV0uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuXG4gICAgaWYgc2VsZWN0b3IgPT0gJycgYW5kIERlbGVnYXRvci5faXNDdXN0b21FdmVudChldmVudClcbiAgICAgIHRoaXMuc3Vic2NyaWJlKGV2ZW50LCBjbG9zdXJlKVxuICAgIGVsc2VcbiAgICAgIEBlbGVtZW50LmRlbGVnYXRlKHNlbGVjdG9yLCBldmVudCwgY2xvc3VyZSlcblxuICAgIEBfY2xvc3VyZXNbXCIje3NlbGVjdG9yfS8je2V2ZW50fS8je2Z1bmN0aW9uTmFtZX1cIl0gPSBjbG9zdXJlXG5cbiAgICB0aGlzXG5cbiAgIyBVbmJpbmRzIGEgZnVuY3Rpb24gcHJldmlvdXNseSBib3VuZCB0byBhbiBldmVudCBieSB0aGUgX2FkZEV2ZW50IG1ldGhvZC5cbiAgI1xuICAjIFRha2VzIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyBfYWRkRXZlbnQoKSwgYW5kIGFuIGV2ZW50IHdpbGwgb25seSBiZVxuICAjIHN1Y2Nlc3NmdWxseSB1bmJvdW5kIGlmIHRoZSBhcmd1bWVudHMgdG8gcmVtb3ZlRXZlbnQoKSBhcmUgZXhhY3RseSB0aGUgc2FtZVxuICAjIGFzIHRoZSBvcmlnaW5hbCBhcmd1bWVudHMgdG8gX2FkZEV2ZW50KCkuIFRoaXMgd291bGQgdXN1YWxseSBiZSBjYWxsZWQgYnlcbiAgIyBfcmVtb3ZlRXZlbnRzKCkuXG4gICNcbiAgIyBzZWxlY3RvciAgICAgLSBTZWxlY3RvciBTdHJpbmcgbWF0Y2hpbmcgY2hpbGQgZWxlbWVudHMuIChkZWZhdWx0OiAnJylcbiAgIyBldmVudCAgICAgICAgLSBUaGUgZXZlbnQgdG8gbGlzdGVuIGZvci5cbiAgIyBmdW5jdGlvbk5hbWUgLSBBIFN0cmluZyBmdW5jdGlvbiBuYW1lIHRvIGJpbmQgdG8gdGhlIGV2ZW50LlxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYuXG4gIF9yZW1vdmVFdmVudDogKHNlbGVjdG9yLCBldmVudCwgZnVuY3Rpb25OYW1lKSAtPlxuICAgIGNsb3N1cmUgPSBAX2Nsb3N1cmVzW1wiI3tzZWxlY3Rvcn0vI3tldmVudH0vI3tmdW5jdGlvbk5hbWV9XCJdXG5cbiAgICBpZiBzZWxlY3RvciA9PSAnJyBhbmQgRGVsZWdhdG9yLl9pc0N1c3RvbUV2ZW50KGV2ZW50KVxuICAgICAgdGhpcy51bnN1YnNjcmliZShldmVudCwgY2xvc3VyZSlcbiAgICBlbHNlXG4gICAgICBAZWxlbWVudC51bmRlbGVnYXRlKHNlbGVjdG9yLCBldmVudCwgY2xvc3VyZSlcblxuICAgIGRlbGV0ZSBAX2Nsb3N1cmVzW1wiI3tzZWxlY3Rvcn0vI3tldmVudH0vI3tmdW5jdGlvbk5hbWV9XCJdXG5cbiAgICB0aGlzXG5cbiAgIyBQdWJsaWM6IEZpcmVzIGFuIGV2ZW50IGFuZCBjYWxscyBhbGwgc3Vic2NyaWJlZCBjYWxsYmFja3Mgd2l0aCBwYXJhbWV0ZXJzXG4gICMgcHJvdmlkZWQuIFRoaXMgaXMgZXNzZW50aWFsbHkgYW4gYWxpYXMgdG8gQmFja2JvbmUuRXZlbnRzIC50cmlnZ2VyKClcbiAgIyBleGNlcHQgdGhhdCB0aGUgYXJndW1lbnRzIGFyZSBwYXNzZWQgaW4gYW4gQXJyYXkgYXMgdGhlIHNlY29uZCBwYXJhbWV0ZXJcbiAgIyByYXRoZXIgdGhhbiB1c2luZyBhIHZhcmlhYmxlIG51bWJlciBvZiBhcmd1bWVudHMuXG4gIHB1Ymxpc2g6IChuYW1lLCBhcmdzPVtdKSAtPlxuICAgIHRoaXMudHJpZ2dlci5hcHBseSh0aGlzLCBbbmFtZSwgYXJncy4uLl0pXG5cbiAgIyBQdWJsaWM6IEFuIGFsaWFzIGZvciAub24oKSBmcm9tIEJhY2tib25lLkV2ZW50c1xuICBzdWJzY3JpYmU6IChldmVudCwgY2FsbGJhY2ssIGNvbnRleHQ9dGhpcykgLT5cbiAgICB0aGlzLm9uKGV2ZW50LCBjYWxsYmFjaywgY29udGV4dClcblxuICAjIFB1YmxpYzogQW4gYWxpYXMgZm9yIC5vZmYoKSBmcm9tIEJhY2tib25lLkV2ZW50c1xuICB1bnN1YnNjcmliZTogKGV2ZW50LCBjYWxsYmFjaywgY29udGV4dD10aGlzKSAtPlxuICAgIHRoaXMub2ZmKGV2ZW50LCBjYWxsYmFjaywgY29udGV4dClcblxuXG4jIFBhcnNlIHRoZSBAZXZlbnRzIG9iamVjdCBvZiBhIERlbGVnYXRvciBpbnRvIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZ1xuIyBzdHJpbmctdmFsdWVkIFwic2VsZWN0b3JcIiwgXCJldmVudFwiLCBhbmQgXCJmdW5jXCIga2V5cy5cbkRlbGVnYXRvci5fcGFyc2VFdmVudHMgPSAoZXZlbnRzT2JqKSAtPlxuICAgIGV2ZW50cyA9IFtdXG4gICAgZm9yIHNlbCwgZnVuY3Rpb25OYW1lIG9mIGV2ZW50c09ialxuICAgICAgW3NlbGVjdG9yLi4uLCBldmVudF0gPSBzZWwuc3BsaXQgJyAnXG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHNlbGVjdG9yOiBzZWxlY3Rvci5qb2luKCcgJyksXG4gICAgICAgIGV2ZW50OiBldmVudCxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBmdW5jdGlvbk5hbWVcbiAgICAgIH0pXG4gICAgcmV0dXJuIGV2ZW50c1xuXG5cbiMgTmF0aXZlIGpRdWVyeSBldmVudHMgdGhhdCBzaG91bGQgcmVjaWV2ZSBhbiBldmVudCBvYmplY3QuIFBsdWdpbnMgY2FuXG4jIGFkZCB0aGVpciBvd24gbWV0aG9kcyB0byB0aGlzIGlmIHJlcXVpcmVkLlxuRGVsZWdhdG9yLm5hdGl2ZXMgPSBkbyAtPlxuICBzcGVjaWFscyA9IChrZXkgZm9yIG93biBrZXksIHZhbCBvZiAkLmV2ZW50LnNwZWNpYWwpXG4gIFwiXCJcIlxuICBibHVyIGZvY3VzIGZvY3VzaW4gZm9jdXNvdXQgbG9hZCByZXNpemUgc2Nyb2xsIHVubG9hZCBjbGljayBkYmxjbGlja1xuICBtb3VzZWRvd24gbW91c2V1cCBtb3VzZW1vdmUgbW91c2VvdmVyIG1vdXNlb3V0IG1vdXNlZW50ZXIgbW91c2VsZWF2ZVxuICBjaGFuZ2Ugc2VsZWN0IHN1Ym1pdCBrZXlkb3duIGtleXByZXNzIGtleXVwIGVycm9yXG4gIFwiXCJcIi5zcGxpdCgvW15hLXpdKy8pLmNvbmNhdChzcGVjaWFscylcblxuXG4jIENoZWNrcyB0byBzZWUgaWYgdGhlIHByb3ZpZGVkIGV2ZW50IGlzIGEgRE9NIGV2ZW50IHN1cHBvcnRlZCBieSBqUXVlcnkgb3JcbiMgYSBjdXN0b20gdXNlciBldmVudC5cbiNcbiMgZXZlbnQgLSBTdHJpbmcgZXZlbnQgbmFtZS5cbiNcbiMgRXhhbXBsZXNcbiNcbiMgICBEZWxlZ2F0b3IuX2lzQ3VzdG9tRXZlbnQoJ2NsaWNrJykgICAgICAgICAgICAgICMgPT4gZmFsc2VcbiMgICBEZWxlZ2F0b3IuX2lzQ3VzdG9tRXZlbnQoJ21vdXNlZG93bicpICAgICAgICAgICMgPT4gZmFsc2VcbiMgICBEZWxlZ2F0b3IuX2lzQ3VzdG9tRXZlbnQoJ2Fubm90YXRpb246Y3JlYXRlZCcpICMgPT4gdHJ1ZVxuI1xuIyBSZXR1cm5zIHRydWUgaWYgZXZlbnQgaXMgYSBjdXN0b20gdXNlciBldmVudC5cbkRlbGVnYXRvci5faXNDdXN0b21FdmVudCA9IChldmVudCkgLT5cbiAgW2V2ZW50XSA9IGV2ZW50LnNwbGl0KCcuJylcbiAgJC5pbkFycmF5KGV2ZW50LCBEZWxlZ2F0b3IubmF0aXZlcykgPT0gLTFcblxuXG4jIE1peCBpbiBiYWNrYm9uZSBldmVudHNcbkJhY2tib25lRXZlbnRzID0gcmVxdWlyZSAnYmFja2JvbmUtZXZlbnRzLXN0YW5kYWxvbmUnXG5CYWNrYm9uZUV2ZW50cy5taXhpbihEZWxlZ2F0b3I6OilcblxuIyBFeHBvcnQgRGVsZWdhdG9yIG9iamVjdFxubW9kdWxlLmV4cG9ydHMgPSBEZWxlZ2F0b3JcbiIsIlV0aWwgPSByZXF1aXJlICcuL3V0aWwnXG5XaWRnZXQgPSByZXF1aXJlICcuL3dpZGdldCdcblxuXG5fdCA9IFV0aWwuVHJhbnNsYXRpb25TdHJpbmdcblxuXG4jIFB1YmxpYzogQ3JlYXRlcyBhbiBlbGVtZW50IGZvciBlZGl0aW5nIGFubm90YXRpb25zLlxuY2xhc3MgRWRpdG9yIGV4dGVuZHMgV2lkZ2V0XG5cbiAgIyBFdmVudHMgdG8gYmUgYm91bmQgdG8gQGVsZW1lbnQuXG4gIGV2ZW50czpcbiAgICBcImZvcm0gc3VibWl0XCI6ICAgICAgICAgICAgICAgICBcInN1Ym1pdFwiXG4gICAgXCIuYW5ub3RhdG9yLXNhdmUgY2xpY2tcIjogICAgICAgXCJzdWJtaXRcIlxuICAgIFwiLmFubm90YXRvci1jYW5jZWwgY2xpY2tcIjogICAgIFwiaGlkZVwiXG4gICAgXCIuYW5ub3RhdG9yLWNhbmNlbCBtb3VzZW92ZXJcIjogXCJvbkNhbmNlbEJ1dHRvbk1vdXNlb3ZlclwiXG4gICAgXCJ0ZXh0YXJlYSBrZXlkb3duXCI6ICAgICAgICAgICAgXCJwcm9jZXNzS2V5cHJlc3NcIlxuXG4gICMgQ2xhc3NlcyB0byB0b2dnbGUgc3RhdGUuXG4gIGNsYXNzZXM6XG4gICAgaGlkZTogICdhbm5vdGF0b3ItaGlkZSdcbiAgICBmb2N1czogJ2Fubm90YXRvci1mb2N1cydcblxuICAjIEhUTUwgdGVtcGxhdGUgZm9yIEBlbGVtZW50LlxuICBodG1sOiBcIlwiXCJcbiAgICAgICAgPGRpdiBjbGFzcz1cImFubm90YXRvci1vdXRlciBhbm5vdGF0b3ItZWRpdG9yXCI+XG4gICAgICAgICAgPGZvcm0gY2xhc3M9XCJhbm5vdGF0b3Itd2lkZ2V0XCI+XG4gICAgICAgICAgICA8dWwgY2xhc3M9XCJhbm5vdGF0b3ItbGlzdGluZ1wiPjwvdWw+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYW5ub3RhdG9yLWNvbnRyb2xzXCI+XG4gICAgICAgICAgICAgIDxhIGhyZWY9XCIjY2FuY2VsXCIgY2xhc3M9XCJhbm5vdGF0b3ItY2FuY2VsXCI+XCJcIlwiICsgX3QoJ0NhbmNlbCcpICsgXCJcIlwiPC9hPlxuICAgICAgICAgICAgICA8YSBocmVmPVwiI3NhdmVcIiBjbGFzcz1cImFubm90YXRvci1zYXZlIGFubm90YXRvci1mb2N1c1wiPlwiXCJcIiArIF90KCdTYXZlJykgKyBcIlwiXCI8L2E+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Zvcm0+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICBcIlwiXCJcblxuICBvcHRpb25zOiB7fSAjIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuXG4gICMgUHVibGljOiBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIHRoZSBFZGl0b3Igb2JqZWN0LiBUaGlzIHdpbGwgY3JlYXRlIHRoZVxuICAjIEBlbGVtZW50IGZyb20gdGhlIEBodG1sIHN0cmluZyBhbmQgc2V0IHVwIGFsbCBldmVudHMuXG4gICNcbiAgIyBvcHRpb25zIC0gQW4gT2JqZWN0IGxpdGVyYWwgY29udGFpbmluZyBvcHRpb25zLiBUaGVyZSBhcmUgY3VycmVudGx5IG5vXG4gICMgICAgICAgICAgIG9wdGlvbnMgaW1wbGVtZW50ZWQuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIENyZWF0ZXMgYSBuZXcgZWRpdG9yLCBhZGRzIGEgY3VzdG9tIGZpZWxkIGFuZFxuICAjICAgIyBsb2FkcyBhbiBhbm5vdGF0aW9uIGZvciBlZGl0aW5nLlxuICAjICAgZWRpdG9yID0gbmV3IEFubm90YXRvci5FZGl0b3JcbiAgIyAgIGVkaXRvci5hZGRGaWVsZCh7XG4gICMgICAgIGxhYmVsOiAnTXkgY3VzdG9tIGlucHV0IGZpZWxkJyxcbiAgIyAgICAgdHlwZTogICd0ZXh0YXJlYSdcbiAgIyAgICAgbG9hZDogIHNvbWVMb2FkQ2FsbGJhY2tcbiAgIyAgICAgc2F2ZTogIHNvbWVTYXZlQ2FsbGJhY2tcbiAgIyAgIH0pXG4gICMgICBlZGl0b3IubG9hZChhbm5vdGF0aW9uKVxuICAjXG4gICMgUmV0dXJucyBhIG5ldyBFZGl0b3IgaW5zdGFuY2UuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICBzdXBlciAkKEBodG1sKVswXSwgb3B0aW9uc1xuXG4gICAgQGZpZWxkcyA9IFtdXG4gICAgQGFubm90YXRpb24gPSB7fVxuXG4gICMgUHVibGljOiBEaXNwbGF5cyB0aGUgRWRpdG9yIGFuZCBmaXJlcyBhIFwic2hvd1wiIGV2ZW50LlxuICAjIENhbiBiZSB1c2VkIGFzIGFuIGV2ZW50IGNhbGxiYWNrIGFuZCB3aWxsIGNhbGwgRXZlbnQjcHJldmVudERlZmF1bHQoKVxuICAjIG9uIHRoZSBzdXBwbGllZCBldmVudC5cbiAgI1xuICAjIGV2ZW50IC0gRXZlbnQgb2JqZWN0IHByb3ZpZGVkIGlmIG1ldGhvZCBpcyBjYWxsZWQgYnkgZXZlbnRcbiAgIyAgICAgICAgIGxpc3RlbmVyIChkZWZhdWx0OnVuZGVmaW5lZClcbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgRGlzcGxheXMgdGhlIGVkaXRvci5cbiAgIyAgIGVkaXRvci5zaG93KClcbiAgI1xuICAjICAgIyBEaXNwbGF5cyB0aGUgZWRpdG9yIG9uIGNsaWNrIChwcmV2ZW50cyBkZWZhdWx0IGFjdGlvbikuXG4gICMgICAkKCdhLnNob3ctZWRpdG9yJykuYmluZCgnY2xpY2snLCBlZGl0b3Iuc2hvdylcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmLlxuICBzaG93OiAoZXZlbnQpID0+XG4gICAgVXRpbC5wcmV2ZW50RXZlbnREZWZhdWx0IGV2ZW50XG5cbiAgICBAZWxlbWVudC5yZW1vdmVDbGFzcyhAY2xhc3Nlcy5oaWRlKVxuICAgIEBlbGVtZW50LmZpbmQoJy5hbm5vdGF0b3Itc2F2ZScpLmFkZENsYXNzKEBjbGFzc2VzLmZvY3VzKVxuXG4gICAgIyBpbnZlcnQgaWYgbmVjZXNzYXJ5XG4gICAgdGhpcy5jaGVja09yaWVudGF0aW9uKClcblxuICAgICMgZ2l2ZSBtYWluIHRleHRhcmVhIGZvY3VzXG4gICAgQGVsZW1lbnQuZmluZChcIjppbnB1dDpmaXJzdFwiKS5mb2N1cygpXG5cbiAgICB0aGlzLnNldHVwRHJhZ2dhYmxlcygpXG5cbiAgICB0aGlzLnB1Ymxpc2goJ3Nob3cnKVxuXG5cbiAgIyBQdWJsaWM6IEhpZGVzIHRoZSBFZGl0b3IgYW5kIGZpcmVzIGEgXCJoaWRlXCIgZXZlbnQuIENhbiBiZSB1c2VkIGFzIGFuIGV2ZW50XG4gICMgY2FsbGJhY2sgYW5kIHdpbGwgY2FsbCBFdmVudCNwcmV2ZW50RGVmYXVsdCgpIG9uIHRoZSBzdXBwbGllZCBldmVudC5cbiAgI1xuICAjIGV2ZW50IC0gRXZlbnQgb2JqZWN0IHByb3ZpZGVkIGlmIG1ldGhvZCBpcyBjYWxsZWQgYnkgZXZlbnRcbiAgIyAgICAgICAgIGxpc3RlbmVyIChkZWZhdWx0OnVuZGVmaW5lZClcbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgSGlkZXMgdGhlIGVkaXRvci5cbiAgIyAgIGVkaXRvci5oaWRlKClcbiAgI1xuICAjICAgIyBIaWRlIHRoZSBlZGl0b3Igb24gY2xpY2sgKHByZXZlbnRzIGRlZmF1bHQgYWN0aW9uKS5cbiAgIyAgICQoJ2EuaGlkZS1lZGl0b3InKS5iaW5kKCdjbGljaycsIGVkaXRvci5oaWRlKVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYuXG4gIGhpZGU6IChldmVudCkgPT5cbiAgICBVdGlsLnByZXZlbnRFdmVudERlZmF1bHQgZXZlbnRcblxuICAgIEBlbGVtZW50LmFkZENsYXNzKEBjbGFzc2VzLmhpZGUpXG4gICAgdGhpcy5wdWJsaXNoKCdoaWRlJylcblxuICAjIFB1YmxpYzogTG9hZHMgYW4gYW5ub3RhdGlvbiBpbnRvIHRoZSBFZGl0b3IgYW5kIGRpc3BsYXlzIGl0IHNldHRpbmdcbiAgIyBFZGl0b3IjYW5ub3RhdGlvbiB0byB0aGUgcHJvdmlkZWQgYW5ub3RhdGlvbi4gSXQgZmlyZXMgdGhlIFwibG9hZFwiIGV2ZW50XG4gICMgcHJvdmlkaW5nIHRoZSBjdXJyZW50IGFubm90YXRpb24gc3Vic2NyaWJlcnMgY2FuIG1vZGlmeSB0aGUgYW5ub3RhdGlvblxuICAjIGJlZm9yZSBpdCB1cGRhdGVzIHRoZSBlZGl0b3IgZmllbGRzLlxuICAjXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gT2JqZWN0IHRvIGRpc3BsYXkgZm9yIGVkaXRpbmcuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIERpcGxheXMgdGhlIGVkaXRvciB3aXRoIHRoZSBhbm5vdGF0aW9uIGxvYWRlZC5cbiAgIyAgIGVkaXRvci5sb2FkKHt0ZXh0OiAnTXkgQW5ub3RhdGlvbid9KVxuICAjXG4gICMgICBlZGl0b3Iub24oJ2xvYWQnLCAoYW5ub3RhdGlvbikgLT5cbiAgIyAgICAgY29uc29sZS5sb2cgYW5ub3RhdGlvbi50ZXh0XG4gICMgICApLmxvYWQoe3RleHQ6ICdNeSBBbm5vdGF0aW9uJ30pXG4gICMgICAjID0+IE91dHB1dHMgXCJNeSBBbm5vdGF0aW9uXCJcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmLlxuICBsb2FkOiAoYW5ub3RhdGlvbikgPT5cbiAgICBAYW5ub3RhdGlvbiA9IGFubm90YXRpb25cblxuICAgIHRoaXMucHVibGlzaCgnbG9hZCcsIFtAYW5ub3RhdGlvbl0pXG5cbiAgICBmb3IgZmllbGQgaW4gQGZpZWxkc1xuICAgICAgZmllbGQubG9hZChmaWVsZC5lbGVtZW50LCBAYW5ub3RhdGlvbilcblxuICAgIHRoaXMuc2hvdygpXG5cbiAgIyBQdWJsaWM6IEhpZGVzIHRoZSBFZGl0b3IgYW5kIHBhc3NlcyB0aGUgYW5ub3RhdGlvbiB0byBhbGwgcmVnaXN0ZXJlZCBmaWVsZHNcbiAgIyBzbyB0aGV5IGNhbiB1cGRhdGUgaXRzIHN0YXRlLiBJdCB0aGVuIGZpcmVzIHRoZSBcInNhdmVcIiBldmVudCBzbyB0aGF0IG90aGVyXG4gICMgcGFydGllcyBjYW4gZnVydGhlciBtb2RpZnkgdGhlIGFubm90YXRpb24uXG4gICMgQ2FuIGJlIHVzZWQgYXMgYW4gZXZlbnQgY2FsbGJhY2sgYW5kIHdpbGwgY2FsbCBFdmVudCNwcmV2ZW50RGVmYXVsdCgpIG9uIHRoZVxuICAjIHN1cHBsaWVkIGV2ZW50LlxuICAjXG4gICMgZXZlbnQgLSBFdmVudCBvYmplY3QgcHJvdmlkZWQgaWYgbWV0aG9kIGlzIGNhbGxlZCBieSBldmVudFxuICAjICAgICAgICAgbGlzdGVuZXIgKGRlZmF1bHQ6dW5kZWZpbmVkKVxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBTdWJtaXRzIHRoZSBlZGl0b3IuXG4gICMgICBlZGl0b3Iuc3VibWl0KClcbiAgI1xuICAjICAgIyBTdWJtaXRzIHRoZSBlZGl0b3Igb24gY2xpY2sgKHByZXZlbnRzIGRlZmF1bHQgYWN0aW9uKS5cbiAgIyAgICQoJ2J1dHRvbi5zdWJtaXQtZWRpdG9yJykuYmluZCgnY2xpY2snLCBlZGl0b3Iuc3VibWl0KVxuICAjXG4gICMgICAjIEFwcGVuZHMgXCJDb21tZW50OiBcIiB0byB0aGUgYW5ub3RhdGlvbiBjb21tZW50IHRleHQuXG4gICMgICBlZGl0b3Iub24oJ3NhdmUnLCAoYW5ub3RhdGlvbikgLT5cbiAgIyAgICAgYW5ub3RhdGlvbi50ZXh0ID0gXCJDb21tZW50OiBcIiArIGFubm90YXRpb24udGV4dFxuICAjICAgKS5zdWJtaXQoKVxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYuXG4gIHN1Ym1pdDogKGV2ZW50KSA9PlxuICAgIFV0aWwucHJldmVudEV2ZW50RGVmYXVsdCBldmVudFxuXG4gICAgZm9yIGZpZWxkIGluIEBmaWVsZHNcbiAgICAgIGZpZWxkLnN1Ym1pdChmaWVsZC5lbGVtZW50LCBAYW5ub3RhdGlvbilcblxuICAgIHRoaXMucHVibGlzaCgnc2F2ZScsIFtAYW5ub3RhdGlvbl0pXG5cbiAgICB0aGlzLmhpZGUoKVxuXG4gICMgUHVibGljOiBBZGRzIGFuIGFkZGlvbmFsIGZvcm0gZmllbGQgdG8gdGhlIGVkaXRvci4gQ2FsbGJhY2tzIGNhbiBiZSBwcm92aWRlZFxuICAjIHRvIHVwZGF0ZSB0aGUgdmlldyBhbmQgYW5vdGF0aW9ucyBvbiBsb2FkIGFuZCBzdWJtaXNzaW9uLlxuICAjXG4gICMgb3B0aW9ucyAtIEFuIG9wdGlvbnMgT2JqZWN0LiBPcHRpb25zIGFyZSBhcyBmb2xsb3dzOlxuICAjICAgICAgICAgICBpZCAgICAgLSBBIHVuaXF1ZSBpZCBmb3IgdGhlIGZvcm0gZWxlbWVudCB3aWxsIGFsc28gYmUgc2V0IGFzIHRoZVxuICAjICAgICAgICAgICAgICAgICAgICBcImZvclwiIGF0dHJ1YnV0ZSBvZiBhIGxhYmVsIGlmIHRoZXJlIGlzIG9uZS4gRGVmYXVsdHMgdG9cbiAgIyAgICAgICAgICAgICAgICAgICAgYSB0aW1lc3RhbXAuIChkZWZhdWx0OiBcImFubm90YXRvci1maWVsZC17dGltZXN0YW1wfVwiKVxuICAjICAgICAgICAgICB0eXBlICAgLSBJbnB1dCB0eXBlIFN0cmluZy4gT25lIG9mIFwiaW5wdXRcIiwgXCJ0ZXh0YXJlYVwiLFxuICAjICAgICAgICAgICAgICAgICAgICBcImNoZWNrYm94XCIsIFwic2VsZWN0XCIgKGRlZmF1bHQ6IFwiaW5wdXRcIilcbiAgIyAgICAgICAgICAgbGFiZWwgIC0gTGFiZWwgdG8gZGlzcGxheSBlaXRoZXIgaW4gYSBsYWJlbCBFbGVtZW50IG9yIGFzIHBsYWNlLVxuICAjICAgICAgICAgICAgICAgICAgICBob2xkZXIgdGV4dCBkZXBlbmRpbmcgb24gdGhlIHR5cGUuIChkZWZhdWx0OiBcIlwiKVxuICAjICAgICAgICAgICBsb2FkICAgLSBDYWxsYmFjayBGdW5jdGlvbiBjYWxsZWQgd2hlbiB0aGUgZWRpdG9yIGlzIGxvYWRlZCB3aXRoIGFcbiAgIyAgICAgICAgICAgICAgICAgICAgbmV3IGFubm90YXRpb24uIFJlY2lldmVzIHRoZSBmaWVsZCA8bGk+IGVsZW1lbnQgYW5kIHRoZVxuICAjICAgICAgICAgICAgICAgICAgICBhbm5vdGF0aW9uIHRvIGJlIGxvYWRlZC5cbiAgIyAgICAgICAgICAgc3VibWl0IC0gQ2FsbGJhY2sgRnVuY3Rpb24gY2FsbGVkIHdoZW4gdGhlIGVkaXRvciBpcyBzdWJtaXR0ZWQuXG4gICMgICAgICAgICAgICAgICAgICAgIFJlY2lldmVzIHRoZSBmaWVsZCA8bGk+IGVsZW1lbnQgYW5kIHRoZSBhbm5vdGF0aW9uIHRvIGJlXG4gICMgICAgICAgICAgICAgICAgICAgIHVwZGF0ZWQuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIEFkZCBhIG5ldyBpbnB1dCBlbGVtZW50LlxuICAjICAgZWRpdG9yLmFkZEZpZWxkKHtcbiAgIyAgICAgbGFiZWw6IFwiVGFnc1wiLFxuICAjXG4gICMgICAgICMgVGhpcyBpcyBjYWxsZWQgd2hlbiB0aGUgZWRpdG9yIGlzIGxvYWRlZCB1c2UgaXQgdG8gdXBkYXRlIHlvdXIgaW5wdXQuXG4gICMgICAgIGxvYWQ6IChmaWVsZCwgYW5ub3RhdGlvbikgLT5cbiAgIyAgICAgICAjIERvIHNvbWV0aGluZyB3aXRoIHRoZSBhbm5vdGF0aW9uLlxuICAjICAgICAgIHZhbHVlID0gZ2V0VGFnU3RyaW5nKGFubm90YXRpb24udGFncylcbiAgIyAgICAgICAkKGZpZWxkKS5maW5kKCdpbnB1dCcpLnZhbCh2YWx1ZSlcbiAgI1xuICAjICAgICAjIFRoaXMgaXMgY2FsbGVkIHdoZW4gdGhlIGVkaXRvciBpcyBzdWJtaXR0ZWQgdXNlIGl0IHRvIHJldHJpZXZlIGRhdGFcbiAgIyAgICAgIyBmcm9tIHlvdXIgaW5wdXQgYW5kIHNhdmUgaXQgdG8gdGhlIGFubm90YXRpb24uXG4gICMgICAgIHN1Ym1pdDogKGZpZWxkLCBhbm5vdGF0aW9uKSAtPlxuICAjICAgICAgIHZhbHVlID0gJChmaWVsZCkuZmluZCgnaW5wdXQnKS52YWwoKVxuICAjICAgICAgIGFubm90YXRpb24udGFncyA9IGdldFRhZ3NGcm9tU3RyaW5nKHZhbHVlKVxuICAjICAgfSlcbiAgI1xuICAjICAgIyBBZGQgYSBuZXcgY2hlY2tib3ggZWxlbWVudC5cbiAgIyAgIGVkaXRvci5hZGRGaWVsZCh7XG4gICMgICAgIHR5cGU6ICdjaGVja2JveCcsXG4gICMgICAgIGlkOiAnYW5ub3RhdG9yLWZpZWxkLW15LWNoZWNrYm94JyxcbiAgIyAgICAgbGFiZWw6ICdBbGxvdyBhbnlvbmUgdG8gc2VlIHRoaXMgYW5ub3RhdGlvbicsXG4gICMgICAgIGxvYWQ6IChmaWVsZCwgYW5ub3RhdGlvbikgLT5cbiAgIyAgICAgICAjIENoZWNrIHdoYXQgc3RhdGUgb2YgaW5wdXQgc2hvdWxkIGJlLlxuICAjICAgICAgIGlmIGNoZWNrZWRcbiAgIyAgICAgICAgICQoZmllbGQpLmZpbmQoJ2lucHV0JykuYXR0cignY2hlY2tlZCcsICdjaGVja2VkJylcbiAgIyAgICAgICBlbHNlXG4gICMgICAgICAgICAkKGZpZWxkKS5maW5kKCdpbnB1dCcpLnJlbW92ZUF0dHIoJ2NoZWNrZWQnKVxuXG4gICMgICAgIHN1Ym1pdDogKGZpZWxkLCBhbm5vdGF0aW9uKSAtPlxuICAjICAgICAgIGNoZWNrZWQgPSAkKGZpZWxkKS5maW5kKCdpbnB1dCcpLmlzKCc6Y2hlY2tlZCcpXG4gICMgICAgICAgIyBEbyBzb21ldGhpbmcuXG4gICMgICB9KVxuICAjXG4gICMgUmV0dXJucyB0aGUgY3JlYXRlZCA8bGk+IEVsZW1lbnQuXG4gIGFkZEZpZWxkOiAob3B0aW9ucykgLT5cbiAgICBmaWVsZCA9ICQuZXh0ZW5kKHtcbiAgICAgIGlkOiAgICAgJ2Fubm90YXRvci1maWVsZC0nICsgVXRpbC51dWlkKClcbiAgICAgIHR5cGU6ICAgJ2lucHV0J1xuICAgICAgbGFiZWw6ICAnJ1xuICAgICAgbG9hZDogICAtPlxuICAgICAgc3VibWl0OiAtPlxuICAgIH0sIG9wdGlvbnMpXG5cbiAgICBpbnB1dCA9IG51bGxcbiAgICBlbGVtZW50ID0gJCgnPGxpIGNsYXNzPVwiYW5ub3RhdG9yLWl0ZW1cIiAvPicpXG4gICAgZmllbGQuZWxlbWVudCA9IGVsZW1lbnRbMF1cblxuICAgIHN3aXRjaCAoZmllbGQudHlwZSlcbiAgICAgIHdoZW4gJ3RleHRhcmVhJyAgICAgICAgICB0aGVuIGlucHV0ID0gJCgnPHRleHRhcmVhIC8+JylcbiAgICAgIHdoZW4gJ2lucHV0JywgJ2NoZWNrYm94JyB0aGVuIGlucHV0ID0gJCgnPGlucHV0IC8+JylcbiAgICAgIHdoZW4gJ3NlbGVjdCcgdGhlbiBpbnB1dCA9ICQoJzxzZWxlY3QgLz4nKVxuXG4gICAgZWxlbWVudC5hcHBlbmQoaW5wdXQpXG5cbiAgICBpbnB1dC5hdHRyKHtcbiAgICAgIGlkOiBmaWVsZC5pZFxuICAgICAgcGxhY2Vob2xkZXI6IGZpZWxkLmxhYmVsXG4gICAgfSlcblxuICAgIGlmIGZpZWxkLnR5cGUgPT0gJ2NoZWNrYm94J1xuICAgICAgaW5wdXRbMF0udHlwZSA9ICdjaGVja2JveCdcbiAgICAgIGVsZW1lbnQuYWRkQ2xhc3MoJ2Fubm90YXRvci1jaGVja2JveCcpXG4gICAgICBlbGVtZW50LmFwcGVuZCgkKCc8bGFiZWwgLz4nLCB7Zm9yOiBmaWVsZC5pZCwgaHRtbDogZmllbGQubGFiZWx9KSlcblxuICAgIEBlbGVtZW50LmZpbmQoJ3VsOmZpcnN0JykuYXBwZW5kKGVsZW1lbnQpXG5cbiAgICBAZmllbGRzLnB1c2ggZmllbGRcblxuICAgIGZpZWxkLmVsZW1lbnRcblxuICBjaGVja09yaWVudGF0aW9uOiAtPlxuICAgIHN1cGVyXG5cbiAgICBsaXN0ID0gQGVsZW1lbnQuZmluZCgndWwnKVxuICAgIGNvbnRyb2xzID0gQGVsZW1lbnQuZmluZCgnLmFubm90YXRvci1jb250cm9scycpXG5cbiAgICBpZiBAZWxlbWVudC5oYXNDbGFzcyhAY2xhc3Nlcy5pbnZlcnQueSlcbiAgICAgIGNvbnRyb2xzLmluc2VydEJlZm9yZShsaXN0KVxuICAgIGVsc2UgaWYgY29udHJvbHMuaXMoJzpmaXJzdC1jaGlsZCcpXG4gICAgICBjb250cm9scy5pbnNlcnRBZnRlcihsaXN0KVxuXG4gICAgdGhpc1xuXG4gICMgRXZlbnQgY2FsbGJhY2suIExpc3RlbnMgZm9yIHRoZSBmb2xsb3dpbmcgc3BlY2lhbCBrZXlwcmVzc2VzLlxuICAjIC0gZXNjYXBlOiBIaWRlcyB0aGUgZWRpdG9yXG4gICMgLSBlbnRlcjogIFN1Ym1pdHMgdGhlIGVkaXRvclxuICAjXG4gICMgZXZlbnQgLSBBIGtleWRvd24gRXZlbnQgb2JqZWN0LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nXG4gIHByb2Nlc3NLZXlwcmVzczogKGV2ZW50KSA9PlxuICAgIGlmIGV2ZW50LmtleUNvZGUgaXMgMjcgIyBcIkVzY2FwZVwiIGtleSA9PiBhYm9ydC5cbiAgICAgIHRoaXMuaGlkZSgpXG4gICAgZWxzZSBpZiBldmVudC5rZXlDb2RlIGlzIDEzIGFuZCAhZXZlbnQuc2hpZnRLZXlcbiAgICAgICMgSWYgXCJyZXR1cm5cIiB3YXMgcHJlc3NlZCB3aXRob3V0IHRoZSBzaGlmdCBrZXksIHdlJ3JlIGRvbmUuXG4gICAgICB0aGlzLnN1Ym1pdCgpXG5cbiAgIyBFdmVudCBjYWxsYmFjay4gUmVtb3ZlcyB0aGUgZm9jdXMgY2xhc3MgZnJvbSB0aGUgc3VibWl0IGJ1dHRvbiB3aGVuIHRoZVxuICAjIGNhbmNlbCBidXR0b24gaXMgaG92ZXJlZC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZ1xuICBvbkNhbmNlbEJ1dHRvbk1vdXNlb3ZlcjogPT5cbiAgICBAZWxlbWVudC5maW5kKCcuJyArIEBjbGFzc2VzLmZvY3VzKS5yZW1vdmVDbGFzcyhAY2xhc3Nlcy5mb2N1cylcblxuICAjIFNldHMgdXAgbW91c2UgZXZlbnRzIGZvciByZXNpemluZyBhbmQgZHJhZ2dpbmcgdGhlIGVkaXRvciB3aW5kb3cuXG4gICMgd2luZG93IGV2ZW50cyBhcmUgYm91bmQgb25seSB3aGVuIG5lZWRlZCBhbmQgdGhyb3R0bGVkIHRvIG9ubHkgdXBkYXRlXG4gICMgdGhlIHBvc2l0aW9ucyBhdCBtb3N0IDYwIHRpbWVzIGEgc2Vjb25kLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBzZXR1cERyYWdnYWJsZXM6ICgpIC0+XG4gICAgQGVsZW1lbnQuZmluZCgnLmFubm90YXRvci1yZXNpemUnKS5yZW1vdmUoKVxuXG4gICAgIyBGaW5kIHRoZSBmaXJzdC9sYXN0IGl0ZW0gZWxlbWVudCBkZXBlbmRpbmcgb24gb3JpZW50YXRpb25cbiAgICBpZiBAZWxlbWVudC5oYXNDbGFzcyhAY2xhc3Nlcy5pbnZlcnQueSlcbiAgICAgIGNvcm5lckl0ZW0gPSBAZWxlbWVudC5maW5kKCcuYW5ub3RhdG9yLWl0ZW06bGFzdCcpXG4gICAgZWxzZVxuICAgICAgY29ybmVySXRlbSA9IEBlbGVtZW50LmZpbmQoJy5hbm5vdGF0b3ItaXRlbTpmaXJzdCcpXG5cbiAgICBpZiBjb3JuZXJJdGVtXG4gICAgICAkKCc8c3BhbiBjbGFzcz1cImFubm90YXRvci1yZXNpemVcIj48L3NwYW4+JykuYXBwZW5kVG8oY29ybmVySXRlbSlcblxuICAgIG1vdXNlZG93biA9IG51bGxcbiAgICBjbGFzc2VzICAgPSBAY2xhc3Nlc1xuICAgIGVkaXRvciAgICA9IEBlbGVtZW50XG4gICAgdGV4dGFyZWEgID0gbnVsbFxuICAgIHJlc2l6ZSAgICA9IGVkaXRvci5maW5kKCcuYW5ub3RhdG9yLXJlc2l6ZScpXG4gICAgY29udHJvbHMgID0gZWRpdG9yLmZpbmQoJy5hbm5vdGF0b3ItY29udHJvbHMnKVxuICAgIHRocm90dGxlICA9IGZhbHNlXG5cbiAgICBvbk1vdXNlZG93biA9IChldmVudCkgLT5cbiAgICAgIGlmIGV2ZW50LnRhcmdldCA9PSB0aGlzXG4gICAgICAgIG1vdXNlZG93biA9IHtcbiAgICAgICAgICBlbGVtZW50OiB0aGlzXG4gICAgICAgICAgdG9wOiAgICAgZXZlbnQucGFnZVlcbiAgICAgICAgICBsZWZ0OiAgICBldmVudC5wYWdlWFxuICAgICAgICB9XG5cbiAgICAgICAgIyBGaW5kIHRoZSBmaXJzdCB0ZXh0IGFyZWEgaWYgdGhlcmUgaXMgb25lLlxuICAgICAgICB0ZXh0YXJlYSA9IGVkaXRvci5maW5kKCd0ZXh0YXJlYTpmaXJzdCcpXG5cbiAgICAgICAgJCh3aW5kb3cpLmJpbmQoe1xuICAgICAgICAgICdtb3VzZXVwLmFubm90YXRvci1lZGl0b3ItcmVzaXplJzogICBvbk1vdXNldXBcbiAgICAgICAgICAnbW91c2Vtb3ZlLmFubm90YXRvci1lZGl0b3ItcmVzaXplJzogb25Nb3VzZW1vdmVcbiAgICAgICAgfSlcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuXG4gICAgb25Nb3VzZXVwID0gLT5cbiAgICAgIG1vdXNlZG93biA9IG51bGxcbiAgICAgICQod2luZG93KS51bmJpbmQgJy5hbm5vdGF0b3ItZWRpdG9yLXJlc2l6ZSdcblxuICAgIG9uTW91c2Vtb3ZlID0gKGV2ZW50KSA9PlxuICAgICAgaWYgbW91c2Vkb3duIGFuZCB0aHJvdHRsZSA9PSBmYWxzZVxuICAgICAgICBkaWZmID0ge1xuICAgICAgICAgIHRvcDogIGV2ZW50LnBhZ2VZIC0gbW91c2Vkb3duLnRvcFxuICAgICAgICAgIGxlZnQ6IGV2ZW50LnBhZ2VYIC0gbW91c2Vkb3duLmxlZnRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIG1vdXNlZG93bi5lbGVtZW50ID09IHJlc2l6ZVswXVxuICAgICAgICAgIGhlaWdodCA9IHRleHRhcmVhLm91dGVySGVpZ2h0KClcbiAgICAgICAgICB3aWR0aCAgPSB0ZXh0YXJlYS5vdXRlcldpZHRoKClcblxuICAgICAgICAgIGRpcmVjdGlvblggPSBpZiBlZGl0b3IuaGFzQ2xhc3MoY2xhc3Nlcy5pbnZlcnQueCkgdGhlbiAtMSBlbHNlICAxXG4gICAgICAgICAgZGlyZWN0aW9uWSA9IGlmIGVkaXRvci5oYXNDbGFzcyhjbGFzc2VzLmludmVydC55KSB0aGVuICAxIGVsc2UgLTFcblxuICAgICAgICAgIHRleHRhcmVhLmhlaWdodCBoZWlnaHQgKyAoZGlmZi50b3AgICogZGlyZWN0aW9uWSlcbiAgICAgICAgICB0ZXh0YXJlYS53aWR0aCAgd2lkdGggICsgKGRpZmYubGVmdCAqIGRpcmVjdGlvblgpXG5cbiAgICAgICAgICAjIE9ubHkgdXBkYXRlIHRoZSBtb3VzZWRvd24gb2JqZWN0IGlmIHRoZSBkaW1lbnNpb25zXG4gICAgICAgICAgIyBoYXZlIGNoYW5nZWQsIG90aGVyd2lzZSB0aGV5IGhhdmUgcmVhY2hlZCB0aGVpciBtaW5pbXVtXG4gICAgICAgICAgIyB2YWx1ZXMuXG4gICAgICAgICAgbW91c2Vkb3duLnRvcCAgPSBldmVudC5wYWdlWSB1bmxlc3MgdGV4dGFyZWEub3V0ZXJIZWlnaHQoKSA9PSBoZWlnaHRcbiAgICAgICAgICBtb3VzZWRvd24ubGVmdCA9IGV2ZW50LnBhZ2VYIHVubGVzcyB0ZXh0YXJlYS5vdXRlcldpZHRoKCkgID09IHdpZHRoXG5cbiAgICAgICAgZWxzZSBpZiBtb3VzZWRvd24uZWxlbWVudCA9PSBjb250cm9sc1swXVxuICAgICAgICAgIGVkaXRvci5jc3Moe1xuICAgICAgICAgICAgdG9wOiAgcGFyc2VJbnQoZWRpdG9yLmNzcygndG9wJyksIDEwKSAgKyBkaWZmLnRvcFxuICAgICAgICAgICAgbGVmdDogcGFyc2VJbnQoZWRpdG9yLmNzcygnbGVmdCcpLCAxMCkgKyBkaWZmLmxlZnRcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgbW91c2Vkb3duLnRvcCAgPSBldmVudC5wYWdlWVxuICAgICAgICAgIG1vdXNlZG93bi5sZWZ0ID0gZXZlbnQucGFnZVhcblxuICAgICAgICB0aHJvdHRsZSA9IHRydWU7XG4gICAgICAgIHNldFRpbWVvdXQoLT5cbiAgICAgICAgICB0aHJvdHRsZSA9IGZhbHNlXG4gICAgICAgICwgMTAwMC82MClcblxuICAgIHJlc2l6ZS5iaW5kICAgJ21vdXNlZG93bicsIG9uTW91c2Vkb3duXG4gICAgY29udHJvbHMuYmluZCAnbW91c2Vkb3duJywgb25Nb3VzZWRvd25cblxuXG4jIEV4cG9ydCB0aGUgRWRpdG9yIG9iamVjdFxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JcbiIsIkRlbGVnYXRvciA9IHJlcXVpcmUgJy4vY2xhc3MnXG5VdGlsID0gcmVxdWlyZSAnLi91dGlsJ1xuXG5cbiMgUHVibGljOiBBIHNpbXBsZSBub3RpZmljYXRpb24gc3lzdGVtIHRoYXQgY2FuIGJlIHVzZWQgdG8gZGlzcGxheSBpbmZvcm1hdGlvbixcbiMgd2FybmluZ3MgYW5kIGVycm9ycyB0byB0aGUgdXNlci4gRGlzcGxheSBvZiBub3RpZmljYXRpb25zIGFyZSBjb250cm9sbGVkXG4jIGNtcGxldGVseSBieSBDU1MgYnkgYWRkaW5nL3JlbW92aW5nIHRoZSBAb3B0aW9ucy5jbGFzc2VzLnNob3cgY2xhc3MuIFRoaXNcbiMgYWxsb3dzIHN0eWxpbmcvYW5pbWF0aW9uIHVzaW5nIENTUyByYXRoZXIgdGhhbiBoYXJkY29kaW5nIHN0eWxlcy5cbmNsYXNzIE5vdGlmaWNhdGlvbiBleHRlbmRzIERlbGVnYXRvclxuXG4gICMgU2V0cyBldmVudHMgdG8gYmUgYm91bmQgdG8gdGhlIEBlbGVtZW50LlxuICBldmVudHM6XG4gICAgXCJjbGlja1wiOiBcImhpZGVcIlxuXG4gICMgRGVmYXVsdCBvcHRpb25zLlxuICBvcHRpb25zOlxuICAgIGh0bWw6IFwiPGRpdiBjbGFzcz0nYW5ub3RhdG9yLW5vdGljZSc+PC9kaXY+XCJcbiAgICBjbGFzc2VzOlxuICAgICAgc2hvdzogICAgXCJhbm5vdGF0b3Itbm90aWNlLXNob3dcIlxuICAgICAgaW5mbzogICAgXCJhbm5vdGF0b3Itbm90aWNlLWluZm9cIlxuICAgICAgc3VjY2VzczogXCJhbm5vdGF0b3Itbm90aWNlLXN1Y2Nlc3NcIlxuICAgICAgZXJyb3I6ICAgXCJhbm5vdGF0b3Itbm90aWNlLWVycm9yXCJcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiAgTm90aWZpY2F0aW9uIGFuZCBhcHBlbmRzIGl0IHRvIHRoZVxuICAjIGRvY3VtZW50IGJvZHkuXG4gICNcbiAgIyBvcHRpb25zIC0gVGhlIGZvbGxvd2luZyBvcHRpb25zIGNhbiBiZSBwcm92aWRlZC5cbiAgIyAgICAgICAgICAgY2xhc3NlcyAtIEEgT2JqZWN0IGxpdGVyYWwgb2YgY2xhc3NlcyB1c2VkIHRvIGRldGVybWluZSBzdGF0ZS5cbiAgIyAgICAgICAgICAgaHRtbCAgICAtIEFuIEhUTUwgc3RyaW5nIHVzZWQgdG8gY3JlYXRlIHRoZSBub3RpZmljYXRpb24uXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIERpc3BsYXlzIGEgbm90aWZpY2F0aW9uIHdpdGggdGhlIHRleHQgXCJIZWxsbyBXb3JsZFwiXG4gICMgICBub3RpZmljYXRpb24gPSBuZXcgQW5ub3RhdG9yLk5vdGlmaWNhdGlvblxuICAjICAgbm90aWZpY2F0aW9uLnNob3coXCJIZWxsbyBXb3JsZFwiKVxuICAjXG4gICMgUmV0dXJuc1xuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XG4gICAgc3VwZXIgJChAb3B0aW9ucy5odG1sKVswXSwgb3B0aW9uc1xuXG4gICMgUHVibGljOiBEaXNwbGF5cyB0aGUgYW5ub3RhdGlvbiB3aXRoIG1lc3NhZ2UgYW5kIG9wdGlvbmFsIHN0YXR1cy4gVGhlXG4gICMgbWVzc2FnZSB3aWxsIGhpZGUgaXRzZWxmIGFmdGVyIDUgc2Vjb25kcyBvciBpZiB0aGUgdXNlciBjbGlja3Mgb24gaXQuXG4gICNcbiAgIyBtZXNzYWdlIC0gQSBtZXNzYWdlIFN0cmluZyB0byBkaXNwbGF5IChIVE1MIHdpbGwgYmUgZXNjYXBlZCkuXG4gICMgc3RhdHVzICAtIEEgc3RhdHVzIGNvbnN0YW50LiBUaGlzIHdpbGwgYXBwbHkgYSBjbGFzcyB0byB0aGUgZWxlbWVudCBmb3JcbiAgIyAgICAgICAgICAgc3R5bGluZy4gKGRlZmF1bHQ6IEFubm90YXRvci5Ob3RpZmljYXRpb24uSU5GTylcbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgRGlzcGxheXMgYSBub3RpZmljYXRpb24gd2l0aCB0aGUgdGV4dCBcIkhlbGxvIFdvcmxkXCJcbiAgIyAgIG5vdGlmaWNhdGlvbi5zaG93KFwiSGVsbG8gV29ybGRcIilcbiAgI1xuICAjICAgIyBEaXNwbGF5cyBhIG5vdGlmaWNhdGlvbiB3aXRoIHRoZSB0ZXh0IFwiQW4gZXJyb3IgaGFzIG9jY3VycmVkXCJcbiAgIyAgIG5vdGlmaWNhdGlvbi5zaG93KFwiQW4gZXJyb3IgaGFzIG9jY3VycmVkXCIsIEFubm90YXRvci5Ob3RpZmljYXRpb24uRVJST1IpXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZi5cbiAgc2hvdzogKG1lc3NhZ2UsIHN0YXR1cz1Ob3RpZmljYXRpb24uSU5GTykgPT5cbiAgICBAY3VycmVudFN0YXR1cyA9IHN0YXR1c1xuICAgIHRoaXMuX2FwcGVuZEVsZW1lbnQoKVxuXG4gICAgJChAZWxlbWVudClcbiAgICAgIC5hZGRDbGFzcyhAb3B0aW9ucy5jbGFzc2VzLnNob3cpXG4gICAgICAuYWRkQ2xhc3MoQG9wdGlvbnMuY2xhc3Nlc1tAY3VycmVudFN0YXR1c10pXG4gICAgICAuaHRtbChVdGlsLmVzY2FwZShtZXNzYWdlIHx8IFwiXCIpKVxuXG4gICAgc2V0VGltZW91dCB0aGlzLmhpZGUsIDUwMDBcbiAgICB0aGlzXG5cbiAgIyBQdWJsaWM6IEhpZGVzIHRoZSBub3RpZmljYXRpb24uXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIEhpZGVzIHRoZSBub3RpZmljYXRpb24uXG4gICMgICBub3RpZmljYXRpb24uaGlkZSgpXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZi5cbiAgaGlkZTogPT5cbiAgICBAY3VycmVudFN0YXR1cyA/PSBBbm5vdGF0b3IuTm90aWZpY2F0aW9uLklORk9cbiAgICAkKEBlbGVtZW50KVxuICAgICAgLnJlbW92ZUNsYXNzKEBvcHRpb25zLmNsYXNzZXMuc2hvdylcbiAgICAgIC5yZW1vdmVDbGFzcyhAb3B0aW9ucy5jbGFzc2VzW0BjdXJyZW50U3RhdHVzXSlcbiAgICB0aGlzXG5cbiAgIyBQcml2YXRlOiBFbnN1cmVzIHRoZSBub3RpZmljYXRpb24gZWxlbWVudCBoYXMgYmVlbiBhZGRlZCB0byB0aGUgZG9jdW1lbnRcbiAgIyB3aGVuIGl0IGlzIG5lZWRlZC5cbiAgX2FwcGVuZEVsZW1lbnQ6IC0+XG4gICAgaWYgbm90IEBlbGVtZW50LnBhcmVudE5vZGU/XG4gICAgICAkKEBlbGVtZW50KS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxuXG4jIENvbnN0YW50cyBmb3IgY29udHJvbGxpbmcgdGhlIGRpc3BsYXkgb2YgdGhlIG5vdGlmaWNhdGlvbi4gRWFjaCBjb25zdGFudFxuIyBhZGRzIGEgZGlmZmVyZW50IGNsYXNzIHRvIHRoZSBOb3RpZmljYXRpb24jZWxlbWVudC5cbk5vdGlmaWNhdGlvbi5JTkZPICAgID0gJ2luZm8nXG5Ob3RpZmljYXRpb24uU1VDQ0VTUyA9ICdzdWNjZXNzJ1xuTm90aWZpY2F0aW9uLkVSUk9SICAgPSAnZXJyb3InXG5cbiMgRXhwb3J0IE5vdGlmaWNhdGlvbiBvYmplY3Rcbm1vZHVsZS5leHBvcnRzID0gTm90aWZpY2F0aW9uXG4iLCJBbm5vdGF0b3IgPSByZXF1aXJlKCdhbm5vdGF0b3InKVxuXG5cbiMgUHVibGljOiBDcmVhdGVzIGEgRGF0ZSBvYmplY3QgZnJvbSBhbiBJU084NjAxIGZvcm1hdHRlZCBkYXRlIFN0cmluZy5cbiNcbiMgc3RyaW5nIC0gSVNPODYwMSBmb3JtYXR0ZWQgZGF0ZSBTdHJpbmcuXG4jXG4jIFJldHVybnMgRGF0ZSBpbnN0YW5jZS5cbmNyZWF0ZURhdGVGcm9tSVNPODYwMSA9IChzdHJpbmcpIC0+XG4gIHJlZ2V4cCA9IChcbiAgICBcIihbMC05XXs0fSkoLShbMC05XXsyfSkoLShbMC05XXsyfSlcIiArXG4gICAgXCIoVChbMC05XXsyfSk6KFswLTldezJ9KSg6KFswLTldezJ9KShcXFxcLihbMC05XSspKT8pP1wiICtcbiAgICBcIihafCgoWy0rXSkoWzAtOV17Mn0pOihbMC05XXsyfSkpKT8pPyk/KT9cIlxuICApXG5cbiAgZCA9IHN0cmluZy5tYXRjaChuZXcgUmVnRXhwKHJlZ2V4cCkpXG5cbiAgb2Zmc2V0ID0gMFxuICBkYXRlID0gbmV3IERhdGUoZFsxXSwgMCwgMSlcblxuICBkYXRlLnNldE1vbnRoKGRbM10gLSAxKSBpZiBkWzNdXG4gIGRhdGUuc2V0RGF0ZShkWzVdKSBpZiBkWzVdXG4gIGRhdGUuc2V0SG91cnMoZFs3XSkgaWYgZFs3XVxuICBkYXRlLnNldE1pbnV0ZXMoZFs4XSkgaWYgZFs4XVxuICBkYXRlLnNldFNlY29uZHMoZFsxMF0pIGlmIGRbMTBdXG4gIGRhdGUuc2V0TWlsbGlzZWNvbmRzKE51bWJlcihcIjAuXCIgKyBkWzEyXSkgKiAxMDAwKSBpZiBkWzEyXVxuXG4gIGlmIGRbMTRdXG4gICAgb2Zmc2V0ID0gKE51bWJlcihkWzE2XSkgKiA2MCkgKyBOdW1iZXIoZFsxN10pXG4gICAgb2Zmc2V0ICo9ICgoZFsxNV0gPT0gJy0nKSA/IDEgOiAtMSlcblxuICBvZmZzZXQgLT0gZGF0ZS5nZXRUaW1lem9uZU9mZnNldCgpXG4gIHRpbWUgPSAoTnVtYmVyKGRhdGUpICsgKG9mZnNldCAqIDYwICogMTAwMCkpXG5cbiAgZGF0ZS5zZXRUaW1lKE51bWJlcih0aW1lKSlcbiAgZGF0ZVxuXG5iYXNlNjREZWNvZGUgPSAoZGF0YSkgLT5cbiAgaWYgYXRvYj9cbiAgICAjIEdlY2tvIGFuZCBXZWJraXQgcHJvdmlkZSBuYXRpdmUgY29kZSBmb3IgdGhpc1xuICAgIGF0b2IoZGF0YSlcbiAgZWxzZVxuICAgICMgQWRhcHRlZCBmcm9tIE1JVC9CU0QgbGljZW5zZWQgY29kZSBhdCBodHRwOi8vcGhwanMub3JnL2Z1bmN0aW9ucy9iYXNlNjRfZGVjb2RlXG4gICAgIyB2ZXJzaW9uIDExMDkuMjAxNVxuICAgIGI2NCA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz1cIlxuICAgIGkgPSAwXG4gICAgYWMgPSAwXG4gICAgZGVjID0gXCJcIlxuICAgIHRtcF9hcnIgPSBbXVxuXG4gICAgaWYgbm90IGRhdGFcbiAgICAgIHJldHVybiBkYXRhXG5cbiAgICBkYXRhICs9ICcnXG5cbiAgICB3aGlsZSBpIDwgZGF0YS5sZW5ndGhcbiAgICAgICMgdW5wYWNrIGZvdXIgaGV4ZXRzIGludG8gdGhyZWUgb2N0ZXRzIHVzaW5nIGluZGV4IHBvaW50cyBpbiBiNjRcbiAgICAgIGgxID0gYjY0LmluZGV4T2YoZGF0YS5jaGFyQXQoaSsrKSlcbiAgICAgIGgyID0gYjY0LmluZGV4T2YoZGF0YS5jaGFyQXQoaSsrKSlcbiAgICAgIGgzID0gYjY0LmluZGV4T2YoZGF0YS5jaGFyQXQoaSsrKSlcbiAgICAgIGg0ID0gYjY0LmluZGV4T2YoZGF0YS5jaGFyQXQoaSsrKSlcblxuICAgICAgYml0cyA9IGgxIDw8IDE4IHwgaDIgPDwgMTIgfCBoMyA8PCA2IHwgaDRcblxuICAgICAgbzEgPSBiaXRzID4+IDE2ICYgMHhmZlxuICAgICAgbzIgPSBiaXRzID4+IDggJiAweGZmXG4gICAgICBvMyA9IGJpdHMgJiAweGZmXG5cbiAgICAgIGlmIGgzID09IDY0XG4gICAgICAgIHRtcF9hcnJbYWMrK10gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG8xKVxuICAgICAgZWxzZSBpZiBoNCA9PSA2NFxuICAgICAgICB0bXBfYXJyW2FjKytdID0gU3RyaW5nLmZyb21DaGFyQ29kZShvMSwgbzIpXG4gICAgICBlbHNlXG4gICAgICAgIHRtcF9hcnJbYWMrK10gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG8xLCBvMiwgbzMpXG5cbiAgICB0bXBfYXJyLmpvaW4oJycpXG5cbmJhc2U2NFVybERlY29kZSA9IChkYXRhKSAtPlxuICBtID0gZGF0YS5sZW5ndGggJSA0XG4gIGlmIG0gIT0gMFxuICAgIGZvciBpIGluIFswLi4uNCAtIG1dXG4gICAgICBkYXRhICs9ICc9J1xuICBkYXRhID0gZGF0YS5yZXBsYWNlKC8tL2csICcrJylcbiAgZGF0YSA9IGRhdGEucmVwbGFjZSgvXy9nLCAnLycpXG4gIGJhc2U2NERlY29kZShkYXRhKVxuXG5wYXJzZVRva2VuID0gKHRva2VuKSAtPlxuICBbaGVhZCwgcGF5bG9hZCwgc2lnXSA9IHRva2VuLnNwbGl0KCcuJylcbiAgSlNPTi5wYXJzZShiYXNlNjRVcmxEZWNvZGUocGF5bG9hZCkpXG5cbiMgUHVibGljOiBTdXBwb3J0cyB0aGUgU3RvcmUgcGx1Z2luIGJ5IHByb3ZpZGluZyBBdXRoZW50aWNhdGlvbiBoZWFkZXJzLlxuY2xhc3MgQW5ub3RhdG9yLlBsdWdpbi5BdXRoIGV4dGVuZHMgQW5ub3RhdG9yLlBsdWdpblxuICAjIFVzZXIgb3B0aW9ucyB0aGF0IGNhbiBiZSBwcm92aWRlZC5cbiAgb3B0aW9uczpcblxuICAgICMgQW4gYXV0aGVudGljYXRpb24gdG9rZW4uIFVzZWQgdG8gc2tpcCB0aGUgcmVxdWVzdCB0byB0aGUgc2VydmVyIGZvciBhXG4gICAgIyBhIHRva2VuLlxuICAgIHRva2VuOiBudWxsXG5cbiAgICAjIFRoZSBVUkwgb24gdGhlIGxvY2FsIHNlcnZlciB0byByZXF1ZXN0IGFuIGF1dGhlbnRpY2F0aW9uIHRva2VuLlxuICAgIHRva2VuVXJsOiAnL2F1dGgvdG9rZW4nXG5cbiAgICAjIElmIHRydWUgd2lsbCB0cnkgYW5kIGZldGNoIGEgdG9rZW4gd2hlbiB0aGUgcGx1Z2luIGlzIGluaXRpYWxpc2VkLlxuICAgIGF1dG9GZXRjaDogdHJ1ZVxuICAgIFxuICAgICMgSFRUUCBtZXRob2QgdG8gdXNlIGZvciBmZXRjaGluZyB0aGUgdG9rZW5cbiAgICByZXF1ZXN0TWV0aG9kOiAnR0VUJ1xuICAgIFxuICAgICMgZGF0YSB0byBzZW5kIHdoZW4gZmV0Y2hpbmcgdGhlIHRva2VuXG4gICAgcmVxdWVzdERhdGE6IG51bGxcbiAgICBcbiAgICAjIGNhbGxiYWNrIHdoZW4gbG9naW4gcmVxdWlyZWRcbiAgICB1bmF1dGhvcml6ZWRDYWxsYmFjazogbnVsbFxuXG4gICMgUHVibGljOiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIEF1dGggcGx1Z2luLlxuICAjXG4gICMgZWxlbWVudCAtIFRoZSBlbGVtZW50IHRvIGJpbmQgYWxsIGV2ZW50cyB0by4gVXN1YWxseSB0aGUgQW5ub3RhdG9yI2VsZW1lbnQuXG4gICMgb3B0aW9ucyAtIEFuIE9iamVjdCBsaXRlcmFsIGNvbnRhaW5pbmcgdXNlciBvcHRpb25zLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgcGx1Z2luID0gbmV3IEFubm90YXRvci5QbHVnaW4uQXV0aChhbm5vdGF0b3IuZWxlbWVudCwge1xuICAjICAgICB0b2tlblVybDogJy9teS9jdXN0b20vcGF0aCdcbiAgIyAgIH0pXG4gICNcbiAgIyBSZXR1cm5zIGluc3RhbmNlIG9mIEF1dGguXG4gIGNvbnN0cnVjdG9yOiAoZWxlbWVudCwgb3B0aW9ucykgLT5cbiAgICBzdXBlclxuXG4gICAgIyBMaXN0IG9mIGZ1bmN0aW9ucyB0byBiZSBleGVjdXRlZCB3aGVuIHdlIGhhdmUgYSB2YWxpZCB0b2tlbi5cbiAgICBAd2FpdGluZ0ZvclRva2VuID0gW11cblxuICAgIGlmIEBvcHRpb25zLnRva2VuXG4gICAgICB0aGlzLnNldFRva2VuKEBvcHRpb25zLnRva2VuKVxuICAgIGVsc2VcbiAgICAgIHRoaXMucmVxdWVzdFRva2VuKClcblxuICAjIFB1YmxpYzogTWFrZXMgYSByZXF1ZXN0IHRvIHRoZSBsb2NhbCBzZXJ2ZXIgZm9yIGFuIGF1dGhlbnRpY2F0aW9uIHRva2VuLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgYXV0aC5yZXF1ZXN0VG9rZW4oKVxuICAjXG4gICMgUmV0dXJucyBqcVhIUiBvYmplY3QuXG4gIHJlcXVlc3RUb2tlbjogLT5cbiAgICBAcmVxdWVzdEluUHJvZ3Jlc3MgPSB0cnVlXG5cbiAgICAkLmFqYXhcbiAgICAgIHVybDogQG9wdGlvbnMudG9rZW5VcmxcbiAgICAgIGRhdGFUeXBlOiAndGV4dCdcbiAgICAgIGRhdGE6IEBvcHRpb25zLnJlcXVlc3REYXRhXG4gICAgICB0eXBlOiBAb3B0aW9ucy5yZXF1ZXN0TWV0aG9kXG4gICAgICB4aHJGaWVsZHM6XG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZSAjIFNlbmQgYW55IGF1dGggY29va2llcyB0byB0aGUgYmFja2VuZFxuXG4gICAgIyBvbiBzdWNjZXNzLCBzZXQgdGhlIGF1dGggdG9rZW5cbiAgICAuZG9uZSAoZGF0YSwgc3RhdHVzLCB4aHIpID0+XG4gICAgICB0aGlzLnNldFRva2VuKGRhdGEpXG5cbiAgICAjIG9uIGZhaWx1cmUsIHJlbGF5IGFueSBtZXNzYWdlIGdpdmVuIGJ5IHRoZSBzZXJ2ZXIgdG8gdGhlIHVzZXIgd2l0aCBhIG5vdGlmaWNhdGlvblxuICAgIC5mYWlsICh4aHIsIHN0YXR1cywgZXJyKSA9PlxuICAgICAgaWYgeGhyLnN0YXR1cyA9PSA0MDFcbiAgICAgICAgY2FsbGJhY2sgPSBAb3B0aW9ucy51bmF1dGhvcml6ZWRDYWxsYmFjayBcbiAgICAgICAgaWYgY2FsbGJhY2s/IGFuZCBjYWxsYmFjayh0aGlzKVxuICAgICAgICAgICMgdHJ5IGFnYWluIGluIDFzIGlmIGNhbGxiYWNrIHJldHVybnMgdHJ1ZVxuICAgICAgICAgIEByZXRyeVRpbWVvdXQgPSBzZXRUaW1lb3V0ICgoKSA9PiB0aGlzLnJlcXVlc3RUb2tlbigpKSwgMTAwMFxuICAgICAgICAgIHJldHVyblxuICAgICAgICAgIFxuICAgICAgbXNnID0gQW5ub3RhdG9yLl90KFwiQ291bGRuJ3QgZ2V0IGF1dGggdG9rZW46XCIpXG4gICAgICBjb25zb2xlLmVycm9yIFwiI3ttc2d9ICN7ZXJyfVwiLCB4aHJcbiAgICAgIEFubm90YXRvci5zaG93Tm90aWZpY2F0aW9uKFwiI3ttc2d9ICN7eGhyLnJlc3BvbnNlVGV4dH1cIiwgQW5ub3RhdG9yLk5vdGlmaWNhdGlvbi5FUlJPUilcblxuICAgICMgYWx3YXlzIHJlc2V0IHRoZSByZXF1ZXN0SW5Qcm9ncmVzcyBpbmRpY2F0b3JcbiAgICAuYWx3YXlzID0+XG4gICAgICBAcmVxdWVzdEluUHJvZ3Jlc3MgPSBmYWxzZVxuXG4gICMgUHVibGljOiBTZXRzIHRoZSBAdG9rZW4gYW5kIGNoZWNrcyBpdCdzIHZhbGlkaXR5LiBJZiB0aGUgdG9rZW4gaXMgaW52YWxpZFxuICAjIHJlcXVlc3RzIGEgbmV3IG9uZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICNcbiAgIyB0b2tlbiAtIEEgdG9rZW4gc3RyaW5nLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgYXV0aC5zZXRUb2tlbignZXlKaC4uLjlqUTNJJylcbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgc2V0VG9rZW46ICh0b2tlbikgLT5cbiAgICBAdG9rZW4gPSB0b2tlblxuICAgICMgUGFyc2UgdGhlIHRva2VuIHdpdGhvdXQgdmVyaWZ5aW5nIGl0cyBhdXRoZW50aWNpdHk6XG4gICAgQF91bnNhZmVUb2tlbiA9IHBhcnNlVG9rZW4odG9rZW4pXG5cbiAgICBpZiB0aGlzLmhhdmVWYWxpZFRva2VuKClcbiAgICAgIGlmIEBvcHRpb25zLmF1dG9GZXRjaFxuICAgICAgICAjIFNldCB0aW1lb3V0IHRvIGZldGNoIG5ldyB0b2tlbiAyIHNlY29uZHMgYmVmb3JlIGN1cnJlbnQgdG9rZW4gZXhwaXJ5XG4gICAgICAgIEByZWZyZXNoVGltZW91dCA9IHNldFRpbWVvdXQgKCgpID0+IHRoaXMucmVxdWVzdFRva2VuKCkpLCAodGhpcy50aW1lVG9FeHBpcnkoKSAtIDIpICogMTAwMFxuXG4gICAgICAjIFNldCBoZWFkZXJzIGZpZWxkIG9uIHRoaXMuZWxlbWVudFxuICAgICAgdGhpcy51cGRhdGVIZWFkZXJzKClcblxuICAgICAgIyBSdW4gY2FsbGJhY2tzIHdhaXRpbmcgZm9yIHRva2VuXG4gICAgICB3aGlsZSBAd2FpdGluZ0ZvclRva2VuLmxlbmd0aCA+IDBcbiAgICAgICAgQHdhaXRpbmdGb3JUb2tlbi5wb3AoKShAX3Vuc2FmZVRva2VuKVxuXG4gICAgZWxzZVxuICAgICAgY29uc29sZS53YXJuIEFubm90YXRvci5fdChcIkRpZG4ndCBnZXQgYSB2YWxpZCB0b2tlbi5cIilcbiAgICAgIGlmIEBvcHRpb25zLmF1dG9GZXRjaFxuICAgICAgICBjb25zb2xlLndhcm4gQW5ub3RhdG9yLl90KFwiR2V0dGluZyBhIG5ldyB0b2tlbiBpbiAxMHMuXCIpXG4gICAgICAgIHNldFRpbWVvdXQgKCgpID0+IHRoaXMucmVxdWVzdFRva2VuKCkpLCAxMCAqIDEwMDBcblxuICAjIFB1YmxpYzogQ2hlY2tzIHRoZSB2YWxpZGl0eSBvZiB0aGUgY3VycmVudCB0b2tlbi4gTm90ZSB0aGF0IHRoaXMgKmRvZXNcbiAgIyBub3QqIGNoZWNrIHRoZSBhdXRoZW50aWNpdHkgb2YgdGhlIHRva2VuLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgYXV0aC5oYXZlVmFsaWRUb2tlbigpICMgPT4gUmV0dXJucyB0cnVlIGlmIHZhbGlkLlxuICAjXG4gICMgUmV0dXJucyB0cnVlIGlmIHRoZSB0b2tlbiBpcyB2YWxpZC5cbiAgaGF2ZVZhbGlkVG9rZW46ICgpIC0+XG4gICAgYWxsRmllbGRzID0gKFxuICAgICAgQF91bnNhZmVUb2tlbiBhbmRcbiAgICAgIEBfdW5zYWZlVG9rZW4uaXNzdWVkQXQgYW5kXG4gICAgICBAX3Vuc2FmZVRva2VuLnR0bCBhbmRcbiAgICAgIEBfdW5zYWZlVG9rZW4uY29uc3VtZXJLZXlcbiAgICApXG5cbiAgICBpZiBhbGxGaWVsZHMgJiYgdGhpcy50aW1lVG9FeHBpcnkoKSA+IDBcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZWxzZVxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgIyBQdWJsaWM6IENhbGN1bGF0ZXMgdGhlIHRpbWUgaW4gc2Vjb25kcyB1bnRpbCB0aGUgY3VycmVudCB0b2tlbiBleHBpcmVzLlxuICAjXG4gICMgUmV0dXJucyBOdW1iZXIgb2Ygc2Vjb25kcyB1bnRpbCB0b2tlbiBleHBpcmVzLlxuICB0aW1lVG9FeHBpcnk6IC0+XG4gICAgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLyAxMDAwXG4gICAgaXNzdWUgPSBjcmVhdGVEYXRlRnJvbUlTTzg2MDEoQF91bnNhZmVUb2tlbi5pc3N1ZWRBdCkuZ2V0VGltZSgpIC8gMTAwMFxuXG4gICAgZXhwaXJ5ID0gaXNzdWUgKyBAX3Vuc2FmZVRva2VuLnR0bFxuICAgIHRpbWVUb0V4cGlyeSA9IGV4cGlyeSAtIG5vd1xuXG4gICAgaWYgKHRpbWVUb0V4cGlyeSA+IDApIHRoZW4gdGltZVRvRXhwaXJ5IGVsc2UgMFxuXG4gICMgUHVibGljOiBVcGRhdGVzIHRoZSBoZWFkZXJzIHRvIGJlIHNlbnQgd2l0aCB0aGUgU3RvcmUgcmVxdWVzdHMuIFRoaXMgaXNcbiAgIyBhY2hpZXZlZCBieSB1cGRhdGluZyB0aGUgJ2Fubm90YXRvcjpoZWFkZXJzJyBrZXkgaW4gdGhlIEBlbGVtZW50LmRhdGEoKVxuICAjIHN0b3JlLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICB1cGRhdGVIZWFkZXJzOiAtPlxuICAgIGN1cnJlbnQgPSBAZWxlbWVudC5kYXRhKCdhbm5vdGF0b3I6aGVhZGVycycpXG4gICAgQGVsZW1lbnQuZGF0YSgnYW5ub3RhdG9yOmhlYWRlcnMnLCAkLmV4dGVuZChjdXJyZW50LCB7XG4gICAgICAneC1hbm5vdGF0b3ItYXV0aC10b2tlbic6IEB0b2tlbixcbiAgICB9KSlcblxuICAjIFJ1bnMgdGhlIHByb3ZpZGVkIGNhbGxiYWNrIGlmIGEgdmFsaWQgdG9rZW4gaXMgYXZhaWxhYmxlLiBPdGhlcndpc2UgcmVxdWVzdHNcbiAgIyBhIHRva2VuIHVudGlsIGl0IHJlY2lldmVzIGEgdmFsaWQgb25lLlxuICAjXG4gICMgY2FsbGJhY2sgLSBBIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGNhbGwgb25jZSBhIHZhbGlkIHRva2VuIGlzIG9idGFpbmVkLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgYXV0aC53aXRoVG9rZW4gLT5cbiAgIyAgICAgc3RvcmUubG9hZEFubm90YXRpb25zKClcbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgd2l0aFRva2VuOiAoY2FsbGJhY2spIC0+XG4gICAgaWYgbm90IGNhbGxiYWNrP1xuICAgICAgcmV0dXJuXG5cbiAgICBpZiB0aGlzLmhhdmVWYWxpZFRva2VuKClcbiAgICAgIGNhbGxiYWNrKEBfdW5zYWZlVG9rZW4pXG4gICAgZWxzZVxuICAgICAgdGhpcy53YWl0aW5nRm9yVG9rZW4ucHVzaChjYWxsYmFjaylcbiAgICAgIGlmIG5vdCBAcmVxdWVzdEluUHJvZ3Jlc3NcbiAgICAgICAgdGhpcy5yZXF1ZXN0VG9rZW4oKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gQW5ub3RhdG9yLlBsdWdpbi5BdXRoXG4iLCJBbm5vdGF0b3IgPSByZXF1aXJlKCdhbm5vdGF0b3InKVxuXG5cbmNsYXNzIEFubm90YXRvci5QbHVnaW4uRmlsdGVyIGV4dGVuZHMgQW5ub3RhdG9yLlBsdWdpblxuICAjIEV2ZW50cyBhbmQgY2FsbGJhY2tzIHRvIGJpbmQgdG8gdGhlIEZpbHRlciNlbGVtZW50LlxuICBldmVudHM6XG4gICAgXCIuYW5ub3RhdG9yLWZpbHRlci1wcm9wZXJ0eSBpbnB1dCBmb2N1c1wiOiBcIl9vbkZpbHRlckZvY3VzXCJcbiAgICBcIi5hbm5vdGF0b3ItZmlsdGVyLXByb3BlcnR5IGlucHV0IGJsdXJcIjogIFwiX29uRmlsdGVyQmx1clwiXG4gICAgXCIuYW5ub3RhdG9yLWZpbHRlci1wcm9wZXJ0eSBpbnB1dCBrZXl1cFwiOiBcIl9vbkZpbHRlcktleXVwXCJcbiAgICBcIi5hbm5vdGF0b3ItZmlsdGVyLXByZXZpb3VzIGNsaWNrXCI6ICAgICAgIFwiX29uUHJldmlvdXNDbGlja1wiXG4gICAgXCIuYW5ub3RhdG9yLWZpbHRlci1uZXh0IGNsaWNrXCI6ICAgICAgICAgICBcIl9vbk5leHRDbGlja1wiXG4gICAgXCIuYW5ub3RhdG9yLWZpbHRlci1jbGVhciBjbGlja1wiOiAgICAgICAgICBcIl9vbkNsZWFyQ2xpY2tcIlxuXG4gICMgQ29tbW9uIGNsYXNzZXMgdXNlZCB0byBjaGFuZ2UgcGx1Z2luIHN0YXRlLlxuICBjbGFzc2VzOlxuICAgIGFjdGl2ZTogICAnYW5ub3RhdG9yLWZpbHRlci1hY3RpdmUnXG4gICAgaGw6XG4gICAgICBoaWRlOiAgICdhbm5vdGF0b3ItaGwtZmlsdGVyZWQnXG4gICAgICBhY3RpdmU6ICdhbm5vdGF0b3ItaGwtYWN0aXZlJ1xuXG4gICMgSFRNTCB0ZW1wbGF0ZXMgZm9yIHRoZSBwbHVnaW4gVUkuXG4gIGh0bWw6XG4gICAgZWxlbWVudDogXCJcIlwiXG4gICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFubm90YXRvci1maWx0ZXJcIj5cbiAgICAgICAgICAgICAgIDxzdHJvbmc+XCJcIlwiICsgQW5ub3RhdG9yLl90KCdOYXZpZ2F0ZTonKSArIFwiXCJcIjwvc3Ryb25nPlxuICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJhbm5vdGF0b3ItZmlsdGVyLW5hdmlnYXRpb25cIj5cbiAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJhbm5vdGF0b3ItZmlsdGVyLXByZXZpb3VzXCI+XCJcIlwiICsgQW5ub3RhdG9yLl90KCdQcmV2aW91cycpICsgXCJcIlwiPC9idXR0b24+XG4gICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYW5ub3RhdG9yLWZpbHRlci1uZXh0XCI+XCJcIlwiICsgQW5ub3RhdG9yLl90KCdOZXh0JykgKyBcIlwiXCI8L2J1dHRvbj5cbiAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgIDxzdHJvbmc+XCJcIlwiICsgQW5ub3RhdG9yLl90KCdGaWx0ZXIgYnk6JykgKyBcIlwiXCI8L3N0cm9uZz5cbiAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICBcIlwiXCJcbiAgICBmaWx0ZXI6ICBcIlwiXCJcbiAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImFubm90YXRvci1maWx0ZXItcHJvcGVydHlcIj5cbiAgICAgICAgICAgICAgIDxsYWJlbD48L2xhYmVsPlxuICAgICAgICAgICAgICAgPGlucHV0Lz5cbiAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYW5ub3RhdG9yLWZpbHRlci1jbGVhclwiPlwiXCJcIiArIEFubm90YXRvci5fdCgnQ2xlYXInKSArIFwiXCJcIjwvYnV0dG9uPlxuICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICBcIlwiXCJcblxuICAjIERlZmF1bHQgb3B0aW9ucyBmb3IgdGhlIHBsdWdpbi5cbiAgb3B0aW9uczpcbiAgICAjIEEgQ1NTIHNlbGVjdG9yIG9yIEVsZW1lbnQgdG8gYXBwZW5kIHRoZSBwbHVnaW4gdG9vbGJhciB0by5cbiAgICBhcHBlbmRUbzogJ2JvZHknXG5cbiAgICAjIEFuIGFycmF5IG9mIGZpbHRlcnMgY2FuIGJlIHByb3ZpZGVkIG9uIGluaXRpYWxpc2F0aW9uLlxuICAgIGZpbHRlcnM6IFtdXG5cbiAgICAjIEFkZHMgYSBkZWZhdWx0IGZpbHRlciBvbiBhbm5vdGF0aW9ucy5cbiAgICBhZGRBbm5vdGF0aW9uRmlsdGVyOiB0cnVlXG5cbiAgICAjIFB1YmxpYzogRGV0ZXJtaW5lcyBpZiB0aGUgcHJvcGVydHkgaXMgY29udGFpbmVkIHdpdGhpbiB0aGUgcHJvdmlkZWRcbiAgICAjIGFubm90YXRpb24gcHJvcGVydHkuIERlZmF1bHQgaXMgdG8gc3BsaXQgdGhlIHN0cmluZyBvbiBzcGFjZXMgYW5kIG9ubHlcbiAgICAjIHJldHVybiB0cnVlIGlmIGFsbCBrZXl3b3JkcyBhcmUgY29udGFpbmVkIGluIHRoZSBzdHJpbmcuIFRoaXMgbWV0aG9kXG4gICAgIyBjYW4gYmUgb3ZlcnJpZGRlbiBieSB0aGUgdXNlciB3aGVuIGluaXRpYWxpc2luZyB0aGUgcGx1Z2luLlxuICAgICNcbiAgICAjIHN0cmluZyAgIC0gQW4gaW5wdXQgU3RyaW5nIGZyb20gdGhlIGZpdGxlci5cbiAgICAjIHByb3BlcnR5IC0gVGhlIGFubm90YXRpb24gcHJvcGVyeSB0byBxdWVyeS5cbiAgICAjXG4gICAgIyBFeGFtcGxlc1xuICAgICNcbiAgICAjICAgcGx1Z2luLm9wdGlvbi5nZXRLZXl3b3JkcygnaGVsbG8nLCAnaGVsbG8gd29ybGQgaG93IGFyZSB5b3U/JylcbiAgICAjICAgIyA9PiBSZXR1cm5zIHRydWVcbiAgICAjXG4gICAgIyAgIHBsdWdpbi5vcHRpb24uZ2V0S2V5d29yZHMoJ2hlbGxvIGJpbGwnLCAnaGVsbG8gd29ybGQgaG93IGFyZSB5b3U/JylcbiAgICAjICAgIyA9PiBSZXR1cm5zIGZhbHNlXG4gICAgI1xuICAgICMgUmV0dXJucyBhbiBBcnJheSBvZiBrZXl3b3JkIFN0cmluZ3MuXG4gICAgaXNGaWx0ZXJlZDogKGlucHV0LCBwcm9wZXJ0eSkgLT5cbiAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgaW5wdXQgYW5kIHByb3BlcnR5XG5cbiAgICAgIGZvciBrZXl3b3JkIGluIChpbnB1dC5zcGxpdCAvXFxzKy8pXG4gICAgICAgIHJldHVybiBmYWxzZSBpZiBwcm9wZXJ0eS5pbmRleE9mKGtleXdvcmQpID09IC0xXG5cbiAgICAgIHJldHVybiB0cnVlXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIEZpbHRlciBwbHVnaW4uXG4gICNcbiAgIyBlbGVtZW50IC0gVGhlIEFubm90YXRvciBlbGVtZW50ICh0aGlzIGlzIGlnbm9yZWQgYnkgdGhlIHBsdWdpbikuXG4gICMgb3B0aW9ucyAtIEFuIE9iamVjdCBsaXRlcmFsIG9mIG9wdGlvbnMuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBmaWx0ZXIgPSBuZXcgQW5ub3RhdG9yLlBsdWdpbi5GaWx0ZXIoYW5ub3RhdG9yLmVsZW1lbnQpXG4gICNcbiAgIyBSZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBGaWx0ZXIgcGx1Z2luLlxuICBjb25zdHJ1Y3RvcjogKGVsZW1lbnQsIG9wdGlvbnMpIC0+XG4gICAgIyBBcyBtb3N0IGV2ZW50cyBmb3IgdGhpcyBwbHVnaW4gYXJlIHJlbGF0aXZlIHRvIHRoZSB0b29sYmFyIHdoaWNoIGlzXG4gICAgIyBub3QgaW5zaWRlIHRoZSBBbm5vdGF0b3IjRWxlbWVudCB3ZSBvdmVycmlkZSB0aGUgZWxlbWVudCBwcm9wZXJ0eS5cbiAgICAjIEFubm90YXRvciNFbGVtZW50IGNhbiBzdGlsbCBiZSBhY2Nlc3NlZCB2aWEgQGFubm90YXRvci5lbGVtZW50LlxuICAgIGVsZW1lbnQgPSAkKEBodG1sLmVsZW1lbnQpLmFwcGVuZFRvKG9wdGlvbnM/LmFwcGVuZFRvIG9yIEBvcHRpb25zLmFwcGVuZFRvKVxuXG4gICAgc3VwZXIgZWxlbWVudCwgb3B0aW9uc1xuXG4gICAgQG9wdGlvbnMuZmlsdGVycyBvcj0gW11cblxuICAgIEBmaWx0ZXIgID0gJChAaHRtbC5maWx0ZXIpXG4gICAgQGZpbHRlcnMgPSBbXVxuICAgIEBjdXJyZW50ICA9IDBcblxuICAjIFB1YmxpYzogQWRkcyBuZXcgZmlsdGVycy4gVXBkYXRlcyB0aGUgQGhpZ2hsaWdodHMgY2FjaGUgYW5kIGNyZWF0ZXMgZXZlbnRcbiAgIyBsaXN0ZW5lcnMgb24gdGhlIGFubm90YXRvciBvYmplY3QuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHBsdWdpbkluaXQ6IC0+XG4gICAgZm9yIGZpbHRlciBpbiBAb3B0aW9ucy5maWx0ZXJzXG4gICAgICB0aGlzLmFkZEZpbHRlcihmaWx0ZXIpXG5cbiAgICB0aGlzLnVwZGF0ZUhpZ2hsaWdodHMoKVxuICAgIHRoaXMuX3NldHVwTGlzdGVuZXJzKCkuX2luc2VydFNwYWNlcigpXG5cbiAgICBpZiBAb3B0aW9ucy5hZGRBbm5vdGF0aW9uRmlsdGVyID09IHRydWVcbiAgICAgIHRoaXMuYWRkRmlsdGVyIHtsYWJlbDogQW5ub3RhdG9yLl90KCdBbm5vdGF0aW9uJyksIHByb3BlcnR5OiAndGV4dCd9XG5cbiAgIyBQdWJsaWM6IHJlbW92ZSB0aGUgZmlsdGVyIHBsdWdpbiBpbnN0YW5jZSBhbmQgdW5iaW5kIGV2ZW50cy5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgZGVzdHJveTogLT5cbiAgICBzdXBlclxuICAgIGh0bWwgPSAkKCdodG1sJylcbiAgICBjdXJyZW50TWFyZ2luID0gcGFyc2VJbnQoaHRtbC5jc3MoJ3BhZGRpbmctdG9wJyksIDEwKSB8fCAwXG4gICAgaHRtbC5jc3MoJ3BhZGRpbmctdG9wJywgY3VycmVudE1hcmdpbiAtIEBlbGVtZW50Lm91dGVySGVpZ2h0KCkpXG4gICAgQGVsZW1lbnQucmVtb3ZlKClcblxuICAjIEFkZHMgbWFyZ2luIHRvIHRoZSBjdXJyZW50IGRvY3VtZW50IHRvIGVuc3VyZSB0aGF0IHRoZSBhbm5vdGF0aW9uIHRvb2xiYXJcbiAgIyBkb2Vzbid0IGNvdmVyIHRoZSBwYWdlIHdoZW4gbm90IHNjcm9sbGVkLlxuICAjXG4gICMgUmV0dXJucyBpdHNlbGZcbiAgX2luc2VydFNwYWNlcjogLT5cbiAgICBodG1sID0gJCgnaHRtbCcpXG4gICAgY3VycmVudE1hcmdpbiA9IHBhcnNlSW50KGh0bWwuY3NzKCdwYWRkaW5nLXRvcCcpLCAxMCkgfHwgMFxuICAgIGh0bWwuY3NzKCdwYWRkaW5nLXRvcCcsIGN1cnJlbnRNYXJnaW4gKyBAZWxlbWVudC5vdXRlckhlaWdodCgpKVxuICAgIHRoaXNcblxuICAjIExpc3RlbnMgdG8gYW5ub3RhdGlvbiBjaGFuZ2UgZXZlbnRzIG9uIHRoZSBBbm5vdGF0b3IgaW4gb3JkZXIgdG8gcmVmcmVzaFxuICAjIHRoZSBAYW5ub3RhdGlvbnMgY29sbGVjdGlvbi5cbiAgIyBUT0RPOiBNYWtlIHRoaXMgbW9yZSBncmFudWxhciBzbyB0aGUgZW50aXJlIGNvbGxlY3Rpb24gaXNuJ3QgcmVsb2FkZWQgZm9yXG4gICMgZXZlcnkgc2luZ2xlIGNoYW5nZS5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmLlxuICBfc2V0dXBMaXN0ZW5lcnM6IC0+XG4gICAgZXZlbnRzID0gW1xuICAgICAgJ2Fubm90YXRpb25zTG9hZGVkJywgJ2Fubm90YXRpb25DcmVhdGVkJyxcbiAgICAgICdhbm5vdGF0aW9uVXBkYXRlZCcsICdhbm5vdGF0aW9uRGVsZXRlZCdcbiAgICBdXG5cbiAgICBmb3IgZXZlbnQgaW4gZXZlbnRzXG4gICAgICBAYW5ub3RhdG9yLnN1YnNjcmliZSBldmVudCwgdGhpcy51cGRhdGVIaWdobGlnaHRzXG4gICAgdGhpc1xuXG4gICMgUHVibGljOiBBZGRzIGEgZmlsdGVyIHRvIHRoZSB0b29sYmFyLiBUaGUgZmlsdGVyIG11c3QgaGF2ZSBib3RoIGEgbGFiZWxcbiAgIyBhbmQgYSBwcm9wZXJ0eSBvZiBhbiBhbm5vdGF0aW9uIG9iamVjdCB0byBmaWx0ZXIgb24uXG4gICNcbiAgIyBvcHRpb25zIC0gQW4gT2JqZWN0IGxpdGVyYWwgY29udGFpbmluZyB0aGUgZmlsdGVycyBvcHRpb25zLlxuICAjICAgICAgICAgICBsYWJlbCAgICAgIC0gQSBwdWJsaWMgZmFjaW5nIFN0cmluZyB0byByZXByZXNlbnQgdGhlIGZpbHRlci5cbiAgIyAgICAgICAgICAgcHJvcGVydHkgICAtIEFuIGFubm90YXRpb24gcHJvcGVydHkgU3RyaW5nIHRvIGZpbHRlciBvbi5cbiAgIyAgICAgICAgICAgaXNGaWx0ZXJlZCAtIEEgY2FsbGJhY2sgRnVuY3Rpb24gdGhhdCByZWNpZXZlcyB0aGUgZmllbGQgaW5wdXRcbiAgIyAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlIGFuZCB0aGUgYW5ub3RhdGlvbiBwcm9wZXJ0eSB2YWx1ZS4gU2VlXG4gICMgICAgICAgICAgICAgICAgICAgICAgICBAb3B0aW9ucy5pc0ZpbHRlcmVkKCkgZm9yIGRldGFpbHMuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIFNldCB1cCBhIGZpbHRlciB0byBmaWx0ZXIgb24gdGhlIGFubm90YXRpb24udXNlciBwcm9wZXJ0eS5cbiAgIyAgIGZpbHRlci5hZGRGaWx0ZXIoe1xuICAjICAgICBsYWJlbDogVXNlcixcbiAgIyAgICAgcHJvcGVydHk6ICd1c2VyJ1xuICAjICAgfSlcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIHRvIGFsbG93IGNoYWluaW5nLlxuICBhZGRGaWx0ZXI6IChvcHRpb25zKSAtPlxuICAgIGZpbHRlciA9ICQuZXh0ZW5kKHtcbiAgICAgIGxhYmVsOiAnJ1xuICAgICAgcHJvcGVydHk6ICcnXG4gICAgICBpc0ZpbHRlcmVkOiBAb3B0aW9ucy5pc0ZpbHRlcmVkXG4gICAgfSwgb3B0aW9ucylcblxuICAgICMgU2tpcCBpZiBhIGZpbHRlciBmb3IgdGhpcyBwcm9wZXJ0eSBoYXMgYmVlbiBsb2FkZWQuXG4gICAgdW5sZXNzIChmIGZvciBmIGluIEBmaWx0ZXJzIHdoZW4gZi5wcm9wZXJ0eSA9PSBmaWx0ZXIucHJvcGVydHkpLmxlbmd0aFxuICAgICAgZmlsdGVyLmlkID0gJ2Fubm90YXRvci1maWx0ZXItJyArIGZpbHRlci5wcm9wZXJ0eVxuICAgICAgZmlsdGVyLmFubm90YXRpb25zID0gW11cbiAgICAgIGZpbHRlci5lbGVtZW50ID0gQGZpbHRlci5jbG9uZSgpLmFwcGVuZFRvKEBlbGVtZW50KVxuICAgICAgZmlsdGVyLmVsZW1lbnQuZmluZCgnbGFiZWwnKVxuICAgICAgICAuaHRtbChmaWx0ZXIubGFiZWwpXG4gICAgICAgIC5hdHRyKCdmb3InLCBmaWx0ZXIuaWQpXG4gICAgICBmaWx0ZXIuZWxlbWVudC5maW5kKCdpbnB1dCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICBpZDogZmlsdGVyLmlkXG4gICAgICAgICAgcGxhY2Vob2xkZXI6IEFubm90YXRvci5fdCgnRmlsdGVyIGJ5ICcpICsgZmlsdGVyLmxhYmVsICsgJ1xcdTIwMjYnXG4gICAgICAgIH0pXG4gICAgICBmaWx0ZXIuZWxlbWVudC5maW5kKCdidXR0b24nKS5oaWRlKClcblxuICAgICAgIyBBZGQgdGhlIGZpbHRlciB0byB0aGUgZWxlbWVudHMgZGF0YSBzdG9yZS5cbiAgICAgIGZpbHRlci5lbGVtZW50LmRhdGEgJ2ZpbHRlcicsIGZpbHRlclxuXG4gICAgICBAZmlsdGVycy5wdXNoIGZpbHRlclxuXG4gICAgdGhpc1xuXG4gICMgUHVibGljOiBVcGRhdGVzIHRoZSBmaWx0ZXIuYW5ub3RhdGlvbnMgcHJvcGVydHkuIFRoZW4gdXBkYXRlcyB0aGUgc3RhdGVcbiAgIyBvZiB0aGUgZWxlbWVudHMgaW4gdGhlIERPTS4gQ2FsbHMgdGhlIGZpbHRlci5pc0ZpbHRlcmVkKCkgbWV0aG9kIHRvXG4gICMgZGV0ZXJtaW5lIGlmIHRoZSBhbm5vdGF0aW9uIHNob3VsZCByZW1haW4uXG4gICNcbiAgIyBmaWx0ZXIgLSBBIGZpbHRlciBPYmplY3QgZnJvbSBAZmlsdGVyc1xuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgZmlsdGVyLnVwZGF0ZUZpbHRlcihteUZpbHRlcilcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIGZvciBjaGFpbmluZ1xuICB1cGRhdGVGaWx0ZXI6IChmaWx0ZXIpIC0+XG4gICAgZmlsdGVyLmFubm90YXRpb25zID0gW11cblxuICAgIHRoaXMudXBkYXRlSGlnaGxpZ2h0cygpXG4gICAgdGhpcy5yZXNldEhpZ2hsaWdodHMoKVxuICAgIGlucHV0ID0gJC50cmltIGZpbHRlci5lbGVtZW50LmZpbmQoJ2lucHV0JykudmFsKClcblxuICAgIGlmIGlucHV0XG4gICAgICBhbm5vdGF0aW9ucyA9IEBoaWdobGlnaHRzLm1hcCAtPiAkKHRoaXMpLmRhdGEoJ2Fubm90YXRpb24nKVxuXG4gICAgICBmb3IgYW5ub3RhdGlvbiBpbiAkLm1ha2VBcnJheShhbm5vdGF0aW9ucylcbiAgICAgICAgcHJvcGVydHkgPSBhbm5vdGF0aW9uW2ZpbHRlci5wcm9wZXJ0eV1cbiAgICAgICAgaWYgZmlsdGVyLmlzRmlsdGVyZWQgaW5wdXQsIHByb3BlcnR5XG4gICAgICAgICAgZmlsdGVyLmFubm90YXRpb25zLnB1c2ggYW5ub3RhdGlvblxuXG4gICAgICB0aGlzLmZpbHRlckhpZ2hsaWdodHMoKVxuXG4gICMgUHVibGljOiBVcGRhdGVzIHRoZSBAaGlnaGxpZ2h0cyBwcm9wZXJ0eSB3aXRoIHRoZSBsYXRlc3QgaGlnaGxpZ2h0XG4gICMgZWxlbWVudHMgaW4gdGhlIERPTS5cbiAgI1xuICAjIFJldHVybnMgYSBqUXVlcnkgY29sbGVjdGlvbiBvZiB0aGUgaGlnaGxpZ2h0IGVsZW1lbnRzLlxuICB1cGRhdGVIaWdobGlnaHRzOiA9PlxuICAgICMgSWdub3JlIGFueSBoaWRkZW4gaGlnaGxpZ2h0cy5cbiAgICBAaGlnaGxpZ2h0cyA9IEBhbm5vdGF0b3IuZWxlbWVudC5maW5kKCcuYW5ub3RhdG9yLWhsOnZpc2libGUnKVxuICAgIEBmaWx0ZXJlZCAgID0gQGhpZ2hsaWdodHMubm90KEBjbGFzc2VzLmhsLmhpZGUpXG5cbiAgIyBQdWJsaWM6IFJ1bnMgdGhyb3VnaCBlYWNoIG9mIHRoZSBmaWx0ZXJzIGFuZCByZW1vdmVzIGFsbCBoaWdobGlnaHRzIG5vdFxuICAjIGN1cnJlbnRseSBpbiBzY29wZS5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIGZvciBjaGFpbmluZy5cbiAgZmlsdGVySGlnaGxpZ2h0czogLT5cbiAgICBhY3RpdmVGaWx0ZXJzID0gJC5ncmVwIEBmaWx0ZXJzLCAoZmlsdGVyKSAtPiAhIWZpbHRlci5hbm5vdGF0aW9ucy5sZW5ndGhcblxuICAgIGZpbHRlcmVkID0gYWN0aXZlRmlsdGVyc1swXT8uYW5ub3RhdGlvbnMgfHwgW11cbiAgICBpZiBhY3RpdmVGaWx0ZXJzLmxlbmd0aCA+IDFcbiAgICAgICMgSWYgdGhlcmUgYXJlIG1vcmUgdGhhbiBvbmUgZmlsdGVyIHRoZW4gb25seSBhbm5vdGF0aW9ucyBtYXRjaGVkIGluIGV2ZXJ5XG4gICAgICAjIGZpbHRlciBzaG91bGQgcmVtYWluLlxuICAgICAgYW5ub3RhdGlvbnMgPSBbXVxuICAgICAgJC5lYWNoIGFjdGl2ZUZpbHRlcnMsIC0+XG4gICAgICAgICQubWVyZ2UoYW5ub3RhdGlvbnMsIHRoaXMuYW5ub3RhdGlvbnMpXG5cbiAgICAgIHVuaXF1ZXMgID0gW11cbiAgICAgIGZpbHRlcmVkID0gW11cbiAgICAgICQuZWFjaCBhbm5vdGF0aW9ucywgLT5cbiAgICAgICAgaWYgJC5pbkFycmF5KHRoaXMsIHVuaXF1ZXMpID09IC0xXG4gICAgICAgICAgdW5pcXVlcy5wdXNoIHRoaXNcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGZpbHRlcmVkLnB1c2ggdGhpc1xuXG4gICAgaGlnaGxpZ2h0cyA9IEBoaWdobGlnaHRzXG4gICAgZm9yIGFubm90YXRpb24sIGluZGV4IGluIGZpbHRlcmVkXG4gICAgICBoaWdobGlnaHRzID0gaGlnaGxpZ2h0cy5ub3QoYW5ub3RhdGlvbi5oaWdobGlnaHRzKVxuXG4gICAgaGlnaGxpZ2h0cy5hZGRDbGFzcyhAY2xhc3Nlcy5obC5oaWRlKVxuXG4gICAgQGZpbHRlcmVkID0gQGhpZ2hsaWdodHMubm90KEBjbGFzc2VzLmhsLmhpZGUpXG4gICAgdGhpc1xuXG4gICMgUHVibGljOiBSZW1vdmVzIGhpZGRlbiBjbGFzcyBmcm9tIGFsbCBhbm5vdGF0aW9ucy5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmIGZvciBjaGFpbmluZy5cbiAgcmVzZXRIaWdobGlnaHRzOiAtPlxuICAgIEBoaWdobGlnaHRzLnJlbW92ZUNsYXNzKEBjbGFzc2VzLmhsLmhpZGUpXG4gICAgQGZpbHRlcmVkID0gQGhpZ2hsaWdodHNcbiAgICB0aGlzXG5cbiAgIyBVcGRhdGVzIHRoZSBmaWx0ZXIgZmllbGQgb24gZm9jdXMuXG4gICNcbiAgIyBldmVudCAtIEEgZm9jdXMgRXZlbnQgb2JqZWN0LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nXG4gIF9vbkZpbHRlckZvY3VzOiAoZXZlbnQpID0+XG4gICAgaW5wdXQgPSAkKGV2ZW50LnRhcmdldClcbiAgICBpbnB1dC5wYXJlbnQoKS5hZGRDbGFzcyhAY2xhc3Nlcy5hY3RpdmUpXG4gICAgaW5wdXQubmV4dCgnYnV0dG9uJykuc2hvdygpXG5cbiAgIyBVcGRhdGVzIHRoZSBmaWx0ZXIgZmllbGQgb24gYmx1ci5cbiAgI1xuICAjIGV2ZW50IC0gQSBibHVyIEV2ZW50IG9iamVjdC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgX29uRmlsdGVyQmx1cjogKGV2ZW50KSA9PlxuICAgIHVubGVzcyBldmVudC50YXJnZXQudmFsdWVcbiAgICAgIGlucHV0ID0gJChldmVudC50YXJnZXQpXG4gICAgICBpbnB1dC5wYXJlbnQoKS5yZW1vdmVDbGFzcyhAY2xhc3Nlcy5hY3RpdmUpXG4gICAgICBpbnB1dC5uZXh0KCdidXR0b24nKS5oaWRlKClcblxuICAjIFVwZGF0ZXMgdGhlIGZpbHRlciBiYXNlZCBvbiB0aGUgaWQgb2YgdGhlIGZpbHRlciBlbGVtZW50LlxuICAjXG4gICMgZXZlbnQgLSBBIGtleXVwIEV2ZW50XG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIF9vbkZpbHRlcktleXVwOiAoZXZlbnQpID0+XG4gICAgZmlsdGVyID0gJChldmVudC50YXJnZXQpLnBhcmVudCgpLmRhdGEoJ2ZpbHRlcicpXG4gICAgdGhpcy51cGRhdGVGaWx0ZXIgZmlsdGVyIGlmIGZpbHRlclxuXG4gICMgTG9jYXRlcyB0aGUgbmV4dC9wcmV2aW91cyBoaWdobGlnaHRlZCBlbGVtZW50IGluIEBoaWdobGlnaHRzIGZyb20gdGhlXG4gICMgY3VycmVudCBvbmUgb3IgZ29lcyB0byB0aGUgdmVyeSBmaXJzdC9sYXN0IGVsZW1lbnQgcmVzcGVjdGl2ZWx5LlxuICAjXG4gICMgcHJldmlvdXMgLSBJZiB0cnVlIGZpbmRzIHRoZSBwcmV2aW91c2x5IGhpZ2hsaWdodGVkIGVsZW1lbnQuXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZi5cbiAgX2ZpbmROZXh0SGlnaGxpZ2h0OiAocHJldmlvdXMpIC0+XG4gICAgcmV0dXJuIHRoaXMgdW5sZXNzIEBoaWdobGlnaHRzLmxlbmd0aFxuXG4gICAgb2Zmc2V0ICAgICAgPSBpZiBwcmV2aW91cyB0aGVuIDAgICAgZWxzZSAtMVxuICAgIHJlc2V0T2Zmc2V0ID0gaWYgcHJldmlvdXMgdGhlbiAtMSAgIGVsc2UgMFxuICAgIG9wZXJhdG9yICAgID0gaWYgcHJldmlvdXMgdGhlbiAnbHQnIGVsc2UgJ2d0J1xuXG4gICAgYWN0aXZlICA9IEBoaWdobGlnaHRzLm5vdCgnLicgKyBAY2xhc3Nlcy5obC5oaWRlKVxuICAgIGN1cnJlbnQgPSBhY3RpdmUuZmlsdGVyKCcuJyArIEBjbGFzc2VzLmhsLmFjdGl2ZSlcbiAgICBjdXJyZW50ID0gYWN0aXZlLmVxKG9mZnNldCkgdW5sZXNzIGN1cnJlbnQubGVuZ3RoXG5cbiAgICBhbm5vdGF0aW9uID0gY3VycmVudC5kYXRhICdhbm5vdGF0aW9uJ1xuXG4gICAgaW5kZXggPSBhY3RpdmUuaW5kZXggY3VycmVudFswXVxuICAgIG5leHQgID0gYWN0aXZlLmZpbHRlcihcIjoje29wZXJhdG9yfSgje2luZGV4fSlcIikubm90KGFubm90YXRpb24uaGlnaGxpZ2h0cykuZXEocmVzZXRPZmZzZXQpXG4gICAgbmV4dCAgPSBhY3RpdmUuZXEocmVzZXRPZmZzZXQpIHVubGVzcyBuZXh0Lmxlbmd0aFxuXG4gICAgdGhpcy5fc2Nyb2xsVG9IaWdobGlnaHQgbmV4dC5kYXRhKCdhbm5vdGF0aW9uJykuaGlnaGxpZ2h0c1xuXG4gICMgTG9jYXRlcyB0aGUgbmV4dCBoaWdobGlnaHRlZCBlbGVtZW50IGluIEBoaWdobGlnaHRzIGZyb20gdGhlIGN1cnJlbnQgb25lXG4gICMgb3IgZ29lcyB0byB0aGUgdmVyeSBmaXJzdCBlbGVtZW50LlxuICAjXG4gICMgZXZlbnQgLSBBIGNsaWNrIEV2ZW50LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nXG4gIF9vbk5leHRDbGljazogKGV2ZW50KSA9PlxuICAgIHRoaXMuX2ZpbmROZXh0SGlnaGxpZ2h0KClcblxuICAjIExvY2F0ZXMgdGhlIHByZXZpb3VzIGhpZ2hsaWdodGVkIGVsZW1lbnQgaW4gQGhpZ2hsaWdodHMgZnJvbSB0aGUgY3VycmVudCBvbmVcbiAgIyBvciBnb2VzIHRvIHRoZSB2ZXJ5IGxhc3QgZWxlbWVudC5cbiAgI1xuICAjIGV2ZW50IC0gQSBjbGljayBFdmVudC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZ1xuICBfb25QcmV2aW91c0NsaWNrOiAoZXZlbnQpID0+XG4gICAgdGhpcy5fZmluZE5leHRIaWdobGlnaHQgdHJ1ZVxuXG4gICMgU2Nyb2xscyB0byB0aGUgaGlnaGxpZ2h0IHByb3ZpZGVkLiBBbiBhZGRzIGFuIGFjdGl2ZSBjbGFzcyB0byBpdC5cbiAgI1xuICAjIGhpZ2hsaWdodCAtIEVpdGhlciBoaWdobGlnaHQgRWxlbWVudCBvciBhbiBBcnJheSBvZiBlbGVtZW50cy4gVGhpcyB2YWx1ZVxuICAjICAgICAgICAgICAgIGlzIHVzdWFsbHkgcmV0cmlldmVkIGZyb20gYW5ub3RhdGlvbi5oaWdobGlnaHRzLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBfc2Nyb2xsVG9IaWdobGlnaHQ6IChoaWdobGlnaHQpIC0+XG4gICAgaGlnaGxpZ2h0ID0gJChoaWdobGlnaHQpXG5cbiAgICBAaGlnaGxpZ2h0cy5yZW1vdmVDbGFzcyhAY2xhc3Nlcy5obC5hY3RpdmUpXG4gICAgaGlnaGxpZ2h0LmFkZENsYXNzKEBjbGFzc2VzLmhsLmFjdGl2ZSlcblxuICAgICQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHtcbiAgICAgIHNjcm9sbFRvcDogaGlnaGxpZ2h0Lm9mZnNldCgpLnRvcCAtIChAZWxlbWVudC5oZWlnaHQoKSArIDIwKVxuICAgIH0sIDE1MClcblxuICAjIENsZWFycyB0aGUgcmVsZXZhbnQgaW5wdXQgd2hlbiB0aGUgY2xlYXIgYnV0dG9uIGlzIGNsaWNrZWQuXG4gICNcbiAgIyBldmVudCAtIEEgY2xpY2sgRXZlbnQgb2JqZWN0LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBfb25DbGVhckNsaWNrOiAoZXZlbnQpIC0+XG4gICAgJChldmVudC50YXJnZXQpLnByZXYoJ2lucHV0JykudmFsKCcnKS5rZXl1cCgpLmJsdXIoKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gQW5ub3RhdG9yLlBsdWdpbi5GaWx0ZXJcbiIsIkFubm90YXRvciA9IHJlcXVpcmUoJ2Fubm90YXRvcicpXG5cblxuIyBQbHVnaW4gdGhhdCByZW5kZXJzIGFubm90YXRpb24gY29tbWVudHMgZGlzcGxheWVkIGluIHRoZSBWaWV3ZXIgaW4gTWFya2Rvd24uXG4jIFJlcXVpcmVzIFNob3dkb3duIGxpYnJhcnkgdG8gYmUgcHJlc2VudCBpbiB0aGUgcGFnZSB3aGVuIGluaXRpYWxpc2VkLlxuY2xhc3MgQW5ub3RhdG9yLlBsdWdpbi5NYXJrZG93biBleHRlbmRzIEFubm90YXRvci5QbHVnaW5cbiAgIyBFdmVudHMgdG8gYmUgYm91bmQgdG8gdGhlIEBlbGVtZW50LlxuICBldmVudHM6XG4gICAgJ2Fubm90YXRpb25WaWV3ZXJUZXh0RmllbGQnOiAndXBkYXRlVGV4dEZpZWxkJ1xuXG4gICMgUHVibGljOiBJbml0YWlsaXNlcyBhbiBpbnN0YW5jZSBvZiB0aGUgTWFya2Rvd24gcGx1Z2luLlxuICAjXG4gICMgZWxlbWVudCAtIFRoZSBBbm5vdGF0b3IjZWxlbWVudC5cbiAgIyBvcHRpb25zIC0gQW4gb3B0aW9ucyBPYmplY3QgKHRoZXJlIGFyZSBjdXJyZW50bHkgbm8gb3B0aW9ucykuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBwbHVnaW4gPSBuZXcgQW5ub3RhdG9yLlBsdWdpbi5NYXJrZG93bihhbm5vdGF0b3IuZWxlbWVudClcbiAgI1xuICAjIFJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgQW5ub3RhdG9yLlBsdWdpbi5NYXJrZG93bi5cbiAgY29uc3RydWN0b3I6IChlbGVtZW50LCBvcHRpb25zKSAtPlxuICAgIGlmIFNob3dkb3duPy5jb252ZXJ0ZXI/XG4gICAgICBzdXBlclxuICAgICAgQGNvbnZlcnRlciA9IG5ldyBTaG93ZG93bi5jb252ZXJ0ZXIoKVxuICAgIGVsc2VcbiAgICAgIGNvbnNvbGUuZXJyb3IgQW5ub3RhdG9yLl90KFwiVG8gdXNlIHRoZSBNYXJrZG93biBwbHVnaW4sIHlvdSBtdXN0IGluY2x1ZGUgU2hvd2Rvd24gaW50byB0aGUgcGFnZSBmaXJzdC5cIilcblxuICAjIEFubm90YXRvciBldmVudCBjYWxsYmFjay4gRGlzcGxheXMgdGhlIGFubm90YXRpb24udGV4dCBhcyBhIE1hcmtkb3duXG4gICMgcmVuZGVyZWQgdmVyc2lvbi5cbiAgI1xuICAjIGZpZWxkICAgICAgLSBUaGUgdmlld2VyIGZpZWxkIEVsZW1lbnQuXG4gICMgYW5ub3RhdGlvbiAtIFRoZSBhbm5vdGF0aW9uIE9iamVjdCBiZWluZyBkaXNwbGF5ZWQuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICAjIE5vcm1hbGx5IGNhbGxlZCBieSBBbm5vdGF0b3Ijdmlld2VyKClcbiAgIyAgIHBsdWdpbi51cGRhdGVUZXh0RmllbGQoZmllbGQsIHt0ZXh0OiAnTXkgX21hcmtkb3duXyBjb21tZW50J30pXG4gICMgICAkKGZpZWxkKS5odG1sKCkgIyA9PiBSZXR1cm5zIFwiTXkgPGVtPm1hcmtkb3duPC9lbT4gY29tbWVudFwiXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmdcbiAgdXBkYXRlVGV4dEZpZWxkOiAoZmllbGQsIGFubm90YXRpb24pID0+XG4gICAgIyBFc2NhcGUgYW55IEhUTUwgaW4gdGhlIHRleHQgdG8gcHJldmVudCBYU1MuXG4gICAgdGV4dCA9IEFubm90YXRvci5VdGlsLmVzY2FwZShhbm5vdGF0aW9uLnRleHQgfHwgJycpXG4gICAgJChmaWVsZCkuaHRtbCh0aGlzLmNvbnZlcnQodGV4dCkpXG5cbiAgIyBDb252ZXJ0cyBwcm92aWRlZCB0ZXh0IGludG8gbWFya2Rvd24uXG4gICNcbiAgIyB0ZXh0IC0gQSBTdHJpbmcgb2YgTWFya2Rvd24gdG8gcmVuZGVyIGFzIEhUTUwuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgcGx1Z2luLmNvbnZlcnQoJ1RoaXMgaXMgX3ZlcnlfIGJhc2ljIFtNYXJrZG93bl0oaHR0cDovL2RhcmluZ2ZpcmViYWxsLmNvbSknKVxuICAjICMgPT4gUmV0dXJucyBcIlRoaXMgaXMgPGVtPnZlcnk8ZW0+IGJhc2ljIDxhIGhyZWY9XCJodHRwOi8vLi4uXCI+TWFya2Rvd248L2E+XCJcbiAgI1xuICAjIFJldHVybnMgSFRNTCBzdHJpbmcuXG4gIGNvbnZlcnQ6ICh0ZXh0KSAtPlxuICAgIEBjb252ZXJ0ZXIubWFrZUh0bWwgdGV4dFxuXG5cbm1vZHVsZS5leHBvcnRzID0gQW5ub3RhdG9yLlBsdWdpbi5NYXJrZG93blxuIiwiQW5ub3RhdG9yID0gcmVxdWlyZSgnYW5ub3RhdG9yJylcblxuXG4jIFB1YmxpYzogUGx1Z2luIGZvciBzZXR0aW5nIHBlcm1pc3Npb25zIG9uIG5ld2x5IGNyZWF0ZWQgYW5ub3RhdGlvbnMgYXMgd2VsbCBhc1xuIyBtYW5hZ2luZyB1c2VyIHBlcm1pc3Npb25zIHN1Y2ggYXMgdmlld2luZy9lZGl0aW5nL2RlbGV0aW5nIGFubm90aW9ucy5cbiNcbiMgZWxlbWVudCAtIEEgRE9NIEVsZW1lbnQgdXBvbiB3aGljaCBldmVudHMgYXJlIGJvdW5kLiBXaGVuIGluaXRpYWxpc2VkIGJ5XG4jICAgICAgICAgICB0aGUgQW5ub3RhdG9yIGl0IGlzIHRoZSBBbm5vdGF0b3IgZWxlbWVudC5cbiMgb3B0aW9ucyAtIEFuIE9iamVjdCBsaXRlcmFsIGNvbnRhaW5pbmcgY3VzdG9tIG9wdGlvbnMuXG4jXG4jIEV4YW1wbGVzXG4jXG4jICAgbmV3IEFubm90YXRvci5wbHVnaW4uUGVybWlzc2lvbnMoYW5ub3RhdG9yLmVsZW1lbnQsIHtcbiMgICAgIHVzZXI6ICdBbGljZSdcbiMgICB9KVxuI1xuIyBSZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBQZXJtaXNzaW9ucyBPYmplY3QuXG5jbGFzcyBBbm5vdGF0b3IuUGx1Z2luLlBlcm1pc3Npb25zIGV4dGVuZHMgQW5ub3RhdG9yLlBsdWdpblxuXG4gICMgQSBPYmplY3QgbGl0ZXJhbCBvZiBkZWZhdWx0IG9wdGlvbnMgZm9yIHRoZSBjbGFzcy5cbiAgb3B0aW9uczpcblxuICAgICMgRGlzcGxheXMgYW4gXCJBbnlvbmUgY2FuIHZpZXcgdGhpcyBhbm5vdGF0aW9uXCIgY2hlY2tib3ggaW4gdGhlIEVkaXRvci5cbiAgICBzaG93Vmlld1Blcm1pc3Npb25zQ2hlY2tib3g6IHRydWVcblxuICAgICMgRGlzcGxheXMgYW4gXCJBbnlvbmUgY2FuIGVkaXQgdGhpcyBhbm5vdGF0aW9uXCIgY2hlY2tib3ggaW4gdGhlIEVkaXRvci5cbiAgICBzaG93RWRpdFBlcm1pc3Npb25zQ2hlY2tib3g6IHRydWVcblxuICAgICMgUHVibGljOiBVc2VkIGJ5IHRoZSBwbHVnaW4gdG8gZGV0ZXJtaW5lIGEgdW5pcXVlIGlkIGZvciB0aGUgQHVzZXIgcHJvcGVydHkuXG4gICAgIyBCeSBkZWZhdWx0IHRoaXMgYWNjZXB0cyBhbmQgcmV0dXJucyB0aGUgdXNlciBTdHJpbmcgYnV0IGNhbiBiZSBvdmVyLVxuICAgICMgcmlkZGVuIGluIHRoZSBAb3B0aW9ucyBvYmplY3QgcGFzc2VkIGludG8gdGhlIGNvbnN0cnVjdG9yLlxuICAgICNcbiAgICAjIHVzZXIgLSBBIFN0cmluZyB1c2VybmFtZSBvciBudWxsIGlmIG5vIHVzZXIgaXMgc2V0LlxuICAgICNcbiAgICAjIFJldHVybnMgdGhlIFN0cmluZyBwcm92aWRlZCBhcyB1c2VyIG9iamVjdC5cbiAgICB1c2VySWQ6ICh1c2VyKSAtPiB1c2VyXG5cbiAgICAjIFB1YmxpYzogVXNlZCBieSB0aGUgcGx1Z2luIHRvIGRldGVybWluZSBhIGRpc3BsYXkgbmFtZSBmb3IgdGhlIEB1c2VyXG4gICAgIyBwcm9wZXJ0eS4gQnkgZGVmYXVsdCB0aGlzIGFjY2VwdHMgYW5kIHJldHVybnMgdGhlIHVzZXIgU3RyaW5nIGJ1dCBjYW4gYmVcbiAgICAjIG92ZXItcmlkZGVuIGluIHRoZSBAb3B0aW9ucyBvYmplY3QgcGFzc2VkIGludG8gdGhlIGNvbnN0cnVjdG9yLlxuICAgICNcbiAgICAjIHVzZXIgLSBBIFN0cmluZyB1c2VybmFtZSBvciBudWxsIGlmIG5vIHVzZXIgaXMgc2V0LlxuICAgICNcbiAgICAjIFJldHVybnMgdGhlIFN0cmluZyBwcm92aWRlZCBhcyB1c2VyIG9iamVjdFxuICAgIHVzZXJTdHJpbmc6ICh1c2VyKSAtPiB1c2VyXG5cbiAgICAjIFB1YmxpYzogVXNlZCBieSBQZXJtaXNzaW9ucyNhdXRob3JpemUgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSB1c2VyIGNhblxuICAgICMgcGVyZm9ybSBhbiBhY3Rpb24gb24gYW4gYW5ub3RhdGlvbi4gT3ZlcnJpZGluZyB0aGlzIGZ1bmN0aW9uIGFsbG93c1xuICAgICMgYSBmYXIgbW9yZSBjb21wbGV4IHBlcm1pc3Npb25zIHN5c3llbS5cbiAgICAjXG4gICAgIyBCeSBkZWZhdWx0IHRoaXMgYXV0aG9yaXplcyB0aGUgYWN0aW9uIGlmIGFueSBvZiB0aHJlZSBzY2VuYXJpb3MgYXJlIHRydWU6XG4gICAgI1xuICAgICMgICAgIDEpIHRoZSBhbm5vdGF0aW9uIGhhcyBhICdwZXJtaXNzaW9ucycgb2JqZWN0LCBhbmQgZWl0aGVyIHRoZSBmaWVsZCBmb3JcbiAgICAjICAgICAgICB0aGUgc3BlY2lmaWVkIGFjdGlvbiBpcyBtaXNzaW5nLCBlbXB0eSwgb3IgY29udGFpbnMgdGhlIHVzZXJJZCBvZiB0aGVcbiAgICAjICAgICAgICBjdXJyZW50IHVzZXIsIGkuZS4gQG9wdGlvbnMudXNlcklkKEB1c2VyKVxuICAgICNcbiAgICAjICAgICAyKSB0aGUgYW5ub3RhdGlvbiBoYXMgYSAndXNlcicgcHJvcGVydHksIGFuZCBAb3B0aW9ucy51c2VySWQoQHVzZXIpIG1hdGNoZXNcbiAgICAjICAgICAgICAnYW5ub3RhdGlvbi51c2VyJ1xuICAgICNcbiAgICAjICAgICAzKSB0aGUgYW5ub3RhdGlvbiBoYXMgbm8gJ3Blcm1pc3Npb25zJyBvciAndXNlcicgcHJvcGVydGllc1xuICAgICNcbiAgICAjIGFubm90YXRpb24gLSBUaGUgYW5ub3RhdGlvbiBvbiB3aGljaCB0aGUgYWN0aW9uIGlzIGJlaW5nIHJlcXVlc3RlZC5cbiAgICAjIGFjdGlvbiAtIFRoZSBhY3Rpb24gYmVpbmcgcmVxdWVzdGVkOiBlLmcuICd1cGRhdGUnLCAnZGVsZXRlJy5cbiAgICAjIHVzZXIgLSBUaGUgdXNlciBvYmplY3QgKG9yIHN0cmluZykgcmVxdWVzdGluZyB0aGUgYWN0aW9uLiBUaGlzIGlzIHVzdWFsbHlcbiAgICAjICAgICAgICBhdXRvbWF0aWNhbGx5IHBhc3NlZCBieSBQZXJtaXNzaW9ucyNhdXRob3JpemUgYXMgdGhlIGN1cnJlbnQgdXNlciAoQHVzZXIpXG4gICAgI1xuICAgICMgICBwZXJtaXNzaW9ucy5zZXRVc2VyKG51bGwpXG4gICAgIyAgIHBlcm1pc3Npb25zLmF1dGhvcml6ZSgndXBkYXRlJywge30pXG4gICAgIyAgICMgPT4gdHJ1ZVxuICAgICNcbiAgICAjICAgcGVybWlzc2lvbnMuc2V0VXNlcignYWxpY2UnKVxuICAgICMgICBwZXJtaXNzaW9ucy5hdXRob3JpemUoJ3VwZGF0ZScsIHt1c2VyOiAnYWxpY2UnfSlcbiAgICAjICAgIyA9PiB0cnVlXG4gICAgIyAgIHBlcm1pc3Npb25zLmF1dGhvcml6ZSgndXBkYXRlJywge3VzZXI6ICdib2InfSlcbiAgICAjICAgIyA9PiBmYWxzZVxuICAgICNcbiAgICAjICAgcGVybWlzc2lvbnMuc2V0VXNlcignYWxpY2UnKVxuICAgICMgICBwZXJtaXNzaW9ucy5hdXRob3JpemUoJ3VwZGF0ZScsIHtcbiAgICAjICAgICB1c2VyOiAnYm9iJyxcbiAgICAjICAgICBwZXJtaXNzaW9uczogWyd1cGRhdGUnOiBbJ2FsaWNlJywgJ2JvYiddXVxuICAgICMgICB9KVxuICAgICMgICAjID0+IHRydWVcbiAgICAjICAgcGVybWlzc2lvbnMuYXV0aG9yaXplKCdkZXN0cm95Jywge1xuICAgICMgICAgIHVzZXI6ICdib2InLFxuICAgICMgICAgIHBlcm1pc3Npb25zOiBbXG4gICAgIyAgICAgICAndXBkYXRlJzogWydhbGljZScsICdib2InXVxuICAgICMgICAgICAgJ2Rlc3Ryb3knOiBbJ2JvYiddXG4gICAgIyAgICAgXVxuICAgICMgICB9KVxuICAgICMgICAjID0+IGZhbHNlXG4gICAgI1xuICAgICMgUmV0dXJucyBhIEJvb2xlYW4sIHRydWUgaWYgdGhlIHVzZXIgaXMgYXV0aG9yaXNlZCBmb3IgdGhlIHRva2VuIHByb3ZpZGVkLlxuICAgIHVzZXJBdXRob3JpemU6IChhY3Rpb24sIGFubm90YXRpb24sIHVzZXIpIC0+XG4gICAgICAjIEZpbmUtZ3JhaW5lZCBjdXN0b20gYXV0aG9yaXphdGlvblxuICAgICAgaWYgYW5ub3RhdGlvbi5wZXJtaXNzaW9uc1xuICAgICAgICB0b2tlbnMgPSBhbm5vdGF0aW9uLnBlcm1pc3Npb25zW2FjdGlvbl0gfHwgW11cblxuICAgICAgICBpZiB0b2tlbnMubGVuZ3RoID09IDBcbiAgICAgICAgICAjIEVtcHR5IG9yIG1pc3NpbmcgdG9rZW5zIGFycmF5OiBhbnlvbmUgY2FuIHBlcmZvcm0gYWN0aW9uLlxuICAgICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgICAgZm9yIHRva2VuIGluIHRva2Vuc1xuICAgICAgICAgIGlmIHRoaXMudXNlcklkKHVzZXIpID09IHRva2VuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgICAgICMgTm8gdG9rZW5zIG1hdGNoZWQ6IGFjdGlvbiBzaG91bGQgbm90IGJlIHBlcmZvcm1lZC5cbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgICMgQ29hcnNlLWdyYWluZWQgYXV0aG9yaXphdGlvblxuICAgICAgZWxzZSBpZiBhbm5vdGF0aW9uLnVzZXJcbiAgICAgICAgaWYgdXNlclxuICAgICAgICAgIHJldHVybiB0aGlzLnVzZXJJZCh1c2VyKSA9PSB0aGlzLnVzZXJJZChhbm5vdGF0aW9uLnVzZXIpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgIyBObyBhdXRob3JpemF0aW9uIGluZm8gb24gYW5ub3RhdGlvbjogZnJlZS1mb3ItYWxsIVxuICAgICAgdHJ1ZVxuXG4gICAgIyBEZWZhdWx0IHVzZXIgb2JqZWN0LlxuICAgIHVzZXI6ICcnXG5cbiAgICAjIERlZmF1bHQgcGVybWlzc2lvbnMgZm9yIGFsbCBhbm5vdGF0aW9ucy4gQW55b25lIGNhbiBkbyBhbnl0aGluZ1xuICAgICMgKGFzc3VtaW5nIGRlZmF1bHQgdXNlckF1dGhvcml6ZSBmdW5jdGlvbikuXG4gICAgcGVybWlzc2lvbnM6IHtcbiAgICAgICdyZWFkJzogICBbXVxuICAgICAgJ3VwZGF0ZSc6IFtdXG4gICAgICAnZGVsZXRlJzogW11cbiAgICAgICdhZG1pbic6ICBbXVxuICAgIH1cblxuICAjIFRoZSBjb25zdHJ1Y3RvciBjYWxsZWQgd2hlbiBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgUGVybWlzc2lvbnNcbiAgIyBwbHVnaW4gaXMgY3JlYXRlZC4gU2VlIGNsYXNzIGRvY3VtZW50YXRpb24gZm9yIHVzYWdlLlxuICAjXG4gICMgZWxlbWVudCAtIEEgRE9NIEVsZW1lbnQgdXBvbiB3aGljaCBldmVudHMgYXJlIGJvdW5kLi5cbiAgIyBvcHRpb25zIC0gQW4gT2JqZWN0IGxpdGVyYWwgY29udGFpbmluZyBjdXN0b20gb3B0aW9ucy5cbiAgI1xuICAjIFJldHVybnMgYW4gaW5zdGFuY2Ugb2YgdGhlIFBlcm1pc3Npb25zIG9iamVjdC5cbiAgY29uc3RydWN0b3I6IChlbGVtZW50LCBvcHRpb25zKSAtPlxuICAgIHN1cGVyXG5cbiAgICBpZiBAb3B0aW9ucy51c2VyXG4gICAgICB0aGlzLnNldFVzZXIoQG9wdGlvbnMudXNlcilcbiAgICAgIGRlbGV0ZSBAb3B0aW9ucy51c2VyXG5cbiAgIyBQdWJsaWM6IEluaXRpYWxpemVzIHRoZSBwbHVnaW4gYW5kIHJlZ2lzdGVycyBmaWVsZHMgd2l0aCB0aGVcbiAgIyBBbm5vdGF0b3IuRWRpdG9yIGFuZCBBbm5vdGF0b3IuVmlld2VyLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBwbHVnaW5Jbml0OiAtPlxuICAgIHJldHVybiB1bmxlc3MgQW5ub3RhdG9yLnN1cHBvcnRlZCgpXG5cbiAgICBAYW5ub3RhdG9yLnN1YnNjcmliZSgnYmVmb3JlQW5ub3RhdGlvbkNyZWF0ZWQnLCB0aGlzLmFkZEZpZWxkc1RvQW5ub3RhdGlvbilcblxuICAgIHNlbGYgPSB0aGlzXG4gICAgY3JlYXRlQ2FsbGJhY2sgPSAobWV0aG9kLCB0eXBlKSAtPlxuICAgICAgKGZpZWxkLCBhbm5vdGF0aW9uKSAtPiBzZWxmW21ldGhvZF0uY2FsbChzZWxmLCB0eXBlLCBmaWVsZCwgYW5ub3RhdGlvbilcblxuICAgICMgU2V0IHVwIHVzZXIgYW5kIGRlZmF1bHQgcGVybWlzc2lvbnMgZnJvbSBhdXRoIHRva2VuIGlmIG5vbmUgY3VycmVudGx5IGdpdmVuXG4gICAgaWYgIUB1c2VyIGFuZCBAYW5ub3RhdG9yLnBsdWdpbnMuQXV0aFxuICAgICAgQGFubm90YXRvci5wbHVnaW5zLkF1dGgud2l0aFRva2VuKHRoaXMuX3NldEF1dGhGcm9tVG9rZW4pXG5cbiAgICBpZiBAb3B0aW9ucy5zaG93Vmlld1Blcm1pc3Npb25zQ2hlY2tib3ggPT0gdHJ1ZVxuICAgICAgQGFubm90YXRvci5lZGl0b3IuYWRkRmllbGQoe1xuICAgICAgICB0eXBlOiAgICdjaGVja2JveCdcbiAgICAgICAgbGFiZWw6ICBBbm5vdGF0b3IuX3QoJ0FsbG93IGFueW9uZSB0byA8c3Ryb25nPnZpZXc8L3N0cm9uZz4gdGhpcyBhbm5vdGF0aW9uJylcbiAgICAgICAgbG9hZDogICBjcmVhdGVDYWxsYmFjaygndXBkYXRlUGVybWlzc2lvbnNGaWVsZCcsICdyZWFkJylcbiAgICAgICAgc3VibWl0OiBjcmVhdGVDYWxsYmFjaygndXBkYXRlQW5ub3RhdGlvblBlcm1pc3Npb25zJywgJ3JlYWQnKVxuICAgICAgfSlcblxuICAgIGlmIEBvcHRpb25zLnNob3dFZGl0UGVybWlzc2lvbnNDaGVja2JveCA9PSB0cnVlXG4gICAgICBAYW5ub3RhdG9yLmVkaXRvci5hZGRGaWVsZCh7XG4gICAgICAgIHR5cGU6ICAgJ2NoZWNrYm94J1xuICAgICAgICBsYWJlbDogIEFubm90YXRvci5fdCgnQWxsb3cgYW55b25lIHRvIDxzdHJvbmc+ZWRpdDwvc3Ryb25nPiB0aGlzIGFubm90YXRpb24nKVxuICAgICAgICBsb2FkOiAgIGNyZWF0ZUNhbGxiYWNrKCd1cGRhdGVQZXJtaXNzaW9uc0ZpZWxkJywgJ3VwZGF0ZScpXG4gICAgICAgIHN1Ym1pdDogY3JlYXRlQ2FsbGJhY2soJ3VwZGF0ZUFubm90YXRpb25QZXJtaXNzaW9ucycsICd1cGRhdGUnKVxuICAgICAgfSlcblxuICAgICMgU2V0dXAgdGhlIGRpc3BsYXkgb2YgYW5ub3RhdGlvbnMgaW4gdGhlIFZpZXdlci5cbiAgICBAYW5ub3RhdG9yLnZpZXdlci5hZGRGaWVsZCh7XG4gICAgICBsb2FkOiB0aGlzLnVwZGF0ZVZpZXdlclxuICAgIH0pXG5cbiAgICAjIEFkZCBhIGZpbHRlciB0byB0aGUgRmlsdGVyIHBsdWdpbiBpZiBsb2FkZWQuXG4gICAgaWYgQGFubm90YXRvci5wbHVnaW5zLkZpbHRlclxuICAgICAgQGFubm90YXRvci5wbHVnaW5zLkZpbHRlci5hZGRGaWx0ZXIoe1xuICAgICAgICBsYWJlbDogQW5ub3RhdG9yLl90KCdVc2VyJylcbiAgICAgICAgcHJvcGVydHk6ICd1c2VyJ1xuICAgICAgICBpc0ZpbHRlcmVkOiAoaW5wdXQsIHVzZXIpID0+XG4gICAgICAgICAgdXNlciA9IEBvcHRpb25zLnVzZXJTdHJpbmcodXNlcilcblxuICAgICAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgaW5wdXQgYW5kIHVzZXJcbiAgICAgICAgICBmb3Iga2V5d29yZCBpbiAoaW5wdXQuc3BsaXQgL1xccyovKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlIGlmIHVzZXIuaW5kZXhPZihrZXl3b3JkKSA9PSAtMVxuXG4gICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH0pXG5cbiAgIyBQdWJsaWM6IFNldHMgdGhlIFBlcm1pc3Npb25zI3VzZXIgcHJvcGVydHkuXG4gICNcbiAgIyB1c2VyIC0gQSBTdHJpbmcgb3IgT2JqZWN0IHRvIHJlcHJlc2VudCB0aGUgY3VycmVudCB1c2VyLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgcGVybWlzc2lvbnMuc2V0VXNlcignQWxpY2UnKVxuICAjXG4gICMgICBwZXJtaXNzaW9ucy5zZXRVc2VyKHtpZDogMzUsIG5hbWU6ICdBbGljZSd9KVxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBzZXRVc2VyOiAodXNlcikgLT5cbiAgICBAdXNlciA9IHVzZXJcblxuICAjIEV2ZW50IGNhbGxiYWNrOiBBcHBlbmRzIHRoZSBAdXNlciBhbmQgQG9wdGlvbnMucGVybWlzc2lvbnMgb2JqZWN0cyB0byB0aGVcbiAgIyBwcm92aWRlZCBhbm5vdGF0aW9uIG9iamVjdC4gT25seSBhcHBlbmRzIHRoZSB1c2VyIGlmIG9uZSBoYXMgYmVlbiBzZXQuXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBvYmplY3QuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBhbm5vdGF0aW9uID0ge3RleHQ6ICdNeSBjb21tZW50J31cbiAgIyAgIHBlcm1pc3Npb25zLmFkZEZpZWxkc1RvQW5ub3RhdGlvbihhbm5vdGF0aW9uKVxuICAjICAgY29uc29sZS5sb2coYW5ub3RhdGlvbilcbiAgIyAgICMgPT4ge3RleHQ6ICdNeSBjb21tZW50JywgcGVybWlzc2lvbnM6IHsuLi59fVxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBhZGRGaWVsZHNUb0Fubm90YXRpb246IChhbm5vdGF0aW9uKSA9PlxuICAgIGlmIGFubm90YXRpb25cbiAgICAgIGFubm90YXRpb24ucGVybWlzc2lvbnMgPSBAb3B0aW9ucy5wZXJtaXNzaW9uc1xuICAgICAgaWYgQHVzZXJcbiAgICAgICAgYW5ub3RhdGlvbi51c2VyID0gQHVzZXJcblxuICAjIFB1YmxpYzogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBwcm92aWRlZCBhY3Rpb24gY2FuIGJlIHBlcmZvcm1lZCBvbiB0aGVcbiAgIyBhbm5vdGF0aW9uLiBUaGlzIHVzZXMgdGhlIHVzZXItY29uZmlndXJhYmxlICd1c2VyQXV0aG9yaXplJyBtZXRob2QgdG9cbiAgIyBkZXRlcm1pbmUgaWYgYW4gYW5ub3RhdGlvbiBpcyBhbm5vdGF0YWJsZS4gU2VlIHRoZSBkZWZhdWx0IG1ldGhvZCBmb3JcbiAgIyBkb2N1bWVudGF0aW9uIG9uIGl0cyBiZWhhdmlvdXIuXG4gICNcbiAgIyBSZXR1cm5zIGEgQm9vbGVhbiwgdHJ1ZSBpZiB0aGUgYWN0aW9uIGNhbiBiZSBwZXJmb3JtZWQgb24gdGhlIGFubm90YXRpb24uXG4gIGF1dGhvcml6ZTogKGFjdGlvbiwgYW5ub3RhdGlvbiwgdXNlcikgLT5cbiAgICB1c2VyID0gQHVzZXIgaWYgdXNlciA9PSB1bmRlZmluZWRcblxuICAgIGlmIEBvcHRpb25zLnVzZXJBdXRob3JpemVcbiAgICAgIHJldHVybiBAb3B0aW9ucy51c2VyQXV0aG9yaXplLmNhbGwoQG9wdGlvbnMsIGFjdGlvbiwgYW5ub3RhdGlvbiwgdXNlcilcblxuICAgIGVsc2UgIyB1c2VyQXV0aG9yaXplIG51bGxlZCBvdXQ6IGZyZWUtZm9yLWFsbCFcbiAgICAgIHJldHVybiB0cnVlXG5cbiAgIyBGaWVsZCBjYWxsYmFjazogVXBkYXRlcyB0aGUgc3RhdGUgb2YgdGhlIFwiYW55b25lIGNhbuKAplwiIGNoZWNrYm94ZXNcbiAgI1xuICAjIGFjdGlvbiAgICAgLSBUaGUgYWN0aW9uIFN0cmluZywgZWl0aGVyIFwidmlld1wiIG9yIFwidXBkYXRlXCJcbiAgIyBmaWVsZCAgICAgIC0gQSBET00gRWxlbWVudCBjb250YWluaW5nIGEgZm9ybSBpbnB1dC5cbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBPYmplY3QuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHVwZGF0ZVBlcm1pc3Npb25zRmllbGQ6IChhY3Rpb24sIGZpZWxkLCBhbm5vdGF0aW9uKSA9PlxuICAgIGZpZWxkID0gJChmaWVsZCkuc2hvdygpXG4gICAgaW5wdXQgPSBmaWVsZC5maW5kKCdpbnB1dCcpLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJylcblxuICAgICMgRG8gbm90IHNob3cgZmllbGQgaWYgY3VycmVudCB1c2VyIGlzIG5vdCBhZG1pbi5cbiAgICBmaWVsZC5oaWRlKCkgdW5sZXNzIHRoaXMuYXV0aG9yaXplKCdhZG1pbicsIGFubm90YXRpb24pXG5cbiAgICAjIFNlZSBpZiB3ZSBjYW4gYXV0aG9yaXNlIHdpdGhvdXQgYSB1c2VyLlxuICAgIGlmIHRoaXMuYXV0aG9yaXplKGFjdGlvbiwgYW5ub3RhdGlvbiB8fCB7fSwgbnVsbClcbiAgICAgIGlucHV0LmF0dHIoJ2NoZWNrZWQnLCAnY2hlY2tlZCcpXG4gICAgZWxzZVxuICAgICAgaW5wdXQucmVtb3ZlQXR0cignY2hlY2tlZCcpXG5cblxuICAjIEZpZWxkIGNhbGxiYWNrOiB1cGRhdGVzIHRoZSBhbm5vdGF0aW9uLnBlcm1pc3Npb25zIG9iamVjdCBiYXNlZCBvbiB0aGUgc3RhdGVcbiAgIyBvZiB0aGUgZmllbGQgY2hlY2tib3guIElmIGl0IGlzIGNoZWNrZWQgdGhlbiBwZXJtaXNzaW9ucyBhcmUgc2V0IHRvIHdvcmxkXG4gICMgd3JpdGFibGUgb3RoZXJ3aXNlIHRoZXkgdXNlIHRoZSBvcmlnaW5hbCBzZXR0aW5ncy5cbiAgI1xuICAjIGFjdGlvbiAgICAgLSBUaGUgYWN0aW9uIFN0cmluZywgZWl0aGVyIFwidmlld1wiIG9yIFwidXBkYXRlXCJcbiAgIyBmaWVsZCAgICAgIC0gQSBET00gRWxlbWVudCByZXByZXNlbnRpbmcgdGhlIGFubm90YXRpb24gZWRpdG9yLlxuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgdXBkYXRlQW5ub3RhdGlvblBlcm1pc3Npb25zOiAodHlwZSwgZmllbGQsIGFubm90YXRpb24pID0+XG4gICAgYW5ub3RhdGlvbi5wZXJtaXNzaW9ucyA9IEBvcHRpb25zLnBlcm1pc3Npb25zIHVubGVzcyBhbm5vdGF0aW9uLnBlcm1pc3Npb25zXG5cbiAgICBkYXRhS2V5ID0gdHlwZSArICctcGVybWlzc2lvbnMnXG5cbiAgICBpZiAkKGZpZWxkKS5maW5kKCdpbnB1dCcpLmlzKCc6Y2hlY2tlZCcpXG4gICAgICBhbm5vdGF0aW9uLnBlcm1pc3Npb25zW3R5cGVdID0gW11cbiAgICBlbHNlXG4gICAgICAjIENsZWFybHksIHRoZSBwZXJtaXNzaW9ucyBtb2RlbCBhbGxvd3MgZm9yIG1vcmUgY29tcGxleCBlbnRyaWVzIHRoYW4gdGhpcyxcbiAgICAgICMgYnV0IG91ciBVSSBwcmVzZW50cyBhIGNoZWNrYm94LCBzbyB3ZSBjYW4gb25seSBpbnRlcnByZXQgXCJwcmV2ZW50IG90aGVyc1xuICAgICAgIyBmcm9tIHZpZXdpbmdcIiBhcyBtZWFuaW5nIFwiYWxsb3cgb25seSBtZSB0byB2aWV3XCIuIFRoaXMgbWF5IHdhbnQgY2hhbmdpbmdcbiAgICAgICMgaW4gdGhlIGZ1dHVyZS5cbiAgICAgIGFubm90YXRpb24ucGVybWlzc2lvbnNbdHlwZV0gPSBbQG9wdGlvbnMudXNlcklkKEB1c2VyKV1cblxuICAjIEZpZWxkIGNhbGxiYWNrOiB1cGRhdGVzIHRoZSBhbm5vdGF0aW9uIHZpZXdlciB0byBpbmx1ZGUgdGhlIGRpc3BsYXkgbmFtZVxuICAjIGZvciB0aGUgdXNlciBvYnRhaW5lZCB0aHJvdWdoIFBlcm1pc3Npb25zI29wdGlvbnMudXNlclN0cmluZygpLlxuICAjXG4gICMgZmllbGQgICAgICAtIEEgRElWIEVsZW1lbnQgcmVwcmVzZW50aW5nIHRoZSBhbm5vdGF0aW9uIGZpZWxkLlxuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdCB0byBkaXNwbGF5LlxuICAjIGNvbnRyb2xzICAgLSBBIGNvbnRyb2wgT2JqZWN0IHRvIHRvZ2dsZSB0aGUgZGlzcGxheSBvZiBhbm5vdGF0aW9uIGNvbnRyb2xzLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICB1cGRhdGVWaWV3ZXI6IChmaWVsZCwgYW5ub3RhdGlvbiwgY29udHJvbHMpID0+XG4gICAgZmllbGQgPSAkKGZpZWxkKVxuXG4gICAgdXNlcm5hbWUgPSBAb3B0aW9ucy51c2VyU3RyaW5nIGFubm90YXRpb24udXNlclxuICAgIGlmIGFubm90YXRpb24udXNlciBhbmQgdXNlcm5hbWUgYW5kIHR5cGVvZiB1c2VybmFtZSA9PSAnc3RyaW5nJ1xuICAgICAgdXNlciA9IEFubm90YXRvci5VdGlsLmVzY2FwZShAb3B0aW9ucy51c2VyU3RyaW5nKGFubm90YXRpb24udXNlcikpXG4gICAgICBmaWVsZC5odG1sKHVzZXIpLmFkZENsYXNzKCdhbm5vdGF0b3ItdXNlcicpXG4gICAgZWxzZVxuICAgICAgZmllbGQucmVtb3ZlKClcblxuICAgIGlmIGNvbnRyb2xzXG4gICAgICBjb250cm9scy5oaWRlRWRpdCgpICAgdW5sZXNzIHRoaXMuYXV0aG9yaXplKCd1cGRhdGUnLCBhbm5vdGF0aW9uKVxuICAgICAgY29udHJvbHMuaGlkZURlbGV0ZSgpIHVubGVzcyB0aGlzLmF1dGhvcml6ZSgnZGVsZXRlJywgYW5ub3RhdGlvbilcblxuICAjIFNldHMgdGhlIFBlcm1pc3Npb25zI3VzZXIgcHJvcGVydHkgb24gdGhlIGJhc2lzIG9mIGEgcmVjZWl2ZWQgYXV0aFRva2VuLlxuICAjXG4gICMgdG9rZW4gLSB0aGUgYXV0aFRva2VuIHJlY2VpdmVkIGJ5IHRoZSBBdXRoIHBsdWdpblxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBfc2V0QXV0aEZyb21Ub2tlbjogKHRva2VuKSA9PlxuICAgIHRoaXMuc2V0VXNlcih0b2tlbi51c2VySWQpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBBbm5vdGF0b3IuUGx1Z2luLlBlcm1pc3Npb25zXG4iLCJBbm5vdGF0b3IgPSByZXF1aXJlKCdhbm5vdGF0b3InKVxuXG5cbiMgUHVibGljOiBUaGUgU3RvcmUgcGx1Z2luIGNhbiBiZSB1c2VkIHRvIHBlcnNpc3QgYW5ub3RhdGlvbnMgdG8gYSBkYXRhYmFzZVxuIyBydW5uaW5nIG9uIHlvdXIgc2VydmVyLiBJdCBoYXMgYSBzaW1wbGUgY3VzdG9taXNhYmxlIGludGVyZmFjZSB0aGF0IGNhbiBiZVxuIyBpbXBsZW1lbnRlZCB3aXRoIGFueSB3ZWIgZnJhbWV3b3JrLiBJdCB3b3JrcyBieSBsaXN0ZW5pbmcgdG8gZXZlbnRzIHB1Ymxpc2hlZFxuIyBieSB0aGUgQW5ub3RhdG9yIGFuZCBtYWtpbmcgYXBwcm9wcmlhdGUgcmVxdWVzdHMgdG8gdGhlIHNlcnZlciBkZXBlbmRpbmcgb25cbiMgdGhlIGV2ZW50LlxuI1xuIyBUaGUgc3RvcmUgaGFuZGxlcyBmaXZlIGRpc3RpbmN0IGFjdGlvbnMgXCJyZWFkXCIsIFwic2VhcmNoXCIsIFwiY3JlYXRlXCIsIFwidXBkYXRlXCJcbiMgYW5kIFwiZGVzdG9yeVwiLiBUaGUgcmVxdWVzdHMgbWFkZSBjYW4gYmUgY3VzdG9taXNlZCB3aXRoIG9wdGlvbnMgd2hlbiB0aGVcbiMgcGx1Z2luIGlzIGFkZGVkIHRvIHRoZSBBbm5vdGF0b3IuIEN1c3RvbSBoZWFkZXJzIGNhbiBhbHNvIGJlIHNlbnQgd2l0aCBldmVyeVxuIyByZXF1ZXN0IGJ5IHNldHRpbmcgYSAkLmRhdGEga2V5IG9uIHRoZSBBbm5vdGF0aW9uI2VsZW1lbnQgY29udGFpbmluZyBoZWFkZXJzXG4jIHRvIHNlbmQuIGUuZzpcbiNcbiMgICBhbm5vdGF0b3IuZWxlbWVudC5kYXRhKCdhbm5vdGF0aW9uOmhlYWRlcnMnLCB7XG4jICAgICAnWC1NeS1DdXN0b20tSGVhZGVyJzogJ015Q3VzdG9tVmFsdWUnXG4jICAgfSlcbiNcbiMgVGhpcyBoZWFkZXIgd2lsbCBub3cgYmUgc2VudCB3aXRoIGV2ZXJ5IHJlcXVlc3QuXG5jbGFzcyBBbm5vdGF0b3IuUGx1Z2luLlN0b3JlXG5cbiAgIyBVc2VyIGN1c3RvbWlzYWJsZSBvcHRpb25zIGF2YWlsYWJsZS5cbiAgb3B0aW9uczpcblxuICAgICMgQ3VzdG9tIG1ldGEgZGF0YSB0aGF0IHdpbGwgYmUgYXR0YWNoZWQgdG8gZXZlcnkgYW5ub3RhdGlvbiB0aGF0IGlzIHNlbnRcbiAgICAjIHRvIHRoZSBzZXJ2ZXIuIFRoaXMgX3dpbGxfIG92ZXJyaWRlIHByZXZpb3VzIHZhbHVlcy5cbiAgICBhbm5vdGF0aW9uRGF0YToge31cblxuICAgICMgU2hvdWxkIHRoZSBwbHVnaW4gZW11bGF0ZSBIVFRQIG1ldGhvZHMgbGlrZSBQVVQgYW5kIERFTEVURSBmb3JcbiAgICAjIGludGVyYWN0aW9uIHdpdGggbGVnYWN5IHdlYiBzZXJ2ZXJzPyBTZXR0aW5nIHRoaXMgdG8gYHRydWVgIHdpbGwgZmFrZVxuICAgICMgSFRUUCBgUFVUYCBhbmQgYERFTEVURWAgcmVxdWVzdHMgd2l0aCBhbiBIVFRQIGBQT1NUYCwgYW5kIHdpbGwgc2V0IHRoZVxuICAgICMgcmVxdWVzdCBoZWFkZXIgYFgtSFRUUC1NZXRob2QtT3ZlcnJpZGVgIHdpdGggdGhlIG5hbWUgb2YgdGhlIGRlc2lyZWRcbiAgICAjIG1ldGhvZC5cbiAgICBlbXVsYXRlSFRUUDogZmFsc2VcblxuICAgICMgU2hvdWxkIHRoZSBwbHVnaW4gZW11bGF0ZSBKU09OIFBPU1QvUFVUIHBheWxvYWRzIGJ5IHNlbmRpbmcgaXRzIHJlcXVlc3RzXG4gICAgIyBhcyBhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQgd2l0aCBhIHNpbmdsZSBrZXksIFwianNvblwiXG4gICAgZW11bGF0ZUpTT046IGZhbHNlXG5cbiAgICAjIFRoaXMgaXMgdGhlIEFQSSBlbmRwb2ludC4gSWYgdGhlIHNlcnZlciBzdXBwb3J0cyBDcm9zcyBPcmlnaW4gUmVzb3VyY2VcbiAgICAjIFNoYXJpbmcgKENPUlMpIGEgZnVsbCBVUkwgY2FuIGJlIHVzZWQgaGVyZS5cbiAgICBwcmVmaXg6ICcvc3RvcmUnXG5cbiAgICAjIFRoZSBzZXJ2ZXIgVVJMcyBmb3IgZWFjaCBhdmFpbGFibGUgYWN0aW9uLiBUaGVzZSBVUkxzIGNhbiBiZSBhbnl0aGluZyBidXRcbiAgICAjIG11c3QgcmVzcG9uZCB0byB0aGUgYXBwcm9wcmFpdGUgSFRUUCBtZXRob2QuIFRoZSB0b2tlbiBcIjppZFwiIGNhbiBiZSB1c2VkXG4gICAgIyBhbnl3aGVyZSBpbiB0aGUgVVJMIGFuZCB3aWxsIGJlIHJlcGxhY2VkIHdpdGggdGhlIGFubm90YXRpb24gaWQuXG4gICAgI1xuICAgICMgcmVhZDogICAgR0VUXG4gICAgIyBjcmVhdGU6ICBQT1NUXG4gICAgIyB1cGRhdGU6ICBQVVRcbiAgICAjIGRlc3Ryb3k6IERFTEVURVxuICAgICMgc2VhcmNoOiAgR0VUXG4gICAgdXJsczpcbiAgICAgIGNyZWF0ZTogICcvYW5ub3RhdGlvbnMnXG4gICAgICByZWFkOiAgICAnL2Fubm90YXRpb25zLzppZCdcbiAgICAgIHVwZGF0ZTogICcvYW5ub3RhdGlvbnMvOmlkJ1xuICAgICAgZGVzdHJveTogJy9hbm5vdGF0aW9ucy86aWQnXG4gICAgICBzZWFyY2g6ICAnL3NlYXJjaCdcblxuICAjIFB1YmxpYzogVGhlIGNvbnRzcnVjdG9yIGluaXRhaWxhc2VzIHRoZSBTdG9yZSBpbnN0YW5jZS4gSXQgcmVxdWlyZXMgdGhlXG4gICMgQW5ub3RhdG9yI2VsZW1lbnQgYW5kIGFuIE9iamVjdCBvZiBvcHRpb25zLlxuICAjXG4gICMgZWxlbWVudCAtIFRoaXMgbXVzdCBiZSB0aGUgQW5ub3RhdG9yI2VsZW1lbnQgaW4gb3JkZXIgdG8gbGlzdGVuIGZvciBldmVudHMuXG4gICMgb3B0aW9ucyAtIEFuIE9iamVjdCBvZiBrZXkvdmFsdWUgdXNlciBvcHRpb25zLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgc3RvcmUgPSBuZXcgQW5ub3RhdG9yLlBsdWdpbi5TdG9yZShBbm5vdGF0b3IuZWxlbWVudCwge1xuICAjICAgICBwcmVmaXg6ICdodHRwOi8vYW5ub3RhdGVpdC5vcmcnLFxuICAjICAgICBhbm5vdGF0aW9uRGF0YToge1xuICAjICAgICAgIHVyaTogd2luZG93LmxvY2F0aW9uLmhyZWZcbiAgIyAgICAgfVxuICAjICAgfSlcbiAgI1xuICAjIFJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgU3RvcmUuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICBAb3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBAb3B0aW9ucywgb3B0aW9ucylcblxuICAjIFB1YmxpYzogQ2FsbGJhY2sgbWV0aG9kIGZvciBhbm5vdGF0aW9uQ3JlYXRlZCBldmVudC4gUmVjZWl2ZXMgYW4gYW5ub3RhdGlvblxuICAjIGFuZCBzZW5kcyBhIFBPU1QgcmVxdWVzdCB0byB0aGUgc2V2ZXIgdXNpbmcgdGhlIFVSSSBmb3IgdGhlIFwiY3JlYXRlXCIgYWN0aW9uLlxuICAjXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gT2JqZWN0IHRoYXQgd2FzIGNyZWF0ZWQuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBzdG9yZS5hbm5vdGF0aW9uQ3JlYXRlZCh7dGV4dDogXCJteSBuZXcgYW5ub3RhdGlvbiBjb21tZW50XCJ9KVxuICAjICAgIyA9PiBSZXN1bHRzIGluIGFuIEhUVFAgUE9TVCByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIgY29udGFpbmluZyB0aGVcbiAgIyAgICMgICAgYW5ub3RhdGlvbiBhcyBzZXJpYWxpc2VkIEpTT04uXG4gICNcbiAgIyBSZXR1cm5zIGEganFYSFIgb2JqZWN0LlxuICBjcmVhdGU6IChhbm5vdGF0aW9uKSAtPlxuICAgIHRoaXMuX2FwaVJlcXVlc3QoJ2NyZWF0ZScsIGFubm90YXRpb24pXG5cbiAgIyBQdWJsaWM6IENhbGxiYWNrIG1ldGhvZCBmb3IgYW5ub3RhdGlvblVwZGF0ZWQgZXZlbnQuIFJlY2VpdmVzIGFuIGFubm90YXRpb25cbiAgIyBhbmQgc2VuZHMgYSBQVVQgcmVxdWVzdCB0byB0aGUgc2V2ZXIgdXNpbmcgdGhlIFVSSSBmb3IgdGhlIFwidXBkYXRlXCIgYWN0aW9uLlxuICAjXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gT2JqZWN0IHRoYXQgd2FzIHVwZGF0ZWQuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBzdG9yZS5hbm5vdGF0aW9uVXBkYXRlZCh7aWQ6IFwiYmxhaFwiLCB0ZXh0OiBcInVwZGF0ZWQgYW5ub3RhdGlvbiBjb21tZW50XCJ9KVxuICAjICAgIyA9PiBSZXN1bHRzIGluIGFuIEhUVFAgUFVUIHJlcXVlc3QgdG8gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZVxuICAjICAgIyAgICBhbm5vdGF0aW9uIGFzIHNlcmlhbGlzZWQgSlNPTi5cbiAgI1xuICAjIFJldHVybnMgYSBqcVhIUiBvYmplY3QuXG4gIHVwZGF0ZTogKGFubm90YXRpb24pIC0+XG4gICAgdGhpcy5fYXBpUmVxdWVzdCgndXBkYXRlJywgYW5ub3RhdGlvbilcblxuICAjIFB1YmxpYzogQ2FsbGJhY2sgbWV0aG9kIGZvciBhbm5vdGF0aW9uRGVsZXRlZCBldmVudC4gUmVjZWl2ZXMgYW4gYW5ub3RhdGlvblxuICAjIGFuZCBzZW5kcyBhIERFTEVURSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIgdXNpbmcgdGhlIFVSSSBmb3IgdGhlIGRlc3Ryb3lcbiAgIyBhY3Rpb24uXG4gICNcbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBPYmplY3QgdGhhdCB3YXMgZGVsZXRlZC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHN0b3JlLmFubm90YXRpb25EZWxldGVkKHt0ZXh0OiBcIm15IG5ldyBhbm5vdGF0aW9uIGNvbW1lbnRcIn0pXG4gICMgICAjID0+IFJlc3VsdHMgaW4gYW4gSFRUUCBERUxFVEUgcmVxdWVzdCB0byB0aGUgc2VydmVyLlxuICAjXG4gICMgUmV0dXJucyBhIGpxWEhSIG9iamVjdC5cbiAgZGVsZXRlOiAoYW5ub3RhdGlvbikgLT5cbiAgICB0aGlzLl9hcGlSZXF1ZXN0KCdkZXN0cm95JywgYW5ub3RhdGlvbilcblxuICAjIFB1YmxpYzogU2VhcmNoZXMgZm9yIGFubm90YXRpb25zIG1hdGNoaW5nIHRoZSBzcGVjaWZpZWQgcXVlcnkuXG4gICNcbiAgIyBSZXR1cm5zIGEgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHF1ZXJ5IHJlc3VsdHMgYW5kIHF1ZXJ5IG1ldGFkYXRhLlxuICBxdWVyeTogKHF1ZXJ5T2JqKSAtPlxuICAgIGRmZCA9ICQuRGVmZXJyZWQoKVxuICAgIHRoaXMuX2FwaVJlcXVlc3QoJ3NlYXJjaCcsIHF1ZXJ5T2JqKVxuICAgICAgLmRvbmUgKG9iaikgLT5cbiAgICAgICAgcm93cyA9IG9iai5yb3dzXG4gICAgICAgIGRlbGV0ZSBvYmoucm93c1xuICAgICAgICBkZmQucmVzb2x2ZShyb3dzLCBvYmopXG4gICAgICAuZmFpbCAoKSAtPlxuICAgICAgICBkZmQucmVqZWN0LmFwcGx5KGRmZCwgYXJndW1lbnRzKVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG5cbiAgIyBDYWxsYmFjayBtZXRob2QgZm9yIFN0b3JlI2xvYWRBbm5vdGF0aW9uc0Zyb21TZWFyY2goKS4gUHJvY2Vzc2VzIHRoZSBkYXRhXG4gICMgcmV0dXJuZWQgZnJvbSB0aGUgc2VydmVyIChhIEpTT04gYXJyYXkgb2YgYW5ub3RhdGlvbiBPYmplY3RzKSBhbmQgdXBkYXRlc1xuICAjIHRoZSByZWdpc3RyeSBhcyB3ZWxsIGFzIGxvYWRpbmcgdGhlbSBpbnRvIHRoZSBBbm5vdGF0b3IuXG4gICMgUmV0dXJucyB0aGUgalF1ZXJ5IFhNTEh0dHBSZXF1ZXN0IHdyYXBwZXIgZW5hYmxpbmcgYWRkaXRpb25hbCBjYWxsYmFja3MgdG9cbiAgIyBiZSBhcHBsaWVkIGFzIHdlbGwgYXMgY3VzdG9tIGVycm9yIGhhbmRsaW5nLlxuICAjXG4gICMgYWN0aW9uICAgIC0gVGhlIGFjdGlvbiBTdHJpbmcgZWcuIFwicmVhZFwiLCBcInNlYXJjaFwiLCBcImNyZWF0ZVwiLCBcInVwZGF0ZVwiXG4gICMgICAgICAgICAgICAgb3IgXCJkZXN0b3J5XCIuXG4gICMgb2JqICAgICAgIC0gVGhlIGRhdGEgdG8gYmUgc2VudCwgZWl0aGVyIGFubm90YXRpb24gb2JqZWN0IG9yIHF1ZXJ5IHN0cmluZy5cbiAgIyBvblN1Y2Nlc3MgLSBBIGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGNhbGwgb24gc3VjY2Vzc2Z1bCByZXF1ZXN0LlxuICAjXG4gICMgRXhhbXBsZXM6XG4gICNcbiAgIyAgIHN0b3JlLl9hcGlSZXF1ZXN0KCdyZWFkJywge2lkOiA0fSwgKGRhdGEpIC0+IGNvbnNvbGUubG9nKGRhdGEpKVxuICAjICAgIyA9PiBPdXRwdXRzIHRoZSBhbm5vdGF0aW9uIHJldHVybmVkIGZyb20gdGhlIHNlcnZlci5cbiAgI1xuICAjIFJldHVybnMgWE1MSHR0cFJlcXVlc3Qgb2JqZWN0LlxuICBfYXBpUmVxdWVzdDogKGFjdGlvbiwgb2JqKSAtPlxuICAgIGlkID0gb2JqICYmIG9iai5pZFxuICAgIHVybCA9IHRoaXMuX3VybEZvcihhY3Rpb24sIGlkKVxuICAgIG9wdGlvbnMgPSB0aGlzLl9hcGlSZXF1ZXN0T3B0aW9ucyhhY3Rpb24sIG9iailcblxuICAgIHJlcXVlc3QgPSAkLmFqYXgodXJsLCBvcHRpb25zKVxuXG4gICAgIyBBcHBlbmQgdGhlIGlkIGFuZCBhY3Rpb24gdG8gdGhlIHJlcXVlc3Qgb2JqZWN0XG4gICAgIyBmb3IgdXNlIGluIHRoZSBlcnJvciBjYWxsYmFjay5cbiAgICByZXF1ZXN0Ll9pZCA9IGlkXG4gICAgcmVxdWVzdC5fYWN0aW9uID0gYWN0aW9uXG4gICAgcmVxdWVzdFxuXG4gICMgQnVpbGRzIGFuIG9wdGlvbnMgb2JqZWN0IHN1aXRhYmxlIGZvciB1c2UgaW4gYSBqUXVlcnkuYWpheCgpIGNhbGwuXG4gICNcbiAgIyBhY3Rpb24gICAgLSBUaGUgYWN0aW9uIFN0cmluZyBlZy4gXCJyZWFkXCIsIFwic2VhcmNoXCIsIFwiY3JlYXRlXCIsIFwidXBkYXRlXCJcbiAgIyAgICAgICAgICAgICBvciBcImRlc3Ryb3lcIi5cbiAgIyBvYmogICAgICAgLSBUaGUgZGF0YSB0byBiZSBzZW50LCBlaXRoZXIgYW5ub3RhdGlvbiBvYmplY3Qgb3IgcXVlcnkgc3RyaW5nLlxuICAjXG4gICMgUmV0dXJucyBPYmplY3QgbGl0ZXJhbCBvZiAkLmFqYXgoKSBvcHRpb25zLlxuICBfYXBpUmVxdWVzdE9wdGlvbnM6IChhY3Rpb24sIG9iaikgLT5cbiAgICBtZXRob2QgPSB0aGlzLl9tZXRob2RGb3IoYWN0aW9uKVxuXG4gICAgb3B0cyA9IHtcbiAgICAgIHR5cGU6ICAgICBtZXRob2QsXG4gICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICBlcnJvcjogICAgdGhpcy5fb25FcnJvclxuICAgIH1cblxuICAgICMgSWYgZW11bGF0ZUhUVFAgaXMgZW5hYmxlZCwgd2Ugc2VuZCBhIFBPU1QgYW5kIHB1dCB0aGUgcmVhbCBtZXRob2QgaW4gYW5cbiAgICAjIEhUVFAgcmVxdWVzdCBoZWFkZXIuXG4gICAgaWYgQG9wdGlvbnMuZW11bGF0ZUhUVFAgYW5kIG1ldGhvZCBpbiBbJ1BVVCcsICdERUxFVEUnXVxuICAgICAgb3B0cy5oZWFkZXJzID0gJC5leHRlbmQob3B0cy5oZWFkZXJzLCB7J1gtSFRUUC1NZXRob2QtT3ZlcnJpZGUnOiBtZXRob2R9KVxuICAgICAgb3B0cy50eXBlID0gJ1BPU1QnXG5cbiAgICAjIERvbid0IEpTT05pZnkgb2JqIGlmIG1ha2luZyBzZWFyY2ggcmVxdWVzdC5cbiAgICBpZiBhY3Rpb24gaXMgXCJzZWFyY2hcIlxuICAgICAgb3B0cyA9ICQuZXh0ZW5kKG9wdHMsIGRhdGE6IG9iailcbiAgICAgIHJldHVybiBvcHRzXG4gICAgXG4gICAgIyBST0M6IHRyeSB0byBhZGQgYW5ub3RhdGlvbkRhdGEgIFxuICAgIGlmIGFjdGlvbiBpcyBcImNyZWF0ZVwiIG9yIGFjdGlvbiBpcyBcInVwZGF0ZVwiXG4gICAgICBvYmogPSAkLmV4dGVuZChvYmosIEBvcHRpb25zLmFubm90YXRpb25EYXRhKVxuICAgIFxuICAgIGRhdGEgPSBvYmogJiYgSlNPTi5zdHJpbmdpZnkob2JqKVxuXG4gICAgIyBJZiBlbXVsYXRlSlNPTiBpcyBlbmFibGVkLCB3ZSBzZW5kIGEgZm9ybSByZXF1ZXN0ICh0aGUgY29ycmVjdFxuICAgICMgY29udGVudFR5cGUgd2lsbCBiZSBzZXQgYXV0b21hdGljYWxseSBieSBqUXVlcnkpLCBhbmQgcHV0IHRoZVxuICAgICMgSlNPTi1lbmNvZGVkIHBheWxvYWQgaW4gdGhlIFwianNvblwiIGtleS5cbiAgICBpZiBAb3B0aW9ucy5lbXVsYXRlSlNPTlxuICAgICAgb3B0cy5kYXRhID0ge2pzb246IGRhdGF9XG4gICAgICBpZiBAb3B0aW9ucy5lbXVsYXRlSFRUUFxuICAgICAgICBvcHRzLmRhdGEuX21ldGhvZCA9IG1ldGhvZFxuICAgICAgcmV0dXJuIG9wdHNcblxuICAgIG9wdHMgPSAkLmV4dGVuZChvcHRzLCB7XG4gICAgICBkYXRhOiBkYXRhXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCJcbiAgICB9KVxuICAgIHJldHVybiBvcHRzXG5cbiAgIyBCdWlsZHMgdGhlIGFwcHJvcHJpYXRlIFVSTCBmcm9tIHRoZSBvcHRpb25zIGZvciB0aGUgYWN0aW9uIHByb3ZpZGVkLlxuICAjXG4gICMgYWN0aW9uIC0gVGhlIGFjdGlvbiBTdHJpbmcuXG4gICMgaWQgICAgIC0gVGhlIGFubm90YXRpb24gaWQgYXMgYSBTdHJpbmcgb3IgTnVtYmVyLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgc3RvcmUuX3VybEZvcigndXBkYXRlJywgMzQpXG4gICMgICAjID0+IFJldHVybnMgXCIvc3RvcmUvYW5ub3RhdGlvbnMvMzRcIlxuICAjXG4gICMgICBzdG9yZS5fdXJsRm9yKCdzZWFyY2gnKVxuICAjICAgIyA9PiBSZXR1cm5zIFwiL3N0b3JlL3NlYXJjaFwiXG4gICNcbiAgIyBSZXR1cm5zIFVSTCBTdHJpbmcuXG4gIF91cmxGb3I6IChhY3Rpb24sIGlkKSAtPlxuICAgIHVybCA9IGlmIEBvcHRpb25zLnByZWZpeD8gdGhlbiBAb3B0aW9ucy5wcmVmaXggZWxzZSAnJ1xuICAgIHVybCArPSBAb3B0aW9ucy51cmxzW2FjdGlvbl1cbiAgICAjIElmIHRoZXJlJ3MgYSAnLzppZCcgaW4gdGhlIFVSTCwgZWl0aGVyIGZpbGwgaW4gdGhlIElEIG9yIHJlbW92ZSB0aGVcbiAgICAjIHNsYXNoOlxuICAgIHVybCA9IHVybC5yZXBsYWNlKC9cXC86aWQvLCBpZiBpZD8gdGhlbiAnLycgKyBpZCBlbHNlICcnKVxuICAgICMgSWYgdGhlcmUncyBhIGJhcmUgJzppZCcgaW4gdGhlIFVSTCwgdGhlbiBzdWJzdGl0dXRlIGRpcmVjdGx5OlxuICAgIHVybCA9IHVybC5yZXBsYWNlKC86aWQvLCBpZiBpZD8gdGhlbiBpZCBlbHNlICcnKVxuXG4gICAgdXJsXG5cbiAgIyBNYXBzIGFuIGFjdGlvbiB0byBhbiBIVFRQIG1ldGhvZC5cbiAgI1xuICAjIGFjdGlvbiAtIFRoZSBhY3Rpb24gU3RyaW5nLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgc3RvcmUuX21ldGhvZEZvcigncmVhZCcpICAgICMgPT4gXCJHRVRcIlxuICAjICAgc3RvcmUuX21ldGhvZEZvcigndXBkYXRlJykgICMgPT4gXCJQVVRcIlxuICAjICAgc3RvcmUuX21ldGhvZEZvcignZGVzdHJveScpICMgPT4gXCJERUxFVEVcIlxuICAjXG4gICMgUmV0dXJucyBIVFRQIG1ldGhvZCBTdHJpbmcuXG4gIF9tZXRob2RGb3I6IChhY3Rpb24pIC0+XG4gICAgdGFibGUgPSB7XG4gICAgICAnY3JlYXRlJzogICdQT1NUJ1xuICAgICAgJ3JlYWQnOiAgICAnR0VUJ1xuICAgICAgJ3VwZGF0ZSc6ICAnUFVUJ1xuICAgICAgJ2Rlc3Ryb3knOiAnREVMRVRFJ1xuICAgICAgJ3NlYXJjaCc6ICAnR0VUJ1xuICAgIH1cblxuICAgIHRhYmxlW2FjdGlvbl1cblxuICAjIGpRdWVyeS5hamF4KCkgY2FsbGJhY2suIERpc3BsYXlzIGFuIGVycm9yIG5vdGlmaWNhdGlvbiB0byB0aGUgdXNlciBpZlxuICAjIHRoZSByZXF1ZXN0IGZhaWxlZC5cbiAgI1xuICAjIHhociAtIFRoZSBqWE1MSHR0cFJlcXVlc3Qgb2JqZWN0LlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBfb25FcnJvcjogKHhocikgPT5cbiAgICBhY3Rpb24gID0geGhyLl9hY3Rpb25cbiAgICBtZXNzYWdlID0gQW5ub3RhdG9yLl90KFwiU29ycnkgd2UgY291bGQgbm90IFwiKSArIGFjdGlvbiArIEFubm90YXRvci5fdChcIiB0aGlzIGFubm90YXRpb25cIilcblxuICAgIGlmIHhoci5fYWN0aW9uID09ICdzZWFyY2gnXG4gICAgICBtZXNzYWdlID0gQW5ub3RhdG9yLl90KFwiU29ycnkgd2UgY291bGQgbm90IHNlYXJjaCB0aGUgc3RvcmUgZm9yIGFubm90YXRpb25zXCIpXG4gICAgZWxzZSBpZiB4aHIuX2FjdGlvbiA9PSAncmVhZCcgJiYgIXhoci5faWRcbiAgICAgIG1lc3NhZ2UgPSBBbm5vdGF0b3IuX3QoXCJTb3JyeSB3ZSBjb3VsZCBub3QgXCIpICsgYWN0aW9uICsgQW5ub3RhdG9yLl90KFwiIHRoZSBhbm5vdGF0aW9ucyBmcm9tIHRoZSBzdG9yZVwiKVxuXG4gICAgc3dpdGNoIHhoci5zdGF0dXNcbiAgICAgIHdoZW4gNDAxIHRoZW4gbWVzc2FnZSA9IEFubm90YXRvci5fdChcIlNvcnJ5IHlvdSBhcmUgbm90IGFsbG93ZWQgdG8gXCIpICsgYWN0aW9uICsgQW5ub3RhdG9yLl90KFwiIHRoaXMgYW5ub3RhdGlvblwiKVxuICAgICAgd2hlbiA0MDQgdGhlbiBtZXNzYWdlID0gQW5ub3RhdG9yLl90KFwiU29ycnkgd2UgY291bGQgbm90IGNvbm5lY3QgdG8gdGhlIGFubm90YXRpb25zIHN0b3JlXCIpXG4gICAgICB3aGVuIDUwMCB0aGVuIG1lc3NhZ2UgPSBBbm5vdGF0b3IuX3QoXCJTb3JyeSBzb21ldGhpbmcgd2VudCB3cm9uZyB3aXRoIHRoZSBhbm5vdGF0aW9uIHN0b3JlXCIpXG5cbiAgICBBbm5vdGF0b3Iuc2hvd05vdGlmaWNhdGlvbiBtZXNzYWdlLCBBbm5vdGF0b3IuTm90aWZpY2F0aW9uLkVSUk9SXG5cbiAgICBjb25zb2xlLmVycm9yIEFubm90YXRvci5fdChcIkFQSSByZXF1ZXN0IGZhaWxlZDpcIikgKyBcIiAnI3t4aHIuc3RhdHVzfSdcIlxuXG5cbm1vZHVsZS5leHBvcnRzID0gQW5ub3RhdG9yLlBsdWdpbi5TdG9yZVxuIiwiQW5ub3RhdG9yID0gcmVxdWlyZSgnYW5ub3RhdG9yJylcblxuXG4jIFB1YmxpYzogVGFncyBwbHVnaW4gYWxsb3dzIHVzZXJzIHRvIHRhZyB0aGllciBhbm5vdGF0aW9ucyB3aXRoIG1ldGFkYXRhXG4jIHN0b3JlZCBpbiBhbiBBcnJheSBvbiB0aGUgYW5ub3RhdGlvbiBhcyB0YWdzLlxuY2xhc3MgQW5ub3RhdG9yLlBsdWdpbi5UYWdzIGV4dGVuZHMgQW5ub3RhdG9yLlBsdWdpblxuXG4gIG9wdGlvbnM6XG4gICAgIyBDb25maWd1cmFibGUgZnVuY3Rpb24gd2hpY2ggYWNjZXB0cyBhIHN0cmluZyAodGhlIGNvbnRlbnRzKVxuICAgICMgb2YgdGhlIHRhZ3MgaW5wdXQgYXMgYW4gYXJndW1lbnQsIGFuZCByZXR1cm5zIGFuIGFycmF5IG9mXG4gICAgIyB0YWdzLlxuICAgIHBhcnNlVGFnczogKHN0cmluZykgLT5cbiAgICAgIHN0cmluZyA9ICQudHJpbShzdHJpbmcpXG5cbiAgICAgIHRhZ3MgPSBbXVxuICAgICAgdGFncyA9IHN0cmluZy5zcGxpdCgvXFxzKy8pIGlmIHN0cmluZ1xuICAgICAgdGFnc1xuXG4gICAgIyBDb25maWd1cmFibGUgZnVuY3Rpb24gd2hpY2ggYWNjZXB0cyBhbiBhcnJheSBvZiB0YWdzIGFuZFxuICAgICMgcmV0dXJucyBhIHN0cmluZyB3aGljaCB3aWxsIGJlIHVzZWQgdG8gZmlsbCB0aGUgdGFncyBpbnB1dC5cbiAgICBzdHJpbmdpZnlUYWdzOiAoYXJyYXkpIC0+XG4gICAgICBhcnJheS5qb2luKFwiIFwiKVxuXG4gICMgVGhlIGZpZWxkIGVsZW1lbnQgYWRkZWQgdG8gdGhlIEFubm90YXRvci5FZGl0b3Igd3JhcHBlZCBpbiBqUXVlcnkuIENhY2hlZCB0b1xuICAjIHNhdmUgaGF2aW5nIHRvIHJlY3JlYXRlIGl0IGV2ZXJ5dGltZSB0aGUgZWRpdG9yIGlzIGRpc3BsYXllZC5cbiAgZmllbGQ6IG51bGxcblxuICAjIFRoZSBpbnB1dCBlbGVtZW50IGFkZGVkIHRvIHRoZSBBbm5vdGF0b3IuRWRpdG9yIHdyYXBwZWQgaW4galF1ZXJ5LiBDYWNoZWQgdG9cbiAgIyBzYXZlIGhhdmluZyB0byByZWNyZWF0ZSBpdCBldmVyeXRpbWUgdGhlIGVkaXRvciBpcyBkaXNwbGF5ZWQuXG4gIGlucHV0OiBudWxsXG5cbiAgIyBQdWJsaWM6IEluaXRpYWxpc2VzIHRoZSBwbHVnaW4gYW5kIGFkZHMgY3VzdG9tIGZpZWxkcyB0byBib3RoIHRoZVxuICAjIGFubm90YXRvciB2aWV3ZXIgYW5kIGVkaXRvci4gVGhlIHBsdWdpbiBhbHNvIGNoZWNrcyBpZiB0aGUgYW5ub3RhdG9yIGlzXG4gICMgc3VwcG9ydGVkIGJ5IHRoZSBjdXJyZW50IGJyb3dzZXIuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHBsdWdpbkluaXQ6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBBbm5vdGF0b3Iuc3VwcG9ydGVkKClcblxuICAgIEBmaWVsZCA9IEBhbm5vdGF0b3IuZWRpdG9yLmFkZEZpZWxkKHtcbiAgICAgIGxhYmVsOiAgQW5ub3RhdG9yLl90KCdBZGQgc29tZSB0YWdzIGhlcmUnKSArICdcXHUyMDI2J1xuICAgICAgbG9hZDogICB0aGlzLnVwZGF0ZUZpZWxkXG4gICAgICBzdWJtaXQ6IHRoaXMuc2V0QW5ub3RhdGlvblRhZ3NcbiAgICB9KVxuXG4gICAgQGFubm90YXRvci52aWV3ZXIuYWRkRmllbGQoe1xuICAgICAgbG9hZDogdGhpcy51cGRhdGVWaWV3ZXJcbiAgICB9KVxuXG4gICAgIyBBZGQgYSBmaWx0ZXIgdG8gdGhlIEZpbHRlciBwbHVnaW4gaWYgbG9hZGVkLlxuICAgIGlmIEBhbm5vdGF0b3IucGx1Z2lucy5GaWx0ZXJcbiAgICAgIEBhbm5vdGF0b3IucGx1Z2lucy5GaWx0ZXIuYWRkRmlsdGVyXG4gICAgICAgIGxhYmVsOiBBbm5vdGF0b3IuX3QoJ1RhZycpXG4gICAgICAgIHByb3BlcnR5OiAndGFncydcbiAgICAgICAgaXNGaWx0ZXJlZDogQW5ub3RhdG9yLlBsdWdpbi5UYWdzLmZpbHRlckNhbGxiYWNrXG5cbiAgICBAaW5wdXQgPSAkKEBmaWVsZCkuZmluZCgnOmlucHV0JylcblxuICAjIFB1YmxpYzogRXh0cmFjdHMgdGFncyBmcm9tIHRoZSBwcm92aWRlZCBTdHJpbmcuXG4gICNcbiAgIyBzdHJpbmcgLSBBIFN0cmluZyBvZiB0YWdzIHNlcGVyYXRlZCBieSBzcGFjZXMuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBwbHVnaW4ucGFyc2VUYWdzKCdjYWtlIGNob2NvbGF0ZSBjYWJiYWdlJylcbiAgIyAgICMgPT4gWydjYWtlJywgJ2Nob2NvbGF0ZScsICdjYWJiYWdlJ11cbiAgI1xuICAjIFJldHVybnMgQXJyYXkgb2YgcGFyc2VkIHRhZ3MuXG4gIHBhcnNlVGFnczogKHN0cmluZykgLT5cbiAgICBAb3B0aW9ucy5wYXJzZVRhZ3Moc3RyaW5nKVxuXG4gICMgUHVibGljOiBUYWtlcyBhbiBhcnJheSBvZiB0YWdzIGFuZCBzZXJpYWxpc2VzIHRoZW0gaW50byBhIFN0cmluZy5cbiAgI1xuICAjIGFycmF5IC0gQW4gQXJyYXkgb2YgdGFncy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHBsdWdpbi5zdHJpbmdpZnlUYWdzKFsnY2FrZScsICdjaG9jb2xhdGUnLCAnY2FiYmFnZSddKVxuICAjICAgIyA9PiAnY2FrZSBjaG9jb2xhdGUgY2FiYmFnZSdcbiAgI1xuICAjIFJldHVybnMgQXJyYXkgb2YgcGFyc2VkIHRhZ3MuXG4gIHN0cmluZ2lmeVRhZ3M6IChhcnJheSkgLT5cbiAgICBAb3B0aW9ucy5zdHJpbmdpZnlUYWdzKGFycmF5KVxuXG4gICMgQW5ub3RhdG9yLkVkaXRvciBjYWxsYmFjayBmdW5jdGlvbi4gVXBkYXRlcyB0aGUgQGlucHV0IGZpZWxkIHdpdGggdGhlXG4gICMgdGFncyBhdHRhY2hlZCB0byB0aGUgcHJvdmlkZWQgYW5ub3RhdGlvbi5cbiAgI1xuICAjIGZpZWxkICAgICAgLSBUaGUgdGFncyBmaWVsZCBFbGVtZW50IGNvbnRhaW5pbmcgdGhlIGlucHV0IEVsZW1lbnQuXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gb2JqZWN0IHRvIGJlIGVkaXRlZC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGZpZWxkID0gJCgnPGxpPjxpbnB1dCAvPjwvbGk+JylbMF1cbiAgIyAgIHBsdWdpbi51cGRhdGVGaWVsZChmaWVsZCwge3RhZ3M6IFsnYXBwbGVzJywgJ29yYW5nZXMnLCAnY2FrZSddfSlcbiAgIyAgIGZpZWxkLnZhbHVlICMgPT4gUmV0dXJucyAnYXBwbGVzIG9yYW5nZXMgY2FrZSdcbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgdXBkYXRlRmllbGQ6IChmaWVsZCwgYW5ub3RhdGlvbikgPT5cbiAgICB2YWx1ZSA9ICcnXG4gICAgdmFsdWUgPSB0aGlzLnN0cmluZ2lmeVRhZ3MoYW5ub3RhdGlvbi50YWdzKSBpZiBhbm5vdGF0aW9uLnRhZ3NcblxuICAgIEBpbnB1dC52YWwodmFsdWUpXG5cbiAgIyBBbm5vdGF0b3IuRWRpdG9yIGNhbGxiYWNrIGZ1bmN0aW9uLiBVcGRhdGVzIHRoZSBhbm5vdGF0aW9uIGZpZWxkIHdpdGggdGhlXG4gICMgZGF0YSByZXRyaWV2ZWQgZnJvbSB0aGUgQGlucHV0IHByb3BlcnR5LlxuICAjXG4gICMgZmllbGQgICAgICAtIFRoZSB0YWdzIGZpZWxkIEVsZW1lbnQgY29udGFpbmluZyB0aGUgaW5wdXQgRWxlbWVudC5cbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBvYmplY3QgdG8gYmUgdXBkYXRlZC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGFubm90YXRpb24gPSB7fVxuICAjICAgZmllbGQgPSAkKCc8bGk+PGlucHV0IHZhbHVlPVwiY2FrZSBjaG9jb2xhdGUgY2FiYmFnZVwiIC8+PC9saT4nKVswXVxuICAjXG4gICMgICBwbHVnaW4uc2V0QW5ub3RhdGlvblRhZ3MoZmllbGQsIGFubm90YXRpb24pXG4gICMgICBhbm5vdGF0aW9uLnRhZ3MgIyA9PiBSZXR1cm5zIFsnY2FrZScsICdjaG9jb2xhdGUnLCAnY2FiYmFnZSddXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHNldEFubm90YXRpb25UYWdzOiAoZmllbGQsIGFubm90YXRpb24pID0+XG4gICAgYW5ub3RhdGlvbi50YWdzID0gdGhpcy5wYXJzZVRhZ3MoQGlucHV0LnZhbCgpKVxuXG4gICMgQW5ub3RhdG9yLlZpZXdlciBjYWxsYmFjayBmdW5jdGlvbi4gVXBkYXRlcyB0aGUgYW5ub3RhdGlvbiBkaXNwbGF5IHdpdGggdGFnc1xuICAjIHJlbW92ZXMgdGhlIGZpZWxkIGZyb20gdGhlIFZpZXdlciBpZiB0aGVyZSBhcmUgbm8gdGFncyB0byBkaXNwbGF5LlxuICAjXG4gICMgZmllbGQgICAgICAtIFRoZSBFbGVtZW50IHRvIHBvcHVsYXRlIHdpdGggdGFncy5cbiAgIyBhbm5vdGF0aW9uIC0gQW4gYW5ub3RhdGlvbiBvYmplY3QgdG8gYmUgZGlzcGxheS5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIGZpZWxkID0gJCgnPGRpdiAvPicpWzBdXG4gICMgICBwbHVnaW4udXBkYXRlRmllbGQoZmllbGQsIHt0YWdzOiBbJ2FwcGxlcyddfSlcbiAgIyAgIGZpZWxkLmlubmVySFRNTCAjID0+IFJldHVybnMgJzxzcGFuIGNsYXNzPVwiYW5ub3RhdG9yLXRhZ1wiPmFwcGxlczwvc3Bhbj4nXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHVwZGF0ZVZpZXdlcjogKGZpZWxkLCBhbm5vdGF0aW9uKSAtPlxuICAgIGZpZWxkID0gJChmaWVsZClcblxuICAgIGlmIGFubm90YXRpb24udGFncyBhbmQgJC5pc0FycmF5KGFubm90YXRpb24udGFncykgYW5kIGFubm90YXRpb24udGFncy5sZW5ndGhcbiAgICAgIGZpZWxkLmFkZENsYXNzKCdhbm5vdGF0b3ItdGFncycpLmh0bWwoLT5cbiAgICAgICAgc3RyaW5nID0gJC5tYXAoYW5ub3RhdGlvbi50YWdzLCh0YWcpIC0+XG4gICAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJhbm5vdGF0b3ItdGFnXCI+JyArIEFubm90YXRvci5VdGlsLmVzY2FwZSh0YWcpICsgJzwvc3Bhbj4nXG4gICAgICAgICkuam9pbignICcpXG4gICAgICApXG4gICAgZWxzZVxuICAgICAgZmllbGQucmVtb3ZlKClcblxuIyBDaGVja3MgYW4gaW5wdXQgc3RyaW5nIG9mIGtleXdvcmRzIGFnYWluc3QgYW4gYXJyYXkgb2YgdGFncy4gSWYgdGhlIGtleXdvcmRzXG4jIG1hdGNoIF9hbGxfIHRhZ3MgdGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZS4gVGhpcyBzaG91bGQgYmUgdXNlZCBhcyBhIGNhbGxiYWNrXG4jIGluIHRoZSBGaWx0ZXIgcGx1Z2luLlxuI1xuIyBpbnB1dCAtIEEgU3RyaW5nIG9mIGtleXdvcmRzIGZyb20gYSBpbnB1dCBmaWVsZC5cbiNcbiMgRXhhbXBsZXNcbiNcbiMgICBUYWdzLmZpbHRlckNhbGxiYWNrKCdjYXQgZG9nIG1vdXNlJywgWydjYXQnLCAnZG9nJywgJ21vdXNlJ10pIC8vPT4gdHJ1ZVxuIyAgIFRhZ3MuZmlsdGVyQ2FsbGJhY2soJ2NhdCBkb2cnLCBbJ2NhdCcsICdkb2cnLCAnbW91c2UnXSkgLy89PiB0cnVlXG4jICAgVGFncy5maWx0ZXJDYWxsYmFjaygnY2F0IGRvZycsIFsnY2F0J10pIC8vPT4gZmFsc2VcbiNcbiMgUmV0dXJucyB0cnVlIGlmIHRoZSBpbnB1dCBrZXl3b3JkcyBtYXRjaCBhbGwgdGFncy5cbkFubm90YXRvci5QbHVnaW4uVGFncy5maWx0ZXJDYWxsYmFjayA9IChpbnB1dCwgdGFncyA9IFtdKSAtPlxuICBtYXRjaGVzICA9IDBcbiAga2V5d29yZHMgPSBbXVxuICBpZiBpbnB1dFxuICAgIGtleXdvcmRzID0gaW5wdXQuc3BsaXQoL1xccysvZylcbiAgICBmb3Iga2V5d29yZCBpbiBrZXl3b3JkcyB3aGVuIHRhZ3MubGVuZ3RoXG4gICAgICBtYXRjaGVzICs9IDEgZm9yIHRhZyBpbiB0YWdzIHdoZW4gdGFnLmluZGV4T2Yoa2V5d29yZCkgIT0gLTFcblxuICBtYXRjaGVzID09IGtleXdvcmRzLmxlbmd0aFxuXG5cbm1vZHVsZS5leHBvcnRzID0gQW5ub3RhdG9yLlBsdWdpbi5UYWdzXG4iLCJBbm5vdGF0b3IgPSByZXF1aXJlKCdhbm5vdGF0b3InKVxuXG5cbiMgUGx1Z2luIHRoYXQgd2lsbCBkaXNwbGF5IGEgbm90aWZpY2F0aW9uIHRvIHRoZSB1c2VyIGlmIHRoaWVyIGJyb3dzZXIgZG9lc1xuIyBub3Qgc3VwcG9ydCB0aGUgQW5ub3RhdG9yLlxuY2xhc3MgQW5ub3RhdG9yLlBsdWdpbi5VbnN1cHBvcnRlZCBleHRlbmRzIEFubm90YXRvci5QbHVnaW5cbiAgIyBPcHRpb25zIE9iamVjdCwgbWVzc2FnZSBzZXRzIHRoZSBtZXNzYWdlIGRpc3BsYXllZCBpbiB0aGUgYnJvd3Nlci5cbiAgb3B0aW9uczpcbiAgICBtZXNzYWdlOiBBbm5vdGF0b3IuX3QoXCJTb3JyeSB5b3VyIGN1cnJlbnQgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSBBbm5vdGF0b3JcIilcblxuICAjIFB1YmxpYzogQ2hlY2tzIHRoZSBBbm5vdGF0b3Iuc3VwcG9ydGVkKCkgbWV0aG9kIGFuZCBpZiB1bnN1cHBvcnRlZCBkaXNwbGF5c1xuICAjIEBvcHRpb25zLm1lc3NhZ2UgaW4gYSBub3RpZmljYXRpb24uXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIHBsdWdpbkluaXQ6IC0+XG4gICAgdW5sZXNzIEFubm90YXRvci5zdXBwb3J0ZWQoKVxuICAgICAgJCg9PlxuICAgICAgICAjIE9uIGRvY3VtZW50IGxvYWQgZGlzcGxheSBub3RpZmljYXRpb24uXG4gICAgICAgIEFubm90YXRvci5zaG93Tm90aWZpY2F0aW9uKEBvcHRpb25zLm1lc3NhZ2UpXG5cbiAgICAgICAgIyBBZGQgYSBjbGFzcyBpZiB3ZSdyZSBpbiBJRTYuIEEgYml0IG9mIGEgaGFjayBidXQgd2UgbmVlZCB0byBiZSBhYmxlXG4gICAgICAgICMgdG8gc2V0IHRoZSBub3RpZmljYXRpb24gcG9zaXRpb24gaW4gdGhlIENTUy5cbiAgICAgICAgaWYgKHdpbmRvdy5YTUxIdHRwUmVxdWVzdCA9PSB1bmRlZmluZWQpIGFuZCAoQWN0aXZlWE9iamVjdCAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgJCgnaHRtbCcpLmFkZENsYXNzKCdpZTYnKVxuICAgICAgKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gQW5ub3RhdG9yLlBsdWdpbi5VbnN1cHBvcnRlZFxuIiwiVXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpXG5cblxuUmFuZ2UgPSB7fVxuXG4jIFB1YmxpYzogRGV0ZXJtaW5lcyB0aGUgdHlwZSBvZiBSYW5nZSBvZiB0aGUgcHJvdmlkZWQgb2JqZWN0IGFuZCByZXR1cm5zXG4jIGEgc3VpdGFibGUgUmFuZ2UgaW5zdGFuY2UuXG4jXG4jIHIgLSBBIHJhbmdlIE9iamVjdC5cbiNcbiMgRXhhbXBsZXNcbiNcbiMgICBzZWxlY3Rpb24gPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcbiMgICBSYW5nZS5zbmlmZihzZWxlY3Rpb24uZ2V0UmFuZ2VBdCgwKSlcbiMgICAjID0+IFJldHVybnMgYSBCcm93c2VyUmFuZ2UgaW5zdGFuY2UuXG4jXG4jIFJldHVybnMgYSBSYW5nZSBvYmplY3Qgb3IgZmFsc2UuXG5SYW5nZS5zbmlmZiA9IChyKSAtPlxuICBpZiByLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyP1xuICAgIG5ldyBSYW5nZS5Ccm93c2VyUmFuZ2UocilcbiAgZWxzZSBpZiB0eXBlb2Ygci5zdGFydCBpcyBcInN0cmluZ1wiXG4gICAgbmV3IFJhbmdlLlNlcmlhbGl6ZWRSYW5nZShyKVxuICBlbHNlIGlmIHIuc3RhcnQgYW5kIHR5cGVvZiByLnN0YXJ0IGlzIFwib2JqZWN0XCJcbiAgICBuZXcgUmFuZ2UuTm9ybWFsaXplZFJhbmdlKHIpXG4gIGVsc2VcbiAgICBjb25zb2xlLmVycm9yKF90KFwiQ291bGQgbm90IHNuaWZmIHJhbmdlIHR5cGVcIikpXG4gICAgZmFsc2VcblxuIyBQdWJsaWM6IEZpbmRzIGFuIEVsZW1lbnQgTm9kZSB1c2luZyBhbiBYUGF0aCByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQgcm9vdC5cbiNcbiMgSWYgdGhlIGRvY3VtZW50IGlzIHNlcnZlZCBhcyBhcHBsaWNhdGlvbi94aHRtbCt4bWwgaXQgd2lsbCB0cnkgYW5kIHJlc29sdmVcbiMgYW55IG5hbWVzcGFjZXMgd2l0aGluIHRoZSBYUGF0aC5cbiNcbiMgeHBhdGggLSBBbiBYUGF0aCBTdHJpbmcgdG8gcXVlcnkuXG4jXG4jIEV4YW1wbGVzXG4jXG4jICAgbm9kZSA9IFJhbmdlLm5vZGVGcm9tWFBhdGgoJy9odG1sL2JvZHkvZGl2L3BbMl0nKVxuIyAgIGlmIG5vZGVcbiMgICAgICMgRG8gc29tZXRoaW5nIHdpdGggdGhlIG5vZGUuXG4jXG4jIFJldHVybnMgdGhlIE5vZGUgaWYgZm91bmQgb3RoZXJ3aXNlIG51bGwuXG5SYW5nZS5ub2RlRnJvbVhQYXRoID0gKHhwYXRoLCByb290PWRvY3VtZW50KSAtPlxuICBldmFsdWF0ZVhQYXRoID0gKHhwLCBuc1Jlc29sdmVyPW51bGwpIC0+XG4gICAgdHJ5XG4gICAgICBkb2N1bWVudC5ldmFsdWF0ZSgnLicgKyB4cCwgcm9vdCwgbnNSZXNvbHZlciwgWFBhdGhSZXN1bHQuRklSU1RfT1JERVJFRF9OT0RFX1RZUEUsIG51bGwpLnNpbmdsZU5vZGVWYWx1ZVxuICAgIGNhdGNoIGV4Y2VwdGlvblxuICAgICAgIyBUaGVyZSBhcmUgY2FzZXMgd2hlbiB0aGUgZXZhbHVhdGlvbiBmYWlscywgYmVjYXVzZSB0aGVcbiAgICAgICMgSFRNTCBkb2N1bWVudHMgY29udGFpbnMgbm9kZXMgd2l0aCBpbnZhbGlkIG5hbWVzLFxuICAgICAgIyBmb3IgZXhhbXBsZSB0YWdzIHdpdGggZXF1YWwgc2lnbnMgaW4gdGhlbSwgb3Igc29tZXRoaW5nIGxpa2UgdGhhdC5cbiAgICAgICMgSW4gdGhlc2UgY2FzZXMsIHRoZSBYUGF0aCBleHByZXNzaW9ucyB3aWxsIGhhdmUgdGhlc2UgYWJvbWluYXRpb25zLFxuICAgICAgIyB0b28sIGFuZCB0aGVuIHRoZXkgY2FuIG5vdCBiZSBldmFsdWF0ZWQuXG4gICAgICAjIEluIHRoZXNlIGNhc2VzLCB3ZSBnZXQgYW4gWFBhdGhFeGNlcHRpb24sIHdpdGggZXJyb3IgY29kZSA1Mi5cbiAgICAgICMgU2VlIGh0dHA6Ly93d3cudzMub3JnL1RSL0RPTS1MZXZlbC0zLVhQYXRoL3hwYXRoLmh0bWwjWFBhdGhFeGNlcHRpb25cbiAgICAgICMgVGhpcyBkb2VzIG5vdCBuZWNlc3NhcmlseSBtYWtlIGFueSBzZW5zZSwgYnV0IHRoaXMgd2hhdCB3ZSBzZWVcbiAgICAgICMgaGFwcGVuaW5nLlxuICAgICAgY29uc29sZS5sb2cgXCJYUGF0aCBldmFsdWF0aW9uIGZhaWxlZC5cIlxuICAgICAgY29uc29sZS5sb2cgXCJUcnlpbmcgZmFsbGJhY2suLi5cIlxuICAgICAgIyBXZSBoYXZlIGEgYW4gJ2V2YWx1YXRvcicgZm9yIHRoZSByZWFsbHkgc2ltcGxlIGV4cHJlc3Npb25zIHRoYXRcbiAgICAgICMgc2hvdWxkIHdvcmsgZm9yIHRoZSBzaW1wbGUgZXhwcmVzc2lvbnMgd2UgZ2VuZXJhdGUuXG4gICAgICBVdGlsLm5vZGVGcm9tWFBhdGgoeHAsIHJvb3QpXG5cbiAgaWYgbm90ICQuaXNYTUxEb2MgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XG4gICAgZXZhbHVhdGVYUGF0aCB4cGF0aFxuICBlbHNlXG4gICAgIyBXZSdyZSBpbiBhbiBYTUwgZG9jdW1lbnQsIGNyZWF0ZSBhIG5hbWVzcGFjZSByZXNvbHZlciBmdW5jdGlvbiB0byB0cnlcbiAgICAjIGFuZCByZXNvbHZlIGFueSBuYW1lc3BhY2VzIGluIHRoZSBjdXJyZW50IGRvY3VtZW50LlxuICAgICMgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vRE9NL2RvY3VtZW50LmNyZWF0ZU5TUmVzb2x2ZXJcbiAgICBjdXN0b21SZXNvbHZlciA9IGRvY3VtZW50LmNyZWF0ZU5TUmVzb2x2ZXIoXG4gICAgICBpZiBkb2N1bWVudC5vd25lckRvY3VtZW50ID09IG51bGxcbiAgICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XG4gICAgICBlbHNlXG4gICAgICAgIGRvY3VtZW50Lm93bmVyRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XG4gICAgKVxuICAgIG5vZGUgPSBldmFsdWF0ZVhQYXRoIHhwYXRoLCBjdXN0b21SZXNvbHZlclxuXG4gICAgdW5sZXNzIG5vZGVcbiAgICAgICMgSWYgdGhlIHByZXZpb3VzIHNlYXJjaCBmYWlsZWQgdG8gZmluZCBhIG5vZGUgdGhlbiB3ZSBtdXN0IHRyeSB0b1xuICAgICAgIyBwcm92aWRlIGEgY3VzdG9tIG5hbWVzcGFjZSByZXNvbHZlciB0byB0YWtlIGludG8gYWNjb3VudCB0aGUgZGVmYXVsdFxuICAgICAgIyBuYW1lc3BhY2UuIFdlIGFsc28gcHJlZml4IGFsbCBub2RlIG5hbWVzIHdpdGggYSBjdXN0b20geGh0bWwgbmFtZXNwYWNlXG4gICAgICAjIGVnLiAnZGl2JyA9PiAneGh0bWw6ZGl2Jy5cbiAgICAgIHhwYXRoID0gKGZvciBzZWdtZW50IGluIHhwYXRoLnNwbGl0ICcvJ1xuICAgICAgICBpZiBzZWdtZW50IGFuZCBzZWdtZW50LmluZGV4T2YoJzonKSA9PSAtMVxuICAgICAgICAgIHNlZ21lbnQucmVwbGFjZSgvXihbYS16XSspLywgJ3hodG1sOiQxJylcbiAgICAgICAgZWxzZSBzZWdtZW50XG4gICAgICApLmpvaW4oJy8nKVxuXG4gICAgICAjIEZpbmQgdGhlIGRlZmF1bHQgZG9jdW1lbnQgbmFtZXNwYWNlLlxuICAgICAgbmFtZXNwYWNlID0gZG9jdW1lbnQubG9va3VwTmFtZXNwYWNlVVJJIG51bGxcblxuICAgICAgIyBUcnkgYW5kIHJlc29sdmUgdGhlIG5hbWVzcGFjZSwgZmlyc3Qgc2VlaW5nIGlmIGl0IGlzIGFuIHhodG1sIG5vZGVcbiAgICAgICMgb3RoZXJ3aXNlIGNoZWNrIHRoZSBoZWFkIGF0dHJpYnV0ZXMuXG4gICAgICBjdXN0b21SZXNvbHZlciAgPSAobnMpIC0+XG4gICAgICAgIGlmIG5zID09ICd4aHRtbCcgdGhlbiBuYW1lc3BhY2VcbiAgICAgICAgZWxzZSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZ2V0QXR0cmlidXRlKCd4bWxuczonICsgbnMpXG5cbiAgICAgIG5vZGUgPSBldmFsdWF0ZVhQYXRoIHhwYXRoLCBjdXN0b21SZXNvbHZlclxuICAgIG5vZGVcblxuY2xhc3MgUmFuZ2UuUmFuZ2VFcnJvciBleHRlbmRzIEVycm9yXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBtZXNzYWdlLCBAcGFyZW50PW51bGwpIC0+XG4gICAgc3VwZXIoQG1lc3NhZ2UpXG5cbiMgUHVibGljOiBDcmVhdGVzIGEgd3JhcHBlciBhcm91bmQgYSByYW5nZSBvYmplY3Qgb2J0YWluZWQgZnJvbSBhIERPTVNlbGVjdGlvbi5cbmNsYXNzIFJhbmdlLkJyb3dzZXJSYW5nZVxuXG4gICMgUHVibGljOiBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIEJyb3dzZXJSYW5nZS5cbiAgI1xuICAjIG9iamVjdCAtIEEgcmFuZ2Ugb2JqZWN0IG9idGFpbmVkIHZpYSBET01TZWxlY3Rpb24jZ2V0UmFuZ2VBdCgpLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgc2VsZWN0aW9uID0gd2luZG93LmdldFNlbGVjdGlvbigpXG4gICMgICByYW5nZSA9IG5ldyBSYW5nZS5Ccm93c2VyUmFuZ2Uoc2VsZWN0aW9uLmdldFJhbmdlQXQoMCkpXG4gICNcbiAgIyBSZXR1cm5zIGFuIGluc3RhbmNlIG9mIEJyb3dzZXJSYW5nZS5cbiAgY29uc3RydWN0b3I6IChvYmopIC0+XG4gICAgQGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyID0gb2JqLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyXG4gICAgQHN0YXJ0Q29udGFpbmVyICAgICAgICAgID0gb2JqLnN0YXJ0Q29udGFpbmVyXG4gICAgQHN0YXJ0T2Zmc2V0ICAgICAgICAgICAgID0gb2JqLnN0YXJ0T2Zmc2V0XG4gICAgQGVuZENvbnRhaW5lciAgICAgICAgICAgID0gb2JqLmVuZENvbnRhaW5lclxuICAgIEBlbmRPZmZzZXQgICAgICAgICAgICAgICA9IG9iai5lbmRPZmZzZXRcblxuICAjIFB1YmxpYzogbm9ybWFsaXplIHdvcmtzIGFyb3VuZCB0aGUgZmFjdCB0aGF0IGJyb3dzZXJzIGRvbid0IGdlbmVyYXRlXG4gICMgcmFuZ2VzL3NlbGVjdGlvbnMgaW4gYSBjb25zaXN0ZW50IG1hbm5lci4gU29tZSAoU2FmYXJpKSB3aWxsIGNyZWF0ZVxuICAjIHJhbmdlcyB0aGF0IGhhdmUgKHNheSkgYSB0ZXh0Tm9kZSBzdGFydENvbnRhaW5lciBhbmQgZWxlbWVudE5vZGVcbiAgIyBlbmRDb250YWluZXIuIE90aGVycyAoRmlyZWZveCkgc2VlbSB0byBvbmx5IGV2ZXIgZ2VuZXJhdGVcbiAgIyB0ZXh0Tm9kZS90ZXh0Tm9kZSBvciBlbGVtZW50Tm9kZS9lbGVtZW50Tm9kZSBwYWlycy5cbiAgI1xuICAjIFJldHVybnMgYW4gaW5zdGFuY2Ugb2YgUmFuZ2UuTm9ybWFsaXplZFJhbmdlXG4gIG5vcm1hbGl6ZTogKHJvb3QpIC0+XG4gICAgaWYgQHRhaW50ZWRcbiAgICAgIGNvbnNvbGUuZXJyb3IoX3QoXCJZb3UgbWF5IG9ubHkgY2FsbCBub3JtYWxpemUoKSBvbmNlIG9uIGEgQnJvd3NlclJhbmdlIVwiKSlcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIGVsc2VcbiAgICAgIEB0YWludGVkID0gdHJ1ZVxuXG4gICAgciA9IHt9XG5cbiAgICAjIExvb2sgYXQgdGhlIHN0YXJ0XG4gICAgaWYgQHN0YXJ0Q29udGFpbmVyLm5vZGVUeXBlIGlzIE5vZGUuRUxFTUVOVF9OT0RFXG4gICAgICAjIFdlIGFyZSBkZWFsaW5nIHdpdGggZWxlbWVudCBub2RlcyAgXG4gICAgICByLnN0YXJ0ID0gVXRpbC5nZXRGaXJzdFRleHROb2RlTm90QmVmb3JlIEBzdGFydENvbnRhaW5lci5jaGlsZE5vZGVzW0BzdGFydE9mZnNldF1cbiAgICAgIHIuc3RhcnRPZmZzZXQgPSAwXG4gICAgZWxzZVxuICAgICAgIyBXZSBhcmUgZGVhbGluZyB3aXRoIHNpbXBsZSB0ZXh0IG5vZGVzXG4gICAgICByLnN0YXJ0ID0gQHN0YXJ0Q29udGFpbmVyXG4gICAgICByLnN0YXJ0T2Zmc2V0ID0gQHN0YXJ0T2Zmc2V0XG5cbiAgICAjIExvb2sgYXQgdGhlIGVuZFxuICAgIGlmIEBlbmRDb250YWluZXIubm9kZVR5cGUgaXMgTm9kZS5FTEVNRU5UX05PREVcbiAgICAgICMgR2V0IHNwZWNpZmllZCBub2RlLlxuICAgICAgbm9kZSA9IEBlbmRDb250YWluZXIuY2hpbGROb2Rlc1tAZW5kT2Zmc2V0XVxuXG4gICAgICBpZiBub2RlPyAjIERvZXMgdGhhdCBub2RlIGV4aXN0P1xuICAgICAgICAjIExvb2sgZm9yIGEgdGV4dCBub2RlIGVpdGhlciBhdCB0aGUgaW1tZWRpYXRlIGJlZ2lubmluZyBvZiBub2RlXG4gICAgICAgIG4gPSBub2RlXG4gICAgICAgIHdoaWxlIG4/IGFuZCAobi5ub2RlVHlwZSBpc250IE5vZGUuVEVYVF9OT0RFKVxuICAgICAgICAgIG4gPSBuLmZpcnN0Q2hpbGRcbiAgICAgICAgaWYgbj8gIyBEaWQgd2UgZmluZCBhIHRleHQgbm9kZSBhdCB0aGUgc3RhcnQgb2YgdGhpcyBlbGVtZW50P1xuICAgICAgICAgIHIuZW5kID0gblxuICAgICAgICAgIHIuZW5kT2Zmc2V0ID0gMFxuXG4gICAgICB1bmxlc3Mgci5lbmQ/ICBcbiAgICAgICAgIyBXZSBuZWVkIHRvIGZpbmQgYSB0ZXh0IG5vZGUgaW4gdGhlIHByZXZpb3VzIHNpYmxpbmcgb2YgdGhlIG5vZGUgYXQgdGhlXG4gICAgICAgICMgZ2l2ZW4gb2Zmc2V0LCBpZiBvbmUgZXhpc3RzLCBvciBpbiB0aGUgcHJldmlvdXMgc2libGluZyBvZiBpdHMgY29udGFpbmVyLlxuICAgICAgICBpZiBAZW5kT2Zmc2V0XG4gICAgICAgICAgbm9kZSA9IEBlbmRDb250YWluZXIuY2hpbGROb2Rlc1tAZW5kT2Zmc2V0IC0gMV1cbiAgICAgICAgZWxzZVxuICAgICAgICAgIG5vZGUgPSBAZW5kQ29udGFpbmVyLnByZXZpb3VzU2libGluZ1xuICAgICAgICByLmVuZCA9IFV0aWwuZ2V0TGFzdFRleHROb2RlVXBUbyBub2RlXG4gICAgICAgIHIuZW5kT2Zmc2V0ID0gci5lbmQubm9kZVZhbHVlLmxlbmd0aFxuXG4gICAgZWxzZSAjIFdlIGFyZSBkZWFsaW5nIHdpdGggc2ltcGxlIHRleHQgbm9kZXNcbiAgICAgIHIuZW5kID0gQGVuZENvbnRhaW5lclxuICAgICAgci5lbmRPZmZzZXQgPSBAZW5kT2Zmc2V0XG5cbiAgICAjIFdlIGhhdmUgY29sbGVjdGVkIHRoZSBpbml0aWFsIGRhdGEuXG5cbiAgICAjIE5vdyBsZXQncyBzdGFydCB0byBzbGljZSAmIGRpY2UgdGhlIHRleHQgZWxlbWVudHMhXG4gICAgbnIgPSB7fVxuXG4gICAgaWYgci5zdGFydE9mZnNldCA+IDBcbiAgICAgICMgRG8gd2UgcmVhbGx5IGhhdmUgdG8gY3V0P1xuICAgICAgaWYgci5zdGFydC5ub2RlVmFsdWUubGVuZ3RoID4gci5zdGFydE9mZnNldFxuICAgICAgICAjIFllcy4gQ3V0LlxuICAgICAgICBuci5zdGFydCA9IHIuc3RhcnQuc3BsaXRUZXh0KHIuc3RhcnRPZmZzZXQpXG4gICAgICBlbHNlXG4gICAgICAgICMgQXZvaWQgc3BsaXR0aW5nIG9mZiB6ZXJvLWxlbmd0aCBwaWVjZXMuXG4gICAgICAgIG5yLnN0YXJ0ID0gci5zdGFydC5uZXh0U2libGluZ1xuICAgIGVsc2VcbiAgICAgIG5yLnN0YXJ0ID0gci5zdGFydFxuXG4gICAgIyBpcyB0aGUgd2hvbGUgc2VsZWN0aW9uIGluc2lkZSBvbmUgdGV4dCBlbGVtZW50ID9cbiAgICBpZiByLnN0YXJ0IGlzIHIuZW5kXG4gICAgICBpZiBuci5zdGFydC5ub2RlVmFsdWUubGVuZ3RoID4gKHIuZW5kT2Zmc2V0IC0gci5zdGFydE9mZnNldClcbiAgICAgICAgbnIuc3RhcnQuc3BsaXRUZXh0KHIuZW5kT2Zmc2V0IC0gci5zdGFydE9mZnNldClcbiAgICAgIG5yLmVuZCA9IG5yLnN0YXJ0XG4gICAgZWxzZSAjIG5vLCB0aGUgZW5kIG9mIHRoZSBzZWxlY3Rpb24gaXMgaW4gYSBzZXBhcmF0ZSB0ZXh0IGVsZW1lbnRcbiAgICAgICMgZG9lcyB0aGUgZW5kIG5lZWQgdG8gYmUgY3V0P1xuICAgICAgaWYgci5lbmQubm9kZVZhbHVlLmxlbmd0aCA+IHIuZW5kT2Zmc2V0XG4gICAgICAgIHIuZW5kLnNwbGl0VGV4dChyLmVuZE9mZnNldClcbiAgICAgIG5yLmVuZCA9IHIuZW5kXG5cbiAgICAjIE1ha2Ugc3VyZSB0aGUgY29tbW9uIGFuY2VzdG9yIGlzIGFuIGVsZW1lbnQgbm9kZS5cbiAgICBuci5jb21tb25BbmNlc3RvciA9IEBjb21tb25BbmNlc3RvckNvbnRhaW5lclxuICAgIHdoaWxlIG5yLmNvbW1vbkFuY2VzdG9yLm5vZGVUeXBlIGlzbnQgTm9kZS5FTEVNRU5UX05PREVcbiAgICAgIG5yLmNvbW1vbkFuY2VzdG9yID0gbnIuY29tbW9uQW5jZXN0b3IucGFyZW50Tm9kZVxuXG4gICAgbmV3IFJhbmdlLk5vcm1hbGl6ZWRSYW5nZShucilcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhIHJhbmdlIHN1aXRhYmxlIGZvciBzdG9yYWdlLlxuICAjXG4gICMgcm9vdCAgICAgICAgICAgLSBBIHJvb3QgRWxlbWVudCBmcm9tIHdoaWNoIHRvIGFuY2hvciB0aGUgc2VyaWFsaXNhdGlvbi5cbiAgIyBpZ25vcmVTZWxlY3RvciAtIEEgc2VsZWN0b3IgU3RyaW5nIG9mIGVsZW1lbnRzIHRvIGlnbm9yZS4gRm9yIGV4YW1wbGVcbiAgIyAgICAgICAgICAgICAgICAgIGVsZW1lbnRzIGluamVjdGVkIGJ5IHRoZSBhbm5vdGF0b3IuXG4gICNcbiAgIyBSZXR1cm5zIGFuIGluc3RhbmNlIG9mIFNlcmlhbGl6ZWRSYW5nZS5cbiAgc2VyaWFsaXplOiAocm9vdCwgaWdub3JlU2VsZWN0b3IpIC0+XG4gICAgdGhpcy5ub3JtYWxpemUocm9vdCkuc2VyaWFsaXplKHJvb3QsIGlnbm9yZVNlbGVjdG9yKVxuXG4jIFB1YmxpYzogQSBub3JtYWxpc2VkIHJhbmdlIGlzIG1vc3QgY29tbW9ubHkgdXNlZCB0aHJvdWdob3V0IHRoZSBhbm5vdGF0b3IuXG4jIGl0cyB0aGUgcmVzdWx0IG9mIGEgZGVzZXJpYWxpc2VkIFNlcmlhbGl6ZWRSYW5nZSBvciBhIEJyb3dzZXJSYW5nZSB3aXRoXG4jIG91dCBicm93c2VyIGluY29uc2lzdGVuY2llcy5cbmNsYXNzIFJhbmdlLk5vcm1hbGl6ZWRSYW5nZVxuXG4gICMgUHVibGljOiBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIGEgTm9ybWFsaXplZFJhbmdlLlxuICAjXG4gICMgVGhpcyBpcyB1c3VhbGx5IGNyZWF0ZWQgYnkgY2FsbGluZyB0aGUgLm5vcm1hbGl6ZSgpIG1ldGhvZCBvbiBvbmUgb2YgdGhlXG4gICMgb3RoZXIgUmFuZ2UgY2xhc3NlcyByYXRoZXIgdGhhbiBtYW51YWxseS5cbiAgI1xuICAjIG9iaiAtIEFuIE9iamVjdCBsaXRlcmFsLiBTaG91bGQgaGF2ZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXMuXG4gICMgICAgICAgY29tbW9uQW5jZXN0b3I6IEEgRWxlbWVudCB0aGF0IGVuY29tcGFzc2VzIGJvdGggdGhlIHN0YXJ0IGFuZCBlbmQgbm9kZXNcbiAgIyAgICAgICBzdGFydDogICAgICAgICAgVGhlIGZpcnN0IFRleHROb2RlIGluIHRoZSByYW5nZS5cbiAgIyAgICAgICBlbmQgICAgICAgICAgICAgVGhlIGxhc3QgVGV4dE5vZGUgaW4gdGhlIHJhbmdlLlxuICAjXG4gICMgUmV0dXJucyBhbiBpbnN0YW5jZSBvZiBOb3JtYWxpemVkUmFuZ2UuXG4gIGNvbnN0cnVjdG9yOiAob2JqKSAtPlxuICAgIEBjb21tb25BbmNlc3RvciA9IG9iai5jb21tb25BbmNlc3RvclxuICAgIEBzdGFydCAgICAgICAgICA9IG9iai5zdGFydFxuICAgIEBlbmQgICAgICAgICAgICA9IG9iai5lbmRcblxuICAjIFB1YmxpYzogRm9yIEFQSSBjb25zaXN0ZW5jeS5cbiAgI1xuICAjIFJldHVybnMgaXRzZWxmLlxuICBub3JtYWxpemU6IChyb290KSAtPlxuICAgIHRoaXNcblxuICAjIFB1YmxpYzogTGltaXRzIHRoZSBub2RlcyB3aXRoaW4gdGhlIE5vcm1hbGl6ZWRSYW5nZSB0byB0aG9zZSBjb250YWluZWRcbiAgIyB3aXRoaW5nIHRoZSBib3VuZHMgcGFyYW1ldGVyLiBJdCByZXR1cm5zIGFuIHVwZGF0ZWQgcmFuZ2Ugd2l0aCBhbGxcbiAgIyBwcm9wZXJ0aWVzIHVwZGF0ZWQuIE5PVEU6IE1ldGhvZCByZXR1cm5zIG51bGwgaWYgYWxsIG5vZGVzIGZhbGwgb3V0c2lkZVxuICAjIG9mIHRoZSBib3VuZHMuXG4gICNcbiAgIyBib3VuZHMgLSBBbiBFbGVtZW50IHRvIGxpbWl0IHRoZSByYW5nZSB0by5cbiAgI1xuICAjIFJldHVybnMgdXBkYXRlZCBzZWxmIG9yIG51bGwuXG4gIGxpbWl0OiAoYm91bmRzKSAtPlxuICAgIG5vZGVzID0gJC5ncmVwIHRoaXMudGV4dE5vZGVzKCksIChub2RlKSAtPlxuICAgICAgbm9kZS5wYXJlbnROb2RlID09IGJvdW5kcyBvciAkLmNvbnRhaW5zKGJvdW5kcywgbm9kZS5wYXJlbnROb2RlKVxuXG4gICAgcmV0dXJuIG51bGwgdW5sZXNzIG5vZGVzLmxlbmd0aFxuXG4gICAgQHN0YXJ0ID0gbm9kZXNbMF1cbiAgICBAZW5kICAgPSBub2Rlc1tub2Rlcy5sZW5ndGggLSAxXVxuXG4gICAgc3RhcnRQYXJlbnRzID0gJChAc3RhcnQpLnBhcmVudHMoKVxuICAgIGZvciBwYXJlbnQgaW4gJChAZW5kKS5wYXJlbnRzKClcbiAgICAgIGlmIHN0YXJ0UGFyZW50cy5pbmRleChwYXJlbnQpICE9IC0xXG4gICAgICAgIEBjb21tb25BbmNlc3RvciA9IHBhcmVudFxuICAgICAgICBicmVha1xuICAgIHRoaXNcblxuICAjIENvbnZlcnQgdGhpcyByYW5nZSBpbnRvIGFuIG9iamVjdCBjb25zaXN0aW5nIG9mIHR3byBwYWlycyBvZiAoeHBhdGgsXG4gICMgY2hhcmFjdGVyIG9mZnNldCksIHdoaWNoIGNhbiBiZSBlYXNpbHkgc3RvcmVkIGluIGEgZGF0YWJhc2UuXG4gICNcbiAgIyByb290IC0gICAgICAgICAgIFRoZSByb290IEVsZW1lbnQgcmVsYXRpdmUgdG8gd2hpY2ggWFBhdGhzIHNob3VsZCBiZSBjYWxjdWxhdGVkXG4gICMgaWdub3JlU2VsZWN0b3IgLSBBIHNlbGVjdG9yIFN0cmluZyBvZiBlbGVtZW50cyB0byBpZ25vcmUuIEZvciBleGFtcGxlXG4gICMgICAgICAgICAgICAgICAgICBlbGVtZW50cyBpbmplY3RlZCBieSB0aGUgYW5ub3RhdG9yLlxuICAjXG4gICMgUmV0dXJucyBhbiBpbnN0YW5jZSBvZiBTZXJpYWxpemVkUmFuZ2UuXG4gIHNlcmlhbGl6ZTogKHJvb3QsIGlnbm9yZVNlbGVjdG9yKSAtPlxuXG4gICAgc2VyaWFsaXphdGlvbiA9IChub2RlLCBpc0VuZCkgLT5cbiAgICAgIGlmIGlnbm9yZVNlbGVjdG9yXG4gICAgICAgIG9yaWdQYXJlbnQgPSAkKG5vZGUpLnBhcmVudHMoXCI6bm90KCN7aWdub3JlU2VsZWN0b3J9KVwiKS5lcSgwKVxuICAgICAgZWxzZVxuICAgICAgICBvcmlnUGFyZW50ID0gJChub2RlKS5wYXJlbnQoKVxuXG4gICAgICB4cGF0aCA9IFV0aWwueHBhdGhGcm9tTm9kZShvcmlnUGFyZW50LCByb290KVswXVxuICAgICAgdGV4dE5vZGVzID0gVXRpbC5nZXRUZXh0Tm9kZXMob3JpZ1BhcmVudClcblxuICAgICAgIyBDYWxjdWxhdGUgcmVhbCBvZmZzZXQgYXMgdGhlIGNvbWJpbmVkIGxlbmd0aCBvZiBhbGwgdGhlXG4gICAgICAjIHByZWNlZGluZyB0ZXh0Tm9kZSBzaWJsaW5ncy4gV2UgaW5jbHVkZSB0aGUgbGVuZ3RoIG9mIHRoZVxuICAgICAgIyBub2RlIGlmIGl0J3MgdGhlIGVuZCBub2RlLlxuICAgICAgbm9kZXMgPSB0ZXh0Tm9kZXMuc2xpY2UoMCwgdGV4dE5vZGVzLmluZGV4KG5vZGUpKVxuICAgICAgb2Zmc2V0ID0gMFxuICAgICAgZm9yIG4gaW4gbm9kZXNcbiAgICAgICAgb2Zmc2V0ICs9IG4ubm9kZVZhbHVlLmxlbmd0aFxuXG4gICAgICBpZiBpc0VuZCB0aGVuIFt4cGF0aCwgb2Zmc2V0ICsgbm9kZS5ub2RlVmFsdWUubGVuZ3RoXSBlbHNlIFt4cGF0aCwgb2Zmc2V0XVxuXG4gICAgc3RhcnQgPSBzZXJpYWxpemF0aW9uKEBzdGFydClcbiAgICBlbmQgICA9IHNlcmlhbGl6YXRpb24oQGVuZCwgdHJ1ZSlcblxuICAgIG5ldyBSYW5nZS5TZXJpYWxpemVkUmFuZ2Uoe1xuICAgICAgIyBYUGF0aCBzdHJpbmdzXG4gICAgICBzdGFydDogc3RhcnRbMF1cbiAgICAgIGVuZDogZW5kWzBdXG4gICAgICAjIENoYXJhY3RlciBvZmZzZXRzIChpbnRlZ2VyKVxuICAgICAgc3RhcnRPZmZzZXQ6IHN0YXJ0WzFdXG4gICAgICBlbmRPZmZzZXQ6IGVuZFsxXVxuICAgIH0pXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYSBjb25jYXRlbmF0ZWQgU3RyaW5nIG9mIHRoZSBjb250ZW50cyBvZiBhbGwgdGhlIHRleHQgbm9kZXNcbiAgIyB3aXRoaW4gdGhlIHJhbmdlLlxuICAjXG4gICMgUmV0dXJucyBhIFN0cmluZy5cbiAgdGV4dDogLT5cbiAgICAoZm9yIG5vZGUgaW4gdGhpcy50ZXh0Tm9kZXMoKVxuICAgICAgbm9kZS5ub2RlVmFsdWVcbiAgICApLmpvaW4gJydcblxuICAjIFB1YmxpYzogRmV0Y2hlcyBvbmx5IHRoZSB0ZXh0IG5vZGVzIHdpdGhpbiB0aCByYW5nZS5cbiAgI1xuICAjIFJldHVybnMgYW4gQXJyYXkgb2YgVGV4dE5vZGUgaW5zdGFuY2VzLlxuICB0ZXh0Tm9kZXM6IC0+XG4gICAgdGV4dE5vZGVzID0gVXRpbC5nZXRUZXh0Tm9kZXMoJCh0aGlzLmNvbW1vbkFuY2VzdG9yKSlcbiAgICBbc3RhcnQsIGVuZF0gPSBbdGV4dE5vZGVzLmluZGV4KHRoaXMuc3RhcnQpLCB0ZXh0Tm9kZXMuaW5kZXgodGhpcy5lbmQpXVxuICAgICMgUmV0dXJuIHRoZSB0ZXh0Tm9kZXMgdGhhdCBmYWxsIGJldHdlZW4gdGhlIHN0YXJ0IGFuZCBlbmQgaW5kZXhlcy5cbiAgICAkLm1ha2VBcnJheSB0ZXh0Tm9kZXNbc3RhcnQuLmVuZF1cblxuICAjIFB1YmxpYzogQ29udmVydHMgdGhlIE5vcm1hbGl6ZWQgcmFuZ2UgdG8gYSBuYXRpdmUgYnJvd3NlciByYW5nZS5cbiAgI1xuICAjIFNlZTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vRE9NL3JhbmdlXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICBzZWxlY3Rpb24gPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcbiAgIyAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKVxuICAjICAgc2VsZWN0aW9uLmFkZFJhbmdlKG5vcm1lZFJhbmdlLnRvUmFuZ2UoKSlcbiAgI1xuICAjIFJldHVybnMgYSBSYW5nZSBvYmplY3QuXG4gIHRvUmFuZ2U6IC0+XG4gICAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXG4gICAgcmFuZ2Uuc2V0U3RhcnRCZWZvcmUoQHN0YXJ0KVxuICAgIHJhbmdlLnNldEVuZEFmdGVyKEBlbmQpXG4gICAgcmFuZ2VcblxuIyBQdWJsaWM6IEEgcmFuZ2Ugc3VpdGFibGUgZm9yIHN0b3JpbmcgaW4gbG9jYWwgc3RvcmFnZSBvciBzZXJpYWxpemluZyB0byBKU09OLlxuY2xhc3MgUmFuZ2UuU2VyaWFsaXplZFJhbmdlXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYSBTZXJpYWxpemVkUmFuZ2VcbiAgI1xuICAjIG9iaiAtIFRoZSBzdG9yZWQgb2JqZWN0LiBJdCBzaG91bGQgaGF2ZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXMuXG4gICMgICAgICAgc3RhcnQ6ICAgICAgIEFuIHhwYXRoIHRvIHRoZSBFbGVtZW50IGNvbnRhaW5pbmcgdGhlIGZpcnN0IFRleHROb2RlXG4gICMgICAgICAgICAgICAgICAgICAgIHJlbGF0aXZlIHRvIHRoZSByb290IEVsZW1lbnQuXG4gICMgICAgICAgc3RhcnRPZmZzZXQ6IFRoZSBvZmZzZXQgdG8gdGhlIHN0YXJ0IG9mIHRoZSBzZWxlY3Rpb24gZnJvbSBvYmouc3RhcnQuXG4gICMgICAgICAgZW5kOiAgICAgICAgIEFuIHhwYXRoIHRvIHRoZSBFbGVtZW50IGNvbnRhaW5pbmcgdGhlIGxhc3QgVGV4dE5vZGVcbiAgIyAgICAgICAgICAgICAgICAgICAgcmVsYXRpdmUgdG8gdGhlIHJvb3QgRWxlbWVudC5cbiAgIyAgICAgICBzdGFydE9mZnNldDogVGhlIG9mZnNldCB0byB0aGUgZW5kIG9mIHRoZSBzZWxlY3Rpb24gZnJvbSBvYmouZW5kLlxuICAjXG4gICMgUmV0dXJucyBhbiBpbnN0YW5jZSBvZiBTZXJpYWxpemVkUmFuZ2VcbiAgY29uc3RydWN0b3I6IChvYmopIC0+XG4gICAgQHN0YXJ0ICAgICAgID0gb2JqLnN0YXJ0XG4gICAgQHN0YXJ0T2Zmc2V0ID0gb2JqLnN0YXJ0T2Zmc2V0XG4gICAgQGVuZCAgICAgICAgID0gb2JqLmVuZFxuICAgIEBlbmRPZmZzZXQgICA9IG9iai5lbmRPZmZzZXRcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhIE5vcm1hbGl6ZWRSYW5nZS5cbiAgI1xuICAjIHJvb3QgLSBUaGUgcm9vdCBFbGVtZW50IGZyb20gd2hpY2ggdGhlIFhQYXRocyB3ZXJlIGdlbmVyYXRlZC5cbiAgI1xuICAjIFJldHVybnMgYSBOb3JtYWxpemVkUmFuZ2UgaW5zdGFuY2UuXG4gIG5vcm1hbGl6ZTogKHJvb3QpIC0+XG4gICAgcmFuZ2UgPSB7fVxuXG4gICAgZm9yIHAgaW4gWydzdGFydCcsICdlbmQnXVxuICAgICAgdHJ5XG4gICAgICAgIG5vZGUgPSBSYW5nZS5ub2RlRnJvbVhQYXRoKHRoaXNbcF0sIHJvb3QpXG4gICAgICBjYXRjaCBlXG4gICAgICAgIHRocm93IG5ldyBSYW5nZS5SYW5nZUVycm9yKHAsIFwiRXJyb3Igd2hpbGUgZmluZGluZyAje3B9IG5vZGU6ICN7dGhpc1twXX06IFwiICsgZSwgZSlcblxuICAgICAgaWYgbm90IG5vZGVcbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlLlJhbmdlRXJyb3IocCwgXCJDb3VsZG4ndCBmaW5kICN7cH0gbm9kZTogI3t0aGlzW3BdfVwiKVxuXG4gICAgICAjIFVuZm9ydHVuYXRlbHksIHdlICpjYW4ndCogZ3VhcmFudGVlIG9ubHkgb25lIHRleHROb2RlIHBlclxuICAgICAgIyBlbGVtZW50Tm9kZSwgc28gd2UgaGF2ZSB0byB3YWxrIGFsb25nIHRoZSBlbGVtZW50J3MgdGV4dE5vZGVzIHVudGlsXG4gICAgICAjIHRoZSBjb21iaW5lZCBsZW5ndGggb2YgdGhlIHRleHROb2RlcyB0byB0aGF0IHBvaW50IGV4Y2VlZHMgb3JcbiAgICAgICMgbWF0Y2hlcyB0aGUgdmFsdWUgb2YgdGhlIG9mZnNldC5cbiAgICAgIGxlbmd0aCA9IDBcbiAgICAgIHRhcmdldE9mZnNldCA9IHRoaXNbcCArICdPZmZzZXQnXVxuXG4gICAgICAjIFJhbmdlIGV4Y2x1ZGVzIGl0cyBlbmRwb2ludCBiZWNhdXNlIGl0IGRlc2NyaWJlcyB0aGUgYm91bmRhcnkgcG9zaXRpb24uXG4gICAgICAjIFRhcmdldCB0aGUgc3RyaW5nIGluZGV4IG9mIHRoZSBsYXN0IGNoYXJhY3RlciBpbnNpZGUgdGhlIHJhbmdlLlxuICAgICAgaWYgcCBpcyAnZW5kJyB0aGVuIHRhcmdldE9mZnNldC0tXG5cbiAgICAgIGZvciB0biBpbiBVdGlsLmdldFRleHROb2RlcygkKG5vZGUpKVxuICAgICAgICBpZiAobGVuZ3RoICsgdG4ubm9kZVZhbHVlLmxlbmd0aCA+IHRhcmdldE9mZnNldClcbiAgICAgICAgICByYW5nZVtwICsgJ0NvbnRhaW5lciddID0gdG5cbiAgICAgICAgICByYW5nZVtwICsgJ09mZnNldCddID0gdGhpc1twICsgJ09mZnNldCddIC0gbGVuZ3RoXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGxlbmd0aCArPSB0bi5ub2RlVmFsdWUubGVuZ3RoXG5cbiAgICAgICMgSWYgd2UgZmFsbCBvZmYgdGhlIGVuZCBvZiB0aGUgZm9yIGxvb3Agd2l0aG91dCBoYXZpbmcgc2V0XG4gICAgICAjICdzdGFydE9mZnNldCcvJ2VuZE9mZnNldCcsIHRoZSBlbGVtZW50IGhhcyBzaG9ydGVyIGNvbnRlbnQgdGhhbiB3aGVuXG4gICAgICAjIHdlIGFubm90YXRlZCwgc28gdGhyb3cgYW4gZXJyb3I6XG4gICAgICBpZiBub3QgcmFuZ2VbcCArICdPZmZzZXQnXT9cbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlLlJhbmdlRXJyb3IoXCIje3B9b2Zmc2V0XCIsIFwiQ291bGRuJ3QgZmluZCBvZmZzZXQgI3t0aGlzW3AgKyAnT2Zmc2V0J119IGluIGVsZW1lbnQgI3t0aGlzW3BdfVwiKVxuXG4gICAgIyBIZXJlJ3MgYW4gZWxlZ2FudCBuZXh0IHN0ZXAuLi5cbiAgICAjXG4gICAgIyAgIHJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyID0gJChyYW5nZS5zdGFydENvbnRhaW5lcikucGFyZW50cygpLmhhcyhyYW5nZS5lbmRDb250YWluZXIpWzBdXG4gICAgI1xuICAgICMgLi4uYnV0IHVuZm9ydHVuYXRlbHkgTm9kZS5jb250YWlucygpIGlzIGJyb2tlbiBpbiBTYWZhcmkgNS4xLjUgKDc1MzQuNTUuMylcbiAgICAjIGFuZCBwcmVzdW1hYmx5IG90aGVyIGVhcmxpZXIgdmVyc2lvbnMgb2YgV2ViS2l0LiBJbiBwYXJ0aWN1bGFyLCBpbiBhXG4gICAgIyBkb2N1bWVudCBsaWtlXG4gICAgI1xuICAgICMgICA8cD5IZWxsbzwvcD5cbiAgICAjXG4gICAgIyB0aGUgY29kZVxuICAgICNcbiAgICAjICAgcCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdwJylbMF1cbiAgICAjICAgcC5jb250YWlucyhwLmZpcnN0Q2hpbGQpXG4gICAgI1xuICAgICMgcmV0dXJucyBgZmFsc2VgLiBZYXkuXG4gICAgI1xuICAgICMgU28gaW5zdGVhZCwgd2Ugc3RlcCB0aHJvdWdoIHRoZSBwYXJlbnRzIGZyb20gdGhlIGJvdHRvbSB1cCBhbmQgdXNlXG4gICAgIyBOb2RlLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uKCkgdG8gZGVjaWRlIHdoZW4gdG8gc2V0IHRoZVxuICAgICMgY29tbW9uQW5jZXN0b3JDb250YWluZXIgYW5kIGJhaWwgb3V0LlxuXG4gICAgY29udGFpbnMgPVxuICAgICAgaWYgbm90IGRvY3VtZW50LmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uP1xuICAgICAgICAjIElFXG4gICAgICAgIChhLCBiKSAtPiBhLmNvbnRhaW5zKGIpXG4gICAgICBlbHNlXG4gICAgICAgICMgRXZlcnlvbmUgZWxzZVxuICAgICAgICAoYSwgYikgLT4gYS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbihiKSAmIDE2XG5cbiAgICAkKHJhbmdlLnN0YXJ0Q29udGFpbmVyKS5wYXJlbnRzKCkuZWFjaCAtPlxuICAgICAgaWYgY29udGFpbnModGhpcywgcmFuZ2UuZW5kQ29udGFpbmVyKVxuICAgICAgICByYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lciA9IHRoaXNcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBuZXcgUmFuZ2UuQnJvd3NlclJhbmdlKHJhbmdlKS5ub3JtYWxpemUocm9vdClcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhIHJhbmdlIHN1aXRhYmxlIGZvciBzdG9yYWdlLlxuICAjXG4gICMgcm9vdCAgICAgICAgICAgLSBBIHJvb3QgRWxlbWVudCBmcm9tIHdoaWNoIHRvIGFuY2hvciB0aGUgc2VyaWFsaXNhdGlvbi5cbiAgIyBpZ25vcmVTZWxlY3RvciAtIEEgc2VsZWN0b3IgU3RyaW5nIG9mIGVsZW1lbnRzIHRvIGlnbm9yZS4gRm9yIGV4YW1wbGVcbiAgIyAgICAgICAgICAgICAgICAgIGVsZW1lbnRzIGluamVjdGVkIGJ5IHRoZSBhbm5vdGF0b3IuXG4gICNcbiAgIyBSZXR1cm5zIGFuIGluc3RhbmNlIG9mIFNlcmlhbGl6ZWRSYW5nZS5cbiAgc2VyaWFsaXplOiAocm9vdCwgaWdub3JlU2VsZWN0b3IpIC0+XG4gICAgdGhpcy5ub3JtYWxpemUocm9vdCkuc2VyaWFsaXplKHJvb3QsIGlnbm9yZVNlbGVjdG9yKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSByYW5nZSBhcyBhbiBPYmplY3QgbGl0ZXJhbC5cbiAgdG9PYmplY3Q6IC0+XG4gICAge1xuICAgICAgc3RhcnQ6IEBzdGFydFxuICAgICAgc3RhcnRPZmZzZXQ6IEBzdGFydE9mZnNldFxuICAgICAgZW5kOiBAZW5kXG4gICAgICBlbmRPZmZzZXQ6IEBlbmRPZmZzZXRcbiAgICB9XG5cblxuIyBFeHBvcnQgUmFuZ2Ugb2JqZWN0LlxubW9kdWxlLmV4cG9ydHMgPSBSYW5nZVxuIiwiIyBSZWdpc3RyeSBpcyBhIGZhY3RvcnkgZm9yIGFubm90YXRvciBhcHBsaWNhdGlvbnMgcHJvdmlkaW5nIGEgc2ltcGxlIHJ1bnRpbWVcbiMgZXh0ZW5zaW9uIGludGVyZmFjZSBhbmQgYXBwbGljYXRpb24gbG9hZGVyLiBJdCBpcyB1c2VkIHRvIHBhc3Mgc2V0dGluZ3MgdG9cbiMgZXh0ZW5zaW9uIG1vZHVsZXMgYW5kIHByb3ZpZGUgYSBtZWFucyBieSB3aGljaCBleHRlbnNpb25zIGNhbiBleHBvcnRcbiMgZnVuY3Rpb25hbGl0eSB0byBhcHBsaWNhdGlvbnMuXG5jbGFzcyBSZWdpc3RyeVxuXG4gICMgUHVibGljOiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgdGhlIGFwcGxpY2F0aW9uIGRlZmluZWQgYnkgdGhlIHByb3ZpZGVkXG4gICMgbW9kdWxlLiBUaGUgYXBwbGljYXRpb24gd2lsbCByZWNlaXZlIGEgbmV3IHJlZ2lzdHJ5IGluc3RhbmNlIHdob3NlIHNldHRpbmdzXG4gICMgbWF5IGJlIHByb3ZpZGVkIGFzIGEgc2Vjb25kIGFyZ3VtZW50IHRvIHRoaXMgbWV0aG9kLiBUaGUgcmVnaXN0cnkgd2lsbFxuICAjIGltbWVkaWF0ZWx5IGludm9rZSB0aGUgcnVuIGNhbGxiYWNrIG9mIHRoZSBtb2R1bGUuXG4gIEBjcmVhdGVBcHA6IChhcHBNb2R1bGUsIHNldHRpbmdzPXt9KSAtPlxuICAgIChuZXcgdGhpcyhzZXR0aW5ncykpLnJ1bihhcHBNb2R1bGUpXG5cbiAgY29uc3RydWN0b3I6IChAc2V0dGluZ3M9e30pIC0+XG5cbiAgIyBQdWJsaWM6IEluY2x1ZGUgYSBtb2R1bGUuIEEgbW9kdWxlIGlzIGFueSBPYmplY3Qgd2l0aCBhIGZ1Y3Rpb24gcHJvcGVydHlcbiAgIyBuYW1lZCAnY29uZmlndXJlYC4gVGhpcyBmdW5jdGlvbiBpcyBpbW1lZGlhdGVseSBpbnZva2VkIHdpdGggdGhlIHJlZ2lzdHJ5XG4gICMgaW5zdGFuY2UgYXMgdGhlIG9ubHkgYXJndW1lbnQuXG4gIGluY2x1ZGU6IChtb2R1bGUpIC0+XG4gICAgbW9kdWxlLmNvbmZpZ3VyZSh0aGlzKVxuICAgIHRoaXNcblxuICAjIFB1YmxpYzogUnVuIGFuIGFwcGxpY2F0aW9uLiBBbiBhcHBsaWNhdGlvbiBpcyBhIG1vZHVsZSB3aXRoIGEgZnVuY3Rpb25cbiAgIyBwcm9wZXJ0eSBuYW1lZCAncnVuJy4gVGhlIGFwcGxpY2F0aW9uIGlzIGltbWVkaWF0ZWx5IGluY2x1ZGVkIGFuZCBpdHMgcnVuXG4gICMgY2FsbGJhY2sgaW52b2tlZCB3aXRoIHRoZSByZWdpc3RyeSBpbnN0YW5jZSBhcyB0aGUgb25seSBhcmd1bWVudC5cbiAgcnVuOiAoYXBwKSAtPlxuICAgIGlmIHRoaXMuYXBwXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJSZWdpc3RyeSBpcyBhbHJlYWR5IGJvdW5kIHRvIGEgcnVubmluZyBhcHBsaWNhdGlvblwiKVxuXG4gICAgdGhpcy5pbmNsdWRlKGFwcClcblxuICAgIGZvciBvd24gaywgdiBvZiB0aGlzXG4gICAgICBhcHBba10gPSB2XG5cbiAgICB0aGlzLmFwcCA9IGFwcFxuICAgIGFwcC5ydW4odGhpcylcblxubW9kdWxlLmV4cG9ydHMgPSBSZWdpc3RyeVxuIiwiIyBQdWJsaWM6IEFkZHMgcGVyc2lzdGVuY2UgaG9va3MgZm9yIGFubm90YXRpb25zLlxuY2xhc3MgU3RvcmFnZVByb3ZpZGVyXG5cbiAgQGNvbmZpZ3VyZTogKHJlZ2lzdHJ5KSAtPlxuICAgIGtsYXNzID0gcmVnaXN0cnkuc2V0dGluZ3Muc3RvcmU/LnR5cGVcblxuICAgIGlmIHR5cGVvZihrbGFzcykgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgc3RvcmUgPSBuZXcga2xhc3MocmVnaXN0cnkuc2V0dGluZ3Muc3RvcmUpXG4gICAgZWxzZVxuICAgICAgc3RvcmUgPSBuZXcgdGhpcyhyZWdpc3RyeSlcblxuICAgIHJlZ2lzdHJ5WydzdG9yZSddID89IHN0b3JlXG5cbiAgY29uc3RydWN0b3I6IChAcmVnaXN0cnkpIC0+XG5cbiAgIyBQdWJsaWM6IGdldCBhbiB1bmlxdWUgaWRlbnRpZmllclxuICBpZDogKC0+IGNvdW50ZXIgPSAwOyAtPiBjb3VudGVyKyspKClcblxuICAjIFB1YmxpYzogY3JlYXRlIGFuIGFubm90YXRpb25cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdCB0byBjcmVhdGUuXG4gICNcbiAgIyBSZXR1cm5zIGEgcHJvbWlzZSBvZiB0aGUgbmV3IGFubm90YXRpb24gT2JqZWN0LlxuICBjcmVhdGU6IChhbm5vdGF0aW9uKSAtPlxuICAgIGRmZCA9ICQuRGVmZXJyZWQoKVxuICAgIGlmIG5vdCBhbm5vdGF0aW9uLmlkP1xuICAgICAgYW5ub3RhdGlvbi5pZCA9IHRoaXMuaWQoKVxuICAgIGRmZC5yZXNvbHZlKGFubm90YXRpb24pXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcblxuICAjIFB1YmxpYzogdXBkYXRlIGFuIGFubm90YXRpb25cbiAgI1xuICAjIGFubm90YXRpb24gLSBBbiBhbm5vdGF0aW9uIE9iamVjdCB0byBiZSB1cGRhdGVkLlxuICAjXG4gICMgUmV0dXJucyBhIHByb21pc2Ugb2YgdGhlIHVwZGF0ZWQgYW5ub3RhdGlvbiBPYmplY3QuXG4gIHVwZGF0ZTogKGFubm90YXRpb24pIC0+XG4gICAgZGZkID0gJC5EZWZlcnJlZCgpXG4gICAgZGZkLnJlc29sdmUoYW5ub3RhdGlvbilcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuXG4gICMgUHVibGljOiBkZWxldGUgYW4gYW5ub3RhdGlvblxuICAjXG4gICMgYW5ub3RhdGlvbiAtIEFuIGFubm90YXRpb24gT2JqZWN0IHRvIGJlIGRlbGV0ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEgcHJvbWlzZSBvZiB0aGUgcmVzdWx0IG9mIHRoZSBkZWxldGUgb3BlcmF0aW9uLlxuICBkZWxldGU6IChhbm5vdGF0aW9uKSAtPlxuICAgIGRmZCA9ICQuRGVmZXJyZWQoKVxuICAgIGRmZC5yZXNvbHZlKGFubm90YXRpb24pXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcblxuICAjIFB1YmxpYzogcXVlcnkgdGhlIHN0b3JlIGZvciBhbm5vdGF0aW9uc1xuICAjXG4gICMgUmV0dXJucyBhIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBxdWVyeSByZXN1bHRzIGFuZCBxdWVyeSBtZXRhZGF0YS5cbiAgcXVlcnk6IChxdWVyeU9iaikgLT5cbiAgICBkZmQgPSAkLkRlZmVycmVkKClcbiAgICBkZmQucmVzb2x2ZShbXSwge30pXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlUHJvdmlkZXJcbiIsInhwYXRoID0gcmVxdWlyZSAnLi94cGF0aCdcblxuXG4jIEkxOE5cbmdldHRleHQgPSBudWxsXG5cbmlmIEdldHRleHQ/XG4gIF9nZXR0ZXh0ID0gbmV3IEdldHRleHQoZG9tYWluOiBcImFubm90YXRvclwiKVxuICBnZXR0ZXh0ID0gKG1zZ2lkKSAtPiBfZ2V0dGV4dC5nZXR0ZXh0KG1zZ2lkKVxuZWxzZVxuICBnZXR0ZXh0ID0gKG1zZ2lkKSAtPiBtc2dpZFxuXG5fdCA9IChtc2dpZCkgLT4gZ2V0dGV4dChtc2dpZClcblxudW5sZXNzIGpRdWVyeT8uZm4/LmpxdWVyeVxuICBjb25zb2xlLmVycm9yKF90KFwiQW5ub3RhdG9yIHJlcXVpcmVzIGpRdWVyeTogaGF2ZSB5b3UgaW5jbHVkZWQgbGliL3ZlbmRvci9qcXVlcnkuanM/XCIpKVxuXG51bmxlc3MgSlNPTiBhbmQgSlNPTi5wYXJzZSBhbmQgSlNPTi5zdHJpbmdpZnlcbiAgY29uc29sZS5lcnJvcihfdChcIkFubm90YXRvciByZXF1aXJlcyBhIEpTT04gaW1wbGVtZW50YXRpb246IGhhdmUgeW91IGluY2x1ZGVkIGxpYi92ZW5kb3IvanNvbjIuanM/XCIpKVxuXG5VdGlsID0ge31cblxuIyBQdWJsaWM6IENyZWF0ZSBhIEdldHRleHQgdHJhbnNsYXRlZCBzdHJpbmcgZnJvbSBhIG1lc3NhZ2UgaWRcbiNcbiMgUmV0dXJucyBhIFN0cmluZ1xuVXRpbC5UcmFuc2xhdGlvblN0cmluZyA9IF90XG5cblxuIyBQdWJsaWM6IEZsYXR0ZW4gYSBuZXN0ZWQgYXJyYXkgc3RydWN0dXJlXG4jXG4jIFJldHVybnMgYW4gYXJyYXlcblV0aWwuZmxhdHRlbiA9IChhcnJheSkgLT5cbiAgZmxhdHRlbiA9IChhcnkpIC0+XG4gICAgZmxhdCA9IFtdXG5cbiAgICBmb3IgZWwgaW4gYXJ5XG4gICAgICBmbGF0ID0gZmxhdC5jb25jYXQoaWYgZWwgYW5kICQuaXNBcnJheShlbCkgdGhlbiBmbGF0dGVuKGVsKSBlbHNlIGVsKVxuXG4gICAgcmV0dXJuIGZsYXRcblxuICBmbGF0dGVuKGFycmF5KVxuXG4jIFB1YmxpYzogZGVjaWRlcyB3aGV0aGVyIG5vZGUgQSBpcyBhbiBhbmNlc3RvciBvZiBub2RlIEIuXG4jXG4jIFRoaXMgZnVuY3Rpb24gcHVycG9zZWZ1bGx5IGlnbm9yZXMgdGhlIG5hdGl2ZSBicm93c2VyIGZ1bmN0aW9uIGZvciB0aGlzLFxuIyBiZWNhdXNlIGl0IGFjdHMgd2VpcmQgaW4gUGhhbnRvbUpTLlxuIyBJc3N1ZTogaHR0cHM6Ly9naXRodWIuY29tL2FyaXlhL3BoYW50b21qcy9pc3N1ZXMvMTE0NzlcblV0aWwuY29udGFpbnMgPSAocGFyZW50LCBjaGlsZCkgLT5cbiAgbm9kZSA9IGNoaWxkXG4gIHdoaWxlIG5vZGU/XG4gICAgaWYgbm9kZSBpcyBwYXJlbnQgdGhlbiByZXR1cm4gdHJ1ZVxuICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGVcbiAgcmV0dXJuIGZhbHNlXG5cbiMgUHVibGljOiBGaW5kcyBhbGwgdGV4dCBub2RlcyB3aXRoaW4gdGhlIGVsZW1lbnRzIGluIHRoZSBjdXJyZW50IGNvbGxlY3Rpb24uXG4jXG4jIFJldHVybnMgYSBuZXcgalF1ZXJ5IGNvbGxlY3Rpb24gb2YgdGV4dCBub2Rlcy5cblV0aWwuZ2V0VGV4dE5vZGVzID0gKGpxKSAtPlxuICBnZXRUZXh0Tm9kZXMgPSAobm9kZSkgLT5cbiAgICBpZiBub2RlIGFuZCBub2RlLm5vZGVUeXBlICE9IE5vZGUuVEVYVF9OT0RFXG4gICAgICBub2RlcyA9IFtdXG5cbiAgICAgICMgSWYgbm90IGEgY29tbWVudCB0aGVuIHRyYXZlcnNlIGNoaWxkcmVuIGNvbGxlY3RpbmcgdGV4dCBub2Rlcy5cbiAgICAgICMgV2UgdHJhdmVyc2UgdGhlIGNoaWxkIG5vZGVzIG1hbnVhbGx5IHJhdGhlciB0aGFuIHVzaW5nIHRoZSAuY2hpbGROb2Rlc1xuICAgICAgIyBwcm9wZXJ0eSBiZWNhdXNlIElFOSBkb2VzIG5vdCB1cGRhdGUgdGhlIC5jaGlsZE5vZGVzIHByb3BlcnR5IGFmdGVyXG4gICAgICAjIC5zcGxpdFRleHQoKSBpcyBjYWxsZWQgb24gYSBjaGlsZCB0ZXh0IG5vZGUuXG4gICAgICBpZiBub2RlLm5vZGVUeXBlICE9IE5vZGUuQ09NTUVOVF9OT0RFXG4gICAgICAgICMgU3RhcnQgYXQgdGhlIGxhc3QgY2hpbGQgYW5kIHdhbGsgYmFja3dhcmRzIHRocm91Z2ggc2libGluZ3MuXG4gICAgICAgIG5vZGUgPSBub2RlLmxhc3RDaGlsZFxuICAgICAgICB3aGlsZSBub2RlXG4gICAgICAgICAgbm9kZXMucHVzaCBnZXRUZXh0Tm9kZXMobm9kZSlcbiAgICAgICAgICBub2RlID0gbm9kZS5wcmV2aW91c1NpYmxpbmdcblxuICAgICAgIyBGaW5hbGx5IHJldmVyc2UgdGhlIGFycmF5IHNvIHRoYXQgbm9kZXMgYXJlIGluIHRoZSBjb3JyZWN0IG9yZGVyLlxuICAgICAgcmV0dXJuIG5vZGVzLnJldmVyc2UoKVxuICAgIGVsc2VcbiAgICAgIHJldHVybiBub2RlXG5cbiAganEubWFwIC0+IFV0aWwuZmxhdHRlbihnZXRUZXh0Tm9kZXModGhpcykpXG5cbiMgUHVibGljOiBkZXRlcm1pbmUgdGhlIGxhc3QgdGV4dCBub2RlIGluc2lkZSBvciBiZWZvcmUgdGhlIGdpdmVuIG5vZGVcblV0aWwuZ2V0TGFzdFRleHROb2RlVXBUbyA9IChuKSAtPlxuICBzd2l0Y2ggbi5ub2RlVHlwZVxuICAgIHdoZW4gTm9kZS5URVhUX05PREVcbiAgICAgIHJldHVybiBuICMgV2UgaGF2ZSBmb3VuZCBvdXIgdGV4dCBub2RlLlxuICAgIHdoZW4gTm9kZS5FTEVNRU5UX05PREVcbiAgICAgICMgVGhpcyBpcyBhbiBlbGVtZW50LCB3ZSBuZWVkIHRvIGRpZyBpblxuICAgICAgaWYgbi5sYXN0Q2hpbGQ/ICMgRG9lcyBpdCBoYXZlIGNoaWxkcmVuIGF0IGFsbD9cbiAgICAgICAgcmVzdWx0ID0gVXRpbC5nZXRMYXN0VGV4dE5vZGVVcFRvIG4ubGFzdENoaWxkXG4gICAgICAgIGlmIHJlc3VsdD8gdGhlbiByZXR1cm4gcmVzdWx0ICAgICAgICBcbiAgICBlbHNlXG4gICAgICAjIE5vdCBhIHRleHQgbm9kZSwgYW5kIG5vdCBhbiBlbGVtZW50IG5vZGUuXG4gICMgQ291bGQgbm90IGZpbmQgYSB0ZXh0IG5vZGUgaW4gY3VycmVudCBub2RlLCBnbyBiYWNrd2FyZHNcbiAgbiA9IG4ucHJldmlvdXNTaWJsaW5nXG4gIGlmIG4/XG4gICAgVXRpbC5nZXRMYXN0VGV4dE5vZGVVcFRvIG5cbiAgZWxzZVxuICAgIG51bGxcblxuIyBQdWJsaWM6IGRldGVybWluZSB0aGUgZmlyc3QgdGV4dCBub2RlIGluIG9yIGFmdGVyIHRoZSBnaXZlbiBqUXVlcnkgbm9kZS5cblV0aWwuZ2V0Rmlyc3RUZXh0Tm9kZU5vdEJlZm9yZSA9IChuKSAtPlxuICBzd2l0Y2ggbi5ub2RlVHlwZVxuICAgIHdoZW4gTm9kZS5URVhUX05PREVcbiAgICAgIHJldHVybiBuICMgV2UgaGF2ZSBmb3VuZCBvdXIgdGV4dCBub2RlLlxuICAgIHdoZW4gTm9kZS5FTEVNRU5UX05PREVcbiAgICAgICMgVGhpcyBpcyBhbiBlbGVtZW50LCB3ZSBuZWVkIHRvIGRpZyBpblxuICAgICAgaWYgbi5maXJzdENoaWxkPyAjIERvZXMgaXQgaGF2ZSBjaGlsZHJlbiBhdCBhbGw/XG4gICAgICAgIHJlc3VsdCA9IFV0aWwuZ2V0Rmlyc3RUZXh0Tm9kZU5vdEJlZm9yZSBuLmZpcnN0Q2hpbGRcbiAgICAgICAgaWYgcmVzdWx0PyB0aGVuIHJldHVybiByZXN1bHRcbiAgICBlbHNlXG4gICAgICAjIE5vdCBhIHRleHQgb3IgYW4gZWxlbWVudCBub2RlLlxuICAjIENvdWxkIG5vdCBmaW5kIGEgdGV4dCBub2RlIGluIGN1cnJlbnQgbm9kZSwgZ28gZm9yd2FyZFxuICBuID0gbi5uZXh0U2libGluZ1xuICBpZiBuP1xuICAgIFV0aWwuZ2V0Rmlyc3RUZXh0Tm9kZU5vdEJlZm9yZSBuXG4gIGVsc2VcbiAgICBudWxsXG5cbiMgUHVibGljOiByZWFkIG91dCB0aGUgdGV4dCB2YWx1ZSBvZiBhIHJhbmdlIHVzaW5nIHRoZSBzZWxlY3Rpb24gQVBJXG4jXG4jIFRoaXMgbWV0aG9kIHNlbGVjdHMgdGhlIHNwZWNpZmllZCByYW5nZSwgYW5kIGFza3MgZm9yIHRoZSBzdHJpbmdcbiMgdmFsdWUgb2YgdGhlIHNlbGVjdGlvbi4gV2hhdCB0aGlzIHJldHVybnMgaXMgdmVyeSBjbG9zZSB0byB3aGF0IHRoZSB1c2VyXG4jIGFjdHVhbGx5IHNlZXMuXG5VdGlsLnJlYWRSYW5nZVZpYVNlbGVjdGlvbiA9IChyYW5nZSkgLT5cbiAgc2VsID0gVXRpbC5nZXRHbG9iYWwoKS5nZXRTZWxlY3Rpb24oKSAjIEdldCB0aGUgYnJvd3NlciBzZWxlY3Rpb24gb2JqZWN0XG4gIHNlbC5yZW1vdmVBbGxSYW5nZXMoKSAgICAgICAgICAgICAgICAgIyBjbGVhciB0aGUgc2VsZWN0aW9uXG4gIHNlbC5hZGRSYW5nZSByYW5nZS50b1JhbmdlKCkgICAgICAgICAgIyBTZWxlY3QgdGhlIHJhbmdlXG4gIHNlbC50b1N0cmluZygpICAgICAgICAgICAgICAgICAgICAgICAgIyBSZWFkIG91dCB0aGUgc2VsZWN0aW9uXG5cblV0aWwueHBhdGhGcm9tTm9kZSA9IChlbCwgcmVsYXRpdmVSb290KSAtPlxuICB0cnlcbiAgICByZXN1bHQgPSB4cGF0aC5zaW1wbGVYUGF0aEpRdWVyeS5jYWxsIGVsLCByZWxhdGl2ZVJvb3RcbiAgY2F0Y2ggZXhjZXB0aW9uXG4gICAgY29uc29sZS5sb2cgXCJqUXVlcnktYmFzZWQgWFBhdGggY29uc3RydWN0aW9uIGZhaWxlZCEgRmFsbGluZyBiYWNrIHRvIG1hbnVhbC5cIlxuICAgIHJlc3VsdCA9IHhwYXRoLnNpbXBsZVhQYXRoUHVyZS5jYWxsIGVsLCByZWxhdGl2ZVJvb3RcbiAgcmVzdWx0XG5cblV0aWwubm9kZUZyb21YUGF0aCA9ICh4cCwgcm9vdCkgLT5cbiAgc3RlcHMgPSB4cC5zdWJzdHJpbmcoMSkuc3BsaXQoXCIvXCIpXG4gIG5vZGUgPSByb290XG4gIGZvciBzdGVwIGluIHN0ZXBzXG4gICAgW25hbWUsIGlkeF0gPSBzdGVwLnNwbGl0IFwiW1wiXG4gICAgaWR4ID0gaWYgaWR4PyB0aGVuIHBhcnNlSW50IChpZHg/LnNwbGl0IFwiXVwiKVswXSBlbHNlIDFcbiAgICBub2RlID0geHBhdGguZmluZENoaWxkIG5vZGUsIG5hbWUudG9Mb3dlckNhc2UoKSwgaWR4XG5cbiAgbm9kZVxuXG5VdGlsLmVzY2FwZSA9IChodG1sKSAtPlxuICBodG1sXG4gICAgLnJlcGxhY2UoLyYoPyFcXHcrOykvZywgJyZhbXA7JylcbiAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcblxuVXRpbC51dWlkID0gKC0+IGNvdW50ZXIgPSAwOyAtPiBjb3VudGVyKyspKClcblxuVXRpbC5nZXRHbG9iYWwgPSAtPiAoLT4gdGhpcykoKVxuXG4jIFJldHVybiB0aGUgbWF4aW11bSB6LWluZGV4IG9mIGFueSBlbGVtZW50IGluICRlbGVtZW50cyAoYSBqUXVlcnkgY29sbGVjdGlvbikuXG5VdGlsLm1heFpJbmRleCA9ICgkZWxlbWVudHMpIC0+XG4gIGFsbCA9IGZvciBlbCBpbiAkZWxlbWVudHNcbiAgICAgICAgICBpZiAkKGVsKS5jc3MoJ3Bvc2l0aW9uJykgPT0gJ3N0YXRpYydcbiAgICAgICAgICAgIC0xXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcGFyc2VJbnQoJChlbCkuY3NzKCd6LWluZGV4JyksIDEwKSBvciAtMVxuICBNYXRoLm1heC5hcHBseShNYXRoLCBhbGwpXG5cblV0aWwubW91c2VQb3NpdGlvbiA9IChlLCBvZmZzZXRFbCkgLT5cbiAgIyBJZiB0aGUgb2Zmc2V0IGVsZW1lbnQgaXMgbm90IGEgcG9zaXRpb25pbmcgcm9vdCB1c2UgaXRzIG9mZnNldCBwYXJlbnRcbiAgdW5sZXNzICQob2Zmc2V0RWwpLmNzcygncG9zaXRpb24nKSBpbiBbJ2Fic29sdXRlJywgJ2ZpeGVkJywgJ3JlbGF0aXZlJ11cbiAgICBvZmZzZXRFbCA9ICQob2Zmc2V0RWwpLm9mZnNldFBhcmVudCgpWzBdXG4gIG9mZnNldCA9ICQob2Zmc2V0RWwpLm9mZnNldCgpXG4gIHtcbiAgICB0b3A6ICBlLnBhZ2VZIC0gb2Zmc2V0LnRvcCxcbiAgICBsZWZ0OiBlLnBhZ2VYIC0gb2Zmc2V0LmxlZnRcbiAgfVxuXG4jIENoZWNrcyB0byBzZWUgaWYgYW4gZXZlbnQgcGFyYW1ldGVyIGlzIHByb3ZpZGVkIGFuZCBjb250YWlucyB0aGUgcHJldmVudFxuIyBkZWZhdWx0IG1ldGhvZC4gSWYgaXQgZG9lcyBpdCBjYWxscyBpdC5cbiNcbiMgVGhpcyBpcyB1c2VmdWwgZm9yIG1ldGhvZHMgdGhhdCBjYW4gYmUgb3B0aW9uYWxseSB1c2VkIGFzIGNhbGxiYWNrc1xuIyB3aGVyZSB0aGUgZXhpc3RhbmNlIG9mIHRoZSBwYXJhbWV0ZXIgbXVzdCBiZSBjaGVja2VkIGJlZm9yZSBjYWxsaW5nLlxuVXRpbC5wcmV2ZW50RXZlbnREZWZhdWx0ID0gKGV2ZW50KSAtPlxuICBldmVudD8ucHJldmVudERlZmF1bHQ/KClcblxuXG4jIEV4cG9ydCBVdGlsIG9iamVjdFxubW9kdWxlLmV4cG9ydHMgPSBVdGlsXG4iLCJVdGlsID0gcmVxdWlyZSAnLi91dGlsJ1xuV2lkZ2V0ID0gcmVxdWlyZSAnLi93aWRnZXQnXG5cblxuX3QgPSBVdGlsLlRyYW5zbGF0aW9uU3RyaW5nXG5cblxuIyBQdWJsaWM6IENyZWF0ZXMgYW4gZWxlbWVudCBmb3Igdmlld2luZyBhbm5vdGF0aW9ucy5cbmNsYXNzIFZpZXdlciBleHRlbmRzIFdpZGdldFxuXG4gICMgRXZlbnRzIHRvIGJlIGJvdW5kIHRvIHRoZSBAZWxlbWVudC5cbiAgZXZlbnRzOlxuICAgIFwiLmFubm90YXRvci1lZGl0IGNsaWNrXCI6ICAgXCJvbkVkaXRDbGlja1wiXG4gICAgXCIuYW5ub3RhdG9yLWRlbGV0ZSBjbGlja1wiOiBcIm9uRGVsZXRlQ2xpY2tcIlxuXG4gICMgQ2xhc3NlcyBmb3IgdG9nZ2xpbmcgYW5ub3RhdG9yIHN0YXRlLlxuICBjbGFzc2VzOlxuICAgIGhpZGU6ICdhbm5vdGF0b3ItaGlkZSdcbiAgICBzaG93Q29udHJvbHM6ICdhbm5vdGF0b3ItdmlzaWJsZSdcblxuICAjIEhUTUwgdGVtcGxhdGVzIGZvciBAZWxlbWVudCBhbmQgQGl0ZW0gcHJvcGVydGllcy5cbiAgaHRtbDpcbiAgICBlbGVtZW50OlwiXCJcIlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFubm90YXRvci1vdXRlciBhbm5vdGF0b3Itdmlld2VyXCI+XG4gICAgICAgICAgICAgIDx1bCBjbGFzcz1cImFubm90YXRvci13aWRnZXQgYW5ub3RhdG9yLWxpc3RpbmdcIj48L3VsPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBcIlwiXCJcbiAgICBpdGVtOiAgIFwiXCJcIlxuICAgICAgICAgICAgPGxpIGNsYXNzPVwiYW5ub3RhdG9yLWFubm90YXRpb24gYW5ub3RhdG9yLWl0ZW1cIj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJhbm5vdGF0b3ItY29udHJvbHNcIj5cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIHRpdGxlPVwiVmlldyBhcyB3ZWJwYWdlXCIgY2xhc3M9XCJhbm5vdGF0b3ItbGlua1wiPlZpZXcgYXMgd2VicGFnZTwvYT5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIkVkaXRcIiBjbGFzcz1cImFubm90YXRvci1lZGl0XCI+RWRpdDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiRGVsZXRlXCIgY2xhc3M9XCJhbm5vdGF0b3ItZGVsZXRlXCI+RGVsZXRlPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICBcIlwiXCJcblxuICAjIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICBvcHRpb25zOlxuICAgIHJlYWRPbmx5OiBmYWxzZSAjIFN0YXJ0IHRoZSB2aWV3ZXIgaW4gcmVhZC1vbmx5IG1vZGUuIE5vIGNvbnRyb2xzIHdpbGwgYmUgc2hvd24uXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgdGhlIFZpZXdlciBvYmplY3QuIFRoaXMgd2lsbCBjcmVhdGUgdGhlXG4gICMgQGVsZW1lbnQgZnJvbSB0aGUgQGh0bWwuZWxlbWVudCBzdHJpbmcgYW5kIHNldCB1cCBhbGwgZXZlbnRzLlxuICAjXG4gICMgb3B0aW9ucyAtIEFuIE9iamVjdCBsaXRlcmFsIGNvbnRhaW5pbmcgb3B0aW9ucy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgQ3JlYXRlcyBhIG5ldyB2aWV3ZXIsIGFkZHMgYSBjdXN0b20gZmllbGQgYW5kIGRpc3BsYXlzIGFuIGFubm90YXRpb24uXG4gICMgICB2aWV3ZXIgPSBuZXcgQW5ub3RhdG9yLlZpZXdlcigpXG4gICMgICB2aWV3ZXIuYWRkRmllbGQoe1xuICAjICAgICBsb2FkOiBzb21lTG9hZENhbGxiYWNrXG4gICMgICB9KVxuICAjICAgdmlld2VyLmxvYWQoYW5ub3RhdGlvbilcbiAgI1xuICAjIFJldHVybnMgYSBuZXcgVmlld2VyIGluc3RhbmNlLlxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XG4gICAgc3VwZXIgJChAaHRtbC5lbGVtZW50KVswXSwgb3B0aW9uc1xuXG4gICAgQGl0ZW0gICA9ICQoQGh0bWwuaXRlbSlbMF1cbiAgICBAZmllbGRzID0gW11cbiAgICBAYW5ub3RhdGlvbnMgPSBbXVxuXG4gICMgUHVibGljOiBEaXNwbGF5cyB0aGUgVmlld2VyIGFuZCBmaXJzdCB0aGUgXCJzaG93XCIgZXZlbnQuIENhbiBiZSB1c2VkIGFzIGFuXG4gICMgZXZlbnQgY2FsbGJhY2sgYW5kIHdpbGwgY2FsbCBFdmVudCNwcmV2ZW50RGVmYXVsdCgpIG9uIHRoZSBzdXBwbGllZCBldmVudC5cbiAgI1xuICAjIGV2ZW50IC0gRXZlbnQgb2JqZWN0IHByb3ZpZGVkIGlmIG1ldGhvZCBpcyBjYWxsZWQgYnkgZXZlbnRcbiAgIyAgICAgICAgIGxpc3RlbmVyIChkZWZhdWx0OnVuZGVmaW5lZClcbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgRGlzcGxheXMgdGhlIGVkaXRvci5cbiAgIyAgIHZpZXdlci5zaG93KClcbiAgI1xuICAjICAgIyBEaXNwbGF5cyB0aGUgdmlld2VyIG9uIGNsaWNrIChwcmV2ZW50cyBkZWZhdWx0IGFjdGlvbikuXG4gICMgICAkKCdhLnNob3ctdmlld2VyJykuYmluZCgnY2xpY2snLCB2aWV3ZXIuc2hvdylcbiAgI1xuICAjIFJldHVybnMgaXRzZWxmLlxuICBzaG93OiAoZXZlbnQpID0+XG4gICAgVXRpbC5wcmV2ZW50RXZlbnREZWZhdWx0IGV2ZW50XG5cbiAgICBjb250cm9scyA9IEBlbGVtZW50XG4gICAgICAuZmluZCgnLmFubm90YXRvci1jb250cm9scycpXG4gICAgICAuYWRkQ2xhc3MoQGNsYXNzZXMuc2hvd0NvbnRyb2xzKVxuICAgIHNldFRpbWVvdXQoKD0+IGNvbnRyb2xzLnJlbW92ZUNsYXNzKEBjbGFzc2VzLnNob3dDb250cm9scykpLCA1MDApXG5cbiAgICBAZWxlbWVudC5yZW1vdmVDbGFzcyhAY2xhc3Nlcy5oaWRlKVxuICAgIHRoaXMuY2hlY2tPcmllbnRhdGlvbigpLnB1Ymxpc2goJ3Nob3cnKVxuXG4gICMgUHVibGljOiBDaGVja3MgdG8gc2VlIGlmIHRoZSBWaWV3ZXIgaXMgY3VycmVudGx5IGRpc3BsYXllZC5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHZpZXdlci5zaG93KClcbiAgIyAgIHZpZXdlci5pc1Nob3duKCkgIyA9PiBSZXR1cm5zIHRydWVcbiAgI1xuICAjICAgdmlld2VyLmhpZGUoKVxuICAjICAgdmlld2VyLmlzU2hvd24oKSAjID0+IFJldHVybnMgZmFsc2VcbiAgI1xuICAjIFJldHVybnMgdHJ1ZSBpZiB0aGUgVmlld2VyIGlzIHZpc2libGUuXG4gIGlzU2hvd246IC0+XG4gICAgbm90IEBlbGVtZW50Lmhhc0NsYXNzKEBjbGFzc2VzLmhpZGUpXG5cbiAgIyBQdWJsaWM6IEhpZGVzIHRoZSBFZGl0b3IgYW5kIGZpcmVzIHRoZSBcImhpZGVcIiBldmVudC4gQ2FuIGJlIHVzZWQgYXMgYW4gZXZlbnRcbiAgIyBjYWxsYmFjayBhbmQgd2lsbCBjYWxsIEV2ZW50I3ByZXZlbnREZWZhdWx0KCkgb24gdGhlIHN1cHBsaWVkIGV2ZW50LlxuICAjXG4gICMgZXZlbnQgLSBFdmVudCBvYmplY3QgcHJvdmlkZWQgaWYgbWV0aG9kIGlzIGNhbGxlZCBieSBldmVudFxuICAjICAgICAgICAgbGlzdGVuZXIgKGRlZmF1bHQ6dW5kZWZpbmVkKVxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgIyBIaWRlcyB0aGUgZWRpdG9yLlxuICAjICAgdmlld2VyLmhpZGUoKVxuICAjXG4gICMgICAjIEhpZGUgdGhlIHZpZXdlciBvbiBjbGljayAocHJldmVudHMgZGVmYXVsdCBhY3Rpb24pLlxuICAjICAgJCgnYS5oaWRlLXZpZXdlcicpLmJpbmQoJ2NsaWNrJywgdmlld2VyLmhpZGUpXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZi5cbiAgaGlkZTogKGV2ZW50KSA9PlxuICAgIFV0aWwucHJldmVudEV2ZW50RGVmYXVsdCBldmVudFxuXG4gICAgQGVsZW1lbnQuYWRkQ2xhc3MoQGNsYXNzZXMuaGlkZSlcbiAgICB0aGlzLnB1Ymxpc2goJ2hpZGUnKVxuXG4gICMgUHVibGljOiBMb2FkcyBhbm5vdGF0aW9ucyBpbnRvIHRoZSB2aWV3ZXIgYW5kIHNob3dzIGl0LiBGaXJlcyB0aGUgXCJsb2FkXCJcbiAgIyBldmVudCBvbmNlIHRoZSB2aWV3ZXIgaXMgbG9hZGVkIHBhc3NpbmcgdGhlIGFubm90YXRpb25zIGludG8gdGhlIGNhbGxiYWNrLlxuICAjXG4gICMgYW5ub3RhdGlvbiAtIEFuIEFycmF5IG9mIGFubm90YXRpb24gZWxlbWVudHMuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICB2aWV3ZXIubG9hZChbYW5ub3RhdGlvbjEsIGFubm90YXRpb24yLCBhbm5vdGF0aW9uM10pXG4gICNcbiAgIyBSZXR1cm5zIGl0c2xlZi5cbiAgbG9hZDogKGFubm90YXRpb25zKSA9PlxuICAgIEBhbm5vdGF0aW9ucyA9IGFubm90YXRpb25zIHx8IFtdXG5cbiAgICBsaXN0ID0gQGVsZW1lbnQuZmluZCgndWw6Zmlyc3QnKS5lbXB0eSgpXG4gICAgZm9yIGFubm90YXRpb24gaW4gQGFubm90YXRpb25zXG4gICAgICBpdGVtID0gJChAaXRlbSkuY2xvbmUoKS5hcHBlbmRUbyhsaXN0KS5kYXRhKCdhbm5vdGF0aW9uJywgYW5ub3RhdGlvbilcbiAgICAgIGNvbnRyb2xzID0gaXRlbS5maW5kKCcuYW5ub3RhdG9yLWNvbnRyb2xzJylcblxuICAgICAgbGluayA9IGNvbnRyb2xzLmZpbmQoJy5hbm5vdGF0b3ItbGluaycpXG4gICAgICBlZGl0ID0gY29udHJvbHMuZmluZCgnLmFubm90YXRvci1lZGl0JylcbiAgICAgIGRlbCAgPSBjb250cm9scy5maW5kKCcuYW5ub3RhdG9yLWRlbGV0ZScpXG5cbiAgICAgIGxpbmtzID0gbmV3IExpbmtQYXJzZXIoYW5ub3RhdGlvbi5saW5rcyBvciBbXSkuZ2V0KCdhbHRlcm5hdGUnLCB7J3R5cGUnOiAndGV4dC9odG1sJ30pXG4gICAgICBpZiBsaW5rcy5sZW5ndGggaXMgMCBvciBub3QgbGlua3NbMF0uaHJlZj9cbiAgICAgICAgbGluay5yZW1vdmUoKVxuICAgICAgZWxzZVxuICAgICAgICBsaW5rLmF0dHIoJ2hyZWYnLCBsaW5rc1swXS5ocmVmKVxuXG4gICAgICBpZiBAb3B0aW9ucy5yZWFkT25seVxuICAgICAgICBlZGl0LnJlbW92ZSgpXG4gICAgICAgIGRlbC5yZW1vdmUoKVxuICAgICAgZWxzZVxuICAgICAgICBjb250cm9sbGVyID0ge1xuICAgICAgICAgIHNob3dFZGl0OiAtPiBlZGl0LnJlbW92ZUF0dHIoJ2Rpc2FibGVkJylcbiAgICAgICAgICBoaWRlRWRpdDogLT4gZWRpdC5hdHRyKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpXG4gICAgICAgICAgc2hvd0RlbGV0ZTogLT4gZGVsLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJylcbiAgICAgICAgICBoaWRlRGVsZXRlOiAtPiBkZWwuYXR0cignZGlzYWJsZWQnLCAnZGlzYWJsZWQnKVxuICAgICAgICB9XG5cbiAgICAgIGZvciBmaWVsZCBpbiBAZmllbGRzXG4gICAgICAgIGVsZW1lbnQgPSAkKGZpZWxkLmVsZW1lbnQpLmNsb25lKCkuYXBwZW5kVG8oaXRlbSlbMF1cbiAgICAgICAgZmllbGQubG9hZChlbGVtZW50LCBhbm5vdGF0aW9uLCBjb250cm9sbGVyKVxuXG4gICAgdGhpcy5wdWJsaXNoKCdsb2FkJywgW0Bhbm5vdGF0aW9uc10pXG5cbiAgICB0aGlzLnNob3coKVxuXG4gICMgUHVibGljOiBBZGRzIGFuIGFkZGlvbmFsIGZpZWxkIHRvIGFuIGFubm90YXRpb24gdmlldy4gQSBjYWxsYmFjayBjYW4gYmVcbiAgIyBwcm92aWRlZCB0byB1cGRhdGUgdGhlIHZpZXcgb24gbG9hZC5cbiAgI1xuICAjIG9wdGlvbnMgLSBBbiBvcHRpb25zIE9iamVjdC4gT3B0aW9ucyBhcmUgYXMgZm9sbG93czpcbiAgIyAgICAgICAgICAgbG9hZCAtIENhbGxiYWNrIEZ1bmN0aW9uIGNhbGxlZCB3aGVuIHRoZSB2aWV3IGlzIGxvYWRlZCB3aXRoIGFuXG4gICMgICAgICAgICAgICAgICAgICBhbm5vdGF0aW9uLiBSZWNpZXZlcyBhIG5ld2x5IGNyZWF0ZWQgY2xvbmUgb2YgQGl0ZW0gYW5kXG4gICMgICAgICAgICAgICAgICAgICB0aGUgYW5ub3RhdGlvbiB0byBiZSBkaXNwbGF5ZWQgKGl0IHdpbGwgYmUgY2FsbGVkIG9uY2VcbiAgIyAgICAgICAgICAgICAgICAgIGZvciBlYWNoIGFubm90YXRpb24gYmVpbmcgbG9hZGVkKS5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgICMgRGlzcGxheSBhIHVzZXIgbmFtZS5cbiAgIyAgIHZpZXdlci5hZGRGaWVsZCh7XG4gICMgICAgICMgVGhpcyBpcyBjYWxsZWQgd2hlbiB0aGUgdmlld2VyIGlzIGxvYWRlZC5cbiAgIyAgICAgbG9hZDogKGZpZWxkLCBhbm5vdGF0aW9uKSAtPlxuICAjICAgICAgIGZpZWxkID0gJChmaWVsZClcbiAgI1xuICAjICAgICAgIGlmIGFubm90YXRpb24udXNlclxuICAjICAgICAgICAgZmllbGQudGV4dChhbm5vdGF0aW9uLnVzZXIpICMgRGlzcGxheSB0aGUgdXNlclxuICAjICAgICAgIGVsc2VcbiAgIyAgICAgICAgIGZpZWxkLnJlbW92ZSgpICAgICAgICAgICAgICAjIERvIG5vdCBkaXNwbGF5IHRoZSBmaWVsZC5cbiAgIyAgIH0pXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZi5cbiAgYWRkRmllbGQ6IChvcHRpb25zKSAtPlxuICAgIGZpZWxkID0gJC5leHRlbmQoe1xuICAgICAgbG9hZDogLT5cbiAgICB9LCBvcHRpb25zKVxuXG4gICAgZmllbGQuZWxlbWVudCA9ICQoJzxkaXYgLz4nKVswXVxuICAgIEBmaWVsZHMucHVzaCBmaWVsZFxuICAgIGZpZWxkLmVsZW1lbnRcbiAgICB0aGlzXG5cbiAgIyBDYWxsYmFjayBmdW5jdGlvbjogY2FsbGVkIHdoZW4gdGhlIGVkaXQgYnV0dG9uIGlzIGNsaWNrZWQuXG4gICNcbiAgIyBldmVudCAtIEFuIEV2ZW50IG9iamVjdC5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgb25FZGl0Q2xpY2s6IChldmVudCkgPT5cbiAgICB0aGlzLm9uQnV0dG9uQ2xpY2soZXZlbnQsICdlZGl0JylcblxuICAjIENhbGxiYWNrIGZ1bmN0aW9uOiBjYWxsZWQgd2hlbiB0aGUgZGVsZXRlIGJ1dHRvbiBpcyBjbGlja2VkLlxuICAjXG4gICMgZXZlbnQgLSBBbiBFdmVudCBvYmplY3QuXG4gICNcbiAgIyBSZXR1cm5zIG5vdGhpbmcuXG4gIG9uRGVsZXRlQ2xpY2s6IChldmVudCkgPT5cbiAgICB0aGlzLm9uQnV0dG9uQ2xpY2soZXZlbnQsICdkZWxldGUnKVxuXG4gICMgRmlyZXMgYW4gZXZlbnQgb2YgdHlwZSBhbmQgcGFzc2VzIGluIHRoZSBhc3NvY2lhdGVkIGFubm90YXRpb24uXG4gICNcbiAgIyBldmVudCAtIEFuIEV2ZW50IG9iamVjdC5cbiAgIyB0eXBlICAtIFRoZSB0eXBlIG9mIGV2ZW50IHRvIGZpcmUuIEVpdGhlciBcImVkaXRcIiBvciBcImRlbGV0ZVwiLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBvbkJ1dHRvbkNsaWNrOiAoZXZlbnQsIHR5cGUpIC0+XG4gICAgaXRlbSA9ICQoZXZlbnQudGFyZ2V0KS5wYXJlbnRzKCcuYW5ub3RhdG9yLWFubm90YXRpb24nKVxuXG4gICAgdGhpcy5wdWJsaXNoKHR5cGUsIFtpdGVtLmRhdGEoJ2Fubm90YXRpb24nKV0pXG5cbiMgUHJpdmF0ZTogc2ltcGxlIHBhcnNlciBmb3IgaHlwZXJtZWRpYSBsaW5rIHN0cnVjdHVyZVxuI1xuIyBFeGFtcGxlczpcbiNcbiMgICBsaW5rcyA9IFtcbiMgICAgIHsgcmVsOiAnYWx0ZXJuYXRlJywgaHJlZjogJ2h0dHA6Ly9leGFtcGxlLmNvbS9wYWdlcy8xNC5qc29uJywgdHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4jICAgICB7IHJlbDogJ3ByZXYnOiBocmVmOiAnaHR0cDovL2V4YW1wbGUuY29tL3BhZ2VzLzEzJyB9XG4jICAgXVxuI1xuIyAgIGxwID0gTGlua1BhcnNlcihsaW5rcylcbiMgICBscC5nZXQoJ2FsdGVybmF0ZScpICAgICAgICAgICAgICAgICAgICAgICMgPT4gWyB7IHJlbDogJ2FsdGVybmF0ZScsIGhyZWY6ICdodHRwOi8vLi4uJywgLi4uIH0gXVxuIyAgIGxwLmdldCgnYWx0ZXJuYXRlJywge3R5cGU6ICd0ZXh0L2h0bWwnfSkgIyA9PiBbXVxuI1xuY2xhc3MgTGlua1BhcnNlclxuICBjb25zdHJ1Y3RvcjogKEBkYXRhKSAtPlxuXG4gIGdldDogKHJlbCwgY29uZD17fSkgLT5cbiAgICBjb25kID0gJC5leHRlbmQoe30sIGNvbmQsIHtyZWw6IHJlbH0pXG4gICAga2V5cyA9IChrIGZvciBvd24gaywgdiBvZiBjb25kKVxuICAgIGZvciBkIGluIEBkYXRhXG4gICAgICBtYXRjaCA9IGtleXMucmVkdWNlICgobSwgaykgLT4gbSBhbmQgKGRba10gaXMgY29uZFtrXSkpLCB0cnVlXG4gICAgICBpZiBtYXRjaFxuICAgICAgICBkXG4gICAgICBlbHNlXG4gICAgICAgIGNvbnRpbnVlXG5cblxuIyBFeHBvcnQgdGhlIFZpZXdlciBvYmplY3Rcbm1vZHVsZS5leHBvcnRzID0gVmlld2VyXG4iLCJEZWxlZ2F0b3IgPSByZXF1aXJlICcuL2NsYXNzJ1xuVXRpbCA9IHJlcXVpcmUgJy4vdXRpbCdcblxuXG4jIFB1YmxpYzogQmFzZSBjbGFzcyBmb3IgdGhlIEVkaXRvciBhbmQgVmlld2VyIGVsZW1lbnRzLiBDb250YWlucyBtZXRob2RzIHRoYXRcbiMgYXJlIHNoYXJlZCBiZXR3ZWVuIHRoZSB0d28uXG5jbGFzcyBXaWRnZXQgZXh0ZW5kcyBEZWxlZ2F0b3JcbiAgIyBDbGFzc2VzIHVzZWQgdG8gYWx0ZXIgdGhlIHdpZGdldHMgc3RhdGUuXG4gIGNsYXNzZXM6XG4gICAgaGlkZTogJ2Fubm90YXRvci1oaWRlJ1xuICAgIGludmVydDpcbiAgICAgIHg6ICdhbm5vdGF0b3ItaW52ZXJ0LXgnXG4gICAgICB5OiAnYW5ub3RhdG9yLWludmVydC15J1xuXG4gICMgUHVibGljOiBDcmVhdGVzIGEgbmV3IFdpZGdldCBpbnN0YW5jZS5cbiAgI1xuICAjIGVsZW1lbnQgLSBUaGUgRWxlbWVudCB0aGF0IHJlcHJlc2VudHMgdGhlIHdpZGdldCBpbiB0aGUgRE9NLlxuICAjIG9wdGlvbnMgLSBBbiBPYmplY3QgbGl0ZXJhbCBvZiBvcHRpb25zLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICMgICB3aWRnZXQgID0gbmV3IEFubm90YXRvci5XaWRnZXQoZWxlbWVudClcbiAgI1xuICAjIFJldHVybnMgYSBuZXcgV2lkZ2V0IGluc3RhbmNlLlxuICBjb25zdHJ1Y3RvcjogKGVsZW1lbnQsIG9wdGlvbnMpIC0+XG4gICAgc3VwZXJcbiAgICBAY2xhc3NlcyA9ICQuZXh0ZW5kIHt9LCBXaWRnZXQucHJvdG90eXBlLmNsYXNzZXMsIEBjbGFzc2VzXG5cbiAgIyBQdWJsaWM6IFVuYmluZCB0aGUgd2lkZ2V0J3MgZXZlbnRzIGFuZCByZW1vdmUgaXRzIGVsZW1lbnQgZnJvbSB0aGUgRE9NLlxuICAjXG4gICMgUmV0dXJucyBub3RoaW5nLlxuICBkZXN0cm95OiAtPlxuICAgIHRoaXMucmVtb3ZlRXZlbnRzKClcbiAgICBAZWxlbWVudC5yZW1vdmUoKVxuXG4gIGNoZWNrT3JpZW50YXRpb246IC0+XG4gICAgdGhpcy5yZXNldE9yaWVudGF0aW9uKClcblxuICAgIHdpbmRvdyAgID0gJChVdGlsLmdldEdsb2JhbCgpKVxuICAgIHdpZGdldCAgID0gQGVsZW1lbnQuY2hpbGRyZW4oXCI6Zmlyc3RcIilcbiAgICBvZmZzZXQgICA9IHdpZGdldC5vZmZzZXQoKVxuICAgIHZpZXdwb3J0ID0ge1xuICAgICAgdG9wOiAgIHdpbmRvdy5zY3JvbGxUb3AoKSxcbiAgICAgIHJpZ2h0OiB3aW5kb3cud2lkdGgoKSArIHdpbmRvdy5zY3JvbGxMZWZ0KClcbiAgICB9XG4gICAgY3VycmVudCA9IHtcbiAgICAgIHRvcDogICBvZmZzZXQudG9wXG4gICAgICByaWdodDogb2Zmc2V0LmxlZnQgKyB3aWRnZXQud2lkdGgoKVxuICAgIH1cblxuICAgIGlmIChjdXJyZW50LnRvcCAtIHZpZXdwb3J0LnRvcCkgPCAwXG4gICAgICB0aGlzLmludmVydFkoKVxuXG4gICAgaWYgKGN1cnJlbnQucmlnaHQgLSB2aWV3cG9ydC5yaWdodCkgPiAwXG4gICAgICB0aGlzLmludmVydFgoKVxuXG4gICAgdGhpc1xuXG4gICMgUHVibGljOiBSZXNldHMgb3JpZW50YXRpb24gb2Ygd2lkZ2V0IG9uIHRoZSBYICYgWSBheGlzLlxuICAjXG4gICMgRXhhbXBsZXNcbiAgI1xuICAjICAgd2lkZ2V0LnJlc2V0T3JpZW50YXRpb24oKSAjIFdpZGdldCBpcyBvcmlnaW5hbCB3YXkgdXAuXG4gICNcbiAgIyBSZXR1cm5zIGl0c2VsZiBmb3IgY2hhaW5pbmcuXG4gIHJlc2V0T3JpZW50YXRpb246IC0+XG4gICAgQGVsZW1lbnQucmVtb3ZlQ2xhc3MoQGNsYXNzZXMuaW52ZXJ0LngpLnJlbW92ZUNsYXNzKEBjbGFzc2VzLmludmVydC55KVxuICAgIHRoaXNcblxuICAjIFB1YmxpYzogSW52ZXJ0cyB0aGUgd2lkZ2V0IG9uIHRoZSBYIGF4aXMuXG4gICNcbiAgIyBFeGFtcGxlc1xuICAjXG4gICMgICB3aWRnZXQuaW52ZXJ0WCgpICMgV2lkZ2V0IGlzIG5vdyByaWdodCBhbGlnbmVkLlxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgZm9yIGNoYWluaW5nLlxuICBpbnZlcnRYOiAtPlxuICAgIEBlbGVtZW50LmFkZENsYXNzIEBjbGFzc2VzLmludmVydC54XG4gICAgdGhpc1xuXG4gICMgUHVibGljOiBJbnZlcnRzIHRoZSB3aWRnZXQgb24gdGhlIFkgYXhpcy5cbiAgI1xuICAjIEV4YW1wbGVzXG4gICNcbiAgIyAgIHdpZGdldC5pbnZlcnRZKCkgIyBXaWRnZXQgaXMgbm93IHVwc2lkZSBkb3duLlxuICAjXG4gICMgUmV0dXJucyBpdHNlbGYgZm9yIGNoYWluaW5nLlxuICBpbnZlcnRZOiAtPlxuICAgIEBlbGVtZW50LmFkZENsYXNzIEBjbGFzc2VzLmludmVydC55XG4gICAgdGhpc1xuXG4gICMgUHVibGljOiBGaW5kIG91dCB3aGV0aGVyIG9yIG5vdCB0aGUgd2lkZ2V0IGlzIGN1cnJlbnRseSB1cHNpZGUgZG93blxuICAjXG4gICMgUmV0dXJucyBhIGJvb2xlYW46IHRydWUgaWYgdGhlIHdpZGdldCBpcyB1cHNpZGUgZG93blxuICBpc0ludmVydGVkWTogLT5cbiAgICBAZWxlbWVudC5oYXNDbGFzcyBAY2xhc3Nlcy5pbnZlcnQueVxuXG4gICMgUHVibGljOiBGaW5kIG91dCB3aGV0aGVyIG9yIG5vdCB0aGUgd2lkZ2V0IGlzIGN1cnJlbnRseSByaWdodCBhbGlnbmVkXG4gICNcbiAgIyBSZXR1cm5zIGEgYm9vbGVhbjogdHJ1ZSBpZiB0aGUgd2lkZ2V0IGlzIHJpZ2h0IGFsaWduZWRcbiAgaXNJbnZlcnRlZFg6IC0+XG4gICAgQGVsZW1lbnQuaGFzQ2xhc3MgQGNsYXNzZXMuaW52ZXJ0LnhcblxuXG4jIEV4cG9ydCB0aGUgV2lkZ2V0IG9iamVjdFxubW9kdWxlLmV4cG9ydHMgPSBXaWRnZXRcbiIsIiMgQSBzaW1wbGUgWFBhdGggZXZhbHVhdG9yIHVzaW5nIGpRdWVyeSB3aGljaCBjYW4gZXZhbHVhdGUgcXVlcmllcyBvZlxuc2ltcGxlWFBhdGhKUXVlcnkgPSAocmVsYXRpdmVSb290KSAtPlxuICBqcSA9IHRoaXMubWFwIC0+XG4gICAgcGF0aCA9ICcnXG4gICAgZWxlbSA9IHRoaXNcblxuICAgIHdoaWxlIGVsZW0/Lm5vZGVUeXBlID09IE5vZGUuRUxFTUVOVF9OT0RFIGFuZCBlbGVtIGlzbnQgcmVsYXRpdmVSb290XG4gICAgICB0YWdOYW1lID0gZWxlbS50YWdOYW1lLnJlcGxhY2UoXCI6XCIsIFwiXFxcXDpcIilcbiAgICAgIGlkeCA9ICQoZWxlbS5wYXJlbnROb2RlKS5jaGlsZHJlbih0YWdOYW1lKS5pbmRleChlbGVtKSArIDFcblxuICAgICAgaWR4ICA9IFwiWyN7aWR4fV1cIlxuICAgICAgcGF0aCA9IFwiL1wiICsgZWxlbS50YWdOYW1lLnRvTG93ZXJDYXNlKCkgKyBpZHggKyBwYXRoXG4gICAgICBlbGVtID0gZWxlbS5wYXJlbnROb2RlXG5cbiAgICBwYXRoXG5cbiAganEuZ2V0KClcblxuIyBBIHNpbXBsZSBYUGF0aCBldmFsdWF0b3IgdXNpbmcgb25seSBzdGFuZGFyZCBET00gbWV0aG9kcyB3aGljaCBjYW5cbiMgZXZhbHVhdGUgcXVlcmllcyBvZiB0aGUgZm9ybSAvdGFnW2luZGV4XS90YWdbaW5kZXhdLlxuc2ltcGxlWFBhdGhQdXJlID0gKHJlbGF0aXZlUm9vdCkgLT5cblxuICBnZXRQYXRoU2VnbWVudCA9IChub2RlKSAtPlxuICAgIG5hbWUgPSBnZXROb2RlTmFtZSBub2RlXG4gICAgcG9zID0gZ2V0Tm9kZVBvc2l0aW9uIG5vZGVcbiAgICBcIiN7bmFtZX1bI3twb3N9XVwiXG5cbiAgcm9vdE5vZGUgPSByZWxhdGl2ZVJvb3RcblxuICBnZXRQYXRoVG8gPSAobm9kZSkgLT5cbiAgICB4cGF0aCA9ICcnO1xuICAgIHdoaWxlIG5vZGUgIT0gcm9vdE5vZGVcbiAgICAgIHVubGVzcyBub2RlP1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJDYWxsZWQgZ2V0UGF0aFRvIG9uIGEgbm9kZSB3aGljaCB3YXMgbm90IGEgZGVzY2VuZGFudCBvZiBAcm9vdE5vZGUuIFwiICsgcm9vdE5vZGVcbiAgICAgIHhwYXRoID0gKGdldFBhdGhTZWdtZW50IG5vZGUpICsgJy8nICsgeHBhdGhcbiAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGVcbiAgICB4cGF0aCA9ICcvJyArIHhwYXRoXG4gICAgeHBhdGggPSB4cGF0aC5yZXBsYWNlIC9cXC8kLywgJydcbiAgICB4cGF0aFxuXG4gIGpxID0gdGhpcy5tYXAgLT5cbiAgICBwYXRoID0gZ2V0UGF0aFRvIHRoaXNcblxuICAgIHBhdGhcblxuICBqcS5nZXQoKVxuXG5maW5kQ2hpbGQgPSAobm9kZSwgdHlwZSwgaW5kZXgpIC0+XG4gIHVubGVzcyBub2RlLmhhc0NoaWxkTm9kZXMoKVxuICAgIHRocm93IG5ldyBFcnJvciBcIlhQYXRoIGVycm9yOiBub2RlIGhhcyBubyBjaGlsZHJlbiFcIlxuICBjaGlsZHJlbiA9IG5vZGUuY2hpbGROb2Rlc1xuICBmb3VuZCA9IDBcbiAgZm9yIGNoaWxkIGluIGNoaWxkcmVuXG4gICAgbmFtZSA9IGdldE5vZGVOYW1lIGNoaWxkXG4gICAgaWYgbmFtZSBpcyB0eXBlXG4gICAgICBmb3VuZCArPSAxXG4gICAgICBpZiBmb3VuZCBpcyBpbmRleFxuICAgICAgICByZXR1cm4gY2hpbGRcbiAgdGhyb3cgbmV3IEVycm9yIFwiWFBhdGggZXJyb3I6IHdhbnRlZCBjaGlsZCBub3QgZm91bmQuXCJcblxuIyBHZXQgdGhlIG5vZGUgbmFtZSBmb3IgdXNlIGluIGdlbmVyYXRpbmcgYW4geHBhdGggZXhwcmVzc2lvbi5cbmdldE5vZGVOYW1lID0gKG5vZGUpIC0+XG4gICAgbm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKClcbiAgICBzd2l0Y2ggbm9kZU5hbWVcbiAgICAgIHdoZW4gXCIjdGV4dFwiIHRoZW4gcmV0dXJuIFwidGV4dCgpXCJcbiAgICAgIHdoZW4gXCIjY29tbWVudFwiIHRoZW4gcmV0dXJuIFwiY29tbWVudCgpXCJcbiAgICAgIHdoZW4gXCIjY2RhdGEtc2VjdGlvblwiIHRoZW4gcmV0dXJuIFwiY2RhdGEtc2VjdGlvbigpXCJcbiAgICAgIGVsc2UgcmV0dXJuIG5vZGVOYW1lXG5cbiMgR2V0IHRoZSBpbmRleCBvZiB0aGUgbm9kZSBhcyBpdCBhcHBlYXJzIGluIGl0cyBwYXJlbnQncyBjaGlsZCBsaXN0XG5nZXROb2RlUG9zaXRpb24gPSAobm9kZSkgLT5cbiAgcG9zID0gMFxuICB0bXAgPSBub2RlXG4gIHdoaWxlIHRtcFxuICAgIGlmIHRtcC5ub2RlTmFtZSBpcyBub2RlLm5vZGVOYW1lXG4gICAgICBwb3MrK1xuICAgIHRtcCA9IHRtcC5wcmV2aW91c1NpYmxpbmdcbiAgcG9zXG5cblxubW9kdWxlLmV4cG9ydHMgPVxuICBzaW1wbGVYUGF0aEpRdWVyeTogc2ltcGxlWFBhdGhKUXVlcnlcbiAgc2ltcGxlWFBhdGhQdXJlOiBzaW1wbGVYUGF0aFB1cmVcbiAgZmluZENoaWxkOiBmaW5kQ2hpbGRcbiJdfQ==