import { SetMetadata } from '@nestjs/common';

/** Ruta accesible sin token (login, healthcheck). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Ruta que además acepta la clave del detector de placas (header `x-detector-key`)
 * en lugar de un JWT. El detector actúa como operador del negocio que indique en el body.
 */
export const ALLOW_DETECTOR_KEY = 'allowDetectorKey';
export const AllowDetectorKey = () => SetMetadata(ALLOW_DETECTOR_KEY, true);
