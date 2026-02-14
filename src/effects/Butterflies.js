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

// SPDX-FileCopyrightText: Joshua Smith <jsmith62831@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

import * as utils from "../utils.js";

// We import the ShaderFactory only in the Shell process as it is not required in the
// preferences process. The preferences process does not create any shader instances, it
// only uses the static metadata of the effect.
const ShaderFactory = await utils.importInShellOnly("./ShaderFactory.js");

const _ = await utils.importGettext();

//////////////////////////////////////////////////////////////////////////////////////////
//  Butterflies!                                                                        //
// Whisks your windows away in a cloud of beautiful bufferflies                         //
//////////////////////////////////////////////////////////////////////////////////////////

export default class Effect {

  constructor() {

    this.shaderFactory = new ShaderFactory(Effect.getNick(), (shader) => {
      // Store uniform locations of newly created shaders.
      shader._uSeed             = shader.get_uniform_location("uSeed");
      shader._uColor            = shader.get_uniform_location("uColor");
      shader._uStartPos         = shader.get_uniform_location("uStartPos");
      shader._uButterflySpacing = shader.get_uniform_location("uButterflySpacing");
      shader._uButterflySize    = shader.get_uniform_location("uButterflySize");

      // Write all uniform values at the start of each animation.
      shader.connect("begin-animation", (shader, settings, forOpening, testMode, actor) => {
        let seed = [testMode ? 0 : Math.random(), testMode ? 0 : Math.random()];


        // This is shamelessly ripped from the incinerate effect
        // If this option is set, we use the mouse pointer position. Because the actor
        // position may change after the begin-animation signal is called, we set the
        // uStartPos uniform during the update callback.
        if(settings.get_boolean('butterflies-use-pointer')) {
          shader._startPointerPos = global.get_pointer();
          shader._actor           = actor;
        } else {
          // Else, a random position along the window boundary is used as start position
          // for the incinerate effect.
          let startPos = seed[0] > seed[1] ? [seed[0], Math.floor(seed[1] + 0.5)] :
                                              [Math.floor(seed[0] + 0.5), seed[1]];

          shader.set_uniform_float(shader._uStartPos, 2, startPos);
          shader._startPointerPos = null;
        }

        // We don't want the butterflies so big they clip or overlap the others
        // too much, so we cap the size of the butterflies at what the user sets
        // for the spacing.
        // TODO: maybe enforce this in the UI somehow?
        let spacing = settings.get_double('butterflies-spacing');
        let size = settings.get_double('butterflies-size');

        // clang-format off
        shader.set_uniform_float(shader._uSeed,             2, seed);
        shader.set_uniform_float(shader._uColor,            3, utils.parseColor(settings.get_string('butterflies-color')));
        shader.set_uniform_float(shader._uButterflySpacing, 1, [spacing]);
        shader.set_uniform_float(shader._uButterflySize,    1, [Math.min(size, spacing)]);
        // clang-format on
      });

      
      // This is shamelessly ripped from the incinerate effect:
      // If the mouse pointer position is used as start position, we set the uStartPos
      // uniform during the update callback as the actor position may not be set up
      // properly before the begin animation callback.
      shader.connect('update-animation', (shader) => {
        if (shader._startPointerPos) {
          const [x, y]               = shader._startPointerPos;
          const [ok, localX, localY] = shader._actor.transform_stage_point(x, y);

          if (ok) {
            let startPos = [
              Math.max(0.0, Math.min(1.0, localX / shader._actor.width)),
              Math.max(0.0, Math.min(1.0, localY / shader._actor.height))
            ];
            shader.set_uniform_float(shader._uStartPos, 2, startPos);
          }
        }
      });

      // Make sure to drop the reference to the actor.
      shader.connect('end-animation', (shader) => {
        shader._actor = null;
      });

    });
  }

  // ---------------------------------------------------------------------------- metadata

  // The effect is available on all GNOME Shell versions supported by this extension.
  static getMinShellVersion() {
    return [3, 38];
  }

  // This will be called in various places where a unique identifier for this effect is
  // required. It should match the prefix of the settings keys which store whether the
  // effect is enabled currently (e.g. '*-enable-effect'), and its animation time
  // (e.g. '*-animation-time'). Also, the shader file and the settings UI files should be
  // named likes this.
  static getNick() {
    return "butterflies";
  }

  // This will be shown in the sidebar of the preferences dialog as well as in the
  // drop-down menus where the user can choose the effect.
  static getLabel() {
    return _("Butterflies");
  }

  // -------------------------------------------------------------------- API for prefs.js

  // This is called by the preferences dialog whenever a new effect profile is loaded. It
  // binds all user interface elements to the respective settings keys of the profile.
  static bindPreferences(dialog) {
    dialog.bindAdjustment('butterflies-animation-time');
    dialog.bindAdjustment('butterflies-spacing');
    dialog.bindAdjustment('butterflies-size');
    dialog.bindSwitch('butterflies-use-pointer');
    dialog.bindColorButton('butterflies-color');
  }

  // ---------------------------------------------------------------- API for extension.js

  // The getActorScale() is called from extension.js to adjust the actor's size during the
  // animation. This is useful if the effect requires drawing something beyond the usual
  // bounds of the actor. This only works for GNOME 3.38+.
  static getActorScale(settings, forOpening, actor) {
    return { x: 1.5, y: 1.5 };
  }
}