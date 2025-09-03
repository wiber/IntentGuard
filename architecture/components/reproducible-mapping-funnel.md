# Reproducible Mapping Funnel - Detailed Specification

## Overview

The Reproducible Mapping Funnel ensures standardized, deterministic transformation from discovered categories to Trust Debt scores with mathematical rigor and regulatory compliance guarantees.

## Regulatory Requirements

### 1. Deterministic Mapping
- **Requirement**: Identical category inputs must produce identical Trust Debt scores
- **Implementation**: Version-controlled algorithms with immutable parameter sets
- **Validation**: Automated regression testing with known category fingerprints

### 2. Mathematical Transparency
- **Requirement**: All calculations must be fully documented and mathematically defensible
- **Implementation**: Formal mathematical specifications with proof of correctness
- **Documentation**: Complete algorithm documentation with worked examples

### 3. Cross-Repository Consistency
- **Requirement**: Similar categories across repositories must yield comparable scores
- **Implementation**: Standardized normalization and calibration procedures
- **Validation**: Statistical consistency testing across repository pairs

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Reproducible Mapping Funnel                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │   Category      │ │   Weight        │ │   Score         │ │
│ │   Normalizer    │ │   Calculator    │ │   Aggregator    │ │
│ │   (Statistical) │ │   (Matrix Ops)  │ │   (Weighted)    │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│           │                   │                   │         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │   Parameter     │ │   Calculation   │ │   Validation    │ │
│ │   Registry      │ │   Engine        │ │   Controller    │ │
│ │   (Versioned)   │ │   (Auditable)   │ │   (Quality)     │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Category Normalizer

#### Purpose
Standardize category measurements for consistent cross-repository comparison with statistical rigor.

#### Mathematical Foundation
```python
class CategoryNormalizer:
    def __init__(self, 
                 normalization_method: str = "z_score",
                 reference_population: Optional[str] = None):
        self.method = normalization_method
        self.reference_population = reference_population
        self.normalization_parameters = self._load_parameters()
        
    def normalize_categories(self, 
                           categories: List[Category],
                           repository_context: RepositoryContext) -> List[NormalizedCategory]:
        """
        Apply statistical normalization with regulatory compliance
        """
        # Validate input categories
        self._validate_category_integrity(categories)
        
        # Load reference statistics
        reference_stats = self._load_reference_statistics(
            self.reference_population or repository_context.language
        )
        
        normalized_categories = []
        
        for category in categories:
            # Apply normalization method
            if self.method == "z_score":
                normalized_metrics = self._apply_z_score_normalization(
                    category.metrics, reference_stats
                )
            elif self.method == "min_max":
                normalized_metrics = self._apply_min_max_normalization(
                    category.metrics, reference_stats
                )
            elif self.method == "robust":
                normalized_metrics = self._apply_robust_normalization(
                    category.metrics, reference_stats
                )
            else:
                raise ValueError(f"Unsupported normalization method: {self.method}")
            
            # Create normalized category
            normalized_category = NormalizedCategory(
                id=category.id,
                name=category.name,
                original_metrics=category.metrics,
                normalized_metrics=normalized_metrics,
                normalization_method=self.method,
                reference_population=reference_stats.population_id,
                confidence_interval=self._calculate_normalization_confidence(
                    category.metrics, reference_stats
                )
            )
            
            normalized_categories.append(normalized_category)
        
        # Validate normalization quality
        self._validate_normalization_quality(normalized_categories)
        
        return normalized_categories
        
    def _apply_z_score_normalization(self, 
                                    metrics: Dict[str, float],
                                    reference_stats: ReferenceStatistics) -> Dict[str, float]:
        """
        Apply Z-score normalization with statistical validation
        """
        normalized_metrics = {}
        
        for metric_name, value in metrics.items():
            if metric_name in reference_stats.means:
                mean = reference_stats.means[metric_name]
                std = reference_stats.standard_deviations[metric_name]
                
                # Handle zero standard deviation
                if std < 1e-10:
                    normalized_value = 0.0
                else:
                    normalized_value = (value - mean) / std
                
                # Apply bounds checking
                normalized_value = np.clip(normalized_value, -5.0, 5.0)  # Regulatory bounds
                
                normalized_metrics[metric_name] = normalized_value
            else:
                # Handle unknown metrics
                normalized_metrics[metric_name] = 0.0
                
        return normalized_metrics
```

### 2. Weight Calculator

#### Purpose
Calculate optimal weights for category contributions using matrix operations with mathematical justification.

#### Weight Calculation Algorithm
```python
class OptimalWeightCalculator:
    def __init__(self, 
                 weight_method: str = "pca",
                 regularization: float = 0.01):
        self.method = weight_method
        self.regularization = regularization
        
    def calculate_weights(self, 
                         normalized_categories: List[NormalizedCategory],
                         optimization_target: str = "orthogonality") -> WeightMatrix:
        """
        Calculate optimal category weights with mathematical justification
        """
        # Extract feature matrix
        feature_matrix = self._create_feature_matrix(normalized_categories)
        
        # Apply weight calculation method
        if self.method == "pca":
            weights = self._calculate_pca_weights(feature_matrix)
        elif self.method == "ica":
            weights = self._calculate_ica_weights(feature_matrix)
        elif self.method == "equal":
            weights = self._calculate_equal_weights(feature_matrix)
        elif self.method == "entropy":
            weights = self._calculate_entropy_weights(feature_matrix)
        else:
            raise ValueError(f"Unsupported weight method: {self.method}")
        
        # Apply regularization
        regularized_weights = self._apply_regularization(weights)
        
        # Validate weight properties
        self._validate_weight_properties(regularized_weights)
        
        # Create weight matrix with provenance
        weight_matrix = WeightMatrix(
            weights=regularized_weights,
            method=self.method,
            regularization=self.regularization,
            calculation_timestamp=datetime.utcnow(),
            mathematical_justification=self._generate_weight_justification(
                feature_matrix, regularized_weights
            ),
            validation_metrics=self._calculate_weight_validation_metrics(
                feature_matrix, regularized_weights
            )
        )
        
        return weight_matrix
        
    def _calculate_pca_weights(self, feature_matrix: np.ndarray) -> np.ndarray:
        """
        Calculate weights based on Principal Component Analysis
        """
        # Center the feature matrix
        centered_matrix = feature_matrix - np.mean(feature_matrix, axis=0)
        
        # Calculate covariance matrix
        cov_matrix = np.cov(centered_matrix.T)
        
        # Eigenvalue decomposition
        eigenvalues, eigenvectors = np.linalg.eigh(cov_matrix)
        
        # Sort by eigenvalue magnitude
        sorted_indices = np.argsort(eigenvalues)[::-1]
        sorted_eigenvalues = eigenvalues[sorted_indices]
        sorted_eigenvectors = eigenvectors[:, sorted_indices]
        
        # Calculate explained variance ratios
        explained_variance_ratio = sorted_eigenvalues / np.sum(sorted_eigenvalues)
        
        # Use first principal component as weights
        weights = np.abs(sorted_eigenvectors[:, 0])
        
        # Normalize weights to sum to 1
        weights = weights / np.sum(weights)
        
        return weights
```

### 3. Score Aggregator

#### Purpose
Combine weighted category scores into final Trust Debt score with uncertainty quantification.

#### Aggregation Framework
```python
class TrustDebtScoreAggregator:
    def __init__(self, 
                 aggregation_method: str = "weighted_geometric_mean",
                 confidence_level: float = 0.95):
        self.method = aggregation_method
        self.confidence_level = confidence_level
        
    def calculate_trust_debt_score(self, 
                                  normalized_categories: List[NormalizedCategory],
                                  weight_matrix: WeightMatrix) -> TrustDebtScore:
        """
        Calculate final Trust Debt score with uncertainty quantification
        """
        # Validate inputs
        self._validate_aggregation_inputs(normalized_categories, weight_matrix)
        
        # Extract category scores and weights
        category_scores = np.array([
            self._extract_category_score(cat) for cat in normalized_categories
        ])
        weights = weight_matrix.weights
        
        # Apply aggregation method
        if self.method == "weighted_arithmetic_mean":
            raw_score = np.average(category_scores, weights=weights)
        elif self.method == "weighted_geometric_mean":
            raw_score = self._weighted_geometric_mean(category_scores, weights)
        elif self.method == "weighted_harmonic_mean":
            raw_score = self._weighted_harmonic_mean(category_scores, weights)
        elif self.method == "robust_weighted_median":
            raw_score = self._weighted_median(category_scores, weights)
        else:
            raise ValueError(f"Unsupported aggregation method: {self.method}")
        
        # Apply score transformation
        transformed_score = self._apply_score_transformation(raw_score)
        
        # Calculate uncertainty bounds
        uncertainty_bounds = self._calculate_uncertainty_bounds(
            category_scores, weights, normalized_categories
        )
        
        # Generate final Trust Debt score
        trust_debt_score = TrustDebtScore(
            value=transformed_score,
            raw_value=raw_score,
            aggregation_method=self.method,
            category_contributions=self._calculate_category_contributions(
                category_scores, weights
            ),
            uncertainty_bounds=uncertainty_bounds,
            confidence_level=self.confidence_level,
            calculation_timestamp=datetime.utcnow(),
            mathematical_proof=self._generate_calculation_proof(
                category_scores, weights, raw_score, transformed_score
            )
        )
        
        return trust_debt_score
        
    def _weighted_geometric_mean(self, 
                                scores: np.ndarray, 
                                weights: np.ndarray) -> float:
        """
        Calculate weighted geometric mean with numerical stability
        """
        # Handle negative scores by shifting to positive domain
        min_score = np.min(scores)
        if min_score <= 0:
            shifted_scores = scores - min_score + 1e-10
        else:
            shifted_scores = scores
            
        # Calculate weighted geometric mean
        log_weighted_sum = np.sum(weights * np.log(shifted_scores))
        geometric_mean = np.exp(log_weighted_sum)
        
        # Shift back if necessary
        if min_score <= 0:
            geometric_mean = geometric_mean + min_score - 1e-10
            
        return geometric_mean
```

### 4. Parameter Registry

#### Purpose
Maintain version-controlled, immutable parameter sets for all calculations with change management.

#### Registry Implementation
```python
class VersionedParameterRegistry:
    def __init__(self, registry_path: str):
        self.registry_path = registry_path
        self.current_version = self._load_current_version()
        self.parameter_history = self._load_parameter_history()
        
    def get_parameters(self, 
                      component: str, 
                      version: Optional[str] = None) -> ParameterSet:
        """
        Retrieve parameter set with version tracking
        """
        version = version or self.current_version
        
        if version not in self.parameter_history:
            raise ValueError(f"Parameter version {version} not found")
            
        if component not in self.parameter_history[version]:
            raise ValueError(f"Component {component} not found in version {version}")
            
        parameter_set = ParameterSet(
            component=component,
            version=version,
            parameters=self.parameter_history[version][component],
            creation_timestamp=self.parameter_history[version]['metadata']['timestamp'],
            hash=self._calculate_parameter_hash(
                self.parameter_history[version][component]
            ),
            provenance=self.parameter_history[version]['metadata']['provenance']
        )
        
        return parameter_set
        
    def register_new_parameters(self, 
                               component: str,
                               parameters: Dict[str, Any],
                               justification: str) -> str:
        """
        Register new parameter set with regulatory approval process
        """
        # Validate parameter format
        self._validate_parameter_format(component, parameters)
        
        # Calculate change impact
        current_params = self.get_parameters(component)
        change_impact = self._calculate_change_impact(
            current_params.parameters, parameters
        )
        
        # Require approval for significant changes
        if change_impact.significance_level > 0.1:
            approval = self._require_regulatory_approval(
                component, parameters, change_impact, justification
            )
            if not approval.approved:
                raise RegulatoryApprovalError(approval.reason)
        
        # Create new version
        new_version = self._generate_version_number()
        
        # Register parameters
        self.parameter_history[new_version] = {
            component: parameters,
            'metadata': {
                'timestamp': datetime.utcnow().isoformat(),
                'justification': justification,
                'change_impact': change_impact.to_dict(),
                'approval': approval.to_dict() if change_impact.significance_level > 0.1 else None,
                'provenance': f"Registration by system at {datetime.utcnow()}"
            }
        }
        
        # Update current version
        self.current_version = new_version
        
        # Persist changes
        self._persist_parameter_history()
        
        return new_version
```

### 5. Calculation Engine

#### Purpose
Execute all Trust Debt calculations with complete audit trails and mathematical verification.

#### Calculation Pipeline
```python
class AuditableCalculationEngine:
    def __init__(self, parameter_registry: VersionedParameterRegistry):
        self.parameter_registry = parameter_registry
        self.calculation_auditor = CalculationAuditor()
        
    def execute_trust_debt_calculation(self, 
                                      categories: List[Category],
                                      repository_context: RepositoryContext) -> CalculationResult:
        """
        Execute complete Trust Debt calculation with audit trail
        """
        # Start calculation audit
        calculation_id = self.calculation_auditor.start_calculation(
            categories, repository_context
        )
        
        try:
            # Step 1: Category Normalization
            normalizer = CategoryNormalizer(
                **self.parameter_registry.get_parameters("normalizer").parameters
            )
            normalized_categories = normalizer.normalize_categories(
                categories, repository_context
            )
            self.calculation_auditor.log_step(
                calculation_id, "normalization", normalized_categories
            )
            
            # Step 2: Weight Calculation
            weight_calculator = OptimalWeightCalculator(
                **self.parameter_registry.get_parameters("weight_calculator").parameters
            )
            weight_matrix = weight_calculator.calculate_weights(normalized_categories)
            self.calculation_auditor.log_step(
                calculation_id, "weight_calculation", weight_matrix
            )
            
            # Step 3: Score Aggregation
            score_aggregator = TrustDebtScoreAggregator(
                **self.parameter_registry.get_parameters("score_aggregator").parameters
            )
            trust_debt_score = score_aggregator.calculate_trust_debt_score(
                normalized_categories, weight_matrix
            )
            self.calculation_auditor.log_step(
                calculation_id, "score_aggregation", trust_debt_score
            )
            
            # Step 4: Final Validation
            validation_result = self._validate_final_score(
                trust_debt_score, categories, repository_context
            )
            self.calculation_auditor.log_step(
                calculation_id, "final_validation", validation_result
            )
            
            # Complete calculation
            calculation_result = CalculationResult(
                calculation_id=calculation_id,
                trust_debt_score=trust_debt_score,
                normalized_categories=normalized_categories,
                weight_matrix=weight_matrix,
                validation_result=validation_result,
                audit_trail=self.calculation_auditor.get_audit_trail(calculation_id),
                calculation_timestamp=datetime.utcnow()
            )
            
            self.calculation_auditor.complete_calculation(calculation_id, calculation_result)
            
            return calculation_result
            
        except Exception as e:
            self.calculation_auditor.fail_calculation(calculation_id, str(e))
            raise
```

## Quality Assurance Framework

### Mathematical Validation
1. **Score Bounds**: All scores must be within [0, 100] range
2. **Weight Conservation**: All weights must sum to 1.0 ± 1e-10
3. **Normalization Integrity**: Z-scores must have mean ≈ 0, std ≈ 1
4. **Uncertainty Bounds**: Confidence intervals must contain true value with specified probability

### Reproducibility Testing
1. **Deterministic Verification**: Identical results across multiple runs
2. **Version Consistency**: Same parameters produce same results across versions
3. **Cross-Platform Stability**: Consistent results across different computing environments
4. **Numerical Precision**: Results stable to specified decimal places

### Regulatory Compliance
1. **Parameter Versioning**: All parameter changes tracked and approved
2. **Calculation Audit**: Complete record of all calculation steps
3. **Mathematical Proof**: Formal verification of calculation correctness
4. **Change Impact Analysis**: Assessment of parameter change effects

This specification ensures the Reproducible Mapping Funnel meets regulatory requirements while providing mathematically rigorous and consistent Trust Debt score calculations.