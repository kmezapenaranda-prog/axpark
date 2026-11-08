import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_DETECTOR_KEY, IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../auth/jwt-payload.interface';
import { UserRole } from '../../users/user.entity';
import { DetectorsService } from '../../detectors/detectors.service';

/**
 * Guard global: toda ruta exige un JWT válido salvo las marcadas con @Public().
 * Las rutas con @AllowDetectorKey() aceptan además la clave de un detector de placas
 * (header x-detector-key). Cada clave pertenece a un solo negocio y es la clave la que
 * decide el negocio, no lo que diga el body.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly detectorsService: DetectorsService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    if (this.reflector.getAllAndOverride<boolean>(ALLOW_DETECTOR_KEY, targets)) {
      const request = context.switchToHttp().getRequest();
      const provided = request.headers['x-detector-key'];
      if (typeof provided === 'string' && provided) {
        const detector = await this.detectorsService.authenticate(provided);
        if (detector) {
          const user: JwtPayload = {
            sub: 0,
            email: `detector:${detector.id}`,
            role: UserRole.OPERATOR,
            tenantId: detector.tenantId,
          };
          request.user = user;
          request.detector = detector;
          return true;
        }
      }
    }

    return (await super.canActivate(context)) as boolean;
  }
}
