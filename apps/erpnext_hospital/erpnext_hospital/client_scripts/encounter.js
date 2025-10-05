/**
 * Client Script for Hospital Patient Encounter DocType
 * Adds CopilotKit AI Assistant button to Encounter forms
 *
 * Phase 3.7 - T107: ERPNext Integration
 */

frappe.ui.form.on('Patient Encounter', {
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
        title: __('AI Assistant - Clinical Encounter Helper'),
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
        doctype: 'Patient Encounter',
        docname: frm.doc.name,
        industry: 'hospital',
        data: {
            encounter_id: frm.doc.name,
            patient: frm.doc.patient,
            patient_name: frm.doc.patient_name,
            patient_age: frm.doc.patient_age,
            patient_sex: frm.doc.patient_sex,
            encounter_date: frm.doc.encounter_date,
            encounter_time: frm.doc.encounter_time,
            practitioner: frm.doc.practitioner,
            medical_department: frm.doc.medical_department,
            symptoms: frm.doc.symptoms,
            diagnosis: frm.doc.diagnosis,
            chief_complaint: frm.doc.chief_complaint,
            vital_signs: frm.doc.vital_signs,
            drug_prescription: frm.doc.drug_prescription || [],
            lab_test_prescription: frm.doc.lab_test_prescription || [],
            procedure_prescription: frm.doc.procedure_prescription || []
        },
        actions: [
            'add_diagnosis',
            'prescribe_medication',
            'order_lab_tests',
            'order_procedures',
            'create_order_set',
            'refer_specialist',
            'schedule_followup',
            'generate_encounter_summary'
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
                doctype: 'Patient Encounter',
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
        case 'add_diagnosis':
            execute_add_diagnosis(frm, params, dialog);
            break;

        case 'prescribe_medication':
            execute_prescribe_medication(frm, params, dialog);
            break;

        case 'order_lab_tests':
            execute_order_lab_tests(frm, params, dialog);
            break;

        case 'order_procedures':
            execute_order_procedures(frm, params, dialog);
            break;

        case 'create_order_set':
            execute_create_order_set(frm, params, dialog);
            break;

        case 'schedule_followup':
            execute_schedule_followup(frm, params, dialog);
            break;

        case 'generate_encounter_summary':
            execute_generate_summary(frm, params, dialog);
            break;

        case 'refresh_form':
            frm.reload_doc();
            break;

        default:
            frappe.msgprint(__('Unknown Copilot action: {0}', [action]));
    }
}

function execute_add_diagnosis(frm, params, dialog) {
    const diagnosis_row = frm.add_child('diagnosis');
    if (params.diagnosis) {
        diagnosis_row.diagnosis = params.diagnosis;
    }
    if (params.medical_code) {
        diagnosis_row.medical_code = params.medical_code;
    }
    frm.refresh_field('diagnosis');

    frappe.show_alert({
        message: __('Diagnosis added'),
        indicator: 'green'
    });

    send_action_result(dialog, 'add_diagnosis', true, {diagnosis: params.diagnosis});
}

function execute_prescribe_medication(frm, params, dialog) {
    const prescription_row = frm.add_child('drug_prescription');
    if (params.drug_code) {
        prescription_row.drug_code = params.drug_code;
    }
    if (params.drug_name) {
        prescription_row.drug_name = params.drug_name;
    }
    if (params.dosage) {
        prescription_row.dosage = params.dosage;
    }
    if (params.period) {
        prescription_row.period = params.period;
    }
    if (params.dosage_form) {
        prescription_row.dosage_form = params.dosage_form;
    }
    frm.refresh_field('drug_prescription');

    frappe.show_alert({
        message: __('Medication prescribed'),
        indicator: 'green'
    });

    send_action_result(dialog, 'prescribe_medication', true, {drug: params.drug_name});
}

function execute_order_lab_tests(frm, params, dialog) {
    const lab_row = frm.add_child('lab_test_prescription');
    if (params.lab_test_code) {
        lab_row.lab_test_code = params.lab_test_code;
    }
    if (params.lab_test_name) {
        lab_row.lab_test_name = params.lab_test_name;
    }
    frm.refresh_field('lab_test_prescription');

    frappe.show_alert({
        message: __('Lab test ordered'),
        indicator: 'green'
    });

    send_action_result(dialog, 'order_lab_tests', true, {test: params.lab_test_name});
}

function execute_order_procedures(frm, params, dialog) {
    const procedure_row = frm.add_child('procedure_prescription');
    if (params.procedure) {
        procedure_row.procedure = params.procedure;
    }
    if (params.procedure_name) {
        procedure_row.procedure_name = params.procedure_name;
    }
    frm.refresh_field('procedure_prescription');

    frappe.show_alert({
        message: __('Procedure ordered'),
        indicator: 'green'
    });

    send_action_result(dialog, 'order_procedures', true, {procedure: params.procedure_name});
}

function execute_create_order_set(frm, params, dialog) {
    frappe.call({
        method: 'erpnext_hospital.api.create_order_set_from_encounter',
        args: {
            encounter: frm.doc.name,
            order_set_template: params.order_set_template
        },
        callback: (r) => {
            if (!r.exc) {
                frappe.show_alert({
                    message: __('Order set created'),
                    indicator: 'green'
                });
                frm.reload_doc();
                send_action_result(dialog, 'create_order_set', true, r.message);
            } else {
                send_action_result(dialog, 'create_order_set', false, r.exc);
            }
        }
    });
}

function execute_schedule_followup(frm, params, dialog) {
    frappe.new_doc('Patient Appointment', {
        patient: frm.doc.patient,
        patient_name: frm.doc.patient_name,
        practitioner: frm.doc.practitioner,
        appointment_type: 'Follow-up',
        referring_encounter: frm.doc.name
    });

    send_action_result(dialog, 'schedule_followup', true, {
        patient: frm.doc.patient
    });
}

function execute_generate_summary(frm, params, dialog) {
    frappe.call({
        method: 'erpnext_hospital.api.generate_encounter_summary',
        args: {
            encounter: frm.doc.name
        },
        callback: (r) => {
            if (!r.exc) {
                const summary_dialog = new frappe.ui.Dialog({
                    title: __('Encounter Summary'),
                    fields: [
                        {
                            fieldtype: 'HTML',
                            fieldname: 'summary_html',
                            options: r.message.summary_html
                        }
                    ],
                    primary_action_label: __('Copy to Clipboard'),
                    primary_action: () => {
                        navigator.clipboard.writeText(r.message.summary_text);
                        frappe.show_alert({
                            message: __('Summary copied to clipboard'),
                            indicator: 'green'
                        });
                    }
                });

                summary_dialog.show();
                send_action_result(dialog, 'generate_encounter_summary', true, r.message);
            } else {
                send_action_result(dialog, 'generate_encounter_summary', false, r.exc);
            }
        }
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
