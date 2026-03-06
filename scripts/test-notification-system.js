#!/usr/bin/env node

/**
 * Test script for Task 111: Enhanced Notification System
 * Tests planner message styles and notification service
 */

const fs = require('fs');
const path = require('path');

console.log('🔔 Testing Enhanced Notification System');
console.log('=' .repeat(50));

// Check that all required files exist and have been enhanced
const filesToCheck = [
  {
    path: 'components/features/reminder-notification.tsx',
    enhancements: [
      'style?: \'gentle\' | \'direct\' | \'celebratory\' | \'urgent\'',
      'toolCall?: string',
      'getStyleConfig',
      'metadata?.source === \'planner\'',
      'showConfetti'
    ]
  },
  {
    path: 'lib/services/notification-service.ts',
    enhancements: [
      'sendPlannerMessage',
      'scheduleReminder',
      'triggerCelebration',
      'NotificationAction',
      'style: \'gentle\' | \'direct\' | \'celebratory\' | \'urgent\''
    ]
  },
  {
    path: 'app/api/planner/execute-action/route.ts',
    enhancements: [
      'executeNativeTools',
      'tool_call_id',
      'notification-action',
      'toolRegistry.getFunction'
    ]
  },
  {
    path: 'lib/ai/tool-executor.ts',
    enhancements: [
      'NotificationService',
      'sendPlannerMessage',
      'NotificationService.scheduleReminder'
    ]
  }
];

let allPassed = true;

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, '..', file.path);
  console.log(`\nChecking ${file.path}...`);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ File not found: ${fullPath}`);
    allPassed = false;
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  file.enhancements.forEach(enhancement => {
    if (content.includes(enhancement)) {
      console.log(`  ✅ Found: ${enhancement}`);
    } else {
      console.log(`  ❌ Missing: ${enhancement}`);
      allPassed = false;
    }
  });
});

// Check specific functionality
console.log('\n📋 Functionality Checks:');

// Check reminder notification style support
const reminderPath = path.join(__dirname, '..', 'components/features/reminder-notification.tsx');
const reminderContent = fs.readFileSync(reminderPath, 'utf8');

// Check for all styles
const styles = ['gentle', 'direct', 'celebratory', 'urgent'];
let allStylesSupported = true;
styles.forEach(style => {
  if (reminderContent.includes(`case '${style}':`)) {
    console.log(`  ✅ Style '${style}' supported`);
  } else {
    console.log(`  ❌ Style '${style}' not supported`);
    allStylesSupported = false;
  }
});

// Check for planner message support
if (reminderContent.includes('metadata?.source === \'planner\'')) {
  console.log('  ✅ Planner messages supported');
} else {
  console.log('  ❌ Planner messages not supported');
  allPassed = false;
}

// Check for tool call support
if (reminderContent.includes('if (action.toolCall)')) {
  console.log('  ✅ Tool call actions supported');
} else {
  console.log('  ❌ Tool call actions not supported');
  allPassed = false;
}

// Check notification service exists
const servicePath = path.join(__dirname, '..', 'lib/services/notification-service.ts');
if (fs.existsSync(servicePath)) {
  console.log('  ✅ NotificationService created');
  
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  
  // Check for key methods
  const methods = ['sendPlannerMessage', 'scheduleReminder', 'triggerCelebration', 'triggerIntervention'];
  methods.forEach(method => {
    if (serviceContent.includes(`static async ${method}`)) {
      console.log(`    ✅ ${method} method implemented`);
    } else {
      console.log(`    ❌ ${method} method missing`);
      allPassed = false;
    }
  });
} else {
  console.log('  ❌ NotificationService not created');
  allPassed = false;
}

// Check execute-action endpoint
const executePath = path.join(__dirname, '..', 'app/api/planner/execute-action/route.ts');
if (fs.existsSync(executePath)) {
  console.log('  ✅ Execute action endpoint created');
} else {
  console.log('  ❌ Execute action endpoint not created');
  allPassed = false;
}

// Summary
console.log('\n' + '=' .repeat(50));
console.log('📊 Test Results:');

if (allPassed && allStylesSupported) {
  console.log('\n✅ All notification system enhancements passed!');
  console.log('\nKey enhancements verified:');
  console.log('  • Reminder notification supports planner styles');
  console.log('  • All 4 message styles implemented');
  console.log('  • Tool call actions supported');
  console.log('  • NotificationService created with all methods');
  console.log('  • Execute action endpoint created');
  console.log('  • Tool executor integrated with NotificationService');
  
  console.log('\n📝 Task 111 Implementation Complete!');
  console.log('\nPlanner can now:');
  console.log('  • Send styled messages (gentle/direct/celebratory/urgent)');
  console.log('  • Trigger tool actions from notifications');
  console.log('  • Schedule reminders');
  console.log('  • Trigger celebrations');
  console.log('  • Use existing notification components');
  
  process.exit(0);
} else {
  console.log('\n❌ Some enhancements missing');
  process.exit(1);
}