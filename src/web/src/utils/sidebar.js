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

export { setupCollapsibleSections, addDebugLog, fetchProfileNames, populateProfileDropdown, loadProfiles }

// fetchPromptText
// savePromptText
// setupProfileChangeHandler
// sendChatMessage
// populateVoiceDropdown
// updateVoiceConfig
// setupSpeechControls
// setupWakeWordControls
// setWakeWordDetected
// setupChatControls
