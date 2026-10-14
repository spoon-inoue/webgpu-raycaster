import { Object3D } from './Object3D'

export class Scene extends Object3D {
  public bindGroupLayouts: GPUBindGroupLayout[] = []
  public bindGroups: GPUBindGroup[] = []

  constructor() {
    super()
    this.name = 'scene'
  }

  setBindGroup(pass: GPURenderPassEncoder, bindGroupOffset = 0) {
    this.bindGroups.forEach((bindGroup, i) => pass.setBindGroup(i + bindGroupOffset, bindGroup))
  }
}
