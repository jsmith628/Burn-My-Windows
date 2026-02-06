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

vec4 butterfly_wings(vec2 p) {

    float R2 = dot(p, p);
    float a = abs(atan(p.x, p.y));
   
    const float ANGLE1 = PI/16.0;
    const float ANGLE2 = 5.0*PI/16.0;
    const float ANGLE3 = 9.0*PI/16.0;
    const float ANGLE4 = 10.0*PI/16.0;
    const float ANGLE5 = 11.0*PI/16.0;
    const float ANGLE6 = 14.0*PI/16.0;
    const float ANGLE7 = 15.5*PI/16.0;
    
    
    //float s = pow(min(1.0, abs(a) / (PI/4.0)), 2.0);
    float s1 = mix(0.4, 1.0, smoothstep(ANGLE1, ANGLE2, a));
    float s2 = 0.015*(cos(8.0*TAU*(a-ANGLE2)/(ANGLE6-ANGLE2))+1.0); //use remap instead
    float s = s1*s1
                -(0.1-s2)*smoothstep(ANGLE2, ANGLE3, a)
                -(0.1-s2)*smoothstep(mix(ANGLE2, ANGLE3,0.9), ANGLE4, a)
                +(0.2-s2)*smoothstep(ANGLE4, ANGLE5, a)
                +(0.1-s2)*smoothstep(ANGLE5, ANGLE6, a)
                -(0.5)*smoothstep(ANGLE6, ANGLE7, a);
    
    
    float r = 100.0 * s;
    float r_inner = r*0.85
                * smoothstep(ANGLE1, ANGLE2, a)
                * mix(0.9, 1.0, smoothstep(ANGLE7, ANGLE6, a));
    
    vec4 color = vec4(0.0,0.0,0.0,0.0);
    if(R2 < r*r) color = vec4(0,0,0,1);
    if(R2 < r_inner*r_inner) color = vec4(0,0,1,1);
    return color;
}

vec4 body(vec2 x) {

    return vec4(0.0,0.0,0.0,0.0);
}

vec4 butterfly(vec2 x, vec2 position, float rotation, float wing_angle) {
    vec2 dx = x - position;
    dx = rotate(dx, -rotation);
    
    
    vec4 wings = butterfly_wings(dx /= vec2(1.0, cos(wing_angle)));
    vec4 body = body(x);
    return blend(wings, body);
}


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