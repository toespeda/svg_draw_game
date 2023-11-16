let Popup = (target, content) => {

    let targetdim = target.getBoundingClientRect();

    let cont = null;

    if (typeof content === "text") {
        cont = document.createElement("div");
        cont.innerHTML = content || "";
    } else {
        cont = content;
    }

    cont.style.position = "absolute";
    cont.classList.add("popup");
    document.body.appendChild(cont);

    let remove = document.createElement('span');
    remove.classList.add("remove");
    remove.innerText = "x";
    cont.insertBefore(remove, cont.firstChild);

    remove.addEventListener("click", e => {
        cont.remove();
    });

    let dim = cont.getBoundingClientRect();
    let stemSize = 18;
    let stemOffset = 28;
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

    };

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

    cont.classList.add(value.direction);
    cont.style.left = value.position.left+"px";
    cont.style.top = value.position.top+"px";

};