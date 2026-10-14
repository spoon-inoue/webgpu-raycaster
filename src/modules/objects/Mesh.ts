import type { Uniform } from '../core'
import type { Geometry } from '../geometry/Geometry'
import { Object3D } from './Object3D'

export class Mesh extends Object3D {
  public pipeline: GPURenderPipeline | null = null
  public bindGroups: GPUBindGroup[] = []
  private readonly uniforms: { [key in string]: Uniform } = {}

  constructor(public readonly geometry: Geometry) {
    super()
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
}
