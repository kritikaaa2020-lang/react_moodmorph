import * as faceapi from 'face-api.js'

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'

export const emotionNames = ['happy', 'surprised', 'sad', 'angry', 'neutral']

export async function loadModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
  ])
}

export async function inferEmotion(source) {
  if (!source || !source.videoWidth && !source.naturalWidth) return null
  const result = await faceapi
    .detectSingleFace(source, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }))
    .withFaceLandmarks(true)
    .withFaceExpressions()

  if (!result) return null
  const scores = result.expressions
  const candidates = emotionNames.map(name => [name, scores[name] || 0]).sort((a, b) => b[1] - a[1])
  return {
    emotion: candidates[0][0],
    confidence: candidates[0][1],
    scores,
    box: result.detection.box,
    landmarks: result.landmarks.positions.map(p => ({ x: p.x, y: p.y }))
  }
}

export function smoothEmotion(history, result, alpha = 0.35) {
  if (!result) return history
  const next = { ...(history || {}) }
  emotionNames.forEach(name => {
    const previous = next[name] ?? result.scores[name] ?? 0
    next[name] = previous * (1 - alpha) + (result.scores[name] || 0) * alpha
  })
  return next
}

export function dominantEmotion(smoothed) {
  if (!smoothed) return { emotion: 'neutral', confidence: 0 }
  const sorted = emotionNames.map(name => [name, smoothed[name] || 0]).sort((a, b) => b[1] - a[1])
  return { emotion: sorted[0][0], confidence: sorted[0][1] }
}

export function createMetrics(samples) {
  const labels = emotionNames
  const matrix = Object.fromEntries(labels.map(a => [a, Object.fromEntries(labels.map(b => [b, 0]))]))
  samples.forEach(s => {
    if (matrix[s.actual] && matrix[s.actual][s.predicted] !== undefined) matrix[s.actual][s.predicted] += 1
  })
  const total = samples.length
  const correct = samples.filter(s => s.actual === s.predicted).length
  const perClass = labels.map(label => {
    const tp = matrix[label][label]
    const fp = labels.reduce((sum, actual) => sum + (actual === label ? 0 : matrix[actual][label]), 0)
    const fn = labels.reduce((sum, predicted) => sum + (predicted === label ? 0 : matrix[label][predicted]), 0)
    const precision = tp + fp ? tp / (tp + fp) : 0
    const recall = tp + fn ? tp / (tp + fn) : 0
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
    return { label, precision, recall, f1 }
  })
  const macroF1 = perClass.reduce((sum, row) => sum + row.f1, 0) / perClass.length
  return { accuracy: total ? correct / total : 0, macroF1, matrix, perClass, total }
}
