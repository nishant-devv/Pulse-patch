/**
 * Pulse & Patch AI - Core Application Logic
 * Premium University Semester Project Edition
 * Soothing wellness styling with visual range sliders and historical trending.
 */

// --- STATE & GLOBAL VARIABLES ---
let currentTab = 'symptoms';
let activeSymptomTags = new Set();
let isGenerating = false;

// --- DOM ELEMENTS ---
// Tab Buttons & Panels
const tabSymptomsBtn = document.getElementById('tab-symptoms-btn');
const tabLabsBtn = document.getElementById('tab-labs-btn');
const symptomsContent = document.getElementById('symptoms-content');
const labsContent = document.getElementById('labs-content');

// Symptom Elements
const symptomInput = document.getElementById('symptom-input');
const tags = document.querySelectorAll('.tag');
const analyzeSymptomsBtn = document.getElementById('analyze-symptoms-btn');

// Lab Elements
const labTypeSelect = document.getElementById('lab-type-select');
const fieldsCbc = document.getElementById('fields-cbc');
const fieldsLipid = document.getElementById('fields-lipid');
const fieldsThyroid = document.getElementById('fields-thyroid');
const analyzeLabsBtn = document.getElementById('analyze-labs-btn');

// Output Canvas Elements
const reportCanvas = document.getElementById('report-canvas');
const reportEmpty = document.getElementById('report-empty');
const reportActive = document.getElementById('report-active');
const reportCategoryBadge = document.getElementById('report-category-badge');
const reportDate = document.getElementById('report-date');
const reportHtmlOutput = document.getElementById('report-html-output');

// Utility Buttons
const printReportBtn = document.getElementById('print-report-btn');
const clearReportBtn = document.getElementById('clear-report-btn');

// Settings Modal Elements
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsApiKey = document.getElementById('settings-api-key');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const engineStatus = document.getElementById('engine-status');

// Saved Records Vault Elements
const vaultList = document.getElementById('vault-list');
const vaultCount = document.getElementById('vault-count');

// --- 1. SETTINGS & LOCAL STORAGE HANDLING ---

function getApiKey() {
    return localStorage.getItem('gemini_api_key') || '';
}

function saveApiKey(key) {
    localStorage.setItem('gemini_api_key', key.trim());
    updateEngineStatusBadge();
}

function updateEngineStatusBadge() {
    const key = getApiKey();
    if (key) {
        engineStatus.innerHTML = '<span class="status-dot blue"></span> Cloud Engine Connected';
        engineStatus.style.backgroundColor = 'var(--secondary-light)';
        engineStatus.style.color = 'var(--secondary)';
    } else {
        engineStatus.innerHTML = '<span class="status-dot green"></span> Local Engine Active';
        engineStatus.style.backgroundColor = 'var(--primary-light)';
        engineStatus.style.color = 'var(--primary)';
    }
}

// --- 2. TAB SWITCHING LOGIC ---

function switchTab(tabName) {
    if (isGenerating) return; // Prevent switching mid-processing
    
    currentTab = tabName;
    if (tabName === 'symptoms') {
        tabSymptomsBtn.classList.add('active');
        tabLabsBtn.classList.remove('active');
        symptomsContent.classList.remove('hidden');
        labsContent.classList.add('hidden');
    } else {
        tabSymptomsBtn.classList.remove('active');
        tabLabsBtn.classList.add('active');
        symptomsContent.classList.add('hidden');
        labsContent.classList.remove('hidden');
    }
}

function handleLabTypeChange() {
    if (isGenerating) return;
    
    const selected = labTypeSelect.value;
    fieldsCbc.classList.add('hidden');
    fieldsLipid.classList.add('hidden');
    fieldsThyroid.classList.add('hidden');

    if (selected === 'cbc') {
        fieldsCbc.classList.remove('hidden');
    } else if (selected === 'lipid') {
        fieldsLipid.classList.remove('hidden');
    } else if (selected === 'thyroid') {
        fieldsThyroid.classList.remove('hidden');
    }
}

// --- 3. STATE LOCKING / UNLOCKING (DOUBLE CLICK SAFETY) ---

function setControlsLocked(locked) {
    isGenerating = locked;
    const appContainer = document.querySelector('.container');
    
    if (locked) {
        appContainer.classList.add('app-locked');
    } else {
        appContainer.classList.remove('app-locked');
    }
    
    // Explicitly lock input controls to guarantee native browser safety
    symptomInput.disabled = locked;
    labTypeSelect.disabled = locked;
    
    document.querySelectorAll('.fields-grid input').forEach(input => {
        input.disabled = locked;
    });
    
    analyzeSymptomsBtn.disabled = locked;
    analyzeLabsBtn.disabled = locked;
    printReportBtn.disabled = locked;
    clearReportBtn.disabled = locked;
    openSettingsBtn.disabled = locked;
}

// --- 4. DECOUPLED SYMPTOM QUICK TAGS LOGIC ---

function toggleSymptomTag(event) {
    if (isGenerating) return; // Ignore input changes while generating
    
    const tag = event.target;
    const value = tag.getAttribute('data-value');
    
    if (activeSymptomTags.has(value)) {
        activeSymptomTags.delete(value);
        tag.classList.remove('active');
    } else {
        activeSymptomTags.add(value);
        tag.classList.add('active');
    }
}

// --- 5. THE CORE AI INTEGRATION ENGINE (GEMINI HANDSHAKE) ---

async function fetchGeminiAnalysis(promptText) {
    const key = getApiKey();
    if (!key) throw new Error("No API Key");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`;
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: promptText }]
            }]
        })
    });

    if (!response.ok) {
        throw new Error("Failed to contact Gemini API");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Prompt builders
function createSymptomSystemPrompt(userInput, tagsList) {
    const tagsPart = tagsList.length > 0 ? `Selected Quick Symptoms: [${tagsList.join(', ')}].` : '';
    
    return `You are a warm, highly empathetic, and practical family wellness guide. 
A normal person has submitted their everyday symptoms/concerns. 
Analyze the input and generate an easy-to-understand, non-scary clinical wellness letter. 

Translate any medical concepts into reassuring, warm, everyday terms.
Input symptoms: "${userInput}".
${tagsPart}

Please format your response into clean, simple HTML elements. Use <h2> for section headers. Structure your response into precisely these 4 sections:

1. <h2>What's Happening in Plain English</h2>
Reassure them. Give a simple, soft, and comforting explanation of what their symptoms usually indicate in everyday terms. Keep it gentle.

2. <h2>Safe Everyday Guidelines & Home Care</h2>
Provide 3-4 bulletproof, practical home-care tips (e.g., proper hydration, soothing compresses, dynamic rest, standard herbal steam or dietary adjustments).

3. <h2>Clinical Safety Checklist ("Red Flags")</h2>
Use a soft alert warning box to mention 3-4 clear warning signs that would require visiting an actual doctor's clinic immediately.

4. <h2>Smart Questions for Your Doctor</h2>
Give them 3 clean, simple questions they can print out and bring to their physician to make their appointment highly productive.

Do not use markdown blocks (e.g., \`\`\`html). Simply return the raw HTML content directly. Add a gentle, warm closing at the end.`;
}

function createLabSystemPrompt(labType, readings) {
    let readingDetails = "";
    for (const [key, value] of Object.entries(readings)) {
        if (value) readingDetails += `- ${key}: ${value}\n`;
    }

    return `You are a warm, highly comforting medical biomarker translator. 
A normal patient is confused by their recent lab results sheet and has input their numbers. 
Translate these readings in a non-scary, supportive way. Explain exactly what these values mean and give practical daily wellness tips.

Lab test type: ${labType}
Values entered:
${readingDetails}

Format your response in clean HTML elements. Use <h2> for section headers. Structure your response into precisely these 3 sections:

1. <h2>Your Readings Explained Simply</h2>
Generate a neat HTML table columns: (Biomarker, Your Value, Normal Range, Explanation).
Explain in simple, comforting terms what each biomarker does (e.g., "Hemoglobin is the delivery van for oxygen in your blood"). Explicitly state if their values are low, normal, or elevated in a gentle way.

2. <h2>Everyday Wellness Habits to Support Your Levels</h2>
Provide 3 highly actionable, simple diet, sleep, exercise, or hydration habits to improve or maintain these levels naturally.

3. <h2>Important Guidelines & Next Steps</h2>
Explain what they should do next, reassuring them that their doctor will evaluate this in context. Include a gentle disclaimer.

Do not use markdown blocks. Return the raw HTML content.`;
}

// --- 6. QUEST-STYLE BIOMARKER RANGE SLIDERS ---

function generateRangeSliderHtml(name, val, minVal, maxVal, normalMin, normalMax, unit) {
    const parsedVal = parseFloat(val);
    if (isNaN(parsedVal)) return '';
    
    // Math to position value pin on display spectrum
    let pct = ((parsedVal - minVal) / (maxVal - minVal)) * 100;
    pct = Math.max(3, Math.min(97, pct)); // Clamp to keep slider bounds safe
    
    // Normal Reference Bounds shaded region
    const normalStart = ((normalMin - minVal) / (maxVal - minVal)) * 100;
    const normalEnd = ((normalMax - minVal) / (maxVal - minVal)) * 100;
    
    let status = 'normal';
    let statusText = 'Normal';
    
    if (parsedVal < normalMin) {
        status = 'alert';
        statusText = 'Low';
    } else if (parsedVal > normalMax) {
        status = 'watch';
        statusText = 'Elevated';
    }
    
    return `
        <div class="range-slider-item">
            <div class="slider-label-group">
                <span class="slider-name">${name}</span>
                <div class="slider-val-status">
                    <span class="slider-val">${parsedVal} ${unit}</span>
                    <span class="slider-status-badge ${status}">${statusText}</span>
                </div>
            </div>
            <div class="range-track-container">
                <div class="range-normal-highlight" style="left: ${normalStart}%; width: ${normalEnd - normalStart}%;"></div>
                <div class="range-indicator-pin ${status}" style="left: ${pct}%;"></div>
            </div>
            <div class="slider-ref-bounds">
                <span>Min Bound: ${minVal}</span>
                <span>Optimal Bounds: ${normalMin} - ${normalMax} ${unit}</span>
                <span>Max Bound: ${maxVal}</span>
            </div>
        </div>
    `;
}

function generateBiomarkerSliders(labType, readings) {
    let slidersHtml = '';
    
    if (labType === 'cbc') {
        if (readings.hb) slidersHtml += generateRangeSliderHtml('Hemoglobin (Hb)', readings.hb, 8.0, 20.0, 12.0, 17.5, 'g/dL');
        if (readings.wbc) slidersHtml += generateRangeSliderHtml('White Blood Cells (WBC)', readings.wbc, 2.0, 16.0, 4.5, 11.0, 'x10³/µL');
        if (readings.plt) slidersHtml += generateRangeSliderHtml('Platelets', readings.plt, 50, 550, 150, 450, 'x10³/µL');
    } else if (labType === 'lipid') {
        if (readings.tc) slidersHtml += generateRangeSliderHtml('Total Cholesterol', readings.tc, 100, 300, 100, 200, 'mg/dL');
        if (readings.ldl) slidersHtml += generateRangeSliderHtml('LDL (Bad Cholesterol)', readings.ldl, 50, 250, 50, 100, 'mg/dL');
        if (readings.hdl) slidersHtml += generateRangeSliderHtml('HDL (Good Cholesterol)', readings.hdl, 20, 100, 40, 100, 'mg/dL');
        if (readings.tg) slidersHtml += generateRangeSliderHtml('Triglycerides', readings.tg, 50, 350, 50, 150, 'mg/dL');
    } else if (labType === 'thyroid') {
        if (readings.tsh) slidersHtml += generateRangeSliderHtml('TSH (Thyroid Hormones)', readings.tsh, 0.1, 8.0, 0.40, 4.50, 'uIU/mL');
    }
    
    if (!slidersHtml) return '';
    
    return `
        <div class="visual-biomarkers-dashboard">
            <h4>📊 Visual Reference Range Dashboard</h4>
            <div class="sliders-grid">
                ${slidersHtml}
            </div>
        </div>
    `;
}

// --- 7. HISTORICAL LONGITUDINAL TREND ENGINE ---

function generateTrendAnalysis(labType, currentReadings) {
    const records = JSON.parse(localStorage.getItem('pulse_patch_records') || '[]');
    
    // Find the nearest previous record of the identical labType
    const prevRecord = records.find(rec => rec.type === 'labs' && rec.inputs.labType === labType);
    if (!prevRecord) {
        return `
            <div class="trend-analysis-panel">
                <h4>📈 Historical Biomarker Trends</h4>
                <p class="trend-intro">First record of this test type saved. Future decodes will dynamically overlay and track historical changes right here!</p>
            </div>
        `;
    }
    
    const prevReadings = prevRecord.inputs.readings;
    let cardsHtml = '';
    
    const compareBiomarker = (name, currentStr, prevStr, unit, isLowerBetter = true) => {
        const curr = parseFloat(currentStr);
        const prev = parseFloat(prevStr);
        if (isNaN(curr) || isNaN(prev)) return '';
        
        const diff = curr - prev;
        const diffSign = diff > 0 ? '+' : '';
        const absDiffStr = `${diffSign}${diff.toFixed(curr % 1 === 0 && prev % 1 === 0 ? 0 : 2)}`;
        
        let healthClass = 'neutral-health';
        let arrowStr = '⟷';
        let clinicalNote = 'No structural change compared to previous values.';
        
        if (diff !== 0) {
            const improved = isLowerBetter ? (diff < 0) : (diff > 0);
            if (improved) {
                healthClass = 'positive-health';
                arrowStr = diff < 0 ? '📉' : '📈';
                
                if (name.includes('Cholesterol') || name.includes('LDL')) {
                    clinicalNote = 'Analysis: Your levels are moving into the optimal range. Keep up the soluble fiber intake!';
                } else {
                    clinicalNote = 'Analysis: Excellent! Levels are safely shifting in a healthy direction.';
                }
            } else {
                healthClass = 'negative-health';
                arrowStr = diff < 0 ? '📉' : '📈';
                
                if (name.includes('Cholesterol') || name.includes('LDL') || name.includes('Triglycerides')) {
                    clinicalNote = 'Tip: Focus on oats, healthy unsaturated fats, and regular dynamic walking to support this.';
                } else {
                    clinicalNote = 'Note: Slight upward pressure. Monitor levels closely with your physician.';
                }
            }
        }
        
        return `
            <div class="trend-card">
                <span class="trend-card-title">${name}</span>
                <div class="trend-card-delta ${healthClass}">
                    ${arrowStr} ${absDiffStr} ${unit}
                </div>
                <p class="trend-card-desc">Previous: ${prev} | Current: ${curr}</p>
                <p class="trend-card-desc" style="margin-top: 0.25rem;"><span>${clinicalNote}</span></p>
            </div>
        `;
    };
    
    if (labType === 'cbc') {
        if (currentReadings.hb && prevReadings.hb) cardsHtml += compareBiomarker('Hemoglobin (Hb)', currentReadings.hb, prevReadings.hb, 'g/dL', false);
        if (currentReadings.wbc && prevReadings.wbc) cardsHtml += compareBiomarker('White Blood Cells', currentReadings.wbc, prevReadings.wbc, 'x10³/µL', false);
        if (currentReadings.plt && prevReadings.plt) cardsHtml += compareBiomarker('Platelets', currentReadings.plt, prevReadings.plt, 'x10³/µL', false);
    } else if (labType === 'lipid') {
        if (currentReadings.tc && prevReadings.tc) cardsHtml += compareBiomarker('Total Cholesterol', currentReadings.tc, prevReadings.tc, 'mg/dL', true);
        if (currentReadings.ldl && prevReadings.ldl) cardsHtml += compareBiomarker('LDL Cholesterol', currentReadings.ldl, prevReadings.ldl, 'mg/dL', true);
        if (currentReadings.hdl && prevReadings.hdl) cardsHtml += compareBiomarker('HDL Cholesterol', currentReadings.hdl, prevReadings.hdl, 'mg/dL', false);
        if (currentReadings.tg && prevReadings.tg) cardsHtml += compareBiomarker('Triglycerides', currentReadings.tg, prevReadings.tg, 'mg/dL', true);
    } else if (labType === 'thyroid') {
        if (currentReadings.tsh && prevReadings.tsh) cardsHtml += compareBiomarker('TSH Signal', currentReadings.tsh, prevReadings.tsh, 'uIU/mL', true);
    }
    
    if (!cardsHtml) return '';
    
    return `
        <div class="trend-analysis-panel">
            <h4>📈 Historical Biomarker Trends</h4>
            <p class="trend-intro">Longitudinal analysis compared to your previous saved assessment on ${prevRecord.timestamp}:</p>
            <div class="trend-cards-grid">
                ${cardsHtml}
            </div>
        </div>
    `;
}

// --- 8. LOCAL HEALTH HEURISTICS ENGINE (OFFLINE FALLBACK) ---

function simulateSymptomLocalResponse(userInput, tagsList) {
    const combinedText = (userInput + " " + tagsList.join(" ")).toLowerCase();
    
    let explanation = "Based on the symptoms described, this appears to be a standard temporary physiological reaction to everyday stressors, seasonal shifts, or a minor localized inflammatory defense response.";
    let tips = [
        "Prioritize structural rest: Aim for 8 hours of uninterrupted sleep in a completely dark room.",
        "Optimal Hydration: Sip warm water or soothing chamomile herbal infusion every hour to keep respiratory mucous membranes moist.",
        "Clean, gentle nutrition: Opt for light, easily digestible meals (warm broths, crackers, bananas) to save metabolic energy for recovery."
    ];
    let warnings = [
        "A persistent body temperature exceeding 103°F (39.4°C) that doesn't lower with cooling compresses.",
        "Sudden, acute respiratory distress, severe chest constriction, or inability to take deep breaths.",
        "Severe, localized pain that intensifies rapidly over a few hours."
    ];
    let doctorQuestions = [
        "What simple lifestyle modifications or specific nutrients do you recommend to strengthen my recovery?",
        "Are there any specific over-the-counter soothing treatments I should choose or avoid based on my medical history?",
        "At what point or timeline should I schedule a follow-up visit if these symptoms don't fully resolve?"
    ];

    if (combinedText.includes("fever") || combinedText.includes("cough") || combinedText.includes("nose") || combinedText.includes("throat")) {
        explanation = "This presentation is typical of an everyday, common upper respiratory viral response (like a seasonal head cold). Your body's immune defense system is actively working to clear the congestion, which is completely natural.";
        tips = [
            "Steam Inhalation: Perform gentle warm steam inhalation for 5-10 minutes to soothe throat irritation and ease nasal passages.",
            "Saltwater Gargle: Dissolve 1/2 teaspoon of salt in warm water and gargle for 30 seconds, 3 times a day, to reduce throat swelling.",
            "Constant Warm Fluids: Sip warm lemon water or broth to loosen congestion and prevent dehydration."
        ];
        warnings = [
            "Development of a persistent high fever that doesn't respond to standard over-the-counter temperature remedies.",
            "Breathing that feels labored, wheezing, or triggers a sharp chest squeeze.",
            "Inability to swallow fluids or stay adequately hydrated."
        ];
    } else if (combinedText.includes("headache") || combinedText.includes("dizzy") || combinedText.includes("vision")) {
        explanation = "This is highly suggestive of everyday tension-type triggers, localized muscular strain in the neck/shoulders, or mild systemic dehydration. Your neurological system is simply signaling a need to pause, reset, and rehydrate.";
        tips = [
            "Cold or Warm Compress: Apply a cool damp cloth over your forehead or a warm pad on the back of your neck to ease muscle tension.",
            "Screen Fast: Rest your eyes by avoiding phone, laptop, or TV screens in a dimly lit, quiet room for at least 2 hours.",
            "Slow, Conscious Rehydration: Sip cool water mixed with a pinch of electrolytes to quickly restore cellular fluid balances."
        ];
        warnings = [
            "A sudden, severe headache that peaks in intensity within seconds (often described as a 'thunderclap' headache).",
            "Persistent blurred vision, slurred speech, or localized numbness on one side of your body.",
            "A stiff neck combined with an acute fever."
        ];
    } else if (combinedText.includes("nausea") || combinedText.includes("appetite") || combinedText.includes("stomach")) {
        explanation = "This points toward a temporary digestive slowing, possibly due to a minor dietary mismatch, mild stomach irritation, or transient viral gastroenteritis. Your stomach is actively asking for a short break to restore balanced enzymatic function.";
        tips = [
            "The BRAT Diet: Stick to simple, bland food choices like Bananas, Rice, Applesauce, and Toast once your stomach settles.",
            "Ginger or Peppermint Infusions: Sip warm ginger root tea or peppermint tea slowly to help soothe spasms in stomach walls.",
            "Avoid Flat-Lying Rest: Keep your head elevated by at least 30 degrees when resting to prevent acid reflux or worsening waves of nausea."
        ];
        warnings = [
            "Inability to retain liquids for more than 24 hours, leading to severe dry mouth or dark urine.",
            "Severe, sharp abdominal pain that becomes highly tender to light pressure.",
            "Noticeable blood in saliva or stools."
        ];
    }

    return `
        <h2>What's Happening in Plain English</h2>
        <p>${explanation}</p>
        <p><em>Note: This translates everyday symptom occurrences. Your body is highly resilient, and standard rest is the ultimate healing mechanism.</em></p>

        <h2>Safe Everyday Guidelines & Home Care</h2>
        <ul>
            ${tips.map(tip => `<li><strong>${tip.split(":")[0]}:</strong>${tip.split(":")[1]}</li>`).join("")}
        </ul>

        <h2>Clinical Safety Checklist ("Red Flags")</h2>
        <div class="report-warning-block">
            <strong>⚠️ When to consult an actual clinic:</strong>
            <p>While these home-care guidelines support daily recovery, please consult a primary care physician immediately if you experience:</p>
            <ul>
                ${warnings.map(warn => `<li>${warn}</li>`).join("")}
            </ul>
        </div>

        <h2>Smart Questions for Your Doctor</h2>
        <ol>
            ${doctorQuestions.map(q => `<li>${q}</li>`).join("")}
        </ol>
        <br>
        <p style="text-align: center; font-style: italic; color: var(--text-muted);">Wishing you a gentle, speedy recovery! 🍃</p>
    `;
}

function simulateLabLocalResponse(labType, readings) {
    let rowsHtml = "";
    let wellnessTips = [];

    if (labType === 'cbc') {
        const hb = parseFloat(readings.hb);
        const wbc = parseFloat(readings.wbc);
        const plt = parseFloat(readings.plt);

        if (!isNaN(hb)) {
            let status = "Normal";
            let desc = "Hemoglobin is the oxygen-carrying protein in red blood cells. Yours is in the optimal range.";
            if (hb < 12.0) {
                status = "<span style='color:var(--status-alert); font-weight:bold;'>Slightly Low</span>";
                desc = "Hemoglobin delivers vital oxygen. A slightly low reading suggests mild fatigue potential. Focus on iron-rich leafy greens.";
            } else if (hb > 17.5) {
                status = "<span style='color:var(--status-watch); font-weight:bold;'>Slightly High</span>";
                desc = "Slightly elevated. Often linked to simple mild dehydration. Make sure to sip more pure water throughout the day.";
            }
            rowsHtml += `<tr><td><strong>Hemoglobin (Hb)</strong></td><td>${hb} g/dL</td><td>12.0 - 17.5 g/dL</td><td>${status} - ${desc}</td></tr>`;
        }

        if (!isNaN(wbc)) {
            let status = "Normal";
            let desc = "White Blood Cells are your body's immune police defenders. Yours are perfectly balanced.";
            if (wbc < 4.5) {
                status = "<span style='color:var(--status-watch); font-weight:bold;'>Below Optimal</span>";
                desc = "WBC levels are slightly low. Suggests your immune guard is resting. Prioritize deep rest and vitamin-C rich foods.";
            } else if (wbc > 11.0) {
                status = "<span style='color:var(--status-alert); font-weight:bold;'>Elevated</span>";
                desc = "Slightly high WBC. This indicates your immune system is actively fighting off or recovering from a minor bug.";
            }
            rowsHtml += `<tr><td><strong>White Blood Cells</strong></td><td>${wbc} x10³/µL</td><td>4.5 - 11.0 x10³/µL</td><td>${status} - ${desc}</td></tr>`;
        }

        if (!isNaN(plt)) {
            let status = "Normal";
            let desc = "Platelets are key cellular structures responsible for normal clotting and structural blood repair.";
            if (plt < 150) {
                status = "<span style='color:var(--status-alert); font-weight:bold;'>Low</span>";
                desc = "Slightly low platelets. Essential to avoid excessive physical bruising. Inform your doctor for review.";
            } else if (plt > 450) {
                status = "<span style='color:var(--status-watch); font-weight:bold;'>Elevated</span>";
                desc = "Elevated platelet count. Often a temporary reaction to mild localized inflammation. Keep hydrated.";
            }
            rowsHtml += `<tr><td><strong>Platelets (PLT)</strong></td><td>${plt} x10³/µL</td><td>150 - 450 x10³/µL</td><td>${status} - ${desc}</td></tr>`;
        }

        wellnessTips = [
            "Iron Boost: Incorporate iron-dense, everyday foods like spinach, lentils, pumpkin seeds, and lean proteins combined with orange juice (Vitamin C enhances iron absorption).",
            "Immune Support: Prioritize antioxidant-rich whole fruits (berries, oranges, kiwi) to support strong, baseline white blood cell functions.",
            "Pure Fluids: Hydrate adequately with 2-3 liters of clean water daily to optimize fluid volumes."
        ];

    } else if (labType === 'lipid') {
        const tc = parseFloat(readings.tc);
        const ldl = parseFloat(readings.ldl);
        const hdl = parseFloat(readings.hdl);
        const tg = parseFloat(readings.tg);

        if (!isNaN(tc)) {
            let status = "Optimal";
            let desc = "Total circulating blood fats. Yours is in a very healthy, balanced range.";
            if (tc >= 200) {
                status = "<span style='color:var(--status-alert); font-weight:bold;'>Elevated</span>";
                desc = "Total cholesterol is slightly high. Soluble fibers (oats) bind cholesterol in the intestine to support healthy levels.";
            }
            rowsHtml += `<tr><td><strong>Total Cholesterol</strong></td><td>${tc} mg/dL</td><td>&lt; 200 mg/dL</td><td>${status} - ${desc}</td></tr>`;
        }

        if (!isNaN(ldl)) {
            let status = "Optimal";
            let desc = "LDL (often called 'Bad' fat carrier) is perfectly within safe structural parameters.";
            if (ldl >= 100) {
                status = "<span style='color:var(--status-alert); font-weight:bold;'>Elevated</span>";
                desc = "LDL is elevated. Swap cooking saturated fats with healthy polyunsaturated fats (like olive oil) to filter this.";
            }
            rowsHtml += `<tr><td><strong>LDL (Bad Fat)</strong></td><td>${ldl} mg/dL</td><td>&lt; 100 mg/dL</td><td>${status} - ${desc}</td></tr>`;
        }

        if (!isNaN(hdl)) {
            let status = "Optimal";
            let desc = "HDL ('Good' cholesterol scavenger) is actively sweeping away excess fats perfectly.";
            if (hdl < 40) {
                status = "<span style='color:var(--status-alert); font-weight:bold;'>Below Optimal</span>";
                desc = "HDL is slightly low. Increase HDL scavenger numbers naturally through aerobic exercise (brisk 20-min walks).";
            }
            rowsHtml += `<tr><td><strong>HDL (Good Fat)</strong></td><td>${hdl} mg/dL</td><td>&gt; 40 mg/dL</td><td>${status} - ${desc}</td></tr>`;
        }

        if (!isNaN(tg)) {
            let status = "Optimal";
            let desc = "Triglycerides are blood energy storage fats. Yours are completely within normal levels.";
            if (tg >= 150) {
                status = "<span style='color:var(--status-alert); font-weight:bold;'>Elevated</span>";
                desc = "Elevated storage fats. Highly linked to dietary simple sugars. Limit bakery sweets and sodas.";
            }
            rowsHtml += `<tr><td><strong>Triglycerides</strong></td><td>${tg} mg/dL</td><td>&lt; 150 mg/dL</td><td>${status} - ${desc}</td></tr>`;
        }

        wellnessTips = [
            "Soluble Fiber: Start your mornings with a simple bowl of oatmeal topped with chia seeds or walnuts to naturally bind and clear excess cholesterol.",
            "Dynamic Movement: Walk briskly for 20-30 minutes daily. Aerobic steps raise healthy HDL scavenger fats.",
            "Healthy Cooking Oils: Swap saturated butter or palm oils for heart-healthy cold-pressed extra virgin olive oil."
        ];

    } else if (labType === 'thyroid') {
        const tsh = parseFloat(readings.tsh);

        if (!isNaN(tsh)) {
            let status = "Normal";
            let desc = "TSH (Thyroid Stimulating Hormone) instructs the metabolism. Yours is perfectly balanced.";
            if (tsh < 0.40) {
                status = "<span style='color:var(--status-alert); font-weight:bold;'>Low TSH</span>";
                desc = "Suggests thyroid is slightly hyperactive (overproducing hormones). You might feel a bit jittery. Discuss with your GP.";
            } else if (tsh > 4.50) {
                status = "<span style='color:var(--status-alert); font-weight:bold;'>Elevated TSH</span>";
                desc = "Suggests thyroid is resting or running slow (underactive hypothyroid). Can cause feeling sluggish or cold.";
            }
            rowsHtml += `<tr><td><strong>TSH (Thyroid Signal)</strong></td><td>${tsh} uIU/mL</td><td>0.40 - 4.50 uIU/mL</td><td>${status} - ${desc}</td></tr>`;
        }

        wellnessTips = [
            "Trace Mineral Balance: Ensure a healthy, balanced dietary intake of sea minerals or kelp, crucial for thyroid hormone synthesis.",
            "Gentle Stress Management: Chronic cortisol spikes suppress thyroid pathways. Dedicate 10 minutes to deep belly breathing.",
            "Optimal Sleep Rhythms: Sleep before 11 PM to support regular endocrine hormone cycles."
        ];
    }

    if (!rowsHtml) {
        rowsHtml = `<tr><td colspan="4" style="text-align:center;">No valid readings were entered. Please input numerical values.</td></tr>`;
    }

    return `
        <h2>Your Readings Explained Simply</h2>
        <p>Here is an easy-to-read, plain English translation of the numbers you entered on your lab report:</p>
        <table>
            <thead>
                <tr>
                    <th>Biomarker Name</th>
                    <th>Your Value</th>
                    <th>Reference Range</th>
                    <th>Empathetic Translation & Insights</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <h2>Everyday Wellness Habits to Support Your Levels</h2>
        <p>Incorporate these simple, supportive daily practices to support healthy biomarker levels naturally:</p>
        <ul>
            ${wellnessTips.map(tip => `<li><strong>${tip.split(":")[0]}:</strong>${tip.split(":")[1]}</li>`).join("")}
        </ul>

        <h2>Important Guidelines & Next Steps</h2>
        <div class="report-warning-block">
            <strong>📢 Reassuring Health Disclaimer:</strong>
            <p>This translation helps you understand the terminology on your lab sheet. Lab ranges vary slightly between different clinics. Always consult your primary care doctor, who knows your complete clinical history, to evaluate these numbers as a whole. Do not adjust any prescribed medications without direct professional guidance.</p>
        </div>
        <br>
        <p style="text-align: center; font-style: italic; color: var(--text-muted);">Pulse & Patch AI | Clear, Empathetic Health Insights 🍃</p>
    `;
}

// --- 9. EVENT ACTION HANDLERS ---

async function handleSymptomAnalysis() {
    if (isGenerating) return;
    
    const notesInput = symptomInput.value.trim();
    const tagsList = Array.from(activeSymptomTags);
    
    if (!notesInput && tagsList.length === 0) {
        alert("Please write down some symptoms or select a quick-add tag first!");
        return;
    }

    // Set UI state: Locked & Loading
    setControlsLocked(true);
    analyzeSymptomsBtn.querySelector('.btn-text').textContent = "Decoding Symptoms...";
    analyzeSymptomsBtn.querySelector('.spinner').classList.remove('hidden');

    try {
        const apiKey = getApiKey();
        let reportHtml = "";
        
        // Merging user notes and tags under the hood
        let compiledPrompt = notesInput;
        if (tagsList.length > 0) {
            compiledPrompt = `[Selected Quick Tags: ${tagsList.join(', ')}].\nUser Context Notes: ${notesInput}`;
        }

        if (apiKey) {
            // Real cloud processing with Gemini
            const prompt = createSymptomSystemPrompt(notesInput, tagsList);
            reportHtml = await fetchGeminiAnalysis(prompt);
        } else {
            // Offline stable fallback engine
            await new Promise(resolve => setTimeout(resolve, 1500)); // Comforting simulated delay
            reportHtml = simulateSymptomLocalResponse(notesInput, tagsList);
        }

        renderReport("Symptom Guide", reportHtml, true, {
            type: 'symptoms',
            inputs: {
                notes: notesInput,
                tags: tagsList
            }
        });
    } catch (error) {
        console.warn("Cloud processing error, using local engine instead:", error);
        const fallbackHtml = simulateSymptomLocalResponse(notesInput, tagsList);
        renderReport("Symptom Guide (Local Fallback)", fallbackHtml, true, {
            type: 'symptoms',
            inputs: {
                notes: notesInput,
                tags: tagsList
            }
        });
    } finally {
        // Reset UI state
        setControlsLocked(false);
        analyzeSymptomsBtn.querySelector('.btn-text').textContent = "Generate Home Care Plan";
        analyzeSymptomsBtn.querySelector('.spinner').classList.add('hidden');
    }
}

async function handleLabAnalysis() {
    if (isGenerating) return;
    
    const labType = labTypeSelect.value;
    let readings = {};

    if (labType === 'cbc') {
        readings = {
            hb: document.getElementById('cbc-hb').value.trim(),
            wbc: document.getElementById('cbc-wbc').value.trim(),
            plt: document.getElementById('cbc-plt').value.trim()
        };
    } else if (labType === 'lipid') {
        readings = {
            tc: document.getElementById('lipid-tc').value.trim(),
            ldl: document.getElementById('lipid-ldl').value.trim(),
            hdl: document.getElementById('lipid-hdl').value.trim(),
            tg: document.getElementById('lipid-tg').value.trim()
        };
    } else if (labType === 'thyroid') {
        readings = {
            tsh: document.getElementById('thyroid-tsh').value.trim()
        };
    }

    // Check if at least one value was input
    const hasValues = Object.values(readings).some(val => val !== "");
    if (!hasValues) {
        alert("Please enter at least one lab value to decode!");
        return;
    }

    // Set UI state: Locked & Loading
    setControlsLocked(true);
    analyzeLabsBtn.querySelector('.btn-text').textContent = "Decoding Lab Values...";
    analyzeLabsBtn.querySelector('.spinner').classList.remove('hidden');

    try {
        const apiKey = getApiKey();
        let reportHtml = "";

        if (apiKey) {
            // Real cloud processing with Gemini
            const prompt = createLabSystemPrompt(labType.toUpperCase(), readings);
            reportHtml = await fetchGeminiAnalysis(prompt);
        } else {
            // Offline stable fallback engine
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            reportHtml = simulateLabLocalResponse(labType, readings);
        }

        renderReport("Lab Interpretation", reportHtml, true, {
            type: 'labs',
            inputs: {
                labType,
                readings
            }
        });
    } catch (error) {
        console.warn("Cloud processing error, using local engine instead:", error);
        const fallbackHtml = simulateLabLocalResponse(labType, readings);
        renderReport("Lab Interpretation (Local Fallback)", fallbackHtml, true, {
            type: 'labs',
            inputs: {
                labType,
                readings
            }
        });
    } finally {
        // Reset UI state
        setControlsLocked(false);
        analyzeLabsBtn.querySelector('.btn-text').textContent = "Decode Lab Values";
        analyzeLabsBtn.querySelector('.spinner').classList.add('hidden');
    }
}

function formatMarkdownToHtml(text) {
    if (!text) return "";
    
    let formatted = text.replace(/```(?:html|markdown)?([\s\S]*?)```/g, '$1');
    formatted = formatted.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^[*-] (.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
    
    return formatted.trim();
}

function renderReport(category, htmlContent, shouldSave = false, payload = null) {
    reportCategoryBadge.textContent = category;
    reportDate.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const formattedHtml = formatMarkdownToHtml(htmlContent);
    
    // Inject dynamic elements on the fly for Lab interpretations
    let visualSlidersHtml = '';
    let trendComparisonHtml = '';
    
    if (payload && payload.type === 'labs') {
        visualSlidersHtml = generateBiomarkerSliders(payload.inputs.labType, payload.inputs.readings);
        trendComparisonHtml = generateTrendAnalysis(payload.inputs.labType, payload.inputs.readings);
    }
    
    // Concat layout: Trend Insights -> Biomarker Sliders -> Main empathetic letter report
    reportHtmlOutput.innerHTML = trendComparisonHtml + visualSlidersHtml + formattedHtml;

    // Show result canvas
    reportEmpty.classList.add('hidden');
    reportActive.classList.remove('hidden');
    
    // Auto-save to localStorage Vault if triggered by active generation
    if (shouldSave && payload) {
        saveRecord(payload.type, payload.inputs, htmlContent);
    }
    
    // Smooth scroll output panel into view on mobile
    reportCanvas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetForm() {
    if (isGenerating) return;
    
    // Clear symptom inputs
    symptomInput.value = "";
    activeSymptomTags.clear();
    tags.forEach(tag => tag.classList.remove('active'));

    // Clear all lab input fields
    document.querySelectorAll('.fields-grid input').forEach(input => input.value = "");

    // Clear report state
    reportEmpty.classList.remove('hidden');
    reportActive.classList.add('hidden');
    reportHtmlOutput.innerHTML = "";
}

// --- 10. SAVED RECORDS VAULT CONTROLS ---

function saveRecord(type, inputs, outputHtml) {
    let title = "Symptom Care Plan";
    
    if (type === 'symptoms') {
        if (inputs.tags.length > 0) {
            title = `Symptom: ${inputs.tags.slice(0, 2).join(', ')}`;
            if (inputs.tags.length > 2) title += '...';
        } else if (inputs.notes) {
            title = `Symptom: ${inputs.notes.slice(0, 20)}...`;
        }
    } else {
        if (inputs.labType === 'cbc') title = "CBC Blood Count";
        else if (inputs.labType === 'lipid') title = "Lipid Cholesterol Panel";
        else if (inputs.labType === 'thyroid') title = "TSH Thyroid Test";
    }
    
    const timestamp = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const records = JSON.parse(localStorage.getItem('pulse_patch_records') || '[]');
    const newRecord = {
        id: Date.now().toString(),
        type,
        title,
        timestamp,
        inputs,
        outputHtml
    };
    
    records.unshift(newRecord);
    if (records.length > 5) records.pop(); // Cap at 5 local historical records
    
    localStorage.setItem('pulse_patch_records', JSON.stringify(records));
    renderVault();
}

function renderVault() {
    const records = JSON.parse(localStorage.getItem('pulse_patch_records') || '[]');
    vaultCount.textContent = `${records.length} record${records.length === 1 ? '' : 's'}`;
    
    if (records.length === 0) {
        vaultList.innerHTML = `
            <div class="vault-empty">
                No saved records yet. Your completed decodes will be stored locally here.
            </div>`;
        return;
    }
    
    let itemsHtml = '';
    records.forEach(rec => {
        const icon = rec.type === 'symptoms' ? '🩹' : '📊';
        itemsHtml += `
            <div class="vault-item" data-id="${rec.id}">
                <div class="vault-item-info" onclick="loadRecord('${rec.id}')">
                    <span class="vault-item-title">${icon} ${rec.title}</span>
                    <span class="vault-item-meta">${rec.timestamp}</span>
                </div>
                <div class="vault-actions">
                    <button class="vault-btn load" onclick="loadRecord('${rec.id}')">Load</button>
                    <button class="vault-btn delete" onclick="deleteRecord('${rec.id}')">Delete</button>
                </div>
            </div>
        `;
    });
    
    vaultList.innerHTML = itemsHtml;
}

function loadRecord(id) {
    if (isGenerating) return;
    
    const records = JSON.parse(localStorage.getItem('pulse_patch_records') || '[]');
    const record = records.find(rec => rec.id === id);
    if (!record) return;
    
    if (record.type === 'symptoms') {
        switchTab('symptoms');
        symptomInput.value = record.inputs.notes || '';
        
        // Restore active tag visual highlights
        activeSymptomTags = new Set(record.inputs.tags);
        tags.forEach(tag => {
            const val = tag.getAttribute('data-value');
            if (activeSymptomTags.has(val)) {
                tag.classList.add('active');
            } else {
                tag.classList.remove('active');
            }
        });
        
        renderReport("Symptom Guide", record.outputHtml, false, record);
    } else {
        switchTab('labs');
        labTypeSelect.value = record.inputs.labType;
        handleLabTypeChange();
        
        // Restore numerical readings
        const readings = record.inputs.readings;
        if (record.inputs.labType === 'cbc') {
            document.getElementById('cbc-hb').value = readings.hb || '';
            document.getElementById('cbc-wbc').value = readings.wbc || '';
            document.getElementById('cbc-plt').value = readings.plt || '';
        } else if (record.inputs.labType === 'lipid') {
            document.getElementById('lipid-tc').value = readings.tc || '';
            document.getElementById('lipid-ldl').value = readings.ldl || '';
            document.getElementById('lipid-hdl').value = readings.hdl || '';
            document.getElementById('lipid-tg').value = readings.tg || '';
        } else if (record.inputs.labType === 'thyroid') {
            document.getElementById('thyroid-tsh').value = readings.tsh || '';
        }
        
        renderReport("Lab Interpretation", record.outputHtml, false, record);
    }
}

function deleteRecord(id) {
    if (isGenerating) return;
    
    let records = JSON.parse(localStorage.getItem('pulse_patch_records') || '[]');
    records = records.filter(rec => rec.id !== id);
    localStorage.setItem('pulse_patch_records', JSON.stringify(records));
    renderVault();
}

// Attach vault controls directly to global window scope so dynamic row HTML onclick handlers work
window.loadRecord = loadRecord;
window.deleteRecord = deleteRecord;

// --- 11. EVENT LISTENERS SETUP ---

// Tabs Switchers
tabSymptomsBtn.addEventListener('click', () => switchTab('symptoms'));
tabLabsBtn.addEventListener('click', () => switchTab('labs'));

// Lab Dropdown Change
labTypeSelect.addEventListener('click', handleLabTypeChange);
labTypeSelect.addEventListener('change', handleLabTypeChange);

// Symptoms tags Click Handler
tags.forEach(tag => tag.addEventListener('click', toggleSymptomTag));

// Action Buttons
analyzeSymptomsBtn.addEventListener('click', handleSymptomAnalysis);
analyzeLabsBtn.addEventListener('click', handleLabAnalysis);

// Settings Modals
openSettingsBtn.addEventListener('click', () => {
    if (isGenerating) return;
    settingsApiKey.value = getApiKey();
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

saveSettingsBtn.addEventListener('click', () => {
    saveApiKey(settingsApiKey.value);
    settingsModal.classList.add('hidden');
    alert("API Key saved successfully! App connected.");
});

// Settings Modal backdrop click
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
    }
});

// Utilities buttons
printReportBtn.addEventListener('click', () => {
    if (isGenerating) return;
    window.print();
});
clearReportBtn.addEventListener('click', resetForm);

// --- 12. INITIALIZATION ---

window.addEventListener('DOMContentLoaded', () => {
    // Load Saved API key config
    updateEngineStatusBadge();
    
    // Dynamic form selector initialization
    handleLabTypeChange();
    
    // Load local history vault
    renderVault();
});
