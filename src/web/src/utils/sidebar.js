// Audio playback state
let currentAudio = null;

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
async function sendChatMessage(content, stateManager) {
  try {
    const userTimestamp = new Date().toISOString()
    
    // Add user message to chat history immediately
    // TODO: 
    // addChatMessage('user', content, userTimestamp)
    
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
    // TODO: 
    // addChatMessage('assistant', data.content, data.timestamp || new Date().toISOString())
    
    const state = stateManager.getState();
    if (state.speechEnabled) {
      const audioUrl = await synthesizeSpeech(data)
      if (audioUrl) {
        playAudio(audioUrl)
      } else {
        addDebugLog('Skipping synthesis, speech disabled')
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
function populateVoiceDropdown(stateManager) {
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
  const state = stateManager.getState();
  voiceSelect.value = state.speechSettings.voice
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
function setupSpeechControls(stateManager) {
  const speechToggle = document.querySelector('#speech-toggle')
  const voiceSelect = document.querySelector('#voice-select')
  
  if (!speechToggle || !voiceSelect) {
    addDebugLog('Speech controls not found')
    return
  }
  
  // Populate voice dropdown
  populateVoiceDropdown(stateManager)
  
  // Initialize settings from current control state
  stateManager.setSpeechEnabled(speechToggle.checked)
  stateManager.updateVoice(voiceSelect.value)
  
  // Set initial voice configuration on backend
  const state = stateManager.getState();
  updateVoiceConfig(state.speechSettings.voice)
  
  // Speech toggle handler
  speechToggle.addEventListener('change', (event) => {
    stateManager.setSpeechEnabled(event.target.checked)
    const speechEnabled = event.target.checked;
    addDebugLog(`Speech output ${speechEnabled ? 'enabled' : 'disabled'}`)
    
    // Stop any playing audio if speech is disabled
    if (!speechEnabled) {
      stopAudio()
    }
  })
  
  // Voice selection handler
  voiceSelect.addEventListener('change', async (event) => {
    const newVoice = event.target.value
    stateManager.updateVoice(newVoice)
    addDebugLog(`Voice changed to: ${newVoice}`)
    
    // Update backend configuration
    const success = await updateVoiceConfig(newVoice)
    if (!success) {
      // Revert to previous voice if update failed
      const state = stateManager.getState();
      voiceSelect.value = state.speechSettings.voice
      addDebugLog('Voice update failed, reverted to previous selection')
    }
  })
}

// Setup manual wake word controls
function setupWakeWordControls(stateManager) {
  const wakeWordToggle = document.querySelector('#wakeword-toggle')
  
  if (!wakeWordToggle) {
    addDebugLog('Wake word controls not found')
    return
  }
 
  // Initialize wake word state from control state
  stateManager.setWakeWordDetected(wakeWordToggle.checked)
  
  // Wake word toggle handler
  wakeWordToggle.addEventListener('change', (event) => {
      setWakeWordDetected(event.target.checked, stateManager);
      const wakeWordDetected = event.target.checked;
      addDebugLog(`Wake word ${wakeWordDetected ? 'detected' : 'not_detected'}`);
  })
}

// Function to programmatically set wake word state (for future use)
function setWakeWordDetected(detected, stateManager) {
  stateManager.setWakeWordDetected(detected)
  const wakeWordToggle = document.querySelector('#wakeword-toggle')
  if (wakeWordToggle) {
    wakeWordToggle.checked = detected
  }
  // TODO: updateListeningState()
  addDebugLog(`Wake word set to ${detected ? 'detected' : 'not_detected'} programmatically`);
}

// Setup chat message functionality
function setupChatControls(stateManager) {
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
    
    const response = await sendChatMessage(message, stateManager)
    
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
  }
  
  currentAudio.onplay = () => {
    addDebugLog('Audio playback started')
  }
  
  currentAudio.onended = () => {
    addDebugLog('Audio playback completed')
    cleanupAudio()
  }
  
  currentAudio.onerror = (error) => {
    addDebugLog(`Audio playback error: ${error.message || 'Unknown error'}`)
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
  }
}

function cleanupAudio() {
  if (currentAudio && currentAudio.src) {
    URL.revokeObjectURL(currentAudio.src)
  }
  currentAudio = null
}

export { setupCollapsibleSections, addDebugLog, loadProfiles, setupChatControls, setupSpeechControls, setupWakeWordControls }
