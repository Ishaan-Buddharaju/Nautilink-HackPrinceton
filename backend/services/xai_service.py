"""
xAI (Grok) Integration Service for Live Monitoring Intelligence
Provides AI-powered insights for fleet monitoring, compliance, and anomaly detection.
"""
import os
import httpx
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_BASE_URL = "https://api.x.ai/v1"
XAI_MODEL = "grok-beta"  # or "grok-2-latest"


class XAIService:
    """Service for xAI (Grok) API interactions."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or XAI_API_KEY
        self.base_url = XAI_BASE_URL
        self.model = XAI_MODEL
    
    async def analyze_fleet_activity(
        self,
        vessel_data: List[Dict[str, Any]],
        transaction_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze fleet activity and provide AI insights.
        
        Args:
            vessel_data: List of active vessel information
            transaction_data: Recent blockchain transactions
            
        Returns:
            AI-generated insights about fleet performance, anomalies, and recommendations
        """
        prompt = self._build_fleet_analysis_prompt(vessel_data, transaction_data)
        
        response = await self._chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert maritime supply chain analyst for Nautilink. Analyze vessel activity, blockchain transactions, and provide actionable insights about fleet performance, compliance issues, and potential anomalies. Be concise and focus on critical insights."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3
        )
        
        return {
            "analysis": response,
            "timestamp": self._get_timestamp(),
            "vessels_analyzed": len(vessel_data),
            "transactions_analyzed": len(transaction_data)
        }
    
    async def detect_anomalies(
        self,
        recent_activity: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Detect anomalies in vessel behavior and transactions.
        
        Args:
            recent_activity: Recent vessel positions, catches, and transactions
            
        Returns:
            AI-detected anomalies with severity levels
        """
        prompt = f"""
        Analyze the following maritime activity data and detect any anomalies:
        
        {self._format_activity_data(recent_activity)}
        
        Identify:
        1. Unusual vessel movements (entering restricted zones, erratic patterns)
        2. Suspicious catch weights or species
        3. Transaction irregularities
        4. Compliance violations
        5. Potential IUU fishing indicators
        
        For each anomaly, provide:
        - Severity (CRITICAL, HIGH, MEDIUM, LOW)
        - Description
        - Recommended action
        
        Return as structured data.
        """
        
        response = await self._chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You are a maritime compliance and security expert. Detect anomalies in fishing vessel activity with high accuracy. Focus on IUU fishing, quota violations, and suspicious patterns."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2
        )
        
        return {
            "anomalies": response,
            "timestamp": self._get_timestamp()
        }
    
    async def generate_compliance_report(
        self,
        fleet_status: Dict[str, Any],
        quota_data: Dict[str, Any]
    ) -> str:
        """
        Generate AI-powered compliance report.
        
        Args:
            fleet_status: Current fleet compliance status
            quota_data: Quota usage information
            
        Returns:
            Formatted compliance report
        """
        prompt = f"""
        Generate a compliance status report for the following fleet data:
        
        Fleet Status:
        {self._format_dict(fleet_status)}
        
        Quota Data:
        {self._format_dict(quota_data)}
        
        Include:
        1. Overall compliance score (0-100)
        2. Critical issues requiring immediate attention
        3. Quota status and projections
        4. Recommendations for maintaining compliance
        5. Risk assessment
        """
        
        response = await self._chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You are a maritime regulatory compliance expert. Generate clear, actionable compliance reports."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4
        )
        
        return response
    
    async def predict_risks(
        self,
        historical_data: Dict[str, Any],
        current_conditions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Predict potential risks based on patterns.
        
        Args:
            historical_data: Historical vessel and transaction data
            current_conditions: Current weather, vessel positions, etc.
            
        Returns:
            Risk predictions with probabilities
        """
        prompt = f"""
        Based on historical patterns and current conditions, predict potential risks:
        
        Historical Data:
        {self._format_dict(historical_data)}
        
        Current Conditions:
        {self._format_dict(current_conditions)}
        
        Predict risks for:
        1. Quota overruns (probability and timeline)
        2. Vessel safety concerns
        3. Compliance violations
        4. Supply chain disruptions
        5. Environmental impacts
        """
        
        response = await self._chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You are a predictive analytics expert for maritime operations. Analyze patterns and predict risks with estimated probabilities."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3
        )
        
        return {
            "predictions": response,
            "timestamp": self._get_timestamp()
        }
    
    async def generate_live_summary(
        self,
        system_status: Dict[str, Any]
    ) -> str:
        """
        Generate a brief live summary for the monitoring dashboard.
        
        Args:
            system_status: Current system metrics and activity
            
        Returns:
            Brief, actionable summary
        """
        prompt = f"""
        Provide a brief (2-3 sentences) real-time summary of the current system status:
        
        {self._format_dict(system_status)}
        
        Focus on the most important metrics and any urgent items.
        """
        
        response = await self._chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You are a real-time monitoring assistant. Provide ultra-concise, actionable summaries."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=150
        )
        
        return response
    
    async def get_completion(
        self,
        prompt: str,
        temperature: float = 0.5,
        max_tokens: int = 500
    ) -> str:
        """
        Get a simple completion from xAI.
        
        Args:
            prompt: User prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            
        Returns:
            AI response text
        """
        return await self._chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
    
    async def _chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """
        Call xAI chat completion API (OpenAI-compatible).
        
        Args:
            messages: Chat messages
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            
        Returns:
            AI response text
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                        "stream": False
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    print(f"xAI API error: {response.status_code} - {response.text}")
                    return f"Error: Unable to generate AI insights (Status: {response.status_code})"
                    
        except Exception as e:
            print(f"xAI API exception: {str(e)}")
            return f"Error: {str(e)}"
    
    def _build_fleet_analysis_prompt(
        self,
        vessel_data: List[Dict[str, Any]],
        transaction_data: List[Dict[str, Any]]
    ) -> str:
        """Build prompt for fleet analysis."""
        return f"""
        Analyze the following maritime fleet data:
        
        Active Vessels: {len(vessel_data)}
        {self._format_vessel_summary(vessel_data)}
        
        Recent Transactions: {len(transaction_data)}
        {self._format_transaction_summary(transaction_data)}
        
        Provide:
        1. Overall fleet performance summary
        2. Key metrics and trends
        3. Notable activities or concerns
        4. Recommendations for fleet managers
        """
    
    def _format_vessel_summary(self, vessels: List[Dict[str, Any]]) -> str:
        """Format vessel data for prompt."""
        if not vessels:
            return "No active vessels"
        
        summary = []
        for v in vessels[:10]:  # Limit to first 10
            summary.append(
                f"- Vessel {v.get('imo_number', 'Unknown')}: "
                f"{v.get('status', 'unknown')} at ({v.get('lat', 0)}, {v.get('lng', 0)})"
            )
        
        if len(vessels) > 10:
            summary.append(f"... and {len(vessels) - 10} more vessels")
        
        return "\n".join(summary)
    
    def _format_transaction_summary(self, transactions: List[Dict[str, Any]]) -> str:
        """Format transaction data for prompt."""
        if not transactions:
            return "No recent transactions"
        
        summary = []
        for tx in transactions[:10]:  # Limit to first 10
            summary.append(
                f"- {tx.get('operation', 'UNKNOWN')}: "
                f"{tx.get('crateId', 'N/A')} ({tx.get('weight', 0)}g) "
                f"- {tx.get('status', 'unknown')}"
            )
        
        if len(transactions) > 10:
            summary.append(f"... and {len(transactions) - 10} more transactions")
        
        return "\n".join(summary)
    
    def _format_activity_data(self, activity: List[Dict[str, Any]]) -> str:
        """Format activity data for anomaly detection."""
        return "\n".join([str(item) for item in activity[:20]])
    
    def _format_dict(self, data: Dict[str, Any]) -> str:
        """Format dictionary data for prompts."""
        return "\n".join([f"{k}: {v}" for k, v in data.items()])
    
    def _get_timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime
        return datetime.utcnow().isoformat()


# Singleton instance
_xai_service: Optional[XAIService] = None


def get_xai_service() -> XAIService:
    """Get or create xAI service instance."""
    global _xai_service
    if _xai_service is None:
        _xai_service = XAIService()
    return _xai_service
