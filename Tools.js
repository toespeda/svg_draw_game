let Tools = (tools, draw) => {

    tools = typeof tools === "string" ? document.querySelector(tools) : tools;

    let setTools = function(data, target){

        let buttons = tools.querySelectorAll(":scope > li > *");
        buttons.forEach(el => {
            el.classList.remove("active");
        });

        buttons.forEach(el => {
            if (el.dataset["action"] === data["action"]) {
                if (target) {
                    let clone = target.cloneNode(true);
                    el.replaceWith(clone);
                    el = clone;
                }
                el.classList.add("active");
            }
        });

        // if (target) {
        //     tools.querySelector(':scope > li > [data-action="'+data.action+'"] use').setAttribute("href", target.querySelector("use").getAttribute("href"));
        // }

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

            block = true;//nodeName.match(/\b(path|line|circle|ellipse)\b/gi);

            if (o.nodeType === 1) {

                let attributes = "";

                if (o.attributes.length) {
                    let collection = [];
                    for (a = 0; a < o.attributes.length; a++) {
                        let n = o.attributes[a].name.toLowerCase();
                        let v = o.attributes[a].value;
                        if (n==="d") {
                            v = v.replace(/\n/g,'').replace(/([MmLlSsQqLlHhVvCcSsQqTtAaZz])/g, "\n" + tabs + '\t\t' + "$1") + "\n" + tabs + '\t';
                        }
                        collection.push('\n' + tabs + '\t<span class="hi-attribute">' + n + '</span>=<span class="hi-string">"' + v + '"</span>');
                    }
                    attributes = " " + collection.join(" ") + '\n';
                }

                if (block) {
                    node = tabs + '&lt<span class="hi-node">' + nodeName + '</span>' + attributes + tabs + '&gt\n' + tidy(o, level + 1, block[0]) + tabs + '&lt/<span class="hi-node">' + nodeName + '</span>&gt\n';
                } else {
                    node = '&lt<span class="hi-node">' + nodeName + '</span>' + attributes + '&gt'+ tidy(o, level + 1) + '&lt/<span class="hi-node">' + nodeName + '</span>&gt';
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

    let toggleSource = (show) => {

        let source = draw.svg.previousElementSibling;

        if (!source || source.nodeName.toLowerCase() !== "pre") {
            let svgDim = draw.svg.getBoundingClientRect();
            source = document.createElement('pre');
            source.style.width = svgDim.width + "px";
            source.style.height = svgDim.height + "px";
            source.style.lineHeight = "1.2em";
            source.setAttribute("contentEditable", "true");
            draw.svg.parentNode.insertBefore(source, draw.svg);
        }

        if (show) {
            draw.svg.style.display = "none";
            source.style.display = "block";
            source.innerHTML = tidy(draw.svg);//.replace(/&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/"/g, '&quot;');
        } else {
            draw.svg.innerHTML = source.innerHTML.replace(/\<[^>]*>/g,'').replace(/&lt;/g, '<').replace(/&gt;/g, '>');//.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
            draw.svg.style.display = "block";
            source.style.display = "none";
            //draw.svg.dispatchEvent(new CustomEvent("updated"));
            draw.reset();
        }

    };

    tools.addEventListener("click", (e) => {
        let data = {...e.target.dataset};

        if (data.action === "insert") {

            let id = e.target.querySelector("use").getAttribute("href");
            let symbol = symbols.querySelector(id);
            data.symbol = symbol.firstElementChild;
            draw.tools(data);
            setTools(data, e.target);

        } else if (data.action === "source") {

            toggleSource(e.target.classList.toggle("active"));

        } else if (data.action === "draw") {


            draw.tools(data);
            setTools(data, e.target);

        } else {

            draw.tools(data);
            setTools(data);

        }
    });

    return tools;

};