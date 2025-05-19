const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Tesseract = require('tesseract.js');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'scripts', 'preload.js'),
            contextIsolated: true,
            nodeIntegration: false,
            sandbox: true,
            enableRemoteModule: false,
            webSecurity: true,
            allowRunningInsecureContent: false
        },
        
        backgroundColor: '#ffffff',
        show: false
    });

    // Configura o CSP
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self'"]
            }
        });
    });

    mainWindow.loadFile('pages/index.html');
    
    // Mostra a janela quando estiver pronta
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    
    // Configura o DevTools apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Filtra mensagens do console
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (message.includes('Autofill')) {
            event.preventDefault();
        }
    });
}

app.whenReady().then(createWindow);

// Handler para extração de texto
ipcMain.handle('extract-text', async (event, imagePath) => {
    try {
        // Verifica se o arquivo existe
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Arquivo não encontrado: ${imagePath}`);
        }

        console.log('Iniciando extração de texto da imagem:', imagePath);
        
        const result = await Tesseract.recognize(
            imagePath,
            'por', // Idioma português
            {
                logger: m => {
                    console.log('Progresso:', m);
                    if (m.status === 'recognizing text') {
                        mainWindow.webContents.send('ocr-progress', m.progress);
                    }
                }
            }
        );

        if (!result || !result.data || !result.data.text) {
            throw new Error('Nenhum texto foi extraído da imagem');
        }

        console.log('Texto extraído com sucesso');
        return result.data.text;
    } catch (error) {
        console.error('Erro na extração de texto:', error);
        throw error;
    }
});

// Salva o texto extraído em um arquivo
ipcMain.handle('save-text', async (event, text) => {
    try {
        if (!text || typeof text !== 'string') {
            throw new Error('Texto inválido para salvar');
        }

        const { filePath } = await dialog.showSaveDialog({
            title: "Salvando o texto extraído",
            defaultPath: path.join(__dirname, 'textOutput', 'texto_extraído.txt'),
            filters: [{name: 'Text Files', extensions:['txt'] }],
        });

        if (!filePath) {
            throw new Error('Nenhum local foi selecionado para salvar o arquivo');
        }

        // Garante que o diretório existe
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, text, 'utf8');
        console.log('Arquivo salvo com sucesso em:', filePath);
        return filePath;
    } catch (error) {
        console.error('Erro ao salvar arquivo:', error);
        throw error;
    }
});

// Tratamento de fechamento da aplicação
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});