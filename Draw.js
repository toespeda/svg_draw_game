class Draw {

    svg = null;
    children = [];
    type = "line";
    action = "move";
    symbol = null;
    shape = null;
    nodeHandle = false;
    svgOffset = [10,10];
    posOffset = [0,0];
    buffer = [];

    mousePos(e, snap){
        //let svgOffset = this.svg.getBoundingClientRect();
        let pos = [e.clientX - this.svgOffset[0] + this.posOffset[0], e.clientY - this.svgOffset[1] + this.posOffset[1]];
        if (snap) {
            let edge = this.getClosestPos(pos, this.shape?.el);
            if (edge.length) {
                pos = edge[0].params;
            }
        }
        return pos;
    }

    createGuide(){
        let guide = document.createElement("div");
        guide.style.top = this.shape.basePos.y + "px";
        guide.style.left = this.shape.basePos.x + "px";
        guide.style.width = this.shape.basePos.width + "px";
        guide.style.height = this.shape.basePos.height + "px";
        guide.style.pointerEvents = "none";
        guide.style.outline = "1px solid orange";
        guide.classList.add("guide");
        this.svg.parentNode.insertBefore(guide, this.svg);
    }

    start(e){

        let startPos = this.mousePos(e, this.action === "draw");
        let lastPos = startPos;
        this.buffer = [startPos];

        console.log({
            "type" : this.type,
            "action" : this.action,
            "symbol" : this.symbol
        });

        // this.svg.classList.add("gettarget");
        // let targetElement = document.elementFromPoint(e.clientX, e.clientY);
        // this.svg.classList.remove("gettarget");
        if (this.action === "node") {

            //quadratic curve on lines
            if (e.target.nodeName.match(/(path|line)/)) {

                this.shape = this.getShapeByElement(e.target);
                this.nodeHandle = this.getNodeHandle(this.shape, startPos);

            } else {

                let edge = this.getClosestPos(startPos);

                if (edge.length) {

                    this.shape = edge[0].shape;
                    // Closest first
                    if (this.shape.type === "path") {
                        this.nodeHandle = edge[0];
                    } else if (this.shape.type === "line") {
                        this.nodeHandle = this.getShapeAttr(this.shape, edge[0].position);
                    }

                }
            }

            if (this.nodeHandle) {
                let params = this.nodeHandle.params || [this.shape[this.nodeHandle[0]], this.shape[this.nodeHandle[1]]];
                this.posOffset = [params[0] - startPos[0], params[1] - startPos[1]];
            }

        // } else if (this.action === "draw") {
        //
        //     let edge = this.getClosestPos(startPos);
        //
        //     if (edge.length) {
        //         startPos = edge[0].params;
        //     }

        } else if (this.action !== "draw" && this.action !== "insert" && e.target.nodeName.match(/(path|circle|ellipse|line|rect|image)/)) {

            this.shape = this.getShapeByElement(e.target);
            //this.setActionByPos(this.shape, startPos);

        }

        if (!this.shape && this.action === "draw") {
            this.shape = this.createShape(this.type, startPos);
            this.children.push(this.shape);
            this.svg.dispatchEvent(new CustomEvent("added", { detail: this.shape }));
            if (this.type === "path") {
                this.shape.d.push({
                    command:"L",
                    params:[...startPos]
                });
                this.nodeHandle = {
                    index : 1,
                    start : 0
                };
            }
        }

        if (!this.shape && this.action === "insert") {
            this.shape = this.addElement(this.symbol.cloneNode());
            this.shape.basePos = this.getShapeDim(this.shape);
            this.moveShape(this.shape, startPos, [this.shape.basePos.right, this.shape.basePos.bottom]);
            this.redrawShape(this.shape);
        }

        if (!this.shape) {
            return;
        }

        if (e.ctrlKey) {
            this.shape = this.duplicateShape(this.shape);
        }

        this.shape.basePos = this.getShapeDim(this.shape);

        let center = [this.shape.basePos.x + this.shape.basePos.width/2, this.shape.basePos.y + this.shape.basePos.height/2];

        let lastAngle = this.getAngle(center, startPos);

        //Fix rotating horizontal and vertical lines
        if (this.action === "rotate") {
            if (this.shape.type === "path") {
                this.convertCommand(this.shape);
            } else if (this.shape.type === "ellipse") {
                this.convertToPath(this.shape);
                this.redrawShape(this.shape);
            } else if (this.shape.type === "rect") {
                this.convertToPath(this.shape);
                this.redrawShape(this.shape);
            }
        }

        let move = (e) => {
            let pos = this.mousePos(e, true);
            let angle = this.getAngle(center, pos);
            //console.log("angle", (angle * 180) / Math.PI, center, pos);
            //console.log("center", center);
            if (this.action === "rotate") {
                this.rotateShape(this.shape, center, angle, lastAngle);
            } else if (this.action === "move") {
                this.moveShape(this.shape, pos, lastPos);
            } else if (this.action === "resize" || this.action === "insert") {
                let quadrant = [startPos[0] > center[0], startPos[1] > center[1]];
                this.resizeShape(this.shape, pos, quadrant, lastPos);
            } else if (this.shape.type === "path") {
                if (this.action === "draw" && e.buttons && this.buffer.length > 3) {
                    let command = this.shape.d[this.nodeHandle.index];
                    if (command.command !== "Q") {
                        command.command = "Q";
                    }
                    command.params = [...this.buffer[Math.floor(this.buffer.length/3)], ...pos];
                } else {
                    this.shape.d[this.nodeHandle.index].params.splice(this.nodeHandle.start, 2, pos[0], pos[1]);
                }
            } else if (this.shape.type === "circle") {
                this.shape.r = this.getDistance(startPos, pos);
            } else if (this.shape.type === "ellipse") {
                this.shape.rx = Math.abs(pos[0] - startPos[0]);
                this.shape.ry = Math.abs(pos[1] - startPos[1]);
            } else if (this.shape.type === "line") {
                if (this.nodeHandle) {
                    this.shape[this.nodeHandle[0]] = pos[0];
                    this.shape[this.nodeHandle[1]] = pos[1];
                } else {
                    this.shape.x2 = pos[0];
                    this.shape.y2 = pos[1];
                }
            } else if (this.shape.type === "rect") {
                this.shape.width = pos[0] - startPos[0];
                this.shape.height = pos[1] - startPos[1];
            }
            this.redrawShape(this.shape);

            if (e.buttons) {
                this.buffer.push(pos);
            }
            lastPos = pos;
            lastAngle = angle;
        };

        let stop = () => {
            this.svg.removeEventListener("mousemove", move);
            this.svg.removeEventListener(this.type === "path" ? "dblclick" : "mouseup", stop);
            //guide.remove();
            this.svg.dispatchEvent(new CustomEvent("updated", { detail: this.shape }));
            this.shape = null;
            this.nodeHandle = null;
            // let l = this.buffer.length;
            //console.log(this.buffer[0], this.buffer[Math.floor(l/3)], this.buffer[l-1]);
            // let test = this.createShape("path");
            // test.d = [
            //     {
            //         command:"M",
            //         params:this.buffer[0]
            //     },
            //     {
            //         command:"Q",
            //         params:[...this.buffer[Math.floor(l/3)], ...this.buffer[l-1]]
            //     }
            // ];
            // this.redrawShape(test);
        };

        this.svg.addEventListener("mousemove", move, false);
        this.svg.addEventListener(this.type === "path" ? "dblclick" : "mouseup", stop);

    }

    constructor(svg) {

        this.svg = svg;

        let test = true;

        let start = null;

        this.svg.addEventListener("mousedown", (e) => {
            if (this.action === "draw" && this.type === "path") {
                if (this.shape) {
                    let startPos = this.mousePos(e);
                    this.shape.d.push({
                        command:"L",
                        params:[...startPos]
                    });
                    this.nodeHandle.start = 0;
                    this.nodeHandle.index++;
                } else {
                    this.start(e);
                }
            } else {
                start = setTimeout(() => {
                    this.start(e);
                }, 100);
            }
        });

        //Debounce
        this.svg.addEventListener("mouseup", (e) => {
            clearTimeout(start);
            if (this.action === "draw" && this.type === "path") {
                if (this.shape && this.buffer.length > 1) {//Has drawn with button pressed
                    let startPos = this.mousePos(e);
                    this.buffer = [startPos];
                    this.shape.d.push({
                        command: "L",
                        params: [...startPos]
                    });
                    this.nodeHandle.start = 0;
                    this.nodeHandle.index++;
                }
            }
        });

    }

    getNodeHandle(Shape, startPos){

        let nodeHandle = null;

        if (Shape) {

            //let positions = this.getClosestShapePos(Shape, startPos);

            let positions = this.getShapePosDistance(this.getShapePos(Shape), startPos)
            .sort(function(a, b){
                return a.distance - b.distance;
            });

            if (positions.length) {// && positions[0].distance < 10

                if (Shape.type === "path") {

                    nodeHandle = positions[0];

                    if (nodeHandle.distance > 10) {//TODO: Convert straight lines L

                        if (nodeHandle.command === "L") {

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

    getAngle(center, p2){
        let dx = p2[0] - center[0];
        let dy = p2[1] - center[1];
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

        } else if (Shape.type === "rect") {

            Shape.x += diff[0];
            Shape.y += diff[1];

        } else if (Shape.type === "image") {

            Shape.x += diff[0];
            Shape.y += diff[1];

        }

    }

    redrawShape(Shape) {
        if (Shape.type === "path") {
            Shape.el.setAttribute("d", Shape.d.map(function(command) {
                return command.command + ' ' + command.params.join(',');
            }).join(' '));
        } else if (this.attributes[Shape.type])  {
            this.attributes[Shape.type].forEach(att => {
                Shape.el.setAttribute(att,Shape[att]);
            });
        }
    }

    rotate(center, pos, radians) {
        //let radians = (Math.PI / 180) * angle;
        let cos = Math.cos(radians);
        let sin = Math.sin(radians);
        let dx = pos[0] - center[0];
        let dy = pos[1] - center[1];
        let nx = center[0] + (cos * dx) - (sin * dy);
        let ny = center[1] + (cos * dy) + (sin * dx);
        return [nx, ny];
    }

    rotateShape(Shape, center, angle, lastAngle){
        //console.log("angle", (angle * 180) / Math.PI);
        let diffAngle = angle - lastAngle;

        if (Shape.type === "path") {

            for (let m=0; m<Shape.d.length; m++) {

                let t = Shape.d[m];

                if (t.command.match(/[Aa]/)) {

                    for (let v=0;v<t.params.length;v+=7) {

                        // let cos = Math.cos(diffAngle);
                        // let sin = Math.sin(diffAngle);
                        // let nx = t.params[v] * cos - t.params[v+1] * sin;
                        // let ny = t.params[v] * sin + t.params[v+1] * cos;
                        // t.params[v] = nx;
                        // t.params[v+1] = ny;

                        let nx = t.params[v];
                        let ny = t.params[v+1];

                        let a = t.params[v+2] + diffAngle * (180 / Math.PI);

                        if (a > 90 || a < 0) {
                            t.params[v] = ny;
                            t.params[v + 1] = nx;
                            if (a < 0) {
                                t.params[v + 2] = a + 90;
                            } else {
                                t.params[v + 2] = a - 90;
                            }
                        } else {
                            t.params[v+2] = a;
                        }

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

    resizeShape(Shape, pos, handle, lastPos){

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

        } else if (Shape.type.match(/(rect|image)/)) {
            if (handle[0]) {
                Shape.width += diff[0];
            } else {
                Shape.x += diff[0];
                Shape.width -= diff[0];
            }
            if (handle[1]) {
                Shape.height += diff[1];
            } else {
                Shape.y += diff[1];
                Shape.height -= diff[1];
            }
        }

    }

    getShapeDim(shape) {
        let dim = {x:0,y:0,width:0,height:0,top:0,right:0,bottom:0,left:0};

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
        } else if (shape.type === "rect") {
            dim.left = dim.x = shape.x;
            dim.right = shape.x + shape.width;
            dim.top = dim.y = shape.y;
            dim.bottom = shape.y + shape.height;
        } else {
            let positions = this.getShapePos(shape);
            if (positions.length) {
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
        } else if (shape.type === "rect") {

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
        return positions;
    }

    // getClosestShapePos(shape, pos){
    //     return this.getShapePosDistance(this.getShapePos(shape), pos)
    //     .sort(function(a, b){
    //         return a.distance - b.distance;
    //     });
    // }

    getShapeAttr(Shape, p){
        if (Shape.type==="line") {
            return p === "start" ? ["x1", "y1"] : ["x2", "y2"];
        }
        return null;
    }

    getPos(shapes, pos, el){
        let positions = [];
        for (let i = 0; i < shapes.length; i++) {

            if (!el || el !== shapes[i].el || (el === shapes[i].el && shapes[i].type === "path" && this.nodeHandle && this.nodeHandle.index > 1)) {
                let shapePositions = this.getShapePos(shapes[i]);
                if (el === shapes[i].el) {
                    shapePositions = shapePositions.slice(0, this.nodeHandle.index - 1);
                }
                if (shapePositions.length) {
                    let closest = this.getShapePosDistance(shapePositions, pos)
                        .sort(function(a, b){
                            return a.distance - b.distance;
                        })[0];
                    closest.shape = shapes[i];
                    positions.push(closest);
                }

            }

            // if (!el || shapes[i].el !== el) {
            //     let shapePositions = this.getClosestShapePos(shapes[i], pos);
            //     if (shapePositions.length) {
            //         let closest = shapePositions[0];
            //         closest.shape = shapes[i];
            //         positions.push(closest);
            //     }
            // }
            //
            // if (el && shapes[i].el === el) {
            //
            //     if (shapes[i].type === "path") {
            //
            //         if (this.nodeHandle.index > 1) {//At least two commands in
            //             let closest = this.getShapePosDistance(this.getShapePos(shapes[i]).slice(0, this.nodeHandle.index - 1), pos)
            //             .sort(function(a, b){
            //                 return a.distance - b.distance;
            //             })[0];
            //             closest.shape = shapes[i];
            //             positions.push(closest);
            //         }
            //     }
            // }

            if (shapes[i].children) {
                positions.push(...this.getPos(shapes[i].children, pos, el));
            }
        }
        return positions;
    }

    getClosestPos(pos, el) {
        let positions = this.getPos(this.children, pos, el);
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
        return shape;
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
        endContainer.insertBefore(startContainer.children[startIndex], endContainer.children[endIndex]);
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

    rectToPath(merge) {
        let d = [];
        d.push({
            command:"M",
            params: [merge.x, merge.y]
        });
        d.push({
            command:"L",
            params: [merge.x+merge.width, merge.y]
        });
        d.push({
            command:"L",
            params: [merge.x+merge.width, merge.y+merge.height]
        });
        d.push({
            command:"L",
            params: [merge.x, merge.y+merge.height]
        });
        d.push({
            command:"L",
            params: [merge.x, merge.y]
        });
        d.push({
            command:"Z",
            params: []
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
        this.svg.dispatchEvent(new CustomEvent("replaced", { detail: {el:Shape.el,with:path} }));
        Shape.el.replaceWith(path);
        Shape.el = path;

    }

    addShape(type){
        let Shape = this.createShape(type);
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

    attributes = {
        "path" : ["d"],
        "circle" : ["cx","cy","r"],
        "line" : ["x1","y1","x2","y2"],
        "ellipse" : ["cx","cy","rx","ry"],
        "rect" : ["x","y","rx","ry","width","height"],
        "image" : ["x","y","width","height"]
    };

    addElementAttributes(el, type){
        if (this.attributes[type]) {
            this.attributes[type].forEach(att => {
                el.setAttribute(att,"");
            });
        }
    }

    createElement(type){
        let el = document.createElementNS("http://www.w3.org/2000/svg", type);
        if (type.match(/(path|circle|ellipse|line|rect)/)) {
            el.setAttribute("stroke","#000000");
            el.setAttribute("stroke-width",3);
        }
        if (type.match(/(path|circle|ellipse|rect)/)) {
            el.setAttribute("fill","transparent");
        }
        if (type.match(/(path)/)) {
            el.setAttribute("stroke-linejoin","round");
        }
        this.addElementAttributes(el, type);
        return el;
    }

    createShape(type, startPos) {
        let Shape = {
            type : type,
            children : []
        };
        Shape.el = this.createElement(type);
        if (type === "path") {
            Shape.d = [];
            if (startPos) {
                Shape.d.push({
                    command:"M",
                    params:[...startPos]
                });
            }
        } else if (type === "circle") {
            if (startPos) {
                Shape.cx = startPos[0];
                Shape.cy = startPos[1];
            }
        } else if (type === "ellipse") {
            if (startPos) {
                Shape.cx = startPos[0];
                Shape.cy = startPos[1];
            }
        } else if (type === "line") {
            if (startPos) {
                Shape.x1 = startPos[0];
                Shape.y1 = startPos[1];
            }
        } else if (type === "rect") {
            if (startPos) {
                Shape.x = startPos[0];
                Shape.y = startPos[1];
            }
        }
        this.svg.appendChild(Shape.el);
        return Shape;
    }

    setShapeAttributes(Shape){
        if (Shape.type === "path") {
            Shape.d = this.parsePath(Shape.el.getAttribute("d"));
        } else if (this.attributes[Shape.type]) {
            this.attributes[Shape.type].forEach(att => {
                Shape[att] = +Shape.el.getAttribute(att);
            })
        }
    }

    parseShape(el){
        let Shape = {
            type : el.nodeName.toLowerCase(),
            el : el
        };
        this.setShapeAttributes(Shape);
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

