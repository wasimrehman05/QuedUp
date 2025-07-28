// ==================== CONFIGURATION ====================

const QUEDUP_CONFIG = {
    STORAGE_KEY: "QUEDUP_PROBLEMS",
    BUTTON_ID: "quedup-button",
    DEBOUNCE_DELAY: 150
};

const ASSETS = {
    ADD_ICON: chrome.runtime.getURL("assets/add.png"),
    ADDED_ICON: chrome.runtime.getURL("assets/added.png")
};

const PLATFORM_CONFIGS = {
    'atcoder.jp': {
        selectors: ['span.h2'],
        pathFilter: '/tasks/',
        buttonPosition: 'append'
    },
    'codechef.com': {
        selectors: ['#problem-statement > h3.notranslate'],
        pathFilter: '/problems/',
        buttonPosition: 'append'
    },
    'codeforces.com': {
        selectors: ['.header .title'],
        pathFilter: '/problem',
        buttonPosition: 'append'
    },
    'leetcode.com': {
        selectors: ['.truncate.cursor-text'],
        pathFilter: '/problems/',
        buttonPosition: 'after' 
    },
    'maang.in': {
        selectors: ['.coding_problem_info_heading__G9ueL'],
        pathFilter: 'problems',
        buttonPosition: 'append'
    }
};

const BUTTON_STYLES = {
    display: "inline-block",
    width: "20px",
    height: "20px",
    cursor: "pointer",
    marginLeft: "10px",
    marginBottom: "2px",
    verticalAlign: "middle",
    filter: "brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(202deg) brightness(102%) contrast(97%)",
    transition: "all 0.2s ease"
};

// ==================== STATE ====================

let isAddingButton = false;
let debounceTimer = null;
let currentPlatform = null;

// ==================== UTILITIES ====================

const detectPlatform = () => {
    const hostname = window.location.hostname.replace('www.', '');
    return Object.keys(PLATFORM_CONFIGS).find(platform => hostname.includes(platform)) || null;
};

const isProblemsPage = () => {
    if (!currentPlatform) return false;
    const config = PLATFORM_CONFIGS[currentPlatform];
    return window.location.pathname.includes(config.pathFilter);
};

const buttonExists = () => !!document.getElementById(QUEDUP_CONFIG.BUTTON_ID);

const findTitleElement = () => {
    if (!currentPlatform) return null;
    const selectors = PLATFORM_CONFIGS[currentPlatform].selectors;
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
    }
    return null;
};

const getProblemName = (titleElement) => {
    let name = titleElement.textContent.trim();
    if (currentPlatform === 'leetcode.com') {
        name = name.replace(/^\d+\.\s*/, '');
    } else if (currentPlatform === 'codeforces.com') {
        name = name.replace(/^[A-Z]\d*\.\s*/, '');
    }
    return name;
};

// ==================== STORAGE ====================

const getQuedUpProblems = () => new Promise(resolve => 
    chrome.storage.sync.get([QUEDUP_CONFIG.STORAGE_KEY], results => 
        resolve(results[QUEDUP_CONFIG.STORAGE_KEY] || [])
    )
);

const saveQuedUpProblems = problems => new Promise(resolve => 
    chrome.storage.sync.set({[QUEDUP_CONFIG.STORAGE_KEY]: problems}, resolve)
);

// ==================== BUTTON OPERATIONS ====================

const createQuedUpButton = (isInQuedUp, problemName) => {
    const button = document.createElement("img");
    button.id = QUEDUP_CONFIG.BUTTON_ID;
    button.src = isInQuedUp ? ASSETS.ADDED_ICON : ASSETS.ADD_ICON;
    button.alt = "QuedUp";
    button.title = isInQuedUp ? "Already in QuedUp" : "Add to QuedUp";
    Object.assign(button.style, BUTTON_STYLES);
    
    // Add hover effect
    button.addEventListener('mouseenter', () => {
        button.style.filter = "brightness(0) saturate(100%) invert(13%) sepia(94%) saturate(7151%) hue-rotate(245deg) brightness(90%) contrast(149%)";
        button.style.transform = "scale(1.1)";
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.filter = "brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(202deg) brightness(102%) contrast(97%)";
        button.style.transform = "scale(1)";
    });
    
    button.addEventListener("click", () => handleButtonClick(button, problemName, isInQuedUp));
    return button;
};

const insertButton = (titleElement, button) => {
    const config = PLATFORM_CONFIGS[currentPlatform];
    if (config.buttonPosition === 'append') {
        titleElement.appendChild(button);
    } else {
        titleElement.parentNode.insertBefore(button, titleElement.nextSibling);
    }
};

const debouncedAddButton = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (!isAddingButton) addQuedUpButton();
    }, QUEDUP_CONFIG.DEBOUNCE_DELAY);
};

const addQuedUpButton = async () => {
    if (isAddingButton || !currentPlatform || !isProblemsPage() || buttonExists()) return;
    
    isAddingButton = true;
    
    try {
        const titleElement = findTitleElement();
        if (!titleElement) return;
        
        const problems = await getQuedUpProblems();
        const currentPath = window.location.pathname;
        const isInQuedUp = problems.some(problem => problem.id === currentPath);
        
        const problemName = getProblemName(titleElement);
        const button = createQuedUpButton(isInQuedUp, problemName);
        insertButton(titleElement, button);
        
    } catch (error) {
        console.error("QuedUp: Error adding button:", error);
    } finally {
        isAddingButton = false;
    }
};

// ==================== EVENT HANDLERS ====================

const handleButtonClick = async (button, problemName, wasInQuedUp) => {
    if (wasInQuedUp) return;
    
    try {
        button.src = ASSETS.ADDED_ICON;
        button.title = "Already in QuedUp";
        button.style.filter = "brightness(0) saturate(100%) invert(49%) sepia(98%) saturate(1352%) hue-rotate(87deg) brightness(119%) contrast(119%)";
        
        const { hostname, pathname, origin } = window.location;
        const problemData = {
            id: pathname,
            host: hostname.replace('www.', ''),
            name: problemName,
            url: `${origin}${pathname}`
        };
        
        const currentProblems = await getQuedUpProblems();
        await saveQuedUpProblems([...currentProblems, problemData]);
        
    } catch (error) {
        console.error("QuedUp: Error saving problem:", error);
        button.src = ASSETS.ADD_ICON;
        button.title = "Add to QuedUp";
        button.style.filter = "brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(202deg) brightness(102%) contrast(97%)";
    }
};

const observeForElement = () => {
    const observer = new MutationObserver(() => {
        if (currentPlatform && isProblemsPage() && !buttonExists()) {
            debouncedAddButton();
        }
    });
    observer.observe(document.body, {childList: true, subtree: true});
};

// ==================== INITIALIZATION ====================

const initializeQuedUp = () => {
    currentPlatform = detectPlatform();
    if (!currentPlatform) return;
    
    window.addEventListener("load", debouncedAddButton);
    observeForElement();
    debouncedAddButton();
};

initializeQuedUp();

