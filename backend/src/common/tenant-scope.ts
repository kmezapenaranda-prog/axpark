import { BadRequestException, createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { UserRole } from '../users/user.entity';

/**
 * Decide sobre qué negocio actúa la petición.
 * - platform_admin: puede operar cualquier negocio, indicado en `requested`.
 * - resto: siempre su propio negocio (el del token); pedir otro es 403.
 */
export function resolveTenantId(user: JwtPayload, requested?: number | string | null): number {
  const requestedId =
    requested === undefined || requested === null || requested === '' ? undefined : Number(requested);
  if (requestedId !== undefined && (!Number.isInteger(requestedId) || requestedId < 1)) {
    throw new BadRequestException('tenantId inválido');
  }

  if (user.role === UserRole.PLATFORM_ADMIN) {
    if (requestedId === undefined) throw new BadRequestException('tenantId es obligatorio');
    return requestedId;
  }

  if (!user.tenantId) throw new ForbiddenException('El usuario no pertenece a ningún negocio');
  if (requestedId !== undefined && requestedId !== user.tenantId) {
    throw new ForbiddenException('No tienes acceso a este negocio');
  }
  return user.tenantId;
}

/**
 * Inyecta el negocio sobre el que actúa la petición, ya validado contra el token.
 * Lee el tenantId pedido de la query o del body (el frontend lo sigue enviando).
 */
export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest();
  const requested = request.query?.tenantId ?? request.body?.tenantId;
  return resolveTenantId(request.user as JwtPayload, requested);
});
