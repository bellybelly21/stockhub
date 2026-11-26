import { API_URL } from '../config/api';

export type OutboundMovementType = 'MERMA' | 'DONACION' | 'AJUSTE';
export type MovementReason =
  | 'DANADO_RECEPCION'
  | 'MERMA_FISICA'
  | 'VENCIMIENTO'
  | 'DONACION'
  | 'OTRO';

const SELLER_ALLOWED_REASONS: readonly MovementReason[] = [
  'DANADO_RECEPCION',
  'VENCIMIENTO',
];

export interface CreateMovementPayload {
  productId: number;
  fromWarehouseId: number;
  quantity: number;
  type: string;
  reason?: string;
  comment?: string;
}

export interface CreateOutboundInput {
  productId: number;
  fromWarehouseId: number;
  rawQuantity: number;
  type: OutboundMovementType | string;
  reason: MovementReason | string;
  comment?: string;
  isSeller?: boolean;
}

export interface CreateTransferPayload {
  productId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  quantity: number;
}

export class MovementService {
  private static async postMovement(
    token: string,
    body: Record<string, unknown>,
    fallbackError: string
  ) {
    const response = await fetch(`${API_URL}/api/movements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detailMsg = data.details?.[0]?.mensaje;
      throw new Error(detailMsg || data.error || data.message || fallbackError);
    }
    return data;
  }

  static async createOutbound(token: string, payload: CreateOutboundInput) {
    // Los vendedores solo pueden registrar ajustes negativos por daño en recepción o vencimiento
    if (payload.isSeller && !SELLER_ALLOWED_REASONS.includes(payload.reason as MovementReason)) {
      throw new Error(
        'Los vendedores solo pueden registrar ajustes negativos por daño en recepción o vencimiento.'
      );
    }

    const effectiveType = payload.isSeller ? 'AJUSTE' : payload.type;

    const signedQuantity =
      effectiveType === 'AJUSTE'
        ? -Math.abs(payload.rawQuantity)
        : Math.abs(payload.rawQuantity);

        const body: CreateMovementPayload = {
          productId: Number(payload.productId),
          fromWarehouseId: Number(payload.fromWarehouseId),
          quantity: signedQuantity,
          type: effectiveType,
          reason: payload.reason,
          comment: payload.comment,
        };

        return this.postMovement(
          token,
          body as unknown as Record<string, unknown>,
          'No se pudo procesar el decremento.'
        );
  }

  static async createTransfer(token: string, payload: CreateTransferPayload) {
    return this.postMovement(
      token,
      {
        type: 'TRANSFERENCIA_SALIDA',
        productId: Number(payload.productId),
        fromWarehouseId: Number(payload.fromWarehouseId),
        toWarehouseId: Number(payload.toWarehouseId),
        quantity: Number(payload.quantity),
      },
      'Error al procesar la transferencia'
    );
  }
}