import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiError } from '../../../services/authService';
import { adminApi } from '../api.js';
import '../styles/admin.css';

export default function AdminGuard() {
  const { user } = useAuth();
  const [verifiedId, setVerifiedId] = useState(null);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user || user.admin !== true) return;
    const controller = new AbortController();
    setVerifiedId(null);
    setError('');
    setForbidden(false);
    adminApi.verifyAccess({ signal: controller.signal }).then(() => {
      if (!controller.signal.aborted) setVerifiedId(user.id);
    }).catch((failure) => {
      if (controller.signal.aborted) return;
      setForbidden(failure.response?.status === 403);
      setError(getApiError(failure));
    });
    return () => controller.abort();
  }, [user?.id, user?.admin, attempt]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.admin !== true) return <Navigate to="/" replace />;
  if (verifiedId !== user.id) return (
    <div className="admin-access">
      {error ? <>
        <h1>{forbidden ? 'Acesso restrito' : 'Não foi possível abrir o painel'}</h1>
        <p role="alert">{error}</p>
        {!forbidden && <button className="admin-primary" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</button>}
        <Link to="/">Voltar para a home</Link>
      </> : <p role="status">Verificando acesso de administrador…</p>}
    </div>
  );
  return <Outlet />;
}
