/**
 * Client Script for Hotel Reservation DocType
 * Adds CopilotKit AI Assistant button to Reservation forms
 *
 * Phase 3.7 - T106: ERPNext Integration
 */

frappe.ui.form.on('Hotel Reservation', {
    refresh: function(frm) {
        // Only show Copilot button for saved documents
        if (!frm.doc.__islocal) {
            add_copilot_button(frm);
        }
    },

    onload: function(frm) {
        // Initialize Copilot context on form load
        if (!frm.doc.__islocal) {
            initialize_copilot_context(frm);
        }
    }
});

/**
 * Adds the Copilot AI Assistant button to the form toolbar
 */
function add_copilot_button(frm) {
    // Remove existing button if present
    frm.page.clear_custom_actions();

    // Add Copilot button
    frm.add_custom_button(__('🤖 AI Assistant'), function() {
        open_copilot_panel(frm);
    }, __('Copilot'));

    // Style the button for visibility
    setTimeout(() => {
        const button = frm.page.btn_secondary.find('.btn:contains("🤖 AI Assistant")');
        if (button.length) {
            button.removeClass('btn-default').addClass('btn-primary');
        }
    }, 100);
}

/**
 * Opens the CopilotKit panel in an iframe/modal
 */
function open_copilot_panel(frm) {
    const dialog = new frappe.ui.Dialog({
        title: __('AI Assistant - Reservation Helper'),
        size: 'extra-large',
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'copilot_container',
                options: '<div id="copilot-iframe-container" style="height: 600px;"></div>'
            }
        ],
        primary_action_label: __('Close'),
        primary_action: function() {
            dialog.hide();
        }
    });

    dialog.show();

    // Build Copilot URL with context
    const copilot_url = build_copilot_url(frm);

    // Inject iframe
    const container = dialog.fields_dict.copilot_container.$wrapper;
    container.html(`
        <iframe
            src="${copilot_url}"
            style="width: 100%; height: 100%; border: none; border-radius: 4px;"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        ></iframe>
    `);

    // Setup message passing for context updates
    setup_copilot_messaging(frm, dialog);
}

/**
 * Builds the Copilot URL with reservation context
 */
function build_copilot_url(frm) {
    const base_url = get_copilot_base_url();

    const context = {
        doctype: 'Hotel Reservation',
        docname: frm.doc.name,
        data: {
            reservation_id: frm.doc.name,
            guest_name: frm.doc.guest_name,
            room_number: frm.doc.room_number,
            room_type: frm.doc.room_type,
            check_in_date: frm.doc.check_in_date,
            check_out_date: frm.doc.check_out_date,
            status: frm.doc.status,
            total_amount: frm.doc.total_amount,
            advance_paid: frm.doc.advance_paid,
            guest_email: frm.doc.guest_email,
            guest_phone: frm.doc.guest_phone,
            special_requests: frm.doc.special_requests
        },
        actions: [
            'check_in_guest',
            'add_charges',
            'generate_invoice',
            'check_out_guest',
            'view_room_availability',
            'send_confirmation_email'
        ]
    };

    // Encode context as URL parameter
    const context_param = encodeURIComponent(JSON.stringify(context));
    return `${base_url}?context=${context_param}&embedded=true`;
}

/**
 * Gets the Copilot frontend base URL
 */
function get_copilot_base_url() {
    // Check for environment-specific URL
    if (frappe.boot.copilot_url) {
        return frappe.boot.copilot_url;
    }

    // Default to local development URL
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000/copilot`;
}

/**
 * Initializes Copilot context for the current form
 */
function initialize_copilot_context(frm) {
    // Store form reference for later use
    frappe._copilot_forms = frappe._copilot_forms || {};
    frappe._copilot_forms[frm.doc.name] = frm;

    // Listen for field changes to update context
    frm.doc_on_save = function() {
        broadcast_context_update(frm);
    };
}

/**
 * Sets up message passing between ERPNext and Copilot iframe
 */
function setup_copilot_messaging(frm, dialog) {
    window.addEventListener('message', function(event) {
        // Verify origin for security
        const allowed_origins = [
            window.location.origin,
            'http://localhost:3000',
            'https://localhost:3000'
        ];

        if (!allowed_origins.includes(event.origin)) {
            console.warn('Copilot: Rejected message from unauthorized origin:', event.origin);
            return;
        }

        const message = event.data;

        // Handle different message types
        if (message.type === 'copilot_action') {
            handle_copilot_action(frm, message.payload, dialog);
        } else if (message.type === 'copilot_request_context') {
            send_context_to_copilot(frm);
        } else if (message.type === 'copilot_close') {
            dialog.hide();
        }
    });

    // Send initial context
    setTimeout(() => send_context_to_copilot(frm), 500);
}

/**
 * Sends current form context to Copilot iframe
 */
function send_context_to_copilot(frm) {
    const iframe = document.querySelector('#copilot-iframe-container iframe');
    if (iframe && iframe.contentWindow) {
        const context = {
            type: 'erpnext_context',
            payload: {
                doctype: 'Hotel Reservation',
                docname: frm.doc.name,
                data: frm.doc,
                meta: frm.meta
            }
        };
        iframe.contentWindow.postMessage(context, '*');
    }
}

/**
 * Broadcasts context updates to all open Copilot panels
 */
function broadcast_context_update(frm) {
    const iframes = document.querySelectorAll('#copilot-iframe-container iframe');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            const update = {
                type: 'erpnext_context_update',
                payload: {
                    docname: frm.doc.name,
                    data: frm.doc
                }
            };
            iframe.contentWindow.postMessage(update, '*');
        }
    });
}

/**
 * Handles actions requested by Copilot
 */
function handle_copilot_action(frm, payload, dialog) {
    const action = payload.action;
    const params = payload.params || {};

    switch(action) {
        case 'check_in_guest':
            execute_check_in(frm, params, dialog);
            break;

        case 'add_charges':
            execute_add_charges(frm, params, dialog);
            break;

        case 'generate_invoice':
            execute_generate_invoice(frm, params, dialog);
            break;

        case 'check_out_guest':
            execute_check_out(frm, params, dialog);
            break;

        case 'send_confirmation_email':
            execute_send_email(frm, params, dialog);
            break;

        case 'refresh_form':
            frm.reload_doc();
            break;

        default:
            frappe.msgprint(__('Unknown Copilot action: {0}', [action]));
    }
}

/**
 * Executes check-in workflow
 */
function execute_check_in(frm, params, dialog) {
    frappe.confirm(
        __('Confirm check-in for guest {0} in room {1}?', [frm.doc.guest_name, frm.doc.room_number]),
        () => {
            frappe.call({
                method: 'erpnext_hotel.api.check_in_guest',
                args: {
                    reservation_name: frm.doc.name
                },
                callback: (r) => {
                    if (!r.exc) {
                        frappe.show_alert({
                            message: __('Guest checked in successfully'),
                            indicator: 'green'
                        });
                        frm.reload_doc();
                        send_action_result(dialog, 'check_in_guest', true, r.message);
                    } else {
                        send_action_result(dialog, 'check_in_guest', false, r.exc);
                    }
                }
            });
        }
    );
}

/**
 * Executes add charges workflow
 */
function execute_add_charges(frm, params, dialog) {
    const charge_dialog = new frappe.ui.Dialog({
        title: __('Add Charges to Reservation'),
        fields: [
            {
                fieldtype: 'Currency',
                fieldname: 'amount',
                label: __('Amount'),
                reqd: 1
            },
            {
                fieldtype: 'Data',
                fieldname: 'description',
                label: __('Description'),
                reqd: 1
            }
        ],
        primary_action_label: __('Add Charge'),
        primary_action: (values) => {
            frappe.call({
                method: 'erpnext_hotel.api.add_reservation_charge',
                args: {
                    reservation_name: frm.doc.name,
                    amount: values.amount,
                    description: values.description
                },
                callback: (r) => {
                    if (!r.exc) {
                        frappe.show_alert({
                            message: __('Charge added successfully'),
                            indicator: 'green'
                        });
                        charge_dialog.hide();
                        frm.reload_doc();
                        send_action_result(dialog, 'add_charges', true, r.message);
                    }
                }
            });
        }
    });

    // Pre-fill from Copilot params if available
    if (params.amount) charge_dialog.set_value('amount', params.amount);
    if (params.description) charge_dialog.set_value('description', params.description);

    charge_dialog.show();
}

/**
 * Executes invoice generation
 */
function execute_generate_invoice(frm, params, dialog) {
    frappe.call({
        method: 'erpnext_hotel.api.generate_invoice',
        args: {
            reservation_name: frm.doc.name
        },
        callback: (r) => {
            if (!r.exc) {
                frappe.show_alert({
                    message: __('Invoice generated: {0}', [r.message.invoice_name]),
                    indicator: 'green'
                });
                frm.reload_doc();
                send_action_result(dialog, 'generate_invoice', true, r.message);

                // Open invoice in new tab
                frappe.set_route('Form', 'Sales Invoice', r.message.invoice_name);
            } else {
                send_action_result(dialog, 'generate_invoice', false, r.exc);
            }
        }
    });
}

/**
 * Executes check-out workflow
 */
function execute_check_out(frm, params, dialog) {
    frappe.confirm(
        __('Confirm check-out for guest {0} from room {1}?', [frm.doc.guest_name, frm.doc.room_number]),
        () => {
            frappe.call({
                method: 'erpnext_hotel.api.check_out_guest',
                args: {
                    reservation_name: frm.doc.name
                },
                callback: (r) => {
                    if (!r.exc) {
                        frappe.show_alert({
                            message: __('Guest checked out successfully'),
                            indicator: 'green'
                        });
                        frm.reload_doc();
                        send_action_result(dialog, 'check_out_guest', true, r.message);
                    } else {
                        send_action_result(dialog, 'check_out_guest', false, r.exc);
                    }
                }
            });
        }
    );
}

/**
 * Executes email sending
 */
function execute_send_email(frm, params, dialog) {
    frappe.call({
        method: 'erpnext_hotel.api.send_confirmation_email',
        args: {
            reservation_name: frm.doc.name,
            email: params.email || frm.doc.guest_email
        },
        callback: (r) => {
            if (!r.exc) {
                frappe.show_alert({
                    message: __('Confirmation email sent'),
                    indicator: 'green'
                });
                send_action_result(dialog, 'send_confirmation_email', true, r.message);
            } else {
                send_action_result(dialog, 'send_confirmation_email', false, r.exc);
            }
        }
    });
}

/**
 * Sends action result back to Copilot iframe
 */
function send_action_result(dialog, action, success, data) {
    const iframe = dialog.fields_dict.copilot_container.$wrapper.find('iframe')[0];
    if (iframe && iframe.contentWindow) {
        const result = {
            type: 'erpnext_action_result',
            payload: {
                action: action,
                success: success,
                data: data
            }
        };
        iframe.contentWindow.postMessage(result, '*');
    }
}
