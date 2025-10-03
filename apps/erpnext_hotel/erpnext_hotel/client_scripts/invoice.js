/**
 * Client Script for Hotel Invoice DocType (Sales Invoice)
 * Adds CopilotKit AI Assistant button to hotel-related invoices
 *
 * Phase 3.7 - T106: ERPNext Integration
 */

frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        // Only show Copilot button for hotel-related invoices
        if (!frm.doc.__islocal && is_hotel_invoice(frm)) {
            add_copilot_button(frm);
        }
    },

    onload: function(frm) {
        // Initialize Copilot context on form load
        if (!frm.doc.__islocal && is_hotel_invoice(frm)) {
            initialize_copilot_context(frm);
        }
    }
});

/**
 * Checks if invoice is hotel-related
 */
function is_hotel_invoice(frm) {
    // Check if invoice has hotel reservation reference
    if (frm.doc.custom_reservation_reference) {
        return true;
    }

    // Check if customer is hotel guest
    if (frm.doc.customer_group === 'Hotel Guests') {
        return true;
    }

    // Check if items contain hotel services
    if (frm.doc.items && frm.doc.items.length > 0) {
        const has_hotel_items = frm.doc.items.some(item =>
            item.item_group && (
                item.item_group.includes('Room') ||
                item.item_group.includes('Hotel') ||
                item.item_group === 'Services'
            )
        );
        return has_hotel_items;
    }

    return false;
}

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
        title: __('AI Assistant - Invoice Helper'),
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
 * Builds the Copilot URL with invoice context
 */
function build_copilot_url(frm) {
    const base_url = get_copilot_base_url();

    const context = {
        doctype: 'Sales Invoice',
        docname: frm.doc.name,
        industry: 'hotel',
        data: {
            invoice_id: frm.doc.name,
            customer: frm.doc.customer,
            customer_name: frm.doc.customer_name,
            posting_date: frm.doc.posting_date,
            due_date: frm.doc.due_date,
            status: frm.doc.status,
            grand_total: frm.doc.grand_total,
            outstanding_amount: frm.doc.outstanding_amount,
            paid_amount: frm.doc.paid_amount,
            reservation_reference: frm.doc.custom_reservation_reference,
            items: frm.doc.items ? frm.doc.items.map(item => ({
                item_code: item.item_code,
                item_name: item.item_name,
                qty: item.qty,
                rate: item.rate,
                amount: item.amount,
                description: item.description
            })) : [],
            payments: frm.doc.payments || []
        },
        actions: [
            'submit_invoice',
            'record_payment',
            'send_invoice_email',
            'view_payment_history',
            'apply_discount',
            'add_payment_terms'
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
                doctype: 'Sales Invoice',
                docname: frm.doc.name,
                industry: 'hotel',
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
        case 'submit_invoice':
            execute_submit_invoice(frm, params, dialog);
            break;

        case 'record_payment':
            execute_record_payment(frm, params, dialog);
            break;

        case 'send_invoice_email':
            execute_send_email(frm, params, dialog);
            break;

        case 'apply_discount':
            execute_apply_discount(frm, params, dialog);
            break;

        case 'view_payment_history':
            execute_view_payments(frm, params, dialog);
            break;

        case 'refresh_form':
            frm.reload_doc();
            break;

        default:
            frappe.msgprint(__('Unknown Copilot action: {0}', [action]));
    }
}

/**
 * Executes invoice submission
 */
function execute_submit_invoice(frm, params, dialog) {
    if (frm.doc.docstatus === 1) {
        frappe.msgprint(__('Invoice is already submitted'));
        return;
    }

    frappe.confirm(
        __('Submit invoice {0} for {1}?', [frm.doc.name, frappe.format(frm.doc.grand_total, {fieldtype: 'Currency'})]),
        () => {
            frm.save('Submit')
                .then(() => {
                    frappe.show_alert({
                        message: __('Invoice submitted successfully'),
                        indicator: 'green'
                    });
                    send_action_result(dialog, 'submit_invoice', true, {invoice_name: frm.doc.name});
                })
                .catch((err) => {
                    send_action_result(dialog, 'submit_invoice', false, err);
                });
        }
    );
}

/**
 * Executes payment recording
 */
function execute_record_payment(frm, params, dialog) {
    if (frm.doc.docstatus !== 1) {
        frappe.msgprint(__('Please submit the invoice first'));
        return;
    }

    // Create payment entry
    frappe.call({
        method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry',
        args: {
            dt: frm.doc.doctype,
            dn: frm.doc.name
        },
        callback: (r) => {
            if (!r.exc) {
                const payment_entry = frappe.model.sync(r.message);
                frappe.set_route('Form', 'Payment Entry', payment_entry[0].name);

                send_action_result(dialog, 'record_payment', true, {
                    payment_entry: payment_entry[0].name
                });
            } else {
                send_action_result(dialog, 'record_payment', false, r.exc);
            }
        }
    });
}

/**
 * Executes email sending
 */
function execute_send_email(frm, params, dialog) {
    if (frm.doc.docstatus !== 1) {
        frappe.msgprint(__('Please submit the invoice first'));
        return;
    }

    // Open email dialog
    new frappe.views.CommunicationComposer({
        doc: frm.doc,
        frm: frm,
        subject: __('Invoice {0}', [frm.doc.name]),
        recipients: frm.doc.contact_email || params.email,
        attach_document_print: true,
        callback: (r) => {
            if (!r.exc) {
                frappe.show_alert({
                    message: __('Email sent successfully'),
                    indicator: 'green'
                });
                send_action_result(dialog, 'send_invoice_email', true, {sent: true});
            } else {
                send_action_result(dialog, 'send_invoice_email', false, r.exc);
            }
        }
    });
}

/**
 * Executes discount application
 */
function execute_apply_discount(frm, params, dialog) {
    const discount_dialog = new frappe.ui.Dialog({
        title: __('Apply Discount'),
        fields: [
            {
                fieldtype: 'Select',
                fieldname: 'discount_type',
                label: __('Discount Type'),
                options: ['Percentage', 'Amount'],
                reqd: 1,
                default: 'Percentage'
            },
            {
                fieldtype: 'Float',
                fieldname: 'discount_value',
                label: __('Discount Value'),
                reqd: 1
            },
            {
                fieldtype: 'Data',
                fieldname: 'reason',
                label: __('Reason')
            }
        ],
        primary_action_label: __('Apply'),
        primary_action: (values) => {
            if (values.discount_type === 'Percentage') {
                frm.set_value('discount_percentage', values.discount_value);
            } else {
                frm.set_value('discount_amount', values.discount_value);
            }

            frm.save().then(() => {
                frappe.show_alert({
                    message: __('Discount applied successfully'),
                    indicator: 'green'
                });
                discount_dialog.hide();
                send_action_result(dialog, 'apply_discount', true, values);
            });
        }
    });

    // Pre-fill from Copilot params if available
    if (params.discount_type) discount_dialog.set_value('discount_type', params.discount_type);
    if (params.discount_value) discount_dialog.set_value('discount_value', params.discount_value);

    discount_dialog.show();
}

/**
 * Executes payment history view
 */
function execute_view_payments(frm, params, dialog) {
    frappe.call({
        method: 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_payment_entries',
        args: {
            invoice: frm.doc.name
        },
        callback: (r) => {
            if (!r.exc && r.message) {
                const payments = r.message;

                // Show payment history dialog
                const payment_dialog = new frappe.ui.Dialog({
                    title: __('Payment History'),
                    fields: [
                        {
                            fieldtype: 'HTML',
                            fieldname: 'payment_list',
                            options: generate_payment_html(payments)
                        }
                    ]
                });

                payment_dialog.show();
                send_action_result(dialog, 'view_payment_history', true, payments);
            }
        }
    });
}

/**
 * Generates HTML for payment history display
 */
function generate_payment_html(payments) {
    if (!payments || payments.length === 0) {
        return '<p class="text-muted">No payments recorded yet</p>';
    }

    let html = '<table class="table table-bordered"><thead><tr>';
    html += '<th>Payment Entry</th><th>Date</th><th>Amount</th><th>Mode</th>';
    html += '</tr></thead><tbody>';

    payments.forEach(payment => {
        html += `<tr>
            <td><a href="/app/payment-entry/${payment.name}">${payment.name}</a></td>
            <td>${frappe.datetime.str_to_user(payment.posting_date)}</td>
            <td>${frappe.format(payment.paid_amount, {fieldtype: 'Currency'})}</td>
            <td>${payment.mode_of_payment || '-'}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    return html;
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
