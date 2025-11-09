'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { FiActivity, FiAlertCircle, FiCheckCircle, FiRefreshCw, FiMic, FiMicOff, FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiAlertOctagon, FiInfo, FiFileText, FiDollarSign, FiSettings, FiGlobe, FiZap } from 'react-icons/fi';

// ElevenLabs Agent ID
const ELEVENLABS_AGENT_ID = "agent_3401k9m6k2f7fv78tav8pd9x79ca";

interface MonitoringMetrics {
  active_vessels: number;
  fishing_vessels: number;
  transactions_today: number;
  active_alerts: number;
  system_health: string;
  blockchain_sync: string;
}

interface Alert {
  id: string;
  severity: string;
  type: string;
  message: string;
  timestamp: string;
  vessel_id?: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  category: 'regulation' | 'market' | 'technology' | 'sustainability';
  impact: 'high' | 'medium' | 'low';
}

interface LiveEvent {
  id: string;
  type: 'transaction' | 'vessel' | 'alert';
  description: string;
  timestamp: string;
}

export default function LiveMonitoringPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'alert-1',
      severity: 'CRITICAL',
      type: 'Quota Violation',
      message: 'Vessel IMO-8742156 has exceeded daily bluefin tuna quota by 340kg. Immediate action required to prevent regulatory penalties and potential fishing license suspension.',
      timestamp: new Date().toISOString(),
      vessel_id: 'IMO-8742156'
    },
    {
      id: 'alert-2',
      severity: 'HIGH',
      type: 'Unauthorized Zone Entry',
      message: 'Vessel "Northern Star" detected entering Marine Protected Area (MPA-EU-047) without proper authorization. Blockchain verification shows no valid permits on record.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      vessel_id: 'IMO-9234871'
    },
    {
      id: 'alert-3',
      severity: 'CRITICAL',
      type: 'Equipment Failure',
      message: 'Critical refrigeration system failure reported on vessel "Pacific Guardian". Cargo of 2.4 tons premium yellowfin tuna at risk. Estimated loss: $87,000 if not resolved within 4 hours.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      vessel_id: 'IMO-7891234'
    },
    {
      id: 'alert-4',
      severity: 'HIGH',
      type: 'Blockchain Mismatch',
      message: 'Catch weight discrepancy detected: Reported 1,850kg vs. blockchain verified 2,340kg. Investigation required for potential fraud or reporting error on transaction TX-2024-11-09-847.',
      timestamp: new Date(Date.now() - 5400000).toISOString(),
      vessel_id: 'IMO-8523697'
    },
    {
      id: 'alert-5',
      severity: 'MEDIUM',
      type: 'Compliance Deadline',
      message: 'New EU sustainability certification deadline approaching in 72 hours. 12 vessels in fleet still pending required documentation for continued operation in EU waters.',
      timestamp: new Date(Date.now() - 7200000).toISOString()
    }
  ]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([
    {
      id: '1',
      title: 'New EU Fishing Regulations Take Effect',
      summary: 'Updated catch quotas and sustainability requirements now mandatory for all vessels operating in EU waters. Compliance tracking via blockchain required.',
      source: 'Maritime Regulatory Authority',
      timestamp: new Date().toISOString(),
      category: 'regulation',
      impact: 'high'
    },
    {
      id: '2',
      title: 'Blockchain Traceability Improves Supply Chain Transparency',
      summary: 'New study shows 40% reduction in illegal fishing through real-time blockchain verification systems.',
      source: 'Ocean Conservation Network',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      category: 'technology',
      impact: 'high'
    },
    {
      id: '3',
      title: 'Tuna Prices Surge 15% in Global Markets',
      summary: 'Strong demand from Asian markets drives prices up. Sustainable catch certification seeing premium pricing.',
      source: 'Global Fish Market Report',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      category: 'market',
      impact: 'medium'
    },
    {
      id: '4',
      title: 'AI-Powered Vessel Monitoring Reduces Fuel Costs',
      summary: 'Fleet operators report 20% fuel savings using AI route optimization and real-time weather analytics.',
      source: 'Maritime Technology Journal',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      category: 'technology',
      impact: 'medium'
    },
    {
      id: '5',
      title: 'Marine Protected Areas Expand by 25%',
      summary: 'International agreement adds 2 million square kilometers to protected ocean zones. New tracking requirements for vessels.',
      source: 'International Maritime Organization',
      timestamp: new Date(Date.now() - 14400000).toISOString(),
      category: 'sustainability',
      impact: 'high'
    }
  ]);
  const [fleetAnalysis, setFleetAnalysis] = useState<string>('');
  const [isVoiceActive, setIsVoiceActive] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'agent', message: string, timestamp: Date}>>([]);
  const [alertsSummary, setAlertsSummary] = useState<string>('');
  const [newsSummary, setNewsSummary] = useState<string>('');
  const [isSummarizingAlerts, setIsSummarizingAlerts] = useState(false);
  const [isSummarizingNews, setIsSummarizingNews] = useState(false);
  
  const conversationRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformData = useRef<number[]>(new Array(128).fill(0));

  // Get access token
  useEffect(() => {
    const getToken = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
      }
    };
    if (user) {
      getToken();
    }
  }, [user]);

  // Fetch monitoring data
  const fetchMonitoringData = useCallback(async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch('http://127.0.0.1:8000/monitoring/status', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setAiSummary(data.ai_summary);
        setAlerts(data.alerts || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    }
  }, [accessToken]);

  // Fetch live feed
  const fetchLiveFeed = useCallback(async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch('http://127.0.0.1:8000/monitoring/live-feed?limit=20', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLiveEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch live feed:', error);
    }
  }, [accessToken]);

  // Fetch fleet analysis
  const fetchFleetAnalysis = useCallback(async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch('http://127.0.0.1:8000/monitoring/fleet-analysis', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFleetAnalysis(data.analysis?.analysis || '');
      }
    } catch (error) {
      console.error('Failed to fetch fleet analysis:', error);
    }
  }, [accessToken]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchMonitoringData(),
      fetchLiveFeed(),
      fetchFleetAnalysis()
    ]);
    setIsRefreshing(false);
  }, [fetchMonitoringData, fetchLiveFeed, fetchFleetAnalysis]);

  // Initial data fetch
  useEffect(() => {
    if (user && accessToken) {
      refreshAll();
    }
  }, [user, accessToken, refreshAll]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user || !accessToken) return;
    
    const interval = setInterval(() => {
      fetchMonitoringData();
      fetchLiveFeed();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user, accessToken, fetchMonitoringData, fetchLiveFeed]);

  // Professional Audio Visualization with Canvas
  const startAudioVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const canvas = canvasRef.current;
      
      const animate = () => {
        if (!canvas) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        analyser.getByteTimeDomainData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel((average - 128) / 128);
        
        // Clear canvas with fade effect
        ctx.fillStyle = 'rgba(10, 10, 10, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00d9ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00d9ff';
        ctx.beginPath();
        
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          
          x += sliceWidth;
        }
        
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        
        // Draw frequency bars
        analyser.getByteFrequencyData(dataArray);
        const barCount = 64;
        const barWidth = canvas.width / barCount;
        
        for (let i = 0; i < barCount; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
          const hue = (i / barCount) * 60 + 180; // Blue to cyan gradient
          
          ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.6)`;
          ctx.fillRect(
            i * barWidth,
            canvas.height - barHeight,
            barWidth - 2,
            barHeight
          );
        }
        
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animate();
    } catch (error) {
      console.error('Failed to start audio visualization:', error);
    }
  }, []);

  const stopAudioVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setAudioLevel(0);
  }, []);

  // Auto-start Agent Brady on mount
  useEffect(() => {
    if (user && accessToken) {
      startAudioVisualization();
      setAgentStatus('listening');
      setConversationHistory([{
        role: 'agent',
        message: "Agent Brady online. Maritime command center ready. All systems operational.",
        timestamp: new Date()
      }]);
    }
  }, [user, accessToken]);

  // Agent Brady - Voice Agent Integration
  const startVoiceSession = useCallback(async () => {
    try {
      setAgentStatus('listening');
      await startAudioVisualization();
      
      // Initialize ElevenLabs Conversational AI for Agent Brady
      const { Conversation } = await import('@elevenlabs/client');
      
      const conversation = await Conversation.startSession({
        agentId: ELEVENLABS_AGENT_ID,
        onConnect: () => {
          console.log('Agent Brady connected');
          setIsVoiceActive(true);
          setConversationHistory(prev => [{
            role: 'agent',
            message: "Agent Brady online. Maritime command center ready. How can I assist with fleet monitoring?",
            timestamp: new Date()
          }, ...prev]);
        },
        onDisconnect: () => {
          console.log('Agent Brady disconnected');
          setIsVoiceActive(false);
          setAgentStatus('idle');
        },
        onMessage: (message: any) => {
          console.log('Agent Brady:', message);
          
          if (message.type === 'user_transcript') {
            setConversationHistory(prev => [{
              role: 'user',
              message: message.text,
              timestamp: new Date()
            }, ...prev]);
            setAgentStatus('thinking');
          }
          
          if (message.type === 'agent_response') {
            setConversationHistory(prev => [{
              role: 'agent',
              message: message.text,
              timestamp: new Date()
            }, ...prev]);
            setAgentStatus('speaking');
            
            // Parse commands from Agent Brady
            handleVoiceCommand(message.text);
          }
          
          if (message.type === 'audio_end') {
            setAgentStatus('listening');
          }
        },
        onError: (error: any) => {
          console.error('Agent Brady error:', error);
          setIsVoiceActive(false);
          setAgentStatus('idle');
        }
      });
      
      conversationRef.current = conversation;
    } catch (error) {
      console.error('Failed to start Agent Brady:', error);
      setAgentStatus('idle');
    }
  }, [startAudioVisualization]);

  const stopVoiceSession = useCallback(() => {
    if (conversationRef.current) {
      conversationRef.current.endSession();
      conversationRef.current = null;
    }
    stopAudioVisualization();
    setIsVoiceActive(false);
    setAgentStatus('idle');
    setConversationHistory(prev => [{
      role: 'agent',
      message: "Agent Brady signing off. Command center standing by.",
      timestamp: new Date()
    }, ...prev]);
  }, [stopAudioVisualization]);

  const toggleVoice = useCallback(() => {
    if (isVoiceActive) {
      stopVoiceSession();
    } else {
      startVoiceSession();
    }
  }, [isVoiceActive, startVoiceSession, stopVoiceSession]);

  // Handle voice commands
  const handleVoiceCommand = useCallback((command: string) => {
    const cmd = command.toLowerCase();
    
    // Agent Brady understands maritime monitoring commands
    if (cmd.includes('refresh') || cmd.includes('update') || cmd.includes('reload')) {
      refreshAll();
    } else if (cmd.includes('alert') || cmd.includes('warning') || cmd.includes('critical')) {
      document.getElementById('alerts-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (cmd.includes('fleet') || cmd.includes('vessel')) {
      fetchFleetAnalysis();
    } else if (cmd.includes('transaction') || cmd.includes('blockchain')) {
      fetchMonitoringData();
    } else if (cmd.includes('anomaly') || cmd.includes('suspicious')) {
      // Trigger anomaly detection
      fetch('http://127.0.0.1:8000/monitoring/anomalies', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }).then(res => res.json()).then(data => {
        console.log('Anomalies:', data);
      });
    }
  }, [refreshAll, fetchFleetAnalysis, fetchMonitoringData, accessToken]);

  // Summarize alerts with xAI
  const summarizeAlerts = useCallback(async () => {
    if (!accessToken || alerts.length === 0) return;
    
    setIsSummarizingAlerts(true);
    try {
      const alertsText = alerts.map(a => `${a.severity} - ${a.type}: ${a.message}`).join('\n\n');
      
      const response = await fetch('http://127.0.0.1:8000/monitoring/summarize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: alertsText,
          context: 'critical maritime alerts'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlertsSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to summarize alerts:', error);
    } finally {
      setIsSummarizingAlerts(false);
    }
  }, [accessToken, alerts]);

  // Summarize news with xAI
  const summarizeNews = useCallback(async () => {
    if (!accessToken || newsItems.length === 0) return;
    
    setIsSummarizingNews(true);
    try {
      const newsText = newsItems.map(n => `${n.title}\n${n.summary}\nSource: ${n.source}`).join('\n\n');
      
      const response = await fetch('http://127.0.0.1:8000/monitoring/summarize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newsText,
          context: 'maritime industry news'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setNewsSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to summarize news:', error);
    } finally {
      setIsSummarizingNews(false);
    }
  }, [accessToken, newsItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#171717]">
        <div className="text-[#e0f2fd]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] text-[#e0f2fd] p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div />
        
        <div className="flex items-center gap-4">
          {/* Agent Brady Voice Control */}
          <button
            onClick={toggleVoice}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              isVoiceActive
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-[#4662ab] hover:bg-[#5773bc] text-white'
            }`}
          >
            {isVoiceActive ? (
              <>
                <FiMicOff className="w-5 h-5" />
                <span>Disconnect Agent Brady</span>
              </>
            ) : (
              <>
                <FiMic className="w-5 h-5" />
                <span>🎙️ Activate Agent Brady</span>
              </>
            )}
          </button>

          <div className="text-sm text-[#c0d9ef] bg-[rgba(23,23,23,0.92)] px-4 py-2 rounded-lg border border-[rgba(198,218,236,0.35)]">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* AGENT BRADY - COMMAND CENTER INTERFACE - ALWAYS VISIBLE */}
      <div className="mb-8 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 blur-3xl animate-pulse" />
          
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-cyan-400/50 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden">
            {/* Animated border glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-[shimmer_2s_infinite]" />
            
            <div className="relative p-8">
              {/* Header Section */}
              <div className="flex items-start gap-6 mb-6">
                {/* Advanced Avatar with Animations */}
                <div className="relative flex-shrink-0">
                  {/* Outer pulsing ring */}
                  <div className={`absolute inset-0 rounded-full blur-xl ${
                    agentStatus === 'listening' ? 'bg-green-400/60 animate-pulse' :
                    agentStatus === 'thinking' ? 'bg-yellow-400/60 animate-pulse' :
                    agentStatus === 'speaking' ? 'bg-cyan-400/60 animate-pulse' :
                    'bg-cyan-400/30'
                  }`} />
                  
                  {/* Middle ring */}
                  <div className={`absolute -inset-2 rounded-full border-2 ${
                    agentStatus === 'listening' ? 'border-green-400 animate-spin-slow' :
                    agentStatus === 'thinking' ? 'border-yellow-400 animate-spin' :
                    agentStatus === 'speaking' ? 'border-cyan-400 animate-spin-slow' :
                    'border-cyan-400/50'
                  }`} style={{ animationDuration: '3s' }} />
                  
                  {/* Avatar circle */}
                  <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-1 shadow-2xl ${
                    agentStatus !== 'idle' ? 'animate-pulse' : ''
                  }`}>
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                      {/* Custom AI Brain SVG */}
                      <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="28" stroke="url(#gradient1)" strokeWidth="2" />
                        <path d="M20 32 L28 28 L36 32 L44 28" stroke="url(#gradient2)" strokeWidth="2" strokeLinecap="round" />
                        <path d="M20 40 L28 36 L36 40 L44 36" stroke="url(#gradient2)" strokeWidth="2" strokeLinecap="round" />
                        <path d="M20 24 L28 20 L36 24 L44 20" stroke="url(#gradient2)" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="22" cy="26" r="3" fill="#00d9ff" className="animate-pulse" />
                        <circle cx="42" cy="26" r="3" fill="#00d9ff" className="animate-pulse" />
                        <circle cx="32" cy="18" r="3" fill="#a855f7" className="animate-pulse" />
                        <defs>
                          <linearGradient id="gradient1" x1="0" y1="0" x2="64" y2="64">
                            <stop offset="0%" stopColor="#00d9ff" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                          <linearGradient id="gradient2" x1="0" y1="0" x2="64" y2="0">
                            <stop offset="0%" stopColor="#00d9ff" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className={`absolute -bottom-2 -right-2 px-3 py-1.5 rounded-full font-bold text-xs shadow-lg ${
                    agentStatus === 'listening' ? 'bg-green-500 text-white' :
                    agentStatus === 'thinking' ? 'bg-yellow-500 text-black' :
                    agentStatus === 'speaking' ? 'bg-cyan-500 text-white' :
                    'bg-slate-700 text-white'
                  }`}>
                    {agentStatus === 'listening' ? '● REC' : 
                     agentStatus === 'thinking' ? '● PROC' : 
                     agentStatus === 'speaking' ? '● LIVE' : 
                     '○ IDLE'}
                  </div>
                </div>

                {/* Agent Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        AGENT BRADY
                      </h2>
                      <p className={`text-sm font-mono mt-1 ${
                        agentStatus === 'listening' ? 'text-green-400' :
                        agentStatus === 'thinking' ? 'text-yellow-400' :
                        agentStatus === 'speaking' ? 'text-cyan-400' :
                        'text-slate-400'
                      }`}>
                        {agentStatus === 'listening' ? '► AUDIO INPUT ACTIVE' :
                         agentStatus === 'thinking' ? '► NEURAL PROCESSING' :
                         agentStatus === 'speaking' ? '► TRANSMITTING RESPONSE' :
                         '► STANDBY MODE'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/50 rounded-full text-xs font-mono text-cyan-300">
                        MARITIME OPS
                      </div>
                      <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/50 rounded-full text-xs font-mono text-cyan-300">
                        AI EXPERT
                      </div>
                    </div>
                  </div>
                  
                  {/* System stats */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-center">
                      <div className="text-xs text-slate-400 font-mono">VESSELS</div>
                      <div className="text-lg font-bold text-cyan-400">{metrics?.active_vessels || 0}</div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-center">
                      <div className="text-xs text-slate-400 font-mono">TX/DAY</div>
                      <div className="text-lg font-bold text-cyan-400">{metrics?.transactions_today || 0}</div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-center">
                      <div className="text-xs text-slate-400 font-mono">ALERTS</div>
                      <div className="text-lg font-bold text-yellow-400">{metrics?.active_alerts || 0}</div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-center">
                      <div className="text-xs text-slate-400 font-mono">SYNC</div>
                      <div className="text-lg font-bold text-green-400">●</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PROFESSIONAL WAVEFORM VISUALIZATION */}
              <div className="bg-black/50 rounded-xl p-4 border border-cyan-400/30 shadow-inner mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-cyan-400">◆ AUDIO SPECTRUM ANALYZER</span>
                  <span className="text-xs font-mono text-slate-400">LEVEL: {Math.round(Math.abs(audioLevel) * 100)}%</span>
                </div>
                <canvas 
                  ref={canvasRef}
                  width={1200}
                  height={200}
                  className="w-full h-48 rounded-lg"
                  style={{ backgroundColor: '#0a0a0a' }}
                />
              </div>

              {/* Conversation Transcript */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                <div className="text-xs font-mono text-slate-400 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  CONVERSATION TRANSCRIPT
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {conversationHistory.slice(0, 5).map((msg, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${
                      msg.role === 'agent' 
                        ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-100' 
                        : 'bg-blue-500/10 border-blue-400/30 text-blue-100'
                    }`}>
                      <div className="flex items-start gap-2">
                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                          msg.role === 'agent' ? 'bg-cyan-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                          {msg.role === 'agent' ? 'BRADY' : 'USER'}
                        </div>
                        <div className="flex-1 text-sm">{msg.message}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {msg.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* AI Summary Card */}
      {aiSummary && (
        <div className="mb-8 p-6 bg-[rgba(70,98,171,0.15)] border border-[rgba(70,98,171,0.35)] rounded-xl">
          <div className="flex items-start gap-3">
            <FiActivity className="w-6 h-6 text-[#4662ab] flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-[18px] font-bold mb-2">AI-Powered Insights</h3>
              <p className="text-[#e0f2fd] text-[14px] leading-relaxed">{aiSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Active Vessels"
            value={metrics.active_vessels}
            subtitle={`${metrics.fishing_vessels} fishing`}
            icon="🚢"
          />
          <MetricCard
            title="Transactions Today"
            value={metrics.transactions_today}
            subtitle="Blockchain verified"
            icon="⛓️"
          />
          <MetricCard
            title="Active Alerts"
            value={metrics.active_alerts}
            subtitle={metrics.active_alerts > 0 ? 'Requires attention' : 'All clear'}
            icon="⚠️"
            isAlert={metrics.active_alerts > 0}
          />
          <MetricCard
            title="System Health"
            value={metrics.system_health}
            subtitle="All systems operational"
            icon="💚"
            isStatus
          />
          <MetricCard
            title="Blockchain Status"
            value={metrics.blockchain_sync}
            subtitle="Real-time sync"
            icon="🔗"
            isStatus
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Critical Alerts Section */}
        <div id="alerts-section" className="bg-[rgba(23,23,23,0.92)] border border-[rgba(198,218,236,0.35)] rounded-xl p-6 backdrop-blur-lg shadow-xl shadow-[rgba(70,98,171,0.25)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold flex items-center gap-2">
              <div className="p-2 bg-[rgba(70,98,171,0.15)] rounded-lg">
                <FiAlertCircle className="text-[#4662ab]" />
              </div>
              Critical Alerts
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[12px] text-[#c0d9ef]">{alerts.length} Active</span>
            </div>
          </div>
          
          {/* xAI Summarize Button */}
          <button
            onClick={summarizeAlerts}
            disabled={isSummarizingAlerts || alerts.length === 0}
            className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4662ab] hover:bg-[#5773bc] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiZap className="w-4 h-4" />
            <span className="text-[14px] font-semibold">
              {isSummarizingAlerts ? 'Analyzing with xAI...' : 'Summarize Alerts with xAI'}
            </span>
          </button>
          
          {/* xAI Summary Display */}
          {alertsSummary && (
            <div className="mb-4 p-4 bg-[rgba(70,98,171,0.15)] border border-[rgba(70,98,171,0.35)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiZap className="w-4 h-4 text-[#4662ab]" />
                <span className="text-[12px] font-bold text-[#4662ab] uppercase">xAI Analysis</span>
              </div>
              <p className="text-[14px] text-[#e0f2fd] leading-relaxed">{alertsSummary}</p>
            </div>
          )}
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                  <FiCheckCircle className="relative w-16 h-16 text-green-400" />
                </div>
                <p className="text-lg font-semibold text-[#e0f2fd] mb-2">All Systems Operational</p>
                <p className="text-sm text-[#c0d9ef]">No critical alerts detected</p>
              </div>
            )}
          </div>
        </div>

        {/* Maritime News Feed */}
        <div className="bg-[rgba(23,23,23,0.92)] border border-[rgba(198,218,236,0.35)] rounded-xl p-6 backdrop-blur-lg shadow-xl shadow-[rgba(70,98,171,0.25)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold flex items-center gap-2">
              <div className="p-2 bg-[rgba(70,98,171,0.15)] rounded-lg">
                <FiActivity className="text-[#4662ab]" />
              </div>
              Maritime Industry News
            </h2>
            <div className="text-[12px] text-[#c0d9ef] bg-[rgba(70,98,171,0.2)] px-3 py-1 rounded-full">
              Live Updates
            </div>
          </div>
          
          {/* xAI Summarize Button */}
          <button
            onClick={summarizeNews}
            disabled={isSummarizingNews || newsItems.length === 0}
            className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4662ab] hover:bg-[#5773bc] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiZap className="w-4 h-4" />
            <span className="text-[14px] font-semibold">
              {isSummarizingNews ? 'Analyzing with xAI...' : 'Summarize News with xAI'}
            </span>
          </button>
          
          {/* xAI Summary Display */}
          {newsSummary && (
            <div className="mb-4 p-4 bg-[rgba(70,98,171,0.15)] border border-[rgba(70,98,171,0.35)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiZap className="w-4 h-4 text-[#4662ab]" />
                <span className="text-[12px] font-bold text-[#4662ab] uppercase">xAI Analysis</span>
              </div>
              <p className="text-[14px] text-[#e0f2fd] leading-relaxed">{newsSummary}</p>
            </div>
          )}
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {newsItems.map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>
        </div>
      </div>

      {/* Fleet Analysis */}
      {fleetAnalysis && (
        <div className="mt-8 bg-[rgba(23,23,23,0.92)] border border-[rgba(198,218,236,0.35)] rounded-xl p-6 backdrop-blur-lg shadow-xl shadow-[rgba(70,98,171,0.25)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-[#4662ab]/10 rounded-lg">
              <FiActivity className="text-[#4662ab]" />
            </div>
            <h2 className="text-[18px] font-bold">Fleet Analysis</h2>
          </div>
          <p className="text-[#d2deea] text-[14px] leading-relaxed whitespace-pre-wrap">{fleetAnalysis}</p>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, subtitle, icon, isAlert = false, isStatus = false }: any) {
  return (
    <div className={`p-6 rounded-xl border transition-all ${
      isAlert 
        ? 'bg-orange-900/20 border-orange-500/50' 
        : 'bg-[#1a1a1a] border-[rgba(198,218,236,0.22)] hover:border-[#4662ab]'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-[#c0d9ef]">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-3xl font-bold mb-1 ${
        isStatus ? 'capitalize' : ''
      }`}>
        {value}
      </div>
      <div className="text-sm text-[#c0d9ef]">{subtitle}</div>
    </div>
  );
}

// Enhanced Alert Card Component
function AlertCard({ alert }: { alert: Alert }) {
  const severityConfig = {
    CRITICAL: { 
      bg: 'bg-gradient-to-r from-red-900/40 to-red-800/20', 
      border: 'border-red-500/50',
      icon: FiAlertOctagon,
      textColor: 'text-red-400',
      glow: 'shadow-red-500/20'
    },
    HIGH: { 
      bg: 'bg-gradient-to-r from-orange-900/40 to-orange-800/20', 
      border: 'border-orange-500/50',
      icon: FiAlertTriangle,
      textColor: 'text-orange-400',
      glow: 'shadow-orange-500/20'
    },
    MEDIUM: { 
      bg: 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/20', 
      border: 'border-yellow-500/50',
      icon: FiAlertCircle,
      textColor: 'text-yellow-400',
      glow: 'shadow-yellow-500/20'
    },
    LOW: { 
      bg: 'bg-gradient-to-r from-blue-900/40 to-blue-800/20', 
      border: 'border-blue-500/50',
      icon: FiInfo,
      textColor: 'text-blue-400',
      glow: 'shadow-blue-500/20'
    }
  };

  const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.LOW;

  return (
    <div className={`${config.bg} ${config.border} ${config.glow} border-2 rounded-xl p-5 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] cursor-pointer`}>
      <div className="flex gap-4">
        {/* Icon Section */}
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 flex items-center justify-center bg-black/30 rounded-lg border border-white/10 ${config.textColor}`}>
            <config.icon size={28} />
          </div>
        </div>
        
        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${config.textColor} uppercase px-2 py-1 bg-black/30 rounded`}>
                {alert.severity}
              </span>
              <span className="text-xs text-[#c0d9ef] bg-black/20 px-2 py-1 rounded">
                {alert.type}
              </span>
            </div>
            <div className="text-xs text-[#c0d9ef]/60 font-mono">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <p className="text-sm text-[#e0f2fd] leading-relaxed mb-3">
            {alert.message}
          </p>
          {alert.vessel_id && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#c0d9ef]/60">Vessel ID:</span>
              <span className="text-cyan-400 font-mono bg-black/20 px-2 py-0.5 rounded">
                {alert.vessel_id}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// News Card Component
function NewsCard({ news }: { news: NewsItem }) {
  const categoryConfig = {
    regulation: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: FiFileText },
    market: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: FiDollarSign },
    technology: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: FiSettings },
    sustainability: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: FiGlobe }
  };

  const impactColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/40',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/40'
  };

  const config = categoryConfig[news.category];
  const impactClass = impactColors[news.impact];

  return (
    <div className="bg-gradient-to-br from-[rgba(23,23,23,0.6)] to-[rgba(23,23,23,0.3)] border border-[rgba(198,218,236,0.2)] rounded-xl p-5 hover:border-cyan-400/40 transition-all hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer">
      <div className="flex gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 ${config.bg} ${config.border} border rounded-lg flex items-center justify-center ${config.color}`}>
            <config.icon size={24} />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-base font-bold text-[#e0f2fd] leading-tight pr-2">
              {news.title}
            </h3>
            <span className={`text-xs font-semibold px-2 py-1 rounded border ${impactClass} whitespace-nowrap`}>
              {news.impact.toUpperCase()}
            </span>
          </div>
          
          <p className="text-sm text-[#c0d9ef] leading-relaxed mb-3">
            {news.summary}
          </p>
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`${config.color} font-semibold uppercase tracking-wide`}>
                {news.category}
              </span>
              <span className="text-[#c0d9ef]/40">•</span>
              <span className="text-[#c0d9ef]/60">{news.source}</span>
            </div>
            <span className="text-[#c0d9ef]/50 font-mono">
              {new Date(news.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Live Event Card Component
function LiveEventCard({ event }: { event: LiveEvent }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#171717] border border-[rgba(198,218,236,0.15)] hover:border-[#4662ab] transition-colors">
      <div className="text-2xl flex-shrink-0">
        {event.type === 'transaction' ? '⛓️' : event.type === 'vessel' ? '🚢' : '📍'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#e0f2fd]">{event.description}</p>
        <div className="text-xs text-[#c0d9ef] mt-1">
          {new Date(event.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
