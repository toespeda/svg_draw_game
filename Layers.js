let Layers = (layers, draw) => {

    layers = typeof layers === "string" ? document.querySelector(layers) : layers;

    let toggleVisibility = (tkl, index, status) => {
        let scl = [...draw.svg.children][index].classList;
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

    let toggleDisplay = (tkl, index) => {
        let scl = [...draw.svg.children][index].classList;
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
            let elements = [...layers.children];
            let index = elements.indexOf(e.target.parentNode);
            let tkl = e.target.classList;
            if (tkl.contains("remove")) {
                draw.removeShape(index);
                e.target.parentNode.remove();
            } else if (tkl.contains("merge")) {
                if (draw.mergeShape(index, 1)) {
                    e.target.parentNode.nextElementSibling.remove();
                }

            } else if (tkl.contains("display")) {

                // [...draw.svg.children][index].classList.toggle("static", e.target.classList.toggle("static"));

                toggleDisplay(tkl, index);

            } else if (tkl.contains("visibility")) {

                // e.target.innerText = e.target.innerText === "o" ? "ø" : "o";
                // [...draw.svg.children][index].classList[e.target.innerText === "o"  ? "remove" : "add"]("hidden");

            } else if (tkl.contains("error")) {

                toggleVisibility(tkl, index, "error");

            } else if (tkl.contains("success")) {

                toggleVisibility(tkl, index, "success");

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
                        [...draw.svg.children][index].setAttribute("title", e.target.innerText);
                    }
                    e.target.removeEventListener("blur", blur);
                    e.target.removeEventListener("keydown", blur);
                };
                e.target.addEventListener("blur", blur);
                e.target.addEventListener("keydown", e => {
                    var key = e.keyCode || e.charCode;
                    if(key === 13) {
                        e.target.blur();
                    }
                });
            } else if (tkl.contains("attributes")) {
                let attributes = document.createElement('div');
                let a = '';
                let shape = [...draw.svg.children][index];
                [...shape.attributes].forEach(att => {
                    a += '<span class="key">'+att.nodeName+'</span> <input name="'+att.nodeName+'" value="'+att.nodeValue+'" />';
                });
                attributes.innerHTML = '<form style="padding:10px 15px" action="" class="attributes">'+a+'<input type="submit" value="OK" /></form>';
                attributes.addEventListener("submit", e => {
                    e.preventDefault();
                    const params = new FormData(e.target);
                    [...params.entries()].forEach(v => {
                        shape.setAttribute(v[0], v[1]);
                    })
                })
                Popup(attributes, e.target);
            }
        }
    });

    layers.addEventListener("sorted", (e) => {
        //Rearrange shapes
        draw.moveShape(e.detail.startIndex, e.detail.endIndex);
    }, false);

    layers.addEventListener("mouseover", (e) => {
        let shape = draw.getShapeByIndex([...layers.childNodes].indexOf(e.target));
        if (shape) {
            shape.el.style.stroke = "#0000ff";
        }
    });

    layers.addEventListener("mouseout", (e) => {
        let shape = draw.getShapeByIndex([...layers.childNodes].indexOf(e.target));
        if (shape) {
            shape.el.style.stroke = "";
        }
    });

    draw.svg.addEventListener("update", (e) => {
        layers.innerHTML = "";
        draw.init();
    });

    draw.svg.addEventListener("added", (e) => {
        //this.add(e.detail);
        let shape = e.detail;
        let b = document.createElement('li');
        b.classList.add(shape.type);
        b.innerHTML = '<span class="title">' + (shape.el.getAttribute("title") || shape.type) + '</span> <span class="remove">x</span> <span class="merge">v</span> <span class="visibility">o</span> <span class="display"></span> <span class="error"></span> <span class="success"></span> <span class="attributes">attr</span>';
        layers.appendChild(b);
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
    });

    return layers;

}