import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  setDockBadge: (count: number) => {
    ipcRenderer.send("dock-badge:set", count);
  },
});

export {};
