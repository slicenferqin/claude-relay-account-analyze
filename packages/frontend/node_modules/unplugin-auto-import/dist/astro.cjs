"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _chunkBZP5WN5Dcjs = require('./chunk-BZP5WN5D.cjs');
require('./chunk-GOGBRDVI.cjs');

// src/astro.ts
function astro_default(options) {
  return {
    name: "unplugin-auto-import",
    hooks: {
      "astro:config:setup": async (astro) => {
        var _a;
        (_a = astro.config.vite).plugins || (_a.plugins = []);
        astro.config.vite.plugins.push(_chunkBZP5WN5Dcjs.unplugin_default.vite(options));
      }
    }
  };
}


module.exports = astro_default;
exports.default = module.exports;