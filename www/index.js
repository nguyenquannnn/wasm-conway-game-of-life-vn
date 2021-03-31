import { Universe, Cell } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";

// wasm.greet("Hello Quan!");
const CELL_SIZE = 10; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLOR = "#000000";

const [width, height] = [64, 64];
const canvas = document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

const ctx = canvas.getContext("2d");
let universe = Universe.new(width, height);

let fps = 60;
let darkMode = false;
let toTick = false;

const style = document.getElementById("main-style");

const fpsCounter = document.getElementById("fps");
const speedSlider = document.getElementById("speedSlider");
const darkModeToggler = document.getElementById("darkMode");
const randomizeButton = document.getElementById("randomize");
const startButton = document.getElementById("start");
const clearButton = document.getElementById("clear");

clearButton.addEventListener("click", () => {
  universe.clear();
});
startButton.addEventListener("click", (e) => {
  toTick = !toTick;
  e.target.textContent = toTick ? "Dừng" : "Chơi";
});

darkModeToggler.addEventListener("click", (e) => {
  style.sheet.cssRules[0].style.backgroundColor = darkMode ? "black" : "white";
  style.sheet.cssRules[0].style.color = darkMode ? "white" : "black";

  darkMode = !darkMode;
  e.target.textContent = darkMode ? "Bật đèn!" : "Tắt đèn!";
});

randomizeButton.addEventListener("click", () => {
  universe = Universe.randomize(width, height);
});

speedSlider.addEventListener("change", (ev) => {
  fps = parseInt(ev.target.value);
  fpsCounter.textContent = fps;
});

const calculateXY = (targetX, targetY) => {
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;

  const canvasLeft = (targetX - boundingRect.left) * scaleX;
  const canvasTop = (targetY - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
  const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);
  return [row, col];
};

// function debounce(func, timeout = 300) {
//   let timer;
//   return (...args) => {
//     clearTimeout(timer);
//     timer = setTimeout(() => {
//       func.apply(this, args);
//     }, timeout);
//   };
// }

let dragging = false;
let latestX = undefined;
let latestY = undefined;

const toggle = (event) => {
  const [row, col] = calculateXY(event.clientX, event.clientY);
  if (dragging) {
    if (
      latestY !== undefined &&
      latestX !== undefined &&
      latestX == row &&
      latestY == col
    ) {
      return false;
    } else {
      [latestX, latestY] = [row, col];
    }
  }
  universe.toggle_cell(row, col);
  if (toTick) {
    drawGrid();
    drawCells();
  }
  event.preventDefault();
  return false;
};

canvas.addEventListener("click", toggle);

const mouseMoveHandle = (e) => {
  dragging = true;
  toggle(e);
};

const unbindMoveHandler = () => {
  dragging = false;
  canvas.removeEventListener("mousemove", mouseMoveHandle);
  // canvas.onmousemove = null;
};

canvas.addEventListener("mousedown", () => {
  canvas.addEventListener("mousemove", mouseMoveHandle);
});

canvas.addEventListener("mouseleave", unbindMoveHandler);

canvas.addEventListener("mouseup", unbindMoveHandler);

/**
 * Check if the cell, represted by a single bit is alive or dead
 *
 * First, floor the cell index by 8 to get which byte the cell state
 * is in.
 * Second, left shift the cell state by 1 bit
 * If the subset of the byte after applied with mask, same as the mask,
 * meanning the bit we're interested in is set.
 *
 * Ex:
 * Byte:   1000 0101
 * Mask:   0000 0100
 * Result: 0000 0100 -> Equal to Mask -> isSet
 *
 * @param {UInt8} n Represent the index of the cell in the board array
 * @param {*} arr Board states store as a UInt8 array (byte array each
 * index, interpreted as Uint8 )
 */
const bitIsSet = (n, arr) => {
  const byte = Math.floor(n / 8);
  const mask = 1 << n % 8;

  return (arr[byte] & mask) === mask;
};


const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  // Vertical lines.
  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
    ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
  }

  // Horizontal lines.
  for (let j = 0; j <= height; j++) {
    ctx.moveTo(0, j * (CELL_SIZE + 1) + 1);
    ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
  }

  ctx.stroke();
};

const getIndex = (row, column) => {
  return row * width + column;
};

const drawCells = () => {
  const cellsPtr = universe.cells();
  const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

  ctx.beginPath();

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);

      ctx.fillStyle =
        bitIsSet(idx, cells) ^ darkMode ? ALIVE_COLOR : DEAD_COLOR;

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  ctx.stroke();
};

const renderLoop = () => {
  setTimeout(() => {
    drawGrid();
    drawCells();
    toTick && universe.tick();
    requestAnimationFrame(renderLoop);
  }, 1000 / fps);
};

drawGrid();
drawCells();
requestAnimationFrame(renderLoop);
