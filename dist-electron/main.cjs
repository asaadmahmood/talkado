// electron/main.ts
var import_electron = require("electron");
var import_node_path = require("path");
function createMainWindow() {
  const win = new import_electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: (0, import_node_path.join)(__dirname, "preload.cjs")
    }
  });
  const defaultDevUrl = "http://localhost:5173";
  const remoteUrl = process.env.TALKADO_RENDERER_URL || defaultDevUrl;
  win.loadURL(remoteUrl).catch((err) => {
    console.error("Failed to load remote URL", remoteUrl, err);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    import_electron.shell.openExternal(url);
    return { action: "deny" };
  });
}
import_electron.app.whenReady().then(async () => {
  if (process.platform === "darwin") {
    try {
      await import_electron.systemPreferences.askForMediaAccess("microphone");
    } catch {
    }
  }
  import_electron.session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") {
        callback(true);
        return;
      }
      callback(false);
    }
  );
  createMainWindow();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
  import_electron.ipcMain.on("dock-badge:set", (_event, count) => {
    if (process.platform === "darwin") {
      const text = count && count > 0 ? String(count) : "";
      import_electron.app.dock.setBadge(text);
    }
  });
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron.app.quit();
});
