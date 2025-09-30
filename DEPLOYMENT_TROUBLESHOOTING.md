# GitHub Actions Deployment Troubleshooting

## Common Issues and Solutions

### 1. Service Account Configuration

**Issue**: Pipeline fails with authentication errors

**Solution**: Verify the `FIREBASE_SERVICE_ACCOUNT` secret is correctly configured:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. In GitHub: Settings → Secrets and variables → Actions
5. Update `FIREBASE_SERVICE_ACCOUNT` with the **entire JSON content**
6. Ensure the JSON is valid (use a JSON validator)

**The secret should look like:**
```json
{
  "type": "service_account",
  "project_id": "home-organizing-app",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  ...
}
```

### 2. Firebase Project Permissions

**Issue**: Pipeline fails with permission errors

**Solution**: Ensure the service account has the correct permissions:

1. Go to Google Cloud Console
2. Select your Firebase project
3. Navigate to IAM & Admin → IAM
4. Find the service account (format: `firebase-adminsdk-xxxxx@PROJECT_ID.iam.gserviceaccount.com`)
5. Ensure it has these roles:
   - **Firebase Admin**
   - **Cloud Datastore User** (for Firestore)
   - **Firebase Hosting Admin**

### 3. Firebase Hosting Configuration

**Issue**: Deployment succeeds but site doesn't work

**Solution**: Verify `firebase.json` configuration:

The hosting configuration should point to the correct directory:
```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  }
}
```

### 4. GitHub Actions Workflow Issues

**Issue**: Workflow doesn't trigger or fails immediately

**Checklist**:
- [ ] Workflow file is in `.github/workflows/` directory
- [ ] YAML syntax is valid
- [ ] Secrets are correctly named (case-sensitive)
- [ ] Branch names match (e.g., `main` not `master`)
- [ ] Repository has Actions enabled (Settings → Actions)

### 5. PR Preview Deployments

**Issue**: PR deployments fail or create errors

**Note**: PR preview deployments are separated from production deployments in the workflow:
- Production deploys to `live` channel on main branch
- PRs deploy to temporary preview channels automatically

### 6. Firestore Rules Deployment

**Issue**: Firestore rules not deploying

**Solution**: Firestore rules are deployed separately from hosting:
```bash
firebase deploy --only firestore:rules
```

Or deploy everything together:
```bash
firebase deploy
```

## Deployment Verification

After deployment, verify:

1. **Firebase Console**: Check Hosting tab for successful deployment
2. **Live URL**: Visit `https://home-organizing-app.web.app` or your custom domain
3. **Firestore**: Check that data syncs correctly
4. **Authentication**: Verify anonymous auth works

## Manual Deployment (Fallback)

If GitHub Actions continues to fail, you can deploy manually:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy from local repository
firebase deploy --project home-organizing-app
```

## Getting Help

If issues persist:

1. Check the GitHub Actions run logs for specific error messages
2. Verify all secrets are correctly configured
3. Test manual deployment to isolate the issue
4. Check Firebase status: https://status.firebase.google.com/

## Action Items for @StefanMaron

To fix the pipeline, please verify:

1. **Service Account Secret**:
   - Go to GitHub repo Settings → Secrets and variables → Actions
   - Verify `FIREBASE_SERVICE_ACCOUNT` exists and contains valid JSON
   - If unsure, regenerate the service account key from Firebase Console

2. **Service Account Permissions**:
   - Check Google Cloud Console → IAM for the service account
   - Ensure it has Firebase Admin and Hosting Admin roles

3. **Check Workflow Logs**:
   - Go to Actions tab in GitHub
   - Click on the failed workflow run
   - Share any specific error messages

4. **Test Manual Deployment** (optional):
   - Clone the repo locally
   - Run `firebase deploy --project home-organizing-app`
   - This helps identify if it's a GitHub Actions issue or Firebase config issue