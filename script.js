// --- global ---

let workspaceState = [];
let activeFileId = null;
let activeFolder = null; 
let selectedIds = new Set();

const treeContainer = document.getElementById('fileTree');
const editorArea = document.getElementById('markdownInput');
const highlightLayer = document.getElementById('highlightLayer');
const lineNumbersDiv = document.getElementById('lineNumbers');
const previewArea = document.getElementById('previewOutput');
const fileNameInput = document.getElementById('inputNomeArquivo');

const btnThemeToggle = document.getElementById('btnThemeToggle');
const themeMenu = document.getElementById('themeMenu');
const folderUploader = document.getElementById('folderInput');
const fileUploader = document.getElementById('fileInput');
const btnAbrirPasta = document.getElementById('btnAbrirPasta');
const btnImportarArquivos = document.getElementById('btnImportarArquivos');

const editorPane = document.getElementById('editorPane');
const previewPane = document.getElementById('previewPane');
const resizerEl = document.getElementById('resizer');
const workspaceContainer = document.getElementById('workspaceContainer');

const terminalPane = document.getElementById('terminalPane');
const terminalOutput = document.getElementById('terminalOutput');
const btnToggleTerminal = document.getElementById('btnToggleTerminal');
const btnCloseTerminal = document.getElementById('btnCloseTerminal');
const btnClearTerminal = document.getElementById('btnClearTerminal');
const btnReiniciarSistema = document.getElementById('btnReiniciarSistema');

// --- tema ---
const temaSalvo = localStorage.getItem('novaCode_theme') || 'dark';
document.body.className = temaSalvo; 
document.documentElement.setAttribute('data-theme', temaSalvo);

let editorVisible = true;
let previewVisible = true;
let allFoldersCollapsed = false;

function logTerminal(message, type = 'info') {
    let div = document.createElement('div');
    div.className = `terminal-log ${type}`;
    let time = new Date().toLocaleTimeString();
    div.innerText = `[${time}] ${message}`;
    terminalOutput.appendChild(div);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

btnToggleTerminal.addEventListener('click', () => {
    terminalPane.style.display = terminalPane.style.display === 'none' ? 'flex' : 'none';
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

btnCloseTerminal.addEventListener('click', () => { terminalPane.style.display = 'none'; });
btnClearTerminal.addEventListener('click', () => {
    terminalOutput.innerHTML = '';
    logTerminal("Terminal limpo.", "system");
});

btnReiniciarSistema.addEventListener('click', () => {
    renderPreview();
    logTerminal("Execução atualizada com sucesso.", "success");
});

document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('#fileTree') && !e.target.closest('.file-item') && !e.target.closest('.folder-title-wrapper')) {
        e.preventDefault();
    }
});

btnThemeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu.style.display = themeMenu.style.display === 'block' ? 'none' : 'block';
});

document.addEventListener('click', () => { themeMenu.style.display = 'none'; });
themeMenu.addEventListener('click', (e) => { e.stopPropagation(); });

document.querySelectorAll('.custom-theme-menu .theme-item[data-theme]').forEach(item => {
    item.addEventListener('click', () => {
        let theme = item.getAttribute('data-theme');
        themeMenu.style.display = 'none';
        document.documentElement.setAttribute('data-theme', theme);

        document.documentElement.setAttribute('data-theme', theme);
        document.body.className = theme;

        localStorage.setItem('novaCode_theme', theme);
        
        renderPreview();
        logTerminal(`Tema alterado para: ${theme}`, "system");
    });
});

document.getElementById('btnToggleEditor').addEventListener('click', () => {
    editorVisible = !editorVisible;
    if (!editorVisible && !previewVisible) previewVisible = true;
    updatePaneVisibility();
});

document.getElementById('btnTogglePreview').addEventListener('click', () => {
    previewVisible = !previewVisible;
    if (!editorVisible && !previewVisible) editorVisible = true;
    updatePaneVisibility();
});

function updatePaneVisibility() {
    if (editorVisible && previewVisible) {
        editorPane.style.display = 'flex'; editorPane.style.width = '50%';
        previewPane.style.display = 'flex'; previewPane.style.width = '50%';
        resizerEl.style.display = 'block';
    } else if (editorVisible && !previewVisible) {
        editorPane.style.display = 'flex'; editorPane.style.width = '100%';
        previewPane.style.display = 'none'; resizerEl.style.display = 'none';
    } else if (!editorVisible && previewVisible) {
        editorPane.style.display = 'none';
        previewPane.style.display = 'flex'; previewPane.style.width = '100%';
        resizerEl.style.display = 'none';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

let isResizing = false;
resizerEl.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizerEl.classList.add('resizing');
    document.body.style.cursor = 'ew-resize';
    e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    let workspaceRect = workspaceContainer.getBoundingClientRect();
    let offsetX = e.clientX - workspaceRect.left;
    let totalWidth = workspaceRect.width;
    let editorPercent = (offsetX / totalWidth) * 100;
    if (editorPercent < 15) editorPercent = 15;
    if (editorPercent > 85) editorPercent = 85;
    editorPane.style.width = editorPercent + '%';
    previewPane.style.width = (100 - editorPercent) + '%';
});

window.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        resizerEl.classList.remove('resizing');
        document.body.style.cursor = 'default';
    }
});

function highlightCode(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateEditorDisplay() {
    let val = editorArea.value;
    highlightLayer.innerHTML = highlightCode(val) + '<br>';
    let lines = val.split('\n');
    let currentCursorPos = editorArea.selectionStart;
    let textUpToCursor = val.substring(0, currentCursorPos);
    let currentLineIndex = textUpToCursor.split('\n').length - 1;
    let html = '';
    for (let i = 0; i < lines.length; i++) {
        let isCurrent = i === currentLineIndex;
        let color = isCurrent ? 'var(--text-main)' : 'var(--text-muted)';
        let weight = isCurrent ? 'bold' : 'normal';
        html += `<div style="color: ${color}; font-weight: ${weight};">${i + 1}</div>`;
    }
    lineNumbersDiv.innerHTML = html;
}

editorArea.addEventListener('scroll', () => {
    highlightLayer.scrollTop = editorArea.scrollTop;
    highlightLayer.scrollLeft = editorArea.scrollLeft;
    lineNumbersDiv.style.transform = `translateY(-${editorArea.scrollTop}px)`;
});

editorArea.addEventListener('input', () => {
    persistActiveContent();
    renderPreview();
    updateEditorDisplay();

    if (rootFolderHandle && activeFileId) {
        let file = findFileById(workspaceState, activeFileId);
        if (file && file.handle && file.conteudoOriginal !== undefined) {
            if (file.conteudo !== file.conteudoOriginal) {
                unsavedFiles.add(activeFileId);
            } else {
                unsavedFiles.delete(activeFileId);
            }
            atualizarIndicadoresNaoSalvos();
        }
    } else {

        if (activeFileId) {
            unsavedFiles.delete(activeFileId);
            atualizarIndicadoresNaoSalvos();
        }
    }
})

editorArea.addEventListener('click', updateEditorDisplay);
editorArea.addEventListener('keyup', updateEditorDisplay);

editorArea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        let cursorPosition = editorArea.selectionStart;
        let textBefore = editorArea.value.substring(0, cursorPosition);
        let currentLineStart = textBefore.lastIndexOf('\n') + 1;
        let currentLine = textBefore.substring(currentLineStart);
        if (currentLine.trim() === '!') {
            e.preventDefault();
            let boilerplate = `<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Meu Site</title>\n</head>\n<body>\n    \n</body>\n</html>`;
            let textAfter = editorArea.value.substring(cursorPosition);
            editorArea.value = editorArea.value.substring(0, currentLineStart) + boilerplate + textAfter;
            persistActiveContent();
            renderPreview();
            updateEditorDisplay();
            logTerminal("Boilerplate HTML gerado via Atalho (! + Tab).", "success");
        }
    }
});

btnImportarArquivos.addEventListener('click', () => { fileUploader.click(); });

fileUploader.addEventListener('change', async (e) => {
    let files = e.target.files;
    if (!files.length) return;
    let targetFolder = activeFolder ? findFolderByPath(workspaceState, activeFolder) : null;
    let destination = targetFolder ? targetFolder.itens : workspaceState;
    for (let file of files) {
        let fileName = file.name;
        let isImage = file.type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileName);
        let isZip = fileName.toLowerCase().endsWith('.zip') || fileName.toLowerCase().endsWith('.rar');
        let content = await new Promise((resolve) => {
            let reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target.result);
            if (isImage || isZip) reader.readAsDataURL(file);
            else reader.readAsText(file);
        });
        destination.push({
            tipo: 'arquivo', id: Date.now().toString() + Math.random(), nome: fileName,
            conteudo: content, isBinary: isImage, isCompressed: isZip, rawFile: file
        });
    }
    sortWorkspace(workspaceState);
    fileUploader.value = '';
    renderTree();
    logTerminal("Arquivos importados com sucesso.", "success");
});

document.getElementById('btnToggleAllFolders').addEventListener('click', () => {
    allFoldersCollapsed = !allFoldersCollapsed;
    function setCollapseRecursive(list, state) {
        list.forEach(item => {
            if (item.tipo === 'pasta') {
                item.aberta = !state;
                setCollapseRecursive(item.itens, state);
            }
        });
    }
    setCollapseRecursive(workspaceState, allFoldersCollapsed);
    renderTree();
});

fileNameInput.addEventListener('input', (e) => {
    let file = findFileById(workspaceState, activeFileId);
    if (file) {
        file.nome = e.target.value;
        sortWorkspace(workspaceState);
        renderPreview();
        renderTree();
    }
});

document.getElementById('btnNovaPasta').addEventListener('click', () => {
    openInputModal("Nova Pasta", "Digite o nome da pasta:", "", (name) => {
        let cleanName = name ? name.trim() : "";
        if (!cleanName) return;
        let newFolder = { tipo: 'pasta', nome: cleanName, aberta: false, itens: [] };
        if (activeFolder) {
            let parent = findFolderByPath(workspaceState, activeFolder);
            if (parent) parent.itens.push(newFolder);
            else workspaceState.push(newFolder);
        } else {
            workspaceState.push(newFolder);
        }
        sortWorkspace(workspaceState);
        renderTree();
        logTerminal(`Pasta "${cleanName}" criada.`, "success");
    });
});

document.getElementById('btnNovoArquivo').addEventListener('click', () => {
    openInputModal("Novo Arquivo", "Digite o nome:", "", (name) => {
        if (!name) return;
        let cleanName = name.trim();
        let newId = Date.now().toString();
        let isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(cleanName);
        let newFile = { tipo: 'arquivo', id: newId, nome: cleanName, conteudo: "", isBinary: isImage };
        if (activeFolder) {
            let targetFolder = findFolderByPath(workspaceState, activeFolder);
            if (targetFolder) targetFolder.itens.push(newFile);
            else workspaceState.push(newFile);
        } else {
            workspaceState.push(newFile);
        }
        sortWorkspace(workspaceState);
        loadFile(newId);
        renderTree();
        logTerminal(`Arquivo "${cleanName}" criado.`, "success");
    });
});

document.getElementById('btnDeletarItem').addEventListener('click', () => {
    executeDeletion();
});

function executeDeletion() {
    if (selectedIds.size > 0) {
        openConfirmModal("Excluir Selecionados", `Deseja excluir os ${selectedIds.size} itens selecionados?`, () => {
            selectedIds.forEach(idOrName => {
                extractAnyItem(workspaceState, idOrName);
                if (activeFileId === idOrName) {
                    activeFileId = null; editorArea.value = ""; editorArea.disabled = true;
                    previewArea.innerHTML = ""; fileNameInput.value = ""; updateEditorDisplay();
                }
                if (activeFolder === idOrName) activeFolder = null;
            });
            selectedIds.clear();
            let first = findFirstFile(workspaceState);
            if (first) loadFile(first.id);
            renderTree();
            logTerminal("Itens selecionados excluídos.", "error");
        });
    } else if (activeFileId) {
        openConfirmModal("Excluir", "Deseja excluir este arquivo?", () => {
            deleteItemById(workspaceState, activeFileId);
            activeFileId = null; editorArea.value = ""; editorArea.disabled = true;
            previewArea.innerHTML = ""; fileNameInput.value = ""; updateEditorDisplay();
            let first = findFirstFile(workspaceState);
            if (first) loadFile(first.id);
            renderTree();
            logTerminal("Arquivo excluído.", "error");
        });
    } else if (activeFolder) {
        openConfirmModal("Excluir Pasta", `Deseja excluir a pasta "${activeFolder}" e tudo dentro?`, () => {
            removeFolderRecursive(workspaceState, activeFolder);
            activeFolder = null;
            let first = findFirstFile(workspaceState);
            if (first) loadFile(first.id);
            renderTree();
            logTerminal("Pasta excluída.", "error");
        });
    } else {
        alert("Selecione um arquivo ou pasta para excluir.");
    }
}

document.getElementById('btnBaixarArquivo').addEventListener('click', () => {
    let file = findFileById(workspaceState, activeFileId);
    if (!file) return;
    let blob = new Blob([file.conteudo], {type: "text/plain;charset=utf-8"});
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = file.nome; link.click();
});

document.getElementById('btnBaixarTudo').addEventListener('click', async () => {
    let zip = new JSZip();
    function appendToZip(list, folderRef) {
        list.forEach(item => {
            if (item.tipo === 'arquivo') folderRef.file(item.nome, item.conteudo);
            else if (item.tipo === 'pasta') appendToZip(item.itens, folderRef.folder(item.nome));
        });
    }
    appendToZip(workspaceState, zip);
    let content = await zip.generateAsync({type: "blob"});
    let link = document.createElement("a"); link.href = URL.createObjectURL(content); link.download = "workspace.zip"; link.click();
    logTerminal("Workspace exportado em ZIP.", "success");
});

function loadFile(id) {
    let file = findFileById(workspaceState, id);
    if (file) {
        activeFileId = id;
        activeFolder = null;
        fileNameInput.value = file.nome;
        editorArea.value = file.isBinary ? "[Arquivo Binário de Imagem]" : file.conteudo;
        editorArea.disabled = !!file.isBinary;
        renderPreview();
        renderTree();
        updateEditorDisplay();
    }
}

function persistActiveContent() {
    let file = findFileById(workspaceState, activeFileId);
    if (file && !file.isBinary) file.conteudo = editorArea.value;

    localStorage.setItem('novaCode_files', JSON.stringify(workspaceState));
}

function findFileById(list, id) {
    for (let item of list) {
        if (item.tipo === 'arquivo' && item.id === id) return item;
        if (item.tipo === 'pasta') { let found = findFileById(item.itens, id); if (found) return found; }
    }
    return null;
}

function findFolderByPath(list, folderName) {
    for (let item of list) {
        if (item.tipo === 'pasta') {
            if (item.nome === folderName) return item;
            let found = findFolderByPath(item.itens, folderName);
            if (found) return found;
        }
    }
    return null;
}

function deleteItemById(list, id) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].tipo === 'arquivo' && list[i].id === id) {
            list.splice(i, 1);
            return true;
        }
        if (list[i].tipo === 'pasta' && deleteItemById(list[i].itens, id)) return true;
    }
    return false;
}

function extractAnyItem(list, targetKey) {
    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        if ((item.tipo === 'arquivo' && item.id === targetKey) || (item.tipo === 'pasta' && item.nome === targetKey)) {
            return list.splice(i, 1)[0];
        }
        if (item.tipo === 'pasta') { let res = extractAnyItem(item.itens, targetKey); if (res) return res; }
    }
    return null;
}

function findFirstFile(list) {
    for (let item of list) {
        if (item.tipo === 'arquivo') return item;
        if (item.tipo === 'pasta') { let res = findFirstFile(item.itens); if (res) return res; }
    }
    return null;
}

function removeFolderRecursive(list, folderName) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].tipo === 'pasta') {
            if (list[i].nome === folderName) { list.splice(i, 1); return true; }
            if (removeFolderRecursive(list[i].itens, folderName)) return true;
        }
    }
    return false;
}

function sortWorkspace(list) {
    list.sort((a, b) => {
        if (a.tipo === b.tipo) return a.nome.localeCompare(b.nome, undefined, { numeric: true, sensitivity: 'base' });
        return a.tipo === 'pasta' ? -1 : 1;
    });
    list.forEach(item => { if (item.tipo === 'pasta' && item.itens) sortWorkspace(item.itens); });
}

function renameFilePrompt(id) {
    let file = findFileById(workspaceState, id);
    if (!file) return;
    openInputModal("Renomear", "Novo nome:", file.nome, (newName) => {
        let cleanName = newName ? newName.trim() : "";
        if (!cleanName) return;
        file.nome = cleanName;
        if (activeFileId === id) fileNameInput.value = cleanName;
        sortWorkspace(workspaceState);
        renderTree();
        logTerminal(`Renomeado para "${cleanName}".`, "info");
    });
}

function renameFolderPrompt(folderName) {
    let folder = findFolderByPath(workspaceState, folderName);
    if (!folder) return;
    openInputModal("Renomear Pasta", "Novo nome:", folder.nome, (newName) => {
        let cleanName = newName ? newName.trim() : "";
        if (!cleanName) return;
        folder.nome = cleanName;
        sortWorkspace(workspaceState);
        renderTree();
        logTerminal(`Pasta renomeada para "${cleanName}".`, "info");
    });
}

async function extractZipFile(fileItem) {
    openConfirmModal("Extrair Arquivo", `Deseja extrair "${fileItem.nome}" aqui no diretório atual?`, async () => {
        try {
            let zip = new JSZip();
            let sourceData = fileItem.rawFile || fileItem.conteudo;
            let zipContent = await zip.loadAsync(sourceData);
            let newFolder = { tipo: 'pasta', nome: fileItem.nome.replace(/\.[^/.]+$/, ""), aberta: false, itens: [] };
            
            for (let [relativePath, zipEntry] of Object.entries(zipContent.files)) {
                if (zipEntry.dir) continue;
                let pathParts = relativePath.split('/');
                let fileName = pathParts.pop();
                if (fileName.startsWith('.') || relativePath.includes('__pycache__')) continue;
                let content = await zipEntry.async("text");
                let currentTarget = newFolder;
                for (let part of pathParts) {
                    if (!part) continue;
                    let sub = currentTarget.itens.find(i => i.tipo === 'pasta' && i.nome === part);
                    if (!sub) {
                        sub = { tipo: 'pasta', nome: part, aberta: false, itens: [] };
                        currentTarget.itens.push(sub);
                    }
                    currentTarget = sub;
                }
                let isImg = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileName);
                currentTarget.itens.push({
                    tipo: 'arquivo', id: Date.now().toString() + Math.random(), nome: fileName,
                    conteudo: content, isBinary: isImg, isCompressed: false
                });
            }
            
            if (activeFolder) {
                let parentFolder = findFolderByPath(workspaceState, activeFolder);
                if (parentFolder) parentFolder.itens.push(newFolder);
                else workspaceState.push(newFolder);
            } else {
                workspaceState.push(newFolder);
            }
            
            sortWorkspace(workspaceState);
            renderTree();
            logTerminal(`Arquivo compactado "${fileItem.nome}" extraído com sucesso.`, "success");
        } catch (err) {
            logTerminal("Erro ao extrair o arquivo compactado.", "error");
        }
    });
}

let contextTarget = { type: null, idOrName: null };
const contextMenu = document.getElementById('contextMenu');
const ctxExtract = document.getElementById('ctxExtract');
const ctxMoveRoot = document.getElementById('ctxMoveRoot');

document.addEventListener('click', () => { contextMenu.style.display = 'none'; });

function showContextMenu(e, type, idOrName, isCompressed = false, isInSubfolder = false) {
    e.preventDefault();
    e.stopPropagation();
    contextTarget = { type, idOrName };
    
    if (!selectedIds.has(idOrName)) {
        selectedIds.clear();
        selectedIds.add(idOrName);
        renderTree();
    }

    if (type === 'pasta') activeFolder = idOrName;
    
    if (type === 'arquivo' && isCompressed) {
        ctxExtract.style.display = 'flex';
        ctxExtract.innerHTML = `<i data-lucide="package-open"></i> Extrair Arquivo`;
    } else {
        ctxExtract.style.display = 'none';
    }

    if (isInSubfolder) ctxMoveRoot.style.display = 'flex';
    else ctxMoveRoot.style.display = 'none';

    let x = e.clientX, y = e.clientY;
    contextMenu.style.display = 'block';
    let w = contextMenu.offsetWidth, h = contextMenu.offsetHeight;
    if (x + w > window.innerWidth) x -= w;
    if (y + h > window.innerHeight) y -= h;
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function setupDrag(element, targetKey) {
    element.draggable = true;
    element.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', JSON.stringify({ targetKey }));
    });
}

function setupDropZone(element, folderName) {
    element.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
    element.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation();
        try {
            let payload = JSON.parse(e.dataTransfer.getData('text/plain'));
            let targetKey = payload.targetKey;
            if (targetKey === folderName) return;
            let movedItem = extractAnyItem(workspaceState, targetKey);
            let folderDest = findFolderByPath(workspaceState, folderName);
            if (movedItem && folderDest) {
                folderDest.itens.push(movedItem);
                sortWorkspace(workspaceState);
                renderTree();
                logTerminal("Item movido com sucesso.", "info");
            }
        } catch (err) {}
    });
}

treeContainer.addEventListener('dragover', (e) => { e.preventDefault(); });
treeContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    try {
        let payload = JSON.parse(e.dataTransfer.getData('text/plain'));
        let targetKey = payload.targetKey;
        let movedItem = extractAnyItem(workspaceState, targetKey);
        if (movedItem) {
            workspaceState.push(movedItem);
            sortWorkspace(workspaceState);
            renderTree();
            logTerminal("Item movido para a raiz.", "info");
        }
    } catch (err) {}
});

document.getElementById('ctxNewFile').addEventListener('click', () => {
    contextMenu.style.display = 'none';
    let targetFolder = contextTarget.type === 'pasta' ? contextTarget.idOrName : activeFolder;
    openInputModal("Novo Arquivo", "Digite o nome:", "", (name) => {
        if (!name) return;
        let cleanName = name.trim();
        let newId = Date.now().toString();
        let newFile = { tipo: 'arquivo', id: newId, nome: cleanName, conteudo: "", isBinary: false };
        if (targetFolder) {
            let parent = findFolderByPath(workspaceState, targetFolder);
            if (parent) parent.itens.push(newFile); else workspaceState.push(newFile);
        } else { workspaceState.push(newFile); }
        sortWorkspace(workspaceState);
        loadFile(newId);
        renderTree();
    });
});

document.getElementById('ctxNewFolder').addEventListener('click', () => {
    contextMenu.style.display = 'none';
    let targetFolder = contextTarget.type === 'pasta' ? contextTarget.idOrName : activeFolder;
    openInputModal("Nova Pasta", "Digite o nome da pasta:", "", (name) => {
        let cleanName = name ? name.trim() : "";
        if (!cleanName) return;
        let newFolder = { tipo: 'pasta', nome: cleanName, aberta: false, itens: [] };
        if (targetFolder) {
            let parent = findFolderByPath(workspaceState, targetFolder);
            if (parent) parent.itens.push(newFolder); else workspaceState.push(newFolder);
        } else { workspaceState.push(newFolder); }
        sortWorkspace(workspaceState);
        renderTree();
    });
});

document.getElementById('ctxRename').addEventListener('click', () => {
    contextMenu.style.display = 'none';
    if (contextTarget.type === 'arquivo') renameFilePrompt(contextTarget.idOrName);
    else if (contextTarget.type === 'pasta') renameFolderPrompt(contextTarget.idOrName);
});

document.getElementById('ctxDuplicate').addEventListener('click', () => {
    contextMenu.style.display = 'none';
    if (contextTarget.type === 'arquivo') {
        let file = findFileById(workspaceState, contextTarget.idOrName);
        if (file) {
            let suggestedName = 'copia_' + file.nome;
            openInputModal("Duplicar Arquivo", "Digite o nome da cópia:", suggestedName, (newName) => {
                let cleanName = newName ? newName.trim() : suggestedName;
                if (!cleanName) return;
                let newFile = {
                    tipo: 'arquivo', id: Date.now().toString() + Math.random(), nome: cleanName,
                    conteudo: file.conteudo, isBinary: file.isBinary, isCompressed: file.isCompressed, rawFile: file.rawFile
                };
                let parent = findParentFolderOfFile(workspaceState, file.id);
                if (parent) parent.itens.push(newFile); else workspaceState.push(newFile);
                sortWorkspace(workspaceState);
                renderTree();
                logTerminal(`Arquivo duplicado como "${cleanName}".`, "success");
            });
        }
    }
});

document.getElementById('ctxMoveRoot').addEventListener('click', () => {
    contextMenu.style.display = 'none';
    let item = extractAnyItem(workspaceState, contextTarget.idOrName);
    if (item) {
        workspaceState.push(item);
        sortWorkspace(workspaceState);
        renderTree();
        logTerminal("Item movido para a raiz.", "info");
    }
});

document.getElementById('ctxExtract').addEventListener('click', () => {
    contextMenu.style.display = 'none';
    if (contextTarget.type === 'arquivo') {
        let file = findFileById(workspaceState, contextTarget.idOrName);
        if (file) extractZipFile(file);
    }
});

document.getElementById('ctxDownload').addEventListener('click', () => {
    contextMenu.style.display = 'none';
    if (contextTarget.type === 'arquivo') {
        let file = findFileById(workspaceState, contextTarget.idOrName);
        if (file) {
            let blob = new Blob([file.conteudo], {type: "text/plain;charset=utf-8"});
            let link = document.createElement("a");
            link.href = URL.createObjectURL(blob); link.download = file.nome; link.click();
        }
    }
});

document.getElementById('ctxDelete').addEventListener('click', () => {
    contextMenu.style.display = 'none';
    executeDeletion();
});

function findParentFolderOfFile(list, fileId) {
    for (let item of list) {
        if (item.tipo === 'pasta') {
            if (item.itens.some(sub => sub.tipo === 'arquivo' && sub.id === fileId)) return item;
            let deeper = findParentFolderOfFile(item.itens, fileId);
            if (deeper) return deeper;
        }
    }
    return null;
}

function getFileIconAndStyle(fileName) {
    let name = fileName.toLowerCase();
    if (name.endsWith('.py')) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11.95 2C8.3 2 8.5 3.6 8.5 3.6v2.6h6.1v.9H6.1s-3-.2-3 3.4v3.5s-.3 3.4 3.4 3.4h1.9v-2.3s0-1.6 1.6-1.6h4.5s1.5 0 1.5-1.5V6.7S15.9 2 11.95 2z" fill="#3572A5"/><path d="M12.05 22c3.65 0 3.45-1.6 3.45-1.6v-2.6h-6.1v-.9h6.1s3 .2 3-3.4v-3.5s.3-3.4-3.4-3.4h-1.9v2.3s0 1.6-1.6 1.6H7.1s-1.5 0-1.5 1.5v3.5s-.4 3.4 3.4 3.4h1.9v-2.3s0-1.6-1.6-1.6Z" fill="#F7DF1E"/><circle cx="9" cy="5.5" r="1" fill="#fff"/><circle cx="15" cy="18.5" r="1" fill="#fff"/></svg>` };
    if (name.endsWith('.java')) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 10h10v5a3 3 0 01-3 3h-4a3 3 0 01-3-3v-5z" fill="#f89820"/><path d="M16 11h2a2 2 0 012 2v1a2 2 0 01-2 2h-2v-5z" fill="#5382a1"/><path d="M4 6h12v2H4z" fill="#e76f00"/><path d="M8 2c1 1 1 2 0 3s-1 2 0 3" stroke="#5382a1" stroke-width="1.5" stroke-linecap="round"/><path d="M12 2c1 1 1 2 0 3s-1 2 0 3" stroke="#5382a1" stroke-width="1.5" stroke-linecap="round"/></svg>` };
    if (name.endsWith('.md') || name.endsWith('.markdown')) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#083fa1"/><path d="M4 17V7h3l3 4 3-4h3v10h-2.5V10.5L11.5 14h-1L8 10.5V17H4z" fill="#fff"/></svg>` };
    if (name.endsWith('.js')) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#f7df1e"/><text x="4" y="17" fill="#000" font-size="11" font-weight="bold">JS</text></svg>` };
    if (name.endsWith('.html')) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#e34f26"/><path d="M5 4l1.5 14.5L12 20l5.5-1.5L19 4H5zm10.5 2.5l-0.5 7.5-3.5 1-3.5-1-0.5-7.5h8z" fill="#fff"/></svg>` };
    if (name.endsWith('.css')) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#264de4"/><path d="M5 4l1.5 14.5L12 20l5.5-1.5L19 4H5zm10.5 2.5l-0.5 7.5-3.5 1-3.5-1-0.5-7.5h8z" fill="#fff"/></svg>` };
    if (name.endsWith('.zip')) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" fill="#fbc02d"/><path d="M12 11v6m-2-4h4" stroke="#1976d2" stroke-width="2" stroke-linecap="round"/></svg>` };
    if (name.endsWith('.rar')) return { svg: `<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="4" fill="#2d3748"/><path d="M2 6h28v7H2z" fill="#e53e3e"/><path d="M2 13h28v7H2z" fill="#3182ce"/><path d="M2 20h28v7H2z" fill="#38a169"/><path d="M5 9h2v2H5zM5 16h2v2H5zM5 23h2v2H5z" fill="#f6e05e"/><path d="M13 4h6v24h-6z" fill="#ed8936"/><path d="M12 4h8v3a2 2 0 01-2 2h-4a2 2 0 01-2-2V4z" fill="#fbd38d"/><path d="M13 13h6v4h-6z" fill="#dd6b20"/><path d="M11 14h10v10H11z" fill="#fff"/><path d="M13 16h6v6h-6z" fill="#f7fafc"/><path d="M15 18h2v2h-2z" fill="#cbd5e0"/></svg>` };
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name)) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#4caf50"/><circle cx="8" cy="9" r="2" fill="#fff"/><path d="M4 18l4-5 3 4 5-7 4 8H4z" fill="#fff"/></svg>` };
    if (name.endsWith('.txt')) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#6c757d"/><path d="M7 7h10M7 11h10M7 15h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>` };
    if (name.endsWith('.config') || name.endsWith('.env')) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#607d8b"/><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" fill="#fff"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="#fff" stroke-width="1.5"/></svg>` };
    if (name.endsWith('.json')) return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#fbc02d"/><path d="M8 8l-3 4 3 4M16 8l3 4-3 4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` };
    return { svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#4a5568"/><path d="M7 8h10M7 12h10M7 16h6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>` };
}

function renderTree() {
    treeContainer.innerHTML = "";
    if (workspaceState.length === 0) {
        treeContainer.innerHTML = `<div style="padding: 1.5rem 1rem; color: var(--text-muted); text-align: center; font-size: 0.8rem;">Workspace vazio.</div>`;
        return;
    }
    function buildList(items, parentElement, isInSubfolder = false) {
        items.forEach((item) => {
            let isCompressed = item.tipo === 'arquivo' && (item.nome.toLowerCase().endsWith('.zip') || item.nome.toLowerCase().endsWith('.rar'));
            if (item.tipo === 'pasta') {
                let folderEl = document.createElement('div');
                let isSelected = selectedIds.has(item.nome) || item.nome === activeFolder;
                folderEl.className = isSelected ? "folder-item selected" : "folder-item";
                if (item.aberta === false) folderEl.classList.add('collapsed');
                
                let titleEl = document.createElement('div');
                titleEl.className = "folder-title-wrapper";
                setupDrag(titleEl, item.nome);
                setupDropZone(titleEl, item.nome);
                titleEl.oncontextmenu = (e) => showContextMenu(e, 'pasta', item.nome, false, isInSubfolder);

                titleEl.innerHTML = `
                    <div class="folder-name" style="display: flex; align-items: center; gap: 6px; width: 100%;" onclick="selectItem('${item.nome}', event)">
                        <span class="folder-arrow" onclick="toggleFolder('${item.nome}', event)">▼</span>
                        <i data-lucide="folder" style="color: #dcb67a;"></i>
                        <span>${item.nome}</span>
                    </div>`;
                folderEl.appendChild(titleEl);

                let contentEl = document.createElement('div');
                contentEl.className = "folder-content";
                buildList(item.itens, contentEl, true);
                folderEl.appendChild(contentEl);
                parentElement.appendChild(folderEl);
            } else if (item.tipo === 'arquivo') {
                let fileEl = document.createElement('div');
                let isSelected = selectedIds.has(item.id) || item.id === activeFileId;
                fileEl.className = isSelected ? "file-item selected" : "file-item";
                setupDrag(fileEl, item.id);
                fileEl.oncontextmenu = (e) => showContextMenu(e, 'arquivo', item.id, isCompressed, isInSubfolder);

                let meta = getFileIconAndStyle(item.nome);
                let isUnsaved = rootFolderHandle && item.handle && unsavedFiles.has(item.id);
                fileEl.innerHTML = `
                    <div class="file-name" onclick="selectItem('${item.id}', event)">
                        <span>${meta.svg}</span>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${item.nome}</span>
                        <span class="unsaved-dot" style="display: ${isUnsaved ? 'inline-block' : 'none'}; width: 6px; height: 6px; background-color: var(--text-main); border-radius: 50%; margin-left: auto;"></span>
                    </div>`;
                parentElement.appendChild(fileEl);
            }
        });
    }
    buildList(workspaceState, treeContainer, false);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleFolder(folderName, event) {
    event.stopPropagation();
    function toggleRecursive(list) {
        for (let item of list) {
            if (item.tipo === 'pasta') {
                if (item.nome === folderName) { item.aberta = !item.aberta; return true; }
                if (toggleRecursive(item.itens)) return true;
            }
        }
        return false;
    }
    toggleRecursive(workspaceState);
    renderTree();
}

function selectItem(idOrName, event) {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
        if (selectedIds.has(idOrName)) selectedIds.delete(idOrName);
        else selectedIds.add(idOrName);
    } else {
        selectedIds.clear();
        selectedIds.add(idOrName);
        if (typeof idOrName === 'string' && isNaN(idOrName)) {
            activeFolder = (activeFolder === idOrName) ? null : idOrName;
            activeFileId = null;
        } else {
            loadFile(idOrName);
        }
    }
    renderTree();
}

function renderPreview() {
    let file = findFileById(workspaceState, activeFileId);
    if (!file) return;
    let rawText = editorArea.value;
    let ext = file.nome.includes('.') ? file.nome.split('.').pop().toLowerCase() : '';
    previewArea.innerHTML = "";

    if (file.isBinary && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.nome)) {
        previewArea.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%;"><img src="${file.conteudo}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:4px;"></div>`;
        return;
    }

    if (ext === 'html') {
        let iframe = document.createElement('iframe');
        iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = 'none';
        iframe.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim() || '#1e1e1e';
        previewArea.appendChild(iframe);
        
        let finalHtml = rawText;
        let captureScript = `<script>
            const originalLog = console.log;
            console.log = function(...args) {
                originalLog.apply(console, args);
                window.parent.postMessage({ type: 'console-log', text: args.join(' ') }, '*');
            };
            window.addEventListener('error', function(e) {
                window.parent.postMessage({ type: 'console-error', text: e.message }, '*');
            });
        <\/script>`;
        
        if (finalHtml.includes('<head>')) finalHtml = finalHtml.replace('<head>', '<head>' + captureScript);
        else finalHtml = captureScript + finalHtml;

        iframe.contentDocument.open(); 
        iframe.contentDocument.write(finalHtml); 
        iframe.contentDocument.close();
        return;
    }

    if (ext === 'md' || ext === 'markdown') {
        let htmlContent = typeof marked !== 'undefined' ? marked.parse(rawText) : rawText.replace(/\n/g, '<br>');
        previewArea.innerHTML = htmlContent;
        return;
    }

    let escapedHtml = rawText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
    previewArea.innerHTML = `<div>${escapedHtml}</div>`;
}

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'console-log') {
        logTerminal(`[HTML Console] ${event.data.text}`, 'info');
    } else if (event.data && event.data.type === 'console-error') {
        logTerminal(`[HTML Erro] ${event.data.text}`, 'error');
    }
});

const modalOverlay = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalContainer = document.getElementById('modalContentContainer');
const modalBtnConfirm = document.getElementById('modalBtnConfirm');
const modalBtnCancel = document.getElementById('modalBtnCancel');

function openInputModal(title, message, initialValue, callback) {
    modalTitle.innerText = title; modalMessage.style.display = 'block'; modalMessage.innerText = message;
    modalContainer.innerHTML = `<input type="text" id="modalInputVal" value="${initialValue}">`;
    modalOverlay.style.display = 'flex';
    let inputEl = document.getElementById('modalInputVal'); inputEl.focus(); inputEl.select();
    modalBtnConfirm.onclick = () => { let val = inputEl.value; modalOverlay.style.display = 'none'; callback(val); };
    modalBtnCancel.onclick = () => modalOverlay.style.display = 'none';
}

function openConfirmModal(title, message, callback) {
    modalTitle.innerText = title; modalMessage.style.display = 'block'; modalMessage.innerText = message;
    modalContainer.innerHTML = ''; modalOverlay.style.display = 'flex';
    modalBtnConfirm.onclick = () => { modalOverlay.style.display = 'none'; callback(); };
    modalBtnCancel.onclick = () => modalOverlay.style.display = 'none';
}


// --- salvar nativo ---

let rootFolderHandle = null;
let currentFileHandle = null;
let unsavedFiles = new Set(); 

async function abrirPastaReal() {
    try {
        rootFolderHandle = await window.showDirectoryPicker();
        workspaceState = [];
        logTerminal(`📂 Pasta aberta: ${rootFolderHandle.name}`, 'system');
        await lerDiretorioReal(rootFolderHandle, workspaceState);
        sortWorkspace(workspaceState);
        renderTree();
        let first = findFirstFile(workspaceState);
        if (first) loadFile(first.id);
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(err);
            logTerminal(`Erro ao abrir pasta: ${err.message}`, 'error');
        }
    }
}

async function lerDiretorioReal(dirHandle, targetList) {
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'directory') {
            let subFolder = { tipo: 'pasta', nome: entry.name, aberta: false, itens: [], handle: entry };
            targetList.push(subFolder);
            await lerDiretorioReal(entry, subFolder.itens);
        } else if (entry.kind === 'file') {
            if (entry.name.startsWith('.')) continue;
            let fileData = await entry.getFile();
            let isImage = fileData.type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(entry.name);
            let content = isImage ? await readFileAsDataURL(fileData) : await fileData.text();
            
            targetList.push({
                tipo: 'arquivo',
                id: Date.now().toString() + Math.random(),
                nome: entry.name,
                conteudo: content,
                conteudoOriginal: content, // Salva o estado original para comparação inteligente
                isBinary: isImage,
                handle: entry 
            });
        }
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

document.getElementById('btnAbrirPasta').replaceWith(document.getElementById('btnAbrirPasta').cloneNode(true));
document.getElementById('btnAbrirPasta').addEventListener('click', abrirPastaReal);

// --- criar arquivo ---

document.getElementById('btnNovoArquivo').replaceWith(document.getElementById('btnNovoArquivo').cloneNode(true));
document.getElementById('btnNovoArquivo').addEventListener('click', () => {
    openInputModal("Novo Arquivo", "Digite o nome do arquivo:", "", async (name) => {
        if (!name) return;
        let cleanName = name.trim();
        
        if (rootFolderHandle) {
            try {
                let targetDir = rootFolderHandle;
                if (activeFolder) {
                    let folderObj = findFolderByPath(workspaceState, activeFolder);
                    if (folderObj && folderObj.handle) {
                        targetDir = folderObj.handle;
                    }
                }

                let newFileHandle = await targetDir.getFileHandle(cleanName, { create: true });
                let newId = Date.now().toString();
                let isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(cleanName);
                
                let newFile = {
                    tipo: 'arquivo',
                    id: newId,
                    nome: cleanName,
                    conteudo: "",
                    conteudoOriginal: "",
                    isBinary: isImage,
                    handle: newFileHandle
                };

                if (activeFolder) {
                    let parent = findFolderByPath(workspaceState, activeFolder);
                    if (parent) parent.itens.push(newFile);
                    else workspaceState.push(newFile);
                } else {
                    workspaceState.push(newFile);
                }

                sortWorkspace(workspaceState);
                loadFile(newId);
                renderTree();
                logTerminal(`📄 Arquivo criado e salvo no PC: ${cleanName}`, 'success');
            } catch (err) {
                console.error(err);
                logTerminal(`❌ Erro ao criar arquivo no PC: ${err.message}`, 'error');
            }
        } else {
            let newId = Date.now().toString();
            let isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(cleanName);
            let newFile = { tipo: 'arquivo', id: newId, nome: cleanName, conteudo: "", conteudoOriginal: "", isBinary: isImage };
            
            if (activeFolder) {
                let targetFolder = findFolderByPath(workspaceState, activeFolder);
                if (targetFolder) targetFolder.itens.push(newFile);
                else workspaceState.push(newFile);
            } else {
                workspaceState.push(newFile);
            }
            sortWorkspace(workspaceState);
            loadFile(newId);
            renderTree();
            logTerminal(`Arquivo "${cleanName}" criado na memória.`, "success");
        }
    });
});

document.getElementById('btnNovaPasta').replaceWith(document.getElementById('btnNovaPasta').cloneNode(true));
document.getElementById('btnNovaPasta').addEventListener('click', () => {
    openInputModal("Nova Pasta", "Digite o nome da pasta:", "", async (name) => {
        let cleanName = name ? name.trim() : "";
        if (!cleanName) return;

        if (rootFolderHandle) {
            try {
                let targetDir = rootFolderHandle;
                if (activeFolder) {
                    let folderObj = findFolderByPath(workspaceState, activeFolder);
                    if (folderObj && folderObj.handle) {
                        targetDir = folderObj.handle;
                    }
                }

                let newDirHandle = await targetDir.getDirectoryHandle(cleanName, { create: true });
                let newFolder = { tipo: 'pasta', nome: cleanName, aberta: true, itens: [], handle: newDirHandle };

                if (activeFolder) {
                    let parent = findFolderByPath(workspaceState, activeFolder);
                    if (parent) parent.itens.push(newFolder);
                    else workspaceState.push(newFolder);
                } else {
                    workspaceState.push(newFolder);
                }

                sortWorkspace(workspaceState);
                renderTree();
                logTerminal(`📁 Pasta criada no PC: ${cleanName}`, 'success');
            } catch (err) {
                console.error(err);
                logTerminal(`❌ Erro ao criar pasta no PC: ${err.message}`, 'error');
            }
        } else {
            let newFolder = { tipo: 'pasta', nome: cleanName, aberta: false, itens: [] };
            if (activeFolder) {
                let parent = findFolderByPath(workspaceState, activeFolder);
                if (parent) parent.itens.push(newFolder);
                else workspaceState.push(newFolder);
            } else {
                workspaceState.push(newFolder);
            }
            sortWorkspace(workspaceState);
            renderTree();
            logTerminal(`Pasta "${cleanName}" criada na memória.`, "success");
        }
    });
});

// Monitora se o usuário digitou e compara com o original
editorArea.addEventListener('input', () => {
    let file = findFileById(workspaceState, activeFileId);
    if (!file || file.isBinary) return;
    
    file.conteudo = editorArea.value;

    if (file.conteudo !== file.conteudoOriginal) {
        if (!unsavedFiles.has(file.id)) {
            unsavedFiles.add(file.id);
            atualizarIndicadoresNaoSalvos();
        }
    } else {
        if (unsavedFiles.has(file.id)) {
            unsavedFiles.delete(file.id);
            atualizarIndicadoresNaoSalvos();
        }
    }
});

// Atalho Ctrl + S
window.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();

        if (!rootFolderHandle) {
            return; 
        }
        
        let file = findFileById(workspaceState, activeFileId);
        if (!file) return;

        if (!rootFolderHandle || !file.handle) {
            let blob = new Blob([file.conteudo], {type: "text/plain;charset=utf-8"});
            let link = document.createElement("a");
            link.href = URL.createObjectURL(blob); link.download = file.nome; link.click();
            file.conteudoOriginal = file.conteudo;
            unsavedFiles.delete(file.id);
            atualizarIndicadoresNaoSalvos();
            logTerminal(`💾 Baixado localmente: ${file.nome}`, 'success');
            return;
        }

        try {
            file.conteudo = editorArea.value;
            const writableStream = await file.handle.createWritable();
            await writableStream.write(file.conteudo);
            await writableStream.close();

            file.conteudoOriginal = file.conteudo; // Atualiza o original após salvar com sucesso
            unsavedFiles.delete(file.id);
            atualizarIndicadoresNaoSalvos();

            logTerminal(`💾 Salvo no PC com sucesso: ${file.nome}`, 'success');
        } catch (err) {
            console.error(err);
            logTerminal(`❌ Erro ao salvar arquivo no PC: ${err.message}`, 'error');
        }
    }
});

function atualizarIndicadoresNaoSalvos() {
    renderTree(); 

    const notification = document.getElementById('unsavedNotification');
    const textEl = document.getElementById('unsavedText');
    const total = unsavedFiles.size;

    if (!rootFolderHandle) {
        unsavedFiles.clear();
        if (notification) notification.style.display = 'none';
        return;
    }

    if (total > 0) {
        if (textEl) textEl.innerText = `⚠️ ${total} arquivo${total > 1 ? 's' : ''} não salvo${total > 1 ? 's' : ''}. Pressione Ctrl+S para salvar.`;
        if (notification) notification.style.display = 'flex';
    } else {
        if (notification) notification.style.display = 'none';
    }
}

editorArea.disabled = true;
renderTree();
updateEditorDisplay();
if (typeof lucide !== 'undefined') lucide.createIcons();