class Shader {
    constructor(gl, vertexShaderSource, fragmentShaderSource) {
        this.gl = gl;
        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.getUniformLocations();
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program linking error:', this.gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    getUniformLocations() {
        this.uniforms = {
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix'),
            modelViewMatrix: this.gl.getUniformLocation(this.program, 'uModelViewMatrix'),
            normalMatrix: this.gl.getUniformLocation(this.program, 'uNormalMatrix'),
            lightPosition: this.gl.getUniformLocation(this.program, 'uLightPosition'),
            ambientColor: this.gl.getUniformLocation(this.program, 'uAmbientColor'),
            diffuseColor: this.gl.getUniformLocation(this.program, 'uDiffuseColor'),
            specularColor: this.gl.getUniformLocation(this.program, 'uSpecularColor'),
            shininess: this.gl.getUniformLocation(this.program, 'uShininess'),
            useWireframe: this.gl.getUniformLocation(this.program, 'uUseWireframe'),
            useNormalMapping: this.gl.getUniformLocation(this.program, 'uUseNormalMapping'),
            diffuseTexture: this.gl.getUniformLocation(this.program, 'uDiffuseTexture'),
            specularTexture: this.gl.getUniformLocation(this.program, 'uSpecularTexture'),
            normalTexture: this.gl.getUniformLocation(this.program, 'uNormalTexture')
        };

        this.attributes = {
            vertexPosition: this.gl.getAttribLocation(this.program, 'aVertexPosition'),
            vertexNormal: this.gl.getAttribLocation(this.program, 'aVertexNormal'),
            textureCoord: this.gl.getAttribLocation(this.program, 'aTextureCoord')
        };
    }

    use() {
        this.gl.useProgram(this.program);
    }

    setUniformMatrix4fv(location, matrix) {
        this.gl.uniformMatrix4fv(location, false, matrix.elements || matrix);
    }

    setUniform3f(location, x, y, z) {
        this.gl.uniform3f(location, x, y, z);
    }

    setUniform4f(location, r, g, b, a) {
        this.gl.uniform4f(location, r, g, b, a);
    }

    setUniform1f(location, value) {
        this.gl.uniform1f(location, value);
    }

    setUniform1i(location, value) {
        this.gl.uniform1i(location, value);
    }
}