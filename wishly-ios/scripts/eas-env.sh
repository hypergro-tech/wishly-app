#!/bin/sh
# Copies the app's settings (EXPO_PUBLIC_… lines in .env.local) to EAS for
# production builds; cloud builds don't see .env.local. Skips empty values and
# the local-testing ones. Run from wishly-ios/ after `npx eas-cli@latest login`.
set -e
grep -E '^EXPO_PUBLIC_[A-Z0-9_]+=.+' .env.local |
  grep -vE '^EXPO_PUBLIC_(BASE44_SERVER_URL|DEMO_TOOLS|REAL_SONGS)=' |
  while IFS='=' read -r name value; do
    npx eas-cli@latest env:set --name "$name" --value "$value" \
      --environment production --visibility plaintext --non-interactive --force
  done
