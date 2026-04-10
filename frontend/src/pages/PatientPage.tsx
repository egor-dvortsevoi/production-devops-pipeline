import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  createPatientAppointment,
  getPatientAppointments,
  getPatientProfile,
  updatePatientProfile,
  type Appointment,
  type PatientProfile,
  type PatientProfileUpdateRequest,
} from "../services/api";

type Props = {
  token: string;
};

type ProfileFormState = {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  preferredTimezone: string;
  insuranceProvider: string;
  emergencyContact: string;
  allergies: string;
  notes: string;
};

const EMPTY_PROFILE_FORM: ProfileFormState = {
  fullName: "",
  dateOfBirth: "",
  phone: "",
  preferredTimezone: "",
  insuranceProvider: "",
  emergencyContact: "",
  allergies: "",
  notes: "",
};

function profileToForm(profile: PatientProfile): ProfileFormState {
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

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function PatientPage({ token }: Props) {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [appointmentDateTime, setAppointmentDateTime] = useState<string>("");
  const [appointmentReason, setAppointmentReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [appointmentMessage, setAppointmentMessage] = useState<string | null>(null);

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
      } catch {
        if (!mounted) {
          return;
        }
        setErrorMessage("Unable to load patient data. Refresh and try again.");
      } finally {
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

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (left, right) =>
          new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
      ),
    [appointments],
  );

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(null);

    const payload: PatientProfileUpdateRequest = {
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
    } catch {
      setProfileMessage("Unable to save profile right now.");
    }
  }

  async function handleAppointmentSubmit(event: FormEvent<HTMLFormElement>) {
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
    } catch {
      setAppointmentMessage("Unable to create appointment right now.");
    }
  }

  return (
    <section className="role-page patient-page">
      <h2>Patient Dashboard</h2>
      <p>Manage your profile and schedule upcoming visits.</p>

      {loading && <p>Loading patient data...</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {!loading && !errorMessage && (
        <div className="patient-grid">
          <article className="patient-card">
            <h3>Profile</h3>
            <form onSubmit={handleProfileSubmit} className="patient-form">
              <label>
                Full name
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                />
              </label>
              <label>
                Date of birth
                <input
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, dateOfBirth: event.target.value }))
                  }
                />
              </label>
              <label>
                Phone
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>
              <label>
                Preferred timezone
                <input
                  type="text"
                  value={profileForm.preferredTimezone}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, preferredTimezone: event.target.value }))
                  }
                  placeholder="America/New_York"
                />
              </label>
              <label>
                Insurance provider
                <input
                  type="text"
                  value={profileForm.insuranceProvider}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, insuranceProvider: event.target.value }))
                  }
                />
              </label>
              <label>
                Emergency contact
                <input
                  type="text"
                  value={profileForm.emergencyContact}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, emergencyContact: event.target.value }))
                  }
                />
              </label>
              <label>
                Allergies
                <input
                  type="text"
                  value={profileForm.allergies}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, allergies: event.target.value }))
                  }
                />
              </label>
              <label>
                Notes
                <textarea
                  value={profileForm.notes}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={4}
                />
              </label>
              <button type="submit">Save profile</button>
            </form>
            {profileMessage && <p>{profileMessage}</p>}
          </article>

          <article className="patient-card">
            <h3>Request appointment</h3>
            <form onSubmit={handleAppointmentSubmit} className="patient-form">
              <label>
                Date and time
                <input
                  type="datetime-local"
                  value={appointmentDateTime}
                  onChange={(event) => setAppointmentDateTime(event.target.value)}
                />
              </label>
              <label>
                Reason
                <textarea
                  value={appointmentReason}
                  onChange={(event) => setAppointmentReason(event.target.value)}
                  rows={4}
                  placeholder="Short reason for the visit"
                />
              </label>
              <button type="submit">Request</button>
            </form>
            {appointmentMessage && <p>{appointmentMessage}</p>}
            {profile?.updated_at && (
              <p className="meta-text">
                Profile last updated: {new Date(profile.updated_at).toLocaleString()}
              </p>
            )}
          </article>

          <article className="patient-card patient-card-wide">
            <h3>Upcoming appointments</h3>
            {sortedAppointments.length === 0 ? (
              <p>No appointments found.</p>
            ) : (
              <ul className="appointment-list">
                {sortedAppointments.map((appointment) => (
                  <li key={appointment.id}>
                    <strong>{new Date(appointment.scheduled_at).toLocaleString()}</strong>
                    <span>{appointment.reason}</span>
                    <span className="status-pill">{appointment.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
