import './style.css'
import './styles/status.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { StateManager, UIObserver } from './utils/state_manager.js';
import { SpeechRecognition } from './utils/speech_recognition.js';

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
        <div class="status-indicator" id="status-indicator">
          <span class="status-text" id="status-text">Ready</span>
        </div>
      </div>
      <div class="transcription-area" id="transcription-area">
        <h3>Transcriptions:</h3>
        <div class="transcription-list" id="transcription-list"></div>
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

// Audio recording state
let audioContext;
let recorderNode;

// State management
const stateManager = new StateManager();
const uiObserver = new UIObserver();
stateManager.subscribe(uiObserver);

// Speech recognition
const speechRecognition = new SpeechRecognition(stateManager, addTranscriptionToUI);

// UI elements
const startListeningBtn = document.querySelector('#start-listening');
const stopBtn = document.querySelector('#stop');
const statusText = document.querySelector('#status-text');
const transcriptionList = document.querySelector('#transcription-list');

async function setupAudioContext() {
  audioContext = new AudioContext({ sampleRate: 16000 });
  await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
}





// Add transcription to UI
function addTranscriptionToUI(transcription) {
  const transcriptionElement = document.createElement('div');
  transcriptionElement.className = 'transcription-item';
  transcriptionElement.innerHTML = `
    <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    <span class="text">${transcription}</span>
  `;
  transcriptionList.appendChild(transcriptionElement);
  transcriptionList.scrollTop = transcriptionList.scrollHeight;
}

startListeningBtn.addEventListener('click', async () => {
  startListeningBtn.disabled = true;
  stopBtn.disabled = false;
  stateManager.setRecording(true);
  
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
    const isRecording = stateManager.getState().isRecording;
    if (!isRecording) return;
    speechRecognition.addAudioChunk(event.data);
    speechRecognition.handleVolumeLevel(event.data.volumeLevel, event.data.timestamp);
  };
  
  source.connect(recorderNode).connect(audioContext.destination);
  
  stateManager.updateCurrentState('listening');
  console.log('Continuous recording started with pause detection');
});

stopBtn.addEventListener('click', async () => {
  startListeningBtn.disabled = false;
  stopBtn.disabled = true;
  stateManager.setRecording(false);
  
  if (!audioContext) {
    console.error('AudioContext not initialized');
    return;
  }
  
  // Send any remaining audio before stopping
  if (speechRecognition.audioChunks.length > 0 && speechRecognition.speechStartTime) {
    await speechRecognition.sendCurrentAudio();
  }
  
  // Clean up audio nodes
  if (recorderNode) {
    recorderNode.disconnect();
    recorderNode = null;
  }
  
  // Stop all tracks in the stream to release the microphone
  const tracks = audioContext.sourceNode?.mediaStream?.getTracks();
  if (tracks) {
    tracks.forEach(track => track.stop());
  }
  
  speechRecognition.resetSpeechDetection();
  stateManager.updateCurrentState('idle');
  
  console.log('Recording stopped');
});

// Setup sidebar toggle functionality
const sidebar = document.querySelector('#sidebar');
const sidebarToggle = document.querySelector('#sidebar-toggle');

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

async function initApp() {
  console.log('Application initializing...');
  await setupAudioContext();
  stateManager.updateCurrentState('idle');
}

initApp();
