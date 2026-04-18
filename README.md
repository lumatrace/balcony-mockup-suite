# Balcony Mockup Suite

Standalone React/Vite app for placing stills and videos into the real Balcony venue masks over the locked venue photos.

## Run locally

```bash
cd "/Users/lumatrace/Documents/New project/balcony-bar-mockup"
npm install
npm run dev
```

## Submission setup

The local mockup editor works with `npm run dev`. The cloud submission flow is built for Vercel Functions plus Supabase Storage.

1. Copy `.env.example` to `.env.local`
2. Fill in the Supabase and Resend keys
3. Run `supabase/schema.sql` in the Supabase SQL editor
4. Deploy to Vercel so the `/api/submissions/*` routes are live

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_UPLOAD_BUCKET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUBMISSION_NOTIFICATION_EMAIL`

## Included source assets

- `public/assets/Bar.png`
- `public/assets/Balcony_web_bar.svg`
- `public/assets/Balcony_web_bar.ai`

## Current behavior

- 4 venue sections: Bar, Entrance, South Wall, and Stage
- Combined and individual mapping modes where appropriate
- Drag-and-drop or file-picker import
- Image and browser-playable video preview
- Scale and position controls
- Local project save/load with IndexedDB
- Builder submissions package the current venue drafts into one ZIP and upload it to Supabase
- Concierge upload page accepts one ZIP and submits it directly
