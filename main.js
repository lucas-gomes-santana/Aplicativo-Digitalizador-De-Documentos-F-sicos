const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Tesseract = require('tesseract.js');

// Desabilita o hardware acceleration se necessário
app.disableHardwareAcceleration();

// Configura flags de inicialização
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, '/scripts/preload.js'),
            contextIsolated: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
        // Adiciona configurações de renderização
        backgroundColor: '#ffffff',
        show: false // Não mostra a janela até estar pronta
    });

    mainWindow.loadFile('pages/index.html');
    
    // Mostra a janela quando estiver pronta
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    
    // Abre as ferramentas de desenvolvedor em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(createWindow);

// Handler para extração de texto
ipcMain.handle('extract-text', async (event, imagePath) => {
    try {
        const result = await Tesseract.recognize(
            imagePath,
            'por', // Idioma português
            {
                logger: m => console.log(m)
            }
        );
        return result.data.text;
    } catch (error) {
        console.error('Erro na extração de texto:', error);
        throw error;
    }
});

// Salva o texto extraído em um arquivo
ipcMain.handle('save-text', async (event, text) => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: "Salvando o texto extraído",
            defaultPath: path.join(__dirname, 'textOutput', 'texto_extraído.txt'),
            filters: [{name: 'Text Files', extensions:['txt'] }],
        });

        if(filePath) {
            require('fs').writeFileSync(filePath, text);
            return filePath;
        }

        return null;
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