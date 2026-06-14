import { FormEvent, useEffect, useState } from 'react';

import {
  changeOwnPasswordRequest,
  createUserRequest,
  deleteUserRequest,
  listUsersRequest,
  resetUserPasswordRequest,
  updateOwnProfileRequest,
  updateUserRequest,
  type UserRow,
} from '../../api/users.api';
import Topbar from '../../components/Layout/Topbar';
import FormModal from '../../components/common/FormModal';
import { useAuth } from '../../context/AuthContext';
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

type PasswordForm = {
  currentPassword: string;
  password: string;
  confirmPassword: string;
};

const emptyPasswordForm: PasswordForm = {
  currentPassword: '',
  password: '',
  confirmPassword: '',
};

type PasswordToggleButtonProps = {
  visible: boolean;
  onClick: () => void;
  label: string;
};

const PasswordToggleButton = ({ visible, onClick, label }: PasswordToggleButtonProps) => (
  <button
    aria-label={label}
    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
    type="button"
    onClick={onClick}
  >
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      {visible ? (
        <>
          <path d="M2 2l20 20" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M17.9 17.9A10.9 10.9 0 0 1 12 20C7 20 3.1 16.4 1.5 12a12.8 12.8 0 0 1 4-5.5" />
          <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c5 0 8.9 3.6 10.5 8a12.9 12.9 0 0 1-2.2 3.5" />
        </>
      ) : (
        <>
          <path d="M1.5 12S5.5 4 12 4s10.5 8 10.5 8-4 8-10.5 8S1.5 12 1.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  </button>
);

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const isSuperAdmin = currentUser?.roles.includes('SUPER_ADMIN') ?? false;

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
      setError('No fue posible crear el usuario. Revisa correo, código o contraseña.');
    }
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError('La nueva contraseña y la confirmacion no coinciden.');
      return;
    }

    try {
      await changeOwnPasswordRequest(passwordForm);
      setPasswordForm(emptyPasswordForm);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setShowPasswordModal(false);
      setNotice('Tu contraseña fue actualizada correctamente.');
    } catch {
      setError('No fue posible cambiar la contraseña. Revisa la contraseña actual.');
    }
  }

  function openCreateModal() {
    setForm(emptyForm);
    setEditingUser(null);
    setShowUserPassword(false);
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
    setShowUserPassword(false);
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
      const input = {
        name: form.name,
        email: form.email,
        position: form.position,
        universityCode: form.universityCode || null,
      };

      if (isSuperAdmin) {
        await updateUserRequest(editingUser.id, {
          ...input,
          status: editingUser.status,
        });
      } else if (editingUser.id === currentUser?.id) {
        await updateOwnProfileRequest(input);
      } else {
        setError('Solo puedes editar la información de tu propio usuario.');
        return;
      }

      setForm(emptyForm);
      setEditingUser(null);
      setShowCreateModal(false);
      setNotice(editingUser.id === currentUser?.id ? 'Tus datos fueron actualizados.' : 'Usuario actualizado correctamente.');
      await loadUsers();
    } catch {
      setError('No fue posible actualizar el usuario. Revisa correo, código o contraseña.');
    }
  }

  async function resetPassword(user: UserRow) {
    if (!confirm(`Restablecer la contraseña de ${user.name} a la clave temporal por defecto?`)) {
      return;
    }

    try {
      setError('');
      setNotice('');
      await resetUserPasswordRequest(user.id);
      setNotice('Contraseña restablecida. Clave temporal: UmzFCI2026*$');
    } catch {
      setError('No fue posible restablecer la contraseña.');
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
          title={editingUser?.id === currentUser?.id && !isSuperAdmin ? 'Editar mis datos' : editingUser ? 'Editar usuario' : 'Registrar usuario'}
          description={
            editingUser?.id === currentUser?.id && !isSuperAdmin
              ? 'Actualiza tu información basica de usuario.'
              : editingUser
                ? 'Actualiza los datos del usuario del sistema.'
                : 'Crea el usuario con sus datos institucionales.'
          }
          onClose={() => {
            setShowCreateModal(false);
            setForm(emptyForm);
            setEditingUser(null);
            setShowUserPassword(false);
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
              Código
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
            {!editingUser ? (
              <label className="block text-sm font-medium text-slate-700">
                Contraseña
                <span className="relative mt-1 block">
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm"
                    type={showUserPassword ? 'text' : 'password'}
                    minLength={8}
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    required
                  />
                  <PasswordToggleButton
                    label={showUserPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    visible={showUserPassword}
                    onClick={() => setShowUserPassword((visible) => !visible)}
                  />
                </span>
              </label>
            ) : null}
            <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              {editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </form>
        </FormModal>

        <FormModal
          open={showPasswordModal}
          title="Cambiar mi contraseña"
          description="Actualiza la clave del usuario con el que iniciaste sesión."
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordForm(emptyPasswordForm);
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
          }}
        >
          <form className="mt-4 space-y-4" onSubmit={submitPasswordChange}>
            <label className="block text-sm font-medium text-slate-700">
              Contraseña actual
              <span className="relative mt-1 block">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
                  }
                  required
                />
                <PasswordToggleButton
                  label={showCurrentPassword ? 'Ocultar contraseña actual' : 'Ver contraseña actual'}
                  visible={showCurrentPassword}
                  onClick={() => setShowCurrentPassword((visible) => !visible)}
                />
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Nueva contraseña
              <span className="relative mt-1 block">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm"
                  type={showNewPassword ? 'text' : 'password'}
                  minLength={8}
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })}
                  required
                />
                <PasswordToggleButton
                  label={showNewPassword ? 'Ocultar nueva contraseña' : 'Ver nueva contraseña'}
                  visible={showNewPassword}
                  onClick={() => setShowNewPassword((visible) => !visible)}
                />
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Repetir nueva contraseña
              <span className="relative mt-1 block">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  minLength={8}
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
                  }
                  required
                />
                <PasswordToggleButton
                  label={showConfirmPassword ? 'Ocultar confirmacion' : 'Ver confirmacion'}
                  visible={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                />
              </span>
            </label>
            <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              Guardar contraseña
            </button>
          </form>
        </FormModal>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Usuarios registrados</h3>
              <p className="mt-1 text-sm text-slate-500">
                Todos pueden consultar usuarios y cambiar su contraseña. Solo el super administrador gestiona usuarios.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950"
                type="button"
                onClick={() => setShowPasswordModal(true)}
              >
                Cambiar mi contraseña
              </button>
              {isSuperAdmin ? (
                <button
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                  type="button"
                  onClick={openCreateModal}
                >
                  Registrar usuario
                </button>
              ) : null}
            </div>
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
                  <th className="w-[140px] px-5 py-3 text-left font-semibold">Código</th>
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
                      <td className="px-5 py-4 align-top text-slate-600">{user.universityCode || 'Sin código'}</td>
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
                        {isSuperAdmin ? (
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
                        ) : user.id === currentUser?.id ? (
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" type="button" onClick={() => openEditModal(user)}>
                            Editar mis datos
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">Solo lectura</span>
                        )}
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
