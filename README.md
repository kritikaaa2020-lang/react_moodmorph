# MoodMorph.exe

MoodMorph is a Y2K retro emotion-reactive photobooth built with React, Vite, face-api.js, and browser canvas.

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL in Chrome or Edge and allow camera permission.

## Build

```bash
npm run build
npm run preview
```

## Machine learning concepts used

- Face detection
- Facial landmark detection
- Facial expression classification
- Class probability scores
- Confidence scoring
- Real-time inference
- Temporal smoothing using exponential moving average
- Decision thresholding
- Automatic filter switching
- Landmark-conditioned visual effects
- User-labeled evaluation
- Confusion matrix
- Accuracy
- Precision
- Recall
- F1 score
- Input resizing and preprocessing
- Client-side TensorFlow.js inference through face-api.js

## Main features

- Webcam and image upload
- Automatic emotion mode
- Manual filter mode
- Happy, surprised, sad, angry, and neutral visual states
- Movable stickers with resize and rotation controls
- Captions
- Flash, grain, scanline, bloom, and tint effects
- Single, three-cut, and four-cut layouts
- PNG export
- Evaluation lab with real webcam samples and metrics
- Retro popups, REC indicator, film counter, status bar, and fake desktop UI

## Notes

The pretrained face-api.js model files are loaded from the public face-api.js model host at runtime. The rest of the application runs locally in the browser.
