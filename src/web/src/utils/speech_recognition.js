import { createWAVBlob, mergeBuffers } from './audio.js';

class SpeechRecognition {
  constructor(stateManager, onTranscription) {
    // Configuration constants
    this.SILENCE_THRESHOLD = 0.01;
    this.MIN_SPEECH_DURATION = 500;
    this.PAUSE_DURATION = 1500;
    this.MIN_AUDIO_DURATION = 1000;
    
    // State
    this.audioChunks = [];
    this.speechStartTime = null;
    this.lastSpeechTime = null;
    this.pauseTimer = null;
    
    // Dependencies
    this.stateManager = stateManager;
    this.onTranscription = onTranscription;
  }

  handleVolumeLevel(volumeLevel, timestamp) {
    const now = Date.now();
    const isSpeaking = volumeLevel > this.SILENCE_THRESHOLD;
    
    if (isSpeaking) {
      // Speech detected
      this.lastSpeechTime = now;
      
      const currentState = this.stateManager.getState().currentState;
      if (currentState === 'listening' || currentState === 'paused') {
        this.speechStartTime = this.speechStartTime || now;
        this.stateManager.updateCurrentState('speaking');
      }
      
      // Clear any pending pause timer
      if (this.pauseTimer) {
        clearTimeout(this.pauseTimer);
        this.pauseTimer = null;
      }
    } else {
      // Silence detected
      const currentState = this.stateManager.getState().currentState;
      if (currentState === 'speaking' && this.speechStartTime) {
        const speechDuration = now - this.speechStartTime;
        
        // Only trigger pause detection if we've been speaking long enough
        if (speechDuration > this.MIN_SPEECH_DURATION) {
          this.stateManager.updateCurrentState('paused');
          
          // Set timer to send audio after pause duration
          this.pauseTimer = setTimeout(() => {
            this.sendCurrentAudio();
          }, this.PAUSE_DURATION);
        }
      } else if (currentState === 'listening') {
        this.stateManager.updateCurrentState('listening');
      } else if (currentState === 'paused') {
        this.stateManager.updateCurrentState('paused');
      }
    }
  }

  async sendCurrentAudio() {
    if (this.audioChunks.length === 0) {
      console.log('No audio to send');
      return;
    }
    
    const now = Date.now();
    const totalDuration = this.speechStartTime ? now - this.speechStartTime : 0;
    
    // Don't send very short audio clips
    if (totalDuration < this.MIN_AUDIO_DURATION) {
      console.log('Audio too short, continuing to record');
      this.resetSpeechDetection();
      return;
    }
    
    this.stateManager.updateCurrentState('processing');
    
    try {
      // Extract audio data from chunks (removing volume info)
      const audioOnlyChunks = this.audioChunks.map(chunk => chunk.audioData);
      
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
      
      // Call the transcription callback
      this.onTranscription(data.transcription);
      
    } catch (err) {
      console.error('Upload error:', err);
      this.onTranscription('Error: Could not process audio');
    }
    
    // Reset for next speech segment
    this.resetSpeechDetection();
    
    // Continue listening if still recording
    const isRecording = this.stateManager.getState().isRecording;
    if (isRecording) {
      this.stateManager.updateCurrentState('listening');
    }
  }

  resetSpeechDetection() {
    this.audioChunks = [];
    this.speechStartTime = null;
    this.lastSpeechTime = null;
    
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
  }

  addAudioChunk(chunk) {
    this.audioChunks.push(chunk);
  }
}

export { SpeechRecognition };
