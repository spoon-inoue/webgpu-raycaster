import { WebIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'

type Dispose = () => void

export class GLBLoader {
  private readonly io: WebIO
  private dracoDecoderModule?: draco3d.DecoderModule | null

  constructor() {
    this.io = this.createIO()
  }

  private createIO() {
    const io = new WebIO()
    io.registerExtensions(ALL_EXTENSIONS)
    return io
  }

  /**
   * using draco decoder
   * @returns disposer
   */
  async setDraco(): Promise<Dispose> {
    this.dracoDecoderModule = await draco3d.createDecoderModule({
      // CDN
      // https://github.com/google/draco#wasm-and-javascript-decoders
      locateFile: (path: string) => `https://www.gstatic.com/draco/v1/decoders/${path}`,
      // local file
      // https://github.com/google/draco/blob/main/javascript/draco_decoder_gltf.wasm
      // locateFile: (path: string) => `/draco/${path}`,
    })
    this.io.registerDependencies({ 'draco3d.decoder': this.dracoDecoderModule })

    return () => {
      this.io.registerDependencies({ 'draco3d.decoder': null })
      this.dracoDecoderModule = null
    }
  }

  async load(path: string) {
    const respose = await fetch(path)
    const arrayBuffer = await respose.arrayBuffer()
    const document = await this.io.readBinary(new Uint8Array(arrayBuffer))
    return document
  }
}
