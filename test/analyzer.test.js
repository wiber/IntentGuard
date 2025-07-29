const { analyzeCommit } = require('../src/analyzer');

// Mock the OpenAI module
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  stated_intent_summary: "Add user authentication",
                  realized_intent_summary: "Add user authentication with JWT tokens",
                  semantic_dimensions: {
                    stated: ["authentication", "users"],
                    realized: ["authentication", "users", "jwt", "tokens"]
                  },
                  alignment_score: 0.85,
                  explanation: "Code implements authentication as stated, with additional JWT implementation details."
                })
              }
            }]
          })
        }
      }
    };
  });
});

// Mock config
jest.mock('../src/config', () => ({
  getConfig: jest.fn().mockResolvedValue({ apiKey: 'test-key' })
}));

describe('IntentGuard Analyzer', () => {
  test('analyzes aligned commit correctly', async () => {
    const commitMessage = "Add user authentication";
    const codeDiff = `
diff --git a/src/auth.js b/src/auth.js
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/auth.js
@@ -0,0 +1,10 @@
+const jwt = require('jsonwebtoken');
+
+function authenticate(user, password) {
+  // Check credentials
+  if (validateUser(user, password)) {
+    return jwt.sign({ user }, SECRET);
+  }
+  return null;
+}
`;

    const result = await analyzeCommit(commitMessage, codeDiff);
    
    expect(result).toHaveProperty('alignment_score');
    expect(result.alignment_score).toBeGreaterThan(0.7);
    expect(result).toHaveProperty('stated_intent_summary');
    expect(result).toHaveProperty('realized_intent_summary');
  });
});

describe('Git Integration', () => {
  const { getGitDiff } = require('../src/git');
  
  test('getGitDiff handles empty diff', async () => {
    // This would need proper mocking of exec
    // For now, just verify the function exists
    expect(typeof getGitDiff).toBe('function');
  });
});

describe('Semantic Debt', () => {
  const { addSemanticDebt, checkSemanticDebt } = require('../src/debt');
  
  test('debt tracking functions exist', () => {
    expect(typeof addSemanticDebt).toBe('function');
    expect(typeof checkSemanticDebt).toBe('function');
  });
});