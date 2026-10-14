struct Vertex {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
}

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

struct Camera {
  projectionMatrix: mat4x4f,
  viewMatrix: mat4x4f,
}

struct Point {
  scale: f32,
  resolution: vec2f,
  worldPosition: vec3f,
  worldNormal: vec3f,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(0) var<uniform> point: Point;

@vertex
fn vs(v: Vertex) -> VSOut {
  let clipPos = camera.projectionMatrix * camera.viewMatrix * vec4f(point.worldPosition, 1.0);
  // ピクセルからNDCへの変換
  let pixelToNDC = 10 / point.resolution;
  // Planeの頂点をピクセル単位でオフセット
  let offset = v.position.xy * point.scale * pixelToNDC;

  let pos = clipPos + vec4f(offset * clipPos.w, 0, 0);

  return VSOut(
    pos,
    v.uv,
  );
}