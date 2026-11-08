import { DataSourceOptions } from 'typeorm';
import { Entry } from '../parking/entry.entity';
import { Client } from '../clients/client.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Membership } from '../memberships/membership.entity';
import { Settings } from '../settings/settings.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { Detector } from '../detectors/detector.entity';
import { InitialSchema1794167420579 } from './migrations/1794167420579-InitialSchema';
import { AddDetectors1794167603307 } from './migrations/1794167603307-AddDetectors';

export const ENTITIES = [Entry, Client, Vehicle, Membership, Settings, Tenant, User, Detector];

// Importadas una a una (no por patrón de archivos): en Vercel el backend se empaqueta
// en una sola función y buscar *.js en disco no es fiable. Añade aquí cada migración nueva.
export const MIGRATIONS = [InitialSchema1794167420579, AddDetectors1794167603307];

/**
 * En desarrollo TypeORM ajusta las tablas solo (synchronize) para iterar rápido.
 * En producción NUNCA: synchronize puede borrar columnas con datos. Ahí el esquema
 * cambia solo con migraciones (src/database/migrations), que se aplican al arrancar.
 * DB_SYNCHRONIZE=true|false permite forzar cualquiera de los dos modos.
 */
export function shouldSynchronize(): boolean {
  if (process.env.DB_SYNCHRONIZE) return process.env.DB_SYNCHRONIZE === 'true';
  return process.env.NODE_ENV !== 'production';
}

// Se evalúa al llamar (no al importar) para leer el .env ya cargado por ConfigModule.
export function buildTypeOrmOptions(url = process.env.DATABASE_URL): DataSourceOptions {
  const synchronize = shouldSynchronize();
  return {
    type: 'postgres',
    url,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    synchronize,
    migrationsRun: !synchronize,
    // Postgres local (Docker) no soporta SSL; los proveedores gestionados (Neon, etc.) sí lo exigen.
    ssl: /localhost|127\.0\.0\.1/.test(url ?? '') ? false : { rejectUnauthorized: false },
    extra: { options: '-c timezone=America/Bogota' },
  };
}
