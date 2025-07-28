// ==================== CONFIGURATION ====================

const QUEDUP_CONFIG = {
    STORAGE_KEY: "QUEDUP_PROBLEMS",
    OPEN_LINK_IMG_URL: chrome.runtime.getURL("assets/open.png"),
    DELETE_IMG_URL: chrome.runtime.getURL("assets/delete.png"),
    EDIT_IMG_URL: chrome.runtime.getURL("assets/edit.png")
};

const PLATFORM_FILTERS = {
    'all': { name: 'All', filter: 'all' },
    'leetcode.com': { name: 'LeetCode', filter: 'leetcode.com', icon: chrome.runtime.getURL("assets/leetcode.png") },
    'codeforces.com': { name: 'Codeforces', filter: 'codeforces.com', icon: chrome.runtime.getURL("assets/codeforces.png") },
    'codechef.com': { name: 'CodeChef', filter: 'codechef.com', icon: chrome.runtime.getURL("assets/codechef.jpeg") },
    'atcoder.jp': { name: 'AtCoder', filter: 'atcoder.jp', icon: chrome.runtime.getURL("assets/atcoder.png") },
    'maang.in': { name: 'Maang', filter: 'maang.in', icon: chrome.runtime.getURL("assets/maang.png") }
};

// ==================== STATE ====================

let currentFilter = 'all';
let allProblems = [];

// ==================== STORAGE ====================

const getQuedUpProblems = () => new Promise(resolve =>
    chrome.storage.sync.get([QUEDUP_CONFIG.STORAGE_KEY], results =>
        resolve(results[QUEDUP_CONFIG.STORAGE_KEY] || [])
    )
);

const saveQuedUpProblems = problems => new Promise(resolve =>
    chrome.storage.sync.set({ [QUEDUP_CONFIG.STORAGE_KEY]: problems }, resolve)
);

// ==================== OPERATIONS ====================

const deleteProblem = async (problemId) => {
    allProblems = allProblems.filter(problem => problem.id !== problemId);
    await saveQuedUpProblems(allProblems);
    updateTabVisibility(allProblems);
    renderProblems(allProblems);
};

const editProblemName = async (problemId, newName) => {
    const problemIndex = allProblems.findIndex(problem => problem.id === problemId);
    if (problemIndex !== -1) {
        allProblems[problemIndex].name = newName;
        await saveQuedUpProblems(allProblems);
        renderProblems(allProblems);
    }
};

const openProblem = url => chrome.tabs.create({ url });

// ==================== TAB MANAGEMENT ====================

const getAvailablePlatforms = (problems) => {
    const platforms = new Set(['all']);
    problems.forEach(problem => {
        Object.values(PLATFORM_FILTERS).forEach(platform => {
            if (platform.filter !== 'all' && problem.host.includes(platform.filter)) {
                platforms.add(platform.filter);
            }
        });
    });
    return platforms;
};

const updateTabVisibility = (problems) => {
    const availablePlatforms = getAvailablePlatforms(problems);
    const showOnlyAll = problems.length === 0;

    Object.values(PLATFORM_FILTERS).forEach(platform => {
        const tabElement = document.querySelector(`[data-filter="${platform.filter}"]`);
        if (tabElement) {
            tabElement.style.display = showOnlyAll ?
                (platform.filter === 'all' ? 'block' : 'none') :
                (platform.filter === 'all' || availablePlatforms.has(platform.filter) ? 'block' : 'none');
        }
    });

    if (showOnlyAll && currentFilter !== 'all' || !availablePlatforms.has(currentFilter)) {
        switchTab('all');
    }
};

const filterProblems = (problems, filter) =>
    filter === 'all' ? problems : problems.filter(problem => problem.host.includes(filter));

const switchTab = (filter) => {
    currentFilter = filter;
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
    renderProblems(allProblems);
};

// ==================== RENDERING ====================

const getPlatformIcon = (host) => {
    // Find matching platform by checking if host contains the platform filter
    for (const [key, platform] of Object.entries(PLATFORM_FILTERS)) {
        if (platform.filter !== 'all' && host.includes(platform.filter)) {
            return platform.icon || chrome.runtime.getURL("assets/logo.png");
        }
    }
    return chrome.runtime.getURL("assets/logo.png"); // Default fallback
};

const renderProblems = (problems) => {
    const problemsContainer = document.getElementById("problems-container");
    const filteredProblems = filterProblems(problems, currentFilter);

    if (filteredProblems.length === 0) {
        const message = currentFilter === 'all'
            ? '<i>No Bookmarked Problems to Show</i>'
            : `No problems found for ${PLATFORM_FILTERS[currentFilter]?.name || currentFilter}`;
        problemsContainer.innerHTML = `<div class="empty-state">${message}</div>`;
        return;
    }

    problemsContainer.innerHTML = filteredProblems.map(problem => {
        const platformIcon = getPlatformIcon(problem.host);
        
        return `
            <div class="problem">
                <div class="problem-content">
                    <img src="${platformIcon}" class="problem-host-icon" alt="Platform Icon">
                    <div class="problem-name" data-id="${problem.id}">${problem.name}</div>
                    <div class="problem-actions">
                        <img src="${QUEDUP_CONFIG.OPEN_LINK_IMG_URL}" class="action-btn open-btn" title="Open Problem" data-url="${problem.url}">
                        <img src="${QUEDUP_CONFIG.EDIT_IMG_URL}" class="action-btn edit-btn" title="Edit Name" data-id="${problem.id}">
                        <img src="${QUEDUP_CONFIG.DELETE_IMG_URL}" class="action-btn delete-btn" title="Delete Problem" data-id="${problem.id}">
                    </div>
                </div>
            </div>
        `;
    }).join('');

    addActionListeners();
};

const addActionListeners = () => {
    document.querySelectorAll('.open-btn').forEach(btn =>
        btn.addEventListener('click', e => openProblem(e.target.getAttribute('data-url')))
    );

    document.querySelectorAll('.delete-btn').forEach(btn =>
        btn.addEventListener('click', e => showDeleteConfirmation(e.target.getAttribute('data-id')))
    );

    document.querySelectorAll('.edit-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            const problemId = e.target.getAttribute('data-id');
            const nameElement = document.querySelector(`.problem-name[data-id="${problemId}"]`);
            startEditing(nameElement, problemId);
        })
    );
};

const showDeleteConfirmation = (problemId) => {
    const problem = allProblems.find(p => p.id === problemId);
    const problemElement = document.querySelector(`.problem-name[data-id="${problemId}"]`).closest('.problem');
    const originalContent = problemElement.innerHTML;

    problemElement.innerHTML = `
        <div class="delete-confirmation">
            <div class="confirm-content">
                <div class="confirm-message">Delete "${problem.name}"?</div>
                <div class="confirm-buttons">
                    <button class="confirm-yes">Delete</button>
                    <button class="confirm-no">Cancel</button>
                </div>
            </div>
        </div>
    `;

    problemElement.querySelector('.confirm-yes').addEventListener('click', () => deleteProblem(problemId));
    problemElement.querySelector('.confirm-no').addEventListener('click', () => {
        problemElement.innerHTML = originalContent;
        addActionListeners();
    });
};

const startEditing = (nameElement, problemId) => {
    const currentName = nameElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'edit-input';

    nameElement.style.display = 'none';
    nameElement.parentNode.insertBefore(input, nameElement);
    input.focus();
    input.select();

    const finishEditing = async () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            await editProblemName(problemId, newName);
        } else {
            nameElement.textContent = currentName;
            nameElement.style.display = 'block';
            input.remove();
        }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') finishEditing();
        if (e.key === 'Escape') {
            nameElement.style.display = 'block';
            input.remove();
        }
    });
};

const viewProblems = async () => {
    try {
        allProblems = await getQuedUpProblems();
        updateTabVisibility(allProblems);
        renderProblems(allProblems);
    } catch (error) {
        console.error("QuedUp: Error loading problems:", error);
        document.getElementById("problems-container").innerHTML = `<div class="error-state">Error loading problems</div>`;
    }
};

// ==================== INITIALIZATION ====================

document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => switchTab(tab.getAttribute('data-filter')))
);

window.addEventListener("DOMContentLoaded", viewProblems);