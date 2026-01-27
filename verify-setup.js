#!/usr/bin/env node

/**
 * TravaBOT Setup Verification Script
 * Run this to verify the project is ready for judges
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 TravaBOT Setup Verification\n');

const checks = [
  {
    name: 'Package.json exists',
    check: () => existsSync('package.json'),
    fix: 'Ensure package.json is in the root directory'
  },
  {
    name: 'Dependencies installed',
    check: () => existsSync('node_modules'),
    fix: 'Run: npm install'
  },
  {
    name: 'Environment file exists',
    check: () => existsSync('.env'),
    fix: 'Copy .env.example to .env and configure'
  },
  {
    name: 'Vite config exists',
    check: () => existsSync('vite.config.ts'),
    fix: 'Ensure vite.config.ts is present'
  },
  {
    name: 'TypeScript config exists',
    check: () => existsSync('tsconfig.json'),
    fix: 'Ensure tsconfig.json is present'
  },
  {
    name: 'Tailwind config exists',
    check: () => existsSync('tailwind.config.ts'),
    fix: 'Ensure tailwind.config.ts is present'
  },
  {
    name: 'Source directory exists',
    check: () => existsSync('src'),
    fix: 'Ensure src/ directory exists'
  },
  {
    name: 'Main App component exists',
    check: () => existsSync('src/App.tsx'),
    fix: 'Ensure src/App.tsx exists'
  },
  {
    name: 'Index page exists',
    check: () => existsSync('src/pages/Index.tsx'),
    fix: 'Ensure src/pages/Index.tsx exists'
  },
  {
    name: 'Components directory exists',
    check: () => existsSync('src/components'),
    fix: 'Ensure src/components/ directory exists'
  }
];

let allPassed = true;

checks.forEach((check, index) => {
  const passed = check.check();
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  
  if (!passed) {
    console.log(`   Fix: ${check.fix}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Project is ready for judges.');
  console.log('\n📋 Next steps:');
  console.log('1. Run: npm run dev');
  console.log('2. Open: http://localhost:8080');
  console.log('3. Test the application features');
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above.');
}

console.log('\n📚 For detailed setup instructions, see:');
console.log('- README.md (complete guide)');
console.log('- JUDGE_SETUP.md (quick judge guide)');