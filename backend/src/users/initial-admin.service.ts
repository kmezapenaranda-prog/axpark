import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './user.entity';

/**
 * Crea el primer admin de plataforma en una base nueva (p. ej. el primer despliegue en producción).
 * Solo actúa si NO existe ningún platform_admin y están definidas INITIAL_ADMIN_EMAIL e
 * INITIAL_ADMIN_PASSWORD. Después del primer ingreso conviene borrar esas variables.
 */
@Injectable()
export class InitialAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitialAdminService.name);

  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    if (!email || !password) return;
    if (password.length < 12) {
      this.logger.warn('INITIAL_ADMIN_PASSWORD debe tener al menos 12 caracteres: no se creó el admin.');
      return;
    }
    const exists = await this.users.exists({ where: { role: UserRole.PLATFORM_ADMIN } });
    if (exists) return;
    await this.users.save(
      this.users.create({
        email,
        passwordHash: await bcrypt.hash(password, 10),
        fullName: 'Administrador AxPark',
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
        tenantId: null,
      }),
    );
    this.logger.log(`Admin de plataforma inicial creado: ${email}`);
  }
}
