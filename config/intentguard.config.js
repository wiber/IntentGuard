/**
 * Intent Guard Configuration v2.0
 * Canonical source of truth for Trust Debt forcing function
 * This file defines inputs, orthogonal vectors, and crisis thresholds
 * Legitimacy requires version-controlled and auditable configuration
 */

module.exports = {
  projectInfo: {
    name: 'React Codebase Analysis',
    version: '18.2.0',
    auditDate: new Date().toISOString(),
    auditor: 'Intent Guard v2.0',
    repositoryUrl: 'https://github.com/facebook/react'
  },

  // WHAT we promise (Intent Sources)
  intentSources: {
    // Primary intent from main documentation
    readme: {
      path: './README.md',
      type: 'primary_intent',
      weight: 0.4,
      extractionRules: [
        'Simple, predictable, and performant',
        'A JavaScript library for building user interfaces',
        'Learn Once, Write Anywhere'
      ]
    },
    // Contributing guidelines (developer intent)
    contributing: {
      path: './docs/CONTRIBUTING.md', 
      type: 'developer_intent',
      weight: 0.3,
      extractionRules: [
        'Zero-config development experience',
        'Predictable behavior',
        'Performance considerations'
      ]
    },
    // API documentation (user intent)
    docs: {
      path: './docs/',
      type: 'api_intent',
      weight: 0.2,
      extractionRules: [
        'Component-driven architecture',
        'Declarative programming model',
        'Unidirectional data flow'
      ]
    },
    // Philosophy and design principles
    philosophy: {
      path: './docs/technical/CLAUDE.md',
      type: 'design_intent', 
      weight: 0.1,
      extractionRules: [
        'Composition over inheritance',
        'Common abstraction',
        'Escape hatches'
      ]
    }
  },

  // HOW we measure reality (Reality Sources)
  realitySources: {
    // Layer 1: Process Health - How they build
    codebase: {
      source: 'filesystem_analysis',
      type: 'implementation_reality',
      paths: ['./packages/', './src/'],
      excludes: ['node_modules', 'build', '__tests__']
    },
    commits: {
      source: 'git log --since="6 months ago" --format="%s"',
      type: 'development_reality',
      weight: 0.3
    },
    issues: {
      source: 'github_api_issues',
      type: 'user_feedback_reality',
      weight: 0.2
    },
    // Layer 2: Outcome Reality - What they achieve
    performance: {
      source: 'benchmark_results',
      type: 'performance_reality',
      weight: 0.3
    },
    bundle_size: {
      source: 'webpack_analysis',
      type: 'size_reality', 
      weight: 0.2
    }
  },

  // Adaptive category discovery for React
  adaptiveCategories: {
    enabled: true,
    discoveryMethod: 'semantic_clustering',
    expectedCategories: [
      {
        name: 'Performance',
        weight: 0.25,
        intentKeywords: ['fast', 'performant', 'efficient', 'optimized'],
        realityIndicators: ['reconciler', 'fiber', 'scheduler', 'profiler']
      },
      {
        name: 'Developer Experience',
        weight: 0.20,
        intentKeywords: ['simple', 'easy', 'predictable', 'intuitive'],
        realityIndicators: ['warnings', 'devtools', 'error-boundaries', 'strict-mode']
      },
      {
        name: 'Component Architecture',
        weight: 0.20,
        intentKeywords: ['component', 'composition', 'reusable', 'modular'],
        realityIndicators: ['jsx', 'props', 'hooks', 'context']
      },
      {
        name: 'Ecosystem Compatibility',
        weight: 0.15,
        intentKeywords: ['compatible', 'interop', 'migration', 'backwards'],
        realityIndicators: ['legacy', 'polyfill', 'fallback', 'compat']
      },
      {
        name: 'Testing & Quality',
        weight: 0.10,
        intentKeywords: ['reliable', 'tested', 'stable', 'quality'],
        realityIndicators: ['test-utils', 'act', 'testing-library', 'jest']
      },
      {
        name: 'Innovation',
        weight: 0.10,
        intentKeywords: ['future', 'experimental', 'concurrent', 'streaming'],
        realityIndicators: ['experimental', 'unstable', 'alpha', 'canary']
      }
    ]
  },

  // Reproducible Magic: Brand Voice Consistency
  reproducibleMagic: {
    target: 'React Brand Voice',
    intentSource: {
      path: './README.md',
      extractionRules: [
        'Tone: Confident but approachable',
        'Style: Clear, direct documentation',
        'Promise: Simple solutions to complex problems'
      ]
    },
    realitySource: {
      paths: ['./docs/', './packages/*/README.md'],
      analysisType: 'semantic_consistency'
    },
    orthogonalVectors: {
      Clarity: {
        weight: 0.4,
        definition: 'Simple, jargon-free explanations',
        measurement: 'avg_sentence_length < 20 words'
      },
      Authority: {
        weight: 0.35,
        definition: 'Technical confidence without arrogance',
        measurement: 'confident_language_ratio'
      },
      Accessibility: {
        weight: 0.25,
        definition: 'Approachable for all skill levels',
        measurement: 'reading_level <= 8th_grade'
      }
    }
  },

  // Crisis Detection Thresholds (The "Stick")
  crisisThresholds: {
    // Zero multiplier: Any outcome vector at 0%
    zeroMultiplier: 0.001,
    
    // Measurement crisis: Can't trust our own measurement
    measurementSelfAlignment: 0.05,
    
    // Diagonal collapse: Too many categories failing self-alignment
    diagonalCollapseCount: 3,
    
    // Correlation crisis: System becoming entangled
    maxCorrelation: 0.3,
    
    // Infinite liability: Total Trust Debt exceeds reasonable bounds
    maxTrustDebt: 999
  },

  // Two-Layer Forcing Function
  layers: {
    // Layer 1: Process Health (Building it Right)
    processHealth: {
      vectors: {
        Measurement: { 
          weight: 0.4,
          definition: 'Ability to quantify progress and quality',
          indicators: ['test coverage', 'benchmarks', 'metrics']
        },
        Visualization: { 
          weight: 0.35,
          definition: 'Clear presentation of system state',
          indicators: ['documentation', 'devtools', 'error messages']
        },
        Enforcement: { 
          weight: 0.25,
          definition: 'Mechanisms to maintain quality',
          indicators: ['linting', 'ci/cd', 'code review']
        }
      }
    },
    
    // Layer 2: Outcome Reality (Building the Right Thing)
    outcomeReality: {
      vectors: {
        UserValue: { 
          weight: 0.4,
          definition: 'Actual benefit delivered to end users',
          measurement: 'github_stars + npm_downloads + community_size'
        },
        StrategicFit: { 
          weight: 0.35,
          definition: 'Alignment with stated project goals',
          measurement: 'roadmap_completion + feature_adoption'
        },
        EthicalIntegrity: { 
          weight: 0.25,
          definition: 'Responsible development practices',
          measurement: 'accessibility + privacy + security'
        }
      }
    }
  },

  // Proprietary Metrics (The "Carrot")
  proprietaryMetrics: {
    semanticCompressionRatio: {
      enabled: true,
      description: 'Memory efficiency through position-meaning unity',
      calculation: 'traditional_storage / unity_storage',
      target: '>10:1'
    },
    correlationTax: {
      enabled: true,
      description: 'System entanglement penalty',
      calculation: '1 - product(1 - |correlation_ij|)',
      target: '<0.1'
    },
    strategicCoherenceScore: {
      enabled: true,
      description: 'Intent-reality alignment percentage',
      calculation: 'cosine_similarity(intent_vector, reality_vector)',
      target: '>80%'
    }
  },

  // Output Configuration
  reporting: {
    format: 'html',
    template: 'crisis_aware',
    crisisMode: {
      suppressNonCritical: true,
      mandatoryActionPlan: true,
      liabilitySubstantiation: true
    },
    publicAudit: {
      includeMethodology: true,
      includeLimitationsDisclosure: true,
      includeReproductionInstructions: true
    }
  },

  // Legal and Compliance
  compliance: {
    euAiAct: {
      enabled: true,
      riskCategory: 'high_risk_ai_system',
      requirementsCheck: [
        'risk_management_system',
        'data_governance', 
        'transparency_obligations',
        'human_oversight',
        'accuracy_robustness'
      ]
    },
    patentClaims: {
      unityArchitecture: 'U.S. Provisional 63/782,569',
      cognitiveProsthetic: 'U.S. Provisional 63/854,530',
      trustPreservation: 'Filing in progress'
    }
  }
};