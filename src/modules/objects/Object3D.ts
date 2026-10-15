import { mat3, mat4, type Mat3, type Mat4 } from 'wgpu-matrix'
import { Vec3 } from '../core'

type N3 = [number, number, number]

export abstract class Object3D {
  public name: string = ''
  public parent: Object3D | null = null
  protected _visible = true

  public readonly children: Object3D[] = []

  public readonly position: Vec3
  public readonly rotation: Vec3
  public readonly scale: Vec3

  public readonly localMatrix: Mat4
  public readonly worldMatrix: Mat4
  public readonly worldMatrixInverse: Mat4
  public readonly normalMatrix: Mat3

  constructor() {
    this.position = new Vec3()
    this.rotation = new Vec3()
    this.scale = new Vec3(1, 1, 1)

    this.localMatrix = mat4.identity()
    this.worldMatrix = mat4.identity()
    this.worldMatrixInverse = mat4.identity()
    this.normalMatrix = mat3.identity()
  }

  setTRS(translation: N3, rotation: N3, scale: N3) {
    this.position.set(...translation)
    this.rotation.set(...rotation)
    this.scale.set(...scale)
  }

  add(child: Object3D) {
    // set parent
    if (child.parent) {
      const index = child.parent.children.indexOf(child)
      if (index >= 0) child.parent.children.splice(index, 1)
    }
    child.parent = this
    // add child
    this.children.push(child)
  }

  remove(child: Object3D) {
    // remove parent
    child.parent = null
    // remove child
    const index = this.children.indexOf(child)
    if (index >= 0) this.children.splice(index, 1)
  }

  updateWorldMatrix() {
    if (!this.visible) return

    // local matrix
    mat4.identity(this.localMatrix)
    mat4.translate(this.localMatrix, this.position.array, this.localMatrix)
    mat4.rotateX(this.localMatrix, this.rotation.x, this.localMatrix)
    mat4.rotateY(this.localMatrix, this.rotation.y, this.localMatrix)
    mat4.rotateZ(this.localMatrix, this.rotation.z, this.localMatrix)
    mat4.scale(this.localMatrix, this.scale.array, this.localMatrix)
    // world matrix
    if (this.parent) {
      mat4.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix)
    } else {
      mat4.copy(this.localMatrix, this.worldMatrix)
    }
    // world matrix inverse
    mat4.inverse(this.worldMatrix, this.worldMatrixInverse)
    // normal matrix
    mat3.fromMat4(mat4.transpose(this.worldMatrixInverse), this.normalMatrix)

    this.children.forEach((child) => child.updateWorldMatrix())
  }

  get visible() {
    return this._visible
  }

  set visible(visibled: boolean) {
    this._visible = visibled
  }

  getRoot(): Object3D {
    if (this.parent) return this.parent.getRoot()
    return this
  }

  traverse(callback?: (obj: Object3D) => void) {
    callback?.(this)
    this.children.forEach((child) => child.traverse(callback))
  }

  getObjectByName(name: string): Object3D | null {
    if (this.name === name) return this

    for (const child of this.children) {
      const obj = child.getObjectByName(name)
      if (obj) return obj
    }
    return null
  }
}
