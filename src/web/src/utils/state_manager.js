// State manager with Observer Pattern
class StateManager {
  constructor() {
    this.state = {
      currentState: 'idle',
      isRecording: false,
      speechEnabled: true,
      speechSettings: { voice: 'en-US-JennyMultilingualNeural' },
      wakeWordDetected: false,
      audioDeviceStatus: {
        recordingInitialized: false,
        playbackActive: false,
        devicesBusy: false
      }
    };
    this.observers = [];
  }

  subscribe(observer) {
    this.observers.push(observer);
  }

  unsubscribe(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  notify() {
    this.observers.forEach(observer => observer.update(this.state));
  }

  setState(newState) {
    const hasChanges = Object.keys(newState).some(key => 
      this.state[key] !== newState[key]
    );
    
    if (hasChanges) {
      Object.assign(this.state, newState);
      this.notify();
    }
  }

  getState() {
    return { ...this.state };
  }

  updateCurrentState(newCurrentState) {
    this.setState({ currentState: newCurrentState });
  }

  setRecording(isRecording) {
    this.setState({ isRecording });
  }

  setSpeechEnabled(speechEnabled) {
    this.setState({ speechEnabled });
  }

  setSpeechSettings(speechSettings) {
    this.setState({ speechSettings });
  }

  updateVoice(voice) {
    const newSpeechSettings = { ...this.state.speechSettings, voice };
    this.setState({ speechSettings: newSpeechSettings });
  }

  setWakeWordDetected(wakeWordDetected) {
    this.setState({ wakeWordDetected });
  }

  setAudioDeviceStatus(audioDeviceStatus) {
    this.setState({ audioDeviceStatus: { ...this.state.audioDeviceStatus, ...audioDeviceStatus } });
  }

  setRecordingInitialized(recordingInitialized) {
    this.setAudioDeviceStatus({ recordingInitialized });
  }

  setPlaybackActive(playbackActive) {
    this.setAudioDeviceStatus({ playbackActive });
  }

  setDevicesBusy(devicesBusy) {
    this.setAudioDeviceStatus({ devicesBusy });
  }
}

// UI Observer to handle state changes
class UIObserver {
  constructor() {
    this.statusText = document.querySelector('#status-text');
  }

  update(state) {
    this.updateStatusUI(state.currentState);
  }

  updateStatusUI(currentState) {
    switch (currentState) {
      case 'idle':
        this.statusText.textContent = 'Ready';
        this.statusText.className = 'status-text';
        break;
      case 'listening':
        this.statusText.textContent = 'Listening...';
        this.statusText.className = 'status-text listening';
        break;
      case 'speaking':
        this.statusText.textContent = 'Speaking detected';
        this.statusText.className = 'status-text speaking';
        break;
      case 'paused':
        this.statusText.textContent = 'Pause detected';
        this.statusText.className = 'status-text paused';
        break;
      case 'processing':
        this.statusText.textContent = 'Processing...';
        this.statusText.className = 'status-text processing';
        break;
      case 'playback':
        this.statusText.textContent = 'Playing response...';
        this.statusText.className = 'status-text playback';
        break;
      case 'error':
        this.statusText.textContent = 'Audio error';
        this.statusText.className = 'status-text error';
        break;
    }
  }
}

export { StateManager, UIObserver };
