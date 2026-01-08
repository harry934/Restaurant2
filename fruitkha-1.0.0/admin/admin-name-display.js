// Admin Name Display Script
// This script displays the logged-in admin's name in the dashboard sidebar

(function() {
    // Get admin name from localStorage
    const adminName = localStorage.getItem('adminName') || localStorage.getItem('staffName');
    
    if (adminName) {
        // Find the display elements
        const displayDiv = document.getElementById('adminNameDisplay');
        const nameText = document.getElementById('adminNameText');
        
        if (displayDiv && nameText) {
            nameText.textContent = adminName;
            displayDiv.style.display = 'block';
        }
    }
    
    // Update logout function to clear admin name
    const originalLogout = window.logout;
    window.logout = function() {
        localStorage.removeItem('adminName');
        localStorage.removeItem('staffName');
        if (originalLogout) {
            originalLogout();
        } else {
            localStorage.removeItem('adminToken');
            window.location.href = 'index.html';
        }
    };
})();
