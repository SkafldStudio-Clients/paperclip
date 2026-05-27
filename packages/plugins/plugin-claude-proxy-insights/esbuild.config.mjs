import esbuild from "esbuild";
import { createPluginBundlerPresets } from "@paperclipai/plugin-sdk/bundlers";

const presets = createPluginBundlerPresets({ uiEntry: "src/ui/index.tsx" });
const watch = process.argv.includes("--watch");

// node:sqlite is a Node built-in that the bundler cannot resolve; mark external.
const NODE_BUILTINS_EXTERNAL = ["node:sqlite"];

function withExternals(config) {
  return {
    ...config,
    external: [...(config.external ?? []), ...NODE_BUILTINS_EXTERNAL],
  };
}

const workerCtx = await esbuild.context(withExternals(presets.esbuild.worker));
const manifestCtx = await esbuild.context(presets.esbuild.manifest);
const uiCtx = await esbuild.context(presets.esbuild.ui);

if (watch) {
  await Promise.all([workerCtx.watch(), manifestCtx.watch(), uiCtx.watch()]);
  console.log("esbuild watch mode enabled for worker, manifest, and ui");
} else {
  await Promise.all([workerCtx.rebuild(), manifestCtx.rebuild(), uiCtx.rebuild()]);
  await Promise.all([workerCtx.dispose(), manifestCtx.dispose(), uiCtx.dispose()]);
}
