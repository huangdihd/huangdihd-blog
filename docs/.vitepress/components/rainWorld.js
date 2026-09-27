import * as THREE from 'three'

export function createRainWorld(host) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#17212b')
  scene.fog = new THREE.Fog('#17212b', 16, 48)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  host.appendChild(renderer.domElement)
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80)
  const resources = []
  function mesh(geometry, color, x, y, z, parent = scene) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.65 })
    const object = new THREE.Mesh(geometry, material)
    object.position.set(x, y, z)
    parent.add(object)
    resources.push(geometry, material)
    return object
  }
  function box(x, y, z, w, h, d, color, parent) {
    return mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent)
  }
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `varying vec3 direction; void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 direction;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      void main() {
        vec3 d=normalize(direction); vec2 p=d.xz / (abs(d.y)+0.35)*2.5;
        float n=0.55*noise(p)+0.28*noise(p*2.1)+0.17*noise(p*4.3);
        vec3 color=mix(vec3(0.055,0.075,0.105),vec3(0.24,0.29,0.34),smoothstep(0.2,0.8,n));
        gl_FragColor=vec4(color,1.0);
      }`
  })
  const skyGeometry = new THREE.SphereGeometry(60, 32, 16)
  resources.push(skyMaterial, skyGeometry)
  scene.add(new THREE.Mesh(skyGeometry, skyMaterial))
  scene.add(new THREE.HemisphereLight('#9fbed8', '#26201d', 1.3))
  const lamp = new THREE.PointLight('#ffd39a', 32, 13)
  lamp.position.set(-2, 3, 5)
  scene.add(lamp)
  const moon = new THREE.DirectionalLight('#b7d1e8', 1.3)
  moon.position.set(0, 12, -10)
  scene.add(moon)
  box(0, -0.2, 5, 11, 0.3, 10, '#594f43')
  for (let x = -5; x <= 5; x += 0.55) box(x, -0.04, 5, 0.015, 0.015, 10, '#302c29')
  // A physical opening in the room wall, not an image placed over the view.
  box(-4.5, 2.5, 0, 3, 5, 0.3, '#4d5555')
  box(4.5, 2.5, 0, 3, 5, 0.3, '#4d5555')
  box(0, 0.5, 0, 6, 1, 0.3, '#4d5555')
  box(0, 7, 0, 20, 5.4, 0.3, '#4d5555')
  for (const x of [-3, 0, 3]) box(x, 2.75, 0.1, 0.12, 3.5, 0.22, '#8a8270')
  box(0, 1, 0.25, 6.3, 0.16, 0.85, '#a59b83')
  box(0, 4.45, 0.1, 6.3, 0.15, 0.25, '#8a8270')
  box(-2.3, 0.85, 3, 2.8, 0.16, 1.3, '#806548')
  for (const x of [-3.4, -1.2]) box(x, 0.4, 3, 0.1, 0.8, 1, '#4c4235')
  // Open laptop.
  box(-2.5, 0.97, 3, 0.95, 0.05, 0.62, '#82878a')
  const screen = box(-2.5, 1.32, 2.71, 0.95, 0.65, 0.05, '#252a2c')
  screen.rotation.x = -0.15
  box(-2.5, 1.33, 2.748, 0.84, 0.51, 0.015, '#71848b')
  // Board-mounted cooling fan, based on the user's reference photograph.
  const board = new THREE.Group()
  board.position.set(-1.35, 0.97, 3.1)
  scene.add(board)
  box(0, 0, 0, 0.7, 0.035, 1, '#32684e', board)
  box(0, 0.07, 0, 0.58, 0.1, 0.82, '#202729', board)
  for (let x = -0.26; x <= 0.27; x += 0.065) box(x, 0.16, 0, 0.024, 0.22, 0.78, '#252c2e', board)
  for (const x of [-0.22, 0, 0.22]) box(x, 0.12, -0.43, 0.18, 0.22, 0.2, '#a5aba5', board)
  const fan = new THREE.Group()
  fan.position.set(0, 0.29, 0.12)
  fan.rotation.x = -Math.PI / 2
  board.add(fan)
  mesh(new THREE.TorusGeometry(0.23, 0.035, 10, 40), '#161c20', 0, 0, 0, fan)
  const blades = new THREE.Group()
  fan.add(blades)
  for (let i = 0; i < 9; i++) {
    const blade = box(Math.sin(i * Math.PI * 2 / 9) * 0.13, Math.cos(i * Math.PI * 2 / 9) * 0.13, 0, 0.09, 0.2, 0.025, '#343a3c', blades)
    blade.rotation.z = -i * Math.PI * 2 / 9 + 0.4
  }
  const hub = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 24), '#303639', 0, 0, 0.025, fan)
  hub.rotation.x = Math.PI / 2
  for (const [x, color] of [[-0.3, '#2760a0'], [0.3, '#ad392e']]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.05, -0.3), new THREE.Vector3(x, 0.38, 0.15), new THREE.Vector3(x * 1.3, 0.02, 0.6)])
    mesh(new THREE.TubeGeometry(curve, 20, 0.012, 6, false), color, 0, 0, 0, board)
  }
  const led = box(0.28, 0.05, 0.44, 0.04, 0.035, 0.035, '#ff3926', board)
  led.material.emissive.set('#ff1808')
  const headphones = mesh(new THREE.TorusGeometry(0.22, 0.045, 10, 28, Math.PI), '#242b30', -3.15, 1.02, 3.28)
  headphones.rotation.x = -Math.PI / 2
  for (const x of [-3.37, -2.93]) box(x, 1.02, 3.28, 0.12, 0.13, 0.21, '#303c43')
  // Wet street and buildings beyond the window.
  box(0, -0.3, -13, 55, 0.3, 26, '#263943')
  for (let x = -16; x <= 16; x += 5) {
    const h = 4 + Math.abs(Math.sin(x)) * 3
    box(x, h / 2, -17, 4.6, h, 4, '#33444e')
    for (let y = 1.8; y < h; y += 2) for (let dx = -1.3; dx <= 1.3; dx += 1.3) {
      box(x + dx, y, -14.97, 0.65, 0.9, 0.02, Math.sin(x + y + dx) > 0.3 ? '#ad9c72' : '#1c2e39')
    }
  }
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 12), '#51636c', 3.8, 2.4, -6)
  box(3.8, 5, -6, 0.65, 0.15, 0.65, '#d6bb89')
  const streetLight = new THREE.PointLight('#e5bf82', 35, 12)
  streetLight.position.set(3.8, 4.8, -6)
  scene.add(streetLight)
  const ripples = []
  for (let i = 0; i < 18; i++) {
    const ring = mesh(new THREE.RingGeometry(0.25, 0.27, 32), '#65828f', (i % 6 - 2.5) * 2, -0.13, -2 - Math.floor(i / 6) * 3)
    ring.rotation.x = -Math.PI / 2
    ring.material.transparent = true
    ripples.push(ring)
  }
  const count = 1500
  const points = new Float32Array(count * 6)
  for (let i = 0; i < count; i++) {
    const o = i * 6
    points[o] = Math.random() * 30 - 15
    points[o + 1] = Math.random() * 15
    points[o + 2] = -Math.random() * 18 - 0.7
    points[o + 3] = points[o] - 0.06
    points[o + 4] = points[o + 1] + 0.35
    points[o + 5] = points[o + 2]
  }
  const rainGeometry = new THREE.BufferGeometry()
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
  const rainMaterial = new THREE.LineBasicMaterial({ color: '#afccd9', transparent: true, opacity: 0.4 })
  resources.push(rainGeometry, rainMaterial)
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial)
  scene.add(rain)
  const drip = mesh(new THREE.SphereGeometry(0.035, 10, 8), '#b8d5e1', 1.2, 1, 0.55)
  drip.scale.y = 1.8
  let mode = 'inside'
  let paused = false
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const target = new THREE.Vector3()
  const look = new THREE.Vector3()
  camera.position.set(0.8, 2.6, 8)
  const observer = new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight)
    camera.aspect = host.clientWidth / host.clientHeight
    camera.updateProjectionMatrix()
  })
  observer.observe(host)
  let frame
  let last = performance.now()
  let time = 0
  function draw(now) {
    frame = requestAnimationFrame(draw)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    const still = paused || reduced.matches
    if (!still) time += dt
    const outside = mode === 'outside'
    const after = mode === 'after'
    const narrow = camera.aspect < 0.8
    target.set(outside ? 0 : -0.6, outside ? 1.8 : 2.6, outside ? -3 : (narrow ? 12 : 8))
    camera.position.lerp(target, still ? 1 : 1 - Math.exp(-dt * 4))
    look.set(outside ? 2 : -0.3, outside ? 8 : 1.9, outside ? -18 : 0)
    camera.lookAt(look)
    rain.visible = !after
    drip.visible = after
    if (!still) {
      blades.rotation.z += dt * 20
      for (let i = 0; i < count; i++) {
        const o = i * 6
        points[o + 1] -= dt * 11
        if (points[o + 1] < 0) points[o + 1] = 15
        points[o + 4] = points[o + 1] + 0.35
      }
      rainGeometry.attributes.position.needsUpdate = true
      drip.position.y = 1 - (time % 1.7) * 0.65
    }
    ripples.forEach((ring, i) => {
      ring.visible = !after
      const age = (time * 0.7 + i / 18) % 1
      ring.scale.setScalar(0.2 + age * 3)
      ring.material.opacity = (1 - age) * 0.4
    })
    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(draw)
  return {
    setMode(value) { mode = value },
    pause(value) { paused = value },
    dispose() { cancelAnimationFrame(frame); observer.disconnect(); resources.forEach(resource => resource.dispose()); renderer.dispose(); renderer.domElement.remove() }
  }
}

// Field recordings served locally; attribution is in /audio/CREDITS.md.
export function createRainAudio() {
  const context = new AudioContext()
  const master = context.createGain()
  master.gain.value = 0.8
  master.connect(context.destination)
  const controller = new AbortController()
  const tracks = []
  let mode = 'inside'
  let closed = false
  function applyMode() {
    tracks.forEach(({ gain, after }) => {
      const audible = after === (mode === 'after')
      const volume = mode === 'inside' ? 0.7 : 1
      gain.gain.setTargetAtTime(audible ? volume : 0, context.currentTime, 0.2)
    })
  }
  return {
    setMode(value) { mode = value; applyMode() },
    async resume() {
      await context.resume()
      await Promise.all(['rain', 'drips'].map(async (name, i) => {
        const response = await fetch(`/audio/${name}.ogg`, { signal: controller.signal })
        if (!response.ok) throw new Error('Audio unavailable')
        const buffer = await context.decodeAudioData(await response.arrayBuffer())
        if (closed) return
        const source = context.createBufferSource()
        source.buffer = buffer
        source.loop = true
        const gain = context.createGain()
        gain.gain.value = 0
        source.connect(gain).connect(master)
        tracks.push({ source, gain, after: i === 1 })
        source.start()
        applyMode()
      }))
    },
    dispose() {
      if (closed) return
      closed = true
      controller.abort()
      tracks.forEach(({ source }) => source.stop())
      return context.close()
    }
  }
}
