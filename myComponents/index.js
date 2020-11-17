import './lib/webaudio-controls.js';

const getBaseURL = () => {
    const base = new URL('.', import.meta.url);
    console.log("Base = " + base);
    return `${base}`;
};

const template = document.createElement("template");
template.innerHTML = `
  <style>
    .handler-music {
        text-align: center;
    }
    h2 {
          color:white;
    }
    canvas {
        width:100%;
        background-color: black;
    }
    .lecteur {
        background-color: black;
        color : white;
       width : 30%; 
    }
    .egaliseur {
        background-color: black;
        text-align: center;
        border : 1px solid black;
    }

  </style>

  <div class="lecteur">
    <audio id="myPlayer" crossorigin="anonymous" loop>
        <source id="src" src="http://mainline.i3s.unice.fr/multitrack/Back_In_Black/Backing vocals.mp3" type="audio/mp3" />
    </audio>
    <h2 id="music-title"></h2>
    <div class="handler-music"> 
    <webaudio-knob id="playButton" src="./assets/imgs/button.png" sprites="5" height=24 width=24></webaudio-knob>
        <progress id="progressRuler" min=0 value=0 step=0.1></progress>
        <img id="pauseButton" src="./assets/imgs/pause.png" width="18" height="18" />
        <img id="remiseAZero"src="./assets/imgs/replay.png" width="20" height="20" />
    </div>

    <br>
    <webaudio-knob id="knobVolume2" tooltip="Volume:%s" src="./assets/imgs/Vintage_VUMeter_2.png" sprites="50" value=1 min="0" max="100" step=1>
        Volume
    </webaudio-knob>
    <webaudio-knob id="knobVolume" tooltip="Volume:%s" src="./assets/imgs/LittlePhatty.png" sprites="100" value=1 min="0" max="1" step=0.01>
        Volume
    </webaudio-knob>
    <div id="right-button" style="float: right">
        <webaudio-knob id="knobStereo" tooltip="Balance:%s" src="./assets/imgs/bouton2.png" sprites="127" value=0   min="-1" max="1" step=0.01>
        Balance G/D
        </webaudio-knob> 
        <webaudio-switch id="switch" src="./assets/imgs/switch.png" height=50 width=50></webaudio-switch>
    </div>
    <div class="egaliseur">
        <div class="controls" style="display:flex">
        <div style="flex:1">
            <webaudio-knob id="knobSlider0" tooltip="db: %s" src="./assets/imgs/slider_knobman.png" width="50" height="128" sprites="30" value=0   min="-30" max="30" step="1">
            </webaudio-knob> 
        </div>   
        <div style="flex:1">
            <webaudio-knob id="knobSlider1" tooltip="db: %s" src="./assets/imgs/slider_knobman.png" width="50" height="128" sprites="30" value=0   min="-30" max="30" step="1">
            </webaudio-knob> 
            </div>
            <div style="flex:1">
            <webaudio-knob id="knobSlider2" tooltip="db: %s" src="./assets/imgs/slider_knobman.png" width="50" height="128" sprites="30" value=0   min="-30" max="30" step="1">
            </webaudio-knob> 
            </div>
            <div style="flex:1">
            <webaudio-knob id="knobSlider3" tooltip="db: %s" src="./assets/imgs/slider_knobman.png" width="50" height="128" sprites="30" value=0   min="-30" max="30" step="1">
            </webaudio-knob> 
            </div>
            <div style="flex:1">
            <webaudio-knob id="knobSlider4" tooltip="db: %s" src="./assets/imgs/slider_knobman.png" width="50" height="128" sprites="30" value=0   min="-30" max="30" step="1">
            </webaudio-knob> 
            </div>
            <div style="flex:1">
            <webaudio-knob id="knobSlider5" tooltip="db: %s" src="./assets/imgs/slider_knobman.png" width="50" height="128" sprites="30" value=0   min="-30" max="30" step="1">
            </webaudio-knob> 
            </div>
        </div>
            <div style="display:flex">
                <div style="flex:1">60Hz</div>
                <div style="flex:1">170Hz</div> 
                <div style="flex:1">350Hz</div>
                <div style="flex:1">1000Hz</div>
                <div style="flex:1">3500Hz</div>
                <div style="flex:1">10000Hz</div>
        </div>
    </div>

    <canvas id="myCanvas" width=300 height=150></canvas>

  </div>
        `;
        //Volume: 0 <input type="range" min=0 max=1 step=0.1 id="volume"> 1

class MyAudioPlayer extends HTMLElement {
    constructor() {
        super();
        this.src = this.getAttribute("src");
        this.volume = 1;
        this.filters = [];

        this.attachShadow({ mode: "open" });
        //this.shadowRoot.innerHTML = template;
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        // Creates the equalizer, comprised of a set of biquad filters
        this.basePath = getBaseURL(); // url absolu du composant
        // Fix relative path in WebAudio Controls elements
        this.fixRelativeImagePaths();
    }

    connectedCallback() {

        this.player = this.shadowRoot.querySelector("#myPlayer");
        this.player.loop = true;

        // get the canvas, its graphic context...
        this.canvas = this.shadowRoot.querySelector("#myCanvas");
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.canvasContext = this.canvas.getContext('2d');

        this.audioContext = new AudioContext();
        // Build the audio graph with an analyser node at the    end
        let playerNode = this.audioContext.createMediaElementSource(this.player);
        this.pannerNode = this.audioContext.createStereoPanner();
        
        this.volumeNode =  this.audioContext.createAnalyser();
        

        // Set filters
        [60, 170, 350, 1000, 3500, 10000    ].forEach((freq, i) => {
            var eq = this.audioContext.createBiquadFilter();
            eq.frequency.value = freq;
            eq.type = "peaking";
            eq.gain.value = 0;
            this.filters.push(eq);
        });
        for (var i = 0; i < this.filters.length - 1; i++) {
            this.filters[i].connect(this.filters[i + 1]);
        }

        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 1024;
        this.bufferLength = this.analyserNode.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        for (var i = 0; i < this.filters.length - 1; i++) {
            this.filters[i].connect(this.filters[i + 1]);
        }

        this.filters[this.filters.length - 1].connect(this.audioContext.destination);

        playerNode
            .connect(this.filters[0])
            .connect(this.pannerNode)
            .connect(this.analyserNode)
            .connect(this.volumeNode)
            .connect(this.audioContext.destination); // connect to the speakers

        this.visualize();
        this.declareListeners();
        
    }

    getAverageVolume(array) {
        var values = 0;
        var average;
        var length = array.length;
        // get all the frequency amplitudes
        for (var i = 0; i < length; i++) {
          values += array[i];
        }
        average = values / length;
        return average;
    }
    
    visualizeFrequence() {
        // clear the canvas
        this.canvasContext.clearRect(0, 0, this.width, this.height);
        // Get the analyser data
        this.analyserNode.getByteFrequencyData(this.dataArray);
        
        var barWidth = this.width / this.bufferLength;
        var barHeight;
        var x = 0;
        // values go from 0 to 255 and the canvas heigt is 100. Let's rescale
        // before drawing. This is the scale factor
        var heightScale = this.height/128;
        for(var i = 0; i < this.bufferLength; i++) {
            // between 0 and 255
            barHeight = this.dataArray[i];
        
            // The color is red but lighter or darker depending on the value
            this.canvasContext.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
            // scale from [0, 255] to the canvas height [0, height] pixels
            barHeight *= heightScale;
            // draw the bar
            this.canvasContext.fillRect(x, this.height-barHeight/2, barWidth, barHeight/2);
        
            // 1 is the number of pixels between bars - you can change it
            x += barWidth + 1;
        }

        this.average = this.getAverageVolume(this.dataArray);
        this.shadowRoot.querySelector("#knobVolume2").value = this.average;
        console.log(this.average);
        
        // once again call the visualize function at 60 frames/s
        requestAnimationFrame(() => { this.visualizeFrequence() });

        
    }
    visualize() {
        this.average = this.getAverageVolume(this.dataArray);
        this.shadowRoot.querySelector("#knobVolume2").value = this.average;
        console.log(this.average);

        // 1 - clear the canvas
        this.canvasContext.clearRect(0, 0, this.width, this.height);
        // Or use rgba fill to give a slight blur effect
        this.canvasContext.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.canvasContext.fillRect(0, 0, this.width, this.height);
        // 2 - Get the analyser data - for waveforms we need time domain data
        this.analyserNode.getByteTimeDomainData(this.dataArray);

        // 3 - draws the waveform
        this.canvasContext.lineWidth = 2;
        this.canvasContext.strokeStyle = 'lightBlue';

        // the waveform is in one single path, first let's
        // clear any previous path that could be in the buffer
        this.canvasContext.beginPath();
        let sliceWidth = this.width / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            // dataArray values are between 0 and 255,
            // normalize v, now between 0 and 1
            let v = this.dataArray[i] / 255;
            // y will be in [0, canvas height], in pixels
            let y = v * this.height;

            if (i === 0) {
                this.canvasContext.moveTo(x, y);
            } else {
                this.canvasContext.lineTo(x, y);
            }

            x += sliceWidth;
        }
        
        this.canvasContext.lineTo(this.width, this.height / 2);
        // draw the path at once
        this.canvasContext.stroke();
        // once again call the visualize function at 60 frames/s
        requestAnimationFrame(() => { this.visualize() });
    }

    fixRelativeImagePaths() {
        // change webaudiocontrols relative paths for spritesheets to absolute
        let webaudioControls = this.shadowRoot.querySelectorAll(
            'webaudio-knob, webaudio-slider, webaudio-switch, img'
        );
        webaudioControls.forEach((e) => {
            let currentImagePath = e.getAttribute('src');
            if (currentImagePath !== undefined) {
                //console.log("Got wc src as " + e.getAttribute("src"));
                let imagePath = e.getAttribute('src');
                //e.setAttribute('src', this.basePath  + "/" + imagePath);
                e.src = this.basePath + "/" + imagePath;
                //console.log("After fix : wc src as " + e.getAttribute("src"));
            }
        });
    }

    declareListeners() {
        this.shadowRoot
        .querySelector("#myPlayer")
        .addEventListener("loadeddata", (event) => {
            this.writeTitle();
        });        
        this.shadowRoot
            .querySelector("#playButton")
            .addEventListener("click", (event) => {
                this.play();
            });

        this.shadowRoot
            .querySelector("#pauseButton")
            .addEventListener("click", (event) => {
                this.pause();
            });
        this.shadowRoot
            .querySelector("#remiseAZero")
            .addEventListener("click", (event) => {
                this.remiseAZero();
            });
        this.shadowRoot
            .querySelector("#knobVolume")
            .addEventListener("input", (event) => {
                this.setVolume(event.target.value);
            });
        /*
        this.shadowRoot
            .querySelector("#volume")
            .addEventListener("input", (event) => {
                this.setVolume(event.target.value);
            });
        */
        this.shadowRoot
            .querySelector("#knobStereo")
            .addEventListener("input", (event) => {
                this.setBalance(event.target.value);
            });
        this.shadowRoot
            .querySelector("#knobSlider0")
            .addEventListener("input", (event) => {
                this.changeGain(event.target.value, 0);
            });
        this.shadowRoot
            .querySelector("#knobSlider1")
            .addEventListener("input", (event) => {
                this.changeGain(event.target.value, 1);
            });
        this.shadowRoot
            .querySelector("#knobSlider2")
            .addEventListener("input", (event) => {
                this.changeGain(event.target.value, 2);
            });
        this.shadowRoot
            .querySelector("#knobSlider3")
            .addEventListener("input", (event) => {
                this.changeGain(event.target.value, 3);
            });
        this.shadowRoot
            .querySelector("#knobSlider4")
            .addEventListener("input", (event) => {
                this.changeGain(event.target.value, 4);
            });
        this.shadowRoot
            .querySelector("#knobSlider5")
            .addEventListener("input", (event) => {
                this.changeGain(event.target.value, 5);
            });
        this.shadowRoot
            .querySelector("#switch")
            .addEventListener("change", (event) => {
                this.setSwitch(event.target.value);
            });
        this.player.addEventListener('timeupdate', (event) => {
            let p = this.shadowRoot.querySelector("#progressRuler");
            try {
                p.max = this.player.duration;
                p.value = this.player.currentTime;
            } catch (err) {
                //console.log(err);
            }
        });

    }

    // API
    writeTitle() {
        let src = this.shadowRoot.querySelector("#src").getAttribute("src");
        let splitTab = src.split("/");
        this.shadowRoot.querySelector("#music-title").innerHTML = splitTab[splitTab.length - 1];
    }
    setVolume(val) {
        this.player.volume = val;
    }

    setSwitch(button){
        console.log(button);
        if(button==1){
            this.visualizeFrequence();
        } else {
            this.visualize();
        }

    }
    setBalance(val) {
        this.pannerNode.pan.value = val;
    }

    play() {
        this.player.play();
    }

    pause() {
        this.player.pause();
    }

    remiseAZero() {
        this.player.currentTime = 0;
    }

    // Event listener called by the sliders
    changeGain(sliderVal, nbFilter) {
        let value = parseFloat(sliderVal);
        this.filters[nbFilter].gain.value = value;
        // Updates output labels
        //let output = document.querySelector("#gain" + nbFilter);
        //output.value = value + " dB";

        //this.shadowRoot.querySelector("#gain" + nbFilter).value = value + " dB";
    }
}

customElements.define("my-audioplayer", MyAudioPlayer);
