/** Wrapper around ExecutionService.
 * 
 */
package digilib.util;

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
     * @param maxThreads
     * @param maxQueueLen
     * @param prestart
     * @param label
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
     * @param job
     * @return Future to control the job
     */
    public Future<V> submit(Callable<V> job) {
        return executor.submit(job);
    }

    /** Submit Runnable job to execute.
     * 
     * @param job
     * @return Future to control the job
     */
    public Future<?> submit(Runnable job) {
        return executor.submit(job);
    }

    /** Returns if the service is overloaded.
     *  
     * @return
     */
    public boolean isBusy() {
        int jql = getWaitingJobs();
        int jrl = getRunningJobs();
        logger.debug(label+" isBusy: waiting jobs="+jql+" running jobs="+jrl);
        return (jql > maxQueueLen);
    }
    
    /** Returns the number of currently running jobs.
     * @return
     */
    public int getRunningJobs() {
        return ((ThreadPoolExecutor)executor).getActiveCount();
    }
    
    /** Returns the number of currently waiting jobs.
     * @return
     */
    public int getWaitingJobs() {
        BlockingQueue<Runnable> jq = ((ThreadPoolExecutor)executor).getQueue();
        int jql = jq.size();
        return jql;
    }

    public void setMaxThreads(int maxThreads) {
        this.maxThreads = maxThreads;
    }

    public int getMaxThreads() {
        return maxThreads;
    }

    public void setMaxQueueLen(int maxQueueLen) {
        this.maxQueueLen = maxQueueLen;
    }

    public int getMaxQueueLen() {
        return maxQueueLen;
    }

    /** Shuts down the Executor. 
     * Tries to stop running threads and returns a list of waiting threads.
     * 
     * @return
     */
    public List<Runnable> shutdownNow() {
        return executor.shutdownNow();
    }

}
