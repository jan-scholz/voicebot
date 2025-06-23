import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'

document.querySelector('#app').innerHTML = `
  <div class="main-container">
    <div class="top-bar">
      <img src="/img/audiobot_logo.png" class="audiobot-logo" alt="Audiobot logo" />
    </div>
    <div class="content">
      <img src="/img/device_disconnected.png" class="device-image" alt="Device disconnected" />
      <div class="card">
        <button id="start-listening" type="button">Start Listening</button>
        <button id="stop" type="button">Stop</button>
      </div>
      <p class="read-the-docs">
        Interactive Audiobot - Click to interact
      </p>
    </div>
    <div class="sidebar" id="sidebar">
      <div class="sidebar-toggle" id="sidebar-toggle">
        <span class="arrow">›</span>
      </div>
      <div class="sidebar-content">
        <h3>Sidebar</h3>
        <p>This is the collapsible sidebar content.</p>
      </div>
    </div>
  </div>
`

// Remove old counter setup and add new button functionality
const startListeningBtn = document.querySelector('#start-listening')
const stopBtn = document.querySelector('#stop')

let audioContext;
let recorderNode;
let audioChunks = [];

async function setupAudioContext() {
  audioContext = new AudioContext({ sampleRate: 16000 });
  await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
}

// Convert Float32Array [-1,1] to Int16Array PCM buffer
// function float32To16BitPCM(float32Array) {
//   const int16Array = new Int16Array(float32Array.length);
//   for (let i = 0; i < float32Array.length; i++) {
//     let s = Math.max(-1, Math.min(1, float32Array[i]));
//     int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
//   }
//   return int16Array.buffer; // Return raw ArrayBuffer
// }

function createWAVBlob(float32Array, sampleRate) {
  // Create buffer for header + audio data
  const buffer = new ArrayBuffer(44 + float32Array.length * 2);
  const view = new DataView(buffer);
  const headerBytes = new Uint8Array(buffer, 0, 44);

  headerBytes.set([82, 73, 70, 70], 0);
  view.setUint32(4, 36 + float32Array.length * 2, true);
  headerBytes.set([87, 65, 86, 69], 8);
  headerBytes.set([102, 109, 116, 32], 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  headerBytes.set([100, 97, 116, 97], 36);
  view.setUint32(40, float32Array.length * 2, true);

  // Direct conversion to final buffer location
  const audioData = new Int16Array(buffer, 44);
  for (let i = 0; i < float32Array.length; i++) {
    const sample = float32Array[i];
    audioData[i] = sample < 0
      ? Math.max(sample, -1) * 0x8000
      : Math.min(sample, 1) * 0x7FFF;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// Helper: merge Float32Array chunks into one
function mergeBuffers(chunks) {
  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
  }

  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

startListeningBtn.addEventListener('click', async () => {
  startListeningBtn.disabled = true;
  stopBtn.disabled = false;

  // Get mic stream
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  if (!audioContext) {
    console.error('AudioContext not initialized');
    return;
  }

  const source = audioContext.createMediaStreamSource(stream);
  audioContext.sourceNode = source; // Store reference for cleanup

  // Create AudioWorkletNode to capture raw PCM
  recorderNode = new AudioWorkletNode(audioContext, 'pcm-recorder-processor');

  recorderNode.port.onmessage = (event) => {
    // Receive Float32Array PCM audio data from processor
    audioChunks.push(event.data);
  };

  source.connect(recorderNode).connect(audioContext.destination);

  console.log('Recording started');
});

stopBtn.addEventListener('click', async () => {
  startListeningBtn.disabled = false;
  stopBtn.disabled = true;

  if (!audioContext) {
    console.error('AudioContext not initialized');
    return;
  }

  // Instead of closing AudioContext, just disconnect the nodes
  if (recorderNode) {
    recorderNode.disconnect();
    recorderNode = null;
  }

  // Stop all tracks in the stream to release the microphone
  const tracks = audioContext.sourceNode?.mediaStream?.getTracks();
  if (tracks) {
    tracks.forEach(track => track.stop());
  }

  // Rest of your transcription code stays the same...
  const float32Buffer = mergeBuffers(audioChunks);
  audioChunks = [];
  const wavBlob = createWAVBlob(float32Buffer, 16000);

  // Prepare form data
  const formData = new FormData();
  // formData.append('file', pcmBlob, 'recording.pcm');
  formData.append('file', wavBlob, 'recording.wav');


  try {
    const resp = await fetch('/process-audio', {
      method: 'POST',
      body: formData,
    });
    const data = await resp.json();
    console.log('Transcription:', data.transcription);
  } catch (err) {
    console.error('Upload error:', err);
  }
});

// Setup sidebar toggle functionality
const sidebar = document.querySelector('#sidebar')
const sidebarToggle = document.querySelector('#sidebar-toggle')

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open')
})

async function initApp() {
  console.log('Application initializing...')
  await setupAudioContext();
}

initApp()
