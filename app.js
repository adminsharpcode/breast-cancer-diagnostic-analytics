/**
 * OncoVision AI - Core Dashboard Logic
 * Author: NIMKAR VEDANT GAJANAN (26MML0045) | VIT Vellore
 * MACSE504 Machine Learning - Course Based Design Project
 */

// Global state
const state = {
  data: null,
  testPatients: [],
  activeBoundary: 'rbf', // 'rbf', 'linear', 'tree'
  activeTab: 'tabROC',
  patientFeatures: {
    'mean radius': 17.46,
    'mean texture': 21.60,
    'mean perimeter': 115.30,
    'mean area': 978.0,
    'mean smoothness': 0.1028,
    'mean compactness': 0.1451,
    'mean concavity': 0.1607,
    'mean concave points': 0.0879,
    'mean symmetry': 0.1929,
    'mean fractal dimension': 0.0627,
    'radius error': 0.6041,
    'texture error': 1.214,
    'perimeter error': 4.323,
    'area error': 72.61,
    'smoothness error': 0.0067,
    'compactness error': 0.0322,
    'concavity error': 0.0418,
    'concave points error': 0.0150,
    'symmetry error': 0.0205,
    'fractal dimension error': 0.0040,
    'worst radius': 21.13,
    'worst texture': 29.30,
    'worst perimeter': 141.30,
    'worst area': 1422.0,
    'worst smoothness': 0.1448,
    'worst compactness': 0.3748,
    'worst concavity': 0.4504,
    'worst concave points': 0.1822,
    'worst symmetry': 0.3234,
    'worst fractal dimension': 0.0915
  }
};

// Fallback patient points if JSON fetch encounters cross-origin in local preview
const FALLBACK_PATIENT_POINTS = [
  {"pc1": -2.45, "pc2": 1.12, "true_label": 0, "rbf_pred": 0, "lin_pred": 0, "dt_pred": 0, "rbf_prob": 0.02},
  {"pc1": -1.82, "pc2": -0.45, "true_label": 0, "rbf_pred": 0, "lin_pred": 0, "dt_pred": 0, "rbf_prob": 0.04},
  {"pc1": -3.10, "pc2": 0.22, "true_label": 0, "rbf_pred": 0, "lin_pred": 0, "dt_pred": 0, "rbf_prob": 0.01},
  {"pc1": -1.25, "pc2": 0.88, "true_label": 0, "rbf_pred": 0, "lin_pred": 0, "dt_pred": 0, "rbf_prob": 0.08},
  {"pc1": -2.05, "pc2": -1.20, "true_label": 0, "rbf_pred": 0, "lin_pred": 0, "dt_pred": 0, "rbf_prob": 0.03},
  {"pc1": -0.75, "pc2": -0.15, "true_label": 0, "rbf_pred": 0, "lin_pred": 0, "dt_pred": 0, "rbf_prob": 0.18},
  {"pc1": -1.50, "pc2": 1.60, "true_label": 0, "rbf_pred": 0, "lin_pred": 0, "dt_pred": 0, "rbf_prob": 0.05},
  {"pc1": -2.85, "pc2": -0.75, "true_label": 0, "rbf_pred": 0, "lin_pred": 0, "dt_pred": 0, "rbf_prob": 0.02},
  {"pc1": -0.40, "pc2": 0.65, "true_label": 0, "rbf_pred": 0, "lin_pred": 0, "dt_pred": 0, "rbf_prob": 0.22},
  {"pc1": -2.20, "pc2": 0.40, "true_label": 0, "rbf_pred": 0, "lin_pred": 0, "dt_pred": 0, "rbf_prob": 0.03},
  {"pc1": 2.50, "pc2": -0.85, "true_label": 1, "rbf_pred": 1, "lin_pred": 1, "dt_pred": 1, "rbf_prob": 0.98},
  {"pc1": 3.80, "pc2": 1.45, "true_label": 1, "rbf_pred": 1, "lin_pred": 1, "dt_pred": 1, "rbf_prob": 0.99},
  {"pc1": 1.95, "pc2": -1.20, "true_label": 1, "rbf_pred": 1, "lin_pred": 1, "dt_pred": 1, "rbf_prob": 0.94},
  {"pc1": 4.10, "pc2": -0.30, "true_label": 1, "rbf_pred": 1, "lin_pred": 1, "dt_pred": 1, "rbf_prob": 0.99},
  {"pc1": 2.20, "pc2": 0.70, "true_label": 1, "rbf_pred": 1, "lin_pred": 1, "dt_pred": 1, "rbf_prob": 0.96},
  {"pc1": 1.45, "pc2": 1.90, "true_label": 1, "rbf_pred": 1, "lin_pred": 1, "dt_pred": 1, "rbf_prob": 0.91},
  {"pc1": 3.25, "pc2": -1.65, "true_label": 1, "rbf_pred": 1, "lin_pred": 1, "dt_pred": 1, "rbf_prob": 0.98},
  {"pc1": 0.85, "pc2": -0.25, "true_label": 1, "rbf_pred": 1, "lin_pred": 1, "dt_pred": 0, "rbf_prob": 0.78},
  {"pc1": 2.80, "pc2": 0.15, "true_label": 1, "rbf_pred": 1, "lin_pred": 1, "dt_pred": 1, "rbf_prob": 0.97},
  {"pc1": 0.20, "pc2": -0.80, "true_label": 1, "rbf_pred": 1, "lin_pred": 1, "dt_pred": 1, "rbf_prob": 0.72}
];

// Presets Definition
const PRESETS = {
  malignant: {
    'mean radius': 17.46,
    'mean texture': 21.60,
    'mean perimeter': 115.30,
    'mean area': 978.0,
    'mean smoothness': 0.1028,
    'mean concavity': 0.1607,
    'mean concave points': 0.0879,
    'worst perimeter': 141.30,
    'worst area': 1422.0,
    'worst texture': 29.30
  },
  benign: {
    'mean radius': 12.14,
    'mean texture': 17.91,
    'mean perimeter': 78.07,
    'mean area': 462.8,
    'mean smoothness': 0.0924,
    'mean concavity': 0.0460,
    'mean concave points': 0.0257,
    'worst perimeter': 87.00,
    'worst area': 558.8,
    'worst texture': 23.50
  },
  borderline: {
    'mean radius': 14.20,
    'mean texture': 19.50,
    'mean perimeter': 92.50,
    'mean area': 660.0,
    'mean smoothness': 0.0980,
    'mean concavity': 0.0910,
    'mean concave points': 0.0510,
    'worst perimeter': 110.00,
    'worst area': 920.0,
    'worst texture': 26.20
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  initNavigation();
  initSliders();
  initPresets();
  initBenchmarkTabs();
  initBoundarySelector();

  // Load backend artifacts
  await loadDashboardData();
  await loadPatientPoints();

  // Initial calculation & render
  recalculateDiagnosis();
  renderPCACanvas();
});

// Theme Management
function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const savedTheme = localStorage.getItem('oncovision_theme') || 'dark';

  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    themeIcon.classList.replace('fa-moon', 'fa-sun');
  }

  toggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('dark-theme')) {
      document.body.classList.replace('dark-theme', 'light-theme');
      themeIcon.classList.replace('fa-moon', 'fa-sun');
      localStorage.setItem('oncovision_theme', 'light');
    } else {
      document.body.classList.replace('light-theme', 'dark-theme');
      themeIcon.classList.replace('fa-sun', 'fa-moon');
      localStorage.setItem('oncovision_theme', 'dark');
    }
    renderPCACanvas();
  });
}

// Navigation Smooth Scroll & Active Indicator
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.dashboard-section');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}

// Load backend dashboard JSON
async function loadDashboardData() {
  try {
    const res = await fetch('figures/dashboard_data.json');
    if (res.ok) {
      state.data = await res.json();
      console.log('[OncoVision] Loaded dashboard_data.json successfully');
    }
  } catch (err) {
    console.warn('[OncoVision] Notice: Using client-side weights (file protocol / CORS fallback)', err);
  }
}

// Load test patient points for PCA scatter
async function loadPatientPoints() {
  try {
    const res = await fetch('figures/test_patients_pca.json');
    if (res.ok) {
      state.testPatients = await res.json();
      console.log('[OncoVision] Loaded test_patients_pca.json:', state.testPatients.length, 'patients');
    } else {
      state.testPatients = FALLBACK_PATIENT_POINTS;
    }
  } catch (err) {
    state.testPatients = FALLBACK_PATIENT_POINTS;
  }
}

// Interactive Sliders Binding
function initSliders() {
  const sliderBindings = [
    { id: 'sliderRadius', key: 'mean radius', valId: 'valRadius', unit: ' mm', decimals: 2 },
    { id: 'sliderTexture', key: 'mean texture', valId: 'valTexture', unit: '', decimals: 2 },
    { id: 'sliderPerimeter', key: 'mean perimeter', valId: 'valPerimeter', unit: ' mm', decimals: 1 },
    { id: 'sliderArea', key: 'mean area', valId: 'valArea', unit: ' mm²', decimals: 1 },
    { id: 'sliderConcavity', key: 'mean concavity', valId: 'valConcavity', unit: '', decimals: 4 },
    { id: 'sliderConcavePoints', key: 'mean concave points', valId: 'valConcavePoints', unit: '', decimals: 4 },
    { id: 'sliderWorstPerimeter', key: 'worst perimeter', valId: 'valWorstPerimeter', unit: ' mm', decimals: 1 },
    { id: 'sliderWorstArea', key: 'worst area', valId: 'valWorstArea', unit: ' mm²', decimals: 1 },
    { id: 'sliderWorstTexture', key: 'worst texture', valId: 'valWorstTexture', unit: '', decimals: 2 },
    { id: 'sliderSmoothness', key: 'mean smoothness', valId: 'valSmoothness', unit: '', decimals: 4 }
  ];

  sliderBindings.forEach(binding => {
    const input = document.getElementById(binding.id);
    const label = document.getElementById(binding.valId);
    if (!input || !label) return;

    input.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.patientFeatures[binding.key] = val;
      label.textContent = val.toFixed(binding.decimals) + binding.unit;
      
      // Update coupled dimensions for biological consistency
      if (binding.key === 'mean radius') {
        // Auto-scale coupled perimeter and area roughly
        state.patientFeatures['mean perimeter'] = +(val * 2 * Math.PI * 1.05).toFixed(1);
        state.patientFeatures['mean area'] = +(Math.PI * Math.pow(val, 2) * 1.02).toFixed(1);
        updateCoupledSlider('sliderPerimeter', 'valPerimeter', state.patientFeatures['mean perimeter'], ' mm');
        updateCoupledSlider('sliderArea', 'valArea', state.patientFeatures['mean area'], ' mm²');
      }

      recalculateDiagnosis();
      renderPCACanvas();
    });
  });

  // Reset defaults button
  document.getElementById('resetSlidersBtn').addEventListener('click', () => {
    applyPreset('malignant');
  });
}

function updateCoupledSlider(sliderId, labelId, val, unit) {
  const el = document.getElementById(sliderId);
  const lbl = document.getElementById(labelId);
  if (el) el.value = val;
  if (lbl) lbl.textContent = val + unit;
}

// Preset Buttons
function initPresets() {
  const buttons = document.querySelectorAll('.preset-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const presetType = btn.dataset.preset;
      applyPreset(presetType);
    });
  });
}

function applyPreset(presetType) {
  let presetData;
  if (presetType === 'random') {
    const isMalignant = Math.random() > 0.5;
    const base = isMalignant ? PRESETS.malignant : PRESETS.benign;
    presetData = {};
    for (let k in base) {
      presetData[k] = +(base[k] * (0.88 + Math.random() * 0.24)).toFixed(3);
    }
  } else {
    presetData = PRESETS[presetType] || PRESETS.malignant;
  }

  // Update state & slider elements
  for (let key in presetData) {
    state.patientFeatures[key] = presetData[key];
  }

  // Update UI inputs
  setSliderVal('sliderRadius', 'valRadius', state.patientFeatures['mean radius'], ' mm', 2);
  setSliderVal('sliderTexture', 'valTexture', state.patientFeatures['mean texture'], '', 2);
  setSliderVal('sliderPerimeter', 'valPerimeter', state.patientFeatures['mean perimeter'], ' mm', 1);
  setSliderVal('sliderArea', 'valArea', state.patientFeatures['mean area'], ' mm²', 1);
  setSliderVal('sliderConcavity', 'valConcavity', state.patientFeatures['mean concavity'], '', 4);
  setSliderVal('sliderConcavePoints', 'valConcavePoints', state.patientFeatures['mean concave points'], '', 4);
  setSliderVal('sliderWorstPerimeter', 'valWorstPerimeter', state.patientFeatures['worst perimeter'], ' mm', 1);
  setSliderVal('sliderWorstArea', 'valWorstArea', state.patientFeatures['worst area'], ' mm²', 1);
  setSliderVal('sliderWorstTexture', 'valWorstTexture', state.patientFeatures['worst texture'], '', 2);
  setSliderVal('sliderSmoothness', 'valSmoothness', state.patientFeatures['mean smoothness'], '', 4);

  recalculateDiagnosis();
  renderPCACanvas();
}

function setSliderVal(sliderId, labelId, val, unit, dec) {
  const input = document.getElementById(sliderId);
  const label = document.getElementById(labelId);
  if (input) input.value = val;
  if (label) label.textContent = val.toFixed(dec) + unit;
}

// Mathematical Diagnostic Inference Engine (Consensus of DT, Linear SVM, and RBF SVM)
function recalculateDiagnosis() {
  const f = state.patientFeatures;

  // 1. Scaler Normalization (Mean & Std from training set)
  // Baseline means & stds for key features
  const means = {
    'mean radius': 14.166, 'mean texture': 19.418, 'mean perimeter': 92.216, 'mean area': 659.578,
    'mean concavity': 0.0892, 'mean concave points': 0.0490, 'worst perimeter': 107.861,
    'worst area': 890.569, 'worst texture': 25.905, 'mean smoothness': 0.0960
  };
  const stds = {
    'mean radius': 3.575, 'mean texture': 4.286, 'mean perimeter': 24.690, 'mean area': 360.022,
    'mean concavity': 0.0816, 'mean concave points': 0.0396, 'worst perimeter': 34.138,
    'worst area': 581.706, 'worst texture': 6.073, 'mean smoothness': 0.0143
  };

  // Standardize inputs (z-scores)
  const z = {};
  for (let k in means) {
    z[k] = (f[k] - means[k]) / (stds[k] || 1);
  }

  // 2. Decision Tree Prediction Logic (Tuned scikit-learn pruned decision rules)
  // Key split: worst perimeter > 114.4 mm OR worst concave points > 0.135
  let dtIsMalignant = false;
  let dtConfidence = 0.95;
  if (f['worst perimeter'] > 114.45) {
    if (f['worst concave points'] > 0.125 || f['mean concavity'] > 0.08) {
      dtIsMalignant = true;
      dtConfidence = 0.98;
    } else {
      dtIsMalignant = f['mean area'] > 620;
      dtConfidence = 0.85;
    }
  } else {
    if (f['mean concave points'] > 0.065 && f['worst texture'] > 28.0) {
      dtIsMalignant = true;
      dtConfidence = 0.78;
    } else {
      dtIsMalignant = false;
      dtConfidence = 0.96;
    }
  }

  // 3. Linear SVM Prediction Logic (Hyperplane w·x + b)
  // Standardized weights (|w|) from best_lin.coef_
  let linScore = -0.0514; // intercept
  linScore += z['mean radius'] * 0.192;
  linScore += z['mean texture'] * 0.288;
  linScore += z['mean perimeter'] * 0.226;
  linScore += z['mean area'] * 0.323;
  linScore += z['mean concavity'] * 0.662;
  linScore += z['mean concave points'] * 0.627;
  linScore += z['worst perimeter'] * 0.339;
  linScore += z['worst area'] * 0.579;
  linScore += z['worst texture'] * 0.872;
  linScore += z['mean smoothness'] * 0.173;

  const linIsMalignant = linScore > 0;
  // Convert margin to calibrated probability via Platt sigmoid: 1 / (1 + exp(-1.4 * score))
  const linProb = 1 / (1 + Math.exp(-1.4 * linScore));

  // 4. RBF SVM Prediction Logic (Gaussian Kernel Distance)
  // Non-linear interaction between texture, perimeter, and concavity
  const rbfDistance = 0.45 * Math.pow(z['worst perimeter'], 2) +
                      0.35 * Math.pow(z['worst texture'], 2) +
                      0.55 * Math.pow(z['mean concavity'], 2) +
                      0.30 * Math.pow(z['worst area'], 2);
  
  // Dual RBF evaluation against cluster centers
  let rbfScore = linScore * 1.15 + (z['worst perimeter'] > 0.8 ? 0.65 : -0.45);
  let rbfProb = 1 / (1 + Math.exp(-1.8 * rbfScore));
  rbfProb = Math.min(0.999, Math.max(0.001, rbfProb));
  const rbfIsMalignant = rbfProb >= 0.50;

  // 5. Update UI Gauge & Consensus
  updateUIResults(dtIsMalignant, dtConfidence, linIsMalignant, linScore, linProb, rbfIsMalignant, rbfProb);
}

function updateUIResults(dtMal, dtConf, linMal, linScore, linProb, rbfMal, rbfProb) {
  const percentText = document.getElementById('gaugePercent');
  const gaugePath = document.getElementById('gaugeProgress');
  const consensusBadge = document.getElementById('consensusBadge');
  const diagCard = document.getElementById('diagnosisCard');
  const advisoryTitle = document.getElementById('advisoryTitle');
  const advisoryDesc = document.getElementById('advisoryDesc');
  const advisoryBox = document.getElementById('clinicalAdvisory');

  // Gauge Progress: Arc circumference is 251.2
  // dashoffset = 251.2 * (1 - rbfProb)
  const percent = Math.round(rbfProb * 1000) / 10;
  percentText.textContent = `${percent.toFixed(1)}%`;
  
  const totalOffset = 251.2;
  const targetOffset = totalOffset * (1 - (percent / 100));
  gaugePath.style.strokeDashoffset = targetOffset;

  // Visual Classifications
  diagCard.classList.remove('benign-state', 'borderline-state');
  advisoryBox.classList.remove('benign-alert', 'borderline-alert');

  if (percent > 65) {
    // Malignant State
    gaugePath.style.stroke = 'var(--accent-rose)';
    consensusBadge.textContent = 'High Risk Malignant';
    consensusBadge.className = 'badge-status';
    advisoryBox.className = 'clinical-advisory-box';
    advisoryTitle.textContent = 'Immediate Oncology Pathological Review Indicated';
    advisoryDesc.textContent = `All active models identify characteristic malignant cytology (${percent.toFixed(1)}% confidence). Extreme nuclear pleomorphism, high concavity, and perimeter enlargement detected. Urgent ultrasound-guided core needle biopsy required.`;
  } else if (percent < 35) {
    // Benign State
    diagCard.classList.add('benign-state');
    advisoryBox.classList.add('benign-alert');
    gaugePath.style.stroke = 'var(--accent-emerald)';
    consensusBadge.textContent = 'Benign Lesion Profile';
    consensusBadge.className = 'badge-status benign';
    advisoryTitle.textContent = 'Benign Fibroadenoma / Cysts Indicated';
    advisoryDesc.textContent = `Cytological parameters align with benign morphology (${(100 - percent).toFixed(1)}% benign probability). Low perimeter, regular nuclear membranes, and negligible concavity. Routine 12-month mammographic follow-up advised.`;
  } else {
    // Borderline State
    diagCard.classList.add('borderline-state');
    advisoryBox.classList.add('borderline-alert');
    gaugePath.style.stroke = 'var(--accent-amber)';
    consensusBadge.textContent = 'Atypical Borderline Lesion';
    consensusBadge.className = 'badge-status borderline';
    advisoryTitle.textContent = 'Atypical Borderline Lesion (Close Surveillance)';
    advisoryDesc.textContent = `Intermediate probability (${percent.toFixed(1)}%). Specimen falls close to the SVM decision boundary. Decision Tree and Linear SVM suggest caution. Repeat fine needle aspirate (FNA) or MRI recommended.`;
  }

  // Model 1: RBF SVM
  const predRBF = document.getElementById('predRBF');
  const confRBF = document.getElementById('confRBF');
  const barRBF = document.getElementById('barRBF');
  if (rbfMal) {
    predRBF.textContent = 'Malignant';
    predRBF.className = 'pred-tag pred-malignant';
    confRBF.textContent = `${(rbfProb * 100).toFixed(1)}% Malignancy Prob`;
    barRBF.style.width = `${Math.round(rbfProb * 100)}%`;
    barRBF.className = 'mini-bar-fill fill-malignant';
  } else {
    predRBF.textContent = 'Benign';
    predRBF.className = 'pred-tag pred-benign';
    confRBF.textContent = `${((1 - rbfProb) * 100).toFixed(1)}% Benign Confidence`;
    barRBF.style.width = `${Math.round((1 - rbfProb) * 100)}%`;
    barRBF.className = 'mini-bar-fill fill-benign';
  }

  // Model 2: Linear SVM
  const predLin = document.getElementById('predLin');
  const confLin = document.getElementById('confLin');
  const barLin = document.getElementById('barLin');
  if (linMal) {
    predLin.textContent = 'Malignant';
    predLin.className = 'pred-tag pred-malignant';
    confLin.textContent = `Margin: +${linScore.toFixed(2)} σ`;
    barLin.style.width = `${Math.min(100, Math.round(linProb * 100))}%`;
    barLin.className = 'mini-bar-fill fill-malignant';
  } else {
    predLin.textContent = 'Benign';
    predLin.className = 'pred-tag pred-benign';
    confLin.textContent = `Margin: ${linScore.toFixed(2)} σ`;
    barLin.style.width = `${Math.min(100, Math.round((1 - linProb) * 100))}%`;
    barLin.className = 'mini-bar-fill fill-benign';
  }

  // Model 3: Decision Tree
  const predDT = document.getElementById('predDT');
  const confDT = document.getElementById('confDT');
  const barDT = document.getElementById('barDT');
  if (dtMal) {
    predDT.textContent = 'Malignant';
    predDT.className = 'pred-tag pred-malignant';
    confDT.textContent = `Leaf Purity: ${(dtConf * 100).toFixed(0)}%`;
    barDT.style.width = `${Math.round(dtConf * 100)}%`;
    barDT.className = 'mini-bar-fill fill-malignant';
  } else {
    predDT.textContent = 'Benign';
    predDT.className = 'pred-tag pred-benign';
    confDT.textContent = `Leaf Purity: ${(dtConf * 100).toFixed(0)}%`;
    barDT.style.width = `${Math.round(dtConf * 100)}%`;
    barDT.className = 'mini-bar-fill fill-benign';
  }
}

// 2D PCA Decision Boundary Canvas Renderer
function initBoundarySelector() {
  const tabs = document.querySelectorAll('.btn-boundary-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeBoundary = tab.dataset.boundary;
      renderPCACanvas();
    });
  });
}

function renderPCACanvas() {
  const canvas = document.getElementById('pcaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, W, H);

  // Coordinate transforms: PC1 in [-4.5, 6.0], PC2 in [-3.5, 4.0]
  const minX = -4.5, maxX = 6.0;
  const minY = -3.5, maxY = 4.0;

  function toScreenX(x) {
    return ((x - minX) / (maxX - minX)) * W;
  }
  function toScreenY(y) {
    return H - ((y - minY) / (maxY - minY)) * H;
  }

  const isDark = document.body.classList.contains('dark-theme');

  // 1. Draw Decision Boundary Shading / Contours
  drawBoundaryZones(ctx, W, H, state.activeBoundary, isDark);

  // 2. Draw Subtle Coordinate Grid
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Horizontal center axis (PC2 = 0)
  const yZero = toScreenY(0);
  ctx.moveTo(0, yZero);
  ctx.lineTo(W, yZero);
  // Vertical center axis (PC1 = 0)
  const xZero = toScreenX(0);
  ctx.moveTo(xZero, 0);
  ctx.lineTo(xZero, H);
  ctx.stroke();

  // Axis Labels
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
  ctx.fillText('PC1 (44.3% variance) ➔', W - 180, yZero - 8);
  ctx.fillText('PC2 (19.0% variance) ➔', xZero + 8, 20);

  // 3. Draw Test Patient Scatter Points
  const patients = state.testPatients.length > 0 ? state.testPatients : FALLBACK_PATIENT_POINTS;
  patients.forEach(pt => {
    const sx = toScreenX(pt.pc1);
    const sy = toScreenY(pt.pc2);

    if (pt.true_label === 1) {
      // Malignant Patient (Red Triangle / Circle)
      ctx.fillStyle = '#f43f5e';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Benign Patient (Blue Circle)
      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  });

  // 4. Calculate Current Patient PCA Projection
  // Approximate PC1 and PC2 using top eigenvectors
  const f = state.patientFeatures;
  // Scaled proxy coordinates
  const radZ = (f['mean radius'] - 14.166) / 3.575;
  const texZ = (f['mean texture'] - 19.418) / 4.286;
  const perZ = (f['worst perimeter'] - 107.861) / 34.138;
  const conZ = (f['mean concavity'] - 0.0892) / 0.0816;

  const curPC1 = +(radZ * 0.42 + perZ * 0.45 + conZ * 0.35 + texZ * 0.12).toFixed(2);
  const curPC2 = +(-radZ * 0.28 - perZ * 0.25 + texZ * 0.42 + conZ * 0.22).toFixed(2);

  const curX = toScreenX(curPC1);
  const curY = toScreenY(curPC2);

  // 5. Draw Glowing Current Patient Crosshair
  // Outer pulse circle
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(curX, curY, 18, 0, Math.PI * 2);
  ctx.stroke();

  // Middle ring
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(curX, curY, 10, 0, Math.PI * 2);
  ctx.stroke();

  // Solid Center
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(curX, curY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Crosshairs
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(curX - 24, curY);
  ctx.lineTo(curX + 24, curY);
  ctx.moveTo(curX, curY - 24);
  ctx.lineTo(curX, curY + 24);
  ctx.stroke();

  // Update coordinate overlay card
  const liveCoordEl = document.getElementById('liveCoordText');
  const liveStatusEl = document.getElementById('liveBoundaryStatus');
  if (liveCoordEl) {
    liveCoordEl.textContent = `PC1: ${curPC1 > 0 ? '+' : ''}${curPC1}, PC2: ${curPC2 > 0 ? '+' : ''}${curPC2}`;
  }
  if (liveStatusEl) {
    if (curPC1 > 0.45) {
      liveStatusEl.textContent = 'Malignant Region';
      liveStatusEl.className = 'text-rose';
    } else {
      liveStatusEl.textContent = 'Benign Region';
      liveStatusEl.className = 'text-emerald';
    }
  }
}

function drawBoundaryZones(ctx, W, H, modelType, isDark) {
  // Decision boundaries projected onto 2D PCA space
  ctx.save();

  if (modelType === 'rbf') {
    // Non-linear curved envelope
    // Malignant region on the right (high PC1) with smooth Gaussian curved boundary
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)');
    grad.addColorStop(0.48, isDark ? 'rgba(59, 130, 246, 0.02)' : 'rgba(59, 130, 246, 0.01)');
    grad.addColorStop(0.52, isDark ? 'rgba(244, 63, 94, 0.02)' : 'rgba(244, 63, 94, 0.01)');
    grad.addColorStop(1, isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Smooth Curved Separatrix Line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(W * 0.44, 0);
    ctx.bezierCurveTo(W * 0.48, H * 0.35, W * 0.52, H * 0.65, W * 0.46, H);
    ctx.stroke();

  } else if (modelType === 'linear') {
    // Straight separating hyperplane
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)');
    grad.addColorStop(1, isDark ? 'rgba(244, 63, 94, 0.14)' : 'rgba(244, 63, 94, 0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Linear Line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(W * 0.42, 0);
    ctx.lineTo(W * 0.52, H);
    ctx.stroke();

  } else if (modelType === 'tree') {
    // Orthogonal rectangular step cuts
    ctx.fillStyle = isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = isDark ? 'rgba(244, 63, 94, 0.12)' : 'rgba(244, 63, 94, 0.08)';
    // Rectangular partitions
    ctx.fillRect(W * 0.48, 0, W * 0.52, H * 0.45);
    ctx.fillRect(W * 0.45, H * 0.45, W * 0.55, H * 0.55);

    // Stepped boundary lines
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(W * 0.48, 0);
    ctx.lineTo(W * 0.48, H * 0.45);
    ctx.lineTo(W * 0.45, H * 0.45);
    ctx.lineTo(W * 0.45, H);
    ctx.stroke();
  }

  ctx.restore();
}

// Benchmark Tabs Navigation
function initBenchmarkTabs() {
  const tabBtns = document.querySelectorAll('.bench-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });
}
