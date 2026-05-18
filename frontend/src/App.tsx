import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AttendancePage from './pages/Attendance/AttendancePage';
import AuditPage from './pages/Audit/AuditPage';
import Dashboard from './pages/Dashboard';
import EventsPage from './pages/Events/EventsPage';
import EvaluationPage from './pages/Evaluation/EvaluationPage';
import HackathonPage from './pages/Hackathon/HackathonPage';
import LoginPage from './pages/Auth/LoginPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import PublicEventFormPage from './pages/Public/PublicEventFormPage';
import PublicHomePage from './pages/Public/PublicHomePage';
import PublicSchedulePage from './pages/Public/PublicSchedulePage';
import PublicTournamentsPage from './pages/Public/PublicTournamentsPage';
import PublicTournamentFormPage from './pages/Public/PublicTournamentFormPage';
import ReportsPage from './pages/Reports/ReportsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import TournamentsPage from './pages/Tournaments/TournamentsPage';
import UsersPage from './pages/Users/UsersPage';
import VenuesPage from './pages/Venues/VenuesPage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/public" element={<PublicHomePage />} />
        <Route path="/public/cronograma" element={<PublicSchedulePage />} />
        <Route path="/public/charlas" element={<PublicSchedulePage eventType="TALK" />} />
        <Route path="/public/talleres" element={<PublicSchedulePage eventType="WORKSHOP" />} />
        <Route path="/public/torneos" element={<PublicTournamentsPage />} />
        <Route path="/public/eventos/:eventId/inscripcion" element={<PublicEventFormPage mode="registration" />} />
        <Route path="/public/eventos/:eventId/asistencia" element={<PublicEventFormPage mode="attendance" />} />
        <Route path="/public/torneos/:tournamentId/inscripcion" element={<PublicTournamentFormPage />} />
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            }
          />
          <Route
            path="/usuarios"
            element={
              <AppLayout>
                <UsersPage />
              </AppLayout>
            }
          />
          <Route
            path="/espacios"
            element={
              <AppLayout>
                <VenuesPage />
              </AppLayout>
            }
          />
          <Route
            path="/eventos"
            element={
              <AppLayout>
                <EventsPage />
              </AppLayout>
            }
          />
          <Route path="/charlas" element={<Navigate to="/eventos" replace />} />
          <Route
            path="/asistencia"
            element={
              <AppLayout>
                <AttendancePage />
              </AppLayout>
            }
          />
          <Route
            path="/torneos"
            element={
              <AppLayout>
                <TournamentsPage />
              </AppLayout>
            }
          />
          <Route
            path="/hackathon"
            element={
              <AppLayout>
                <HackathonPage />
              </AppLayout>
            }
          />
          <Route
            path="/evaluacion"
            element={
              <AppLayout>
                <EvaluationPage />
              </AppLayout>
            }
          />
          <Route
            path="/reportes"
            element={
              <AppLayout>
                <ReportsPage />
              </AppLayout>
            }
          />
          <Route
            path="/notificaciones"
            element={
              <AppLayout>
                <NotificationsPage />
              </AppLayout>
            }
          />
          <Route
            path="/auditoria"
            element={
              <AppLayout>
                <AuditPage />
              </AppLayout>
            }
          />
          <Route
            path="/configuracion"
            element={
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
