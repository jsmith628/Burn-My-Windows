//////////////////////////////////////////////////////////////////////////////////////////
//          )                                                   (                       //
//       ( /(   (  (               )    (       (  (  (         )\ )    (  (            //
//       )\()) ))\ )(   (         (     )\ )    )\))( )\  (    (()/( (  )\))(  (        //
//      ((_)\ /((_|()\  )\ )      )\  '(()/(   ((_)()((_) )\ )  ((_)))\((_)()\ )\       //
//      | |(_|_))( ((_)_(_/(    _((_))  )(_))  _(()((_|_)_(_/(  _| |((_)(()((_|(_)      //
//      | '_ \ || | '_| ' \))  | '  \()| || |  \ V  V / | ' \)) _` / _ \ V  V (_-<      //
//      |_.__/\_,_|_| |_||_|   |_|_|_|  \_, |   \_/\_/|_|_||_|\__,_\___/\_/\_//__/      //
//                                 |__/                                                 //
//////////////////////////////////////////////////////////////////////////////////////////

// SPDX-FileCopyrightText: Joshua Smith <joshua@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

uniform vec2 uStartPos;
uniform vec2 uSeed;

const float PI  = radians(180.0);
const float TAU = radians(360.0);

vec4 blend(vec4 a, vec4 b) {
  return a.a*a + (1.0-a.a)*b;
}

//
// A lot of this is based upong images of the Blue Morpho butterfly (Morpho Menelaus)
// https://en.wikipedia.org/wiki/Morpho_menelaus
// 
// Especially images like this:
// https://upload.wikimedia.org/wikipedia/commons/d/d7/Blue_Morpho.jpg
//

vec4 butterfly_wings(vec2 p, float wing_angle) {
  // Offset so the rotation happens at the connection to the Thorax and NOT the middle
  p.x = max(0.0, abs(p.x)-0.08);
    
  // Rotation around the y-axis followed by an orthogonal projection
  // NOTE: might come back to this later if I do lighting
  p /= vec2(cos(wing_angle), 1.0);

  float R2 = dot(p, p);
  float a = abs(atan(p.x, p.y));
   
  const float ANGLE1 = PI/16.0;
  const float ANGLE2 = 5.0*PI/16.0;
  const float ANGLE3 = 9.0*PI/16.0;
  const float ANGLE4 = 10.0*PI/16.0;
  const float ANGLE5 = 11.0*PI/16.0;
  const float ANGLE6 = 14.0*PI/16.0;
  const float ANGLE7 = 16.0*PI/16.0;
    
    
  float s1 = mix(0.4, 1.0, smoothstep(ANGLE1, ANGLE2, a));
  float s2 = 0.015*(cos(8.0*TAU*(a-ANGLE2)/(ANGLE6-ANGLE2))+1.0); //use remap instead
  float s = s1*s1
              -(0.1-s2)*smoothstep(ANGLE2, ANGLE3, a)
              -(0.1-s2)*smoothstep(mix(ANGLE2, ANGLE3,0.9), ANGLE4, a)
              +(0.2-s2)*smoothstep(ANGLE4, ANGLE5, a)
              +(0.1-s2)*smoothstep(ANGLE5, ANGLE6, a)
              -(0.7)*smoothstep(ANGLE6, ANGLE7, a);
    
    
  float r = 1.0 * s;
  float r_inner = r*0.85*smoothstep(ANGLE1, ANGLE2, a);
                
  vec4 color = vec4(0.0,0.0,0.0,0.0);
  if(R2 < r*r) color = vec4(0,0,0,1);
  if(R2 < r_inner*r_inner) color = vec4(0,0,1,1);
  return color;
}

float superEllipse(vec2 p, vec2 center, vec2 size, float ex) {
  p = abs(p-center);
  p *= 2.0/size;
  return pow(p.x, ex)+pow(p.y, ex);
}

vec4 body(vec2 x) {

  const vec4 BODY_COLOR = vec4(0.0,0.0,0.0,1.0);

  float abdomen = superEllipse(x, vec2(0,-0.2), vec2(0.2,0.5), 3.0);
  if(abdomen<=1.0) return BODY_COLOR;

  float thorax = superEllipse(x, vec2(0,0.1), vec2(0.2,0.25), 3.0);
  if(thorax<=1.0) return BODY_COLOR;
    
  float head = superEllipse(x, vec2(0,0.25), vec2(0.17,0.17), 2.0);
  if(head<=1.0) return BODY_COLOR;

  return vec4(0.0,0.0,0.0,0.0);
}

vec4 butterfly(vec2 x, vec2 position, float size, float rotation, float wing_angle) {
  vec2 dx = x - position;
  dx = rotate(dx, -rotation);
  dx /= size;
  
  vec4 wings = butterfly_wings(dx, wing_angle);
  vec4 body = body(dx);
  return blend(body, wings);
}

// float uDuration = 3.0;
// vec2 uSize;

// I want to leave open the option to use an ivec3 or a struct for this in the future
// If I could use a typedef here, I would.
#define Cell ivec2

const float maxWingAngle = TAU/5.0;

vec2 animCenter;
vec2 cellWidth;
float accel;
float speed;
float timeToAccel;
float distToAccel;

//const float startup = 0.25;
const float startup = 0.0;


float baseDistFromTime(float t) {
  float d = 0.0;
  d += accel * pow(min(t,timeToAccel),2.0)/2.0;
  d += speed * max(0.0, t-timeToAccel);
  return d;
}
float baseTimeFromDist(float d) {
  if(d>=distToAccel) return (d-distToAccel)/speed + timeToAccel;
  if(d>=0.0) return sqrt(2.0*d/accel);
  return 0.0;
}

float path(float t, float r0) {
  t = max(0.0, t-baseTimeFromDist(r0*1.2));
  t = max(0.0, t-startup);
  return r0 + baseDistFromTime(t);
}

float invPath(float t, float r, bool top) {
  float r0_min=0.0, r0_max=r, r0_mid;    
  for(int i=0; i<4; i++) {
      r0_mid = mix(r0_min, r0_max, 0.5);
      float r_test = path(t, r0_mid);
      if(top ^^ r_test<=r) {
          r0_max = r0_mid;
      } else {
          r0_min = r0_mid;            
      }
  }
  return r0_mid;
}

void cellIDs(vec2 pos, float t, out Cell id1, out Cell id2) {
  pos -= animCenter;    
  float r = length(pos);
  vec2 ray = pos/r;

  vec2 orig_pos = ray*invPath(t, r, true);        
  id1 = ivec2(orig_pos / cellWidth);
    
  orig_pos = ray*invPath(t,r,false);        
  id2 = ivec2(orig_pos / cellWidth);
}

struct Butterfly {
  vec2 pos;
  float rotation;
  float wingAngle;
  float opacity;
};

vec2 pathNoise(vec2 ray, vec2 hash, float d) {
  vec2 offset;
  offset.x = 2.0*simplex2D(vec2(hash.x, 1.0*d/speed))-1.0;
  offset.y = 2.0*simplex2D(vec2(hash.y, 1.0*d/speed))-1.0;
  
  vec2 par  = dot(offset, ray)*ray;
  vec2 perp = offset - par;
  return par*0.5 + perp*1.25;
}

Butterfly butterfly(Cell id, float t) {
  Butterfly b;
  b.pos = animCenter + (vec2(id)+0.5)*cellWidth;
  b.rotation = 0.0;

  float r = length(b.pos - animCenter);
  vec2 ray = normalize(vec2(id)+0.5);
  //b.rotation = atan(ray.y, ray.x)-TAU/4.0;

  t = max(0.0, t-baseTimeFromDist(r*1.2));
  b.opacity = smoothstep(0.0, 0.2, t/uDuration);
  
  b.wingAngle = maxWingAngle * sin(
      5.0*TAU*smoothstep(0.0, startup+timeToAccel, t) +
      3.0*TAU*smoothstep(timeToAccel+0.5, timeToAccel+2.0, t)
  );
  t = max(0.0, t-startup);
  
  float dt = 0.1;
  vec2 h = hash22(vec2(id) + uSeed);
  
  float r1 = baseDistFromTime(t);
  float r2 = baseDistFromTime(t+dt);
  vec2 offset1 = pathNoise(ray, h, r1)*cellWidth;
  vec2 offset2 =  pathNoise(ray, h, r2)*cellWidth;
  vec2 pos1 = ray*r1 + offset1;
  vec2 pos2 = ray*r2 + offset2;
  
  vec2 vel_dir = normalize(pos2-pos1);
  b.rotation = atan(vel_dir.y, vel_dir.x)-TAU/4.0;
  b.pos += pos1;
  
  return b;
}

vec4 renderButterfliesNear(Cell id, vec2 windowCoord, float time) {
  vec4 color = vec4(0,0,0,0);
  
  // id is meant to be the *most likely* closest butterfly to this pixel
  // However, we want them to be able to fly around freely.
  const int BORDER_SIZE = 3;
  for(int i=-BORDER_SIZE; i<=BORDER_SIZE; i++) {
      for(int j=-BORDER_SIZE; j<=BORDER_SIZE; j++) {
          Butterfly b = butterfly(id + ivec2(i,j), time);
          vec4 c = butterfly(windowCoord, b.pos, 10.0, b.rotation, b.wingAngle);
          c.a = c.a*b.opacity;
          color = blend(c, color);
      }
  }

  return color;
}

vec4 pixelColor(in vec2 texCoord, in vec2 resolution, float time, inout float window_opacity) {
  vec4 color = vec4(1,1,1,0);
  
  // Get the IDs of the likely closest butterfly at this location
  // This is *really* important, as it lets us call the main render function far far fewer
  // times than the actual number of butterflies
  ivec2 cell1, cell2;    
  vec2 windowCoord = texCoord*resolution;
  cellIDs(windowCoord, time, cell1, cell2);
  //color.xy = vec2(cell1)*cellWidth / resolution + 0.5;
  //color.xy = mix(color.xy, 2.0*vec2(cell2)*cellWidth / resolution + 0.5, 0.5);

  // Fade out the center of the window
  float r = length(windowCoord - animCenter);
  float timeToInner = time-baseTimeFromDist(r*1.5);
  window_opacity  = smoothstep(0.1, 0.0, timeToInner/uDuration);
  
  // Fade out if we take too long
  float timeToEnd = uDuration - time;
  window_opacity  *= smoothstep(0.0, 0.25, timeToEnd/uDuration);
  color.r = window_opacity;

  // We need to render around 2 different IDs. One for the butterflies
  // that are waiting or just starting, and one for the ones flying above
  color = blend(renderButterfliesNear(cell1, windowCoord, time), color);
  color = blend(renderButterfliesNear(cell2, windowCoord, time), color);
  return color;
}

// // For shaderToy
// void mainImage(out vec4 fragColor, in vec2 fragCoord) {

//     uSize = iResolution.xy;
//     uDuration = 1.0;
    
//     animCenter = uSize/2.0;
//     cellWidth = vec2(40.0, 40.0);

//     speed = max(uSize.x, uSize.y)/uDuration;
//     accel = speed / (0.3*uDuration);
//     timeToAccel = speed/accel;
//     distToAccel = accel*timeToAccel*timeToAccel/2.0;


//     float opacity = 0.0;
//     fragColor = pixelColor(fragCoord/iResolution.xy, iResolution.xy, iTime, opacity);
//     fragColor.a = opacity;
// }

void main() {
  animCenter = uStartPos;
  cellWidth = vec2(40.0, 40.0);

  float dist = length(uSize)*1.5;
  float timeAtSpeed = 0.7*(uDuration - startup);
  float timeAtAccel = 0.3*(uDuration - startup);
  speed = dist/(timeAtSpeed + 0.5*timeAtAccel);
  accel = speed/timeAtAccel;

  timeToAccel = speed/accel;
  distToAccel = accel*timeToAccel*timeToAccel/2.0;

  // Get the color from the window texture.
  vec4 oColor = getInputColor(iTexCoord.st);
  float opacity = 0.0;
  vec4 color = pixelColor(iTexCoord.st, uSize, uProgress * uDuration, opacity);
  color = blend(color, oColor);
  color.a *= opacity;

  setOutputColor(color);
}