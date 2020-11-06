package digilib.io;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.conf.DigilibConfiguration;
import digilib.io.FileOps.FileClass;

/**
 * Static factory for DocuDirectory implementations.
 * 
 * @author casties
 * 
 */
public class DocuDirectoryFactory {

    /** Log4J logger */
    protected static Logger logger = LoggerFactory.getLogger(DocuDirectoryFactory.class);
    
    /** digilib config instance */
    protected static DigilibConfiguration dlConfig;

    /** DocuDirectory implementation class */
    protected static Class<DocuDirectory> docuDirClass;

    /**
     * Returns a unconfigured DocuDirectory instance.
     * @return the DocuDirectory
     */
    public static DocuDirectory getInstance() {
        DocuDirectory dd = null;
        try {
            dd = docuDirClass.getConstructor().newInstance();
        } catch (Exception e) {
            logger.error("Unable to create DocuDirectory instance!", e);
        }
        return dd;
    }

    /**
     * Returns a DocuDirectory instance with the given path and FileClass.
     *  
     * @param path the path
     * @param fileClass the FileClass
     * @return the DocuDirectory
     */
    public static DocuDirectory getDocuDirectoryInstance(String path, FileClass fileClass) {
        DocuDirectory dd = getInstance();
        dd.configure(path, fileClass, dlConfig);
        return dd;        
    }
    
    /**
     * Returns a DocuDirectory instance with the given path and DocuDirCache.
     *  
     * @param path the path
     * @param cache the DocuDirCache
     * @return the DocuDirectory
     */
    public static DocuDirectory getDocuDirectoryInstance(String path, DocuDirCache cache) {
        DocuDirectory dd = getInstance();
        dd.configure(path, cache.getFileClass(), dlConfig);
        return dd;        
    }
    
    /**
     * @param dirClass the DocuDirectory class to set
     */
    public static void setDocuDirectoryClass(Class<DocuDirectory> dirClass) {
        DocuDirectoryFactory.docuDirClass = dirClass;
    }

    /**
     * @param dlConfig the DigilibConfiguration
     */
    public static void setDigilibConfig(DigilibConfiguration dlConfig) {
        DocuDirectoryFactory.dlConfig = dlConfig;
    }


}
