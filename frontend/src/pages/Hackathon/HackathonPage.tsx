import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  createChallengeRequest,
  createCompanyRequest,
  createHackathonRequest,
  createHackathonTeamRequest,
  createTeamDeliverableRequest,
  deleteChallengeRequest,
  deleteCompanyRequest,
  deleteHackathonRequest,
  deleteHackathonTeamRequest,
  deleteTeamDeliverableRequest,
  listChallengesRequest,
  listCompaniesRequest,
  listHackathonTeamsRequest,
  listHackathonsRequest,
  listTeamDeliverablesRequest,
  updateChallengeRequest,
  updateCompanyRequest,
  updateHackathonRequest,
  updateHackathonTeamRequest,
  updateTeamDeliverableRequest,
  type Company,
  type HackathonChallenge,
  type HackathonDeliverable,
  type HackathonEvent,
  type HackathonTeam,
} from '../../api/hackathon.api';
import { listUsersRequest, type UserRow } from '../../api/users.api';
import Topbar from '../../components/Layout/Topbar';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../utils/dates';
import { deliverableTypeLabels, hackathonStatusLabels, labelFor } from '../../utils/labels';

const statuses = Object.keys(hackathonStatusLabels);
const deliverableTypes = Object.keys(deliverableTypeLabels);

type HackathonForm = {
  id?: string;
  name: string;
  status: string;
  description: string;
  startsAt: string;
  endsAt: string;
};

type CompanyForm = {
  id?: string;
  name: string;
  contactName: string;
  contactEmail: string;
};

type ChallengeForm = {
  id?: string;
  companyId: string;
  title: string;
  description: string;
  requirements: string;
  suggestedTech: string;
};

type TeamForm = {
  id?: string;
  name: string;
  projectName: string;
  challengeId: string;
  githubUrl: string;
  demoUrl: string;
  leaderId: string;
  memberIds: string[];
};

type DeliverableForm = {
  id?: string;
  type: string;
  title: string;
  url: string;
  submittedAt: string;
};

const emptyHackathonForm: HackathonForm = {
  name: '',
  status: 'REGISTRATION_OPEN',
  description: '',
  startsAt: '',
  endsAt: '',
};

const emptyCompanyForm: CompanyForm = {
  name: '',
  contactName: '',
  contactEmail: '',
};

const emptyChallengeForm: ChallengeForm = {
  companyId: '',
  title: '',
  description: '',
  requirements: '',
  suggestedTech: '',
};

const emptyTeamForm: TeamForm = {
  name: '',
  projectName: '',
  challengeId: '',
  githubUrl: '',
  demoUrl: '',
  leaderId: '',
  memberIds: [],
};

const emptyDeliverableForm: DeliverableForm = {
  type: 'PDF',
  title: '',
  url: '',
  submittedAt: '',
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Sin horario';
  }

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

const HackathonPage = () => {
  const [hackathons, setHackathons] = useState<HackathonEvent[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [challenges, setChallenges] = useState<HackathonChallenge[]>([]);
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [deliverables, setDeliverables] = useState<HackathonDeliverable[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedHackathon, setSelectedHackathon] = useState<HackathonEvent | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<HackathonTeam | null>(null);
  const [hackathonForm, setHackathonForm] = useState<HackathonForm>(emptyHackathonForm);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [challengeForm, setChallengeForm] = useState<ChallengeForm>(emptyChallengeForm);
  const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeamForm);
  const [deliverableForm, setDeliverableForm] = useState<DeliverableForm>(emptyDeliverableForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');

  const selectedChallenge = useMemo(
    () => challenges.find((challenge) => challenge.id === teamForm.challengeId),
    [challenges, teamForm.challengeId]
  );

  async function loadHackathons() {
    const data = await listHackathonsRequest({
      search: search || undefined,
      status: statusFilter || undefined,
    });
    setHackathons(data);
  }

  async function loadCompanies() {
    setCompanies(await listCompaniesRequest());
  }

  async function loadDetail(hackathon: HackathonEvent) {
    const [challengeData, teamData] = await Promise.all([
      listChallengesRequest(hackathon.id),
      listHackathonTeamsRequest(hackathon.id),
    ]);
    setSelectedHackathon(hackathon);
    setChallenges(challengeData);
    setTeams(teamData);
    if (selectedTeam) {
      const refreshedTeam = teamData.find((team) => team.id === selectedTeam.id) || null;
      setSelectedTeam(refreshedTeam);
      if (refreshedTeam) {
        setDeliverables(await listTeamDeliverablesRequest(hackathon.id, refreshedTeam.id));
      }
    }
  }

  useEffect(() => {
    loadHackathons().catch(() => setError('No fue posible cargar los hackathones.'));
    loadCompanies().catch(() => setError('No fue posible cargar las empresas.'));
    listUsersRequest({ limit: 100, status: 'ACTIVE' })
      .then((result) => setUsers(result.users))
      .catch(() => setDetailError('No fue posible cargar los usuarios.'));
  }, []);

  function resetHackathonForm() {
    setHackathonForm(emptyHackathonForm);
  }

  function editHackathon(hackathon: HackathonEvent) {
    setHackathonForm({
      id: hackathon.id,
      name: hackathon.name,
      status: hackathon.status,
      description: hackathon.description || '',
      startsAt: toDateTimeLocalValue(hackathon.startsAt),
      endsAt: toDateTimeLocalValue(hackathon.endsAt),
    });
  }

  async function submitHackathon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const payload = {
      name: hackathonForm.name,
      status: hackathonForm.status,
      description: hackathonForm.description || null,
      startsAt: hackathonForm.startsAt ? fromDateTimeLocalValue(hackathonForm.startsAt) : null,
      endsAt: hackathonForm.endsAt ? fromDateTimeLocalValue(hackathonForm.endsAt) : null,
    };

    try {
      if (hackathonForm.id) {
        await updateHackathonRequest(hackathonForm.id, payload);
      } else {
        await createHackathonRequest(payload);
      }

      resetHackathonForm();
      await loadHackathons();
    } catch {
      setError('No fue posible guardar el hackathon. Revisa nombre, estado y fechas.');
    }
  }

  async function removeHackathon(hackathon: HackathonEvent) {
    if (!confirm('Eliminar este hackathon y ocultar sus retos y equipos?')) {
      return;
    }

    await deleteHackathonRequest(hackathon.id);
    if (selectedHackathon?.id === hackathon.id) {
      setSelectedHackathon(null);
      setSelectedTeam(null);
      setChallenges([]);
      setTeams([]);
      setDeliverables([]);
    }
    await loadHackathons();
  }

  async function applyFilters() {
    setError('');
    await loadHackathons().catch(() => setError('No fue posible aplicar los filtros.'));
  }

  function editCompany(company: Company) {
    setCompanyForm({
      id: company.id,
      name: company.name,
      contactName: company.contactName || '',
      contactEmail: company.contactEmail || '',
    });
  }

  async function submitCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const payload = {
      name: companyForm.name,
      contactName: companyForm.contactName || null,
      contactEmail: companyForm.contactEmail || null,
    };

    try {
      if (companyForm.id) {
        await updateCompanyRequest(companyForm.id, payload);
      } else {
        await createCompanyRequest(payload);
      }

      setCompanyForm(emptyCompanyForm);
      await loadCompanies();
    } catch {
      setError('No fue posible guardar la empresa. Revisa si el nombre ya existe.');
    }
  }

  async function removeCompany(company: Company) {
    if (!confirm('Eliminar esta empresa? Los retos existentes conservaran el registro historico.')) {
      return;
    }

    await deleteCompanyRequest(company.id);
    await loadCompanies();
  }

  function editChallenge(challenge: HackathonChallenge) {
    setChallengeForm({
      id: challenge.id,
      companyId: challenge.companyId || '',
      title: challenge.title,
      description: challenge.description,
      requirements: challenge.requirements || '',
      suggestedTech: challenge.suggestedTech || '',
    });
  }

  async function submitChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHackathon) {
      return;
    }

    const payload = {
      companyId: challengeForm.companyId || null,
      title: challengeForm.title,
      description: challengeForm.description,
      requirements: challengeForm.requirements || null,
      suggestedTech: challengeForm.suggestedTech || null,
    };

    try {
      setDetailError('');
      if (challengeForm.id) {
        await updateChallengeRequest(challengeForm.id, payload);
      } else {
        await createChallengeRequest(selectedHackathon.id, payload);
      }
      setChallengeForm(emptyChallengeForm);
      await loadDetail(selectedHackathon);
      await loadHackathons();
    } catch {
      setDetailError('No fue posible guardar el reto. Revisa empresa y datos requeridos.');
    }
  }

  async function removeChallenge(challenge: HackathonChallenge) {
    if (!selectedHackathon || !confirm('Eliminar este reto? Los equipos asignados quedaran sin reto.')) {
      return;
    }

    await deleteChallengeRequest(challenge.id);
    await loadDetail(selectedHackathon);
    await loadHackathons();
  }

  function selectedUserName(userId: string) {
    const user = users.find((item) => item.id === userId);
    return user ? `${user.name} - ${user.email}` : '';
  }

  function changeTeamMembers(memberIds: string[]) {
    setTeamForm({
      ...teamForm,
      memberIds,
      leaderId: memberIds.includes(teamForm.leaderId) ? teamForm.leaderId : memberIds[0] || '',
    });
  }

  function editTeam(team: HackathonTeam) {
    const memberIds = team.members.map((member) => member.userId);
    setTeamForm({
      id: team.id,
      name: team.name,
      projectName: team.projectName || '',
      challengeId: team.challengeId || '',
      githubUrl: team.githubUrl || '',
      demoUrl: team.demoUrl || '',
      leaderId: team.leaderId || memberIds[0] || '',
      memberIds,
    });
  }

  async function submitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHackathon) {
      return;
    }

    const payload = {
      challengeId: teamForm.challengeId || null,
      leaderId: teamForm.leaderId || teamForm.memberIds[0] || null,
      name: teamForm.name,
      projectName: teamForm.projectName || null,
      githubUrl: teamForm.githubUrl || null,
      demoUrl: teamForm.demoUrl || null,
      memberIds: teamForm.memberIds,
    };

    try {
      setDetailError('');
      if (teamForm.id) {
        await updateHackathonTeamRequest(selectedHackathon.id, teamForm.id, payload);
      } else {
        await createHackathonTeamRequest(selectedHackathon.id, payload);
      }
      setTeamForm(emptyTeamForm);
      await loadDetail(selectedHackathon);
      await loadHackathons();
    } catch {
      setDetailError('No fue posible guardar el equipo. Revisa integrantes repetidos y lider.');
    }
  }

  async function removeTeam(team: HackathonTeam) {
    if (!selectedHackathon || !confirm('Eliminar este equipo del hackathon?')) {
      return;
    }

    await deleteHackathonTeamRequest(selectedHackathon.id, team.id);
    if (selectedTeam?.id === team.id) {
      setSelectedTeam(null);
      setDeliverables([]);
      setDeliverableForm(emptyDeliverableForm);
    }
    await loadDetail(selectedHackathon);
    await loadHackathons();
  }

  async function selectTeamDeliverables(team: HackathonTeam) {
    if (!selectedHackathon) {
      return;
    }

    setDetailError('');
    setSelectedTeam(team);
    setDeliverableForm(emptyDeliverableForm);
    setDeliverables(await listTeamDeliverablesRequest(selectedHackathon.id, team.id));
  }

  function editDeliverable(deliverable: HackathonDeliverable) {
    setDeliverableForm({
      id: deliverable.id,
      type: deliverable.type,
      title: deliverable.title,
      url: deliverable.url,
      submittedAt: toDateTimeLocalValue(deliverable.submittedAt),
    });
  }

  async function submitDeliverable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHackathon || !selectedTeam) {
      return;
    }

    const payload = {
      type: deliverableForm.type,
      title: deliverableForm.title,
      url: deliverableForm.url,
      submittedAt: deliverableForm.submittedAt
        ? fromDateTimeLocalValue(deliverableForm.submittedAt)
        : null,
    };

    try {
      setDetailError('');
      if (deliverableForm.id) {
        await updateTeamDeliverableRequest(
          selectedHackathon.id,
          selectedTeam.id,
          deliverableForm.id,
          payload
        );
      } else {
        await createTeamDeliverableRequest(selectedHackathon.id, selectedTeam.id, payload);
      }
      setDeliverableForm(emptyDeliverableForm);
      setDeliverables(await listTeamDeliverablesRequest(selectedHackathon.id, selectedTeam.id));
      await loadDetail(selectedHackathon);
      await loadHackathons();
    } catch {
      setDetailError('No fue posible guardar el entregable. Revisa tipo, título y enlace.');
    }
  }

  async function removeDeliverable(deliverable: HackathonDeliverable) {
    if (!selectedHackathon || !selectedTeam || !confirm('Eliminar este entregable?')) {
      return;
    }

    await deleteTeamDeliverableRequest(selectedHackathon.id, selectedTeam.id, deliverable.id);
    setDeliverables(await listTeamDeliverablesRequest(selectedHackathon.id, selectedTeam.id));
    await loadDetail(selectedHackathon);
    await loadHackathons();
  }

  return (
    <div>
      <Topbar title="Hackathon" />
      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              {hackathonForm.id ? 'Editar hackathon' : 'Nuevo hackathon'}
            </h3>
            <form className="mt-4 space-y-4" onSubmit={submitHackathon}>
              <label className="block text-sm font-medium text-slate-700">
                Nombre
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={hackathonForm.name}
                  onChange={(event) => setHackathonForm({ ...hackathonForm, name: event.target.value })}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Estado
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={hackathonForm.status}
                  onChange={(event) => setHackathonForm({ ...hackathonForm, status: event.target.value })}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {hackathonStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Descripcion
                <textarea
                  className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={hackathonForm.description}
                  onChange={(event) =>
                    setHackathonForm({ ...hackathonForm, description: event.target.value })
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Inicio
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    type="datetime-local"
                    value={hackathonForm.startsAt}
                    onChange={(event) =>
                      setHackathonForm({ ...hackathonForm, startsAt: event.target.value })
                    }
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Fin
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    type="datetime-local"
                    value={hackathonForm.endsAt}
                    onChange={(event) =>
                      setHackathonForm({ ...hackathonForm, endsAt: event.target.value })
                    }
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                  {hackathonForm.id ? 'Guardar cambios' : 'Crear hackathon'}
                </button>
                {hackathonForm.id ? (
                  <button
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
                    type="button"
                    onClick={resetHackathonForm}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              {companyForm.id ? 'Editar empresa' : 'Nueva empresa'}
            </h3>
            <form className="mt-4 space-y-4" onSubmit={submitCompany}>
              <label className="block text-sm font-medium text-slate-700">
                Empresa
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={companyForm.name}
                  onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Contacto
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={companyForm.contactName}
                  onChange={(event) =>
                    setCompanyForm({ ...companyForm, contactName: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Correo de contacto
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  type="email"
                  value={companyForm.contactEmail}
                  onChange={(event) =>
                    setCompanyForm({ ...companyForm, contactEmail: event.target.value })
                  }
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                  {companyForm.id ? 'Guardar empresa' : 'Crear empresa'}
                </button>
                {companyForm.id ? (
                  <button
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
                    type="button"
                    onClick={() => setCompanyForm(emptyCompanyForm)}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Buscar hackathon"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Todos los estados</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {hackathonStatusLabels[status]}
                  </option>
                ))}
              </select>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
                type="button"
                onClick={() => void applyFilters()}
              >
                Filtrar
              </button>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="theme-table-head">
                  <tr>
                    <th className="px-4 py-3 text-left">Hackathon</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Fechas</th>
                    <th className="px-4 py-3 text-left">Retos</th>
                    <th className="px-4 py-3 text-left">Equipos</th>
                    <th className="px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hackathons.map((hackathon) => (
                    <tr key={hackathon.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-950">{hackathon.name}</p>
                        <p className="mt-1 max-w-md text-xs text-slate-500">
                          {hackathon.description || 'Sin descripcion'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {labelFor(hackathonStatusLabels, hackathon.status)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(hackathon.startsAt)} - {formatDateTime(hackathon.endsAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{hackathon._count?.challenges || 0}</td>
                      <td className="px-4 py-3 text-slate-600">{hackathon._count?.teams || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                            type="button"
                            onClick={() => editHackathon(hackathon)}
                          >
                            Editar
                          </button>
                          <button
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                            type="button"
                            onClick={() => void loadDetail(hackathon)}
                          >
                            Gestionar
                          </button>
                          <button
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                            type="button"
                            onClick={() => void removeHackathon(hackathon)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!hackathons.length ? (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                        No hay hackathones registrados.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Empresas</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="theme-table-head">
                  <tr>
                    <th className="px-4 py-3 text-left">Empresa</th>
                    <th className="px-4 py-3 text-left">Contacto</th>
                    <th className="px-4 py-3 text-left">Retos</th>
                    <th className="px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">{company.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {company.contactName || 'Sin contacto'}
                        {company.contactEmail ? ` - ${company.contactEmail}` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{company._count?.challenges || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                            type="button"
                            onClick={() => editCompany(company)}
                          >
                            Editar
                          </button>
                          <button
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                            type="button"
                            onClick={() => void removeCompany(company)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selectedHackathon ? (
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-950">
                  Retos y equipos: {selectedHackathon.name}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {labelFor(hackathonStatusLabels, selectedHackathon.status)}
                </p>
              </div>
              <div className="grid gap-5 p-5 lg:grid-cols-[380px_1fr]">
                <div className="space-y-6">
                  <form className="space-y-4" onSubmit={submitChallenge}>
                    <h4 className="text-sm font-semibold text-slate-950">
                      {challengeForm.id ? 'Editar reto' : 'Nuevo reto'}
                    </h4>
                    <label className="block text-sm font-medium text-slate-700">
                      Empresa
                      <select
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={challengeForm.companyId}
                        onChange={(event) =>
                          setChallengeForm({ ...challengeForm, companyId: event.target.value })
                        }
                      >
                        <option value="">Sin empresa</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Título
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={challengeForm.title}
                        onChange={(event) =>
                          setChallengeForm({ ...challengeForm, title: event.target.value })
                        }
                        required
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Descripcion
                      <textarea
                        className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={challengeForm.description}
                        onChange={(event) =>
                          setChallengeForm({ ...challengeForm, description: event.target.value })
                        }
                        required
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Requisitos
                      <textarea
                        className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={challengeForm.requirements}
                        onChange={(event) =>
                          setChallengeForm({ ...challengeForm, requirements: event.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Tecnologias sugeridas
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={challengeForm.suggestedTech}
                        onChange={(event) =>
                          setChallengeForm({ ...challengeForm, suggestedTech: event.target.value })
                        }
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                        {challengeForm.id ? 'Guardar reto' : 'Crear reto'}
                      </button>
                      {challengeForm.id ? (
                        <button
                          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
                          type="button"
                          onClick={() => setChallengeForm(emptyChallengeForm)}
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </form>

                  <form className="space-y-4" onSubmit={submitTeam}>
                    <h4 className="text-sm font-semibold text-slate-950">
                      {teamForm.id ? 'Editar equipo' : 'Nuevo equipo'}
                    </h4>
                    <label className="block text-sm font-medium text-slate-700">
                      Nombre del equipo
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={teamForm.name}
                        onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })}
                        required
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Reto seleccionado
                      <select
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={teamForm.challengeId}
                        onChange={(event) =>
                          setTeamForm({ ...teamForm, challengeId: event.target.value })
                        }
                      >
                        <option value="">Sin reto asignado</option>
                        {challenges.map((challenge) => (
                          <option key={challenge.id} value={challenge.id}>
                            {challenge.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedChallenge ? (
                      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Empresa: {selectedChallenge.company?.name || 'Sin empresa'}
                      </p>
                    ) : null}
                    <label className="block text-sm font-medium text-slate-700">
                      Proyecto
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={teamForm.projectName}
                        onChange={(event) =>
                          setTeamForm({ ...teamForm, projectName: event.target.value })
                        }
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-sm font-medium text-slate-700">
                        GitHub
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          type="url"
                          value={teamForm.githubUrl}
                          onChange={(event) =>
                            setTeamForm({ ...teamForm, githubUrl: event.target.value })
                          }
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Demo
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          type="url"
                          value={teamForm.demoUrl}
                          onChange={(event) =>
                            setTeamForm({ ...teamForm, demoUrl: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">
                      Integrantes
                      <select
                        className="mt-1 min-h-36 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        multiple
                        value={teamForm.memberIds}
                        onChange={(event) =>
                          changeTeamMembers(
                            Array.from(event.target.selectedOptions).map((option) => option.value)
                          )
                        }
                      >
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} - {user.email}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Lider
                      <select
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={teamForm.leaderId}
                        onChange={(event) => setTeamForm({ ...teamForm, leaderId: event.target.value })}
                        required
                      >
                        <option value="">Seleccionar lider</option>
                        {teamForm.memberIds.map((userId) => (
                          <option key={userId} value={userId}>
                            {selectedUserName(userId)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                        {teamForm.id ? 'Guardar equipo' : 'Crear equipo'}
                      </button>
                      {teamForm.id ? (
                        <button
                          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
                          type="button"
                          onClick={() => setTeamForm(emptyTeamForm)}
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                    {detailError ? <p className="text-sm text-red-600">{detailError}</p> : null}
                  </form>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-950">Retos empresariales</h4>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      {challenges.map((challenge) => (
                        <div key={challenge.id} className="rounded-md border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">{challenge.title}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {challenge.company?.name || 'Sin empresa'} - {challenge._count?.teams || 0}{' '}
                                equipos
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                                type="button"
                                onClick={() => editChallenge(challenge)}
                              >
                                Editar
                              </button>
                              <button
                                className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                                type="button"
                                onClick={() => void removeChallenge(challenge)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-slate-600">{challenge.description}</p>
                          {challenge.suggestedTech ? (
                            <p className="mt-2 text-xs font-semibold text-slate-500">
                              Tecnologias: {challenge.suggestedTech}
                            </p>
                          ) : null}
                        </div>
                      ))}
                      {!challenges.length ? (
                        <p className="text-sm text-slate-600">No hay retos registrados.</p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-950">Equipos inscritos</h4>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="theme-table-head">
                          <tr>
                            <th className="px-4 py-3 text-left">Equipo</th>
                            <th className="px-4 py-3 text-left">Reto</th>
                            <th className="px-4 py-3 text-left">Lider</th>
                            <th className="px-4 py-3 text-left">Integrantes</th>
                            <th className="px-4 py-3 text-left">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {teams.map((team) => (
                            <tr key={team.id}>
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-950">{team.name}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {team.projectName || 'Sin proyecto'}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {team.challenge?.title || 'Sin reto'}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {team.leader?.name || 'Sin lider'}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {team.members.map((member) => member.user.name).join(', ')}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button
                                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                                    type="button"
                                    onClick={() => editTeam(team)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                                    type="button"
                                    onClick={() => void selectTeamDeliverables(team)}
                                  >
                                    Entregables
                                  </button>
                                  <button
                                    className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                                    type="button"
                                    onClick={() => void removeTeam(team)}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!teams.length ? (
                            <tr>
                              <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                                No hay equipos inscritos.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selectedTeam ? (
                    <div className="rounded-md border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-950">
                            Entregables de {selectedTeam.name}
                          </h4>
                          <p className="mt-1 text-xs text-slate-500">
                            Repositorios, documentos, videos, ZIP y presentaciones registrados por el equipo.
                          </p>
                        </div>
                        <button
                          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
                          type="button"
                          onClick={() => {
                            setSelectedTeam(null);
                            setDeliverables([]);
                            setDeliverableForm(emptyDeliverableForm);
                          }}
                        >
                          Cerrar
                        </button>
                      </div>

                      <form className="mt-4 grid gap-3 lg:grid-cols-[170px_1fr_1.5fr_180px_auto]" onSubmit={submitDeliverable}>
                        <select
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={deliverableForm.type}
                          onChange={(event) =>
                            setDeliverableForm({ ...deliverableForm, type: event.target.value })
                          }
                        >
                          {deliverableTypes.map((type) => (
                            <option key={type} value={type}>
                              {deliverableTypeLabels[type]}
                            </option>
                          ))}
                        </select>
                        <input
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Título"
                          value={deliverableForm.title}
                          onChange={(event) =>
                            setDeliverableForm({ ...deliverableForm, title: event.target.value })
                          }
                          required
                        />
                        <input
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          placeholder="https://..."
                          type="url"
                          value={deliverableForm.url}
                          onChange={(event) =>
                            setDeliverableForm({ ...deliverableForm, url: event.target.value })
                          }
                          required
                        />
                        <input
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          type="datetime-local"
                          value={deliverableForm.submittedAt}
                          onChange={(event) =>
                            setDeliverableForm({ ...deliverableForm, submittedAt: event.target.value })
                          }
                        />
                        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                          {deliverableForm.id ? 'Guardar' : 'Registrar'}
                        </button>
                      </form>
                      {deliverableForm.id ? (
                        <button
                          className="mt-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
                          type="button"
                          onClick={() => setDeliverableForm(emptyDeliverableForm)}
                        >
                          Cancelar edicion
                        </button>
                      ) : null}

                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="theme-table-head">
                            <tr>
                              <th className="px-4 py-3 text-left">Tipo</th>
                              <th className="px-4 py-3 text-left">Título</th>
                              <th className="px-4 py-3 text-left">Enlace</th>
                              <th className="px-4 py-3 text-left">Fecha</th>
                              <th className="px-4 py-3 text-left">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {deliverables.map((deliverable) => (
                              <tr key={deliverable.id}>
                                <td className="px-4 py-3 text-slate-600">
                                  {labelFor(deliverableTypeLabels, deliverable.type)}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-950">
                                  {deliverable.title}
                                </td>
                                <td className="px-4 py-3">
                                  <a
                                    className="font-medium text-slate-700 underline"
                                    href={deliverable.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Abrir enlace
                                  </a>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {formatDateTime(deliverable.submittedAt)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2">
                                    <button
                                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                                      type="button"
                                      onClick={() => editDeliverable(deliverable)}
                                    >
                                      Editar
                                    </button>
                                    <button
                                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                                      type="button"
                                      onClick={() => void removeDeliverable(deliverable)}
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {!deliverables.length ? (
                              <tr>
                                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                                  No hay entregables registrados para este equipo.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default HackathonPage;
