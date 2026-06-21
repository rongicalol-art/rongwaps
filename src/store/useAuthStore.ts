import { create } from 'zustand';

export interface UserSnapshot {
  id: string;
  email: string | undefined;
  fullName: string | undefined;
  avatarUrl: string | undefined;
}

interface AuthState {
  currentUser: UserSnapshot | null;
  setCurrentUser: (user: UserSnapshot | null) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}));