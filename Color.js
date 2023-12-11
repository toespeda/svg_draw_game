function Color(color, min, max) {
    if (color.constructor === String) {
        var cache, p = parseInt, color = color.replace(/\s\s*/g,'');
        if (cache = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/.exec(color)) {
            cache = [p(cache[1], 16), p(cache[2], 16), p(cache[3], 16)];
        } else if (cache = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])/.exec(color)) {
            cache = [p(cache[1], 16) * 17, p(cache[2], 16) * 17, p(cache[3], 16) * 17];
        } else if (cache = /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/.exec(color)) {
            cache = [+cache[1], +cache[2], +cache[3], +cache[4]];
        } else if (cache = /^rgb\(([\d]+),([\d]+),([\d]+)\)/.exec(color)) {
            cache = [+cache[1], +cache[2], +cache[3]];
        } // \s*
        color = cache;
    }
    this.r = color[0];
    this.g = color[1];
    this.b = color[2];
    this.min = min;
    this.max = max;
}

Color.prototype = {
    d2h : function(d){
        return ("0" + parseInt(d).toString(16)).slice(-2);
        //return d.toString(16);
    },
    h2d : function(h) {
        return parseInt(h, 16);
    },
    toHex : function(){

        return "#" + this.d2h(this.r)+this.d2h(this.g)+this.d2h(this.b);
    },
    hue : function(step){
        let b = this.b;
        let r = this.r;
        let g = this.g;
        let min = this.min;
        let max = this.max;
        if (r == 255 && g < 255 && b == 0) {
            this.g += step;
        } else if (r > 0 && g == 255 && b == 0) {
            this.r -= step;
        } else if (r == 0 && g == 255 && b < 255) {
            this.b += step;
        } else if (r == 0 && g > 0 && b == 255) {
            this.g -= step;
        } else if (r < 255 && g == 0 && b == 255) {
            this.r += step;
        } else if (r == 255 && g == 0 && b > 0) {
            this.b -= step;
        }
        return this;
    }
}