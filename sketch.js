// Conway's Game of Life - p5.js amb Psyduck mode
// Controls: Play/Pause, Step, Clear, Randomize, Reset, Speed, Cell Size, Density, Wrap
// Afegits: Toggle Psyduck/Color, ColorPicker, Dibuixar Psyduck amb click
// + Birth/Survival, Costats (3/4/6), Captura pantalla
// Sense zoom/pan per consistència

let cols, rows;
let grid, nextGrid;
let cellSize = 20; // mida fixa de cel·la
let playing = false;
let fps = 12;
let wrap = true;
let density = 0.35;

let ui = {};
let psyduckImg;
let usePsyduck = false;
let drawPsyduckMode = false;
let colorPicker;

let generationCount = 0;
let lastGridState = null;
let finishedMsg;

let bombMode = false;
let bombRadius = 60; // radi en píxels

function preload() {
  psyduckImg = loadImage("psyduck.png"); // posa la ruta de la imatge
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  initGrid();

  // UI flotant
  const panel = createDiv()
    .style("position", "fixed")
    .style("top", "16px")
    .style("left", "16px")
    .style("background", "rgba(20,22,28,0.7)")
    .style("backdrop-filter", "blur(6px)")
    .style("border", "1px solid rgba(255,255,255,0.12)")
    .style("border-radius", "10px")
    .style("padding", "10px 12px")
    .style("color", "#ddd")
    .style("font-family", "system-ui,Segoe UI,Roboto,Helvetica,Arial")
    .style("font-size", "13px")
    .style("box-shadow", "0 8px 20px rgba(0,0,0,0.35)")
    .style("z-index", "999");

  ui.playBtn = createButton("▶ Play").mousePressed(togglePlay).parent(panel);
  ui.stepBtn = createButton("Step")
    .mousePressed(stepOnce)
    .parent(panel)
    .style("margin-left", "6px");
  ui.clearBtn = createButton("Clear")
    .mousePressed(clearGrid)
    .parent(panel)
    .style("margin-left", "6px");
  ui.randBtn = createButton("Randomize")
    .mousePressed(randomizeGrid)
    .parent(panel)
    .style("margin-left", "6px");
  ui.resetBtn = createButton("Reset")
    .mousePressed(resetGrid)
    .parent(panel)
    .style("margin-left", "6px");

  createSpan("<br/>").parent(panel);

  ui.speedLabel = createSpan("Speed")
    .parent(panel)
    .style("margin-right", "6px");
  ui.speedSlider = createSlider(1, 60, fps, 1)
    .parent(panel)
    .style("width", "140px")
    .input(() => (fps = ui.speedSlider.value()));

  createSpan("<br/>").parent(panel);

  ui.densLabel = createSpan("Density")
    .parent(panel)
    .style("margin-right", "6px");
  ui.densSlider = createSlider(20, 90, 35, 1)
    .parent(panel)
    .style("width", "140px")
    .input(() => (density = ui.densSlider.value() / 100));

  createSpan("<br/>").parent(panel);

  ui.wrapChk = createCheckbox("Wrap edges", wrap)
    .parent(panel)
    .style("margin-top", "6px")
    .changed(() => (wrap = ui.wrapChk.checked()));

  createSpan("<br/>").parent(panel);

  // Botó Psyduck/Color
  ui.psyduckBtn = createButton("Toggle Psyduck/Color")
    .parent(panel)
    .style("margin-top", "6px")
    .mousePressed(() => (usePsyduck = !usePsyduck));

  // ColorPicker
  colorPicker = createColorPicker("#40e0d0")
    .parent(panel)
    .style("margin-left", "6px");

  // Botó dibuixar Psyduck amb píxels
  ui.drawPsyduckBtn = createButton("Dibuixar Psyduck amb click")
    .parent(panel)
    .style("margin-left", "6px")
    .mousePressed(() => (drawPsyduckMode = !drawPsyduckMode));

  // Comptador de generacions
  ui.genLabel = createSpan("Generació: 0")
    .parent(panel)
    .style("margin-left", "6px");

  ui.bombBtn = createButton("Mode Bomba")
    .parent(panel)
    .style("margin-left", "6px")
    .mousePressed(() => (bombMode = !bombMode));

  createSpan("<br/>").parent(panel);

  // Birth/Survival sliders (regles variables)
  ui.birthLabel = createSpan("Birth")
    .parent(panel)
    .style("margin-right", "6px");
  ui.birthSlider = createSlider(1, 8, 3, 1)
    .parent(panel)
    .style("width", "140px");

  createSpan("<br/>").parent(panel);
  ui.survLabel = createSpan("Survival")
    .parent(panel)
    .style("margin-right", "6px");
  ui.survSlider = createSlider(1, 8, 2, 1)
    .parent(panel)
    .style("width", "140px");

  // Sides slider (3/4/6) filtrant 5
  createSpan("<br/>").parent(panel);
  ui.sidesLabel = createSpan("Costats")
    .parent(panel)
    .style("margin-right", "6px");
  ui.sidesSlider = createSlider(3, 6, 4, 1)
    .parent(panel)
    .style("width", "140px")
    .input(() => {
      const v = ui.sidesSlider.value();
      if (v === 5) ui.sidesSlider.value(4);
    });

  // Captura pantalla
  ui.captureBtn = createButton("Captura pantalla")
    .parent(panel)
    .style("margin-left", "6px")
    .mousePressed(() => saveCanvas("gameoflife_capture", "png"));

  // Missatge de final
  finishedMsg = createSpan("")
    .parent(panel)
    .style("color", "#ff8080")
    .style("margin-left", "6px")
    .style("font-weight", "bold");
}

function draw() {
  background(10);
  drawGridOverlay(color(35, 40, 50, 120));

  // Render de cèl·lules vives
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === 1) {
        const px = x * cellSize;
        const py = y * cellSize;
        const sides = getSides();

        if (usePsyduck) {
          image(psyduckImg, px, py, cellSize, cellSize);
        } else {
          fill(colorPicker.color());
          if (sides === 4) {
            rect(px, py, cellSize, cellSize, 2);
          } else if (sides === 6) {
            // Hex sin huecos visibles (ligero solape)
            drawHexCell(px, py, cellSize, x, y, true);
          } else {
            // Triángulo alterno que toca bordes
            drawTriCell(px, py, cellSize, (x + y) % 2 === 0, true);
          }
        }
      }
    }
  }

  // Simulació
  if (playing && frameCount % Math.max(1, Math.round(60 / fps)) === 0) {
    computeNext();
    swapGrids();
    generationCount++;
    ui.genLabel.html("Generació: " + generationCount);

    if (isStagnant()) {
      playing = false;
      finishedMsg.html("Acabat. Torna a jugar!");
      updatePlayButton();
    }
  }

  // Indicador bomba
  if (bombMode) {
    noFill();
    stroke(255, 0, 0, 150);
    strokeWeight(2);
    ellipse(mouseX, mouseY, bombRadius * 2);
  }
}

// Fons segons costats (teselat compacte)
function drawGridOverlay(c) {
  stroke(c);
  noFill();
  const sides = getSides();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * cellSize;
      const py = y * cellSize;
      if (sides === 4) {
        rect(px, py, cellSize, cellSize);
      } else if (sides === 3) {
        drawTriCell(px, py, cellSize, (x + y) % 2 === 0, false);
      } else if (sides === 6) {
        drawHexCell(px, py, cellSize, x, y, false);
      }
    }
  }
  noStroke();
}

// Hex pointy-top con desplace horizontal en filas alternas
// overlap=true aumenta un poco el radio para cerrar visualmente huecos
function drawHexCell(px, py, s, gx, gy, overlap) {
  const r = overlap ? s * 0.55 : s * 0.5;
  const cx = px + s / 2 + (gy % 2 ? r * 0.5 : 0);
  const cy = py + s / 2;
  beginShape();
  for (let i = 0; i < 6; i++) {
    const ang = radians(60 * i);
    vertex(cx + r * cos(ang), cy + r * sin(ang));
  }
  endShape(CLOSE);
}

// Triángulo que toca los bordes de la celda; overlap=true amplía ligeramente
function drawTriCell(px, py, s, up, overlap) {
  const pad = overlap ? 0.0 : 0.0; // puedes probar 0.02*s si aún ves línea
  const ax = px + s / 2; // punto medio superior/inferior
  const ayUp = py + pad;
  const ayDown = py + s - pad;
  const bx = px + pad; // esquina izquierda
  const by = py + s - pad;
  const cx = px + s - pad; // esquina derecha
  const cy = py + s - pad;
  beginShape();
  if (up) {
    vertex(ax, ayUp);
    vertex(bx, by);
    vertex(cx, cy);
  } else {
    vertex(ax, ayDown);
    vertex(px + pad, py + pad);
    vertex(px + s - pad, py + pad);
  }
  endShape(CLOSE);
}

// Lee y filtra el slider de costats (3/4/6)
function getSides() {
  const v = ui.sidesSlider.value();
  return v === 3 || v === 4 || v === 6 ? v : 4;
}

function isStagnant() {
  const currentState = grid.map((row) => row.join("")).join("|");
  if (lastGridState && currentState === lastGridState) return true;
  lastGridState = currentState;
  return false;
}

function initGrid() {
  cols = floor(width / cellSize);
  rows = floor(height / cellSize);
  grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  nextGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
}

function resetGrid() {
  initGrid();
  generationCount = 0;
  ui.genLabel.html("Generació: 0");
  finishedMsg.html("");
}

function clearGrid() {
  for (let y = 0; y < rows; y++) grid[y].fill(0);
  generationCount = 0;
  ui.genLabel.html("Generació: 0");
  finishedMsg.html("");
}

function randomizeGrid() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      grid[y][x] = Math.random() < density ? 1 : 0;
    }
  }
}

function togglePlay() {
  playing = !playing;
  updatePlayButton();
}

function updatePlayButton() {
  ui.playBtn.html(playing ? "⏸ Pause" : "▶ Play");
}

function stepOnce() {
  computeNext();
  swapGrids();
  generationCount++;
  ui.genLabel.html("Generació: " + generationCount);
}

function swapGrids() {
  let tmp = grid;
  grid = nextGrid;
  nextGrid = tmp;
}

function computeNext() {
  const birth = ui.birthSlider.value();
  const survival = ui.survSlider.value();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const n = neighbors(x, y);
      const alive = grid[y][x] === 1;
      if (alive) {
        nextGrid[y][x] = n === survival ? 1 : 0;
      } else {
        nextGrid[y][x] = n === birth ? 1 : 0;
      }
    }
  }
}

function neighbors(x, y) {
  const sides = getSides();
  let count = 0;

  if (sides === 4) {
    // Moore (8)
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        if (i === 0 && j === 0) continue;
        count += sample(x + i, y + j);
      }
    }
  } else if (sides === 6) {
    // Hex aproximado (6), coherente con filas alternas
    const neigh = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
      [x + 1, y - 1],
      [x - 1, y + 1],
    ];
    for (let [nx, ny] of neigh) count += sample(nx, ny);
  } else {
    // Triángulos (6) alternando diagonal según paridad
    const up = (x + y) % 2 === 0;
    const neigh = up
      ? [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
          [x + 1, y - 1],
          [x - 1, y + 1],
        ]
      : [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
          [x + 1, y + 1],
          [x - 1, y - 1],
        ];
    for (let [nx, ny] of neigh) count += sample(nx, ny);
  }
  return count;
}

function sample(nx, ny) {
  if (wrap) {
    const wx = (nx + cols) % cols;
    const wy = (ny + rows) % rows;
    return grid[wy][wx];
  } else {
    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) return grid[ny][nx];
    return 0;
  }
}

function mousePressed() {
  if (mouseButton === CENTER) return;
  const gx = floor(mouseX / cellSize);
  const gy = floor(mouseY / cellSize);
  if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
    if (bombMode) {
      triggerBomb(mouseX, mouseY);
    } else if (drawPsyduckMode) {
      drawPsyduckShape(gx, gy);
    } else {
      grid[gy][gx] = grid[gy][gx] ? 0 : 1;
    }
  }
}

function mouseWheel(event) {
  if (bombMode) {
    bombRadius += event.delta > 0 ? -5 : 5;
    bombRadius = constrain(bombRadius, 10, 200);
  }
}

function triggerBomb(mx, my) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = x * cellSize + cellSize / 2;
      const cy = y * cellSize + cellSize / 2;
      const d = dist(mx, my, cx, cy);
      if (d < bombRadius) grid[y][x] = 0;
    }
  }
}

function drawPsyduckShape(cx, cy) {
  // Sprite simplificat amb forma de pato
  const shape = [
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 0, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
  ];
  for (let j = 0; j < shape.length; j++) {
    for (let i = 0; i < shape[j].length; i++) {
      if (shape[j][i] === 1) {
        const gx = cx + i;
        const gy = cy + j;
        if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) grid[gy][gx] = 1;
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initGrid();
}
