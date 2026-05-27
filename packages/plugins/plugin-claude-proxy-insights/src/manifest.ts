import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  DASHBOARD_WIDGET_EXPORT_NAME,
  DASHBOARD_WIDGET_SLOT_ID,
  FULL_PAGE_EXPORT_NAME,
  FULL_PAGE_SLOT_ID,
  PLUGIN_DISPLAY_NAME,
  PLUGIN_ID,
  PLUGIN_VERSION,
} from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: PLUGIN_DISPLAY_NAME,
  description:
    "Read-only insights for the Apple Claude Code proxy: quota / rate-limit status, failed tool calls, blocked network requests, and MCP server health. Attributes activity to the current company's agents via session_id when possible.",
  author: "Paperclip (fork)",
  categories: ["ui"],
  capabilities: [
    "ui.dashboardWidget.register",
    "ui.page.register",
    "ui.sidebar.register",
    // Read-only host access — never mutate Paperclip state from this plugin.
    "agents.read",
    "plugin.state.read",
    "plugin.state.write",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: DASHBOARD_WIDGET_SLOT_ID,
        displayName: "Claude Proxy Insights",
        exportName: DASHBOARD_WIDGET_EXPORT_NAME,
      },
      {
        type: "page",
        id: FULL_PAGE_SLOT_ID,
        displayName: "Claude Proxy Insights",
        exportName: FULL_PAGE_EXPORT_NAME,
      },
    ],
  },
};

export default manifest;
