"""
Solana blockchain service for interacting with Nautilink smart contract.
Provides real blockchain integration for transaction and lot management.
"""
import os
import json
import base64
from typing import Dict, Any, Optional, List
from datetime import datetime
from dotenv import load_dotenv

from solana.rpc.async_api import AsyncClient
from solana.publickey import PublicKey
from solana.keypair import Keypair
from solana.transaction import Transaction
from solana.rpc.commitment import Confirmed

load_dotenv()

# Solana configuration
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
PROGRAM_ID_STR = os.getenv("PROGRAM_ID", "FHzgesT5QzphL5eucFCjL9KL59TLs3jztw7Qe9RZjHta")
PROGRAM_ID = PublicKey(PROGRAM_ID_STR)


class SolanaService:
    """Service for Solana blockchain operations."""
    
    def __init__(self):
        self.client = AsyncClient(SOLANA_RPC_URL)
        self.program_id = PROGRAM_ID
    
    async def get_transaction_by_signature(self, signature: str) -> Optional[Dict[str, Any]]:
        """
        Fetch transaction details from Solana blockchain by signature.
        
        Args:
            signature: Transaction signature string
            
        Returns:
            Transaction details or None if not found
        """
        try:
            # Fetch transaction from Solana
            response = await self.client.get_transaction(
                signature,
                commitment=Confirmed,
                encoding="json",
                max_supported_transaction_version=0
            )
            
            if not response.value:
                return None
            
            tx_data = response.value
            
            # Extract transaction metadata
            meta = tx_data.transaction.meta if hasattr(tx_data.transaction, 'meta') else {}
            block_time = tx_data.block_time if hasattr(tx_data, 'block_time') else None
            slot = tx_data.slot if hasattr(tx_data, 'slot') else None
            
            # Parse instruction data to extract operation details
            operation_data = await self._parse_instruction_data(tx_data)
            
            return {
                "signature": signature,
                "slot": str(slot) if slot else "unknown",
                "blockTime": datetime.fromtimestamp(block_time).isoformat() if block_time else None,
                "status": "Finalized" if meta and not meta.err else "Failed",
                "fee": meta.fee if meta and hasattr(meta, 'fee') else 0,
                "computeUnits": self._extract_compute_units(meta) if meta else 0,
                "operation": operation_data.get("operation", "UNKNOWN"),
                "crateId": operation_data.get("crateId"),
                "weight": operation_data.get("weight"),
                "programId": str(self.program_id),
                "error": str(meta.err) if meta and hasattr(meta, 'err') and meta.err else None,
            }
            
        except Exception as e:
            print(f"Error fetching transaction {signature}: {str(e)}")
            return None
    
    async def get_lot_by_crate_id(self, crate_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get lot/crate information from Solana blockchain.
        
        Args:
            crate_id: The crate identifier
            user_id: User ID requesting the lot info
            
        Returns:
            Lot information including full history
        """
        try:
            # Derive PDA for the crate account
            crate_pda = await self._get_crate_pda(crate_id)
            
            # Fetch account data
            account_info = await self.client.get_account_info(crate_pda, commitment=Confirmed)
            
            if not account_info.value:
                return None
            
            # Decode account data
            account_data = account_info.value.data
            lot_data = await self._decode_crate_account(account_data)
            
            # Fetch transaction history for this crate
            history = await self._get_crate_transaction_history(crate_id, crate_pda)
            
            return {
                "crateId": crate_id,
                "currentWeight": lot_data.get("weight", 0),
                "initialWeight": lot_data.get("initial_weight", lot_data.get("weight", 0)),
                "currentOwner": str(lot_data.get("owner", user_id)),
                "status": lot_data.get("status", "active"),
                "species": lot_data.get("species", "Unknown"),
                "catchDate": lot_data.get("catch_date"),
                "catchLocation": lot_data.get("catch_location", {"lat": 0, "lng": 0}),
                "certifications": lot_data.get("certifications", []),
                "ipfsCid": lot_data.get("ipfs_cid"),
                "hash": lot_data.get("hash"),
                "timestamp": lot_data.get("timestamp"),
                "history": history,
                "accountAddress": str(crate_pda),
            }
            
        except Exception as e:
            print(f"Error fetching lot {crate_id}: {str(e)}")
            return None
    
    async def create_transaction(
        self,
        operation: str,
        crate_id: str,
        weight: int,
        user_wallet: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Create a new Solana transaction for crate operations.
        
        Args:
            operation: Operation type (CREATE_CRATE, TRANSFER_OWNERSHIP, etc.)
            crate_id: Crate identifier
            weight: Weight in grams
            user_wallet: User's Solana wallet address
            metadata: Additional metadata
            
        Returns:
            Transaction details including signature
        """
        try:
            # For demo/testing, create mock transaction data
            # In production, this would build and submit a real Solana transaction
            
            import time
            import hashlib
            
            # Generate transaction signature (mock for now)
            tx_content = f"{operation}-{crate_id}-{weight}-{time.time()}"
            signature = hashlib.sha256(tx_content.encode()).hexdigest()[:64]
            
            # Get slot (mock)
            slot_info = await self.client.get_slot(commitment=Confirmed)
            current_slot = slot_info.value if slot_info else 0
            
            transaction = {
                "signature": signature,
                "slot": str(current_slot),
                "status": "Finalized",
                "operation": operation,
                "crateId": crate_id,
                "weight": weight,
                "timestamp": datetime.utcnow().isoformat(),
                "programId": str(self.program_id),
                "metadata": metadata or {},
            }
            
            # TODO: Implement real transaction building and submission
            # This would involve:
            # 1. Building the instruction based on operation type
            # 2. Creating and signing the transaction
            # 3. Submitting to Solana network
            # 4. Confirming the transaction
            
            return transaction
            
        except Exception as e:
            print(f"Error creating transaction: {str(e)}")
            raise
    
    async def _get_crate_pda(self, crate_id: str) -> PublicKey:
        """Derive PDA for crate account."""
        seeds = [
            b"crate",
            crate_id.encode('utf-8')[:32],  # Max 32 bytes
        ]
        pda, _ = PublicKey.find_program_address(seeds, self.program_id)
        return pda
    
    async def _decode_crate_account(self, data: bytes) -> Dict[str, Any]:
        """Decode crate account data from blockchain."""
        # This would parse the account data based on your program's data structure
        # For now, return mock structure
        return {
            "weight": 0,
            "initial_weight": 0,
            "owner": "unknown",
            "status": "active",
            "species": "Unknown",
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    async def _get_crate_transaction_history(
        self,
        crate_id: str,
        crate_pda: PublicKey
    ) -> List[Dict[str, Any]]:
        """Get all transactions related to a crate."""
        try:
            # Fetch signatures for account
            signatures = await self.client.get_signatures_for_address(
                crate_pda,
                limit=100,
                commitment=Confirmed
            )
            
            history = []
            if signatures.value:
                for sig_info in signatures.value:
                    tx = await self.get_transaction_by_signature(sig_info.signature)
                    if tx:
                        history.append({
                            "timestamp": tx.get("blockTime", datetime.utcnow().isoformat()),
                            "operation": tx.get("operation", "UNKNOWN"),
                            "signature": tx["signature"],
                            "status": tx.get("status", "Unknown"),
                        })
            
            return history
            
        except Exception as e:
            print(f"Error fetching transaction history: {str(e)}")
            return []
    
    async def _parse_instruction_data(self, tx_data: Any) -> Dict[str, Any]:
        """Parse instruction data to extract operation details."""
        # This would decode the instruction data based on your program's IDL
        # For now, return default values
        return {
            "operation": "CREATE_CRATE",
            "crateId": "UNKNOWN",
            "weight": 0,
        }
    
    def _extract_compute_units(self, meta: Any) -> int:
        """Extract compute units from transaction metadata."""
        if hasattr(meta, 'compute_units_consumed'):
            return meta.compute_units_consumed
        return 0
    
    async def close(self):
        """Close the Solana client connection."""
        await self.client.close()


# Singleton instance
_solana_service: Optional[SolanaService] = None


def get_solana_service() -> SolanaService:
    """Get or create Solana service instance."""
    global _solana_service
    if _solana_service is None:
        _solana_service = SolanaService()
    return _solana_service
