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
  'MERMA_FISICA',
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
  type: string;
  reason: string;
  comment?: string;
  isSeller?: boolean;
}

export interface CreateTransferPayload {
  productId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  quantity: number;
}

export interface StockChangedDetail {
  productId: number;
  warehouseId: number;
  quantityDelta: number;
}

export class MovementService {
  private static notifyStockChanged(detail: StockChangedDetail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<StockChangedDetail>('inventory:stock-changed', { detail })
      );
    }
  }

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
    // HU-06B: Los vendedores solo pueden registrar mermas por daño en recepción o merma física
    if (payload.isSeller && !SELLER_ALLOWED_REASONS.includes(payload.reason as MovementReason)) {
      throw new Error(
        'Los vendedores solo pueden registrar mermas por daño en recepción o merma física.'
      );
    }

    const effectiveType = payload.isSeller ? 'MERMA' : payload.type;

    const signedQuantity =
      effectiveType === 'AJUSTE'
        ? -Math.abs(payload.rawQuantity)
        : Math.abs(payload.rawQuantity);

    const productId = Number(payload.productId);
    const fromWarehouseId = Number(payload.fromWarehouseId);

    const body: CreateMovementPayload = {
      productId,
      fromWarehouseId,
      quantity: signedQuantity,
      type: effectiveType,
      reason: payload.reason,
      comment: payload.comment,
    };

    const result = await this.postMovement(token, body as unknown as Record<string, unknown>, 'No se pudo procesar el decremento.');

    this.notifyStockChanged({
      productId,
      warehouseId: fromWarehouseId,
      quantityDelta: -Math.abs(payload.rawQuantity),
    });

    return result;
  }

  static async createTransfer(token: string, payload: CreateTransferPayload) {
    const productId = Number(payload.productId);
    const fromWarehouseId = Number(payload.fromWarehouseId);
    const toWarehouseId = Number(payload.toWarehouseId);
    const quantity = Number(payload.quantity);

    const result = await this.postMovement(
      token,
      {
        type: 'TRANSFERENCIA_SALIDA',
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
      },
      'Error al procesar la transferencia'
    );

    this.notifyStockChanged({
      productId,
      warehouseId: fromWarehouseId,
      quantityDelta: -Math.abs(quantity),
    });

    return result;
  }
}