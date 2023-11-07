class SVGDraw {

    svg = null;

    shapes = [];

    type = "line";

    draw = 0;

    constructor(svg) {

        svg.addEventListener("mousedown", (e) => {

            let Shape = null;

            let moving = 0;

            let resizing = 0;

            let offset = svg.getBoundingClientRect();

            let getPos = function(e){
                return {
                    left : e.clientX - offset.left,
                    top : e.clientY - offset.top
                };
            };

            let startPos = getPos(e);

            let lastPos = startPos;

            let paths = svg.querySelectorAll("path");

            let testProximity = (pos, c) => {
                // let d = getProximity(pos, c);

                let start = {};
                let end = {};

                for (let m in c.d) {
                    if (c.d[m].command == "M") {
                        start["left"] = c.d[m].params[0];
                        start["top"] = c.d[m].params[1];
                    }
                    if (c.d[m].command == "L") {
                        end["left"] = c.d[m].params[0];
                        end["top"] = c.d[m].params[1];
                    }
                }

                let d = {
                    start : this.getDistance(pos, start),
                    end : this.getDistance(pos, end)
                }
                if (d.start < d.end && d.start < 10) {
                    return [start, end];
                } else if (d.end < 10) {
                    return [end, start];
                } else {
                    return null;
                }
            };

            let getEdges = (pos, shape) => {
                let s = [];
                for (let i = 0; i < paths.length; i++) {
                    let el = paths[i];
                    if (!shape || el !== shape) {
                        let c = this.getShape(el);
                        let proximity = c ? testProximity(pos, c) : null;
                        if (proximity) {
                            s.push({
                                shape : el,
                                path : proximity
                            });
                        }
                    }
                }
                return s;
            };

            let edges = getEdges(startPos);

            if (edges.length) {

                if (this.draw) {

                    //Shape.start = edges[0].path[0];
                    Shape = this.createShape(this.type, edges[0].path[0]);
                    this.addShape(Shape);

                } else if (this.type === edges[0].shape.nodeName) {

                    Shape = this.getShape(edges[0].shape);

                    for (let m in Shape.d) {
                        if (Shape.d[m].command == "M") {
                            Shape.d[m].params[0] = edges[0].path[1].left;
                            Shape.d[m].params[1] = edges[0].path[1].top;
                        }
                        if (Shape.d[m].command == "L") {
                            Shape.d[m].params[0] = edges[0].path[0].left;
                            Shape.d[m].params[1] = edges[0].path[0].top;
                        }
                    }

                    // Shape.start = edges[0].path[1];
                    // Shape.end = edges[0].path[0];

                }

            } else if (!this.draw && e.target.nodeName.match(/(path|circle|ellipse)/)) {

                Shape = this.getShape(e.target);

                if (Shape.type === "circle") {

                    // console.log("Shape", Shape);
                    // console.log("Shape.end", Shape.end);

                    if (Shape.r - this.getDistance(startPos, {
                        left:Shape.cx,
                        top:Shape.cy
                    }) < 5) {
                        // Shape.start = Shape.end;//Reset
                        resizing = 1;
                    } else {
                        moving = 1;
                    }

                } else if (Shape.type === "ellipse") {

                    let dx = Shape.cx - startPos.left;
                    let dy = Shape.cy - startPos.top;

                    let theta = Math.atan2(dy, dx); // range (-PI, PI]

                    let a = Shape.rx;
                    let b = Shape.ry;

                    let x = a*a*Math.sin(theta)*Math.sin(theta);
                    let y = b*b*Math.cos(theta)*Math.cos(theta);

                    let r = (a*b)/Math.sqrt(x+y);

                    if (r - this.getDistance(startPos, {
                        left:Shape.cx,
                        top:Shape.cy
                    }) < 5) {
                        // Shape.start = Shape.end;//Reset
                        resizing = 1;
                    } else {
                        moving = 1;
                    }

                } else {

                    moving = 1;

                }

            }

            if (!Shape) {
                Shape = this.createShape(this.type, startPos);
                this.addShape(Shape);
            }

            let move = (e) => {



                let pos = getPos(e);

                let diff = {
                    left : pos.left - lastPos.left,
                    top : pos.top - lastPos.top,
                };

                lastPos = pos;

                if (Shape.type === "path") {

                    if (moving) {

                        Shape.d.forEach(t => {
                            for (var v in t.params) {
                                t.params[v] += diff[v%2 ? "top" : "left"];
                            }
                        });

                    } else {

                        let edges = getEdges(pos, Shape.el);

                        if (edges.length) {
                            pos = edges[0].path[0];
                        }

                        let point = null;
                        for (let m in Shape.d) {
                            if (Shape.d[m].command == "L") {
                                point = Shape.d[m];
                            }
                        }

                        if (point){
                            point.params = [pos.left, pos.top];
                        } else {
                            Shape.d.push({
                                command : "L",
                                params : [pos.left, pos.top]
                            });
                        }

                    }

                    let d = Shape.d.map(function(command) {
                        return command.command + ' ' + command.params.join(',');
                    }).join(' ');

                    Shape.el.setAttribute("d", d);

                } else if (Shape.type === "circle") {

                    if (moving) {

                        Shape.cx += diff.left;
                        Shape.cy += diff.top;

                        Shape.el.setAttribute("cx", Shape.cx);
                        Shape.el.setAttribute("cy", Shape.cy);

                    } else if (resizing) {

                        Shape.r = this.getDistance(pos, {
                            left:Shape.cx,
                            top:Shape.cy
                        });

                        Shape.el.setAttribute("r", Shape.r);

                    } else {

                        Shape.cx = startPos.left;
                        Shape.cy = startPos.top;

                        Shape.r = this.getDistance(startPos, pos);

                        Shape.el.setAttribute("r", Shape.r);

                        Shape.el.setAttribute("cx", Shape.cx);
                        Shape.el.setAttribute("cy", Shape.cy);

                    }

                } else if (Shape.type === "ellipse") {

                    if (moving) {

                        Shape.cx += diff.left;
                        Shape.cy += diff.top;

                        Shape.el.setAttribute("cx", Shape.cx);
                        Shape.el.setAttribute("cy", Shape.cy);

                    } else if (resizing) {

                        Shape.rx += diff.left;
                        Shape.ry += diff.top;

                        Shape.el.setAttribute("rx", Shape.rx);
                        Shape.el.setAttribute("ry", Shape.ry);

                    } else {

                        Shape.rx = Math.abs(pos.left - startPos.left);
                        Shape.ry = Math.abs(pos.top - startPos.top);

                        Shape.cx += diff.left/2;
                        Shape.cy += diff.top/2;

                        Shape.el.setAttribute("rx", Shape.rx);
                        Shape.el.setAttribute("ry", Shape.ry);

                        Shape.el.setAttribute("cx", Shape.cx);
                        Shape.el.setAttribute("cy", Shape.cy);

                    }

                } else if (Shape.type === "line") {

                    if (moving) {

                        Shape.x1 += diff.left;
                        Shape.y1 += diff.top;
                        Shape.x2 += diff.left;
                        Shape.y2 += diff.top;

                    } else {

                        Shape.x2 = pos.left;
                        Shape.y2 = pos.top;

                        Shape.el.setAttribute("x1", Shape.x1);
                        Shape.el.setAttribute("y1", Shape.y1);

                        Shape.el.setAttribute("x2", Shape.x2);
                        Shape.el.setAttribute("y2", Shape.y2);
                    }

                }

            };

            let stop = function(){
                svg.removeEventListener("mousemove", move);
                svg.removeEventListener("mouseup", stop);
                //Update shape preview

            };

            svg.addEventListener("mousemove", move, false);
            svg.addEventListener("mouseup", stop);

        });


        this.svg = svg;
    }

    parsePath(str) {
        let match;
        let commands = /[MmLlSsQqLlHhVvCcSsQqTtAaZz]/g;
        //Get the matches first
        let results = [];
        while ((match = commands.exec(str)) !== null) {
            results.push(match);
        };
        let data = [];
        let digits = /-?[0-9]*\.?\d+/g;
        for (let x=0; x<results.length; x++) {
            //Get the string value without command, and parse float
            let params = (str.substring(results[x].index+1, results[x+1] ? results[x+1].index : str.length).match(digits) || []).map(parseFloat);
            if (false) {
                //Split into chunks of xy params
                let chunks = [];
                let positions = ["left","top"];
                for (let y = 0; y<params.length; y += 2) {
                    let coords = params.slice(y, y + 2);
                    chunks.push(positions.reduce((acc, element, index) => {
                        return {
                            ...acc,
                            [element]: coords[index],
                        };
                    }, {}));
                }
                data.push({
                    command : results[x][0],
                    params : chunks
                });
            } else {
                data.push({
                    command : results[x][0],
                    params : params
                });
            }

        }
        return data;
    }

    addShape(Shape) {
        this.shapes.push(Shape);
        this.svg.dispatchEvent(new CustomEvent("added", { detail: Shape }));
    }

    addShapes(content){
        if (content) {
            this.svg.innerHTML = content;
        }
        this.shapes = [];
        [...this.svg.children].forEach(el => {
            this.addShape(this.parseShape(el));
        });
    }

    moveShape(startIndex, endIndex) {
        if (endIndex > startIndex) {
            this.svg.insertBefore(this.shapes[startIndex].el, this.shapes[endIndex].el.nextSibling);
        } else {
            this.svg.insertBefore(this.shapes[startIndex].el, this.shapes[endIndex].el);
        }
        //Rearrange shapes
        this.shapes.splice(endIndex, 0, this.shapes.splice(startIndex, 1)[0]);
    }

    removeShape(index) {
        let Shape = this.shapes[index];
        Shape.el.remove();
        this.shapes.splice(index, 1);
    }

    createElement(type){
        let el = document.createElementNS("http://www.w3.org/2000/svg", type);
        el.setAttribute("stroke","#000000");
        el.setAttribute("stroke-width",3);
        // el.setAttribute("opacity",.8);
        if (type === "path") {
            el.setAttribute("fill","none");
            el.setAttribute("stroke-linejoin","round");
            el.setAttribute("d","");
        } else if (type === "circle") {
            el.setAttribute("fill","transparent");
            el.setAttribute("cx",0);
            el.setAttribute("cy",0);
            el.setAttribute("r",0);
        } else if (type === "ellipse") {
            el.setAttribute("fill","transparent");
            el.setAttribute("cx",0);
            el.setAttribute("cy",0);
            el.setAttribute("rx",0);
            el.setAttribute("ry",0);
        } else if (type === "line") {
            el.setAttribute("x1",0);
            el.setAttribute("x2",0);
            el.setAttribute("y1",0);
            el.setAttribute("y2",0);
        }
        return el;
    }

    createShape(type, startPos) {
        let Shape = {
            type : type,
            // start : startPos,
            // end : startPos
        };
        Shape.el = this.createElement(type);
        if (type === "path") {
            Shape.d = [];
            if (startPos) {
                Shape.d.push({
                    command:"M",
                    params:[startPos.left, startPos.top]
                });
            }
        } else if (type === "circle") {
            if (startPos) {
                Shape.cx = startPos.left;
                Shape.cy = startPos.top;
            }
            Shape.r = null;
        } else if (type === "ellipse") {
            if (startPos) {
                Shape.cx = startPos.left;
                Shape.cy = startPos.top;
            }
            Shape.rx = null;
            Shape.ry = null;
        } else if (type === "line") {
            if (startPos) {
                Shape.x1 = startPos.left;
                Shape.y1 = startPos.top;
            }
            Shape.x2 = null;
            Shape.y2 = null;
        }
        this.svg.appendChild(Shape.el);
        return Shape;
    }

    parseShape(el){
        let Shape = {
            type : el.nodeName.toLowerCase(),
            el : el
        };
        if (Shape.type === "path") {
            let path = this.parsePath(el.getAttribute("d"));
            Shape.d = path;
        } else if (Shape.type === "circle") {
            Shape.r = +el.getAttribute("r");
            Shape.cx = +el.getAttribute("cx");
            Shape.cy = +el.getAttribute("cy");

        } else if (Shape.type === "ellipse") {
            Shape.rx = +el.getAttribute("rx");
            Shape.ry = +el.getAttribute("ry");
            Shape.cx = +el.getAttribute("cx");
            Shape.cy = +el.getAttribute("cy");
        } else if (Shape.type === "line") {
            Shape.x1 = +el.getAttribute("x1");
            Shape.y1 = +el.getAttribute("y1");
            Shape.x2 = +el.getAttribute("x2");
            Shape.y2 = +el.getAttribute("y2");
        }

        console.log(Shape);
        return Shape;
    }

    getShape(el){
        for (let i = 0; i < this.shapes.length; i++) {
            if (this.shapes[i].el === el) {
                return this.shapes[i];
            }
        }
    }

    getDistance(a, b){
        let startx = a.left - b.left;
        let starty = a.top - b.top;
        return Math.sqrt(startx*startx+starty*starty);
    }



}

