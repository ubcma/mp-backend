export const QUESTION_TYPES = [
    "ShortText",
    "LongText",
    "Email",
    "Number",
    "Date",
    "Time",
    "Radio",
    "Select",
    "Checkbox",
    "YesNo",
    "FileUpload",
  ] as const;

export const PAYMENT_EXPIRY = 3600; // 10 minutes in seconds
export const MEMBERSHIP_PRICE = 1060; // 10.60 
export const STUDENT_NUMBER_MIN_LENGTH = 8;

// Event slugs whose registrations require onboarding_complete. Slugs (not ids) so the list works in dev and prod.
export const ONBOARDING_REQUIRED_EVENT_SLUGS: string[] = ["test-workshop-event", "test-wkshop-event", "ubcma-gateways-2026"];
