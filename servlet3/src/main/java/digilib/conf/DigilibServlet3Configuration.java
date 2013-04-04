package digilib.conf;

import javax.servlet.ServletContext;
import javax.servlet.annotation.WebListener;

import digilib.servlet.AsyncServletWorker;

/**
 * @author casties
 *
 */
@WebListener
public class DigilibServlet3Configuration extends DigilibServletConfiguration {

    public String getVersion() {
        return "2.2.0 srv3";
    }

    /**
     * Constructs DigilibServletConfiguration and defines all parameters and their default values.
     */
    public DigilibServlet3Configuration() {
        super();
        
        // timeout for worker threads (ms)
        newParameter("worker-timeout", new Integer(60000), null, 'f');
    }

    /* (non-Javadoc)
     * @see digilib.conf.DigilibServletConfiguration#configure(javax.servlet.ServletContext)
     */
    @Override
    public void configure(ServletContext context) {
        super.configure(context);
        
        // digilib worker timeout
        long to = getAsInt("worker-timeout");
        AsyncServletWorker.setTimeout(to);
    }

}
