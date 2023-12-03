class Draw {

    svg = null;
    shapes = [];
    type = "line";
    action = "move";

    constructor(svg) {

        this.svg = svg;

        svg.addEventListener("mousedown", (e) => {

            console.log({
                "type" : this.type,
                "action" : this.action
            });

            let Shape = null;
            let offset = this.svg.getBoundingClientRect();

            let mousePos = function(e){
                return [e.clientX - offset.left, e.clientY - offset.top];
            };

            let nodeHandle = false;
            let startPos = mousePos(e);
            let offsetPos = [0,0];
            let lastPos = startPos;
            //let basePos = null;

            if (this.action === "node") {

                //quadratic curve on lines
                if (e.target.nodeName.match(/(path|line)/)) {

                    Shape = this.getShapeByElement(e.target);
                    let positions = this.getClosestShapePos(Shape, startPos);

                    // console.log(positions);
                    //console.log("nodeHandle", positions[0]);

                    if (positions.length) {// && positions[0].distance < 10

                        if (Shape.type === "path") {

                            nodeHandle = positions[0];
                            offsetPos = [nodeHandle.params[0] - startPos[0], nodeHandle.params[1] - startPos[1]];

                            if (nodeHandle.distance > 10) {

                                if (nodeHandle.command === "L") {

                                    console.log("Shape.d[nodeHandle.index]", Shape.d[nodeHandle.index]);
                                    //
                                    // Shape.d[nodeHandle.index].command = "Q";
                                    // Shape.d[nodeHandle.index].params = [...startPos, ...Shape.d[nodeHandle.index].params];
                                    //
                                    // this.redrawShape(Shape);

                                } else if (Shape.d[nodeHandle.index+1]?.command === "L") {

                                    // nodeHandle = {
                                    //     index : nodeHandle.index+1,
                                    //     start : 0
                                    // };
                                    //
                                    // Shape.d[nodeHandle.index].command = "Q";
                                    // Shape.d[nodeHandle.index].params = [...startPos, ...Shape.d[nodeHandle.index].params];
                                    //
                                    // this.redrawShape(Shape);

                                }

                            }

                        } else if (Shape.type === "line") {

                            if (positions[0].distance < 10) {

                                nodeHandle = this.getShapeAttr(Shape, positions[0].position);

                            } else {

                                this.convertToPath(Shape);

                                //Convert L to Q

                                Shape.d[1].command = "Q";
                                Shape.d[1].params = [...startPos, ...Shape.d[1].params];

                                this.redrawShape(Shape);

                                // Make the control point the handler
                                nodeHandle = {
                                    index : 1,
                                    start : 0
                                };
                            }

                        }

                    }

                } else {

                    let edge = this.getClosestPos(startPos);

                    if (edge.length) {

                        Shape = edge[0].shape;

                        // Closest first
                        if (Shape.type === "path") {
                            nodeHandle = edge[0];
                        } else if (Shape.type === "line") {
                            nodeHandle = this.getShapeAttr(Shape, edge[0].position);
                        }

                    }

                }

            } else if (this.action === "draw") {

                let edge = this.getClosestPos(startPos);

                if (edge.length) {
                    startPos = edge[0].params;
                }

            } else if (e.target.nodeName.match(/(path|circle|ellipse|line)/)) {

                Shape = this.getShapeByElement(e.target);
                //console.log("Shape", Shape);

                //basePos = Shape.el.getBoundingClientRect();
                //console.log(Shape.el.getBoundingClientRect(), Shape.el.getBBox());
                this.setActionByPos(Shape, startPos);

            }

            if (!Shape && this.action === "draw") {
                Shape = this.addShape(this.type, startPos);
            }

            if (!Shape) {
                return;
            }

            if (e.ctrlKey) {
                Shape = this.duplicateShape(Shape);
            }

            Shape.basePos = Shape.el.getBoundingClientRect();

            // let guide = document.createElement("div");
            // guide.style.top = Shape.basePos.y + "px";
            // guide.style.left = Shape.basePos.x + "px";
            // guide.style.width = Shape.basePos.width + "px";
            // guide.style.height = Shape.basePos.height + "px";
            // guide.style.pointerEvents = "none";
            // guide.style.outline = "1px solid orange";
            // guide.classList.add("guide");
            // svg.parentNode.insertBefore(guide, svg);

            let move = (e) => {

                let pos = mousePos(e);

                pos[0] += offsetPos[0];
                pos[1] += offsetPos[1];

                let edge = this.getClosestPos(pos, Shape.el);

                if (edge.length) {
                    pos = edge[0].params;
                }

                let diff = [pos[0] - lastPos[0], pos[1] - lastPos[1]];
                let diffP = [(pos[0] - Shape.basePos.x) / (lastPos[0] - Shape.basePos.x), (pos[1] - Shape.basePos.y) / (lastPos[1] - Shape.basePos.y)];

                if (this.action === "move") {

                    this.moveShape(Shape, diff);

                } else if (this.action === "resize") {

                    this.resizeShape(Shape, diffP, pos, diff);

                } else {

                    if (Shape.type === "path") {

                        Shape.d[nodeHandle.index].params.splice(nodeHandle.start, 2, pos[0], pos[1]);

                    } else if (Shape.type === "circle") {

                        Shape.cx = startPos[0];
                        Shape.cy = startPos[1];
                        Shape.r = this.getDistance(startPos, pos);

                    } else if (Shape.type === "ellipse") {

                        Shape.rx = Math.abs(pos[0] - startPos[0]);
                        Shape.ry = Math.abs(pos[1] - startPos[1]);

                        // Shape.cx += diff[0]/2;
                        // Shape.cy += diff[1]/2;

                    } else if (Shape.type === "line") {

                        if (nodeHandle) {

                            Shape[nodeHandle[0]] = pos[0];
                            Shape[nodeHandle[1]] = pos[1];

                        } else {
                            Shape.x2 = pos[0];
                            Shape.y2 = pos[1];
                        }

                    }

                }

                this.redrawShape(Shape);

                lastPos = pos;

            };

            let stop = function(){
                svg.removeEventListener("mousemove", move);
                svg.removeEventListener("mouseup", stop);
                // guide.remove();
                //Update shape preview
            };

            svg.addEventListener("mousemove", move, false);
            svg.addEventListener("mouseup", stop);

        });

    }

    setActionByPos(Shape, startPos){
        if (Shape.type === "circle") {

            if (Shape.r - this.getDistance(startPos, [Shape.cx, Shape.cy]) < 5) {
                this.action = "resize";
                this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
            } else {
                this.action = "move";
                this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
            }

        } else if (Shape.type === "ellipse") {

            let dx = Shape.cx - startPos[0];
            let dy = Shape.cy - startPos[1];

            let theta = Math.atan2(dy, dx); // range (-PI, PI]

            let a = Shape.rx;
            let b = Shape.ry;

            let x = a * a * Math.sin(theta) * Math.sin(theta);
            let y = b * b * Math.cos(theta) * Math.cos(theta);

            let r = (a * b) / Math.sqrt(x + y);

            if (r - this.getDistance(startPos, [Shape.cx, Shape.cy]) < 5) {
                this.action = "resize";
                this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
            } else {
                this.action = "move";
                this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
            }

        }
    }

    moveShape(Shape, diff){
        if (Shape.type === "path") {

            Shape.d.forEach(t => {

                if (t.command.match(/[Aa]/)) {

                    for (let v in t.params) {
                        if (v%7 === 5) {
                            t.params[v] += diff[0];
                        } else if (v%7 === 6) {
                            t.params[v] += diff[1];
                        }
                    }

                } else if (t.command.match(/[Vv]/)) {

                    t.params[0] += diff[1];

                } else if (t.command.match(/[Hh]/)) {

                    t.params[0] += diff[0];

                } else if (t.command.match(/[MmLCSQT]/)) {
                    for (let v in t.params) {
                        t.params[v] += diff[v%2 ? 1 : 0];
                    }
                } else if (t.command.match(/[lcsqt]/)) {

                }

            });

        } else if (Shape.type === "circle") {

            Shape.cx += diff[0];
            Shape.cy += diff[1];

        } else if (Shape.type === "ellipse") {

            Shape.cx += diff[0];
            Shape.cy += diff[1];

        } else if (Shape.type === "line") {

            Shape.x1 += diff[0];
            Shape.y1 += diff[1];
            Shape.x2 += diff[0];
            Shape.y2 += diff[1];

        }

    }

    redrawShape(Shape) {
        if (Shape.type === "path") {
            Shape.el.setAttribute("d", Shape.d.map(function(command) {
                return command.command + ' ' + command.params.join(',');
            }).join(' '));
        } else if (Shape.type === "circle") {
            Shape.el.setAttribute("r", Shape.r);
            Shape.el.setAttribute("cx", Shape.cx);
            Shape.el.setAttribute("cy", Shape.cy);
        } else if (Shape.type === "ellipse") {
            Shape.el.setAttribute("rx", Shape.rx);
            Shape.el.setAttribute("ry", Shape.ry);
            Shape.el.setAttribute("cx", Shape.cx);
            Shape.el.setAttribute("cy", Shape.cy);
        } else if (Shape.type === "line") {
            Shape.el.setAttribute("x1", Shape.x1);
            Shape.el.setAttribute("y1", Shape.y1);
            Shape.el.setAttribute("x2", Shape.x2);
            Shape.el.setAttribute("y2", Shape.y2);
        }
    }

    resizeShape(Shape, diffP, pos, diff){

        if (Shape.type === "path") {

            Shape.d.forEach(t => {

                if (t.command.match(/[A]/)) {

                    for (let v in t.params) {
                        let m = v % 7;
                        if (m === 0) {
                            t.params[v] *= diffP[0];
                        } else if (m === 1) {
                            t.params[v] *= diffP[1];
                        } else if (m === 5) {
                            t.params[v] = Shape.basePos.x + ((t.params[v] - Shape.basePos.x) * diffP[0]);
                        } else if (m === 6) {
                            t.params[v] = Shape.basePos.y + ((t.params[v] - Shape.basePos.y) * diffP[1]);
                        }
                    }

                } else if (t.command.match(/[a]/)) {

                    for (let v in t.params) {
                        let m = v % 7;
                        if (m === 0 || m === 5) {
                            t.params[v] *= diffP[0];
                        } else if (m === 1 || m === 6) {
                            t.params[v] *= diffP[1];
                        }
                    }

                } else if (t.command.match(/[V]/)) {

                    t.params[0] = Shape.basePos.y + ((t.params[0] - Shape.basePos.y) * diffP[1]);

                } else if (t.command.match(/[v]/)) {

                    t.params[0] *= diffP[1];

                } else if (t.command.match(/[H]/)) {

                    t.params[0] = Shape.basePos.x + ((t.params[0] - Shape.basePos.x) * diffP[0]);

                } else if (t.command.match(/[h]/)) {

                    t.params[0] *= diffP[0];

                } else if (t.command.match(/[MLCSQT]/)) {

                    for (let v in t.params) {
                        if (v % 2) {
                            t.params[v] = Shape.basePos.y + ((t.params[v] - Shape.basePos.y) * diffP[1]);
                        } else {
                            t.params[v] = Shape.basePos.x + ((t.params[v] - Shape.basePos.x) * diffP[0]);
                        }
                    }

                } else if (t.command.match(/[mlcsqt]/)) {

                    for (let v in t.params) {
                        t.params[v] *= diffP[v % 2 ? 1 : 0];
                    }

                }

            });

        } else if (Shape.type === "circle") {

            Shape.r = this.getDistance(pos, [Shape.cx, Shape.cy]);

        } else if (Shape.type === "ellipse") {

            Shape.rx += diff[0];
            Shape.ry += diff[1];

        } else if (Shape.type === "line") {

        }

    }

    getShapePos(shape) {

        let positions = [];

        if (shape.type === "path") {//TODO: Get relative positions

            for (let m=0; m<shape.d.length; m++) {

                let paramSize = 0

                switch (shape.d[m].command) {
                    case "M" :
                        positions.push({
                            params : shape.d[m].params.slice(0, 2),
                            command : "M",
                            index : m,
                            start : 0
                        });
                        break;
                    case "L" :

                        paramSize = 2;//(0-2) End point
                        for (let i = 0; i < shape.d[m].params.length; i += paramSize) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + paramSize),
                                command : "L",
                                index : m,
                                start : i
                            });
                        }
                        break;
                    case "S" :
                        paramSize = 2;// (0-2,2-4) Shifted current point, end point
                        for (let i = 0; i < shape.d[m].params.length; i += paramSize) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + paramSize),
                                command : "S",
                                index : m,
                                start : i
                            });
                        }
                        break;
                    case "Q" :
                        paramSize = 2;// (0-2,2-4) Control point, end point
                        for (let i = 0; i < shape.d[m].params.length; i += paramSize) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + paramSize),
                                command : "Q",
                                index : m,
                                start : i
                            });
                        }
                        break;
                    case "H" :
                        break;
                    case "V" :
                        break;
                    case "C" :
                        paramSize = 2;// (0-2,2-4,4-6) Start control point, end control point, end point
                        for (let i = 0; i < shape.d[m].params.length; i += paramSize) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + paramSize),
                                command : "Q",
                                index : m,
                                start : i
                            });
                        }
                        break;
                    case "T" :
                        paramSize = 2;//(0-2) End point
                        for (let i = 0; i < shape.d[m].params.length; i += paramSize) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + paramSize),
                                command : "T",
                                index : m,
                                start : i
                            });
                        }
                        break;
                    case "A" :
                        break;
                }

            }

        } else if (shape.type === "line") {
            positions.push({
                params:[shape.x1, shape.y1],
                position:"start"
            });
            positions.push({
                params:[shape.x2, shape.y2],
                position:"end"
            });
        }

        return positions;
    }

    getShapePosDistance(positions, pos){
        //Math.pow is slow
        for (let m in positions) {
            let position = positions[m];
            let startx = position.params[0] - pos[0];
            let starty = position.params[1] - pos[1];
            position.distance = Math.sqrt(startx*startx+starty*starty);
        }
    }

    getClosestShapePos(shape, pos){
        let positions = this.getShapePos(shape);
        this.getShapePosDistance(positions, pos);
        positions.sort(function(a, b){
            return a.distance - b.distance;
        });
        return positions;
    }

    getShapeAttr(Shape, params){
        if (Shape.type==="line") {
            return params === "start" ? ["x1", "y1"] : ["x2", "y2"];
        }
        return null;
    }

    getClosestPos(pos, shape) {
        let positions = [];
        for (let i = 0; i < this.shapes.length; i++) {
            if (!shape || this.shapes[i].el !== shape) {//!this.shapes[i].el.classList.contains("hidden") && ()
                let shapePositions = this.getClosestShapePos(this.shapes[i], pos);
                if (shapePositions.length) {
                    let closest = shapePositions[0];
                    closest.shape = this.shapes[i];
                    positions.push(closest);
                }
            }
        }
        positions.sort(function(a, b){
            return a.distance - b.distance;
        });
        if (positions.length && positions[0].distance < 10) {
            return positions;
        } else {
            return [];
        }
    }

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
            data.push({
                command : results[x][0],
                params : params
            });
        }
        return data;
    }

    duplicateShape(Shape){
        let duplicate = {...Shape};
        duplicate.el = Shape.el.cloneNode(true);
        Shape.el.parentNode.insertBefore(duplicate.el, Shape.el.nextSibling);
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
        this.shapes.push(Shape);
        this.svg.dispatchEvent(new CustomEvent("added", { detail: Shape }));
        return Shape;
    }

    addShapes(el){
        [...el.children].forEach(c => {
            this.addShape(c);
            if (c.children.length) {
                this.addShapes(c);
            }
        });
    }

    init(content){
        if (content !== undefined) {
            this.svg.innerHTML = content || "";
        }
        this.shapes = [];
        this.addShapes(this.svg);
        this.svg.dispatchEvent(new CustomEvent("init"));
    }

    shapeStack(startIndex, endIndex, startContainer, endContainer) {

        startContainer = startContainer || this.svg;
        endContainer = endContainer || this.svg;

        if (endIndex > startIndex) {
            endContainer.insertBefore(startContainer.children[startIndex], endContainer.children[endIndex].nextSibling);
        } else {
            endContainer.insertBefore(startContainer.children[startIndex], endContainer.children[endIndex]);
        }

        // //Rearrange shapes
        // this.shapes.splice(endIndex, 0, this.shapes.splice(startIndex, 1)[0]);
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

    mergeAll(){
        for (let x=0;x<this.shapes.length;x++) {
            let Shape = this.shapes[x];
            let positions = this.getShapePos(Shape);
            for (let x=0; x<positions.length; x++) {

            }
        }
    }

    mergeShape(index, count) {

        if (typeof index !== "number") {
            index = this.getShapeIndexByElement(index);
        }

        let Shape = this.shapes[index];

        if (Shape.type !== "path") {
            this.convertToPath(Shape);
            this.redrawShape(Shape);
        }

        if (Shape.type !== "path") {
            return false;
        }

        if (!count) {
            return false;
        }

        for (let x=0;x<count;x++) {
            index = this.getShapeIndexByElement(Shape.el.nextElementSibling);
            let merge = this.shapes[index];
            if (merge) {
                if (merge.type==="path") {
                    Shape.d = Shape.d.concat(merge.d);
                } else {
                    Shape.d = Shape.d.concat(this[merge.type + "ToPath"](merge));
                }
                merge.el.remove();
                this.shapes.splice(index, 1);
            }
        }



        // for (let x=1;x<count+1;x++) {
        //     let merge = this.shapes[index+x];
        //     if (merge) {
        //         if (merge.type==="path") {
        //             Shape.d = Shape.d.concat(merge.d);
        //         } else {
        //             Shape.d = Shape.d.concat(this[merge.type + "ToPath"](merge));
        //         }
        //         merge.el.remove();
        //     }
        // }
        //
        // this.shapes.splice(index+1, count);




        this.redrawShape(Shape);

        return true;

    }

    removeShape(index) {
        if (typeof index !== "number") {
            index = this.getShapeIndexByElement(index);
        }
        if (index > -1) {
            let Shape = this.shapes[index];
            Shape.el.remove();
            this.shapes.splice(index, 1);
        }
    }

    createElement(type){
        let el = document.createElementNS("http://www.w3.org/2000/svg", type);
        el.setAttribute("stroke","#000000");
        el.setAttribute("stroke-width",3);
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
            type : type
        };
        Shape.el = this.createElement(type);
        if (type === "path") {
            Shape.d = [];
            if (startPos) {
                Shape.d.push({
                    command:"M",
                    params:startPos
                });
            }
        } else if (type === "circle") {
            if (startPos) {
                Shape.cx = startPos[0];
                Shape.cy = startPos[1];
            }
            Shape.r = null;
        } else if (type === "ellipse") {
            if (startPos) {
                Shape.cx = startPos[0];
                Shape.cy = startPos[1];
            }
            Shape.rx = null;
            Shape.ry = null;
        } else if (type === "line") {
            if (startPos) {
                Shape.x1 = startPos[0];
                Shape.y1 = startPos[1];
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
        return Shape;
    }

    getShapeIndexByElement(el){
        for (let i = 0; i < this.shapes.length; i++) {
            if (this.shapes[i].el === el) {
                return i;
            }
        }
        return -1;
    }

    getShapeByElement(el){
        let index = this.getShapeIndexByElement(el);
        if (index > -1) {
            return this.shapes[index];
        }
        return null;
    }

    getShapeByIndex(index){
        return index > -1 ? this.shapes[index] : null;
    }

    getDistance(a, b){
        let startx = a[0] - b[0];
        let starty = a[1] - b[1];
        return Math.sqrt(startx*startx+starty*starty);
    }

    reverseOrder() {
        for (var i = 1; i < this.svg.childNodes.length; i++){
            this.svg.insertBefore(this.svg.childNodes[i], this.svg.firstChild);
        }
        this.shapes.reverse();
    }

}

