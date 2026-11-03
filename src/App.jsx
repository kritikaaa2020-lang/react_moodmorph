import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadModels, inferEmotion, smoothEmotion, dominantEmotion, createMetrics, emotionNames } from './ml.js'
import { stickerLibrary, makeSticker } from './stickers.js'
import { renderPhoto, buildLayout, downloadImage } from './canvas.js'

const moodCopy = {
  happy: ['CUTIE OVERLOAD', 'sparkle mode is emotionally necessary'],
  surprised: ['SYSTEM SHOCK', 'electric angel detected'],
  sad: ['DREAMY RAIN', 'soft pixels, softer feelings'],
  angry: ['RAGE MODE', 'chrome heat warning'],
  neutral: ['DIGITAL DOLL', 'silver camera preset online']
}

function App() {
  const videoRef = useRef(null)
  const imageRef = useRef(null)
  const streamRef = useRef(null)
  const dragRef = useRef(null)
  const [sourceType, setSourceType] = useState('camera')
  const [uploadUrl, setUploadUrl] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [modelState, setModelState] = useState('loading')
  const [autoMode, setAutoMode] = useState(true)
  const [manualEmotion, setManualEmotion] = useState('neutral')
  const [predicted, setPredicted] = useState('neutral')
  const [confidence, setConfidence] = useState(0)
  const [smoothedScores, setSmoothedScores] = useState(null)
  const [inference, setInference] = useState(null)
  const [intensity, setIntensity] = useState(0.72)
  const [flash, setFlash] = useState(true)
  const [layout, setLayout] = useState('single')
  const [captures, setCaptures] = useState([])
  const [stickers, setStickers] = useState([])
  const [category, setCategory] = useState('CUTIE')
  const [caption, setCaption] = useState('found on my desktop ♡')
  const [popup, setPopup] = useState('MODEL BOOTING...')
  const [hearts, setHearts] = useState([])
  const [flashNow, setFlashNow] = useState(false)
  const [evalLabel, setEvalLabel] = useState('happy')
  const [evalSamples, setEvalSamples] = useState([])

  const activeEmotion = autoMode ? predicted : manualEmotion
  const activeCopy = moodCopy[activeEmotion]
  const metrics = useMemo(() => createMetrics(evalSamples), [evalSamples])

  useEffect(() => {
    loadModels().then(() => {
      setModelState('ready')
      setPopup('EMOTION MODEL READY')
    }).catch(() => {
      setModelState('error')
      setPopup('MODEL LOAD FAILED')
    })
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (!cameraOn || modelState !== 'ready' || sourceType !== 'camera') return
    const id = setInterval(runInference, 550)
    return () => clearInterval(id)
  }, [cameraOn, modelState, sourceType, smoothedScores])

  useEffect(() => {
    if (sourceType !== 'upload' || modelState !== 'ready' || !uploadUrl) return
    const timer = setTimeout(runInference, 200)
    return () => clearTimeout(timer)
  }, [sourceType, modelState, uploadUrl])

  useEffect(() => {
    setPopup(`${activeEmotion.toUpperCase()} FILTER ACTIVE`)
    const t = setTimeout(() => setPopup(''), 1400)
    return () => clearTimeout(t)
  }, [activeEmotion])

  async function startCamera() {
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setSourceType('camera')
      setCameraOn(true)
      setPopup('CAMERA ONLINE')
    } catch {
      setPopup('CAMERA PERMISSION DENIED')
    }
  }

  function stopCamera() {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  function uploadImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setUploadUrl(url)
    setSourceType('upload')
    setCameraOn(false)
    stopCamera()
    setPopup('IMAGE LOADED')
  }

  async function runInference() {
    const source = sourceType === 'camera' ? videoRef.current : imageRef.current
    if (!source) return
    const result = await inferEmotion(source)
    if (!result) return
    const next = smoothEmotion(smoothedScores, result)
    const dom = dominantEmotion(next)
    setSmoothedScores(next)
    setInference(result)
    setPredicted(dom.emotion)
    setConfidence(dom.confidence)
  }

  function addSticker(base, index) {
    setStickers(prev => [...prev, makeSticker(base, prev.length + index)])
  }

  function removeSticker(key) {
    setStickers(prev => prev.filter(s => s.key !== key))
  }

  function beginDrag(event, key) {
    const card = event.currentTarget.closest('.camera-canvas')
    const rect = card.getBoundingClientRect()
    dragRef.current = { key, rect }
    window.addEventListener('pointermove', dragMove)
    window.addEventListener('pointerup', endDrag, { once: true })
  }

  function dragMove(event) {
    const drag = dragRef.current
    if (!drag) return
    const x = Math.min(96, Math.max(4, (event.clientX - drag.rect.left) / drag.rect.width * 100))
    const y = Math.min(96, Math.max(4, (event.clientY - drag.rect.top) / drag.rect.height * 100))
    setStickers(prev => prev.map(s => s.key === drag.key ? { ...s, x, y } : s))
  }

  function endDrag() {
    dragRef.current = null
    window.removeEventListener('pointermove', dragMove)
  }

  function editSticker(key, field, delta) {
    setStickers(prev => prev.map(s => s.key === key ? { ...s, [field]: s[field] + delta } : s))
  }

  function capturePhoto() {
    const source = sourceType === 'camera' ? videoRef.current : imageRef.current
    if (!source) return
    setFlashNow(true)
    setTimeout(() => setFlashNow(false), 130)
    const data = renderPhoto({ source, emotion: activeEmotion, intensity, stickers, caption, flash, inference })
    setCaptures(prev => [...prev, data].slice(-8))
    const burst = Array.from({ length: 9 }, (_, i) => ({ id: Date.now() + i, x: 40 + Math.random() * 20, y: 40 + Math.random() * 20 }))
    setHearts(burst)
    setTimeout(() => setHearts([]), 900)
    setPopup('PHOTO READY ♥')
  }

  async function download() {
    if (!captures.length) {
      setPopup('TAKE A PHOTO FIRST')
      return
    }
    const data = await buildLayout(captures, layout)
    downloadImage(data, `moodmorph-${layout}-${Date.now()}.png`)
    setPopup('SAVED TO YOUR COMPUTER')
  }

  function recordEvaluation() {
    if (!predicted || confidence === 0) return
    setEvalSamples(prev => [...prev, { actual: evalLabel, predicted, confidence, time: new Date().toLocaleTimeString() }])
    setPopup('EVALUATION SAMPLE RECORDED')
  }

  return (
    <div className={`app mood-${activeEmotion}`}>
      <div className="desktop-noise" />
      <header className="top-ribbon">
        <div>MOODMORPH OS 2003</div>
        <div className="top-dots">● ● ●</div>
      </header>

      <main className="desktop">
        <section className="window main-window">
          <div className="titlebar">
            <div className="title-icon">♥</div>
            <div className="title-text">MoodMorph.exe — emotion camera <span>UNREGISTERED ANGEL SOFTWARE</span></div>
            <div className="window-buttons"><button>_</button><button>□</button><button>×</button></div>
          </div>
          <div className="menu-bar">
            <button>FILE</button><button>CAMERA</button><button>FILTERS</button><button>STICKERS</button><button>EMOTIONS</button><button>HELP</button>
          </div>

          <div className="workspace">
            <aside className="tool-column left-tools">
              <button className="tool active">↖</button><button className="tool">▧</button><button className="tool">✎</button><button className="tool">⌁</button><button className="tool">◯</button><button className="tool">A</button><button className="tool">◇</button><button className="tool">☼</button>
              <div className="mini-meter"><div style={{ height: `${intensity * 100}%` }} /></div>
            </aside>

            <section className="camera-zone">
              <div className="camera-header">
                <div className="rec"><i /> REC</div>
                <div className="digital">FILM {String(captures.length).padStart(2, '0')} / 99</div>
                <div className="digital">{modelState === 'ready' ? `${predicted.toUpperCase()} ${(confidence * 100).toFixed(0)}%` : modelState.toUpperCase()}</div>
              </div>

              <div className={`camera-canvas filter-${activeEmotion}`}>
                {!cameraOn && sourceType === 'camera' && <div className="camera-empty"><div className="giant-heart">♡</div><h2>emotion camera sleeping</h2><p>press START CAMERA or upload a photo</p></div>}
                <video ref={videoRef} className={sourceType === 'camera' && cameraOn ? 'source visible' : 'source'} playsInline muted />
                {uploadUrl && <img ref={imageRef} src={uploadUrl} className={sourceType === 'upload' ? 'source visible' : 'source'} onLoad={runInference} />}
                <div className="filter-glaze" />
                <div className="vignette" />
                <div className="grain" />
                <div className="scan-lines" />
                <div className="mood-overlays">
                  {activeEmotion === 'happy' && <><span className="float f1">♥</span><span className="float f2">✦</span><span className="float f3">✿</span></>}
                  {activeEmotion === 'surprised' && <><span className="float f1">⚡</span><span className="float f2">✶</span><span className="float f3">✦</span></>}
                  {activeEmotion === 'sad' && <><span className="float f1">☂</span><span className="float f2">•</span><span className="float f3">•</span></>}
                  {activeEmotion === 'angry' && <><span className="float f1">✹</span><span className="float f2">×</span><span className="float f3">⚠</span></>}
                  {activeEmotion === 'neutral' && <><span className="float f1">✧</span><span className="float f2">◇</span><span className="float f3">✦</span></>}
                </div>
                {stickers.map(sticker => (
                  <div key={sticker.key} className="placed-sticker" onPointerDown={e => beginDrag(e, sticker.key)} style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, fontSize: sticker.size, transform: `translate(-50%,-50%) rotate(${sticker.rotation}deg)`, color: sticker.color }}>
                    {sticker.icon}
                    <div className="sticker-mini-controls">
                      <button onPointerDown={e => e.stopPropagation()} onClick={() => editSticker(sticker.key, 'size', 8)}>+</button>
                      <button onPointerDown={e => e.stopPropagation()} onClick={() => editSticker(sticker.key, 'size', -8)}>−</button>
                      <button onPointerDown={e => e.stopPropagation()} onClick={() => editSticker(sticker.key, 'rotation', 12)}>↻</button>
                      <button onPointerDown={e => e.stopPropagation()} onClick={() => removeSticker(sticker.key)}>×</button>
                    </div>
                  </div>
                ))}
                {caption && <div className="caption-note">{caption}</div>}
                {flashNow && <div className="flash-layer" />}
                {hearts.map(h => <span className="heart-pop" key={h.id} style={{ left: `${h.x}%`, top: `${h.y}%` }}>♥</span>)}
                <div className="corner-stamp">{activeCopy[0]}<small>{activeCopy[1]}</small></div>
              </div>

              <div className="camera-actions">
                <button className="primary-btn" onClick={startCamera}>START CAMERA</button>
                <label className="file-btn">UPLOAD PHOTO<input type="file" accept="image/*" onChange={uploadImage} /></label>
                <button className="capture-btn" onClick={capturePhoto}>● SNAP</button>
                <button className="download-btn" onClick={download}>DOWNLOAD PNG</button>
              </div>
            </section>

            <aside className="control-panel">
              <div className="panel-section">
                <h3>AUTO EMOTION</h3>
                <label className="switch-row"><input type="checkbox" checked={autoMode} onChange={e => setAutoMode(e.target.checked)} /><span>{autoMode ? 'ON' : 'OFF'}</span></label>
                <div className="prediction-card">
                  <strong>{predicted.toUpperCase()}</strong>
                  <span>{(confidence * 100).toFixed(1)}% confidence</span>
                  <div className="confidence-bar"><i style={{ width: `${confidence * 100}%` }} /></div>
                </div>
              </div>

              <div className="panel-section">
                <h3>MANUAL FILTER</h3>
                <div className="emotion-grid">
                  {emotionNames.map(emotion => <button key={emotion} className={manualEmotion === emotion ? 'selected' : ''} onClick={() => setManualEmotion(emotion)}>{emotion}</button>)}
                </div>
              </div>

              <div className="panel-section">
                <h3>FILTER INTENSITY</h3>
                <input type="range" min="0" max="1" step="0.01" value={intensity} onChange={e => setIntensity(Number(e.target.value))} />
                <label className="check"><input type="checkbox" checked={flash} onChange={e => setFlash(e.target.checked)} /> bloom flash</label>
              </div>

              <div className="panel-section">
                <h3>PHOTO LAYOUT</h3>
                <div className="layout-grid">
                  {['single','three','four'].map(item => <button key={item} className={layout === item ? 'selected' : ''} onClick={() => setLayout(item)}>{item === 'single' ? '1 CUT' : item === 'three' ? '3 CUT' : '4 CUT'}</button>)}
                </div>
              </div>

              <div className="panel-section">
                <h3>HANDWRITTEN NOTE</h3>
                <input className="caption-input" value={caption} onChange={e => setCaption(e.target.value)} maxLength={42} />
              </div>
            </aside>
          </div>

          <div className="statusbar">
            <span>CAMERA: {cameraOn ? 'ONLINE' : sourceType === 'upload' ? 'UPLOAD MODE' : 'OFFLINE'}</span>
            <span>MODEL: {modelState.toUpperCase()}</span>
            <span>EXPRESSION: {predicted.toUpperCase()}</span>
            <span>PHOTO COUNT: {captures.length}</span>
          </div>
        </section>

        <section className="lower-grid">
          <section className="window sticker-window">
            <div className="titlebar compact"><div className="title-text">sticker_drawer.sys</div><div className="window-buttons"><button>_</button><button>□</button><button>×</button></div></div>
            <div className="sticker-tabs">{Object.keys(stickerLibrary).map(name => <button className={category === name ? 'active' : ''} key={name} onClick={() => setCategory(name)}>{name}</button>)}</div>
            <div className="sticker-grid">{stickerLibrary[category].map((s, i) => <button key={s.id} onClick={() => addSticker(s, i)}><span style={{ color: s.color }}>{s.icon}</span><small>{s.label}</small></button>)}</div>
          </section>

          <section className="window captures-window">
            <div className="titlebar compact"><div className="title-text">recent_photos.bmp</div><div className="window-buttons"><button>_</button><button>□</button><button>×</button></div></div>
            <div className="capture-strip">{captures.length ? captures.slice(-4).map((img, i) => <img src={img} key={i} />) : <div className="empty-strip">NO PHOTOS YET ♡</div>}</div>
          </section>
        </section>

        <section className="window eval-window">
          <div className="titlebar"><div className="title-icon">Σ</div><div className="title-text">emotion_model_lab.exe — genuine evaluation</div><div className="window-buttons"><button>_</button><button>□</button><button>×</button></div></div>
          <div className="eval-content">
            <div className="eval-intro"><h2>MODEL EVALUATION LAB</h2><p>Pick the expression you are intentionally making, let the live model predict it, then record the sample. The metrics below are calculated from your real webcam predictions.</p></div>
            <div className="eval-controls"><select value={evalLabel} onChange={e => setEvalLabel(e.target.value)}>{emotionNames.map(e => <option key={e}>{e}</option>)}</select><button onClick={recordEvaluation}>RECORD LABELED SAMPLE</button><button onClick={() => setEvalSamples([])}>RESET</button></div>
            <div className="metrics">
              <div><strong>{metrics.total}</strong><span>samples</span></div>
              <div><strong>{(metrics.accuracy * 100).toFixed(1)}%</strong><span>accuracy</span></div>
              <div><strong>{(metrics.macroF1 * 100).toFixed(1)}%</strong><span>macro F1</span></div>
              <div><strong>{(confidence * 100).toFixed(1)}%</strong><span>live confidence</span></div>
            </div>
            <div className="matrix-wrap"><table><thead><tr><th>actual \ predicted</th>{emotionNames.map(e => <th key={e}>{e}</th>)}</tr></thead><tbody>{emotionNames.map(actual => <tr key={actual}><th>{actual}</th>{emotionNames.map(pred => <td key={pred}>{metrics.matrix[actual][pred]}</td>)}</tr>)}</tbody></table></div>
          </div>
        </section>

        <section className="concepts-card">
          <div className="warning-burst">ML INSIDE!</div>
          <div>
            <h2>Machine learning concepts used</h2>
            <p>Face detection, facial landmark detection, facial-expression classification, softmax-style class probabilities, confidence scoring, real-time inference, temporal smoothing with an exponential moving average, decision thresholding, automatic state switching, landmark-conditioned visual effects, user-labeled evaluation, confusion matrix, accuracy, precision, recall, F1 score, data preprocessing through model input resizing, and client-side inference with TensorFlow.js through face-api.js.</p>
          </div>
        </section>
      </main>

      {popup && <div className="retro-popup"><div className="popup-title">MOODMORPH NOTICE</div><div>{popup}</div></div>}
    </div>
  )
}

export default App
