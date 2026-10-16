import React from 'react';
import Login from '../../pages/admin/Login';

interface AdminLoginViewProps {
  onLoginSuccess: () => void;
  onNavigateHome?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onNavigateHome,
}) => {
  return <Login onSuccess={onLoginSuccess} redirectUrl="/admin" />;
};

export default AdminLoginView;

