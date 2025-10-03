/**
 * Client Script for Hospital Patient DocType
 * Adds CopilotKit AI Assistant button to Patient forms
 *
 * Phase 3.7 - T107: ERPNext Integration
 */

frappe.ui.form.on('Patient', {
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
    // Add Copilot button
    frm.add_custom_button(__('🤖 AI Assistant'), function() {
        open_copilot_panel(frm);
    }, __('Copilot'));

    // Style the button
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
        title: __('AI Assistant - Patient Care Helper'),
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

    // Setup message passing
    setup_copilot_messaging(frm, dialog);
}

/**
 * Builds the Copilot URL with patient context
 */
function build_copilot_url(frm) {
    const base_url = get_copilot_base_url();

    const context = {
        doctype: 'Patient',
        docname: frm.doc.name,
        industry: 'hospital',
        data: {
            patient_id: frm.doc.name,
            patient_name: frm.doc.patient_name,
            sex: frm.doc.sex,
            dob: frm.doc.dob,
            blood_group: frm.doc.blood_group,
            mobile: frm.doc.mobile,
            email: frm.doc.email,
            allergies: frm.doc.allergies,
            medical_history: frm.doc.medical_history,
            current_medications: frm.doc.current_medications,
            emergency_contact: frm.doc.emergency_contact,
            emergency_phone: frm.doc.emergency_phone,
            insurance_details: frm.doc.insurance_details
        },
        actions: [
            'schedule_appointment',
            'create_encounter',
            'view_medical_history',
            'create_order_set',
            'view_lab_results',
            'admit_patient',
            'discharge_patient'
        ]
    };

    const context_param = encodeURIComponent(JSON.stringify(context));
    return `${base_url}?context=${context_param}&embedded=true`;
}

/**
 * Gets the Copilot frontend base URL
 */
function get_copilot_base_url() {
    if (frappe.boot.copilot_url) {
        return frappe.boot.copilot_url;
    }
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000/copilot`;
}

/**
 * Initializes Copilot context
 */
function initialize_copilot_context(frm) {
    frappe._copilot_forms = frappe._copilot_forms || {};
    frappe._copilot_forms[frm.doc.name] = frm;
}

/**
 * Sets up message passing between ERPNext and Copilot iframe
 */
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

/**
 * Sends current form context to Copilot iframe
 */
function send_context_to_copilot(frm) {
    const iframe = document.querySelector('#copilot-iframe-container iframe');
    if (iframe && iframe.contentWindow) {
        const context = {
            type: 'erpnext_context',
            payload: {
                doctype: 'Patient',
                docname: frm.doc.name,
                industry: 'hospital',
                data: frm.doc,
                meta: frm.meta
            }
        };
        iframe.contentWindow.postMessage(context, '*');
    }
}

/**
 * Handles actions requested by Copilot
 */
function handle_copilot_action(frm, payload, dialog) {
    const action = payload.action;
    const params = payload.params || {};

    switch(action) {
        case 'schedule_appointment':
            execute_schedule_appointment(frm, params, dialog);
            break;

        case 'create_encounter':
            execute_create_encounter(frm, params, dialog);
            break;

        case 'view_medical_history':
            execute_view_history(frm, params, dialog);
            break;

        case 'create_order_set':
            execute_create_orders(frm, params, dialog);
            break;

        case 'admit_patient':
            execute_admit_patient(frm, params, dialog);
            break;

        case 'discharge_patient':
            execute_discharge_patient(frm, params, dialog);
            break;

        case 'refresh_form':
            frm.reload_doc();
            break;

        default:
            frappe.msgprint(__('Unknown Copilot action: {0}', [action]));
    }
}

/**
 * Executes appointment scheduling
 */
function execute_schedule_appointment(frm, params, dialog) {
    frappe.new_doc('Patient Appointment', {
        patient: frm.doc.name,
        patient_name: frm.doc.patient_name
    });

    send_action_result(dialog, 'schedule_appointment', true, {
        patient: frm.doc.name
    });
}

/**
 * Executes encounter creation
 */
function execute_create_encounter(frm, params, dialog) {
    frappe.new_doc('Patient Encounter', {
        patient: frm.doc.name,
        patient_name: frm.doc.patient_name,
        patient_sex: frm.doc.sex,
        patient_age: calculate_age(frm.doc.dob)
    });

    send_action_result(dialog, 'create_encounter', true, {
        patient: frm.doc.name
    });
}

/**
 * Calculates age from date of birth
 */
function calculate_age(dob) {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

/**
 * Executes medical history view
 */
function execute_view_history(frm, params, dialog) {
    frappe.set_route('List', 'Patient Encounter', {
        patient: frm.doc.name
    });

    send_action_result(dialog, 'view_medical_history', true, {
        patient: frm.doc.name
    });
}

/**
 * Executes order set creation
 */
function execute_create_orders(frm, params, dialog) {
    frappe.call({
        method: 'erpnext_hospital.api.create_order_set',
        args: {
            patient: frm.doc.name,
            orders: params.orders || []
        },
        callback: (r) => {
            if (!r.exc) {
                frappe.show_alert({
                    message: __('Order set created successfully'),
                    indicator: 'green'
                });
                send_action_result(dialog, 'create_order_set', true, r.message);
            } else {
                send_action_result(dialog, 'create_order_set', false, r.exc);
            }
        }
    });
}

/**
 * Executes patient admission
 */
function execute_admit_patient(frm, params, dialog) {
    frappe.new_doc('Inpatient Record', {
        patient: frm.doc.name,
        patient_name: frm.doc.patient_name,
        admission_datetime: frappe.datetime.now_datetime()
    });

    send_action_result(dialog, 'admit_patient', true, {
        patient: frm.doc.name
    });
}

/**
 * Executes patient discharge
 */
function execute_discharge_patient(frm, params, dialog) {
    frappe.call({
        method: 'erpnext_hospital.api.discharge_patient',
        args: {
            patient: frm.doc.name
        },
        callback: (r) => {
            if (!r.exc) {
                frappe.show_alert({
                    message: __('Patient discharged successfully'),
                    indicator: 'green'
                });
                send_action_result(dialog, 'discharge_patient', true, r.message);
            } else {
                send_action_result(dialog, 'discharge_patient', false, r.exc);
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
