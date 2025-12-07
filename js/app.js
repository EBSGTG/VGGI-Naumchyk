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
        this.normalMapping = true;

        this.textureScaleU = 1.0;
        this.textureScaleV = 1.0;
        this.textureRotation = 0;
        this.textureCenterU = 0.5;
        this.textureCenterV = 0.5;

        this.showPoint = true;
        this.pointSize = 10.0;
        this.pointColor = [1.0, 0.0, 0.0];

        this.projectionMatrix = new M4();
        this.modelViewMatrix = new M4();
        this.normalMatrix = new M4();

        this.textures = {
            diffuse: null,
            specular: null,
            normal: null
        };

        this.initShaders();
        this.initPointShader();
        this.loadTextures();
        this.setupEventListeners();
        this.setupKeyboardControls();
        this.resizeCanvas();
    }

    initShaders() {
        const vertexShaderSource = `
            attribute vec4 aVertexPosition;
            attribute vec3 aVertexNormal;
            attribute vec3 aVertexTangent;
            attribute vec3 aVertexBitangent;
            attribute vec2 aTextureCoord;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uNormalMatrix;
            uniform vec3 uLightPosition;
            
            uniform float uTextureScaleU;
            uniform float uTextureScaleV;
            uniform float uTextureRotation;
            uniform vec2 uTextureCenter;
            
            varying vec3 vNormal;
            varying vec3 vLightDirection;
            varying vec3 vViewPosition;
            varying vec2 vTextureCoord;
            varying mat3 vTBN;
            
            void main() {
                vec4 viewPosition = uModelViewMatrix * aVertexPosition;
                gl_Position = uProjectionMatrix * viewPosition;
                
                // Transform normal using normal matrix
                vNormal = mat3(uNormalMatrix) * aVertexNormal;
                
                vec3 T = normalize(mat3(uNormalMatrix) * aVertexTangent);
                vec3 B = normalize(mat3(uNormalMatrix) * aVertexBitangent);
                vec3 N = normalize(vNormal);
                
                T = normalize(T - dot(T, N) * N);
                B = normalize(cross(N, T));
                
                vTBN = mat3(T, B, N);
                
                vec4 lightViewPosition = uModelViewMatrix * vec4(uLightPosition, 1.0);
                vLightDirection = lightViewPosition.xyz - viewPosition.xyz;
                
                vViewPosition = viewPosition.xyz;
                
                vec2 texCoord = aTextureCoord;
                
                texCoord -= uTextureCenter;
                
                texCoord.x /= uTextureScaleU;
                texCoord.y /= uTextureScaleV;
                
                float cosRot = cos(uTextureRotation);
                float sinRot = sin(uTextureRotation);
                texCoord = vec2(
                    texCoord.x * cosRot - texCoord.y * sinRot,
                    texCoord.x * sinRot + texCoord.y * cosRot
                );
                
                texCoord += uTextureCenter;
                vTextureCoord = texCoord;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            
            uniform vec4 uAmbientColor;
            uniform vec4 uDiffuseColor;
            uniform vec4 uSpecularColor;
            uniform float uShininess;
            uniform int uUseWireframe;
            uniform int uUseNormalMapping;
            
            uniform sampler2D uDiffuseTexture;
            uniform sampler2D uSpecularTexture;
            uniform sampler2D uNormalTexture;
            
            varying vec3 vNormal;
            varying vec3 vLightDirection;
            varying vec3 vViewPosition;
            varying vec2 vTextureCoord;
            varying mat3 vTBN;
            
            void main() {
                if (uUseWireframe == 1) {
                    gl_FragColor = vec4(0.8, 0.8, 0.8, 1.0);
                    return;
                }
                
                vec3 normal;
                
                if (uUseNormalMapping == 1) {
                    // Get normal from normal map and transform from [0,1] to [-1,1]
                    vec3 normalMap = texture2D(uNormalTexture, vTextureCoord).rgb;
                    vec3 tangentNormal = normalize(normalMap * 2.0 - 1.0);                    
                    normal = normalize(vTBN * tangentNormal);
                } else {
                    normal = normalize(vNormal);
                }
                
                vec3 lightDir = normalize(vLightDirection);
                vec3 viewDir = normalize(-vViewPosition);
                vec3 reflectDir = reflect(-lightDir, normal);
                
                // Get texture samples
                vec4 diffuseTex = texture2D(uDiffuseTexture, vTextureCoord);
                vec4 specularTex = texture2D(uSpecularTexture, vTextureCoord);
                
                vec4 ambient = uAmbientColor * diffuseTex;
                
                float diff = max(dot(normal, lightDir), 0.0);
                vec4 diffuse = uDiffuseColor * diffuseTex * diff;
                
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
                vec4 specular = uSpecularColor * specularTex * spec;
                
                vec4 result = ambient + diffuse + specular;
                gl_FragColor = vec4(result.rgb, 1.0);
            }
        `;

        this.shaderProgram = new Shader(this.gl, vertexShaderSource, fragmentShaderSource);
    }

    initPointShader() {
        const pointVertexShaderSource = `
            attribute vec4 aVertexPosition;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform float uPointSize;
            
            void main() {
                vec4 viewPosition = uModelViewMatrix * aVertexPosition;
                gl_Position = uProjectionMatrix * viewPosition;
                gl_PointSize = uPointSize;
            }
        `;

        const pointFragmentShaderSource = `
            precision mediump float;
            uniform vec3 uPointColor;
            
            void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                
                if (dist > 0.5) {
                    discard;
                }
                
                float border = smoothstep(0.4, 0.5, dist);
                vec3 color = mix(vec3(1.0), uPointColor, border);
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        this.pointShaderProgram = new Shader(this.gl, pointVertexShaderSource, pointFragmentShaderSource);
        this.pointBuffer = this.gl.createBuffer();
    }

    updatePointBuffer() {
        // Calculate the 3D position from texture coordinates
        const u = this.textureCenterU * 2 * Math.PI;
        const v = this.textureCenterV * 2 * Math.PI;

        const R = 1.5;
        const a = 0.5;
        const cosU = Math.cos(u);
        const sinU = Math.sin(u);
        const cosV = Math.cos(v);
        const sinV = Math.sin(v);

        const x = (R + a * cosU) * cosV;
        const y = (R + a * cosU) * sinV;
        const z = a * sinU;

        const pointPosition = [x, y, z];

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.pointBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(pointPosition), this.gl.STATIC_DRAW);
    }

    drawPoint() {
        if (!this.showPoint) return;

        this.pointShaderProgram.use();

        this.updatePointBuffer();

        this.pointShaderProgram.setUniformMatrix4fv(this.pointShaderProgram.uniforms.projectionMatrix, this.projectionMatrix);
        this.pointShaderProgram.setUniformMatrix4fv(this.pointShaderProgram.uniforms.modelViewMatrix, this.modelViewMatrix);
        this.pointShaderProgram.setUniform1f(this.pointShaderProgram.uniforms.pointSize, this.pointSize);
        this.pointShaderProgram.setUniform3f(this.pointShaderProgram.uniforms.pointColor,
            this.pointColor[0], this.pointColor[1], this.pointColor[2]);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.pointBuffer);
        this.gl.vertexAttribPointer(this.pointShaderProgram.attributes.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.pointShaderProgram.attributes.vertexPosition);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.depthFunc(this.gl.LEQUAL);

        this.gl.drawArrays(this.gl.POINTS, 0, 1);

        this.gl.disable(this.gl.BLEND);
        this.gl.depthFunc(this.gl.LESS);
    }

    loadTextures() {
        const textureFiles = {
            diffuse: 'textures/diffuse.jpg',
            specular: 'textures/specular.jpg',
            normal: 'textures/normal.jpg'
        };

        let loadedCount = 0;
        const totalTextures = Object.keys(textureFiles).length;

        const updateStatus = () => {
            loadedCount++;
            const status = document.getElementById('textureStatus');
            if (loadedCount === totalTextures) {
                status.textContent = 'All textures loaded successfully!';
                status.style.color = '#4CAF50';
            } else {
                status.textContent = `Loading textures... ${loadedCount}/${totalTextures}`;
            }
        };

        Object.keys(textureFiles).forEach(type => {
            this.loadTexture(textureFiles[type], texture => {
                this.textures[type] = texture;
                updateStatus();
            }, () => {
                console.warn(`Failed to load ${type} texture, using fallback`);
                this.createFallbackTexture(type);
                updateStatus();
            });
        });
    }

    loadTexture(url, onLoad, onError) {
        const texture = this.gl.createTexture();
        const image = new Image();

        image.onload = () => {
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            onLoad(texture);
        };

        image.onerror = onError;
        image.src = url;
    }

    createFallbackTexture(type) {
        const texture = this.gl.createTexture();
        const size = 64;
        const data = new Uint8Array(size * size * 4);

        for (let i = 0; i < size * size; i++) {
            const offset = i * 4;

            if (type === 'diffuse') {
                data[offset] = 200;
                data[offset + 1] = 200;
                data[offset + 2] = 200;
                data[offset + 3] = 255;
            } else if (type === 'specular') {
                data[offset] = 100;
                data[offset + 1] = 100;
                data[offset + 2] = 100;
                data[offset + 3] = 255;
            } else if (type === 'normal') {
                data[offset] = 128;
                data[offset + 1] = 128;
                data[offset + 2] = 255;
                data[offset + 3] = 255;
            }
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        this.textures[type] = texture;
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
                       this.normalMatrix, this.lightPosition, lightingParams,
                       this.textures, this.normalMapping, this.textureScaleU, this.textureScaleV,
                       this.textureRotation, [this.textureCenterU, this.textureCenterV]);

        this.drawPoint();
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

        document.getElementById('toggleNormalMapping').addEventListener('click', () => {
            this.normalMapping = !this.normalMapping;
            document.getElementById('toggleNormalMapping').textContent =
                this.normalMapping ? 'Disable Normal Mapping' : 'Enable Normal Mapping';
        });

        document.getElementById('resetView').addEventListener('click', () => {
            this.resetView();
        });

        document.getElementById('textureScaleU').addEventListener('input', (e) => {
            this.textureScaleU = parseFloat(e.target.value);
            document.getElementById('textureScaleUValue').textContent = this.textureScaleU.toFixed(1);
        });

        document.getElementById('textureScaleV').addEventListener('input', (e) => {
            this.textureScaleV = parseFloat(e.target.value);
            document.getElementById('textureScaleVValue').textContent = this.textureScaleV.toFixed(1);
        });

        document.getElementById('textureRotation').addEventListener('input', (e) => {
            this.textureRotation = parseFloat(e.target.value) * Math.PI / 180;
            document.getElementById('textureRotationValue').textContent = parseFloat(e.target.value).toFixed(0) + '°';
        });

        document.getElementById('pointSize').addEventListener('input', (e) => {
            this.pointSize = parseFloat(e.target.value);
            document.getElementById('pointSizeValue').textContent = this.pointSize.toFixed(0);
        });

        document.getElementById('togglePoint').addEventListener('click', () => {
            this.showPoint = !this.showPoint;
            document.getElementById('togglePoint').textContent =
                this.showPoint ? 'Hide Point' : 'Show Point';
        });

        document.getElementById('resetTexture').addEventListener('click', () => {
            this.resetTexture();
        });

        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            const step = 0.02;
            switch(e.key.toLowerCase()) {
                case 'w':
                    this.textureCenterV = Math.min(1.0, this.textureCenterV + step);
                    break;
                case 's':
                    this.textureCenterV = Math.max(0.0, this.textureCenterV - step);
                    break;
                case 'a':
                    this.textureCenterU = Math.max(0.0, this.textureCenterU - step);
                    break;
                case 'd':
                    this.textureCenterU = Math.min(1.0, this.textureCenterU + step);
                    break;
            }
            this.updatePointDisplay();
        });
    }

    updatePointDisplay() {
        const uCoord = (this.textureCenterU * 2 * Math.PI).toFixed(2);
        const vCoord = (this.textureCenterV * 2 * Math.PI).toFixed(2);
        document.getElementById('textureCenterValue').textContent =
            `U: ${this.textureCenterU.toFixed(2)} (${uCoord} rad), V: ${this.textureCenterV.toFixed(2)} (${vCoord} rad)`;
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
        this.normalMapping = true;
        this.showPoint = true;
        this.pointSize = 10.0;

        this.textureScaleU = 1.0;
        this.textureScaleV = 1.0;
        this.textureRotation = 0;
        this.textureCenterU = 0.5;
        this.textureCenterV = 0.5;

        document.getElementById('rotationX').value = this.rotationX;
        document.getElementById('rotationY').value = this.rotationY;
        document.getElementById('uSegments').value = this.uSegments;
        document.getElementById('vSegments').value = this.vSegments;
        document.getElementById('scale').value = this.scale;
        document.getElementById('ambient').value = this.ambient;
        document.getElementById('diffuse').value = this.diffuse;
        document.getElementById('specular').value = this.specular;
        document.getElementById('shininess').value = this.shininess;
        document.getElementById('pointSize').value = this.pointSize;

        document.getElementById('textureScaleU').value = this.textureScaleU;
        document.getElementById('textureScaleV').value = this.textureScaleV;
        document.getElementById('textureRotation').value = 0;

        document.getElementById('rotationXValue').textContent = this.rotationX + '°';
        document.getElementById('rotationYValue').textContent = this.rotationY + '°';
        document.getElementById('uSegmentsValue').textContent = this.uSegments;
        document.getElementById('vSegmentsValue').textContent = this.vSegments;
        document.getElementById('scaleValue').textContent = this.scale.toFixed(1);
        document.getElementById('ambientValue').textContent = this.ambient.toFixed(2);
        document.getElementById('diffuseValue').textContent = this.diffuse.toFixed(2);
        document.getElementById('specularValue').textContent = this.specular.toFixed(2);
        document.getElementById('shininessValue').textContent = this.shininess;
        document.getElementById('toggleNormalMapping').textContent = 'Disable Normal Mapping';
        document.getElementById('togglePoint').textContent = 'Hide Point';
        document.getElementById('textureScaleUValue').textContent = this.textureScaleU.toFixed(1);
        document.getElementById('textureScaleVValue').textContent = this.textureScaleV.toFixed(1);
        document.getElementById('textureRotationValue').textContent = '0°';
        document.getElementById('pointSizeValue').textContent = this.pointSize.toFixed(0);

        this.updatePointDisplay();
        this.model.setSegments(this.uSegments, this.vSegments);
    }

    resetTexture() {
        this.textureScaleU = 1.0;
        this.textureScaleV = 1.0;
        this.textureRotation = 0;
        this.textureCenterU = 0.5;
        this.textureCenterV = 0.5;

        document.getElementById('textureScaleU').value = this.textureScaleU;
        document.getElementById('textureScaleV').value = this.textureScaleV;
        document.getElementById('textureRotation').value = 0;

        document.getElementById('textureScaleUValue').textContent = this.textureScaleU.toFixed(1);
        document.getElementById('textureScaleVValue').textContent = this.textureScaleV.toFixed(1);
        document.getElementById('textureRotationValue').textContent = '0°';

        this.updatePointDisplay();
    }

    animate() {
        this.drawScene();
        requestAnimationFrame(() => this.animate());
    }
}