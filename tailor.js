const firebaseConfig = {
  apiKey: "AIzaSyBcSXio4XHKvWyeEPZncKgBt5ZR1fiKJ-4",
  authDomain: "perizinto-tailor-hub.firebaseapp.com",
  projectId: "perizinto-tailor-hub",
  storageBucket: "perizinto-tailor-hub.firebasestorage.app",
  messagingSenderId: "67430302677",
  appId: "1:67430302677:web:9f578f27119459633bf35c"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const GITHUB_USERNAME = "Perizinto"; const REPO_NAME = "perizinto-hub";
let isUserPremium = false;

// GLOBAL LOADER 
function showLoader(text = "PROCESSING...") {
    document.getElementById("loader-text").innerText = text;
    document.getElementById("global-loader").style.display = "flex";
}
function hideLoader() {
    document.getElementById("global-loader").style.display = "none";
}

// DARK MODE MEMORY
function initTheme() {
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-text').innerText = "Light Mode";
    }
}
initTheme();
window.toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-text').innerText = isDark ? "Light Mode" : "Dark Mode";
    closeModals();
};

// AUTH LOGIC
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
let isSignUp = false;

window.toggleAuthMode = () => {
    isSignUp = !isSignUp;
    document.getElementById('auth-title').innerText = isSignUp ? "Create Account" : "Tailor Login";
    document.getElementById('auth-btn').innerText = isSignUp ? "Sign Up" : "Login";
    document.getElementById('auth-switch').innerText = isSignUp ? "Back to Login" : "Create Account";
    document.getElementById('brand-group').style.display = isSignUp ? "block" : "none";
    document.getElementById('phone-group').style.display = isSignUp ? "block" : "none";
};

window.togglePassword = () => {
    const passInput = document.getElementById('pass-input');
    const eyeIcon = document.getElementById('toggle-pass');
    if(passInput.type === "password") {
        passInput.type = "text";
        eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        passInput.type = "password";
        eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
    }
};

window.handleAuth = async () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('pass-input').value;
    
    if(!email || !pass) return alert("Email and Password required.");
    
    showLoader("AUTHENTICATING...");

    try {
        if(isSignUp) {
            const res = await auth.createUserWithEmailAndPassword(email, pass);
            await db.collection("tailors").doc(res.user.uid).set({
                brandName: document.getElementById('brand-input').value || "My Shop",
                phoneNumber: document.getElementById('phone-input').value || "234",
                isPremium: false
            });
        } else {
            await auth.signInWithEmailAndPassword(email, pass);
        }

        document.getElementById('email-input').value = "";
        document.getElementById('pass-input').value = "";
        if(document.getElementById('brand-input')) document.getElementById('brand-input').value = "";
        if(document.getElementById('phone-input')) document.getElementById('phone-input').value = "";

    } catch(error) { 
        alert(error.message); 
    } finally {
        hideLoader();
    }
};

window.resetPassword = () => {
    let email = document.getElementById('email-input').value;
    if(!email) email = prompt("Enter your registered email address to receive a reset link:");

    if(email) {
        showLoader("SENDING LINK...");
        auth.sendPasswordResetEmail(email)
            .then(() => alert("Success! Check your inbox (and spam folder) for the reset link."))
            .catch(e => alert("Error: " + e.message))
            .finally(() => hideLoader());
    }
};

window.confirmLogout = () => {
    if(confirm("Are you sure you want to securely log out?")) {
        showLoader("LOGGING OUT...");
        auth.signOut().then(() => {
            hideLoader();
            closeModals();
        });
    }
};

auth.onAuthStateChanged(async (user) => {
    document.getElementById('auth-screen').style.display = user ? 'none' : 'flex';
    if(user) {
        try {
            const doc = await db.collection("tailors").doc(user.uid).get();
            if(doc.exists) {
                const data = doc.data();
                document.getElementById('brand-name').style.maxWidth = "150px";
                document.getElementById('brand-name').style.overflow = "hidden";
                document.getElementById('brand-name').style.textOverflow = "ellipsis";
                
                if(data.isPremium && data.subscriptionExpiry) {
                    const now = new Date();
                    const expiry = data.subscriptionExpiry.toDate(); 
                    if(now > expiry) {
                        await db.collection("tailors").doc(user.uid).update({ isPremium: false });
                    }
                }
            }
        } catch (e) { console.log("Auth check error:", e); }
        loadDashboard(user.uid);
    }
});

// DASHBOARD 
let allDesigns = [];
function loadDashboard(uid) {
    showLoader("FETCHING YOUR CATALOGUE...");
    let initialDataArrived = false;

    db.collection("tailors").doc(uid).onSnapshot(doc => {
        if(doc.exists) {
            const data = doc.data();
            
            const brandEl = document.getElementById('brand-name');
            const tierEl = document.getElementById('user-tier');
            const topTierEl = document.getElementById('top-tier-text');
            const upgradeBtn = document.getElementById('upgrade-btn');
            const qrBtn = document.getElementById('qr-menu-btn');
            const vidInput = document.getElementById('video-link');
            const sidebarStatus = document.getElementById('sidebar-premium-status');
            const sidebarDays = document.getElementById('sidebar-days-count');
            
            brandEl.innerText = data.brandName;
            
            isUserPremium = data.isPremium || false;

            if(isUserPremium) {
                if(tierEl) { tierEl.innerText = "Premium"; tierEl.className = "tier-premium"; }
                if(topTierEl) { topTierEl.innerText = "Premium"; topTierEl.style.color = "#DAA520"; }
                if(qrBtn) qrBtn.classList.remove('premium-lock');
                if(vidInput) vidInput.disabled = false;
                
                if(upgradeBtn) upgradeBtn.style.display = "none"; 
                if(sidebarStatus) sidebarStatus.style.display = "block";

                if(data.subscriptionExpiry) {
                    const now = new Date();
                    const expiry = data.subscriptionExpiry.toDate();
                    const diff = expiry.getTime() - now.getTime();
                    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    
                    if (sidebarDays) {
                        sidebarDays.innerText = daysLeft + " days remaining";
                        sidebarDays.style.color = daysLeft <= 5 ? "#ff4d4d" : "#888";
                    }
                }
            } else {
                if(tierEl) { tierEl.innerText = "Free"; tierEl.className = "tier-free"; }
                if(topTierEl) { topTierEl.innerText = "FREE"; topTierEl.style.color = "#888"; }
                if(qrBtn) qrBtn.classList.add('premium-lock');
                if(vidInput) vidInput.disabled = true;
                
                if(upgradeBtn) upgradeBtn.style.display = "block"; 
                if(sidebarStatus) sidebarStatus.style.display = "none";
            }
            
            renderDesigns(allDesigns);
        }
    });

    db.collection("designs").where("ownerId", "==", uid).onSnapshot(snapshot => {
        allDesigns = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        renderDesigns(allDesigns);
        
        if (!initialDataArrived) {
            hideLoader();
            initialDataArrived = true;
        }
    }, (error) => {
        hideLoader(); // Safety hide if there's a connection error
        console.error(error);
    });
}
function renderDesigns(data) {
    const list = document.getElementById('stocks-list');
    let lowStockCount = 0;
    list.innerHTML = "";
    
    data.sort((a,b) => b.createdAt - a.createdAt).forEach(d => {
        if(d.qty <= 2) lowStockCount++;
        
        // Edit Button
        const editButtonHTML = isUserPremium 
            ? `<button onclick="openEditModal('${d.id}')" style="background:none; border:none; color:#555; font-size:18px; cursor:pointer; padding:5px;"><i class="fas fa-edit"></i></button>` 
            : '';

        // Delete Button
        const deleteButtonHTML = `<button onclick="deleteDesign('${d.id}')" style="background:none; border:none; color:#ff4d4d; font-size:18px; cursor:pointer; padding:5px;"><i class="fas fa-trash"></i></button>`;

        list.innerHTML += `
        <div class="design-card" style="position:relative; display:flex; align-items:center; padding-right: 45px;">
            <div class="image-wrapper" style="flex-shrink:0;">
                <img src="${d.img}" class="design-img" onclick="openLightbox('${d.img}', '${d.video}')">
            </div>
            
            <div class="card-details" style="flex-grow:1; margin-left:12px;">
                <div>
                    <div class="card-title">${d.name}</div>
                    <div class="card-price">₦${d.price.toLocaleString()}</div>
                    <div class="measurements">C: ${d.chest || 0}" | N: ${d.neck || 0}" | H: ${d.head || 0}"</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQty('${d.id}', -1)">-</button>
                    <span>${d.qty}</span>
                    <button class="qty-btn" onclick="updateQty('${d.id}', 1)">+</button>
                </div>
            </div>

            <div style="position:absolute; right:10px; top:0; bottom:0; display:flex; flex-direction:column; justify-content:space-around; align-items:center; border-left:1px solid #eee; padding-left:5px;">
                ${editButtonHTML}
                ${deleteButtonHTML}
            </div>
        </div>`;
    });
    
    document.getElementById('total-designs').innerText = data.length;
    document.getElementById('low-stock').innerText = lowStockCount;
}

// --- IMAGE SQUEEZER ---
async function squeezeImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(800 / Math.max(img.width, img.height), 1);
                canvas.width = img.width * scale; canvas.height = img.height * scale;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}

document.getElementById('upload-btn').onclick = async () => {
    const file = document.getElementById('file').files[0];
    const name = document.getElementById('name').value;
    const price = document.getElementById('price').value;

    if(!file || !name || !price) return alert("Photo, Name, and Price are required.");

    if (!isUserPremium && allDesigns.length >= 10) {
        return alert("Free Tier Limit: 10 Designs. \n\nUpgrade to Premium for unlimited uploads and video features! 🚀");
    }

    showLoader("UPLOADING DESIGN...");
    
    try {
        const base64Img = await squeezeImage(file);
        await db.collection("designs").add({
            ownerId: auth.currentUser.uid,
            img: base64Img,
            name: name,
            price: Number(price),
            video: document.getElementById('video-link').value || "",
            chest: document.getElementById('chest').value || "",
            neck: document.getElementById('neck').value || "",
            head: document.getElementById('head').value || "",
            qty: 1,
            createdAt: Date.now()
        });
        closeModals();
        document.getElementById('file').value = ""; 
        document.getElementById('name').value = ""; 
        document.getElementById('price').value = "";
        document.getElementById('video-link').value = "";
        document.getElementById('chest').value = "";
        document.getElementById('neck').value = "";
        document.getElementById('head').value = "";
    } catch(err) { 
        alert("Upload failed: " + err.message); 
    } finally {
        hideLoader();
    }
};

// CRUD ACTIONS 
window.deleteDesign = async (id) => { 
    if(confirm("Are you sure you want to permanently delete this design?")) {
        showLoader("DELETING...");
        try {
            await db.collection("designs").doc(id).delete();
        } catch(e) {
            alert("Delete failed.");
        } finally {
            hideLoader();
        }
    }
};

window.updateQty = (id, change) => {
    const ref = db.collection("designs").doc(id);
    db.runTransaction(async t => {
        const doc = await t.get(ref);
        const newQty = Math.max(0, (doc.data().qty || 0) + change);
        t.update(ref, { qty: newQty });
    });
};

document.getElementById('admin-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    renderDesigns(allDesigns.filter(d => d.name.toLowerCase().includes(term)));
});

// EDIT DESIGN
window.openEditModal = (id) => {
    const design = allDesigns.find(d => d.id === id);
    if(design) {
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-name').value = design.name;
        document.getElementById('edit-price').value = design.price;
        document.getElementById('edit-chest').value = design.chest || "";
        document.getElementById('edit-neck').value = design.neck || "";
        document.getElementById('edit-head').value = design.head || "";
        
        document.getElementById('edit-modal').classList.add('show');
        document.getElementById('overlay').style.display = "block";
    }
};

window.saveEdit = async () => {
    const id = document.getElementById('edit-id').value;
    const newName = document.getElementById('edit-name').value;
    const newPrice = document.getElementById('edit-price').value;
    const newFile = document.getElementById('edit-file').files[0];
    
    if(!newName || !newPrice) return alert("Name and Price cannot be empty.");

    showLoader("SAVING UPDATES...");

    try {
        let updateData = {
            name: newName,
            price: Number(newPrice),
            chest: document.getElementById('edit-chest').value || "",
            neck: document.getElementById('edit-neck').value || "",
            head: document.getElementById('edit-head').value || ""
        };

        if (newFile) {
            const base64Img = await squeezeImage(newFile);
            updateData.img = base64Img;
        }

        await db.collection("designs").doc(id).update(updateData);
        
        // CLEAN AFTER SUCCESS
        document.getElementById('edit-file').value = "";
        document.getElementById('edit-name').value = "";
        document.getElementById('edit-price').value = "";
        document.getElementById('edit-chest').value = "";
        document.getElementById('edit-neck').value = "";
        document.getElementById('edit-head').value = "";
        
        closeModals();
    } catch(err) {
        alert("Update failed: " + err.message);
    } finally {
        hideLoader();
    }
};

//UI MODALS & LIGHTBOX
window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.add('active');
    document.getElementById('overlay').style.display = "block";
};
window.showAddModal = () => {
    document.getElementById('add-modal').classList.add('show');
    document.getElementById('overlay').style.display = "block";
};
window.closeModals = () => {
    document.getElementById('sidebar').classList.remove('active');
    document.querySelectorAll('.bottom-sheet').forEach(sheet => sheet.classList.remove('show'));
    document.getElementById('overlay').style.display = "none";
};

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

// BRAND
window.copyCustomerLink = () => {
    const link = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/customer.html?id=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link); alert("Customer Link Copied to Clipboard!"); closeModals();
};

window.changeBrandPrompt = () => {
    const currentName = document.getElementById('brand-name').innerText;
    const newName = prompt("Enter your new Brand Name:", currentName);
    
    if (newName && newName !== currentName) {
        showLoader("UPDATING BRAND...");
        db.collection("tailors").doc(auth.currentUser.uid).update({ brandName: newName })
        .then(() => { alert("Brand name updated successfully! 🎉"); closeModals(); })
        .catch(err => alert("Error: " + err.message))
        .finally(() => hideLoader());
    } else { closeModals(); }
};

// QR LOGIC (API)
window.openQRModal = () => {
    if(!isUserPremium) return alert("This feature is locked. Please upgrade to Premium.");
    
    const link = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/customer.html?id=${auth.currentUser.uid}`;
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=300&dark=000000&light=ffffff`;
    
    document.getElementById('qr-img').src = qrUrl;
    
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('qr-modal').classList.add('show');
};

window.downloadQR = async () => {
    const qrImg = document.getElementById('qr-img').src;
    try {
        const response = await fetch(qrImg);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'My_Shop_QR.png';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (e) {
        alert("Could not download directly. You can screenshot the QR code instead.");
    }
};

// ABOUT & SUPPORT LOGIC
window.showAboutModal = () => {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('about-modal').classList.add('show');
};
window.showSupportModal = () => {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('support-modal').classList.add('show');
};
window.contactWhatsApp = () => {
    window.open("https://wa.me/2347068521773?text=Hello%20Perizinto%20I%20would%20like%20to%20report%20an%20error%20in%20the%20hub.");
};
window.contactEmail = () => {
    window.open("mailto:perizintolabs@gmail.com?subject=Perizinto%20Hub%20Support");
};

// PAYSTACK
window.payWithPaystack = () => {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first!");

    showLoader("INITIALIZING SECURE PAYMENT...");

    let handler = PaystackPop.setup({
        key: 'pk_test_8ad83252b872950f06fab224392a5c2c3aa48647', // REMEMBER TO CHANGE THIS TO LIVE KEY
        email: user.email,
        amount: 500000, 
        currency: "NGN",
        ref: 'PH-' + Date.now(), 
        onHide: function() {
            hideLoader();
        },
        callback: function(response){
            showLoader("ACTIVATING PREMIUM...");
            upgradeToPremium(user.uid, response.reference);
        },
        onClose: function(){
            hideLoader();
            alert('Transaction cancelled.');
        }
    });

    handler.openIframe();
};

function upgradeToPremium(uid, reference) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); 

    db.collection("tailors").doc(uid).update({
        isPremium: true,
        subscriptionExpiry: firebase.firestore.Timestamp.fromDate(expiryDate), 
        lastPaymentRef: reference || "N/A", 
        lastPaymentDate: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        return fetch("https://formsubmit.co/ajax/perizintolabs@gmail.com", {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
    _subject: "🚀 Your Perizinto Hub Premium is Live!",
    Greeting: "Hello! Thank you for upgrading.", 
    Benefit_1: "✅ Unlimited Design Uploads",
    Benefit_2: "✅ QR Code Customer Sharing For Easy Access To Your Catalogue",
    Benefit_3: "✅ Video Portfolio Support",
    Benefit_4: "✅ Instant Editing of Designs",
    Customer_Email: auth.currentUser.email,
    Expiry_Date: expiryDate.toDateString(),
    Transaction_Ref: reference || "N/A",
    Support_Contact: "perizintolabs@gmail.com",
    _template: "table",
    _captcha: "false"
})
        });
    })
    .then(() => {
        hideLoader();
        alert("Success! Your Premium Subscription is Active and a receipt has been emailed. 🚀");
        location.reload(); 
    })
    .catch((error) => {
        console.error("Error:", error);
        hideLoader();
        alert("Something went wrong. Please contact support with Ref: " + reference);
    });
}
