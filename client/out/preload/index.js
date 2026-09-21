"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  send: (channel, data) => electron.ipcRenderer.send(channel, data),
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeAllListeners: (channel) => electron.ipcRenderer.removeAllListeners(channel)
});
