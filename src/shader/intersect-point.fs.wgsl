struct FSIn {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@fragment 
fn fs(in: FSIn) -> @location(0) vec4f {
  let a = 1 - smoothstep(0.4, 0.5, distance(in.uv, vec2f(0.5)));
  let col = vec3f(1) * a;
  return vec4f(col, a);
}