'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { emitProfileUpdated } from '@/lib/profileEvents';
import { AppShell } from '@/components/layout/AppShell';
import {
  User,
  Shield,
  IdCard,
  KeyRound,
  Smartphone,
  Laptop,
  CheckCircle2,
  Lock,
  Loader2,
  Save,
  Building2,
  Users,
  AlertCircle,
} from 'lucide-react';
import { getInitials } from '@/components/layout/UserDropdown';

type TabKey = 'profile' | 'security' | 'roles';

function UserProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  const tabParam = (searchParams?.get('tab') as TabKey) || 'profile';
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam);

  // Sincronizar tab desde URL searchParams
  useEffect(() => {
    if (tabParam === 'security' || tabParam === 'roles' || tabParam === 'profile') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      router.push('/users/user-profile');
    } else {
      router.push(`/users/user-profile?tab=${tab}`);
    }
  };

  // Datos reales del usuario desde la sesión o API (sin valores inventados)
  const [dbUser, setDbUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formulario de perfil (se hidrata desde /api/session)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [language, setLanguage] = useState('es');
  const [timezone, setTimezone] = useState('America/Lima');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState('OWNER');
  const [provider, setProvider] = useState<'google' | 'credentials'>('credentials');

  // Subida de avatar (JPG/PNG/WebP, máx. 2 MB)
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
  const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const LANGUAGE_OPTIONS = [
    { value: 'es', label: 'Español (América Latina)' },
    { value: 'en', label: 'English (United States)' },
    { value: 'pt', label: 'Português (Brasil)' },
  ];

  const TIMEZONE_OPTIONS = [
    { value: 'America/Lima', label: '(GMT-05:00) Lima, Bogotá, Quito' },
    { value: 'America/Mexico_City', label: '(GMT-06:00) Ciudad de México' },
    { value: 'America/Santiago', label: '(GMT-04:00) Santiago de Chile' },
    { value: 'America/Bogota', label: '(GMT-05:00) Bogotá' },
    { value: 'America/Argentina/Buenos_Aires', label: '(GMT-03:00) Buenos Aires' },
  ];

  const ROLE_LABELS: Record<string, string> = {
    OWNER: 'Propietario / Owner',
    ADMIN: 'Administrador',
    MEMBER: 'Miembro',
  };

  // Formulario de seguridad
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Estado de segundo factor (2FA TOTP)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'codes'>('idle');
  const [setupQr, setSetupQr] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupBackupCodes, setSetupBackupCodes] = useState<string[]>([]);
  const [setupToken, setSetupToken] = useState('');
  const [disableToken, setDisableToken] = useState('');

  // Metadatos de la sesión actual (tarjeta Sesiones Activas)
  const [sessionMeta, setSessionMeta] = useState<{
    provider?: string;
    device?: string;
    loginAt?: string;
    expiresAt?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadUserData() {
      try {
        const res = await fetch('/api/session', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated && data?.user && isMounted) {
            const u = data.user;
            setDbUser(u);
            if (u.name) setName(u.name);
            if (u.email) setEmail(u.email);
            if (typeof u.phone === 'string') setPhone(u.phone);
            if (typeof u.position === 'string') setPosition(u.position);
            if (typeof u.language === 'string' && u.language) setLanguage(u.language);
            if (typeof u.timezone === 'string' && u.timezone) setTimezone(u.timezone);
            if (u.avatar_url) setAvatarUrl(u.avatar_url);
            if (u.role) setRole(u.role);
            if (u.provider) setProvider(u.provider);
            setHasPassword(Boolean((u as any).has_password));
            setTwoFactorEnabled(Boolean((u as any).two_factor_enabled));
          }
          if ((data as any)?.session) setSessionMeta((data as any).session);
        }
      } catch (err) {
        console.error('Error al cargar datos del usuario:', err);
        if (isMounted) setErrorMessage('No se pudieron cargar los datos del perfil. Recarga la página.');
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }
    loadUserData();
    return () => {
      isMounted = false;
    };
  }, []);

  const initials = getInitials(
    session?.user?.name || dbUser?.name || name,
    session?.user?.email || dbUser?.email || email
  );

  const displayAvatar = avatarPreview || avatarUrl || session?.user?.image || null;

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Formato no válido. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('La imagen supera el máximo de 2 MB.');
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Reduce el avatar a máx. 256px JPEG antes de subirlo: la BD queda liviana
  // y nada pesado viaja jamás en cookies (límite de headers / error 494).
  const downscaleAvatar = (file: File, maxDim: number = 256, quality: number = 0.82): Promise<string> =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen.'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('No se pudo procesar la imagen.'));
      };
      img.src = objectUrl;
    });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!name.trim()) {
      setErrorMessage('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      let avatar: string | undefined;
      if (avatarFile) {
        const dataUrl = await downscaleAvatar(avatarFile);
        if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(dataUrl)) {
          throw new Error('Formato de imagen no válido. Usa JPG, PNG o WebP.');
        }
        avatar = dataUrl;
      }
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          position,
          language,
          timezone,
          ...(avatar ? { avatar } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo guardar el perfil.');
      }
      if (data?.user) {
        if (data.user.name) setName(data.user.name);
        if (data.user.avatar_url) setAvatarUrl(data.user.avatar_url);
        if (typeof data.user.phone === 'string') setPhone(data.user.phone);
        if (typeof data.user.position === 'string') setPosition(data.user.position);
      }
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(null);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccessMessage(
        data?.warning ||
          'Información de perfil actualizada exitosamente.'
      );
      // Propagar en caliente a header, dropdowns y sesión NextAuth (sin recargar)
      emitProfileUpdated();
      try {
        await updateSession();
      } catch {
        // La sesión por cookie ya quedó sincronizada en el backend
      }
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'No se pudo guardar el perfil. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (newPassword !== confirmPassword) {
      setErrorMessage('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/users/security/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo actualizar la contraseña.');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setHasPassword(true);
      setSuccessMessage(data?.message || 'Contraseña actualizada correctamente.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // continuar con el cierre de NextAuth
    }
    try {
      await signOut({ callbackUrl: '/', redirect: true });
    } catch {
      window.location.href = '/';
    }
  };

  const handleStartTwoFactor = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setTwoFactorLoading(true);
    try {
      const res = await fetch('/api/users/security/2fa/setup', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo iniciar la configuración 2FA.');
      }
      setSetupQr(data.qrDataUrl);
      setSetupSecret(data.secret);
      setSetupBackupCodes(data.backupCodes || []);
      setSetupToken('');
      setSetupStep('qr');
    } catch (err: any) {
      setErrorMessage(err?.message || 'No se pudo iniciar la configuración 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleConfirmTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setTwoFactorLoading(true);
    try {
      const res = await fetch('/api/users/security/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: setupToken.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo habilitar el 2FA.');
      }
      setTwoFactorEnabled(true);
      setSetupStep('codes');
      emitProfileUpdated();
    } catch (err: any) {
      setErrorMessage(err?.message || 'No se pudo habilitar el 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisableTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setTwoFactorLoading(true);
    try {
      const res = await fetch('/api/users/security/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableToken.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo deshabilitar el 2FA.');
      }
      setTwoFactorEnabled(false);
      setSetupStep('idle');
      setSetupQr(null);
      setSetupSecret(null);
      setSetupBackupCodes([]);
      setDisableToken('');
      setSuccessMessage(data?.message || 'Verificación en dos pasos deshabilitada.');
      emitProfileUpdated();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'No se pudo deshabilitar el 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado Principal */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0, letterSpacing: '-0.02em' }}>
          Perfil de Usuario
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-slate)', marginTop: '6px', marginBottom: 0 }}>
          Gestiona tu información personal, credenciales de seguridad y permisos de acceso en la organización.
        </p>
      </div>

      {/* Navegación por Pestañas (Tabs de Panthor) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-fog)', paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={() => handleTabChange('profile')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'profile' ? 700 : 500,
            color: activeTab === 'profile' ? 'var(--color-forest-ink)' : 'var(--color-slate)',
            borderBottom: activeTab === 'profile' ? '2.5px solid var(--color-forest-ink)' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <User size={16} strokeWidth={activeTab === 'profile' ? 2 : 1.5} />
          <span>Mi Perfil</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('security')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'security' ? 700 : 500,
            color: activeTab === 'security' ? 'var(--color-forest-ink)' : 'var(--color-slate)',
            borderBottom: activeTab === 'security' ? '2.5px solid var(--color-forest-ink)' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Shield size={16} strokeWidth={activeTab === 'security' ? 2 : 1.5} />
          <span>Seguridad</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('roles')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'roles' ? 700 : 500,
            color: activeTab === 'roles' ? 'var(--color-forest-ink)' : 'var(--color-slate)',
            borderBottom: activeTab === 'roles' ? '2.5px solid var(--color-forest-ink)' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <IdCard size={16} strokeWidth={activeTab === 'roles' ? 2 : 1.5} />
          <span>Mis Roles & Permisos</span>
        </button>
      </div>

      {/* Notificación de Éxito */}
      {successMessage && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} color="#15803d" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Notificación de Error */}
      {errorMessage && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid var(--color-alarm-red)',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} color="var(--color-alarm-red)" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* PESTAÑA 1: MI PERFIL */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card de Identidad */}
          <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-obsidian)', margin: '0 0 16px 0' }}>
              Fotografía y Datos Generales
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={`Foto de ${name || 'usuario'}`}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '16px',
                    objectFit: 'cover',
                    border: '1px solid #dbeafe',
                    backgroundColor: 'var(--color-linen-mist)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--color-linen-mist)',
                    color: 'var(--color-forest-ink)',
                    fontWeight: 800,
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #dbeafe',
                  }}
                >
                  {loadingProfile ? '···' : initials}
                </div>
              )}

              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-obsidian)' }}>
                  {loadingProfile && !name ? 'Cargando…' : name || 'Usuario'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-slate)' }}>{email}</div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'var(--color-fog)',
                      border: '1px solid var(--color-pebble)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-charcoal)',
                      cursor: 'pointer',
                    }}
                  >
                    Cambiar Avatar
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarSelect}
                    style={{ display: 'none' }}
                    aria-label="Seleccionar imagen de avatar"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--color-pebble)' }}>JPG, PNG o WebP · máx. 2 MB · se optimiza a 256px</span>
                </div>
                {avatarError && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-alarm-red)', fontWeight: 600 }}>
                    {avatarError}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-pebble)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                  Correo Electrónico (Principal)
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-fog)',
                    fontSize: '14px',
                    background: 'var(--color-paper)',
                    color: 'var(--color-slate)',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '11px', color: 'var(--color-pebble)', margin: '6px 0 0 0' }}>
                  {provider === 'google'
                    ? 'Gestionado por Google SSO (solo lectura).'
                    : 'Correo principal de la cuenta (solo lectura).'}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                  Teléfono / WhatsApp de Contacto
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-pebble)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                  Cargo o Puesto
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-pebble)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                  Idioma de Preferencia
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-pebble)',
                    fontSize: '14px',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                  Zona Horaria
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-pebble)',
                    fontSize: '14px',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {TIMEZONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>
                <button
                  type="submit"
                  disabled={saving || loadingProfile || !name.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: saving || loadingProfile || !name.trim() ? 'var(--color-pebble)' : 'var(--color-forest-ink)',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: saving || loadingProfile || !name.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || loadingProfile ? 0.85 : 1,
                  }}
                >
                  {saving ? (
                    <Loader2 size={16} style={{ animation: 'inventa-spin 1s linear infinite' }} />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: SEGURIDAD */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card Cambio de Contraseña */}
          <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <KeyRound size={20} color="var(--color-forest-ink)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-obsidian)', margin: 0 }}>
                Cambiar Contraseña
              </h3>
            </div>

            {provider === 'google' && !hasPassword ? (
              <div style={{ background: 'var(--color-linen-mist)', border: '1px solid var(--color-forest-ink)', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
                Tu cuenta usa <strong>Google SSO</strong>: la contraseña se gestiona en tu cuenta de Google,
                no aquí.{' '}
                <a
                  href="https://myaccount.google.com/signinoptions/password"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#1d4ed8', fontWeight: 700 }}
                >
                  Gestionar en Google →
                </a>
              </div>
            ) : (
              <form onSubmit={handleSaveSecurity} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '460px' }}>
                {!hasPassword && (
                  <p style={{ fontSize: '13px', color: 'var(--color-slate)', margin: 0 }}>
                    Tu cuenta aún no tiene contraseña local. Configura una para reforzar el acceso.
                  </p>
                )}
                {hasPassword && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                      Contraseña Actual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-pebble)',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres, letras y números"
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-pebble)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-pebble)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: saving ? 'var(--color-charcoal)' : 'var(--color-obsidian)',
                      color: '#ffffff',
                      padding: '9px 18px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      marginTop: '6px',
                    }}
                  >
                    {saving ? (
                      <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />
                    ) : (
                      <Lock size={15} />
                    )}
                    <span>{saving ? 'Actualizando...' : hasPassword ? 'Actualizar Contraseña' : 'Configurar Contraseña'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Card Autenticación en Dos Pasos (2FA TOTP real) */}
          <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Smartphone size={20} color="var(--color-forest-ink)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-obsidian)', margin: 0 }}>
                Autenticación en Dos Pasos (2FA)
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: twoFactorEnabled ? '#f0fdf4' : 'var(--color-fog)',
                  color: twoFactorEnabled ? '#15803d' : 'var(--color-slate)',
                }}
              >
                {twoFactorEnabled ? 'Habilitado' : 'Deshabilitado'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-slate)', margin: '0 0 16px 0' }}>
              Exige un código temporal de tu autenticador (Google Authenticator, Authy) al iniciar sesión.
              Una vez habilitado, se pedirá en cada login, incluyendo el acceso demo y Google.
            </p>

            {!twoFactorEnabled && setupStep === 'idle' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-paper)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--color-fog)', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-obsidian)' }}>Google Authenticator / Authy</div>
                  <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>Recomendado para administradores</div>
                </div>
                <button
                  type="button"
                  onClick={handleStartTwoFactor}
                  disabled={twoFactorLoading}
                  style={{
                    background: twoFactorLoading ? 'var(--color-pebble)' : 'var(--color-forest-ink)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: twoFactorLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {twoFactorLoading ? 'Generando…' : 'Habilitar 2FA'}
                </button>
              </div>
            )}

            {!twoFactorEnabled && setupStep === 'qr' && (
              <form onSubmit={handleConfirmTwoFactor} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '460px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {setupQr && (
                    <img src={setupQr} alt="Código QR para 2FA" style={{ width: '160px', height: '160px', border: '1px solid var(--color-fog)', borderRadius: '10px' }} />
                  )}
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--color-charcoal)', margin: '0 0 8px 0' }}>
                      1. Escanea el QR con tu autenticador. 2. Si no puedes escanear, ingresa esta clave:
                    </p>
                    <code style={{ display: 'block', fontSize: '13px', fontWeight: 700, background: 'var(--color-fog)', padding: '8px 10px', borderRadius: '6px', wordBreak: 'break-all' }}>
                      {setupSecret}
                    </code>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                    Código de 6 dígitos del autenticador
                  </label>
                  <input
                    type="text"
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    style={{ width: '100%', maxWidth: '220px', padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--color-pebble)', fontSize: '18px', letterSpacing: '6px', textAlign: 'center', fontWeight: 700, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={twoFactorLoading}
                    style={{ background: twoFactorLoading ? 'var(--color-pebble)' : 'var(--color-forest-ink)', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: twoFactorLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {twoFactorLoading ? 'Verificando…' : 'Confirmar y habilitar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSetupStep('idle'); setSetupQr(null); setSetupSecret(null); setSetupBackupCodes([]); }}
                    style={{ background: 'transparent', border: '1px solid var(--color-pebble)', borderRadius: '6px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {!twoFactorEnabled && setupStep === 'codes' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#92400e', marginBottom: '6px' }}>
                  2FA habilitado. Guarda estos códigos de respaldo (un solo uso):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', margin: '12px 0' }}>
                  {setupBackupCodes.map((c) => (
                    <code key={c} style={{ fontSize: '13px', fontWeight: 700, background: '#ffffff', border: '1px solid var(--color-fog)', padding: '6px 8px', borderRadius: '6px', textAlign: 'center' }}>
                      {c}
                    </code>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setSetupStep('idle'); setSetupBackupCodes([]); setSuccessMessage('Verificación en dos pasos habilitada.'); setTimeout(() => setSuccessMessage(null), 5000); }}
                  style={{ background: 'var(--color-obsidian)', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Ya los guardé, finalizar
                </button>
              </div>
            )}

            {twoFactorEnabled && (
              <form onSubmit={handleDisableTwoFactor} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '460px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-charcoal)', margin: 0 }}>
                  El 2FA está activo: se pedirá un código en cada inicio de sesión. Para deshabilitarlo,
                  confirma con el código actual de tu autenticador.
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '6px' }}>
                    Código actual de 6 dígitos
                  </label>
                  <input
                    type="text"
                    value={disableToken}
                    onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    style={{ width: '100%', maxWidth: '220px', padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--color-pebble)', fontSize: '18px', letterSpacing: '6px', textAlign: 'center', fontWeight: 700, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    required
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={twoFactorLoading}
                    style={{ background: '#ffffff', color: 'var(--color-alarm-red)', border: '1px solid var(--color-alarm-red)', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: twoFactorLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {twoFactorLoading ? 'Verificando…' : 'Deshabilitar 2FA'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Card Sesiones Activas (datos reales de la sesión actual) */}
          <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Laptop size={20} color="var(--color-forest-ink)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-obsidian)', margin: 0 }}>
                Sesiones Activas
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-fog)', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-obsidian)' }}>
                  {sessionMeta?.device || 'Navegador Actual'} · Sesión actual
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-slate)' }}>
                  Acceso vía {sessionMeta?.provider === 'google' ? 'Google SSO' : 'sesión corporativa'}
                  {sessionMeta?.loginAt
                    ? ` · Inicio: ${new Date(sessionMeta.loginAt).toLocaleString('es-PE')}`
                    : ' · Sesión activa ahora'}
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '3px 8px', borderRadius: '999px' }}>
                Conectado
              </span>
            </div>
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                style={{
                  background: '#ffffff',
                  color: 'var(--color-alarm-red)',
                  border: '1px solid var(--color-alarm-red)',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: signingOut ? 'not-allowed' : 'pointer',
                }}
              >
                {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: MIS ROLES & PERMISOS */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card de Rol Actual */}
          <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <IdCard size={20} color="var(--color-forest-ink)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-obsidian)', margin: 0 }}>
                Rol Asignado en la Organización
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--color-linen-mist)', border: '1px solid var(--color-forest-ink)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 800, color: '#1d4ed8', background: '#dbeafe', padding: '3px 8px', borderRadius: '999px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {ROLE_LABELS[role] || ROLE_LABELS.OWNER}
                </span>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-obsidian)' }}>Acceso Total y Gobernanza</div>
                <p style={{ fontSize: '13px', color: 'var(--color-charcoal)', margin: '4px 0 0 0' }}>
                  Tienes control absoluto sobre compras, órdenes, finanzas, integrantes y configuración de algoritmos ROP.
                </p>
              </div>
            </div>
          </div>

          {/* Card Matriz de Permisos */}
          <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-obsidian)', margin: '0 0 16px 0' }}>
              Matriz de Permisos Habilitados
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--color-obsidian)' }}>
                  <CheckCircle2 size={16} color="#15803d" />
                  <span>Estrategia & IA Predictiva</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-slate)', marginTop: '6px' }}>
                  Acceso a simulaciones de demanda, ajuste de horizonte de 90 días y detección de quiebres.
                </div>
              </div>

              <div style={{ border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--color-obsidian)' }}>
                  <CheckCircle2 size={16} color="#15803d" />
                  <span>Órdenes de Compra</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-slate)', marginTop: '6px' }}>
                  Creación, edición y aprobación formal de órdenes de compra con proveedores.
                </div>
              </div>

              <div style={{ border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--color-obsidian)' }}>
                  <CheckCircle2 size={16} color="#15803d" />
                  <span>Financiamiento & Factoring</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-slate)', marginTop: '6px' }}>
                  Solicitud de capital de trabajo y vinculación con líneas de crédito bancarias.
                </div>
              </div>

              <div style={{ border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--color-obsidian)' }}>
                  <CheckCircle2 size={16} color="#15803d" />
                  <span>Configuración del Sistema</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-slate)', marginTop: '6px' }}>
                  Modificación de lead time, SLA de inventario y gestión de usuarios del workspace.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <AppShell>
      <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-slate)' }}>Cargando perfil de usuario...</div>}>
        <UserProfileContent />
      </Suspense>
    </AppShell>
  );
}
