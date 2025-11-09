#!/bin/bash

# Deploy Nautilink program to Solana devnet

set -e

echo "============================================================"
echo "Deploying Nautilink to Solana Devnet"
echo "============================================================"

# Configure Solana CLI for devnet
echo -e "\n1. Configuring Solana CLI for devnet..."
solana config set --url https://api.devnet.solana.com

# Check wallet
echo -e "\n2. Checking wallet..."
solana address

# Check balance
echo -e "\n3. Checking balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

# Request airdrop if balance is low
if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "Balance low, requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

# Build the program
echo -e "\n4. Building Anchor program..."
cd /mnt/c/Users/lamam/OneDrive/Nautilink-HackPrinceton/web3
anchor build

# Deploy
echo -e "\n5. Deploying to devnet..."
anchor deploy --provider.cluster devnet

# Get program ID
echo -e "\n6. Getting deployed program ID..."
PROGRAM_ID=$(solana address -k target/deploy/nautilink-keypair.json)
echo "Program deployed at: $PROGRAM_ID"

# Update lib.rs with new program ID if different
echo -e "\n7. Checking if program ID needs updating..."
CURRENT_ID=$(grep "declare_id!" programs/nautilink/src/lib.rs | grep -oP '"\K[^"]+')
echo "Current ID in lib.rs: $CURRENT_ID"
echo "Deployed ID: $PROGRAM_ID"

if [ "$CURRENT_ID" != "$PROGRAM_ID" ]; then
    echo "WARNING: Program ID mismatch!"
    echo "Update lib.rs with: declare_id!(\"$PROGRAM_ID\");"
    echo "Then rebuild and redeploy"
else
    echo "Program ID matches!"
fi

echo -e "\n============================================================"
echo "Deployment Complete!"
echo "============================================================"
echo "Program ID: $PROGRAM_ID"
echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "Update your backend/.env with:"
echo "PROGRAM_ID=$PROGRAM_ID"

