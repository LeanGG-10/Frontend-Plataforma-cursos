import React, { useState, useEffect } from 'react';
import { usersAdminService } from '../../services/users-admin.service';
import { authService } from '../../services/auth.service';

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  role: 'ADMIN' | 'PROFESOR' | 'ESTUDIANTE';
  is_active: boolean;
}

export const AdminUsersTable: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const currentUser = authService.getUser();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await usersAdminService.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await usersAdminService.updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
    } catch (err: any) {
      alert(err.message);
      fetchUsers(); // revert UI
    }
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await usersAdminService.disableUser(userId);
      } else {
        await usersAdminService.enableUser(userId);
      }
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !isActive } : u));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-8 text-slate-500">Cargando usuarios...</div>;
  if (error) return <div className="text-red-500 py-4">Error: {error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rol</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
          {users.map((user) => {
            const isCurrentUser = currentUser?.id === user.id;
            
            return (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                  {user.full_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  <select
                    value={user.role}
                    disabled={isCurrentUser}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-800 dark:text-white disabled:opacity-50"
                  >
                    <option value="ESTUDIANTE">ESTUDIANTE</option>
                    <option value="PROFESOR">PROFESOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  <button
                    onClick={() => handleStatusChange(user.id, user.is_active)}
                    disabled={isCurrentUser}
                    className={`font-medium ${
                      user.is_active 
                        ? 'text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400' 
                        : 'text-indigo-600 hover:text-indigo-900 dark:text-indigo-500 dark:hover:text-indigo-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {user.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
