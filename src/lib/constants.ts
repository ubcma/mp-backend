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