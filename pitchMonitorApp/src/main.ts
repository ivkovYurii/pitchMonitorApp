import './style.css';
import PyinWorker from './pyinWorker?worker';

// --- APPLICATION STATE ---
const TEST_MODE = false;
let isDarkMode = true; // Dark Theme enabled by default

// --- UI TEMPLATE ---
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="appContainer" class="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans transition-colors duration-200">
    <div class="max-w-4xl mx-auto space-y-8">
      
      <!-- Header with Theme Toggle Button -->
      <header class="flex justify-between items-center border-b border-slate-800 pb-6 transition-colors" id="appHeader">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-100" id="appTitle">
            Vocalis AI <span class="text-sky-400">PitchTrace</span>
          </h1>
          <p class="text-slate-400 mt-2" id="appSubtitle">Real-time fundamental frequency extraction and analysis.</p>
        </div>
        
        <button id="themeToggleBtn" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center gap-2 font-medium text-sm cursor-pointer">
          <span id="themeIcon">☀️</span>
          <span id="themeText">Light Mode</span>
        </button>
      </header>

      <!-- Controls -->
      <div id="controlsCard" class="flex flex-wrap items-center gap-4 bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 transition-colors">
        <button id="startBtn" class="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Record Session
        </button>
        <button id="stopBtn" disabled class="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Stop & Process
        </button>
        <button id="drawBtn" disabled class="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-sm border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Visualize Data
        </button>
        <button id="copyBtn" disabled class="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Copy JSON
        </button>
      </div>
      
      <!-- Status Bar -->
      <div id="statusBar" class="bg-slate-900 rounded-xl p-4 text-center border border-slate-800 transition-colors">
        <p id="status" class="text-sm font-medium text-slate-400 uppercase tracking-wider">System Ready</p>
      </div>
      
      <!-- Graph Container -->
      <div id="graphContainer" class="hidden flex-col gap-6">
        <div class="space-y-2">
          <div class="flex justify-between items-end">
            <h3 class="text-lg font-bold text-slate-200" id="overviewTitle">Session Overview</h3>
            <span class="text-xs font-medium text-slate-400 uppercase">Drag to zoom</span>
          </div>
          <canvas id="minimap" class="w-full rounded-xl shadow-sm border border-slate-800 cursor-crosshair transition-colors"></canvas>
        </div>
        
        <div class="space-y-2">
          <h3 class="text-lg font-bold text-slate-200" id="detailTitle">Detailed Pitch Trace</h3>
          <canvas id="detailGraph" class="w-full rounded-xl shadow-lg border border-slate-800 transition-colors"></canvas>
        </div>
      </div>

    </div>
  </div>
`;

// --- DOM ELEMENTS & SETUP ---
const appContainer = document.querySelector<HTMLDivElement>('#appContainer')!;
const appHeader = document.querySelector<HTMLElement>('#appHeader')!;
const appTitle = document.querySelector<HTMLHeadingElement>('#appTitle')!;
const appSubtitle = document.querySelector<HTMLParagraphElement>('#appSubtitle')!;
const controlsCard = document.querySelector<HTMLDivElement>('#controlsCard')!;
const statusBar = document.querySelector<HTMLDivElement>('#statusBar')!;
const overviewTitle = document.querySelector<HTMLHeadingElement>('#overviewTitle')!;
const detailTitle = document.querySelector<HTMLHeadingElement>('#detailTitle')!;

const themeToggleBtn = document.querySelector<HTMLButtonElement>('#themeToggleBtn')!;
const themeIcon = document.querySelector<HTMLSpanElement>('#themeIcon')!;
const themeText = document.querySelector<HTMLSpanElement>('#themeText')!;

const startBtn = document.querySelector<HTMLButtonElement>('#startBtn')!;
const stopBtn = document.querySelector<HTMLButtonElement>('#stopBtn')!;
const drawBtn = document.querySelector<HTMLButtonElement>('#drawBtn')!;
const copyBtn = document.querySelector<HTMLButtonElement>('#copyBtn')!;
const statusText = document.querySelector<HTMLParagraphElement>('#status')!;

const graphContainer = document.querySelector<HTMLDivElement>('#graphContainer')!;
const minimap = document.querySelector<HTMLCanvasElement>('#minimap')!;
const detailGraph = document.querySelector<HTMLCanvasElement>('#detailGraph')!;

const miniCtx = minimap.getContext('2d')!;
const detailCtx = detailGraph.getContext('2d')!;

// --- THEME SWAP LOGIC ---
function toggleTheme() {
  isDarkMode = !isDarkMode;

  if (isDarkMode) {
    // Dark Palette
    appContainer.className = "min-h-screen bg-slate-950 text-slate-100 p-8 font-sans transition-colors duration-200";
    appHeader.className = "flex justify-between items-center border-b border-slate-800 pb-6 transition-colors";
    appTitle.className = "text-3xl font-extrabold tracking-tight text-slate-100";
    appSubtitle.className = "text-slate-400 mt-2";
    controlsCard.className = "flex flex-wrap items-center gap-4 bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 transition-colors";
    statusBar.className = "bg-slate-900 rounded-xl p-4 text-center border border-slate-800 transition-colors";
    overviewTitle.className = "text-lg font-bold text-slate-200";
    detailTitle.className = "text-lg font-bold text-slate-200";
    
    themeToggleBtn.className = "px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center gap-2 font-medium text-sm cursor-pointer";
    themeIcon.innerText = "☀️";
    themeText.innerText = "Light Mode";
  } else {
    // Light Palette
    appContainer.className = "min-h-screen bg-slate-50 text-slate-900 p-8 font-sans transition-colors duration-200";
    appHeader.className = "flex justify-between items-center border-b border-slate-200 pb-6 transition-colors";
    appTitle.className = "text-3xl font-extrabold tracking-tight text-slate-900";
    appSubtitle.className = "text-slate-500 mt-2";
    controlsCard.className = "flex flex-wrap items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-colors";
    statusBar.className = "bg-slate-200/60 rounded-xl p-4 text-center border border-slate-200 transition-colors";
    overviewTitle.className = "text-lg font-bold text-slate-800";
    detailTitle.className = "text-lg font-bold text-slate-800";

    themeToggleBtn.className = "px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl border border-slate-300 transition-colors flex items-center gap-2 font-medium text-sm cursor-pointer";
    themeIcon.innerText = "🌙";
    themeText.innerText = "Dark Mode";
  }

  // Redraw canvases with theme-matched color palettes
  if (!graphContainer.classList.contains('hidden')) {
    renderMinimap();
    renderDetailGraph();
  }
}

themeToggleBtn.addEventListener('click', toggleTheme);

// --- DYNAMIC CANVAS RENDERING ---
const CSS_WIDTH = 800;
const MINI_HEIGHT = 80;
const DETAIL_HEIGHT = 300;

function setupHighResCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, cssWidth: number, cssHeight: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.scale(dpr, dpr);
}

function renderMinimap() {
  miniCtx.clearRect(0, 0, CSS_WIDTH, MINI_HEIGHT);
  
  // Dynamic Theme Colors
  const bgColor = isDarkMode ? '#1e293b' : '#ffffff';
  const lineColor = isDarkMode ? '#64748b' : '#cbd5e1';
  const selectionColor = isDarkMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(14, 165, 233, 0.15)';

  miniCtx.fillStyle = bgColor;
  miniCtx.fillRect(0, 0, CSS_WIDTH, MINI_HEIGHT);

  if (pitchData.length === 0) return;

  const validPitches = pitchData.filter(d => d.hz > 0).map(d => d.hz);
  const minHz = Math.min(...validPitches) || 50;
  const maxHz = Math.max(...validPitches) || 1000;

  miniCtx.beginPath();
  miniCtx.strokeStyle = lineColor;
  miniCtx.lineWidth = 2;

  const logMin = Math.log2(minHz);
  const logMax = Math.log2(maxHz);

  pitchData.forEach((point, i) => {
    const x = (i / (pitchData.length - 1)) * CSS_WIDTH;
    if (point.hz === 0) return; 
    
    const logHz = Math.log2(point.hz);
    const y = MINI_HEIGHT - ((logHz - logMin) / (logMax - logMin)) * MINI_HEIGHT;
    
    if (i === 0 || pitchData[i-1].hz === 0) miniCtx.moveTo(x, y);
    else miniCtx.lineTo(x, y);
  });
  miniCtx.stroke();

  // Draw selection box
  const startX = selectionStartPct * CSS_WIDTH;
  const width = (selectionEndPct - selectionStartPct) * CSS_WIDTH;
  miniCtx.fillStyle = selectionColor;
  miniCtx.fillRect(startX, 0, width, MINI_HEIGHT);
}

function renderDetailGraph() {
  detailCtx.clearRect(0, 0, CSS_WIDTH, DETAIL_HEIGHT);

  // Dynamic Theme Colors
  const bgColor = isDarkMode ? '#0f172a' : '#ffffff';
  const gridMajorColor = isDarkMode ? '#334155' : '#cbd5e1';
  const gridMinorColor = isDarkMode ? '#1e293b' : '#f1f5f9';
  const textMajorColor = isDarkMode ? '#94a3b8' : '#475569';
  const textMinorColor = isDarkMode ? '#475569' : '#94a3b8';
  const pitchLineColor = isDarkMode ? '#38bdf8' : '#0284c7';

  detailCtx.fillStyle = bgColor;
  detailCtx.fillRect(0, 0, CSS_WIDTH, DETAIL_HEIGHT);

  if (pitchData.length === 0) return;

  const startIndex = Math.floor(selectionStartPct * (pitchData.length - 1));
  const endIndex = Math.floor(selectionEndPct * (pitchData.length - 1));
  const selectedData = pitchData.slice(startIndex, endIndex + 1);

  if (selectedData.length === 0) return;

  const validPitches = selectedData.filter(d => d.hz > 0).map(d => d.hz);
  if (validPitches.length === 0) return;

  const rawMinHz = Math.min(...validPitches);
  const rawMaxHz = Math.max(...validPitches);
  
  const minMidi = Math.floor(12 * Math.log2(rawMinHz / 440) + 69) - 2;
  const maxMidi = Math.ceil(12 * Math.log2(rawMaxHz / 440) + 69) + 2;
  
  const graphMinHz = 440 * Math.pow(2, (minMidi - 69) / 12);
  const graphMaxHz = 440 * Math.pow(2, (maxMidi - 69) / 12);
  
  const logMin = Math.log2(graphMinHz);
  const logMax = Math.log2(graphMaxHz);

  // Draw Grid Lines & Semitones
  detailCtx.font = "12px sans-serif";
  detailCtx.textAlign = "left";
  detailCtx.textBaseline = "middle";

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  for (let m = minMidi; m <= maxMidi; m++) {
    const hz = 440 * Math.pow(2, (m - 69) / 12);
    const logHz = Math.log2(hz);
    const y = DETAIL_HEIGHT - ((logHz - logMin) / (logMax - logMin)) * DETAIL_HEIGHT;
    
    detailCtx.beginPath();
    detailCtx.strokeStyle = m % 12 === 0 ? gridMajorColor : gridMinorColor;
    detailCtx.lineWidth = 1;
    detailCtx.moveTo(0, y);
    detailCtx.lineTo(CSS_WIDTH, y);
    detailCtx.stroke();
    
    detailCtx.fillStyle = m % 12 === 0 ? textMajorColor : textMinorColor;
    const noteName = noteNames[m % 12] + (Math.floor(m / 12) - 1);
    detailCtx.fillText(noteName, 10, y - 2);
  }

  // Draw Pitch Trace
  detailCtx.beginPath();
  detailCtx.strokeStyle = pitchLineColor;
  detailCtx.lineWidth = 3;
  detailCtx.lineCap = 'round';
  detailCtx.lineJoin = 'round';

  selectedData.forEach((point, i) => {
    const x = (i / (selectedData.length - 1)) * CSS_WIDTH;
    if (point.hz === 0) return; 
    
    const logHz = Math.log2(point.hz);
    const y = DETAIL_HEIGHT - ((logHz - logMin) / (logMax - logMin)) * DETAIL_HEIGHT;
    
    if (i === 0 || selectedData[i-1].hz === 0) detailCtx.moveTo(x, y);
    else detailCtx.lineTo(x, y);
  });
  detailCtx.stroke();
}

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

// 2. Initialize the Web Worker
const worker = new PyinWorker();

worker.onmessage = (event) => {
  statusText.innerText = "Processing complete! Ready to visualize or copy.";
  pitchData = event.data;
  
  startBtn.disabled = false;
  drawBtn.disabled = false;
  copyBtn.disabled = false; // Enable the new button
};

// 3. Audio Context for decoding the blob later
const audioCtx = new window.AudioContext();

startBtn.addEventListener('click', async () => {
  audioChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
  
  mediaRecorder.onstop = async () => {
    statusText.innerText = "Decoding audio...";
    
    // 1. Create the Blob from the recorded chunks
    const audioBlob = new Blob(audioChunks); 
    
    // 2. TEST MODE: Automatically download the raw audio file
    if (TEST_MODE) {
      // Create a temporary URL for the Blob
      const audioUrl = URL.createObjectURL(audioBlob);
      // Create a hidden anchor element
      const downloadLink = document.createElement('a');
      downloadLink.style.display = 'none';
      downloadLink.href = audioUrl;
      // Name the file .webm (the default for Chrome/Edge/Firefox)
      downloadLink.download = `vocalis_test_${Date.now()}.webm`; 
      
      // Trigger the download and clean up
      document.body.appendChild(downloadLink);
      downloadLink.click();
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(audioUrl);
      }, 100);
    }

    // 3. Continue with the DSP processing pipeline
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    
    statusText.innerText = "Sending to pYIN worker...";
    worker.postMessage({ 
      audioData: channelData, 
      sampleRate: audioBuffer.sampleRate 
    });
  };
  
  mediaRecorder.start();
  statusText.innerText = "Recording... Sing now!";
  startBtn.disabled = true;
  stopBtn.disabled = false;
});

stopBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    // Stop all microphone tracks to turn off the red recording light in the browser tab
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    stopBtn.disabled = true;
  }
});


copyBtn.addEventListener('click', async () => {
  try {
    const jsonString = JSON.stringify(pitchData, null, 2);
    await navigator.clipboard.writeText(jsonString);
    statusText.innerText = `Copied ${pitchData.length} frames to clipboard!`;
  } catch (err) {
    statusText.innerText = "Failed to copy to clipboard.";
    console.error("Clipboard error:", err);
  }
});

// --- GRAPHING & UI LOGIC ---

// State variables
let pitchData: { timestamp: number, hz: number, probability: number }[] = [];
let selectionStartPct = 0;   
let selectionEndPct = 1;     

worker.onmessage = (event) => {
  statusText.innerText = "Processing complete! Ready to visualize or copy.";
  pitchData = event.data;
  startBtn.disabled = false;
  drawBtn.disabled = false;
  copyBtn.disabled = false;
};

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(pitchData, null, 2));
    statusText.innerText = `Copied ${pitchData.length} frames to clipboard!`;
  } catch (err) {
    statusText.innerText = "Failed to copy to clipboard.";
  }
});

drawBtn.addEventListener('click', () => {
  graphContainer.classList.remove('hidden');
  graphContainer.classList.add('flex');
  
  setupHighResCanvas(minimap, miniCtx, CSS_WIDTH, MINI_HEIGHT);
  setupHighResCanvas(detailGraph, detailCtx, CSS_WIDTH, DETAIL_HEIGHT);
  
  selectionStartPct = 0;
  selectionEndPct = 1;
  
  renderMinimap();
  renderDetailGraph();
});

// Mouse Interactions (Using CSS_WIDTH instead of physical canvas width)
let isDragging = false;
let dragStartX = 0;

minimap.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStartX = e.offsetX;
  selectionStartPct = Math.max(0, Math.min(1, dragStartX / CSS_WIDTH));
  selectionEndPct = selectionStartPct; 
  renderMinimap();
});

minimap.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const currentPct = Math.max(0, Math.min(1, e.offsetX / CSS_WIDTH));
  const startPct = Math.max(0, Math.min(1, dragStartX / CSS_WIDTH));
  
  selectionStartPct = Math.min(startPct, currentPct);
  selectionEndPct = Math.max(startPct, currentPct);
  
  renderMinimap();
  renderDetailGraph(); 
});

window.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    if (selectionStartPct === selectionEndPct) {
      selectionEndPct = Math.min(1, selectionStartPct + 0.2); 
    }
    renderMinimap();
    renderDetailGraph();
  }
});