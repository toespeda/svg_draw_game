let Layers = (layers, draw) => {

    layers = typeof layers === "string" ? document.querySelector(layers) : layers;

    let svgElements = {};

    let uniqueKey = (limit) => {
        limit = limit || 10;
        let characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let randstring = '';
        for (let $i = 0; $i < limit; $i++) {
            randstring += characters[Math.round(Math.random()*51)];
        }
        return randstring;
    };

    let toggleVisibility = (tkl, scl, status) => {

        if (scl.contains("visible-on-"+status)) {
            scl.remove("visible-on-"+status);
            scl.add("hidden-on-"+status);
            tkl.add("hidden");
        } else if (scl.contains("hidden-on-"+status)) {
            scl.remove("hidden-on-"+status);
            tkl.remove(...["hidden", "visible"]);
        } else {
            scl.add("visible-on-"+status);
            tkl.add("visible");
        }
    };

    let toggleDisplay = (tkl, scl) => {

        if (scl.contains("static")) {
            scl.remove("static");
            scl.add("hidden-on-pending");
            tkl.add("hidden");
        } else if (scl.contains("hidden-on-pending")) {
            scl.remove("hidden-on-pending");
            tkl.remove(...["hidden", "static"]);
        } else {
            scl.add("static");
            tkl.add("static");
        }
    };

    layers.addEventListener("mouseup", (e) => {
        if (e.target.nodeName.toLowerCase() === "span") {

            e.stopImmediatePropagation();

            let target = e.target.parentNode;

            let shape = svgElement(target.dataset.el);

            let index = [...target.parentNode.children].indexOf(target);

            let tkl = e.target.classList;

            if (tkl.contains("remove")) {

                draw.removeShape(shape);
                target.remove();

            } else if (tkl.contains("merge")) {

                if (draw.mergeShape(shape, 1)) {
                    target.nextElementSibling.remove();
                }

            } else if (tkl.contains("display")) {

                // [...draw.svg.children][index].classList.toggle("static", e.target.classList.toggle("static"));

                toggleDisplay(tkl, shape.classList);

            } else if (tkl.contains("visibility")) {

                // e.target.innerText = e.target.innerText === "o" ? "ø" : "o";
                // [...draw.svg.children][index].classList[e.target.innerText === "o"  ? "remove" : "add"]("hidden");

            } else if (tkl.contains("error")) {

                toggleVisibility(tkl, shape.classList, "error");

            } else if (tkl.contains("success")) {

                toggleVisibility(tkl, shape.classList, "success");

            } else if (tkl.contains("title")) {
                e.target.setAttribute("contentEditable", "true");
                if (document.body.createTextRange) {
                    const range = document.body.createTextRange();
                    range.moveToElementText(e.target);
                    range.select();
                } else if (window.getSelection) {
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(e.target);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                let originalTitle = e.target.innerText;
                let blur = e => {
                    if (e.target.innerText !== originalTitle) {
                        shape.setAttribute("title", e.target.innerText);
                    }
                    e.target.removeEventListener("blur", blur);
                    e.target.removeEventListener("keydown", blur);
                };
                e.target.addEventListener("blur", blur);
                e.target.addEventListener("keydown", e => {
                    let key = e.keyCode || e.charCode;
                    if(key === 13) {
                        e.target.blur();
                    }
                });
            } else if (tkl.contains("attributes")) {

                let attributes = document.createElement('div');

                let a = '';

                let attr = {
                    id : "",
                    class : "",
                    style : ""
                };

                if (shape.nodeName.match(/(path|circle|ellipse)/)) {
                    attr["fill"] = "";
                }

                if (shape.nodeName.match(/(path|circle|ellipse|line)/)) {
                    attr["stroke"] = "";
                    attr["stroke-width"] = "";
                }

                [...shape.attributes].forEach(att => {
                    attr[att.nodeName] = att.nodeValue.replace(/\n\t*/g,'\n').replace(/^\s*|\s*$/g,'');
                });

                for (let nodeName in attr) {
                    if (nodeName === "d") {
                        a += '<span class="key '+nodeName+'">'+nodeName+'</span> <textarea name="'+nodeName+'">'+attr[nodeName]+'</textarea>';
                    } else {
                        a += '<span class="key '+nodeName+'">'+nodeName+'</span> <input name="'+nodeName+'" value="'+attr[nodeName]+'" />';
                    }
                }

                attributes.innerHTML = '<form style="padding:10px 15px" action="" class="attributes">'+a+'<input type="submit" value="OK" /></form>';

                attributes.addEventListener("submit", e => {
                    e.preventDefault();
                    const params = new FormData(e.target);
                    [...params.entries()].forEach(v => {
                        shape.setAttribute(v[0], v[1]);
                    })
                })

                Popup(attributes, e.target);

                attributes.querySelectorAll('.stroke,.fill').forEach(inputcolor => {

                    inputcolor.addEventListener("click", (e) => {

                        let target = e.target.nextElementSibling;

                        let circle = document.createElement('div');
                        circle.classList.add("color-circle");

                        circle.addEventListener("click", (e) => {
                            let color = e.target.style.backgroundColor;
                            if (color) {
                                let c = new Color(color);
                                target.value = c.toHex();
                                circle.dispatchEvent(new CustomEvent("close"));
                            }
                        });

                        let color2 = new Color([255,0,0],0,255);
                        let width = 220;
                        let len = 104;
                        let angle = 360 / len;
                        let radius = width/2 - 10;

                        for(let i=0; i<len; i++) {
                            let c = document.createElement("div");
                            c.style.backgroundColor = color2.hue(15).toHex();
                            c.style.top = (radius + 10 + Math.sin(angle * i * Math.PI / 180) * radius) + "px";
                            c.style.left = (radius + 10 + Math.cos(angle * i * Math.PI / 180) * radius) + "px";
                            circle.appendChild(c)
                        }

                        Popup(circle, target);

                    }, false)
                });


            }
        }
    });

    layers.addEventListener("sorted", (e) => {
        //Rearrange shapes
        draw.shapeStack(e.detail.startIndex, e.detail.endIndex, svgElement(e.detail.startContainer.dataset.el), svgElement(e.detail.endContainer.dataset.el));
    }, false);

    layers.addEventListener("mouseover", (e) => {
        //let shape = draw.getShapeByIndex(getPath(layers, e.target));
        if (e.target.nodeName.toLowerCase() === "div") {
            //let shape = draw.getShapeByIndex([...layers.childNodes].indexOf(e.target));
            let shape = svgElement(e.target.dataset.el);
            if (shape) {
                shape.style.stroke = "#0000ff";
            }
        }
    });

    layers.addEventListener("mouseout", (e) => {
        //let shape = draw.getShapeByIndex([...layers.childNodes].indexOf(e.target));
        if (e.target.nodeName.toLowerCase() === "div") {
            let shape = svgElement(e.target.dataset.el);
            if (shape) {
                shape.style.stroke = "";
            }
        }

    });

    draw.svg.addEventListener("update", (e) => {
        layers.innerHTML = "";
        draw.init();
    });

    let addContent = (b, shape) => {
        b.classList.add(shape.nodeName);
        b.innerHTML = '<span class="title">' + (shape.getAttribute("title") || shape.nodeName) + '</span> <span class="remove">x</span> <span class="merge">v</span> <!--<span class="visibility">o</span>--> <span class="display"></span> <span class="error"></span> <span class="success"></span> <span class="attributes">attr</span>';

        //console.log(shape.className.baseVal.match(/\b(visible|hidden)(-on-(\w+))?\b/));
        let s = shape.className.baseVal.match(/\b(static)\b/);
        if (s) {
            b.querySelector(".display").classList.add(s[1]);
        }
        s = shape.className.baseVal.match(/\b(hidden-on-pending)\b/);
        if (s) {
            b.querySelector(".display").classList.add("hidden");
        }
        s = shape.className.baseVal.match(/\b(visible|hidden)-on-(\w+)\b/);
        if (s) {
            b.querySelector("."+s[2]).classList.add(s[1]);
        }
    };

    let svgElement = (key, el) => {
        if (key) {
            if (el) {
                svgElements[key] = el;
            } else {
                return svgElements[key];
            }
        }
        return el;
    };

    let addLayer = (layer, shape) => {
        let b = document.createElement('div');
        layer.appendChild(b);
        let key = uniqueKey();
        b.dataset.el = key;
        svgElement(key, shape);
        addContent(b, shape);
        return b;
    };

    let addLayers = function(parent, children){
        [...children].forEach(c => {
            let layer = addLayer(parent, c);
            if (c.children.length) {
                addLayers(layer, c.children);
            }
        });
    }

    draw.svg.addEventListener("init", (e) => {
        layers.innerHTML = "";
        addLayers(layers, draw.svg.children);
    });

    draw.svg.addEventListener("added", (e) => {

        layers.innerHTML = "";
        addLayers(layers, draw.svg.children);

    });

    return layers;

}