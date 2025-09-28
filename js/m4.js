class M4 {
    constructor() {
        this.elements = new Float32Array(16);
        this.identity();
    }

    identity() {
        const e = this.elements;
        e[0] = 1; e[4] = 0; e[8] = 0; e[12] = 0;
        e[1] = 0; e[5] = 1; e[9] = 0; e[13] = 0;
        e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
        e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
        return this;
    }

    translate(x, y, z) {
        const e = this.elements;
        e[12] += e[0] * x + e[4] * y + e[8] * z;
        e[13] += e[1] * x + e[5] * y + e[9] * z;
        e[14] += e[2] * x + e[6] * y + e[10] * z;
        e[15] += e[3] * x + e[7] * y + e[11] * z;
        return this;
    }

    rotateX(angle) {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const e = this.elements;

        const m4 = e[4], m5 = e[5], m6 = e[6], m7 = e[7];
        const m8 = e[8], m9 = e[9], m10 = e[10], m11 = e[11];

        e[4] = m4 * c + m8 * s;
        e[5] = m5 * c + m9 * s;
        e[6] = m6 * c + m10 * s;
        e[7] = m7 * c + m11 * s;
        e[8] = m8 * c - m4 * s;
        e[9] = m9 * c - m5 * s;
        e[10] = m10 * c - m6 * s;
        e[11] = m11 * c - m7 * s;

        return this;
    }

    rotateY(angle) {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const e = this.elements;

        const m0 = e[0], m1 = e[1], m2 = e[2], m3 = e[3];
        const m8 = e[8], m9 = e[9], m10 = e[10], m11 = e[11];

        e[0] = m0 * c - m8 * s;
        e[1] = m1 * c - m9 * s;
        e[2] = m2 * c - m10 * s;
        e[3] = m3 * c - m11 * s;
        e[8] = m0 * s + m8 * c;
        e[9] = m1 * s + m9 * c;
        e[10] = m2 * s + m10 * c;
        e[11] = m3 * s + m11 * c;

        return this;
    }

    scale(x, y, z) {
        const e = this.elements;
        e[0] *= x; e[4] *= y; e[8] *= z;
        e[1] *= x; e[5] *= y; e[9] *= z;
        e[2] *= x; e[6] *= y; e[10] *= z;
        e[3] *= x; e[7] *= y; e[11] *= z;
        return this;
    }

    perspective(fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);

        this.elements[0] = f / aspect;
        this.elements[5] = f;
        this.elements[10] = (far + near) * nf;
        this.elements[11] = -1;
        this.elements[14] = (2 * far * near) * nf;
        this.elements[15] = 0;

        return this;
    }

    multiply(matrix) {
        const a = this.elements;
        const b = matrix.elements;
        const result = new Float32Array(16);

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] = 0;
                for (let k = 0; k < 4; k++) {
                    result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
                }
            }
        }

        this.elements = result;
        return this;
    }

    copy() {
        const newMatrix = new M4();
        newMatrix.elements.set(this.elements);
        return newMatrix;
    }
}