import { vec3 } from 'wgpu-matrix'
import { type Camera } from '../objects/camera'
import { Ray } from './Ray'

export class PointerRay extends Ray {
  private readonly abortController = new AbortController()
  public pointermoveCallback?: () => void

  constructor(
    canvas: HTMLCanvasElement,
    private readonly camera: Camera,
  ) {
    super()
    this.addEvents(canvas)
  }

  private addEvents(canvas: HTMLCanvasElement) {
    canvas.addEventListener(
      'pointermove',
      (e) => {
        const x = (e.clientX / canvas.clientWidth) * 2 - 1
        const y = (1 - e.clientY / canvas.clientHeight) * 2 - 1

        const worldNear = this.camera.unproject([x, y, 0])
        const worldFar = this.camera.unproject([x, y, 1])

        this.setOrigin(worldNear)
        this.setDirection(vec3.sub(worldFar, worldNear))

        this.pointermoveCallback?.()
      },
      { signal: this.abortController.signal },
    )
  }

  dispose() {
    this.abortController.abort()
  }
}
