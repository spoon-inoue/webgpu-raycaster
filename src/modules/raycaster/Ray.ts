import { vec3, type Vec3 } from 'wgpu-matrix'

export class Ray {
  public readonly worldOrigin: Vec3
  public readonly worldDirection: Vec3

  constructor(worldOrigin?: Vec3, worldDirection?: Vec3) {
    this.worldOrigin = worldOrigin ?? vec3.create()
    this.worldDirection = worldDirection ?? vec3.create()
  }

  setOrigin(worldOrigin: Vec3 | [number, number, number]) {
    vec3.set(worldOrigin[0], worldOrigin[1], worldOrigin[2], this.worldOrigin)
    return this
  }

  setDirection(worldDirection: Vec3 | [number, number, number]) {
    vec3.normalize(worldDirection, this.worldDirection)
    return this
  }
}
