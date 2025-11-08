from fastapi import APIRouter
from typing import List
from pydantic import BaseModel
from datetime import datetime
import random

router = APIRouter(prefix="/api", tags=["api"])


class VesselData(BaseModel):
    lat: float
    lng: float
    registered: bool
    timestamp: str
    geartype: str
    mmsi: str
    imo: str
    shipName: str
    flag: str


@router.get("/getPositions", response_model=List[VesselData])
async def get_positions():
    """
    Get vessel positions. Returns mock data for now.
    """
    # Generate some mock vessel data
    mock_vessels = []
    geartypes = ["trawler", "longliner", "purse_seine", "drifter", "cargo", "tanker"]
    flags = ["US", "CN", "JP", "KR", "PH", "ID", "TH", "VN"]
    
    # Generate random vessel positions around the world
    for i in range(50):
        # Random coordinates (focusing on common shipping areas)
        lat = random.uniform(-60, 60)
        lng = random.uniform(-180, 180)
        
        mock_vessels.append(VesselData(
            lat=lat,
            lng=lng,
            registered=random.choice([True, False]),
            timestamp=datetime.utcnow().isoformat() + "Z",
            geartype=random.choice(geartypes),
            mmsi=f"{random.randint(100000000, 999999999)}",
            imo=f"{random.randint(1000000, 9999999)}",
            shipName=f"Vessel {chr(65 + i % 26)}{i}",
            flag=random.choice(flags)
        ))
    
    return mock_vessels

