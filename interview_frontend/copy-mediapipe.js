import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directories if they don't exist
const targetDir = path.resolve(__dirname, 'public/face_detection');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Source directory
const sourceDir = path.resolve(__dirname, 'node_modules/@mediapipe/face_detection');

// Check if source directory exists
if (!fs.existsSync(sourceDir)) {
  console.error('MediaPipe face detection directory not found!');
  console.error('Make sure @mediapipe/face_detection is installed.');
  process.exit(1);
}

// Copy files
console.log('Copying MediaPipe files...');
fs.readdirSync(sourceDir).forEach(file => {
  // Only copy .js, .wasm, and other necessary files
  if (file.endsWith('.js') || file.endsWith('.wasm') || file.endsWith('.bin') || !file.includes('.')) {
    const sourcePath = path.join(sourceDir, file);
    
    // Skip directories
    if (fs.lstatSync(sourcePath).isDirectory()) return;
    
    fs.copyFileSync(sourcePath, path.join(targetDir, file));
    console.log(`Copied: ${file}`);
  }
});

console.log('MediaPipe files copied successfully to public/face_detection/');