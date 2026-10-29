'use client';

import { useSessionTimeout } from '@/lib/session-timeout-context';
import SessionTimeoutModal from './session-timeout-modal';

export default function SessionTimeoutHandler() {
  const {
    isSessionTimeoutOpen,
    isRefreshing,
    handleRefreshSession,
    handleLogout,
  } = useSessionTimeout();

  return (
    <SessionTimeoutModal
      open={isSessionTimeoutOpen}
      onRefresh={handleRefreshSession}
      onLogout={handleLogout}
      isRefreshing={isRefreshing}
    />
  );
}
