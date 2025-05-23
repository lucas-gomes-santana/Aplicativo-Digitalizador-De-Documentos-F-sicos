const { contextBridge, ipcRenderer } = require('electron');


function validateFilePath(filePath) {
    if (!filePath) {
        throw new Error('Caminho do arquivo não fornecido');
    }
    return filePath;
}

function validateText(text) {
    if (!text) {
        throw new Error('Texto não fornecido');
    }
    return text;
}

// API para extração de texto
contextBridge.exposeInMainWorld('electronAPI', {
    extractText: (filePath) => {
        return new Promise((resolve, reject) => {
            try {
                const validPath = validateFilePath(filePath);
                ipcRenderer.invoke('extract-text', validPath)
                    .then(result => resolve(result))
                    .catch(error => reject(error));
            } 
            catch (error) {
                reject(error);
            }
        });
    },

    // API para salvar texto
    saveText: (text) => {
        return new Promise((resolve, reject) => {
            try {
                const validText = validateText(text);
                ipcRenderer.invoke('save-text', validText)
                    .then(result => resolve(result))
                    .catch(error => reject(error));
            } 
            catch (error) {
                reject(error);
            }
        });
    },

    // API para correção de texto
    correctText: (text) => {
        return new Promise((resolve, reject) => {
            try {
                const validText = validateText(text);
                ipcRenderer.invoke('correct-text', validText)
                    .then(result => resolve(result))
                    .catch(error => reject(error));
            } 
            catch (error) {
                reject(error);
            }
        });
    }
});