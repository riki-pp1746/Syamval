import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import { 
  LayoutDashboard, Users, AlertTriangle, TrendingUp, Search, 
  Download, RefreshCcw, CheckCircle2, ChevronRight, Edit3, Trash2, 
  Sparkles, X, Save, Upload, FileText, Database, ShieldCheck, Play, 
  Moon, Sun, Info, ExternalLink, Filter
} from 'lucide-react';

// Audit rules (ported from Python)
const AUDIT_RULES = [
  {"id": "AUDIT-COD-01", "case": "Typhoid pada Kehamilan", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["A010"]}, {"operator": "OR", "codes": ["O98", "O988"]}]}, "warning": "Koreksi Koding: Jika tidak ada penyulit lain, pengkodean tifoid pada kehamilan HARUS menggunakan O98.8 sebagai Diagnosis Utama dan A01.0 sebagai Diagnosis Sekunder."},
  {"id": "AUDIT-COD-03", "case": "Batu Saluran Kemih dengan ISK", "condition": {"type": "grouped", "operator": "AND", "groups": [{"operator": "OR", "codes": ["N20", "N21", "N22", "N23"]}, {"operator": "OR", "codes": ["N390"]}]}, "warning": "Kaidah Excludes: ISK (N39.0) SUDAH INCLUDE dalam Batu Saluran Kemih (N20-N23). ISK tidak boleh ditagihkan sebagai diagnosis sekunder terpisah."},
  // Add more rules as needed...
];

const TOPUP_RULES = [
  {"item": "Streptokinase", "layanan": "1", "cbgs": ["I410I", "I410II", "I410III"], "diags": ["I210", "I211", "I212", "I213", "I214", "I219", "I233"], "procs": ["9910"], "tarif": 4850700, "category": "sp"},
  // Add more rules...
];

const App = () => {
  const [view, setView] = useState('upload'); // Start with upload view
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeTab, setActiveTab] = useState('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [txtData, setTxtData] = useState([]);
  const [pendingData, setPendingData] = useState([]);
  const [syamvalData, setSyamvalData] = useState([]);

  // Utility functions
  const normalizeCode = (code) => {
    return (code || '').toString().toUpperCase().replace(/\./g, '').trim();
  };

  const parseTSV = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split('\t');
    return lines.slice(1).map(line => {
      const values = line.split('\t');
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });
  };

  const parseExcel = async (file) => {
    // Simple CSV parser for demo (in real app, use a library like xlsx)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) resolve([]);
        
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj = {};
          headers.forEach((header, index) => {
            obj[header.trim()] = values[index]?.trim() || '';
          });
          return obj;
        });
        resolve(data);
      };
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (e, fileType) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setProcessing(true);
    
    for (const file of files) {
      try {
        let parsedData = [];
        
        if (file.name.toLowerCase().endsWith('.txt')) {
          const text = await file.text();
          parsedData = parseTSV(text);
          setTxtData(prev => [...prev, ...parsedData]);
        } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
          if (file.name.toLowerCase().includes('pending')) {
            parsedData = await parseExcel(file);
            setPendingData(prev => [...prev, ...parsedData]);
          } else if (file.name.toLowerCase().includes('syamval')) {
            parsedData = await parseExcel(file);
            setSyamvalData(prev => [...prev, ...parsedData]);
          }
        }
        
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          type: fileType,
          size: file.size,
          records: parsedData.length
        }]);
        
      } catch (error) {
        console.error('Error parsing file:', error);
        alert(`Error parsing ${file.name}: ${error.message}`);
      }
    }
    
    setProcessing(false);
  };

  const checkAuditRule = (row, rule) => {
    const diagCodes = (row.DIAGLIST_TXT || '').split(';').map(normalizeCode);
    const procCodes = (row.PROCLIST_TXT || '').split(';').map(normalizeCode);
    const allCodes = [...diagCodes, ...procCodes];

    if (rule.condition.type === 'simple') {
      return rule.condition.operator === 'OR' 
        ? rule.condition.codes.some(code => allCodes.includes(normalizeCode(code)))
        : rule.condition.codes.every(code => allCodes.includes(normalizeCode(code)));
    } else if (rule.condition.type === 'grouped') {
      const results = rule.condition.groups.map(group => {
        const groupCodes = group.codes.map(normalizeCode);
        return group.operator === 'OR'
          ? groupCodes.some(code => allCodes.includes(code))
          : groupCodes.every(code => allCodes.includes(code));
      });
      return rule.condition.operator === 'AND' 
        ? results.every(r => r) 
        : results.some(r => r);
    }
    return false;
  };

  const processAuditData = async (txtData, pendingData = [], syamvalData = []) => {
    setProcessing(true);
    setIsAuditing(true);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const auditFindings = [];
    const topupFindings = [];
    const discrepancies = [];
    const pendingCases = [];

    txtData.forEach(row => {
      // Check audit rules
      AUDIT_RULES.forEach(rule => {
        if (checkAuditRule(row, rule)) {
          auditFindings.push({
            SEP: row.SEP,
            DIAGNOSIS: row.DIAGLIST_TXT,
            PROCEDURE: row.PROCLIST_TXT,
            AUDIT_CODE: rule.id,
            WARNING: rule.warning,
            STATUS: 'Pending'
          });
        }
      });

      // Check topup rules
      TOPUP_RULES.forEach(rule => {
        const diagCodes = (row.DIAGLIST_TXT || '').split(';').map(normalizeCode);
        const procCodes = (row.PROCLIST_TXT || '').split(';').map(normalizeCode);
        
        const hasDiag = rule.diags.some(diag => diagCodes.includes(normalizeCode(diag)));
        const hasProc = rule.procs.some(proc => procCodes.includes(normalizeCode(proc)));
        
        if (hasDiag && hasProc) {
          topupFindings.push({
            SEP: row.SEP,
            DIAGNOSIS: row.DIAGLIST_TXT,
            PROCEDURE: row.PROCLIST_TXT,
            TOPUP_ITEM: rule.item,
            VALUE: rule.tarif,
            STATUS: 'Approved'
          });
        }
      });

      // Check discrepancies (simplified)
      if (syamvalData.length > 0) {
        const syamvalRow = syamvalData.find(s => s.SEP === row.SEP);
        if (syamvalRow && syamvalRow.CODING_ICD_SYAMVAL !== row.DIAGLIST_TXT) {
          discrepancies.push({
            SEP: row.SEP,
            ISSUE: 'Coding mismatch',
            DETAILS: `TXT: ${row.DIAGLIST_TXT} vs Syamval: ${syamvalRow.CODING_ICD_SYAMVAL}`
          });
        }
      }
    });

    // Process pending data
    pendingData.forEach(row => {
      if (row['Status'] !== 'Layak Klaim') {
        pendingCases.push({
          SEP: row['No. SEP'],
          DIAGNOSIS: '',
          PROCEDURE: '',
          AUDIT_CODE: '',
          WARNING: row['Keterangan'] || '',
          JAWABAN: '',
          TINDAK_LANJUT: ''
        });
      }
    });

    const processedData = {
      summary: {
        total_cases: txtData.length,
        audit_findings: auditFindings.length,
        topup_findings: topupFindings.length,
        discrepancies: discrepancies.length,
        pending_cases: pendingCases.length,
        total_topup_value: topupFindings.reduce((sum, item) => sum + (item.VALUE || 0), 0)
      },
      perf: [
        { name: 'Current', cases: txtData.length, audit: auditFindings.length, topup: topupFindings.length }
      ],
      audit: auditFindings,
      topup: topupFindings,
      discrepancy: discrepancies,
      pending: pendingCases,
      all: txtData.slice(0, 100)
    };

    setData(processedData);
    setProcessing(false);
    setIsAuditing(false);
    setView('dashboard');
  };

  const handleSaveResolution = async () => {
    // Simulate saving
    setTimeout(() => {
      setEditingItem(null);
      // No need to refetch since data is already in state
    }, 500);
  };

  const getAiRecommendation = async () => {
    setAiLoading(true);
    // Simulate AI recommendation
    setTimeout(() => {
      setEditingItem(prev => ({
        ...prev,
        JAWABAN: 'Rekomendasi AI: Periksa kode diagnosis sesuai aturan ICD-10.',
        TINDAK_LANJUT: 'Koreksi coding dan submit ulang.'
      }));
      setAiLoading(false);
    }, 1500);
  };

  if (isAuditing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors z-[100] fixed inset-0">
      <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ repeat: Infinity, duration: 2 }} className="text-teal-500">
        <ShieldCheck size={80} />
      </motion.div>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 text-center"
      >
        <p className="text-2xl font-black text-teal-600 dark:text-teal-400">Gemini 2.5 Flash is Auditing...</p>
        <p className="text-slate-400 font-bold mt-2 animate-pulse">Analyzing clinical discrepancies & revenue opportunities</p>
      </motion.div>
    </div>
  );

  const { summary, perf, audit, topup, discrepancy, pending } = data || { 
    summary: { total_cases: 0, audit_findings: 0, topup_findings: 0, discrepancies: 0, pending_cases: 0, total_topup_value: 0 }, 
    perf: [], 
    audit: [], 
    topup: [], 
    discrepancy: [], 
    pending: [] 
  };

  const getFilteredData = () => {
    let source = [];
    if (activeTab === 'audit') source = audit;
    else if (activeTab === 'topup') source = topup;
    else if (activeTab === 'pending') source = pending;
    else source = discrepancy;

    if (!searchTerm) return source;
    return source.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const filteredData = getFilteredData();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-xl z-20">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter text-teal-600 dark:text-teal-400">SYAMAUDIT</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RSUD Syamsudin</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setView('upload')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${view === 'upload' ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Upload size={20} /> Data Center
          </button>
          <button 
            disabled={summary.total_cases === 0}
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${view === 'dashboard' ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'} ${summary.total_cases === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <LayoutDashboard size={20} /> Analytics
          </button>
        </nav>

        <div className="p-6 space-y-4">
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold text-sm"
          >
            {theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase">AI Processor</p>
            <p className="text-sm font-bold text-teal-600 dark:text-teal-400 mt-1">Gemini 2.5 Flash</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'upload' ? (
            <motion.div 
              key="upload" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="p-12 max-w-7xl mx-auto"
            >
              <header className="mb-12">
                <h2 className="text-5xl font-black tracking-tight dark:text-white">Welcome, <span className="text-teal-600">Auditor</span></h2>
                <p className="text-slate-500 text-lg mt-4 max-w-2xl">Start by uploading your clinical datasets to begin the AI-powered audit process.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <UploadBox title="Primary Data (.TXT)" icon={<FileText size={48}/>} accept=".txt" onUpload={(e) => handleFileUpload(e, 'txt')} color="teal" />
                <UploadBox title="Syamval Report" icon={<Database size={48}/>} accept=".xls,.xlsx" onUpload={(e) => handleFileUpload(e, 'syamval')} color="cyan" />
                <UploadBox title="Pending Claims" icon={<AlertTriangle size={48}/>} accept=".xlsx" onUpload={(e) => handleFileUpload(e, 'pending')} color="orange" />
              </div>

              {uploadedFiles.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 p-8 glass-panel">
                  <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-6">Uploaded Components</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <CheckCircle2 size={16} className="text-teal-500" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold truncate dark:text-slate-300 block">{f.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{f.type} • {f.records} records</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="mt-16 flex justify-center">
                <button 
                  onClick={handleRunProcess}
                  disabled={processing || txtData.length === 0}
                  className="group relative flex items-center gap-6 px-16 py-6 bg-teal-600 hover:bg-teal-500 text-white rounded-3xl font-black text-xl shadow-2xl shadow-teal-500/40 transition-all disabled:opacity-30 active:scale-95"
                >
                  {processing ? <RefreshCcw className="animate-spin" size={28} /> : <Play size={28} className="group-hover:translate-x-1 transition-transform" />}
                  Generate Audit Analytics (Client-Side)
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-12 space-y-12"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black tracking-tight dark:text-white">Audit Insights</h2>
                  <p className="text-slate-500 mt-2">Executive monitoring dashboard for clinical coding accuracy.</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  <RefreshCcw size={16}/> Sync
                </button>
              </header>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatBox label="Total Cases" value={summary.total_cases.toLocaleString()} icon={<Database/>} color="teal" />
                <StatBox label="Audit Findings" value={summary.audit_findings} icon={<AlertTriangle/>} color="rose" />
                <StatBox label="Pending Resolution" value={summary.pending_cases} icon={<TrendingUp/>} color="orange" />
                <StatBox label="Revenue Potential" value={`Rp ${summary.total_topup_value.toLocaleString()}`} icon={<TrendingUp/>} color="emerald" />
              </div>

              {/* Advanced Table */}
              <div className="glass-panel overflow-hidden">
                <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex bg-white dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <TabButton label="Audit Findings" active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} count={audit.length} />
                    <TabButton label="Pending" active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} count={pending.length} />
                    <TabButton label="Top Ups" active={activeTab === 'topup'} onClick={() => setActiveTab('topup')} count={topup.length} />
                  </div>
                  <div className="relative w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" placeholder="Quick search..." 
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        <th className="px-8 py-5">Case Info</th>
                        {activeTab === 'pending' ? <th className="px-8 py-5">Pending Reason</th> : <th className="px-8 py-5">Coder</th>}
                        {activeTab === 'pending' && <th className="px-8 py-5">AI/User Resolution</th>}
                        {activeTab === 'audit' && <th className="px-8 py-5">Observation</th>}
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {filteredData.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="font-bold dark:text-white group-hover:text-teal-600 transition-colors">{row.SEP}</div>
                            <div className="text-[11px] font-medium text-slate-400 mt-1">{row.NAMA_PASIEN} • {row.MRN}</div>
                          </td>
                          {activeTab === 'pending' ? (
                            <td className="px-8 py-6 max-w-sm text-xs font-medium text-slate-500 leading-relaxed">{row.KETERANGAN_PENDING}</td>
                          ) : (
                            <td className="px-8 py-6 text-sm font-bold text-slate-600 dark:text-slate-400">{row.NAMA_CODER || row.CODER_ID}</td>
                          )}
                          {activeTab === 'pending' && (
                            <td className="px-8 py-6 max-w-md">
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{row.JAWABAN}</div>
                              <div className="text-[9px] font-black text-teal-600 uppercase mt-2">{row.TINDAK_LANJUT}</div>
                            </td>
                          )}
                          {activeTab === 'audit' && (
                            <td className="px-8 py-6 text-xs font-bold text-rose-500 leading-relaxed italic">{row.AUDIT_WARNINGS}</td>
                          )}
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              {activeTab === 'pending' && (
                                <button onClick={() => setEditingItem(row)} className="p-3 bg-teal-500/10 text-teal-600 rounded-xl hover:bg-teal-500 hover:text-white transition-all shadow-sm"><Edit3 size={16}/></button>
                              )}
                              <button onClick={() => setDetailItem(row)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm"><ChevronRight size={16}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-600/10 text-teal-600 rounded-2xl flex items-center justify-center"><Info size={24}/></div>
                <h3 className="text-2xl font-black dark:text-white">Case Details</h3>
              </div>
              <button onClick={() => setDetailItem(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={28}/></button>
            </div>
            <div className="p-10 grid grid-cols-2 gap-12 max-h-[60vh] overflow-y-auto">
              <div className="space-y-8">
                <DetailRow label="Patient Name" value={detailItem.NAMA_PASIEN} />
                <DetailRow label="No. SEP" value={detailItem.SEP} />
                <DetailRow label="ICD-10 (TXT)" value={detailItem.DIAGLIST_TXT} />
                <DetailRow label="ICD-9-CM (TXT)" value={detailItem.PROCLIST_TXT} />
              </div>
              <div className="space-y-8">
                <DetailRow label="Tarif INA-CBG" value={`Rp ${parseInt(detailItem.TARIF_INACBG_TXT || 0).toLocaleString()}`} />
                <DetailRow label="Potensi Koding" value={detailItem.POTENSI_TOPUP} highlight />
                <DetailRow label="Audit Observation" value={detailItem.AUDIT_WARNINGS} isDanger />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Resolution Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-xl">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] shadow-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-2xl font-black dark:text-white flex items-center gap-3"><Sparkles className="text-teal-500" /> AI Resolution Space</h3>
              <p className="text-slate-400 text-sm mt-2 font-medium">Resolving pending claim for {editingItem.NAMA_PASIEN}</p>
            </div>
            <div className="p-10 space-y-8">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">BPJS Note</label>
                <p className="text-slate-600 dark:text-slate-300 italic font-medium">"{editingItem.KETERANGAN_PENDING}"</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposed Resolution</label>
                  <button onClick={getAiRecommendation} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2 bg-teal-600/10 text-teal-600 dark:text-teal-400 text-[10px] font-black rounded-xl border border-teal-500/20 hover:bg-teal-600 hover:text-white transition-all">
                    <Sparkles size={14} className={aiLoading ? 'animate-spin' : ''}/> AI Gemini 2.5 Recommendation
                  </button>
                </div>
                <textarea 
                  className="w-full h-40 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all dark:text-white"
                  value={editingItem.JAWABAN} onChange={(e) => setEditingItem({...editingItem, JAWABAN: e.target.value})}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Follow-up Status</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold dark:text-white outline-none"
                  value={editingItem.TINDAK_LANJUT} onChange={(e) => setEditingItem({...editingItem, TINDAK_LANJUT: e.target.value})}
                >
                  <option value="-">- Choose Action -</option>
                  <option value="Proses Perbaikan Dokumen">Proses Perbaikan Dokumen</option>
                  <option value="Siap Ajukan Kembali">Siap Ajukan Kembali</option>
                </select>
              </div>
            </div>
            <div className="p-10 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-4">
              <button onClick={() => setEditingItem(null)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
              <button onClick={handleSaveResolution} className="px-10 py-4 bg-teal-600 text-white rounded-2xl font-black shadow-xl shadow-teal-500/20 active:scale-95 transition-all">Save Resolution</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

/* Sub-components */
const StatBox = ({ label, value, icon, color }) => (
  <div className={`p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
    <div className={`w-12 h-12 bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 rounded-2xl flex items-center justify-center mb-6`}>{icon}</div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-2xl font-black dark:text-white truncate">{value}</h3>
  </div>
);

const DetailRow = ({ label, value, highlight, isDanger }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    <p className={`text-lg font-bold ${highlight ? 'text-teal-600' : isDanger ? 'text-rose-500 italic' : 'dark:text-slate-200'}`}>{value || '-'}</p>
  </div>
);

const TabButton = ({ label, active, onClick, count }) => (
  <button onClick={onClick} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${active ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
    {label} <span className={`px-2 py-0.5 rounded-lg text-[9px] ${active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>{count}</span>
  </button>
);

const UploadBox = ({ title, icon, accept, onUpload, color }) => (
  <label className="group relative flex flex-col items-center gap-6 p-12 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] hover:border-teal-500/50 hover:bg-teal-500/[0.02] transition-all cursor-pointer">
    <div className={`p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl text-teal-600 shadow-inner group-hover:scale-110 transition-transform`}>{icon}</div>
    <div className="text-center">
      <h3 className="font-black text-slate-700 dark:text-slate-200 text-lg">{title}</h3>
      <p className="text-slate-400 text-sm mt-1 font-medium">Click or Drop</p>
    </div>
    <input type="file" multiple accept={accept} onChange={onUpload} className="hidden" />
  </label>
);

export default App;
