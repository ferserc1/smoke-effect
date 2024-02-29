import './style.css'

const clearColor = [0.6, 0.6, 0.6, 1.0];
const rotationSpeed = 0.001;
const numberOfQuads = 40;
const opacity = 0.2;
const verticalSpeed = 0.1;
const texturePath = '/smoke.webp';
const tintColor = [0.5, 0.3, 0.0];

const canvas = document.querySelector('canvas#smokeCanvas');

const gl = canvas.getContext("webgl");

gl.enable(gl.BLEND);
gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

// Vertex buffers
const vertexData = [
  -0.5,-0.5, 0, 0, 0,
   0.5,-0.5, 0, 1, 0,
   0.5, 0.5, 0, 1, 1,
  -0.5, 0.5, 0, 0, 1
];
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

const vertexIndexData = [
  0, 1, 2,
  2, 3, 0
];
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndexData), gl.STATIC_DRAW);

// Shaders
const vertexShader = `
precision mediump float;
attribute vec4 inVertexPos;
attribute vec2 inTexCoord;

uniform vec2 uViewport;
uniform vec2 uPosition;
uniform float uRotation;
uniform float uScale;

varying vec2 fsTexCoord;

mat4 translate(float x, float y, float z) {
  return mat4(
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
      x,   y,   z, 1.0
  );
}

mat4 scale(float x, float y, float z) {
  return mat4(
      x, 0.0, 0.0, 0.0,
    0.0,   y, 0.0, 0.0,
    0.0, 0.0,   z, 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 rotateX(float angle) {
  return mat4(
    1.0, 0.0, 0.0, 0.0,
    0.0, cos(angle), -sin(angle), 0.0,
    0.0, sin(angle), cos(angle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 rotateY(float angle) {
  return mat4(
    cos(angle), 0.0, sin(angle), 0.0,
    0.0, 1.0, 0.0, 0.0,
    -sin(angle), 0.0, cos(angle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 rotateZ(float angle) {
  return mat4(
    cos(angle), -sin(angle), 0.0, 0.0,
    sin(angle), cos(angle), 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 perspective(float fov, float aspect, float near, float far) {
  return mat4(
    1.0 / (aspect * tan(fov / 2.0)), 0.0, 0.0, 0.0,
    0.0, 1.0 / tan(fov / 2.0), 0.0, 0.0,
    0.0, 0.0, (near + far) / (near - far), -1.0,
    0.0, 0.0, (2.0 * near * far) / (near - far), 0.0
  );
}

void main() {
  mat4 model = translate(uPosition.x, uPosition.y, 0.0) 
    * rotateZ(uRotation)
    * scale(uScale, uScale, uScale);
  mat4 view = translate(0.0, 0.0, -2.0);
  mat4 proj = perspective(45.0, uViewport.x / uViewport.y, 0.1, 100.0);
  gl_Position = proj * view * model * inVertexPos;
  fsTexCoord = inTexCoord;
}`;

const fragmentShader = `
precision mediump float;
uniform sampler2D uTexture;
uniform float uAlphaFactor;
uniform vec3 uTintColor;

varying vec2 fsTexCoord;

void main() {
  vec4 color = texture2D(uTexture, fsTexCoord);
  gl_FragColor = vec4(color.rgb * uTintColor, color.a * uAlphaFactor);
}`;

function compileShader(type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  return s;
}

const program = gl.createProgram();
const vs = compileShader(gl.VERTEX_SHADER, vertexShader);
const fs = compileShader(gl.FRAGMENT_SHADER, fragmentShader);
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
gl.deleteShader(vs);
gl.deleteShader(fs);
gl.useProgram(program);

async function loadTexture(src) {
  return new Promise(resolve => {
    const texture = gl.createTexture(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      resolve(texture);
    }
    image.src = src;
  });
}


const inVertexPos = gl.getAttribLocation(program, "inVertexPos");
const inTexCoord = gl.getAttribLocation(program, "inTexCoord");
const uTexture = gl.getUniformLocation(program, "uTexture");
const uViewport = gl.getUniformLocation(program, "uViewport");
const uPosition = gl.getUniformLocation(program, "uPosition");
const uRotation = gl.getUniformLocation(program, "uRotation");
const uScale = gl.getUniformLocation(program, "uScale");
const uAlphaFactor = gl.getUniformLocation(program, "uAlphaFactor");
const uTintColor = gl.getUniformLocation(program, "uTintColor");

const smokeTexture = await loadTexture(texturePath);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function drawQuad(pos,scale,rotation) {
  gl.useProgram(program);
  gl.uniform2f(uViewport, canvas.width, canvas.height);
  gl.uniform2fv(uPosition, pos);
  gl.uniform1f(uScale, scale);
  gl.uniform1f(uRotation, rotation);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, smokeTexture);
  gl.uniform1i(uTexture, 0);
  gl.uniform1f(uAlphaFactor, opacity);
  gl.uniform3fv(uTintColor, tintColor);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  const stride = 4 * 5; // 4 bytes per float, 5 floats per vertex
  gl.vertexAttribPointer(inVertexPos, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(inVertexPos);
  gl.vertexAttribPointer(inTexCoord, 2, gl.FLOAT, false, stride, 12);
  gl.enableVertexAttribArray(inTexCoord);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.drawElements(gl.TRIANGLES, vertexIndexData.length, gl.UNSIGNED_SHORT, 0);
}

const quads = Array(numberOfQuads).fill().map((_, i) => {
  return {
    pos: [Math.random() * 4 - 2, Math.random() * 4 - 2],
    scale: Math.random() * 2 + 1,
    rotation: Math.random(),
    speed: Math.random()
  };
});

function draw() {
  gl.clearColor(...clearColor);
  gl.clear(gl.COLOR_BUFFER_BIT);


  quads.forEach((q,i) => {
    q.pos[1] += q.speed * 0.01 * verticalSpeed;
    if (q.pos[1] > 2) {
      q.pos = [Math.random() * 4 - 2, -4];
    }
    q.rotation += (i%2===0 ? rotationSpeed : -rotationSpeed) * q.speed;
  })

  quads.forEach(quad => {
    drawQuad(quad.pos, quad.scale, quad.rotation);
  });

  requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);
resize(window.innerWidth, window.innerHeight);
draw();

