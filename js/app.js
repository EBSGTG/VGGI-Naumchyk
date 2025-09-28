class App {
    constructor(gl) {
        this.gl = gl;
        this.model = new Model(gl);
        this.uPolylineCount = 20;
        this.vPolylineCount = 20;
        this.scale = 1.0;
        this.rotationX = 180;
        this.rotationY = 180;
        this.showULines = true;
        this.showVLines = true;
        this.projectionMatrix = new M4();
        this.modelViewMatrix = new M4();
        this.initShaders();
        this.setupEventListeners();
        this.resizeCanvas();
    }

    initShaders() {
        const vertexShaderSource = `
            attribute vec4 aVertexPosition;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            uniform vec4 uColor;
            void main() {
                gl_FragColor = uColor;
            }
        `;

        this.shaderProgram = new Shader(this.gl, vertexShaderSource, fragmentShaderSource);
    }

    resizeCanvas() {
        const container = this.gl.canvas.parentElement;
        this.gl.canvas.width = container.clientWidth;
        this.gl.canvas.height = container.clientHeight;
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        const fieldOfView = 45 * Math.PI / 180;
        const aspect = this.gl.canvas.width / this.gl.canvas.height;
        const near = 0.1;
        const far = 100.0;

        this.projectionMatrix.identity().perspective(fieldOfView, aspect, near, far);
    }

    updateModelViewMatrix() {
        this.modelViewMatrix.identity()
            .translate(0, 0, -6.0)
            .rotateX(this.rotationX * Math.PI / 180)
            .rotateY(this.rotationY * Math.PI / 180)
            .scale(this.scale, this.scale, this.scale);
    }

    drawScene() {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.enable(this.gl.DEPTH_TEST);

        this.updateModelViewMatrix();
        this.model.generateWireframe(this.uPolylineCount, this.vPolylineCount, this.showULines, this.showVLines);
        this.model.draw(this.shaderProgram, this.projectionMatrix, this.modelViewMatrix);
    }

    setupEventListeners() {
        document.getElementById('rotationX').addEventListener('input', (e) => {
            this.rotationX = parseInt(e.target.value);
            document.getElementById('rotationXValue').textContent = this.rotationX + '°';
        });

        document.getElementById('rotationY').addEventListener('input', (e) => {
            this.rotationY = parseInt(e.target.value);
            document.getElementById('rotationYValue').textContent = this.rotationY + '°';
        });

        document.getElementById('uCount').addEventListener('input', (e) => {
            this.uPolylineCount = parseInt(e.target.value);
            document.getElementById('uCountValue').textContent = this.uPolylineCount;
        });

        document.getElementById('vCount').addEventListener('input', (e) => {
            this.vPolylineCount = parseInt(e.target.value);
            document.getElementById('vCountValue').textContent = this.vPolylineCount;
        });

        document.getElementById('scale').addEventListener('input', (e) => {
            this.scale = parseFloat(e.target.value);
            document.getElementById('scaleValue').textContent = this.scale.toFixed(1);
        });

        document.getElementById('toggleU').addEventListener('click', () => {
            this.showULines = !this.showULines;
        });

        document.getElementById('toggleV').addEventListener('click', () => {
            this.showVLines = !this.showVLines;
        });

        document.getElementById('resetView').addEventListener('click', () => {
            this.resetView();
        });

        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    resetView() {
        this.rotationX = 180;
        this.rotationY = 180;
        this.uPolylineCount = 20;
        this.vPolylineCount = 20;
        this.scale = 1.0;
        this.showULines = true;
        this.showVLines = true;

        document.getElementById('rotationX').value = this.rotationX;
        document.getElementById('rotationY').value = this.rotationY;
        document.getElementById('uCount').value = this.uPolylineCount;
        document.getElementById('vCount').value = this.vPolylineCount;
        document.getElementById('scale').value = this.scale;

        document.getElementById('rotationXValue').textContent = this.rotationX + '°';
        document.getElementById('rotationYValue').textContent = this.rotationY + '°';
        document.getElementById('uCountValue').textContent = this.uPolylineCount;
        document.getElementById('vCountValue').textContent = this.vPolylineCount;
        document.getElementById('scaleValue').textContent = this.scale.toFixed(1);
    }

    animate() {
        this.drawScene();
        requestAnimationFrame(() => this.animate());
    }
}