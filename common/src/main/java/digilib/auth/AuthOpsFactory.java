/**
 * 
 */
package digilib.auth;

import org.apache.log4j.Logger;


/**
 * @author casties
 * 
 */
public class AuthOpsFactory {
    /** Log4J logger */
    protected static Logger logger = Logger.getLogger(AuthOpsFactory.class);

    /** AuthOps implementation class */
    protected static Class<AuthOps> authOpsClass;

    public static AuthOps getAuthOpsInstance() {
        AuthOps ao = null;
        try {
            ao = authOpsClass.newInstance();
        } catch (Exception e) {
            logger.error("Unable to create AuthOps instance!", e);
        }
        return ao;
    }

    /** set the AuthOps implementation class.
     * @param clazz
     */
    public static void setAuthOpsClass(Class<AuthOps> clazz) {
        AuthOpsFactory.authOpsClass = clazz;
    }

}
