let Sortable = function(layers) {

    layers.addEventListener("mousedown", (e) => {

        // console.log("mousedown on sortable", e.target);

        let getPos = function(e){
            return {
                left : e.clientX,
                top : e.clientY
            };
        };

        if (e.target.nodeName.toLowerCase() === "div") {

            const target = e.target;
            //console.log("target", target);
            const startContainer = target.parentNode;
            let endContainer = startContainer;

            let elements = [...startContainer.querySelectorAll(':scope > div:not(.placeholder)')];//Sortable elements

            let startIndex = elements.indexOf(target);

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

            target.classList.add("dragging");

            // Create placeholder for visible placement
            let placeholder = document.createElement("div");
            placeholder.style.height = bounds.height + "px";
            placeholder.style.backgroundColor = "yellow";
            placeholder.classList.add("placeholder");

            startContainer.insertBefore(placeholder, target.nextSibling);

            let move = function(e){

                let pos = getPos(e);

                //Hide to see what's beneath the dragging element
                target.style.display = "none";
                let hoverElement = document.elementFromPoint(e.clientX, e.clientY);
                target.style.display = targetDisplay;

                if (!hoverElement.classList.contains("placeholder")) {

                    if (!layers.contains(hoverElement)) {
                        return;
                    }

                    if (hoverElement.nodeName.toLowerCase() === "span") {//Dropzone

                        hoverElement = hoverElement.parentNode;

                        if (hoverElement.classList.contains("g")) {
                            endContainer = hoverElement;
                            elements = [...endContainer.querySelectorAll(':scope > div:not(.placeholder)')];
                            hoverElement.appendChild(placeholder);
                            endIndex = 0;
                            return;
                        }

                    }

                    if (hoverElement.nodeName.toLowerCase() !== "div") {
                        return;
                    }

                    if (hoverElement.parentNode !== endContainer) {
                        endContainer = hoverElement.parentNode;
                        elements = [...endContainer.querySelectorAll(':scope > div:not(.placeholder)')];
                    }

                    endIndex = elements.indexOf(hoverElement);

                    let bcr = hoverElement.getBoundingClientRect();

                    let hoverCenter = bcr.top + (bcr.height/2); //middle of hovered element

                    if (
                        (pos.top < lastPos.top)//moving up
                        &&
                        (pos.top + offset.top)//drag top
                        <
                        hoverCenter
                    ) {
                        endContainer.insertBefore(placeholder, hoverElement);
                    } else if (
                        (pos.top > lastPos.top)//moving down
                        &&
                        (pos.top + offset.bottom)//drag bottom
                        >
                        hoverCenter
                    ) {
                        endContainer.insertBefore(placeholder, hoverElement.nextSibling);
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
                target.classList.remove("dragging");

                placeholder.replaceWith(target);

                if ((startIndex !== endIndex) || (startContainer !== endContainer)) {

                    //Add custom event to layers element
                    layers.dispatchEvent(new CustomEvent("sorted", {
                        detail: {
                            startIndex:startIndex,
                            endIndex:endIndex,
                            startContainer:startContainer,
                            endContainer:endContainer
                        }
                    }));

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