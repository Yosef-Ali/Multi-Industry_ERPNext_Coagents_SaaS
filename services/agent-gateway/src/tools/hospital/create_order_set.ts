/**
 * T062: create_order_set tool - Hospital industry
 * Create linked clinical orders (labs, medications, procedures)
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';
// import { RiskClassifier, DocumentState } from '../../../../../apps/common/risk_classifier';

const OrderSchema = z.object({
  type: z.enum(['Lab', 'Medication', 'Procedure', 'Imaging']),
  name: z.string(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  priority: z.enum(['Routine', 'Urgent', 'STAT']).optional().default('Routine'),
});

export const CreateOrderSetInputSchema = z.object({
  patient: z.string().min(1, 'Patient ID is required'),
  encounter: z.string().optional(),
  protocol: z.string(), // e.g., 'sepsis', 'chest_pain', 'stroke'
  orders: z.array(OrderSchema).min(1, 'At least one order required'),
});

export type CreateOrderSetInput = z.infer<typeof CreateOrderSetInputSchema>;

export interface CreateOrderSetResult {
  requires_approval: true; // Always - creating multiple clinical orders
  risk_level: 'high';
  preview: {
    patient: string;
    protocol: string;
    orders: Array<{
      type: string;
      name: string;
      details: string;
    }>;
    order_count: number;
    warning: string;
  };
  execute: () => Promise<any>;
}

/**
 * Create linked clinical order set based on protocol
 * ⚠️ ALWAYS requires approval (clinical orders are high-risk)
 */
export async function create_order_set(
  input: CreateOrderSetInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<CreateOrderSetResult> {
  // Validate input
  const validated = CreateOrderSetInputSchema.parse(input);

  // Build order preview
  const orderPreviews = validated.orders.map(order => {
    let details = order.name;
    if (order.dosage) details += ` ${order.dosage}`;
    if (order.frequency) details += `, ${order.frequency}`;
    if (order.duration) details += ` for ${order.duration}`;
    if (order.priority !== 'Routine') details += ` [${order.priority}]`;

    return {
      type: order.type,
      name: order.name,
      details,
    };
  });

  // Clinical orders ALWAYS require approval (high risk)
  return {
    requires_approval: true,
    risk_level: 'high',
    preview: {
      patient: validated.patient,
      protocol: validated.protocol,
      orders: orderPreviews,
      order_count: validated.orders.length,
      warning: `Creating ${validated.orders.length} clinical order(s) for ${validated.protocol} protocol. Please review carefully.`,
    },
    execute: async () => {
      // Create all orders
      const createdOrders = [];

      for (const order of validated.orders) {
        const orderDoc = await client.createDoc({
          doctype: `Clinical ${order.type}`,
          data: {
            patient: validated.patient,
            encounter: validated.encounter,
            order_name: order.name,
            dosage: order.dosage,
            frequency: order.frequency,
            duration: order.duration,
            priority: order.priority,
            protocol: validated.protocol,
          },
        });

        createdOrders.push({
          type: order.type,
          name: orderDoc.name,
          order_name: order.name,
        });
      }

      return {
        success: true,
        patient: validated.patient,
        protocol: validated.protocol,
        orders_created: createdOrders.length,
        orders: createdOrders,
        message: `Successfully created ${createdOrders.length} clinical orders for ${validated.protocol} protocol`,
      };
    },
  };
}

// Tool metadata for registry
export const create_order_set_tool = {
  name: 'create_order_set',
  description: 'Create linked clinical order set (labs, medications, procedures) from protocol',
  inputSchema: CreateOrderSetInputSchema,
  handler: create_order_set,
  requires_approval: true, // Always
  operation_type: 'create',
  industry: 'hospital',
};
