export type ScopeKind = "OBJECT" | "DISTRICT" | "ALL" | "EMPTY";

export interface Scope {
  kind: ScopeKind;
  objectIds: number[];
  names: string[];
}

export interface CurrentUser {
  username: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
  scope: Scope;
}

export interface LoginRequest {
  username: string;
  password: string;
}
