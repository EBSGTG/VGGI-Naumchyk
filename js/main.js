window.addEventListener('load', () => {
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser may not support it.');
        return;
    }

    const app = new App(gl);
    app.animate();
});