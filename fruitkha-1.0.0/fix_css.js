const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'assets/css/main.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Find the first line that looks like the corrupted part
const splitIndex = content.indexOf('/ *   L o g o');
if (splitIndex !== -1) {
    content = content.substring(0, splitIndex).trim();
} else {
    // If not found specifically, maybe just search for the start of the spacers
    const lines = content.split('\n');
    let firstBadLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('. s i t e - l o g o')) {
            firstBadLine = i;
            break;
        }
    }
    if (firstBadLine !== -1) {
        content = lines.slice(0, firstBadLine).join('\n').trim();
    }
}

const stickyCss = `
/* Logo default styles */
.site-logo img {
  max-height: 100px;
  width: auto;
  margin-top: -15px;
  margin-left: 10px;
  transition: all 0.3s ease;
}

/* Sticky Header - Smaller Logo and Height */
.sticky-wrapper.is-sticky .site-logo img {
  max-height: 60px;
  margin-top: 0px;
}

.sticky-wrapper.is-sticky .top-header-area {
  padding: 5px 0 !important;
}

.sticky-wrapper.is-sticky nav.main-menu ul li a {
  padding: 10px 15px;
}

.sticky-wrapper.is-sticky .header-icons a {
  padding: 5px 10px;
}
`;

fs.writeFileSync(cssPath, content + '\n' + stickyCss, 'utf8');
console.log('Fixed main.css formatting and updated sticky styles.');
