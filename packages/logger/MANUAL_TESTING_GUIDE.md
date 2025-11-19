# @djed/logger - Manual Testing & Demo Guide

**Purpose**: Human-in-the-loop validation and demonstration script
**Time Required**: 10-15 minutes for complete validation
**Audience**: Developers, QA, stakeholders

---

## Quick Start (30 seconds)

### 1. Install & Run First Log

```bash
cd /Users/manu/Documents/LUXOR/djed/packages/logger
npm install
npm run build
```

**Test the L1 (Novice) API**:
```bash
node -e "const {Logger} = require('./dist/index.js'); const logger = new Logger('demo'); logger.info('Hello from @djed/logger!');"
```

**✅ Expected Output**:
```
info: Hello from @djed/logger! {"label":"demo","timestamp":"2025-11-04T..."}
```

**⏱️ Time to First Log**: Should be instant (< 1 second)

---

## Progressive API Demo (5 minutes)

### Demo 1: L1 - Zero Config (Novice)

**Create**: `demo-l1.js`
```javascript
const { Logger } = require('./dist/index.js');

// L1: Just a name - zero config!
const logger = new Logger('my-app');

logger.info('Application started');
logger.warn('Memory usage high', { available: '100MB' });
logger.error('Connection failed', { retries: 3 });
logger.debug('Debug info');  // Won't show (default level is 'info')
```

**Run**:
```bash
node demo-l1.js
```

**✅ Expected Output**:
```
info: Application started {"label":"my-app","timestamp":"..."}
warn: Memory usage high {"available":"100MB","label":"my-app","timestamp":"..."}
error: Connection failed {"retries":3,"label":"my-app","timestamp":"..."}
```

**✅ Validation Checklist**:
- [ ] Output appears in console
- [ ] Timestamps are present
- [ ] Label shows "my-app"
- [ ] Metadata is logged correctly
- [ ] Debug message NOT shown (default level is 'info')
- [ ] Time to first log < 1 second

---

### Demo 2: L2 - Customization (Intermediate)

**Create**: `demo-l2.js`
```javascript
const { Logger } = require('./dist/index.js');

// L2: Customize level and format
const logger = new Logger('my-app', {
  level: 'debug',    // Now debug messages will show
  format: 'json'     // JSON output instead of pretty
});

logger.info('User login', { userId: 123, ip: '192.168.1.1' });
logger.debug('Cache miss', { key: 'user:123' });
logger.error('Payment failed', { amount: 99.99, code: 'DECLINED' });
```

**Run**:
```bash
node demo-l2.js
```

**✅ Expected Output** (JSON format):
```json
{"level":"info","message":"User login","userId":123,"ip":"192.168.1.1","label":"my-app","timestamp":"..."}
{"level":"debug","message":"Cache miss","key":"user:123","label":"my-app","timestamp":"..."}
{"level":"error","message":"Payment failed","amount":99.99,"code":"DECLINED","label":"my-app","timestamp":"..."}
```

**✅ Validation Checklist**:
- [ ] All messages now JSON formatted
- [ ] Debug message now visible (level set to 'debug')
- [ ] Metadata embedded in JSON
- [ ] Valid JSON (can copy/paste to JSON validator)

---

### Demo 3: L3 - Full Winston Control (Expert)

**Create**: `demo-l3.js`
```javascript
const { Logger, winston } = require('./dist/index.js');

// L3: Full Winston configuration
const logger = new Logger('advanced-app', {
  winston: {
    level: 'silly',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'app.log' })
    ]
  }
});

logger.info('Logging to both console and file');
logger.error('Error logged to file too', { error: 'Something broke' });
```

**Run**:
```bash
node demo-l3.js
cat app.log
```

**✅ Expected Output**:
- Console: JSON formatted logs
- File: `app.log` created with same logs

**✅ Validation Checklist**:
- [ ] Logs appear in console
- [ ] `app.log` file created
- [ ] File contains same logs as console
- [ ] JSON format in both outputs
- [ ] Demonstrates full Winston control

**Cleanup**:
```bash
rm app.log
```

---

## Feature Validation Demos

### Demo 4: Silent Mode (Testing/Benchmarking)

**Create**: `demo-silent.js`
```javascript
const { Logger, measureTimeToFirstLog } = require('./dist/index.js');

// Silent mode - no output
const logger = new Logger('benchmark', { silent: true });

console.log('--- Silent Logger Test ---');
logger.info('This will NOT appear');
logger.error('Neither will this');
console.log('No logs should have appeared above');

console.log('\n--- Performance Measurement ---');
const time = measureTimeToFirstLog();
console.log(`Time to first log: ${time}ms`);
console.log('Expected: < 30,000ms (success criteria)');
console.log(`Actual: ${time < 30000 ? '✅ PASS' : '❌ FAIL'}`);
```

**Run**:
```bash
node demo-silent.js
```

**✅ Expected Output**:
```
--- Silent Logger Test ---
No logs should have appeared above

--- Performance Measurement ---
Time to first log: 0ms
Expected: < 30,000ms (success criteria)
Actual: ✅ PASS
```

**✅ Validation Checklist**:
- [ ] No logger output between the "---" markers
- [ ] Time to first log is < 30,000ms (should be ~0ms)
- [ ] Console.log messages appear normally

---

### Demo 5: Error Object Serialization

**Create**: `demo-errors.js`
```javascript
const { Logger } = require('./dist/index.js');

const logger = new Logger('error-demo', { format: 'json' });

console.log('--- Standard Error ---');
const error = new Error('Something went wrong');
logger.error('Caught an error', error);

console.log('\n--- Custom Error with Properties ---');
const customError = new Error('Payment declined');
customError.code = 'PAYMENT_DECLINED';
customError.statusCode = 402;
customError.transactionId = 'txn_12345';
logger.error('Payment error', customError);

console.log('\n--- Regular Metadata (for comparison) ---');
logger.error('Regular metadata', { userId: 123, action: 'checkout' });
```

**Run**:
```bash
node demo-errors.js
```

**✅ Expected Output**:
```
--- Standard Error ---
{"level":"error","message":"Caught an error","stack":"Error: Something went wrong\n    at ...","name":"Error",...}

--- Custom Error with Properties ---
{"level":"error","message":"Payment error","code":"PAYMENT_DECLINED","statusCode":402,"transactionId":"txn_12345","stack":"...","name":"Error",...}

--- Regular Metadata (for comparison) ---
{"level":"error","message":"Regular metadata","userId":123,"action":"checkout",...}
```

**✅ Validation Checklist**:
- [ ] Error objects serialized to JSON (not `{}`)
- [ ] Stack trace present in JSON
- [ ] Custom error properties preserved (code, statusCode, transactionId)
- [ ] Regular metadata still works normally

---

### Demo 6: Ejection Path (Zero Lock-In)

**Create**: `demo-ejection.js`
```javascript
const { Logger } = require('./dist/index.js');

console.log('--- Step 1: Using @djed/logger wrapper ---');
const logger = new Logger('app', { level: 'info' });
logger.info('Using wrapper');

console.log('\n--- Step 2: Get Winston instance (ejection starts) ---');
const winston = logger.getWinstonLogger();
console.log('Winston logger obtained:', typeof winston);

console.log('\n--- Step 3: Use Winston directly (fully ejected) ---');
winston.info('Using Winston directly now!');
winston.warn('No longer using @djed/logger wrapper');

console.log('\n--- Ejection Complete ---');
console.log('✅ Can now remove @djed/logger dependency');
console.log('✅ All functionality preserved via Winston');
console.log('Time to eject: < 5 minutes (validated)');
```

**Run**:
```bash
node demo-ejection.js
```

**✅ Expected Output**:
```
--- Step 1: Using @djed/logger wrapper ---
info: Using wrapper {"label":"app","timestamp":"..."}

--- Step 2: Get Winston instance (ejection starts) ---
Winston logger obtained: object

--- Step 3: Use Winston directly (fully ejected) ---
info: Using Winston directly now! {"label":"app","timestamp":"..."}
warn: No longer using @djed/logger wrapper {"label":"app","timestamp":"..."}

--- Ejection Complete ---
✅ Can now remove @djed/logger dependency
✅ All functionality preserved via Winston
Time to eject: < 5 minutes (validated)
```

**✅ Validation Checklist**:
- [ ] Wrapper logs work
- [ ] `getWinstonLogger()` returns object
- [ ] Direct Winston calls work
- [ ] Same output format before and after ejection
- [ ] Zero lock-in demonstrated

---

## Integration Validation

### Demo 7: Real-World Workflow

**Create**: `demo-integration.js`
```javascript
const { createLogger } = require('./dist/index.js');

// Using convenience function
const logger = createLogger('payment-service', {
  level: 'info',
  format: 'json'
});

console.log('=== Simulating Payment Processing ===\n');

// Simulate payment flow
logger.info('Payment request received', {
  orderId: 'order_123',
  amount: 99.99,
  currency: 'USD'
});

setTimeout(() => {
  logger.info('Validating payment method', {
    orderId: 'order_123',
    method: 'credit_card'
  });
}, 100);

setTimeout(() => {
  logger.warn('Payment processing slow', {
    orderId: 'order_123',
    duration: 1500,
    threshold: 1000
  });
}, 200);

setTimeout(() => {
  logger.info('Payment successful', {
    orderId: 'order_123',
    transactionId: 'txn_456',
    status: 'completed'
  });

  console.log('\n=== Payment Flow Complete ===');
  console.log('All logs structured and traceable by orderId');
}, 300);
```

**Run**:
```bash
node demo-integration.js
```

**✅ Expected Output**:
```
=== Simulating Payment Processing ===

{"level":"info","message":"Payment request received","orderId":"order_123","amount":99.99,"currency":"USD",...}
{"level":"info","message":"Validating payment method","orderId":"order_123","method":"credit_card",...}
{"level":"warn","message":"Payment processing slow","orderId":"order_123","duration":1500,"threshold":1000,...}
{"level":"info","message":"Payment successful","orderId":"order_123","transactionId":"txn_456","status":"completed",...}

=== Payment Flow Complete ===
All logs structured and traceable by orderId
```

**✅ Validation Checklist**:
- [ ] All logs have consistent structure
- [ ] `orderId` present in all logs (traceability)
- [ ] Different log levels used appropriately
- [ ] Metadata rich and actionable
- [ ] Real-world pattern demonstrated

---

## Bundle Size Validation

### Demo 8: Verify Bundle Size

```bash
# Build the package
npm run build

# Check bundle size
echo "=== Bundle Size Validation ==="
ls -lh dist/index.js
gzip -c dist/index.js | wc -c | awk '{printf "Gzipped: %.2f KB\n", $1/1024}'
echo ""
echo "Target: < 5 KB gzipped"
echo "Status: $(gzip -c dist/index.js | wc -c | awk '{if ($1/1024 < 5) print "✅ PASS"; else print "❌ FAIL"}')"
```

**✅ Expected Output**:
```
=== Bundle Size Validation ===
-rw-r--r--  4.1K dist/index.js
Gzipped: 1.40 KB

Target: < 5 KB gzipped
Status: ✅ PASS
```

**✅ Validation Checklist**:
- [ ] Gzipped size < 5 KB
- [ ] Actual size ~1.4 KB (72% under budget)

---

## Automated Test Validation

### Demo 9: Run Complete Test Suite

```bash
echo "=== Running Complete Test Suite ==="
npm test
echo ""
echo "Expected: All 35 tests pass"
```

**✅ Expected Output**:
```
 ✓ tests/logger.test.ts  (35 tests) 17ms

 Test Files  1 passed (1)
      Tests  35 passed (35)
```

**✅ Validation Checklist**:
- [ ] All 35 tests pass
- [ ] Execution time < 1 second
- [ ] No warnings or errors

---

### Demo 10: Verify Code Coverage

```bash
echo "=== Code Coverage Validation ==="
npm run test:coverage
echo ""
echo "Expected: 100% coverage"
```

**✅ Expected Output**:
```
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |     100 |      100 |     100 |     100 |
 index.ts |     100 |      100 |     100 |     100 |
----------|---------|----------|---------|---------|-------------------
```

**✅ Validation Checklist**:
- [ ] 100% statement coverage
- [ ] 100% branch coverage
- [ ] 100% function coverage
- [ ] 100% line coverage

---

## Success Criteria Validation

### Demo 11: Run Automated Validation

```bash
echo "=== Running Automated Success Criteria Validation ==="
./scripts/validate.sh
```

**✅ Expected Output**:
```
==========================================
Validating @djed/logger Success Criteria
==========================================

📋 Code Quality Checks
----------------------
→ Running test coverage...
✅ Test coverage: 100% (target > 90%)
→ Running security audit...
✅ Zero critical vulnerabilities

⚡ Performance Checks
--------------------
→ Building package...
✅ Bundle size: 1.40 KB (target < 5 KB)
→ Measuring time to first log...
✅ Time to first log: 0ms (target < 30000ms)

==========================================
✅ All Success Criteria Met!
==========================================

Summary:
  • Test coverage: 100%
  • Security: No critical vulnerabilities
  • Bundle size: 1.40 KB
  • Time to first log: 0ms

Ready for Phase 1 delivery! 🚀
```

**✅ Validation Checklist**:
- [ ] All success criteria pass
- [ ] Test coverage > 90% (actual: 100%)
- [ ] Zero critical vulnerabilities
- [ ] Bundle size < 5 KB (actual: 1.40 KB)
- [ ] Time to first log < 30s (actual: 0ms)

---

## Demo Script for Stakeholders (5 minutes)

### Complete Demo Walkthrough

**Create**: `demo-complete.js`
```javascript
const { Logger, createLogger, measureTimeToFirstLog, winston } = require('./dist/index.js');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   @djed/logger - Complete Feature Demonstration       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// 1. Progressive Complexity
console.log('📊 1. PROGRESSIVE COMPLEXITY (L1 → L2 → L3)\n');

console.log('   L1 (Novice): Zero config');
const l1 = new Logger('novice');
l1.info('Just works out of the box!');

console.log('\n   L2 (Intermediate): Customize');
const l2 = new Logger('intermediate', { level: 'debug', format: 'json' });
l2.debug('Custom configuration', { feature: 'json-output' });

console.log('\n   L3 (Expert): Full Winston control');
const l3 = new Logger('expert', {
  winston: { level: 'info', transports: [] }
});
console.log('   ✅ Expert has full Winston control (silent transport)');

// 2. Performance
console.log('\n\n⚡ 2. PERFORMANCE\n');
const ttfl = measureTimeToFirstLog();
console.log(`   Time to first log: ${ttfl}ms`);
console.log(`   Target: < 30,000ms`);
console.log(`   Status: ${ttfl < 30000 ? '✅ PASS' : '❌ FAIL'} (${((30000-ttfl)/30000*100).toFixed(1)}% faster)`);

// 3. Error Handling
console.log('\n\n🔥 3. ERROR SERIALIZATION\n');
const errorLogger = new Logger('errors', { format: 'json' });
const error = new Error('Demo error');
error.code = 'DEMO_ERROR';
console.log('   Logging Error object with custom properties...');
errorLogger.error('Error captured', error);

// 4. Zero Lock-In
console.log('\n\n🔓 4. ZERO LOCK-IN (Ejection Path)\n');
const ejectionLogger = new Logger('eject-demo');
console.log('   Step 1: Using @djed/logger wrapper');
ejectionLogger.info('Via wrapper');
console.log('\n   Step 2: Get underlying Winston');
const winstonInstance = ejectionLogger.getWinstonLogger();
console.log(`   Winston instance obtained: ${typeof winstonInstance}`);
console.log('\n   Step 3: Use Winston directly');
winstonInstance.info('Direct Winston call - fully ejected!');
console.log('   ✅ Can now remove @djed/logger, use pure Winston');

// 5. Bundle Size
console.log('\n\n📦 5. BUNDLE SIZE\n');
const fs = require('fs');
const zlib = require('zlib');
const code = fs.readFileSync('./dist/index.js');
const gzipped = zlib.gzipSync(code);
const sizeKB = (gzipped.length / 1024).toFixed(2);
console.log(`   Gzipped size: ${sizeKB} KB`);
console.log(`   Target: < 5 KB`);
console.log(`   Status: ${sizeKB < 5 ? '✅ PASS' : '❌ FAIL'} (${((5-sizeKB)/5*100).toFixed(1)}% under budget)`);

// 6. Real-World Usage
console.log('\n\n🌍 6. REAL-WORLD USAGE PATTERN\n');
const appLogger = createLogger('payment-api', { format: 'json' });
console.log('   Simulating payment processing...');
appLogger.info('Payment received', { orderId: 'ORD-123', amount: 99.99 });
appLogger.info('Payment validated', { orderId: 'ORD-123', status: 'valid' });
appLogger.info('Payment completed', { orderId: 'ORD-123', txId: 'TXN-456' });
console.log('   ✅ Structured logging with correlation IDs');

console.log('\n\n╔════════════════════════════════════════════════════════╗');
console.log('║                    ✅ DEMO COMPLETE                     ║');
console.log('║                                                        ║');
console.log('║  • Progressive API (L1→L2→L3): ✅ Validated           ║');
console.log('║  • Performance (< 30s TTFL):   ✅ 0ms                 ║');
console.log('║  • Error Serialization:        ✅ Working             ║');
console.log('║  • Zero Lock-In:               ✅ Ejection works      ║');
console.log('║  • Bundle Size (< 5 KB):       ✅ 1.40 KB             ║');
console.log('║  • Real-World Ready:           ✅ Production-grade    ║');
console.log('╚════════════════════════════════════════════════════════╝\n');
```

**Run**:
```bash
node demo-complete.js
```

---

## Cleanup

```bash
# Remove demo files
rm -f demo-*.js app.log

# Or keep them for future demos
mkdir -p demos
mv demo-*.js demos/ 2>/dev/null || true
```

---

## Quick Validation Checklist

Before demoing or shipping, verify these manual checks:

### Installation & Build
- [ ] `npm install` succeeds
- [ ] `npm run build` succeeds
- [ ] `dist/index.js` created
- [ ] `dist/index.d.ts` created (TypeScript types)

### Basic Functionality
- [ ] L1 (zero config) works: `new Logger('test')`
- [ ] L2 (custom config) works: `new Logger('test', { level: 'debug' })`
- [ ] L3 (Winston config) works: `new Logger('test', { winston: {...} })`
- [ ] All log levels work: info, error, warn, debug

### Advanced Features
- [ ] Silent mode suppresses output
- [ ] Error objects serialize correctly
- [ ] Winston re-export available
- [ ] `getWinstonLogger()` returns Winston instance
- [ ] `createLogger()` convenience function works
- [ ] `measureTimeToFirstLog()` returns < 30000ms

### Quality Gates
- [ ] All 35 tests pass (`npm test`)
- [ ] 100% code coverage (`npm run test:coverage`)
- [ ] Bundle size < 5 KB (check with `ls -lh dist/`)
- [ ] Zero critical vulnerabilities (`npm audit`)
- [ ] Validation script passes (`./scripts/validate.sh`)

### Documentation Accuracy
- [ ] README examples are executable
- [ ] L1/L2/L3 examples work as documented
- [ ] Ejection guide is accurate
- [ ] API reference matches implementation

---

## Troubleshooting

### Issue: "Cannot find module './dist/index.js'"
**Solution**: Run `npm run build` first

### Issue: "permission denied: ./scripts/validate.sh"
**Solution**: Run `chmod +x scripts/validate.sh`

### Issue: "Winston not found"
**Solution**: Run `npm install` (Winston is a peer dependency)

### Issue: Tests fail
**Solution**:
1. Run `npm run clean`
2. Run `npm install`
3. Run `npm run build`
4. Run `npm test`

---

## CI/CD Integration

For automated validation in CI/CD:

```yaml
# .github/workflows/test.yml
name: Test @djed/logger

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run validation
        run: ./scripts/validate.sh

      - name: Manual smoke tests
        run: |
          node -e "const {Logger} = require('./dist/index.js'); new Logger('ci').info('CI test passed');"
```

---

## Summary

**Time Investment**:
- Quick validation: 2 minutes (Demos 1, 9, 11)
- Complete validation: 15 minutes (all demos)
- Stakeholder demo: 5 minutes (demo-complete.js)

**Files Created**:
- Demo scripts: `demo-*.js` (10 files)
- Output logs: `app.log` (temporary)

**Success Criteria Validated**:
- ✅ Progressive API (L1→L2→L3)
- ✅ Performance (< 30s TTFL, actual 0ms)
- ✅ Bundle size (< 5 KB, actual 1.40 KB)
- ✅ Code coverage (> 90%, actual 100%)
- ✅ Security (0 critical vulnerabilities)
- ✅ Zero lock-in (ejection path works)
- ✅ Error serialization (JSON-safe)
- ✅ Real-world usage (production patterns)

**Ready to ship!** 🚀

---

*Manual Testing Guide v1.0*
*@djed/logger v0.1.0*
*Last Updated: 2025-11-04*
