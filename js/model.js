class Model {
    constructor(gl) {
        this.gl = gl;
        this.positionBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();
        this.textureBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
        this.vertices = [];
        this.normals = [];
        this.textureCoords = [];
        this.indices = [];
        this.uSegments = 30;
        this.vSegments = 30;
        this.wireframeMode = false;

        this.generateSurface();
    }

    astroidalTorus(u, v) {
        const R = 1.5;
        const a = 0.5;
        const cosU = Math.cos(u);
        const sinU = Math.sin(u);
        const cosV = Math.cos(v);
        const sinV = Math.sin(v);

        const x = (R + a * cosU) * cosV;
        const y = (R + a * cosU) * sinV;
        const z = a * sinU;

        return [x, y, z];
    }

    calculateDerivatives(u, v) {
        const epsilon = 0.001;

        const p = this.astroidalTorus(u, v);

        const pu = this.astroidalTorus(u + epsilon, v);
        const du = [pu[0] - p[0], pu[1] - p[1], pu[2] - p[2]];

        const pv = this.astroidalTorus(u, v + epsilon);
        const dv = [pv[0] - p[0], pv[1] - p[1], pv[2] - p[2]];

        return { du, dv };
    }

    calculateFacetNormal(du, dv) {
        const normal = [
            du[1] * dv[2] - du[2] * dv[1],
            du[2] * dv[0] - du[0] * dv[2],
            du[0] * dv[1] - du[1] * dv[0]
        ];

        const length = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2]);
        if (length > 0) {
            return [normal[0]/length, normal[1]/length, normal[2]/length];
        }
        return [0, 0, 1];
    }

    generateSurface() {
        this.vertices = [];
        this.normals = [];
        this.textureCoords = [];
        this.indices = [];

        const uStep = (2 * Math.PI) / this.uSegments;
        const vStep = (2 * Math.PI) / this.vSegments;

        const vertexNormals = new Array((this.uSegments + 1) * (this.vSegments + 1));
        for (let i = 0; i < vertexNormals.length; i++) {
            vertexNormals[i] = [0, 0, 0];
        }

        for (let i = 0; i <= this.uSegments; i++) {
            const u = i * uStep;
            for (let j = 0; j <= this.vSegments; j++) {
                const v = j * vStep;
                const vertex = this.astroidalTorus(u, v);
                this.vertices.push(...vertex);

                this.textureCoords.push(j / this.vSegments, i / this.uSegments);

                const derivs = this.calculateDerivatives(u, v);
                const normal = this.calculateFacetNormal(derivs.du, derivs.dv);
                vertexNormals[i * (this.vSegments + 1) + j] = normal;
            }
        }

        for (let i = 0; i < this.uSegments; i++) {
            for (let j = 0; j < this.vSegments; j++) {
                const a = i * (this.vSegments + 1) + j;
                const b = a + 1;
                const c = (i + 1) * (this.vSegments + 1) + j;
                const d = c + 1;

                this.indices.push(a, b, c);
                this.indices.push(b, d, c);
            }
        }

        for (let i = 0; i <= this.uSegments; i++) {
            for (let j = 0; j <= this.vSegments; j++) {
                const normal = [0, 0, 0];
                let count = 0;

                for (let di = -1; di <= 1; di++) {
                    for (let dj = -1; dj <= 1; dj++) {
                        const ni = i + di;
                        const nj = j + dj;
                        if (ni >= 0 && ni <= this.uSegments && nj >= 0 && nj <= this.vSegments) {
                            const adjNormal = vertexNormals[ni * (this.vSegments + 1) + nj];
                            normal[0] += adjNormal[0];
                            normal[1] += adjNormal[1];
                            normal[2] += adjNormal[2];
                            count++;
                        }
                    }
                }

                const length = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2]);
                if (length > 0) {
                    this.normals.push(normal[0]/length, normal[1]/length, normal[2]/length);
                } else {
                    this.normals.push(0, 0, 1);
                }
            }
        }

        this.updateBuffers();
    }

    updateBuffers() {
        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.textureCoords), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
    }

    setSegments(uSegments, vSegments) {
        this.uSegments = uSegments;
        this.vSegments = vSegments;
        this.generateSurface();
    }

    toggleWireframe() {
        this.wireframeMode = !this.wireframeMode;
    }

    draw(shaderProgram, projectionMatrix, modelViewMatrix, normalMatrix, lightPosition, lightingParams, textures, normalMapping) {
        const gl = this.gl;

        shaderProgram.use();

        shaderProgram.setUniformMatrix4fv(shaderProgram.uniforms.projectionMatrix, projectionMatrix);
        shaderProgram.setUniformMatrix4fv(shaderProgram.uniforms.modelViewMatrix, modelViewMatrix);
        shaderProgram.setUniformMatrix4fv(shaderProgram.uniforms.normalMatrix, normalMatrix);

        shaderProgram.setUniform3f(shaderProgram.uniforms.lightPosition, lightPosition[0], lightPosition[1], lightPosition[2]);
        shaderProgram.setUniform4f(shaderProgram.uniforms.ambientColor, lightingParams.ambient, lightingParams.ambient, lightingParams.ambient, 1.0);
        shaderProgram.setUniform4f(shaderProgram.uniforms.diffuseColor, lightingParams.diffuse, lightingParams.diffuse, lightingParams.diffuse, 1.0);
        shaderProgram.setUniform4f(shaderProgram.uniforms.specularColor, lightingParams.specular, lightingParams.specular, lightingParams.specular, 1.0);
        shaderProgram.setUniform1f(shaderProgram.uniforms.shininess, lightingParams.shininess);
        shaderProgram.setUniform1i(shaderProgram.uniforms.useWireframe, this.wireframeMode ? 1 : 0);
        shaderProgram.setUniform1i(shaderProgram.uniforms.useNormalMapping, normalMapping ? 1 : 0);

        if (textures.diffuse) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures.diffuse);
            shaderProgram.setUniform1i(shaderProgram.uniforms.diffuseTexture, 0);
        }

        if (textures.specular) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, textures.specular);
            shaderProgram.setUniform1i(shaderProgram.uniforms.specularTexture, 1);
        }

        if (textures.normal) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, textures.normal);
            shaderProgram.setUniform1i(shaderProgram.uniforms.normalTexture, 2);
        }

        // Set up vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(shaderProgram.attributes.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.attributes.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(shaderProgram.attributes.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.attributes.vertexNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.vertexAttribPointer(shaderProgram.attributes.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.attributes.textureCoord);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        if (this.wireframeMode) {
            gl.drawElements(gl.LINES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        }
    }
}