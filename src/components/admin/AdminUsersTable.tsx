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

  if (loading) return <div className="text-center py-8 text-primary/90 font-semibold font-body">Cargando usuarios...</div>;
  if (error) return <div className="text-red-600 py-4 px-6 font-body">Error: {error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-secondary/10">
        <thead className="bg-primary/[0.03]">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase tracking-[0.15em] font-body">Nombre</th>
            <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase tracking-[0.15em] font-body">Email</th>
            <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase tracking-[0.15em] font-body">Rol</th>
            <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase tracking-[0.15em] font-body">Estado</th>
            <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase tracking-[0.15em] font-body">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white/60 divide-y divide-secondary/10">
          {users.map((user) => {
            const isCurrentUser = currentUser?.id === user.id;
            
            return (
              <tr key={user.id} className={isCurrentUser ? 'bg-secondary/[0.04] opacity-75' : 'hover:bg-primary/[0.02] transition-colors'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary font-body">
                  {user.full_name || '-'}
                  {isCurrentUser && (
                    <span className="ml-2 text-[10px] text-secondary/70 font-semibold tracking-wide">(tú)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary/90 font-semibold font-body">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary/90 font-semibold font-body">
                  <select
                    value={user.role}
                    disabled={isCurrentUser}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-sm border border-secondary/15 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/30 rounded-md bg-white text-primary font-body disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="ESTUDIANTE">ESTUDIANTE</option>
                    <option value="PROFESOR">PROFESOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-5 font-bold uppercase tracking-wider rounded-full ${
                    user.is_active
                      ? 'bg-green-500/15 text-green-700 border border-green-500/20'
                      : 'bg-gray-500/10 text-gray-500 border border-gray-500/15'
                  }`}>
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-body">
                  {isCurrentUser ? (
                    <span className="text-primary/30 text-xs italic">No disponible</span>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(user.id, user.is_active)}
                      className={`text-sm font-medium cursor-pointer transition-colors underline underline-offset-2 decoration-1 ${
                        user.is_active
                          ? 'text-red-500 decoration-red-500/30 hover:text-red-600 hover:decoration-red-600/50'
                          : 'text-green-600 decoration-green-600/30 hover:text-green-700 hover:decoration-green-700/50'
                      }`}
                    >
                      {user.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
