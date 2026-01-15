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
        
        // 2. Textual Content (General)
        if (data.homeTitle) {
            const el = document.getElementById('homeTitle');
            if(el) el.innerText = data.homeTitle;
        }
        if (data.homeSubtext) {
            const el = document.getElementById('homeSubtext');
            if(el) el.innerText = data.homeSubtext;
        }
        
        // 3. Footer About
        const footerAbout = document.getElementById('footerAboutText');
        if (footerAbout && data.aboutText) footerAbout.innerText = data.aboutText;
        
        // 4. Footer / Contact Details
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
        
        // 5. Social Links
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

        // 6. Shop Banner
        if (data.shopBanner) {
            const title = document.getElementById('shopBannerTitle');
            if (title) title.innerHTML = data.shopBanner.title;
            const percent = document.getElementById('shopBannerPercent');
            if (percent) percent.innerHTML = data.shopBanner.percentText;
            if (data.shopBanner.image) {
                const sbArea = document.getElementById('shopBannerArea');
                if(sbArea) sbArea.style.backgroundImage = `url(${data.shopBanner.image})`;
            }
        }

        // 7. Deal of the Week
        if (data.dealOfWeek) {
            const dt = document.getElementById('dealTitle');
            if(dt) dt.innerHTML = data.dealOfWeek.title;
            const ds = document.getElementById('dealSubtitle');
            if(ds) ds.innerText = data.dealOfWeek.subtitle;
            const dd = document.getElementById('dealDescription');
            if(dd) dd.innerText = data.dealOfWeek.description;
            if (data.dealOfWeek.image) {
                const dImg = document.getElementById('dealImage');
                if(dImg) dImg.src = data.dealOfWeek.image;
            }
        }

        // 8. Home About
        if (data.homeAbout) {
            const at = document.getElementById('homeAboutTitle');
            if(at) at.innerText = data.homeAbout.title;
            const ah = document.querySelectorAll('#homeAboutHeading');
            ah.forEach(el => el.innerHTML = data.homeAbout.heading);
            const ad = document.querySelectorAll('#homeAboutDescription');
            ad.forEach(el => el.innerText = data.homeAbout.description);
            if (data.homeAbout.abtImage) {
                const abImage = document.getElementById('homeAboutImage');
                if(abImage) abImage.style.backgroundImage = `url(${data.homeAbout.abtImage})`;
            }
            const videoLink = document.getElementById('homeVideoLink');
            if (videoLink && data.homeAbout.videoLink) {
                videoLink.href = data.homeAbout.videoLink;
                if (data.homeAbout.isVideoLocal) {
                    videoLink.classList.remove('popup-youtube');
                    videoLink.classList.add('popup-video');
                }
            }
        }

        // 9. Hero / Breadcrumb Backgrounds (Generic)
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
