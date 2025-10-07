export type UserType = 'guest' | 'regular';

export interface AppUser {
	id: string;
	email: string;
	type: UserType;
	name?: string;
}

export interface AppSession {
	user: AppUser;
}

const DEFAULT_USER: AppUser = {
	id: 'local-user',
	email: 'guest@erpnext.local',
	type: 'guest',
	name: 'Guest User',
};

const DEFAULT_SESSION: AppSession = {
	user: DEFAULT_USER,
};

export async function auth(): Promise<AppSession> {
	return DEFAULT_SESSION;
}

export async function signIn(): Promise<AppSession> {
	return DEFAULT_SESSION;
}

export async function signOut(): Promise<void> {
	return;
}

export function getDefaultUser(): AppUser {
	return DEFAULT_USER;
}

export function getDefaultSession(): AppSession {
	return DEFAULT_SESSION;
}
