# Testing Guide

## Overview

The Redis examples test suite can run in both **interactive** and **non-interactive** modes, giving you flexibility for manual testing vs automated CI/CD.

## Running Tests

### Automated Testing (No Prompts)

```bash
# Run all tests without prompts (default)
npm test

# Or explicitly
npm run test:redis

# Watch mode (re-runs on file changes)
npm run test:watch
```

**Output:**
```
Total Tests: 10
Passed: 10
Failed: 0
Total Duration: ~1700ms
```

### Interactive Testing (Step-by-Step)

```bash
# Run the interactive CLI (press Enter at each step)
npm start
```

Use this when you want to:
- Understand what each example does
- See results step-by-step
- Learn Redis commands interactively
- Debug specific examples

## Test Modes

### Non-Interactive Mode (Automated)

**When it's used:**
- Running `npm test` (test script has interactive=false)
- Setting `NON_INTERACTIVE=true` environment variable
- CI/CD pipelines
- Automated testing scenarios

**Behavior:**
- ✅ No prompts, runs continuously
- ✅ Shows "(non-interactive mode, continuing automatically)" message
- ✅ All examples run back-to-back
- ✅ Generates `test-results.json` report

### Interactive Mode (Manual)

**When it's used:**
- Running `npm start` (default CLI behavior)
- When `process.stdin.isTTY` is true
- Manual exploration and learning

**Behavior:**
- ⏸️ Pauses at each step
- ⏸️ Shows "Press Enter to continue..." prompt
- ⏸️ Waits for user input before proceeding
- ⏸️ Good for understanding flow

## Advanced Usage

### Force Non-Interactive via Environment Variable

```bash
# Set globally for this terminal session
export NON_INTERACTIVE=true
npm start  # Will run without prompts

# Or inline for one command
NON_INTERACTIVE=true npm start
```

### Force Interactive in Test Mode

If you want to run the test script interactively (for debugging):

```typescript
// In scripts/test-redis-examples.ts, change:
const steppingLogger = new StepByStepLogger(logger, false);

// To:
const steppingLogger = new StepByStepLogger(logger, true);
```

## How It Works

The `StepByStepLogger` class has a flexible constructor:

```typescript
constructor(baseLogger: Logger, interactive?: boolean)
```

**Priority order:**
1. Constructor parameter (explicit override)
2. `NON_INTERACTIVE` environment variable
3. Default: `true` (interactive)

**Examples:**

```typescript
// Explicitly non-interactive (test scripts)
new StepByStepLogger(logger, false)

// Explicitly interactive (CLI)
new StepByStepLogger(logger, true)

// Use environment variable or default
new StepByStepLogger(logger)
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Redis Examples

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis/redis-stack:latest
        ports:
          - 6379:6379
      postgres:
        image: postgres:16-alpine
        ports:
          - 5432:5432
        env:
          POSTGRES_USER: demo
          POSTGRES_PASSWORD: demo
          POSTGRES_DB: ecommerce

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm test  # Automatically runs in non-interactive mode
```

### Other CI Systems

The test suite automatically detects non-TTY environments (CI/CD systems) and runs without prompts.

**Additional safety:**
```bash
# Explicitly set NON_INTERACTIVE for older CI systems
NON_INTERACTIVE=true npm test
```

## Test Results

### JSON Output

Every test run generates `test-results.json`:

```json
{
  "timestamp": "2026-05-11T13:53:39.273Z",
  "total": 10,
  "passed": 10,
  "failed": 0,
  "totalDuration": 1736,
  "results": [
    {
      "example": "Basics: Data Structures",
      "success": true,
      "duration": 13
    },
    ...
  ]
}
```

Use this for:
- Tracking test history
- Performance monitoring
- Automated reporting
- CI/CD metrics

### Console Output

Structured output with:
- ✅ Pass/fail status for each example
- ⏱️ Duration per example
- 📊 Summary statistics
- 🔍 Detailed error messages (if failures)

## Troubleshooting

### Tests hang waiting for input

**Problem:** Tests stop and wait for Enter key

**Solutions:**
1. Verify test script uses `new StepByStepLogger(logger, false)`
2. Set environment variable: `NON_INTERACTIVE=true npm test`
3. Check stdin isn't being redirected in unexpected ways

### Interactive mode not working

**Problem:** CLI runs without prompts when you want them

**Solutions:**
1. Don't set `NON_INTERACTIVE=true`
2. Make sure stdin is connected to TTY
3. Run `npm start` instead of `npm test`

### Environment variable not working

**Problem:** `NON_INTERACTIVE=true` has no effect

**Solutions:**
1. Check `.env` file isn't overriding it
2. Use inline syntax: `NON_INTERACTIVE=true npm test`
3. Verify dotenv is installed: `npm list dotenv`

## Example Scenarios

### Scenario 1: Learning Redis
```bash
npm start
# Choose Redis > Select example > Step through interactively
```

### Scenario 2: Quick Validation
```bash
npm test
# All examples run in ~2 seconds, see pass/fail
```

### Scenario 3: Debugging One Example
```bash
# Modify test script to run only one example
npm test
```

### Scenario 4: CI/CD Pipeline
```yaml
# GitHub Actions, GitLab CI, Jenkins, etc.
- run: npm test
# Automatically non-interactive, no configuration needed
```

### Scenario 5: Development Watch Mode
```bash
npm run test:watch
# Re-runs tests on file changes (non-interactive)
```

## Performance Notes

**Non-Interactive Mode:**
- Faster (~1700ms for all 10 examples)
- No user wait time
- Optimized for batch execution

**Interactive Mode:**
- Depends on user input speed
- Good for learning/debugging
- Allows inspection of each step

## Related Documentation

- [Automated Testing Solutions](./automated-testing-solutions.md) - Design decisions
- [Redis Examples Test Report](./redis-examples-test-report.md) - Initial test findings
- [Redis Examples Fixes](./redis-examples-fixes.md) - Bug fixes applied

## Available Scripts

```bash
npm start           # Interactive CLI
npm test            # Automated test suite (non-interactive)
npm run test:redis  # Same as npm test
npm run test:watch  # Watch mode with auto-rerun
npm run reset:redis # Clear Redis data
npm run reset       # Clear all data
```
