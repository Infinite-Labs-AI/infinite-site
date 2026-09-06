# Optional Website Sign-In Shortcuts

The get-started page now verifies email/Google identity through /infinite/auth/site/verify,
then starts the existing download. An optional Open Infinite button can use the returned one-use
launch URL; it is held only in page memory, not persisted. The instructions also support Applications
and normal desktop sign-in with the same account. Neither launch-button use nor email redemption
is required for signup, download or funnel progress.

Deploy the cloud /api/auth/site/verify endpoint before publishing this site change. That endpoint
retains attribution records and conversion deduplication. A backup launch/sign-in link is still
emailed, as clarified by the founder; the optional button uses the same ticket, without persisting it.
Redemption is optional and does not gate funnel progress. The old rewrite remains for cached gate pages.

Checks: node --test tests/no-login-handoff.test.mjs; node scripts/prepare-static-deploy.cjs;
node scripts/verify-site-audit.mjs. Email-code and Google-return browser fixtures reached download;
the built mobile page had no broken images or horizontal overflow.
