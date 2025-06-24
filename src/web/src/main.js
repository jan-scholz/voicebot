import './style.css'
import './styles/status.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { createWAVBlob, mergeBuffers } from './utils/audio.js';
import { StateManager, UIObserver } from './utils/state_manager.js';

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

// Audio recording and pause detection state
let audioContext;
let recorderNode;
let audioChunks = [];

// State management
const stateManager = new StateManager();
const uiObserver = new UIObserver();
stateManager.subscribe(uiObserver);

// Pause detection configuration
const SILENCE_THRESHOLD = 0.01; // RMS threshold for silence
const MIN_SPEECH_DURATION = 500; // Minimum speech duration before pause detection (ms)
const PAUSE_DURATION = 1500; // Duration of silence to trigger send (ms)
const MIN_AUDIO_DURATION = 1000; // Minimum total audio duration to send (ms)

// Timing variables
let speechStartTime = null;
let lastSpeechTime = null;
let pauseTimer = null;

// UI elements
const startListeningBtn = document.querySelector('#start-listening');
const stopBtn = document.querySelector('#stop');
const statusText = document.querySelector('#status-text');
const transcriptionList = document.querySelector('#transcription-list');

async function setupAudioContext() {
  audioContext = new AudioContext({ sampleRate: 16000 });
  await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
}


// Handle pause detection logic
function handleVolumeLevel(volumeLevel, timestamp) {
  const now = Date.now();
  const isSpeaking = volumeLevel > SILENCE_THRESHOLD;
  
  if (isSpeaking) {
    // Speech detected
    lastSpeechTime = now;
    
    const currentState = stateManager.getState().currentState;
    if (currentState === 'listening' || currentState === 'paused') {
      speechStartTime = speechStartTime || now;
      stateManager.updateCurrentState('speaking');
    }
    
    // Clear any pending pause timer
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      pauseTimer = null;
    }
  } else {
    // Silence detected
    const currentState = stateManager.getState().currentState;
    if (currentState === 'speaking' && speechStartTime) {
      const speechDuration = now - speechStartTime;
      
      // Only trigger pause detection if we've been speaking long enough
      if (speechDuration > MIN_SPEECH_DURATION) {
        stateManager.updateCurrentState('paused');
        
        // Set timer to send audio after pause duration
        pauseTimer = setTimeout(() => {
          sendCurrentAudio();
        }, PAUSE_DURATION);
      }
    } else if (currentState === 'listening') {
      stateManager.updateCurrentState('listening');
    } else if (currentState === 'paused') {
      stateManager.updateCurrentState('paused');
    }
  }
}

// Send current audio to backend
async function sendCurrentAudio() {
  if (audioChunks.length === 0) {
    console.log('No audio to send');
    return;
  }
  
  const now = Date.now();
  const totalDuration = speechStartTime ? now - speechStartTime : 0;
  
  // Don't send very short audio clips
  if (totalDuration < MIN_AUDIO_DURATION) {
    console.log('Audio too short, continuing to record');
    resetSpeechDetection();
    return;
  }
  
  stateManager.updateCurrentState('processing');
  
  try {
    // Extract audio data from chunks (removing volume info)
    const audioOnlyChunks = audioChunks.map(chunk => chunk.audioData);
    
    const float32Buffer = mergeBuffers(audioOnlyChunks);
    const wavBlob = createWAVBlob(float32Buffer, 16000);
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', wavBlob, 'recording.wav');
    
    const resp = await fetch('/process-audio', {
      method: 'POST',
      body: formData,
    });
    
    const data = await resp.json();
    console.log('Transcription:', data.transcription);
    
    // Add transcription to UI
    addTranscriptionToUI(data.transcription);
    
  } catch (err) {
    console.error('Upload error:', err);
    addTranscriptionToUI('Error: Could not process audio');
  }
  
  // Reset for next speech segment
  resetSpeechDetection();
  
  // Continue listening if still recording
  const isRecording = stateManager.getState().isRecording;
  if (isRecording) {
    stateManager.updateCurrentState('listening');
  }
}

// Reset speech detection variables
function resetSpeechDetection() {
  audioChunks = [];
  speechStartTime = null;
  lastSpeechTime = null;
  
  if (pauseTimer) {
    clearTimeout(pauseTimer);
    pauseTimer = null;
  }
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
    audioChunks.push(event.data);
    handleVolumeLevel(event.data.volumeLevel, event.data.timestamp);
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
  if (audioChunks.length > 0 && speechStartTime) {
    await sendCurrentAudio();
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
  
  resetSpeechDetection();
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
