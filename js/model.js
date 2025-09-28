class Model {
    constructor(gl) {
        this.gl = gl;
        this.positionBuffer = gl.createBuffer();

        this.uLines = [];
        this.vLines = [];
        this.uColor = [0.2, 0.5, 1.0, 1.0];
        this.vColor = [1.0, 0.3, 0.3, 1.0];
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

    generateWireframe(uCount, vCount, showULines = true, showVLines = true) {
        const uStep = (2 * Math.PI) / uCount;
        const vStep = (2 * Math.PI) / vCount;

        this.uLines = [];
        this.vLines = [];

        if (showULines) {
            for (let i = 0; i < vCount; i++) {
                const v = i * vStep;
                const line = [];
                for (let j = 0; j <= uCount; j++) {
                    const u = j * uStep;
                    line.push(this.astroidalTorus(u, v));
                }
                this.uLines.push(line);
            }
        }

        if (showVLines) {
            for (let i = 0; i < uCount; i++) {
                const u = i * uStep;
                const line = [];
                for (let j = 0; j <= vCount; j++) {
                    const v = j * vStep;
                    line.push(this.astroidalTorus(u, v));
                }
                this.vLines.push(line);
            }
        }
    }

    createLineVertices(lines) {
        const vertices = [];
        for (const line of lines) {
            for (let i = 0; i < line.length - 1; i++) {
                // Add both endpoints of each line segment
                vertices.push(...line[i], ...line[i + 1]);
            }
        }
        return new Float32Array(vertices);
    }

    draw(shaderProgram, projectionMatrix, modelViewMatrix) {
        const gl = this.gl;

        shaderProgram.use();
        shaderProgram.setUniformMatrix4fv(shaderProgram.uniforms.projectionMatrix, projectionMatrix);
        shaderProgram.setUniformMatrix4fv(shaderProgram.uniforms.modelViewMatrix, modelViewMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(shaderProgram.attributes.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.attributes.vertexPosition);

        if (this.uLines.length > 0) {
            const uVertices = this.createLineVertices(this.uLines);
            gl.bufferData(gl.ARRAY_BUFFER, uVertices, gl.STATIC_DRAW);
            shaderProgram.setUniform4f(shaderProgram.uniforms.color, ...this.uColor);
            gl.drawArrays(gl.LINES, 0, uVertices.length / 3);
        }

        if (this.vLines.length > 0) {
            const vVertices = this.createLineVertices(this.vLines);
            gl.bufferData(gl.ARRAY_BUFFER, vVertices, gl.STATIC_DRAW);
            shaderProgram.setUniform4f(shaderProgram.uniforms.color, ...this.vColor);
            gl.drawArrays(gl.LINES, 0, vVertices.length / 3);
        }
    }
}