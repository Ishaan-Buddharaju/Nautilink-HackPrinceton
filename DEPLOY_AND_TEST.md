# Deploy and Test Blockchain Interactions

## Step 1: Deploy to Solana Devnet

Run these commands in WSL:

```bash
# Navigate to web3 directory
cd /mnt/c/Users/lamam/OneDrive/Nautilink-HackPrinceton/web3

# Set Solana CLI to devnet
solana config set --url https://api.devnet.solana.com

# Check your wallet
solana address

# Request airdrop (needed for deployment fees)
solana airdrop 2

# Deploy the program
anchor deploy --provider.cluster devnet

# Get the deployed program ID
solana address -k target/deploy/nautilink-keypair.json
```

## Step 2: Update Environment Variables

After deployment, update `backend/.env` with the deployed program ID:

```bash
PROGRAM_ID=<your_deployed_program_id_here>
SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Step 3: Verify Deployment

In PowerShell (backend directory):

```powershell
python test_blockchain_simple.py
```

This should show `[PASS] Program found on devnet!`

## Step 4: Run Blockchain Tests

```powershell
python test_blockchain.py
```

This will:
- Create wallets and fund them via airdrop
- Build CREATE CRATE transaction
- Submit to devnet and confirm
- Build TRANSFER OWNERSHIP transaction  
- Submit to devnet and confirm
- Provide Solana Explorer links to verify

## Quick Deploy Script

Or use the deploy script:

```bash
# In WSL
cd /mnt/c/Users/lamam/OneDrive/Nautilink-HackPrinceton/web3
chmod +x deploy_devnet.sh
./deploy_devnet.sh
```

## Expected Results

After successful deployment and testing, you should see:
- [PASS] Program found on devnet
- [PASS] CREATE CRATE confirmed on-chain
- [PASS] TRANSFER OWNERSHIP confirmed on-chain
- Explorer links to view transactions

## Troubleshooting

**"Program account not found"**
- Program not deployed yet - run deploy commands above

**"Insufficient funds"**
- Request more SOL: `solana airdrop 2`

**"Program ID mismatch"**
- Update lib.rs with new program ID and rebuild:
  ```bash
  anchor build
  anchor deploy --provider.cluster devnet
  ```

