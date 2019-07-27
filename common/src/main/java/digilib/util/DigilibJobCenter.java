package digilib.util;

/*
 * #%L
 * Wrapper around ExecutionService.
 * %%
 * Copyright (C) 2010 - 2013 MPIWG Berlin
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Author: Robert Casties (robcast@berlios.de)
 */

import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;

import org.apache.log4j.Logger;

/** Wrapper around ExecutionService.
 * 
 * @author casties
 *
 */
public class DigilibJobCenter<V> {
    /** general logger for this class */
    private static Logger logger = Logger.getLogger("digilib.jobcenter");
    /** ExecutorService */
    private ExecutorService executor;
    /** max number of running threads */
    private int maxThreads = 1;
    /** max number of waiting threads */
    private int maxQueueLen = 50;
    /** label for this job center */
    private String label = "";
    
    /** Create a DigilibJobcenter with the given number of threads and queue length.
     * If prestart=true it starts the threads in the thread pool.
     * 
     * @param maxThreads the max threads
     * @param maxQueueLen the max queue length
     * @param prestart the prestart
     * @param label the label
     */
    public DigilibJobCenter(int maxThreads, int maxQueueLen, boolean prestart, String label) {
        super();
        this.label = (label != null) ? label : "";
        this.maxThreads = maxThreads;
        this.maxQueueLen = maxQueueLen;
        executor = Executors.newFixedThreadPool(maxThreads);
        if (prestart) {
            // prestart threads so Tomcat's leak protection doesn't complain
            int st = ((ThreadPoolExecutor)executor).prestartAllCoreThreads();
            logger.debug(label+" prestarting threads: "+st);
        }
    }
    
    /** Submit Callable job that returns a Value to execute.
     * 
     * @param job the Callable
     * @return Future to control the job
     */
    public Future<V> submit(Callable<V> job) {
        return executor.submit(job);
    }

    /** Submit Runnable job to execute.
     * 
     * @param job the Runnable
     * @return Future to control the job
     */
    public Future<?> submit(Runnable job) {
        return executor.submit(job);
    }

    /** Returns if the service is overloaded.
     *  
     * @return true if busy
     */
    public boolean isBusy() {
        int jql = getWaitingJobs();
        int jrl = getRunningJobs();
        logger.debug(label+" isBusy: waiting jobs="+jql+" running jobs="+jrl);
        return (jql > maxQueueLen);
    }
    
    /** Returns the number of currently running jobs.
     * @return the number of running jobs
     */
    public int getRunningJobs() {
        return ((ThreadPoolExecutor)executor).getActiveCount();
    }
    
    /** Returns the number of currently waiting jobs.
     * @return the number of waiting jobs
     */
    public int getWaitingJobs() {
        BlockingQueue<Runnable> jq = ((ThreadPoolExecutor)executor).getQueue();
        int jql = jq.size();
        return jql;
    }

    /**
     * @param maxThreads the max threads
     */
    public void setMaxThreads(int maxThreads) {
        this.maxThreads = maxThreads;
    }

    /**
     * @return the max threads
     */
    public int getMaxThreads() {
        return maxThreads;
    }

    /**
     * @param maxQueueLen the max queue length
     */
    public void setMaxQueueLen(int maxQueueLen) {
        this.maxQueueLen = maxQueueLen;
    }

    /**
     * @return the max queue length
     */
    public int getMaxQueueLen() {
        return maxQueueLen;
    }

    /** Shuts down the Executor. 
     * Tries to stop running threads and returns a list of waiting threads.
     * 
     * @return list of waiting tasks
     */
    public List<Runnable> shutdownNow() {
        return executor.shutdownNow();
    }

}
