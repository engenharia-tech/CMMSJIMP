import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Sparkles, AlertTriangle, Lightbulb, TrendingUp, Zap, FileText, Loader2, Clock, Send, User, Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { analyzeFailures, askAi } from '@/services/aiService';
import { getEquipment, getOrders } from '@/services/maintenanceService';
import { Equipment, MaintenanceOrder } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubEquipment = getEquipment(setEquipment);
    const unsubOrders = getOrders(setOrders);
    return () => {
      unsubEquipment();
      unsubOrders();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAnalyze = async () => {
    if (orders.length === 0) {
      toast.error(t('no_orders_to_analyze'));
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeFailures(orders, equipment);
      setAnalysis(result);
      toast.success(t('analysis_completed'));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('analysis_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAsking) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAsking(true);

    try {
      const response = await askAi(userMessage, orders, equipment);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao consultar IA");
      setMessages(prev => [...prev, { role: 'ai', content: "Desculpe, ocorreu um erro ao processar sua pergunta." }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <BrainCircuit className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" />
              {t('ai_analytics')}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">{t('ai_analytics_desc')}</p>
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={loading || orders.length === 0}
            className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black shadow-xl shadow-purple-900/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {t('analyze_failures')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Analysis Area */}
          <div className="lg:col-span-2 space-y-8">
            {!analysis && !loading && (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center transition-colors">
                <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 transition-colors">
                  <BrainCircuit className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{t('ready_to_analyze')}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  {t('ai_analyze_desc')}
                </p>
                <div className="grid grid-cols-3 gap-4 text-left">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors">
                    <Zap className="w-5 h-5 text-yellow-500 mb-2" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('pattern_detection')}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors">
                    <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('optimization')}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors">
                    <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('risk_prediction')}</p>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-purple-100 dark:border-purple-900/30 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin" />
                  <BrainCircuit className="w-8 h-8 text-purple-600 dark:text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{t('processing_maintenance_data')}</p>
                <p className="text-slate-500 dark:text-slate-400 animate-pulse">{t('gemini_analyzing')}</p>
              </div>
            )}

            {analysis && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Critical Summary */}
                <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-3xl text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden transition-colors">
                  <Sparkles className="absolute -right-8 -top-8 w-48 h-48 text-white/5" />
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    {t('executive_summary')}
                  </h3>
                  <p className="text-lg text-slate-300 dark:text-slate-400 leading-relaxed font-medium">
                    {analysis.critical_summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Patterns */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      {t('detected_patterns')}
                    </h3>
                    <ul className="space-y-4">
                      {analysis.patterns.map((pattern: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors">
                          <div className="w-6 h-6 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600 shrink-0 transition-colors">
                            {i + 1}
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 font-medium">{pattern}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Predictions */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      {t('failure_predictions')}
                    </h3>
                    <div className="space-y-4">
                      {analysis.predictions.map((pred: any, i: number) => (
                        <div key={i} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-red-900 dark:text-red-400">{pred.equipment}</span>
                            <span className="px-2 py-1 bg-red-600 dark:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-md">
                              {pred.risk} {t('risk')}
                            </span>
                          </div>
                          <p className="text-sm text-red-700 dark:text-red-300">{pred.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-green-500" />
                    {t('optimization_suggestions')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {analysis.suggestions.map((sug: any, i: number) => (
                      <div key={i} className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-900/30 flex flex-col h-full transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 shadow-sm transition-colors">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">{t('interval')}</p>
                            <p className="font-bold text-green-900 dark:text-green-300">{sug.interval}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-green-900 dark:text-green-300 mb-2">{sug.equipment}</p>
                        <p className="text-sm text-green-700 dark:text-green-400 flex-1">{sug.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Chat Sidebar */}
          <div className="lg:col-span-1 flex flex-col h-[600px] lg:h-[calc(100vh-200px)] sticky top-24">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-500" />
                  Consultar Especialista IA
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest mt-1">
                  Pergunte sobre equipamentos ou histórico
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                      <Bot className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Como posso ajudar?</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ex: "Quantas vezes a máquina de solda X entrou em manutenção?" ou "Quais equipamentos precisam de preventiva?"
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    msg.role === 'user' ? "flex-row-reverse" : ""
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      msg.role === 'user' ? "bg-blue-600 text-white" : "bg-purple-600 text-white"
                    )}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm max-w-[85%]",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleAsk} className="p-4 border-t border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Digite sua pergunta..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isAsking}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

