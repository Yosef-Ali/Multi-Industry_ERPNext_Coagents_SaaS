(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
	[974],
	{
		48134: (e, t, r) => {
			Promise.resolve().then(r.bind(r, 60418));
		},
		60418: (e, t, r) => {
			r.r(t), r.d(t, { default: () => d });
			var n = r(95155),
				s = r(16483),
				a = r(58206);
			r(17158);
			var o = r(69100);
			const i =
				'localhost' === window.location.hostname
					? 'http://localhost:8001'
					: 'https://erpnext-workflows.onrender.com';
			async function l(e, t) {
				const r = await fetch(''.concat(i, '/execute'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ graph_name: e, initial_state: t, stream: !1 }),
				});
				if (!r.ok) throw Error('Workflow execution failed: '.concat(r.statusText));
				return r.json();
			}
			function c() {
				return (
					(0, o.a)({
						name: 'hotel_check_in_guest',
						description:
							'Check in a guest at a hotel using the Order-to-Cash workflow. This creates a reservation, checks in the guest, and starts their billing folio.',
						parameters: [
							{
								name: 'reservation_id',
								type: 'string',
								description: "Unique reservation ID (e.g., 'RES-2024-001')",
								required: !0,
							},
							{
								name: 'guest_name',
								type: 'string',
								description: "Guest's full name",
								required: !0,
							},
							{
								name: 'room_number',
								type: 'string',
								description: "Room number (e.g., '101', '205')",
								required: !0,
							},
							{
								name: 'check_in_date',
								type: 'string',
								description: 'Check-in date in YYYY-MM-DD format',
								required: !0,
							},
							{
								name: 'check_out_date',
								type: 'string',
								description: 'Check-out date in YYYY-MM-DD format',
								required: !0,
							},
						],
						handler: async (e) => {
							const {
									reservation_id: t,
									guest_name: r,
									room_number: n,
									check_in_date: s,
									check_out_date: a,
								} = e,
								o = await l('hotel_o2c', {
									reservation_id: t,
									guest_name: r,
									room_number: n,
									check_in_date: s,
									check_out_date: a,
									messages: [],
									session_id: null,
									step_count: 0,
									current_node: null,
									error: null,
								});
							return 'completed' === o.status
								? '✅ Guest '
										.concat(r, ' checked in successfully to room ')
										.concat(n, '!\n\nReservation ID: ')
										.concat(t, '\nCheck-in: ')
										.concat(s, '\nCheck-out: ')
										.concat(a)
								: 'paused' === o.status
									? '⏸️ Check-in workflow paused - awaiting approval for '.concat(r)
									: '❌ Check-in failed: '.concat(o.error || 'Unknown error');
						},
					}),
					(0, o.a)({
						name: 'create_sales_order',
						description:
							'Create a retail sales order and process fulfillment. This checks inventory, creates the order, generates a pick list, and processes delivery.',
						parameters: [
							{
								name: 'customer_name',
								type: 'string',
								description: "Customer's full name",
								required: !0,
							},
							{
								name: 'customer_id',
								type: 'string',
								description: "Customer ID in ERPNext (e.g., 'CUST-2024-001')",
								required: !0,
							},
							{
								name: 'items',
								type: 'string',
								description:
									'Order items as JSON string, e.g. \'[{"item_code":"ITEM-001","qty":5}]\'',
								required: !0,
							},
							{
								name: 'delivery_date',
								type: 'string',
								description: 'Expected delivery date in YYYY-MM-DD format',
								required: !0,
							},
							{
								name: 'warehouse',
								type: 'string',
								description: "Warehouse name (e.g., 'Main Warehouse')",
								required: !0,
							},
						],
						handler: async (e) => {
							const {
									customer_name: t,
									customer_id: r,
									items: n,
									delivery_date: s,
									warehouse: a,
								} = e,
								o = JSON.parse(n),
								i = await l('retail_fulfillment', {
									customer_name: t,
									customer_id: r,
									order_items: o,
									delivery_date: s,
									warehouse: a,
									messages: [],
									session_id: null,
									step_count: 0,
									current_node: null,
									error: null,
								});
							return 'completed' === i.status
								? '✅ Sales order created successfully for '
										.concat(t, '!\n\nItems: ')
										.concat(o.length, ' item(s)\nDelivery Date: ')
										.concat(s, '\nWarehouse: ')
										.concat(a)
								: 'paused' === i.status
									? '⏸️ Sales order workflow paused - awaiting approval'
									: '❌ Sales order failed: '.concat(i.error || 'Unknown error');
						},
					}),
					(0, o.a)({
						name: 'list_available_workflows',
						description:
							'List all available ERPNext workflows. You can filter by industry (hotel, hospital, manufacturing, retail, education).',
						parameters: [
							{
								name: 'industry',
								type: 'string',
								description:
									'Optional industry filter: hotel, hospital, manufacturing, retail, or education',
								required: !1,
							},
						],
						handler: async (e) => {
							const { industry: t } = e,
								r = t ? ''.concat(i, '/workflows?industry=').concat(t) : ''.concat(i, '/workflows'),
								n = await fetch(r);
							if (!n.ok) throw Error('Failed to list workflows: '.concat(n.statusText));
							let s = Object.values((await n.json()).workflows),
								a = '\uD83D\uDCCB Available ERPNext Workflows'.concat(
									t ? ' ('.concat(t, ')') : '',
									':\n\n'
								);
							return (
								s.forEach((e) => {
									(a += '**'.concat(e.name, '** (').concat(e.industry, ')\n')),
										(a += '  '.concat(e.description, '\n\n'));
								}),
								(a += 'Total: '.concat(s.length, ' workflow(s)'))
							);
						},
					}),
					null
				);
			}
			function d() {
				return (0, n.jsxs)(s.zP, {
					runtimeUrl: '/api/copilotkit',
					children: [
						(0, n.jsx)(c, {}),
						(0, n.jsx)(a.R, {
							labels: {
								title: 'ERPNext CoAgent',
								initial:
									"Hi! I'm your ERPNext assistant. I can help you with hotel check-ins, sales orders, and more. What would you like to do?",
							},
							children: (0, n.jsx)('main', {
								className: 'flex min-h-screen flex-col items-center justify-between p-24',
								children: (0, n.jsxs)('div', {
									className: 'z-10 w-full max-w-5xl items-center justify-between font-mono text-sm',
									children: [
										(0, n.jsx)('h1', {
											className: 'text-4xl font-bold text-center mb-4',
											children: 'ERPNext CoAgent Assistant',
										}),
										(0, n.jsx)('p', {
											className: 'text-center text-gray-600 mb-4',
											children: 'Connected to LangGraph Workflow Service \uD83D\uDD17',
										}),
										(0, n.jsxs)('div', {
											className: 'mt-8 p-6 bg-gray-50 rounded-lg',
											children: [
												(0, n.jsx)('h2', {
													className: 'text-xl font-semibold mb-4',
													children: '\uD83C\uDFE8 Try these workflows:',
												}),
												(0, n.jsxs)('ul', {
													className: 'space-y-2 text-gray-700',
													children: [
														(0, n.jsxs)('li', {
															children: [
																(0, n.jsx)('strong', { children: 'Hotel:' }),
																' "Check in John Doe to room 101 from 2024-10-10 to 2024-10-15 with reservation RES-001"',
															],
														}),
														(0, n.jsxs)('li', {
															children: [
																(0, n.jsx)('strong', { children: 'Retail:' }),
																' "Create a sales order for customer CUST-001 (Jane Smith) with item ITEM-001 qty 5, deliver on 2024-10-15 from Main Warehouse"',
															],
														}),
														(0, n.jsxs)('li', {
															children: [
																(0, n.jsx)('strong', { children: 'List:' }),
																' "Show me all available hotel workflows"',
															],
														}),
													],
												}),
											],
										}),
										(0, n.jsx)('div', {
											className: 'mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded',
											children: (0, n.jsxs)('p', {
												className: 'text-sm text-blue-800',
												children: [
													(0, n.jsx)('strong', { children: '\uD83D\uDCA1 Backend Status:' }),
													' Connected to workflow service at',
													' ',
													(0, n.jsx)('code', {
														className: 'bg-blue-100 px-1 rounded',
														children: 'erpnext-workflows.onrender.com',
													}),
												],
											}),
										}),
									],
								}),
							}),
						}),
					],
				});
			}
		},
	},
	(e) => {
		e.O(0, [589, 540, 754, 441, 255, 358], () => e((e.s = 48134))), (_N_E = e.O());
	},
]);
