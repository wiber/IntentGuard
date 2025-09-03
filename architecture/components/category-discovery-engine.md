# Category Discovery Engine - Detailed Specification

## Overview

The Category Discovery Engine is the foundation of the Trust Debt analysis system, responsible for automated identification and clustering of code patterns with mathematical orthogonality validation.

## Regulatory Requirements

### 1. Deterministic Operation
- **Requirement**: Identical inputs must produce identical category sets
- **Implementation**: Seeded random number generators, deterministic clustering algorithms
- **Validation**: Automated regression testing with known repository fingerprints

### 2. Mathematical Justification
- **Requirement**: All category boundaries must be mathematically defensible
- **Implementation**: Vector space analysis with formal similarity metrics
- **Documentation**: Statistical significance testing for all category separations

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Category Discovery Engine                     │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │   Pattern       │ │   Clustering    │ │  Orthogonality  │ │
│ │   Extraction    │ │   Algorithm     │ │   Validator     │ │
│ │   Module        │ │   (K-Means++)   │ │   (Vector Ops)  │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│           │                   │                   │         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │   Feature       │ │   Silhouette    │ │   Category      │ │
│ │   Vectorizer    │ │   Optimizer     │ │   Labeler       │ │
│ │   (TF-IDF)      │ │   (Auto-K)      │ │   (Semantic)    │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Pattern Extraction Module

#### Purpose
Extract meaningful code patterns and convert them into analyzable features.

#### Regulatory Controls
- **Input Validation**: SHA-256 checksums for all processed files
- **Pattern Consistency**: Standardized AST parsing with version-locked parsers
- **Output Verification**: Statistical distribution checks on extracted features

#### Implementation Details
```python
class PatternExtractor:
    def __init__(self, seed=42):
        self.seed = seed  # Regulatory requirement: deterministic operation
        self.parsers = self._initialize_parsers()
        self.feature_extractors = self._initialize_extractors()
    
    def extract_patterns(self, repository_path: str) -> List[Pattern]:
        """
        Extract code patterns with full audit trail
        """
        audit_log = AuditTrail(operation="pattern_extraction")
        
        # Validate input integrity
        repo_hash = self._calculate_repository_hash(repository_path)
        audit_log.record("input_hash", repo_hash)
        
        # Extract patterns with deterministic order
        patterns = self._extract_with_deterministic_order(repository_path)
        audit_log.record("patterns_extracted", len(patterns))
        
        # Validate output consistency
        self._validate_pattern_distribution(patterns)
        
        return patterns
```

### 2. Feature Vectorizer (TF-IDF)

#### Purpose
Convert extracted patterns into numerical feature vectors for clustering analysis.

#### Mathematical Foundation
- **TF-IDF Calculation**: Standard formula with logarithmic smoothing
- **Normalization**: L2 normalization for cosine similarity compatibility
- **Dimensionality**: Configurable with regulatory-approved ranges (100-1000 features)

#### Regulatory Controls
```python
class RegulatoryTFIDF:
    def __init__(self, 
                 max_features: int = 500,  # Regulatory approved range
                 min_df: float = 0.01,     # Minimum document frequency
                 max_df: float = 0.95,     # Maximum document frequency
                 seed: int = 42):          # Deterministic operation
        
        self.vectorizer = TfidfVectorizer(
            max_features=max_features,
            min_df=min_df,
            max_df=max_df,
            random_state=seed,
            stop_words='english',
            ngram_range=(1, 3)  # Regulatory approved n-gram range
        )
        
    def fit_transform(self, patterns: List[str]) -> np.ndarray:
        """Transform patterns with full regulatory compliance"""
        
        # Validate input parameters
        self._validate_regulatory_parameters()
        
        # Transform with audit logging
        feature_matrix = self.vectorizer.fit_transform(patterns)
        
        # Validate output distribution
        self._validate_feature_distribution(feature_matrix)
        
        return feature_matrix.toarray()
```

### 3. Clustering Algorithm (Enhanced K-Means++)

#### Purpose
Identify optimal category clusters with mathematical justification for cluster count.

#### Regulatory Requirements
- **Deterministic Initialization**: K-Means++ with fixed seed
- **Optimal K Selection**: Silhouette score optimization with statistical significance testing
- **Convergence Guarantee**: Maximum iteration limits with convergence validation

#### Mathematical Validation
```python
class RegulatoryKMeans:
    def __init__(self, seed=42, max_iter=300, tol=1e-4):
        self.seed = seed
        self.max_iter = max_iter
        self.tol = tol
        
    def find_optimal_clusters(self, 
                             feature_matrix: np.ndarray,
                             k_range: Tuple[int, int] = (3, 15)) -> int:
        """
        Find optimal number of clusters with statistical validation
        """
        silhouette_scores = []
        calinski_scores = []
        
        for k in range(k_range[0], k_range[1] + 1):
            # Fit K-means with regulatory parameters
            kmeans = KMeans(
                n_clusters=k,
                init='k-means++',
                random_state=self.seed,
                max_iter=self.max_iter,
                tol=self.tol
            )
            
            cluster_labels = kmeans.fit_predict(feature_matrix)
            
            # Calculate validation metrics
            sil_score = silhouette_score(feature_matrix, cluster_labels)
            cal_score = calinski_harabasz_score(feature_matrix, cluster_labels)
            
            silhouette_scores.append(sil_score)
            calinski_scores.append(cal_score)
        
        # Select optimal K with statistical significance testing
        optimal_k = self._select_statistically_significant_k(
            silhouette_scores, calinski_scores, k_range
        )
        
        return optimal_k
```

### 4. Orthogonality Validator

#### Purpose
Ensure mathematical independence between discovered categories using vector space analysis.

#### Mathematical Foundation
- **Cosine Similarity**: Primary orthogonality metric
- **Statistical Independence**: Chi-square test for category independence
- **Threshold Enforcement**: Configurable but audited similarity thresholds

#### Implementation
```python
class OrthogonalityValidator:
    def __init__(self, 
                 similarity_threshold: float = 0.1,  # Regulatory threshold
                 confidence_level: float = 0.95):
        self.similarity_threshold = similarity_threshold
        self.confidence_level = confidence_level
        
    def validate_orthogonality(self, 
                              category_centroids: np.ndarray) -> ValidationResult:
        """
        Validate category orthogonality with statistical rigor
        """
        # Calculate pairwise cosine similarities
        similarity_matrix = cosine_similarity(category_centroids)
        
        # Remove diagonal elements (self-similarity = 1)
        np.fill_diagonal(similarity_matrix, 0)
        
        # Check orthogonality threshold
        max_similarity = np.max(similarity_matrix)
        orthogonality_violations = np.where(
            similarity_matrix > self.similarity_threshold
        )
        
        # Statistical independence test
        chi2_stat, p_value = self._chi_square_independence_test(
            category_centroids
        )
        
        # Generate validation result
        result = ValidationResult(
            is_orthogonal=(max_similarity <= self.similarity_threshold),
            max_similarity=max_similarity,
            similarity_threshold=self.similarity_threshold,
            violations=orthogonality_violations,
            chi2_statistic=chi2_stat,
            p_value=p_value,
            is_statistically_independent=(p_value < (1 - self.confidence_level))
        )
        
        return result
```

### 5. Category Labeler (Semantic)

#### Purpose
Assign meaningful, human-readable labels to discovered categories based on dominant patterns.

#### Regulatory Requirements
- **Consistency**: Identical patterns must receive identical labels
- **Transparency**: Label assignment algorithm must be fully documented
- **Validation**: Labels must reflect actual category content with statistical verification

#### Implementation Strategy
```python
class SemanticCategoryLabeler:
    def __init__(self, 
                 min_pattern_frequency: float = 0.1,
                 label_confidence_threshold: float = 0.7):
        self.min_pattern_frequency = min_pattern_frequency
        self.label_confidence_threshold = label_confidence_threshold
        
    def assign_labels(self, 
                     clusters: List[List[Pattern]], 
                     feature_names: List[str]) -> List[CategoryLabel]:
        """
        Assign semantic labels with confidence scoring
        """
        labels = []
        
        for cluster_idx, cluster in enumerate(clusters):
            # Extract dominant features
            dominant_features = self._extract_dominant_features(
                cluster, feature_names
            )
            
            # Generate semantic label
            label, confidence = self._generate_semantic_label(
                dominant_features
            )
            
            # Validate label quality
            if confidence < self.label_confidence_threshold:
                label = f"Category_{cluster_idx}_LowConfidence"
                
            category_label = CategoryLabel(
                id=cluster_idx,
                name=label,
                confidence=confidence,
                dominant_features=dominant_features,
                cluster_size=len(cluster)
            )
            
            labels.append(category_label)
            
        return labels
```

## Quality Assurance Framework

### Statistical Validation Tests
1. **Silhouette Score**: Minimum threshold of 0.5 for cluster quality
2. **Calinski-Harabasz Index**: Comparative analysis across K values
3. **Orthogonality Test**: Maximum cosine similarity < 0.1
4. **Chi-Square Independence**: p-value < 0.05 for statistical independence

### Regulatory Compliance Checks
1. **Deterministic Verification**: Identical results across runs
2. **Parameter Validation**: All parameters within approved ranges
3. **Audit Trail Completeness**: Every operation logged with timestamps
4. **Input/Output Integrity**: Cryptographic verification of data consistency

## Performance Requirements

### Processing Time
- **Target**: <5 minutes for repositories up to 100,000 lines of code
- **Scalability**: Linear time complexity with file count
- **Memory Usage**: <8GB RAM for standard analysis

### Accuracy Requirements
- **Cluster Quality**: Silhouette score > 0.5
- **Orthogonality**: Cosine similarity < 0.1 between categories
- **Reproducibility**: 100% identical results for identical inputs
- **Label Confidence**: >70% confidence for semantic labels

This specification ensures the Category Discovery Engine meets regulatory requirements while providing mathematically rigorous and reproducible category identification for Trust Debt analysis.