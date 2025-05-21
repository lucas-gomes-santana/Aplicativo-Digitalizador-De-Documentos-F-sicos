document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const selectButton = document.getElementById('select-button');
    const resultArea = document.getElementById('result');
    const saveButton = document.getElementById('save-btn');

    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    // Previne o comportamento padrão de arrastar e soltar
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Destaca a área de drop quando o arquivo está sobre ela
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    // Manipula o arquivo solto
    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFileSelect, false);
    
    // Adiciona o evento de clique no botão de seleção
    selectButton.addEventListener('click', () => {
        fileInput.click();
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropArea.classList.add('highlight');
    }

    function unhighlight(e) {
        dropArea.classList.remove('highlight');
    }

    function validateFile(file) {
        const extension = '.' + file.name.split('.').pop().toLowerCase();

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            throw new Error('Formato de arquivo não suportado. Use apenas JPG, JPEG ou PNG.');
        }

        if (file.size > MAX_FILE_SIZE) {
            throw new Error('Arquivo muito grande. Tamanho máximo permitido: 10MB');
        }

        return true;
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    async function handleFiles(files) {
        if (files && files.length > 0) {
            const file = files[0];

            try {
                validateFile(file);
                resultArea.value = 'Processando imagem...';
                const text = await window.electronAPI.extractText(file.path);
                resultArea.value = text;
                saveButton.disabled = false;

            } 
            catch (error) {
                resultArea.value = 'Erro: ' + error.message;
                saveButton.disabled = true;

            } 
            finally {
                if (fileInput.files.length > 0) {
                    fileInput.value = '';
                }
            }
        }
    }

    saveButton.addEventListener('click', async () => {
        const text = resultArea.value;

        if (text) {
            try {
                const savedPath = await window.electronAPI.saveText(text);
                
                if (savedPath) {
                    alert(`Texto salvo com sucesso em: ${savedPath}`);
                }
            } 
            
            catch (error) {
                alert('Erro ao salvar o arquivo: ' + error.message);
            }
        }
    });
});