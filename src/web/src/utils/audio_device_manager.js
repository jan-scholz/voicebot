class AudioDeviceManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    
    // Recording state
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.recorderNode = null;
    this.isRecordingInitialized = false;
    
    // Playback state
    this.currentAudio = null;
    this.isPlaybackActive = false;
    
    // Configuration
    this.SAMPLE_RATE = 16000;
    this.WORKLET_PROCESSOR = '/audio-worklet-processor.js';
    
    // Bind methods to preserve context
    this.cleanup = this.cleanup.bind(this);
    
    // Add cleanup on page unload
    window.addEventListener('beforeunload', this.cleanup);
  }

  async initializeRecording() {
    if (this.isRecordingInitialized) {
      console.log('Recording already initialized');
      return true;
    }

    try {
      // Create AudioContext if not exists
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
        await this.audioContext.audioWorklet.addModule(this.WORKLET_PROCESSOR);
      }

      this.isRecordingInitialized = true;
      console.log('Audio recording initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize audio recording:', error);
      this.stateManager.updateCurrentState('error');
      return false;
    }
  }

  async startRecording(onAudioData) {
    // Check if playback is active
    if (this.isPlaybackActive) {
      console.log('Cannot start recording: audio playback is active');
      return false;
    }

    // Ensure recording is initialized
    if (!await this.initializeRecording()) {
      return false;
    }

    try {
      // Get microphone stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create audio nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.recorderNode = new AudioWorkletNode(this.audioContext, 'pcm-recorder-processor');

      // Set up audio data handler
      this.recorderNode.port.onmessage = (event) => {
        if (!this._messageCount) this._messageCount = 0;
        this._messageCount++;
        
        if (this.stateManager.getState().isRecording && !this.isPlaybackActive) {
          onAudioData(event.data);
        }
      };

      // Connect audio graph
      this.sourceNode.connect(this.recorderNode).connect(this.audioContext.destination);

      // Debug: Log audio context and connection info
      console.log('Audio graph connected:', {
        audioContextState: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate,
        sourceNodeChannelCount: this.sourceNode.channelCount,
        recorderNodeChannelCount: this.recorderNode.channelCount,
        mediaStreamActive: this.mediaStream.active,
        mediaStreamTracks: this.mediaStream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });

      // Ensure AudioContext is running (Chrome requirement)
      if (this.audioContext.state === 'suspended') {
        console.log('AudioContext suspended, resuming...');
        await this.audioContext.resume();
        console.log('AudioContext resumed, state:', this.audioContext.state);
      }

      // Update state
      this.stateManager.setRecording(true);
      this.stateManager.updateCurrentState('listening');

      console.log('Audio recording started successfully');
      
      // Debug: Check if AudioWorklet is processing after a delay
      setTimeout(() => {
        console.log('AudioContext state after 2 seconds:', this.audioContext.state);
        if (this._messageCount === 0) {
          console.warn('No AudioWorklet messages received after 2 seconds - possible issue with audio processing');
        } else {
          console.log(`AudioWorklet is working: ${this._messageCount} messages received`);
        }
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.stopRecording();
      return false;
    }
  }

  async stopRecording() {
    try {
      // Update state first
      this.stateManager.setRecording(false);

      // Disconnect audio nodes
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      if (this.recorderNode) {
        this.recorderNode.disconnect();
        this.recorderNode = null;
      }

      // Stop media stream tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped track: ${track.kind}`);
        });
        this.mediaStream = null;
      }

      // Update state only if not in playback
      if (!this.isPlaybackActive) {
        this.stateManager.updateCurrentState('idle');
      }

      console.log('Audio recording stopped successfully');
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }

  async startPlayback(audioUrl) {
    if (!audioUrl) {
      console.warn('No audio URL provided for playback');
      return false;
    }

    try {
      // Stop any current playback
      this.stopPlayback();

      // Stop recording if active to prevent interference
      const wasRecording = this.stateManager.getState().isRecording;
      if (wasRecording) {
        console.log('Stopping recording for audio playback');
        await this.stopRecording();
      }

      // Create and configure audio element
      this.currentAudio = new Audio(audioUrl);
      this.isPlaybackActive = true;

      // Update state
      this.stateManager.setPlaybackActive(true);
      this.stateManager.setDevicesBusy(true);

      // Set up event handlers
      this.currentAudio.onloadstart = () => {
        console.log('Audio loading started');
      };

      this.currentAudio.onplay = () => {
        console.log('Audio playback started');
        this.stateManager.updateCurrentState('playback');
      };

      this.currentAudio.onended = () => {
        console.log('Audio playback completed');
        this.cleanupPlayback();
        
        // Auto-resume recording if it was previously active
        if (wasRecording) {
          console.log('Auto-resuming recording after playback');
          setTimeout(async () => {
            // Check if we should resume (user hasn't manually stopped)
            const currentState = this.stateManager.getState();
            if (!currentState.isRecording && window.currentAudioHandler) {
              // Reset speech recognition state before resuming
              if (window.speechRecognition) {
                console.log('Resetting speech recognition state before resume');
                window.speechRecognition.resetSpeechDetection();
              }
              
              // Resume recording with the stored audio handler
              const success = await this.startRecording(window.currentAudioHandler);
              if (success) {
                console.log('Recording resumed successfully after playback');
              } else {
                console.error('Failed to resume recording after playback');
              }
            }
          }, 500);
        }
      };

      this.currentAudio.onerror = (error) => {
        console.error('Audio playback error:', error);
        this.cleanupPlayback();
      };

      // Start playback
      await this.currentAudio.play();
      return true;
    } catch (error) {
      console.error('Failed to start audio playback:', error);
      this.cleanupPlayback();
      return false;
    }
  }

  stopPlayback() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.cleanupPlayback();
      
      // Clear the audio handler to prevent auto-resume when manually stopped
      window.currentAudioHandler = null;
      console.log('Audio playback stopped manually');
    }
  }

  cleanupPlayback() {
    if (this.currentAudio) {
      // Revoke blob URL to free memory
      if (this.currentAudio.src && this.currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentAudio.src);
      }
      this.currentAudio = null;
    }

    this.isPlaybackActive = false;
    
    // Update state
    this.stateManager.setPlaybackActive(false);
    this.stateManager.setDevicesBusy(this.stateManager.getState().isRecording);
    
    // Return to idle state if not recording
    if (!this.stateManager.getState().isRecording) {
      this.stateManager.updateCurrentState('idle');
    }
  }

  isRecording() {
    return this.stateManager.getState().isRecording;
  }

  isPlaying() {
    return this.isPlaybackActive;
  }

  isBusy() {
    return this.isRecording() || this.isPlaying();
  }

  async cleanup() {
    console.log('Cleaning up AudioDeviceManager...');
    
    // Stop all activities
    await this.stopRecording();
    this.stopPlayback();

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isRecordingInitialized = false;
    
    // Remove event listener
    window.removeEventListener('beforeunload', this.cleanup);
    
    console.log('AudioDeviceManager cleanup completed');
  }

  // Get current status for debugging
  getStatus() {
    return {
      isRecordingInitialized: this.isRecordingInitialized,
      isRecording: this.isRecording(),
      isPlaybackActive: this.isPlaybackActive,
      audioContextState: this.audioContext?.state,
      hasMediaStream: !!this.mediaStream,
      hasCurrentAudio: !!this.currentAudio
    };
  }
}

export { AudioDeviceManager };