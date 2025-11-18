class Model {
    constructor(gl) {
        this.gl = gl;
        this.positionBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
        this.vertices = [];
        this.normals = [];
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

    calculateTriangleArea(v1, v2, v3) {
        const a = Math.sqrt(
            Math.pow(v2[0]-v1[0], 2) +
            Math.pow(v2[1]-v1[1], 2) +
            Math.pow(v2[2]-v1[2], 2)
        );
        const b = Math.sqrt(
            Math.pow(v3[0]-v2[0], 2) +
            Math.pow(v3[1]-v2[1], 2) +
            Math.pow(v3[2]-v2[2], 2)
        );
        const c = Math.sqrt(
            Math.pow(v1[0]-v3[0], 2) +
            Math.pow(v1[1]-v3[1], 2) +
            Math.pow(v1[2]-v3[2], 2)
        );

        const s = (a + b + c) / 2;
        return Math.sqrt(s * (s - a) * (s - b) * (s - c));
    }

    generateSurface() {
        this.vertices = [];
        this.normals = [];
        this.indices = [];

        const uStep = (2 * Math.PI) / this.uSegments;
        const vStep = (2 * Math.PI) / this.vSegments;

        const vertexNormals = new Array((this.uSegments + 1) * (this.vSegments + 1));
        const vertexAreas = new Array((this.uSegments + 1) * (this.vSegments + 1));

        for (let i = 0; i < vertexNormals.length; i++) {
            vertexNormals[i] = [0, 0, 0];
            vertexAreas[i] = 0;
        }

        for (let i = 0; i <= this.uSegments; i++) {
            const u = i * uStep;
            for (let j = 0; j <= this.vSegments; j++) {
                const v = j * vStep;
                const vertex = this.astroidalTorus(u, v);
                this.vertices.push(...vertex);
            }
        }

        for (let i = 0; i < this.uSegments; i++) {
            for (let j = 0; j < this.vSegments; j++) {
                const a = i * (this.vSegments + 1) + j;
                const b = a + 1;
                const c = (i + 1) * (this.vSegments + 1) + j;
                const d = c + 1;

                const vA = [this.vertices[a*3], this.vertices[a*3+1], this.vertices[a*3+2]];
                const vB = [this.vertices[b*3], this.vertices[b*3+1], this.vertices[b*3+2]];
                const vC = [this.vertices[c*3], this.vertices[c*3+1], this.vertices[c*3+2]];
                const vD = [this.vertices[d*3], this.vertices[d*3+1], this.vertices[d*3+2]];

                const ab1 = [vB[0]-vA[0], vB[1]-vA[1], vB[2]-vA[2]];
                const ac1 = [vC[0]-vA[0], vC[1]-vA[1], vC[2]-vA[2]];
                const normal1 = this.calculateFacetNormal(ab1, ac1);
                const area1 = this.calculateTriangleArea(vA, vB, vC);

                const bd2 = [vD[0]-vB[0], vD[1]-vB[1], vD[2]-vB[2]];
                const bc2 = [vC[0]-vB[0], vC[1]-vB[1], vC[2]-vB[2]];
                const normal2 = this.calculateFacetNormal(bd2, bc2);
                const area2 = this.calculateTriangleArea(vB, vD, vC);

                for (let k = 0; k < 3; k++) {
                    vertexNormals[a][k] += normal1[k] * area1;
                    vertexNormals[b][k] += normal1[k] * area1 + normal2[k] * area2;
                    vertexNormals[c][k] += normal1[k] * area1 + normal2[k] * area2;
                    vertexNormals[d][k] += normal2[k] * area2;
                }

                vertexAreas[a] += area1;
                vertexAreas[b] += area1 + area2;
                vertexAreas[c] += area1 + area2;
                vertexAreas[d] += area2;

                this.indices.push(a, b, c);
                this.indices.push(b, d, c);
            }
        }

        for (let i = 0; i < vertexNormals.length; i++) {
            const normal = vertexNormals[i];
            const length = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2]);

            if (length > 0) {
                this.normals.push(normal[0]/length, normal[1]/length, normal[2]/length);
            } else {
                this.normals.push(0, 0, 1);
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

    draw(shaderProgram, projectionMatrix, modelViewMatrix, normalMatrix, lightPosition, lightingParams) {
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

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(shaderProgram.attributes.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.attributes.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(shaderProgram.attributes.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.attributes.vertexNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        if (this.wireframeMode) {
            gl.drawElements(gl.LINES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        }
    }
}