import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  getPublicTournamentFormRequest,
  publicRegisterTournamentRequest,
  type PublicTournamentForm,
} from '../../api/tournaments.api';
import {
  competitionModeLabels,
  labelFor,
  tournamentSportLabels,
  tournamentStatusLabels,
} from '../../utils/labels';
import PublicLayout from './PublicLayout';

type MemberForm = {
  fullName: string;
  identifier: string;
  email: string;
};

const emptyMember: MemberForm = {
  fullName: '',
  identifier: '',
  email: '',
};

const PublicTournamentFormPage = () => {
  const { tournamentId = '' } = useParams();
  const [form, setForm] = useState<PublicTournamentForm | null>(null);
  const [teamName, setTeamName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [captainIndex, setCaptainIndex] = useState(0);
  const [members, setMembers] = useState<MemberForm[]>([{ ...emptyMember }, { ...emptyMember }]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isTeam = form?.tournament.mode === 'TEAM';

  useEffect(() => {
    getPublicTournamentFormRequest(tournamentId)
      .then((data) => {
        setForm(data);
        setMembers(data.tournament.mode === 'TEAM' ? [{ ...emptyMember }, { ...emptyMember }] : [{ ...emptyMember }]);
      })
      .catch(() => setError('No fue posible cargar el formulario del torneo.'));
  }, [tournamentId]);

  function updateMember(index: number, field: keyof MemberForm, value: string) {
    setMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      )
    );
  }

  function addMember() {
    setMembers((current) => [...current, { ...emptyMember }]);
  }

  function removeMember(index: number) {
    setMembers((current) => {
      const nextMembers = current.filter((_, memberIndex) => memberIndex !== index);
      setCaptainIndex(Math.min(captainIndex, Math.max(nextMembers.length - 1, 0)));
      return nextMembers;
    });
  }

  function readImageAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function updateLogo(file?: File) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('El escudo debe ser una imagen.');
      return;
    }

    if (file.size > 1_500_000) {
      setError('El escudo no puede superar 1.5 MB.');
      return;
    }

    setLogoUrl(await readImageAsDataUrl(file));
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await publicRegisterTournamentRequest(form.tournament.id, {
        teamName: isTeam ? teamName : undefined,
        logoUrl: isTeam ? logoUrl || null : undefined,
        captainIndex: isTeam ? captainIndex : undefined,
        members,
      });
      setMessage(isTeam ? 'Equipo inscrito correctamente.' : 'Participante inscrito correctamente.');
      setTeamName('');
      setLogoUrl('');
      setCaptainIndex(0);
      setMembers(isTeam ? [{ ...emptyMember }, { ...emptyMember }] : [{ ...emptyMember }]);
    } catch {
      setError('No fue posible completar la inscripcion. Revisa cupos, datos repetidos o inscripciones previas.');
    }
  }

  return (
    <PublicLayout>
      <main className="public-technical-grid min-h-[calc(100vh-5rem)] px-4 py-12 md:px-12">
        <section className="mx-auto max-w-5xl rounded-3xl border border-[#3b4b3c] bg-[#0b0f10] p-6 shadow-2xl md:p-8">
          <div className="mb-8 flex flex-col gap-5 border-b border-[#3b4b3c] pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-[#5adf82]">
                Inscripcion de torneo
              </p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-[#f0ffed]">
                {form?.tournament.name || 'Torneo'}
              </h1>
              {form ? (
                <p className="mt-3 text-sm text-[#b9cbb8]">
                  {labelFor(tournamentSportLabels, form.tournament.sport)} -{' '}
                  {labelFor(competitionModeLabels, form.tournament.mode)} -{' '}
                  {labelFor(tournamentStatusLabels, form.tournament.status)}
                </p>
              ) : (
                <p className="mt-3 text-sm text-[#b9cbb8]">Cargando informacion del torneo...</p>
              )}
            </div>
            <div className="rounded-2xl border border-[#5adf82]/30 bg-[#5adf82]/10 px-4 py-3 font-mono text-xs text-[#5adf82]">
              {isTeam ? 'Registro por equipo' : 'Registro individual'}
            </div>
          </div>

          <form className="space-y-6" onSubmit={submitRegistration}>
            {isTeam ? (
              <div className="grid gap-5 rounded-2xl border border-[#3b4b3c] bg-[#1d2022] p-5 md:grid-cols-[1fr_240px]">
                <label className="block text-sm font-semibold text-[#e0e3e5]">
                  Nombre del equipo
                  <input
                    className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#101415] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    required
                  />
                </label>
                <div className="flex gap-3">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-[#3b4b3c] bg-[#101415]">
                    {logoUrl ? (
                      <img className="h-full w-full object-cover" src={logoUrl} alt="Escudo del equipo" />
                    ) : (
                      <span className="px-1 text-center text-xs text-[#849584]">Escudo</span>
                    )}
                  </div>
                  <label className="block flex-1 text-sm font-semibold text-[#e0e3e5]">
                    Logo
                    <input
                      className="mt-2 w-full text-xs text-[#b9cbb8] file:mr-3 file:rounded-lg file:border-0 file:bg-[#5adf82] file:px-3 file:py-2 file:font-bold file:text-[#003917]"
                      type="file"
                      accept="image/*"
                      onChange={(event) => void updateLogo(event.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              {members.map((member, index) => (
                <div key={index} className="rounded-2xl border border-[#3b4b3c] bg-[#1d2022] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-bold text-[#f0ffed]">
                      {isTeam ? `Integrante ${index + 1}` : 'Participante'}
                    </h2>
                    {isTeam ? (
                      <label className="flex items-center gap-2 rounded-full bg-[#101415] px-3 py-2 text-xs font-semibold text-[#b9cbb8]">
                        <input
                          className="text-[#5adf82] focus:ring-[#5adf82]"
                          type="radio"
                          name="captain"
                          checked={captainIndex === index}
                          onChange={() => setCaptainIndex(index)}
                        />
                        Capitan
                      </label>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <input
                      className="rounded-xl border border-[#3b4b3c] bg-[#101415] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors placeholder:text-[#849584] focus:border-[#5adf82]"
                      placeholder="Nombre completo"
                      value={member.fullName}
                      onChange={(event) => updateMember(index, 'fullName', event.target.value)}
                      required
                    />
                    <input
                      className="rounded-xl border border-[#3b4b3c] bg-[#101415] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors placeholder:text-[#849584] focus:border-[#5adf82]"
                      placeholder="Codigo o cedula"
                      value={member.identifier}
                      onChange={(event) => updateMember(index, 'identifier', event.target.value)}
                      required
                    />
                    <input
                      className="rounded-xl border border-[#3b4b3c] bg-[#101415] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors placeholder:text-[#849584] focus:border-[#5adf82]"
                      placeholder="Correo"
                      type="email"
                      value={member.email}
                      onChange={(event) => updateMember(index, 'email', event.target.value)}
                      required
                    />
                  </div>
                  {isTeam && members.length > 2 ? (
                    <button
                      className="mt-4 rounded-xl border border-[#ffb4ab]/30 px-4 py-2 text-xs font-bold text-[#ffb4ab]"
                      type="button"
                      onClick={() => removeMember(index)}
                    >
                      Quitar integrante
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {isTeam ? (
                <button
                  className="rounded-xl border border-[#849584] px-5 py-3 text-sm font-bold text-[#e0e3e5] transition-colors hover:bg-[#1d2022]"
                  type="button"
                  onClick={addMember}
                >
                  Agregar integrante
                </button>
              ) : (
                <span />
              )}

              <button className="rounded-xl bg-[#5adf82] px-6 py-3 text-sm font-bold text-[#003917] transition-transform active:scale-95">
                Enviar inscripcion
              </button>
            </div>

            {error ? (
              <p className="rounded-xl border border-[#ffb4ab]/30 bg-[#93000a]/20 px-4 py-3 text-sm text-[#ffb4ab]">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-xl border border-[#5adf82]/30 bg-[#5adf82]/10 px-4 py-3 text-sm text-[#5adf82]">
                {message}
              </p>
            ) : null}
          </form>
        </section>
      </main>
    </PublicLayout>
  );
};

export default PublicTournamentFormPage;
