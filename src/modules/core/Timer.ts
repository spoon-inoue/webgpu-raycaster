export class Timer {
  private then = -1
  private delta = 0
  private elapsed = 0

  constructor() {
    this.setEvent()
  }

  update() {
    if (document.visibilityState === 'hidden') {
      return { deltaTime: this.delta, elapsedTime: this.elapsed }
    }

    if (this.then < 0) {
      this.then = performance.now()
    }
    const now = performance.now()
    this.delta = now - this.then
    this.then = now
    this.elapsed += this.delta

    return { deltaTime: this.delta, elapsedTime: this.elapsed }
  }

  reset() {
    this.then = -1
    this.delta = 0
    this.elapsed = 0
  }

  private setEvent() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.then = -1
      }
    })
  }
}
