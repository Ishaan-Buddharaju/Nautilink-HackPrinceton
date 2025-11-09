"""
Solana blockchain integration module.
Provides API endpoints and services for interacting with Nautilink smart contract on Solana.
"""

from .router import router
from .service import get_solana_service, SolanaService

__all__ = ['router', 'get_solana_service', 'SolanaService']
