import { vec3, type Vec3 } from 'wgpu-matrix'

type AABB = { min: Vec3; max: Vec3 }

export abstract class Geometry {
  public abstract readonly positions: Float32Array
  public abstract readonly vertexBuffer: GPUBuffer
  public abstract readonly vertexBufferLayout: GPUVertexBufferLayout
  public abstract readonly numVertices: number

  public readonly indices?: Uint32Array
  public readonly normals?: Float32Array
  public readonly texcoords?: Float32Array
  public readonly indexFormat?: GPUIndexFormat
  public readonly indexBuffer?: GPUBuffer

  private boundingBox: AABB | null = null

  constructor() {}

  public getBoundingBox(update = false) {
    if (!this.boundingBox || update) {
      this.boundingBox = {
        min: vec3.mulScalar([1, 1, 1], Number.MAX_SAFE_INTEGER),
        max: vec3.mulScalar([1, 1, 1], Number.MIN_SAFE_INTEGER),
      }

      for (let i = 0; i < this.positions.length / 3; i++) {
        const x = this.positions[i * 3 + 0]
        const y = this.positions[i * 3 + 1]
        const z = this.positions[i * 3 + 2]
        vec3.min(this.boundingBox.min, [x, y, z], this.boundingBox.min)
        vec3.max(this.boundingBox.max, [x, y, z], this.boundingBox.max)
      }
    }
    return this.boundingBox
  }
}
