// QuedUp Chrome Extension - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
    console.log('QuedUp extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    chrome.action.openPopup();
});