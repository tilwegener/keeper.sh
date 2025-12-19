import { getAllJobs } from "./utils/get-jobs";
import { registerJobs } from "./utils/register-jobs";
import { join } from "node:path";

const jobsFolderPathname = join(import.meta.dirname, "jobs");

const jobs = await getAllJobs(jobsFolderPathname).then(registerJobs);
