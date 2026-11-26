import type { User } from './user';

export type AuthUser = Pick<
  User,
  'id' | 'email' | 'name' | 'role' | 'assignedWarehouseId'
> & {
  run?: string;
  rut?: string;
};

export interface RefreshAuthResponse {
  success: boolean;
  accessToken?: string;
  user?: AuthUser;
}