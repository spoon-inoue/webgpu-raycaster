import { Geometry } from './Geometry'

type LineGeometryArgs = {
  lines: number[]
}

export class LineGeometry extends Geometry {
  public readonly positions: Float32Array
  public readonly vertexBuffer: GPUBuffer
  public readonly vertexBufferLayout: GPUVertexBufferLayout
  public readonly numVertices: number

  constructor(
    private readonly device: GPUDevice,
    args: LineGeometryArgs,
  ) {
    super()

    this.positions = Float32Array.from(args.lines)
    this.vertexBuffer = this.createVertexBuffer(this.positions)
    this.vertexBufferLayout = this.createVertexBufferLayout()
    this.numVertices = Math.floor(this.positions.length / 3)
  }

  private createVertexBuffer(vertices: Float32Array) {
    const buffer = this.device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    this.device.queue.writeBuffer(buffer, 0, vertices)
    return buffer
  }

  private createVertexBufferLayout(): GPUVertexBufferLayout {
    return {
      arrayStride: 3 * 4,
      attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
      ],
    }
  }
}
