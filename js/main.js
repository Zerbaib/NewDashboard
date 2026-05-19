// JavaScript source code
const grid = document.getElementById('grid');
const addBtn = document.getElementById('add');
const clearBtn = document.getElementById('clear');

let items = JSON.parse(localStorage.getItem('dashboard-items') || '[]');
let folders = JSON.parse(localStorage.getItem('dashboard-folders') || '[]');

function save() { localStorage.setItem('dashboard-items', JSON.stringify(items)); }
function saveFolders() { localStorage.setItem('dashboard-folders', JSON.stringify(folders)); }

function makeTile(item, index) {
	const el = document.createElement('div');
	el.className = 'tile';
	el.draggable = true;
	el.dataset.index = index;

	let faviconUrl = '';
	try {
		const u = new URL(item.url);
		faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=64`;
	} catch { }

	el.innerHTML = `
				<div class="info">
					<div class="favicon"></div>
					<div class="meta"><b title="${item.title}">${item.title}</b><small>${item.url}</small></div>
				</div>
				<div class="actions">
					<button class="delete" title="Delete">✕</button>
				</div>`;

	const faviconEl = el.querySelector('.favicon');
	if (faviconUrl) {
		const img = document.createElement('img');
		img.alt = '';
		img.src = faviconUrl;
		img.addEventListener('error', () => {
			faviconEl.textContent = (item.title || '').charAt(0) || '?';
		}, { once: true });
		faviconEl.appendChild(img);
	} else {
		faviconEl.textContent = (item.title || '').charAt(0) || '?';
	}

	el.querySelector('.delete').addEventListener('click', e => { e.stopPropagation(); items.splice(index, 1); render(); save(); });

	el.addEventListener('click', () => { window.open(item.url, '_blank'); });

	el.addEventListener('dragstart', (e) => { el.classList.add('dragging'); e.dataTransfer.setData('text/plain', index); e.dataTransfer.effectAllowed = 'move'; });
	el.addEventListener('dragend', () => { el.classList.remove('dragging'); });

	return el;
}

function populateFolderSelect() {
	const sel = document.getElementById('folderSelect');
	sel.innerHTML = '';
	const optAll = document.createElement('option'); optAll.value = '__unsorted__'; optAll.textContent = 'Unsorted'; sel.appendChild(optAll);
	folders.forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = f; sel.appendChild(o); });
}

function render() {
	const container = document.getElementById('foldersContainer');
	container.innerHTML = '';
	// render Unsorted
	const groups = ['__unsorted__', ...folders];
	groups.forEach(group => {
		const section = document.createElement('div');
		const title = document.createElement('h3');
		title.className = 'folder-header';
		title.draggable = group !== '__unsorted__';
		title.dataset.folderName = group;
		title.textContent = group === '__unsorted__' ? 'Unsorted' : group;

		if (group !== '__unsorted__') {
			title.addEventListener('dragstart', (e) => {
				title.classList.add('dragging');
				e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', name: group }));
				e.dataTransfer.effectAllowed = 'move';
			});
			title.addEventListener('dragend', () => { title.classList.remove('dragging'); });
		}

		section.appendChild(title);
		const gridEl = document.createElement('div'); gridEl.className = 'grid'; gridEl.dataset.group = group; gridEl.setAttribute('aria-live', 'polite');
		const groupItems = items.filter(it => (it.folder || '__unsorted__') === group);
		groupItems.forEach((it, i) => gridEl.appendChild(makeTile(it, items.indexOf(it))));
		if (groupItems.length === 0) { const ph = document.createElement('div'); ph.className = 'placeholder'; ph.textContent = 'No items.'; gridEl.appendChild(ph); }
		section.appendChild(gridEl);
		container.appendChild(section);
	});
	populateFolderSelect();
}

// delegated drag handling for folder grids
document.addEventListener('dragover', (e) => {
	e.preventDefault();
	const dragging = document.querySelector('.dragging');
	const allGrids = [...document.querySelectorAll('.grid')];
	const targetGrid = allGrids.find(g => g.contains(dragging) || g.contains(e.target));
	if (!dragging || !targetGrid) return;
	const after = getDragAfterElement(targetGrid, e.clientY);
	if (after == null) targetGrid.appendChild(dragging);
	else targetGrid.insertBefore(dragging, after);
});

document.addEventListener('drop', (e) => {
	e.preventDefault();
	const fromIndex = Number(e.dataTransfer.getData('text/plain'));
	const draggingEl = document.querySelector('.dragging');
	if (!draggingEl) return;
	const targetGrid = draggingEl.parentElement;
	const nodes = Array.from(targetGrid.children).filter(n => n.classList.contains('tile'));
	const toIndex = nodes.indexOf(draggingEl);
	if (toIndex < 0) return;
	const [moved] = items.splice(fromIndex, 1);
	// assign folder based on target grid
	const group = targetGrid.dataset.group || '__unsorted__';
	moved.folder = group === '__unsorted__' ? undefined : group;
	items.splice(toIndex, 0, moved);
	save(); render();
});

function getDragAfterElement(container, y) {
	const draggableElements = [...container.querySelectorAll('.tile:not(.dragging)')];
	return draggableElements.reduce((closest, child) => {
		const box = child.getBoundingClientRect();
		const offset = y - box.top - box.height / 2;
		if (offset < 0 && offset > closest.offset) { return { offset, element: child }; } else return closest;
	}, { offset: Number.NEGATIVE_INFINITY }).element;
}

document.getElementById('createFolder').addEventListener('click', () => {
	const name = document.getElementById('newFolder').value.trim();
	if (!name) return;
	if (!folders.includes(name)) { folders.push(name); saveFolders(); }
	document.getElementById('newFolder').value = ''; populateFolderSelect(); render();
});

addBtn.addEventListener('click', () => {
	const title = document.getElementById('title').value.trim();
	const url = document.getElementById('url').value.trim();
	if (!url) return;
	const folder = document.getElementById('folderSelect').value;
	items.push({ title: title || url.replace(/^https?:\/\//, '').replace(/\/.*/, '').slice(0, 30), url, folder: folder === '__unsorted__' ? undefined : folder });
	save(); render(); document.getElementById('title').value = ''; document.getElementById('url').value = '';
});

clearBtn.addEventListener('click', () => { if (confirm('Clear all items?')) { items = []; folders = []; save(); saveFolders(); render(); } });

// allow pressing Enter in url field to add
document.getElementById('url').addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); });

render();