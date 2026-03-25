const firebaseConfig = { apiKey: "AIzaSyASMOP0kvQnf6LqK1CjYjupgXTXJVn_Uik", authDomain: "perizinto-tailor-hub.firebaseapp.com", projectId: "perizinto-tailor-hub" };
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// THEME MEMORY
function initCustomerTheme() { if(localStorage.getItem('cust_theme') === 'dark') document.body.classList.add('dark-mode'); }
initCustomerTheme();
window.toggleCustomerTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('cust_theme', isDark ? 'dark' : 'light');
};

const urlParams = new URLSearchParams(window.location.search);
const TAILOR_ID = urlParams.get('id');
let TAILOR_PHONE = "";
let customerFavorites = JSON.parse(localStorage.getItem('cust_favs')) || [];
let allCustomerDesigns = [];

if (TAILOR_ID) {
    db.collection("tailors").doc(TAILOR_ID).onSnapshot(doc => {
    if(doc.exists) {
        const data = doc.data();
        TAILOR_PHONE = data.phoneNumber.replace(/\D/g, ''); 
        document.getElementById('brand-title').innerText = data.brandName;

        // --- NEW: PREMIUM CHECK ---
        // We save this in a global variable so the render function can see it
        window.isTailorPremium = data.isPremium || false;

        // If not premium, hide any video-related UI globally
        if (!window.isTailorPremium) {
            const videoIcons = document.querySelectorAll('.video-btn, .play-icon');
            videoIcons.forEach(icon => icon.style.display = 'none');
        }
    } else {
        document.getElementById('brand-title').innerText = "Shop Not Found";
    }
});

    db.collection("designs").where("ownerId", "==", TAILOR_ID).onSnapshot(snapshot => {
        allCustomerDesigns = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        renderCustomerCatalog(allCustomerDesigns);
    });
} else {
    document.getElementById('brand-title').innerText = "Invalid Shop Link";
}

function renderCustomerCatalog(data) {
    const list = document.getElementById('customer-list');
    list.innerHTML = "";
    
    data.filter(d => d.qty > 0).sort((a,b) => b.createdAt - a.createdAt).forEach(d => {
        const isFav = customerFavorites.includes(d.id);
        list.innerHTML += `
        <div class="design-card" style="flex-direction: column; position: relative;">
            <button class="heart-btn" onclick="toggleFav('${d.id}')">
                <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
            </button>
            <div style="width: 100%; height: 250px; overflow: hidden; border-radius: 10px;" onclick="openLightbox('${d.img}', '${d.video}')">
                <img src="${d.img}" style="width: 100%; height: 100%; object-fit: cover; cursor: zoom-in;">
            </div>
            <div class="card-details" style="padding-top: 10px;">
                <div class="card-title">${d.name}</div>
                <div class="card-price" style="font-weight: bold;">₦${d.price.toLocaleString()}</div>
                <button class="order-btn-full" onclick="placeOrder('${d.name}', '${d.price}')">
                    <i class="fab fa-whatsapp"></i> Order This Design
                </button>
            </div>
        </div>`;
    });
}

window.toggleFav = (id) => {
    if(customerFavorites.includes(id)) {
        customerFavorites = customerFavorites.filter(f => f !== id);
    } else {
        customerFavorites.push(id);
    }
    localStorage.setItem('cust_favs', JSON.stringify(customerFavorites));
    renderCustomerCatalog(allCustomerDesigns);
};

window.placeOrder = (name, price) => {
    if(!TAILOR_PHONE) return alert("Tailor's contact not configured.");
    const msg = encodeURIComponent(`Hello! I saw your "${name}" design (₦${price}) on your Hub. I would like to make an inquiry.`);
    window.open(`https://wa.me/${TAILOR_PHONE}?text=${msg}`);
};

document.getElementById('cust-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    renderCustomerCatalog(allCustomerDesigns.filter(d => d.name.toLowerCase().includes(term)));
});

// FULL GLORY LIGHTBOX
window.openLightbox = (imgSrc, videoUrl) => {
    const lightbox = document.getElementById('lightbox');
    const imgEl = document.getElementById('lightbox-img');
    const vidContainer = document.getElementById('lightbox-video-container');
    
    if(videoUrl) {
        imgEl.style.display = "none"; vidContainer.style.display = "block";
        const vidId = videoUrl.split('v=')[1] || videoUrl.split('/').pop();
        vidContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${vidId}" style="width:100%; height:300px; border-radius:10px;" frameborder="0" allowfullscreen></iframe>`;
    } else {
        vidContainer.style.display = "none"; vidContainer.innerHTML = "";
        imgEl.style.display = "block"; imgEl.src = imgSrc;
    }
    lightbox.style.display = "flex";
};
window.closeLightbox = () => {
    document.getElementById('lightbox').style.display = "none";
    document.getElementById('lightbox-video-container').innerHTML = "";
};
