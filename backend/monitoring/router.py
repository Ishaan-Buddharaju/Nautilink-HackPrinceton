"""
Live Monitoring API Router
Real-time fleet monitoring with xAI-powered insights
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import asyncio

from config import settings
from supabase import create_client, Client
import jwt

from services.xai_service import get_xai_service


class SummarizeRequest(BaseModel):
    """Request model for content summarization."""
    content: str
    context: str

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


async def get_current_user(authorization: str = None) -> dict:
    """Get current user from JWT token."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split(' ')[1]
    
    try:
        # Verify JWT token with Supabase
        response = supabase.auth.get_user(token)
        if response.user:
            return {
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata or {}
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )


@router.get("/status")
async def get_monitoring_status(authorization: str = Depends(get_current_user)):
    """
    Get overall system monitoring status.
    Includes fleet metrics, transaction stats, and AI-powered summary.
    """
    try:
        # Fetch real-time data (mock for now, replace with actual queries)
        vessel_data = await _fetch_active_vessels()
        transaction_data = await _fetch_recent_transactions()
        alert_data = await _check_alerts()
        
        # Get xAI insights
        xai_service = get_xai_service()
        
        system_status = {
            "active_vessels": len(vessel_data),
            "fishing_vessels": len([v for v in vessel_data if v.get("status") == "fishing"]),
            "transactions_today": len(transaction_data),
            "active_alerts": len(alert_data),
            "system_health": "healthy",
            "blockchain_sync": "synced"
        }
        
        # Generate AI summary
        ai_summary = await xai_service.generate_live_summary(system_status)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "operational",
            "metrics": system_status,
            "ai_summary": ai_summary,
            "vessels": vessel_data[:20],  # Return top 20
            "recent_transactions": transaction_data[:10],
            "alerts": alert_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch monitoring status: {str(e)}"
        )


@router.get("/fleet-analysis")
async def get_fleet_analysis(authorization: str = Depends(get_current_user)):
    """
    Get AI-powered fleet activity analysis.
    Uses xAI (Grok) to analyze vessel behavior and provide insights.
    """
    try:
        vessel_data = await _fetch_active_vessels()
        transaction_data = await _fetch_recent_transactions()
        
        xai_service = get_xai_service()
        analysis = await xai_service.analyze_fleet_activity(vessel_data, transaction_data)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "analysis": analysis,
            "data_points": {
                "vessels": len(vessel_data),
                "transactions": len(transaction_data)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate fleet analysis: {str(e)}"
        )


@router.get("/anomalies")
async def detect_anomalies(authorization: str = Depends(get_current_user)):
    """
    Detect anomalies in vessel activity using AI.
    Identifies suspicious patterns, compliance issues, and potential IUU fishing.
    """
    try:
        recent_activity = await _fetch_recent_activity()
        
        xai_service = get_xai_service()
        anomalies = await xai_service.detect_anomalies(recent_activity)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "anomalies": anomalies,
            "activity_analyzed": len(recent_activity)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to detect anomalies: {str(e)}"
        )


@router.get("/compliance-report")
async def get_compliance_report(authorization: str = Depends(get_current_user)):
    """
    Generate AI-powered compliance report.
    """
    try:
        fleet_status = await _fetch_fleet_compliance_status()
        quota_data = await _fetch_quota_data()
        
        xai_service = get_xai_service()
        report = await xai_service.generate_compliance_report(fleet_status, quota_data)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "report": report,
            "fleet_status": fleet_status,
            "quota_data": quota_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate compliance report: {str(e)}"
        )


@router.get("/risk-prediction")
async def predict_risks(authorization: str = Depends(get_current_user)):
    """
    Predict potential risks using AI analysis of historical patterns.
    """
    try:
        historical_data = await _fetch_historical_data()
        current_conditions = await _fetch_current_conditions()
        
        xai_service = get_xai_service()
        predictions = await xai_service.predict_risks(historical_data, current_conditions)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "predictions": predictions
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to predict risks: {str(e)}"
        )


@router.get("/live-feed")
async def get_live_feed(
    limit: int = 50,
    authorization: str = Depends(get_current_user)
):
    """
    Get live activity feed with real-time events.
    """
    try:
        events = await _fetch_live_events(limit)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "events": events,
            "count": len(events)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch live feed: {str(e)}"
        )


@router.get("/alerts")
async def get_alerts(
    severity: str = None,
    authorization: str = Depends(get_current_user)
):
    """
    Get active alerts and warnings.
    Filter by severity: CRITICAL, HIGH, MEDIUM, LOW
    """
    try:
        alerts = await _check_alerts()
        
        if severity:
            alerts = [a for a in alerts if a.get("severity") == severity.upper()]
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "alerts": alerts,
            "count": len(alerts)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch alerts: {str(e)}"
        )


# Helper functions (mock data - replace with real database queries)

async def _fetch_active_vessels() -> List[Dict[str, Any]]:
    """Fetch active vessels from database."""
    # TODO: Replace with actual database query
    return [
        {
            "imo_number": "9234567",
            "name": "FV Ocean Star",
            "status": "fishing",
            "lat": 20.5,
            "lng": -30.2,
            "speed": 3.5,
            "catch_weight": 1200
        },
        {
            "imo_number": "9234568",
            "name": "FV Pacific Wind",
            "status": "in-transit",
            "lat": 35.8,
            "lng": 139.7,
            "speed": 12.0,
            "catch_weight": 0
        }
    ]


async def _fetch_recent_transactions() -> List[Dict[str, Any]]:
    """Fetch recent blockchain transactions."""
    return [
        {
            "operation": "CREATE_CRATE",
            "crateId": "TUNA_001",
            "weight": 2500,
            "status": "Finalized",
            "timestamp": datetime.utcnow().isoformat()
        }
    ]


async def _fetch_recent_activity() -> List[Dict[str, Any]]:
    """Fetch recent activity for anomaly detection."""
    return [
        {
            "type": "vessel_position",
            "vessel_id": "9234567",
            "lat": 20.5,
            "lng": -30.2,
            "timestamp": datetime.utcnow().isoformat()
        }
    ]


async def _check_alerts() -> List[Dict[str, Any]]:
    """Check for active alerts."""
    return [
        {
            "id": "alert_001",
            "severity": "HIGH",
            "type": "quota_warning",
            "message": "Yellowfin Tuna quota at 90%",
            "timestamp": datetime.utcnow().isoformat()
        }
    ]


async def _fetch_fleet_compliance_status() -> Dict[str, Any]:
    """Fetch fleet compliance status."""
    return {
        "total_vessels": 47,
        "compliant": 45,
        "non_compliant": 2,
        "pending_inspection": 5
    }


async def _fetch_quota_data() -> Dict[str, Any]:
    """Fetch quota usage data."""
    return {
        "yellowfin_tuna": {"used": 90, "limit": 100, "unit": "tonnes"},
        "skipjack_tuna": {"used": 65, "limit": 100, "unit": "tonnes"}
    }


async def _fetch_historical_data() -> Dict[str, Any]:
    """Fetch historical data for predictions."""
    return {
        "avg_daily_catch": 2500,
        "avg_violations_per_month": 0.5,
        "seasonal_trend": "increasing"
    }


async def _fetch_current_conditions() -> Dict[str, Any]:
    """Fetch current environmental and operational conditions."""
    return {
        "sea_temperature": 24.5,
        "weather": "clear",
        "active_vessels": 47
    }


async def _fetch_live_events(limit: int) -> List[Dict[str, Any]]:
    """Fetch live activity events."""
    return [
        {
            "id": "evt_001",
            "type": "transaction",
            "description": "New catch recorded: 2500kg Yellowfin Tuna",
            "timestamp": datetime.utcnow().isoformat(),
            "severity": "info"
        },
        {
            "id": "evt_002",
            "type": "vessel",
            "description": "Vessel FV Ocean Star entered fishing zone",
            "timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat(),
            "severity": "info"
        }
    ]


@router.post("/summarize")
async def summarize_content(
    request: SummarizeRequest,
    authorization: str = Depends(get_current_user)
):
    """
    Summarize content using xAI (Grok).
    Used for alerts and news summarization.
    """
    try:
        xai_service = get_xai_service()
        
        # Create prompt for summarization
        prompt = f"""You are a maritime operations expert. Summarize the following {request.context} in 2-3 concise sentences, highlighting the most critical information and actionable insights.

Content:
{request.content}

Provide a professional, actionable summary:"""
        
        summary = await xai_service.get_completion(prompt)
        
        return {
            "success": True,
            "summary": summary,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )
