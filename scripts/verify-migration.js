"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config({ path: '.env.local' });
async function verifyMigration() {
    // Check for required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing required environment variables');
        console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
        process.exit(1);
    }
    const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('🔍 Verifying Onboarding Migration...\n');
    // Count users by migration status
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, adhd_persona, adhd_presentation, inatt_severity, hyper_severity, onboarding_version, onboarding_completed')
        .not('adhd_persona', 'is', null);
    if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        return;
    }
    const typedUsers = users;
    // Categorize users
    const migrated = typedUsers.filter(u => u.onboarding_version === 1 && u.adhd_presentation !== null);
    const unmigrated = typedUsers.filter(u => !u.onboarding_version && u.adhd_persona);
    const newSystemUsers = typedUsers.filter(u => u.onboarding_version === 2);
    console.log('📊 User Migration Statistics:');
    console.log('─'.repeat(40));
    console.log(`Total users with persona: ${typedUsers.length}`);
    console.log(`✅ Successfully migrated (v1): ${migrated.length}`);
    console.log(`⏳ Not yet migrated: ${unmigrated.length}`);
    console.log(`🆕 New system users (v2): ${newSystemUsers.length}`);
    // Check for any inconsistencies
    const inconsistent = typedUsers.filter(u => u.adhd_persona && !u.adhd_presentation && u.onboarding_version === 1);
    if (inconsistent.length > 0) {
        console.warn(`\n⚠️  Found ${inconsistent.length} users with inconsistent migration state:`);
        inconsistent.forEach(u => {
            console.warn(`   - User ${u.email}: has persona="${u.adhd_persona}" but no presentation`);
        });
    }
    // Verify persona to presentation mapping
    if (migrated.length > 0) {
        console.log('\n📋 Persona to Presentation Mapping:');
        console.log('─'.repeat(40));
        const mappingStats = {};
        migrated.forEach(u => {
            if (u.adhd_persona && u.adhd_presentation) {
                if (!mappingStats[u.adhd_persona]) {
                    mappingStats[u.adhd_persona] = {};
                }
                if (!mappingStats[u.adhd_persona][u.adhd_presentation]) {
                    mappingStats[u.adhd_persona][u.adhd_presentation] = 0;
                }
                mappingStats[u.adhd_persona][u.adhd_presentation]++;
            }
        });
        Object.entries(mappingStats).forEach(([persona, presentations]) => {
            console.log(`${persona}:`);
            Object.entries(presentations).forEach(([presentation, count]) => {
                console.log(`  → ${presentation}: ${count} users`);
            });
        });
    }
    // Verify results table
    const { data: results, error: resultsError, count } = await supabase
        .from('onboarding_results')
        .select('user_id, assessment_version, adhd_presentation, inatt_endorsed, hyper_endorsed, total_endorsed', { count: 'exact' })
        .eq('assessment_version', 1);
    if (resultsError) {
        console.error('❌ Error fetching results:', resultsError);
    }
    else {
        console.log('\n📊 Onboarding Results Statistics:');
        console.log('─'.repeat(40));
        console.log(`Placeholder results created (v1): ${count}`);
        if (results && results.length > 0) {
            const typedResults = results;
            // Check if results match user migrations
            const userIds = new Set(migrated.map(u => u.id));
            const resultUserIds = new Set(typedResults.map(r => r.user_id));
            const missingResults = [...userIds].filter(id => !resultUserIds.has(id));
            const extraResults = [...resultUserIds].filter(id => !userIds.has(id));
            if (missingResults.length > 0) {
                console.warn(`⚠️  ${missingResults.length} migrated users missing results`);
            }
            if (extraResults.length > 0) {
                console.warn(`⚠️  ${extraResults.length} results without corresponding migrated users`);
            }
            // Verify threshold values (20-question version)
            const invalidThresholds = typedResults.filter(r => r.inatt_endorsed > 6 ||
                r.hyper_endorsed > 6 ||
                r.total_endorsed > 12);
            if (invalidThresholds.length > 0) {
                console.warn(`⚠️  ${invalidThresholds.length} results have invalid threshold values (should be max 6/6/12 for 20Q version)`);
            }
        }
    }
    // Check migration events
    const { data: events, count: eventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'onboarding_migration_v1_to_v2');
    console.log(`\n📝 Migration Events: ${eventCount || 0}`);
    // Summary
    console.log('\n✨ Migration Verification Complete');
    console.log('─'.repeat(40));
    if (unmigrated.length === 0 && inconsistent.length === 0) {
        console.log('✅ All users successfully migrated!');
    }
    else {
        if (unmigrated.length > 0) {
            console.log(`⏳ ${unmigrated.length} users still need migration`);
            console.log('   Run the migration script: 20250111_migrate_existing_users.sql');
        }
        if (inconsistent.length > 0) {
            console.log(`⚠️  ${inconsistent.length} users have inconsistent state`);
            console.log('   Consider running rollback and re-migration');
        }
    }
}
// Run verification
verifyMigration().catch(console.error);
