import * as THREE from 'three'

// All geometry is original: a miniature theatrical street, not photo-real assets.
export function createBlindBoxWorld(host, onSelect) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#aab5b7')
  scene.fog = new THREE.Fog('#aab5b7', 24, 65)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor('#aab5b7')
  host.appendChild(renderer.domElement)
  renderer.domElement.setAttribute('aria-label', '可拖动的三维街道：早餐店、礼品店与路边摊')
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100)
  const materials = new Map()
  const textures = []
  const boxes = []
  const targets = []
  const positions = [-8, 0, 8]
  let selected = 0
  let targetX = positions[0]
  let currentX = targetX
  let zoom = false
  let disposed = false
  let frame
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  function material(color, roughness = 0.85) {
    const key = `${color}/${roughness}`
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness }))
    return materials.get(key)
  }
  function block(parent, x, y, z, w, h, d, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color))
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  function cylinder(parent, x, y, z, radius, height, color) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20), material(color))
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }
  function label(parent, text, x, y, z, w, h, bg = '#ebe0c6', ink = '#443d31') {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = Math.round(1024 * h / w)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `500 ${Math.min(canvas.height * 0.55, 1024 / (text.length + 2))}px "Songti SC", serif`
    ctx.fillText(text, 512, canvas.height / 2)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    textures.push(texture)
    const mat = new THREE.MeshBasicMaterial({ map: texture })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }

  scene.add(new THREE.HemisphereLight('#eaf2ff', '#685744', 2.5))
  const sun = new THREE.DirectionalLight('#ffe1ad', 4)
  sun.position.set(-10, 18, 12)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 18, bottom: -18 })
  sun.shadow.normalBias = 0.04
  scene.add(sun)
  block(scene, 0, -0.3, 0, 90, 0.5, 50, '#737a77')
  block(scene, 0, -0.04, 0, 50, 0.3, 7, '#c7c1af')
  for (let x = -24; x < 25; x += 1.2) {
    block(scene, x, 0.13, 3.5, 1.13, 0.3, 0.35, '#b4af9e')
    for (let z = -2; z < 3; z += 1.2) block(scene, x, 0.115, z, 1.16, 0.025, 1.16, '#c1bbaa')
  }
  for (let x = -26; x <= 26; x += 7) {
    const h = 9 + Math.abs(Math.sin(x)) * 7
    block(scene, x, h / 2, -8, 6.7, h, 5, '#9eaaa7')
    for (let y = 3; y < h; y += 2.3) {
      for (let dx = -2; dx <= 2; dx += 2) block(scene, x + dx, y, -5.47, 0.8, 1.25, 0.05, '#6d8285')
    }
  }

  function shop(x, color, title, sub, accent) {
    const g = new THREE.Group()
    g.position.x = x
    scene.add(g)
    block(g, 0, 2.5, -1.7, 7, 5, 3.4, color)
    block(g, 0, 2.2, 0.02, 5.8, 3.6, 0.15, '#303d39')
    for (const dx of [-3, 0, 3]) block(g, dx, 2.2, 0.16, 0.13, 3.7, 0.18, accent)
    label(g, title, 0, 4.55, 0.1, 6.1, 0.75, accent, '#fff1d4')
    const roof = block(g, 0, 3.85, 0.65, 7.2, 0.13, 1.9, accent)
    roof.rotation.x = 0.12
    for (let dx = -3.4; dx < 3.5; dx += 0.8) block(g, dx, 3.63, 1.58, 0.42, 0.36, 0.08, '#e1d2b7')
    block(g, 0, 0.85, 1.05, 5.7, 1.5, 1.1, color)
    block(g, 0, 1.64, 1.05, 6, 0.15, 1.4, '#d7c3a0')
    label(g, sub, 0, 0.92, 1.615, 4.8, 0.55, color)
    return g
  }
  const breakfast = shop(-8, '#bd9d72', '早 安 · 早餐铺', '明 天 的 早 餐，也 在 盒 子 里', '#586b54')
  label(breakfast, '招牌推荐', -1.55, 2.95, 0.14, 1.75, 0.48, '#e9dabc')
  // A breakfast display behind the counter: plate, buns, cup and steam-like rods.
  cylinder(breakfast, -1.55, 2.23, 0.4, 0.65, 0.07, '#f2e5cf')
  for (const dx of [-1.8, -1.35]) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 12), material('#dba45d'))
    bun.position.set(dx, 2.41, 0.4)
    breakfast.add(bun)
  }
  cylinder(breakfast, -0.65, 2.42, 0.3, 0.15, 0.4, '#e7d8b8')
  label(breakfast, '每个人都在享用好早餐', 1.5, 2.65, 0.15, 2.45, 0.75, '#c3b58f')
  const gift = shop(0, '#99a4a0', '未 知 · 礼物商店', '拆 开 之 前，没 有 答 案', '#394c52')
  for (let x = -2.2; x <= 2.2; x += 1.1) {
    block(gift, x, 2.3, 0.3, 0.6, 0.6, 0.5, '#b9aa8d')
    block(gift, x, 2.65, 0.3, 0.65, 0.1, 0.55, '#d1c4a6')
  }
  const stall = new THREE.Group()
  stall.position.x = 8
  scene.add(stall)
  for (const dx of [-2.3, 2.3]) {
    cylinder(stall, dx, 1.85, 0.1, 0.055, 3.6, '#685a47')
    block(stall, dx, 0.8, 1, 0.13, 1.5, 0.13, '#685a47')
  }
  block(stall, 0, 1.55, 0.75, 5, 0.2, 1.7, '#8b694a')
  const cloth = block(stall, 0, 3.7, 0.2, 5.4, 0.09, 2.6, '#a17959')
  cloth.rotation.x = 0.12
  label(stall, '只 此 一 次', 0, 3.2, 1.52, 2.5, 0.58, '#d4bb8f')
  block(stall, -1.6, 0.48, 0.2, 0.8, 0.7, 0.8, '#96734c')
  block(stall, 1.6, 0.4, 0.4, 0.75, 0.6, 0.75, '#8c7050')

  for (const x of [-12, 4, 12]) {
    cylinder(scene, x, 2.9, 2.8, 0.06, 5.6, '#465250')
    block(scene, x, 5.67, 2.8, 0.6, 0.13, 0.6, '#465250')
    block(scene, x, 5.4, 2.8, 0.32, 0.4, 0.32, '#fff0bc')
    cylinder(scene, x + 0.65, 0.4, 0.2, 0.4, 0.6, '#836c52')
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), material('#64775a'))
    leaves.position.set(x + 0.65, 1.1, 0.2)
    scene.add(leaves)
  }

  positions.forEach((x, i) => {
    const g = new THREE.Group()
    g.position.set(x, 1.75, 1.15)
    scene.add(g)
    const colors = ['#bd915b', '#61767d', '#98754e']
    // Hollow box: a floor and four walls, so the item emerges through the opening.
    block(g, 0, 0.03, 0, 1, 0.06, 0.82, colors[i])
    for (const x of [-0.47, 0.47]) block(g, x, 0.39, 0, 0.06, 0.66, 0.82, colors[i])
    for (const z of [-0.38, 0.38]) block(g, 0, 0.39, z, 0.88, 0.66, 0.06, colors[i])
    const lid = new THREE.Group()
    lid.position.set(0, 0.76, -0.41)
    g.add(lid)
    block(lid, 0, 0, 0.41, 1.07, 0.12, 0.88, colors[i])
    block(lid, 0, 0.07, 0.41, 0.14, 0.015, 0.88, '#e1c99c')
    block(g, 0, 0.36, 0.417, 0.14, 0.72, 0.015, '#e1c99c')
    const hit = block(g, 0, 0.5, 0, 1.35, 1.25, 1.2, colors[i])
    hit.visible = false
    hit.userData.index = i
    targets.push(hit)
    boxes.push({ group: g, lid, opened: false, item: null })
  })

  function reveal(i) {
    const variant = Math.floor(Math.random() * (i === 0 ? 2 : 5))
    const box = boxes[i]
    if (box.opened) return
    box.opened = true
    const item = new THREE.Group()
    box.revealStarted = performance.now()
    item.position.set(0, 0.3, 0)
    item.scale.setScalar(0.6)
    box.group.add(item)
    box.item = item
    if (i === 0) {
      cylinder(item, 0, 0, 0, 0.37, 0.05, '#e7ddd0')
      if (variant === 0) {
        block(item, 0, 0.1, 0, 0.44, 0.15, 0.35, '#593f27')
        return '一顿糟糕的早餐'
      }
      for (const x of [-0.16, 0.16]) {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12), material('#e4b875'))
        bun.position.set(x, 0.16, 0)
        item.add(bun)
      }
      return '一份精致的早餐'
    }
    if (variant === 2) {
      for (let layer = 0; layer < 3; layer++) {
        const lump = new THREE.Mesh(new THREE.SphereGeometry(0.27 - layer * 0.065, 14, 10), material('#67452c'))
        lump.position.set(layer * 0.035, layer * 0.12, 0)
        lump.scale.set(1, 0.55, 0.8)
        item.add(lump)
      }
      return '一摊粪便'
    }
    if (variant === 3) {
      block(item, 0, 0.16, 0, 0.65, 0.13, 0.13, '#444d52')
      block(item, 0.32, 0.16, 0, 0.025, 0.075, 0.075, '#161e23')
      const grip = block(item, -0.2, -0.03, 0, 0.15, 0.32, 0.12, '#292e31')
      grip.rotation.z = -0.22
      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 20), material('#444d52'))
      guard.position.set(-0.045, 0.015, 0)
      item.add(guard)
      return '一把手枪'
    }
    if (variant === 4) {
      for (let layer = 0; layer < 5; layer++) {
        block(item, layer * 0.009, layer * 0.023, 0, 0.65, 0.018, 0.3, '#a7b494')
      }
      block(item, 0, 0.12, 0, 0.13, 0.025, 0.32, '#e0d6b8')
      return '一些足以乱真的假钞'
    }
    if (i === 1 && variant === 1) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.36), new THREE.MeshStandardMaterial({ color: '#a8e5ef', metalness: 0.5, roughness: 0.12, flatShading: true }))
      item.add(gem)
      return '一颗钻石'
    }
    if (i === 1) {
      const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 32), material('#a98b51'))
      clock.rotation.x = Math.PI / 2
      item.add(clock)
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.275, 32), material('#efe4cb'))
      face.position.z = 0.08
      item.add(face)
      block(item, 0, 0.08, 0.09, 0.02, 0.17, 0.02, '#3b4240')
      const hand = block(item, 0.08, 0.01, 0.09, 0.17, 0.018, 0.02, '#3b4240')
      hand.rotation.z = -0.3
      for (const dx of [-0.23, 0.23]) cylinder(item, dx, 0.29, 0, 0.12, 0.09, '#a98b51')
      return '一个闹钟'
    }
    if (variant === 1) {
      block(item, 0, 0, 0, 0.48, 0.38, 0.18, '#6b7375')
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 12, 24, Math.PI), material('#b0b9b6'))
      shackle.position.y = 0.18
      item.add(shackle)
      block(item, 0, 0, 0.1, 0.04, 0.09, 0.02, '#293736')
      return '一把锁'
    }
    const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.07, 32), material('#bb9546', 0.3))
    medal.rotation.x = Math.PI / 2
    item.add(medal)
    for (const dx of [-0.1, 0.1]) block(item, dx, 0.3, -0.02, 0.16, 0.4, 0.025, '#885747')
    return '一枚勋章'
  }

  function navigate(i) {
    selected = Math.max(0, Math.min(2, i))
    targetX = positions[selected]
    zoom = false
  }
  const raycaster = new THREE.Raycaster()
  let pointer = null
  function down(event) { pointer = { x: event.clientX, y: event.clientY }; renderer.domElement.setPointerCapture(event.pointerId) }
  function up(event) {
    if (!pointer) return
    const dx = event.clientX - pointer.x
    const dy = event.clientY - pointer.y
    pointer = null
    if (Math.abs(dx) > 45) { onSelect('move', selected + (dx < 0 ? 1 : -1)); return }
    if (Math.abs(dy) > 20) return
    const rect = renderer.domElement.getBoundingClientRect()
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera)
    const hits = raycaster.intersectObjects(targets)
    if (hits.length) onSelect('box', hits[0].object.userData.index)
  }
  const cancel = () => { pointer = null }
  renderer.domElement.addEventListener('pointerdown', down)
  renderer.domElement.addEventListener('pointerup', up)
  renderer.domElement.addEventListener('pointercancel', cancel)
  renderer.domElement.style.touchAction = 'pan-y'
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect()
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  })
  resize.observe(host)
  camera.position.set(targetX + 2.2, 4.3, 12)
  const look = new THREE.Vector3()
  function draw() {
    if (disposed) return
    frame = requestAnimationFrame(draw)
    const blend = reduced.matches ? 1 : 0.075
    currentX += (targetX - currentX) * blend
    const narrow = camera.aspect < 0.8
    const distance = narrow ? 20 : 11
    const offset = narrow ? 0.4 : 2.2
    camera.position.lerp(new THREE.Vector3(currentX + (zoom ? 0.45 : offset), zoom ? 3.5 : 4.5, zoom ? 7 : distance), blend)
    look.set(currentX, zoom ? 2.3 : 2, 0.3)
    camera.lookAt(look)
    boxes.forEach(box => {
      box.lid.rotation.x += ((box.opened ? -2.1 : 0) - box.lid.rotation.x) * blend
      if (box.item) {
        // Let the lid clear first, lift through the opening, then curve forward.
        const t = reduced.matches ? 1 : Math.max(0, Math.min(1, (performance.now() - box.revealStarted - 400) / 1400))
        const lift = Math.min(1, t / 0.55)
        const easedLift = lift * lift * (3 - 2 * lift)
        const forward = Math.max(0, (t - 0.55) / 0.45)
        const easedForward = forward * forward * (3 - 2 * forward)
        box.item.position.set(0, 0.3 + easedLift * 0.95 + Math.sin(forward * Math.PI) * 0.12, easedForward * 1.05)
        box.item.scale.setScalar(0.6 + easedForward * 0.4)
      }
    })
    renderer.render(scene, camera)
  }
  draw()
  return {
    navigate,
    approach() { zoom = true },
    reveal,
    take(i) { boxes[i].group.visible = false },
    reset() {
      boxes.forEach(box => {
        box.group.visible = true
        box.opened = false
        if (box.item) {
          box.item.traverse(object => object.geometry?.dispose())
          box.group.remove(box.item)
          box.item = null
        }
      })
      navigate(0)
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      resize.disconnect()
      renderer.domElement.removeEventListener('pointerdown', down)
      renderer.domElement.removeEventListener('pointerup', up)
      renderer.domElement.removeEventListener('pointercancel', cancel)
      scene.traverse(object => {
        object.geometry?.dispose()
        if (object.material) object.material.dispose()
      })
      textures.forEach(texture => texture.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }
}
