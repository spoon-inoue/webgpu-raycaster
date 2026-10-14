import { GPU, Uniform } from './modules/core'
import { Quaternion } from './modules/core/Quaternion'
import { LineGeometry, PlaneGeometry } from './modules/geometry'
import { GLBGeometry, GLBGroup, Mesh, type Scene } from './modules/objects'
import type { DepthRenderTarget, MSAARenderTarget } from './modules/renderTarget'
import * as shader from './shader'
import { Node } from '@gltf-transform/core'

export function addModelMesh(gpu: GPU, scene: Scene, bunnyNode: Node, bunnyTransformNode: Node, msaa: MSAARenderTarget, depth: DepthRenderTarget) {
  const { device, presentationFormat } = gpu

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
      targets: [{ format: presentationFormat }],
    },
    multisample: { count: msaa.sampleCount },
    depthStencil: {
      depthWriteEnabled: true,
      format: depth.format,
      depthCompare: 'less',
    },
  })

  return mesh
}

export function addIntersectPointMesh(gpu: GPU, scene: Scene, msaa: MSAARenderTarget, depth: DepthRenderTarget) {
  const { device, presentationFormat } = gpu

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
          format: presentationFormat,
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

  return mesh
}

export function addIntersectLineMesh(gpu: GPU, scene: Scene, msaa: MSAARenderTarget, depth: DepthRenderTarget) {
  const { device, presentationFormat } = gpu

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
      targets: [{ format: presentationFormat }],
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

  return mesh
}
