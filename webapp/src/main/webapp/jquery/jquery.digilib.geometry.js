/*
 * #%L
 * required digilib geometry plugin
 * %%
 * Copyright (C) 2011 - 2017 MPIWG Berlin, Bibliotheca Hertziana
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
    var RAD2DEG = 180.0 / Math.PI;
    /**
     * Size class
     */
    function Size(w, h) {
        if (typeof w === "object") {
            // assume an object having width and height
            this.width = w.width, this.height = w.height;
        } else {
            this.width = parseFloat(w), this.height = parseFloat(h);
        }
    }

    /**
     * returns true if both sizes are equal
     */
    Size.prototype.equals = function(other) {
        return (this.width === other.width && this.height === other.height);
    };

    /**
     * returns the aspect ratio of this size
     */
    Size.prototype.getAspect = function() {
        return (this.width / this.height);
    };

    /**
     * returns a size of a given aspect ratio that fits into this one
     */
    Size.prototype.fitAspect = function(aspect) {
        var s = new Size(this);
        if (aspect > this.getAspect()) {
            // size is more horizontally stretched than this
            s.height = s.width / aspect;
        } else {
            s.width = s.height * aspect;
        }
        return s;
    };

    /**
     * adjusts size of jQuery element "$elem" to this size
     */
    Size.prototype.adjustDiv = function($elem) {
        $elem.width(this.width).height(this.height);
    };

    Size.prototype.toString = function() {
        return (this.width + "x" + this.height);
    };

    /**
     * Position class
     */
    function Position(x, y) {
        if (typeof x === "object") {
            if (x instanceof jQuery) {
                // jQuery object
                var pos = x.offset();
                this.x = pos.left;
                this.y = pos.top;
            } else if ($.isArray(x)) {
                this.x = x[0];
                this.y = x[1];
            } else {
                if (x.x != null) {
                    // position object
                    this.x = parseFloat(x.x);
                    this.y = parseFloat(x.y);
                }
                if (x.pageX != null) {
                    // event object
                    this.x = x.pageX;
                    this.y = x.pageY;
                }
            }
        } else {
            this.x = parseFloat(x);
            this.y = parseFloat(y);
        }
    }

    /**
     * return a copy of this position
     */
    Position.prototype.copy = function() {
        return new Position(this);
    };

    /**
     * compare function
     */
    Position.prototype.equals = function(other) {
        return (this.x === other.x && this.y === other.y);
    };

    /**
     * add vector or position to this
     */
    Position.prototype.add = function(other) {
        if ($.isArray(other)) {
            this.x += other[0];
            this.y += other[1];
        } else {
            this.x += other.x;
            this.y += other.y;
        }
        return this;
    };

    /**
     * returns negative position
     */
    Position.prototype.neg = function() {
        return new Position({
            x : -this.x,
            y : -this.y
        });
    };

    /**
     * returns new position that is the difference between this and other
     */
    Position.prototype.delta = function(other) {
        return new Position({
            x : other.x - this.x,
            y : other.y - this.y
        });
    };

    /**
     * returns other position scaled by ratio with regard to this point
     */
    Position.prototype.scale = function(other, ratio) {
        var d = this.delta(other);
        return new Position({
            x : this.x + d.x * ratio,
            y : this.y + d.y * ratio
        });
    };

    /**
     * adjusts CSS position of $elem to this position
     */
    Position.prototype.adjustDiv = function($elem) {
        $elem.offset({
            left : this.x,
            top : this.y
        });
    };

    /**
     * move this position to another
     */
    Position.prototype.moveTo = function(other) {
        this.x = other.x;
        this.y = other.y;
        return this;
    };

    /**
     * adjust this position so that is is inside rect
     */
    Position.prototype.clipTo = function(rect) {
        var p1 = rect.getPt1();
        var p2 = rect.getPt2();
        this.x = Math.max(this.x, p1.x);
        this.y = Math.max(this.y, p1.y);
        this.x = Math.min(this.x, p2.x);
        this.y = Math.min(this.y, p2.y);
        return this;
    };

    /**
     * returns distance of this position to pos (length if pos == null)
     */
    Position.prototype.distance = function(pos) {
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

    /**
     * nearest of several points
     */
    Position.prototype.nearest = function(points) {
        var nearest = points[0];
        var dist = this.distance(nearest);
        $.each(points, function(index, item) {
            var len = this.distance(item);
            if (len < dist) {
                dist = len;
                nearest = item;
            }
        });
        return nearest;
    };

    /**
     * midpoint of this and other pos
     */
    Position.prototype.mid = function(pos) {
        return new Position({
            x : (this.x + pos.x) / 2,
            y : (this.y + pos.y) / 2
        });
    };

    /**
     * radians of angle between line and the positive X axis
     */
    Position.prototype.rad = function(pos) {
        return Math.atan2(pos.y - this.y, pos.x - this.x);
    };

    /**
     * degree of angle between line and the positive X axis
     */
    Position.prototype.deg = function(pos) {
        return this.rad(pos) * RAD2DEG;
    };

    /**
     * returns position in css-compatible format
     */
    Position.prototype.getAsCss = function() {
        return {
            left : this.x,
            top : this.y
        };
    };

    /**
     * return as string
     */
    Position.prototype.toString = function() {
        return (this.x + "," + this.y);
    };

    /**
     * return as array
     */
    Position.prototype.toArray = function() {
        return [ this.x, this.y ];
    };

    /**
     * Line class (for on-screen geometry)
     */
    function Line(p, q) {
        this.x = p.x;
        this.y = p.y;
        if (q.x != null) { // second point
            this.dx = q.x - that.x;
            this.dy = q.y - that.y;
        } else if ($.isArray(q)) { // vector
            this.dx = q[0];
            this.dy = q[1];
        } else if (q === 0) { // slope
            this.dx = 0;
            this.dy = 1;
        } else if (q === Infinity) {
            this.dx = 1;
            this.dy = 0;
        } else if (q === -Infinity) {
            this.dx = -1;
            this.dy = 0;
        } else if (typeof q === 'number' && isFinite(q)) {
            this.dx = 1;
            this.dy = 1 / q;
        } else {
            this.dx = 1;
            this.dy = 1;
        }
    }
    ;

    /**
     * get/set origin of line
     */
    Line.prototype.origin = function(p) {
        if (p == null) {
            return new Position(this.x, this.y);
        }
        this.x = p.x;
        this.y = p.y;
        return this;
    };

    /**
     * get/set vector
     */
    Line.prototype.vector = function(vector) {
        if (vector == null) {
            return [ this.dx, this.dy ];
        }
        this.dx = vector[0];
        this.dy = vector[1];
        return this;
    };

    /**
     * return a vector with the contrary direction
     */
    Line.prototype.invertedVector = function() {
        return [ -this.dx, -this.dy ];
    };

    /**
     * return a vector that is perpendicular to this line
     */
    Line.prototype.perpendicularVector = function(clockwise) {
        return clockwise ? [ -this.dy, this.dx ] : [ this.dy, -this.dx ];
    };

    /**
     * return vector distance
     */
    Line.prototype.dist = function() {
        return Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    };

    /**
     * multiply vector with a ratio
     */
    Line.prototype.scale = function(ratio) {
        this.dx *= ratio;
        this.dy *= ratio
        return this;
    };

    /**
     * get/set vector length
     */
    Line.prototype.length = function(length) {
        var dist = this.dist();
        if (length == null) {
            return dist;
        }
        return this.scale(length / dist);
    };

    /**
     * return the slope
     */
    Line.prototype.slope = function() {
        return this.dx / this.dy;
    };

    /**
     * return a copy of this line
     */
    Line.prototype.copy = function() {
        return new Line(new Position(this.x, this.y), this.vector());
    };

    /**
     * invert direction
     */
    Line.prototype.invert = function() {
        this.vector(this.invertedVector);
        return this;
    };

    /**
     * return a parallel line through a point (with the same vector)
     */
    Line.prototype.parallel = function(p) {
        return new Line(new Position(p.x, p.y), this.vector());
    };

    /**
     * return a perpendicular line from the origin (optionally from another
     * point) with direction
     */
    Line.prototype.perpendicular = function(p, clockwise) {
        var point = (p == null || p.x == null) ? new Position(this.x, this.y)
                : p;
        return new Line(point, this.perpendicularVector(clockwise));
    };

    /**
     * return the intersection with a perpendicular line through a point
     */
    Line.prototype.perpendicularPoint = function(p) {
        return this.intersection(this.perpendicular(p));
    };

    /**
     * return perpendicular line from point
     */
    Line.prototype.perpendicularLine = function(p) {
        return new Line(p, this.perpendicularPoint(p));
    };

    /**
     * return point in mirrored position (with regard to this line)
     */
    Line.prototype.mirror = function(p) {
        var line = this.perpendicularLine(p);
        return line.addEnd(line.vector());
    };

    /**
     * return a position by adding a vector/position/distance to origin
     */
    Line.prototype.add = function(item) {
        if (item == null) {
            return this.origin();
        } else if ($.isArray(item)) { // add a vector
            return new Position(this.x + item[0], this.y + item[1])
        } else if (item.x != null) { // add a position
            return new Position(this.x + item.x, this.y + item.y);
        } else if (typeof item === 'number' && isFinite(item)) { // add a
                                                                    // distance
            ratio = item / this.dist();
            return new Position(this.x + this.dx * ratio, this.y + this.dy
                    * ratio);
        } else {
            return this.origin();
        }
    };

    /**
     * return a position by adding a vector/position/distance to end point
     */
    Line.prototype.addEnd = function(item) {
        return this.add(item).add(this.vector());
    };

    /**
     * end point on the line (pointed to by vector)
     */
    Line.prototype.point = function(factor) {
        if (factor == null) {
            factor = 1;
        }
        var vector = [ factor * this.dx, factor * this.dy ];
        return this.add(vector);
    };

    /**
     * midpoint on the line (half of vector distance, multiplied by factor)
     */
    Line.prototype.mid = function(factor) {
        return this.origin().mid(this.point(factor));
    };

    /**
     * radians of angle between line and the positive X axis
     */
    Line.prototype.rad = function() {
        return this.origin().rad(this.point());
    };

    /**
     * degree of angle between line and the positive X axis
     */
    Line.prototype.deg = function() {
        return this.origin().deg(this.point());
    };

    /**
     * factor of point (assuming it is on the line)
     */
    Line.prototype.factor = function(p) {
        return (dx === 0) ? (p.y - this.y) / this.dy : (p.x - this.x) / this.dx;
    };

    /**
     * intersection point with other line
     */
    Line.prototype.intersection = function(line) {
        var denominator = this.dy * line.dx - this.dx * line.dy
        if (denominator === 0) { // parallel
            return null;
        }
        var num = this.dx * (line.y - this.y) + this.dy * (this.x - line.x);
        return line.point(num / denominator);
    };

            
    /**
     * Rectangle class
     */
    function Rectangle(x, y, w, h) {
        if (typeof x === "object") {
            if (x instanceof jQuery) {
                // jQuery object
                var pos = x.offset();
                this.x = pos.left;
                this.y = pos.top;
                this.width = x.width();
                this.height = x.height();
            } else if (y == null) {
                // assume x is rectangle
                this.x = parseFloat(x.x) || 0;
                this.y = parseFloat(x.y) || 0;
                this.width = parseFloat(x.width) || 0;
                this.height = parseFloat(x.height) || 0;
            } else {
                // assume x and y are Position
                this.x = Math.min(x.x, y.x);
                this.y = Math.min(x.y, y.y);
                this.width = Math.abs(y.x - x.x);
                this.height = Math.abs(y.y - x.y);
            }
        } else {
            this.x = parseFloat(x);
            this.y = parseFloat(y);
            this.width = parseFloat(w);
            this.height = parseFloat(h);
        }
    };

    /**
     * returns a copy of this Rectangle
     */
        Rectangle.prototype.copy = function() {
            return new Rectangle(this);
        };
        
        /**
         * returns the position of this Rectangle
         */
        Rectangle.prototype.getPosition = function() {
            return new Position(this);
        };
        
        /**
         * returns the size of this Rectangle
         */
        Rectangle.prototype.getSize = function() {
            return new Size(this);
        };
        
        /**
         * returns the upper left corner position
         */
        Rectangle.prototype.getPt1 = Rectangle.prototype.getPosition;
        
        /**
         * returns the lower right corner position of this Rectangle
         */
        Rectangle.prototype.getPt2 = function() {
            return new Position({
                x : this.x + this.width,
                y : this.y + this.height
            });
        };
        
        /**
         * sets the upper left corner position to pos
         */
        Rectangle.prototype.setPosition = function(pos) {
            this.x = pos.x;
            this.y = pos.y;
            return this;
        };
        
        Rectangle.prototype.setPt1 = Rectangle.prototype.setPosition; 
        // TODO: not really the same
        
        /**
         * adds pos to the position
         */
        Rectangle.prototype.addPosition = function(pos) {
            this.x += pos.x;
            this.y += pos.y;
            return this;
        };
        
        /**
         * adds pos to the dimensions
         */
        Rectangle.prototype.enlarge = function(pos) {
            this.width += pos.x;
            this.height += pos.y;
            return this;
        };
        
        /**
         * sets the lower right corner to position pos
         */
        Rectangle.prototype.setPt2 = function(pos) {
            this.width = pos.x - this.x;
            this.height = pos.y - this.y;
            return this;
        };
        
        /**
         * returns the center position of this Rectangle
         */
        Rectangle.prototype.getCenter = function() {
            return new Position({
                x : this.x + this.width / 2,
                y : this.y + this.height / 2
            });
        };
        
        /**
         * moves this rectangle's center to position pos
         */
        Rectangle.prototype.setCenter = function(pos) {
            this.x = pos.x - this.width / 2;
            this.y = pos.y - this.height / 2;
            return this;
        };
        
        /**
         * returns true if both rectangles have equal position and size
         */
        Rectangle.prototype.equals = function(other) {
            var eq = (this.x === other.x && this.y === other.y && this.width === other.width);
            return eq;
        };
        
        /**
         * returns a rectangle with the difference width, height and position
         */
        Rectangle.prototype.delta = function(other) {
            return new Rectangle(other.x - this.x, other.y - this.y, 
            		other.width - this.width, other.height - this.height);
        };
        
        /**
         * returns the area of this Rectangle
         */
        Rectangle.prototype.getArea = function() {
            return (this.width * this.height);
        };
        
        /**
         * returns the aspect ratio of this Rectangle
         */
        Rectangle.prototype.getAspect = function() {
            return (this.width / this.height);
        };
        
        /**
         * eliminates negative width and height
         */
        Rectangle.prototype.normalize = function() {
            var p = this.getPt2();
            this.x = Math.min(this.x, p.x);
            this.y = Math.min(this.y, p.y);
            this.width = Math.abs(this.width);
            this.height = Math.abs(this.height);
            return this;
        };
        
        /**
         * returns if Position "pos" lies inside of this rectangle
         */
        Rectangle.prototype.containsPosition = function(pos) {
            var ct = ((pos.x >= this.x) && (pos.y >= this.y)
                    && (pos.x <= this.x + this.width) && (pos.y <= this.y
                    + this.height));
            return ct;
        };
        
        /**
         * returns true if rectangle "rect" is contained in this rectangle
         */
        Rectangle.prototype.containsRect = function(rect) {
            return (this.containsPosition(rect.getPt1()) && this
                    .containsPosition(rect.getPt2()));
        };
        
        /**
         * returns true if rectangle "rect" and this rectangle overlap
         */
        Rectangle.prototype.overlapsRect = function(rect) {
            return this.intersect(rect) != null;
        };
        
        /**
         * returns the ratio of height to width
         */
        Rectangle.prototype.getProportion = function() {
            return this.height/this.width;
        };
        
        /**
         * shrink/grow rectangle until it has the given proportion
         */
        Rectangle.prototype.setProportion = function(ratio, canGrow) {
            var prop = this.getProportion();
            if (ratio < prop == canGrow) {
                this.width = this.height / ratio;
            } else {
                this.height = this.width * ratio;
            }
            return this;
        };
        
        /**
         * changes this rectangle's x/y values so it stays inside of rectangle
         * "rect", keeping the proportions
         */
        Rectangle.prototype.stayInside = function(rect) {
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
        
        /**
         * clips this rectangle so it stays inside of rectangle "rect"
         */
        Rectangle.prototype.clipTo = function(rect) {
            var p1 = rect.getPt1();
            var p2 = rect.getPt2();
            var this2 = this.getPt2();
            this.setPosition(new Position(Math.max(this.x, p1.x), Math.max(this.y, p1.y)));
            this.setPt2(new Position(Math.min(this2.x, p2.x), Math.min(this2.y, p2.y)));
            return this;
        };

        /**
         * returns the intersection of rectangle "rect" and this one
         */
        Rectangle.prototype.intersect = function(rect) {
            var r = rect.copy();
            var result = r.clipTo(this);
            if (result.width < 0 || result.height < 0) result = null;
            return result;
        };

        /**
         * returns a copy of rectangle "rect" that fits into this one (moving it
         * first)
         */
        Rectangle.prototype.fit = function(rect) {
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

        /**
         * adjusts position and size of jQuery element "$elem" to this rectangle
         */
        Rectangle.prototype.adjustDiv = function($elem) {
            $elem.offset({
                left : this.x,
                top : this.y
            });
            $elem.width(this.width).height(this.height);
        };
        
        /**
         * returns position and size of this rectangle in css-compatible format
         */
        Rectangle.prototype.getAsCss = function() {
            return {
                left : this.x,
                top : this.y,
                width : this.width,
                height : this.height
            };
        };
        
        /**
         * returns position and size of this rectangle formatted for SVG
         * attributes
         */
        Rectangle.prototype.getAsSvg = function() {
            return [this.x, this.y, this.width, this.height].join(" ");
        };
        
        /**
         * returns if this rectangle is a rectangle
         */
        Rectangle.prototype.isRectangle = function () {
        	return this.width > 0 && this.height > 0;
        };
        
        /**
         * returns size and position of this rectangle formatted as string "(w x
         * h@x,y)"
         */
        Rectangle.prototype.toString = function() {
            return this.width + "x" + this.height + "@" + this.x + "," + this.y;
        };

        
    /**
     * Transform class
     * 
     * defines a class of affine transformations
     */
    function Transform(spec) {
        // 3x3 transform matrix
        this.m00 = 1.0;
        this.m01 = 0.0;
        this.m02 = 0.0;
        this.m10 = 0.0;
        this.m11 = 1.0;
        this.m12 = 0.0;
        this.m20 = 0.0;
        this.m21 = 0.0;
        this.m22 = 1.0;
        
        if (spec) {
            jQuery.extend(this, spec);
        }
    };
    
    /**
     *  add Transform trafA to this Transform (i.e. this = trafC = trafA * this)
     */
        Transform.prototype.concat = function(trafA) {
            var trafC = {};
            for (var i = 0; i < 3; i++) {
                for (var j = 0; j < 3; j++) {
                    var c = 0.0;
                    for (var k = 0; k < 3; k++) {
                        c += trafA["m" + i + k] * this["m" + k + j];
                    }
                    trafC["m" + i + j] = c;
                }
            }
            jQuery.extend(this, trafC);
            return this;
        };
        
        /**
         * returns transformed Rectangle or Position with this Transform
         * applied
         */
        Transform.prototype.transform = function(rect) {
            // 
            var x = this.m00 * rect.x + this.m01 * rect.y + this.m02;
            var y = this.m10 * rect.x + this.m11 * rect.y + this.m12;
            var pt = new Position(x, y);
            if (rect.width != null) {
                // transform the other corner point
                var pt2 = this.transform(rect.getPt2());
                return new Rectangle(pt, pt2);
            }
            return pt;
        };
        
        /**
         * returns transformed Rectangle or Position with the inverse of this Transform applied
         */
        Transform.prototype.invtransform = function(rect) {
            var det = this.m00 * this.m11 - this.m01 * this.m10;
            var x = (this.m11 * rect.x - this.m01 * rect.y - this.m11
                    * this.m02 + this.m01 * this.m12)
                    / det;
            var y = (-this.m10 * rect.x + this.m00 * rect.y + this.m10
                    * this.m02 - this.m00 * this.m12)
                    / det;
            var pt = new Position(x, y);
            if (rect.width != null) {
                // transform the other corner point
                var pt2 = this.invtransform(rect.getPt2());
                return new Rectangle(pt, pt2);
            }
            return pt;
        };
        
        Transform.prototype.toString = function(pretty) {
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

        /**
         * returns a Transform that is a rotation by angle degrees around [0,0]
         */
        Transform.prototype.getRotation = function(angle) {
        if (angle !== 0) {
            var t = parseFloat(angle) / RAD2DEG;
            var cost = Math.cos(t);
            var sint = Math.sin(t);
            var traf = {
                m00 : cost,
                m01 : -sint,
                m10 : sint,
                m11 : cost
            };
            return new Transform(traf);
        }
        return new Transform();
    };

    /**
     * returns a Transform that is a rotation by angle degrees around pos
     */
    Transform.prototype.getRotationAround = function(angle, pos) {
        var traf = this.getTranslation(pos.neg());
        traf.concat(this.getRotation(angle));
        traf.concat(this.getTranslation(pos));
        return traf;
    };

    Transform.prototype.getTranslation = function(pos) {
        // returns a Transform that is a translation by [pos.x, pos,y]
        var traf = {
            m02 : pos.x,
            m12 : pos.y
        };
        return new Transform(traf);
    };

    Transform.prototype.getMirror = function(type) {
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
        return new Transform(traf);
    };

    Transform.prototype.getScale = function(size) {
        // returns a Transform that is a scale by [size.width, size.height]
        var traf = {
            m00 : size.width,
            m11 : size.height
        };
        return new Transform(traf);
    };

    
    // export constructor functions to digilib plugin
    var geometry = {
            Size : Size,
            Position : Position,
            Line : Line,
            Rectangle : Rectangle,
            Transform : Transform
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
            fn : {}
    };

    // plug into digilib
    if ($.fn.digilib == null) {
        $.error("jquery.digilib.geometry must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
