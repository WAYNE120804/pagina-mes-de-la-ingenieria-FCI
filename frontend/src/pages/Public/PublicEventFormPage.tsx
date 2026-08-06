import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  getPublicEventFormRequest,
  publicCheckInEventRequest,
  publicRegisterEventRequest,
  type PublicEventForm,
} from '../../api/events.api';
import { getApiErrorMessage } from '../../api/client';
import { attendeeCategoryLabels, eventModalityLabels, eventTypeLabels, labelFor } from '../../utils/labels';
import PublicLayout from './PublicLayout';

const categories = Object.keys(attendeeCategoryLabels);
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
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'TECNOLOGO', label: 'Tecnólogo' },
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

type MemberForm = {
  fullName: string;
  identifier: string;
  category: string;
  semester: string;
  career: string;
  email: string;
  phone: string;
};

const emptyMember: MemberForm = {
  fullName: '',
  identifier: '',
  category: 'ESTUDIANTE',
  semester: '',
  career: '',
  email: '',
  phone: '',
};

function formatDateTime(value: string) {
  return new Date(value)
    .toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(' de 20', ' del 20');
}

const PublicEventFormPage = ({ mode }: { mode: 'registration' | 'attendance' }) => {
  const { eventId = '' } = useParams();
  const [form, setForm] = useState<PublicEventForm | null>(null);
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [category, setCategory] = useState('ESTUDIANTE');
  const [semester, setSemester] = useState('');
  const [career, setCareer] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState<MemberForm[]>([{ ...emptyMember }, { ...emptyMember }]);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isTeamRegistration =
    mode === 'registration' &&
    form?.event.type === 'COMPETITION' &&
    form.event.competitionMode === 'TEAM';
  const maxTeamMembers = Math.max(form?.event.maxMembersPerTeam || 20, 2);

  function updateMember(index: number, field: keyof MemberForm, value: string) {
    setMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      )
    );
  }

  function addMember() {
    setMembers((current) =>
      current.length >= maxTeamMembers ? current : [...current, { ...emptyMember }]
    );
  }

  function removeMember(index: number) {
    setMembers((current) =>
      current.length <= 2 ? current : current.filter((_, memberIndex) => memberIndex !== index)
    );
  }

  useEffect(() => {
    if (!eventId) {
      return;
    }

    getPublicEventFormRequest(eventId, mode)
      .then(setForm)
      .catch(() => setError('El formulario no está disponible.'));
  }, [eventId, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      if (mode === 'registration') {
        if (isTeamRegistration) {
          await publicRegisterEventRequest(eventId, {
            fullName: members[0]?.fullName || '',
            identifier: members[0]?.identifier || '',
            category: members[0]?.category || 'ESTUDIANTE',
            semester: members[0]?.semester || '',
            career: members[0]?.career || '',
            email: members[0]?.email || null,
            phone: members[0]?.phone || '',
            teamName,
            members: members.map((member) => ({
              ...member,
              email: member.email || null,
            })),
            whatsappConsent,
          });
        } else {
          await publicRegisterEventRequest(eventId, {
            fullName,
            identifier,
            category,
            semester,
            career,
            email: email || null,
            phone,
            whatsappConsent,
          });
        }
        setMessage('Inscripción registrada. Guarda tu código o cédula para confirmar asistencia.');
      } else {
        await publicCheckInEventRequest(eventId, {
          fullName: fullName || undefined,
          identifier,
          category: fullName ? category : undefined,
          semester: fullName ? semester : undefined,
          career: fullName ? career : undefined,
          email: email || null,
          phone: phone || null,
        });
        setMessage('Asistencia confirmada correctamente.');
      }

      setFullName('');
      setIdentifier('');
      setEmail('');
      setPhone('');
      setTeamName('');
      setMembers([{ ...emptyMember }, { ...emptyMember }]);
      setWhatsappConsent(false);
      setCategory('ESTUDIANTE');
      setSemester('');
      setCareer('');
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          mode === 'registration'
            ? 'No fue posible registrar la inscripción. Revisa cupos o si ya estás inscrito.'
            : 'No fue posible confirmar la asistencia. Revisa el horario disponible o tus datos.'
        )
      );
    }
  }

  return (
    <PublicLayout>
      <main className="public-technical-grid min-h-[calc(100vh-5rem)] px-4 py-12 md:px-12">
        <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-3xl border border-[#3b4b3c] bg-[#1d2022]/85 p-8 backdrop-blur">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-[#5adf82]">
              Semana de Ingeniería
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-[#f0ffed]">
              {mode === 'registration' ? 'Inscripción a actividad' : 'Registro de asistencia'}
            </h1>
            <p className="mt-5 text-sm leading-7 text-[#b9cbb8]">
              {mode === 'registration'
                ? 'Completa tus datos para reservar cupo y recibir el código de control de ingreso.'
                : 'Confirma tu ingreso usando el código o cédula asociado a tu registro.'}
            </p>

            {form ? (
              <div className="mt-8 rounded-2xl border border-[#3b4b3c] bg-[#101415] p-5">
                <p className="font-display text-xl font-bold text-[#f0ffed]">{form.event.title}</p>
                <div className="mt-4 space-y-3 text-sm text-[#b9cbb8]">
                  <p className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#5adf82]">category</span>
                    {labelFor(eventTypeLabels, form.event.type)}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#5adf82]">connected_tv</span>
                    {labelFor(eventModalityLabels, form.event.modality)}
                  </p>
                  {form.event.streamUrl ? (
                    <a
                      className="inline-flex items-center gap-2 font-semibold text-[#5adf82] hover:underline"
                      href={form.event.streamUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      Ver transmisión
                    </a>
                  ) : null}
                  <p className="inline-flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-[#5adf82]">schedule</span>
                    <span>
                      Asistencia: {formatDateTime(form.attendanceOpensAt)} - {formatDateTime(form.attendanceClosesAt)}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-[#3b4b3c] bg-[#101415] p-5 text-sm text-[#b9cbb8]">
                Cargando información del formulario...
              </div>
            )}
          </aside>

          <section className="rounded-3xl border border-[#3b4b3c] bg-[#0b0f10] p-6 shadow-2xl md:p-8">
            <form className="space-y-5" onSubmit={submit}>
              {mode === 'attendance' ? (
                <p className="rounded-2xl border border-[#5adf82]/20 bg-[#5adf82]/10 px-4 py-3 text-sm leading-6 text-[#b9cbb8]">
                  Si ya te inscribiste, escribe tu código o cédula. Si no estabas inscrito,
                  completa todos los datos y quedaras confirmado.
                </p>
              ) : null}
              {isTeamRegistration ? (
                <div className="space-y-5">
                  <label className="block text-sm font-semibold text-[#e0e3e5]">
                    Nombre del equipo
                    <input
                      className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                      value={teamName}
                      onChange={(event) => setTeamName(event.target.value)}
                      required
                    />
                  </label>
                  {members.map((member, index) => (
                    <div key={index} className="rounded-2xl border border-[#3b4b3c] bg-[#101415] p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="font-display text-lg font-bold text-[#f0ffed]">Integrante {index + 1}</p>
                        {members.length > 2 ? (
                          <button
                            className="rounded-lg border border-[#ffb4ab]/40 px-3 py-2 text-xs font-bold text-[#ffb4ab]"
                            type="button"
                            onClick={() => removeMember(index)}
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>
                      <div className="space-y-4">
                        <label className="block text-sm font-semibold text-[#e0e3e5]">
                          Nombre completo
                          <input
                            className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                            value={member.fullName}
                            onChange={(event) => updateMember(index, 'fullName', event.target.value)}
                            required
                          />
                        </label>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block text-sm font-semibold text-[#e0e3e5]">
                            Codigo o cedula
                            <input
                              className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                              value={member.identifier}
                              onChange={(event) => updateMember(index, 'identifier', event.target.value)}
                              required
                            />
                          </label>
                          <label className="block text-sm font-semibold text-[#e0e3e5]">
                            Cargo
                            <select
                              className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                              value={member.category}
                              onChange={(event) => updateMember(index, 'category', event.target.value)}
                              required
                            >
                              {categories.map((item) => (
                                <option key={item} value={item}>
                                  {attendeeCategoryLabels[item]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block text-sm font-semibold text-[#e0e3e5]">
                            Semestre
                            <select
                              className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                              value={member.semester}
                              onChange={(event) => updateMember(index, 'semester', event.target.value)}
                              required
                            >
                              <option value="">Selecciona semestre</option>
                              {semesterOptions.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-sm font-semibold text-[#e0e3e5]">
                            Carrera
                            <select
                              className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                              value={member.career}
                              onChange={(event) => updateMember(index, 'career', event.target.value)}
                              required
                            >
                              <option value="">Selecciona carrera</option>
                              {careerOptions.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block text-sm font-semibold text-[#e0e3e5]">
                            Correo
                            <input
                              className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                              type="email"
                              value={member.email}
                              onChange={(event) => updateMember(index, 'email', event.target.value)}
                            />
                          </label>
                          <label className="block text-sm font-semibold text-[#e0e3e5]">
                            Telefono
                            <input
                              className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                              type="tel"
                              value={member.phone}
                              onChange={(event) => updateMember(index, 'phone', event.target.value)}
                              required
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    className="w-full rounded-xl border border-[#5adf82]/40 px-4 py-3 text-sm font-bold text-[#5adf82] disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={members.length >= maxTeamMembers}
                    onClick={addMember}
                  >
                    Agregar integrante
                  </button>
                </div>
              ) : null}
              {!isTeamRegistration ? (
                <>
              <label className="block text-sm font-semibold text-[#e0e3e5]">
                Nombre completo
                <input
                  className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required={mode === 'registration'}
                />
              </label>
              <label className="block text-sm font-semibold text-[#e0e3e5]">
                Código o cédula
                <input
                  className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-[#e0e3e5]">
                Cargo
                <select
                  className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required={mode === 'registration' || Boolean(fullName)}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {attendeeCategoryLabels[item]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-sm font-semibold text-[#e0e3e5]">
                  Semestre
                  <select
                    className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                    value={semester}
                    onChange={(event) => setSemester(event.target.value)}
                    required={mode === 'registration' || Boolean(fullName)}
                  >
                    <option value="">Selecciona semestre</option>
                    {semesterOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-[#e0e3e5]">
                  Carrera
                  <select
                    className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                    value={career}
                    onChange={(event) => setCareer(event.target.value)}
                    required={mode === 'registration' || Boolean(fullName)}
                  >
                    <option value="">Selecciona carrera</option>
                    {careerOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-semibold text-[#e0e3e5]">
                Correo
                <input
                  className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-[#e0e3e5]">
                Teléfono
                <input
                  className="mt-2 w-full rounded-xl border border-[#3b4b3c] bg-[#1d2022] px-4 py-3 text-sm text-[#f0ffed] outline-none transition-colors focus:border-[#5adf82]"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required={mode === 'registration' || Boolean(fullName)}
                />
              </label>
                </>
              ) : null}
              {mode === 'registration' ? (
                <label className="flex items-start gap-3 rounded-2xl border border-[#3b4b3c] bg-[#1d2022] p-4 text-sm leading-6 text-[#b9cbb8]">
                  <input
                    className="mt-1 text-[#5adf82] focus:ring-[#5adf82]"
                    type="checkbox"
                    checked={whatsappConsent}
                    onChange={(event) => setWhatsappConsent(event.target.checked)}
                  />
                  <span>
                    Autorizo ser ingresado/a a un grupo de WhatsApp para el envio de informacion de la actividad.
                  </span>
                </label>
              ) : null}
              {message ? (
                <p className="rounded-xl border border-[#5adf82]/30 bg-[#5adf82]/10 px-4 py-3 text-sm text-[#5adf82]">
                  {message}
                </p>
              ) : null}
              {error ? (
                <p className="rounded-xl border border-[#ffb4ab]/30 bg-[#93000a]/20 px-4 py-3 text-sm text-[#ffb4ab]">
                  {error}
                </p>
              ) : null}
              <button className="w-full rounded-xl bg-[#5adf82] px-5 py-4 text-sm font-bold text-[#003917] transition-transform active:scale-95">
                {mode === 'registration'
                  ? isTeamRegistration
                    ? 'Inscribir equipo'
                    : 'Inscribirme'
                  : 'Confirmar asistencia'}
              </button>
            </form>
          </section>
        </section>
      </main>
    </PublicLayout>
  );
};

export default PublicEventFormPage;
