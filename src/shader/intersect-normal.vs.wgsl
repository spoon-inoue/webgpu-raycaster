struct Vertex {
  @builtin(vertex_index) vertexIndex : u32,
  @location(0) position: vec3f,
}

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
}

struct Camera {
  projectionMatrix: mat4x4f,
  viewMatrix: mat4x4f,
}

struct Line {
  intersectPoint: vec3f,
  intersectNormal: vec3f,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(0) var<uniform> line: Line;

@vertex
fn vs(v: Vertex) -> VSOut {
  var worldPos = line.intersectPoint;
  
  if (v.vertexIndex == 1u) {
    // 線分の終端は、normal方向へ固定長の位置にする
    // 透視投影の拡大率を補正
    let viewPoint = camera.viewMatrix * vec4f(line.intersectPoint, 1.0);
    let scale = -viewPoint.z * 0.1;
    worldPos += normalize(line.intersectNormal) * scale;
  }

  return VSOut(
    camera.projectionMatrix * camera.viewMatrix * vec4f(worldPos, 1.0),
    line.intersectNormal,
  );
}