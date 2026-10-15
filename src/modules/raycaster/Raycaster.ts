import { mat3, vec2, vec3, type Vec2, type Vec3 } from 'wgpu-matrix'
import type { Mesh } from '../objects'
import type { Ray } from './Ray'

type Intersection = {
  indices: [number, number, number]
  position: Vec3
  normal?: Vec3
  texcoord?: Vec2
}

export class Raycaster {
  private readonly buffers = {
    A: vec3.create(),
    B: vec3.create(),
    C: vec3.create(),
    AB: vec3.create(),
    AC: vec3.create(),
    AO: vec3.create(),
    M: mat3.create(),
    invM: mat3.create(),
    uvt: vec3.create(),
    nA: vec3.create(),
    nB: vec3.create(),
    nC: vec3.create(),
    tA: vec2.create(),
    tB: vec2.create(),
    tC: vec2.create(),
  }

  constructor(private readonly ray: Ray) {}

  intersect(target: Mesh): Intersection[] | null {
    if (!target.geometry.indices) return null
    if (!target.visible) return null

    target.getRoot().updateWorldMatrix()

    // local origin
    const O = vec3.transformMat4(this.ray.worldOrigin, target.worldMatrixInverse)
    // local direcition
    const D = vec3.transformMat4Upper3x3(this.ray.worldDirection, target.worldMatrixInverse)

    // AABBに収まるかどうか判定する
    if (!this.insideAABB(target, O, D)) return null

    // 三角形とRayの交点を求める
    const intersections: Intersection[] = []
    const { A, B, C, AB, AC, AO, M, invM, uvt, nA, nB, nC, tA, tB, tC } = this.buffers

    for (let i = 0; i < target.geometry.indices.length / 3; i++) {
      const iA = target.geometry.indices[i * 3 + 0]
      const iB = target.geometry.indices[i * 3 + 1]
      const iC = target.geometry.indices[i * 3 + 2]

      this.setPosition(target, iA, A)
      this.setPosition(target, iB, B)
      this.setPosition(target, iC, C)

      // O + tD = A + u(B - A) + v(C - A)
      // u(B - A) + v(C - A) - tD = O - A
      vec3.sub(B, A, AB)
      vec3.sub(C, A, AC)
      vec3.sub(O, A, AO)

      // prettier-ignore
      mat3.set(
        AB[0], AB[1], AB[2],
        AC[0], AC[1], AC[2],
        -D[0], -D[1], -D[2],
        M,
      )

      if (Math.abs(mat3.determinant(M)) > 1e-8) {
        mat3.inverse(M, invM)
        // uvt = invM x AO
        vec3.transformMat3(AO, invM, uvt)
        const [u, v, t] = [...uvt]

        // 条件
        // t: 交差点がrayの前方にある
        // u, v: 交差点が三角形内部にある
        if (t >= 0 && u >= 0 && v >= 0 && u + v <= 1) {
          // 交点をもつ
          const localIntersectPos = vec3.add(O, vec3.mulScalar(D, t))
          const worldIntersectPos = vec3.transformMat4(localIntersectPos, target.worldMatrix)

          const intersection: Intersection = { indices: [iA, iB, iC], position: worldIntersectPos }

          if (target.geometry.normals) {
            // normalの計算
            this.setNormal(target, iA, nA)
            this.setNormal(target, iB, nB)
            this.setNormal(target, iC, nC)
            // N = (1 - u - v)NA + uNB + vNC
            const w = 1 - u - v
            const localNormal = vec3.normalize(vec3.add(vec3.add(vec3.mulScalar(nA, w), vec3.mulScalar(nB, u)), vec3.mulScalar(nC, v)))
            const worldNormal = vec3.normalize(vec3.transformMat4Upper3x3(localNormal, target.normalMatrix))
            Object.assign(intersection, { normal: worldNormal })
          }

          if (target.geometry.texcoords) {
            // texcoordの計算
            this.setTexcoord(target, iA, tA)
            this.setTexcoord(target, iB, tB)
            this.setTexcoord(target, iC, tC)
            // N = (1 - u - v)TA + uTB + vTC
            const w = 1 - u - v
            const texcoord = vec2.add(vec2.add(vec2.mulScalar(tA, w), vec2.mulScalar(tB, u)), vec2.mulScalar(tC, v))
            Object.assign(intersection, { texcoord: texcoord })
          }

          intersections.push(intersection)
        }
      }
    }

    // originから近い順に並べ替える
    intersections.sort((a, b) => vec3.distanceSq(a.position, this.ray.worldOrigin) - vec3.distanceSq(b.position, this.ray.worldOrigin))
    return intersections.length === 0 ? null : intersections
  }

  private setPosition(target: Mesh, i: number, dst: Vec3) {
    // prettier-ignore
    vec3.set(
      target.geometry.positions[i * 3 + 0], 
      target.geometry.positions[i * 3 + 1], 
      target.geometry.positions[i * 3 + 2], 
      dst
    )
  }

  private setNormal(target: Mesh, i: number, dst: Vec3) {
    // prettier-ignore
    vec3.set(
      target.geometry.normals![i * 3 + 0], 
      target.geometry.normals![i * 3 + 1], 
      target.geometry.normals![i * 3 + 2], 
      dst
    )
  }

  private setTexcoord(target: Mesh, i: number, dst: Vec2) {
    // prettier-ignore
    vec2.set(
      target.geometry.texcoords![i * 2 + 0], 
      target.geometry.texcoords![i * 2 + 1],
      dst
    )
  }

  private insideAABB(target: Mesh, O: Vec3, D: Vec3) {
    const aabb = target.geometry.getBoundingBox()

    let near = -Infinity
    let far = Infinity

    for (let i = 0; i < 3; i++) {
      if (D[i] === 0) {
        if (O[i] < aabb.min[i] || O[i] > aabb.max[i]) {
          return false
        }
        continue
      }

      const t1 = (aabb.min[i] - O[i]) / D[i]
      const t2 = (aabb.max[i] - O[i]) / D[i]

      near = Math.max(near, Math.min(t1, t2))
      far = Math.min(far, Math.max(t1, t2))

      if (near > far) return false
    }

    return far >= Math.max(near, 0)
  }
}
