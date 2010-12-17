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

import digilib.image.DocuImage;

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
    
    /**
     * @param maxThreads
     * @param label TODO
     * @param maxQueueLength
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
    
    /** Submit job to execute
     * 
     * @param job
     * @return Future to control the job
     */
    public Future<V> submit(Callable<V> job) {
        return executor.submit(job);
    }

    /** Returns if the service is not overloaded.
     *  
     * @return
     */
    public boolean canRun() {
        int jql = getWaitingJobs();
        int jrl = getRunningJobs();
        logger.debug(label+" canRun: waiting jobs="+jql+" running jobs="+jrl);
        return (jql <= maxQueueLen);
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
    
    public int getRunningJobs() {
        return ((ThreadPoolExecutor)executor).getActiveCount();
    }
    
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

    public List<Runnable> shutdownNow() {
        return executor.shutdownNow();
    }

}
