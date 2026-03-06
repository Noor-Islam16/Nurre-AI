#!/usr/bin/env node

const chalk = require('chalk')
const path = require('path')
const fs = require('fs')

class TestRunner {
  constructor() {
    this.suites = new Map()
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    }
    this.currentSuite = null
  }

  // Register a test suite
  suite(name, fn) {
    const suite = {
      name,
      tests: [],
      beforeAll: null,
      afterAll: null,
      beforeEach: null,
      afterEach: null
    }
    
    this.currentSuite = suite
    this.suites.set(name, suite)
    
    // Execute suite definition
    fn()
    
    this.currentSuite = null
  }

  // Register a test
  test(name, fn, options = {}) {
    if (!this.currentSuite) {
      throw new Error('test() must be called within a suite()')
    }

    this.currentSuite.tests.push({
      name,
      fn,
      timeout: options.timeout || 5000,
      skip: options.skip || false
    })
  }

  // Skip a test
  skip(name, fn) {
    this.test(name, fn, { skip: true })
  }

  // Setup hooks
  beforeAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeAll = fn
    }
  }

  afterAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterAll = fn
    }
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEach = fn
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEach = fn
    }
  }

  // Run all suites
  async runAll() {
    console.log(chalk.bold('\n🧪 Running Test Suites\n'))
    
    const startTime = Date.now()

    for (const [name, suite] of this.suites) {
      await this.runSuite(suite)
    }

    const duration = Date.now() - startTime
    this.printResults(duration)
    
    return this.results.failed === 0
  }

  // Run a single suite
  async runSuite(suite) {
    console.log(chalk.blue.bold(`\n📦 ${suite.name}`))
    
    // Run beforeAll hook
    if (suite.beforeAll) {
      try {
        await this.runWithTimeout(suite.beforeAll, 10000)
      } catch (error) {
        console.log(chalk.red(`  ❌ beforeAll failed: ${error.message}`))
        return
      }
    }

    // Run tests
    for (const test of suite.tests) {
      if (test.skip) {
        console.log(chalk.yellow(`  ⏭️  ${test.name} (skipped)`))
        this.results.skipped++
        continue
      }

      // Run beforeEach
      if (suite.beforeEach) {
        try {
          await this.runWithTimeout(suite.beforeEach, 5000)
        } catch (error) {
          console.log(chalk.red(`  ❌ beforeEach failed: ${error.message}`))
          continue
        }
      }

      // Run test
      try {
        await this.runWithTimeout(test.fn, test.timeout)
        console.log(chalk.green(`  ✅ ${test.name}`))
        this.results.passed++
      } catch (error) {
        console.log(chalk.red(`  ❌ ${test.name}`))
        console.log(chalk.red(`     ${error.message}`))
        this.results.failed++
        this.results.errors.push({
          suite: suite.name,
          test: test.name,
          error: error.message
        })
      }

      // Run afterEach
      if (suite.afterEach) {
        try {
          await this.runWithTimeout(suite.afterEach, 5000)
        } catch (error) {
          console.log(chalk.red(`  ❌ afterEach failed: ${error.message}`))
        }
      }
    }

    // Run afterAll
    if (suite.afterAll) {
      try {
        await this.runWithTimeout(suite.afterAll, 10000)
      } catch (error) {
        console.log(chalk.red(`  ❌ afterAll failed: ${error.message}`))
      }
    }
  }

  // Run function with timeout
  async runWithTimeout(fn, timeout) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), timeout)
      )
    ])
  }

  // Print results
  printResults(duration) {
    console.log(chalk.bold('\n📊 Test Results\n'))
    console.log(chalk.green(`  ✅ Passed: ${this.results.passed}`))
    console.log(chalk.red(`  ❌ Failed: ${this.results.failed}`))
    console.log(chalk.yellow(`  ⏭️  Skipped: ${this.results.skipped}`))
    console.log(chalk.gray(`  ⏱️  Duration: ${duration}ms`))
    
    if (this.results.errors.length > 0) {
      console.log(chalk.red.bold('\n❌ Failed Tests:\n'))
      this.results.errors.forEach(err => {
        console.log(chalk.red(`  ${err.suite} > ${err.test}`))
        console.log(chalk.gray(`    ${err.error}\n`))
      })
    }
  }
}

// Export singleton
module.exports = new TestRunner()