// audio-worklet-processor.js
class PCMRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
  }

  process(inputs, outputs, parameters) {
    // inputs[0][0] is Float32Array for channel 0
    const inputChannelData = inputs[0][0];
    if (inputChannelData) {
      // Copy to regular array and send to main thread
      this.port.postMessage(new Float32Array(inputChannelData));
    }
    return true;
  }
}

registerProcessor('pcm-recorder-processor', PCMRecorderProcessor);
