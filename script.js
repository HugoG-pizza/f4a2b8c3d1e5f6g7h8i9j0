import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCyag9xRPwQ_abIWO7Ng-paqdUg5sIjqHk",
  authDomain: "train-manager-83516.firebaseapp.com",
  databaseURL: "https://train-manager-83516-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "train-manager-83516",
  storageBucket: "train-manager-83516.firebasestorage.app",
  messagingSenderId: "877276977784",
  appId: "1:877276977784:web:839e7f2f234139a3692b8d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

// --- PARAMÈTRES MÉTIER ---
const CHARACTERS = ["Adam", "Fiona","McGregor", "Tesla", "Schuyler", "Lucius", "Morrison"];
const RANK_POWER = { 'R5': 5, 'R4': 4, 'R3': 3, 'R2': 2, 'R1': 1, 'ABS': 0 };

// --- DONNÉES ---
let members = [];
let rosterData = {}; 

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    
    // Connexion Anonyme pour la lecture seule
    onAuthStateChanged(auth, (user) => {
        if (user) {
            startDatabaseListener();
        } else {
            signInAnonymously(auth).catch(console.error);
        }
    });
});

function initFilters() {
    const charSelect = document.getElementById('filterChar');
    CHARACTERS.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.innerText = c;
        charSelect.appendChild(opt);
    });
}

function startDatabaseListener() {
    // 1. Lire la liste des joueurs
    onValue(ref(db, 'members'), (snapshot) => {
        const val = snapshot.val();
        members = val ? Object.values(val) : [];
        renderGrid();
    });

    // 2. Lire l'inventaire
    onValue(ref(db, 'app3/roster'), (snapshot) => {
        rosterData = snapshot.val() || {};
        renderGrid();
    });
}

// --- RENDU UI (LECTURE SEULE) ---

window.resetFilters = function() {
    document.getElementById('filterChar').value = "ALL";
    document.getElementById('filterLevel').value = "ALL";
    document.getElementById('searchPlayer').value = "";
    renderGrid();
}

window.renderGrid = function() {
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    
    const filterChar = document.getElementById('filterChar').value;
    const filterLevel = document.getElementById('filterLevel').value;
    const search = document.getElementById('searchPlayer').value.toLowerCase();

    // 1. En-têtes
    tableHeader.innerHTML = '<th style="text-align:left; padding-left:15px; width:200px;">Joueur</th>';
    CHARACTERS.forEach(c => {
        const isFiltered = (filterChar === c) ? 'color: var(--accent);' : '';
        tableHeader.innerHTML += `<th style="${isFiltered}">${c}</th>`;
    });

    tableBody.innerHTML = '';

    // 2. Tri
    let sortedMembers = [...members].sort((a, b) => {
        const diff = RANK_POWER[b.rank] - RANK_POWER[a.rank];
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

    // 3. NOUVELLE LOGIQUE DE FILTRES INTELLIGENTS
    let filteredMembers = sortedMembers.filter(m => {
        if (search && !m.name.toLowerCase().includes(search)) return false;
        
        const rData = rosterData[m.name] || {};

        // Cas 1 : Seulement un Personnage sélectionné
        if (filterChar !== "ALL" && filterLevel === "ALL") {
            const lvl = rData[filterChar] || "NAN";
            if (lvl === "NAN") return false;
        }
        
        // Cas 2 : Seulement un Niveau sélectionné
        else if (filterChar === "ALL" && filterLevel !== "ALL") {
            let hasLevelMatch = false;
            for (let c of CHARACTERS) {
                const lvl = rData[c] || "NAN";
                if (filterLevel === "4⭐" && lvl === "4⭐") hasLevelMatch = true;
                if (filterLevel === "3⭐" && (lvl === "3⭐" || lvl === "4⭐")) hasLevelMatch = true;
            }
            if (!hasLevelMatch) return false;
        }

        // Cas 3 : Personnage ET Niveau sélectionnés
        else if (filterChar !== "ALL" && filterLevel !== "ALL") {
            const lvl = rData[filterChar] || "NAN";
            if (filterLevel === "4⭐" && lvl !== "4⭐") return false;
            if (filterLevel === "3⭐" && lvl === "NAN") return false;
        }

        return true;
    });

    // 4. Générer les lignes
    if(filteredMembers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${CHARACTERS.length + 1}" style="text-align:center; padding:20px; color:#666;">Aucun joueur ne correspond aux critères.</td></tr>`;
        return;
    }

    filteredMembers.forEach(m => {
        let rowHTML = `
            <tr>
                <td class="player-cell">
                    <span class="rank-mini-badge ${m.rank === 'ABS' ? 'abs-badge' : ''}">${m.rank}</span>
                    <span class="player-name">${m.name}</span>
                </td>
        `;

        CHARACTERS.forEach(c => {
            const playerRoster = rosterData[m.name] || {};
            const lvl = playerRoster[c] || "NAN";
            
            let btnClass = "btn-nan";
            if(lvl === "3⭐") btnClass = "btn-3star";
            if(lvl === "4⭐") btnClass = "btn-4star";

            let opacityStyle = (filterChar !== "ALL" && filterChar !== c) ? "opacity: 0.3;" : "";

            // UTILISATION D'UNE DIV FIXE (Pas de bouton, pas de onclick)
            rowHTML += `
                <td style="${opacityStyle}">
                    <div class="roster-display ${btnClass}">
                        ${lvl}
                    </div>
                </td>
            `;
        });

        rowHTML += `</tr>`;
        tableBody.innerHTML += rowHTML;
    });
}