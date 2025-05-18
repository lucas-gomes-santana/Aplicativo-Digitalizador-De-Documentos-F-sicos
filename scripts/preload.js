const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    extractText: (imagePath) => ipcRenderer.invoke('extract-text', imagePath),
    saveText: (text) => ipcRenderer.invoke('save-text', text),
});