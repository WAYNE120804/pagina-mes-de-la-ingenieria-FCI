import { useEffect, useMemo, useState } from 'react';

import {
  listHackathonsRequest,
  listHackathonTeamsRequest,
  type HackathonEvent,
  type HackathonTeam,
} from '../../api/hackathon.api';
import Topbar from '../../components/Layout/Topbar';
import { hackathonStatusLabels, labelFor } from '../../utils/labels';

const EvaluationPage = () => {
  const [hackathons, setHackathons] = useState<HackathonEvent[]>([]);
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState('');
  const [error, setError] = useState('');

  const selectedHackathon = useMemo(
    () => hackathons.find((hackathon) => hackathon.id === selectedHackathonId) || null,
    [hackathons, selectedHackathonId]
  );

  useEffect(() => {
    listHackathonsRequest()
      .then((data) => {
        setHackathons(data);
        setSelectedHackathonId(data[0]?.id || '');
      })
      .catch(() => setError('No fue posible cargar hackathons.'));
  }, []);

  useEffect(() => {
    if (!selectedHackathonId) {
      setTeams([]);
      return;
    }

    listHackathonTeamsRequest(selectedHackathonId)
      .then(setTeams)
      .catch(() => setError('No fue posible cargar equipos para evaluacion.'));
  }, [selectedHackathonId]);

  const pendingEvaluations = teams.filter((team) => !team.finalScore).length;
  const rankedTeams = [...teams].sort((a, b) => (a.finalRank || 9999) - (b.finalRank || 9999));

  return (
    <div>
      <Topbar title="Evaluacion" />
      <div className="space-y-6 px-6 py-6">
        <section className="theme-section-card rounded-lg p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Panel de jurados</h3>
              <p className="mt-1 text-sm text-slate-500">
                Ranking, entregas y estado de evaluacion por hackathon.
              </p>
            </div>
            <select
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              value={selectedHackathonId}
              onChange={(event) => setSelectedHackathonId(event.target.value)}
            >
              <option value="">Selecciona hackathon</option>
              {hackathons.map((hackathon) => (
                <option key={hackathon.id} value={hackathon.id}>
                  {hackathon.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Hackathon</p>
            <p className="mt-3 text-xl font-semibold text-slate-950">
              {selectedHackathon?.name || 'Sin seleccion'}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {selectedHackathon ? labelFor(hackathonStatusLabels, selectedHackathon.status) : 'Sin estado'}
            </p>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Equipos</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{teams.length}</p>
            <p className="mt-2 text-sm text-slate-500">Inscritos al reto seleccionado</p>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Pendientes</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{pendingEvaluations}</p>
            <p className="mt-2 text-sm text-slate-500">Sin nota final registrada</p>
          </div>
        </div>

        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">Ranking de equipos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[860px] table-fixed divide-y divide-slate-200 text-sm">
              <thead className="theme-table-head">
                <tr>
                  <th className="w-[90px] px-5 py-3 text-left">Puesto</th>
                  <th className="w-[240px] px-5 py-3 text-left">Equipo</th>
                  <th className="w-[240px] px-5 py-3 text-left">Proyecto</th>
                  <th className="w-[160px] px-5 py-3 text-left">Puntaje</th>
                  <th className="w-[130px] px-5 py-3 text-left">Evaluaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankedTeams.length ? (
                  rankedTeams.map((team) => (
                    <tr key={team.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-950">{team.finalRank || '-'}</td>
                      <td className="px-5 py-4 text-slate-700">{team.name}</td>
                      <td className="px-5 py-4 text-slate-600">{team.projectName || 'Sin proyecto'}</td>
                      <td className="px-5 py-4 text-slate-600">{team.finalScore ?? 'Pendiente'}</td>
                      <td className="px-5 py-4 text-slate-600">{team._count?.evaluations || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-6 text-center text-slate-500" colSpan={5}>
                      No hay equipos para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EvaluationPage;
