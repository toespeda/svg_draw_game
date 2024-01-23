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

            let target = e.target.parentNode.parentNode;
            let el = svgElement(target.dataset.el);
            //let index = [...target.parentNode.children].indexOf(target);
            let tkl = e.target.classList;

            if (tkl.contains("remove")) {

                draw.removeShape(el);
                target.remove();

            } else if (tkl.contains("merge")) {

                let merged = draw.mergeShape(el, 1);

                if (merged) {

                    svgElement(target.dataset.el, merged.el)
                    target.nextElementSibling.remove();

                }

            } else if (tkl.contains("display")) {

                // [...draw.svg.children][index].classList.toggle("static", e.target.classList.toggle("static"));

                toggleDisplay(tkl, el.classList);

            } else if (tkl.contains("visibility")) {

                // e.target.innerText = e.target.innerText === "o" ? "ø" : "o";
                // [...draw.svg.children][index].classList[e.target.innerText === "o"  ? "remove" : "add"]("hidden");

            } else if (tkl.contains("error")) {

                toggleVisibility(tkl, el.classList, "error");

            } else if (tkl.contains("success")) {

                toggleVisibility(tkl, el.classList, "success");

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
                        el.setAttribute("title", e.target.innerText);
                    }
                    e.target.setAttribute("contentEditable", "false");
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

                let adjustHeight = (textarea) => {
                    let minHeight = textarea.scrollHeight;
                    let adjust = function () {
                        let outerHeight = parseInt(window.getComputedStyle(textarea).height, 10);
                        if (outerHeight) {
                            let diff = outerHeight - textarea.clientHeight;
                            textarea.style.height = 0;
                            textarea.style.height = Math.max(minHeight, textarea.scrollHeight + diff) + 'px';
                        }
                    };
                    textarea.style.boxSizing = textarea.style.mozBoxSizing = 'border-box';
                    textarea.style.overflowY = 'hidden';
                    adjust();
                    return adjust;
                };

                let attributeForm = document.createElement('form');
                attributeForm.setAttribute("action", "");
                attributeForm.style.padding="10px 15px";
                attributeForm.style.width="360px";

                let a = '';

                let attr = {
                    // id : "",
                    // class : "",
                    // style : ""
                };

                if (el.nodeName.match(/(path|circle|ellipse|rect)/)) {
                    attr["fill"] = "";
                }

                if (el.nodeName.match(/(path|circle|ellipse|rect|line)/)) {
                    attr["stroke"] = "";
                    attr["stroke-width"] = "";
                }

                if (el.nodeName.match(/(animate)/)) {
                    attr["attributeName"] = "";
                    attr["values"] = "";
                    attr["dur"] = "";
                    attr["repeatCount"] = "";
                }

                [...el.attributes].forEach(att => {
                    attr[att.nodeName] = att.nodeValue.replace(/\n\t*/g,'\n').replace(/^\s*|\s*$/g,'').replace(/\n\s*/g,'\n').replace(/(?<!\n)([MmLlSsQqLlHhVvCcSsQqTtAaZz])/g, '\n$1');
                });

                let getInput = (name, value) => {
                    if (name === "d") {
                        return '<span class="key '+name+'">'+name+'</span> <textarea name="'+name+'">'+value+'</textarea>';
                    } else {
                        return '<span class="key '+name+'">'+name+'</span> <input name="'+name+'" value="'+value+'" />';
                    }
                };

                for (let name in attr) {
                    a += getInput(name, attr[name]);
                }

                attributeForm.innerHTML = '<h3 style="margin: 0 0 10px 5px;">Attributes for <a href="https://developer.mozilla.org/en-US/docs/Web/SVG/Element/'+el.nodeName+'" target="_blank" referrerpolicy="no-referrer">'+el.nodeName+'</a></h3><div style="text-align: right;"><input style="margin: 0 8px;" type="submit" value="OK" /></div>';

                let attributes = document.createElement("div");
                attributes.className = "attributes";
                attributes.innerHTML = '<span style="font-weight: bold;">Name</span><span style="font-weight: bold;">Value</span>' + a + '<input class="newAttribute" name="" value="" /><input class="newAttribute" name="" value="" />';

                attributeForm.insertBefore(attributes, attributeForm.children[1]);

                const newAttribute = [...attributes.querySelectorAll(".newAttribute")];

                let addNewAttribute = () => {
                    if (newAttribute[0].value && newAttribute[1].value) {
                        newAttribute[0].insertAdjacentHTML("beforebegin", getInput(newAttribute[0].value, newAttribute[1].value));
                        newAttribute[0].value = "";
                        newAttribute[1].value = "";
                        newAttribute[0].focus();
                    }
                };

                newAttribute.forEach(el => {
                    el.addEventListener("blur", e => {
                        if (newAttribute.indexOf(e.relatedTarget) === -1) {
                            addNewAttribute();
                        }
                    });
                });

                attributeForm.addEventListener("submit", e => {
                    e.preventDefault();
                    addNewAttribute();
                    const params = new FormData(e.target);

                    [...params.entries()].forEach(v => {
                        el.setAttribute(v[0], v[1]);
                        if (v[0] === "id" && v[1]) {
                            findElement(el).querySelector(".tools .title").setAttribute("title", v[1]);
                        }
                    });
                    let shape = draw.getShapeByElement(el);
                    draw.setShapeAttributes(shape);
                    updateLayer(shape);
                });

                Popup(attributeForm, e.target);

                attributeForm.querySelectorAll('textarea').forEach(textarea => {
                    textarea.addEventListener('input', adjustHeight(textarea));
                    textarea.dispatchEvent(new Event('input'));
                });

                attributeForm.querySelectorAll('.stroke,.fill').forEach(inputcolor => {

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
        console.log(e.detail);
        draw.shapeStack(e.detail.startIndex, e.detail.endIndex, svgElement(e.detail.startContainer.dataset.el), svgElement(e.detail.endContainer.dataset.el));
    }, false);

    layers.addEventListener("mouseover", (e) => {
        if (e.target.classList.contains("title")) {//Adjust popover
            let t = document.createElement("span");
            t.appendChild(e.target.childNodes[0].cloneNode());
            document.body.appendChild(t);
            let icontip = e.target.nextElementSibling;
            let margin = e.target.offsetLeft - icontip.offsetLeft + t.offsetWidth/2;
            //let margin = (-100 + t.offsetWidth/2 - 5);
            //e.target.nextElementSibling.style.margin = "0 " + margin + "px 0 -" + margin + "px";//Min-width, middle and margin
            icontip.style.setProperty("--margin", margin + "px");
            t.remove();
        }
        // if (e.target.nodeName.toLowerCase() === "div") {
        //     let shape = svgElement(e.target.dataset.el);
        //     if (shape) {
        //         shape.style.stroke = "#0000ff";
        //     }
        // }
    });

    layers.addEventListener("mouseout", (e) => {
        // if (e.target.nodeName.toLowerCase() === "div") {
        //     let shape = svgElement(e.target.dataset.el);
        //     if (shape) {
        //         shape.style.stroke = "";
        //     }
        // }
    });

    let addTools = (b, shape) => {

        let title = shape.el.getAttribute("title") || shape.el.nodeName;
        b.innerHTML = '<span class="title" title="">' + title + '</span> <span class="icontip" title="' + (shape.el.getAttribute("id") || "") + '"></span> <span class="remove">x</span> <span class="merge">v</span> <!--<span class="visibility">o</span>--> <span class="display"></span> <span class="error"></span> <span class="success"></span> <span class="attributes">attr</span>';

        //console.log(shape.el.className.baseVal.match(/\b(visible|hidden)(-on-(\w+))?\b/));
        let s = shape.el.className.baseVal.match(/\b(static)\b/);
        if (s) {
            b.querySelector(".display").classList.add(s[1]);
        }
        s = shape.el.className.baseVal.match(/\b(hidden-on-pending)\b/);
        if (s) {
            b.querySelector(".display").classList.add("hidden");
        }
        s = shape.el.className.baseVal.match(/\b(visible|hidden)-on-(\w+)\b/);
        if (s) {
            b.querySelector("."+s[2]).classList.add(s[1]);
        }

        if (shape.el instanceof SVGGraphicsElement) {
            let preview = document.createElement('span');
            preview.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="358" height="358" viewBox="0 0 358 358"></svg>';
            let svg = preview.querySelector('svg');
            svg.append(shape.el.cloneNode(true));
            b.append(preview);
            svg.setAttribute("viewBox", getViewBoxDim(shape));
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

    let findKey = (el) => {
        for (let key in svgElements) {
            if (svgElements[key] === el) {
                return key;
            }
        }
        return null;
    }

    let findElement = (el) => {
        let key = findKey(el);
        return key ? document.querySelector('[data-el="'+key+'"]') : null;
    }

    let updateLayer = (shape) => {
        if (shape.el instanceof SVGGraphicsElement) {
            let svg = findElement(shape.el).querySelector('svg');
            svg.children[0].replaceWith(shape.el.cloneNode(true));
            svg.setAttribute("viewBox", getViewBoxDim(shape));
        }
    }

    let getViewBoxDim = (shape) => {
        let dim = draw.getShapeDim(shape);
        return dim.x + " " + dim.y + " " + (dim.width || 20) + " " + (dim.height || 20);
    }

    let addLayer = (shape, parent) => {
        let b = document.createElement('div');
        parent = (parent || findElement(shape.el.parentNode) || layers);
        if (shape.el.nextElementSibling) {
            parent.insertBefore(b, findElement(shape.el.nextElementSibling));
        } else {
            parent.appendChild(b);
        }
        let key = uniqueKey();
        b.dataset.el = key;
        svgElement(key, shape.el);
        b.classList.add(shape.el.nodeName);

        let tools = document.createElement('span');
        tools.classList.add("tools");
        b.append(tools);

        addTools(tools, shape);
        return b;
    };

    draw.svg.addEventListener("reset", (e) => {
        layers.innerHTML = "";
    });

    draw.svg.addEventListener("replaced", (e) => {
        svgElement(findKey(e.detail.el), e.detail.with);
    });

    draw.svg.addEventListener("updated", (e) => {
        updateLayer(e.detail);
    });

    draw.svg.addEventListener("added", (e) => {
        addLayer(e.detail);
    });

    return layers;

}