#!/usr/bin/env tsx
/**
 * Script to safely remove commented-out code blocks from server/routes.ts
 * 
 * This script removes large commented blocks that have been migrated to modular files.
 * It processes the file line-by-line, tracking comment state.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROUTES_FILE = path.join(process.cwd(), 'server/routes.ts');
const BACKUP_FILE = path.join(process.cwd(), 'server/routes.ts.backup');

// Patterns that indicate a commented block to remove
const COMMENT_START_PATTERNS = [
  /\/\*\s*COMMENTED OUT/i,
  /\/\*\s*MIGRATED TO/i,
  /\/\/\s*COMMENTED OUT.*lidarUpload/i,
  /\/\/\s*COMMENTED OUT.*hardwareLabelUpload/i,
];

function cleanupRoutes() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Reading server/routes.ts...`);
  const content = fs.readFileSync(ROUTES_FILE, 'utf-8');
  const lines = content.split('\n');
  
  // Create backup
  console.log(`[${timestamp}] Creating backup at server/routes.ts.backup...`);
  fs.writeFileSync(BACKUP_FILE, content, 'utf-8');
  
  const cleanedLines: string[] = [];
  let inCommentedBlock = false;
  let blockStartLine = -1;
  let removedBlocks = 0;
  let removedLines = 0;
  let consecutiveBlankLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if we're entering a commented block to remove
    if (!inCommentedBlock) {
      const isCommentStart = COMMENT_START_PATTERNS.some(pattern => pattern.test(trimmed));
      
      if (isCommentStart) {
        inCommentedBlock = true;
        blockStartLine = i + 1;
        removedBlocks++;
        const preview = trimmed.substring(0, 60);
        console.log(`[CLEANUP] Found commented block at line ${blockStartLine}: ${preview}...`);
        continue;
      }
    }
    
    // If in a commented block, look for the end
    if (inCommentedBlock) {
      // Check for end of multi-line comment
      if (trimmed.endsWith('*/')) {
        removedLines++;
        console.log(`   └─ Ended at line ${i + 1}, removed ${i - blockStartLine + 2} lines`);
        inCommentedBlock = false;
        blockStartLine = -1;
        continue;
      }
      // Still in commented block, skip this line
      removedLines++;
      continue;
    }
    
    // Not in a commented block - keep this line
    // But reduce excessive blank lines
    if (trimmed === '') {
      consecutiveBlankLines++;
      if (consecutiveBlankLines <= 2) {
        cleanedLines.push(line);
      }
    } else {
      consecutiveBlankLines = 0;
      cleanedLines.push(line);
    }
  }
  
  const cleanedContent = cleanedLines.join('\n');
  
  console.log('\n[SUMMARY] Cleanup Summary:');
  console.log(`   Original lines: ${lines.length}`);
  console.log(`   New lines: ${cleanedLines.length}`);
  console.log(`   Removed: ${removedLines} lines in ${removedBlocks} blocks`);
  console.log(`   Reduction: ${((1 - cleanedLines.length / lines.length) * 100).toFixed(1)}%`);
  
  // Write cleaned content
  console.log('\n[WRITE] Writing cleaned file...');
  fs.writeFileSync(ROUTES_FILE, cleanedContent, 'utf-8');
  
  console.log('[COMPLETE] Cleanup complete!');
  console.log('\n[NEXT] Next steps:');
  console.log('   1. Run: npx tsc --noEmit to check for TypeScript errors');
  console.log('   2. Run: grep -i "commented out" server/routes.ts to verify no markers remain');
  console.log('   3. Review the git diff to ensure only dead code was removed');
  console.log('   4. If issues arise, restore with: cp server/routes.ts.backup server/routes.tsckup server/routes.ts');
}

try {
  cleanupRoutes();
} catch (error) {
  console.error('❌ Error during cleanup:', error);
  console.log('💡 Restoring from backup...');
  if (fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(BACKUP_FILE, ROUTES_FILE);
    console.log('✅ Restored from backup');
  }
  process.exit(1);
}
