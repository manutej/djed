# @djed/logger - Quick Demo (2 minutes)

**Purpose**: Fastest way to validate the package works
**Time**: 2 minutes
**Audience**: Quick validation, demos, QA

---

## One-Command Demo

```bash
cd /Users/manu/Documents/LUXOR/djed/packages/logger
npm run build && node demos/demo-complete.js
```

**Expected**: Beautiful formatted output showing all 6 features working ✅

---

## Manual Quick Tests (30 seconds each)

### Test 1: Basic Logging (L1)

```bash
node -e "const {Logger} = require('./dist/index.js'); const logger = new Logger('test'); logger.info('Hello!'); logger.error('Error test', {code: 500});"
```

**✅ Expect**: Colored console output with timestamps

---

### Test 2: JSON Format (L2)

```bash
node -e "const {Logger} = require('./dist/index.js'); const logger = new Logger('test', {format: 'json'}); logger.info('JSON test', {userId: 123});"
```

**✅ Expect**: Valid JSON output

---

### Test 3: Silent Mode (Performance)

```bash
node -e "const {Logger, measureTimeToFirstLog} = require('./dist/index.js'); console.log('Time to first log:', measureTimeToFirstLog(), 'ms (should be < 30000ms)');"
```

**✅ Expect**: Time < 30,000ms (usually ~0-1ms)

---

### Test 4: All Tests Pass

```bash
npm test 2>&1 | grep "Tests.*passed"
```

**✅ Expect**: `Tests  35 passed (35)`

---

### Test 5: Bundle Size

```bash
ls -lh dist/index.js && gzip -c dist/index.js | wc -c | awk '{printf "Gzipped: %.2f KB (target < 5 KB)\n", $1/1024}'
```

**✅ Expect**: ~1.40 KB (72% under budget)

---

### Test 6: Validation Script

```bash
./scripts/validate.sh
```

**✅ Expect**: All checks pass with "Ready for Phase 1 delivery! 🚀"

---

## Human Validation Checklist

Quick yes/no checks for humans:

**Functionality**:
- [ ] Logs appear in console
- [ ] JSON format works
- [ ] Metadata is logged correctly
- [ ] Error objects serialize (not `{}`)
- [ ] Silent mode suppresses output

**Performance**:
- [ ] Time to first log < 1 second
- [ ] Bundle size shows ~1.4 KB
- [ ] All 35 tests pass in < 1 second

**Quality**:
- [ ] No console errors
- [ ] No security vulnerabilities
- [ ] 100% code coverage
- [ ] Validation script passes

**Documentation**:
- [ ] README examples work
- [ ] Demo script runs successfully
- [ ] All claims are verifiable

---

## Troubleshooting Quick Fixes

**"Cannot find module"**: Run `npm run build`

**"Permission denied"**: Run `chmod +x scripts/validate.sh`

**"Winston not found"**: Run `npm install`

**Tests fail**: Run `npm run clean && npm install && npm run build && npm test`

---

## Demo for Non-Technical Stakeholders

**Show**: Run `node demos/demo-complete.js`

**Say**:
1. "Watch - zero configuration, instant logging" (L1 section)
2. "Customizable - JSON format for production" (L2 section)
3. "Fast - under 1 millisecond to start" (Performance section)
4. "Safe - can switch to plain Winston anytime" (Ejection section)
5. "Tiny - only 1.4 KB, 72% under budget" (Bundle section)
6. "Real-world ready - structured with correlation IDs" (Usage section)

**Result**: Clear visual proof all features work

---

## Success in 2 Minutes

```bash
# Build
npm run build

# Demo all features
node demos/demo-complete.js

# Verify tests
npm test 2>&1 | tail -2

# Validate
./scripts/validate.sh
```

**If all pass: Package is production-ready** ✅

---

*Quick Demo v1.0 - 2 minutes to validation*
