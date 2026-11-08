import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Detector, DetectorStatus } from './detector.entity';

const KEY_PREFIX = 'axp_';
/** No escribir last_seen_at en cada petición: basta cada 30 s (el latido llega cada 60 s). */
const LAST_SEEN_THROTTLE_MS = 30_000;

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

@Injectable()
export class DetectorsService {
  constructor(
    @InjectRepository(Detector)
    private readonly repo: Repository<Detector>,
  ) {}

  findByTenant(tenantId: number): Promise<Detector[]> {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  /** Crea un detector y devuelve su clave en claro. Es la única vez que se puede ver. */
  async create(tenantId: number, name: string): Promise<{ detector: Detector; key: string }> {
    const key = KEY_PREFIX + randomBytes(32).toString('base64url');
    const detector = await this.repo.save(
      this.repo.create({
        tenantId,
        name: name.trim(),
        keyPrefix: key.slice(0, 12),
        keyHash: hashKey(key),
      }),
    );
    delete (detector as Partial<Detector>).keyHash;
    return { detector, key };
  }

  async revoke(id: number, tenantId: number): Promise<void> {
    const detector = await this.repo.findOne({ where: { id, tenantId } });
    if (!detector) throw new NotFoundException(`Detector ${id} no encontrado`);
    await this.repo.update(id, { status: DetectorStatus.REVOKED });
  }

  /** Devuelve el detector activo dueño de la clave, o null si no existe o está revocado. */
  async authenticate(key: string): Promise<Detector | null> {
    if (!key.startsWith(KEY_PREFIX)) return null;
    const detector = await this.repo.findOne({
      where: { keyHash: hashKey(key), status: DetectorStatus.ACTIVE },
    });
    if (!detector) return null;
    const now = Date.now();
    if (!detector.lastSeenAt || now - detector.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
      void this.repo.update(detector.id, { lastSeenAt: new Date(now) });
    }
    return detector;
  }
}
