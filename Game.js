class Game {

    result = null;
    svg = null;
    letters = null;
    str = "";
    shapes = null;
    index = null;
    playing = false;

    constructor(svg, result, letters) {

        this.svg = typeof svg === "string" ? document.querySelector(svg) : svg;
        this.result = typeof result === "string" ? document.querySelector(result) : result;
        this.letters = typeof letters === "string" ? document.querySelector(letters) : letters;

        let alpha = [...'abcdefghijklmnopqrstuvwxyz'];

        for (let i in alpha) {
            if (+i === Math.floor(alpha.length/2)) {
                this.letters.appendChild(document.createElement("br"));
            }
            let e = document.createElement("button");
            e.textContent = alpha[i];
            this.letters.appendChild(e);
        }

        this.letters.addEventListener("click", e => {
            if (!this.str || !this.playing) {
                return;
            }

            let target = e.target;
            if (target.classList.contains("picked")) {
                return;
            }
            target.classList.add("picked");
            let l = target.textContent;
            let r = new RegExp(l,"gi");
            let match = [];
            let matches = [];
            while ((match = r.exec(this.str)) !== null) {
                matches.push(match);
            }
            if (matches.length) {
                matches.forEach(m => {
                    let ok = this.result.children[m.index];
                    ok.textContent = l;
                    ok.classList.remove("empty");
                    if (!this.result.querySelectorAll(".empty").length) {
                        this.stop("success");
                    }
                });
            } else {
                this.shapes[this.index].classList.remove("pending");
                if (!this.shapes[++this.index]) {
                    this.stop("error");
                    [...this.str].forEach((l,i) => {
                        if (this.result.children[i].classList.contains("empty")) {
                            this.result.children[i].textContent = l;
                        }
                    });
                }
            }
        });
    }

    word(str) {
        this.result.innerHTML = "";
        this.str = str;
        [...this.str].forEach(b => {
            let box = document.createElement("span");
            box.classList.add("empty");
            this.result.appendChild(box);
        });
    }

    stop(status){
        this.playing = false;
        this.svg.classList.add(status);
        this.result.classList.add(status);
        this.shapes.forEach(el=>{
            el.classList.remove("pending");
        });
    }

    play(word){
        if (word) {
            this.word(word);
        }
        if (!this.str) {
            this.word(prompt("Write word"));
        }
        this.shapes = [...this.svg.querySelectorAll("*:not(.static,.visible-on-error,.visible-on-success)")];
        this.index = 0;
        this.svg.classList.remove("success", "error");
        this.result.classList.remove("success", "error");
        this.playing = true;
        [...this.result.children].forEach(el=>{
            el.textContent = "";
            el.classList.add("empty");
        });
        this.letters.querySelectorAll(".picked").forEach(el => {
            el.classList.remove("picked");
        });
        this.shapes.forEach(el=>{
            el.classList.add("pending");
        });
    }
}