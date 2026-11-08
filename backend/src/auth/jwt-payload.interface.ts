import { UserRole } from '../users/user.entity';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  tenantId: number | null;
}
