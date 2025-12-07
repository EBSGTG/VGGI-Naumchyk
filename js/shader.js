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
        this.uniforms = {};
        this.attributes = {};

        const uniformNames = [
            'uProjectionMatrix', 'uModelViewMatrix', 'uNormalMatrix', 'uLightPosition',
            'uAmbientColor', 'uDiffuseColor', 'uSpecularColor', 'uShininess',
            'uUseWireframe', 'uUseNormalMapping', 'uDiffuseTexture', 'uSpecularTexture',
            'uNormalTexture', 'uTextureScaleU', 'uTextureScaleV', 'uTextureRotation',
            'uTextureCenter', 'uPointSize', 'uPointColor'
        ];

        const attributeNames = [
            'aVertexPosition', 'aVertexNormal', 'aVertexTangent', 'aVertexBitangent',
            'aTextureCoord'
        ];

        uniformNames.forEach(name => {
            const location = this.gl.getUniformLocation(this.program, name);
            if (location !== null) {
                this.uniforms[name.replace('u', '').charAt(0).toLowerCase() + name.slice(2)] = location;
            }
        });

        attributeNames.forEach(name => {
            const location = this.gl.getAttribLocation(this.program, name);
            if (location !== -1) {
                this.attributes[name.replace('a', '').charAt(0).toLowerCase() + name.slice(2)] = location;
            }
        });
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

    setUniform2f(location, x, y) {
        this.gl.uniform2f(location, x, y);
    }
}