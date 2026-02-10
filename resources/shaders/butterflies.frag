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

// The content from common.glsl is automatically prepended to each shader effect. This
// provides the standard input:

// vec2  iTexCoord:     Texture coordinates for retrieving the window input color.
// bool  uIsFullscreen: True if the window is maximized or in fullscreen mode.
// bool  uForOpening:   True if a window-open animation is ongoing, false otherwise.
// float uProgress:     A value which transitions from 0 to 1 during the animation.
// float uDuration:     The duration of the current animation in seconds.
// vec2  uSize:         The size of uTexture in pixels.
// float uPadding:      The empty area around the actual window (e.g. where the shadow
//                      is drawn). For now, this will only be set on GNOME.

// Furthermore, there are two global methods for reading the window input color and
// setting the shader output color. Both methods assume straight alpha:

// vec4 getInputColor(vec2 coords)
// void setOutputColor(vec4 outColor)

// The width of the fading effect is loaded from the settings.
uniform float uFadeWidth;

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


/*
struct Cell {
    int angular;
    int radial;
    int subsection;
};
const int angleSections = 2;
const float dr = 10.0;
Cell cellID(in vec2 p, int angleSections, float dr) {

    float r = length(p);
    float a = (atan(p.y, p.x)+PI)/TAU;
    float num = float(angleSections);

    Cell c;

    c.angular = int(floor(num*a)/num);
    c.radial = int(floor(r/dr));
    
    float remainder = (a-float(c.angular)) * num;
    float numSubsections = float(c.radial);
    c.subsection = int(floor(numSubsections*remainder) / numSubsections);

    return c;
}
*/

// Been developing using shader toy, but I want to log this progress in git
/*
// I want to leave open the option to use an ivec3 or a struct for this in the future
// If I could use a typedef here, I would.
#define Cell ivec2

const vec2 animCenter = vec2(960.0, 540.0)/2.0;
const vec2 cellWidth = vec2(20.0, 20.0);

const float speed = 400.0;

Cell cellID(vec2 pos, float t) {
    pos -= animCenter;
    vec2 ray = normalize(pos);
    pos -= ray*speed*t;
    Cell c = ivec2((pos) / cellWidth);
    return c;
}

struct Butterfly {
    vec2 pos;
    float rotation;
    float wingAngle;
};

Butterfly butterfly(Cell id, float t) {

    Butterfly b;
    b.pos = animCenter + (vec2(id)+0.5)*cellWidth;
    //b.rotation = TAU * smoothstep(-1.0, 1.0, sin(2.5*iTime));
    b.rotation = 0.0;
    
    float r = length(b.pos - animCenter);
    vec2 ray = normalize(vec2(id)+0.5);
    b.rotation = atan(ray.y, ray.x)-TAU/4.0;
    
    t = max(0.0, t-1.5*r/speed);
    b.pos += ray*speed*t*smoothstep(0.0, 0.5, t);
    
    b.wingAngle = TAU/4.0 * sin(t*10.0 +float(id.x + 37*id.y));
    
    return b;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){

    fragColor = vec4(1,1,1,0);

    ivec2 cell = cellID(fragCoord, iTime);
    fragColor.xy = vec2(cell)*cellWidth / iResolution.xy + 0.5;

    const int borderSize = 15;
    for(int i=-borderSize; i<=borderSize; i++) {
        for(int j=-borderSize; j<=borderSize; j++) {
            Butterfly b = butterfly(cell + ivec2(i,j), iTime);
            vec4 c = butterfly(fragCoord, b.pos, 10.0, b.rotation, b.wingAngle);
            fragColor = blend(c, fragColor);
        }
    }

}
*/

void main() {
  // Get the color from the window texture.
  vec4 oColor = getInputColor(iTexCoord.st);

  // Radial distance from window edge to the window's center.
  float dist = length(iTexCoord.st - 0.5) * 2.0 / sqrt(2.0);

  // This gradually dissolves from [1..0] from the outside to the center. We
  // switch the direction for opening and closing.
  float progress = uForOpening ? 1.0 - uProgress : uProgress;
  float mask = (1.0 - progress * (1.0 + uFadeWidth) - dist + uFadeWidth) / uFadeWidth;

  // Make the mask smoother.
  mask = smoothstep(0, 1, mask);

  // Apply the mask to the output.
  oColor.a *= mask;

  setOutputColor(oColor);
}