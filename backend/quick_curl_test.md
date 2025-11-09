# Quick Curl Test Commands

## Step 1: Start Server (in separate terminal)
```powershell
cd backend
uvicorn main:app --reload
```

## Step 2: Run These Commands

### Windows PowerShell:

```powershell
# 1. Set environment variables (replace with your values)
$SUPABASE_URL = "YOUR_SUPABASE_URL"
$SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"
$WALLET = "4oi4ZELW4QG6ntpeAcMMX676TNJiZJB7b44wjZ6L6duZ"

# 2. Authenticate
$auth = Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" `
  -Headers @{"apikey"=$SUPABASE_KEY; "Content-Type"="application/json"} `
  -Body '{"email":"ethangwang7@gmail.com","password":"test123"}'
$TOKEN = $auth.access_token
Write-Host "Token: $($TOKEN.Substring(0,20))..."

# 3. Create Crate
$body = @{
    crate_id = "CURL_TEST_$(Get-Date -Format 'yyyyMMddHHmmss')"
    crate_did = "did:nautilink:crate:curl001"
    owner_did = "did:nautilink:owner:test"
    device_did = "did:nautilink:device:scanner01"
    location = "40.7128,-74.0060"
    weight = 5000
    ipfs_cid = "QmCurlTest123"
    hash = "curlhash123"
    solana_wallet = $WALLET
} | ConvertTo-Json

$result = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/web3/create-crate" `
  -Headers @{"Authorization"="Bearer $TOKEN"; "Content-Type"="application/json"} `
  -Body $body

Write-Host "`n[PASS] Transaction built!"
Write-Host "Crate Pubkey: $($result.crate_pubkey)"
Write-Host "`nSaved response to: create_response.json"
$result | ConvertTo-Json -Depth 10 | Out-File "create_response.json"

# 4. Now sign and submit with Python
Write-Host "`nTo sign and submit to blockchain, run:"
Write-Host "  python -c 'import json; import asyncio; from test_backend_sign import *; wallet=load_wallet(); print(asyncio.run(test_create_crate_direct()))'"
```

### Linux/Mac/WSL Bash:

```bash
# Load from .env or set manually
source .env
WALLET="4oi4ZELW4QG6ntpeAcMMX676TNJiZJB7b44wjZ6L6duZ"

# 1. Authenticate
TOKEN=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"ethangwang7@gmail.com","password":"test123"}' | jq -r '.access_token')

echo "Token: ${TOKEN:0:20}..."

# 2. Create Crate
curl -X POST "http://localhost:8000/web3/create-crate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"crate_id\": \"CURL_TEST_$(date +%s)\",
    \"crate_did\": \"did:nautilink:crate:curl001\",
    \"owner_did\": \"did:nautilink:owner:test\",
    \"device_did\": \"did:nautilink:device:scanner01\",
    \"location\": \"40.7128,-74.0060\",
    \"weight\": 5000,
    \"ipfs_cid\": \"QmCurlTest123\",
    \"hash\": \"curlhash123\",
    \"solana_wallet\": \"$WALLET\"
  }" | jq '.' | tee create_response.json

echo ""
echo "[PASS] Transaction built! Response saved to create_response.json"
echo ""
echo "To sign and submit to blockchain, run:"
echo "  python test_backend_sign.py"
```

## Verified Working Flow

The `test_backend_sign.py` script successfully minted a crate on devnet:

✅ **Confirmed Transaction:**
- Signature: `4nYNLd9LJ12oteiE4GgCuvw31oZVS54y95rJBjdpQyNp7he4vdwV7rd185gvisx2QmKjSrF3DWLvP6Yii6fTBCSe`
- Crate: `D7Q5josB42ZcTjgnQHFTbEFY27wx9jJzKJQajJXUeCKS`
- View: https://explorer.solana.com/tx/4nYNLd9LJ12oteiE4GgCuvw31oZVS54y95rJBjdpQyNp7he4vdwV7rd185gvisx2QmKjSrF3DWLvP6Yii6fTBCSe?cluster=devnet

## Quick Commands Summary

**Just run these Python scripts (server must be running):**

```bash
cd backend

# Test direct blockchain (bypasses API)
python test_backend_sign.py

# Test full flow (API + blockchain)
python test_with_curl.py
```

Both will mint tokens on Solana devnet! 🎉

