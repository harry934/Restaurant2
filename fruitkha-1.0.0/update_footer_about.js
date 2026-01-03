const fs = require('fs');
const path = require('path');

const files = ['index.html', 'shop.html', 'cart.html', 'checkout.html', 'about.html'];
const aboutText = "We are your home for the best pizza and chicken cuisines in Nairobi. Located on USIU Road, we serve fresh, hot, and tasty meals daily.";

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Match the about widget paragraph
        const aboutRegex = /<div class="footer-box about-widget">([\s\S]*?)<p>([\s\S]*?)<\/p>/g;
        content = content.replace(aboutRegex, `<div class="footer-box about-widget">$1<p>${aboutText}</p>`);

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated footer about text in ${file}`);
    }
});
