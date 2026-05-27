'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Trash2, 
  RotateCcw, 
  User, 
  ArrowLeft, 
  Sparkles, 
  Play, 
  Lock, 
  Crown,
  Laptop
} from 'lucide-react';
import { SpinWheelLive } from '@/components/SpinWheelLive';

interface Player {
  id: string;
  name: string;
}

interface RoomData {
  id: string;
  name: string;
  status: string;
  allowedSpinner: string | null;
  winnerName: string | null;
  spinAngle: number | null;
  spinDuration: number;
  targetAngle: number | null;
  isSpinning: boolean;
  players: Player[];
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const router = useRouter();
  const { roomId } = use(params);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [room, setRoom] = useState<RoomData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Local Player Session
  const [joinedPlayer, setJoinedPlayer] = useState<{ id: string; name: string } | null>(null);
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  // Poll intervals
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load local player session from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(`room_player_${roomId}`);
    if (saved) {
      try {
        setJoinedPlayer(JSON.parse(saved));
      } catch (e) {
        // Ignored
      }
    }
  }, [roomId]);

  // Fetch Room Info
  const fetchRoom = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo cargar la sala');
      }
      const data = await res.json();
      setRoom(data.room);
      setIsAdmin(data.isAdmin);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Start polling room status
  useEffect(() => {
    fetchRoom(true);

    pollingRef.current = setInterval(() => {
      fetchRoom(false);
    }, 1500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [roomId]);

  // Handle player join submit
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim()) return;

    setJoining(true);
    setError('');

    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: joinName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al ingresar');
      }

      localStorage.setItem(`room_player_${roomId}`, JSON.stringify(data.player));
      setJoinedPlayer(data.player);
      fetchRoom(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  // Handle delegating the spin to a player
  const handleDelegateSpinner = async (playerId: string | null) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-spinner',
          allowedSpinner: playerId // null or 'ADMIN' maps to ADMIN
        })
      });
      if (res.ok) {
        fetchRoom(false);
      }
    } catch (err) {
      console.error('Error delegating spinner', err);
    }
  };

  // Handle trigger spin (called locally when allowed to spin)
  const handleLocalSpin = async (targetAngle: number, winnerName: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'spin',
          targetAngle,
          spinDuration: 5000,
          winnerName,
          playerId: joinedPlayer?.id || 'ADMIN'
        })
      });
      if (res.ok) {
        fetchRoom(false);
      }
    } catch (err) {
      console.error('Error triggering spin', err);
    }
  };

  // Callback when local wheel completes animation
  const handleSpinEnd = async () => {
    // Notify server that animation ended and save state
    if (isAdmin || room?.allowedSpinner === joinedPlayer?.id) {
      try {
        await fetch(`/api/rooms/${roomId}/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'finish-spin' })
        });
        fetchRoom(false);
      } catch (err) {
        console.error('Error finishing spin', err);
      }
    }
  };

  // Handle reset game
  const handleResetRoom = async () => {
    if (!confirm('¿Deseas reiniciar la ruleta para un nuevo sorteo?')) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
      if (res.ok) {
        fetchRoom(false);
      }
    } catch (err) {
      console.error('Error resetting room', err);
    }
  };

  // Handle delete room
  const handleDeleteRoom = async () => {
    if (!confirm('¿Deseas cerrar definitivamente esta sala de sorteo?')) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/');
      }
    } catch (err) {
      console.error('Error deleting room', err);
    }
  };

  // Copy invitation link
  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/rooms/${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Cargando sala en vivo...</p>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="glass max-w-md p-8 rounded-3xl space-y-4">
          <p className="text-rose-400 font-semibold">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 text-white rounded-xl mx-auto hover:bg-slate-800 transition"
          >
            <ArrowLeft size={16} /> Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  // VIEW 1: JOIN AS PLAYER (For mobile users who are not admin and not joined yet)
  if (!isAdmin && !joinedPlayer) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="glass w-full max-w-md p-8 rounded-3xl shadow-2xl transition-all">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-3">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Ruleta en Vivo
            </h1>
            <p className="text-slate-400 text-sm mt-1">Sorteo en la sala: {room.name}</p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tu Nombre o Apodo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="ej. Alejo"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={joining}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {joining ? 'Entrando...' : 'Unirse al Sorteo'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Determine permissions
  const isAllowedToSpin = isAdmin 
    ? room.allowedSpinner === 'ADMIN' || !room.allowedSpinner 
    : room.allowedSpinner === joinedPlayer?.id;

  const currentSpinnerName = room.allowedSpinner === 'ADMIN' || !room.allowedSpinner
    ? 'Administrador'
    : room.players.find(p => p.id === room.allowedSpinner)?.name || 'Administrador';

  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/rooms/${room.id}` : '';

  return (
    <div className="min-h-screen flex flex-col p-4 max-w-6xl mx-auto w-full">
      {/* Room Header */}
      <header className="liquid-nav flex justify-between items-center px-5 py-4 rounded-2xl shadow-lg mb-6 mt-2 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 border border-slate-800 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-extrabold text-lg text-white">
              {room.name}
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 flex items-center gap-1 mt-0.5">
              {isAdmin ? (
                <>
                  <Crown size={10} /> Panel de Control Administrador
                </>
              ) : (
                <>
                  <User size={10} /> Conectado como: {joinedPlayer?.name}
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleDeleteRoom}
              className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl transition text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Cerrar Sala
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* Left Side: Game Board (Roulette Wheel) */}
        <section className="lg:col-span-7 glass p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[500px]">
          
          {/* Permissions / Status Bar */}
          <div className="w-full text-center mb-6">
            {isAllowedToSpin ? (
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 px-4 py-2 rounded-xl text-xs font-bold text-indigo-400 animate-pulse">
                <Sparkles size={13} />
                ¡Te toca girar la ruleta! Arrastra o pulsa el botón central.
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-400">
                <Lock size={12} />
                Control de giro actual: <span className="text-white font-black">{currentSpinnerName}</span>
              </div>
            )}
          </div>

          <SpinWheelLive
            players={room.players}
            isAllowedToSpin={isAllowedToSpin}
            isSpinningRemote={room.isSpinning}
            targetAngleRemote={room.targetAngle}
            winnerName={room.winnerName}
            onLocalSpinTrigger={handleLocalSpin}
            onSpinEnd={handleSpinEnd}
          />

          {/* Quick Admin Actions */}
          {isAdmin && (
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleResetRoom}
                className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl transition text-xs"
              >
                <RotateCcw size={14} />
                Reiniciar Ruleta
              </button>
            </div>
          )}
        </section>

        {/* Right Side: Players List and Invitation QR Code */}
        <section className="lg:col-span-5 space-y-6">
          
          {/* Admin Panel: Share Invitation link and QR */}
          {isAdmin && (
            <div className="glass p-6 rounded-2xl shadow-xl space-y-5">
              <h3 className="font-extrabold text-sm border-b border-slate-800/80 pb-3 flex items-center gap-2">
                <QrCode size={15} className="text-indigo-400" />
                Invitar Participantes
              </h3>
              
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl w-48 h-48 mx-auto border border-slate-100 shadow-inner">
                {inviteUrl ? (
                  <QRCodeCanvas
                    value={inviteUrl}
                    size={170}
                    fgColor="#0f172a"
                    bgColor="#ffffff"
                    level="H"
                    includeMargin={false}
                  />
                ) : (
                  <span className="text-slate-400 text-xs">Cargando...</span>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center">
                  Escanea para unirte desde el celular
                </p>
                
                <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-850 p-2.5 rounded-xl">
                  <span className="text-xs text-slate-400 truncate flex-1 font-mono">
                    {inviteUrl}
                  </span>
                  <button
                    onClick={copyInviteLink}
                    className="p-2 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white rounded-lg transition"
                    title="Copiar enlace"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Players joined List */}
          <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <User size={15} className="text-indigo-400" />
                Participantes Conectados ({room.players.length})
              </h3>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {room.players.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs space-y-2">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto" />
                  <p>Esperando que se conecten los celulares...</p>
                </div>
              ) : (
                room.players.map((p) => {
                  const isCurrentSpinner = room.allowedSpinner === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                        isCurrentSpinner
                          ? 'bg-indigo-500/10 border-indigo-500/30'
                          : 'bg-slate-900/40 border-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${isCurrentSpinner ? 'bg-indigo-500 animate-pulse' : 'bg-slate-650'}`} />
                        <span className="text-sm font-bold text-slate-200 truncate">
                          {p.name} {joinedPlayer?.id === p.id && <span className="text-indigo-400 font-semibold text-xs">(Tú)</span>}
                        </span>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1.5">
                          {isCurrentSpinner ? (
                            <button
                              onClick={() => handleDelegateSpinner(null)}
                              className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 hover:text-white rounded-lg transition"
                            >
                              Quitar Turno
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelegateSpinner(p.id)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold text-white rounded-lg transition shadow-md"
                            >
                              Permitir Girar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            {/* If Admin has control and there are players */}
            {isAdmin && room.players.length > 0 && (
              <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center">
                <span className="text-[11px] text-slate-400 font-semibold">
                  Control de administrador:
                </span>
                {room.allowedSpinner === 'ADMIN' || !room.allowedSpinner ? (
                  <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                    Asignado a ti
                  </span>
                ) : (
                  <button
                    onClick={() => handleDelegateSpinner(null)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    Recuperar Control de Giro
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
