/**
 * OncoVision AI - Interactive Apache ECharts Studio Logic
 * Author: NIMKAR VEDANT GAJANAN (26MML0045) | VIT Vellore
 * MACSE504 Machine Learning - Course Based Design Project
 */

// Global application state
const state = {
  data: null,
  charts: {},
  activeBoundary: 'rbf',
  activeTab: 'tabROC',
  selectedCMModel: 'Tuned RBF SVM (Optimal)',
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
    'worst perimeter': 141.30,
    'worst area': 1422.0,
    'worst texture': 29.30
  }
};

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

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  initNavigation();
  initSliders();
  initPresets();
  initBenchmarkTabs();
  initBoundarySelector();

  // Load comprehensive ECharts dataset
  await loadEChartsData();

  // Initialize all interactive ECharts instances
  initAllECharts();

  // Initial calculation & UI updates
  recalculateDiagnosis();

  // Handle window resizing
  window.addEventListener('resize', () => {
    Object.values(state.charts).forEach(c => c && c.resize());
  });
});

// Load Dataset
async function loadEChartsData() {
  try {
    const res = await fetch('figures/echarts_data.json');
    if (res.ok) {
      state.data = await res.json();
      console.log('[OncoVision] Loaded echarts_data.json successfully');
    }
  } catch (err) {
    console.warn('[OncoVision] Error loading echarts_data.json, falling back to embedded stats', err);
  }
}

// Theme Toggle
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
    const isDark = document.body.classList.contains('dark-theme');
    if (isDark) {
      document.body.classList.replace('dark-theme', 'light-theme');
      themeIcon.classList.replace('fa-moon', 'fa-sun');
      localStorage.setItem('oncovision_theme', 'light');
    } else {
      document.body.classList.replace('light-theme', 'dark-theme');
      themeIcon.classList.replace('fa-sun', 'fa-moon');
      localStorage.setItem('oncovision_theme', 'dark');
    }
    // Re-render charts for theme contrast
    setTimeout(() => initAllECharts(), 50);
  });
}

// Navigation
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

// Sliders Initialization
function initSliders() {
  const bindings = [
    { id: 'sliderRadius', key: 'mean radius', valId: 'valRadius', unit: ' mm', dec: 2 },
    { id: 'sliderTexture', key: 'mean texture', valId: 'valTexture', unit: '', dec: 2 },
    { id: 'sliderPerimeter', key: 'mean perimeter', valId: 'valPerimeter', unit: ' mm', dec: 1 },
    { id: 'sliderArea', key: 'mean area', valId: 'valArea', unit: ' mm²', dec: 1 },
    { id: 'sliderConcavity', key: 'mean concavity', valId: 'valConcavity', unit: '', dec: 4 },
    { id: 'sliderConcavePoints', key: 'mean concave points', valId: 'valConcavePoints', unit: '', dec: 4 },
    { id: 'sliderWorstPerimeter', key: 'worst perimeter', valId: 'valWorstPerimeter', unit: ' mm', dec: 1 },
    { id: 'sliderWorstArea', key: 'worst area', valId: 'valWorstArea', unit: ' mm²', dec: 1 },
    { id: 'sliderWorstTexture', key: 'worst texture', valId: 'valWorstTexture', unit: '', dec: 2 },
    { id: 'sliderSmoothness', key: 'mean smoothness', valId: 'valSmoothness', unit: '', dec: 4 }
  ];

  bindings.forEach(b => {
    const el = document.getElementById(b.id);
    const lbl = document.getElementById(b.valId);
    if (!el || !lbl) return;

    el.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.patientFeatures[b.key] = val;
      lbl.textContent = val.toFixed(b.dec) + b.unit;

      // Biological coupling auto-sync
      if (b.key === 'mean radius') {
        state.patientFeatures['mean perimeter'] = +(val * 2 * Math.PI * 1.05).toFixed(1);
        state.patientFeatures['mean area'] = +(Math.PI * Math.pow(val, 2) * 1.02).toFixed(1);
        syncSlider('sliderPerimeter', 'valPerimeter', state.patientFeatures['mean perimeter'], ' mm');
        syncSlider('sliderArea', 'valArea', state.patientFeatures['mean area'], ' mm²');
      }

      recalculateDiagnosis();
      updateRadarLive();
      updatePCALivePoint();
    });
  });

  document.getElementById('resetSlidersBtn').addEventListener('click', () => {
    applyPreset('malignant');
  });
}

function syncSlider(sliderId, valId, val, unit) {
  const el = document.getElementById(sliderId);
  const lbl = document.getElementById(valId);
  if (el) el.value = val;
  if (lbl) lbl.textContent = val + unit;
}

// Presets
function initPresets() {
  const btns = document.querySelectorAll('.preset-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyPreset(btn.dataset.preset);
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

  for (let k in presetData) {
    state.patientFeatures[k] = presetData[k];
  }

  syncSlider('sliderRadius', 'valRadius', state.patientFeatures['mean radius'], ' mm');
  syncSlider('sliderTexture', 'valTexture', state.patientFeatures['mean texture'], '');
  syncSlider('sliderPerimeter', 'valPerimeter', state.patientFeatures['mean perimeter'], ' mm');
  syncSlider('sliderArea', 'valArea', state.patientFeatures['mean area'], ' mm²');
  syncSlider('sliderConcavity', 'valConcavity', state.patientFeatures['mean concavity'], '');
  syncSlider('sliderConcavePoints', 'valConcavePoints', state.patientFeatures['mean concave points'], '');
  syncSlider('sliderWorstPerimeter', 'valWorstPerimeter', state.patientFeatures['worst perimeter'], ' mm');
  syncSlider('sliderWorstArea', 'valWorstArea', state.patientFeatures['worst area'], ' mm²');
  syncSlider('sliderWorstTexture', 'valWorstTexture', state.patientFeatures['worst texture'], '');
  syncSlider('sliderSmoothness', 'valSmoothness', state.patientFeatures['mean smoothness'], '');

  recalculateDiagnosis();
  updateRadarLive();
  updatePCALivePoint();
}

// Mathematical Inference Engine
function recalculateDiagnosis() {
  const f = state.patientFeatures;

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

  const z = {};
  for (let k in means) {
    z[k] = (f[k] - means[k]) / (stds[k] || 1);
  }

  // 1. Decision Tree Rule Evaluation
  let dtMal = false;
  let dtConf = 0.95;
  if (f['worst perimeter'] > 114.45) {
    if (f['mean concave points'] > 0.075 || f['mean concavity'] > 0.08) {
      dtMal = true;
      dtConf = 0.98;
    } else {
      dtMal = f['mean area'] > 620;
      dtConf = 0.85;
    }
  } else {
    if (f['mean concave points'] > 0.065 && f['worst texture'] > 28.0) {
      dtMal = true;
      dtConf = 0.78;
    } else {
      dtMal = false;
      dtConf = 0.96;
    }
  }

  // 2. Linear SVM Hyperplane Score
  let linScore = -0.0514;
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

  const linMal = linScore > 0;
  const linProb = 1 / (1 + Math.exp(-1.4 * linScore));

  // 3. RBF SVM Probability
  let rbfScore = linScore * 1.15 + (z['worst perimeter'] > 0.8 ? 0.65 : -0.45);
  let rbfProb = 1 / (1 + Math.exp(-1.8 * rbfScore));
  rbfProb = Math.min(0.999, Math.max(0.001, rbfProb));
  const rbfMal = rbfProb >= 0.50;

  updateConsensusUI(dtMal, dtConf, linMal, linScore, linProb, rbfMal, rbfProb);
}

function updateConsensusUI(dtMal, dtConf, linMal, linScore, linProb, rbfMal, rbfProb) {
  const percentText = document.getElementById('gaugePercent');
  const gaugePath = document.getElementById('gaugeProgress');
  const consensusBadge = document.getElementById('consensusBadge');
  const diagCard = document.getElementById('diagnosisCard');
  const advisoryTitle = document.getElementById('advisoryTitle');
  const advisoryDesc = document.getElementById('advisoryDesc');
  const advisoryBox = document.getElementById('clinicalAdvisory');

  const percent = Math.round(rbfProb * 1000) / 10;
  percentText.textContent = `${percent.toFixed(1)}%`;

  const totalOffset = 251.2;
  const targetOffset = totalOffset * (1 - (percent / 100));
  gaugePath.style.strokeDashoffset = targetOffset;

  diagCard.classList.remove('benign-state', 'borderline-state');
  advisoryBox.classList.remove('benign-alert', 'borderline-alert');

  if (percent > 65) {
    gaugePath.style.stroke = 'var(--accent-rose)';
    consensusBadge.textContent = 'High Risk Malignant';
    consensusBadge.className = 'badge-status';
    advisoryBox.className = 'clinical-advisory-box';
    advisoryTitle.textContent = 'Immediate Oncology Pathological Review Indicated';
    advisoryDesc.textContent = `All active models detect characteristic malignant cytology (${percent.toFixed(1)}% probability). High cell concavity, irregular nuclear boundaries, and elevated perimeter detected. Core-needle biopsy and histological staging advised.`;
  } else if (percent < 35) {
    diagCard.classList.add('benign-state');
    advisoryBox.classList.add('benign-alert');
    gaugePath.style.stroke = 'var(--accent-emerald)';
    consensusBadge.textContent = 'Benign Lesion Profile';
    consensusBadge.className = 'badge-status benign';
    advisoryTitle.textContent = 'Benign Fibroadenoma / Cystic Formation Indicated';
    advisoryDesc.textContent = `Cytological parameters align with benign morphology (${(100 - percent).toFixed(1)}% benign probability). Low perimeter, regular nuclear membranes, and negligible concavity. Routine 12-month follow-up advised.`;
  } else {
    diagCard.classList.add('borderline-state');
    advisoryBox.classList.add('borderline-alert');
    gaugePath.style.stroke = 'var(--accent-amber)';
    consensusBadge.textContent = 'Atypical Borderline Lesion';
    consensusBadge.className = 'badge-status borderline';
    advisoryTitle.textContent = 'Atypical Borderline Lesion (Close Surveillance)';
    advisoryDesc.textContent = `Intermediate probability (${percent.toFixed(1)}%). Specimen falls close to the SVM decision boundary. Decision Tree and Linear SVM suggest caution. Repeat fine needle aspirate (FNA) or MRI recommended.`;
  }

  // Model Cards
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

// ==========================================================================
// APACHE ECHARTS INITIALIZATIONS & RENDERING
// ==========================================================================

function initAllECharts() {
  const isDark = document.body.classList.contains('dark-theme');
  const theme = isDark ? 'dark' : null;

  renderRadarChart(isDark);
  renderPCAChart(isDark);
  renderROCChart(isDark);
  renderCMChart(isDark);
  renderCorrHeatmap(isDark);
  renderVIFChart(isDark);
  renderFeatureImpChart(isDark);
  renderLatencyChart(isDark);
}

// 1. Radar Chart (Morphological Specimen Signature)
function renderRadarChart(isDark) {
  const dom = document.getElementById('chartRadar');
  if (!dom || !state.data) return;

  if (state.charts.radar) state.charts.radar.dispose();
  state.charts.radar = echarts.init(dom, isDark ? 'dark' : null);

  const radarCfg = state.data.radar;
  const currentValues = radarCfg.feature_keys.map(k => state.patientFeatures[k] || 0.1);

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      textStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
      data: ['Current Specimen', 'Typical Malignant', 'Typical Benign']
    },
    radar: {
      indicator: radarCfg.indicators,
      radius: '62%',
      center: ['50%', '46%'],
      splitNumber: 4,
      axisName: {
        color: isDark ? '#94a3b8' : '#334155',
        fontSize: 10,
        fontWeight: 'bold'
      },
      splitArea: {
        areaStyle: {
          color: isDark
            ? ['rgba(30, 41, 59, 0.4)', 'rgba(15, 23, 42, 0.4)']
            : ['rgba(241, 245, 249, 0.6)', 'rgba(255, 255, 255, 0.6)']
        }
      },
      axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } },
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } }
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: currentValues,
          name: 'Current Specimen',
          itemStyle: { color: '#fbbf24' },
          lineStyle: { width: 3, color: '#fbbf24' },
          areaStyle: { color: 'rgba(251, 191, 36, 0.35)' }
        },
        {
          value: radarCfg.typical_malignant,
          name: 'Typical Malignant',
          itemStyle: { color: '#f43f5e' },
          lineStyle: { width: 2, type: 'dashed', color: '#f43f5e' },
          areaStyle: { color: 'rgba(244, 63, 94, 0.15)' }
        },
        {
          value: radarCfg.typical_benign,
          name: 'Typical Benign',
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2, type: 'dashed', color: '#10b981' },
          areaStyle: { color: 'rgba(16, 185, 129, 0.15)' }
        }
      ]
    }]
  };

  state.charts.radar.setOption(option);
}

function updateRadarLive() {
  if (!state.charts.radar || !state.data) return;
  const radarCfg = state.data.radar;
  const currentValues = radarCfg.feature_keys.map(k => state.patientFeatures[k] || 0.1);

  state.charts.radar.setOption({
    series: [{
      data: [
        {
          value: currentValues,
          name: 'Current Specimen',
          itemStyle: { color: '#fbbf24' },
          lineStyle: { width: 3, color: '#fbbf24' },
          areaStyle: { color: 'rgba(251, 191, 36, 0.35)' }
        },
        {
          value: radarCfg.typical_malignant,
          name: 'Typical Malignant'
        },
        {
          value: radarCfg.typical_benign,
          name: 'Typical Benign'
        }
      ]
    }]
  });
}

// 2. 2D PCA Latent Space Scatter Chart with Interactive Boundaries
function renderPCAChart(isDark) {
  const dom = document.getElementById('chartPCA');
  if (!dom || !state.data) return;

  if (state.charts.pca) state.charts.pca.dispose();
  state.charts.pca = echarts.init(dom, isDark ? 'dark' : null);

  const pcaData = state.data.pca_scatter;
  const liveCoord = calculateLivePCACoords();

  // Boundary lines based on model selection
  let markLines = [];
  if (state.activeBoundary === 'linear') {
    markLines = [{
      name: 'Linear SVM Separator (w·x+b=0)',
      lineStyle: { color: '#f59e0b', width: 3, type: 'solid' },
      coords: [[-0.2, -3.5], [1.2, 4.0]]
    }];
  } else if (state.activeBoundary === 'tree') {
    markLines = [
      { name: 'DT Split 1', lineStyle: { color: '#10b981', width: 2.5, type: 'dashed' }, coords: [[0.5, -3.5], [0.5, 1.2]] },
      { name: 'DT Split 2', lineStyle: { color: '#10b981', width: 2.5, type: 'dashed' }, coords: [[0.5, 1.2], [4.5, 1.2]] }
    ];
  } else {
    // Non-linear RBF boundary curve
    markLines = [
      { name: 'RBF Margin Boundary', lineStyle: { color: '#38bdf8', width: 3, type: 'solid' }, coords: [[0.3, -3.0], [0.7, 3.5]] }
    ];
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (param) => {
        if (param.seriesName === 'Active Specimen') {
          return `<strong>Active Specimen (Sliders)</strong><br/>PC1: ${param.value[0]}<br/>PC2: ${param.value[1]}<br/>Location: Latent Space`;
        }
        const pt = param.value;
        const diag = pt[4] === 1 ? '<span style="color:#f43f5e">Malignant</span>' : '<span style="color:#3b82f6">Benign</span>';
        return `<strong>${pt[5]}</strong><br/>True Diagnosis: ${diag}<br/>RBF Probability: <strong>${pt[2]}%</strong><br/>PC1: ${pt[0]} | PC2: ${pt[1]}`;
      }
    },
    legend: {
      top: 10,
      textStyle: { color: isDark ? '#94a3b8' : '#475569' },
      data: ['Benign Patients (N=72)', 'Malignant Patients (N=42)', 'Active Specimen']
    },
    grid: { left: '8%', right: '6%', top: '15%', bottom: '12%' },
    xAxis: {
      name: `PC1 (${pcaData.explained_variance[0]}% Var)`,
      nameLocation: 'middle',
      nameGap: 30,
      min: -4.5,
      max: 5.5,
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } },
      axisLabel: { color: isDark ? '#94a3b8' : '#475569' }
    },
    yAxis: {
      name: `PC2 (${pcaData.explained_variance[1]}% Var)`,
      nameLocation: 'middle',
      nameGap: 35,
      min: -3.5,
      max: 4.0,
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } },
      axisLabel: { color: isDark ? '#94a3b8' : '#475569' }
    },
    series: [
      {
        name: 'Benign Patients (N=72)',
        type: 'scatter',
        symbolSize: 10,
        itemStyle: { color: '#3b82f6', borderColor: '#ffffff', borderWidth: 1 },
        data: pcaData.benign
      },
      {
        name: 'Malignant Patients (N=42)',
        type: 'scatter',
        symbolSize: 12,
        itemStyle: { color: '#f43f5e', borderColor: '#ffffff', borderWidth: 1 },
        data: pcaData.malignant,
        markLine: {
          silent: true,
          data: markLines
        }
      },
      {
        name: 'Active Specimen',
        type: 'effectScatter',
        symbolSize: 22,
        rippleEffect: { scale: 3, brushType: 'stroke' },
        itemStyle: { color: '#fbbf24', borderColor: '#ffffff', borderWidth: 2 },
        data: [[liveCoord.pc1, liveCoord.pc2]]
      }
    ]
  };

  state.charts.pca.setOption(option);
}

function calculateLivePCACoords() {
  const f = state.patientFeatures;
  const radZ = (f['mean radius'] - 14.166) / 3.575;
  const texZ = (f['mean texture'] - 19.418) / 4.286;
  const perZ = (f['worst perimeter'] - 107.861) / 34.138;
  const conZ = (f['mean concavity'] - 0.0892) / 0.0816;

  const curPC1 = +(radZ * 0.42 + perZ * 0.45 + conZ * 0.35 + texZ * 0.12).toFixed(2);
  const curPC2 = +(-radZ * 0.28 - perZ * 0.25 + texZ * 0.42 + conZ * 0.22).toFixed(2);
  return { pc1: curPC1, pc2: curPC2 };
}

function updatePCALivePoint() {
  if (!state.charts.pca) return;
  const liveCoord = calculateLivePCACoords();
  state.charts.pca.setOption({
    series: [
      {},
      {},
      {
        data: [[liveCoord.pc1, liveCoord.pc2]]
      }
    ]
  });
}

function initBoundarySelector() {
  const tabs = document.querySelectorAll('.btn-boundary-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeBoundary = tab.dataset.boundary;
      const isDark = document.body.classList.contains('dark-theme');
      renderPCAChart(isDark);
    });
  });
}

// 3. Interactive ROC-AUC Multi-Curve Chart
function renderROCChart(isDark) {
  const dom = document.getElementById('chartROC');
  if (!dom || !state.data) return;

  if (state.charts.roc) state.charts.roc.dispose();
  state.charts.roc = echarts.init(dom, isDark ? 'dark' : null);

  const rocObj = state.data.roc_curves;
  const series = [];

  for (let modelName in rocObj) {
    const item = rocObj[modelName];
    series.push({
      name: `${modelName} (AUC = ${item.auc})`,
      type: 'line',
      smooth: true,
      data: item.points.map(p => [p[0], p[1]]),
      itemStyle: { color: item.color },
      lineStyle: { width: 3, type: item.lineStyle || 'solid' },
      symbol: 'none'
    });
  }

  // Random Chance Baseline
  series.push({
    name: 'Random Chance (AUC = 0.5000)',
    type: 'line',
    data: [[0, 0], [1, 1]],
    lineStyle: { color: '#64748b', type: 'dotted', width: 2 },
    symbol: 'none'
  });

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params) => {
        let text = `<strong>FPR: ${params[0].value[0]}</strong><br/>`;
        params.forEach(p => {
          text += `${p.marker} ${p.seriesName}: <strong>TPR ${p.value[1]}</strong><br/>`;
        });
        return text;
      }
    },
    legend: {
      top: 10,
      textStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 11 },
      type: 'scroll'
    },
    grid: { left: '8%', right: '6%', top: '16%', bottom: '12%' },
    xAxis: {
      name: 'False Positive Rate (1 - Specificity)',
      nameLocation: 'middle',
      nameGap: 30,
      min: 0,
      max: 1,
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } },
      axisLabel: { color: isDark ? '#94a3b8' : '#475569' }
    },
    yAxis: {
      name: 'True Positive Rate (Sensitivity / Recall)',
      nameLocation: 'middle',
      nameGap: 35,
      min: 0,
      max: 1.05,
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } },
      axisLabel: { color: isDark ? '#94a3b8' : '#475569' }
    },
    series: series
  };

  state.charts.roc.setOption(option);
}

// 4. Clinical Confusion Matrix Interactive Heatmap
function renderCMChart(isDark) {
  const dom = document.getElementById('chartCM');
  if (!dom || !state.data) return;

  if (state.charts.cm) state.charts.cm.dispose();
  state.charts.cm = echarts.init(dom, isDark ? 'dark' : null);

  const cmSelect = document.getElementById('cmModelSelect');
  if (cmSelect) {
    state.selectedCMModel = cmSelect.value;
    cmSelect.onchange = () => {
      state.selectedCMModel = cmSelect.value;
      renderCMChart(document.body.classList.contains('dark-theme'));
    };
  }

  const modelCM = state.data.confusion_matrices[state.selectedCMModel];
  if (!modelCM) return;

  // Update card statistics on the right
  document.getElementById('cmFNVal').textContent = modelCM.fn;
  document.getElementById('cmFPVal').textContent = modelCM.fp;
  document.getElementById('cmAccVal').textContent = `${(modelCM.accuracy * 100).toFixed(2)}%`;
  document.getElementById('cmRecVal').textContent = `${(modelCM.recall * 100).toFixed(2)}%`;
  document.getElementById('cmSpecVal').textContent = `${(modelCM.specificity * 100).toFixed(2)}%`;
  document.getElementById('cmPrecVal').textContent = `${(modelCM.precision * 100).toFixed(2)}%`;
  document.getElementById('cmF1Val').textContent = modelCM.f1.toFixed(4);
  document.getElementById('cmMCCVal').textContent = modelCM.mcc.toFixed(4);

  const xLabels = ['Pred Benign (0)', 'Pred Malignant (1)'];
  const yLabels = ['True Benign (0)', 'True Malignant (1)'];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      formatter: (p) => {
        const x = p.value[0], y = p.value[1], val = p.value[2];
        let meaning = '';
        if (x === 0 && y === 0) meaning = 'True Negative (Benign correctly identified)';
        else if (x === 1 && y === 0) meaning = 'False Positive (False alarm / benign called malignant)';
        else if (x === 0 && y === 1) meaning = 'FALSE NEGATIVE (Lethal miss: malignant called benign!)';
        else meaning = 'True Positive (Malignant correctly identified)';
        return `<strong>${meaning}</strong><br/>Patient Count: <strong>${val}</strong> (${((val / 114) * 100).toFixed(1)}% of test set)`;
      }
    },
    grid: { left: '18%', right: '12%', top: '15%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: xLabels,
      splitArea: { show: true },
      axisLabel: { color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 'bold' }
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      splitArea: { show: true },
      axisLabel: { color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 'bold' }
    },
    visualMap: {
      min: 0,
      max: 72,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      textStyle: { color: isDark ? '#94a3b8' : '#475569' },
      inRange: {
        color: isDark ? ['#1e293b', '#2563eb', '#38bdf8'] : ['#f1f5f9', '#93c5fd', '#2563eb']
      }
    },
    series: [{
      name: 'Confusion Matrix',
      type: 'heatmap',
      data: modelCM.matrix,
      label: {
        show: true,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        formatter: (p) => p.value[2]
      },
      itemStyle: {
        borderColor: isDark ? '#0a0f1d' : '#ffffff',
        borderWidth: 3
      }
    }]
  };

  state.charts.cm.setOption(option);
}

// 5. Interactive 30x30 Pearson Correlation Heatmap
function renderCorrHeatmap(isDark) {
  const dom = document.getElementById('chartCorr');
  if (!dom || !state.data) return;

  if (state.charts.corr) state.charts.corr.dispose();
  state.charts.corr = echarts.init(dom, isDark ? 'dark' : null);

  const corrData = state.data.correlation_matrix;
  const shortNames = corrData.features.map(f =>
    f.replace('mean ', 'm_').replace('worst ', 'w_').replace('error', 'err')
  );

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      formatter: (p) => {
        const f1 = corrData.features[p.value[0]];
        const f2 = corrData.features[p.value[1]];
        const r = p.value[2];
        const status = Math.abs(r) >= 0.90 ? '<br/><span style="color:#f43f5e">★ Extreme Collinearity (|r| ≥ 0.90)</span>' : '';
        return `<strong>${f1}</strong> ↔ <strong>${f2}</strong><br/>Pearson Correlation: <strong>r = ${r}</strong>${status}`;
      }
    },
    grid: { left: '18%', right: '8%', top: '8%', bottom: '22%' },
    xAxis: {
      type: 'category',
      data: shortNames,
      axisLabel: { interval: 0, rotate: 60, fontSize: 9, color: isDark ? '#94a3b8' : '#475569' }
    },
    yAxis: {
      type: 'category',
      data: shortNames,
      axisLabel: { interval: 0, fontSize: 9, color: isDark ? '#94a3b8' : '#475569' }
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 5,
      textStyle: { color: isDark ? '#94a3b8' : '#475569' },
      inRange: {
        color: ['#3b82f6', '#1e293b', '#f43f5e']
      }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0] },
      { type: 'inside', yAxisIndex: [0] }
    ],
    series: [{
      name: 'Correlation',
      type: 'heatmap',
      data: corrData.data,
      itemStyle: {
        borderColor: isDark ? '#0f172a' : '#ffffff',
        borderWidth: 0.5
      }
    }]
  };

  state.charts.corr.setOption(option);
}

// 6. Top Variance Inflation Factors (VIF) Bar Chart
function renderVIFChart(isDark) {
  const dom = document.getElementById('chartVIF');
  if (!dom || !state.data) return;

  if (state.charts.vif) state.charts.vif.dispose();
  state.charts.vif = echarts.init(dom, isDark ? 'dark' : null);

  const top15 = state.data.vif_ranking.slice(0, 15).reverse();
  const yData = top15.map(d => d.feature);
  const xData = top15.map(d => d.vif);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (p) => {
        const val = p[0].value;
        const alert = val > 10 ? '<br/><span style="color:#f43f5e">⚠ Severe Multicollinear Redundancy (VIF > 10)</span>' : '';
        return `<strong>${p[0].name}</strong><br/>Variance Inflation Factor: <strong>${val.toLocaleString()}</strong>${alert}`;
      }
    },
    grid: { left: '30%', right: '10%', top: '10%', bottom: '10%' },
    xAxis: {
      type: 'log',
      name: 'VIF (Logarithmic Scale)',
      nameLocation: 'middle',
      nameGap: 25,
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } },
      axisLabel: { color: isDark ? '#94a3b8' : '#475569' }
    },
    yAxis: {
      type: 'category',
      data: yData,
      axisLabel: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 10, fontWeight: 'bold' }
    },
    series: [{
      name: 'VIF',
      type: 'bar',
      data: xData,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#f43f5e' },
          { offset: 1, color: '#fb7185' }
        ]),
        borderRadius: [0, 4, 4, 0]
      },
      markLine: {
        silent: true,
        data: [{
          xAxis: 10,
          name: 'VIF=10 Threshold',
          lineStyle: { color: '#fbbf24', type: 'dashed', width: 2 }
        }]
      }
    }]
  };

  state.charts.vif.setOption(option);
}

// 7. Comparative Feature Importance Grouped Bar Chart
function renderFeatureImpChart(isDark) {
  const dom = document.getElementById('chartFeatImp');
  if (!dom || !state.data) return;

  if (state.charts.featImp) state.charts.featImp.dispose();
  state.charts.featImp = echarts.init(dom, isDark ? 'dark' : null);

  const featData = state.data.feature_importance;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (p) => {
        let text = `<strong>${p[0].name}</strong><br/>`;
        p.forEach(s => {
          text += `${s.marker} ${s.seriesName}: <strong>${s.value}%</strong> (Relative Weight)<br/>`;
        });
        return text;
      }
    },
    legend: {
      top: 10,
      textStyle: { color: isDark ? '#94a3b8' : '#475569' },
      data: ['Decision Tree (Gini MDI)', 'Linear SVM (|w| Hyperplane)', 'RBF SVM (Permutation Drop)']
    },
    grid: { left: '8%', right: '5%', top: '16%', bottom: '26%' },
    xAxis: {
      type: 'category',
      data: featData.features,
      axisLabel: { interval: 0, rotate: 35, color: isDark ? '#94a3b8' : '#475569', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      name: 'Relative Importance (0 - 100%)',
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } },
      axisLabel: { color: isDark ? '#94a3b8' : '#475569' }
    },
    series: [
      {
        name: 'Decision Tree (Gini MDI)',
        type: 'bar',
        data: featData.dt_gini,
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] }
      },
      {
        name: 'Linear SVM (|w| Hyperplane)',
        type: 'bar',
        data: featData.lin_weights,
        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] }
      },
      {
        name: 'RBF SVM (Permutation Drop)',
        type: 'bar',
        data: featData.rbf_perm,
        itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] }
      }
    ]
  };

  state.charts.featImp.setOption(option);
}

// 8. Runtime & Microsecond Latency Bar Chart
function renderLatencyChart(isDark) {
  const dom = document.getElementById('chartLatency');
  if (!dom || !state.data) return;

  if (state.charts.latency) state.charts.latency.dispose();
  state.charts.latency = echarts.init(dom, isDark ? 'dark' : null);

  const latData = state.data.latency_benchmarks;

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      top: 10,
      textStyle: { color: isDark ? '#94a3b8' : '#475569' },
      data: ['Inference Latency (µs / sample)', 'Training Wall-Clock Time (ms)']
    },
    grid: { left: '8%', right: '8%', top: '18%', bottom: '18%' },
    xAxis: {
      type: 'category',
      data: latData.models,
      axisLabel: { interval: 0, rotate: 20, color: isDark ? '#94a3b8' : '#475569', fontSize: 10 }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Inference Latency (µs)',
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } },
        axisLabel: { color: isDark ? '#94a3b8' : '#475569' }
      },
      {
        type: 'value',
        name: 'Training Fit Time (ms)',
        splitLine: { show: false },
        axisLabel: { color: isDark ? '#94a3b8' : '#475569' }
      }
    ],
    series: [
      {
        name: 'Inference Latency (µs / sample)',
        type: 'bar',
        yAxisIndex: 0,
        data: latData.inference_latency_us,
        itemStyle: { color: '#38bdf8', borderRadius: [4, 4, 0, 0] }
      },
      {
        name: 'Training Wall-Clock Time (ms)',
        type: 'bar',
        yAxisIndex: 1,
        data: latData.train_time_ms,
        itemStyle: { color: '#a855f7', borderRadius: [4, 4, 0, 0] }
      }
    ]
  };

  state.charts.latency.setOption(option);
}

// Benchmark Tabs Controller
function initBenchmarkTabs() {
  const btns = document.querySelectorAll('.bench-tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
        // Resize newly visible ECharts instances
        setTimeout(() => {
          Object.values(state.charts).forEach(c => c && c.resize());
        }, 50);
      }
    });
  });
}
