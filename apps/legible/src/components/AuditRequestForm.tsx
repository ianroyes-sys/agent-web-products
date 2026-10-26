"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

interface FieldErrors {
  domain?: string;
  email?: string;
  authorized?: string;
}

const DOMAIN_PATTERN = /^(?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/.*)?$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function AuditRequestForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const domain = String(data.get("domain") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const authorized = data.get("authorized") === "on";

    const nextErrors: FieldErrors = {};
    if (!DOMAIN_PATTERN.test(domain)) nextErrors.domain = "Enter a domain, e.g. example.com";
    if (!EMAIL_PATTERN.test(email)) nextErrors.email = "Enter an address we can send the report to.";
    if (!authorized) nextErrors.authorized = "We only audit domains the requester is authorized to represent.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("error");
      setMessage("Three fields are required before we can queue an audit.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/audit-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          domain,
          email,
          company: String(data.get("company") ?? "").trim(),
          name: String(data.get("name") ?? "").trim(),
          role: String(data.get("role") ?? "").trim(),
          naics: String(data.get("naics") ?? "").trim(),
          notes: String(data.get("notes") ?? "").trim(),
        }),
      });

      const payload = (await res.json()) as { ok: boolean; reference?: string; error?: string };

      if (!res.ok || !payload.ok) {
        setStatus("error");
        setMessage(payload.error ?? "The request could not be queued. Try again, or email us directly.");
        return;
      }

      setReference(payload.reference ?? "");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setMessage("Network error. Nothing was sent — try again, or email us directly.");
    }
  };

  if (status === "success") {
    return (
      <div className="card p-8 text-center anim-rise">
        <span className="chip chip-pass">QUEUED</span>
        <h2 className="mt-5 text-[22px] font-semibold">Your audit is in the queue.</h2>
        <p className="mx-auto mt-4 max-w-[48ch] text-[14.5px] leading-relaxed text-[var(--color-muted)]">
          We run the crawl and the scoring first, then read the report ourselves before it reaches
          you. Expect the finished report within two business days.
        </p>
        {reference && (
          <p className="mt-6 font-mono text-[12px] text-[var(--color-faint)]">
            reference · {reference}
          </p>
        )}
        <button
          type="button"
          className="btn btn-ghost mt-8"
          onClick={() => {
            setStatus("idle");
            setReference("");
          }}
        >
          Request another domain
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card p-6 md:p-8">
      <div className="grid gap-5">
        <Field
          label="Domain to audit"
          name="domain"
          placeholder="example.com"
          required
          error={errors.domain}
          hint="Public pages only. We never request anything behind a login."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Company" name="company" placeholder="Legal entity name" />
          <Field label="Primary NAICS" name="naics" placeholder="541330" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" name="name" placeholder="First and last" />
          <Field label="Role" name="role" placeholder="Director of Business Development" />
        </div>

        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="you@company.com"
          required
          error={errors.email}
        />

        <div>
          <label htmlFor="notes" className="rule-label">
            Anything we should know
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Set-aside status, certifications in progress, deals you believe you lost silently."
            className="mt-2 w-full resize-y rounded-xl border border-[var(--color-line)] bg-[var(--color-raised)] px-4 py-3 text-[14.5px] text-[var(--color-chalk)] outline-none transition-colors placeholder:text-[var(--color-faint)] focus:border-[var(--accent-line)]"
          />
        </div>

        <div>
          <label className="flex items-start gap-3 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
            <input
              type="checkbox"
              name="authorized"
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              I am authorized to request an audit of this domain on behalf of the company.
            </span>
          </label>
          {errors.authorized && (
            <p className="mt-2 text-[12.5px] text-[var(--color-hot)]">{errors.authorized}</p>
          )}
        </div>

        {status === "error" && message && (
          <div
            role="alert"
            className="rounded-xl border border-[color-mix(in_oklab,var(--color-hot)_40%,transparent)] bg-[color-mix(in_oklab,var(--color-hot)_10%,transparent)] px-4 py-3 text-[13.5px] text-[var(--color-hot)]"
          >
            {message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-primary" disabled={status === "submitting"}>
            {status === "submitting" ? "Queueing…" : "Queue the audit"}
          </button>
          <p className="text-[12.5px] text-[var(--color-faint)]">
            No payment now. Pricing is agreed after you have seen the report.
          </p>
        </div>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

function Field({ label, name, placeholder, type = "text", required, error, hint }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="rule-label">
        {label}
        {required && <span className="ml-1 text-[var(--accent)]">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={`mt-2 h-12 w-full rounded-xl border bg-[var(--color-raised)] px-4 text-[14.5px] text-[var(--color-chalk)] outline-none transition-colors placeholder:text-[var(--color-faint)] ${
          error
            ? "border-[var(--color-hot)] focus:border-[var(--color-hot)]"
            : "border-[var(--color-line)] focus:border-[var(--accent-line)]"
        }`}
      />
      {error ? (
        <p id={`${name}-error`} className="mt-2 text-[12.5px] text-[var(--color-hot)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="mt-2 text-[12.5px] text-[var(--color-faint)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
