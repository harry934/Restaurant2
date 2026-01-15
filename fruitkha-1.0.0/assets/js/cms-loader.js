async function loadGlobalSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        
        // 1. Logo
        if (data.logo) {
            const logos = document.querySelectorAll('.site-logo img, .site-logo-mobile img, #siteLogo');
            logos.forEach(img => {
                img.src = data.logo;
            });
        }
        
        // 2. Footer About
        const footerAbout = document.getElementById('footerAboutText');
        if (footerAbout && data.aboutText) footerAbout.innerText = data.aboutText;
        
        // 3. Footer / Contact Details
        if (data.contact) {
            const addr = document.getElementById('footerAddress');
            if (addr) addr.innerText = data.contact.address;
            
            const phone = document.getElementById('footerPhone');
            if (phone) {
                phone.innerText = data.contact.phone;
                if (phone.parentElement.tagName === 'A') phone.parentElement.href = `tel:${data.contact.phone}`;
            }
            
            const email = document.getElementById('footerEmail');
            if (email) {
                email.innerText = data.contact.email;
                if (email.parentElement.tagName === 'A') email.parentElement.href = `mailto:${data.contact.email}`;
            }

            const till = document.getElementById('footerTill');
            if (till) till.innerText = `Till Number: ${data.contact.till}`;

            const hours = document.getElementById('contactHours');
            if (hours) hours.innerText = data.contact.hours;
        }
        
        // 4. Social Links
        if (data.social) {
            const fb = document.getElementById('socialFacebook');
            if (fb) fb.href = data.social.facebook || '#';
            
            const tt = document.getElementById('socialTikTok');
            if (tt) tt.href = data.social.tiktok || '#';
            
            const ig = document.getElementById('socialInstagram');
            if (ig) ig.href = data.social.instagram || '#';

            const tw = document.getElementById('socialTwitter');
            if (tw) tw.href = data.social.twitter || '#';
        }

        // 5. Hero / Breadcrumb Backgrounds (Generic)
        if (data.heroBg) {
            const hero = document.getElementById('heroArea');
            if (hero) hero.style.backgroundImage = `url(${data.heroBg})`;
            
            const breadcrumb = document.querySelector('.breadcrumb-section');
            if (breadcrumb) breadcrumb.style.backgroundImage = `url(${data.heroBg})`;
        }

        return data;
    } catch (e) {
        console.error("CMS Load Error:", e);
    }
}

document.addEventListener('DOMContentLoaded', loadGlobalSettings);
