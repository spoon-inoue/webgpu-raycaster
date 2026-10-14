import { addIntersectLineMesh, addIntersectPointMesh, addModelMesh } from './meshBuilder'
import { createResizeObserver } from './modules/common/resize'
import { GPU, Timer } from './modules/core'
import { GLBLoader } from './modules/loader/GLBLoader'
import { Scene } from './modules/objects'
import { OrbitControls, PerspectiveCamera } from './modules/objects/camera'
import { PointerRay, Raycaster } from './modules/raycaster'
import { CanvasRenderTarget, DepthRenderTarget, MSAARenderTarget, RenderPassAttachments } from './modules/renderTarget'

// ===========================================
// gpu
// ===========================================
const gpu = await GPU.request()
const device = gpu.device

// ===========================================
// render target
// ===========================================
const canvas = document.querySelector<HTMLCanvasElement>('canvas')!
const renderTarget = new CanvasRenderTarget(canvas, { device, format: gpu.presentationFormat, alphaMode: 'premultiplied' })
const msaa = new MSAARenderTarget(device, { format: gpu.presentationFormat })
const depth = new DepthRenderTarget(device, { format: 'depth24plus', sampleCount: msaa.sampleCount })
const attachments = new RenderPassAttachments({
  colorAttachment: { view: null as any, loadOp: 'clear', storeOp: 'store' },
  msaa,
  depth,
})

// ===========================================
// load mdoel
// ===========================================
const loader = new GLBLoader()
const dispose = await loader.setDraco()
const doc = await loader.load(import.meta.env.BASE_URL + 'assets/model.drc.glb')
dispose()

const nodes = doc.getRoot().listNodes()
const bunnyNode = nodes.find((node) => node.getName() === 'StanfordBunny')!
const bunnyTransformNode = nodes.find((node) => node.getName() === 'Transform')!

// ===========================================
// camera
// ===========================================
const camera = new PerspectiveCamera(device, { aspect: renderTarget.size.aspect, fov: 40, near: 0.1, far: 100 })
camera.position.set(0, 0, 5)
camera.updateViewMatrix()

const controls = new OrbitControls(camera, canvas)

// ===========================================
// scene
// ===========================================
const scene = new Scene()

scene.bindGroupLayouts = [
  device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', minBindingSize: camera.buffer.size } }],
  }),
]

scene.bindGroups = [
  device.createBindGroup({
    layout: scene.bindGroupLayouts[0],
    entries: [{ binding: 0, resource: camera.buffer }],
  }),
]

// ===========================================
// mesh
// ===========================================
const bunny = addModelMesh(gpu, scene, bunnyNode, bunnyTransformNode, msaa, depth)
const point = addIntersectPointMesh(gpu, scene, msaa, depth)
const line = addIntersectLineMesh(gpu, scene, msaa, depth)

// ===========================================
// raycaster
// ===========================================
const ray = new PointerRay(canvas, camera)
const raycaster = new Raycaster(ray)

ray.pointermoveCallback = () => {
  const res = raycaster.intersect(bunny)
  if (res) {
    const intersect = res[0]

    point.visible = true
    // prettier-ignore
    point.getUniform('point')
      .set('worldPosition', intersect.position)
      .writeBuffer()

    if (intersect.normal) {
      line.visible = true
      // prettier-ignore
      line.getUniform('line')
        .set('intersectPoint', intersect.position)
        .set('intersectNormal', intersect.normal)
        .writeBuffer()
    }
  } else {
    point.visible = false
    line.visible = false
  }
}

// ===========================================
// render
// ===========================================
const timer = new Timer()

function render() {
  const { deltaTime } = timer.update()
  controls.update(deltaTime)

  scene.updateWorldMatrix()
  // prettier-ignore
  bunny.getUniform('model')
    .set('worldMatrix', bunny.worldMatrix)
    .set('normalMatrix', bunny.normalMatrix)
    .writeBuffer()

  attachments.setView(renderTarget.texture)

  const encoder = device.createCommandEncoder()

  const pass = encoder.beginRenderPass(attachments.descriptor)
  scene.setBindGroup(pass, 0)
  bunny.draw(pass, 1)
  point.draw(pass, 1)
  line.draw(pass, 1)
  pass.end()

  device.queue.submit([encoder.finish()])

  requestAnimationFrame(render)
}

render()

// ===========================================
// resize
// ===========================================
createResizeObserver(device, ({ width, height }) => {
  renderTarget.resize(width, height)
  camera.setAspect(width / height).updateProjectionMatrix()
  point.getUniform('point').set('resolution', [width, height]).writeBuffer()
}).observe(canvas, { box: 'device-pixel-content-box' })
