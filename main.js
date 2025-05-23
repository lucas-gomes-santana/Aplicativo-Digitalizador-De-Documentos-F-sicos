const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const https = require('https');

let mainWindow;
let currentWorker = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,

        webPreferences: {
            preload: path.join(__dirname, 'scripts', 'preload.js'),
            contextIsolated: true,
            nodeIntegration: false,
            sandbox: false,
            enableRemoteModule: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
            nodeIntegrationInWorker: true
        },

        backgroundColor: '#ffffff',
        show: false
    });

    // Configura o CSP
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"]
            }
        });
    });

    mainWindow.loadFile('pages/index.html');
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

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
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Arquivo não encontrado: ${imagePath}`);
        }

        const ext = path.extname(imagePath).toLowerCase();

        if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
            throw new Error('Formato de arquivo não suportado. Use apenas JPG, JPEG ou PNG.');
        }

        console.log('Iniciando extração de texto da imagem:', imagePath);
        
        // Cancela qualquer worker anterior
        if (currentWorker) {
            await currentWorker.terminate();
        }

        // Cria novo worker
        currentWorker = await Tesseract.createWorker();
        await currentWorker.loadLanguage('por');
        await currentWorker.initialize('por');

        const result = await currentWorker.recognize(imagePath);

        if (!result || !result.data || !result.data.text) {
            throw new Error('Nenhum texto foi extraído da imagem');
        }

        console.log('Texto extraído com sucesso');
        return result.data.text;
    } 
    catch (error) {
        console.error('Erro na extração de texto:', error);
        throw error;
    } 
    finally {
        if (currentWorker) {
            await currentWorker.terminate();
            currentWorker = null;
        }
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

// Handler para correção de texto usando LanguageTool
ipcMain.handle('correct-text', async (event, text) => {
    try {
        if (!text || typeof text !== 'string') {
            throw new Error('Texto inválido para correção');
        }

        console.log('Enviando texto para correção:', text.substring(0, 100) + '...');

        return new Promise((resolve, reject) => {
            const postData = `text=${encodeURIComponent(text)}&language=pt-BR&enabledOnly=false`;

            const options = {
                hostname: 'api.languagetool.org',
                path: '/v2/check',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                    'Accept': 'application/json'
                }
            };

            console.log('Fazendo requisição para LanguageTool...');

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        console.log('Resposta recebida do LanguageTool');
                        
                        if (res.statusCode !== 200) {
                            throw new Error(`Erro na API: ${res.statusCode} - ${responseData}`);
                        }

                        const result = JSON.parse(responseData);
                        console.log('Resposta processada:', JSON.stringify(result).substring(0, 200) + '...');

                        if (!result.matches) {
                            console.log('Nenhuma correção necessária');
                            resolve(text);
                            return;
                        }

                        let correctedText = text;
                        // Aplica as correções na ordem inversa para não afetar os índices
                        result.matches.reverse().forEach(match => {
                            if (match.replacements && match.replacements.length > 0) {
                                const start = match.offset;
                                const end = match.offset + match.length;
                                const replacement = match.replacements[0].value;
                                console.log(`Corrigindo: "${text.substring(start, end)}" -> "${replacement}"`);
                                correctedText = correctedText.substring(0, start) + 
                                             replacement + 
                                             correctedText.substring(end);
                            }
                        });

                        console.log('Texto corrigido com sucesso');
                        resolve(correctedText);
                    } catch (error) {
                        console.error('Erro ao processar resposta:', error);
                        console.error('Resposta recebida:', responseData);
                        reject(new Error('Erro ao processar resposta do LanguageTool: ' + error.message));
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Erro na requisição:', error);
                reject(new Error('Erro na comunicação com LanguageTool: ' + error.message));
            });

            req.write(postData);
            req.end();
        });
    } catch (error) {
        console.error('Erro na correção de texto:', error);
        throw error;
    }
});

// Tratamento de fechamento da aplicação
app.on('window-all-closed', async () => {
    if (currentWorker) {
        await currentWorker.terminate();
        currentWorker = null;
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});