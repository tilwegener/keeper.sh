import { getAllJobs } from "./utils/get-jobs";
import { injectJobs } from "./utils/inject-jobs";
import { registerJobs } from "./utils/register-jobs";
import { join } from "node:path";

const jobsFolderPathname = join(import.meta.dirname, "jobs");

getAllJobs(jobsFolderPathname).then(injectJobs).then(registerJobs);
