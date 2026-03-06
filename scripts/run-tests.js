#!/usr/bin/env node

const chalk = require('chalk')
const path = require('path')
const fs = require('fs')

async function runAllTests() {
  console.log(chalk.bold.blue('\n🚀 NureeAI Test Suite\n'))
  
  const testFiles = [
    './tests/test-stores.js',
    './tests/test-ai-features.js'
  ]

  let allPassed = true

  for (const file of testFiles) {
    const filePath = path.join(__dirname, file)
    
    if (!fs.existsSync(filePath)) {
      console.log(chalk.yellow(`⚠️  Skipping ${file} (not found)`))
      continue
    }

    console.log(chalk.cyan(`\n📄 Running ${file}...\n`))
    
    try {
      // Clear require cache for fresh test run
      delete require.cache[require.resolve(filePath)]
      
      // Run test file
      require(filePath)
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Error running ${file}:`))
      console.error(chalk.red(error.message))
      allPassed = false
    }
  }

  return allPassed
}

// Parse command line arguments
const args = process.argv.slice(2)
const specificTest = args[0]

if (specificTest) {
  // Run specific test
  console.log(chalk.cyan(`Running specific test: ${specificTest}`))
  require(`./tests/${specificTest}`)
} else {
  // Run all tests
  runAllTests().then(success => {
    if (success) {
      console.log(chalk.green.bold('\n✅ All tests passed!\n'))
      process.exit(0)
    } else {
      console.log(chalk.red.bold('\n❌ Some tests failed!\n'))
      process.exit(1)
    }
  }).catch(error => {
    console.error(chalk.red('Test runner error:'), error)
    process.exit(1)
  })
}