const firebaseConfig = {
    apiKey: "AIzaSyBcSXio4XHKvWyeEPZncKgBt5ZR1fiKJ-4",
    authDomain: "perizinto-tailor-hub.firebaseapp.com",
    projectId: "perizinto-tailor-hub",
    storageBucket: "perizinto-tailor-hub.appspot.com",
    messagingSenderId: "67430302677",
    appId: "1:67430302677:web:9f578f27119459633bf35c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

const GITHUB_USERNAME = "Perizinto"; 
const REPO_NAME = "perizinto-hub";        
const MY_DEV_NUMBER = "2347068521773";

let isSignUp = false;

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('auth-title').innerText = isSignUp ? "Create Account" : "Tailor Login";
    document.getElementById('brand-input').style.display = isSignUp ? "block" : "none";
    document.getElementById('phone-input').style.display = isSignUp ? "block" : "none";
    document.getElementById('toggle-link').innerText = isSignUp ? "Switch to Login" : "Switch to Sign Up";
}

async function handleAuth() {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('pass-input').value;
    const brand = document.getElementById('brand-input').value;
    const phone = document.getElementById('phone-input').value.replace(/\D/g,''); // Sanitize phone numbers
    try {
        if (isSignUp) {
            const res = await auth.createUserWithEmailAndPassword(email, pass);
            await db.collection("tailors").doc(res.user.uid).set({ 
                brandName: brand || "New Tailor",
                phoneNumber: phone || "2340000000000"
            });
        } else {
            await auth.signInWithEmailAndPassword(email, pass);
        }
    } catch (err) { alert(err.message); }
}

auth.onAuthStateChanged(user => {
    document.getElementById('auth-screen').style.display = user ? 'none' : 'flex';
    if (user) loadDashboard(user.uid);
});

function loadDashboard(uid) {
    db.collection("tailors").doc(uid).onSnapshot(doc => {
        if (doc.exists) document.getElementById('brand-name').innerText = doc.data().brandName;
    });
    db.collection("designs").where("ownerId", "==", uid).onSnapshot(snapshot => {
        renderList(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
}

function renderList(data) {
    let html = ""; let lowCount = 0;
    data.forEach(d => {
        if (d.qty <= 2) lowCount++;
        html += `<div class="stock">
            <button class="delete-btn" onclick="deleteDesign('${d.id}')"><i class="fas fa-trash"></i></button>
            <img src="${d.thumb || d.img}" class="stock-img" onclick="viewImage('${d.img}', '${d.type}')">
            <div class="sub">
                <b class="dress-name">${d.name}</b><p>₦${d.price}</p>
                <small>C: ${d.chest}" | N: ${d.neck}" | H: ${d.head}"</small>
                <div class="counter-ui">
                    <button class="qty-btn" onclick="updateQty('${d.id}', -1)">-</button>
                    <span class="avail">${d.qty}</span>
                    <button class="qty-btn" onclick="updateQty('${d.id}', 1)">+</button>
                </div>
            </div>
        </div>`;
    });
    document.getElementById('stocks-list').innerHTML = html;
    document.getElementById('total-stocks').innerText = data.length;
    document.getElementById('low-stocks').innerText = lowCount;
}

function generateThumbnail(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;
        video.currentTime = 1;
        video.onloadeddata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 300; canvas.height = 300;
            canvas.getContext('2d').drawImage(video, 0, 0, 300, 300);
            resolve(canvas.toDataURL('image/jpeg'));
        };
    });
}

document.getElementById('btn1').onclick = async function() {
    const file = document.getElementById('file').files[0];
    const name = document.getElementById('letter').value;
    const btn = document.getElementById('btn1');
    if (!file || !name) return alert("File/Name required!");

    btn.innerText = "Uploading... ⏳";
    btn.disabled = true;

    try {
        const fileType = file.type.split('/')[0];
        let fileUrl = "";
        let thumbUrl = "";

        if (fileType === 'video') {
            const storageRef = storage.ref(`designs/${auth.currentUser.uid}/${Date.now()}_video`);
            // Fixed: Convert to blob for better Android 7 compatibility
            const blob = new Blob([file], { type: file.type });
            const uploadTask = await storageRef.put(blob);
            fileUrl = await uploadTask.ref.getDownloadURL();
            thumbUrl = await generateThumbnail(file);
        } else {
            fileUrl = await new Promise(r => {
                const reader = new FileReader();
                reader.onload = e => r(e.target.result);
                reader.readAsDataURL(file);
            });
            thumbUrl = fileUrl;
        }

        await db.collection("designs").add({
            name: name, price: Number(document.getElementById('price').value) || 0,
            chest: document.getElementById('chest').value || 0,
            neck: document.getElementById('neck').value || 0,
            head: document.getElementById('head').value || 0,
            img: fileUrl, thumb: thumbUrl, type: fileType, qty: 1, ownerId: auth.currentUser.uid
        });

        btn.innerText = "Upload 🚀"; btn.disabled = false; closeModals();
    } catch (err) {
        alert("Error: " + err.message);
        btn.innerText = "Upload 🚀"; btn.disabled = false;
    }
};

function copyCatalogLink() {
    const link = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/customer.html?id=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link).then(() => alert("Link Copied!"));
}

function showQRModal() {
    const link = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/customer.html?id=${auth.currentUser.uid}`;
    // Optimized QR URL
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
    document.getElementById('qr-container').innerHTML = `<img id="qr-img" src="${qrUrl}" style="display:block; margin:auto;">`;
    document.getElementById('qr-modal').style.display = 'flex';
}

function downloadQR() {
    const img = document.getElementById('qr-img');
    if(!img) return alert("QR not ready!");
    const link = document.createElement('a');
    link.href = img.src; link.download = "My_Shop_QR.png";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function closeQRModal() { document.getElementById('qr-modal').style.display = 'none'; }

window.updateQty = (id, amt) => {
    const ref = db.collection("designs").doc(id);
    db.runTransaction(async t => {
        const doc = await t.get(ref);
        const newQty = (doc.data().qty || 0) + amt;
        t.update(ref, { qty: newQty < 0 ? 0 : newQty });
    });
};

window.deleteDesign = (id) => { if(confirm("Delete?")) db.collection("designs").doc(id).delete(); };

window.toggleDarkMode = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('mode-text').innerText = isDark ? "Light Mode" : "Dark Mode";
};

window.changeBrandName = () => {
    const n = prompt("New Name?");
    if(n) db.collection("tailors").doc(auth.currentUser.uid).update({brandName: n});
};

window.reportError = () => { 
    const msg = encodeURIComponent("Hi Perizinto, I want to report an error in the admin dashboard: ");
    window.open(`https://wa.me/${MY_DEV_NUMBER}?text=${msg}`); 
};

window.viewImage = (src, type) => {
    const content = document.getElementById('modal-content');
    content.innerHTML = type === 'video' 
        ? `<video src="${src}" controls autoplay playsinline style="max-width:100%; max-height:80vh; border-radius:12px;"></video>`
        : `<img src="${src}" style="max-width:100%; max-height:80vh; border-radius:12px;">`;
    document.getElementById('image-modal').style.display = 'flex';
};

window.searchDesigns = () => {
    const term = document.getElementById('main-search').value.toLowerCase();
    document.querySelectorAll('.stock').forEach(s => {
        const name = s.querySelector('.dress-name').innerText.toLowerCase();
        s.style.display = name.includes(term) ? "flex" : "none";
    });
};

document.getElementById('open-sidebar').onclick = () => {
    document.getElementById('sidebar').classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

function closeModals() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('dropdown').classList.remove('show');
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('image-modal').style.display = 'none';
}

document.getElementById('add-button').onclick = () => {
    document.getElementById('dropdown').classList.add('show');
    document.getElementById('overlay').classList.add('active');
};
document.getElementById('overlay').onclick = closeModals;
