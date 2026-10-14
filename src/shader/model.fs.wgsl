struct FSIn {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
}

@fragment 
fn fs(in: FSIn) -> @location(0) vec4f {
  let normal = normalize(in.normal);
  return vec4f(normal * 0.5 + 0.5, 1);
}