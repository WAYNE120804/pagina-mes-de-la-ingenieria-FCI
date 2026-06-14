import { FormEvent, useEffect, useState } from 'react';

import {
  defaultSiteSettings,
  getSettingsRequest,
  updateSettingsRequest,
  type SiteSettings,
} from '../../api/settings.api';
import Topbar from '../../components/Layout/Topbar';

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const SettingsPage = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smtpPassword, setSmtpPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getSettingsRequest()
      .then(setSettings)
      .catch(() => setError('No fue posible cargar la configuración.'))
      .finally(() => setLoading(false));
  }, []);

  async function updateLogo(file?: File) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('El logo debe ser una imagen.');
      return;
    }

    if (file.size > 1_500_000) {
      setError('El logo no puede superar 1.5 MB.');
      return;
    }

    setError('');
    const logoUrl = await readImageAsDataUrl(file);
    setSettings((current) => ({ ...current, logoUrl }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const nextSettings = await updateSettingsRequest({
        brandName: settings.brandName,
        heroTitle: settings.heroTitle,
        logoUrl: settings.logoUrl || null,
        smtpEnabled: Boolean(settings.smtpEnabled),
        smtpHost: settings.smtpHost || 'smtp.gmail.com',
        smtpPort: Number(settings.smtpPort || 587),
        smtpSecure: Boolean(settings.smtpSecure),
        smtpUser: settings.smtpUser || null,
        ...(smtpPassword ? { smtpPassword } : {}),
        smtpFromName: settings.smtpFromName || settings.brandName,
        smtpFromEmail: settings.smtpFromEmail || null,
        smtpReplyTo: settings.smtpReplyTo || null,
        smtpBatchSize: Number(settings.smtpBatchSize || 40),
        smtpBatchDelayMs: Number(settings.smtpBatchDelayMs ?? 1500),
      });
      setSettings(nextSettings);
      setSmtpPassword('');
      setMessage('Configuración guardada.');
    } catch {
      setError('No fue posible guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Topbar title="Configuración publica" />
      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">Marca del panel público</h3>
          <p className="mt-1 text-sm text-slate-600">
            Estos datos se muestran en la pagina publica del Mes de la Ingeniería.
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Nombre público
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={settings.brandName}
                onChange={(event) => setSettings({ ...settings, brandName: event.target.value })}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Frase principal
              <textarea
                className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={settings.heroTitle}
                onChange={(event) => setSettings({ ...settings, heroTitle: event.target.value })}
                required
              />
            </label>
            <div className="rounded-md border border-slate-200 p-3">
              <label className="block text-sm font-medium text-slate-700">
                Logo
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  type="file"
                  accept="image/*"
                  onChange={(event) => void updateLogo(event.target.files?.[0])}
                />
              </label>
              {settings.logoUrl ? (
                <button
                  className="mt-3 text-xs font-semibold text-red-600"
                  type="button"
                  onClick={() => setSettings({ ...settings, logoUrl: null })}
                >
                  Quitar logo
                </button>
              ) : null}
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-950">Correo SMTP de Google</h4>
              <p className="mt-1 text-xs text-slate-500">
                Usa una contraseña de aplicacion de Google. Si SMTP falla, los registros siguen funcionando sin bloquear la app.
              </p>
              <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  checked={Boolean(settings.smtpEnabled)}
                  type="checkbox"
                  onChange={(event) => setSettings({ ...settings, smtpEnabled: event.target.checked })}
                />
                Activar envío de correos
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Host
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={settings.smtpHost || ''} onChange={(event) => setSettings({ ...settings, smtpHost: event.target.value })} placeholder="smtp.gmail.com" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Puerto
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" value={settings.smtpPort || 587} onChange={(event) => setSettings({ ...settings, smtpPort: Number(event.target.value) })} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Usuario Gmail
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={settings.smtpUser || ''} onChange={(event) => setSettings({ ...settings, smtpUser: event.target.value })} placeholder="correo@gmail.com" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Contraseña de aplicacion
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="password" value={smtpPassword} onChange={(event) => setSmtpPassword(event.target.value)} placeholder={settings.smtpPasswordConfigured ? 'Configurada, escribir solo para cambiar' : 'Pegar clave SMTP'} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Nombre remitente
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={settings.smtpFromName || ''} onChange={(event) => setSettings({ ...settings, smtpFromName: event.target.value })} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Correo remitente
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="email" value={settings.smtpFromEmail || ''} onChange={(event) => setSettings({ ...settings, smtpFromEmail: event.target.value })} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Responder a
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="email" value={settings.smtpReplyTo || ''} onChange={(event) => setSettings({ ...settings, smtpReplyTo: event.target.value })} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Tamano de lote
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min={1} max={100} value={settings.smtpBatchSize || 40} onChange={(event) => setSettings({ ...settings, smtpBatchSize: Number(event.target.value) })} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Pausa entre lotes (ms)
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min={0} value={settings.smtpBatchDelayMs ?? 1500} onChange={(event) => setSettings({ ...settings, smtpBatchDelayMs: Number(event.target.value) })} />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input checked={Boolean(settings.smtpSecure)} type="checkbox" onChange={(event) => setSettings({ ...settings, smtpSecure: event.target.checked })} />
                  Usar SSL directo
                </label>
              </div>
            </div>
            <button
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              disabled={saving || loading}
            >
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">Vista previa</h3>
          <div className="mt-5 rounded-2xl border border-[#3b4b3c] bg-[#101415] p-6 text-[#e0e3e5]">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img className="h-12 w-12 rounded-lg object-cover" src={settings.logoUrl} alt={settings.brandName} />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#5adf82] text-[#003917]">
                  <span className="material-symbols-outlined">engineering</span>
                </span>
              )}
              <p className="font-display text-xl font-extrabold text-[#5adf82]">{settings.brandName}</p>
            </div>
            <h2 className="mt-8 max-w-2xl font-display text-5xl font-extrabold leading-tight text-[#f0ffed]">
              {settings.heroTitle}
            </h2>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
