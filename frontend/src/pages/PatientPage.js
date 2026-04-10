import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createPatientAppointment, getPatientAppointments, getPatientProfile, updatePatientProfile, } from "../services/api";
const EMPTY_PROFILE_FORM = {
    fullName: "",
    dateOfBirth: "",
    phone: "",
    preferredTimezone: "",
    insuranceProvider: "",
    emergencyContact: "",
    allergies: "",
    notes: "",
};
function profileToForm(profile) {
    return {
        fullName: profile.full_name ?? "",
        dateOfBirth: profile.date_of_birth ?? "",
        phone: profile.phone ?? "",
        preferredTimezone: profile.preferred_timezone ?? "",
        insuranceProvider: profile.insurance_provider ?? "",
        emergencyContact: profile.emergency_contact ?? "",
        allergies: profile.allergies ?? "",
        notes: profile.notes ?? "",
    };
}
function emptyToNull(value) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
export default function PatientPage({ token }) {
    const [profile, setProfile] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
    const [appointmentDateTime, setAppointmentDateTime] = useState("");
    const [appointmentReason, setAppointmentReason] = useState("");
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [profileMessage, setProfileMessage] = useState(null);
    const [appointmentMessage, setAppointmentMessage] = useState(null);
    useEffect(() => {
        let mounted = true;
        async function loadPatientData() {
            setLoading(true);
            setErrorMessage(null);
            try {
                const [profileResponse, appointmentResponse] = await Promise.all([
                    getPatientProfile(token),
                    getPatientAppointments(token),
                ]);
                if (!mounted) {
                    return;
                }
                setProfile(profileResponse);
                setProfileForm(profileToForm(profileResponse));
                setAppointments(appointmentResponse.items);
            }
            catch {
                if (!mounted) {
                    return;
                }
                setErrorMessage("Unable to load patient data. Refresh and try again.");
            }
            finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }
        loadPatientData();
        return () => {
            mounted = false;
        };
    }, [token]);
    const sortedAppointments = useMemo(() => [...appointments].sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime()), [appointments]);
    async function handleProfileSubmit(event) {
        event.preventDefault();
        setProfileMessage(null);
        const payload = {
            full_name: emptyToNull(profileForm.fullName),
            date_of_birth: emptyToNull(profileForm.dateOfBirth),
            phone: emptyToNull(profileForm.phone),
            preferred_timezone: emptyToNull(profileForm.preferredTimezone),
            insurance_provider: emptyToNull(profileForm.insuranceProvider),
            emergency_contact: emptyToNull(profileForm.emergencyContact),
            allergies: emptyToNull(profileForm.allergies),
            notes: emptyToNull(profileForm.notes),
        };
        try {
            const updated = await updatePatientProfile(token, payload);
            setProfile(updated);
            setProfileForm(profileToForm(updated));
            setProfileMessage("Profile updated.");
        }
        catch {
            setProfileMessage("Unable to save profile right now.");
        }
    }
    async function handleAppointmentSubmit(event) {
        event.preventDefault();
        setAppointmentMessage(null);
        const reason = appointmentReason.trim();
        if (!appointmentDateTime || reason.length < 3) {
            setAppointmentMessage("Select a date/time and provide a brief reason.");
            return;
        }
        const scheduledAt = new Date(appointmentDateTime);
        if (Number.isNaN(scheduledAt.getTime())) {
            setAppointmentMessage("Invalid appointment date/time.");
            return;
        }
        try {
            const created = await createPatientAppointment(token, {
                scheduled_at: scheduledAt.toISOString(),
                reason,
            });
            setAppointments((current) => [...current, created]);
            setAppointmentDateTime("");
            setAppointmentReason("");
            setAppointmentMessage("Appointment requested.");
        }
        catch {
            setAppointmentMessage("Unable to create appointment right now.");
        }
    }
    return (_jsxs("section", { className: "role-page patient-page", children: [_jsx("h2", { children: "Patient Dashboard" }), _jsx("p", { children: "Manage your profile and schedule upcoming visits." }), loading && _jsx("p", { children: "Loading patient data..." }), errorMessage && _jsx("p", { className: "error-text", children: errorMessage }), !loading && !errorMessage && (_jsxs("div", { className: "patient-grid", children: [_jsxs("article", { className: "patient-card", children: [_jsx("h3", { children: "Profile" }), _jsxs("form", { onSubmit: handleProfileSubmit, className: "patient-form", children: [_jsxs("label", { children: ["Full name", _jsx("input", { type: "text", value: profileForm.fullName, onChange: (event) => setProfileForm((current) => ({ ...current, fullName: event.target.value })) })] }), _jsxs("label", { children: ["Date of birth", _jsx("input", { type: "date", value: profileForm.dateOfBirth, onChange: (event) => setProfileForm((current) => ({ ...current, dateOfBirth: event.target.value })) })] }), _jsxs("label", { children: ["Phone", _jsx("input", { type: "tel", value: profileForm.phone, onChange: (event) => setProfileForm((current) => ({ ...current, phone: event.target.value })) })] }), _jsxs("label", { children: ["Preferred timezone", _jsx("input", { type: "text", value: profileForm.preferredTimezone, onChange: (event) => setProfileForm((current) => ({ ...current, preferredTimezone: event.target.value })), placeholder: "America/New_York" })] }), _jsxs("label", { children: ["Insurance provider", _jsx("input", { type: "text", value: profileForm.insuranceProvider, onChange: (event) => setProfileForm((current) => ({ ...current, insuranceProvider: event.target.value })) })] }), _jsxs("label", { children: ["Emergency contact", _jsx("input", { type: "text", value: profileForm.emergencyContact, onChange: (event) => setProfileForm((current) => ({ ...current, emergencyContact: event.target.value })) })] }), _jsxs("label", { children: ["Allergies", _jsx("input", { type: "text", value: profileForm.allergies, onChange: (event) => setProfileForm((current) => ({ ...current, allergies: event.target.value })) })] }), _jsxs("label", { children: ["Notes", _jsx("textarea", { value: profileForm.notes, onChange: (event) => setProfileForm((current) => ({ ...current, notes: event.target.value })), rows: 4 })] }), _jsx("button", { type: "submit", children: "Save profile" })] }), profileMessage && _jsx("p", { children: profileMessage })] }), _jsxs("article", { className: "patient-card", children: [_jsx("h3", { children: "Request appointment" }), _jsxs("form", { onSubmit: handleAppointmentSubmit, className: "patient-form", children: [_jsxs("label", { children: ["Date and time", _jsx("input", { type: "datetime-local", value: appointmentDateTime, onChange: (event) => setAppointmentDateTime(event.target.value) })] }), _jsxs("label", { children: ["Reason", _jsx("textarea", { value: appointmentReason, onChange: (event) => setAppointmentReason(event.target.value), rows: 4, placeholder: "Short reason for the visit" })] }), _jsx("button", { type: "submit", children: "Request" })] }), appointmentMessage && _jsx("p", { children: appointmentMessage }), profile?.updated_at && (_jsxs("p", { className: "meta-text", children: ["Profile last updated: ", new Date(profile.updated_at).toLocaleString()] }))] }), _jsxs("article", { className: "patient-card patient-card-wide", children: [_jsx("h3", { children: "Upcoming appointments" }), sortedAppointments.length === 0 ? (_jsx("p", { children: "No appointments found." })) : (_jsx("ul", { className: "appointment-list", children: sortedAppointments.map((appointment) => (_jsxs("li", { children: [_jsx("strong", { children: new Date(appointment.scheduled_at).toLocaleString() }), _jsx("span", { children: appointment.reason }), _jsx("span", { className: "status-pill", children: appointment.status })] }, appointment.id))) }))] })] }))] }));
}
