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
  phone: string;
  semester: string;
  career: string;
};

const emptyMember: MemberForm = {
  fullName: '',
  identifier: '',
  email: '',
  phone: '',
  semester: '',
  career: '',
};

const semesterOptions = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '10', label: '10' },
  { value: 'POSGRADO', label: 'Posgrado' },
  { value: 'NO_APLICA', label: 'No aplica' },
];

const careerOptions = [
  { value: 'ING_SISTEMAS_TELECOMUNICACIONES', label: 'Ing. Sistemas y Telecomunicaciones' },
  { value: 'ING_ANALITICA_DATOS', label: 'Ing. Analitica de Datos' },
  { value: 'ING_INDUSTRIAL', label: 'Ing. Industrial' },
  { value: 'ING_LOGISTICA', label: 'Ing. Logistica' },
  { value: 'ING_SEGURIDAD_INFORMACION', label: 'Ing. Seguridad de Información' },
  { value: 'POSGRADOS', label: 'Posgrados' },
  { value: 'NO_APLICA', label: 'No aplica' },
];

const PublicTournamentFormPage = () => {
  const { tournamentId = '' } = useParams();
  const [form, setForm] = useState<PublicTournamentForm | null>(null);
  const [teamName, setTeamName] = useState('');
  const [captainIndex, setCaptainIndex] = useState<number | null>(null);
  const [memberCount, setMemberCount] = useState(2);
  const [members, setMembers] = useState<MemberForm[]>([{ ...emptyMember }, { ...emptyMember }]);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isTeam = form?.tournament.mode === 'TEAM';
  const minTeamMembers = 2;
  const maxTeamMembers = Math.max(form?.tournament.maxMembersPerTeam || 20, minTeamMembers);

  useEffect(() => {
    getPublicTournamentFormRequest(tournamentId)
      .then((data) => {
        setForm(data);
        const initialCount = data.tournament.mode === 'TEAM' ? minTeamMembers : 1;
        setMemberCount(initialCount);
        setCaptainIndex(null);
        setMembers(Array.from({ length: initialCount }, () => ({ ...emptyMember })));
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
    setMembers((current) => {
      const nextMembers = current.length >= maxTeamMembers ? current : [...current, { ...emptyMember }];
      setMemberCount(nextMembers.length);
      return nextMembers;
    });
  }

  function removeMember(index: number) {
    setMembers((current) => {
      const nextMembers = current.filter((_, memberIndex) => memberIndex !== index);
      setCaptainIndex((currentCaptain) => {
        if (currentCaptain === null) {
          return null;
        }

        if (currentCaptain === index) {
          return null;
        }

        return currentCaptain > index ? currentCaptain - 1 : currentCaptain;
      });
      setMemberCount(nextMembers.length);
      return nextMembers;
    });
  }

  function updateMemberCount(value: string) {
    const requestedCount = Number(value || minTeamMembers);
    const parsedCount = Number.isFinite(requestedCount) ? requestedCount : minTeamMembers;
    const nextCount = Math.min(Math.max(parsedCount, minTeamMembers), maxTeamMembers);

    setMemberCount(nextCount);
    setMembers((current) => {
      if (current.length === nextCount) {
        return current;
      }

      if (current.length > nextCount) {
        return current.slice(0, nextCount);
      }

      return [
        ...current,
        ...Array.from({ length: nextCount - current.length }, () => ({ ...emptyMember })),
      ];
    });
    setCaptainIndex((currentCaptain) =>
      currentCaptain !== null && currentCaptain >= nextCount ? null : currentCaptain
    );
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    setError('');
    setMessage('');

    try {
      if (isTeam && captainIndex === null) {
        setError('Debes seleccionar quien sera el capitan del equipo.');
        return;
      }

      await publicRegisterTournamentRequest(form.tournament.id, {
        teamName: isTeam ? teamName : undefined,
        captainIndex: isTeam ? captainIndex ?? undefined : undefined,
        whatsappConsent,
        members,
      });
      setMessage(isTeam ? 'Equipo inscrito correctamente.' : 'Participante inscrito correctamente.');
      setTeamName('');
      setCaptainIndex(null);
      setWhatsappConsent(false);
      const resetCount = isTeam ? minTeamMembers : 1;
      setMemberCount(resetCount);
      setMembers(Array.from({ length: resetCount }, () => ({ ...emptyMember })));
    } catch {
      setError('No fue posible completar la inscripción. Revisa cupos, datos repetidos o inscripciones previas.');
    }
  }

  return (
    <PublicLayout>
      <main className="public-technical-grid min-h-[calc(100vh-5rem)] px-4 py-12 md:px-12">
        <section className="mx-auto max-w-5xl rounded-3xl border border-[#3b4b3c] bg-[#0b0f10] p-6 shadow-2xl md:p-8">
          <div className="mb-8 flex flex-col gap-5 border-b border-[#3b4b3c] pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-[#5adf82]">
                Inscripción de torneo
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
                <p className="mt-3 text-sm text-[#b9cbb8]">Cargando información del torneo...</p>
              )}
            </div>
            <div className="rounded-2xl border border-[#5adf82]/30 bg-[#5adf82]/10 px-4 py-3 font-mono text-xs text-[#5adf82]">
              {isTeam ? 'Registro por equipo' : 'Registro individual'}
            </div>
          </div>

          <form className="space-y-6" onSubmit={submitRegistration}>
            {form?.tournament.description ? (
              <section className="rounded-2xl border border-[#5adf82]/25 bg-[#5adf82]/10 p-5">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#5adf82]">
                  Descripcion
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#d8f3d5]">
                  {form.tournament.description}
                </p>
              </section>
            ) : null}

            {isTeam ? (
              <div className="grid gap-5 rounded-2xl border border-[#3b4b3c] bg-[#1d2022] p-5 md:grid-cols-[1fr_180px]">
                <label className="block text-sm font-semibold text-[#e0e3e5]">
                  Nombre del equipo
                  <input
                    className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#101415] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-semibold text-[#e0e3e5]">
                  Cantidad de integrantes
                  <input
                    className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#101415] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                    type="number"
                    min={minTeamMembers}
                    max={maxTeamMembers}
                    value={memberCount}
                    onChange={(event) => updateMemberCount(event.target.value)}
                    required
                  />
                  <span className="mt-1 block text-xs font-normal text-[#849584]">
                    Mínimo {minTeamMembers}, maximo {maxTeamMembers}.
                  </span>
                </label>
              </div>
            ) : null}

            <div className="space-y-4">
              {isTeam ? (
                <div className="rounded-2xl border border-[#5adf82]/25 bg-[#5adf82]/10 px-4 py-3 text-sm text-[#cfe6ca]">
                  Registra todos los integrantes y marca exactamente quien sera el capitan.
                </div>
              ) : null}
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
                          required={isTeam}
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
                      placeholder="Código o cédula"
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
                    <input
                      className="rounded-xl border border-[#3b4b3c] bg-[#101415] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors placeholder:text-[#849584] focus:border-[#5adf82]"
                      placeholder="Teléfono"
                      type="tel"
                      value={member.phone}
                      onChange={(event) => updateMember(index, 'phone', event.target.value)}
                      required
                    />
                    <select
                      className="rounded-xl border border-[#3b4b3c] bg-[#101415] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                      value={member.semester}
                      onChange={(event) => updateMember(index, 'semester', event.target.value)}
                      required
                    >
                      <option value="">Semestre</option>
                      {semesterOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-xl border border-[#3b4b3c] bg-[#101415] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82] md:col-span-2"
                      value={member.career}
                      onChange={(event) => updateMember(index, 'career', event.target.value)}
                      required
                    >
                      <option value="">Carrera</option>
                      {careerOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {isTeam && members.length > minTeamMembers ? (
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

            <label className="flex items-start gap-3 rounded-2xl border border-[#3b4b3c] bg-[#1d2022] p-4 text-sm leading-6 text-[#b9cbb8]">
              <input
                className="mt-1 text-[#5adf82] focus:ring-[#5adf82]"
                type="checkbox"
                checked={whatsappConsent}
                onChange={(event) => setWhatsappConsent(event.target.checked)}
              />
              <span>
                Autorizo ser ingresado/a a un grupo de WhatsApp para el envio de informacion del torneo.
              </span>
            </label>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {isTeam ? (
                <button
                  className="rounded-xl border border-[#849584] px-5 py-3 text-sm font-bold text-[#e0e3e5] transition-colors hover:bg-[#1d2022]"
                  type="button"
                  onClick={addMember}
                  disabled={members.length >= maxTeamMembers}
                >
                  Agregar integrante
                </button>
              ) : (
                <span />
              )}

              <button className="rounded-xl bg-[#5adf82] px-6 py-3 text-sm font-bold text-[#003917] transition-transform active:scale-95">
                Enviar inscripción
              </button>
            </div>

            {form?.tournament.rules ? (
              <section className="rounded-2xl border border-[#3b4b3c] bg-[#1d2022] p-5">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#5adf82]">
                  Reglas
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#d8f3d5]">
                  {form.tournament.rules}
                </p>
              </section>
            ) : null}

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
