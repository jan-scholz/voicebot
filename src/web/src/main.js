import './style.css'
import './styles/status.css'
import './styles/sidebar.css'
import './styles/chat_history.css'
import { sidebarHTML } from './html/sidebar.js'
import { StateManager, UIObserver } from './utils/state_manager.js';
import { SpeechRecognition } from './utils/speech_recognition.js';
import * as sidebarUtils from './utils/sidebar.js';

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
      <div class="chat-history" id="chat-history">
        <div class="chat-header" id="chat-header">
          <h3>Chat History</h3>
          <span class="chat-arrow">▼</span>
        </div>
        <div class="chat-messages" id="chat-messages">
          <!-- Messages will be added here dynamically -->
        </div>
      </div>
      <p class="read-the-docs">
        Interactive Audiobot - Click to interact
      </p>
    </div>
    ${sidebarHTML}
  </div>
`

// Audio recording state
let audioContext;
let recorderNode;

// State management
const stateManager = new StateManager();
const uiObserver = new UIObserver();
stateManager.subscribe(uiObserver);

// Chat history management
let chatHistory = []
const MAX_CHAT_HISTORY = 200

// Speech recognition
// const speechRecognition = new SpeechRecognition(stateManager, addTranscriptionToUI);
const speechRecognition = new SpeechRecognition(stateManager, addChatMessage)

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

// Chat history functions
function addChatMessage(role, content, timestamp) {
  const message = {
    role: role,
    content: content,
    timestamp: timestamp || new Date().toISOString()
  }
  
  console.log("updating with", message)
  // Add to history array
  chatHistory.push(message)
  
  // Keep only last 200 messages
  if (chatHistory.length > MAX_CHAT_HISTORY) {
    chatHistory = chatHistory.slice(-MAX_CHAT_HISTORY)
  }
  
  // Update display
  updateChatHistoryDisplay()
}

function formatTime(isoString) {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  })
}

function updateChatHistoryDisplay() {
  const chatMessages = document.querySelector('#chat-messages')
  if (!chatMessages) return
  
  // Clear existing messages
  chatMessages.innerHTML = ''
  
  // Sort messages by timestamp
  const sortedMessages = [...chatHistory].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  )
  
  // Add each message to display
  sortedMessages.forEach(message => {
    const messageElement = document.createElement('div')
    messageElement.className = `chat-message chat-message-${message.role}`
    
    const contentElement = document.createElement('div')
    contentElement.className = 'chat-message-content'
    contentElement.textContent = message.content
    
    const timeElement = document.createElement('div')
    timeElement.className = 'chat-message-time'
    timeElement.textContent = formatTime(message.timestamp)
    
    messageElement.appendChild(contentElement)
    messageElement.appendChild(timeElement)
    chatMessages.appendChild(messageElement)
  })
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight
}

// Setup chat history collapsible functionality
function setupChatHistoryCollapse() {
  const chatHeader = document.querySelector('#chat-header')
  const chatHistory = document.querySelector('#chat-history')
  const chatMessages = document.querySelector('#chat-messages')
  const chatArrow = document.querySelector('.chat-arrow')
  
  if (!chatHeader || !chatHistory || !chatMessages || !chatArrow) {
    console.log('Chat history elements not found')
    return
  }
  
  chatHeader.addEventListener('click', () => {
    chatHistory.classList.toggle('collapsed')
    
    if (chatHistory.classList.contains('collapsed')) {
      chatArrow.textContent = '▶'
      console.log('Chat history collapsed')
    } else {
      chatArrow.textContent = '▼'
      console.log('Chat history expanded')
    }
  })
}

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
  setupChatHistoryCollapse()

  // sidebar
  sidebarUtils.setupCollapsibleSections();
  await sidebarUtils.loadProfiles()
  sidebarUtils.setupChatControls(stateManager)
  sidebarUtils.setupSpeechControls(stateManager)
  sidebarUtils.setupWakeWordControls(stateManager)
}

initApp();
