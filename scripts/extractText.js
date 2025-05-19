document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const selectButton = document.getElementById('select-button');
    const resultArea = document.getElementById('result');
    const saveButton = document.getElementById('save-btn');

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
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                try {
                    resultArea.value = 'Processando imagem...';
                    const text = await window.electronAPI.extractText(file.path);
                    resultArea.value = text;
                    saveButton.disabled = false;
                } catch (error) {
                    resultArea.value = 'Erro ao processar a imagem: ' + error.message;
                    saveButton.disabled = true;
                }
            } else {
                resultArea.value = 'Por favor, selecione um arquivo de imagem válido.';
                saveButton.disabled = true;
            }
        }
    }

    // Manipula o salvamento do texto
    saveButton.addEventListener('click', async () => {
        const text = resultArea.value;
        if (text) {
            try {
                const savedPath = await window.electronAPI.saveText(text);
                if (savedPath) {
                    alert(`Texto salvo com sucesso em: ${savedPath}`);
                }
            } catch (error) {
                alert('Erro ao salvar o arquivo: ' + error.message);
            }
        }
    });
});