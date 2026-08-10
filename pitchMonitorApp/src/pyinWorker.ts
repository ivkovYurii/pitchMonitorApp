// Import the core API and the WASM backend directly from the ES6 dist folders
import Essentia from 'essentia.js/dist/essentia.js-core.es.js';
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';

// Initialize the Essentia DSP engine synchronously
const essentia = new Essentia(EssentiaWASM);

self.onmessage = (event) => {
  const { audioData, sampleRate } = event.data;

  // To get a 10 Hz output (100ms per frame), the hopSize must be 10% of the sample rate
  const targetHz = 120;
  const hopSize = Math.floor(sampleRate / targetHz);

  // Convert the raw JavaScript array into the C++ vector Essentia needs
  const audioVector = essentia.arrayToVector(audioData);

  // Run the Probabilistic YIN algorithm over the entire audio buffer.
  // Parameters must be passed in this exact positional order:
  // (input, frameSize, hopSize, lowRMSThreshold, outputUnvoiced, preciseTime, sampleRate)
  const pitches = essentia.PitchYinProbabilistic(
    audioVector, 
    2048,        // frameSize
    hopSize,     // hopSize
    0.001,         // lowRMSThreshold
    'zero',      // outputUnvoiced (returns 0 Hz for silence)
    false,       // preciseTime
    sampleRate   // sampleRate
  );

  // Convert Essentia's C++ vectors back to standard JavaScript arrays
  const pitchValues = essentia.vectorToArray(pitches.pitch);
  const probabilities = essentia.vectorToArray(pitches.voicedProbabilities);

  // Build the LLM-ready JSON payload
  const payload: any[] = [];
  
  for (let i = 0; i < pitchValues.length; i++) {
    const isVoiced = probabilities[i] > 0.5; // Only keep frames where a voice is detected
    
    if (isVoiced) {
      payload.push({
        timestamp: Math.round(((i * hopSize) / sampleRate) * 100) / 100, // Exact time in seconds
        hz: Math.round(pitchValues[i] * 100) / 100, // Round to 2 decimals
        probability: Math.round(probabilities[i] * 100) / 100,
      });
    }
  }

  // Free WebAssembly memory to prevent memory leaks
  audioVector.delete();
  pitches.pitch.delete();
  pitches.voicedProbabilities.delete();

  // Send the formatted payload back to the UI
  self.postMessage(payload);
};