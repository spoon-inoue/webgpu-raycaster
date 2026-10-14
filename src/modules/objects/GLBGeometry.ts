import { Mesh, type TypedArray } from '@gltf-transform/core'
import * as wgu from 'webgpu-utils'
import { Geometry } from '../geometry/Geometry'

export class GLBGeometry extends Geometry {
  public readonly positions: Float32Array
  public readonly normals: Float32Array
  public readonly indices: Uint32Array

  public readonly vertexBuffer: GPUBuffer
  public readonly vertexBufferLayout: GPUVertexBufferLayout
  public readonly indexFormat: GPUIndexFormat
  public readonly indexBuffer: GPUBuffer
  public readonly numVertices: number

  constructor(
    private readonly device: GPUDevice,
    private readonly mesh: Mesh,
  ) {
    super()

    this.positions = this.getAttribute<Float32Array>('POSITION')
    this.normals = this.getAttribute<Float32Array>('NORMAL')
    this.indices = this.getIndices<Uint32Array>()

    const data = this.createVertexData()
    this.vertexBuffer = data.buffers[0]
    this.vertexBufferLayout = data.bufferLayouts[0]
    this.indexBuffer = data.indexBuffer!
    this.indexFormat = data.indexFormat!
    this.numVertices = data.numElements
  }

  private getAttribute<T extends TypedArray>(semantic: string) {
    if (this.mesh.listPrimitives().length <= 0) throw Error('頂点データを取得できませんでした。')

    const attr = this.mesh.listPrimitives()[0].getAttribute(semantic)
    if (!attr) throw Error('頂点属性を取得できませんでした。')

    return attr.getArray() as T
  }

  private getIndices<T extends Uint16Array | Uint32Array>() {
    if (this.mesh.listPrimitives().length <= 0) throw Error('頂点データを取得できませんでした。')

    const indices = this.mesh.listPrimitives()[0].getIndices()
    if (!indices) throw Error('頂点インデックスを取得できませんでした。')

    return indices.getArray() as T
  }

  private createVertexData() {
    return wgu.createBuffersAndAttributesFromArrays(this.device, {
      position: this.positions,
      normal: this.normals,
      // texcoord: tex.getArray(),
      indices: this.indices,
    })
  }
}
