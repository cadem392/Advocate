# Firebase setup (Firestore + Auth + Storage)

Cases are stored in **Firestore** under `users/{userId}/cases/{caseId}`. Nothing will be saved until both the **Firestore database** and the **Firebase Admin** service account are set up.

---

## 1. Create the Firestore database

1. Open [Firebase Console](https://console.firebase.google.com/) and select your project (e.g. **advocate-b843d**).
2. In the left sidebar go to **Build → Firestore Database**.
3. Click **Create database**.
4. Choose **Production mode** (or Test mode if you want open rules for now).
5. Pick a **location** (e.g. `us-central1`) and confirm.

Until this is done, the app has no Firestore database to write to.

---

## 2. Get the Firebase Admin (service account) credentials

The Next.js API needs a **service account** to write to Firestore and Storage. Without it, `getAdminApp()` stays `null` and the case APIs return **503** or fail silently.

1. In Firebase Console go to **Project settings** (gear) → **Service accounts**.
2. Click **Generate new private key** and confirm. A JSON file will download.
3. Open the JSON. You’ll use three values:

| JSON key       | Use as env var                  |
|----------------|----------------------------------|
| `project_id`   | `FIREBASE_ADMIN_PROJECT_ID`     |
| `client_email` | `FIREBASE_ADMIN_CLIENT_EMAIL`   |
| `private_key`  | `FIREBASE_ADMIN_PRIVATE_KEY`    |

---

## 3. Add env vars to `.env.local`

In your project root, edit **`.env.local`** (create it if needed) and add:

```bash
# Firebase Admin (required for Firestore + Storage)
FIREBASE_ADMIN_PROJECT_ID=advocate-b843d
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@advocate-b843d.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_LINES_HERE\n-----END PRIVATE KEY-----\n"
```

- Use your **actual** `project_id` and `client_email` from the JSON.
- For **FIREBASE_ADMIN_PRIVATE_KEY**:
  - Copy the full `private_key` value from the JSON (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`).
  - Put it in **double quotes**.
  - Keep the `\n` characters as backslash-n (two characters). The app will turn them into real newlines.

Example (fake key):

```bash
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...(many lines)...\n-----END PRIVATE KEY-----\n"
```

If you paste the key with real newlines instead of `\n`, that’s also fine in many setups; the code only runs `.replace(/\\n/g, "\n")` when needed.

Restart the dev server after changing `.env.local`.

---

## 4. Optional: Storage bucket (for intake document uploads)

If you want intake documents uploaded to Firebase Storage:

- Set **Storage** in Firebase Console (Build → Storage → Get started).
- In `.env.local` you already have `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. For the Admin SDK you can set:
  - `FIREBASE_STORAGE_BUCKET=advocate-b843d.firebasestorage.app`  
  (or the same value as `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`).

---

## 5. How to confirm it’s working

- **Auth:** Sign in on the app. Only then will the client send an ID token to the API.
- **Create a case:** From the home page, generate a case strategy while signed in. That calls `POST /api/cases` with `Authorization: Bearer <token>`.
- **Firestore:** In Firebase Console → Firestore Database you should see:
  - Collection **users** → document **{your-uid}** → subcollection **cases** → documents for each case.

If cases still don’t appear:

- Check the browser **Network** tab: `POST /api/cases` should return **201** (success), not **401** (no/invalid token) or **503** (Admin not configured / Firestore missing).
- Ensure **Firestore database** is created (step 1) and **all three** Admin env vars are set in `.env.local` (step 2–3), then restart the dev server.

---

## Data shape in Firestore

- **Path:** `users/{uid}/cases/{caseId}`
- **Document fields:** `id`, `createdAt`, `updatedAt`, `payload` (the full case + attack tree + draft, etc.).

Security rules can restrict reads/writes to `request.auth.uid`; the Admin SDK uses the service account and bypasses client rules for server-side writes.
