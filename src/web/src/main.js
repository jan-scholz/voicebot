import './style.css'
import './styles/status.css'
import './styles/sidebar.css'
import './styles/chat_history.css'
import { sidebarHTML } from './html/sidebar.js'
import { StateManager, UIObserver, DeviceImageObserver, ButtonObserver } from './utils/state_manager.js';
import { SpeechRecognition } from './utils/speech_recognition.js';
import * as sidebarUtils from './utils/sidebar.js';
import { sendChatMessage } from './utils/sidebar.js';
import { ChatLog, createChatMessage, formatTime } from './utils/chat_history.js';
import { AudioDeviceManager } from './utils/audio_device_manager.js';

document.querySelector('#app').innerHTML = `
  <div class="main-container">
    <div class="top-bar">
      <img src="/img/audiobot_logo.png" class="audiobot-logo" alt="Audiobot logo" />
    </div>
    <div class="content">
      <img src="/img/device_paused.png" class="device-image" id="device-image" alt="Interactive audiobot device" />
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
    ${sidebarHTML}
    <footer>
    Copyright 2025. All rights reserved.<br/><br/>
    </footer>
  </div>
`

// State management
const stateManager = new StateManager();
const uiObserver = new UIObserver();
const deviceImageObserver = new DeviceImageObserver();
const buttonObserver = new ButtonObserver();
stateManager.subscribe(uiObserver);
stateManager.subscribe(deviceImageObserver);
stateManager.subscribe(buttonObserver);

// Audio device management
const audioDeviceManager = new AudioDeviceManager(stateManager);

// Chat history management
const chatLog = new ChatLog(200, updateChatHistoryDisplay);

// Speech recognition
const speechRecognition = new SpeechRecognition(stateManager, (role, content, timestamp) => {
  if (role === 'user') {
    sendChatMessage(content, stateManager, chatLog, audioDeviceManager)
  }
})

// Make speechRecognition globally accessible for AudioDeviceManager
window.speechRecognition = speechRecognition;

// UI elements
const startListeningBtn = document.querySelector('#start-listening');
const stopBtn = document.querySelector('#stop');
const statusText = document.querySelector('#status-text');
const transcriptionList = document.querySelector('#transcription-list');

// Audio setup is now handled by AudioDeviceManager

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
  // Reset speech recognition state for clean start
  speechRecognition.resetSpeechDetection();
  
  // Start recording and let state management handle button states
  window.currentAudioHandler = (audioData) => {
    speechRecognition.addAudioChunk(audioData);
    
    // Handle different formats from different browsers
    const volumeLevel = audioData && audioData.volumeLevel !== undefined ? audioData.volumeLevel : 0;
    const timestamp = audioData && audioData.timestamp !== undefined ? audioData.timestamp : Date.now();
    
    speechRecognition.handleVolumeLevel(volumeLevel, timestamp);
  };
  
  const success = await audioDeviceManager.startRecording(window.currentAudioHandler);
  
  if (!success) {
    console.error('Failed to start recording');
    window.currentAudioHandler = null;
  } else {
    console.log('Recording started successfully');
  }
});

stopBtn.addEventListener('click', async () => {
  const state = stateManager.getState();
  
  // If recording, stop recording
  if (state.isRecording) {
    // Send any remaining audio before stopping
    if (speechRecognition.audioChunks.length > 0 && speechRecognition.speechStartTime) {
      await speechRecognition.sendCurrentAudio();
    }
    
    // Stop recording via AudioDeviceManager
    await audioDeviceManager.stopRecording();
    
    // Reset speech recognition state
    speechRecognition.resetSpeechDetection();
    
    // Clear the audio handler
    window.currentAudioHandler = null;
    
    console.log('Recording stopped by user');
  }
  
  // If playback is active, stop playback
  if (state.audioDeviceStatus.playbackActive) {
    audioDeviceManager.stopPlayback();
    console.log('Playback stopped by user');
  }
});

// Chat history functions
// TODO: simplify further
function addChatMessage(role, content, timestamp) {
  const message = createChatMessage(role, content, timestamp)
  console.log("addChatMessage", message)
  chatLog.addMessage(message)
}

function updateChatHistoryDisplay() {
  const chatMessages = document.querySelector('#chat-messages')
  if (!chatMessages) return
  
  // Clear existing messages
  chatMessages.innerHTML = ''
  
  // Get messages from ChatLog (already sorted)
  const sortedMessages = chatLog.getMessages()
  
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
  
  // Initialize audio device manager
  await audioDeviceManager.initializeRecording();
  stateManager.updateCurrentState('idle');
  setupChatHistoryCollapse()

  // Add cleanup on page unload
  window.addEventListener('beforeunload', async () => {
    console.log('Page unloading, cleaning up audio devices...');
    await audioDeviceManager.cleanup();
  });

  // Add error handling for unhandled audio errors
  window.addEventListener('error', (event) => {
    if (event.error && event.error.name === 'NotAllowedError') {
      console.error('Microphone access denied:', event.error);
      stateManager.updateCurrentState('error');
    }
  });

  // sidebar
  sidebarUtils.setupCollapsibleSections();
  await sidebarUtils.loadProfiles()
  sidebarUtils.setupChatControls(stateManager, chatLog, audioDeviceManager)
  sidebarUtils.setupSpeechControls(stateManager)
  sidebarUtils.setupWakeWordControls(stateManager)
}

initApp();
