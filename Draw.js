class Draw {

    svg = null;
    children = [];
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

            if (this.action === "node") {

                //quadratic curve on lines
                if (e.target.nodeName.match(/(path|line)/)) {

                    Shape = this.getShapeByElement(e.target);
                    nodeHandle = this.getNodeHandle(Shape, startPos);

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

                if (nodeHandle) {
                    let params = nodeHandle.params || [Shape[nodeHandle[0]], Shape[nodeHandle[1]]];
                    offsetPos = [params[0] - startPos[0], params[1] - startPos[1]];
                }

            } else if (this.action === "draw") {

                let edge = this.getClosestPos(startPos);

                if (edge.length) {
                    startPos = edge[0].params;
                }

            } else if (e.target.nodeName.match(/(path|circle|ellipse|line)/)) {

                Shape = this.getShapeByElement(e.target);
                //this.setActionByPos(Shape, startPos);

            }

            if (!Shape && this.action === "draw") {
                Shape = this.createShape(this.type, startPos);
                this.children.push(Shape);
                this.svg.dispatchEvent(new CustomEvent("added", { detail: Shape }));
                //this.addShape(Shape);
            }

            if (!Shape) {
                return;
            }

            if (e.ctrlKey) {
                Shape = this.duplicateShape(Shape);
            }

            //Shape.basePos = Shape.el.getBoundingClientRect();

            Shape.basePos = this.getShapeDim(Shape);

            let center = [Shape.basePos.x + Shape.basePos.width/2, Shape.basePos.y + Shape.basePos.height/2];

            let handle = [startPos[0] > center[0], startPos[1] > center[1]];

            let lastAngle = this.getAngle(center, startPos);

            //Fix rotating horizontal and vertical lines
            if (this.action === "rotate") {
                if (Shape.type === "path") {
                    this.convertCommand(Shape);
                } else if (Shape.type === "ellipse") {
                    this.convertToPath(Shape);
                    this.redrawShape(Shape);
                }
            }

            let guide = document.createElement("div");
            guide.style.top = Shape.basePos.y + "px";
            guide.style.left = Shape.basePos.x + "px";
            guide.style.width = Shape.basePos.width + "px";
            guide.style.height = Shape.basePos.height + "px";
            guide.style.pointerEvents = "none";
            guide.style.outline = "1px solid orange";
            guide.classList.add("guide");
            svg.parentNode.insertBefore(guide, svg);

            let move = (e) => {

                let pos = mousePos(e);

                pos[0] += offsetPos[0];
                pos[1] += offsetPos[1];

                let edge = this.getClosestPos(pos, Shape.el);

                if (edge.length) {
                    pos = edge[0].params;
                }

                let angle = this.getAngle(center, pos);

                if (this.action === "move") {

                    this.moveShape(Shape, pos, lastPos);

                } else if (this.action === "resize") {

                    this.resizeShape(Shape, pos, lastPos, handle);

                } else if (this.action === "rotate") {

                    this.rotateShape(Shape, center, angle, lastAngle);

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

                lastAngle = angle;

            };

            let stop = function(){
                svg.removeEventListener("mousemove", move);
                svg.removeEventListener("mouseup", stop);
                guide.remove();
                svg.dispatchEvent(new CustomEvent("updated", { detail: Shape }));
                //Update shape preview
            };

            svg.addEventListener("mousemove", move, false);
            svg.addEventListener("mouseup", stop);

        });

    }

    getNodeHandle(Shape, startPos){

        let nodeHandle = null;

        if (Shape) {

            let positions = this.getClosestShapePos(Shape, startPos);

            if (positions.length) {// && positions[0].distance < 10

                if (Shape.type === "path") {

                    nodeHandle = positions[0];

                    if (nodeHandle.distance > 10) {//TODO: Convert straight lines L

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
                            start : 0,
                            params: Shape.d[1].params
                        };
                    }

                }

            }
        }

        return nodeHandle;

    }

    getAngle(p1, p2){
        let dx = p1[0] - p2[0];
        let dy = p1[1] - p2[1];
        return Math.atan2(dy, dx);
    }

    /**
     * Sets the action based on click position
     * @param Shape
     * @param pos
     */
    setActionByPos(Shape, pos){

        if (Shape.type === "circle") {

            if (Shape.r - this.getDistance(pos, [Shape.cx, Shape.cy]) < 5) {
                this.action = "resize";
                this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
            } else {
                this.action = "move";
                this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
            }

        } else if (Shape.type === "ellipse") {

            let theta = this.getAngle([Shape.cx, Shape.cy], pos);

            let a = Shape.rx;
            let b = Shape.ry;

            let x = a * a * Math.sin(theta) * Math.sin(theta);
            let y = b * b * Math.cos(theta) * Math.cos(theta);

            let r = (a * b) / Math.sqrt(x + y);

            if (r - this.getDistance(pos, [Shape.cx, Shape.cy]) < 5) {
                this.action = "resize";
                this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
            } else {
                this.action = "move";
                this.svg.dispatchEvent(new CustomEvent("action", { detail: this.action }));
            }

        }

    }

    moveShape(Shape, pos, lastPos){

        let diff = [pos[0] - lastPos[0], pos[1] - lastPos[1]];

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

    rotate(center, pos, radians) {
        //let radians = (Math.PI / 180) * angle;
        let cos = Math.cos(radians);
        let sin = Math.sin(radians);
        let nx = (cos * (pos[0] - center[0])) + (sin * (pos[1] - center[1])) + center[0];
        let ny = (cos * (pos[1] - center[1])) - (sin * (pos[0] - center[0])) + center[1];
        return [nx, ny];
    }

    rotateShape(Shape, center, angle, lastAngle){

        let diffAngle = angle - lastAngle;

        if (Shape.type === "path") {

            for (let m=0; m<Shape.d.length; m++) {

                let t = Shape.d[m];

                if (t.command.match(/[Aa]/)) {

                    for (let v=0;v<t.params.length;v+=7) {
                        t.params[v+2] += angle;
                        let rotated = this.rotate(center, [t.params[v+5], t.params[v+6]], diffAngle);
                        t.params[v+5] = rotated[0];
                        t.params[v+6] = rotated[1];
                    }

                } else if (t.command.match(/[Vv]/)) {



                } else if (t.command.match(/[Hh]/)) {



                } else if (t.command.match(/[MmLCSQT]/)) {
                    for (let v=0;v<t.params.length;v+=2) {
                        let rotated = this.rotate(center, [t.params[v], t.params[v+1]], diffAngle);
                        t.params[v] = rotated[0];
                        t.params[v+1] = rotated[1];
                    }
                } else if (t.command.match(/[lcsqt]/)) {

                }

            }

        } else if (Shape.type === "circle") {

            // Shape.cx += diff[0];
            // Shape.cy += diff[1];

        } else if (Shape.type === "ellipse") {

            // Shape.cx += diff[0];
            // Shape.cy += diff[1];

        } else if (Shape.type === "line") {

            // Shape.x1 += diff[0];
            // Shape.y1 += diff[1];
            // Shape.x2 += diff[0];
            // Shape.y2 += diff[1];

        }

    }

    resizeShape(Shape, pos, lastPos, handle){

        let diff = [
            pos[0] - lastPos[0],
            pos[1] - lastPos[1]
        ];

        let opposites = [
            Shape.basePos[handle[0] ? "left" : "right"],
            Shape.basePos[handle[1] ? "top" : "bottom"]
        ];

        let diffP = [
            (pos[0] - opposites[0]) / (lastPos[0] - opposites[0]),
            (pos[1] - opposites[1]) / (lastPos[1] - opposites[1])
        ];

        //diffP[1] = (pos[1] - Shape.basePos.bottom) / (lastPos[1] - Shape.basePos.bottom);

        if (Shape.type === "path") {

            Shape.d.forEach(t => {

                if (t.command.match(/[A]/)) {

                    for (let v in t.params) {
                        let m = v % 7;
                        if (m === 0) {//rx
                            let pos = t.params[v] >= 0;
                            t.params[v] *= diffP[0];
                            let neg = t.params[v] < 0;
                            if (pos && neg || !pos && !neg) {
                                t.params[+v+4] = +t.params[+v+4] ? 0 : 1;
                            }
                        } else if (m === 1) {//ry
                            let pos = t.params[v] >= 0;
                            t.params[v] *= diffP[1];
                            let neg = t.params[v] < 0;
                            if (pos && neg || !pos && !neg) {
                                t.params[+v+3] = +t.params[+v+3] ? 0 : 1;
                            }
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

    getShapeDim(shape) {
        let dim = {x:0,y:0,width:0,height:0,top:0,right:0,bottom:0,left:0};
        let positions = this.getShapePos(shape);
        if (shape.type === "circle") {
            dim.left = dim.x = shape.cx - shape.r;
            dim.right = shape.cx + shape.r;
            dim.top = dim.y = shape.cy - shape.r;
            dim.bottom = shape.cy + shape.r;
        } else if (shape.type === "ellipse") {
            dim.left = dim.x = shape.cx - shape.rx;
            dim.right = shape.cx + shape.rx;
            dim.top = dim.y = shape.cy - shape.ry;
            dim.bottom = shape.cy + shape.ry;
        } else if (positions.length) {
            positions.sort(function (a, b) {
                return a.params[0] - b.params[0];
            });
            dim.left = dim.x = positions[0].params[0];
            dim.right = positions[positions.length - 1].params[0];
            positions.sort(function (a, b) {
                return a.params[1] - b.params[1];
            });
            dim.top = dim.y = positions[0].params[1];
            dim.bottom = positions[positions.length - 1].params[1];
        }
        dim.width = dim.right - dim.left;
        dim.height = dim.bottom - dim.top;
        return dim;
    }

    getShapePos(shape) {

        let positions = [];

        if (shape.type === "path") {//TODO: Get relative positions

            for (let m=0; m<shape.d.length; m++) {

                switch (shape.d[m].command) {
                    case "M" :
                        //(x, y)+
                        positions.push({
                            params : shape.d[m].params.slice(0, 2),
                            command : "M",
                            index : m,
                            start : 0
                        });
                        break;
                    case "L" :
                        //(x, y)+
                        for (let i = 0; i < shape.d[m].params.length; i += 2) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + 2),
                                command : "L",
                                index : m,
                                start : i
                            });
                        }
                        break;
                    case "S" :
                        // (x2,y2, x,y)+
                        for (let i = 0; i < shape.d[m].params.length; i += 2) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + 2),
                                command : "S",
                                index : m,
                                start : i
                            });
                        }
                        break;
                    case "Q" :
                        // (x1,y1, x,y)+
                        for (let i = 0; i < shape.d[m].params.length; i += 2) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + 2),
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
                        // (x1,y1, x2,y2, x,y)+
                        for (let i = 0; i < shape.d[m].params.length; i += 2) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + 2),
                                command : "C",
                                index : m,
                                start : i
                            });
                        }
                        break;
                    case "T" :
                        //(x,y)+
                        for (let i = 0; i < shape.d[m].params.length; i += 2) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + 2),
                                command : "T",
                                index : m,
                                start : i
                            });
                        }
                        break;
                    case "A" :
                        // (rx ry angle large-arc-flag sweep-flag x y)+
                        for (let i = 5; i < shape.d[m].params.length; i += 7) {
                            positions.push({
                                params : shape.d[m].params.slice(i, i + 2),
                                command : "A",
                                index : m,
                                start : i
                            });
                        }
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
        } else if (shape.type === "circle") {
            // positions.push({
            //     params:[shape.cx, shape.cy],
            //     position:"center"
            // });
        } else if (shape.type === "ellipse") {
            // positions.push({
            //     params:[shape.cx, shape.cy],
            //     position:"center"
            // });
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

    getShapeAttr(Shape, p){
        if (Shape.type==="line") {
            return p === "start" ? ["x1", "y1"] : ["x2", "y2"];
        }
        return null;
    }

    getPos(shapes, pos, shape){
        let positions = [];
        for (let i = 0; i < shapes.length; i++) {
            if (!shape || shapes[i].el !== shape) {
                let shapePositions = this.getClosestShapePos(shapes[i], pos);
                if (shapePositions.length) {
                    let closest = shapePositions[0];
                    closest.shape = shapes[i];
                    positions.push(closest);
                }
            }
            if (shapes[i].children) {
                positions.push(...this.getPos(shapes[i].children, pos, shape));
            }
        }
        return positions;
    }

    getClosestPos(pos, shape) {
        let positions = this.getPos(this.children, pos, shape);
        //console.log("positions",positions);
        positions.sort(function(a, b){
            return a.distance - b.distance;
        });
        if (positions.length && positions[0].distance < 10) {
            return positions;
        } else {
            return [];
        }
    }

    tools(data){
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
        let index = [...Shape.el.parentNode.children].indexOf(Shape.el);
        let duplicate = {...Shape};
        duplicate.el = Shape.el.cloneNode(true);
        Shape.el.parentNode.insertBefore(duplicate.el, Shape.el.nextElementSibling);//Insert element after
        this.getShapeByElement(Shape.el.parentNode).children.splice(index+1, 0, duplicate);//Insert object after

        this.svg.dispatchEvent(new CustomEvent("added", { detail: duplicate }));
        return duplicate;
    }

    addElement(el) {
        this.svg.appendChild(el);
        let shape = this.parseShape(el);
        this.children.push(shape);
        this.svg.dispatchEvent(new CustomEvent("added", { detail: shape }));
    }

    addShapes(el){
        let children = [];
        [...el.children].forEach(c => {
            let shape = this.parseShape(c);
            this.svg.dispatchEvent(new CustomEvent("added", { detail: shape }));
            if (c.children.length) {
                shape.children = this.addShapes(c);
            }
            children.push(shape);
        });
        return children;
    }

    init(content){
        if (content !== undefined) {
            this.svg.innerHTML = content || "";
        }
        this.reset();
        // this.children.forEach(shape => {
        //     this.svg.dispatchEvent(new CustomEvent("added", { detail: shape }));
        // })
    }

    reset(){
        this.svg.dispatchEvent(new CustomEvent("reset"));
        this.children = this.addShapes(this.svg);
    }

    shapeStack(startIndex, endIndex, startContainer, endContainer) {
        startContainer = startContainer || this.svg;
        endContainer = endContainer || this.svg;
        if (endIndex > startIndex) {
            endContainer.insertBefore(startContainer.children[startIndex], endContainer.children[endIndex].nextElementSibling);
        } else {
            endContainer.insertBefore(startContainer.children[startIndex], endContainer.children[endIndex]);
        }
        this.getShapeByElement(endContainer).children.splice(endIndex, 0, this.getShapeByElement(startContainer).children.splice(startIndex, 1)[0]);
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

    convertCommand(Shape){
        for (let m=0; m<Shape.d.length; m++) {
            if (Shape.d[m].command.match(/[Vv]/)) {
                let prev = Shape.d[m-1];
                if (prev) {
                    Shape.d[m].command = "L";
                    Shape.d[m].params.unshift(prev.params.slice(-2)[0]);
                }
            } else if (Shape.d[m].command.match(/[Hh]/)) {
                let prev = Shape.d[m-1];
                if (prev) {
                    Shape.d[m].command = "L";
                    Shape.d[m].params.push(prev.params.slice(-2)[1]);
                }
            }
        }
    }

    convertToPath(Shape) {
        Shape.d = this[Shape.type + "ToPath"](Shape);
        Shape.type = "path";
        let path = this.createElement("path");
        Shape.el.replaceWith(path);
        Shape.el = path;

    }

    addGroup(){
        let Shape = this.createShape("g");
        this.children.push(Shape);
        this.svg.dispatchEvent(new CustomEvent("added", { detail: Shape }));
    }

    mergeAll(){
        for (let x=0;x<this.children.length;x++) {
            let Shape = this.children[x];
            let positions = this.getShapePos(Shape);
            for (let x=0; x<positions.length; x++) {

            }
        }
    }

    mergeShape(index, count) {
        let Shape = this.getShapeByElement(index);
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
            let merge = this.getShapeByElement(Shape.el.nextElementSibling);
            if (merge) {
                if (merge.type==="path") {
                    Shape.d = Shape.d.concat(merge.d);
                } else {
                    Shape.d = Shape.d.concat(this[merge.type + "ToPath"](merge));
                }
                this.removeShape(merge.el);
            }
        }
        this.redrawShape(Shape);
        return Shape;
    }

    removeShape(el) {
        let path = this.getShapePathByElement(el);
        if (path.length) {
            let index = path.pop();
            let element = this;
            for (let x=0;x<path.length;x++) {
                element = element.children[path[x]];
            }
            el.remove();
            element.children.splice(index, 1);
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

    getShapePathByElement(el){
        let indexes = [];
        do {
            indexes.unshift([...el.parentNode.children].indexOf(el));
            el = el.parentNode;
        } while(el && el !== this.svg);
        return indexes;
    }

    getShapeByElement(el, shapes){
        if (el === this.svg) {
            return this;
        }
        shapes = shapes || this.children;
        for (let i = 0; i < shapes.length; i++) {
            if (shapes[i].el === el) {
                return shapes[i];
            }
            if (shapes[i].children) {
                let match = this.getShapeByElement(el, shapes[i].children);
                if (match) {
                    return match;
                }
            }
        }
        return null;
    }

    getShapeByIndex(index){
        return index > -1 ? this.children[index] : null;
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
        this.children.reverse();
    }

}

