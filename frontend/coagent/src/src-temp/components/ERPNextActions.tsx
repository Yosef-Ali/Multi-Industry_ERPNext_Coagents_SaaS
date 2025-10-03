"use client";

import { useCopilotAction } from "@copilotkit/react-core";

/**
 * Workflow service URL
 */
const WORKFLOW_SERVICE_URL = 'https://erpnext-workflows.onrender.com';

/**
 * Execute workflow helper
 */
async function executeWorkflow(graphName: string, initialState: Record<string, any>) {
  const response = await fetch(`${WORKFLOW_SERVICE_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      graph_name: graphName,
      initial_state: initialState,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Workflow execution failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * ERPNext Actions Component
 * Registers CopilotKit actions for ERPNext workflows
 */
export function ERPNextActions() {
  // Hotel check-in action
  useCopilotAction({
    name: "hotel_check_in_guest",
    description: "Check in a guest at a hotel using the Order-to-Cash workflow. This creates a reservation, checks in the guest, and starts their billing folio.",
    parameters: [
      {
        name: "reservation_id",
        type: "string",
        description: "Unique reservation ID (e.g., 'RES-2024-001')",
        required: true,
      },
      {
        name: "guest_name",
        type: "string",
        description: "Guest's full name",
        required: true,
      },
      {
        name: "room_number",
        type: "string",
        description: "Room number (e.g., '101', '205')",
        required: true,
      },
      {
        name: "check_in_date",
        type: "string",
        description: "Check-in date in YYYY-MM-DD format",
        required: true,
      },
      {
        name: "check_out_date",
        type: "string",
        description: "Check-out date in YYYY-MM-DD format",
        required: true,
      },
    ],
    handler: async ({ reservation_id, guest_name, room_number, check_in_date, check_out_date }) => {
      const result = await executeWorkflow('hotel_o2c', {
        reservation_id,
        guest_name,
        room_number,
        check_in_date,
        check_out_date,
        messages: [],
        session_id: null,
        step_count: 0,
        current_node: null,
        error: null,
      });

      if (result.status === 'completed') {
        return `✅ Guest ${guest_name} checked in successfully to room ${room_number}!\n\nReservation ID: ${reservation_id}\nCheck-in: ${check_in_date}\nCheck-out: ${check_out_date}`;
      } else if (result.status === 'paused') {
        return `⏸️ Check-in workflow paused - awaiting approval for ${guest_name}`;
      } else {
        return `❌ Check-in failed: ${result.error || 'Unknown error'}`;
      }
    },
  });

  // Create sales order action
  useCopilotAction({
    name: "create_sales_order",
    description: "Create a retail sales order and process fulfillment. This checks inventory, creates the order, generates a pick list, and processes delivery.",
    parameters: [
      {
        name: "customer_name",
        type: "string",
        description: "Customer's full name",
        required: true,
      },
      {
        name: "customer_id",
        type: "string",
        description: "Customer ID in ERPNext (e.g., 'CUST-2024-001')",
        required: true,
      },
      {
        name: "items",
        type: "string",
        description: "Order items as JSON string, e.g. '[{\"item_code\":\"ITEM-001\",\"qty\":5}]'",
        required: true,
      },
      {
        name: "delivery_date",
        type: "string",
        description: "Expected delivery date in YYYY-MM-DD format",
        required: true,
      },
      {
        name: "warehouse",
        type: "string",
        description: "Warehouse name (e.g., 'Main Warehouse')",
        required: true,
      },
    ],
    handler: async ({ customer_name, customer_id, items, delivery_date, warehouse }) => {
      const orderItems = JSON.parse(items);

      const result = await executeWorkflow('retail_fulfillment', {
        customer_name,
        customer_id,
        order_items: orderItems,
        delivery_date,
        warehouse,
        messages: [],
        session_id: null,
        step_count: 0,
        current_node: null,
        error: null,
      });

      if (result.status === 'completed') {
        return `✅ Sales order created successfully for ${customer_name}!\n\nItems: ${orderItems.length} item(s)\nDelivery Date: ${delivery_date}\nWarehouse: ${warehouse}`;
      } else if (result.status === 'paused') {
        return `⏸️ Sales order workflow paused - awaiting approval`;
      } else {
        return `❌ Sales order failed: ${result.error || 'Unknown error'}`;
      }
    },
  });

  // List workflows action
  useCopilotAction({
    name: "list_available_workflows",
    description: "List all available ERPNext workflows. You can filter by industry (hotel, hospital, manufacturing, retail, education).",
    parameters: [
      {
        name: "industry",
        type: "string",
        description: "Optional industry filter: hotel, hospital, manufacturing, retail, or education",
        required: false,
      },
    ],
    handler: async ({ industry }) => {
      const url = industry
        ? `${WORKFLOW_SERVICE_URL}/workflows?industry=${industry}`
        : `${WORKFLOW_SERVICE_URL}/workflows`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to list workflows: ${response.statusText}`);
      }

      const data = await response.json();
      const workflows = Object.values(data.workflows) as any[];

      let result = `📋 Available ERPNext Workflows${industry ? ` (${industry})` : ''}:\n\n`;

      workflows.forEach((w: any) => {
        result += `**${w.name}** (${w.industry})\n`;
        result += `  ${w.description}\n\n`;
      });

      result += `Total: ${workflows.length} workflow(s)`;
      return result;
    },
  });

  return null; // This component doesn't render anything
}
