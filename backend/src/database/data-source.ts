// DataSource para la CLI de TypeORM (generar / aplicar / revertir migraciones).
// Uso: npm run migration:generate -- src/database/migrations/NombreDelCambio
import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

config();

export default new DataSource({ ...buildTypeOrmOptions(), synchronize: false, migrationsRun: false });
