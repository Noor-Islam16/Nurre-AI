#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

const oldTests = [
  'test-store-methods-simple.js',
  'test-context-engine-simple.js',
  'test-native-tools.mjs',
  'test-tool-calls-migration.mjs'
]

console.log(chalk.yellow('\n🧹 Cleaning up old test files...\n'))

oldTests.forEach(file => {
  const filePath = path.join(__dirname, file)
  
  if (fs.existsSync(filePath)) {
    // Archive instead of deleting
    const archiveDir = path.join(__dirname, 'archived-tests')
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir)
    }
    
    const archivePath = path.join(archiveDir, file)
    fs.renameSync(filePath, archivePath)
    console.log(chalk.green(`✅ Archived: ${file}`))
  } else {
    console.log(chalk.gray(`⏭️  Skipped: ${file} (not found)`))
  }
})

console.log(chalk.green('\n✨ Cleanup complete!\n'))