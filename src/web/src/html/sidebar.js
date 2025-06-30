export const sidebarHTML = `
<div class="sidebar" id="sidebar">
  <div class="sidebar-toggle" id="sidebar-toggle">
    <span class="arrow">›</span>
  </div>
  <div class="sidebar-content">
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
`
