// Enhanced audio-worklet-processor.js
class PCMRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  // Calculate RMS (Root Mean Square) for volume detection
  calculateRMS(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0]; // Get first channel
      
      // Calculate volume level for this chunk
      const rms = this.calculateRMS(inputChannel);
      
      // Buffer the audio data
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;
        
        // When buffer is full, send it along with volume info
        if (this.bufferIndex >= this.bufferSize) {
          // Send both audio data and volume level
          this.port.postMessage({
            audioData: new Float32Array(this.buffer),
            volumeLevel: rms,
            timestamp: currentTime
          });
          
          // Reset buffer
          this.bufferIndex = 0;
          this.buffer.fill(0);
        }
      }
    }
    
    return true;
  }
}

registerProcessor('pcm-recorder-processor', PCMRecorderProcessor);
