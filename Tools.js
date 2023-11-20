let Tools = (tools, draw) => {

    tools = typeof tools === "string" ? document.querySelector(tools) : tools;

    let setTools = function(data){
        for (var i in data) {
            let buttons = document.querySelectorAll("#tools > li > *");
            buttons.forEach(el => {
                el.classList.remove("active");
            });
            buttons.forEach(el => {
                el.classList[el.dataset[i] === data[i] ? "add" : "remove"]("active");
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

        let children = element.childNodes;// ? $(element.childNodes) : $(element).contents();

        let tabs = "\t".repeat(level);

        let block = null;
        let previousblock = null;

        [...children].forEach((o, i) => {

            let nodeName = o.nodeName.toLowerCase();
            let node = "";
            let nodeType = "";

            console.log("nodeName",nodeName);
            console.log("nodeType",o.nodeType);

            //block = nodeName.match(/\b(br|h[1-6]|dl|fieldset|form|frameset|map|ol|p|pre|select|table|tbody|td|th|tr|ul|li|blockquote|option|div)\b/gi);

            block = nodeName.match(/\b(path|line|circle|ellipse)\b/gi);

            if (o.nodeType === 1) {

                let attributes = "";

                if (o.attributes.length) {
                    let collection = [];
                    for (a = 0; a < o.attributes.length; a++) {
                        collection.push(o.attributes[a].name.toLowerCase()+'="'+o.attributes[a].value+'"');
                    }
                    attributes = " " + collection.join(" ");
                }

                if (nodeName.match(/\b(br|img)\b/gi)) {

                    node = '&lt' + nodeName + attributes + ' /&gt';

                } else if (block) {

                    node = tabs + '&lt' + nodeName + attributes + '&gt' + tidy(o, level + 1, block[0]) + '' + tabs + '&lt/' + nodeName + '&gt<br /><br />';

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
        console.log(data);

        setTools(data);

        if (data.type === "symbol") {

            let id = e.target.querySelector("use").getAttribute("href");
            let symbol = symbols.querySelector(id);
            [...symbol.children].forEach(el => {
                draw.addShape(draw.svg.appendChild(el.cloneNode()));
            });

        } else if (data.action === "source") {

            let source = draw.svg.previousElementSibling;
            if (!source || source.nodeName.toLowerCase() !== "code") {
                let svgDim = draw.svg.getBoundingClientRect();
                source = document.createElement('code');
                source.style.width = svgDim.width + "px";
                source.style.height = svgDim.height + "px";
                source.style.overflow = "scroll";
                draw.svg.parentNode.insertBefore(source, draw.svg);
            }

            if (e.target.classList.contains("active")) {
                draw.svg.style.display = "none";
                source.style.display = "block";
                source.innerHTML = tidy(draw.svg);//.replace(/&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/"/g, '&quot;');
            } else {
                draw.svg.style.display = "block";
                source.style.display = "none";
            }

        } else {
            draw.set(data);
        }
    });

    return tools;

};