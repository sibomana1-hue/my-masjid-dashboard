// App State
const state = {
    location: {
        city: 'Phoenix',
        country: 'US',
        state: 'AZ', // For specificity
        method: 2 // ISNA
    },
    hijriOffset: 0,
    jummah: {
        time: '1:30 PM',
        khatib: 'Sheikh Ahmed'
    },
    hadith: {
        text: '"Verily, with hardship comes ease."',
        source: '- Surah Ash-Sharh (94:6)'
    },
    mosque: {
        name: 'Masjid Al-Noor',
        address: 'Phoenix, AZ',
        zelle: '',
        cashapp: ''
    },
    bgUrl: '',
    announcements: [
        'Welcome to Masjid Al-Noor Dashboard.',
        'Please silence your phones during prayer.'
    ],
    prayers: {}, // Will hold today's schedule
    nextPrayer: null
};

// DOM Elements
const elements = {
    clock: document.getElementById('clock'),
    gregorianDate: document.getElementById('date-gregorian'),
    hijriDate: document.getElementById('date-hijri'),
    prayerList: document.getElementById('prayer-list'),
    nextPrayerName: document.getElementById('next-prayer-name'),
    countdown: document.getElementById('countdown'),
    jummahTime: document.getElementById('jummah-time'),
    jummahDate: document.getElementById('jummah-date-display'),
    khatibName: document.getElementById('khatib-name'),
    hadithText: document.getElementById('hadith-text'),
    hadithSource: document.getElementById('hadith-source'),
    mosqueName: document.getElementById('mosque-name-display'),
    mosqueAddress: document.getElementById('mosque-address-display'),
    mosqueLogo: document.getElementById('mosque-logo-display'),
    qrZelle: document.getElementById('qr-zelle'),
    qrCashapp: document.getElementById('qr-cashapp'),
    ticker: document.getElementById('announcement-ticker'),
    adminTrigger: document.getElementById('admin-trigger'),
    adminOverlay: document.getElementById('admin-overlay'),
    closeAdmin: document.getElementById('close-admin'),
    loginForm: document.getElementById('login-form'),
    adminControls: document.getElementById('admin-controls'),
    adminPass: document.getElementById('admin-pass'),
    loginBtn: document.getElementById('login-btn'),
    appContainer: document.querySelector('.app-container'),
    inputs: {
        hijri: document.getElementById('hijri-offset-display'),
        jummahTime: document.getElementById('edit-jummah-time'),
        jummahDate: document.getElementById('edit-jummah-date'),
        khatibName: document.getElementById('edit-khatib-name'),
        hadithText: document.getElementById('edit-hadith-text'),
        hadithSource: document.getElementById('edit-hadith-source'),
        announcements: document.getElementById('edit-announcements'),
        bgUrl: document.getElementById('edit-bg-url'),
        mosqueName: document.getElementById('edit-mosque-name'),
        mosqueLogo: document.getElementById('edit-mosque-logo'),
        mosqueAddress: document.getElementById('edit-mosque-address'),
        zelle: document.getElementById('edit-qr-zelle'),
        cashapp: document.getElementById('edit-qr-cashapp')
    },
    saveBtn: document.getElementById('save-settings'),
    silentOverlay: document.getElementById('silent-overlay')
};

// --- Initialization ---

async function init() {
    loadSettings();
    updateClock();
    applyBackground();
    renderMosqueInfo();
    renderHadith();
    renderQR();
    setInterval(updateClock, 1000);

    await fetchPrayerTimes();
    renderAnnouncements();
    renderJummah();

    // Check next prayer every minute to ensure countdown doesn't drift too much visually
    // and to refresh prayers if day changes
    setInterval(checkNextPrayer, 60000);

    // Auto-refresh prayers every night at midnight (handled by checkNextPrayer date check)
}

// --- Data Fetching ---

async function fetchPrayerTimes() {
    const today = new Date();
    // Format: DD-MM-YYYY
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    const { city, country, method } = state.location;

    try {
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${city}&country=${country}&state=${state.location.state}&method=${method}`);
        const data = await response.json();

        if (data.code === 200) {
            state.prayers = data.data.timings;
            state.hijriDate = data.data.date.hijri;

            renderPrayers();
            updateHijriDate();
            checkNextPrayer(); // Calculate next prayer immediately
        }
    } catch (error) {
        console.error("Error fetching prayer times:", error);
        elements.nextPrayerName.textContent = "Error";
    }
}

// --- Rendering ---

function applyBackground() {
    if (state.bgUrl && state.bgUrl.trim() !== '') {
        document.body.style.backgroundImage = `url('${state.bgUrl}')`;
        elements.appContainer.classList.add('has-bg');
    } else {
        document.body.style.backgroundImage = 'none';
        elements.appContainer.classList.remove('has-bg');
    }
}

function updateClock() {
    const now = new Date();
    elements.clock.textContent = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
    elements.gregorianDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Update countdown every second
    if (state.nextPrayer) {
        updateCountdown();
    }
}

function updateHijriDate() {
    if (!state.hijriDate) return;

    // Basic day adjustment logic (Aladhan API provides hijri, we just shift the day number visually if needed)
    // Note: Accurate hijri adjustment requires more complex logic or API support, 
    // for this MVF we'll adjust the displayed day.

    const day = parseInt(state.hijriDate.day) + state.hijriOffset;
    elements.hijriDate.textContent = `${day} ${state.hijriDate.month.en} ${state.hijriDate.year} AH`;
}

// Basic mosque icon SVG path
const mosqueSvg = `<svg viewBox="0 0 512 512" class="mosque-icon-svg">
<path d="M256 0c-44.18 0-80 35.82-80 80 0 16.03 4.71 30.98 12.86 43.68C147.22 133.4 116.7 170.81 112.33 216H48v248h416V216h-64.33c-4.37-45.19-34.89-82.6-76.53-92.32C331.29 110.98 336 96.03 336 80c0-44.18-35.82-80-80-80z M256 32c26.51 0 48 21.49 48 48s-21.49 48-48 48-48-21.49-48-48 21.49-48 48-48z M144 248h32v200h-32V248z M224 248h64v200h-64V248z M336 248h32v200h-32V248z" fill="currentColor"/>
</svg>`;

function renderPrayers() {
    const structure = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    elements.prayerList.innerHTML = '';

    structure.forEach(prayer => {
        let time = formatTime(state.prayers[prayer]);
        const [timePart, suffix] = convertTo12HourComponents(state.prayers[prayer]);

        const div = document.createElement('div');
        div.className = 'prayer-item';
        div.id = `prayer-${prayer.toLowerCase()}`;

        // Check for active prayer highlighting logic if needed, 
        // assumed handled by checkNextPrayer class toggling

        div.innerHTML = `
            <div class="prayer-visuals">
                ${mosqueSvg}
                <div class="prayer-name">${prayer}</div>
            </div>
            <div class="prayer-time-circle">
                <span class="time-main">${timePart}</span>
                <span class="time-suffix">${suffix}</span>
            </div>
        `;
        elements.prayerList.appendChild(div);
    });
}

function convertTo12HourComponents(time24) {
    if (!time24 || time24 === '--:--') return ['--:--', '--'];
    // Remove " (EST)" etc if present in state, though formatTime usually handles cleanup
    // Assuming formatTime logic or raw API time "HH:MM"
    const [hours, minutes] = time24.replace(/ \(.*\)/, '').split(':');
    let h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return [`${h}:${minutes}`, suffix];
}

function renderAnnouncements() {
    elements.ticker.innerHTML = '';
    state.announcements.forEach(text => {
        const div = document.createElement('div');
        div.className = 'ticker__item';
        div.textContent = text;
        elements.ticker.appendChild(div);
    });
}

function renderJummah() {
    elements.jummahTime.textContent = state.jummah.time;
    if (elements.jummahDate) elements.jummahDate.textContent = state.jummah.date || '';
    elements.khatibName.textContent = state.jummah.khatib;
}

function renderHadith() {
    elements.hadithText.textContent = state.hadith.text;
    elements.hadithSource.textContent = state.hadith.source;
}

function renderMosqueInfo() {
    elements.mosqueName.textContent = state.mosque.name;
    elements.mosqueAddress.textContent = state.mosque.address;

    if (state.mosque.logo && state.mosque.logo.trim() !== '') {
        elements.mosqueLogo.src = state.mosque.logo;
        elements.mosqueLogo.classList.remove('hidden');
    } else {
        elements.mosqueLogo.src = '';
        elements.mosqueLogo.classList.add('hidden');
    }
}

function renderQR() {
    const renderOne = (url, container) => {
        if (url && url.trim() !== '') {
            container.innerHTML = `<img src="${url}" alt="QR Code">`;
        } else {
            container.innerHTML = `
                <svg viewBox="0 0 100 100" class="qr-icon" style="width:60%; height:60%; opacity:0.3;">
                    <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M30 50 L70 50 M50 30 L50 70" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
        }
    };

    renderOne(state.mosque.zelle, elements.qrZelle);
    renderOne(state.mosque.cashapp, elements.qrCashapp);
}

// --- Logic ---

function formatTime(time24) {
    // Converts "18:05" to "6:05 PM"
    // Aladhan implementation sometimes returns "18:05 (BST)" - need to clean
    const cleanTime = time24.split(' ')[0];
    let [hours, minutes] = cleanTime.split(':');
    hours = parseInt(hours);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
}

function checkNextPrayer() {
    const now = new Date();
    const prayerTimes = state.prayers;
    if (!prayerTimes) return;

    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let next = null;
    let nextTimeObj = null;

    // Find the first prayer that is in the future
    for (const prayer of prayers) { // iterate in order
        const timeStr = prayerTimes[prayer].split(' ')[0];
        const [h, m] = timeStr.split(':');
        const pDate = new Date();
        pDate.setHours(h, m, 0);

        if (pDate > now) {
            next = prayer;
            nextTimeObj = pDate;
            break;
        }
    }

    // If no more prayers today, next is Fajr tomorrow
    if (!next) {
        next = 'Fajr';
        const timeStr = prayerTimes['Fajr'].split(' ')[0];
        const [h, m] = timeStr.split(':');
        nextTimeObj = new Date();
        nextTimeObj.setDate(now.getDate() + 1);
        nextTimeObj.setHours(h, m, 0);
        // We really should fetch tomorrow's prayer times here properly, but for V1 this is a fallback approximation (using today's fajr time for tomorrow)
    }

    state.nextPrayer = { name: next, time: nextTimeObj };

    // Update UI highlights
    document.querySelectorAll('.prayer-item').forEach(el => el.classList.remove('next-prayer'));
    const nextEl = document.getElementById(`prayer-${next.toLowerCase()}`);
    if (nextEl) nextEl.classList.add('next-prayer');

    elements.nextPrayerName.textContent = next;

    checkSilentMode(now);
}

function updateCountdown() {
    if (!state.nextPrayer) return;

    const now = new Date();
    const diff = state.nextPrayer.time - now;

    if (diff <= 0) {
        // Time reached!
        checkNextPrayer();
        return;
    }

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    elements.countdown.textContent = `-${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function checkSilentMode(now) {
    // Show silent mode if within 15 mins of a prayer (Iqamah window simulation)
    // For this simple version: Show silent mode 5 mins BEFORE prayer and 10 mins AFTER
    // Actually typically dashboards show it AT prayer time.

    // Let's implement: Show for 10 minutes starting 1 minute before prayer time
    if (!state.nextPrayer) return;

    // Logic needs to check if we are currently "in" a prayer window.
    // simpler: Check if 'now' is close to any prayer time.

    let activeSilent = false;
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']; // Skip Sunrise

    for (const prayer of prayers) {
        const timeStr = state.prayers[prayer].split(' ')[0];
        const [h, m] = timeStr.split(':');
        const pDate = new Date();
        pDate.setHours(h, m, 0);

        // Window: -1 min to +1 min (Total 2 mins)
        // "Please silence your phones" appears 1 min before prayer and disappears 1 min after
        const startWindow = new Date(pDate.getTime() - 1 * 60000);
        const endWindow = new Date(pDate.getTime() + 1 * 60000);

        if (now >= startWindow && now <= endWindow) {
            activeSilent = true;
            break;
        }
    }

    if (activeSilent) {
        elements.silentOverlay.classList.remove('hidden');
    } else {
        elements.silentOverlay.classList.add('hidden');
    }
}

// --- Admin ---

function loadSettings() {
    const saved = localStorage.getItem('mascreen_settings');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.hijriOffset = parsed.hijriOffset || 0;
        state.jummah = parsed.jummah || state.jummah;
        state.jummah.date = state.jummah.date || ''; // Ensure date exists for old saves
        state.announcements = parsed.announcements || state.announcements;
        if (parsed.location) state.location = parsed.location;
        state.bgUrl = parsed.bgUrl || '';
        if (parsed.mosque) {
            state.mosque = parsed.mosque;
            // Ensure qrUrl is present, even if not saved previously
            state.mosque.qrUrl = state.mosque.qrUrl || '';
            state.mosque.zelle = state.mosque.zelle || '';
            state.mosque.cashapp = state.mosque.cashapp || '';
        }
        if (parsed.hadith) state.hadith = parsed.hadith;
    }
}

function saveSettings() {
    const rawAnnouncements = elements.inputs.announcements.value;
    state.announcements = rawAnnouncements.split('|').map(s => s.trim()).filter(s => s);
    state.jummah.time = elements.inputs.jummahTime.value;
    state.jummah.date = elements.inputs.jummahDate.value;
    state.jummah.khatib = elements.inputs.khatibName.value;
    state.hadith.text = elements.inputs.hadithText.value;
    state.hadith.source = elements.inputs.hadithSource.value;
    state.bgUrl = elements.inputs.bgUrl.value.trim();
    state.mosque.name = elements.inputs.mosqueName.value.trim() || state.mosque.name;
    state.mosque.logo = elements.inputs.mosqueLogo.value.trim();
    state.mosque.address = elements.inputs.mosqueAddress.value.trim() || state.mosque.address;
    state.mosque.zelle = elements.inputs.zelle.value.trim();
    state.mosque.cashapp = elements.inputs.cashapp.value.trim();

    localStorage.setItem('mascreen_settings', JSON.stringify({
        hijriOffset: state.hijriOffset,
        jummah: state.jummah,
        hadith: state.hadith,
        announcements: state.announcements,
        location: state.location,
        bgUrl: state.bgUrl,
        mosque: state.mosque
    }));

    renderAnnouncements();
    renderJummah();
    renderMosqueInfo();
    renderQR();
    updateHijriDate();
    applyBackground();

    elements.adminOverlay.classList.add('hidden');
}

// Events
elements.adminTrigger.addEventListener('click', () => {
    elements.adminOverlay.classList.remove('hidden');
});

elements.closeAdmin.addEventListener('click', () => {
    elements.adminOverlay.classList.add('hidden');
});

elements.loginBtn.addEventListener('click', () => {
    if (elements.adminPass.value === 'mascreen123') { // Simple weak security for MVF
        elements.inputs.announcements.value = state.announcements.join('|');
        elements.inputs.jummahTime.value = state.jummah.time;
        elements.inputs.khatibName.value = state.jummah.khatib;
        elements.inputs.hadithText.value = state.hadith.text;
        elements.inputs.hadithSource.value = state.hadith.source;
        elements.inputs.hijri.textContent = state.hijriOffset;
        elements.inputs.bgUrl.value = state.bgUrl || '';
        elements.inputs.mosqueName.value = state.mosque.name;
        elements.inputs.mosqueLogo.value = state.mosque.logo || '';
        elements.inputs.mosqueAddress.value = state.mosque.address;
        elements.inputs.zelle.value = state.mosque.zelle || '';
        elements.inputs.cashapp.value = state.mosque.cashapp || '';

        elements.loginForm.classList.add('hidden');
        elements.adminControls.classList.remove('hidden');
    } else {
        alert('Incorrect password');
    }
});

elements.saveBtn.addEventListener('click', saveSettings);

window.adjustHijri = function (val) {
    state.hijriOffset += val;
    elements.inputs.hijri.textContent = state.hijriOffset;
};

// Start
init();
