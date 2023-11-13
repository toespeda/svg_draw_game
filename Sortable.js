let Sortable = function(layers) {

    layers.addEventListener("mousedown", (e) => {

        // console.log("mousedown on sortable", e.target);

        let getPos = function(e){
            return {
                left : e.clientX,
                top : e.clientY
            };
        };

        // if (e.target.nodeName.toLowerCase() === "span") {
        //     let elements = [...layers.children];
        //     let index = elements.indexOf(e.target.parentNode);
        //     layers.dispatchEvent(new CustomEvent("removed", { detail: {index:index} }));
        //     e.target.parentNode.remove();
        // }

        if (e.target.nodeName.toLowerCase() === "li") {

            let elements = [...layers.childNodes];//Sortable elements

            const target = e.target;

            let startIndex = elements.indexOf(target);
            let hoverIndex = null;
            let endIndex = startIndex;

            let targetDisplay = window.getComputedStyle(target).display;//Needed for when reinserting later

            const bounds = target.getBoundingClientRect();

            let startPos = getPos(e);

            let lastPos = startPos;//To find direction

            let offset = {
                top : bounds.top - startPos.top,
                bottom : bounds.bottom - startPos.top
            };

            target.style.position = "absolute";

            // Create placeholder for visible placement
            let placeholder = document.createElement("div");
            placeholder.style.height = bounds.height + "px";
            placeholder.style.backgroundColor = "yellow";
            layers.insertBefore(placeholder, target.nextSibling);

            let move = function(e){

                let pos = getPos(e);

                target.style.display = "none";//Hide
                let hoverElement = document.elementFromPoint(e.clientX, e.clientY);
                target.style.display = targetDisplay;

                hoverIndex = elements.indexOf(hoverElement);

                if (hoverIndex > -1) {//Is hovering sortable element

                    endIndex = hoverIndex;

                    let bcr = hoverElement.getBoundingClientRect();

                    let hoverCenter = bcr.top + (bcr.height/2); //middle of hovered element

                    if (
                        (pos.top < lastPos.top)//moving up
                        &&
                        (pos.top + offset.top)//drag top
                        <
                        hoverCenter
                    ) {
                        layers.insertBefore(placeholder, hoverElement);
                    } else if (
                        (pos.top > lastPos.top)//moving down
                        &&
                        (pos.top + offset.bottom)//drag bottom
                        >
                        hoverCenter
                    ) {
                        layers.insertBefore(placeholder, hoverElement.nextSibling);
                    }
                }

                target.style.left = (bounds.left + (pos.left - startPos.left)) + "px";
                target.style.top = (bounds.top + (pos.top - startPos.top)) + "px";

                lastPos = pos;

            };

            let selectStart = function(){return false;};

            let stop = function(){

                //Clear events
                document.removeEventListener("mousemove", move);
                document.removeEventListener("mouseup", stop);

                //Remove unselectable properties and events
                document.body.removeAttribute("unselectable");
                document.body.style.MozUserSelect = "";
                document.body.removeEventListener("selectstart", selectStart);

                //Reset styles
                target.style.position = "";
                target.style.left = "";
                target.style.top = "";

                placeholder.replaceWith(target);

                if (startIndex !== endIndex) {

                    elements.splice(endIndex, 0, elements.splice(startIndex, 1)[0]);//At position, delete 0, add element taken from elements

                    //Add custom event to layers element
                    layers.dispatchEvent(new CustomEvent("sorted", { detail: {startIndex:startIndex,endIndex:endIndex} }));



                }

            };

            //Add drag and drag-end events
            document.addEventListener("mousemove", move, false);
            document.addEventListener("mouseup", stop);

            //Add unselectable properties and events
            document.body.setAttribute("unselectable", "on");
            document.body.style.MozUserSelect = "none";
            document.body.addEventListener("selectstart", selectStart);
        }

    });
}