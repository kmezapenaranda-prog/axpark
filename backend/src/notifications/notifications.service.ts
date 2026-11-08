import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

function formatBogotaTime(date: Date): string {
  return date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  private async sendWhatsApp(message: string): Promise<void> {
    const token = this.config.get<string>('WHATSAPP_TOKEN');
    const phoneId = this.config.get<string>('WHATSAPP_PHONE_ID');
    const adminPhone = this.config.get<string>('WHATSAPP_ADMIN_PHONE');

    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: adminPhone,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async notifyEntry(plate: string, entryTime: Date): Promise<void> {
    const time = formatBogotaTime(entryTime);
    const message = `🚗 Vehículo ${plate} ingresó a las ${time}`;
    try {
      await this.sendWhatsApp(message);
      this.logger.log(`Notificación de entrada enviada: ${plate}`);
    } catch (err) {
      this.logger.error(`Error al notificar entrada de ${plate}: ${err?.message}`);
      console.error('WhatsApp error:', err?.response?.data || err?.message || err);
    }
  }

  async notifyExit(
    plate: string,
    exitTime: Date,
    duration: string,
    amountToPay: number,
  ): Promise<void> {
    const time = formatBogotaTime(exitTime);
    const message =
      `🚪 Vehículo ${plate} salió a las ${time}. ` +
      `Tiempo: ${duration}. Total: $${amountToPay.toLocaleString('es-CO')} COP`;
    try {
      await this.sendWhatsApp(message);
      this.logger.log(`Notificación de salida enviada: ${plate}`);
    } catch (err) {
      this.logger.error(`Error al notificar salida de ${plate}: ${err?.message}`);
      console.error('WhatsApp error:', err?.response?.data || err?.message || err);
    }
  }
}
