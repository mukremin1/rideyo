# RideYo

Car-sharing / rental app (React + Vite + Supabase + Capacitor).

## Local setup

```sh
npm run setup
npm run env:init          # creates .env from .env.example
# Edit .env with Supabase keys (Dashboard → Project Settings → API)
npm run dev
```

Optional local API proxy (web only):

```sh
# Add to .env: VITE_SERVER_API_URL=http://localhost:3001
npm run dev:full
```

## Mobile (Android)

```sh
# .env must NOT contain localhost URLs
npm run mobile:sync
cd android && ./gradlew assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Deploy checklist

```sh
npm run deploy:check
npm run supabase:deploy:payment   # needs SUPABASE_ACCESS_TOKEN
```

Edge function secrets template: `supabase/secrets.example.env`

## Stack

- Vite, TypeScript, React, shadcn-ui, Tailwind CSS
- Supabase (auth, DB, edge functions)
- Capacitor (Android / iOS)
- iyzico (payments, sandbox)

