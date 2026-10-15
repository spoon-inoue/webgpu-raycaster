import type { Camera } from './camera'
import { Mesh } from './Mesh'
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

  frustumCulling(camera: Camera) {
    this.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.frustumCulling(camera)
      }
    })
  }
}
