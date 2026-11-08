import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private readonly repo: Repository<Settings>,
  ) {}

  async get(tenantId: number): Promise<Settings | null> {
    return this.repo.findOne({ where: { tenantId } });
  }

  async upsert(tenantId: number, dto: UpdateSettingsDto): Promise<Settings> {
    const existing = await this.repo.findOne({ where: { tenantId } });
    const settings = existing ?? this.repo.create({ tenantId });
    Object.assign(settings, dto);
    return this.repo.save(settings);
  }
}
