package digilib.image;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


/**
 * Static factory for DocuImages.
 * 
 * @author casties
 * 
 */
public class DocuImageFactory {
    /** Log4J logger */
    protected static Logger logger = LoggerFactory.getLogger(DocuImageFactory.class);

    /** AuthOps implementation class */
    protected static Class<DocuImage> docuImageClass;

    /**
     * Creates a new DocuImage instance.
     * 
     * The type of DocuImage is specified by docuimage-class.
     * 
     * @return DocuImage
     */
    public static DocuImage getInstance() {
        DocuImage di = null;
        try {
            di = docuImageClass.getConstructor().newInstance();
        } catch (Exception e) {
            logger.error("Unable to create DocuImage instance!", e);
        }
        return di;
    }

    /** set the DocuImage implementation class.
     * @param clazz the implementation class
     */
    public static void setDocuImageClass(Class<DocuImage> clazz) {
        DocuImageFactory.docuImageClass = clazz;
    }

}
