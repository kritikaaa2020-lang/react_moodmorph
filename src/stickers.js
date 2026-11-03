export const stickerLibrary = {
  ANGEL: [
    { id: 'halo', label: 'HALO', icon: '◌', color: '#fff5b8' },
    { id: 'wings', label: 'WINGS', icon: 'ʚɞ', color: '#dff4ff' },
    { id: 'angel', label: 'ANGEL', icon: '♡', color: '#ffffff' },
    { id: 'cloud', label: 'CLOUD', icon: '☁', color: '#e6f2ff' }
  ],
  RAGE: [
    { id: 'rage', label: 'RAGE', icon: '💢', color: '#ff4d4d' },
    { id: 'flame', label: 'FLAME', icon: '🔥', color: '#ff6338' },
    { id: 'danger', label: 'DANGER', icon: '⚠', color: '#ffe552' },
    { id: 'bolt', label: 'BOLT', icon: '⚡', color: '#fff27a' }
  ],
  CUTIE: [
    { id: 'heart', label: 'HEART', icon: '♥', color: '#ff79c6' },
    { id: 'flower', label: 'FLOWER', icon: '✿', color: '#ff9bd9' },
    { id: 'star', label: 'STAR', icon: '★', color: '#ffe68b' },
    { id: 'kiss', label: 'KISS', icon: '💋', color: '#ff4c8f' }
  ],
  GLITCH: [
    { id: 'cursor', label: 'CURSOR', icon: '➤', color: '#ffffff' },
    { id: 'pixel', label: 'PIXEL', icon: '▦', color: '#5fe7ff' },
    { id: 'chrome', label: 'CHROME', icon: '✦', color: '#d5d8ff' },
    { id: 'error', label: 'ERROR', icon: '×', color: '#ff4a6b' }
  ],
  RANDOM: [
    { id: 'cherry', label: 'CHERRY', icon: '🍒', color: '#9c1531' },
    { id: 'gift', label: 'GIFT', icon: '🎁', color: '#ff7fa8' },
    { id: 'moon', label: 'MOON', icon: '☾', color: '#d8d7ff' },
    { id: 'spark', label: 'SPARK', icon: '✧', color: '#ffffff' }
  ]
}

export function makeSticker(base, index = 0) {
  return {
    key: `${base.id}-${Date.now()}-${index}`,
    ...base,
    x: 16 + (index % 4) * 13,
    y: 18 + (index % 5) * 11,
    size: 54,
    rotation: -12 + (index % 6) * 7
  }
}
