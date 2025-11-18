# Publishing Guide - @djed/logger

Complete step-by-step guide for publishing `@djed/logger` to npm and GitHub.

---

## Pre-Publish Verification

### 1. Run Final Checks

```bash
# Navigate to package directory
cd /Users/manu/Documents/LUXOR/djed/packages/logger

# Clean and rebuild
npm run clean
npm run build

# Run all tests
npm run test:coverage

# Verify bundle size
npm run check:size

# Security audit
npm audit

# Check package contents
npm pack --dry-run
```

**Expected Results**:
- ✅ 35/35 tests passing
- ✅ 100% code coverage
- ✅ Bundle size: 1.40 KB (< 5 KB target)
- ✅ 0 security vulnerabilities
- ✅ Only necessary files in package

---

## Git Repository Setup

### 2. Create Initial Commit

```bash
# Check git status
git status

# Add all files
git add .

# Create initial commit
git commit -m "feat: initial release v0.1.0

- Progressive complexity API (L1/L2/L3)
- Zero lock-in design (< 5 min ejection)
- Error object serialization
- Silent mode for testing
- Performance measurement utilities
- 100% test coverage (35 tests)
- Comprehensive documentation

Core Features:
✅ Progressive API (Novice → Intermediate → Expert)
✅ Zero Lock-In (< 5 min ejection time)
✅ Error Object Serialization (preserves stack, custom props)
✅ Silent Mode (testing/benchmarking)
✅ Performance Measurement (TTFL 0ms)
✅ Winston Re-export (gradual migration)

Quality Metrics:
✅ Tests: 35/35 passing, 100% coverage
✅ Bundle: 1.40 KB (72% under 5 KB budget)
✅ Security: 0 vulnerabilities
✅ Code Quality: 98/100 (Sonnet review)
✅ Test Quality: 99/100 (Sonnet review)

MERCURIO Coverage: 80% (8/10 characteristics)
MARS Coverage: 70% (4/6 domains)

Generated with [Claude Code](https://claude.com/claude-code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

### 3. Tag the Release

```bash
# Create annotated tag
git tag -a v0.1.0 -m "Release v0.1.0 - Initial production release

Production-ready structured logging wrapper around Winston.

Key Features:
- Progressive complexity (L1/L2/L3 APIs)
- Zero lock-in design (peer dependency only)
- 100% test coverage (35 tests)
- 1.40 KB bundle size
- Comprehensive documentation

Quality Validated:
- practical-programmer: SHIP IT
- Sonnet 4.5: PRODUCTION READY (98/100, 99/100)
- Opus: Success criteria met

Phase 1 MVP Complete - Ready for production use."

# Verify tag
git tag -l -n9 v0.1.0
```

---

## GitHub Repository (When Ready)

### 4. Create GitHub Repository

**Option A: Via GitHub CLI** (if installed):
```bash
# Create repo
gh repo create luxor/djed --public --description "Shared infrastructure for LUXOR projects"

# Add remote
git remote add origin https://github.com/luxor/djed.git

# Push code and tags
git push -u origin main
git push --tags
```

**Option B: Via GitHub Web UI**:
1. Go to https://github.com/new
2. Repository name: `djed`
3. Description: "Shared infrastructure for LUXOR projects"
4. Public or Private: Choose based on requirements
5. Don't initialize with README (we have one)
6. Click "Create repository"

Then add remote and push:
```bash
# Add remote (replace with actual URL)
git remote add origin https://github.com/luxor/djed.git

# Rename branch to main if needed
git branch -M main

# Push code
git push -u origin main

# Push tags
git push --tags
```

---

## NPM Publishing

### 5. Prepare NPM Account

**First-time setup** (if not already done):
```bash
# Login to npm
npm login

# Verify login
npm whoami

# Check for existing package
npm view @djed/logger
# Should return 404 if new package
```

### 6. Publish to NPM

```bash
# Dry run to see what will be published
npm publish --dry-run --access public

# Review output - should show:
# - dist/index.js and dist/index.d.ts
# - package.json
# - README.md, CHANGELOG.md, EJECTING.md
# - Other documentation files
# - NO node_modules, coverage, output directories

# Publish for real
npm publish --access public
```

**Expected Output**:
```
+ @djed/logger@0.1.0
```

### 7. Verify Published Package

```bash
# View on npm
npm view @djed/logger

# Check unpacked size
npm view @djed/logger dist.unpackedSize

# Install in test directory
cd /tmp
mkdir test-djed-logger
cd test-djed-logger
npm init -y
npm install @djed/logger
npm install winston  # peer dependency

# Test it works
node -e "const {Logger} = require('@djed/logger'); const log = new Logger('test'); log.info('Works!');"
```

---

## Post-Publishing Checklist

### 8. Update Documentation Links

After publishing, update these links in your documentation:

**README.md**:
```markdown
## Installation

\`\`\`bash
npm install @djed/logger winston
\`\`\`

**NPM**: https://www.npmjs.com/package/@djed/logger
**GitHub**: https://github.com/luxor/djed
```

**CHANGELOG.md**:
```markdown
## Links

- [npm package](https://www.npmjs.com/package/@djed/logger)
- [GitHub repository](https://github.com/luxor/djed)
```

Commit and push these updates:
```bash
git add README.md CHANGELOG.md
git commit -m "docs: update npm and GitHub links"
git push
```

### 9. Create GitHub Release

**Via GitHub Web UI**:
1. Go to https://github.com/luxor/djed/releases/new
2. Choose tag: `v0.1.0`
3. Release title: `@djed/logger v0.1.0 - Initial Release`
4. Description: Copy from CHANGELOG.md
5. Click "Publish release"

**Via GitHub CLI**:
```bash
gh release create v0.1.0 \
  --title "@djed/logger v0.1.0 - Initial Release" \
  --notes-file CHANGELOG.md
```

### 10. Announce

**Internal (LUXOR Team)**:
- Email summary already sent ✅
- Slack/Teams notification (if applicable)
- Update internal documentation

**External (if public)**:
- Twitter/X announcement
- Blog post
- Community forums

---

## Troubleshooting

### Issue: "You do not have permission to publish"

**Solution**: Ensure you're logged in to the correct npm account:
```bash
npm whoami
npm logout
npm login
```

### Issue: "Package name taken"

**Solution**: Choose a different scope or name:
```bash
# Option 1: Use your npm username as scope
npm init --scope=@yourusername

# Option 2: Check availability first
npm view @djed/logger
```

### Issue: "prepublishOnly script failed"

**Solution**: Ensure all tests pass before publishing:
```bash
npm run clean
npm run build
npm test
```

### Issue: "Package size too large"

**Solution**: Check what's being included:
```bash
npm pack --dry-run
# Review the file list

# Update .npmignore if needed (or use package.json "files" field)
```

---

## Rollback Procedure

If you need to unpublish (within 24 hours only):

```bash
# Unpublish specific version
npm unpublish @djed/logger@0.1.0

# Or deprecate (preferred)
npm deprecate @djed/logger@0.1.0 "This version has issues, use 0.1.1"
```

**⚠️ WARNING**: Unpublishing is only allowed within 24 hours and can break dependent projects. Prefer deprecation + patch release.

---

## CI/CD Integration (Future)

For automated publishing via GitHub Actions:

**`.github/workflows/publish.yml`**:
```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Setup**:
1. Create npm access token: https://www.npmjs.com/settings/tokens
2. Add to GitHub Secrets: `Settings → Secrets → NPM_TOKEN`
3. Create release → Automatically publishes

---

## Version Management

### Semantic Versioning

- **Patch** (0.1.x): Bug fixes, no API changes
  ```bash
  npm version patch
  ```

- **Minor** (0.x.0): New features, backward compatible
  ```bash
  npm version minor
  ```

- **Major** (x.0.0): Breaking changes
  ```bash
  npm version major
  ```

### Release Workflow

1. Make changes
2. Update CHANGELOG.md
3. Run tests: `npm test`
4. Bump version: `npm version [patch|minor|major]`
5. Push: `git push && git push --tags`
6. Publish: `npm publish`
7. Create GitHub release

---

## Maintenance

### Regular Tasks

**Weekly**:
- Check for security vulnerabilities: `npm audit`
- Review open issues/PRs
- Update dependencies if needed

**Monthly**:
- Review documentation accuracy
- Check download stats: `npm view @djed/logger`
- Update CHANGELOG with maintenance notes

**Quarterly**:
- Major dependency updates
- Performance benchmarking
- Documentation improvements

---

## Support

**Issues**: https://github.com/luxor/djed/issues (when public)
**Questions**: Refer to README.md, MANUAL_TESTING_GUIDE.md
**Security**: security@luxor.com (or appropriate contact)

---

## Checklist Summary

**Pre-Publish**:
- [ ] All tests passing (35/35)
- [ ] 100% code coverage
- [ ] Bundle size verified (1.40 KB)
- [ ] Security audit clean (0 vulnerabilities)
- [ ] Documentation complete

**Git**:
- [ ] Initial commit created
- [ ] Version tagged (v0.1.0)
- [ ] Pushed to GitHub

**NPM**:
- [ ] Logged in to npm
- [ ] Published successfully
- [ ] Verified on registry
- [ ] Tested installation

**Post-Publish**:
- [ ] GitHub release created
- [ ] Documentation links updated
- [ ] Team notified
- [ ] Monitoring setup

---

**Status**: Ready to publish when you execute the commands above ✅
**Version**: 0.1.0
**Confidence**: 95%
