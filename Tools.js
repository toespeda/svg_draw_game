let Tools = (tools, draw) => {

    tools = typeof tools === "string" ? document.querySelector(tools) : tools;

    let setTools = function(data){
        for (var i in data) {
            let buttons = document.querySelectorAll("#tools > li > *");
            buttons.forEach(el => {
                el.classList.remove("active");
            });
            buttons.forEach(el => {
                if (el.dataset[i] === data[i]) {
                    el.classList.add("active");
                }
                //el.classList[el.dataset[i] === data[i] ? "add" : "remove"]("active");
            });
        }
    };

    draw.svg.addEventListener("action", (e) => {
        setTools({
            action:e.detail
        });
    }, false);

    let symbols = document.querySelector("#symbols");

    let tidy = function(element, level, parentblock){

        level = level || 0;
        let nodes = '';
        let children = element.childNodes;
        let tabs = "\t".repeat(level);
        let block = null;
        let previousblock = null;

        [...children].forEach((o, i) => {

            let nodeName = o.nodeName.toLowerCase();
            let node = "";
            let nodeType = "";

            block = nodeName.match(/\b(path|line|circle|ellipse)\b/gi);

            if (o.nodeType === 1) {

                let attributes = "";

                if (o.attributes.length) {
                    let collection = [];
                    for (a = 0; a < o.attributes.length; a++) {
                        let n = o.attributes[a].name.toLowerCase();
                        let v = o.attributes[a].value;
                        if (n==="d") {
                            v = v.replace(/\n/g,'').replace(/([MmLlSsQqLlHhVvCcSsQqTtAaZz])/g, "\n" + tabs + '\t\t' + "$1");
                        }
                        collection.push('\n' + tabs + '\t' + n + '="' + v + '"');
                    }
                    attributes = " " + collection.join(" ");
                }

                if (block) {
                    node = tabs + '&lt' + nodeName + attributes + '\n&gt' + tidy(o, level + 1, block[0]) + '' + tabs + '&lt/' + nodeName + '&gt\n';
                } else {
                    node = '&lt' + nodeName + attributes + '&gt'+ tidy(o, level + 1) + '&lt/' + nodeName + '&gt';
                }

            } else if (o.nodeType === 3) {
                node = o.data.replace(/^\s+$/gi, '').replace(/\r+/gi,' ').replace(/\n+/gi,' ').replace(/\t+/gi,'').replace(/\s{2,}/gi, ' ');
            }

            if (node) {
                if (parentblock && !block && (!nodes || previousblock)) { // Is inline content
                    node = tabs + node;
                }
                if (previousblock || (nodes && block)) {
                    node = "\n" + node;
                }
                previousblock = block;
                nodes += node;
            }
        });

        return nodes;

    };

    tools.addEventListener("click", (e) => {
        let data = e.target.dataset;
        // console.log(data);
        if (data.type === "symbol") {

            let id = e.target.querySelector("use").getAttribute("href");
            let symbol = symbols.querySelector(id);
            [...symbol.children].forEach(el => {
                draw.addShape(draw.svg.appendChild(el.cloneNode()));
            });
            setTools(data);

        } else if (data.action === "source") {

            let source = draw.svg.previousElementSibling;

            if (!source || source.nodeName.toLowerCase() !== "pre") {
                let svgDim = draw.svg.getBoundingClientRect();
                source = document.createElement('pre');
                source.style.width = svgDim.width + "px";
                source.style.height = svgDim.height + "px";

                source.setAttribute("contentEditable", "true");
                draw.svg.parentNode.insertBefore(source, draw.svg);
            }

            if (e.target.classList.toggle("active")) {
                draw.svg.style.display = "none";
                source.style.display = "block";
                source.innerHTML = tidy(draw.svg);//.replace(/&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/"/g, '&quot;');
            } else {
                draw.svg.innerHTML = source.innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');//.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
                draw.svg.style.display = "block";
                source.style.display = "none";
                draw.svg.dispatchEvent(new CustomEvent("update"));
            }

        } else {
            draw.set(data);
            setTools(data);
        }
    });

    return tools;

};