# Sprint 17.3 — Migration Classification

Generated: 2026-06-03

| Migration | Categories | In Baseline |
|-----------|------------|-------------|
| `20260531120000_foundation.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531130000_seed_first_club.sql` | SEED_DATA | ❌ |
| `20260531140000_security_hardening.sql` | RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531150000_club_name_model.sql` | CORE_SCHEMA | ✅ |
| `20260531160000_players_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531161000_players_storage.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531162000_seed_players.sql` | SEED_DATA | ❌ |
| `20260531163000_players_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531170000_trainings_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531171000_seed_trainings.sql` | SEED_DATA | ❌ |
| `20260531172000_trainings_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531180000_matches_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531181000_seed_matches.sql` | SEED_DATA | ❌ |
| `20260531182000_matches_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531183000_matches_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531190000_ai_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531191000_seed_ai.sql` | SEED_DATA | ❌ |
| `20260531192000_ai_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531200000_sponsors_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260531201000_seed_sponsors.sql` | SEED_DATA | ❌ |
| `20260531202000_sponsors_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260601100000_finance_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260601101000_seed_finance.sql` | SEED_DATA | ❌ |
| `20260601102000_finance_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260602100000_inventory_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260602101000_seed_inventory.sql` | SEED_DATA | ❌ |
| `20260602102000_inventory_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260602103000_inventory_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260602120000_league_mirror_live_source.sql` | CLUB_SPECIFIC | ❌ |
| `20260602140000_public_players_league_stats.sql` | FUNCTIONS_RPC | ✅ |
| `20260603100000_website_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260603101000_seed_website.sql` | SEED_DATA | ❌ |
| `20260603102000_website_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260603103000_public_website_v2.sql` | FUNCTIONS_RPC | ✅ |
| `20260604100000_integrations_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260604101000_seed_integrations.sql` | SEED_DATA | ❌ |
| `20260604102000_integrations_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260605100000_academy_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260605101000_seed_academy.sql` | SEED_DATA | ❌ |
| `20260605102000_academy_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260605103000_academy_audit_fixes.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260605110000_stage115_security_performance.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260605111000_website_media_system.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260605111100_seed_website_demo_media.sql` | SEED_DATA | ❌ |
| `20260605111200_website_40_copy.sql` | CLUB_SPECIFIC | ❌ |
| `20260605111300_piorun_facebook_content.sql` | CORE_SCHEMA, CLUB_SPECIFIC | ❌ |
| `20260606120000_stage116_production_hardening.sql` | RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260606140000_stage116_p2_security_completion.sql` | RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260610120000_stage12_pwa.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260615120000_stage13_ai_manager.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260615121000_seed_stage13_ai_manager.sql` | SEED_DATA | ❌ |
| `20260615130000_stage13_audit_rls_hardening.sql` | RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260615140000_stage135_performance.sql` | CORE_SCHEMA | ✅ |
| `20260615150000_stage137_performance.sql` | FUNCTIONS_RPC | ✅ |
| `20260615160000_stage1310_pwa_offline_context.sql` | FUNCTIONS_RPC | ✅ |
| `20260616120000_stage14_video_module.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260616121000_seed_stage14_video.sql` | SEED_DATA | ❌ |
| `20260616122000_stage14_audit_hardening.sql` | RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260617120000_stage15a_content_hub.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260617121000_seed_stage15a_content.sql` | SEED_DATA | ❌ |
| `20260617121500_stage15a_seed_trigger_fix.sql` | FUNCTIONS_RPC, SEED_DATA | ✅ |
| `20260617123000_stage15a_audit_hardening.sql` | RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260618120000_stage15b_league_hub.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260618121000_seed_stage15b_league.sql` | SEED_DATA | ❌ |
| `20260618123000_stage15b_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260618124000_stage15b_trigger_fix.sql` | FUNCTIONS_RPC | ✅ |
| `20260618125000_league_table_entries_cleanup.sql` | HISTORICAL_FIX | ❌ |
| `20260619120000_stage156_communication_hub.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260619121000_seed_stage156_communication.sql` | SEED_DATA | ❌ |
| `20260619123000_stage156_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260619124000_stage156_security_hardening.sql` | RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260619125000_stage156_team_ids_fix.sql` | FUNCTIONS_RPC, HISTORICAL_FIX | ❌ |
| `20260620120000_stage157_attendance_availability.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260620121000_seed_stage157_attendance.sql` | SEED_DATA | ❌ |
| `20260620123000_stage157_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260621120000_stage158_club_crm.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260621121000_seed_stage158_club_crm.sql` | SEED_DATA | ❌ |
| `20260621123000_stage158_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260621124000_stage158_treasurer_fix.sql` | FUNCTIONS_RPC | ✅ |
| `20260621125000_seed_stage158_parent_portal.sql` | SEED_DATA | ❌ |
| `20260621126000_stage158_coach_events_scope.sql` | RLS_SECURITY | ✅ |
| `20260622120000_stage159_equipment_assets.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260622121000_seed_stage159_equipment.sql` | SEED_DATA | ❌ |
| `20260622123000_stage159_audit_hardening.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260622124000_stage159_rls_fix.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260622125000_seed_stage159_player_link.sql` | SEED_DATA | ❌ |
| `20260622126000_seed_stage159_parent_guardian.sql` | SEED_DATA | ❌ |
| `20260622127000_stage159_ensure_player_guardians.sql` | CORE_SCHEMA, RLS_SECURITY, HISTORICAL_FIX | ❌ |
| `20260623120000_stage1510_injury_medical.sql` | CORE_SCHEMA, RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260623121000_seed_stage1510_injury.sql` | SEED_DATA | ❌ |
| `20260623123000_stage1510_audit_hardening.sql` | RLS_SECURITY, FUNCTIONS_RPC | ✅ |
| `20260623124000_stage1510_sync_fix.sql` | FUNCTIONS_RPC | ✅ |
| `20260623125000_stage1510_parent_guardian.sql` | FUNCTIONS_RPC | ✅ |
| `20260631120000_piorun_p1_real_content.sql` | CORE_SCHEMA, CLUB_SPECIFIC | ❌ |
| `20260631140000_piorun_media_quality_hotfix.sql` | CLUB_SPECIFIC | ❌ |
| `20260631150000_piorun_contact_mockup.sql` | CLUB_SPECIFIC | ❌ |
| `20260631160000_piorun_logo_cover_mockup.sql` | CLUB_SPECIFIC | ❌ |
| `20260631161000_piorun_social_public_read.sql` | RLS_SECURITY, CLUB_SPECIFIC | ✅ |
| `20260631170000_piorun_mockup_visual_assets.sql` | CLUB_SPECIFIC | ❌ |
| `20260631180000_piorun_logo_crest_upgrade.sql` | CLUB_SPECIFIC | ❌ |
| `20260631190000_public_website_last_result_date_fix.sql` | FUNCTIONS_RPC | ✅ |
| `20260631200000_public_players_stats_fix.sql` | FUNCTIONS_RPC | ✅ |
| `20260703120000_league_player_matching_161.sql` | CORE_SCHEMA | ✅ |
| `20260703140000_public_home_bundle_162.sql` | CORE_SCHEMA, FUNCTIONS_RPC | ✅ |
| `20260703141000_public_home_bundle_academy_fix.sql` | FUNCTIONS_RPC | ✅ |

**Total:** 105 · **Baseline sources:** 69 · **Archived:** 36