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
    <div class="sidebar" id="sidebar">
      <div class="sidebar-toggle" id="sidebar-toggle">
        <span class="arrow">›</span>
      </div>
      <div class="sidebar-content">
        <div class="status-indicator" id="status-indicator">
          <span class="status-text" id="status-text">Disconnected</span>
        </div>
        
        <div class="collapsible-section">
          <div class="section-header" data-section="profile">
            <span class="section-title">Profile</span>
            <span class="section-arrow">▼</span>
          </div>
          <div class="section-content" id="profile-content">
            <p>Select a user profile from the list below.</p>
            <div class="profile-info">
              <label>Profile:</label>
              <select id="profile-dropdown">
                <option value="">Loading profiles...</option>
              </select>
            </div>
          </div>
        </div>

        <div class="collapsible-section">
          <div class="section-header" data-section="prompt">
            <span class="section-title">Prompt</span>
            <span class="section-arrow">▼</span>
          </div>
          <div class="section-content" id="prompt-content">
            <p>System prompt and conversation settings.</p>
            <div class="prompt-controls">
              <textarea id="prompt-textarea" placeholder="Select a profile to load prompt..." rows="6" disabled></textarea>
              <button id="save-prompt-btn" class="save-button" disabled>Save Prompt</button>
            </div>
          </div>
        </div>

        <div class="collapsible-section">
          <div class="section-header" data-section="chat">
            <span class="section-title">Send Chat Message</span>
            <span class="section-arrow">▼</span>
          </div>
          <div class="section-content" id="chat-content">
            <p>Send a message to the LLM chat bot.</p>
            <div class="chat-controls">
              <input type="text" id="chat-input" placeholder="Type your message..." />
              <button id="send-chat-btn" class="send-button">Send</button>
            </div>
          </div>
        </div>

        <div class="collapsible-section">
          <div class="section-header" data-section="speech">
            <span class="section-title">Speech Synthesis</span>
            <span class="section-arrow">▼</span>
          </div>
          <div class="section-content" id="speech-content">
            <p>Configure text-to-speech output settings.</p>
            <div class="speech-controls">
              <div class="speech-setting">
                <label for="speech-toggle">Speech Output:</label>
                <label class="toggle-switch">
                  <input type="checkbox" id="speech-toggle" checked />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="speech-setting">
                <label for="voice-select">Voice:</label>
                <select id="voice-select">
                  <!-- Voice options will be populated dynamically -->
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="collapsible-section">
          <div class="section-header" data-section="wakeword">
            <span class="section-title">Wake Word</span>
            <span class="section-arrow">▼</span>
          </div>
          <div class="section-content" id="wakeword-content">
            <p>Manual wake word detection control.</p>
            <div class="speech-controls">
              <div class="speech-setting">
                <label for="wakeword-toggle">Wake Word detected:</label>
                <label class="toggle-switch">
                  <input type="checkbox" id="wakeword-toggle" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="collapsible-section">
          <div class="section-header" data-section="debug">
            <span class="section-title">Debug Log</span>
            <span class="section-arrow">▼</span>
          </div>
          <div class="section-content" id="debug-content">
            <div class="debug-log" id="debug-log">
              <div class="log-entry">App initialized</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`

// Remove old counter setup and add new button functionality
const startListeningBtn = document.querySelector('#start-listening')
const stopBtn = document.querySelector('#stop')

startListeningBtn.addEventListener('click', () => {
  console.log('Start listening clicked')
  listeningEnabled = true
  switchToListeningState()
  updateButtonStates()
  addDebugLog('Listening enabled')
})

stopBtn.addEventListener('click', () => {
  console.log('Stop clicked')
  listeningEnabled = false
  setState(AppState.PAUSED)
  updateButtonStates()
  stopAudio()
  addDebugLog('Listening disabled')
})

// App state management
const AppState = {
  DISCONNECTED: 'disconnected',
  LISTENING_FOR_WAKEWORD: 'listening_for_wakeword',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  PAUSED: 'paused'
}

// Chat history management
let chatHistory = []
const MAX_CHAT_HISTORY = 200

// Speech synthesis management
let currentAudio = null
let speechEnabled = true
let speechSettings = {
  voice: 'en-US-JennyMultilingualNeural'
}

// Available voices for selection
const availableVoices = [
  'en-US-JennyMultilingualNeural',
  'en-US-AriaNeural',
  'en-US-DavisNeural',
  'en-US-GuyNeural',
  'en-US-JaneNeural',
  'en-US-JasonNeural',
  'en-US-NancyNeural',
  'en-US-TonyNeural',
  'en-CA-ClaraNeural',
  'en-CA-LiamNeural',
  'en-GB-SoniaNeural',
  'en-GB-RyanNeural',
  'en-GB-LibbyNeural',
  'en-AU-NatashaNeural',
  'en-AU-WilliamNeural',
  'fr-FR-DeniseNeural',
  'fr-FR-HenriNeural',
]

// Wake word management
let wakeWordDetected = false

// Listening state management
let listeningEnabled = false

const stateConfig = {
  [AppState.DISCONNECTED]: {
    name: 'Disconnected',
    color: 'gray',
    image: '/img/device_disconnected.png'
  },
  [AppState.LISTENING_FOR_WAKEWORD]: {
    name: 'listening_for_wakeword',
    color: 'yellow',
    image: '/img/device_listening_for_wakeword.png'
  },
  [AppState.LISTENING]: {
    name: 'Listening',
    color: 'green',
    image: '/img/device_listening.png'
  },
  [AppState.SPEAKING]: {
    name: 'Speaking',
    color: 'blue',
    image: '/img/device_speaking.png'
  },
  [AppState.PAUSED]: {
    name: 'Paused',
    color: 'red',
    image: '/img/device_paused.png'
  }
}

let currentState = AppState.DISCONNECTED
let websocket = null

// Update UI based on current state
function updateUI() {
  const config = stateConfig[currentState]
  const statusText = document.querySelector('#status-text')
  const statusIndicator = document.querySelector('#status-indicator')
  const deviceImage = document.querySelector('.device-image')
  
  statusText.textContent = config.name
  statusIndicator.className = `status-indicator status-${config.color}`
  deviceImage.src = config.image
  deviceImage.alt = `Device ${config.name.toLowerCase()}`
}

// Change state and update UI
function setState(newState) {
  currentState = newState
  updateUI()
  updateButtonStates()
  console.log(`State changed to: ${newState}`)
}

function updateListeningState() {
  // Pick the right listening state based on wakeWordDetected
  if (currentState === AppState.LISTENING && !wakeWordDetected) {
    setState(AppState.LISTENING_FOR_WAKEWORD);
  } else if (currentState === AppState.LISTENING_FOR_WAKEWORD && wakeWordDetected) {
    setState(AppState.LISTENING);
  }
}

function switchToListeningState() {
  // Pick the right listening state based on wakeWordDetected
  if (!wakeWordDetected) {
    setState(AppState.LISTENING_FOR_WAKEWORD);
  } else if (wakeWordDetected) {
    setState(AppState.LISTENING);
  }
}

// Update button appearances based on listening state
function updateButtonStates() {
  const startListeningBtn = document.querySelector('#start-listening')
  const stopBtn = document.querySelector('#stop')
  
  if (!startListeningBtn || !stopBtn) return
  
  // Update Start Listening button
  if (listeningEnabled) {
    startListeningBtn.classList.add('active')
    startListeningBtn.textContent = 'Listening...'
  } else {
    startListeningBtn.classList.remove('active')
    startListeningBtn.textContent = 'Start Listening'
  }
  
  // Update Stop button based on app state
  if (currentState === AppState.PAUSED) {
    stopBtn.classList.add('active')
  } else {
    stopBtn.classList.remove('active')
  }
}

// Setup sidebar toggle functionality
const sidebar = document.querySelector('#sidebar')
const sidebarToggle = document.querySelector('#sidebar-toggle')

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open')
})

// Setup collapsible sections
function setupCollapsibleSections() {
  const sectionHeaders = document.querySelectorAll('.section-header')
  
  sectionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const sectionName = header.getAttribute('data-section')
      const section = header.parentElement
      const content = section.querySelector('.section-content')
      
      // Toggle expanded state
      section.classList.toggle('expanded')
      content.classList.toggle('expanded')
      
      console.log(`Section ${sectionName} toggled`)
    })
  })
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

// Debug logging function
function addDebugLog(message) {
  const debugLog = document.querySelector('#debug-log')
  if (debugLog) {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = document.createElement('div')
    logEntry.className = 'log-entry'
    logEntry.textContent = `[${timestamp}] ${message}`
    debugLog.appendChild(logEntry)
    debugLog.scrollTop = debugLog.scrollHeight
  }
}

// Speech synthesis functions
async function synthesizeSpeech(messageData) {
  try {
    if (!speechEnabled) {
      return null
    }
    
    addDebugLog(`Synthesizing speech: "${messageData.content.substring(0, 50)}..."`)
    
    const response = await fetch('/text2speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)
    
    addDebugLog('Speech synthesis completed successfully')
    return audioUrl
    
  } catch (error) {
    addDebugLog(`Speech synthesis failed: ${error.message}`)
    console.error('Error synthesizing speech:', error)
    return null
  }
}

function playAudio(audioUrl) {
  if (!audioUrl) return
  
  // Stop any currently playing audio
  stopAudio()
  
  currentAudio = new Audio(audioUrl)
  
  currentAudio.onloadstart = () => {
    addDebugLog('Audio loading started')
    setState(AppState.SPEAKING)
  }
  
  currentAudio.onplay = () => {
    addDebugLog('Audio playback started')
    setState(AppState.SPEAKING)
  }
  
  currentAudio.onended = () => {
    addDebugLog('Audio playback completed')
    switchToListeningState()
    cleanupAudio()
  }
  
  currentAudio.onerror = (error) => {
    addDebugLog(`Audio playback error: ${error.message || 'Unknown error'}`)
    switchToListeningState()
    cleanupAudio()
  }
  
  currentAudio.play().catch(error => {
    addDebugLog(`Failed to play audio: ${error.message}`)
    cleanupAudio()
  })
}

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    cleanupAudio()
    addDebugLog('Audio playback stopped')
    switchToListeningState()
  }
}

function cleanupAudio() {
  if (currentAudio && currentAudio.src) {
    URL.revokeObjectURL(currentAudio.src)
  }
  currentAudio = null
}

// Chat history functions
function addChatMessage(role, content, timestamp) {
  const message = {
    role: role,
    content: content,
    timestamp: timestamp || new Date().toISOString()
  }
  
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

// Fetch profile names from backend
async function fetchProfileNames() {
  try {
    addDebugLog('Fetching profile names from backend...')
    const response = await fetch('/profile_names')
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const profiles = await response.json()
    addDebugLog(`Received ${profiles.length} profiles from backend`)
    return profiles
    
  } catch (error) {
    addDebugLog(`Failed to fetch profiles: ${error.message}`)
    console.error('Error fetching profile names:', error)
    return []
  }
}

// Populate profile dropdown with fetched data
function populateProfileDropdown(profiles) {
  const dropdown = document.querySelector('#profile-dropdown')
  
  if (!dropdown) {
    addDebugLog('Profile dropdown not found')
    return
  }
  
  // Clear existing options
  dropdown.innerHTML = ''
  
  // Add default option
  const defaultOption = document.createElement('option')
  defaultOption.value = ''
  defaultOption.textContent = 'Select a profile...'
  dropdown.appendChild(defaultOption)
  
  // Add profile options
  profiles.forEach(profile => {
    const option = document.createElement('option')
    option.value = profile.id
    option.textContent = `${profile.name} (${profile.id})`
    dropdown.appendChild(option)
  })
  
  addDebugLog(`Populated dropdown with ${profiles.length} profiles`)
}

// Load profiles on app initialization
async function loadProfiles() {
  const profiles = await fetchProfileNames()
  populateProfileDropdown(profiles)
  setupProfileChangeHandler()
}

// Fetch prompt text from backend for selected profile
async function fetchPromptText(profileId) {
  try {
    addDebugLog(`Fetching prompt for profile: ${profileId}`)
    const response = await fetch(`/prompts/${encodeURIComponent(profileId)}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        addDebugLog(`No prompt found for profile: ${profileId}`)
        return ''
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    addDebugLog(`Loaded prompt for profile: ${profileId}`)
    return data.text || ''
    
  } catch (error) {
    addDebugLog(`Failed to fetch prompt: ${error.message}`)
    console.error('Error fetching prompt:', error)
    return ''
  }
}

// Save prompt text to backend
async function savePromptText(profileId, text) {
  try {
    // let higher-leve function determine success
    // addDebugLog(`Saving prompt for profile: ${profileId}`)
    const response = await fetch('/prompts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        profile_id: profileId
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    // addDebugLog(`Prompt saved successfully: ${result.message}`)
    return true
    
  } catch (error) {
    addDebugLog(`Failed to save prompt: ${error.message}`)
    console.error('Error saving prompt:', error)
    return false
  }
}

// Setup profile dropdown change handler
function setupProfileChangeHandler() {
  const dropdown = document.querySelector('#profile-dropdown')
  const textarea = document.querySelector('#prompt-textarea')
  const saveButton = document.querySelector('#save-prompt-btn')
  
  if (!dropdown || !textarea || !saveButton) {
    addDebugLog('Profile controls not found')
    return
  }
  
  dropdown.addEventListener('change', async (event) => {
    const selectedProfileId = event.target.value
    
    if (selectedProfileId) {
      // Enable controls and load prompt
      textarea.disabled = false
      saveButton.disabled = false
      textarea.placeholder = 'Loading prompt...'
      
      const promptText = await fetchPromptText(selectedProfileId)
      textarea.value = promptText
      textarea.placeholder = 'Enter system prompt...'

      const success = await savePromptText(selectedProfileId, promptText)
    } else {
      // Disable controls when no profile selected
      textarea.disabled = true
      saveButton.disabled = true
      textarea.value = ''
      textarea.placeholder = 'Select a profile to load prompt...'
    }
  })
  
  // Setup save button handler
  saveButton.addEventListener('click', async () => {
    const selectedProfileId = dropdown.value
    const promptText = textarea.value
    
    if (!selectedProfileId) {
      addDebugLog('No profile selected for saving')
      return
    }
    
    saveButton.disabled = true
    saveButton.textContent = 'Saving...'
    
    const success = await savePromptText(selectedProfileId, promptText)
    
    saveButton.disabled = false
    saveButton.textContent = 'Save Prompt'
    
    if (success) {
      addDebugLog('Prompt saved successfully')
    }
  })
}

// Send chat message to backend
async function sendChatMessage(content) {
  try {
    const userTimestamp = new Date().toISOString()
    
    // Add user message to chat history immediately
    addChatMessage('user', content, userTimestamp)
    
    addDebugLog(`Sending chat message: ${content}`)
    const response = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'user',
        content: content,
        timestamp: userTimestamp
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    addDebugLog(`Chat response: ${data.content}`)
    console.log('Chat response:', data)
    
    // Add assistant response to chat history
    addChatMessage('assistant', data.content, data.timestamp || new Date().toISOString())
    
    // Synthesize and play speech if enabled
    if (speechEnabled) {
      const audioUrl = await synthesizeSpeech(data)
      if (audioUrl) {
        playAudio(audioUrl)
      }
    }
    
    return data
    
  } catch (error) {
    addDebugLog(`Failed to send chat message: ${error.message}`)
    console.error('Error sending chat message:', error)
    return null
  }
}

// Populate voice dropdown with available voices
function populateVoiceDropdown() {
  const voiceSelect = document.querySelector('#voice-select')
  
  if (!voiceSelect) {
    addDebugLog('Voice select dropdown not found')
    return
  }
  
  // Clear existing options
  voiceSelect.innerHTML = ''
  
  // Add voice options
  availableVoices.forEach(voice => {
    const option = document.createElement('option')
    option.value = voice
    option.textContent = voice
    voiceSelect.appendChild(option)
  })
  
  // Set default voice
  voiceSelect.value = speechSettings.voice
  addDebugLog(`Populated voice dropdown with ${availableVoices.length} voices`)
}

// Send voice configuration to backend
async function updateVoiceConfig(voiceName) {
  try {
    addDebugLog(`Updating voice config to: ${voiceName}`)
    const response = await fetch('/speechconfig', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_name: voiceName
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    addDebugLog(`Voice config updated: ${result.message}`)
    return true
    
  } catch (error) {
    addDebugLog(`Failed to update voice config: ${error.message}`)
    console.error('Error updating voice config:', error)
    return false
  }
}

// Setup speech synthesis controls
function setupSpeechControls() {
  const speechToggle = document.querySelector('#speech-toggle')
  const voiceSelect = document.querySelector('#voice-select')
  
  if (!speechToggle || !voiceSelect) {
    addDebugLog('Speech controls not found')
    return
  }
  
  // Populate voice dropdown
  populateVoiceDropdown()
  
  // Initialize settings from current control state
  speechEnabled = speechToggle.checked
  speechSettings.voice = voiceSelect.value
  
  // Set initial voice configuration on backend
  updateVoiceConfig(speechSettings.voice)
  
  // Speech toggle handler
  speechToggle.addEventListener('change', (event) => {
    speechEnabled = event.target.checked
    addDebugLog(`Speech output ${speechEnabled ? 'enabled' : 'disabled'}`)
    
    // Stop any playing audio if speech is disabled
    if (!speechEnabled) {
      stopAudio()
    }
  })
  
  // Voice selection handler
  voiceSelect.addEventListener('change', async (event) => {
    const newVoice = event.target.value
    speechSettings.voice = newVoice
    addDebugLog(`Voice changed to: ${speechSettings.voice}`)
    
    // Update backend configuration
    const success = await updateVoiceConfig(newVoice)
    if (!success) {
      // Revert to previous voice if update failed
      voiceSelect.value = speechSettings.voice
      addDebugLog('Voice update failed, reverted to previous selection')
    }
  })
}

// Setup manual wake word controls
function setupWakeWordControls() {
  const wakeWordToggle = document.querySelector('#wakeword-toggle')
  
  if (!wakeWordToggle) {
    addDebugLog('Wake word controls not found')
    return
  }
 
  // Initialize wake word state from control state
  wakeWordDetected = wakeWordToggle.checked
  
  // Wake word toggle handler
  wakeWordToggle.addEventListener('change', (event) => {
    const allowedStates = [
      AppState.LISTENING_FOR_WAKEWORD,
      AppState.LISTENING,
      AppState.PAUSED
    ];

    if (allowedStates.includes(currentState)) {
      setWakeWordDetected(event.target.checked);
      addDebugLog(`Wake word detection ${wakeWordDetected ? 'detected' : 'not_detected'}`);
    } else {
      // Prevent toggle and revert it to match actual state
      event.target.checked = wakeWordDetected;
      addDebugLog(`Toggle blocked: Wake word state change not allowed in ${currentState}`);
    }
  })
}

// Function to programmatically set wake word state (for future use)
function setWakeWordDetected(detected) {
  wakeWordDetected = detected
  const wakeWordToggle = document.querySelector('#wakeword-toggle')
  if (wakeWordToggle) {
    wakeWordToggle.checked = detected
  }
  updateListeningState()
  addDebugLog(`Wake word set to ${detected ? 'detected' : 'not_detected'} programmatically`);
}

// Setup chat message functionality
function setupChatControls() {
  const chatInput = document.querySelector('#chat-input')
  const sendButton = document.querySelector('#send-chat-btn')
  
  if (!chatInput || !sendButton) {
    addDebugLog('Chat controls not found')
    return
  }
  
  // Send button click handler
  sendButton.addEventListener('click', async () => {
    const message = chatInput.value.trim()
    if (!message) return
    
    sendButton.disabled = true
    sendButton.textContent = 'Sending...'
    chatInput.disabled = true
    
    const response = await sendChatMessage(message)
    
    sendButton.disabled = false
    sendButton.textContent = 'Send'
    chatInput.disabled = false
    
    if (response) {
      chatInput.value = '' // Clear input on success
    }
  })
  
  // Enter key handler
  chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !sendButton.disabled) {
      sendButton.click()
    }
  })
}

// WebSocket connection management
function connectWebSocket() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${wsProtocol}//${window.location.host}/ws/audio`
  
  try {
    websocket = new WebSocket(wsUrl)
    
    websocket.onopen = () => {
      console.log('WebSocket connected')
      addDebugLog('WebSocket connected successfully')
      setState(AppState.PAUSED)
    }
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected')
      addDebugLog('WebSocket connection closed')
      setState(AppState.DISCONNECTED)
      websocket = null
      // Retry connection after 3 seconds
      setTimeout(connectWebSocket, 3000)
    }
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      addDebugLog(`WebSocket error: ${error.message || 'Connection failed'}`)
      setState(AppState.DISCONNECTED)
    }
    
    websocket.onmessage = (event) => {
      console.log('WebSocket message:', event.data)
      // Handle incoming messages from server
    }
    
  } catch (error) {
    console.error('Failed to create WebSocket:', error)
    setState(AppState.DISCONNECTED)
    // Retry connection after 3 seconds
    setTimeout(connectWebSocket, 3000)
  }
}

// Initialize the app
async function initApp() {
  addDebugLog('Application initializing...')
  setupCollapsibleSections() // Setup collapsible sections
  setupChatHistoryCollapse() // Setup chat history collapse
  updateUI() // Set initial UI state
  updateButtonStates() // Set initial button states
  
  // Load profiles from backend
  await loadProfiles()
  
  // Setup chat controls
  setupChatControls()
  
  // Setup speech controls
  setupSpeechControls()
  
  // Setup wake word controls
  setupWakeWordControls()
  
  addDebugLog('Attempting WebSocket connection...')
  connectWebSocket() // Attempt to connect to WebSocket
}

// Start the app when DOM is loaded
initApp()
