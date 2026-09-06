# Website Login Handoff Retirement

The get-started page now verifies email/Google identity through /infinite/auth/site/verify,
then starts the existing download. It no longer stores a login ticket or offers an Open Infinite
deep-link button. The instructions use Applications and normal desktop sign-in with the same account.

Deploy the cloud /api/auth/site/verify endpoint before publishing this site change. That endpoint
retains attribution receipts and conversion deduplication without issuing a redeemable credential
or sending a launch-link email. The old rewrite remains for cached gate pages during transition.

Checks: node --test tests/no-login-handoff.test.mjs; node scripts/prepare-static-deploy.cjs;
node scripts/verify-site-audit.mjs. Email-code and Google-return browser fixtures reached download;
the built mobile page had no broken images or horizontal overflow.
