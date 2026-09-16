import { useEffect, useState } from "react";

type RiderProfile = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  allergies: string;
  medicalConditions: string;
  medications: string;
  previousSurgeries: string;
  organDonor: string;
  emergencyNotes: string;
};

const defaultProfile: RiderProfile = {
  fullName: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  allergies: "",
  medicalConditions: "",
  medications: "",
  previousSurgeries: "",
  organDonor: "",
  emergencyNotes: "",
};

export function SettingsPage() {
  const [profile, setProfile] = useState<RiderProfile>(defaultProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("intelliride-rider-profile");

    if (stored) {
      try {
        setProfile(JSON.parse(stored));
      } catch {
        setProfile(defaultProfile);
      }
    }
  }, []);

  const updateField = (field: keyof RiderProfile, value: string) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  };

  const saveProfile = () => {
    localStorage.setItem(
      "intelliride-rider-profile",
      JSON.stringify(profile),
    );

    setSaved(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your rider profile and emergency medical information.
          </p>
        </div>

        {/* Rider Profile */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Rider Profile</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            This information can help during an emergency.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Full Name"
              value={profile.fullName}
              onChange={(value) => updateField("fullName", value)}
              placeholder="Enter your full name"
            />

            <FormField
              label="Phone Number"
              value={profile.phone}
              onChange={(value) => updateField("phone", value)}
              placeholder="Enter phone number"
              type="tel"
            />

            <FormField
              label="Date of Birth"
              value={profile.dateOfBirth}
              onChange={(value) => updateField("dateOfBirth", value)}
              type="date"
            />

            <SelectField
              label="Gender"
              value={profile.gender}
              onChange={(value) => updateField("gender", value)}
              options={["Male", "Female", "Other", "Prefer not to say"]}
            />

            <SelectField
              label="Blood Group"
              value={profile.bloodGroup}
              onChange={(value) => updateField("bloodGroup", value)}
              options={[
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-",
                "Unknown",
              ]}
            />
          </div>
        </section>

        {/* Medical Information */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Medical Information</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Add information that may be useful to emergency responders.
          </p>

          <div className="space-y-4">
            <TextAreaField
              label="Allergies"
              value={profile.allergies}
              onChange={(value) => updateField("allergies", value)}
              placeholder="Example: Penicillin, peanuts, latex"
            />

            <TextAreaField
              label="Existing Medical Conditions"
              value={profile.medicalConditions}
              onChange={(value) =>
                updateField("medicalConditions", value)
              }
              placeholder="Example: Asthma, diabetes, epilepsy"
            />

            <TextAreaField
              label="Current Medications"
              value={profile.medications}
              onChange={(value) => updateField("medications", value)}
              placeholder="List important medicines"
            />

            <TextAreaField
              label="Previous Major Surgeries"
              value={profile.previousSurgeries}
              onChange={(value) =>
                updateField("previousSurgeries", value)
              }
              placeholder="Mention any major previous surgeries"
            />

            <SelectField
              label="Organ Donor"
              value={profile.organDonor}
              onChange={(value) => updateField("organDonor", value)}
              options={["Yes", "No", "Unknown"]}
            />

            <TextAreaField
              label="Additional Emergency Notes"
              value={profile.emergencyNotes}
              onChange={(value) =>
                updateField("emergencyNotes", value)
              }
              placeholder="Anything else emergency responders should know"
            />
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={saveProfile}
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Save Profile
          </button>

          {saved && (
            <span className="text-sm font-medium text-green-600">
              Profile saved successfully
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

/* ---------------- Components ---------------- */

type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
};

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
};

function SelectField({
  label,
  value,
  onChange,
  options,
}: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      >
        <option value="">Select</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: TextAreaFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  );
}