import { createResizeObserver } from './modules/common/resize'
import { GPU, Timer, Uniform } from './modules/core'
import { Quaternion } from './modules/core/Quaternion'
import { PlaneGeometry } from './modules/geometry'
import { LineGeometry } from './modules/geometry/LineGeometry'
import { GLBLoader } from './modules/loader/GLBLoader'
import { GLBGeometry, GLBGroup, Mesh, Scene } from './modules/objects'
import { OrbitControls, PerspectiveCamera } from './modules/objects/camera'
import { PointerRay, Raycaster } from './modules/raycaster'
import { CanvasRenderTarget, DepthRenderTarget, MSAARenderTarget, RenderPassAttachments } from './modules/renderTarget'
import * as shader from './shader'

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
// model
// ===========================================
{
  const geometry = new GLBGeometry(device, bunnyNode.getMesh()!)
  const mesh = new Mesh(geometry)
  mesh.name = 'bunny'
  const quat = new Quaternion(...bunnyNode.getRotation())
  mesh.setTRS(bunnyNode.getTranslation(), quat.getEuler('XYZ'), bunnyNode.getScale())

  const group = new GLBGroup(bunnyTransformNode)

  scene.add(group)
  group.add(mesh)

  // uniform
  const uniform = new Uniform(device, { shader: shader.modelVs, uniformName: 'model' })
  mesh.setUniform('model', uniform)

  // bind group
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', minBindingSize: uniform.buffer.size } }],
  })

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: uniform.buffer }],
  })

  mesh.bindGroups = [bindGroup]

  // pipeline
  mesh.pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [...scene.bindGroupLayouts, bindGroupLayout] }),
    vertex: {
      module: device.createShaderModule({ code: shader.modelVs }),
      buffers: [mesh.geometry.vertexBufferLayout],
    },
    fragment: {
      module: device.createShaderModule({ code: shader.modelFs }),
      targets: [{ format: gpu.presentationFormat }],
    },
    multisample: { count: msaa.sampleCount },
    depthStencil: {
      depthWriteEnabled: true,
      format: depth.format,
      depthCompare: 'less',
    },
  })
}

const bunny = scene.getObjectByName('bunny') as Mesh

// ===========================================
// intersect point
// ===========================================
{
  const geometry = new PlaneGeometry(device)
  const mesh = new Mesh(geometry)
  mesh.name = 'point'
  mesh.visible = false
  scene.add(mesh)

  const uniform = new Uniform(device, { shader: shader.intersectPointVs, uniformName: 'point' })
  uniform.set('scale', 1.5).writeBuffer()
  mesh.setUniform('point', uniform)

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', minBindingSize: uniform.buffer.size } }],
  })

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: uniform.buffer }],
  })
  mesh.bindGroups = [bindGroup]

  mesh.pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [...scene.bindGroupLayouts, bindGroupLayout] }),
    vertex: {
      module: device.createShaderModule({ code: shader.intersectPointVs }),
      buffers: [mesh.geometry.vertexBufferLayout],
    },
    fragment: {
      module: device.createShaderModule({ code: shader.intersectPointFs }),
      targets: [
        {
          format: gpu.presentationFormat,
          blend: {
            color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        },
      ],
    },
    multisample: { count: msaa.sampleCount },
    depthStencil: {
      depthWriteEnabled: false,
      format: depth.format,
      depthCompare: 'always',
    },
  })
}

const point = scene.getObjectByName('point') as Mesh

// ===========================================
// intersect normal line
// ===========================================
{
  const geometry = new LineGeometry(device, { lines: [0, 0, 0, 0, 0, 0] })
  const mesh = new Mesh(geometry)
  mesh.name = 'line'
  mesh.visible = false
  scene.add(mesh)

  const uniform = new Uniform(device, { shader: shader.intersectNormalVs, uniformName: 'line' })
  uniform.set('normal', [1, 1, 1]).writeBuffer()
  mesh.setUniform('line', uniform)

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', minBindingSize: uniform.buffer.size } }],
  })

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: uniform.buffer }],
  })
  mesh.bindGroups = [bindGroup]

  mesh.pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [...scene.bindGroupLayouts, bindGroupLayout] }),
    vertex: {
      module: device.createShaderModule({ code: shader.intersectNormalVs }),
      buffers: [mesh.geometry.vertexBufferLayout],
    },
    fragment: {
      module: device.createShaderModule({ code: shader.intersectNormalFs }),
      targets: [{ format: gpu.presentationFormat }],
    },
    primitive: {
      topology: 'line-list',
    },
    multisample: { count: msaa.sampleCount },
    depthStencil: {
      depthWriteEnabled: false,
      format: depth.format,
      depthCompare: 'always',
    },
  })
}

const line = scene.getObjectByName('line') as Mesh

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
