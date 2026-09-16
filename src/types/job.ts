type JobType = "full_time" | "part_time" | "contract" | "internship";

type ApplicationMethod = "external" | "email" | "instructions";

export type CreateJobInput = {
  title: string;
  companyName: string;
  companyLogo: string;
  description: string;
  type: JobType;
  location: string;
  applicationType: ApplicationMethod;
  applicationUrl: string;
  applicationEmail: string;
  applicationText: string;
  isActive: boolean;
};
