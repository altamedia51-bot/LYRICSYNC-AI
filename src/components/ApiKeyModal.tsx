import React, { useState } from 'react';
import { KeyRound, X, Check, ExternalLink, ShieldCheck, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  onClearApiKey: () => void;
  hasServerKey: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  onClearApiKey,
  hasServerKey,
}) => {
  const [inputValue, setInputValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputValue.trim());
    onClose();
  };

  const handleTestKey = async () => {
    const keyToTest = inputValue.trim();
    if (!keyToTest) {
      setTestStatus('failed');
      setTestMessage('Masukkan API Key terlebih dahulu.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Menguji koneksi ke endpoint...');

    try {
      const res = await fetch('/api/health', {
        headers: {
          'x-gemini-api-key': keyToTest,
        },
      });
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setTestStatus('success');
        setTestMessage('Koneksi berhasil! API Key valid dan siap digunakan.');
      } else {
        setTestStatus('failed');
        setTestMessage(data.error || 'Gagal memverifikasi API Key.');
      }
    } catch (err: any) {
      setTestStatus('failed');
      setTestMessage(err.message || 'Koneksi ke server gagal.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#11151A] border border-[#252A31] rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252A31] pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-base text-white">Pengaturan Kunci API (BYOK)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1A202C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="space-y-2">
          {apiKey ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Mode Kunci Pribadi Aktif:</strong> Kunci disimpan di browser Anda.
              </span>
            </div>
          ) : hasServerKey ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Kunci Server Aktif:</strong> Server sudah memiliki GEMINI_API_KEY bawaan. Anda tetap bisa memasukkan kunci sendiri jika ingin.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Kunci Belum Dikonfigurasi:</strong> Masukkan Gemini API Key Anda agar fitur sinkronisasi AI dapat berjalan.
              </span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Gemini API Key:</span>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline"
            >
              <span>Dapatkan Kunci Gratis</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </label>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setTestStatus('idle');
              }}
              placeholder="AIzaSy..."
              className="w-full bg-[#0B0D10] border border-[#252A31] rounded-xl px-3 py-2.5 text-xs text-white font-mono pr-16 focus:outline-none focus:border-purple-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1 text-slate-400 hover:text-slate-200"
                title={showKey ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Kunci hanya disimpan di penyimpanan lokal browser Anda (<code className="text-purple-300">localStorage</code>) dan dikirim secara aman ke server Anda sendiri untuk memproses sinkronisasi.
          </p>
        </div>

        {/* Test Result Message */}
        {testStatus !== 'idle' && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              testStatus === 'testing'
                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                : testStatus === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
            }`}
          >
            {testStatus === 'testing' && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />}
            {testStatus === 'success' && <Check className="w-3.5 h-3.5 shrink-0" />}
            <span>{testMessage}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#252A31]">
          <div>
            {apiKey && (
              <button
                type="button"
                onClick={() => {
                  onClearApiKey();
                  setInputValue('');
                  setTestStatus('idle');
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Kunci</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={!inputValue.trim() || testStatus === 'testing'}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-[#161B22] hover:bg-[#1E2530] text-slate-300 hover:text-white border border-[#252A31] disabled:opacity-40 transition-colors"
            >
              Uji Kunci
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
