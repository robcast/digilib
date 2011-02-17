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
            // assume its size
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
        that.equals = function(other) {
            return (this.width === other.width && this.height === other.height);
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
            } else {
                if (x.x != null) {
                    // position object
                    that = {
                        x : x.x,
                        y : x.y
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
        }
        that.equals = function(other) {
            return (this.x === other.x && this.y === other.y);
        };
        // add position other to this
        that.add = function(other) {
            this.x += other.x;
            this.y += other.y;
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
        // adjusts position $elem to this position
        that.adjustDiv = function($elem) {
            $elem.offset({
                left : this.x,
                top : this.y
            });
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
        that.toString = function() {
            return (this.x + "," + this.y);
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
                    x : x.x,
                    y : x.y,
                    width : x.width,
                    height : x.height
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
        that.setPt1 = that.setPosition; // TODO: not really the same
        // adds pos to the position
        that.addPosition = function(pos) {
            this.x += pos.x;
            this.y += pos.y;
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
        // moves this Rectangle's center to position pos
        that.setCenter = function(pos) {
            this.x = pos.x - this.width / 2;
            this.y = pos.y - this.height / 2;
            return this;
        };
        that.equals = function(other) {
            // equal props
            var eq = (this.x === other.x && this.y === other.y && this.width === other.width);
            return eq;
        };
        // returns the area of this Rectangle
        that.getArea = function() {
            return (this.width * this.height);
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
        // returns if rectangle "rect" is contained in this rectangle
        that.containsRect = function(rect) {
            return (this.containsPosition(rect.getPt1()) && this
                    .containsPosition(rect.getPt2()));
        };
        // changes this rectangle's x/y values so it stays inside of rectangle
        // rect
        // keeping the proportions
        that.stayInside = function(rect) {
            if (this.x < rect.x) {
                this.x = rect.x;
            }
            if (this.y < rect.y) {
                this.y = rect.y;
            }
            if (this.x + this.width > rect.x + rect.width) {
                this.x = rect.x + rect.width - this.width;
            }
            if (this.y + this.height > rect.y + rect.height) {
                this.y = rect.y + rect.height - this.height;
            }
            return this;
        };
        // clips this rectangle so it stays inside of rectangle rect
        that.clipTo = function(rect) {
            var p1 = rect.getPt1();
            var p2 = rect.getPt2();
            var this2 = this.getPt2();
            this.setPosition(position(Math.max(this.x, p1.x), Math.max(this.y, p1.y)));
            this.setPt2(position(Math.min(this2.x, p2.x), Math.min(this2.y, p2.y)));
            return this;
        };
        // returns the intersection of the given Rectangle and this one
        that.intersect = function(rect) {
            // FIX ME: not really, it should return null if there is no overlap
            var sec = rect.copy();
            if (sec.x < this.x) {
                sec.width = sec.width - (this.x - sec.x);
                sec.x = this.x;
            }
            if (sec.y < this.y) {
                sec.height = sec.height - (this.y - sec.y);
                sec.y = this.y;
            }
            if (sec.x + sec.width > this.x + this.width) {
                sec.width = (this.x + this.width) - sec.x;
            }
            if (sec.y + sec.height > this.y + this.height) {
                sec.height = (this.y + this.height) - sec.y;
            }
            return sec;
        };
        // returns a Rectangle that fits into this one (by moving first)
        that.fit = function(rect) {
            var sec = rect.copy();
            sec.x = Math.max(sec.x, this.x);
            sec.y = Math.max(sec.y, this.x);
            if (sec.x + sec.width > this.x + this.width) {
                sec.x = this.x + this.width - sec.width;
            }
            if (sec.y + sec.height > this.y + this.height) {
                sec.y = this.y + this.height - sec.height;
            }
            return sec.intersect(this);
        };
        // adjusts position and size of $elem to this rectangle
        that.adjustDiv = function($elem) {
            $elem.offset({
                left : this.x,
                top : this.y
            });
            $elem.width(this.width).height(this.height);
        };
        // returns size and position in css-compatible format
        that.getAsCss = function() {
            return {
                left : this.x,
                top : this.y,
                width : this.width,
                height : this.height
            };
        };
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
            // add Transform trafA to this Transform (i.e. this = trafC = trafA
            // * this)
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
            if (rect.width) {
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
            if (rect.width) {
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
    var init = function () {
        return {
            size : size,
            position : position,
            rectangle : rectangle,
            transform : transform
        };
    };
    if ($.fn.digilib == null) {
        $.error("jquery.digilib.geometry must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', {name : 'geometry', init : init});
    }
})(jQuery);
