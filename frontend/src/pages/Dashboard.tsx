import Topbar from '../components/Layout/Topbar';

const Dashboard = () => {
  return (
    <div>
      <Topbar title="Inicio" />
      <div className="space-y-6 px-6 py-6">
        <section className="theme-section-card rounded-lg p-6 shadow-sm">
          <h3 className="theme-main-title theme-content-title text-2xl font-semibold">
            Semana de Ingeniería
          </h3>
          <p className="theme-content-subtitle mt-2 text-sm">
            Base operativa con autenticacion, roles, usuarios y conexion real a PostgreSQL.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Usuarios</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">Activo</p>
            <p className="mt-2 text-sm text-slate-500">CRUD protegido por permisos</p>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Roles</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">7</p>
            <p className="mt-2 text-sm text-slate-500">Permisos base cargados</p>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Programas</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">5</p>
            <p className="mt-2 text-sm text-slate-500">Ingenierías configuradas</p>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Base de datos</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">OK</p>
            <p className="mt-2 text-sm text-slate-500">Prisma migrado y validado</p>
          </div>
        </div>

        <section className="theme-section-card rounded-lg p-6 shadow-sm">
          <h3 className="theme-main-title theme-content-title text-2xl font-semibold">
            Siguiente módulo
          </h3>
          <p className="theme-content-subtitle mt-2 max-w-3xl text-sm">
            La siguiente fase funcional es eventos, charlas y asistencia. Esta pantalla ya
            consume la sesión real del backend y puede crecer con métricas del dashboard.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
