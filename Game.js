class Game {

    result = null;

    svg = null;

    letters = null;

    str = "";

    constructor(svg, result, letters) {

        this.result = result;
        this.svg = svg;
        this.letters = letters;

        let alpha = [...'abcdefghijklmnopqrstuvwxyz'];

        for (let i in alpha) {
            if (+i === Math.floor(alpha.length/2)) {
                this.letters.appendChild(document.createElement("br"));
            }
            let e = document.createElement("button");
            e.textContent = alpha[i];
            this.letters.appendChild(e);
        }

        //Create word boxes

    }

    word(str) {
        this.result.innerHTML = "";
        this.str = str;
        //let word = "test";
        [...this.str].forEach(b => {
            let box = document.createElement("span");
            box.classList.add("empty");
            this.result.appendChild(box);
        });
    }

    play(word){

        if (word) {
            this.word(word);
        }

        // let playButton = e.target;
        let shapes = [...this.svg.querySelectorAll("*:not(.visible-on-error,.visible-on-success)")];
        let index = 0;

        let playing = e => {
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
                        stop("success");
                    }
                });
            } else {
                shapes[index].classList.add("show");
                if (!shapes[++index]) {
                    stop("error");
                }
            }
        };

        let play = () => {
            index = 0;
            this.svg.classList.remove("editing", "success", "error");
            this.svg.classList.add("playing");
            // playButton.innerText="Stop";
            [...this.result.children].forEach(el=>{
                el.textContent = "";
                el.classList.add("empty");
            });
            this.letters.querySelectorAll(".picked").forEach(el => {
                el.classList.remove("picked");
            });
            shapes.forEach(el=>{
                el.classList.remove("show");
            });
            this.letters.addEventListener("click", playing);
        };

        let stop = (status) => {
            this.svg.classList.remove("playing");
            this.svg.classList.add(status);
            // playButton.innerText="Play";
            this.letters.removeEventListener("click", playing);

        };

        // if (playButton.innerText==="Stop") {
        //     stop();
        // } else {
            play();
        // }
    }
}