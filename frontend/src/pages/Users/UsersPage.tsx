import { FormEvent, useEffect, useState } from 'react';

import {
  createUserRequest,
  deleteUserRequest,
  listUsersRequest,
  resetUserPasswordRequest,
  updateUserRequest,
  type UserRow,
} from '../../api/users.api';
import Topbar from '../../components/Layout/Topbar';
import FormModal from '../../components/common/FormModal';
import { labelFor, roleLabels, userPositionLabels, userStatusLabels } from '../../utils/labels';

const positions = Object.keys(userPositionLabels);

type UserForm = {
  name: string;
  universityCode: string;
  position: string;
  email: string;
  password: string;
};

const emptyForm: UserForm = {
  name: '',
  universityCode: '',
  position: 'ESTUDIANTE',
  email: '',
  password: '',
};

const UsersPage = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  async function loadUsers() {
    const result = await listUsersRequest({ limit: 100 });
    setUsers(result.users);
  }

  useEffect(() => {
    loadUsers()
      .catch(() => setError('No fue posible cargar los usuarios.'))
      .finally(() => setLoading(false));
  }, []);

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      await createUserRequest({
        name: form.name,
        email: form.email,
        password: form.password,
        position: form.position,
        universityCode: form.universityCode || null,
        status: 'ACTIVE',
        roles: ['PARTICIPANTE'],
      });
      setForm(emptyForm);
      setShowCreateModal(false);
      setNotice('Usuario creado correctamente.');
      await loadUsers();
    } catch {
      setError('No fue posible crear el usuario. Revisa correo, codigo o contrasena.');
    }
  }

  function openCreateModal() {
    setForm(emptyForm);
    setEditingUser(null);
    setShowCreateModal(true);
  }

  function openEditModal(user: UserRow) {
    setEditingUser(user);
    setForm({
      name: user.name,
      universityCode: user.universityCode || '',
      position: user.position || 'ESTUDIANTE',
      email: user.email,
      password: '',
    });
    setShowCreateModal(true);
  }

  async function submitEditUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    try {
      setError('');
      setNotice('');
      await updateUserRequest(editingUser.id, {
        name: form.name,
        email: form.email,
        position: form.position,
        universityCode: form.universityCode || null,
        status: editingUser.status,
        ...(form.password ? { password: form.password } : {}),
      });
      setForm(emptyForm);
      setEditingUser(null);
      setShowCreateModal(false);
      setNotice('Usuario actualizado correctamente.');
      await loadUsers();
    } catch {
      setError('No fue posible actualizar el usuario. Revisa correo, codigo o contrasena.');
    }
  }

  async function resetPassword(user: UserRow) {
    const password = window.prompt(`Nueva contrasena para ${user.name}`);

    if (!password) {
      return;
    }

    if (password.length < 8) {
      setError('La contrasena debe tener minimo 8 caracteres.');
      return;
    }

    try {
      setError('');
      setNotice('');
      await resetUserPasswordRequest(user.id, password);
      setNotice('Contrasena restablecida correctamente.');
    } catch {
      setError('No fue posible restablecer la contrasena.');
    }
  }

  async function toggleStatus(user: UserRow) {
    try {
      setError('');
      setNotice('');
      const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await updateUserRequest(user.id, { status: nextStatus });
      setNotice(nextStatus === 'ACTIVE' ? 'Usuario activado.' : 'Usuario desactivado.');
      await loadUsers();
    } catch {
      setError('No fue posible cambiar el estado del usuario.');
    }
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`Eliminar el usuario ${user.name}?`)) {
      return;
    }

    try {
      setError('');
      setNotice('');
      await deleteUserRequest(user.id);
      setNotice('Usuario eliminado correctamente.');
      await loadUsers();
    } catch {
      setError('No fue posible eliminar el usuario.');
    }
  }

  return (
    <div>
      <Topbar title="Usuarios" />
      <div className="px-6 py-6">
        <FormModal
          open={showCreateModal}
          title={editingUser ? 'Editar usuario' : 'Registrar usuario'}
          description={editingUser ? 'Actualiza los datos del usuario del sistema.' : 'Crea el usuario con sus datos institucionales.'}
          onClose={() => {
            setShowCreateModal(false);
            setForm(emptyForm);
            setEditingUser(null);
          }}
        >
          <form className="mt-4 space-y-4" onSubmit={editingUser ? submitEditUser : submitUser}>
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Codigo
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.universityCode}
                onChange={(event) => setForm({ ...form, universityCode: event.target.value })}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Cargo
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.position}
                onChange={(event) => setForm({ ...form, position: event.target.value })}
              >
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {userPositionLabels[position]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Correo institucional
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Contrasena
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required={!editingUser}
              />
              {editingUser ? <span className="mt-1 block text-xs text-slate-500">Dejala vacia si no vas a cambiarla.</span> : null}
            </label>
            <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              {editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </form>
        </FormModal>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Usuarios registrados</h3>
              <p className="mt-1 text-sm text-slate-500">
                Todos los usuarios autenticados pueden crear, resetear y desactivar por ahora.
              </p>
            </div>
            <button
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              type="button"
              onClick={openCreateModal}
            >
              Registrar usuario
            </button>
          </div>

          {error ? (
            <div className="m-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="m-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-[1050px] table-fixed divide-y divide-slate-200 text-sm">
              <thead className="theme-table-head">
                <tr>
                  <th className="w-[220px] px-5 py-3 text-left font-semibold">Nombre</th>
                  <th className="w-[140px] px-5 py-3 text-left font-semibold">Codigo</th>
                  <th className="w-[150px] px-5 py-3 text-left font-semibold">Cargo</th>
                  <th className="w-[260px] px-5 py-3 text-left font-semibold">Correo</th>
                  <th className="w-[170px] px-5 py-3 text-left font-semibold">Roles</th>
                  <th className="w-[110px] px-5 py-3 text-left font-semibold">Estado</th>
                  <th className="w-[260px] px-5 py-3 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td className="px-5 py-5 text-slate-500" colSpan={7}>
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : users.length ? (
                  users.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4 align-top font-medium text-slate-950">
                        <span className="block break-words leading-5">{user.name}</span>
                      </td>
                      <td className="px-5 py-4 align-top text-slate-600">{user.universityCode || 'Sin codigo'}</td>
                      <td className="px-5 py-4 align-top text-slate-600">{labelFor(userPositionLabels, user.position)}</td>
                      <td className="px-5 py-4 align-top text-slate-600">
                        <span className="block break-all leading-5">{user.email}</span>
                      </td>
                      <td className="px-5 py-4 align-top text-slate-600">{user.roles.map((role) => labelFor(roleLabels, role)).join(', ')}</td>
                      <td className="px-5 py-4 align-top">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {labelFor(userStatusLabels, user.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" type="button" onClick={() => openEditModal(user)}>
                            Editar
                          </button>
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" type="button" onClick={() => void resetPassword(user)}>
                            Resetear
                          </button>
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" type="button" onClick={() => void toggleStatus(user)}>
                            {user.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                          </button>
                          <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" type="button" onClick={() => void deleteUser(user)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-5 text-slate-500" colSpan={7}>
                      No hay usuarios registrados.
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

export default UsersPage;
