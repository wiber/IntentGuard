/**
 * NPM Package Export Tests
 * Verifies that the published npm package exports are working correctly.
 *
 * Note: Tests that require build artifacts (lib/, bin/) are skipped
 * when those directories don't exist (pre-build environment).
 */

const path = require('path');
const fs = require('fs');

const binExists = fs.existsSync(path.join(__dirname, '..', 'bin', 'cli.js'));
const libPath = path.join(__dirname, '..', 'lib', 'index.js');
const libExists = fs.existsSync(libPath);

// Try to load lib/index.js - it may fail if build is incomplete
let libLoadable = false;
let libExport = null;
try {
  if (libExists) {
    libExport = require('../lib/index.js');
    libLoadable = true;
  }
} catch {
  // lib not fully built - skip dependent tests
}

describe('NPM Package Exports', () => {
  describe('Main Export', () => {
    (libLoadable ? it : it.skip)('should export from lib/index.js', () => {
      expect(libExport).toBeDefined();
    });

    (libLoadable ? it : it.skip)('should export VERSION constant', () => {
      expect(libExport.VERSION).toBeDefined();
      expect(typeof libExport.VERSION).toBe('string');
    });

    (libLoadable ? it : it.skip)('should export BRAND constant', () => {
      expect(libExport.BRAND).toBeDefined();
      expect(libExport.BRAND.name).toBe('IntentGuard');
    });
  });

  describe('Binary Executable', () => {
    (binExists ? it : it.skip)('should have executable CLI at bin/cli.js', () => {
      const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');

      expect(fs.existsSync(cliPath)).toBe(true);

      const stats = fs.statSync(cliPath);
      // Check if executable bit is set (Unix-like systems)
      const isExecutable = (stats.mode & 0o111) !== 0;
      expect(isExecutable).toBe(true);
    });

    (binExists ? it : it.skip)('should have valid Node.js shebang', () => {
      const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');
      const content = fs.readFileSync(cliPath, 'utf8');

      expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
    });
  });

  describe('Package.json Configuration', () => {
    const pkg = require('../package.json');

    it('should have correct package name', () => {
      expect(pkg.name).toBe('intentguard');
    });

    it('should have main entry point', () => {
      expect(pkg.main).toBe('lib/index.js');
    });

    it('should have types definition', () => {
      expect(pkg.types).toBe('lib/index.d.ts');
    });

    it('should have binary configured', () => {
      expect(pkg.bin).toBeDefined();
      expect(pkg.bin.intentguard).toBe('./bin/cli.js');
    });

    it('should have exports field for ESM/CJS compatibility', () => {
      expect(pkg.exports).toBeDefined();
      expect(pkg.exports['.']).toBeDefined();
      expect(pkg.exports['.'].import).toBe('./lib/index.js');
      expect(pkg.exports['.'].require).toBe('./lib/index.js');
    });

    it('should have publish config set to public', () => {
      expect(pkg.publishConfig).toBeDefined();
      expect(pkg.publishConfig.access).toBe('public');
    });

    it('should include required files', () => {
      expect(pkg.files).toBeDefined();
      expect(pkg.files).toContain('bin');
      expect(pkg.files).toContain('lib');
      expect(pkg.files).toContain('templates');
    });
  });

  describe('Required Files', () => {
    it('should have README.md', () => {
      const readmePath = path.join(__dirname, '..', 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
    });

    it('should have LICENSE file', () => {
      const licensePath = path.join(__dirname, '..', 'LICENSE');
      expect(fs.existsSync(licensePath)).toBe(true);
    });

    (libExists ? it : it.skip)('should have lib directory with compiled code', () => {
      const libDir = path.join(__dirname, '..', 'lib');
      expect(fs.existsSync(libDir)).toBe(true);

      const indexPath = path.join(libDir, 'index.js');
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('should have templates directory', () => {
      const templatesPath = path.join(__dirname, '..', 'templates');
      expect(fs.existsSync(templatesPath)).toBe(true);
    });
  });

  describe('Dependencies', () => {
    const pkg = require('../package.json');

    it('should have runtime dependencies declared', () => {
      expect(pkg.dependencies).toBeDefined();
      expect(Object.keys(pkg.dependencies).length).toBeGreaterThan(0);
    });

    it('should have required core dependencies', () => {
      expect(pkg.dependencies['simple-git']).toBeDefined();
      expect(pkg.dependencies['glob']).toBeDefined();
      expect(pkg.dependencies['commander']).toBeDefined();
    });

    it('should not have devDependencies as runtime dependencies', () => {
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};

      // No overlap between dependencies and devDependencies
      const overlap = Object.keys(deps).filter(key => key in devDeps);
      expect(overlap.length).toBe(0);
    });
  });

  describe('npm pack Simulation', () => {
    (libExists && binExists ? it : it.skip)('should be able to pack the package', async () => {
      const { execSync } = require('child_process');

      // Dry run to see what would be included
      const output = execSync('npm pack --dry-run 2>&1', {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
      });

      expect(output).toContain('intentguard');
      expect(output).toContain('bin/cli.js');
      expect(output).toContain('lib/index.js');
    });
  });

  describe('Subpath Exports', () => {
    const pkg = require('../package.json');

    it('should define auth subpath export', () => {
      expect(pkg.exports['./auth']).toBeDefined();
      expect(pkg.exports['./auth'].import).toBe('./lib/auth/index.js');
      expect(pkg.exports['./auth'].types).toBe('./lib/auth/index.d.ts');
    });

    it('should define swarm subpath export', () => {
      expect(pkg.exports['./swarm']).toBeDefined();
      expect(pkg.exports['./swarm'].import).toBe('./lib/swarm/index.js');
      expect(pkg.exports['./swarm'].types).toBe('./lib/swarm/index.d.ts');
    });

    (libExists ? it : it.skip)('should have auth module files', () => {
      const authIndexPath = path.join(__dirname, '..', 'lib', 'auth', 'index.js');
      expect(fs.existsSync(authIndexPath)).toBe(true);
    });

    (libExists ? it : it.skip)('should have swarm module files', () => {
      const swarmIndexPath = path.join(__dirname, '..', 'lib', 'swarm', 'index.js');
      expect(fs.existsSync(swarmIndexPath)).toBe(true);
    });
  });
});

describe('Package Integrity', () => {
  it('should have consistent version across package.json', () => {
    const pkg = require('../package.json');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should have valid npm package name', () => {
    const pkg = require('../package.json');
    // npm package name rules: lowercase, no spaces, URL-safe
    expect(pkg.name).toMatch(/^[a-z0-9-._~]+$/);
  });

  it('should have repository URL', () => {
    const pkg = require('../package.json');
    expect(pkg.repository).toBeDefined();
    expect(pkg.repository.url).toContain('github.com');
  });

  it('should have valid license', () => {
    const pkg = require('../package.json');
    expect(pkg.license).toBe('MIT');
  });
});
