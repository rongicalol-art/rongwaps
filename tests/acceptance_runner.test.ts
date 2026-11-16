/**
 * Acceptance & E2E Test Suite Runner
 *
 * Imports all acceptance criteria suites across Tiers 1-4.
 * When running during progressive milestone implementation, tests for pending
 * milestones yield informative skips. When ACCEPTANCE_STRICT=true, all criteria
 * are enforced strictly.
 */

import './acceptance/documentation.test';
import './acceptance/dependencies.test';
import './acceptance/agents_spec.test';
import './acceptance/static_data.test';
import './acceptance/code_quality.test';
import './acceptance/server.test';
import './acceptance/build_runtime.test';
import './acceptance/tier1_features.test';
import './acceptance/tier2_boundaries.test';
import './acceptance/tier3_cross_feature.test';
import './acceptance/tier4_real_world.test';
