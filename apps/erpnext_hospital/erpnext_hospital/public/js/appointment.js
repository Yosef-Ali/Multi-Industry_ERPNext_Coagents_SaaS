/**
 * Client Script for Hospital Patient Appointment DocType
 * Adds CopilotKit AI Assistant button to Appointment forms
 *
 * Phase 3.7 - T107: ERPNext Integration
 */

frappe.ui.form.on('Patient Appointment', {
    refresh: function(frm) {
        if (!frm.doc.__islocal) {
            add_copilot_button(frm);
        }
    },

    onload: function(frm) {
        if (!frm.doc.__islocal) {
            initialize_copilot_context(frm);
        }
    }
});

function add_copilot_button(frm) {
    frm.add_custom_button(__('🤖 AI Assistant'), function() {
        open_copilot_panel(frm);
    }, __('Copilot'));

    setTimeout(() => {
        const button = frm.page.btn_secondary.find('.btn:contains("🤖 AI Assistant")');
        if (button.length) {
            button.removeClass('btn-default').addClass('btn-primary');
        }
    }, 100);
}

function open_copilot_panel(frm) {
    const dialog = new frappe.ui.Dialog({
        title: __('AI Assistant - Appointment Scheduler'),
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

    const copilot_url = build_copilot_url(frm);
    const container = dialog.fields_dict.copilot_container.$wrapper;
    container.html(`
        <iframe
            src="${copilot_url}"
            style="width: 100%; height: 100%; border: none; border-radius: 4px;"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        ></iframe>
    `);

    setup_copilot_messaging(frm, dialog);
}

function build_copilot_url(frm) {
    const base_url = get_copilot_base_url();

    const context = {
        doctype: 'Patient Appointment',
        docname: frm.doc.name,
        industry: 'hospital',
        data: {
            appointment_id: frm.doc.name,
            patient: frm.doc.patient,
            patient_name: frm.doc.patient_name,
            patient_age: frm.doc.patient_age,
            patient_sex: frm.doc.patient_sex,
            appointment_date: frm.doc.appointment_date,
            appointment_time: frm.doc.appointment_time,
            duration: frm.doc.duration,
            practitioner: frm.doc.practitioner,
            department: frm.doc.department,
            appointment_type: frm.doc.appointment_type,
            status: frm.doc.status,
            notes: frm.doc.notes,
            referring_encounter: frm.doc.referring_encounter
        },
        actions: [
            'confirm_appointment',
            'reschedule_appointment',
            'cancel_appointment',
            'start_encounter',
            'send_reminder',
            'check_practitioner_availability',
            'view_patient_history'
        ]
    };

    const context_param = encodeURIComponent(JSON.stringify(context));
    return `${base_url}?context=${context_param}&embedded=true`;
}

function get_copilot_base_url() {
    if (frappe.boot.copilot_url) {
        return frappe.boot.copilot_url;
    }
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000/copilot`;
}

function initialize_copilot_context(frm) {
    frappe._copilot_forms = frappe._copilot_forms || {};
    frappe._copilot_forms[frm.doc.name] = frm;
}

function setup_copilot_messaging(frm, dialog) {
    window.addEventListener('message', function(event) {
        const allowed_origins = [
            window.location.origin,
            'http://localhost:3000',
            'https://localhost:3000'
        ];

        if (!allowed_origins.includes(event.origin)) {
            return;
        }

        const message = event.data;

        if (message.type === 'copilot_action') {
            handle_copilot_action(frm, message.payload, dialog);
        } else if (message.type === 'copilot_request_context') {
            send_context_to_copilot(frm);
        } else if (message.type === 'copilot_close') {
            dialog.hide();
        }
    });

    setTimeout(() => send_context_to_copilot(frm), 500);
}

function send_context_to_copilot(frm) {
    const iframe = document.querySelector('#copilot-iframe-container iframe');
    if (iframe && iframe.contentWindow) {
        const context = {
            type: 'erpnext_context',
            payload: {
                doctype: 'Patient Appointment',
                docname: frm.doc.name,
                industry: 'hospital',
                data: frm.doc,
                meta: frm.meta
            }
        };
        iframe.contentWindow.postMessage(context, '*');
    }
}

function handle_copilot_action(frm, payload, dialog) {
    const action = payload.action;
    const params = payload.params || {};

    switch(action) {
        case 'confirm_appointment':
            execute_confirm_appointment(frm, params, dialog);
            break;

        case 'reschedule_appointment':
            execute_reschedule_appointment(frm, params, dialog);
            break;

        case 'cancel_appointment':
            execute_cancel_appointment(frm, params, dialog);
            break;

        case 'start_encounter':
            execute_start_encounter(frm, params, dialog);
            break;

        case 'send_reminder':
            execute_send_reminder(frm, params, dialog);
            break;

        case 'check_practitioner_availability':
            execute_check_availability(frm, params, dialog);
            break;

        case 'view_patient_history':
            execute_view_history(frm, params, dialog);
            break;

        case 'refresh_form':
            frm.reload_doc();
            break;

        default:
            frappe.msgprint(__('Unknown Copilot action: {0}', [action]));
    }
}

function execute_confirm_appointment(frm, params, dialog) {
    frm.set_value('status', 'Confirmed');
    frm.save().then(() => {
        frappe.show_alert({
            message: __('Appointment confirmed'),
            indicator: 'green'
        });
        send_action_result(dialog, 'confirm_appointment', true, {
            appointment: frm.doc.name,
            status: 'Confirmed'
        });
    });
}

function execute_reschedule_appointment(frm, params, dialog) {
    const reschedule_dialog = new frappe.ui.Dialog({
        title: __('Reschedule Appointment'),
        fields: [
            {
                fieldtype: 'Date',
                fieldname: 'new_date',
                label: __('New Date'),
                reqd: 1,
                default: frm.doc.appointment_date
            },
            {
                fieldtype: 'Time',
                fieldname: 'new_time',
                label: __('New Time'),
                reqd: 1,
                default: frm.doc.appointment_time
            },
            {
                fieldtype: 'Small Text',
                fieldname: 'reason',
                label: __('Reason for Reschedule')
            }
        ],
        primary_action_label: __('Reschedule'),
        primary_action: (values) => {
            frm.set_value('appointment_date', values.new_date);
            frm.set_value('appointment_time', values.new_time);
            frm.set_value('status', 'Rescheduled');

            frm.save().then(() => {
                frappe.show_alert({
                    message: __('Appointment rescheduled'),
                    indicator: 'green'
                });
                reschedule_dialog.hide();
                send_action_result(dialog, 'reschedule_appointment', true, values);
            });
        }
    });

    // Pre-fill from Copilot params if available
    if (params.new_date) reschedule_dialog.set_value('new_date', params.new_date);
    if (params.new_time) reschedule_dialog.set_value('new_time', params.new_time);

    reschedule_dialog.show();
}

function execute_cancel_appointment(frm, params, dialog) {
    frappe.confirm(
        __('Are you sure you want to cancel this appointment?'),
        () => {
            frm.set_value('status', 'Cancelled');
            frm.save().then(() => {
                frappe.show_alert({
                    message: __('Appointment cancelled'),
                    indicator: 'orange'
                });
                send_action_result(dialog, 'cancel_appointment', true, {
                    appointment: frm.doc.name,
                    status: 'Cancelled'
                });
            });
        }
    );
}

function execute_start_encounter(frm, params, dialog) {
    if (frm.doc.status !== 'Confirmed') {
        frappe.msgprint(__('Please confirm the appointment first'));
        return;
    }

    frappe.new_doc('Patient Encounter', {
        patient: frm.doc.patient,
        patient_name: frm.doc.patient_name,
        patient_age: frm.doc.patient_age,
        patient_sex: frm.doc.patient_sex,
        practitioner: frm.doc.practitioner,
        medical_department: frm.doc.department,
        appointment: frm.doc.name,
        encounter_date: frappe.datetime.now_date(),
        encounter_time: frappe.datetime.now_time()
    });

    // Update appointment status
    frm.set_value('status', 'In Progress');
    frm.save();

    send_action_result(dialog, 'start_encounter', true, {
        patient: frm.doc.patient,
        appointment: frm.doc.name
    });
}

function execute_send_reminder(frm, params, dialog) {
    frappe.call({
        method: 'erpnext_hospital.api.send_appointment_reminder',
        args: {
            appointment: frm.doc.name,
            method: params.method || 'email' // email, sms, both
        },
        callback: (r) => {
            if (!r.exc) {
                frappe.show_alert({
                    message: __('Reminder sent'),
                    indicator: 'green'
                });
                send_action_result(dialog, 'send_reminder', true, r.message);
            } else {
                send_action_result(dialog, 'send_reminder', false, r.exc);
            }
        }
    });
}

function execute_check_availability(frm, params, dialog) {
    frappe.call({
        method: 'erpnext_hospital.api.get_practitioner_availability',
        args: {
            practitioner: frm.doc.practitioner,
            date: params.date || frm.doc.appointment_date
        },
        callback: (r) => {
            if (!r.exc) {
                const availability = r.message;

                const availability_dialog = new frappe.ui.Dialog({
                    title: __('Practitioner Availability'),
                    fields: [
                        {
                            fieldtype: 'HTML',
                            fieldname: 'availability_html',
                            options: generate_availability_html(availability)
                        }
                    ]
                });

                availability_dialog.show();
                send_action_result(dialog, 'check_practitioner_availability', true, availability);
            } else {
                send_action_result(dialog, 'check_practitioner_availability', false, r.exc);
            }
        }
    });
}

function generate_availability_html(availability) {
    if (!availability || availability.length === 0) {
        return '<p class="text-muted">No availability information</p>';
    }

    let html = '<div class="availability-slots">';
    availability.forEach(slot => {
        const status_class = slot.available ? 'text-success' : 'text-danger';
        const status_text = slot.available ? '✓ Available' : '✗ Booked';
        html += `
            <div class="slot-item" style="padding: 8px; border-bottom: 1px solid #eee;">
                <strong>${slot.time_slot}</strong>
                <span class="${status_class}" style="float: right;">${status_text}</span>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function execute_view_history(frm, params, dialog) {
    frappe.set_route('List', 'Patient Encounter', {
        patient: frm.doc.patient
    });

    send_action_result(dialog, 'view_patient_history', true, {
        patient: frm.doc.patient
    });
}

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
