"""
MACSE504 - Machine Learning: Course Based Design Project
Question 1: Healthcare Analytics (Malignant vs. Benign Tumour Classification)
Author: NIMKAR VEDANT GAJANAN (Reg No: 26MML0045)
Date: 30.10.2026 | Slot: E1+TE1

Comprehensive pipeline performing:
1. Ingestion of UCI Breast Cancer Wisconsin (Diagnostic) Dataset
2. Exploratory Data Profiling & Multicollinearity Analysis (Correlation, VIF)
3. Robust Standard Scaling & Stratified Train/Test Split (80/20)
4. Baseline Models: Decision Tree, Linear SVM, Non-Linear RBF SVM
5. Exhaustive Hyperparameter Tuning (GridSearchCV with Stratified 5-Fold CV)
6. Feature Importance Extraction (Gini vs SVM Weights vs Permutation Importance)
7. Comparative Metrics Benchmarking (Accuracy, Precision, Recall, Specificity, F1, ROC-AUC, MCC, Brier)
8. High-Resolution Visualizations (ROC-AUC, Confusion Matrices, Collinearity Heatmaps, Decision Boundaries, Runtimes)
9. Export structured data (JSON) for interactive web dashboard
"""

import os
import sys
import json
import time
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Ensure UTF-8 stdout on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=UserWarning)

from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, confusion_matrix, classification_report,
    matthews_corrcoef, brier_score_loss, precision_recall_curve, average_precision_score
)
from sklearn.inspection import permutation_importance
from sklearn.decomposition import PCA
from statsmodels.stats.outliers_influence import variance_inflation_factor

# Set plot styling
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['axes.edgecolor'] = '#cccccc'
plt.rcParams['axes.linewidth'] = 0.8

OUTPUT_DIR = os.path.abspath("figures")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def main():
    print("=" * 80)
    print("MACSE504 - HEALTHCARE ANALYTICS: MALIGNANT VS BENIGN TUMOUR CLASSIFICATION")
    print("STUDENT: NIMKAR VEDANT GAJANAN | REG NO: 26MML0045")
    print("=" * 80)

    # -------------------------------------------------------------
    # 1. DATA INGESTION & PROFILING
    # -------------------------------------------------------------
    cancer = load_breast_cancer()
    feature_names = cancer.feature_names
    target_names = cancer.target_names  # 0: 'malignant', 1: 'benign' in scikit-learn
    
    # We will align standard clinical convention: 1 = Malignant (positive class), 0 = Benign (negative class)
    # Notice sklearn sets 0: malignant, 1: benign. Let's invert so 1 = Malignant, 0 = Benign for intuitive medical risk!
    # Or let's keep track carefully:
    # Sklearn target: 0 = malignant (212), 1 = benign (357).
    # Let's map target to: 1 = Malignant, 0 = Benign
    y_raw = cancer.target
    y = np.where(y_raw == 0, 1, 0) # 1 = Malignant, 0 = Benign
    X = pd.DataFrame(cancer.data, columns=feature_names)
    
    print(f"\n[+] Dataset Dimensions: {X.shape[0]} samples, {X.shape[1]} cytological features")
    print(f"[+] Class Balance:")
    print(f"    - Malignant (Class 1): {(y == 1).sum()} cases ({(y == 1).mean()*100:.2f}%)")
    print(f"    - Benign    (Class 0): {(y == 0).sum()} cases ({(y == 0).mean()*100:.2f}%)")
    print(f"[+] Missing Values: {X.isnull().sum().sum()} detected")

    # Statistical summary
    summary_stats = X.describe().T[['mean', 'std', 'min', '50%', 'max']]
    summary_stats['skewness'] = X.skew()

    # -------------------------------------------------------------
    # 2. MULTICOLLINEARITY ANALYSIS (Correlation Matrix & VIF)
    # -------------------------------------------------------------
    print("\n[+] Computing Multicollinearity Profile (VIF & Pearson Correlation)...")
    corr_matrix = X.corr()
    
    # Identify highly collinear pairs (|r| > 0.90)
    high_corr_pairs = []
    for i in range(len(corr_matrix.columns)):
        for j in range(i + 1, len(corr_matrix.columns)):
            col1 = corr_matrix.columns[i]
            col2 = corr_matrix.columns[j]
            val = corr_matrix.iloc[i, j]
            if abs(val) >= 0.90:
                high_corr_pairs.append((col1, col2, round(val, 4)))

    print(f"[!] Detected {len(high_corr_pairs)} highly collinear feature pairs with |r| >= 0.90")
    for c1, c2, r in high_corr_pairs[:8]:
        print(f"    - {c1} <---> {c2}: r = {r}")

    # Standardize data for VIF computation
    scaler_vif = StandardScaler()
    X_scaled_vif = scaler_vif.fit_transform(X)
    vif_data = pd.DataFrame()
    vif_data["feature"] = X.columns
    vif_data["VIF"] = [variance_inflation_factor(X_scaled_vif, i) for i in range(X.shape[1])]
    vif_data = vif_data.sort_values(by="VIF", ascending=False).reset_index(drop=True)
    
    print("\nTop 10 Highest Variance Inflation Factors (VIF):")
    print(vif_data.head(10).to_string(index=False))

    # -------------------------------------------------------------
    # 3. STRATIFIED TRAIN/TEST SPLIT & FEATURE SCALING
    # -------------------------------------------------------------
    # Fixed random state = 42 for academic reproducibility
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )
    print(f"\n[+] Train/Test Split (80/20 Stratified):")
    print(f"    - Training Set: {X_train_raw.shape[0]} samples (Malignant: {(y_train == 1).sum()}, Benign: {(y_train == 0).sum()})")
    print(f"    - Test Set:     {X_test_raw.shape[0]} samples (Malignant: {(y_test == 1).sum()}, Benign: {(y_test == 0).sum()})")

    # Fit StandardScaler strictly on training set to avoid data leakage
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw)
    X_test = scaler.transform(X_test_raw)
    X_train_df = pd.DataFrame(X_train, columns=feature_names)
    X_test_df = pd.DataFrame(X_test, columns=feature_names)

    # -------------------------------------------------------------
    # 4. BASELINE MODEL IMPLEMENTATIONS
    # -------------------------------------------------------------
    print("\n" + "=" * 50)
    print("STAGE 1: BASELINE MODEL IMPLEMENTATIONS")
    print("=" * 50)

    # A. Baseline Decision Tree
    t0 = time.perf_counter()
    dt_base = DecisionTreeClassifier(random_state=42)
    dt_base.fit(X_train, y_train)
    dt_base_train_time = time.perf_counter() - t0

    # B. Baseline Linear SVM
    t0 = time.perf_counter()
    lin_svm_base = SVC(kernel='linear', C=1.0, probability=True, random_state=42)
    lin_svm_base.fit(X_train, y_train)
    lin_svm_base_train_time = time.perf_counter() - t0

    # C. Baseline Non-Linear RBF SVM
    t0 = time.perf_counter()
    rbf_svm_base = SVC(kernel='rbf', C=1.0, gamma='scale', probability=True, random_state=42)
    rbf_svm_base.fit(X_train, y_train)
    rbf_svm_base_train_time = time.perf_counter() - t0

    def evaluate_model(model, X_te, y_te, name="Model"):
        t0 = time.perf_counter()
        y_pred = model.predict(X_te)
        inf_time = (time.perf_counter() - t0) / len(y_te) * 1e6 # microseconds per sample
        
        y_prob = model.predict_proba(X_te)[:, 1] if hasattr(model, "predict_proba") else None
        
        cm = confusion_matrix(y_te, y_pred)
        tn, fp, fn, tp = cm.ravel()
        
        acc = accuracy_score(y_te, y_pred)
        prec = precision_score(y_te, y_pred, zero_division=0)
        rec = recall_score(y_te, y_pred, zero_division=0) # Sensitivity
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0
        f1 = f1_score(y_te, y_pred, zero_division=0)
        auc = roc_auc_score(y_te, y_prob) if y_prob is not None else 0.0
        mcc = matthews_corrcoef(y_te, y_pred)
        brier = brier_score_loss(y_te, y_prob) if y_prob is not None else 0.0

        return {
            "name": name,
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "specificity": spec,
            "f1": f1,
            "roc_auc": auc,
            "mcc": mcc,
            "brier": brier,
            "confusion_matrix": cm.tolist(),
            "tp": int(tp), "tn": int(tn), "fp": int(fp), "fn": int(fn),
            "inference_latency_us": inf_time,
            "y_prob": y_prob.tolist() if y_prob is not None else []
        }

    res_dt_base = evaluate_model(dt_base, X_test, y_test, "Baseline Decision Tree")
    res_lin_base = evaluate_model(lin_svm_base, X_test, y_test, "Baseline Linear SVM")
    res_rbf_base = evaluate_model(rbf_svm_base, X_test, y_test, "Baseline RBF SVM")

    print(f"Baseline Decision Tree: Acc={res_dt_base['accuracy']:.4f}, Recall={res_dt_base['recall']:.4f}, AUC={res_dt_base['roc_auc']:.4f}, Depth={dt_base.get_depth()}, Leaves={dt_base.get_n_leaves()}")
    print(f"Baseline Linear SVM:    Acc={res_lin_base['accuracy']:.4f}, Recall={res_lin_base['recall']:.4f}, AUC={res_lin_base['roc_auc']:.4f}, SV count={lin_svm_base.support_vectors_.shape[0]}")
    print(f"Baseline RBF SVM:       Acc={res_rbf_base['accuracy']:.4f}, Recall={res_rbf_base['recall']:.4f}, AUC={res_rbf_base['roc_auc']:.4f}, SV count={rbf_svm_base.support_vectors_.shape[0]}")

    # -------------------------------------------------------------
    # 5. EXHAUSTIVE HYPERPARAMETER TUNING
    # -------------------------------------------------------------
    print("\n" + "=" * 50)
    print("STAGE 2: SYSTEMATIC HYPERPARAMETER SEARCH (5-FOLD CV)")
    print("=" * 50)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # A. Decision Tree Hyperparameter Tuning
    print("[*] Tuning Decision Tree (max_depth, criterion, min_samples_split, min_samples_leaf)...")
    dt_param_grid = {
        'max_depth': [2, 3, 4, 5, 6, 8, None],
        'criterion': ['gini', 'entropy'],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4]
    }
    t0 = time.perf_counter()
    grid_dt = GridSearchCV(DecisionTreeClassifier(random_state=42), dt_param_grid, cv=cv, scoring='roc_auc', n_jobs=-1)
    grid_dt.fit(X_train, y_train)
    dt_tune_time = time.perf_counter() - t0
    best_dt = grid_dt.best_estimator_
    print(f"    - Best DT Params: {grid_dt.best_params_}")
    print(f"    - Best DT CV ROC-AUC: {grid_dt.best_score_:.4f}")

    # B. Linear SVM Hyperparameter Tuning (C sweep)
    print("[*] Tuning Linear SVM (Soft-margin cost C)...")
    lin_param_grid = {
        'C': [0.001, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0, 50.0, 100.0]
    }
    t0 = time.perf_counter()
    grid_lin = GridSearchCV(SVC(kernel='linear', probability=True, random_state=42), lin_param_grid, cv=cv, scoring='roc_auc', n_jobs=-1)
    grid_lin.fit(X_train, y_train)
    lin_tune_time = time.perf_counter() - t0
    best_lin = grid_lin.best_estimator_
    print(f"    - Best Linear SVM Params: {grid_lin.best_params_}")
    print(f"    - Best Linear SVM CV ROC-AUC: {grid_lin.best_score_:.4f}")

    # C. Non-Linear RBF SVM Hyperparameter Tuning (C vs gamma 2D grid)
    print("[*] Tuning RBF SVM (C vs gamma)...")
    rbf_param_grid = {
        'C': [0.1, 0.5, 1.0, 5.0, 10.0, 50.0, 100.0],
        'gamma': [0.0001, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 'scale']
    }
    t0 = time.perf_counter()
    grid_rbf = GridSearchCV(SVC(kernel='rbf', probability=True, random_state=42), rbf_param_grid, cv=cv, scoring='roc_auc', n_jobs=-1)
    grid_rbf.fit(X_train, y_train)
    rbf_tune_time = time.perf_counter() - t0
    best_rbf = grid_rbf.best_estimator_
    print(f"    - Best RBF SVM Params: {grid_rbf.best_params_}")
    print(f"    - Best RBF SVM CV ROC-AUC: {grid_rbf.best_score_:.4f}")

    # Evaluate Tuned Models on Test Set
    res_dt_tuned = evaluate_model(best_dt, X_test, y_test, "Tuned Decision Tree")
    res_lin_tuned = evaluate_model(best_lin, X_test, y_test, "Tuned Linear SVM")
    res_rbf_tuned = evaluate_model(best_rbf, X_test, y_test, "Tuned RBF SVM")

    # -------------------------------------------------------------
    # 6. FEATURE IMPORTANCE EXTRACTION & STRUCTURAL CRITIQUE
    # -------------------------------------------------------------
    print("\n" + "=" * 50)
    print("STAGE 3: FEATURE IMPORTANCE & STRUCTURAL COMPLEXITY")
    print("=" * 50)

    # 1. Decision Tree Gini/Impurity Importance
    dt_importances = pd.Series(best_dt.feature_importances_, index=feature_names).sort_values(ascending=False)

    # 2. Linear SVM Hyperplane Weight Coefficients: |w_i|
    lin_coefs = pd.Series(np.abs(best_lin.coef_[0]), index=feature_names).sort_values(ascending=False)

    # 3. RBF SVM Permutation Importance (on validation/test set, 50 repeats)
    print("[*] Computing Permutation Importance for Non-Linear RBF SVM...")
    perm_rbf = permutation_importance(best_rbf, X_test, y_test, n_repeats=50, random_state=42, n_jobs=-1)
    rbf_importances = pd.Series(perm_rbf.importances_mean, index=feature_names).sort_values(ascending=False)

    # Top features comparison table
    top_features_df = pd.DataFrame({
        "Decision Tree (Gini)": dt_importances.head(10).index + " (" + dt_importances.head(10).round(4).astype(str) + ")",
        "Linear SVM (|w|)": lin_coefs.head(10).index + " (" + lin_coefs.head(10).round(4).astype(str) + ")",
        "RBF SVM (Permutation)": rbf_importances.head(10).index + " (" + rbf_importances.head(10).round(4).astype(str) + ")"
    })
    print("\nTop 10 Feature Importances Across Models:")
    print(top_features_df.to_string())

    # -------------------------------------------------------------
    # 7. GENERATING PUBLICATION-GRADE VISUALIZATIONS (300 DPI)
    # -------------------------------------------------------------
    print("\n" + "=" * 50)
    print("STAGE 4: GENERATING HIGH-RESOLUTION FIGURES")
    print("=" * 50)

    # Figure 1: Correlation Heatmap with Multicollinearity annotations
    fig, ax = plt.subplots(figsize=(14, 11), dpi=300)
    mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
    cmap = sns.diverging_palette(230, 20, as_cmap=True)
    sns.heatmap(corr_matrix, mask=mask, cmap=cmap, vmin=-1, vmax=1, center=0,
                square=True, linewidths=.5, cbar_kws={"shrink": .8}, ax=ax)
    ax.set_title("UCI Breast Cancer (Diagnostic) Feature Correlation Matrix\n(Highlighting Multicollinearity Clusters in Radius, Perimeter, Area)", fontsize=14, weight='bold', pad=15)
    plt.tight_layout()
    fig1_path = os.path.join(OUTPUT_DIR, "fig1_correlation_matrix.png")
    fig.savefig(fig1_path)
    plt.close()
    print(f"[OK] Saved {fig1_path}")

    # Figure 2: Top VIF Bar Chart
    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
    top_vif = vif_data.head(15)
    bars = ax.barh(top_vif["feature"][::-1], top_vif["VIF"][::-1], color='#e63946', alpha=0.85, edgecolor='black', linewidth=0.7)
    ax.set_xscale('log')
    ax.axvline(x=10, color='black', linestyle='--', linewidth=1.5, label='Multicollinearity Threshold (VIF=10)')
    ax.set_xlabel("Variance Inflation Factor (Log Scale)", fontsize=11, weight='bold')
    ax.set_title("Top 15 Features by Variance Inflation Factor (VIF)\n(Extreme Redundancy among Geometric Measurements)", fontsize=13, weight='bold', pad=12)
    ax.legend(frameon=True, facecolor='white', framealpha=0.9)
    plt.tight_layout()
    fig2_path = os.path.join(OUTPUT_DIR, "fig2_vif_profile.png")
    fig.savefig(fig2_path)
    plt.close()
    print(f"[OK] Saved {fig2_path}")

    # Figure 3: ROC-AUC Comparison Curves
    fig, ax = plt.subplots(figsize=(9, 7), dpi=300)
    models_to_plot = [
        ("Baseline Decision Tree", dt_base, '#2a9d8f', '--'),
        ("Tuned Decision Tree", best_dt, '#1d3557', '-'),
        ("Baseline Linear SVM", lin_svm_base, '#e76f51', '--'),
        ("Tuned Linear SVM", best_lin, '#d62828', '-'),
        ("Baseline RBF SVM", rbf_svm_base, '#a8dadc', '--'),
        ("Tuned RBF SVM", best_rbf, '#457b9d', '-')
    ]
    for label, m, color, ls in models_to_plot:
        probs = m.predict_proba(X_test)[:, 1]
        fpr, tpr, _ = roc_curve(y_test, probs)
        score = roc_auc_score(y_test, probs)
        ax.plot(fpr, tpr, color=color, linestyle=ls, linewidth=2.2, label=f"{label} (AUC = {score:.4f})")
    
    ax.plot([0, 1], [0, 1], 'k:', alpha=0.6, label='Random Chance (AUC = 0.5000)')
    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([-0.02, 1.05])
    ax.set_xlabel("False Positive Rate (1 - Specificity)", fontsize=12, weight='bold')
    ax.set_ylabel("True Positive Rate (Sensitivity / Recall)", fontsize=12, weight='bold')
    ax.set_title("Receiver Operating Characteristic (ROC) Benchmark\n(Clinical Diagnostic Performance on Holdout Test Set)", fontsize=13, weight='bold', pad=12)
    ax.legend(loc="lower right", frameon=True, facecolor='white', framealpha=0.95, fontsize=10)
    plt.tight_layout()
    fig3_path = os.path.join(OUTPUT_DIR, "fig3_roc_comparison.png")
    fig.savefig(fig3_path)
    plt.close()
    print(f"[✓] Saved {fig3_path}")

    # Figure 4: Confusion Matrices Grid
    fig, axes = plt.subplots(2, 3, figsize=(15, 9), dpi=300)
    models_grid = [
        ("Baseline Decision Tree", res_dt_base),
        ("Baseline Linear SVM", res_lin_base),
        ("Baseline RBF SVM", res_rbf_base),
        ("Tuned Decision Tree", res_dt_tuned),
        ("Tuned Linear SVM", res_lin_tuned),
        ("Tuned RBF SVM", res_rbf_tuned)
    ]
    for ax, (title, res) in zip(axes.ravel(), models_grid):
        cm = np.array(res["confusion_matrix"])
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax, cbar=False,
                    xticklabels=['Benign (0)', 'Malignant (1)'],
                    yticklabels=['Benign (0)', 'Malignant (1)'],
                    annot_kws={"size": 14, "weight": "bold"})
        ax.set_title(f"{title}\nAcc: {res['accuracy']:.3f} | Recall: {res['recall']:.3f} | FN: {res['fn']}", fontsize=11, weight='bold')
        ax.set_ylabel("True Diagnosis", fontsize=10)
        ax.set_xlabel("Predicted Diagnosis", fontsize=10)
    
    plt.suptitle("Clinical Confusion Matrices (Sensitivity Criticality: False Negatives = Missed Malignancy)", fontsize=14, weight='bold', y=0.98)
    plt.tight_layout(rect=[0, 0, 1, 0.95])
    fig4_path = os.path.join(OUTPUT_DIR, "fig4_confusion_matrices.png")
    fig.savefig(fig4_path)
    plt.close()
    print(f"[✓] Saved {fig4_path}")

    # Figure 5: Feature Importance Comparison (Top 10 across models)
    fig, axes = plt.subplots(1, 3, figsize=(18, 6), dpi=300)
    
    # DT Gini
    top_dt = dt_importances.head(10)[::-1]
    axes[0].barh(top_dt.index, top_dt.values, color='#1d3557', edgecolor='black', alpha=0.85)
    axes[0].set_title("Tuned Decision Tree\n(MDI Gini Impurity Reduction)", fontsize=11, weight='bold')
    axes[0].set_xlabel("Relative Importance Score", fontsize=10)

    # Linear SVM |w|
    top_lin = lin_coefs.head(10)[::-1]
    axes[1].barh(top_lin.index, top_lin.values, color='#e63946', edgecolor='black', alpha=0.85)
    axes[1].set_title("Tuned Linear SVM\n(Absolute Hyperplane Weight |w|)", fontsize=11, weight='bold')
    axes[1].set_xlabel("Standardized Weight Magnitude", fontsize=10)

    # RBF SVM Permutation
    top_rbf = rbf_importances.head(10)[::-1]
    axes[2].barh(top_rbf.index, top_rbf.values, color='#457b9d', edgecolor='black', alpha=0.85)
    axes[2].set_title("Tuned RBF SVM\n(Mean Permutation Test-Error Increase)", fontsize=11, weight='bold')
    axes[2].set_xlabel("Mean Accuracy Drop Upon Shuffling", fontsize=10)

    plt.suptitle("Comparative Feature Attribution Across Architectures", fontsize=14, weight='bold', y=0.98)
    plt.tight_layout(rect=[0, 0, 1, 0.94])
    fig5_path = os.path.join(OUTPUT_DIR, "fig5_feature_importance.png")
    fig.savefig(fig5_path)
    plt.close()
    print(f"[✓] Saved {fig5_path}")

    # Figure 6: Hyperparameter Search Surface / Curves
    # For DT: Tree depth vs CV score
    # For RBF SVM: C vs gamma heatmap
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6), dpi=300)
    
    # DT Depth Curve
    depth_scores = []
    depths = [2, 3, 4, 5, 6, 8, 10, 12, 15]
    for d in depths:
        m = DecisionTreeClassifier(max_depth=d, random_state=42)
        m.fit(X_train, y_train)
        depth_scores.append({
            'depth': d,
            'train_acc': accuracy_score(y_train, m.predict(X_train)),
            'test_acc': accuracy_score(y_test, m.predict(X_test)),
            'train_auc': roc_auc_score(y_train, m.predict_proba(X_train)[:, 1]),
            'test_auc': roc_auc_score(y_test, m.predict_proba(X_test)[:, 1])
        })
    df_depth = pd.DataFrame(depth_scores)
    ax1.plot(df_depth['depth'], df_depth['train_acc'], 'o-', color='#1d3557', label='Train Accuracy (Overfitting after d=4)')
    ax1.plot(df_depth['depth'], df_depth['test_acc'], 's--', color='#e63946', label='Test Accuracy')
    ax1.plot(df_depth['depth'], df_depth['test_auc'], '^-.', color='#2a9d8f', label='Test ROC-AUC')
    ax1.axvline(x=best_dt.max_depth if best_dt.max_depth is not None else 4, color='orange', linestyle=':', label=f'Optimal Depth (d={best_dt.max_depth})')
    ax1.set_xlabel("Maximum Tree Depth", fontsize=11, weight='bold')
    ax1.set_ylabel("Metric Score", fontsize=11, weight='bold')
    ax1.set_title("Decision Tree Structural Complexity: Depth vs Generalization Gap", fontsize=12, weight='bold')
    ax1.legend(frameon=True, facecolor='white')

    # RBF SVM Heatmap (C vs gamma)
    rbf_results = pd.DataFrame(grid_rbf.cv_results_)
    # Filter to numeric gamma values for clean 2D pivot
    numeric_rbf = rbf_results[rbf_results['param_gamma'] != 'scale'].copy()
    numeric_rbf['param_C'] = numeric_rbf['param_C'].astype(float)
    numeric_rbf['param_gamma'] = numeric_rbf['param_gamma'].astype(float)
    pivot_rbf = numeric_rbf.pivot(index='param_C', columns='param_gamma', values='mean_test_score')
    sns.heatmap(pivot_rbf, annot=True, fmt='.3f', cmap='YlGnBu', ax=ax2, cbar_kws={'label': 'Mean CV ROC-AUC'})
    ax2.set_title("RBF SVM Hyperparameter Landscape (Cost C vs Bandwidth γ)", fontsize=12, weight='bold')
    ax2.set_xlabel("Kernel Parameter Gamma (γ)", fontsize=11, weight='bold')
    ax2.set_ylabel("Regularization Parameter C", fontsize=11, weight='bold')

    plt.tight_layout()
    fig6_path = os.path.join(OUTPUT_DIR, "fig6_hyperparameter_landscapes.png")
    fig.savefig(fig6_path)
    plt.close()
    print(f"[✓] Saved {fig6_path}")

    # Figure 7: 2D PCA Decision Boundaries for Decision Tree, Linear SVM, RBF SVM
    pca = PCA(n_components=2, random_state=42)
    X_train_pca = pca.fit_transform(X_train)
    X_test_pca = pca.transform(X_test)
    
    # Train 2D models for boundary visualization
    dt_2d = DecisionTreeClassifier(max_depth=best_dt.max_depth or 4, random_state=42).fit(X_train_pca, y_train)
    lin_2d = SVC(kernel='linear', C=best_lin.C, probability=True, random_state=42).fit(X_train_pca, y_train)
    rbf_2d = SVC(kernel='rbf', C=best_rbf.C, gamma='scale', probability=True, random_state=42).fit(X_train_pca, y_train)

    x_min, x_max = X_train_pca[:, 0].min() - 1, X_train_pca[:, 0].max() + 1
    y_min, y_max = X_train_pca[:, 1].min() - 1, X_train_pca[:, 1].max() + 1
    xx, yy = np.meshgrid(np.arange(x_min, x_max, 0.05), np.arange(y_min, y_max, 0.05))

    fig, axes = plt.subplots(1, 3, figsize=(18, 5.5), dpi=300)
    models_2d = [
        ("Tuned Decision Tree\n(Orthogonal Axis-Aligned Partitions)", dt_2d),
        (f"Tuned Linear SVM (C={best_lin.C})\n(Linear Separating Hyperplane)", lin_2d),
        (f"Tuned RBF SVM (C={best_rbf.C})\n(Non-Linear Dual Manifold Boundary)", rbf_2d)
    ]

    for ax, (title, m) in zip(axes, models_2d):
        Z = m.predict(np.c_[xx.ravel(), yy.ravel()])
        Z = Z.reshape(xx.shape)
        ax.contourf(xx, yy, Z, alpha=0.3, cmap=plt.cm.coolwarm)
        # Scatter points
        ax.scatter(X_test_pca[y_test == 0, 0], X_test_pca[y_test == 0, 1], c='blue', edgecolors='k', label='Benign', s=35, alpha=0.8)
        ax.scatter(X_test_pca[y_test == 1, 0], X_test_pca[y_test == 1, 1], c='red', edgecolors='k', marker='^', label='Malignant', s=45, alpha=0.8)
        ax.set_title(title, fontsize=11, weight='bold')
        ax.set_xlabel(f"PC1 ({pca.explained_variance_ratio_[0]*100:.1f}% var)", fontsize=10)
        ax.set_ylabel(f"PC2 ({pca.explained_variance_ratio_[1]*100:.1f}% var)", fontsize=10)
        ax.legend(loc='upper right', frameon=True, facecolor='white')

    plt.suptitle("Visualizing Transparent vs Non-Linear Decision Boundaries (PCA Projected Space)", fontsize=14, weight='bold', y=0.98)
    plt.tight_layout(rect=[0, 0, 1, 0.94])
    fig7_path = os.path.join(OUTPUT_DIR, "fig7_decision_boundaries_2d.png")
    fig.savefig(fig7_path)
    plt.close()
    print(f"[OK] Saved {fig7_path}")

    # Figure 8: Runtime & Latency Breakdown
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5), dpi=300)
    models_names = ['Baseline DT', 'Tuned DT', 'Baseline Lin SVM', 'Tuned Lin SVM', 'Baseline RBF SVM', 'Tuned RBF SVM']
    train_times = [
        dt_base_train_time * 1000, dt_tune_time * 1000 / len(grid_dt.cv_results_['params']),
        lin_svm_base_train_time * 1000, lin_tune_time * 1000 / len(grid_lin.cv_results_['params']),
        rbf_svm_base_train_time * 1000, rbf_tune_time * 1000 / len(grid_rbf.cv_results_['params'])
    ]
    inf_latencies = [
        res_dt_base['inference_latency_us'], res_dt_tuned['inference_latency_us'],
        res_lin_base['inference_latency_us'], res_lin_tuned['inference_latency_us'],
        res_rbf_base['inference_latency_us'], res_rbf_tuned['inference_latency_us']
    ]

    colors = ['#1d3557', '#457b9d', '#e76f51', '#f4a261', '#2a9d8f', '#e63946']
    ax1.bar(models_names, train_times, color=colors, edgecolor='black', alpha=0.85)
    ax1.set_ylabel("Average Fit Time per Model (ms)", fontsize=11, weight='bold')
    ax1.set_title("Training Computational Overhead (Wall-Clock Time)", fontsize=12, weight='bold')
    ax1.tick_params(axis='x', rotation=35)

    ax2.bar(models_names, inf_latencies, color=colors, edgecolor='black', alpha=0.85)
    ax2.set_ylabel("Inference Latency per Sample (us)", fontsize=11, weight='bold')
    ax2.set_title("Real-Time Diagnostic Latency (Clinical Edge Viability)", fontsize=12, weight='bold')
    ax2.tick_params(axis='x', rotation=35)

    plt.tight_layout()
    fig8_path = os.path.join(OUTPUT_DIR, "fig8_runtime_breakdown.png")
    fig.savefig(fig8_path)
    plt.close()
    print(f"[OK] Saved {fig8_path}")

    # -------------------------------------------------------------
    # 8. MASTER METRIC BENCHMARK TABLE & JSON EXPORT FOR DASHBOARD
    # -------------------------------------------------------------
    benchmarks = [res_dt_base, res_lin_base, res_rbf_base, res_dt_tuned, res_lin_tuned, res_rbf_tuned]
    summary_table = pd.DataFrame(benchmarks)[['name', 'accuracy', 'recall', 'specificity', 'precision', 'f1', 'roc_auc', 'mcc', 'fn', 'fp', 'inference_latency_us']]
    summary_table.columns = ['Model Architecture', 'Accuracy', 'Recall (Sens.)', 'Specificity', 'Precision', 'F1-Score', 'ROC-AUC', 'MCC', 'FN (Missed)', 'FP (False Alarm)', 'Latency (us)']
    print("\n" + "=" * 90)
    print("FINAL MODEL PERFORMANCE BENCHMARK MATRIX:")
    print("=" * 90)
    print(summary_table.to_string(index=False))

    # Export structured JSON data for the interactive web dashboard
    dashboard_data = {
        "metadata": {
            "title": "Healthcare Analytics: Malignant vs. Benign Tumour Classification",
            "course": "MACSE504 - Machine Learning",
            "student_name": "NIMKAR VEDANT GAJANAN",
            "reg_no": "26MML0045",
            "date": "30.10.2026",
            "slot": "E1+TE1",
            "dataset": "UCI Breast Cancer Wisconsin (Diagnostic) Dataset",
            "total_samples": int(X.shape[0]),
            "features_count": int(X.shape[1]),
            "malignant_count": int((y == 1).sum()),
            "benign_count": int((y == 0).sum()),
            "train_samples": int(X_train.shape[0]),
            "test_samples": int(X_test.shape[0])
        },
        "feature_names": list(feature_names),
        "mean_values": X.mean().round(4).to_dict(),
        "std_values": X.std().round(4).to_dict(),
        "min_values": X.min().round(4).to_dict(),
        "max_values": X.max().round(4).to_dict(),
        "typical_malignant": X[y == 1].mean().round(4).to_dict(),
        "typical_benign": X[y == 0].mean().round(4).to_dict(),
        "models_benchmark": [
            {k: (round(v, 4) if isinstance(v, float) else v) for k, v in m.items() if k != 'y_prob'}
            for m in benchmarks
        ],
        "top_features": {
            "dt_gini": dt_importances.head(10).round(4).to_dict(),
            "lin_svm_weights": lin_coefs.head(10).round(4).to_dict(),
            "rbf_svm_perm": rbf_importances.head(10).round(4).to_dict()
        },
        "vif_top10": vif_data.head(10).to_dict(orient="records"),
        "best_hyperparameters": {
            "decision_tree": {k: (str(v) if v is None else v) for k, v in grid_dt.best_params_.items()},
            "linear_svm": grid_lin.best_params_,
            "rbf_svm": {k: (str(v) if v is None else v) for k, v in grid_rbf.best_params_.items()}
        },
        "pca_variance": {
            "pc1": round(float(pca.explained_variance_ratio_[0]), 4),
            "pc2": round(float(pca.explained_variance_ratio_[1]), 4)
        },
        "pca_components": pca.components_.round(4).tolist(),
        "linear_svm_weights": best_lin.coef_[0].round(4).tolist(),
        "linear_svm_intercept": round(float(best_lin.intercept_[0]), 4),
        "scaler_mean": scaler.mean_.round(4).tolist(),
        "scaler_scale": scaler.scale_.round(4).tolist()
    }

    json_path = os.path.join(OUTPUT_DIR, "dashboard_data.json")
    with open(json_path, "w") as f:
        json.dump(dashboard_data, f, indent=2)
    print(f"\n[OK] Exported complete dashboard payload to {json_path}")

    # Also save CSV of summary table
    summary_table.to_csv(os.path.join(OUTPUT_DIR, "benchmark_metrics.csv"), index=False)
    print("[OK] Pipeline execution finished successfully!")

if __name__ == "__main__":
    main()
