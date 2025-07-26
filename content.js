const quedupImgURL = chrome.runtime.getURL("assets/add.png");
const queddownImgURL = chrome.runtime.getURL("assets/added.png");


window.addEventListener("load", AddQuedUpButton);
document.addEventListener("DOMContentLoaded", AddQuedUpButton);
observeForElement();


function AddQuedUpButton() {
    // Check if button already exists to avoid duplicates
    if (document.getElementById("quedup-button")) return;

    // Try multiple selectors in case the class name changes
    const selectors = [
        ".coding_problem_info_heading__G9ueL"
    ];

    let titleElement = null;
    
    for (const selector of selectors) {
        titleElement = document.querySelector(selector);
        if (titleElement) break;
    }

    // If title element not found
    if (!titleElement) return;

    try {
        const quedupButton = document.createElement("img");
        quedupButton.id = "quedup-button";
        quedupButton.src = quedupImgURL;
        quedupButton.style.width = "20px";
        quedupButton.style.height = "20px";
        quedupButton.style.cursor = "pointer";
        quedupButton.style.marginLeft = "10px";
        quedupButton.style.marginBottom = "2px";
        quedupButton.title = "add to QuedUp";

        const problemName = titleElement.textContent;

        // Add click event handler
        quedupButton.addEventListener("click", () => addToQuedUp(quedupButton, problemName));


        titleElement.appendChild(quedupButton);
    } catch (error) {
        console.error("QuedUp: Error adding button:", error);
    }
}

function addToQuedUp(quedupButton, problemName) {
    quedupButton.src = queddownImgURL;
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const url = `${origin}${pathname}`;
    console.log(url, problemName);
}





// Use MutationObserver to detect when content is dynamically loaded
function observeForElement() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if our target element has been added
                if (!document.getElementById("quedup-button")) {
                    setTimeout(AddQuedUpButton, 100); // Small delay to let content settle
                }
            }
        });
    });

    observer.observe(document.body, {childList: true, subtree: true});
}

