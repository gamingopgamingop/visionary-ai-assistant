import { 
    scheduleJob, 
    unscheduleJob, 
    pauseScheduledJob, 
    resumeScheduledJob, 
    clearAllScheduledJobs,
    getScheduledJobs,
    getSchedulerStats,
    parseCronToMs 
} from '../scheduler.ts';

Deno.test("parseCronToMs - basic daily", () => {
    const ms = parseCronToMs("0 2 * * *");
    if (ms < 60000) throw new Error("Should be at least 1 minute");
    if (ms > 24 * 60 * 60 * 1000) throw new Error("Should not exceed 24 hours");
});

Deno.test("parseCronToMs - hourly", () => {
    const ms = parseCronToMs("0 * * * *");
    if (ms < 60000) throw new Error("Should be at least 1 minute");
    if (ms > 60 * 60 * 1000) throw new Error("Should not exceed 1 hour");
});

Deno.test("parseCronToMs - every 5 minutes", () => {
    const ms = parseCronToMs("*/5 * * * *");
    if (ms < 60000) throw new Error("Should be at least 1 minute");
    if (ms > 5 * 60 * 1000) throw new Error("Should not exceed 5 minutes");
});

Deno.test("parseCronToMs - invalid expression", () => {
    try {
        parseCronToMs("invalid");
        throw new Error("Should throw for invalid expression");
    } catch (error) {
        if (!error.message.includes("Invalid cron expression")) throw error;
    }
});

Deno.test("scheduleJob - creates job", async () => {
    clearAllScheduledJobs();
    
    const job = await scheduleJob(
        "test-job",
        "0 * * * *",
        "cleanup",
        { test: true },
        { priority: 0 }
    );
    
    if (!job.id) throw new Error("Job should have ID");
    if (job.name !== "test-job") throw new Error("Name mismatch");
    if (job.cronExpression !== "0 * * * *") throw new Error("Cron mismatch");
    if (job.jobType !== "cleanup") throw new Error("Type mismatch");
    if (!job.enabled) throw new Error("Should be enabled");
    if (!job.nextRun) throw new Error("Should have nextRun");
    
    unscheduleJob(job.id);
});

Deno.test("unscheduleJob - removes job", async () => {
    clearAllScheduledJobs();
    
    const job = await scheduleJob("test", "0 * * * *", "cleanup", {});
    const result = unscheduleJob(job.id);
    
    if (!result) throw new Error("Should return true");
    
    const result2 = unscheduleJob(job.id);
    if (result2) throw new Error("Should return false for non-existent job");
});

Deno.test("pauseScheduledJob - pauses job", async () => {
    clearAllScheduledJobs();
    
    const job = await scheduleJob("test", "0 * * * *", "cleanup", {});
    const result = pauseScheduledJob(job.id);
    
    if (!result) throw new Error("Should return true");
    
    const result2 = pauseScheduledJob(job.id);
    if (result2) throw new Error("Should return false for already paused");
});

Deno.test("resumeScheduledJob - resumes job", async () => {
    clearAllScheduledJobs();
    
    const job = await scheduleJob("test", "0 * * * *", "cleanup", {});
    pauseScheduledJob(job.id);
    
    const resumed = resumeScheduledJob(job.id, "0 * * * *", "cleanup", {});
    
    if (!resumed.id) throw new Error("Resumed job should have ID");
    if (resumed.name !== "test") throw new Error("Name mismatch");
});

Deno.test("clearAllScheduledJobs - clears all", async () => {
    clearAllScheduledJobs();
    
    await scheduleJob("test1", "0 * * * *", "cleanup", {});
    await scheduleJob("test2", "0 * * * *", "cleanup", {});
    
    const statsBefore = getSchedulerStats();
    if (statsBefore.scheduledCount !== 2) throw new Error("Should have 2 jobs");
    
    clearAllScheduledJobs();
    
    const statsAfter = getSchedulerStats();
    if (statsAfter.scheduledCount !== 0) throw new Error("Should have 0 jobs");
});

Deno.test("getScheduledJobs - returns jobs", async () => {
    clearAllScheduledJobs();
    
    await scheduleJob("test1", "0 * * * *", "cleanup", {});
    await scheduleJob("test2", "0 * * * *", "cleanup", {});
    
    const jobs = getScheduledJobs();
    if (jobs.length !== 2) throw new Error("Should have 2 jobs");
});

Deno.test("getSchedulerStats - returns stats", async () => {
    clearAllScheduledJobs();
    
    await scheduleJob("test1", "0 * * * *", "cleanup", {});
    
    const stats = getSchedulerStats();
    if (stats.scheduledCount !== 1) throw new Error("Should have 1 scheduled");
    if (stats.runningIntervals !== 1) throw new Error("Should have 1 running");
});