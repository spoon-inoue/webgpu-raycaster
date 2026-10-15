import { vec3, vec4 } from 'wgpu-matrix'
import type { Uniform } from '../core'
import type { Geometry } from '../geometry/Geometry'
import type { Camera } from './camera'
import { Object3D } from './Object3D'

export class Mesh extends Object3D {
  public pipeline: GPURenderPipeline | null = null
  public bindGroups: GPUBindGroup[] = []
  private readonly uniforms: { [key in string]: Uniform } = {}

  public frustumCulled = true
  private frustumVisible = true
  private readonly frustumCullingBuffers = {
    world: vec4.create(),
    view: vec4.create(),
    clip: vec4.create(),
    ndc: vec3.create(),
  }

  constructor(public readonly geometry: Geometry) {
    super()
  }

  get visible() {
    return this.frustumVisible && this._visible
  }

  set visible(visibled: boolean) {
    this._visible = visibled
  }

  setUniform(name: string, uniform: Uniform) {
    this.uniforms[name] = uniform
  }

  getUniform(name: string) {
    if (!Object.keys(this.uniforms).includes(name)) throw Error(`${name} Uniformが見つかりませんでした。`)
    return this.uniforms[name]
  }

  draw(pass: GPURenderPassEncoder, bindGroupOffset = 0) {
    if (!this.visible) return
    if (!this.pipeline) throw new Error(`Pipelineが定義されていません。(name: ${this.name})`)

    pass.setPipeline(this.pipeline)
    this.bindGroups.forEach((bindGroup, i) => pass.setBindGroup(i + bindGroupOffset, bindGroup))
    pass.setVertexBuffer(0, this.geometry.vertexBuffer)

    if (this.geometry.indexBuffer && this.geometry.indexFormat) {
      pass.setIndexBuffer(this.geometry.indexBuffer, this.geometry.indexFormat)
      pass.drawIndexed(this.geometry.numVertices)
    } else {
      pass.draw(this.geometry.numVertices)
    }
  }

  frustumCulling(camera: Camera) {
    if (!this.frustumCulled || !this._visible) {
      this.frustumVisible = true
      return
    }

    const aabb = this.geometry.getBoundingBox()
    const { world, view, clip } = this.frustumCullingBuffers
    const { min, max } = aabb

    const corners = [
      [min[0], min[1], min[2], 1],
      [max[0], min[1], min[2], 1],
      [min[0], max[1], min[2], 1],
      [max[0], max[1], min[2], 1],
      [min[0], min[1], max[2], 1],
      [max[0], min[1], max[2], 1],
      [min[0], max[1], max[2], 1],
      [max[0], max[1], max[2], 1],
    ]

    const clips = corners.map((corner) => {
      vec4.transformMat4(corner, this.worldMatrix, world)
      vec4.transformMat4(world, camera.viewMatrix, view)
      vec4.transformMat4(view, camera.projectionMatrix, clip)
      return [...clip]
    })

    this.frustumVisible = !(
      clips.every((p) => p[0] < -p[3]) ||
      clips.every((p) => p[0] > p[3]) ||
      clips.every((p) => p[1] < -p[3]) ||
      clips.every((p) => p[1] > p[3]) ||
      clips.every((p) => p[2] < 0) ||
      clips.every((p) => p[2] > p[3])
    )
  }
}
