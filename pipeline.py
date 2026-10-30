"""
MACSE504 - Machine Learning: Course Based Design Project
Question 1: Healthcare Cytological Analytics (Malignant vs. Benign Tumour Classification)
Author: NIMKAR VEDANT GAJANAN | Reg No: 26MML0045 | Slot: E1 + TE1
Department: School of Computer Science and Engineering, VIT Vellore

Production End-to-End Machine Learning Diagnostic Pipeline:
- Data Ingestion & Clinical Target Re-mapping
- Pearson Correlation Analysis & Variance Inflation Factor (VIF) Multicollinearity Management
- Stratified 80/20 Cohort Partitioning & Leak-Free StandardScaler Normalization
- Baseline Model Implementations (Decision Tree, Linear SVM, Non-Linear RBF SVM)
- 5-Fold Stratified Cross-Validation Hyperparameter Grid Searches
- Comprehensive Performance Benchmarking (Accuracy, Recall, Specificity, Precision, F1, ROC-AUC, Latency)
- Multi-Paradigm Feature Importance Extraction (MDI Gini, Linear Weights, Permutation Importance)
- 2D & 3D PCA Latent Space Projections
"""

import os
import sys
import time
import warnings
import numpy as np
import pandas as pd

from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, matthews_corrcoef
)
from sklearn.inspection import permutation_importance
from sklearn.decomposition import PCA
from statsmodels.stats.outliers_influence import variance_inflation_factor

warnings.filterwarnings('ignore')

def main():
    print("=" * 80)
    print("ONCOVISION AI: CYTOLOGICAL TUMOUR DIAGNOSTIC PIPELINE")
    print("Student: NIMKAR VEDANT GAJANAN | Reg No: 26MML0045 | Slot: E1 + TE1 | VIT")
    print("=" * 80)

    # 1. DATA INGESTION & CLINICAL TARGET MAPPING
    print("\n[STEP 1] Ingesting Wisconsin Diagnostic Breast Cancer Dataset...")
    cancer = load_breast_cancer()
    feature_names = cancer.feature_names

    # Map target: 1 = Malignant (positive clinical finding), 0 = Benign
    y_raw = cancer.target
    y = np.where(y_raw == 0, 1, 0)
    X = pd.DataFrame(cancer.data, columns=feature_names)

    print(f" -> Cohort Shape: {X.shape[0]} patients, {X.shape[1]} cytological features")
    print(f" -> Missing Values: {X.isnull().sum().sum()}")
    print(f" -> Class Balance: Malignant = {sum(y==1)} ({sum(y==1)/len(y)*100:.2f}%), "
          f"Benign = {sum(y==0)} ({sum(y==0)/len(y)*100:.2f}%)")

    # 2. MULTICOLLINEARITY SCREENING & VIF ANALYSIS
    print("\n[STEP 2] Multicollinearity Screening & Variance Inflation Factor Analysis...")
    corr_matrix = X.corr()
    high_corr = []
    for i in range(len(corr_matrix.columns)):
        for j in range(i + 1, len(corr_matrix.columns)):
            val = corr_matrix.iloc[i, j]
            if abs(val) >= 0.90:
                high_corr.append((corr_matrix.columns[i], corr_matrix.columns[j], round(val, 4)))

    print(f" -> Highly Collinear Feature Pairs (|r| >= 0.90): {len(high_corr)}")
    for c1, c2, r in high_corr[:5]:
        print(f"    * {c1} <---> {c2}: r = {r}")

    scaler_vif = StandardScaler()
    X_vif_scaled = scaler_vif.fit_transform(X)
    vif_df = pd.DataFrame({
        "Feature": X.columns,
        "VIF": [variance_inflation_factor(X_vif_scaled, i) for i in range(X.shape[1])]
    }).sort_values(by="VIF", ascending=False).reset_index(drop=True)

    print(" -> Top 5 Variance Inflation Factors (Threshold VIF > 10 denotes severe collinearity):")
    for idx, row in vif_df.head(5).iterrows():
        print(f"    * {row['Feature']:25s} : VIF = {row['VIF']:.2f}")

    # 3. STRATIFIED 80/20 COHORT PARTITIONING & LEAK-FREE SCALING
    print("\n[STEP 3] Stratified Cohort Partitioning & Leak-Free StandardScaler...")
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw) # fitted solely on training split
    X_test = scaler.transform(X_test_raw)       # leak-free test transform

    print(f" -> Train Cohort: {X_train.shape[0]} biopsies (M={sum(y_train==1)}, B={sum(y_train==0)})")
    print(f" -> Test Cohort:  {X_test.shape[0]} biopsies (M={sum(y_test==1)}, B={sum(y_test==0)})")

    # 4. BASELINE MODEL IMPLEMENTATIONS
    print("\n[STEP 4] Training Baseline Diagnostic Models...")
    dt_base = DecisionTreeClassifier(random_state=42).fit(X_train, y_train)
    lin_svm_base = SVC(kernel='linear', C=1.0, probability=True, random_state=42).fit(X_train, y_train)
    rbf_svm_base = SVC(kernel='rbf', C=1.0, gamma='scale', probability=True, random_state=42).fit(X_train, y_train)

    print(f" -> Baseline Decision Tree: Depth = {dt_base.get_depth()}, Leaves = {dt_base.get_n_leaves()}")
    print(f" -> Baseline Linear SVM:    Support Vectors = {lin_svm_base.support_vectors_.shape[0]}")
    print(f" -> Baseline RBF SVM:       Support Vectors = {rbf_svm_base.support_vectors_.shape[0]}")

    # 5. 5-FOLD STRATIFIED CROSS-VALIDATION HYPERPARAMETER GRID SEARCHES
    print("\n[STEP 5] Executing 5-Fold Stratified Cross-Validation Grid Searches...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # DT Search
    dt_grid = GridSearchCV(
        DecisionTreeClassifier(random_state=42),
        {'criterion': ['gini', 'entropy'], 'max_depth': [2, 4, 6, 8, 10], 'min_samples_split': [2, 5, 10], 'min_samples_leaf': [1, 2, 4]},
        cv=cv, scoring='roc_auc', n_jobs=-1
    ).fit(X_train, y_train)
    best_dt = dt_grid.best_estimator_

    # Linear SVM Search
    lin_grid = GridSearchCV(
        SVC(kernel='linear', probability=True, random_state=42),
        {'C': [0.001, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0, 50.0]},
        cv=cv, scoring='roc_auc', n_jobs=-1
    ).fit(X_train, y_train)
    best_lin = lin_grid.best_estimator_

    # RBF SVM Search
    rbf_grid = GridSearchCV(
        SVC(kernel='rbf', probability=True, random_state=42),
        {'C': [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0], 'gamma': [0.0001, 0.001, 0.005, 0.01, 0.05, 0.1, 'scale', 'auto']},
        cv=cv, scoring='roc_auc', n_jobs=-1
    ).fit(X_train, y_train)
    best_rbf = rbf_grid.best_estimator_

    print(f" -> Optimal Decision Tree: {dt_grid.best_params_} | CV ROC-AUC: {dt_grid.best_score_:.4f}")
    print(f" -> Optimal Linear SVM:    {lin_grid.best_params_} | CV ROC-AUC: {lin_grid.best_score_:.4f}")
    print(f" -> Optimal RBF SVM:       {rbf_grid.best_params_} | CV ROC-AUC: {rbf_grid.best_score_:.4f}")

    # 6. COMPREHENSIVE PERFORMANCE BENCHMARKING
    print("\n[STEP 6] Evaluating Models on Held-Out Test Cohort (N = 114)...")
    def calc_metrics(m, name):
        t0 = time.perf_counter()
        y_pred = m.predict(X_test)
        lat = (time.perf_counter() - t0) / len(y_test) * 1e6
        y_prob = m.predict_proba(X_test)[:, 1]
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()
        return {
            'Model Architecture': name,
            'Accuracy': round(accuracy_score(y_test, y_pred), 4),
            'Recall (Sens.)': round(recall_score(y_test, y_pred), 4),
            'Specificity': round(tn / (tn + fp), 4),
            'Precision': round(precision_score(y_test, y_pred), 4),
            'F1-Score': round(f1_score(y_test, y_pred), 4),
            'ROC-AUC': round(roc_auc_score(y_test, y_prob), 4),
            'MCC': round(matthews_corrcoef(y_test, y_pred), 4),
            'FN (Missed)': int(fn),
            'FP (Alarm)': int(fp),
            'Latency (us)': round(lat, 2)
        }

    benchmarks = [
        calc_metrics(dt_base, 'Baseline Decision Tree'),
        calc_metrics(best_dt, 'Tuned Decision Tree'),
        calc_metrics(lin_svm_base, 'Baseline Linear SVM'),
        calc_metrics(best_lin, 'Tuned Linear SVM'),
        calc_metrics(rbf_svm_base, 'Baseline RBF SVM'),
        calc_metrics(best_rbf, 'Tuned RBF SVM (Optimal)')
    ]
    benchmark_df = pd.DataFrame(benchmarks)
    print(benchmark_df.to_string(index=False))

    # 7. FEATURE IMPORTANCE EXTRACTION
    print("\n[STEP 7] Feature Importance Extraction & Comparative Attribution...")
    dt_imp = pd.Series(best_dt.feature_importances_, index=feature_names).sort_values(ascending=False)
    lin_imp = pd.Series(np.abs(best_lin.coef_[0]), index=feature_names).sort_values(ascending=False)
    rbf_perm = permutation_importance(best_rbf, X_test, y_test, n_repeats=50, random_state=42, n_jobs=-1)
    rbf_imp = pd.Series(rbf_perm.importances_mean, index=feature_names).sort_values(ascending=False)

    comp_df = pd.DataFrame({
        "Rank": range(1, 6),
        "Decision Tree (Gini)": [f"{k} ({v:.4f})" for k, v in dt_imp.head(5).items()],
        "Linear SVM (|w|)": [f"{k} ({v:.4f})" for k, v in lin_imp.head(5).items()],
        "RBF SVM (Permutation)": [f"{k} ({v:.4f})" for k, v in rbf_imp.head(5).items()]
    })
    print(comp_df.to_string(index=False))

    # 8. PCA DIMENSIONALITY REDUCTION
    print("\n[STEP 8] Computing 2D and 3D PCA Latent Space Projections...")
    pca = PCA(n_components=2, random_state=42)
    pca.fit(X_train)
    pca3d = PCA(n_components=3, random_state=42)
    pca3d.fit(X_train)

    print(f" -> 2D PCA Explained Variance: PC1 = {pca.explained_variance_ratio_[0]*100:.2f}%, "
          f"PC2 = {pca.explained_variance_ratio_[1]*100:.2f}% | Total 2D = {sum(pca.explained_variance_ratio_)*100:.2f}%")
    print(f" -> 3D PCA Explained Variance: PC1 = {pca3d.explained_variance_ratio_[0]*100:.2f}%, "
          f"PC2 = {pca3d.explained_variance_ratio_[1]*100:.2f}%, PC3 = {pca3d.explained_variance_ratio_[2]*100:.2f}% | "
          f"Total 3D = {sum(pca3d.explained_variance_ratio_)*100:.2f}%")

    print("\n" + "=" * 80)
    print("PIPELINE EXECUTION COMPLETE: Tuned RBF SVM selected for clinical deployment.")
    print("Live Dashboard: https://oncovision-ai-healthcare-analytics.vercel.app/")
    print("=" * 80)

if __name__ == "__main__":
    main()
