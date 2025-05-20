// Preload script
const { contextBridge, ipcRenderer } = require('electron');

// Função para validar o caminho do arquivo
function validateFilePath(filePath) {
    if (!filePath) {
        throw new Error('Caminho do arquivo não fornecido');
    }
    return filePath;
}

// Função para validar o texto
function validateText(text) {
    if (!text) {
        throw new Error('Texto não fornecido');
    }
    return text;
}

// Expõe as APIs de forma segura para o processo de renderização
contextBridge.exposeInMainWorld('electronAPI', {
    // API para extração de texto
    extractText: (filePath) => {
        return new Promise((resolve, reject) => {
            try {
                const validPath = validateFilePath(filePath);
                ipcRenderer.invoke('extract-text', validPath)
                    .then(result => resolve(result))
                    .catch(error => reject(error));
            } catch (error) {
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
            } catch (error) {
                reject(error);
            }
        });
    }
});