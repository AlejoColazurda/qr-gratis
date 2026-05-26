'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  QrCode, 
  Download, 
  Trash2, 
  LogOut, 
  User, 
  Lock, 
  Globe, 
  Palette, 
  Sparkles, 
  RefreshCw, 
  Plus, 
  ChevronRight, 
  FolderHeart,
  Upload
} from 'lucide-react';

interface QRHistoryItem {
  id: string;
  name: string;
  url: string;
  styles: {
    fgColor?: string;
    bgColor?: string;
    size?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    logoSrc?: string;
  };
  createdAt: string;
}

export default function Home() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth Form State
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // QR Generator State
  const [qrName, setQrName] = useState('Mi QR');
  const [qrUrl, setQrUrl] = useState('https://');
  const [fgColor, setFgColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [qrSize, setQrSize] = useState(256);
  const [qrLevel, setQrLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [logoSrc, setLogoSrc] = useState<string>(''); // Base64 image
  
  // History State
  const [history, setHistory] = useState<QRHistoryItem[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });

  const canvasRef = useRef<HTMLDivElement>(null);

  // 1. Verify Authentication on Mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUsername(data.user.username);
          setIsAuthenticated(true);
          fetchHistory();
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  // 2. Fetch History
  async function fetchHistory() {
    try {
      const res = await fetch('/api/qrs');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.qrs);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    }
  }

  // 3. Handle Login / Register
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername || !formPassword) return;

    setAuthError('');
    setAuthLoading(true);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formUsername, password: formPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Algo salió mal');
      }

      if (authMode === 'login') {
        setUsername(data.user.username);
        setIsAuthenticated(true);
        setFormPassword('');
        fetchHistory();
      } else {
        // Automatically login or switch to login on register success
        setAuthMode('login');
        setSaveMessage({ text: 'Registro exitoso. Inicia sesión ahora.', type: 'success' });
        setTimeout(() => setSaveMessage({ text: '', type: '' }), 5000);
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // 4. Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUsername('');
      setHistory([]);
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  // 5. Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 6. Save QR Code to Database
  const handleSaveQR = async () => {
    if (!qrUrl || qrUrl === 'https://') {
      setSaveMessage({ text: 'Por favor, introduce una URL válida', type: 'error' });
      return;
    }

    setSaveLoading(true);
    setSaveMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/qrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: qrName,
          url: qrUrl,
          styles: {
            fgColor,
            bgColor,
            size: qrSize,
            level: qrLevel,
            logoSrc: logoSrc || undefined,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      setSaveMessage({ text: '¡Código QR guardado en tu historial!', type: 'success' });
      fetchHistory();
    } catch (err: any) {
      setSaveMessage({ text: err.message, type: 'error' });
    } finally {
      setSaveLoading(false);
      setTimeout(() => setSaveMessage({ text: '', type: '' }), 4000);
    }
  };

  // 7. Delete QR Code
  const handleDeleteQR = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar este código QR de tu historial?')) return;

    try {
      const res = await fetch(`/api/qrs?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(history.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete QR', err);
    }
  };

  // 8. Download QR Code
  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${qrName.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // 9. Load QR Config from History
  const loadQRFromHistory = (item: QRHistoryItem) => {
    setQrName(item.name);
    setQrUrl(item.url);
    setFgColor(item.styles.fgColor || '#0f172a');
    setBgColor(item.styles.bgColor || '#ffffff');
    setQrSize(item.styles.size || 256);
    setQrLevel(item.styles.level || 'H');
    setLogoSrc(item.styles.logoSrc || '');
  };

  // Loading Splash Screen
  if (isAuthenticated === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="mt-4 text-slate-400">Cargando aplicación...</p>
      </div>
    );
  }

  // LOGIN / REGISTER VIEW
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="glass w-full max-w-md p-8 rounded-3xl shadow-2xl transition-all">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-3">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              QR Gratis
            </h1>
            <p className="text-slate-400 text-sm mt-1">Generador de QRs Premium con historial</p>
          </div>

          {/* Tab buttons */}
          <div className="flex bg-slate-900/50 p-1.5 rounded-xl mb-6">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                authMode === 'login' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                authMode === 'register' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Registrarse
            </button>
          </div>

          {saveMessage.text && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm mb-4 text-center">
              {saveMessage.text}
            </div>
          )}

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm mb-4 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Usuario
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="ej. alejo"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {authLoading ? 'Procesando...' : authMode === 'login' ? 'Ingresar' : 'Crear Cuenta'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD VIEW
  return (
    <div className="min-h-screen flex flex-col p-4 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="glass flex justify-between items-center px-6 py-4 rounded-2xl shadow-lg mb-6 mt-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            QR Gratis
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-xl text-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-semibold uppercase tracking-wider text-xs">
              {username}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl transition text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* Left Panel: Generator & Style Configuration (7 cols) */}
        <section className="lg:col-span-8 glass p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold">Personalizar Código QR</h2>
          </div>

          {/* QR Name and URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Nombre de Referencia
              </label>
              <input
                type="text"
                value={qrName}
                onChange={(e) => setQrName(e.target.value)}
                placeholder="ej. Menú Web o Redes"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                URL de Destino
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  value={qrUrl}
                  onChange={(e) => setQrUrl(e.target.value)}
                  placeholder="https://ejemplo.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition"
                />
              </div>
            </div>
          </div>

          {/* Custom Styles Selection */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
              <Palette className="w-4 h-4" />
              <span>Estilo y Apariencia</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {/* Foreground Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Color del QR
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-10 h-10 border-0 rounded cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-24 px-2 py-1.5 bg-slate-950/60 border border-slate-800 rounded text-sm text-center text-slate-300"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Color de Fondo
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 border-0 rounded cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-24 px-2 py-1.5 bg-slate-950/60 border border-slate-800 rounded text-sm text-center text-slate-300"
                  />
                </div>
              </div>

              {/* Error Correction Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Corrección de Errores
                </label>
                <select
                  value={qrLevel}
                  onChange={(e) => setQrLevel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="L">Baja (L) - 7% Recuperación</option>
                  <option value="M">Media (M) - 15% Recuperación</option>
                  <option value="Q">Media-Alta (Q) - 25% Recuperación</option>
                  <option value="H">Alta (H) - 30% (Recomendado con Logo)</option>
                </select>
              </div>
            </div>

            {/* Logo upload */}
            <div className="border-t border-slate-800/80 pt-4">
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Añadir Logo Central (Opcional)
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer text-sm text-slate-300 transition">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>Subir Imagen</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                {logoSrc && (
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-white rounded-lg">
                      <img src={logoSrc} alt="Preview Logo" className="w-8 h-8 object-contain rounded" />
                    </div>
                    <button
                      onClick={() => setLogoSrc('')}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      Remover Logo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleSaveQR}
              disabled={saveLoading}
              className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              <span>Guardar en Historial</span>
            </button>
          </div>

          {saveMessage.text && (
            <div className={`p-4 rounded-xl text-sm border font-semibold text-center ${
              saveMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {saveMessage.text}
            </div>
          )}
        </section>

        {/* Right Panel: Preview (4 cols) */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Live Preview Card */}
          <div className="glass p-6 rounded-2xl shadow-xl flex flex-col items-center text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Vista Previa en Tiempo Real
            </span>

            {/* QR Canvas Wrap */}
            <div 
              ref={canvasRef} 
              className="p-5 bg-white rounded-2xl shadow-inner mb-6 border border-slate-100 flex items-center justify-center"
              style={{ minHeight: '260px', minWidth: '260px' }}
            >
              {qrUrl && qrUrl !== 'https://' ? (
                <QRCodeCanvas
                  value={qrUrl}
                  size={qrSize}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  level={qrLevel}
                  includeMargin={true}
                  imageSettings={
                    logoSrc
                      ? {
                          src: logoSrc,
                          x: undefined,
                          y: undefined,
                          height: 48,
                          width: 48,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400 max-w-xs">
                  <QrCode className="w-12 h-12 text-slate-300 animate-pulse mb-3" />
                  <p className="text-sm">Escribe una URL para generar tu código QR estático</p>
                </div>
              )}
            </div>

            <button
              onClick={handleDownload}
              disabled={!qrUrl || qrUrl === 'https://'}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              <span>Descargar PNG</span>
            </button>
          </div>

          {/* Saved History Quick List */}
          <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 justify-between">
              <div className="flex items-center gap-2">
                <FolderHeart className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm">Mi Historial ({history.length})</h3>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  Aún no has guardado códigos QR en tu historial.
                </p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadQRFromHistory(item)}
                    className="flex items-center justify-between p-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl cursor-pointer group transition"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-200 truncate group-hover:text-white">
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {item.url}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-450 transition" />
                      <button
                        onClick={(e) => handleDeleteQR(item.id, e)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Eliminar del historial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}
