class App {
    constructor(gl) {
        this.gl = gl;
        this.model = new Model(gl);

        this.uSegments = 30;
        this.vSegments = 30;
        this.scale = 5.0;
        this.rotationX = 30;
        this.rotationY = 45;

        this.lightPosition = [5.0, 5.0, 5.0];
        this.ambient = 0.2;
        this.diffuse = 0.7;
        this.specular = 0.5;
        this.shininess = 32.0;
        this.lightAnimation = true;
        this.lightAngle = 0;

        this.projectionMatrix = new M4();
        this.modelViewMatrix = new M4();
        this.normalMatrix = new M4();

        this.initShaders();
        this.setupEventListeners();
        this.resizeCanvas();
    }

    initShaders() {
        const vertexShaderSource = `
            attribute vec4 aVertexPosition;
            attribute vec3 aVertexNormal;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uNormalMatrix;
            uniform vec3 uLightPosition;
            
            varying vec3 vNormal;
            varying vec3 vLightDirection;
            varying vec3 vViewPosition;
            
            void main() {
                vec4 viewPosition = uModelViewMatrix * aVertexPosition;
                gl_Position = uProjectionMatrix * viewPosition;
                
                // Transform normal using normal matrix
                vNormal = mat3(uNormalMatrix) * aVertexNormal;
                
                // Calculate light direction in view space
                vec4 lightViewPosition = uModelViewMatrix * vec4(uLightPosition, 1.0);
                vLightDirection = lightViewPosition.xyz - viewPosition.xyz;
                
                vViewPosition = viewPosition.xyz;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            
            uniform vec4 uAmbientColor;
            uniform vec4 uDiffuseColor;
            uniform vec4 uSpecularColor;
            uniform float uShininess;
            uniform int uUseWireframe;
            
            varying vec3 vNormal;
            varying vec3 vLightDirection;
            varying vec3 vViewPosition;
            
            void main() {
                if (uUseWireframe == 1) {
                    gl_FragColor = vec4(0.8, 0.8, 0.8, 1.0);
                    return;
                }
                
                vec3 normal = normalize(vNormal);
                vec3 lightDir = normalize(vLightDirection);
                vec3 viewDir = normalize(-vViewPosition);
                vec3 reflectDir = reflect(-lightDir, normal);
                
                vec4 ambient = uAmbientColor;
                
                float diff = max(dot(normal, lightDir), 0.0);
                vec4 diffuse = uDiffuseColor * diff;
                
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
                vec4 specular = uSpecularColor * spec;
                
                vec4 result = ambient + diffuse + specular;
                gl_FragColor = vec4(result.rgb, 1.0);
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

    updateMatrices() {
        // Model-view matrix
        this.modelViewMatrix.identity()
            .translate(0, 0, -8.0)
            .rotateY(this.rotationY * Math.PI / 180)
            .rotateX(this.rotationX * Math.PI / 180)
            .scale(this.scale, this.scale, this.scale);

        this.normalMatrix.identity();
        const mv = this.modelViewMatrix.elements;
        this.normalMatrix.elements[0] = mv[0];
        this.normalMatrix.elements[1] = mv[1];
        this.normalMatrix.elements[2] = mv[2];
        this.normalMatrix.elements[4] = mv[4];
        this.normalMatrix.elements[5] = mv[5];
        this.normalMatrix.elements[6] = mv[6];
        this.normalMatrix.elements[8] = mv[8];
        this.normalMatrix.elements[9] = mv[9];
        this.normalMatrix.elements[10] = mv[10];
    }

    updateLightPosition() {
        if (this.lightAnimation) {
            this.lightAngle += 0.02;
            const radius = 8.0;
            this.lightPosition[0] = radius * Math.cos(this.lightAngle);
            this.lightPosition[1] = 3.0;
            this.lightPosition[2] = radius * Math.sin(this.lightAngle);
        }
    }

    drawScene() {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.enable(this.gl.DEPTH_TEST);

        this.updateMatrices();
        this.updateLightPosition();

        const lightingParams = {
            ambient: this.ambient,
            diffuse: this.diffuse,
            specular: this.specular,
            shininess: this.shininess
        };

        this.model.draw(this.shaderProgram, this.projectionMatrix, this.modelViewMatrix,
                       this.normalMatrix, this.lightPosition, lightingParams);
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

        document.getElementById('uSegments').addEventListener('input', (e) => {
            this.uSegments = parseInt(e.target.value);
            document.getElementById('uSegmentsValue').textContent = this.uSegments;
            this.model.setSegments(this.uSegments, this.vSegments);
        });

        document.getElementById('vSegments').addEventListener('input', (e) => {
            this.vSegments = parseInt(e.target.value);
            document.getElementById('vSegmentsValue').textContent = this.vSegments;
            this.model.setSegments(this.uSegments, this.vSegments);
        });

        document.getElementById('scale').addEventListener('input', (e) => {
            this.scale = parseFloat(e.target.value);
            document.getElementById('scaleValue').textContent = this.scale.toFixed(1);
        });

        document.getElementById('ambient').addEventListener('input', (e) => {
            this.ambient = parseFloat(e.target.value);
            document.getElementById('ambientValue').textContent = this.ambient.toFixed(2);
        });

        document.getElementById('diffuse').addEventListener('input', (e) => {
            this.diffuse = parseFloat(e.target.value);
            document.getElementById('diffuseValue').textContent = this.diffuse.toFixed(2);
        });

        document.getElementById('specular').addEventListener('input', (e) => {
            this.specular = parseFloat(e.target.value);
            document.getElementById('specularValue').textContent = this.specular.toFixed(2);
        });

        document.getElementById('shininess').addEventListener('input', (e) => {
            this.shininess = parseFloat(e.target.value);
            document.getElementById('shininessValue').textContent = this.shininess;
        });

        document.getElementById('toggleWireframe').addEventListener('click', () => {
            this.model.toggleWireframe();
        });

        document.getElementById('toggleLightAnimation').addEventListener('click', () => {
            this.lightAnimation = !this.lightAnimation;
        });

        document.getElementById('resetView').addEventListener('click', () => {
            this.resetView();
        });

        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    resetView() {
        this.rotationX = 30;
        this.rotationY = 45;
        this.uSegments = 30;
        this.vSegments = 30;
        this.scale = 5.0;
        this.ambient = 0.2;
        this.diffuse = 0.7;
        this.specular = 0.5;
        this.shininess = 32.0;

        document.getElementById('rotationX').value = this.rotationX;
        document.getElementById('rotationY').value = this.rotationY;
        document.getElementById('uSegments').value = this.uSegments;
        document.getElementById('vSegments').value = this.vSegments;
        document.getElementById('scale').value = this.scale;
        document.getElementById('ambient').value = this.ambient;
        document.getElementById('diffuse').value = this.diffuse;
        document.getElementById('specular').value = this.specular;
        document.getElementById('shininess').value = this.shininess;

        document.getElementById('rotationXValue').textContent = this.rotationX + '°';
        document.getElementById('rotationYValue').textContent = this.rotationY + '°';
        document.getElementById('uSegmentsValue').textContent = this.uSegments;
        document.getElementById('vSegmentsValue').textContent = this.vSegments;
        document.getElementById('scaleValue').textContent = this.scale.toFixed(1);
        document.getElementById('ambientValue').textContent = this.ambient.toFixed(2);
        document.getElementById('diffuseValue').textContent = this.diffuse.toFixed(2);
        document.getElementById('specularValue').textContent = this.specular.toFixed(2);
        document.getElementById('shininessValue').textContent = this.shininess;

        this.model.setSegments(this.uSegments, this.vSegments);
    }

    animate() {
        this.drawScene();
        requestAnimationFrame(() => this.animate());
    }
}