#!/usr/bin/env python3
"""
Generate 100 crates with realistic supply chain transaction histories using backend API endpoints.

This script:
1. Creates test users for each supply chain stage
2. Authenticates to get JWT tokens
3. Calls backend API endpoints to create crates, transfer ownership, mix, and split
4. All transactions are submitted to Solana devnet and stored off-chain in Supabase

Supply chain flow:
- Fishers create initial crates
- Fisheries mix crates from multiple fishers
- Suppliers transfer and split crates
- Wholesalers receive and distribute
- Shelves receive final products

Usage:
    python generate_supply_chain_data.py
    
Prerequisites:
    - Backend server running on http://localhost:8000
    - Solana program compiled and deployed to devnet
    - Supabase configured with crates table
"""

import asyncio
import random
import hashlib
import time
import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import json
import sys
import os

# Configuration
BASE_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
SUPPLY_CHAIN_STAGES = {
    "fisher": {"count": 20, "weight_range": (5000, 50000)},
    "fishery": {"count": 10, "mix_range": (2, 5)},
    "supplier": {"count": 8, "split_range": (2, 4)},
    "wholesaler": {"count": 5, "split_range": (2, 3)},
    "shelf": {"count": 15, "weight_range": (1000, 5000)},
}

FISHING_LOCATIONS = [
    "40.7128,-74.0060",  # New York area
    "34.0522,-118.2437",  # Los Angeles area
    "25.7617,-80.1918",  # Miami area
    "47.6062,-122.3321",  # Seattle area
    "41.8781,-87.6298",  # Chicago area
]

DEVICE_IDS = {
    "fisher": [f"did:nautilink:device:fisher_{i}" for i in range(1, 21)],
    "fishery": [f"did:nautilink:device:fishery_{i}" for i in range(1, 11)],
    "supplier": [f"did:nautilink:device:supplier_{i}" for i in range(1, 9)],
    "wholesaler": [f"did:nautilink:device:wholesaler_{i}" for i in range(1, 6)],
    "shelf": [f"did:nautilink:device:shelf_{i}" for i in range(1, 16)],
}


@dataclass
class CrateInfo:
    """Represents a crate created via API."""
    crate_id: str
    crate_did: str
    crate_pubkey: str
    weight: int
    supply_chain_stage: str
    owner_email: str
    parent_crates: List[str] = field(default_factory=list)
    operation_type: str = "Created"


@dataclass
class UserInfo:
    """Represents a test user."""
    email: str
    password: str
    token: Optional[str] = None
    user_id: Optional[str] = None
    supply_chain_stage: str = ""
    crates: List[CrateInfo] = field(default_factory=list)


class SupplyChainGenerator:
    """Generates realistic supply chain data using backend API."""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.users: Dict[str, UserInfo] = {}
        self.all_crates: List[CrateInfo] = []
        self.crate_counter = 1
        self.start_time = int(time.time()) - (30 * 24 * 60 * 60)  # 30 days ago
        self._cached_token: Optional[str] = None
        self._cached_user_id: Optional[str] = None
        self._cached_email: str = "ethangwang7@gmail.com"
        
    async def create_user(self, stage: str, index: int) -> UserInfo:
        """Login with the configured credentials for a supply chain stage."""
        email = "ethangwang7@gmail.com"
        password = "test123"
        
        # Use cached token if available
        if self._cached_token and self._cached_user_id:
            user = UserInfo(
                email=email,
                password=password,
                token=self._cached_token,
                user_id=self._cached_user_id,
                supply_chain_stage=stage,
            )
            self.users[f"{stage}_{index}"] = user
            return user
        
        # Login with the provided credentials
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/auth/login",
                    json={"email": email, "password": password},
                    timeout=30.0
                )
            except httpx.ConnectError as e:
                print(f"✗ Connection error: Cannot connect to backend at {self.base_url}")
                print(f"  Make sure the backend server is running on {self.base_url}")
                raise Exception(f"Backend server not reachable: {str(e)}")
            except httpx.ReadTimeout as e:
                print(f"✗ Timeout error: Backend server at {self.base_url} did not respond in time")
                print(f"  The server may be hung or taking too long to process the request")
                raise Exception(f"Backend server timeout: {str(e)}")
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                user_id = data.get("user", {}).get("id")
                
                # Cache the token and user_id
                self._cached_token = token
                self._cached_user_id = user_id
                
                user = UserInfo(
                    email=email,
                    password=password,
                    token=token,
                    user_id=user_id,
                    supply_chain_stage=stage,
                )
                self.users[f"{stage}_{index}"] = user
                if index == 1:  # Only print once
                    print(f"✓ Logged in user: {email}")
                return user
            else:
                print(f"✗ Failed to login user {email}: {response.text}")
                raise Exception(f"Failed to login: {response.text}")
    
    def generate_crate_id(self) -> str:
        """Generate a unique crate ID."""
        crate_id = f"CRATE_{self.crate_counter:06d}"
        self.crate_counter += 1
        return crate_id
    
    def generate_did(self, prefix: str) -> str:
        """Generate a DID."""
        return f"did:nautilink:{prefix}:{random.randint(100000, 999999)}"
    
    def generate_hash(self) -> str:
        """Generate a SHA256 hash."""
        data = f"{time.time()}{random.random()}".encode()
        return hashlib.sha256(data).hexdigest()
    
    def generate_ipfs_cid(self) -> str:
        """Generate a mock IPFS CID."""
        return f"Qm{''.join(random.choices('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=44))}"
    
    def get_random_location(self) -> str:
        """Get a random location."""
        return random.choice(FISHING_LOCATIONS)
    
    def get_random_device(self, stage: str) -> str:
        """Get a random device ID for a stage."""
        return random.choice(DEVICE_IDS.get(stage, [f"did:nautilink:device:{stage}_1"]))
    
    async def create_crate(
        self,
        user: UserInfo,
        weight: int,
        supply_chain_stage: str,
        parent_crates: Optional[List[str]] = None,
        operation_type: str = "Created"
    ) -> CrateInfo:
        """Create a crate using the backend API."""
        crate_id = self.generate_crate_id()
        crate_did = self.generate_did("crate")
        owner_did = self.generate_did("owner")
        device_did = self.get_random_device(supply_chain_stage)
        location = self.get_random_location()
        timestamp = self.start_time + random.randint(0, 30 * 24 * 60 * 60)
        hash_str = self.generate_hash()
        ipfs_cid = self.generate_ipfs_cid()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/web3/create-crate-onchain",
                headers={"Authorization": f"Bearer {user.token}"},
                json={
                    "crate_id": crate_id,
                    "crate_did": crate_did,
                    "owner_did": owner_did,
                    "device_did": device_did,
                    "location": location,
                    "weight": weight,
                    "hash": hash_str,
                    "ipfs_cid": ipfs_cid,
                    "timestamp": timestamp,
                    "supply_chain_stage": supply_chain_stage,
                },
                timeout=60.0,
            )
            
            if response.status_code == 200:
                data = response.json()
                crate_pubkey = data.get("crate_pubkey")
                
                crate = CrateInfo(
                    crate_id=crate_id,
                    crate_did=crate_did,
                    crate_pubkey=crate_pubkey,
                    weight=weight,
                    supply_chain_stage=supply_chain_stage,
                    owner_email=user.email,
                    parent_crates=parent_crates or [],
                    operation_type=operation_type,
                )
                
                user.crates.append(crate)
                self.all_crates.append(crate)
                print(f"✓ Created crate: {crate_id} ({crate_pubkey[:8]}...) - {operation_type}")
                return crate
            else:
                print(f"✗ Failed to create crate: {response.status_code} - {response.text}")
                raise Exception(f"Failed to create crate: {response.text}")
    
    async def transfer_ownership(
        self,
        user: UserInfo,
        parent_crate: CrateInfo,
        weight: int,
        supply_chain_stage: str,
    ) -> CrateInfo:
        """Transfer ownership of a crate using the backend API."""
        crate_id = self.generate_crate_id()
        crate_did = self.generate_did("crate")
        owner_did = self.generate_did("owner")
        device_did = self.get_random_device(supply_chain_stage)
        location = self.get_random_location()
        timestamp = int(time.time())
        hash_str = self.generate_hash()
        ipfs_cid = self.generate_ipfs_cid()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/web3/transfer-ownership",
                headers={"Authorization": f"Bearer {user.token}"},
                json={
                    "parent_crate_pubkey": parent_crate.crate_pubkey,
                    "crate_id": crate_id,
                    "crate_did": crate_did,
                    "owner_did": owner_did,
                    "device_did": device_did,
                    "location": location,
                    "weight": weight,  # Must match parent
                    "hash": hash_str,
                    "ipfs_cid": ipfs_cid,
                    "timestamp": timestamp,
                    "supply_chain_stage": supply_chain_stage,
                },
                timeout=60.0,
            )
            
            if response.status_code == 200:
                data = response.json()
                crate_pubkey = data.get("crate_pubkey")
                
                crate = CrateInfo(
                    crate_id=crate_id,
                    crate_did=crate_did,
                    crate_pubkey=crate_pubkey,
                    weight=weight,
                    supply_chain_stage=supply_chain_stage,
                    owner_email=user.email,
                    parent_crates=[parent_crate.crate_pubkey],
                    operation_type="Transferred",
                )
                
                user.crates.append(crate)
                self.all_crates.append(crate)
                print(f"✓ Transferred crate: {crate_id} ({crate_pubkey[:8]}...)")
                return crate
            else:
                print(f"✗ Failed to transfer crate: {response.status_code} - {response.text}")
                raise Exception(f"Failed to transfer crate: {response.text}")
    
    async def generate_all_crates(self):
        """Generate all crates in the supply chain."""
        print("=" * 80)
        print("GENERATING SUPPLY CHAIN DATA")
        print("=" * 80)
        
        # Step 1: Create users for each stage
        print("\n[1/5] Creating users...")
        for stage, config in SUPPLY_CHAIN_STAGES.items():
            for i in range(1, config["count"] + 1):
                await self.create_user(stage, i)
                await asyncio.sleep(0.1)  # Rate limiting
        
        # Step 2: Create fisher crates
        print("\n[2/5] Creating fisher crates...")
        fisher_users = [u for k, u in self.users.items() if k.startswith("fisher_")]
        for user in fisher_users:
            weight = random.randint(*SUPPLY_CHAIN_STAGES["fisher"]["weight_range"])
            await self.create_crate(user, weight, "fisher", operation_type="Created")
            await asyncio.sleep(0.5)  # Rate limiting
        
        # Step 3: Create fishery mixes
        print("\n[3/5] Creating fishery mixes...")
        fishery_users = [u for k, u in self.users.items() if k.startswith("fishery_")]
        fisher_crates = [c for c in self.all_crates if c.supply_chain_stage == "fisher"]
        
        for user in fishery_users:
            num_parents = random.randint(*SUPPLY_CHAIN_STAGES["fishery"]["mix_range"])
            if len(fisher_crates) >= num_parents:
                parents = random.sample(fisher_crates, num_parents)
                total_weight = sum(p.weight for p in parents)
                
                # For mix, we create a new crate with the combined weight
                # Note: Mix endpoint would need to be added, for now we create a new crate
                # and note the parents in metadata
                parent_pubkeys = [p.crate_pubkey for p in parents]
                await self.create_crate(
                    user,
                    total_weight,
                    "fishery",
                    parent_crates=parent_pubkeys,
                    operation_type="Mixed"
                )
                await asyncio.sleep(0.5)
        
        # Step 4: Supplier operations (transfers and splits)
        print("\n[4/5] Creating supplier operations...")
        supplier_users = [u for k, u in self.users.items() if k.startswith("supplier_")]
        fishery_crates = [c for c in self.all_crates if c.supply_chain_stage == "fishery"]
        
        for user in supplier_users:
            if fishery_crates:
                parent = random.choice(fishery_crates)
                
                if random.random() < 0.5:  # 50% transfer
                    await self.transfer_ownership(user, parent, parent.weight, "supplier")
                    await asyncio.sleep(0.5)
                else:  # 50% split
                    num_children = random.randint(*SUPPLY_CHAIN_STAGES["supplier"]["split_range"])
                    child_weight = parent.weight // num_children
                    remainder = parent.weight % num_children
                    
                    # Create child crates
                    for i in range(num_children):
                        weight = child_weight + (remainder if i == 0 else 0)
                        # For split, we transfer ownership with split weight
                        # Note: Split endpoint would need to be added
                        await self.transfer_ownership(user, parent, weight, "supplier")
                        await asyncio.sleep(0.5)
        
        # Step 5: Wholesaler operations
        print("\n[5/5] Creating wholesaler operations...")
        wholesaler_users = [u for k, u in self.users.items() if k.startswith("wholesaler_")]
        supplier_crates = [c for c in self.all_crates if c.supply_chain_stage == "supplier"]
        
        for user in wholesaler_users:
            if supplier_crates:
                parent = random.choice(supplier_crates)
                
                if random.random() < 0.6:  # 60% transfer
                    await self.transfer_ownership(user, parent, parent.weight, "wholesaler")
                    await asyncio.sleep(0.5)
                else:  # 40% split
                    num_children = random.randint(*SUPPLY_CHAIN_STAGES["wholesaler"]["split_range"])
                    child_weight = parent.weight // num_children
                    remainder = parent.weight % num_children
                    
                    for i in range(num_children):
                        weight = child_weight + (remainder if i == 0 else 0)
                        await self.transfer_ownership(user, parent, weight, "wholesaler")
                        await asyncio.sleep(0.5)
        
        # Step 6: Shelf transfers
        print("\n[6/6] Creating shelf transfers...")
        shelf_users = [u for k, u in self.users.items() if k.startswith("shelf_")]
        wholesaler_crates = [c for c in self.all_crates if c.supply_chain_stage == "wholesaler"]
        
        for user in shelf_users:
            if wholesaler_crates:
                parent = random.choice(wholesaler_crates)
                weight = random.randint(*SUPPLY_CHAIN_STAGES["shelf"]["weight_range"])
                if weight <= parent.weight:
                    await self.transfer_ownership(user, parent, weight, "shelf")
                    await asyncio.sleep(0.5)
        
        print("\n" + "=" * 80)
        print("GENERATION COMPLETE")
        print("=" * 80)
        print(f"Total crates created: {len(self.all_crates)}")
        print(f"Total users: {len(self.users)}")
        
        # Print summary by stage
        for stage in ["fisher", "fishery", "supplier", "wholesaler", "shelf"]:
            count = len([c for c in self.all_crates if c.supply_chain_stage == stage])
            print(f"  {stage}: {count} crates")
        
        # Print summary by operation
        for op_type in ["Created", "Transferred", "Mixed", "Split"]:
            count = len([c for c in self.all_crates if c.operation_type == op_type])
            if count > 0:
                print(f"  {op_type}: {count} crates")


async def main():
    """Main entry point."""
    print("Supply Chain Data Generator")
    print(f"Backend URL: {BASE_URL}")
    print("\nMake sure:")
    print("  1. Backend server is running")
    print("  2. Solana program is compiled and deployed to devnet")
    print("  3. Supabase is configured")
    print()
    
    # Check if backend server is reachable
    print("Checking backend server connection...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                print(f"✓ Backend server is reachable")
            else:
                print(f"⚠ Backend server responded with status {response.status_code}")
    except httpx.ConnectError:
        print(f"✗ Cannot connect to backend server at {BASE_URL}")
        print(f"  Please make sure the backend server is running")
        sys.exit(1)
    except httpx.ReadTimeout:
        print(f"✗ Backend server at {BASE_URL} did not respond in time")
        print(f"  The server may be hung or not responding")
        sys.exit(1)
    except Exception as e:
        print(f"⚠ Could not verify backend connection: {str(e)}")
        print(f"  Continuing anyway...")
    
    print()
    generator = SupplyChainGenerator()
    
    try:
        await generator.generate_all_crates()
        print("\n✓ All crates generated successfully!")
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
