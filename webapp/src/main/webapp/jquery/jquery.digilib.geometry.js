/*
 * #%L
 * required digilib geometry plugin
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
/** required digilib geometry plugin
 */

(function($) {
//var dlGeometry = function() {
    /*
     * Size class
     */
    var size = function(w, h) {
        var that;
        if (typeof w === "object") {
            // assume an object having width and height
            that = {
                width : w.width,
                height : w.height
            };
        } else {
            that = {
                width : parseFloat(w),
                height : parseFloat(h)
            };
        }
        // returns true if both sizes are equal
        that.equals = function(other) {
            return (this.width === other.width && this.height === other.height);
        };
        // returns the aspect ratio of this size
        that.getAspect = function() {
            return (this.width / this.height);
        };
        // returns a size of a given aspect ratio that fits into this one 
        that.fitAspect = function(aspect) {
            var s = size(this);
            if (aspect > this.getAspect()) {
                // size is more horizontally stretched than this
                s.height = s.width / aspect;
            } else {
                s.width = s.height * aspect;
            }
            return s;
        };
        // adjusts size of jQuery element "$elem" to this size
        that.adjustDiv = function($elem) {
            $elem.width(this.width).height(this.height);
        };
        that.toString = function() {
            return (this.width + "x" + this.height);
        };
        return that;
    };

    /*
     * Position class
     */
    var position = function(x, y) {
        var that;
        if (typeof x === "object") {
            if (x instanceof jQuery) {
                // jQuery object
                var pos = x.offset();
                that = {
                    x : pos.left,
                    y : pos.top
                };
            } else if ($.isArray(x)) {
                that = {
                    x : x[0],
                    y : x[1]
                };
            } else {
                if (x.x != null) {
                    // position object
                    that = {
                        x : parseFloat(x.x),
                        y : parseFloat(x.y)
                    };
                }
                if (x.pageX != null) {
                    // event object
                    that = {
                        x : x.pageX,
                        y : x.pageY
                    };
                }
            }
        } else {
            that = {
                x : parseFloat(x),
                y : parseFloat(y)
            };
        };
        // returns a copy of this Rectangle
        that.copy = function() {
            return position(this);
        };
        // compare function
        that.equals = function(other) {
            return (this.x === other.x && this.y === other.y);
        };
        // add position other to this
        that.add = function(other) {
            if ($.isArray(other)) {
                this.x += other[0];
                this.y += other[1];
            } else {
                this.x += other.x;
                this.y += other.y;
            }
            return this;
        };
        // returns negative position
        that.neg = function() {
            return position({
                x : -this.x,
                y : -this.y
            });
        };
        // returns new position that is the difference between this and other
        that.delta = function(other) {
            return position({
                x : other.x - this.x,
                y : other.y - this.y
            });
        };
        // adjusts CSS position of $elem to this position
        that.adjustDiv = function($elem) {
            $elem.offset({
                left : this.x,
                top : this.y
            });
        };
        // adjust this position so that is is inside rect
        that.clipTo = function (rect) {
            var p1 = rect.getPt1();
            var p2 = rect.getPt2();
            this.x = Math.max(this.x, p1.x);
            this.y = Math.max(this.y, p1.y);
            this.x = Math.min(this.x, p2.x);
            this.y = Math.min(this.y, p2.y);
            return this;
        };
        // returns distance of this position to pos (length if pos == null)
        that.distance = function(pos) {
            if (pos == null) {
                pos = {
                    x : 0,
                    y : 0
                };
            }
            var dx = pos.x - this.x;
            var dy = pos.y - this.y;
            return Math.sqrt(dx * dx + dy * dy);
        };
        // midpoint of this and other pos
        that.mid = function (pos) {
            return position({
                x : (this.x + pos.x)/2,
                y : (this.y + pos.y)/2
            });
            return ;
            }
        // radians of angle between line and the positive X axis
        that.rad = function (pos) {
            return Math.atan2(pos.y - this.y, pos.x - this.x);
            }

        // degree of angle between line and the positive X axis
        that.deg = function (pos) {
            return this.rad(pos) / Math.PI * 180;
            }

        // returns position in css-compatible format
        that.getAsCss = function() {
            return {
                left : this.x,
                top : this.y
            };
        };
        // return as string
        that.toString = function() {
            return (this.x + "," + this.y);
        };
        // return as array
        that.toArray = function() {
            return [this.x, this.y];
        };
        return that;
    };

    /*
     * Line class (for on-screen geometry)
     */
    var line = function(p, q) {
        var that = { // definition point
            x: p.x,
            y: p.y
            };
        if (q.x != null) {
            that.dx = q.x - that.x;
            that.dy = q.y - that.y;
        } else if ($.isArray(q)) {
            that.dx = q[0]+0;
            that.dy = q[1]+0;
        } else if (q === 0) {
            that.dx = 0;
            that.dy = 1;
        } else if (q === Infinity) {
            that.dx = 1;
            that.dy = 0;
        } else if (q === -Infinity) {
            that.dx = -1;
            that.dy = 0;
        } else if (typeof q === 'number' && isFinite(q)) {
            that.dx = 1;
            that.dy = 1/q;
        } else {
            that.dx = 1;
            that.dy = 1;
        }
        // slope
        that.slope = function() {
            return this.dx/this.dy;
        };

        // return a copy
        that.copy = function() {
            return line(position(this.x, this.y), [this.dx, this.dy]);
        };
        // return a parallel through a point
        that.parallel = function(p) {
            return line(position(p.x, p.y), [this.dx, this.dy]);
        };
        // return perpendicular line, with optional directon
        that.perpendicular = function(clockwise) {
            var delta = clockwise ? [-this.dy, this.dx] : [this.dy, -this.dx];
            return line(position(this.x, this.y), delta)
        };
        // return a point (position) by adding a vector to the definition point
        that.add = function(q) {
            return $.isArray(q)
                ? position(this.x + q[0], this.y + q[1])
                : position(this.x + q.x, this.y + q.y);
        };
        // point on line, moved from origin by factor
        that.point = function(factor) {
            return position(this.x + factor*this.dx, this.y + factor*this.dy)
        };
        // intersection point with other line
        that.intersection = function(line) {
            var det = this.dy*line.dx - this.dx*line.dy
            if (det === 0) { // parallel
                return null; }
            var c = this.dx*(line.y - this. y) + this.dy*(this.x - line.x);
            return line.point(c/det);
        };
        return that;
    };

    /*
     * Rectangle class
     */
    var rectangle = function(x, y, w, h) {
        var that = {};
        if (typeof x === "object") {
            if (x instanceof jQuery) {
                // jQuery object
                var pos = x.offset();
                that = {
                    x : pos.left,
                    y : pos.top,
                    width : x.width(),
                    height : x.height()
                };
            } else if (y == null) {
                // assume x is rectangle
                that = {
                    x : parseFloat(x.x) || 0,
                    y : parseFloat(x.y) || 0,
                    width : parseFloat(x.width) || 0,
                    height : parseFloat(x.height) || 0
                };
            } else {
                // assume x and y are Position
                that = {
                    x : Math.min(x.x, y.x),
                    y : Math.min(x.y, y.y),
                    width : Math.abs(y.x - x.x),
                    height : Math.abs(y.y - x.y)
                };
            }
        } else {
            that = {
                x : parseFloat(x),
                y : parseFloat(y),
                width : parseFloat(w),
                height : parseFloat(h)
            };
        }
        // returns a copy of this Rectangle
        that.copy = function() {
            return rectangle(this);
        };
        // returns the position of this Rectangle
        that.getPosition = function() {
            return position(this);
        };
        // returns the size of this Rectangle
        that.getSize = function() {
            return size(this);
        };
        // returns the upper left corner position
        that.getPt1 = that.getPosition;
        // returns the lower right corner position of this Rectangle
        that.getPt2 = function() {
            return position({
                x : this.x + this.width,
                y : this.y + this.height
            });
        };
        // sets the upper left corner position to pos
        that.setPosition = function(pos) {
            this.x = pos.x;
            this.y = pos.y;
            return this;
        };
        // adds pos to the position
        that.setPt1 = that.setPosition; // TODO: not really the same
        that.addPosition = function(pos) {
            this.x += pos.x;
            this.y += pos.y;
            return this;
        };
        // adds pos to the dimensions
        that.enlarge = function(pos) {
            this.width += pos.x;
            this.height += pos.y;
            return this;
        };
        // sets the lower right corner to position pos
        that.setPt2 = function(pos) {
            this.width = pos.x - this.x;
            this.height = pos.y - this.y;
            return this;
        };
        // returns the center position of this Rectangle
        that.getCenter = function() {
            return position({
                x : this.x + this.width / 2,
                y : this.y + this.height / 2
            });
        };
        // moves this rectangle's center to position pos
        that.setCenter = function(pos) {
            this.x = pos.x - this.width / 2;
            this.y = pos.y - this.height / 2;
            return this;
        };
        // returns true if both rectangles have equal position and size
        that.equals = function(other) {
            var eq = (this.x === other.x && this.y === other.y && this.width === other.width);
            return eq;
        };
        // returns a rectangle with the difference width, height and position
        that.delta = function(other) {
            return rectangle(other.x - this.x, other.y - this.y, 
            		other.width - this.width, other.height - this.height);
        };
        // returns the area of this Rectangle
        that.getArea = function() {
            return (this.width * this.height);
        };
        // returns the aspect ratio of this Rectangle
        that.getAspect = function() {
            return (this.width / this.height);
        };
        // eliminates negative width and height
        that.normalize = function() {
            var p = this.getPt2();
            this.x = Math.min(this.x, p.x);
            this.y = Math.min(this.y, p.y);
            this.width = Math.abs(this.width);
            this.height = Math.abs(this.height);
            return this;
        };
        // returns if Position "pos" lies inside of this rectangle
        that.containsPosition = function(pos) {
            var ct = ((pos.x >= this.x) && (pos.y >= this.y)
                    && (pos.x <= this.x + this.width) && (pos.y <= this.y
                    + this.height));
            return ct;
        };
        // returns true if rectangle "rect" is contained in this rectangle
        that.containsRect = function(rect) {
            return (this.containsPosition(rect.getPt1()) && this
                    .containsPosition(rect.getPt2()));
        };
        // returns true if rectangle "rect" and this rectangle overlap
        that.overlapsRect = function(rect) {
            return this.intersect(rect) != null;
        };
        // returns the ratio of height to width
        that.getProportion = function() {
            return this.height/this.width;
        };
        // shrink/grow rectangle until it has the given proportion
        that.setProportion = function(ratio, canGrow) {
            var prop = this.getProportion();
            if (ratio < prop == canGrow) {
                this.width = this.height / ratio;
            } else {
                this.height = this.width * ratio;
            }
            return this;
        };
        // changes this rectangle's x/y values so it stays inside of rectangle
        // "rect", keeping the proportions
        that.stayInside = function(rect) {
            this.x = Math.max(this.x, rect.x);
            this.y = Math.max(this.y, rect.y);
            if (this.x + this.width > rect.x + rect.width) {
                this.x = rect.x + rect.width - this.width;
            }
            if (this.y + this.height > rect.y + rect.height) {
                this.y = rect.y + rect.height - this.height;
            }
            return this;
        };
        // clips this rectangle so it stays inside of rectangle "rect"
        that.clipTo = function(rect) {
            var p1 = rect.getPt1();
            var p2 = rect.getPt2();
            var this2 = this.getPt2();
            this.setPosition(position(Math.max(this.x, p1.x), Math.max(this.y, p1.y)));
            this.setPt2(position(Math.min(this2.x, p2.x), Math.min(this2.y, p2.y)));
            return this;
        };
        // returns the intersection of rectangle "rect" and this one
        that.intersect = function(rect) {
            var r = rect.copy();
            var result = r.clipTo(this);
            if (result.width < 0 || result.height < 0) result = null;
            return result;
        };

        // returns a copy of rectangle "rect" that fits into this one
        // (moving it first)
        that.fit = function(rect) {
            var r = rect.copy();
            r.x = Math.max(r.x, this.x);
            r.y = Math.max(r.y, this.x);
            if (r.x + r.width > this.x + this.width) {
                r.x = this.x + this.width - r.width;
            }
            if (r.y + r.height > this.y + this.height) {
                r.y = this.y + this.height - r.height;
            }
            return r.intersect(this);
        };

        // adjusts position and size of jQuery element "$elem" to this rectangle
        that.adjustDiv = function($elem) {
            $elem.offset({
                left : this.x,
                top : this.y
            });
            $elem.width(this.width).height(this.height);
        };
        // returns position and size of this rectangle in css-compatible format
        that.getAsCss = function() {
            return {
                left : this.x,
                top : this.y,
                width : this.width,
                height : this.height
            };
        };
        // returns position and size of this rectangle formatted for SVG attributes
        that.getAsSvg = function() {
            return [this.x, this.y, this.width, this.height].join(" ");
        };
        // returns if this rectangle is a rectangle
        that.isRectangle = function () {
        	return this.width > 0 && this.height > 0;
        };
        // returns size and position of this rectangle formatted for ??? (w x h@x,y)
        that.toString = function() {
            return this.width + "x" + this.height + "@" + this.x + "," + this.y;
        };
        return that;
    };

    /*
     * Transform class
     * 
     * defines a class of affine transformations
     */
    var transform = function(spec) {
        var that = {
            m00 : 1.0,
            m01 : 0.0,
            m02 : 0.0,
            m10 : 0.0,
            m11 : 1.0,
            m12 : 0.0,
            m20 : 0.0,
            m21 : 0.0,
            m22 : 1.0
        };
        if (spec) {
            jQuery.extend(that, spec);
        }
        ;
        that.concat = function(trafA) {
            // add Transform trafA to this Transform (i.e. this = trafC = trafA * this)
            var trafC = {};
            for ( var i = 0; i < 3; i++) {
                for ( var j = 0; j < 3; j++) {
                    var c = 0.0;
                    for ( var k = 0; k < 3; k++) {
                        c += trafA["m" + i + k] * this["m" + k + j];
                    }
                    trafC["m" + i + j] = c;
                }
            }
            jQuery.extend(this, trafC);
            return this;
        };
        that.transform = function(rect) {
            // returns transformed Rectangle or Position with this Transform
            // applied
            var x = this.m00 * rect.x + this.m01 * rect.y + this.m02;
            var y = this.m10 * rect.x + this.m11 * rect.y + this.m12;
            var pt = position(x, y);
            if (rect.width != null) {
                // transform the other corner point
                var pt2 = this.transform(rect.getPt2());
                return rectangle(pt, pt2);
            }
            return pt;
        };
        that.invtransform = function(rect) {
            // returns transformed Rectangle or Position with the inverse of
            // this Transform applied
            var det = this.m00 * this.m11 - this.m01 * this.m10;
            var x = (this.m11 * rect.x - this.m01 * rect.y - this.m11
                    * this.m02 + this.m01 * this.m12)
                    / det;
            var y = (-this.m10 * rect.x + this.m00 * rect.y + this.m10
                    * this.m02 - this.m00 * this.m12)
                    / det;
            var pt = position(x, y);
            if (rect.width != null) {
                // transform the other corner point
                var pt2 = this.invtransform(rect.getPt2());
                return rectangle(pt, pt2);
            }
            return pt;
        };
        that.toString = function(pretty) {
            var s = '[';
            if (pretty)
                s += '\n';
            for ( var i = 0; i < 3; ++i) {
                s += '[';
                for ( var j = 0; j < 3; ++j) {
                    if (j)
                        s += ',';
                    s += this['m' + i + j];
                }
                s += ']';
                if (pretty)
                    s += '\n';
            }
            s += ']';
            if (pretty)
                s += '\n';
            return s;
        };
        // add class methods to instance
        that.getRotation = transform.getRotation;
        that.getRotationAround = transform.getRotationAround;
        that.getTranslation = transform.getTranslation;
        that.getMirror = transform.getMirror;
        that.getScale = transform.getScale;

        return that;
    };

    transform.getRotation = function(angle) {
        // returns a Transform that is a rotation by angle degrees around [0,0]
        if (angle !== 0) {
            var t = Math.PI * parseFloat(angle) / 180.0;
            var cost = Math.cos(t);
            var sint = Math.sin(t);
            var traf = {
                m00 : cost,
                m01 : -sint,
                m10 : sint,
                m11 : cost
            };
            return transform(traf);
        }
        return transform();
    };

    transform.getRotationAround = function(angle, pos) {
        // returns a Transform that is a rotation by angle degrees around pos
        var traf = transform.getTranslation(pos.neg());
        traf.concat(transform.getRotation(angle));
        traf.concat(transform.getTranslation(pos));
        return traf;
    };

    transform.getTranslation = function(pos) {
        // returns a Transform that is a translation by [pos.x, pos,y]
        var traf = {
            m02 : pos.x,
            m12 : pos.y
        };
        return transform(traf);
    };

    transform.getMirror = function(type) {
        // returns a Transform that is a mirror about the axis type
        if (type === 'x') {
            var traf = {
                m00 : 1,
                m11 : -1
            };
        } else {
            var traf = {
                m00 : -1,
                m11 : 1
            };
        }
        return transform(traf);
    };

    transform.getScale = function(size) {
        // returns a Transform that is a scale by [size.width, size.height]
        var traf = {
            m00 : size.width,
            m11 : size.height
        };
        return transform(traf);
    };

    // export constructor functions to digilib plugin
    var geometry = {
            size : size,
            position : position,
            line : line,
            rectangle : rectangle,
            transform : transform
    };
    // install function called by digilib on plugin object
    var install = function() {
        // add constructor object to fn
        this.fn.geometry = geometry;
    };
    // digilib plugin object
    var plugin = {
            name : 'geometry',
            install : install,
            fn : {},
            // TODO: remove old init
            init : init
    };
    // TODO: remove old version of init returning contructor
    var init = function () {
        return geometry;
    };
    // plug into digilib
    if ($.fn.digilib == null) {
        $.error("jquery.digilib.geometry must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
