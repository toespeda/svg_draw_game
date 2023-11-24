class Draw {

    svg = null;

    shapes = [];

    type = "line";

    draw = 0;

    action = "move";

    constructor(svg) {

        svg.addEventListener("mousedown", (e) => {

            console.log({
                "type" : this.type,
                "draw" : this.draw,
                "action" : this.action
            });

            let Shape = null;

            // let moving = 0;

            // let resizing = 0;

            let offset = svg.getBoundingClientRect();

            let getPos = function(e){
                return {
                    left : e.clientX - offset.left,
                    top : e.clientY - offset.top
                };
            };

            let node = false;

            let startPos = getPos(e);

            let lastPos = startPos;

            if (this.action === "node") {

                // console.log("Do node edit");

                let edges = this.getEdges(startPos);

                if (edges.length) {

                    console.log("Found edges", edges);

                    if (this.draw) {

                        //Shape = this.addShape(this.type, edges[0].path[0]);

                    } else {

                        Shape = edges[0].shape;

                        // Closest first
                        if (Shape.type === "path") {

                            node = edges[0];

                            // for (let m in Shape.d) {
                            //     if (Shape.d[m].command === "M") {
                            //         Shape.d[m].params[0] = edges[0].path[1].left;
                            //         Shape.d[m].params[1] = edges[0].path[1].top;
                            //     }
                            //     if (Shape.d[m].command === "L") {
                            //         Shape.d[m].params[0] = edges[0].path[0].left;
                            //         Shape.d[m].params[1] = edges[0].path[0].top;
                            //     }
                            // }
                        } else if (Shape.type === "line") {

                            node = this.getShapeAttr(Shape, edges[0].position);

                            // Shape.x1 = edges[0].path[1].left;
                            // Shape.y1 = edges[0].path[1].top;
                            // Shape.x2 = edges[0].path[0].left;
                            // Shape.y2 = edges[0].path[0].top;
                        }

                    }

                } else {

                    // console.log("check path", e.target);

                    //Test quadratic curve on lines
                    if (e.target.nodeName.match(/(path|line)/)) {

                        Shape = this.getShapeByElement(e.target);

                        if (Shape.type !== "path") {

                            this.convertToPath(Shape);

                            //No edges found, convert L to Q

                            Shape.d[1].command = "Q";
                            Shape.d[1].params = [...[startPos.left, startPos.top], ...Shape.d[1].params];

                            Shape.el.setAttribute("d", Shape.d.map(function(command) {
                                return command.command + ' ' + command.params.join(',');
                            }).join(' '));


                            // Make the control point the handler
                            node = {
                                index : 1,
                                start : 0
                            };

                        } else {

                            let nodes = this.getClosestNode(Shape, startPos);

                            if (nodes.length) {
                                node = nodes[0];
                            }

                        }

                    }

                }



            } else if (!this.draw && e.target.nodeName.match(/(path|circle|ellipse|line)/)) {

                Shape = this.getShapeByElement(e.target);

                if (Shape.type === "circle") {

                    if (Shape.r - this.getDistance(startPos, {
                        left:Shape.cx,
                        top:Shape.cy
                    }) < 5) {
                        this.action = "resize";
                        this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
                        // resizing = 1;
                    } else {
                        this.action = "move";
                        this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
                        // moving = 1;
                    }

                } else if (Shape.type === "ellipse") {

                    let dx = Shape.cx - startPos.left;
                    let dy = Shape.cy - startPos.top;

                    let theta = Math.atan2(dy, dx); // range (-PI, PI]

                    let a = Shape.rx;
                    let b = Shape.ry;

                    let x = a * a * Math.sin(theta) * Math.sin(theta);
                    let y = b * b * Math.cos(theta) * Math.cos(theta);

                    let r = (a * b) / Math.sqrt(x + y);

                    if (r - this.getDistance(startPos, {
                        left: Shape.cx,
                        top: Shape.cy
                    }) < 5) {
                        // resizing = 1;
                        this.action = "resize";
                        this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
                    } else {
                        this.action = "move";
                        this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
                        // moving = 1;
                    }

                } else if (Shape.type === "path") {

                    // resizing = 1;
                    //this.action = "resize";
                    //this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));

                    // this.action = "move";
                    // this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));

                    //console.log("Is path", Shape.el.getBBox(), Shape.el.getBoundingClientRect());

                } else {

                    //this.action = "move"
                    //this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));

                    // moving = 1;

                }

            }

            if (!Shape && this.action === "draw") {

                // Shape = this.createShape(this.type, startPos);
                Shape = this.addShape(this.type, startPos);

            }

            if (!Shape) {
                return;
            }

            if (e.ctrlKey) {
                Shape = this.duplicateShape(Shape);
            }




            let move = (e) => {

                let pos = getPos(e);

                let diff = {
                    left : pos.left - lastPos.left,
                    top : pos.top - lastPos.top,
                };

                let diffP = {
                    left : pos.left / lastPos.left,
                    top : pos.top / lastPos.top,
                };

                lastPos = pos;

                if (Shape.type === "path") {

                    if (this.action === "move") {

                        Shape.d.forEach(t => {
                            if (t.command.match(/[A]/)) {

                                for (var v in t.params) {
                                    if (v%7 === 5) {
                                        t.params[v] += diff.left;
                                    } else if (v%7 === 6) {
                                        t.params[v] += diff.top;
                                    }
                                }

                            } else if (t.command.match(/[V]/)) {

                                t.params[0] += diff.top;

                            } else if (t.command.match(/[H]/)) {

                                t.params[0] += diff.left;

                            } else {
                                for (var v in t.params) {
                                    t.params[v] += diff[v%2 ? "top" : "left"];
                                }
                            }
                        });

                    } else if (this.action === "resize") {

                        // let bb = Shape.el.getBoundingClientRect();
                        //
                        // let center = {
                        //     left : bb.x + (bb.width/2),
                        //     top : bb.y + (bb.height/2)
                        // };

                        Shape.d.forEach(t => {

                            if (t.command.match(/[A]/)) {

                                for (var v in t.params) {
                                    if (v % 7 === 0) {
                                        t.params[v] *= diffP.left;
                                    } else if (v % 7 === 1) {
                                        t.params[v] *= diffP.top;
                                    } else if (v % 7 === 5) {
                                        t.params[v] *= diffP.left;
                                    } else if (v % 7 === 6) {
                                        t.params[v] *= diffP.top;
                                    }
                                }

                                // t.params[0] *= diffP.left;
                                // t.params[1] *= diffP.top;
                                // t.params[5] *= diffP.left;
                                // t.params[6] *= diffP.top;

                            } else if (t.command.match(/[V]/)) {

                                t.params[0] *= diffP.top;

                            } else if (t.command.match(/[H]/)) {

                                t.params[0] *= diffP.left;

                            } else {

                                for (var v in t.params) {
                                    t.params[v] *= diffP[v % 2 ? "top" : "left"];
                                    //t.params[v] -= diff[v%2 ? "top" : "left"];
                                }

                            }
                        });


                    } else {

                        if (node) {

                            Shape.d[node.index].params.splice(node.start, 2, pos.left, pos.top);

                            // Shape.d[1].params[0] = pos.left;
                            // Shape.d[1].params[1] = pos.top;


                        } else {

                            //TODO! Needs rewrite

                            let edges = this.getEdges(pos, Shape.el);

                            if (edges.length) {
                                //pos = edges[0].path[0];
                            }

                            let point = null;
                            for (let m in Shape.d) {
                                if (Shape.d[m].command === "L") {
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

                    }

                    let d = Shape.d.map(function(command) {
                        return command.command + ' ' + command.params.join(',');
                    }).join(' ');

                    Shape.el.setAttribute("d", d);

                } else if (Shape.type === "circle") {

                    if (this.action === "move") {

                        Shape.cx += diff.left;
                        Shape.cy += diff.top;

                        Shape.el.setAttribute("cx", Shape.cx);
                        Shape.el.setAttribute("cy", Shape.cy);

                    } else if (this.action === "resize") {

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

                    if (this.action === "move") {

                        Shape.cx += diff.left;
                        Shape.cy += diff.top;

                        Shape.el.setAttribute("cx", Shape.cx);
                        Shape.el.setAttribute("cy", Shape.cy);

                    } else if (this.action === "resize") {

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

                    let edges = this.getEdges(pos, Shape.el);

                    if (edges.length) {
                        pos = {
                            left: edges[0].params[0],
                            top: edges[0].params[1]
                        }
                        //pos = edges[0].path[0];
                    }

                    if (this.action === "move") {

                        Shape.x1 += diff.left;
                        Shape.y1 += diff.top;
                        Shape.x2 += diff.left;
                        Shape.y2 += diff.top;

                    } else {

                        if (node) {

                            Shape[node.left] = pos.left;
                            Shape[node.top] = pos.top;

                        } else {
                            Shape.x2 = pos.left;
                            Shape.y2 = pos.top;
                        }



                    }

                    Shape.el.setAttribute("x1", Shape.x1);
                    Shape.el.setAttribute("y1", Shape.y1);

                    Shape.el.setAttribute("x2", Shape.x2);
                    Shape.el.setAttribute("y2", Shape.y2);

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

    // testProximity(pos, c){
    //
    //     if (!c.type.match(/(line|path)/)) {//Temp
    //         return null;
    //     }
    //
    //     let start = null;
    //     let end = null;
    //
    //     if (c.type === "path" && c.d.length === 2) { // For now, only M-L paths are allowed
    //
    //         for (let m in c.d) {
    //             if (c.d[m].command === "M") {
    //                 start = {
    //                     left : c.d[m].params[0],
    //                     top : c.d[m].params[1]
    //                 };
    //             }
    //             if (c.d[m].command === "L") {
    //                 end = {
    //                     left : c.d[m].params[0],
    //                     top : c.d[m].params[1]
    //                 };
    //             }
    //         }
    //
    //     } else if (c.type === "line") {
    //         start = {
    //             left : c.x1,
    //             top : c.y1
    //         };
    //         end = {
    //             left : c.x2,
    //             top : c.y2
    //         };
    //     }
    //
    //     if (start && end) {
    //
    //         let d = {
    //             start : this.getDistance(pos, start),
    //             end : this.getDistance(pos, end)
    //         }
    //
    //         if (d.start < d.end && d.start < 10) {
    //             return [start, end];
    //         } else if (d.end < 10) {
    //             return [end, start];
    //         } else {
    //
    //         }
    //     }
    //
    //     return null;
    //
    // }

    getShapePos(shape, pos){
        //Math.pow is slow
        let positions = [];
        if (shape.type==="line") {
            let startx = shape.x1 - pos.left;
            let starty = shape.y1 - pos.top;
            positions.push({
                params:[shape.x1, shape.y1],
                position:"start",
                distance:Math.sqrt(startx*startx+starty*starty)
            });
            let endx = shape.x2 - pos.left;
            let endy = shape.y2 - pos.top;
            positions.push({
                params:[shape.x2, shape.y2],
                position:"end",
                distance:Math.sqrt(endx*endx+endy*endy)
            });
        }
        positions.sort(function(a, b){
            return a.distance - b.distance;
        });
        return positions;
    }

    getShapeAttr(Shape, params){

        if (Shape.type==="line") {

            return params === "start" ? {
                    left : "x1",
                    top : "y1"
                } :
                {
                    left : "x2",
                    top : "y2"
                };
        }

        return null;


    }

    getEdges(pos, shape) {
        // console.log("Get edges");

        let s = [];

        let positions = [];

        for (let i = 0; i < this.shapes.length; i++) {
            if (!shape || this.shapes[i].el !== shape) {//!this.shapes[i].el.classList.contains("hidden") && ()

                if (this.shapes[i].type==="path") {
                    let nodePositions = this.getClosestNode(this.shapes[i], pos);
                    if (nodePositions.length) {
                        let closest = nodePositions[0];
                        closest.shape = this.shapes[i];
                        positions.push(closest);
                    }

                } else if (this.shapes[i].type==="line") {
                    let shapePositions = this.getShapePos(this.shapes[i], pos);
                    if (shapePositions.length) {
                        let closest = shapePositions[0];
                        closest.shape = this.shapes[i];
                        positions.push(closest);
                    }
                }

                // let proximity = this.testProximity(pos, this.shapes[i]);
                // if (proximity) {
                //     s.push({
                //         shape : this.shapes[i],
                //         path : proximity
                //     });
                // }
                //console.log("proximity", proximity);
            }
        }
        positions.sort(function(a, b){
            return a.distance - b.distance;
        });

        console.log(positions);

        if (positions[0].distance < 10) {
            return positions;
        } else {
            return [];
        }

        // return s;
    }

    getClosestNode(Shape, startPos) {
        let positions = this.getNodePos(Shape);

        for (let m in positions) {
            let position = positions[m];
            let nodePos = Shape.d[position.index].params.slice(position.start, position.start + 2);
            let startx = nodePos[0] - startPos.left;
            let starty = nodePos[1] - startPos.top;
            position.params = nodePos;
            position.distance = Math.sqrt(startx*startx+starty*starty);
        }
        positions.sort(function(a, b){
            return a.distance - b.distance;
        });
        return positions;
    }

    getNodePos(Shape) {

        let positions = [];

        for (let m=0; m<Shape.d.length; m++) {

            switch (Shape.d[m].command) {
                case "M" :
                    positions.push({
                        // el : Shape.el,
                        // params : Shape.d[m].params,
                        command : "M",
                        index : m,
                        start : 0
                    });
                    break;
                case "L" :
                    positions.push({
                        command : "L",
                        index : m,
                        start : 0
                    });
                    break;
                case "S" :
                    break;
                case "Q" :
                    positions.push({
                        command : "Q",
                        index : m,
                        start : 0
                    });
                    positions.push({
                        command : "Q",
                        index : m,
                        start : 2
                    });
                    break;
                case "L" :
                    break;
                case "H" :
                    break;
                case "V" :
                    break;
                case "C" :
                    break;
                case "S" :
                    break;
                case "Q" :
                    break;
                case "T" :
                    break;
                case "A" :
                    break;
            }

        }

        //console.log("Positions", positions);

        return positions;

    };

    set(data){
        for (var i in data) {
            this[i] = data[i];
        }
    }

    parsePath(str) {
        let match;
        let commands = /[MmLlSsQqLlHhVvCcSsQqTtAaZz]/g;
        //Get the matches first
        let results = [];
        while ((match = commands.exec(str)) !== null) {
            results.push(match);
        }
        let data = [];
        let digits = /-?[0-9]*\.?\d+/g;
        for (let x=0; x<results.length; x++) {
            //Get the string value without command, and parse float
            let params = (str.substring(results[x].index+1, results[x+1] ? results[x+1].index : str.length).match(digits) || []).map(parseFloat);
            // if (false) {
            //     //Split into chunks of xy params
            //     let chunks = [];
            //     let positions = ["left","top"];
            //     for (let y = 0; y<params.length; y += 2) {
            //         let coords = params.slice(y, y + 2);
            //         chunks.push(positions.reduce((acc, element, index) => {
            //             return {
            //                 ...acc,
            //                 [element]: coords[index],
            //             };
            //         }, {}));
            //     }
            //     data.push({
            //         command : results[x][0],
            //         params : chunks
            //     });
            // } else {
                data.push({
                    command : results[x][0],
                    params : params
                });
            // }

        }
        return data;
    }

    duplicateShape(Shape){
        let duplicate = {...Shape};
        duplicate.el = Shape.el.cloneNode(true);
        this.svg.insertBefore(duplicate.el, Shape.el.nextSibling);
        this.shapes.push(duplicate);
        this.svg.dispatchEvent(new CustomEvent("added", { detail: duplicate }));
        return duplicate;
    }

    addShape(Shape, position) {
        if (Shape.constructor.name === "String") {
            Shape = this.createShape(Shape, position);
        } else {
            Shape = this.parseShape(Shape);
        }
        // console.log(Shape);
        this.shapes.push(Shape);
        this.svg.dispatchEvent(new CustomEvent("added", { detail: Shape }));
        return Shape;
    }

    init(content){
        this.svg.innerHTML = content || "";
        this.shapes = [];
        [...this.svg.children].forEach(el => {
            this.addShape(el);
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

    ellipseToPath(merge) {
        let d = [];
        //Absolute
        d.push({
            command:"M",
            params: [merge.cx, merge.cy]
        });
        d.push({
            command:"M",
            params: [merge.cx + merge.rx, merge.cy]
        });
        d.push({
            command:"A",
            params: [merge.rx, merge.ry, 0, 1, 0, merge.cx - merge.rx, merge.cy]
        });
        d.push({
            command:"A",
            params: [merge.rx, merge.ry, 0, 1, 0, merge.cx + merge.rx, merge.cy]
        });
        return d;
    }

    circleToPath(merge) {
        let d = [];
        //Relative
        // d.push({
        //     command:"M",
        //     params: [merge.cx, merge.cy]
        // });
        // d.push({
        //     command:"m",
        //     params: [merge.r, 0]
        // });
        // d.push({
        //     command:"a",
        //     params: [merge.r, merge.r, 0, 1, 0, -merge.r*2, 0]
        // });
        // d.push({
        //     command:"a",
        //     params: [merge.r, merge.r, 0, 1, 0, merge.r*2, 0]
        // });
        //Absolute
        d.push({
            command:"M",
            params: [merge.cx, merge.cy]
        });
        d.push({
            command:"M",
            params: [merge.cx + merge.r, merge.cy]
        });
        d.push({
            command:"A",
            params: [merge.r, merge.r, 0, 1, 0, merge.cx - merge.r, merge.cy]
        });
        d.push({
            command:"A",
            params: [merge.r, merge.r, 0, 1, 0, merge.cx + merge.r, merge.cy]
        });
        return d;
    }

    lineToPath(merge) {
        let d = [];
        d.push({
            command:"M",
            params: [merge.x1, merge.y1]
        });
        d.push({
            command:"L",
            params: [merge.x2, merge.y2]
        });
        return d;
    }

    convertToPath(Shape) {
        Shape.d = this[Shape.type + "ToPath"](Shape);
        Shape.type = "path";
        let path = this.createElement("path");
        Shape.el.replaceWith(path);
        Shape.el = path;

    }

    mergeShape(index, count) {

        let Shape = this.shapes[index];

        if (Shape.type !== "path") {
            this.convertToPath(Shape);
            Shape.el.setAttribute("d", Shape.d.map(function(command) {
                return command.command + ' ' + command.params.join(',');
            }).join(' '));
        }

        if (Shape.type !== "path") {
            return false;
        }

        if (!count) {
            return false;
        }

        for (let x=1;x<count+1;x++) {
            let merge = this.shapes[index+x];
            if (merge) {
                if (merge.type==="path") {
                    Shape.d = Shape.d.concat(merge.d);
                } else {
                    Shape.d = Shape.d.concat(this[merge.type + "ToPath"](merge));
                }
                merge.el.remove();
            }
        }

        this.shapes.splice(index+1, count);

        Shape.el.setAttribute("d", Shape.d.map(function(command) {
            return command.command + ' ' + command.params.join(',');
        }).join(' '));

        return true;

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
            el.setAttribute("fill","transparent");
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
            Shape.d = this.parsePath(el.getAttribute("d"));
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
        // console.log(Shape);
        return Shape;
    }

    getShapeByElement(el){
        for (let i = 0; i < this.shapes.length; i++) {
            if (this.shapes[i].el === el) {
                return this.shapes[i];
            }
        }
    }

    getShapeByIndex(index){
        return index > -1 ? this.shapes[index] : null;
    }

    getDistance(a, b){
        let startx = a.left - b.left;
        let starty = a.top - b.top;
        return Math.sqrt(startx*startx+starty*starty);
    }

    reverseOrder() {
        for (var i = 1; i < this.svg.childNodes.length; i++){
            this.svg.insertBefore(this.svg.childNodes[i], this.svg.firstChild);
        }
        this.shapes.reverse();
    }

}

