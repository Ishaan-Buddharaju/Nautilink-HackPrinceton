import json
import os
from dataclasses import dataclass
from socketserver import DatagramRequestHandler

from dotenv import load_dotenv
from solana.rpc.async_api import AsyncClient
from solana.publickey import PublicKey
from solana.keypair import Keypair
from anchorpy import Program, Provider, Wallet, Idl

load_dotenv()
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL")
PROGRAM_ID = PublicKey(os.getenv("PROGRAM_ID"))
WALLET_KEYPAIR_PATH = os.getenv("WALLET_KEYPAIR")
IDL_PATH = os.getenv("IDL_PATH")

@dataclass
class SolanaClient:
    client: AsyncClient
    wallet: Wallet
    program: Program
    provider: Provider

def create_solana_client():
    client = AsyncClient(endpoint=os.getenv("SOLANA_ENDPOINT"))
    wallet = Wallet(Keypair.from_mnemonic(os.getenv("SOLANA_MNEMONIC")))
    provider = Provider(client, wallet)
    program = Program(os.getenv("SOLANA_PROGRAM_ID"), provider=provider)
    return SolanaClient(client, wallet, program, provider)

async def get_config_pda() -> PublicKey:
    # PDA seeds must match what you used in your Seahorse/Anchor program
    config_pda, _ = PublicKey.find_program_address(
        [b"registry_config"],
        PROGRAM_ID,
    )
    return config_pda


async def get_lot_pda(creator: PublicKey, lot_id: int) -> PublicKey:
    # lot seeds must match your program's lot.init(seeds=[...])
    # Here we assume seeds=["lot", creator, lot_id]
    lot_pda, _ = PublicKey.find_program_address(
        [
            b"lot",
            bytes(creator),
            lot_id.to_bytes(8, byteorder="little"),  # u64
        ],
        PROGRAM_ID,
    )
    return lot_pda