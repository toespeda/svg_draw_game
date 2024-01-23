let Sortable = (layers) => {

    layers.addEventListener("mousedown", (e) => {

        let getPos = (e) => {
            return {
                left : e.clientX,
                top : e.clientY
            };
        };

        if (e.target.nodeName.toLowerCase() === "div") {

            const target = e.target;
            const startContainer = target.parentNode;
            let endContainer = startContainer;

            let elements = [...startContainer.querySelectorAll(':scope > div')];//Sortable elements

            let startIndex = elements.indexOf(target);

            let endIndex = startIndex;

            let targetDisplay = window.getComputedStyle(target).display;//Needed for when reinserting later

            const bounds = target.getBoundingClientRect();

            let startPos = getPos(e);

            let lastPos = startPos;//To find direction

            let offset = {
                top : startPos.top - bounds.top,
                right : bounds.right - startPos.left,
                bottom : bounds.bottom - startPos.top,
                left : startPos.left - bounds.left
            };

            target.style.position = "absolute";

            target.classList.add("dragging");

            // Create placeholder for visible placement
            let placeholder = document.createElement("div");
            placeholder.style.height = bounds.height + "px";
            placeholder.style.backgroundColor = "yellow";
            placeholder.classList.add("placeholder");

            startContainer.insertBefore(placeholder, target.nextSibling);

            let move = (e) => {

                let pos = getPos(e);

                //Hide to see what's beneath the dragging element
                target.style.display = "none";
                let hoverElement = document.elementFromPoint(e.clientX, e.clientY);
                target.style.display = targetDisplay;

                if (layers.contains(hoverElement) && !hoverElement.classList.contains("placeholder")) {

                    if (hoverElement.nodeName.toLowerCase() !== "div") {
                        hoverElement = hoverElement.closest('div');
                    }

                    let bcr = hoverElement.getBoundingClientRect();

                    if (hoverElement.className.match(/\b(g|defs|clipPath)\b/) && pos.left - offset.left - bcr.left > 25) {//Add under group

                        if (endContainer !== hoverElement) {
                            endContainer = hoverElement;
                            endContainer.appendChild(placeholder);
                        }

                    } else {

                        if (hoverElement.parentNode !== endContainer) {
                            endContainer = hoverElement.parentNode;
                        }

                        let hoverCenter = bcr.top + (bcr.height/2); //middle of hovered element

                        if (
                            (pos.top < lastPos.top)//moving up
                            &&
                            (pos.top - offset.top)//drag top
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

                }

                target.style.left = (bounds.left + (pos.left - startPos.left)) + "px";
                target.style.top = (bounds.top + (pos.top - startPos.top)) + "px";

                lastPos = pos;

            };

            let selectStart = () => {return false;};

            let stop = () => {

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

                endIndex = [...endContainer.querySelectorAll(':scope > div')].indexOf(target);

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