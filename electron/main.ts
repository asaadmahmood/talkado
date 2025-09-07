import {
  app,
  BrowserWindow,
  shell,
  session,
  systemPreferences,
  ipcMain,
} from "electron";
import { join } from "node:path";

// In production we load the built Vite assets via file://

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, "preload.cjs"),
    },
  });

  const defaultDevUrl = "http://localhost:5173";
  const remoteUrl = process.env.TALKADO_RENDERER_URL || defaultDevUrl;
  win.loadURL(remoteUrl).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to load remote URL", remoteUrl, err);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  if (process.platform === "darwin") {
    try {
      await systemPreferences.askForMediaAccess("microphone");
    } catch {
      // ignore
    }
  }

  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") {
        callback(true);
        return;
      }
      callback(false);
    },
  );

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });

  // Handle dock badge updates from renderer
  ipcMain.on("dock-badge:set", (_event, count: number) => {
    if (process.platform === "darwin") {
      const text = count && count > 0 ? String(count) : "";
      app.dock.setBadge(text);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
