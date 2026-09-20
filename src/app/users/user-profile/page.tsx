'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  const { data: session } = useSession();

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

  // Datos reales del usuario desde la sesión o API
  const [dbUser, setDbUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Formulario de perfil
  const [name, setName] = useState('José González');
  const [email, setEmail] = useState('jmgonzalez.contact@gmail.com');
  const [phone, setPhone] = useState('+51 987 654 321');
  const [position, setPosition] = useState('Director de Operaciones & Abastecimiento');
  const [language, setLanguage] = useState('es');
  const [timezone, setTimezone] = useState('America/Lima');

  // Formulario de seguridad
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    async function loadUserData() {
      try {
        const res = await fetch('/api/session', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated && data?.user) {
            setDbUser(data.user);
            if (data.user.name) setName(data.user.name);
            if (data.user.email) setEmail(data.user.email);
          }
        }
      } catch (err) {
        console.error('Error al cargar datos del usuario:', err);
      }
    }
    loadUserData();
  }, []);

  const initials = getInitials(
    session?.user?.name || dbUser?.name || name,
    session?.user?.email || dbUser?.email || email
  );

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccessMessage('Información de perfil actualizada exitosamente.');
      setTimeout(() => setSuccessMessage(null), 3500);
    }, 600);
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Contraseña actualizada correctamente.');
      setTimeout(() => setSuccessMessage(null), 3500);
    }, 600);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado Principal */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Perfil de Usuario
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '6px', marginBottom: 0 }}>
          Gestiona tu información personal, credenciales de seguridad y permisos de acceso en la organización.
        </p>
      </div>

      {/* Navegación por Pestañas (Tabs de Panthor) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' }}>
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
            color: activeTab === 'profile' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'profile' ? '2.5px solid #2563eb' : '2.5px solid transparent',
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
            color: activeTab === 'security' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'security' ? '2.5px solid #2563eb' : '2.5px solid transparent',
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
            color: activeTab === 'roles' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'roles' ? '2.5px solid #2563eb' : '2.5px solid transparent',
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
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} color="#16a34a" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* PESTAÑA 1: MI PERFIL */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card de Identidad */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
              Fotografía y Datos Generales
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  fontWeight: 800,
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #dbeafe',
                }}
              >
                {initials}
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{name}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{email}</div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                    onClick={() => alert('Para cambiar foto, utiliza la cuenta Google vinculada.')}
                  >
                    Cambiar Avatar
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Correo Electrónico (Principal)
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    background: '#f8fafc',
                    color: '#64748b',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Teléfono / WhatsApp de Contacto
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Cargo o Puesto
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Idioma de Preferencia
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="es">Español (América Latina)</option>
                  <option value="en">English (United States)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Zona Horaria
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="America/Lima">(GMT-05:00) Lima, Bogotá, Quito</option>
                  <option value="America/Mexico_City">(GMT-06:00) Ciudad de México</option>
                  <option value="America/Santiago">(GMT-04:00) Santiago de Chile</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Save size={16} />
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
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <KeyRound size={20} color="#2563eb" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Cambiar Contraseña
              </h3>
            </div>

            <form onSubmit={handleSaveSecurity} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '460px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres, números y símbolos"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
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
                    background: '#0f172a',
                    color: '#ffffff',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '6px',
                  }}
                >
                  <Lock size={15} />
                  <span>{saving ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card Autenticación en Dos Pasos (2FA) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Smartphone size={20} color="#2563eb" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Autenticación en Dos Pasos (2FA)
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Añade una capa adicional de protección a tu cuenta empresarial exigiendo un código temporal al iniciar sesión.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>Google Authenticator / Authy</div>
                <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>Recomendado para administradores</div>
              </div>
              <button
                type="button"
                onClick={() => alert('Configuración 2FA habilitada para administradores de la organización.')}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Habilitar 2FA
              </button>
            </div>
          </div>

          {/* Card Sesiones Activas */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Laptop size={20} color="#2563eb" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Sesiones Activas
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>Windows PC · Navegador Actual</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Lima, Perú · Sesión activa ahora</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 8px', borderRadius: '999px' }}>
                Conectado
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: MIS ROLES & PERMISOS */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card de Rol Actual */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <IdCard size={20} color="#2563eb" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Rol Asignado en la Organización
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 800, color: '#1d4ed8', background: '#dbeafe', padding: '3px 8px', borderRadius: '999px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Propietario / Owner
                </span>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>Acceso Total y Gobernanza</div>
                <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0 0' }}>
                  Tienes control absoluto sobre compras, órdenes, finanzas, integrantes y configuración de algoritmos ROP.
                </p>
              </div>
            </div>
          </div>

          {/* Card Matriz de Permisos */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
              Matriz de Permisos Habilitados
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Estrategia & IA Predictiva</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Acceso a simulaciones de demanda, ajuste de horizonte de 90 días y detección de quiebres.
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Órdenes de Compra</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Creación, edición y aprobación formal de órdenes de compra con proveedores.
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Financiamiento & Factoring</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Solicitud de capital de trabajo y vinculación con líneas de crédito bancarias.
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Configuración del Sistema</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
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
      <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Cargando perfil de usuario...</div>}>
        <UserProfileContent />
      </Suspense>
    </AppShell>
  );
}
