/* digilib geometry classes
 * should be integrated into jquery.digilib.js
 */ 

var dlGeometry = function() {
/*
 * Size class
 */
        var size = function (w, h) {
            var that = {
                    width : parseFloat(w),
                    height : parseFloat(h)
            };
            that.equals = function(other) {
                return (this.width === other.width &&  this.height === other.height);
            };
            that.toString = function() {
                return (this.width + "x" + this.height);
            };
            return that;
        };

/*
 * Position class
 */
        var position = function (x, y) {
            if (typeof x === "object") {
                if (x instanceof jQuery) {
                    // jQuery object
                    var pos = x.offset();
                    var that = {
                            x : pos.left,
                            y : pos.top
                    };
                } else {
                    // event object(?)
                    var that = {
                            x : x.pageX,
                            y : x.pageY
                    };
                }
            } else {
                var that = {
                        x : parseFloat(x),
                        y : parseFloat(y)
                };
            }
            that.equals = function(other) {
                return (this.x === other.x  &&  this.y === other.y);
            };
            that.toString = function() {
                return (this.x + "," + this.y);
            };
            return that;
        };
/*
 * Rectangle class
 */
        var rectangle = function (x, y, w, h) {
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
                } else {
                    // assume x and y are Position
                    that = {
                            x : x.x,
                            y : x.y,
                            width : y.x - x.x,
                            height : y.y - x.y
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
                return rectangle(this.x, this.y, this.width, this.height);
            };
            // returns the position of this Rectangle
            that.getPosition = function() {
                return position(this.x, this.y);
            };
            // returns the upper left corner position
            that.getPt1 = that.getPosition;
            // returns the lower right corner position of this Rectangle
            that.getPt2 = function() {
                return position(this.x + this.width, this.y + this.height);
            };
            // sets the upper left corner to position pos
            that.setPt1 = function(pos) {
                this.x = pos.x;
                this.y = pos.y;
                return this;
            };
            that.setPt2 = function(pos) {
                // sets the lower right corner to position pos
                this.width = pos.x - this.x;
                this.height = pos.y - this.y;
                return this;
            };
            that.getCenter = function() {
                // returns the center position of this Rectangle
                return position(this.x + this.width / 2, this.y + this.height / 2);
            };
            that.setCenter = function(pos) {
                // moves this Rectangle's center to position pos
                this.x = pos.x - this.width / 2;
                this.y = pos.y - this.height / 2;
                return this;
            };
            that.getSize = function() {
                // returns the size of this Rectangle
                return size(this.width, this.height);
            };
            that.equals = function(other) {
                // equal props
                var eq = (this.x === other.x && this.y === other.y && 
                        this.width === other.width);
                return eq;
            };
            that.getArea = function() {
                // returns the area of this Rectangle
                return (this.width * this.height);
            };
            that.normalize = function() {
                // eliminates negative width and height
                var p = this.getPt2();
                this.x = Math.min(this.x, p.x);
                this.y = Math.min(this.y, p.y);
                this.width = Math.abs(this.width);
                this.height = Math.abs(this.height);
                return this;
            };
            that.containsPosition = function(pos) {
                // returns if Position "pos" lies inside of this rectangle
                var ct = ((pos.x >= this.x) && (pos.y >= this.y) && 
                        (pos.x <= this.x + this.width) && (pos.y <= this.y + this.height));
                return ct;
            };
            that.containsRect = function(rect) {
                // returns if rectangle "rect" is contained in this rectangle
                return (this.containsPosition(rect.getPt1()) && this.containsPosition(rect.getPt2()));
            };
            that.stayInside = function(rect) {
                // changes this rectangle's x/y values so it stays inside of rectangle rect
                // keeping the proportions
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
            that.clipTo = function(rect) {
                // clips this rectangle so it stays inside of rectangle rect
                var p1 = rect.getPt1();
                var p2 = rect.getPt2();
                var this2 = this.getPt2();
                this.setPt1(position(Math.max(this.x, p1.x), Math.max(this.y, p1.y)));
                this.setPt2(position(Math.min(this2.x, p2.x), Math.min(this2.y, p2.y)));
                return this;
            };
            that.intersect = function(rect) {
                // returns the intersection of the given Rectangle and this one
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
            that.fit = function(rect) {
                // returns a Rectangle that fits into this one (by moving first)
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
            that.toString = function() {
                return this.width+"x"+this.height+"@"+this.x+","+this.y;
            };
            return that;
        };

/*
 * Transform class
 *
 * defines a class of affine transformations
 */
        var transform = function (spec) {
            var that = jQuery.extend({
                    m00 : 1.0,
                    m01 : 0.0,
                    m02 : 0.0,
                    m10 : 0.0,
                    m11 : 1.0,
                    m20 : 0.0,
                    m12 : 0.0,
                    m21 : 0.0,
                    m22 : 1.0
            }, spec);
            that.concat = function(traf) {
                // add Transform traf to this Transform
                for (var i = 0; i < 3; i++) {
                    for (var j = 0; j < 3; j++) {
                        var c = 0.0;
                        for (var k = 0; k < 3; k++) {
                            c += traf["m"+i+k] * this["m"+k+j];
                        }
                        this["m"+i+j] = c;
                    }
                }
                return this;
            };
            that.transform = function(rect) {
                // returns transformed Rectangle or Position with this Transform applied
                var x = this.m00 * rect.x + this.m01 * rect.y + this.m02;
                var y = this.m10 * rect.x + this.m11 * rect.y + this.m12;
                if (rect.width) {
                    // transform the other corner points
                    var pt2 = rect.getPt2();
                    var x2 = this.m00 * pt2.x + this.m01 * pt2.y + this.m02;
                    var y2 = this.m10 * pt2.x + this.m11 * pt2.y + this.m12;
                    var width = x2 - x;
                    var height = y2 - y;
                    return rectangle(x, y, width, height);
                }
                return position(x, y);
            };
            that.invtransform = function(rect) {
                // returns transformed Rectangle or Position with the inverse of this Transform applied
                var det = this.m00 * this.m11 - this.m01 * this.m10;
                var x = (this.m11 * rect.x - this.m01 * rect.y - this.m11 * this.m02 + this.m01 * this.m12) / det;
                var y = (- this.m10 * rect.x + this.m00 * rect.y + this.m10 * this.m02 - this.m00 * this.m12) / det;
                if (rect.width) {
                    // transform the other corner points
                    var pt2 = rect.getPt2();
                    var x2 = (this.m11 * pt2.x - this.m01 * pt2.y - this.m11 * this.m02 + this.m01 * this.m12) / det;
                    var y2 = (- this.m10 * pt2.x + this.m00 * pt2.y + this.m10 * this.m02 - this.m00 * this.m12) / det;
                    var width = x2 - x;
                    var height = y2 - y;
                    return rectangle(x, y, width, height);
                }
                return position(x, y);
            };
            that.getRotation = transform.getRotation;
            that.getTranslation = transform.getTranslation;
            that.getScale = transform.getScale;
            
            return that;
        };

        transform.getRotation = function (angle, pos) {
           // returns a Transform that is a rotation by angle degrees around [pos.x, pos.y]
           if (angle !== 0) {
               var t = 2.0 * Math.PI * parseFloat(angle) / 360.0;
               var traf = {
                       m00 : Math.cos(t),
                       m01 : - Math.sin(t),
                       m10 : Math.sin(t),
                       m11 : Math.cos(t),
                       m02 : pos.x - pos.x * Math.cos(t) + pos.y * Math.sin(t),
                       m12 : pos.y - pos.x * Math.sin(t) - pos.y * Math.cos(t)
               };
               return transform(traf);
           }
           return transform();
       };

       transform.getTranslation = function (pos) {
           // returns a Transform that is a translation by [pos.x, pos,y]
           var traf = {
                   m02 : pos.x,
                   m12 : pos.y
           };
           return transform(traf);
       };

       transform.getScale = function (size) {
           // returns a Transform that is a scale by [size.width, size.height]
           var traf = {
                   m00 : size.width,
                   m11 : size.height
           };
           return transform(traf);
       };

       // export functions
       var that = {
               size : size,
               position : position,
               rectangle : rectangle,
               transform : transform
       };
       
       return that;
    };
