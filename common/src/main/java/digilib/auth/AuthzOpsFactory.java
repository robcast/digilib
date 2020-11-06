package digilib.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


/**
 * Static factory for authorization AuthzOps.
 * 
 * @author casties
 * 
 */
public class AuthzOpsFactory {
    /** Log4J logger */
    protected static Logger logger = LoggerFactory.getLogger(AuthzOpsFactory.class);

    /** AuthzOps implementation class */
    protected static Class<AuthzOps> authOpsClass;

    public static AuthzOps getAuthzOpsInstance() {
        AuthzOps ao = null;
        try {
            ao = authOpsClass.getDeclaredConstructor().newInstance();
        } catch (Exception e) {
            logger.error("Unable to create AuthzOps instance!", e);
        }
        return ao;
    }

    /** set the AuthzOps implementation class.
     * @param clazz implementation class
     */
    public static void setAuthzOpsClass(Class<AuthzOps> clazz) {
        AuthzOpsFactory.authOpsClass = clazz;
    }

}
