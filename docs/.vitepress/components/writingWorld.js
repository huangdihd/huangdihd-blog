import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

export function createWritingWorld(host, onNotebook, editor) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#292c29')
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  host.appendChild(renderer.domElement)
  const overlay = new CSS3DRenderer()
  Object.assign(overlay.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' })
  host.appendChild(overlay.domElement)
  const overlayScene = new THREE.Scene()
  const paperEditor = new CSS3DObject(editor)
  paperEditor.rotation.x = -Math.PI / 2
  paperEditor.position.set(-0.25, 1.315, 0.25)
  paperEditor.scale.setScalar(2.43 / 1024)
  overlayScene.add(paperEditor)
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 50)
  const resources = []
  function box(x, y, z, w, h, d, color) {
    const geometry = new THREE.BoxGeometry(w, h, d)
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
    resources.push(geometry, material)
    const object = new THREE.Mesh(geometry, material)
    object.position.set(x, y, z)
    scene.add(object)
    return object
  }
  function cylinder(x, y, z, radius, height, color) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 24)
    const material = new THREE.MeshStandardMaterial({ color })
    resources.push(geometry, material)
    const object = new THREE.Mesh(geometry, material)
    object.position.set(x, y, z)
    scene.add(object)
    return object
  }
  scene.add(new THREE.HemisphereLight('#d9d8cd', '#574536', 1.7))
  const light = new THREE.PointLight('#ffe0a3', 55, 10)
  light.position.set(-1.6, 3.3, -0.5)
  scene.add(light)
  box(0, -0.1, 0, 18, 0.2, 18, '#51473c')
  box(0, 3.4, -3, 15, 7, 0.2, '#424940')
  box(0, 1.1, 0, 6.5, 0.18, 3.5, '#94744f')
  for (const x of [-2.8, 2.8]) for (const z of [-1.2, 1.2]) box(x, 0.5, z, 0.15, 1, 0.15, '#58452f')
  for (let x = -3; x < 3; x += 0.7) box(x, 1.195, 0, 0.008, 0.008, 3.5, '#785c3e')
  cylinder(-2, 1.25, -0.7, 0.4, 0.09, '#374b43')
  cylinder(-2, 2.1, -0.7, 0.045, 1.7, '#708277')
  const shadeGeometry = new THREE.ConeGeometry(0.55, 0.5, 32, 1, true)
  const shadeMaterial = new THREE.MeshStandardMaterial({ color: '#607064', side: THREE.DoubleSide })
  resources.push(shadeGeometry, shadeMaterial)
  const shade = new THREE.Mesh(shadeGeometry, shadeMaterial)
  shade.position.set(-2, 2.9, -0.7)
  scene.add(shade)
  cylinder(2.25, 1.43, -0.7, 0.23, 0.45, '#c1b493')
  for (let i = 0; i < 4; i++) {
    const pen = cylinder(2.18 + i * 0.06, 1.8, -0.7, 0.018, 0.65, '#434d44')
    pen.rotation.z = (i - 1.5) * 0.1
  }
  box(1.9, 1.28, 0.45, 1, 0.13, 1.35, '#586457')
  box(1.9, 1.29, 0.47, 0.95, 0.07, 1.27, '#cfbea0')
  box(1.9, 1.355, 0.45, 1, 0.025, 1.35, '#586457')
  box(-0.25, 1.24, 0.25, 2.55, 0.07, 1.8, '#654b36')
  const paper = box(-0.25, 1.285, 0.25, 2.45, 0.035, 1.7, '#eee2c6')
  box(-0.25, 1.31, 0.25, 0.035, 0.015, 1.7, '#bca98b')
  const pencil = cylinder(-1.8, 1.24, 0.4, 0.027, 1.1, '#bd9355')
  pencil.rotation.x = Math.PI / 2
  pencil.rotation.z = -0.2
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 720
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const pageMaterial = new THREE.MeshBasicMaterial({ map: texture })
  const pageGeometry = new THREE.PlaneGeometry(2.43, 1.68)
  resources.push(texture, pageMaterial, pageGeometry)
  const page = new THREE.Mesh(pageGeometry, pageMaterial)
  page.rotation.x = -Math.PI / 2
  page.position.set(-0.25, 1.31, 0.25)
  scene.add(page)
  function write(text) {
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#eee2c6'
    ctx.fillRect(0, 0, 1024, 720)
    ctx.strokeStyle = '#d3c6aa'
    for (let y = 150; y < 680; y += 62) {
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(475, y); ctx.moveTo(545, y); ctx.lineTo(985, y); ctx.stroke()
    }
    ctx.fillStyle = '#a48d6d'; ctx.fillRect(506, 0, 12, 720)
    ctx.fillStyle = '#4a473d'; ctx.font = '28px "Songti SC", serif'
    let x = 48; let y = 136; let right = false
    for (const char of text) {
      if (char === '\n' || x + ctx.measureText(char).width > (right ? 970 : 465)) {
        x = right ? 553 : 48; y += 62
        if (y > 640 && !right) { right = true; x = 553; y = 136 }
        if (y > 640) break
        if (char === '\n') continue
      }
      ctx.fillText(char, x, y)
      x += ctx.measureText(char).width
    }
    texture.needsUpdate = true
  }
  write('')
  let close = false
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  camera.position.set(0.4, 4.8, 6)
  const target = new THREE.Vector3()
  const ray = new THREE.Raycaster()
  function click(event) {
    const rect = renderer.domElement.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera)
    if (ray.intersectObjects([paper, page]).length) onNotebook()
  }
  renderer.domElement.addEventListener('click', click)
  const observer = new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight)
    overlay.setSize(host.clientWidth, host.clientHeight)
    camera.aspect = host.clientWidth / host.clientHeight
    camera.updateProjectionMatrix()
  })
  observer.observe(host)
  let frame
  function draw() {
    frame = requestAnimationFrame(draw)
    const narrow = camera.aspect < 0.8
    target.set(-0.25, close ? 5.5 : 4.8, close ? (narrow ? 6.5 : 2.5) : (narrow ? 9 : 6))
    camera.position.lerp(target, reduced.matches ? 1 : 0.07)
    camera.lookAt(-0.25, 1.1, 0.4)
    renderer.render(scene, camera)
    overlay.render(overlayScene, camera)
  }
  draw()
  return {
    write,
    approach(value) { close = value },
    dispose() { cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('click', click); resources.forEach(r => r.dispose()); renderer.dispose(); renderer.domElement.remove(); overlay.domElement.remove() }
  }
}
