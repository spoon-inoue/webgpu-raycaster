struct Vertex {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
}

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
}

struct Camera {
  projectionMatrix: mat4x4f,
  viewMatrix: mat4x4f,
}

struct Model {
  worldMatrix: mat4x4f,
  normalMatrix: mat3x3f,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(0) var<uniform> model: Model;

@vertex 
fn vs(v: Vertex) -> VSOut {
  return VSOut(
    camera.projectionMatrix * camera.viewMatrix * model.worldMatrix * vec4f(v.position, 1),
    model.normalMatrix * v.normal,
  );
}