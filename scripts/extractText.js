const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const resultTextarea = document.getElementById('result');
const saveBtn = document.getElementById('save-btn');

// Drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() { dropArea.style.borderColor = '#0078d7'; }
function unhighlight() { dropArea.style.borderColor = '#ccc'; }

// Handle dropped/selected files
dropArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFiles, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles({ target: { files } });
}

async function handleFiles(e) {
  const file = e.target.files[0];
  if (!file) return;

  const imagePath = file.path;
  resultTextarea.value = "Processando...";

  try {
    const text = await window.electronAPI.extractText(imagePath);
    resultTextarea.value = text;
    saveBtn.disabled = false;
  } catch (err) {
    resultTextarea.value = `Erro: ${err.message}`;
  }
}

// Save button
saveBtn.addEventListener('click', async () => {
  const text = resultTextarea.value;
  if (!text) return;

  const savedPath = await window.electronAPI.saveText(text);
  if (savedPath) alert(`Texto salvo em:\n${savedPath}`);
});