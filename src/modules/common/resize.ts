export function createResizeObserver(device: GPUDevice, callback?: (resolution: { width: number; height: number }) => void) {
  const maxTextureDimension2D = device.limits.maxTextureDimension2D

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      let width = entry.devicePixelContentBoxSize[0].inlineSize
      let height = entry.devicePixelContentBoxSize[0].blockSize
      width = Math.max(1, Math.min(width, maxTextureDimension2D))
      height = Math.max(1, Math.min(height, maxTextureDimension2D))

      callback?.({ width, height })
    }
  })

  return observer
}
