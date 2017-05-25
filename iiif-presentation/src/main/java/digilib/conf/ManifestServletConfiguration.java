package digilib.conf;

import javax.servlet.ServletContext;
import javax.servlet.annotation.WebListener;

/**
 * Class to hold the digilib servlet configuration parameters. The parameters
 * can be read from the digilib-config file and be passed to other servlets or
 * beans.
 * 
 * @author casties
 */
@WebListener
public class ManifestServletConfiguration extends DigilibServletConfiguration {

    public static final String MANIFEST_SERVLET_CONFIG_KEY = "digilib.manifest.servlet.configuration";
    
    public static String getClassVersion() {
        return DigilibConfiguration.getClassVersion() + " manif";
    }

    /** non-static getVersion for Java inheritance */
    @Override
    public String getVersion() {
    	return getClassVersion();
    }
    
    /**
     * Constructs DigilibServletConfiguration and defines all parameters and
     * their default values.
     */
    public ManifestServletConfiguration() {
        super();

        // Scaler servlet name used in constructing IIIF image API paths
        newParameter("scaler-servlet-path", "Scaler", null, 'f');
    }

    /*
     * (non-Javadoc)
     * 
     * @see digilib.conf.DigilibServletConfiguration#configure(javax.servlet.
     * ServletContext)
     */
    @Override
    public void configure(ServletContext context) {
        super.configure(context);

        // set version
        setValue("servlet.version", getVersion());

    }

    /**
     * Sets the current DigilibConfiguration in the context. 
     * @param context
     */
    @Override
    public void setContextConfig(ServletContext context) {
        context.setAttribute(ManifestServletConfiguration.MANIFEST_SERVLET_CONFIG_KEY, this);
    }
    
    /**
     * Returns the current TextServletConfiguration from the context.
     * 
     * @param context
     * @return
     */
    public static DigilibServletConfiguration getCurrentConfig(ServletContext context) {
        DigilibServletConfiguration config = (DigilibServletConfiguration) context
                .getAttribute(ManifestServletConfiguration.MANIFEST_SERVLET_CONFIG_KEY);
        return config;
    }

    /**
     * Returns the current DigilibConfiguration from the context.
     * (non-static method, for Java inheritance)
     * 
     * @param context
     * @return
     */
    @Override
    protected DigilibServletConfiguration getContextConfig(ServletContext context) {
        return getCurrentConfig(context);
    }

}
