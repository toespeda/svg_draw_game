let Popup = (content, target) => {

    let targetdim = target.getBoundingClientRect();

    let popup = document.createElement("div");

    document.body.appendChild(popup);

    if (typeof content === "string") {
        // let cont = document.createElement("div");
        // cont.innerHTML = content;
        // content = cont;
        popup.innerHTML = content;
        content = popup.firstChild;
    } else {
        popup.appendChild(content);
    }

    popup.style.position = "absolute";
    popup.classList.add("popup");

    let remove = document.createElement('span');
    remove.classList.add("remove");
    remove.innerText = "x";
    popup.insertBefore(remove, popup.firstChild);

    remove.addEventListener("click", e => {
        content.dispatchEvent(new CustomEvent("close"));
        //popup.remove();
    });

    let closePopup = (e) => {

        // if (!e.isTrusted) {//Custom event
        //     console.log("Close always");
        // }
        //
        // if (content.contains(e.target)) {
        //     console.log("content contains target", content);
        //     return;
        // }

        popup.remove();
        //content.removeEventListener("close", closePopup);//Not necessary
        document.removeEventListener("click", closePopup);

    };

    setTimeout(function () {
        document.addEventListener("click", closePopup);
        let parentPopup = target.closest(".popup");
        if (parentPopup) {
            parentPopup.children[1].addEventListener("click", closePopup);
        }
    }, 100);

    content.addEventListener("close", closePopup);

    content.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    let dim = popup.getBoundingClientRect();

    let stemSize = 18;
    let stemOffset = 28;

    let stemLong = stemSize+1 * Math.abs(Math.cos(-45)) + stemSize+1 * Math.abs(Math.sin(-45));//Stem is rotated box with border top and left

    let scrollTop = 0;
    let scrollLeft = 0;

    let getClip = (left, top) => {
        return {
            top: Math.min(0, top - scrollTop),
            right: Math.min(0, (window.innerWidth + scrollLeft) - (left + dim.width)),
            bottom: Math.min(0, (window.innerHeight + scrollTop) - (top + dim.height)),
            left: Math.min(0, left - scrollLeft)
        };
    };

    let test = {
        top: function (v) {
            let height = stemSize + dim.height;
            let top = targetdim.y - height;
            let left = targetdim.x - (dim.width - targetdim.width) / 2;
            return {
                direction: "top",
                max: top - scrollTop,
                clip: getClip(left, top),
                position: {
                    top: top,
                    left: left
                }
            };
        },
        right: function (v) {
            let left = targetdim.x + targetdim.width + stemSize;
            let right = left + dim.width;
            let top = targetdim.y - (stemOffset - targetdim.height / 2);
            return {
                direction: "right",
                max: window.innerWidth - right,
                clip: getClip(left, top),
                position: {
                    top: top,
                    left: left
                }
            };
        },
        bottom: function (v) {
            let top = targetdim.y + targetdim.height + stemSize;
            let left = targetdim.x - (dim.width - targetdim.width) / 2;
            let bottom = top + dim.height;
            return {
                direction: "bottom",
                max: (window.innerHeight + scrollTop) - bottom,
                clip: getClip(left, top),
                position: {
                    top: top,
                    left: left
                }
            };
        },
        left: function (v) {
            let top = targetdim.y - (stemOffset - targetdim.height / 2);
            let left = targetdim.x - (dim.width + stemSize);
            return {
                direction: "left",
                max: left,
                clip: getClip(left, top),
                position: {
                    top: top,
                    left: left
                }
            };
        }
    };

    let orders = "top right bottom left".split(" ");
    let value = null;
    let values = [];

    for (let p in orders) {
        let n = orders[p];
        let t = test[n]();
        t.outside = t.position.top < 0 || t.position.left < 0;
        t.clipping = t.clip.top + t.clip.right + t.clip.bottom + t.clip.left;
        if (!t.clipping) {
            value = t;
            break;
        }
        if (n === "top" && t.clip.top < 0 || n === "bottom" && t.clip.bottom < 0 || n === "left" && t.clip.left < 0) {
            continue;
        }
        values.push(t);

    }

    if (!value) {
        if (values.length) {
            values.sort(function (a, b) {
                return b.clipping - a.clipping;
            });
            value = values[0];
        } else {
            value = test["bottom"]();
        }
    }

    popup.classList.add(value.direction);
    popup.style.left = value.position.left+"px";
    popup.style.top = value.position.top+"px";

    switch (value.direction) {
        case "top" : break;
        case "bottom" : break;
        case "right" :
            if (dim.height < stemOffset + stemSize) {//A silly way to calculate..
                let max = Math.max(Math.floor(dim.height/2), stemSize / 2);
                popup.style.setProperty('--offset-top', max + 'px');
                value.position.top += stemOffset - max;
                popup.style.top = value.position.top + "px";
            }
            break;
        case "left" : break;
    }




    return content;

};