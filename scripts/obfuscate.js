const JavaScriptObfuscator = require('javascript-obfuscator')
const fs = require('fs')
const path = require('path')

const files = [
  'src/main/ipc/license.js',
  'src/main/constants.js',
  'src/main/database.js'
]

const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.2,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'mangled',
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 0.5
}

function obfuscateFile(filePath) {
  const fullPath = path.resolve(filePath)
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${filePath}`)
    return
  }
  const code = fs.readFileSync(fullPath, 'utf8')
  const backupPath = fullPath + '.bak'
  fs.writeFileSync(backupPath, code, 'utf8')
  const result = JavaScriptObfuscator.obfuscate(code, obfuscationOptions)
  fs.writeFileSync(fullPath, result.getObfuscatedCode(), 'utf8')
  console.log(`✅ Obfuscated: ${filePath}`)
}

function restoreFiles() {
  for (const filePath of files) {
    const fullPath = path.resolve(filePath)
    const backupPath = fullPath + '.bak'
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, fullPath)
      fs.unlinkSync(backupPath)
      console.log(`🔄 Restored: ${filePath}`)
    }
  }
}

const command = process.argv[2]

if (command === 'obfuscate') {
  console.log('════════════════════════════════════')
  console.log('  Obfuscating source files...')
  console.log('════════════════════════════════════')
  for (const file of files) obfuscateFile(file)
} else if (command === 'restore') {
  console.log('Restoring original files...')
  restoreFiles()
} else {
  console.log('Usage: node obfuscate.js obfuscate|restore')
}
