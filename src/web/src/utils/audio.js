function createWAVBlob(float32Array, sampleRate) {
  // Create buffer for header + audio data
  const buffer = new ArrayBuffer(44 + float32Array.length * 2);
  const view = new DataView(buffer);
  const headerBytes = new Uint8Array(buffer, 0, 44);

  headerBytes.set([82, 73, 70, 70], 0);
  view.setUint32(4, 36 + float32Array.length * 2, true);
  headerBytes.set([87, 65, 86, 69], 8);
  headerBytes.set([102, 109, 116, 32], 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  headerBytes.set([100, 97, 116, 97], 36);
  view.setUint32(40, float32Array.length * 2, true);

  // Direct conversion to final buffer location
  const audioData = new Int16Array(buffer, 44);
  for (let i = 0; i < float32Array.length; i++) {
    const sample = float32Array[i];
    audioData[i] = sample < 0
      ? Math.max(sample, -1) * 0x8000
      : Math.min(sample, 1) * 0x7FFF;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// Helper: merge Float32Array chunks into one
function mergeBuffers(chunks) {
  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
  }

  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

export { createWAVBlob, mergeBuffers }
