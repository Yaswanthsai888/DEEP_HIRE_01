import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

let model: blazeface.BlazeFaceModel | null = null;

export const initializeModel = async (): Promise<blazeface.BlazeFaceModel> => {
  if (!model) {
    // Make sure TensorFlow.js is ready
    await tf.ready();
    
    console.log('Loading BlazeFace model...');
    model = await blazeface.load();
    console.log('BlazeFace model loaded successfully');
  }
  return model;
};

export const cleanupModel = () => {
  if (model) {
    // No explicit cleanup needed for BlazeFace model
    model = null;
  }
};